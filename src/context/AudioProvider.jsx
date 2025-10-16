// src/context/AudioProvider.jsx
import React, { createContext, useContext, useRef, useState, useEffect } from "react";
import socket from "../socket";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebaseConfig";

const AudioContextGlobal = createContext();
export const useAudio = () => useContext(AudioContextGlobal);

/**
 * AudioProvider
 * - Mantém playback global (músicas/ambientes) sincronizado via socket + Firestore
 * - Cria um AudioContext compartilhado e MediaStreamDestination (musicStream) para injetar nas peers do mestre
 * - Suporta URLs absolutas (Cloudinary) e nomes simples (que serão resolvidos via VITE_BACKEND_URL ou /musicas/ local)
 * - Gerencia pending plays até que o usuário faça a gesture (desbloqueio do áudio)
 */
export default function AudioProvider({ children }) {
  // audioObjects: { fullUrl: { audio, sourceNode, volume } }
  const audioObjects = useRef({});
  const [playingTracks, setPlayingTracks] = useState([]);
  const pendingRef = useRef(new Set());
  const desiredVolumesRef = useRef({});
  const socketRef = useRef(socket);

  // AudioContext / destination (mix) / stream
  const audioCtxRef = useRef(null);
  const destinationRef = useRef(null);
  const musicStreamRef = useRef(null);

  // unlock gesture
  const [interactionAllowed, setInteractionAllowed] = useState(false);
  const unlockAudio = () => {
    if (interactionAllowed) return;
    setInteractionAllowed(true);
    const pend = Array.from(pendingRef.current);
    pendingRef.current.clear();
    // tenta tocar todas as pendentes assim que usuário interagir
    pend.forEach((url) => _playLocal(url));
  };

  function ensureAudioContext() {
    if (!audioCtxRef.current) {
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        const ctx = new AudioCtx();
        const dest = ctx.createMediaStreamDestination();
        audioCtxRef.current = ctx;
        destinationRef.current = dest;
        musicStreamRef.current = dest.stream;
        console.log("AudioContext criado e MediaStreamDestination disponível.");
      } catch (e) {
        console.warn("Falha ao criar AudioContext:", e);
      }
    }
  }

  /**
   * getMusicUrl
   * Entrada: pode ser:
   *  - URL absoluta (https://...) -> usada diretamente (Cloudinary)
   *  - caminho relativo já contendo /musicas/ -> se BACKEND definido, é prefixado
   *  - nome simples "BatalhaFinal.mp3" -> tenta compor a partir do VITE_BACKEND_URL ou fallback /musicas/...
   *
   * Isso garante compatibilidade com:
   * - Cloudinary (URLs completas)
   * - Backend no Render/Heroku (VITE_BACKEND_URL)
   * - Fallback local (public/musicas)
   */
  const getMusicUrl = (urlOrName) => {
    if (!urlOrName) return "";

    // 1) URL absoluta (Cloudinary ou qualquer host) -> usa direto
    if (/^https?:\/\//i.test(urlOrName)) {
      return urlOrName;
    }

    // 2) se já vier com /musicas/ no começo, usar tal como (mas prefixar backend se disponível)
    if (urlOrName.startsWith("/musicas/")) {
      const backend = (import.meta.env.VITE_BACKEND_URL || "").replace(/\/$/, "");
      if (backend) return `${backend}${urlOrName}`;
      return urlOrName; // fallback relativo
    }

    // 3) nome simples -> monta com BACKEND_URL quando houver
    const backend = (import.meta.env.VITE_BACKEND_URL || "").replace(/\/$/, "");
    if (backend) {
      return `${backend}/musicas/${urlOrName}`;
    }

    // 4) fallback relativo (útil em preview/local)
    if (urlOrName.startsWith("/")) return urlOrName;
    return `/musicas/${urlOrName}`;
  };

  // (opcional) Faz HEAD para verificar se URL está acessível — usado para diagnóstico de deploy/CORS/404.
  async function checkUrlAccessible(fullUrl) {
    try {
      // HEAD é suficiente para checar existencia e CORS preflight
      const r = await fetch(fullUrl, { method: "HEAD", mode: "cors" });
      return r.ok;
    } catch (e) {
      return false;
    }
  }

  /**
   * _playLocal(url)
   * - aceita tanto nome simples quanto URL completa
   * - usa getMusicUrl internamente para resolver fullUrl
   * - respeita interactionAllowed: se não, coloca em pending
   */
  async function _playLocal(url) {
    if (!url) return;

    // se usuário ainda não fez gesture
    if (!interactionAllowed) {
      pendingRef.current.add(url);
      console.warn("Usuário ainda não desbloqueou áudio. Colocado em pending:", url);
      return;
    }

    const fullUrl = getMusicUrl(url);
    const existing = audioObjects.current[fullUrl];

    if (!existing) {
      ensureAudioContext();

      // optional: HEAD check - se falhar, reporta e pendura para debug
      try {
        const ok = await checkUrlAccessible(fullUrl);
        if (!ok) {
          console.warn("AudioProvider: URL inacessível (HEAD falhou):", fullUrl);
          // adiciona no pending para não travar UI — permite retry posterior
          pendingRef.current.add(url);
          return;
        }
      } catch (e) {
        // se HEAD falhar por CORS, deixamos tentar tocar mesmo assim — o player reportará erro se for o caso
        console.warn("checkUrlAccessible erro (seguindo mesmo assim):", e);
      }

      const audio = new Audio();
      audio.crossOrigin = "anonymous";
      audio.src = fullUrl;
      audio.loop = true;
      audio.preload = "auto";

      audio.addEventListener("error", (e) => {
        console.error("Audio error:", fullUrl, e, audio.error);
      });

      const vol = (desiredVolumesRef.current[fullUrl] ?? 100) / 100;
      audio.volume = vol;

      try {
        if (audioCtxRef.current) {
          // cria MediaElementSource para poder mixar no AudioContext (e enviar ao musicStream)
          const srcNode = audioCtxRef.current.createMediaElementSource(audio);
          try { srcNode.connect(audioCtxRef.current.destination); } catch (err) {}
          if (destinationRef.current) {
            try { srcNode.connect(destinationRef.current); } catch (err) {
              console.warn("Erro conectar srcNode -> destination:", err);
            }
          }
          audioObjects.current[fullUrl] = { audio, sourceNode: srcNode, volume: vol };
        } else {
          audioObjects.current[fullUrl] = { audio, sourceNode: null, volume: vol };
        }
      } catch (e) {
        console.warn("Falha ao criar MediaElementSource (fallback):", e);
        audioObjects.current[fullUrl] = { audio, sourceNode: null, volume: vol };
      }

      audio.play().catch((err) => {
        console.warn("Audio play falhou para", fullUrl, err);
        pendingRef.current.add(url);
      });

      setPlayingTracks((prev) => (prev.includes(fullUrl) ? prev : [...prev, fullUrl]));
    } else {
      // já existe — apenas garante play
      existing.audio.play().catch((err) => {
        console.warn("Erro ao dar play no existente:", err);
        pendingRef.current.add(url);
      });
      setPlayingTracks((prev) => (prev.includes(fullUrl) ? prev : [...prev, fullUrl]));
    }
  }

  // Interface pública (controladores)
  const playMusic = (url) => {
    _playLocal(url);
    try {
      socketRef.current?.emit("play-music", url);
    } catch (e) {}
  };

  const pauseMusic = (url) => {
    if (!url) return;
    const fullUrl = getMusicUrl(url);
    if (audioObjects.current[fullUrl]) {
      try {
        audioObjects.current[fullUrl].audio.pause();
        try { audioObjects.current[fullUrl].sourceNode?.disconnect?.(); } catch (err) {}
      } catch (err) {
        console.warn("Erro pausar:", err);
      }
      delete audioObjects.current[fullUrl];
    }
    setPlayingTracks((prev) => prev.filter((u) => u !== fullUrl));
    pendingRef.current.delete(url);
  };

  const stopAllMusic = () => {
    Object.keys(audioObjects.current).forEach((k) => {
      try {
        audioObjects.current[k].audio.pause();
        audioObjects.current[k].audio.currentTime = 0;
        try { audioObjects.current[k].sourceNode?.disconnect?.(); } catch (err) {}
      } catch (err) {}
    });
    audioObjects.current = {};
    setPlayingTracks([]);
    pendingRef.current.clear();
  };

  const setVolume = (url, value) => {
    const fullUrl = getMusicUrl(url);
    desiredVolumesRef.current[fullUrl] = value;
    if (audioObjects.current[fullUrl]) {
      try {
        audioObjects.current[fullUrl].audio.volume = value / 100;
        audioObjects.current[fullUrl].volume = value / 100;
      } catch (err) {
        console.warn("Erro setVolume:", err);
      }
    }
  };

  const getVolume = (url) => {
    const fullUrl = getMusicUrl(url);
    if (audioObjects.current[fullUrl]) return audioObjects.current[fullUrl].volume;
    if (desiredVolumesRef.current[fullUrl] != null) return desiredVolumesRef.current[fullUrl] / 100;
    return 1.0;
  };

  const getMusicStream = () => musicStreamRef.current || null;

  // socket listeners (global)
  useEffect(() => {
    const s = socketRef.current;
    if (!s) return;

    const onPlay = (url) => {
      // se url for absoluta: ok, se for nome simples: getMusicUrl resolve
      if (!interactionAllowed) {
        console.warn("Usuário ainda não desbloqueou áudio. Esperando gesture...");
        pendingRef.current.add(url);
        return;
      }
      const fullUrl = getMusicUrl(url);
      if (!audioObjects.current[fullUrl]) _playLocal(url);
    };
    const onStop = (url) => pauseMusic(url);
    const onStopAll = () => stopAllMusic();
    const onVolume = ({ url, value }) => setVolume(url, value);

    s.on("play-music", onPlay);
    s.on("stop-music", onStop);
    s.on("stop-all-music", onStopAll);
    s.on("volume-music", onVolume);

    s.on("connect", () => {
      console.log("Socket conectado (AudioProvider):", s.id);
    });

    s.on("disconnect", () => {
      console.log("Socket desconectado (AudioProvider)");
    });

    return () => {
      s.off("play-music", onPlay);
      s.off("stop-music", onStop);
      s.off("stop-all-music", onStopAll);
      s.off("volume-music", onVolume);
    };
  }, [interactionAllowed]);

  // Firestore: sincroniza estado persistente (document sound/current)
  useEffect(() => {
    let unsub;
    try {
      unsub = onSnapshot(doc(db, "sound", "current"), (snap) => {
        const data = snap?.data?.() ?? snap;
        if (!data) return;
        const sounds = Array.isArray(data.sounds) ? data.sounds : [];
        const playing = sounds.filter((s) => s.playing).map((s) => s.url);

        // pausa/limpa que não estão na lista
        Object.keys(audioObjects.current).forEach((url) => {
          // url aqui já é fullUrl (por getMusicUrl), mas sounds podem ter sido salvos como nomes.
          // portanto aceitamos equivalência por substring /musicas/ ou igualdade
          const short = url;
          const shortName = short.replace(/.*\/musicas\//, "");
          if (!playing.includes(short) && !playing.includes(shortName)) pauseMusic(short);
        });

        // toca os indicados
        playing.forEach((url) => {
          // evita tocar duplicado: getMusicUrl resolve para fullUrl
          const full = getMusicUrl(url);
          if (!Object.keys(audioObjects.current).includes(full)) _playLocal(url);
        });

        // aplica volumes
        sounds.forEach((s) => {
          if (s.url && s.volume != null) setVolume(s.url, s.volume);
        });
      });
    } catch (err) {
      console.warn("Erro onSnapshot sound/current:", err);
    }
    return () => unsub && unsub();
  }, []);

  return (
    <AudioContextGlobal.Provider
      value={{
        playMusic,
        pauseMusic,
        stopAllMusic,
        setVolume,
        getVolume,
        playingTracks,
        interactionAllowed,
        unlockAudio,
        socket: socketRef.current,
        getMusicStream,
        _internal: { audioCtxRef, destinationRef, musicStreamRef },
      }}
    >
      {children}
    </AudioContextGlobal.Provider>
  );
}

// src/context/AudioProvider.jsx
import React, { createContext, useContext, useRef, useState, useEffect } from "react";
import socket from "../socket";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebaseConfig";

const AudioContextGlobal = createContext();
export const useAudio = () => useContext(AudioContextGlobal);

export default function AudioProvider({ children }) {
  const audioObjects = useRef({});
  const [playingTracks, setPlayingTracks] = useState([]);
  const pendingRef = useRef(new Set());
  const desiredVolumesRef = useRef({});
  const socketRef = useRef(socket);

  const audioCtxRef = useRef(null);
  const destinationRef = useRef(null);
  const musicStreamRef = useRef(null);

  const [interactionAllowed, setInteractionAllowed] = useState(false);
  const unlockAudio = () => {
    if (interactionAllowed) return;
    setInteractionAllowed(true);
    const pend = Array.from(pendingRef.current);
    pendingRef.current.clear();
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
      } catch (e) {
        console.warn("Falha ao criar AudioContext:", e);
      }
    }
  }

  // Construir URL completa para o arquivo de música
  const getMusicUrl = (urlOrName) => {
    if (!urlOrName) return "";
    // se já vier com http(s), usa direto
    if (/^https?:\/\//i.test(urlOrName)) return urlOrName;
    // senão monta a partir do BACKEND
    const backend = (import.meta.env.VITE_BACKEND_URL || "").replace(/\/$/, "");
    if (backend) {
      // se o argumento já contiver /musicas/ usa como está, senão prefixa
      if (urlOrName.startsWith("/musicas/")) return `${backend}${urlOrName}`;
      return `${backend}/musicas/${urlOrName}`;
    }
    // fallback relativo (útil em preview/local)
    if (urlOrName.startsWith("/")) return urlOrName;
    return `/musicas/${urlOrName}`;
  };

  // Faz HEAD para verificar se URL está acessível (melhora logs)
  async function checkUrlAccessible(fullUrl) {
    try {
      const r = await fetch(fullUrl, { method: "HEAD", mode: "cors" });
      return r.ok;
    } catch (e) {
      return false;
    }
  }

  async function _playLocal(url) {
    if (!url) return;
    if (!interactionAllowed) {
      pendingRef.current.add(url);
      return;
    }

    const fullUrl = getMusicUrl(url);
    const existing = audioObjects.current[fullUrl];
    if (!existing) {
      ensureAudioContext();

      // pré-verificação (opcional, para debug)
      const ok = await checkUrlAccessible(fullUrl);
      if (!ok) {
        console.warn("AudioProvider: URL inacessível (HEAD falhou):", fullUrl);
        pendingRef.current.add(url);
        return;
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
          const srcNode = audioCtxRef.current.createMediaElementSource(audio);
          try { srcNode.connect(audioCtxRef.current.destination); } catch {}
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

      // toca e captura erro
      audio.play().catch((err) => {
        console.warn("Audio play falhou para", fullUrl, err);
        pendingRef.current.add(url);
      });

      setPlayingTracks((prev) => (prev.includes(fullUrl) ? prev : [...prev, fullUrl]));
    } else {
      existing.audio.play().catch((err) => {
        console.warn("Erro ao dar play no existente:", err);
        pendingRef.current.add(url);
      });
      setPlayingTracks((prev) => (prev.includes(existing) ? prev : [...prev, fullUrl]));
    }
  }

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
        try { audioObjects.current[fullUrl].sourceNode?.disconnect?.(); } catch {}
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
        try { audioObjects.current[k].sourceNode?.disconnect?.(); } catch {}
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

  // socket handlers
  useEffect(() => {
    const s = socketRef.current;
    if (!s) return;

    const onPlay = (url) => {
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

  // Firestore: sincroniza estado persistente
  useEffect(() => {
    let unsub;
    try {
      unsub = onSnapshot(doc(db, "sound", "current"), (snap) => {
        const data = snap?.data?.() ?? snap;
        if (!data) return;
        const sounds = Array.isArray(data.sounds) ? data.sounds : [];
        const playing = sounds.filter((s) => s.playing).map((s) => s.url);

        Object.keys(audioObjects.current).forEach((url) => {
          const short = url; // já com fullUrl
          if (!playing.includes(short) && !playing.includes(short.replace(/.*\/musicas\//,''))) pauseMusic(short);
        });

        playing.forEach((url) => {
          if (!Object.keys(audioObjects.current).includes(getMusicUrl(url))) _playLocal(url);
        });

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

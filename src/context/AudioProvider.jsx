// src/context/AudioProvider.jsx
import React, { createContext, useContext, useRef, useState, useEffect } from "react";
import socket from "../socket";
import { doc, onSnapshot, setDoc, updateDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebaseConfig";

const AudioContextGlobal = createContext();
export const useAudio = () => useContext(AudioContextGlobal);

export default function AudioProvider({ children }) {
  // Map fullUrl -> { audio, gainNode, sourceNode, volume }
  const audioObjects = useRef({});
  // lista de urls (normalizadas) que o UI considera "tocando"
  const [playingTracks, setPlayingTracks] = useState([]);
  // URLs pendentes para tocar assim que houver interação (unlockAudio)
  const pendingRef = useRef(new Set());
  // volumes desejados (persistência)
  const desiredVolumesRef = useRef({});
  const socketRef = useRef(socket);

  const audioCtxRef = useRef(null);
  const destinationRef = useRef(null);
  const musicStreamRef = useRef(null);
  const [interactionAllowed, setInteractionAllowed] = useState(false);

  // Firestore doc ref
  const currentSoundDoc = doc(db, "sound", "current");

  // ----------------------------
  // Helpers: URLs / Normalização
  // ----------------------------
  const normalizeUrl = (url = "") => (url || "").trim().replace(/\/+$/, "").toLowerCase();

  const getMusicUrl = (urlOrName) => {
    if (!urlOrName) return "";
    if (/^https?:\/\//i.test(urlOrName)) return urlOrName.trim();
    const backend = (import.meta.env.VITE_SERVER_URL || "").replace(/\/$/, "");
    if (urlOrName.startsWith("/musicas/")) return `${backend}${urlOrName}`;
    if (backend) return `${backend}/musicas/${urlOrName}`;
    return `/musicas/${urlOrName}`;
  };

  const getFileName = (url) => url.split("/").pop()?.split("?")[0]?.toLowerCase() ?? url;

  const findMatchingAudioKeys = (url) => {
    const normalized = normalizeUrl(getMusicUrl(url));
    const filename = getFileName(normalized);
    return Object.keys(audioObjects.current).filter((k) => {
      const kn = normalizeUrl(k);
      const fn = getFileName(kn);
      return kn === normalized || fn === filename || kn.includes(filename);
    });
  };

  // ----------------------------
  // AudioContext & destination
  // ----------------------------
  function ensureAudioContext() {
    if (!audioCtxRef.current) {
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        const ctx = new AudioCtx();
        const dest = ctx.createMediaStreamDestination();
        audioCtxRef.current = ctx;
        destinationRef.current = dest;
        musicStreamRef.current = dest.stream;
        console.log("🎧 AudioContext e MediaStreamDestination criados.");
      } catch (e) {
        console.warn("Erro ao criar AudioContext:", e);
      }
    }
  }

  // ----------------------------
  // Unlock / interação do usuário
  // ----------------------------
  const unlockAudio = async () => {
    ensureAudioContext();
    if (interactionAllowed) return;

    try {
      if (audioCtxRef.current && audioCtxRef.current.state === "suspended") {
        await audioCtxRef.current.resume();
      }
      setInteractionAllowed(true);

      // processa pendências (tentar tocar tudo que estiver marcado como tocando no snapshot)
      const pend = Array.from(pendingRef.current);
      pendingRef.current.clear();
      pend.forEach((url) => _playLocal(url, { initiatedByLocal: false })); // initiatedByLocal false porque Firestore já marcou como playing
      console.log("🔓 Áudio desbloqueado e pendências processadas.");
    } catch (e) {
      console.warn("Falha ao desbloquear AudioContext:", e);
      // mesmo com erro, marcamos permitido para evitar bloqueios posteriores:
      setInteractionAllowed(true);
      const pend = Array.from(pendingRef.current);
      pendingRef.current.clear();
      pend.forEach((url) => _playLocal(url, { initiatedByLocal: false }));
    }
  };

  // ----------------------------
  // Play local (cria audio + GainNode)
  // options: { initiatedByLocal: boolean } -> se true, atualizamos Firestore (origem local)
  // ----------------------------
  async function _playLocal(url, options = { initiatedByLocal: true }) {
    if (!url) return;
    const full = getMusicUrl(url);
    const fullUrl = normalizeUrl(full);

    ensureAudioContext();

    // se app ainda não desbloqueou áudio, guardar em pendência (mas atualizar o estado do UI)
    if (!interactionAllowed) {
      console.warn("🔒 Pendente até interação:", url);
      pendingRef.current.add(fullUrl);
      // garantir que UI mostre como "playing" (para o painel do mestre refletir)
      setPlayingTracks((p) => [...new Set([...p, fullUrl])]);
      // não tentamos tocar agora
      return;
    }

    // se já existe
    const existing = audioObjects.current[fullUrl];
    if (existing) {
      try {
        await existing.audio.play();
      } catch (err) {
        console.warn("Falha ao retomar áudio existente:", err);
      }
      setPlayingTracks((p) => [...new Set([...p, fullUrl])]);
      // se ação local: sincronizar Firestore
      if (options.initiatedByLocal) await syncFirestoreState();
      return;
    }

    // criar novo <audio>
    const audio = new Audio();
    audio.crossOrigin = "anonymous";
    audio.src = full;
    audio.loop = true;
    audio.preload = "auto";

    const vol = (desiredVolumesRef.current[fullUrl] ?? 100) / 100;
    audio.volume = vol;

    const entry = { audio, gainNode: null, sourceNode: null, volume: vol };

    try {
      const ctx = audioCtxRef.current;
      const dest = destinationRef.current;
      if (ctx && dest) {
        const srcNode = ctx.createMediaElementSource(audio);
        const gainNode = ctx.createGain();
        gainNode.gain.value = vol;
        srcNode.connect(gainNode);
        gainNode.connect(ctx.destination);
        gainNode.connect(dest);

        entry.sourceNode = srcNode;
        entry.gainNode = gainNode;
      }
    } catch (e) {
      console.warn("Erro ao conectar fonte de áudio (mixer):", e);
    }

    audioObjects.current[fullUrl] = entry;

    try {
      await audio.play();
      console.log("▶️ Tocando:", fullUrl);
    } catch (err) {
      // NotAllowedError / AbortError podem ocorrer — mantemos o objeto para futuras tentativas
      console.warn("Falha ao tocar áudio:", err);
    }

    setPlayingTracks((p) => [...new Set([...p, fullUrl])]);

    // se ação local (usuário clicou Play), sincronizar Firestore e emitir via socket
    if (options.initiatedByLocal) {
      try {
        socketRef.current?.emit("play-music", fullUrl);
      } catch (e) {
        console.warn("Falha ao emitir play-music:", e);
      }
      await syncFirestoreState();
    }
  }

  // ----------------------------
  // Pause / Stop
  // ----------------------------
  const pauseMusic = async (url, options = { initiatedByLocal: true }) => {
    const matches = findMatchingAudioKeys(url);
    matches.forEach((k) => {
      const it = audioObjects.current[k];
      if (it) {
        try {
          it.audio.pause();
          it.audio.currentTime = 0;
          try { it.sourceNode?.disconnect(); } catch {}
          try { it.gainNode?.disconnect(); } catch {}
        } catch (err) {
          console.warn("Erro ao pausar faixa:", err);
        }
        delete audioObjects.current[k];
      }
    });
    setPlayingTracks((p) => p.filter((u) => !matches.includes(u)));

    if (options.initiatedByLocal) {
      try {
        socketRef.current?.emit("stop-music", url);
      } catch (e) {
        console.warn("Falha ao emitir stop-music:", e);
      }
      await syncFirestoreState();
    }
  };

  const stopAllMusic = async (options = { initiatedByLocal: true }) => {
    Object.values(audioObjects.current).forEach((it) => {
      try {
        it.audio.pause();
        it.audio.currentTime = 0;
        try { it.sourceNode?.disconnect(); } catch {}
        try { it.gainNode?.disconnect(); } catch {}
      } catch (err) {}
    });
    audioObjects.current = {};
    setPlayingTracks([]);

    if (options.initiatedByLocal) {
      try { socketRef.current?.emit("stop-all-music"); } catch (e) {}
      await syncFirestoreState();
    }
  };

  // ----------------------------
  // Volume
  // ----------------------------
  const setVolume = async (url, value, options = { initiatedByLocal: true }) => {
    const fullUrl = normalizeUrl(getMusicUrl(url));
    desiredVolumesRef.current[fullUrl] = value;

    const matches = findMatchingAudioKeys(url);
    matches.forEach((k) => {
      const it = audioObjects.current[k];
      if (it) {
        const gainValue = value / 100;
        it.volume = gainValue;
        if (it.gainNode) it.gainNode.gain.value = gainValue;
        if (it.audio) it.audio.volume = gainValue;
      }
    });

    if (options.initiatedByLocal) {
      try { socketRef.current?.emit("volume-music", { url: fullUrl, value }); } catch (e) {}
      await syncFirestoreState();
    }
  };

  const getVolume = (url) => {
    const fullUrl = normalizeUrl(getMusicUrl(url));
    const item = audioObjects.current[fullUrl];
    if (item) return item.volume;
    return (desiredVolumesRef.current[fullUrl] ?? 100) / 100;
  };

  const getMusicStream = () => musicStreamRef.current || null;

  // ----------------------------
  // Firestore sync
  // ----------------------------
  const syncFirestoreState = async () => {
    try {
      // gera array com fullUrls normalizados
      const current = Object.keys(audioObjects.current).map((u) => ({
        url: u,
        playing: true,
        volume: Math.round((audioObjects.current[u]?.volume ?? 1) * 100),
      }));
      // sobrescrever doc (mantendo timestamp)
      await setDoc(currentSoundDoc, { sounds: current, updatedAt: serverTimestamp() }, { merge: true });
    } catch (e) {
      console.warn("Erro ao atualizar Firestore (sound/current):", e);
    }
  };

  // ----------------------------
  // Socket.IO listeners (recebendo ações de outros clientes)
  // ----------------------------
  useEffect(() => {
    const s = socketRef.current;
    if (!s) return;

    s.on("play-music", (url) => {
      // remote play: não reescrever Firestore aqui (snapshot já fará)
      _playLocal(url, { initiatedByLocal: false });
    });
    s.on("stop-music", (url) => {
      pauseMusic(url, { initiatedByLocal: false });
    });
    s.on("stop-all-music", () => {
      stopAllMusic({ initiatedByLocal: false });
    });
    s.on("volume-music", ({ url, value }) => {
      setVolume(url, value, { initiatedByLocal: false });
    });

    s.on("connect", () => console.log("🔌 Socket conectado:", s.id));
    s.on("disconnect", () => console.log("❌ Socket desconectado"));

    return () => {
      s.off("play-music");
      s.off("stop-music");
      s.off("stop-all-music");
      s.off("volume-music");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ----------------------------
  // Firestore snapshot listener (estado global persistente)
  // Observações fundamentais:
  // - Atualiza `playingTracks` imediatamente (UI mostra estado global)
  // - Se interactionAllowed === false => NÃO toca os audios; apenas marca pendências
  // - Se interactionAllowed === true => inicia reprodução das faixas necessárias
  // ----------------------------
  useEffect(() => {
    const unsub = onSnapshot(currentSoundDoc, (snap) => {
      const data = snap?.data?.() ?? null;
      if (!data || !Array.isArray(data.sounds)) {
        // se não existe doc ou formato errado, nada a fazer
        setPlayingTracks([]);
        return;
      }

      const sounds = data.sounds;
      // full urls no Firestore (esperamos fullUrl normalizado)
      // extrair lista de urls marcadas como playing
      const playing = sounds.filter((s) => s.playing).map((s) => normalizeUrl(getMusicUrl(s.url || s.url)));
      // atualizar volumes desejados a partir do documento
      sounds.forEach((s) => {
        if (s.url && s.volume != null) {
          desiredVolumesRef.current[normalizeUrl(getMusicUrl(s.url))] = s.volume;
        }
      });

      // atualizar estado do UI (Mestre verá imediatamente)
      setPlayingTracks(playing);

      // pausar localmente faixas que NÃO estão no documento
      Object.keys(audioObjects.current).forEach((url) => {
        if (!playing.includes(url)) {
          // Notar: passamos initiatedByLocal false porque veio do Firestore
          pauseMusic(url, { initiatedByLocal: false });
        }
      });

      // se já permitimos interação, tocar o que estiver no doc; senão, marcar pendências
      if (interactionAllowed) {
        playing.forEach((url) => {
          if (!audioObjects.current[normalizeUrl(url)]) {
            _playLocal(url, { initiatedByLocal: false });
          } else {
            // se existe, garantir volume atualizado
            const vol = desiredVolumesRef.current[normalizeUrl(url)];
            if (vol != null) {
              setVolume(url, vol, { initiatedByLocal: false });
            }
          }
        });
      } else {
        // gravar pendências para tocar quando unlockAudio for chamado
        playing.forEach((url) => pendingRef.current.add(url));
      }
    });

    return () => unsub && unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interactionAllowed]);

  // ----------------------------
  // Provider value (funções públicas)
  // ----------------------------
  return (
    <AudioContextGlobal.Provider
      value={{
        playMusic: (url) => _playLocal(url, { initiatedByLocal: true }),
        pauseMusic: (url) => pauseMusic(url, { initiatedByLocal: true }),
        stopAllMusic: () => stopAllMusic({ initiatedByLocal: true }),
        setVolume: (url, value) => setVolume(url, value, { initiatedByLocal: true }),
        getVolume,
        playingTracks,
        interactionAllowed,
        unlockAudio,
        socket: socketRef.current,
        getMusicStream,
      }}
    >
      {children}
    </AudioContextGlobal.Provider>
  );
}

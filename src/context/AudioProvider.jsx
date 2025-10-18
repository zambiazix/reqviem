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

  // 🔓 Desbloqueia o contexto de áudio
  const unlockAudio = async () => {
    ensureAudioContext();
    if (interactionAllowed) return;

    try {
      await audioCtxRef.current.resume();
      console.log("🔓 AudioContext desbloqueado.");
    } catch (e) {
      console.warn("Falha ao retomar AudioContext:", e);
    }

    setInteractionAllowed(true);
    const pend = Array.from(pendingRef.current);
    pendingRef.current.clear();
    pend.forEach((url) => _playLocal(url));
  };

  // 🎧 Cria o contexto de áudio e o destino de mixagem
  function ensureAudioContext() {
    if (!audioCtxRef.current) {
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        const ctx = new AudioCtx();
        const dest = ctx.createMediaStreamDestination();
        audioCtxRef.current = ctx;
        destinationRef.current = dest;
        musicStreamRef.current = dest.stream;
        console.log("🎧 AudioContext e destino criados.");
      } catch (e) {
        console.warn("Erro ao criar AudioContext:", e);
      }
    }
  }

  // 🔗 Normalização de URLs
  const normalizeUrl = (url = "") => url.trim().replace(/\/+$/, "").toLowerCase();

  const getMusicUrl = (urlOrName) => {
    if (!urlOrName) return "";
    if (/^https?:\/\//i.test(urlOrName)) return urlOrName.trim();
    const backend = (import.meta.env.VITE_SERVER_URL || "").replace(/\/$/, "");
    if (urlOrName.startsWith("/musicas/")) return `${backend}${urlOrName}`;
    if (backend) return `${backend}/musicas/${urlOrName}`;
    return `/musicas/${urlOrName}`;
  };

  const getFileName = (url) =>
    url.split("/").pop()?.split("?")[0]?.toLowerCase() ?? url;

  const findMatchingAudioKeys = (url) => {
    const normalized = normalizeUrl(url);
    const filename = getFileName(normalized);
    return Object.keys(audioObjects.current).filter((k) => {
      const kn = normalizeUrl(k);
      const fn = getFileName(kn);
      return kn === normalized || fn === filename || kn.includes(filename);
    });
  };

  // 🎵 Tocar localmente (com mixer)
  async function _playLocal(url) {
    if (!url) return;
    const fullUrl = normalizeUrl(getMusicUrl(url));

    ensureAudioContext();

    if (!interactionAllowed) {
      console.warn("🔒 Pendente até interação:", url);
      pendingRef.current.add(url);
      return;
    }

    const existing = audioObjects.current[fullUrl];
    if (existing) {
      try {
        await existing.audio.play();
      } catch (err) {
        console.warn("Falha ao retomar áudio:", err);
      }
      setPlayingTracks((p) => [...new Set([...p, fullUrl])]);
      return;
    }

    const audio = new Audio();
    audio.crossOrigin = "anonymous";
    audio.src = fullUrl;
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
      console.warn("Erro ao conectar fonte de áudio:", e);
    }

    audioObjects.current[fullUrl] = entry;

    try {
      await audio.play();
      console.log("▶️ Tocando:", fullUrl);
    } catch (err) {
      console.warn("Falha ao tocar áudio:", err);
    }

    setPlayingTracks((p) => [...new Set([...p, fullUrl])]);
  }

  // ▶️ Play global
  const playMusic = (url) => {
    _playLocal(url);
    socketRef.current?.emit("play-music", url);
  };

  // ⏸ Parar música
  const pauseMusic = (url) => {
    const matches = findMatchingAudioKeys(url);
    matches.forEach((k) => {
      const it = audioObjects.current[k];
      if (it) {
        try {
          it.audio.pause();
          it.audio.currentTime = 0;
          it.sourceNode?.disconnect?.();
          it.gainNode?.disconnect?.();
        } catch {}
        delete audioObjects.current[k];
      }
    });
    setPlayingTracks((p) => p.filter((u) => !matches.includes(u)));
  };

  // 🛑 Parar todas
  const stopAllMusic = () => {
    Object.values(audioObjects.current).forEach((it) => {
      try {
        it.audio.pause();
        it.audio.currentTime = 0;
        it.sourceNode?.disconnect?.();
        it.gainNode?.disconnect?.();
      } catch {}
    });
    audioObjects.current = {};
    setPlayingTracks([]);
  };

  // 🔊 Ajuste de volume local (via GainNode)
  const setVolume = (url, value) => {
    const fullUrl = normalizeUrl(url);
    desiredVolumesRef.current[fullUrl] = value;

    const matches = findMatchingAudioKeys(url);
    matches.forEach((k) => {
      const it = audioObjects.current[k];
      if (it) {
        try {
          const gainValue = value / 100;
          it.volume = gainValue;
          if (it.gainNode) it.gainNode.gain.value = gainValue;
          if (it.audio) it.audio.volume = gainValue;
          console.log("🔊 Volume aplicado:", k, value);
        } catch (err) {
          console.warn("Erro ao ajustar volume:", err);
        }
      }
    });
  };

  const getVolume = (url) => {
    const fullUrl = normalizeUrl(url);
    const item = audioObjects.current[fullUrl];
    if (item) return item.volume;
    return (desiredVolumesRef.current[fullUrl] ?? 100) / 100;
  };

  const getMusicStream = () => musicStreamRef.current || null;

  // 🧠 Socket.IO — sincronização
  useEffect(() => {
    const s = socketRef.current;
    if (!s) return;

    s.on("play-music", (url) => _playLocal(url));
    s.on("stop-music", (url) => pauseMusic(url));
    s.on("stop-all-music", stopAllMusic);
    s.on("volume-music", ({ url, value }) => setVolume(url, value));

    s.on("connect", () => console.log("🔌 Socket conectado:", s.id));
    s.on("disconnect", () => console.log("❌ Socket desconectado"));

    return () => {
      s.off("play-music");
      s.off("stop-music");
      s.off("stop-all-music");
      s.off("volume-music");
    };
  }, []);

  // 🔥 Firestore — sincronização de estado global
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "sound", "current"), (snap) => {
      const data = snap?.data?.() ?? snap;
      if (!data) return;
      const sounds = Array.isArray(data.sounds) ? data.sounds : [];
      const playing = sounds.filter((s) => s.playing).map((s) => s.url);

      Object.keys(audioObjects.current).forEach((url) => {
        if (!playing.includes(url)) pauseMusic(url);
      });

      if (interactionAllowed) {
        playing.forEach((url) => {
          const full = getMusicUrl(url);
          if (!audioObjects.current[normalizeUrl(full)]) _playLocal(full);
        });
      } else {
        console.log("🔒 Som pendente Firestore:", playing);
      }

      sounds.forEach((s) => {
        if (s.url && s.volume != null) setVolume(s.url, s.volume);
      });
    });

    return () => unsub && unsub();
  }, [interactionAllowed]);

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
      }}
    >
      {children}
    </AudioContextGlobal.Provider>
  );
}

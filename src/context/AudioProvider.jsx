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

  // 🔓 Libera áudio após interação
  const unlockAudio = () => {
    if (interactionAllowed) return;
    setInteractionAllowed(true);
    const pend = Array.from(pendingRef.current);
    pendingRef.current.clear();
    pend.forEach((url) => _playLocal(url));
  };

  // 🎧 Cria o AudioContext
  function ensureAudioContext() {
    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioCtx();
      const dest = ctx.createMediaStreamDestination();
      audioCtxRef.current = ctx;
      destinationRef.current = dest;
      musicStreamRef.current = dest.stream;
    }
  }

  // 🔗 Normaliza URLs (para garantir que sejam idênticas)
  const normalizeUrl = (url = "") =>
    url.trim().replace(/\/+$/, "").toLowerCase();

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
    const normalized = normalizeUrl(url);
    const filename = getFileName(normalized);
    return Object.keys(audioObjects.current).filter((k) => {
      const kn = normalizeUrl(k);
      const fn = getFileName(kn);
      return kn === normalized || fn === filename || kn.includes(filename);
    });
  };

  async function _playLocal(url) {
    if (!url) return;
    if (!interactionAllowed) {
      pendingRef.current.add(url);
      console.warn("🔒 Pendente até interação:", url);
      return;
    }

    const fullUrl = normalizeUrl(getMusicUrl(url));
    const existing = audioObjects.current[fullUrl];

    if (!existing) {
      ensureAudioContext();

      const audio = new Audio();
      audio.crossOrigin = "anonymous";
      audio.src = fullUrl;
      audio.loop = true;
      audio.preload = "auto";

      const vol = (desiredVolumesRef.current[fullUrl] ?? 100) / 100;
      audio.volume = vol;

      const entry = { audio, volume: vol, sourceNode: null };

      try {
        if (audioCtxRef.current) {
          const srcNode = audioCtxRef.current.createMediaElementSource(audio);
          srcNode.connect(audioCtxRef.current.destination);
          destinationRef.current && srcNode.connect(destinationRef.current);
          entry.sourceNode = srcNode;
        }
      } catch {}

      audioObjects.current[fullUrl] = entry;

      audio.play().then(() => console.log("▶️ Tocando:", fullUrl));
      setPlayingTracks((p) => [...new Set([...p, fullUrl])]);
    } else {
      existing.audio.play();
      setPlayingTracks((p) => [...new Set([...p, fullUrl])]);
    }
  }

  const playMusic = (url) => {
    _playLocal(url);
    socketRef.current?.emit("play-music", url);
  };

  const pauseMusic = (url) => {
    const matches = findMatchingAudioKeys(url);
    matches.forEach((k) => {
      const it = audioObjects.current[k];
      if (it) {
        it.audio.pause();
        it.audio.currentTime = 0;
        it.sourceNode?.disconnect?.();
        delete audioObjects.current[k];
      }
    });
    setPlayingTracks((p) => p.filter((u) => !matches.includes(u)));
  };

  const stopAllMusic = () => {
    Object.values(audioObjects.current).forEach((it) => {
      it.audio.pause();
      it.audio.currentTime = 0;
      it.sourceNode?.disconnect?.();
    });
    audioObjects.current = {};
    setPlayingTracks([]);
  };

  const setVolume = (url, value) => {
    const fullUrl = normalizeUrl(url);
    desiredVolumesRef.current[fullUrl] = value;

    const matches = findMatchingAudioKeys(url);
    matches.forEach((k) => {
      const it = audioObjects.current[k];
      if (it) {
        it.audio.volume = value / 100;
        it.volume = value / 100;
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

  // 🧠 SOCKET
  useEffect(() => {
    const s = socketRef.current;
    if (!s) return;

    s.on("play-music", (url) => _playLocal(url));
    s.on("stop-music", (url) => pauseMusic(url));
    s.on("stop-all-music", stopAllMusic);
    s.on("volume-music", ({ url, value }) => setVolume(url, value));

    s.on("connect", () => console.log("🔌 Socket conectado"));
    s.on("disconnect", () => console.log("❌ Socket desconectado"));

    return () => {
      s.off("play-music");
      s.off("stop-music");
      s.off("stop-all-music");
      s.off("volume-music");
    };
  }, [interactionAllowed]);

  // 🔥 FIRESTORE
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "sound", "current"), (snap) => {
      const data = snap?.data?.() ?? snap;
      if (!data) return;
      const sounds = Array.isArray(data.sounds) ? data.sounds : [];
      const playing = sounds.filter((s) => s.playing).map((s) => s.url);

      Object.keys(audioObjects.current).forEach((url) => {
        if (!playing.includes(url)) pauseMusic(url);
      });

      playing.forEach((url) => {
        const full = getMusicUrl(url);
        if (!audioObjects.current[normalizeUrl(full)]) _playLocal(full);
      });

      sounds.forEach((s) => {
        if (s.url && s.volume != null) setVolume(s.url, s.volume);
      });
    });

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
      }}
    >
      {children}
    </AudioContextGlobal.Provider>
  );
}

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

  // Monta URL completa
  const getMusicUrl = (urlOrName) => {
    if (!urlOrName) return "";
    if (/^https?:\/\//i.test(urlOrName)) return urlOrName; // já é Cloudinary
    const backend = (import.meta.env.VITE_BACKEND_URL || "").replace(/\/$/, "");
    return `${backend}/musicas/${urlOrName}`;
  };

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
      const audio = new Audio();
      audio.crossOrigin = "anonymous";
      audio.src = fullUrl;
      audio.loop = true;
      audio.preload = "auto";
      audio.volume = (desiredVolumesRef.current[fullUrl] ?? 100) / 100;

      audio.addEventListener("error", (e) => {
        console.error("Audio error:", fullUrl, e, audio.error);
      });

      try {
        if (audioCtxRef.current) {
          const srcNode = audioCtxRef.current.createMediaElementSource(audio);
          srcNode.connect(audioCtxRef.current.destination);
          if (destinationRef.current) srcNode.connect(destinationRef.current);
          audioObjects.current[fullUrl] = { audio, sourceNode: srcNode, volume: audio.volume };
        } else {
          audioObjects.current[fullUrl] = { audio, sourceNode: null, volume: audio.volume };
        }
      } catch (e) {
        console.warn("Fallback sem MediaElementSource:", e);
        audioObjects.current[fullUrl] = { audio, sourceNode: null, volume: audio.volume };
      }

      audio.play().catch((err) => {
        console.warn("Audio play falhou para", fullUrl, err);
        pendingRef.current.add(url);
      });

      setPlayingTracks((prev) => (prev.includes(fullUrl) ? prev : [...prev, fullUrl]));
    } else {
      existing.audio.play().catch((err) => console.warn("Erro ao dar play:", err));
      setPlayingTracks((prev) => (prev.includes(fullUrl) ? prev : [...prev, fullUrl]));
    }
  }

  const playMusic = (url) => {
    _playLocal(url);
    try {
      socketRef.current?.emit("play-music", url);
    } catch {}
  };

  const pauseMusic = (url) => {
    if (!url) return;
    const fullUrl = getMusicUrl(url);
    if (audioObjects.current[fullUrl]) {
      try {
        audioObjects.current[fullUrl].audio.pause();
        audioObjects.current[fullUrl].audio.currentTime = 0;
        audioObjects.current[fullUrl].sourceNode?.disconnect?.();
      } catch {}
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
        audioObjects.current[k].sourceNode?.disconnect?.();
      } catch {}
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
      } catch {}
    }
  };

  const getVolume = (url) => {
    const fullUrl = getMusicUrl(url);
    if (audioObjects.current[fullUrl]) return audioObjects.current[fullUrl].volume;
    if (desiredVolumesRef.current[fullUrl] != null) return desiredVolumesRef.current[fullUrl] / 100;
    return 1.0;
  };

  const getMusicStream = () => musicStreamRef.current || null;

  // Eventos de socket
  useEffect(() => {
    const s = socketRef.current;
    if (!s) return;

    s.on("play-music", (url) => _playLocal(url));
    s.on("stop-music", (url) => pauseMusic(url));
    s.on("stop-all-music", () => stopAllMusic());
    s.on("volume-music", ({ url, value }) => setVolume(url, value));

    s.on("connect", () => console.log("Socket conectado (AudioProvider):", s.id));
    s.on("disconnect", () => console.log("Socket desconectado (AudioProvider)"));

    return () => {
      s.off("play-music");
      s.off("stop-music");
      s.off("stop-all-music");
      s.off("volume-music");
    };
  }, [interactionAllowed]);

  // Firestore sync
  useEffect(() => {
    let unsub;
    try {
      unsub = onSnapshot(doc(db, "sound", "current"), (snap) => {
        const data = snap?.data?.() ?? snap;
        if (!data) return;
        const sounds = Array.isArray(data.sounds) ? data.sounds : [];
        const playing = sounds.filter((s) => s.playing).map((s) => s.url);

        Object.keys(audioObjects.current).forEach((url) => {
          if (!playing.includes(url)) pauseMusic(url);
        });
        playing.forEach((url) => {
          if (!audioObjects.current[url]) _playLocal(url);
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
      }}
    >
      {children}
    </AudioContextGlobal.Provider>
  );
}

// src/context/AudioProvider.jsx
import React, { createContext, useContext, useRef, useState, useEffect } from "react";
import socket from "../socket";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebaseConfig";

const AudioContextGlobal = createContext();
export const useAudio = () => useContext(AudioContextGlobal);

/**
 * 🎧 AudioProvider
 * - Sincroniza músicas e ambientes via Socket.IO + Firestore
 * - Garante compatibilidade com Cloudinary, backend no Render/Vercel e fallback local
 * - Permite controle remoto (mestre controla todos)
 */
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

  // 🔓 Libera o áudio após interação do usuário
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
        console.log("🎧 AudioContext criado e MediaStreamDestination disponível.");
      } catch (e) {
        console.warn("Falha ao criar AudioContext:", e);
      }
    }
  }

  const getMusicUrl = (urlOrName) => {
    if (!urlOrName) return "";
    if (/^https?:\/\//i.test(urlOrName)) return urlOrName.trim();
    if (urlOrName.startsWith("/musicas/")) {
      const backend = (import.meta.env.VITE_SERVER_URL || "").replace(/\/$/, "");
      return backend ? `${backend}${urlOrName}` : urlOrName;
    }
    const backend = (import.meta.env.VITE_SERVER_URL || "").replace(/\/$/, "");
    if (backend) return `${backend}/musicas/${urlOrName}`;
    if (urlOrName.startsWith("/")) return urlOrName;
    return `/musicas/${urlOrName}`;
  };

  const getShortName = (full) => full?.replace(/.*\/musicas\//, "") || full;
  const getFileName = (url) => (url?.split("/").pop()?.split("?")[0]) || url;

  function findMatchingAudioKeys(url) {
    const fullResolved = getMusicUrl(url);
    const short = getShortName(fullResolved);
    const filename = getFileName(fullResolved).toLowerCase();

    return Object.keys(audioObjects.current).filter((k) => {
      const fname = getFileName(k).toLowerCase();
      return (
        k === fullResolved ||
        getShortName(k) === short ||
        fname === filename ||
        k.includes(short) ||
        fname.includes(filename)
      );
    });
  }

  async function _playLocal(url) {
    if (!url) return;
    if (!interactionAllowed) {
      pendingRef.current.add(url);
      console.warn("Usuário ainda não desbloqueou áudio. Pending:", url);
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

      const vol =
        (desiredVolumesRef.current[fullUrl] ??
          desiredVolumesRef.current[getShortName(fullUrl)] ??
          100) / 100;
      audio.volume = vol;

      try {
        if (audioCtxRef.current) {
          const srcNode = audioCtxRef.current.createMediaElementSource(audio);
          srcNode.connect(audioCtxRef.current.destination);
          if (destinationRef.current) srcNode.connect(destinationRef.current);
          audioObjects.current[fullUrl] = { audio, sourceNode: srcNode, volume: vol };
        } else {
          audioObjects.current[fullUrl] = { audio, sourceNode: null, volume: vol };
        }
      } catch {
        audioObjects.current[fullUrl] = { audio, sourceNode: null, volume: vol };
      }

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
    if (!url) return;
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
    desiredVolumesRef.current[url] = value;
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
    const fullUrl = getMusicUrl(url);
    const item = audioObjects.current[fullUrl];
    if (item) return item.volume;
    return (desiredVolumesRef.current[fullUrl] ?? 100) / 100;
  };

  const getMusicStream = () => musicStreamRef.current || null;

  // 🔁 Socket listeners
  useEffect(() => {
    const s = socketRef.current;
    if (!s) return;

    const onPlay = (url) => _playLocal(url);

    const onStop = (url) => {
      console.log("🛑 socket -> stop-music recebido:", url);
      const matches = findMatchingAudioKeys(url);
      matches.forEach((k) => {
        const it = audioObjects.current[k];
        if (it) {
          it.audio.pause();
          it.audio.currentTime = 0;
          delete audioObjects.current[k];
          setPlayingTracks((prev) => prev.filter((p) => p !== k));
          console.log("⏹️ Música parada:", k);
        }
      });
    };

    const onStopAll = () => stopAllMusic();

    const onVolume = ({ url, value }) => {
      console.log("🔊 socket -> volume-music recebido:", url, value);
      const matches = findMatchingAudioKeys(url);
      desiredVolumesRef.current[url] = value;
      if (matches.length === 0) {
        console.log("💾 Volume guardado (sem match ainda):", url);
        return;
      }
      matches.forEach((k) => {
        const it = audioObjects.current[k];
        if (it) {
          it.audio.volume = value / 100;
          it.volume = value / 100;
          console.log("✅ Volume aplicado:", k);
        }
      });
    };

    s.on("play-music", onPlay);
    s.on("stop-music", onStop);
    s.on("stop-all-music", onStopAll);
    s.on("volume-music", onVolume);

    return () => {
      s.off("play-music", onPlay);
      s.off("stop-music", onStop);
      s.off("stop-all-music", onStopAll);
      s.off("volume-music", onVolume);
    };
  }, [interactionAllowed]);

  // 🔥 Firestore
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "sound", "current"), (snap) => {
      const data = snap?.data?.() ?? snap;
      if (!data) return;
      const sounds = Array.isArray(data.sounds) ? data.sounds : [];
      const playing = sounds.filter((s) => s.playing).map((s) => s.url);

      Object.keys(audioObjects.current).forEach((url) => {
        const short = getShortName(url);
        if (!playing.includes(url) && !playing.includes(short)) pauseMusic(short);
      });

      playing.forEach((url) => {
        const full = getMusicUrl(url);
        if (!audioObjects.current[full]) _playLocal(url);
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
        _internal: { audioCtxRef, destinationRef, musicStreamRef },
      }}
    >
      {children}
    </AudioContextGlobal.Provider>
  );
}

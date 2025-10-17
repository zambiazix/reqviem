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

  /**
   * 🧭 getMusicUrl
   * Resolve URL de música considerando Cloudinary, backend e fallback local.
   * Mantém URLs absolutas exatamente como vieram (essencial para controle de volume/pause).
   */
  const getMusicUrl = (urlOrName) => {
    if (!urlOrName) return "";

    // 1️⃣ URL absoluta → retorna idêntica
    if (/^https?:\/\//i.test(urlOrName)) {
      return urlOrName.trim();
    }

    // 2️⃣ Já vem com /musicas/
    if (urlOrName.startsWith("/musicas/")) {
      const backend = (import.meta.env.VITE_SERVER_URL || "").replace(/\/$/, "");
      return backend ? `${backend}${urlOrName}` : urlOrName;
    }

    // 3️⃣ Nome simples
    const backend = (import.meta.env.VITE_SERVER_URL || "").replace(/\/$/, "");
    if (backend) return `${backend}/musicas/${urlOrName}`;

    // 4️⃣ Fallback local
    if (urlOrName.startsWith("/")) return urlOrName;
    return `/musicas/${urlOrName}`;
  };

  async function checkUrlAccessible(fullUrl) {
    try {
      const r = await fetch(fullUrl, { method: "HEAD", mode: "cors" });
      return r.ok;
    } catch {
      return false;
    }
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

      try {
        const ok = await checkUrlAccessible(fullUrl);
        if (!ok) console.warn("⚠️ URL inacessível:", fullUrl);
      } catch (e) {
        console.warn("checkUrlAccessible erro:", e);
      }

      const audio = new Audio();
      audio.crossOrigin = "anonymous";
      audio.src = fullUrl;
      audio.loop = true;
      audio.preload = "auto";
      const vol = (desiredVolumesRef.current[fullUrl] ?? 100) / 100;
      audio.volume = vol;

      audio.addEventListener("error", (e) =>
        console.error("Audio error:", fullUrl, e, audio.error)
      );

      try {
        if (audioCtxRef.current) {
          const srcNode = audioCtxRef.current.createMediaElementSource(audio);
          try { srcNode.connect(audioCtxRef.current.destination); } catch {}
          if (destinationRef.current) {
            try { srcNode.connect(destinationRef.current); } catch {}
          }
          audioObjects.current[fullUrl] = { audio, sourceNode: srcNode, volume: vol };
        } else {
          audioObjects.current[fullUrl] = { audio, sourceNode: null, volume: vol };
        }
      } catch (e) {
        console.warn("Falha ao criar MediaElementSource:", e);
        audioObjects.current[fullUrl] = { audio, sourceNode: null, volume: vol };
      }

      audio
        .play()
        .then(() => console.log("▶️ Tocando:", fullUrl))
        .catch((err) => {
          console.warn("Audio play falhou:", fullUrl, err);
          pendingRef.current.add(url);
        });

      setPlayingTracks((prev) =>
        prev.includes(fullUrl) ? prev : [...prev, fullUrl]
      );
    } else {
      existing.audio
        .play()
        .then(() => console.log("▶️ Retomando:", fullUrl))
        .catch((err) => console.warn("Erro ao dar play:", err));
      setPlayingTracks((prev) =>
        prev.includes(fullUrl) ? prev : [...prev, fullUrl]
      );
    }
  }

  // 🎛 Interface pública
  const playMusic = (url) => {
    _playLocal(url);
    socketRef.current?.emit("play-music", url);
  };

  const pauseMusic = (url) => {
    if (!url) return;
    const fullUrl = getMusicUrl(url);
    const item = audioObjects.current[fullUrl];
    if (item) {
      try {
        item.audio.pause();
        item.audio.currentTime = 0;
        item.sourceNode?.disconnect?.();
      } catch (err) {
        console.warn("Erro ao pausar:", err);
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
    const item = audioObjects.current[fullUrl];
    if (item) {
      try {
        item.audio.volume = value / 100;
        item.volume = value / 100;
      } catch (err) {
        console.warn("Erro setVolume:", err);
      }
    }
  };

  const getVolume = (url) => {
    const fullUrl = getMusicUrl(url);
    const item = audioObjects.current[fullUrl];
    if (item) return item.volume;
    if (desiredVolumesRef.current[fullUrl] != null)
      return desiredVolumesRef.current[fullUrl] / 100;
    return 1.0;
  };

  const getMusicStream = () => musicStreamRef.current || null;

  // 🔁 Socket listeners
  useEffect(() => {
    const s = socketRef.current;
    if (!s) return;

    const onPlay = (url) => _playLocal(url);
    const onStop = (url) => pauseMusic(url);
    const onStopAll = () => stopAllMusic();
    const onVolume = ({ url, value }) => setVolume(url, value);

    s.on("play-music", onPlay);
    s.on("stop-music", onStop);
    s.on("stop-all-music", onStopAll);
    s.on("volume-music", onVolume);

    s.on("connect", () => console.log("🔌 Socket conectado:", s.id));
    s.on("disconnect", () => console.log("❌ Socket desconectado"));

    return () => {
      s.off("play-music", onPlay);
      s.off("stop-music", onStop);
      s.off("stop-all-music", onStopAll);
      s.off("volume-music", onVolume);
    };
  }, [interactionAllowed]);

  // 🔥 Firestore: sincronização
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "sound", "current"), (snap) => {
      const data = snap?.data?.() ?? snap;
      if (!data) return;
      const sounds = Array.isArray(data.sounds) ? data.sounds : [];
      const playing = sounds.filter((s) => s.playing).map((s) => s.url);

      // Pausa músicas não listadas
      Object.keys(audioObjects.current).forEach((url) => {
        const shortName = url.replace(/.*\/musicas\//, "");
        if (!playing.includes(url) && !playing.includes(shortName)) pauseMusic(shortName);
      });

      // Toca novas músicas
      playing.forEach((url) => {
        const full = getMusicUrl(url);
        if (!audioObjects.current[full]) _playLocal(url);
      });

      // Aplica volumes
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

// src/context/AudioProvider.jsx
import React, { createContext, useContext, useRef, useState, useEffect } from "react";
import socket from "../socket";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebaseConfig";

const AudioContextGlobal = createContext();
export const useAudio = () => useContext(AudioContextGlobal);

export default function AudioProvider({ children }) {
  // 🧭 Define a URL base do backend para servir músicas
  const BASE_URL =
    import.meta.env.VITE_BACKEND_URL?.replace(/\/$/, "") ||
    "https://reqviem-backend.vercel.app/musicas";

  // 🎵 Armazena os objetos de áudio em execução
  const audioObjects = useRef({});
  const [playingTracks, setPlayingTracks] = useState([]);
  const pendingRef = useRef(new Set());
  const desiredVolumesRef = useRef({});
  const socketRef = useRef(socket);

  // 🎧 Contexto e stream global de áudio
  const audioCtxRef = useRef(null);
  const destinationRef = useRef(null);
  const musicStreamRef = useRef(null);

  // 🎮 Controle de interação do usuário
  const [interactionAllowed, setInteractionAllowed] = useState(false);
  const unlockAudio = () => {
    if (interactionAllowed) return;
    setInteractionAllowed(true);
    const pend = Array.from(pendingRef.current);
    pendingRef.current.clear();
    pend.forEach((url) => _playLocal(url));
  };

  // 🧠 Criação do AudioContext global
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

  // 🎶 Função interna de play
  function _playLocal(url) {
    if (!url) return;
    if (!interactionAllowed) {
      pendingRef.current.add(url);
      return;
    }

    ensureAudioContext();

    // 🧩 Monta a URL final dependendo do ambiente
    let finalUrl = url;
    if (!url.startsWith("http")) {
      // exemplo: "BatalhaFinal.mp3" → "https://backend/musicas/BatalhaFinal.mp3"
      finalUrl = `${BASE_URL}/${url.replace(/^\/+/, "")}`;
    } else if (url.includes("localhost")) {
      // exemplo: "http://localhost:5173/BatalhaFinal.mp3" → "https://backend/musicas/BatalhaFinal.mp3"
      const filename = url.split("/").pop();
      finalUrl = `${BASE_URL}/${filename}`;
    }

    const existing = audioObjects.current[finalUrl];
    if (!existing) {
      const audio = new Audio();
      audio.crossOrigin = "anonymous";
      audio.src = encodeURI(finalUrl);
      audio.loop = true;
      audio.preload = "auto";

      audio.addEventListener("error", (e) => {
        console.error("Audio error:", finalUrl, e, audio.error);
      });

      const vol = (desiredVolumesRef.current[finalUrl] ?? 100) / 100;
      audio.volume = vol;

      try {
        if (audioCtxRef.current) {
          const srcNode = audioCtxRef.current.createMediaElementSource(audio);
          try {
            srcNode.connect(audioCtxRef.current.destination);
          } catch {}
          if (destinationRef.current) {
            try {
              srcNode.connect(destinationRef.current);
            } catch (err) {
              console.warn("Erro conectar srcNode -> destination:", err);
            }
          }
          audioObjects.current[finalUrl] = { audio, sourceNode: srcNode, volume: vol };
        } else {
          audioObjects.current[finalUrl] = { audio, sourceNode: null, volume: vol };
        }
      } catch (e) {
        console.warn("Falha ao criar MediaElementSource (fallback):", e);
        audioObjects.current[finalUrl] = { audio, sourceNode: null, volume: vol };
      }

      audio
        .play()
        .then(() => console.log("🎵 Tocando:", finalUrl))
        .catch((err) => {
          console.warn("Audio play falhou para", finalUrl, err);
          pendingRef.current.add(finalUrl);
        });

      setPlayingTracks((prev) => (prev.includes(finalUrl) ? prev : [...prev, finalUrl]));
    } else {
      existing.audio
        .play()
        .then(() => console.log("🎵 Reproduzindo novamente:", finalUrl))
        .catch((err) => {
          console.warn("Erro ao dar play no existente:", err);
          pendingRef.current.add(finalUrl);
        });
      setPlayingTracks((prev) => (prev.includes(finalUrl) ? prev : [...prev, finalUrl]));
    }
  }

  // 🔊 Controle global de play/pause/volume
  const playMusic = (url) => {
    _playLocal(url);
    try {
      socketRef.current?.emit("play-music", url);
    } catch (e) {}
  };

  const pauseMusic = (url) => {
    if (!url) return;
    const allKeys = Object.keys(audioObjects.current);
    const key = allKeys.find((k) => k.includes(url)) || url;
    if (audioObjects.current[key]) {
      try {
        audioObjects.current[key].audio.pause();
        try {
          audioObjects.current[key].sourceNode?.disconnect?.();
        } catch {}
      } catch (err) {
        console.warn("Erro pausar:", err);
      }
      delete audioObjects.current[key];
    }
    setPlayingTracks((prev) => prev.filter((u) => !u.includes(url)));
    pendingRef.current.delete(url);
  };

  const stopAllMusic = () => {
    Object.keys(audioObjects.current).forEach((url) => {
      try {
        audioObjects.current[url].audio.pause();
        audioObjects.current[url].audio.currentTime = 0;
        try {
          audioObjects.current[url].sourceNode?.disconnect?.();
        } catch {}
      } catch (err) {}
    });
    audioObjects.current = {};
    setPlayingTracks([]);
    pendingRef.current.clear();
  };

  const setVolume = (url, value) => {
    desiredVolumesRef.current[url] = value;
    const allKeys = Object.keys(audioObjects.current);
    const key = allKeys.find((k) => k.includes(url)) || url;
    if (audioObjects.current[key]) {
      try {
        audioObjects.current[key].audio.volume = value / 100;
        audioObjects.current[key].volume = value / 100;
      } catch (err) {
        console.warn("Erro setVolume:", err);
      }
    }
  };

  const getVolume = (url) => {
    const allKeys = Object.keys(audioObjects.current);
    const key = allKeys.find((k) => k.includes(url)) || url;
    if (audioObjects.current[key]) return audioObjects.current[key].volume;
    if (desiredVolumesRef.current[url] != null)
      return desiredVolumesRef.current[url] / 100;
    return 1.0;
  };

  const getMusicStream = () => musicStreamRef.current || null;

  // 🔁 Sincronização com Socket.IO
  useEffect(() => {
    const s = socketRef.current;
    if (!s) return;

    const onPlay = (url) => {
      if (!interactionAllowed) {
        console.warn("Usuário ainda não desbloqueou áudio. Esperando gesture...");
        pendingRef.current.add(url);
        return;
      }
      if (!audioObjects.current[url]) _playLocal(url);
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

  // 🔥 Sincronização com Firestore (sound/current)
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
          if (!Object.keys(audioObjects.current).includes(url)) _playLocal(url);
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

  // 🧩 Retorno do Provider global
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

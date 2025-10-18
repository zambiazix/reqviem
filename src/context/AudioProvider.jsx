import React, { createContext, useContext, useRef, useState, useEffect } from "react";
import socket from "../socket";
import { doc, onSnapshot, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebaseConfig";

const AudioContextGlobal = createContext();
export const useAudio = () => useContext(AudioContextGlobal);

export default function AudioProvider({ children }) {
  const audioCtxRef = useRef(null);
  const destinationRef = useRef(null);
  const streamRef = useRef(null);
  const audioObjects = useRef({});
  const desiredVolumesRef = useRef({});
  const [playingTracks, setPlayingTracks] = useState([]);
  const [interactionAllowed, setInteractionAllowed] = useState(false);
  const pendingRef = useRef(new Set());
  const socketRef = useRef(socket);
  const currentSoundDoc = doc(db, "sound", "current");

  // 🔹 Garante que o contexto de áudio exista
  function ensureAudioContext() {
    if (!audioCtxRef.current) {
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        const ctx = new AudioCtx();
        const dest = ctx.createMediaStreamDestination();
        audioCtxRef.current = ctx;
        destinationRef.current = dest;
        streamRef.current = dest.stream;
        console.log("🎧 AudioContext inicializado.");
      } catch (e) {
        console.warn("Erro ao criar AudioContext:", e);
      }
    }
  }

  // 🔓 Desbloqueia o áudio com uma interação do usuário
  const unlockAudio = async () => {
    ensureAudioContext();
    if (interactionAllowed) return;
    try {
      if (audioCtxRef.current.state === "suspended") {
        await audioCtxRef.current.resume();
      }
      setInteractionAllowed(true);
      const pend = Array.from(pendingRef.current);
      pendingRef.current.clear();
      pend.forEach((url) => _playLocal(url, { initiatedByLocal: false }));
      console.log("🔓 Áudio desbloqueado.");
    } catch (e) {
      console.warn("Falha ao desbloquear áudio:", e);
      setInteractionAllowed(true);
    }
  };

  // 🔗 Normalização
  const normalizeUrl = (url = "") => url.trim().replace(/\/+$/, "").toLowerCase();

  // ▶️ Tocar faixa localmente
  async function _playLocal(url, { initiatedByLocal = true } = {}) {
    if (!url) return;
    ensureAudioContext();

    const fullUrl = normalizeUrl(url);

    if (!interactionAllowed) {
      console.warn("Pendente até interação:", url);
      pendingRef.current.add(fullUrl);
      setPlayingTracks((p) => [...new Set([...p, fullUrl])]);
      return;
    }

    // já tocando
    if (audioObjects.current[fullUrl]) {
      try {
        await audioObjects.current[fullUrl].audio.play();
      } catch (e) {
        console.warn("Erro ao retomar:", e);
      }
      setPlayingTracks((p) => [...new Set([...p, fullUrl])]);
      if (initiatedByLocal) await syncFirestoreState();
      return;
    }

    // criar novo objeto
    const audio = new Audio(fullUrl);
    audio.crossOrigin = "anonymous";
    audio.loop = true;
    audio.preload = "auto";

    const ctx = audioCtxRef.current;
    const dest = destinationRef.current;
    const gainNode = ctx.createGain();
    const srcNode = ctx.createMediaElementSource(audio);

    const vol = (desiredVolumesRef.current[fullUrl] ?? 100) / 100;
    gainNode.gain.value = vol;
    audio.volume = vol;
    srcNode.connect(gainNode);
    gainNode.connect(ctx.destination);
    gainNode.connect(dest);

    audioObjects.current[fullUrl] = { audio, gainNode, srcNode, volume: vol };

    try {
      await audio.play();
      console.log("▶️ Tocando:", fullUrl);
    } catch (e) {
      console.warn("Falha ao iniciar reprodução:", e);
    }

    setPlayingTracks((p) => [...new Set([...p, fullUrl])]);
    if (initiatedByLocal) {
      socketRef.current?.emit("play-music", fullUrl);
      await syncFirestoreState();
    }
  }

  // ⏸️ Parar faixa
  const pauseMusic = async (url, { initiatedByLocal = true } = {}) => {
    const normalized = normalizeUrl(url);
    const it = audioObjects.current[normalized];
    if (it) {
      try {
        it.audio.pause();
        it.audio.currentTime = 0;
        it.srcNode?.disconnect();
        it.gainNode?.disconnect();
      } catch {}
      delete audioObjects.current[normalized];
    }
    setPlayingTracks((p) => p.filter((x) => x !== normalized));
    if (initiatedByLocal) {
      socketRef.current?.emit("stop-music", url);
      await syncFirestoreState();
    }
  };

  // ⛔ Parar tudo
  const stopAllMusic = async ({ initiatedByLocal = true } = {}) => {
    Object.values(audioObjects.current).forEach((it) => {
      try {
        it.audio.pause();
        it.srcNode?.disconnect();
        it.gainNode?.disconnect();
      } catch {}
    });
    audioObjects.current = {};
    setPlayingTracks([]);
    if (initiatedByLocal) {
      socketRef.current?.emit("stop-all-music");
      await syncFirestoreState();
    }
  };

  // 🔊 Volume
  const setVolume = async (url, value, { initiatedByLocal = true } = {}) => {
    const full = normalizeUrl(url);
    desiredVolumesRef.current[full] = value;
    const it = audioObjects.current[full];
    const v = value / 100;
    if (it) {
      it.volume = v;
      if (it.gainNode) it.gainNode.gain.value = v;
      if (it.audio) it.audio.volume = v;
    }
    if (initiatedByLocal) {
      socketRef.current?.emit("volume-music", { url: full, value });
      await syncFirestoreState();
    }
  };

  const getVolume = (url) => {
    const full = normalizeUrl(url);
    const it = audioObjects.current[full];
    return it ? it.volume : (desiredVolumesRef.current[full] ?? 100) / 100;
  };

  const getMusicStream = () => streamRef.current;

  // 🔥 Firestore sync global
  const syncFirestoreState = async () => {
    try {
      const list = Object.entries(audioObjects.current).map(([u, o]) => ({
        url: u,
        playing: true,
        volume: Math.round((o.volume ?? 1) * 100),
      }));
      await setDoc(currentSoundDoc, { sounds: list, updatedAt: serverTimestamp() });
    } catch (e) {
      console.warn("Erro ao atualizar Firestore:", e);
    }
  };

  // 🔁 Firestore → atualiza local
  useEffect(() => {
    const unsub = onSnapshot(currentSoundDoc, (snap) => {
      const data = snap.data();
      if (!data?.sounds) {
        setPlayingTracks([]);
        return;
      }

      const playing = data.sounds.filter((s) => s.playing).map((s) => normalizeUrl(s.url));
      const volumes = {};
      data.sounds.forEach((s) => {
        volumes[normalizeUrl(s.url)] = s.volume;
      });
      desiredVolumesRef.current = volumes;
      setPlayingTracks(playing);

      Object.keys(audioObjects.current).forEach((url) => {
        if (!playing.includes(url)) pauseMusic(url, { initiatedByLocal: false });
      });

      if (interactionAllowed) {
        playing.forEach((url) => {
          if (!audioObjects.current[url]) {
            _playLocal(url, { initiatedByLocal: false });
          } else {
            const vol = volumes[url];
            if (vol != null) setVolume(url, vol, { initiatedByLocal: false });
          }
        });
      } else {
        playing.forEach((url) => pendingRef.current.add(url));
      }
    });
    return () => unsub();
  }, [interactionAllowed]);

  // ⚡ Socket listeners
  useEffect(() => {
    const s = socketRef.current;
    if (!s) return;

    s.on("play-music", (url) => _playLocal(url, { initiatedByLocal: false }));
    s.on("stop-music", (url) => pauseMusic(url, { initiatedByLocal: false }));
    s.on("stop-all-music", () => stopAllMusic({ initiatedByLocal: false }));
    s.on("volume-music", ({ url, value }) =>
      setVolume(url, value, { initiatedByLocal: false })
    );

    s.on("connect", () => console.log("🎧 Socket conectado:", s.id));
    s.on("disconnect", () => console.log("❌ Socket desconectado"));

    return () => {
      s.off("play-music");
      s.off("stop-music");
      s.off("stop-all-music");
      s.off("volume-music");
    };
  }, []);

  return (
    <AudioContextGlobal.Provider
      value={{
        playMusic: (url) => _playLocal(url, { initiatedByLocal: true }),
        pauseMusic: (url) => pauseMusic(url, { initiatedByLocal: true }),
        stopAllMusic: () => stopAllMusic({ initiatedByLocal: true }),
        setVolume: (url, value) => setVolume(url, value, { initiatedByLocal: true }),
        getVolume,
        playingTracks,
        unlockAudio,
        interactionAllowed,
        getMusicStream,
        socket: socketRef.current,
      }}
    >
      {children}
    </AudioContextGlobal.Provider>
  );
}

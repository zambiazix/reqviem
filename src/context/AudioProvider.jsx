import React, { createContext, useContext, useRef, useState, useEffect } from "react";
import socket from "../socket";
import { doc, onSnapshot, updateDoc, getDoc } from "firebase/firestore";
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

  // 🔹 Firestore cache
  const currentSoundDoc = doc(db, "sound", "current");

  // ----------------------------
  // Helpers: URLs / Normalização
  // ----------------------------
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

      // tocar pendências
      const pend = Array.from(pendingRef.current);
      pendingRef.current.clear();
      pend.forEach((url) => _playLocal(url));

      console.log("🔓 Áudio desbloqueado e pendências processadas.");
    } catch (e) {
      console.warn("Falha ao desbloquear AudioContext:", e);
      setInteractionAllowed(true);
      const pend = Array.from(pendingRef.current);
      pendingRef.current.clear();
      pend.forEach((url) => _playLocal(url));
    }
  };

  // ----------------------------
  // Core: play / pause
  // ----------------------------
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
        console.warn("Falha ao retomar áudio existente:", err);
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
      console.warn("Erro ao conectar fonte de áudio (mixer):", e);
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

  const pauseMusic = async (url) => {
    const matches = findMatchingAudioKeys(url);
    matches.forEach((k) => {
      const it = audioObjects.current[k];
      if (it) {
        try {
          it.audio.pause();
          it.audio.currentTime = 0;
          try { it.sourceNode?.disconnect(); } catch {}
          try { it.gainNode?.disconnect(); } catch {}
        } catch {}
        delete audioObjects.current[k];
      }
    });
    setPlayingTracks((p) => p.filter((u) => !matches.includes(u)));

    // atualiza no firestore
    await syncFirestoreState();
  };

  const stopAllMusic = async () => {
    Object.values(audioObjects.current).forEach((it) => {
      try {
        it.audio.pause();
        it.audio.currentTime = 0;
        it.sourceNode?.disconnect();
        it.gainNode?.disconnect();
      } catch {}
    });
    audioObjects.current = {};
    setPlayingTracks([]);
    await syncFirestoreState();
  };

  // ----------------------------
  // Volume
  // ----------------------------
  const setVolume = async (url, value) => {
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

    await syncFirestoreState();
  };

  const getVolume = (url) => {
    const fullUrl = normalizeUrl(getMusicUrl(url));
    const item = audioObjects.current[fullUrl];
    return item ? item.volume : (desiredVolumesRef.current[fullUrl] ?? 100) / 100;
  };

  const getMusicStream = () => musicStreamRef.current || null;

  // ----------------------------
  // Firestore sync
  // ----------------------------
  const syncFirestoreState = async () => {
    try {
      const current = Object.keys(audioObjects.current).map((u) => ({
        url: u,
        playing: true,
        volume: Math.round(
          (audioObjects.current[u]?.volume ?? 1) * 100
        ),
      }));

      await updateDoc(currentSoundDoc, { sounds: current });
    } catch (e) {
      console.warn("Erro ao atualizar Firestore (sound/current):", e);
    }
  };

  // 🔁 Listener Firestore
  useEffect(() => {
    const unsub = onSnapshot(currentSoundDoc, async (snap) => {
      const data = snap.data();
      if (!data || !Array.isArray(data.sounds)) return;

      const sounds = data.sounds;
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
        playing.forEach((url) => pendingRef.current.add(url));
      }

      sounds.forEach((s) => {
        if (s.url && s.volume != null) setVolume(s.url, s.volume);
      });

      setPlayingTracks(playing.map(normalizeUrl));
    });

    return () => unsub && unsub();
  }, [interactionAllowed]);

  return (
    <AudioContextGlobal.Provider
      value={{
        playMusic: (url) => {
          _playLocal(url);
          syncFirestoreState();
        },
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

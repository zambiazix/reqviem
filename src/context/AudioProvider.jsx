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
  const audioObjects = useRef({}); // canonicalFullUrl -> { audio, gainNode, srcNode, volume }
  const desiredVolumesRef = useRef({}); // canonicalFullUrl -> volume (0-100)
  const [playingTracks, setPlayingTracks] = useState([]); // array of canonicalFullUrl
  const [interactionAllowed, setInteractionAllowed] = useState(false);
  const pendingRef = useRef(new Set()); // canonicalFullUrl pendentes
  const socketRef = useRef(socket);
  const currentSoundDoc = doc(db, "sound", "current");

  // Helpers
  const getMusicUrl = (urlOrName) => {
  if (!urlOrName) return "";

  // Se for uma URL completa, apenas retorna
  if (/^https?:\/\//i.test(urlOrName)) return urlOrName.trim();

  // SE o arquivo existir no frontend (public/musicas/)
  // então deve tocar LOCAL, direto do Vercel.
  if (urlOrName.endsWith(".mp3") || urlOrName.endsWith(".wav")) {
    return `/musicas/${urlOrName.replace("/musicas/", "")}`;
  }

  // Somente músicas globais grandes continuam pelo backend:
  const backend = (import.meta.env.VITE_SERVER_URL || "").replace(/\/$/, "");
  if (backend) return `${backend}/musicas/${urlOrName}`;

  // fallback
  return `/musicas/${urlOrName}`;
};


  const normalizeUrl = (url = "") =>
    (url || "").trim().replace(/\/+$/, "").toLowerCase();

  // Create AudioContext & destination once
  function ensureAudioContext() {
    if (!audioCtxRef.current) {
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        const ctx = new AudioCtx();
        const dest = ctx.createMediaStreamDestination();
        audioCtxRef.current = ctx;
        destinationRef.current = dest;
        streamRef.current = dest.stream;
        console.log("AudioContext & MediaStreamDestination criados.");
      } catch (e) {
        console.warn("Erro ao criar AudioContext:", e);
      }
    }
  }

  // unlockAudio para permitir autoplay
  const unlockAudio = async () => {
    ensureAudioContext();
    if (interactionAllowed) return;
    try {
      if (audioCtxRef.current && audioCtxRef.current.state === "suspended") {
        await audioCtxRef.current.resume();
      }
      setInteractionAllowed(true);
      // process pending tracks that were marked playing
      const pend = Array.from(pendingRef.current);
      pendingRef.current.clear();
      for (const u of pend) {
        await _playLocal(u, { initiatedByLocal: false });
      }
      console.log("Áudio desbloqueado e pendências processadas.");
    } catch (e) {
      console.warn("Falha ao desbloquear o AudioContext:", e);
      setInteractionAllowed(true);
    }
  };

  // internal play that expects canonical full URLs
  async function _playLocal(rawUrl, { initiatedByLocal = true } = {}) {
    if (!rawUrl) return;
    ensureAudioContext();
    const full = normalizeUrl(getMusicUrl(rawUrl));

    // if not unlocked, mark pending + update UI but don't call actual .play()
    if (!interactionAllowed) {
      pendingRef.current.add(full);
      setPlayingTracks((p) => [...new Set([...p, full])]);
      console.log("Pendente até interação:", full);
      return;
    }

    // already playing?
    if (audioObjects.current[full]) {
      try {
        await audioObjects.current[full].audio.play();
      } catch (e) {
        console.warn("Erro ao retomar áudio existente:", e);
      }
      setPlayingTracks((p) => [...new Set([...p, full])]);
      if (initiatedByLocal) await syncFirestoreState();
      return;
    }

    // create audio element and WebAudio nodes
    const audio = new Audio(full);
    audio.crossOrigin = "anonymous";
    audio.loop = true;
    audio.preload = "auto";

    const ctx = audioCtxRef.current;
    const dest = destinationRef.current;
    let srcNode = null;
    let gainNode = null;

    try {
      if (ctx && dest) {
        srcNode = ctx.createMediaElementSource(audio);
        gainNode = ctx.createGain();
        const vol = (desiredVolumesRef.current[full] ?? 100) / 100;
        gainNode.gain.value = vol;
        srcNode.connect(gainNode);
        gainNode.connect(ctx.destination);
        gainNode.connect(dest);
      }
    } catch (e) {
      console.warn("Erro ao conectar node de áudio (mixer):", e);
    }

    const vol = (desiredVolumesRef.current[full] ?? 100) / 100;
    audio.volume = vol;
    audioObjects.current[full] = { audio, gainNode, srcNode, volume: vol };

    try {
      await audio.play();
      console.log("▶️ Tocando:", full);
    } catch (err) {
      console.warn("Falha ao tocar áudio (pode ser NotAllowed/Abort):", err);
    }

    setPlayingTracks((p) => [...new Set([...p, full])]);

    // if local user initiated, broadcast via socket and persist
    if (initiatedByLocal) {
      try { socketRef.current?.emit("play-music", full); } catch {}
      await syncFirestoreState();
    }
  }

  const pauseMusic = async (rawUrl, { initiatedByLocal = true } = {}) => {
    const full = normalizeUrl(getMusicUrl(rawUrl));
    const it = audioObjects.current[full];
    if (it) {
      try {
        it.audio.pause();
        it.audio.currentTime = 0;
        try { it.srcNode?.disconnect(); } catch {}
        try { it.gainNode?.disconnect(); } catch {}
      } catch (e) { /* ignore */ }
      delete audioObjects.current[full];
    }
    setPlayingTracks((p) => p.filter((u) => u !== full));
    if (initiatedByLocal) {
      try { socketRef.current?.emit("stop-music", full); } catch {}
      await syncFirestoreState();
    }
  };

  const stopAllMusic = async ({ initiatedByLocal = true } = {}) => {
    Object.keys(audioObjects.current).forEach((k) => {
      try {
        audioObjects.current[k].audio.pause();
        audioObjects.current[k].audio.currentTime = 0;
        try { audioObjects.current[k].srcNode?.disconnect(); } catch {}
        try { audioObjects.current[k].gainNode?.disconnect(); } catch {}
      } catch {}
    });
    audioObjects.current = {};
    setPlayingTracks([]);
    if (initiatedByLocal) {
      try { socketRef.current?.emit("stop-all-music"); } catch {}
      await syncFirestoreState();
    }
  };

  const setVolume = async (rawUrl, value, { initiatedByLocal = true } = {}) => {
    const full = normalizeUrl(getMusicUrl(rawUrl));
    desiredVolumesRef.current[full] = value;
    const it = audioObjects.current[full];
    const v = value / 100;
    if (it) {
      it.volume = v;
      try { if (it.gainNode) it.gainNode.gain.value = v; } catch {}
      try { if (it.audio) it.audio.volume = v; } catch {}
    }
    if (initiatedByLocal) {
      try { socketRef.current?.emit("volume-music", { url: full, value }); } catch {}
      await syncFirestoreState();
    }
  };

  const getVolume = (rawUrl) => {
    const full = normalizeUrl(getMusicUrl(rawUrl));
    const it = audioObjects.current[full];
    if (it) return it.volume;
    return (desiredVolumesRef.current[full] ?? 100) / 100;
  };

  const getMusicStream = () => streamRef.current || null;

  // Persist state to Firestore (writes canonical full urls)
  const syncFirestoreState = async () => {
    try {
      const list = Object.keys(audioObjects.current).map((u) => ({
        url: u,
        playing: true,
        volume: Math.round((audioObjects.current[u]?.volume ?? 1) * 100),
      }));
      await setDoc(currentSoundDoc, { sounds: list, updatedAt: serverTimestamp() });
    } catch (e) {
      console.warn("Erro ao atualizar Firestore:", e);
    }
  };

  // SOCKET listeners (realtime)
  useEffect(() => {
    const s = socketRef.current;
    if (!s) return;
    s.on("play-music", (url) => _playLocal(url, { initiatedByLocal: false }));
    s.on("stop-music", (url) => pauseMusic(url, { initiatedByLocal: false }));
    s.on("stop-all-music", () => stopAllMusic({ initiatedByLocal: false }));
    s.on("volume-music", ({ url, value }) => setVolume(url, value, { initiatedByLocal: false }));
    s.on("connect", () => console.log("Socket conectado:", s.id));
    s.on("disconnect", () => console.log("Socket desconectado"));
    return () => {
      s.off("play-music");
      s.off("stop-music");
      s.off("stop-all-music");
      s.off("volume-music");
    };
  }, []);

  // Firestore listener — **NO AUTOMATIC PLAY ON FIRST SNAPSHOT**
  const firstSnapshotRef = useRef(true);
  const prevSoundsRef = useRef([]); // array of canonical urls representing previous snapshot

  useEffect(() => {
    const unsub = onSnapshot(currentSoundDoc, (snap) => {
      const data = snap?.data?.() ?? null;
      if (!data || !Array.isArray(data.sounds)) {
        setPlayingTracks([]);
        prevSoundsRef.current = [];
        firstSnapshotRef.current = false;
        return;
      }

      // canonicalize sounds from doc
      const sounds = data.sounds.map((s) => ({
        url: normalizeUrl(getMusicUrl(s.url || s.url)),
        playing: !!s.playing,
        volume: s.volume != null ? s.volume : 100,
      }));

      // update desired volumes map
      sounds.forEach((s) => {
        desiredVolumesRef.current[s.url] = s.volume;
      });

      const playing = sounds.filter((s) => s.playing).map((s) => s.url);
      setPlayingTracks(playing);

      // if first snapshot: do NOT auto-play, just update prevSoundsRef and UI
      if (firstSnapshotRef.current) {
        prevSoundsRef.current = playing;
        firstSnapshotRef.current = false;
        // mark pending if not allowed
        if (!interactionAllowed) {
          playing.forEach((u) => pendingRef.current.add(u));
        }
        return;
      }

      // compute diffs: start newly playing, stop removed
      const prev = prevSoundsRef.current || [];
      const newlyStarted = playing.filter((u) => !prev.includes(u));
      const newlyStopped = prev.filter((u) => !playing.includes(u));
      prevSoundsRef.current = playing;

      // stop removed
      newlyStopped.forEach((u) => {
        pauseMusic(u, { initiatedByLocal: false });
      });

      // start new (if interactionAllowed, otherwise pend)
      newlyStarted.forEach((u) => {
        if (interactionAllowed) _playLocal(u, { initiatedByLocal: false });
        else pendingRef.current.add(u);
      });

      // apply updated volumes
      sounds.forEach((s) => {
        if (s.volume != null) setVolume(s.url, s.volume, { initiatedByLocal: false });
      });
    });

    return () => unsub && unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interactionAllowed]);

  return (
    <AudioContextGlobal.Provider
      value={{
        playMusic: (url) => _playLocal(url, { initiatedByLocal: true }),
        pauseMusic: (url) => pauseMusic(url, { initiatedByLocal: true }),
        stopAllMusic: () => stopAllMusic({ initiatedByLocal: true }),
        setVolume: (url, v) => setVolume(url, v, { initiatedByLocal: true }),
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

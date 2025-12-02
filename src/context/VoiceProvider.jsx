// src/context/VoiceProvider.jsx
import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import socket from "../socket"; // <<-- CORREÇÃO IMPORT: arquivo socket.js está em src/socket.js
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { db } from "../firebaseConfig";
import {
  getDoc,
  doc,
  getDocs,
  collection,
  query as firestoreQuery,
  where,
} from "firebase/firestore";
import { useAudio } from "../context/AudioProvider"; // ajuste se seu path for diferente

// Limite de peers suportados pelo cliente (pode ajustar)
const MAX_PEERS = 10;
const RTC_CONFIG = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };

const VoiceContext = createContext();
export const useVoice = () => useContext(VoiceContext);

export default function VoiceProvider({ children }) {
  // --- State ---
  const [inVoice, setInVoice] = useState(false);
  const [participants, setParticipants] = useState([]); // {id, nick, email}
  const [localMuted, setLocalMuted] = useState(false);
  const [speakingIds, setSpeakingIds] = useState(new Set());
  const [userNick, setUserNick] = useState("");
  const [localSocketId, setLocalSocketId] = useState(null);
  const [avatars, setAvatars] = useState({});

  // --- Refs & internals ---
  const localStreamRef = useRef(null);
  const peersRef = useRef({}); // { [remoteId]: { pc, polite, makingOffer, ignoreOffer, isSettingRemote, audioEl } }
  const pendingCandidatesRef = useRef({}); // { [remoteId]: [candidate,] }
  const analyserRef = useRef(null);
  const rafRef = useRef(null);
  const localSocketIdRef = useRef(null);
  const prevLocalSpeakingRef = useRef(false);
  const pendingPlaybackRefs = useRef(new Set());
  const pendingNegotiations = useRef(new Set()); // remoteId set that we're negotiating with

  const { unlockAudio, getMusicStream } = useAudio();

  // --- identity (preserve seu comportamento) ---
  useEffect(() => {
    const auth = getAuth();
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const snap = await getDoc(doc(db, "users", user.email));
          const nick = snap.exists() ? snap.data().nick : user.email.split("@")[0];
          setUserNick(nick);
        } catch (e) {
          console.warn("VoiceProvider: erro ao buscar nick:", e);
          setUserNick(user.email.split("@")[0]);
        }
      } else {
        setUserNick("");
      }
    });
    return () => unsub();
  }, []);

  // ----------- VAD (voice activity detection) -----------
  function startLocalAnalyser(stream) {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioCtx();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      const src = ctx.createMediaStreamSource(stream);
      src.connect(analyser);
      analyserRef.current = { ctx, analyser, src };

      const data = new Uint8Array(analyser.frequencyBinCount);
      const detect = () => {
        if (!analyserRef.current) return;
        analyser.getByteFrequencyData(data);
        const vol = data.reduce((a, b) => a + b, 0) / data.length;
        const speaking = vol > 18;
        const sid = localSocketIdRef.current || socket?.id;
        // update speakingIds set and emit to server when changes
        if (speaking && !prevLocalSpeakingRef.current) {
          prevLocalSpeakingRef.current = true;
          try { socket?.emit("voice-speaking", { speaking: true }); } catch (e) {}
        } else if (!speaking && prevLocalSpeakingRef.current) {
          prevLocalSpeakingRef.current = false;
          try { socket?.emit("voice-speaking", { speaking: false }); } catch (e) {}
        }
        // schedule next
        rafRef.current = requestAnimationFrame(detect);
      };
      rafRef.current = requestAnimationFrame(detect);
    } catch (e) {
      console.warn("startLocalAnalyser erro:", e);
    }
  }

  function stopLocalAnalyser() {
    try {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      if (analyserRef.current) {
        analyserRef.current.src?.disconnect?.();
        analyserRef.current.ctx?.close?.();
        analyserRef.current = null;
      }
    } catch (e) {}
  }

  // ----------- local media -----------
  async function ensureLocalStream() {
    try {
      if (localStreamRef.current) return localStreamRef.current;
      await unlockAudio?.();
      const s = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = s;
      startLocalAnalyser(s);
      return s;
    } catch (e) {
      console.warn("ensureLocalStream erro:", e);
      throw e;
    }
  }

  function stopLocalStream() {
    try {
      if (!localStreamRef.current) return;
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
      stopLocalAnalyser();
    } catch (e) {}
  }

  // ----------- helpers para peers -----------
  function applyPendingCandidates(remoteId) {
    try {
      const arr = pendingCandidatesRef.current[remoteId] || [];
      const pc = peersRef.current[remoteId]?.pc;
      if (!pc) return;
      for (const c of arr) {
        try { pc.addIceCandidate(c); } catch (e) { /* swallow */ }
      }
      pendingCandidatesRef.current[remoteId] = [];
    } catch (e) { console.warn("applyPendingCandidates erro:", e); }
  }

  function createHiddenAudio(remoteId, stream) {
    try {
      const existing = peersRef.current[remoteId];
      if (!existing) return;
      // if already has audio element, update srcObject
      if (existing.audioEl) {
        existing.audioEl.srcObject = stream;
        existing.audioEl.play?.();
        return;
      }
      const audio = document.createElement("audio");
      audio.autoplay = true;
      audio.playsInline = true;
      audio.muted = false;
      audio.style.display = "none";
      audio.srcObject = stream;
      document.body.appendChild(audio);
      peersRef.current[remoteId].audioEl = audio;
      audio.play?.().catch(()=>{});
    } catch (e) { console.warn("createHiddenAudio erro:", e); }
  }

  async function addLocalTracksToPeer(pc) {
    try {
      if (!localStreamRef.current) return;
      localStreamRef.current.getTracks().forEach((t) => pc.addTrack(t, localStreamRef.current));
    } catch (e) { console.warn("addLocalTracksToPeer erro:", e); }
  }

  // negotiation lock helpers (client-side wrappers that call server)
  async function requestServerNegotiationLock() {
    try {
      return await new Promise((res) => {
        try { socket?.emit("voice-negotiate-request", null, (reply) => res(reply)); }
        catch (e) { res({ granted: false }); }
      });
    } catch (e) {
      return { granted: false };
    }
  }
  function releaseServerNegotiationLock() {
    try { socket?.emit("voice-negotiate-release"); } catch (e) {}
  }

  // --- create peer connection with polite handling but using server lock before offers ---
  function createPeerIfNeeded(remoteId) {
    if (!remoteId) return null;
    if (peersRef.current[remoteId]?.pc) return peersRef.current[remoteId].pc;

    // enforce MAX_PEERS
    if (Object.keys(peersRef.current).length >= MAX_PEERS) {
      console.warn("MAX_PEERS reached; skipping peer create for", remoteId);
      // queue candidates to apply when peer created later
      pendingCandidatesRef.current[remoteId] = pendingCandidatesRef.current[remoteId] || [];
      return null;
    }

    const localId = socket?.id || "";
    const polite = localId < remoteId;
    const pc = new RTCPeerConnection(RTC_CONFIG);

    peersRef.current[remoteId] = {
      pc,
      polite,
      makingOffer: false,
      ignoreOffer: false,
      isSettingRemote: false,
      audioEl: null,
    };

    pc.onicecandidate = (ev) => {
      if (ev.candidate) {
        try {
          socket.emit("voice-signal", { target: remoteId, data: { candidate: ev.candidate } });
        } catch (err) {}
      }
    };

    pc.ontrack = (e) => {
      try {
        const stream = (e.streams && e.streams[0]) || (e.track ? new MediaStream([e.track]) : null);
        if (!stream) { console.warn("ontrack: stream not found", remoteId, e); return; }
        createHiddenAudio(remoteId, stream);
      } catch (err) { console.warn("ontrack erro:", err); }
    };

    pc.onconnectionstatechange = () => {
      if (["failed", "disconnected", "closed"].includes(pc.connectionState)) {
        cleanupPeer(remoteId);
      }
    };

    // negotiationneeded -> request server lock, then createOffer
    pc.onnegotiationneeded = async () => {
      const entry = peersRef.current[remoteId];
      if (!entry) return;
      if (entry.makingOffer) return;
      entry.makingOffer = true;
      try {
        const lockRes = await requestServerNegotiationLock();
        if (!lockRes || !lockRes.granted) {
          entry.makingOffer = false;
          return;
        }
        pendingNegotiations.current.add(remoteId);
        await new Promise((r) => setTimeout(r, 10));
        if (pc.signalingState !== "stable") {
          pendingNegotiations.current.delete(remoteId);
          releaseServerNegotiationLock();
          entry.makingOffer = false;
          return;
        }
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        try {
          socket.emit("voice-signal", { target: remoteId, data: { sdp: pc.localDescription } });
        } catch (e) {}
      } catch (e) {
        console.warn("onnegotiationneeded erro:", e);
      } finally {
        pendingNegotiations.current.delete(remoteId);
        releaseServerNegotiationLock();
        entry.makingOffer = false;
      }
    };

    // add local tracks if available
    if (localStreamRef.current) addLocalTracksToPeer(pc);

    // inject musicStream if present (keep audioProvider integration)
    (async () => {
      try {
        const ms = getMusicStream?.();
        if (ms && ms.getAudioTracks && ms.getAudioTracks().length > 0) {
          ms.getAudioTracks().forEach((t) => {
            try { pc.addTrack(t, ms); } catch (e) {}
          });
          console.debug("musicStream injected into peer:", remoteId);
        }
      } catch (e) { console.warn("Erro ao injetar musicStream:", e); }
    })();

    // apply queued candidates
    applyPendingCandidates(remoteId);

    return pc;
  }

  // helper para criar + enviar offer (usado manualmente)
  async function createAndSendOffer(remoteId) {
    const pc = createPeerIfNeeded(remoteId);
    if (!pc) return;
    const entry = peersRef.current[remoteId] || {};
    if (entry.makingOffer) return;
    entry.makingOffer = true;
    try {
      const lockRes = await requestServerNegotiationLock();
      if (!lockRes || !lockRes.granted) {
        entry.makingOffer = false;
        return;
      }
      pendingNegotiations.current.add(remoteId);
      if (pc.signalingState !== "stable") {
        pendingNegotiations.current.delete(remoteId);
        releaseServerNegotiationLock();
        entry.makingOffer = false;
        return;
      }
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      try {
        socket.emit("voice-signal", { target: remoteId, data: { sdp: pc.localDescription } });
      } catch (e) {}
    } catch (e) {
      console.warn("createAndSendOffer erro:", e);
    } finally {
      pendingNegotiations.current.delete(remoteId);
      releaseServerNegotiationLock();
      entry.makingOffer = false;
    }
  }

  // ----------- cleanupPeer -----------
  function cleanupPeer(remoteId) {
    try {
      const entry = peersRef.current[remoteId];
      if (!entry) return;
      try {
        if (entry.audioEl && entry.audioEl.parentNode) {
          entry.audioEl.pause?.();
          entry.audioEl.srcObject = null;
          entry.audioEl.remove();
        }
      } catch (e) {}
      try {
        entry.pc?.close?.();
      } catch (e) {}
      delete peersRef.current[remoteId];
      delete pendingCandidatesRef.current[remoteId];
      pendingPlaybackRefs.current.delete(remoteId);
    } catch (e) {
      console.warn("cleanupPeer erro:", e);
    }
  }

  // ----------- fetch avatar (mantive) -----------
  async function fetchAvatar(p) {
    try {
      let email = p.email || null;
      if (!email && p.nick) {
        const q = firestoreQuery(collection(db, "users"), where("nick", "==", p.nick));
        const snaps = await getDocs(q);
        if (snaps.size > 0) email = snaps.docs[0].id;
      }
      if (email) {
        const ficha = await getDoc(doc(db, "fichas", email));
        if (ficha.exists()) return ficha.data().imagemPersonagem || "";
      }
    } catch (e) {
      console.debug("fetchAvatar erro:", e);
    }
    return "";
  }

  // ----------- socket wiring -----------
  useEffect(() => {
    if (!socket) return;
    setLocalSocketId(socket.id);
    localSocketIdRef.current = socket.id;

    // participants list
    socket.on("voice-participants", async (list) => {
      const arr = Array.isArray(list) ? list : [];
      setParticipants(arr);

      // criar/prepare peers para cada participante (exceto eu)
      for (const p of arr) {
        if (!p || p.id === socket.id) continue;
        createPeerIfNeeded(p.id);
      }

      // prefetch avatars async
      (async () => {
        try {
          const avatarsData = {};
          await Promise.all(
            arr.map(async (p) => {
              const img = await fetchAvatar(p);
              avatarsData[p.id] = img || "";
            })
          );
          setAvatars((prev) => ({ ...(prev || {}), ...avatarsData }));
        } catch (e) {
          // swallow
        }
      })();
    });

    // signaling: sdp / candidate
    socket.on("voice-signal", async ({ from, data }) => {
      if (!from || !data || from === socket.id) return;
      // ensure peer exists
      const pc = createPeerIfNeeded(from);
      const entry = peersRef.current[from];
      if (!pc || !entry) {
        // if peer couldn't be created due to MAX_PEERS, keep candidate pending and ignore sdp offers for now
        if (data?.candidate) {
          pendingCandidatesRef.current[from] = pendingCandidatesRef.current[from] || [];
          pendingCandidatesRef.current[from].push(data.candidate);
        }
        return;
      }

      // candidate
      if (data.candidate) {
        try {
          // if remote description not yet set, queue
          if (entry.isSettingRemote || pc.signalingState === "have-local-offer" || pc.remoteDescription == null) {
            pendingCandidatesRef.current[from] = pendingCandidatesRef.current[from] || [];
            pendingCandidatesRef.current[from].push(data.candidate);
          } else {
            await pc.addIceCandidate(data.candidate).catch(()=>{});
          }
        } catch (e) {
          console.warn("addIceCandidate erro:", e);
        }
        return;
      }

      // sdp
      if (data.sdp) {
        try {
          const sdpType = data.sdp.type;
          const isOffer = sdpType === "offer";
          const polite = !!entry.polite;
          const makingOffer = !!entry.makingOffer;

          // collision detection
          if (isOffer && (makingOffer || pc.signalingState !== "stable")) {
            if (!polite) {
              peersRef.current[from].ignoreOffer = true;
              return;
            }
          }

          // If it's an offer, request server negotiation lock before answering
          if (isOffer) {
            const lockRes = await requestServerNegotiationLock();
            if (!lockRes || !lockRes.granted) {
              // can't get lock -> skip now (server will grant later)
              return;
            }
            pendingNegotiations.current.add(from);
          }

          peersRef.current[from].isSettingRemote = true;
          await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
          peersRef.current[from].isSettingRemote = false;

          if (isOffer) {
            // create answer
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socket.emit("voice-signal", { target: from, data: { sdp: pc.localDescription } });
          }

          // apply queued candidates
          applyPendingCandidates(from);
        } catch (err) {
          peersRef.current[from].isSettingRemote = false;
          console.warn("Erro ao setRemoteDescription/handling sdp:", err);
          // recovery: cleanup peer and try to recreate
          cleanupPeer(from);
          releaseServerNegotiationLock();
          createPeerIfNeeded(from);
          return;
        } finally {
          pendingNegotiations.current.delete(from);
          releaseServerNegotiationLock();
        }
      }
    });

    // speaking updates
    socket.on("voice-speaking-update", (updates) => {
      try {
        const s = new Set(speakingIds);
        (updates || []).forEach((u) => {
          if (u.speaking) s.add(u.id);
          else s.delete(u.id);
        });
        setSpeakingIds(s);
      } catch (e) {}
    });

    socket.on("connect", () => {
      setLocalSocketId(socket.id);
      localSocketIdRef.current = socket.id;
    });

    socket.on("disconnect", () => {
      setLocalSocketId(null);
      localSocketIdRef.current = null;
      // cleanup peers
      Object.keys(peersRef.current).forEach((k) => cleanupPeer(k));
    });

    return () => {
      try {
        socket.off("voice-participants");
        socket.off("voice-signal");
        socket.off("voice-speaking-update");
        socket.off("connect");
        socket.off("disconnect");
      } catch (e) {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket]);

  // --- public API (join/leave/toggle mute etc.) ---
  async function joinVoice() {
    try {
      if (!socket) return;
      const s = await ensureLocalStream();
      setLocalMuted(false);
      setInVoice(true);
      try { socket.emit("voice-join", { nick: userNick || "SemNome" }); } catch (e) {}
    } catch (e) {
      console.warn("joinVoice erro:", e);
      throw e;
    }
  }

  function leaveVoice() {
    try {
      if (socket) {
        try { socket.emit("voice-leave"); } catch (e) {}
      }
      setInVoice(false);
      setParticipants([]);
      setSpeakingIds(new Set());
      stopLocalStream();
      Object.keys(peersRef.current).forEach((k) => cleanupPeer(k));
    } catch (e) {}
  }

  function toggleLocalMute() {
    try {
      if (!localStreamRef.current) return;
      const enabled = !localStreamRef.current.getAudioTracks()[0]?.enabled;
      localStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = enabled));
      setLocalMuted(!enabled);
    } catch (e) {}
  }

  async function kickAllPeers() {
    Object.keys(peersRef.current).forEach(cleanupPeer);
  }

  // expose context value
  const ctx = {
    inVoice,
    participants,
    localSocketId,
    localMuted,
    speakingIds,
    avatars,
    joinVoice,
    leaveVoice,
    toggleLocalMute,
    kickAllPeers,
  };

  return <VoiceContext.Provider value={ctx}>{children}</VoiceContext.Provider>;
}

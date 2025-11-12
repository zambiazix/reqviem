// src/context/VoiceProvider.jsx
import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import socket from "../socket";
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
import { useAudio } from "./AudioProvider";

const MASTER_EMAIL = "mestre@reqviemrpg.com";
const VoiceContext = createContext();
export const useVoice = () => useContext(VoiceContext);

export default function VoiceProvider({ children }) {
  // --- State ---
  const [inVoice, setInVoice] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [localMuted, setLocalMuted] = useState(false);
  const [speakingIds, setSpeakingIds] = useState(new Set());
  const [userNick, setUserNick] = useState("");
  const [localSocketId, setLocalSocketId] = useState(null);
  const [avatars, setAvatars] = useState({});

  // --- Refs & internals ---
  const localStreamRef = useRef(null);
  const peersRef = useRef({});
  const pendingCandidatesRef = useRef({});
  const analyserRef = useRef(null);
  const rafRef = useRef(null);
  const localSocketIdRef = useRef(null);
  const prevLocalSpeakingRef = useRef(false);
  const pendingPlaybackRefs = useRef(new Set());
  const pendingNegotiations = useRef(new Set()); // remoteId set that we are negotiating with

  const { unlockAudio, getMusicStream } = useAudio();
  const RTC_CONFIG = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };

  // --- identity ---
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

  // --- VAD analyzer ---
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
        if (sid && speaking !== prevLocalSpeakingRef.current) {
          prevLocalSpeakingRef.current = speaking;
          setSpeakingIds((prev) => {
            const s = new Set(prev);
            speaking ? s.add(sid) : s.delete(sid);
            return s;
          });
          try {
            socket.emit("voice-speaking", { id: sid, speaking });
          } catch (err) {
            console.debug("socket.emit voice-speaking erro:", err);
          }
        }
        rafRef.current = requestAnimationFrame(detect);
      };
      detect();
    } catch (e) {
      console.warn("Erro em startLocalAnalyser:", e);
    }
  }

  function stopLocalAnalyser() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (analyserRef.current) {
      try {
        analyserRef.current.src.disconnect();
        analyserRef.current.ctx.close();
      } catch (e) {}
      analyserRef.current = null;
    }
  }

  // --- autoplay helpers for hidden remote audio elements ---
  function tryPlayAudioElement(el, remoteId) {
    if (!el) return Promise.resolve(false);
    return el.play()
      .then(() => {
        pendingPlaybackRefs.current.delete(remoteId);
        return true;
      })
      .catch((err) => {
        pendingPlaybackRefs.current.add(remoteId);
        return false;
      });
  }

  async function tryPlayAllPending() {
    const ids = Array.from(pendingPlaybackRefs.current);
    if (!ids.length) return;
    try { if (typeof unlockAudio === "function") await unlockAudio(); } catch (e) {}
    for (const id of ids) {
      const entry = peersRef.current[id];
      if (!entry || !entry.audioEl) { pendingPlaybackRefs.current.delete(id); continue; }
      try { await tryPlayAudioElement(entry.audioEl, id); } catch (e) {}
    }
  }

  useEffect(() => {
    const handler = () => { tryPlayAllPending().catch(()=>{}); };
    window.addEventListener("click", handler);
    window.addEventListener("keydown", handler);
    return () => { window.removeEventListener("click", handler); window.removeEventListener("keydown", handler); };
  }, []);

  // --- hidden audio creation ---
  function createHiddenAudio(remoteId, stream) {
    if (peersRef.current[remoteId]?.audioEl) {
      const el = peersRef.current[remoteId].audioEl;
      try { el.srcObject = stream; } catch (e) { try { el.remove(); } catch {} delete peersRef.current[remoteId].audioEl; }
      tryPlayAudioElement(el, remoteId).catch(()=>{});
      return el;
    }

    const el = document.createElement("audio");
    el.autoplay = true;
    el.playsInline = true;
    el.muted = false;
    el.volume = 1.0;
    el.style.display = "none";
    try { el.srcObject = stream; } catch (e) {}
    el.addEventListener("error", (ev) => { console.warn("audio element error", remoteId, ev); });
    document.body.appendChild(el);

    peersRef.current[remoteId] = { ...(peersRef.current[remoteId]||{}), audioEl: el, _stream: stream };
    tryPlayAudioElement(el, remoteId).catch(()=>{});
    return el;
  }

  // --- ICE pending apply ---
  async function applyPendingCandidates(remoteId) {
    const arr = pendingCandidatesRef.current[remoteId] || [];
    const pc = peersRef.current[remoteId]?.pc;
    if (!pc) return;
    for (const c of arr) {
      try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch (e) { console.warn("Erro ao adicionar candidate pendente:", e); }
    }
    pendingCandidatesRef.current[remoteId] = [];
  }

  // --- cleanup peer ---
  function cleanupPeer(remoteId) {
    const entry = peersRef.current[remoteId];
    if (!entry) return;
    if (entry.pc) try { entry.pc.close(); } catch (e) {}
    if (entry.audioEl) {
      try { entry.audioEl.pause(); } catch (e) {}
      try {
        if (entry.audioEl.srcObject && entry.audioEl.srcObject.getTracks) {
          entry.audioEl.srcObject.getTracks().forEach((t)=>{ try{ t.stop(); }catch{} });
        }
      } catch (e) {}
      try { entry.audioEl.remove(); } catch (e) {}
    }
    delete peersRef.current[remoteId];
    delete pendingCandidatesRef.current[remoteId];
    pendingPlaybackRefs.current.delete(remoteId);
    pendingNegotiations.current.delete(remoteId);
  }

  // --- add local tracks to pc ---
  function addLocalTracksToPeer(pc) {
    if (!localStreamRef.current || !pc) return;
    const existing = pc.getSenders().map((s) => s.track?.id).filter(Boolean);
    localStreamRef.current.getTracks().forEach((t) => {
      if (!existing.includes(t.id)) {
        try { pc.addTrack(t, localStreamRef.current); } catch (e) { console.warn("Erro ao adicionar track local ao peer:", e); }
      }
    });
  }

  // --- negotiation lock helpers (client side) ---
  function requestServerNegotiationLock() {
    return new Promise((res) => {
      try {
        const cbId = Math.random().toString(36).slice(2, 9);
        socket.emit("voice-negotiate-request", cbId);
        const handle = (payload) => {
          if (payload && payload.cbId === cbId) {
            socket.off("voice-negotiate-response", handler);
            res(payload);
          }
        };
        // handler expects server to echo cbId in response (we'll watch voice-negotiate-response and match cbId)
        const handler = (payload) => {
          if (!payload) return;
          if (payload.cbId === cbId) res(payload);
        };
        socket.on("voice-negotiate-response", handler);
        // also listen for direct grant
        const grantHandler = (p) => { if (p && p.grantedTo === socket.id) res({ granted: true, cbId }); };
        socket.on("voice-negotiate-grant", grantHandler);
        // fallback timeout
        setTimeout(() => {
          socket.off("voice-negotiate-response", handler);
          socket.off("voice-negotiate-grant", grantHandler);
          res({ granted: false });
        }, 8000);
      } catch (e) { res({ granted: false }); }
    });
  }

  function releaseServerNegotiationLock() {
    try { socket.emit("voice-negotiate-release"); } catch (e) {}
  }

  // --- create peer connection with polite handling but using server lock before offers ---
  function createPeerIfNeeded(remoteId) {
    if (!remoteId) return null;
    if (peersRef.current[remoteId]?.pc) return peersRef.current[remoteId].pc;

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
        // Request server lock / permission to negotiate
        const lockRes = await requestServerNegotiationLock();
        if (!lockRes || !lockRes.granted) {
          // couldn't get lock; skip negotiation now
          entry.makingOffer = false;
          return;
        }
        pendingNegotiations.current.add(remoteId);
        // guard: only createOffer if stable
        await new Promise((r)=>setTimeout(r, 10));
        if (pc.signalingState !== "stable") {
          // release lock and exit
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

    // inject musicStream if present (but only if it's safe)
    (async () => {
      try {
        const ms = getMusicStream?.();
        if (ms && ms.getAudioTracks().length > 0 && pc.signalingState === "stable") {
          const existing = pc.getSenders().map((s) => s.track?.id);
          ms.getAudioTracks().forEach((t) => {
            if (!existing.includes(t.id)) pc.addTrack(t, ms);
          });
          console.log("🎵 musicStream injetado no peer:", remoteId);
        }
      } catch (e) { console.warn("Erro ao injetar música:", e); }
    })();

    applyPendingCandidates(remoteId);
    return pc;
  }

  // createOffer helper — used in places where you previously forced offer
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
      try { socket.emit("voice-signal", { target: remoteId, data: { sdp: pc.localDescription } }); } catch (e) {}
    } catch (e) {
      console.warn("createAndSendOffer erro:", e);
    } finally {
      pendingNegotiations.current.delete(remoteId);
      releaseServerNegotiationLock();
      entry.makingOffer = false;
    }
  }

  // --- fetch avatar (kept) ---
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
    } catch (e) { console.debug("fetchAvatar erro:", e); }
    return "";
  }

  // --- socket wiring ---
  useEffect(() => {
    if (!socket) return;
    setLocalSocketId(socket.id);
    localSocketIdRef.current = socket.id;

    socket.on("voice-participants", async (list) => {
      const arr = Array.isArray(list) ? list : [];
      setParticipants(arr);

      for (const p of arr) {
        if (!p || p.id === socket.id) continue;
        createPeerIfNeeded(p.id);
        if ((socket.id || "") < p.id) {
          createAndSendOffer(p.id);
        }
      }

      try {
        const avatarsData = {};
        await Promise.all(arr.map(async (p) => {
          const img = await fetchAvatar(p);
          avatarsData[p.id] = img;
        }));
        setAvatars(avatarsData);
      } catch (e) { console.debug("voice-participants avatars fetch erro:", e); }
    });

    // main signaling handler
    socket.on("voice-signal", async ({ from, data }) => {
      if (!from || !data || from === socket.id) return;
      const pc = createPeerIfNeeded(from);
      if (!pc) return;
      try {
        if (data.sdp) {
          const sdpType = data.sdp.type;
          const isOffer = sdpType === "offer";
          const entry = peersRef.current[from] || {};
          const polite = !!entry.polite;
          const makingOffer = !!entry.makingOffer;
          // collision detection
          if (isOffer && (makingOffer || pc.signalingState !== "stable")) {
            if (!polite) {
              // impolite -> ignore
              peersRef.current[from].ignoreOffer = true;
              return;
            }
          }

          // attempt to setRemoteDescription but WAIT for lock to respond if necessary
          try {
            // In order to avoid state errors, obtain server lock before responding to offer if we will createAnswer.
            if (isOffer) {
              // Request lock to produce answer safely
              const lockRes = await requestServerNegotiationLock();
              if (!lockRes || !lockRes.granted) {
                // can't get lock -> skip responding now (peer should retry)
                return;
              }
              pendingNegotiations.current.add(from);
            }

            peersRef.current[from].isSettingRemote = true;
            await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
            peersRef.current[from].isSettingRemote = false;
          } catch (err) {
            peersRef.current[from].isSettingRemote = false;
            console.warn("Erro ao setRemoteDescription:", err);
            // recovery: cleanup peer and request new negotiation if needed
            cleanupPeer(from);
            // release lock if we held it
            releaseServerNegotiationLock();
            // attempt to create fresh peer and let other party re-offer
            createPeerIfNeeded(from);
            return;
          }

          if (isOffer) {
            // create answer now (state should be ok)
            try {
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              try { socket.emit("voice-signal", { target: from, data: { sdp: pc.localDescription } }); } catch (e) {}
            } catch (e) {
              console.warn("Erro ao responder offer:", e);
            } finally {
              pendingNegotiations.current.delete(from);
              releaseServerNegotiationLock();
            }
          } else {
            // it's an answer -> apply pending ICE
            await applyPendingCandidates(from);
          }
        } else if (data.candidate) {
          if (!pc.remoteDescription || pc.remoteDescription.type === null) {
            pendingCandidatesRef.current[from] = pendingCandidatesRef.current[from] || [];
            pendingCandidatesRef.current[from].push(data.candidate);
          } else {
            try { await pc.addIceCandidate(new RTCIceCandidate(data.candidate)); } catch (err) { console.warn("Erro addIceCandidate immed:", err); }
          }
        }
      } catch (e) {
        console.warn("Erro onSignal:", e);
      }
    });

    socket.on("voice-speaking", ({ id, speaking }) => {
      setSpeakingIds((prev) => {
        const s = new Set(prev);
        speaking ? s.add(id) : s.delete(id);
        return s;
      });
    });

    // negotiation responses from server (in case server directly grants)
    socket.on("voice-negotiate-grant", ({ grantedTo }) => {
      // no-op: our requestServerNegotiationLock also listens for voice-negotiate-grant to resolve.
      // kept for diagnostics
      // console.debug("Negotiate grant", grantedTo);
    });

    socket.on("disconnect", () => {
      Object.keys(peersRef.current).forEach(cleanupPeer);
      if (localStreamRef.current) localStreamRef.current.getTracks().forEach((t) => t.stop());
      stopLocalAnalyser();
      setInVoice(false);
      setParticipants([]);
    });

    return () => {
      socket.off("voice-participants");
      socket.off("voice-signal");
      socket.off("voice-speaking");
      socket.off("voice-negotiate-grant");
    };
  }, [userNick, inVoice]);

  // --- start voice ---
  async function startVoice() {
    if (inVoice) return;
    try {
      try { if (typeof unlockAudio === "function") await unlockAudio(); } catch (e) {}
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;

      Object.values(peersRef.current).forEach((entry) => {
        try { addLocalTracksToPeer(entry.pc); } catch (e) { console.warn("Erro ao adicionar tracks a peer existente:", e); }
      });

      try { socket.emit("voice-join", { nick: userNick || "Jogador" }); } catch (err) {}
      setInVoice(true);
      startLocalAnalyser(stream);
      tryPlayAllPending().catch(()=>{});
    } catch (e) {
      console.error("startVoice erro:", e);
      alert("⚠️ Permita o microfone e tente novamente.");
    }
  }

  // --- leave voice ---
  function leaveVoice() {
    try { socket.emit("voice-leave"); } catch (err) {}
    if (localStreamRef.current) localStreamRef.current.getTracks().forEach((t) => t.stop());
    Object.keys(peersRef.current).forEach(cleanupPeer);
    stopLocalAnalyser();
    setInVoice(false);
    pendingPlaybackRefs.current.clear();
  }

  function toggleLocalMute() {
    if (!localStreamRef.current) return;
    const muted = !localMuted;
    localStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = !muted));
    setLocalMuted(muted);
  }

  useEffect(() => () => leaveVoice(), []); // cleanup

  useEffect(() => { tryPlayAllPending().catch(()=>{}); }, [unlockAudio]);

  return (
    <VoiceContext.Provider
      value={{
        inVoice,
        participants,
        localMuted,
        speakingIds,
        startVoice,
        leaveVoice,
        toggleLocalMute,
        localSocketId,
        avatars,
      }}
    >
      {children}
    </VoiceContext.Provider>
  );
}

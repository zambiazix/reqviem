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
  // peersRef: { [remoteId]: { pc, polite, makingOffer, ignoreOffer, isSettingRemote, audioEl, _stream, noTrackRetries, noTrackTimer } }
  const peersRef = useRef({});
  const pendingCandidatesRef = useRef({});
  const analyserRef = useRef(null);
  const rafRef = useRef(null);
  const localSocketIdRef = useRef(null);
  const prevLocalSpeakingRef = useRef(false);

  // pending playback set for audios that couldn't autoplay
  const pendingPlaybackRefs = useRef(new Set());

  // audio helper from AudioProvider
  const { unlockAudio, getMusicStream } = useAudio();

  // STUN servers
  const RTC_CONFIG = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };

  // --- Identity (nick) ---
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

  // --- Local analyser for voice activity detection (VAD) ---
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
      } catch (e) {
        // ignore
      }
      analyserRef.current = null;
    }
  }

  // --- Robust hidden audio creation + autoplay retries ---
  function tryPlayAudioElement(el, remoteId) {
    if (!el) return Promise.resolve(false);
    return el.play()
      .then(() => {
        pendingPlaybackRefs.current.delete(remoteId);
        console.debug("audio play() OK for", remoteId);
        return true;
      })
      .catch((err) => {
        console.debug("audio play() rejected for", remoteId, err);
        pendingPlaybackRefs.current.add(remoteId);
        return false;
      });
  }

  async function tryPlayAllPending() {
    const ids = Array.from(pendingPlaybackRefs.current);
    if (ids.length === 0) return;
    console.debug("tryPlayAllPending:", ids);
    try {
      if (typeof unlockAudio === "function") {
        await unlockAudio();
      }
    } catch (e) {
      console.debug("tryPlayAllPending: unlockAudio erro", e);
    }
    for (const id of ids) {
      const entry = peersRef.current[id];
      if (!entry) {
        pendingPlaybackRefs.current.delete(id);
        continue;
      }
      const el = entry.audioEl;
      if (!el) {
        pendingPlaybackRefs.current.delete(id);
        continue;
      }
      try {
        await tryPlayAudioElement(el, id);
      } catch (e) {
        console.debug("tryPlayAllPending: erro ao tocar", id, e);
      }
    }
  }

  useEffect(() => {
    const handler = () => { tryPlayAllPending().catch(() => {}); };
    window.addEventListener("click", handler);
    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("click", handler);
      window.removeEventListener("keydown", handler);
    };
  }, []);

  function createHiddenAudio(remoteId, stream) {
    if (peersRef.current[remoteId]?.audioEl) {
      const el = peersRef.current[remoteId].audioEl;
      try { el.srcObject = stream; } catch (e) {
        // recreate if can't update
        try { el.remove(); } catch {}
        delete peersRef.current[remoteId].audioEl;
      }
      tryPlayAudioElement(el, remoteId).catch(() => {});
      return el;
    }

    const el = document.createElement("audio");
    el.autoplay = true;
    el.playsInline = true;
    el.muted = false;
    el.volume = 1.0;
    el.style.display = "none";
    try { el.srcObject = stream; } catch (e) {
      console.debug("createHiddenAudio: set srcObject falhou:", e);
    }
    el.addEventListener("play", () => { console.debug("audio play event", remoteId); });
    el.addEventListener("error", (ev) => { console.warn("audio element error", remoteId, ev); });
    document.body.appendChild(el);

    peersRef.current[remoteId] = {
      ...(peersRef.current[remoteId] || {}),
      audioEl: el,
      _stream: stream,
      noTrackRetries: 0,
      noTrackTimer: null,
    };

    tryPlayAudioElement(el, remoteId).catch(() => {});

    return el;
  }

  // --- ICE pending application ---
  async function applyPendingCandidates(remoteId) {
    const arr = pendingCandidatesRef.current[remoteId] || [];
    const pc = peersRef.current[remoteId]?.pc;
    if (!pc) return;
    for (const c of arr) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(c));
      } catch (e) {
        console.warn("Erro ao adicionar candidate pendente:", e);
      }
    }
    pendingCandidatesRef.current[remoteId] = [];
  }

  // --- Cleanup ---
  function cleanupPeer(remoteId) {
    const entry = peersRef.current[remoteId];
    if (!entry) return;
    if (entry.pc) {
      try { entry.pc.close(); } catch {}
    }
    if (entry.audioEl) {
      try { entry.audioEl.pause(); } catch {}
      try {
        if (entry.audioEl.srcObject && entry.audioEl.srcObject.getTracks) {
          entry.audioEl.srcObject.getTracks().forEach((t) => { try { t.stop(); } catch {} });
        }
      } catch {}
      try { entry.audioEl.remove(); } catch {}
    }
    if (entry.noTrackTimer) {
      try { clearTimeout(entry.noTrackTimer); } catch {}
    }
    delete peersRef.current[remoteId];
    delete pendingCandidatesRef.current[remoteId];
    pendingPlaybackRefs.current.delete(remoteId);
  }

  // --- Add local tracks to peer ---
  function addLocalTracksToPeer(pc) {
    if (!localStreamRef.current || !pc) return;
    const existing = pc.getSenders().map((s) => s.track?.id).filter(Boolean);
    localStreamRef.current.getTracks().forEach((t) => {
      if (!existing.includes(t.id)) {
        try { pc.addTrack(t, localStreamRef.current); } catch (e) {
          console.warn("Erro ao adicionar track local ao peer:", e);
        }
      }
    });
  }

  // --- Create or return peer connection (polite handling) ---
  function createPeerIfNeeded(remoteId) {
    if (!remoteId) return null;
    if (peersRef.current[remoteId]?.pc) return peersRef.current[remoteId].pc;

    const localId = socket?.id || "";
    const polite = localId < remoteId; // deterministic ordering
    const pc = new RTCPeerConnection(RTC_CONFIG);

    peersRef.current[remoteId] = {
      pc,
      polite,
      makingOffer: false,
      ignoreOffer: false,
      isSettingRemote: false,
      audioEl: null,
      _stream: null,
      noTrackRetries: 0,
      noTrackTimer: null,
    };

    pc.onicecandidate = (ev) => {
      if (ev.candidate) {
        try {
          socket.emit("voice-signal", {
            target: remoteId,
            data: { candidate: ev.candidate },
          });
        } catch (err) {
          console.debug("onicecandidate emit erro:", err);
        }
      }
    };

    pc.ontrack = (e) => {
      try {
        const stream = (e.streams && e.streams[0]) || (e.track ? new MediaStream([e.track]) : null);
        if (!stream) {
          console.warn("ontrack: stream not found for", remoteId, e);
          return;
        }
        // create or update audio element
        createHiddenAudio(remoteId, stream);

        // if there was a noTrackTimer, clear it (we got track now)
        const entry = peersRef.current[remoteId];
        if (entry?.noTrackTimer) {
          clearTimeout(entry.noTrackTimer);
          entry.noTrackTimer = null;
          entry.noTrackRetries = 0;
        }
      } catch (err) {
        console.warn("ontrack erro:", err);
      }
    };

    pc.onconnectionstatechange = () => {
      if (["failed", "disconnected", "closed"].includes(pc.connectionState)) {
        cleanupPeer(remoteId);
      }
    };

    pc.onnegotiationneeded = async () => {
      const entry = peersRef.current[remoteId];
      if (!entry) return;
      try {
        if (pc.signalingState !== "stable") return;
        entry.makingOffer = true;
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        try {
          socket.emit("voice-signal", {
            target: remoteId,
            data: { sdp: pc.localDescription },
          });
        } catch (err) {
          console.debug("emit negotiationneeded erro:", err);
        }
      } catch (e) {
        console.warn("onnegotiationneeded erro:", e);
      } finally {
        if (peersRef.current[remoteId]) peersRef.current[remoteId].makingOffer = false;
      }
    };

    // add local audio if present
    if (localStreamRef.current) addLocalTracksToPeer(pc);

    // inject music stream if provided by AudioProvider
    (async () => {
      try {
        const ms = getMusicStream?.();
        if (ms && ms.getAudioTracks().length > 0) {
          const existing = pc.getSenders().map((s) => s.track?.id);
          ms.getAudioTracks().forEach((t) => {
            if (!existing.includes(t.id)) pc.addTrack(t, ms);
          });
          console.log("🎵 musicStream injetado no peer:", remoteId);
        }
      } catch (e) {
        console.warn("Erro ao injetar música:", e);
      }
    })();

    applyPendingCandidates(remoteId);

    return pc;
  }

  // --- Create and send offer helper ---
  async function createAndSendOffer(remoteId) {
    const entry = peersRef.current[remoteId] || {};
    const pc = createPeerIfNeeded(remoteId);
    if (!pc) return;
    try {
      if (pc.signalingState !== "stable") {
        // try restartIce as a fallback if not stable
        try {
          if (pc.restartIce) {
            await pc.restartIce();
            console.debug("pc.restartIce called for", remoteId);
          }
        } catch (e) {
          console.debug("restartIce erro:", e);
        }
        return;
      }
      peersRef.current[remoteId].makingOffer = true;
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      try {
        socket.emit("voice-signal", {
          target: remoteId,
          data: { sdp: pc.localDescription },
        });
      } catch (err) {
        console.debug("createAndSendOffer emit erro:", err);
      }
    } catch (e) {
      console.warn("createAndSendOffer erro:", e);
    } finally {
      if (peersRef.current[remoteId]) peersRef.current[remoteId].makingOffer = false;
    }
  }

  // --- Avatar resolution (keeps your original logic) ---
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

  // --- Helper: schedule no-track retry (backoff) ---
  function scheduleNoTrackRetry(remoteId) {
    const entry = peersRef.current[remoteId];
    if (!entry) return;
    // cancel existing timer
    if (entry.noTrackTimer) {
      clearTimeout(entry.noTrackTimer);
      entry.noTrackTimer = null;
    }
    // limit retries to avoid infinite loop
    if (entry.noTrackRetries >= 4) {
      console.warn("noTrackRetries exhausted for", remoteId);
      return;
    }
    const delay = 1000 * Math.pow(2, entry.noTrackRetries); // 1s,2s,4s,8s
    entry.noTrackRetries = (entry.noTrackRetries || 0) + 1;
    entry.noTrackTimer = setTimeout(async () => {
      // if still no audioEl, attempt a negotiation / restartIce / recreate
      const eNow = peersRef.current[remoteId];
      if (!eNow) return;
      if (!eNow.audioEl) {
        console.debug("noTrackRetry: attempting restart/reoffer for", remoteId, "retry", eNow.noTrackRetries);
        try {
          if (eNow.pc && eNow.pc.restartIce) {
            try { await eNow.pc.restartIce(); console.debug("restartIce called for", remoteId); } catch (err) { console.debug("restartIce falhou", err); }
          }
          // attempt createAndSendOffer again
          createAndSendOffer(remoteId);
          // if still no track after another timeout, we will schedule again by re-calling this function from the caller side
          scheduleNoTrackRetry(remoteId);
        } catch (err) {
          console.warn("noTrackRetry erro:", err);
        }
      } else {
        // got track meanwhile
        entry.noTrackRetries = 0;
        if (entry.noTrackTimer) {
          clearTimeout(entry.noTrackTimer);
          entry.noTrackTimer = null;
        }
      }
    }, delay);
  }

  // --- Socket wiring ---
  useEffect(() => {
    if (!socket) return;
    setLocalSocketId(socket.id);
    localSocketIdRef.current = socket.id;

    socket.on("voice-participants", async (list) => {
      const arr = Array.isArray(list) ? list : [];
      setParticipants(arr);

      // ensure peers exist & initiate negotiation if needed
      for (const p of arr) {
        if (!p || p.id === socket.id) continue;
        createPeerIfNeeded(p.id);
        // deterministic ordering to avoid both sides starting at same time
        if ((socket.id || "") < p.id) {
          createAndSendOffer(p.id);
        }
        // schedule a no-track retry guard: if no ontrack within X, attempt restart/offer
        const entry = peersRef.current[p.id];
        if (entry) {
          // clear existing timer
          if (entry.noTrackTimer) {
            clearTimeout(entry.noTrackTimer);
            entry.noTrackTimer = null;
            entry.noTrackRetries = 0;
          }
          // set initial timer to check ontrack
          entry.noTrackRetries = 0;
          entry.noTrackTimer = setTimeout(() => {
            // if still no audio element => schedule retry flow
            const eNow = peersRef.current[p.id];
            if (eNow && !eNow.audioEl) scheduleNoTrackRetry(p.id);
          }, 2500); // 2.5s initial window
        }
      }

      // fetch avatars
      try {
        const avatarsData = {};
        await Promise.all(arr.map(async (p) => {
          const img = await fetchAvatar(p);
          avatarsData[p.id] = img;
        }));
        setAvatars(avatarsData);
      } catch (e) {
        console.debug("voice-participants avatars fetch erro:", e);
      }
    });

    socket.on("voice-signal", async ({ from, data }) => {
      if (!from || !data || from === socket.id) return;
      const pc = createPeerIfNeeded(from);
      if (!pc) return;

      try {
        if (data.sdp) {
          const sdpType = data.sdp.type;
          const isOffer = sdpType === "offer";
          const makingOffer = peersRef.current[from]?.makingOffer;
          const polite = peersRef.current[from]?.polite;

          if (isOffer && (makingOffer || pc.signalingState !== "stable")) {
            if (!polite) {
              peersRef.current[from].ignoreOffer = true;
              console.debug("Offer collision ignorada (impolite) from", from);
              return;
            }
            console.debug("Offer collision: polite side will handle from", from);
          }

          try {
            peersRef.current[from].isSettingRemote = true;
            await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
            peersRef.current[from].isSettingRemote = false;
          } catch (err) {
            peersRef.current[from].isSettingRemote = false;
            console.warn("Erro ao setRemoteDescription:", err);

            // try to recover by recreating peer and re-offering
            if (err.message?.includes("m-lines") || err.message?.includes("Failed to set")) {
              console.log("SDP mismatch. Reiniciando conexão com peer", from);
              cleanupPeer(from);
              createPeerIfNeeded(from);
              // small delay to allow ICE gatherers to reset
              setTimeout(() => createAndSendOffer(from), 300);
            }
            return;
          }

          if (isOffer) {
            try {
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              socket.emit("voice-signal", {
                target: from,
                data: { sdp: pc.localDescription },
              });
            } catch (e) {
              console.warn("Erro ao responder offer:", e);
            }
          } else {
            // it's an answer
            await applyPendingCandidates(from);
          }
        } else if (data.candidate) {
          if (!pc.remoteDescription || pc.remoteDescription.type === null) {
            pendingCandidatesRef.current[from] = pendingCandidatesRef.current[from] || [];
            pendingCandidatesRef.current[from].push(data.candidate);
          } else {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
            } catch (err) {
              console.warn("Erro addIceCandidate immed:", err);
            }
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
    };
    // deps: userNick & inVoice included to re-bind in case identity changes
  }, [userNick, inVoice]);

  // --- Start voice (join) ---
  async function startVoice() {
    if (inVoice) return;
    try {
      try { if (typeof unlockAudio === "function") await unlockAudio(); } catch (e) { console.debug("unlockAudio erro:", e); }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;

      // add local tracks to existing peers
      Object.values(peersRef.current).forEach((entry) => {
        try { addLocalTracksToPeer(entry.pc); } catch (e) { console.warn("Erro ao adicionar tracks a peer existente:", e); }
      });

      try { socket.emit("voice-join", { nick: userNick || "Jogador" }); } catch (err) { console.debug("voice-join emit erro:", err); }

      setInVoice(true);
      startLocalAnalyser(stream);
      // try pending audios
      tryPlayAllPending().catch(() => {});
    } catch (e) {
      console.error("startVoice erro:", e);
      alert("⚠️ Permita o microfone e tente novamente.");
    }
  }

  // --- Leave voice ---
  function leaveVoice() {
    try { socket.emit("voice-leave"); } catch (err) { console.debug("leaveVoice emit erro:", err); }
    if (localStreamRef.current) localStreamRef.current.getTracks().forEach((t) => t.stop());
    Object.keys(peersRef.current).forEach(cleanupPeer);
    stopLocalAnalyser();
    setInVoice(false);
    pendingPlaybackRefs.current.clear();
  }

  // --- Toggle local mute ---
  function toggleLocalMute() {
    if (!localStreamRef.current) return;
    const muted = !localMuted;
    localStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = !muted));
    setLocalMuted(muted);
  }

  // cleanup on unmount
  useEffect(() => () => leaveVoice(), []); // eslint-disable-line

  // whenever unlockAudio ref changes, try to play pending
  useEffect(() => {
    tryPlayAllPending().catch(() => {});
  }, [unlockAudio]);

  // Expose context
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

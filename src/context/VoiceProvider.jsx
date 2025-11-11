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

/**
 * VoiceProvider.jsx
 *
 * Mantive toda a sua lógica original e acrescentei:
 * - Robust autoplay retry (pending playback queue)
 * - Melhor tratamento de colisões SDP / polite algorithm
 * - Reinício automático do peer em falhas de SDP (m-lines)
 * - Logs de debug controlados (muitos console.debug para te ajudar)
 * - Pequeno backoff em createAndSendOffer para evitar storm de offers
 *
 * API exportada (unchanged):
 * - useVoice() hook
 * - Provider expõe: inVoice, participants, localMuted, speakingIds, startVoice, leaveVoice, toggleLocalMute, localSocketId, avatars
 *
 * Não removi nem simplifiquei nada do que já existia.
 */

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
  // peersRef: { [remoteId]: { pc, polite, makingOffer, ignoreOffer, isSettingRemote, audioEl, _stream, lastOfferAt } }
  const peersRef = useRef({});
  const pendingCandidatesRef = useRef({});
  const analyserRef = useRef(null);
  const rafRef = useRef(null);
  const localSocketIdRef = useRef(null);
  const prevLocalSpeakingRef = useRef(false);

  // set to retry playback for audio elements that failed autoplay
  const pendingPlaybackRefs = useRef(new Set()); // set of remoteId

  // backoff map to avoid repeated simultaneous offers on same remote
  const offerBackoffRef = useRef({}); // remoteId => { attempts, nextAllowedAt }

  // audio helper from AudioProvider (keeps your API)
  const { unlockAudio, getMusicStream } = useAudio();

  // RTC config (STUN only here; can be expanded)
  const RTC_CONFIG = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };

  // --- Util: now ms ---
  const now = () => new Date().getTime();

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

  // --- Local analyser for voice activity detection ---
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
        // threshold tuned to prior logic (>18)
        const speaking = vol > 18;
        const sid = localSocketIdRef.current || socket?.id;
        if (sid && speaking !== prevLocalSpeakingRef.current) {
          prevLocalSpeakingRef.current = speaking;
          setSpeakingIds((prev) => {
            const s = new Set(prev);
            speaking ? s.add(sid) : s.delete(sid);
            return s;
          });
          // emit speaking event but guard with try/catch
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

  // --- Hidden audio creation + robust autoplay handling ---
  function tryPlayAudioElement(el, remoteId) {
    if (!el) return Promise.resolve(false);
    return el.play()
      .then(() => {
        pendingPlaybackRefs.current.delete(remoteId);
        console.debug("createHiddenAudio: play() success for", remoteId);
        return true;
      })
      .catch((err) => {
        // autoplay blocked or other error
        console.debug("createHiddenAudio: play() rejected for", remoteId, err);
        pendingPlaybackRefs.current.add(remoteId);
        return false;
      });
  }

  async function tryPlayAllPending() {
    const ids = Array.from(pendingPlaybackRefs.current);
    if (ids.length === 0) return;
    console.debug("tryPlayAllPending: trying", ids.length, "audios");
    try {
      if (typeof unlockAudio === "function") {
        await unlockAudio();
      }
    } catch (e) {
      console.debug("tryPlayAllPending: unlockAudio erro:", e);
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

  // global user interaction handler (retry pending audios)
  useEffect(() => {
    const handler = () => {
      tryPlayAllPending().catch(() => {});
    };
    window.addEventListener("click", handler, { once: false });
    window.addEventListener("keydown", handler, { once: false });
    return () => {
      window.removeEventListener("click", handler);
      window.removeEventListener("keydown", handler);
    };
  }, []);

  // Creates or updates hidden audio element for remote stream (robust)
  function createHiddenAudio(remoteId, stream) {
    // reuse existing
    if (peersRef.current[remoteId]?.audioEl) {
      const el = peersRef.current[remoteId].audioEl;
      try {
        el.srcObject = stream;
      } catch (e) {
        // recreate element if setting srcObject fails
        try { el.remove(); } catch {}
        delete peersRef.current[remoteId].audioEl;
      }
      tryPlayAudioElement(el, remoteId).catch(() => {});
      return el;
    }

    // new element
    const el = document.createElement("audio");
    el.autoplay = true;
    el.playsInline = true;
    el.muted = false;
    el.volume = 1.0;
    el.style.display = "none";
    try {
      el.srcObject = stream;
    } catch (e) {
      console.debug("createHiddenAudio: setting srcObject falhou:", e);
    }

    el.addEventListener("play", () => {
      console.debug("audio element play event for", remoteId);
    });
    el.addEventListener("error", (ev) => {
      console.warn("audio element error", remoteId, ev);
    });

    document.body.appendChild(el);

    peersRef.current[remoteId] = {
      ...(peersRef.current[remoteId] || {}),
      audioEl: el,
      _stream: stream,
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

  // --- Cleanup peer ---
  function cleanupPeer(remoteId) {
    const entry = peersRef.current[remoteId];
    if (!entry) return;
    if (entry.pc) {
      try {
        entry.pc.close();
      } catch (e) {
        // ignore
      }
    }
    if (entry.audioEl) {
      try { entry.audioEl.pause(); } catch {}
      try {
        if (entry.audioEl.srcObject && entry.audioEl.srcObject.getTracks) {
          entry.audioEl.srcObject.getTracks().forEach((t) => {
            try { t.stop(); } catch {}
          });
        }
      } catch {}
      try { entry.audioEl.remove(); } catch {}
    }
    delete peersRef.current[remoteId];
    delete pendingCandidatesRef.current[remoteId];
    pendingPlaybackRefs.current.delete(remoteId);
    offerBackoffRef.current[remoteId] = undefined;
    console.debug("cleanupPeer: cleaned peer", remoteId);
  }

  // --- Add local tracks to peer ---
  function addLocalTracksToPeer(pc) {
    if (!localStreamRef.current || !pc) return;
    const existing = pc.getSenders().map((s) => s.track?.id).filter(Boolean);
    localStreamRef.current.getTracks().forEach((t) => {
      if (!existing.includes(t.id)) {
        try {
          pc.addTrack(t, localStreamRef.current);
        } catch (e) {
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
      lastOfferAt: 0,
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
          console.warn("ontrack: stream não encontrado para", remoteId, e);
          return;
        }
        createHiddenAudio(remoteId, stream);
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

        // backoff guard: do not spam offers to same remote in short time
        const backoff = offerBackoffRef.current[remoteId] || { attempts: 0, nextAllowedAt: 0 };
        if (now() < (backoff.nextAllowedAt || 0)) {
          console.debug("onnegotiationneeded: backoff active, skipping offer for", remoteId);
          return;
        }

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        // emit
        try {
          socket.emit("voice-signal", {
            target: remoteId,
            data: { sdp: pc.localDescription },
          });
        } catch (err) {
          console.debug("emit negotiationneeded erro:", err);
        }

        // update backoff metadata
        backoff.attempts = (backoff.attempts || 0) + 1;
        backoff.nextAllowedAt = now() + Math.min(30_000, 1000 * Math.pow(2, Math.min(backoff.attempts, 6))); // exponential up to 30s
        offerBackoffRef.current[remoteId] = backoff;
        entry.lastOfferAt = now();
      } catch (e) {
        console.warn("onnegotiationneeded erro:", e);
      } finally {
        if (peersRef.current[remoteId]) peersRef.current[remoteId].makingOffer = false;
      }
    };

    // add local tracks if exists
    if (localStreamRef.current) addLocalTracksToPeer(pc);

    // inject music stream if available
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

  // --- Create and send offer helper (with a small optional immediate backoff) ---
  async function createAndSendOffer(remoteId) {
    const entry = peersRef.current[remoteId] || {};
    const pc = createPeerIfNeeded(remoteId);
    if (!pc) return;
    try {
      if (pc.signalingState !== "stable") return;

      // backoff guard (avoid creating offer too frequently)
      const backoff = offerBackoffRef.current[remoteId] || { attempts: 0, nextAllowedAt: 0 };
      if (now() < (backoff.nextAllowedAt || 0)) {
        console.debug("createAndSendOffer: backoff active for", remoteId);
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

      // update backoff metadata
      backoff.attempts = (backoff.attempts || 0) + 1;
      backoff.nextAllowedAt = now() + Math.min(30_000, 1000 * Math.pow(2, Math.min(backoff.attempts, 6)));
      offerBackoffRef.current[remoteId] = backoff;
      entry.lastOfferAt = now();
    } catch (e) {
      console.warn("createAndSendOffer erro:", e);
    } finally {
      if (peersRef.current[remoteId]) peersRef.current[remoteId].makingOffer = false;
    }
  }

  // --- Avatar resolution (maintained your logic) ---
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

  // --- Socket event wiring (voice-participants, voice-signal, voice-speaking) ---
  useEffect(() => {
    if (!socket) return;
    setLocalSocketId(socket.id);
    localSocketIdRef.current = socket.id;

    socket.on("voice-participants", async (list) => {
      const arr = Array.isArray(list) ? list : [];
      setParticipants(arr);

      // create peers and negotiate if needed
      for (const p of arr) {
        if (!p || p.id === socket.id) continue;
        createPeerIfNeeded(p.id);
        // deterministic ordering: lower id initiates
        if ((socket.id || "") < p.id) {
          createAndSendOffer(p.id);
        }
      }

      // fetch avatars
      try {
        const avatarsData = {};
        await Promise.all(
          arr.map(async (p) => {
            const img = await fetchAvatar(p);
            avatarsData[p.id] = img;
          })
        );
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

          // collision handling (polite algorithm)
          if (isOffer && (makingOffer || pc.signalingState !== "stable")) {
            if (!polite) {
              console.debug("Offer collision ignorada (impolite)", from);
              peersRef.current[from].ignoreOffer = true;
              return;
            }
            console.debug("Offer collision: polite side will handle", from);
          }

          try {
            peersRef.current[from].isSettingRemote = true;
            await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
            peersRef.current[from].isSettingRemote = false;
          } catch (err) {
            peersRef.current[from].isSettingRemote = false;
            console.warn("Erro ao setRemoteDescription:", err);

            // Reiniciar conexão se SDP inválida ou mismatch (m-lines)
            if (err.message?.includes("m-lines") || err.message?.includes("Failed to set")) {
              console.log("Reiniciando conexão com peer", from);
              cleanupPeer(from);
              createPeerIfNeeded(from);
              // give a small delay before re-offer to let ICE/cleanup finish
              setTimeout(() => createAndSendOffer(from), 250 + Math.random() * 250);
            }
            return;
          }

          if (isOffer) {
            // answer the offer
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
            // it's an answer — apply pending candidates if any
            await applyPendingCandidates(from);
          }
        } else if (data.candidate) {
          if (!pc.remoteDescription || pc.remoteDescription.type === null) {
            pendingCandidatesRef.current[from] =
              pendingCandidatesRef.current[from] || [];
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
      if (localStreamRef.current)
        localStreamRef.current.getTracks().forEach((t) => t.stop());
      stopLocalAnalyser();
      setInVoice(false);
      setParticipants([]);
    });

    return () => {
      socket.off("voice-participants");
      socket.off("voice-signal");
      socket.off("voice-speaking");
    };
    // deps: userNick & inVoice included to re-bind on identity change
  }, [userNick, inVoice]);

  // --- Start voice (join) ---
  async function startVoice() {
    if (inVoice) return;
    try {
      try {
        if (typeof unlockAudio === "function") {
          await unlockAudio();
        }
      } catch (e) {
        console.debug("startVoice: unlockAudio erro (continuing):", e);
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;

      // add local tracks to existing peers
      Object.values(peersRef.current).forEach((entry) => {
        try {
          addLocalTracksToPeer(entry.pc);
        } catch (e) {
          console.warn("Erro ao adicionar tracks a peer existente:", e);
        }
      });

      try {
        socket.emit("voice-join", { nick: userNick || "Jogador" });
      } catch (err) {
        console.debug("startVoice: socket.emit voice-join erro:", err);
      }

      setInVoice(true);
      startLocalAnalyser(stream);
      // try play pending remote audios
      tryPlayAllPending().catch(() => {});
    } catch (e) {
      console.error("startVoice erro:", e);
      alert("⚠️ Permita o microfone e tente novamente.");
    }
  }

  // --- Leave voice ---
  function leaveVoice() {
    try {
      socket.emit("voice-leave");
    } catch (err) {
      console.debug("leaveVoice: emit erro:", err);
    }
    if (localStreamRef.current)
      localStreamRef.current.getTracks().forEach((t) => t.stop());
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

  // when unlockAudio reference changes, attempt to play pending audios
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
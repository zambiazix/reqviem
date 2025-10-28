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
  const [inVoice, setInVoice] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [localMuted, setLocalMuted] = useState(false);
  const [speakingIds, setSpeakingIds] = useState(new Set());
  const [userNick, setUserNick] = useState("");
  const [localSocketId, setLocalSocketId] = useState(null);
  const [avatars, setAvatars] = useState({});

  const localStreamRef = useRef(null);
  const peersRef = useRef({});
  const pendingCandidatesRef = useRef({});
  const analyserRef = useRef(null);
  const rafRef = useRef(null);
  const localSocketIdRef = useRef(null);
  const prevLocalSpeakingRef = useRef(false);

  const { unlockAudio, getMusicStream } = useAudio();
  const RTC_CONFIG = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };

  // 🔹 Identidade (nick)
  useEffect(() => {
    const auth = getAuth();
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const snap = await getDoc(doc(db, "users", user.email));
          const nick = snap.exists() ? snap.data().nick : user.email.split("@")[0];
          setUserNick(nick);
        } catch {
          setUserNick(user.email.split("@")[0]);
        }
      } else {
        setUserNick("");
      }
    });
    return () => unsub();
  }, []);

  // 🔊 Detecção de fala local
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
          socket.emit("voice-speaking", { id: sid, speaking });
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
      } catch {}
      analyserRef.current = null;
    }
  }

  // 🔈 Cria <audio> oculto para streams remotas (tenta tocar)
  function createHiddenAudio(remoteId, stream) {
    if (peersRef.current[remoteId]?.audioEl) {
      const el = peersRef.current[remoteId].audioEl;
      el.srcObject = stream;
      return el;
    }

    const el = document.createElement("audio");
    el.autoplay = true;
    el.playsInline = true;
    el.muted = false;
    el.style.display = "none";
    el.srcObject = stream;
    document.body.appendChild(el);

    el.play().catch((err) => {
      console.debug("createHiddenAudio: play() rejeitado (autoplay bloqueado?)", err);
    });

    peersRef.current[remoteId] = {
      ...(peersRef.current[remoteId] || {}),
      audioEl: el,
      _stream: stream,
    };
    return el;
  }

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

  function cleanupPeer(remoteId) {
    const entry = peersRef.current[remoteId];
    if (entry?.pc) try { entry.pc.close(); } catch {}
    if (entry?.audioEl) try { entry.audioEl.remove(); } catch {}
    delete peersRef.current[remoteId];
    delete pendingCandidatesRef.current[remoteId];
  }

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
        socket.emit("voice-signal", {
          target: remoteId,
          data: { candidate: ev.candidate },
        });
      }
    };

    pc.ontrack = (e) => {
      try {
        createHiddenAudio(remoteId, e.streams[0]);
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
        socket.emit("voice-signal", {
          target: remoteId,
          data: { sdp: pc.localDescription },
        });
      } catch (e) {
        console.warn("onnegotiationneeded erro:", e);
      } finally {
        if (peersRef.current[remoteId]) peersRef.current[remoteId].makingOffer = false;
      }
    };

    if (localStreamRef.current) addLocalTracksToPeer(pc);

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

  async function createAndSendOffer(remoteId) {
    const entry = peersRef.current[remoteId] || {};
    const pc = createPeerIfNeeded(remoteId);
    if (!pc) return;
    try {
      if (pc.signalingState !== "stable") return;
      peersRef.current[remoteId].makingOffer = true;
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit("voice-signal", {
        target: remoteId,
        data: { sdp: pc.localDescription },
      });
    } catch (e) {
      console.warn("createAndSendOffer erro:", e);
    } finally {
      if (peersRef.current[remoteId]) peersRef.current[remoteId].makingOffer = false;
    }
  }

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
    } catch {}
    return "";
  }

  // --- Eventos Socket ---
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

      const avatarsData = {};
      await Promise.all(
        arr.map(async (p) => {
          const img = await fetchAvatar(p);
          avatarsData[p.id] = img;
        })
      );
      setAvatars(avatarsData);
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
              console.debug("Offer collision ignorada (impolite)", from);
              peersRef.current[from].ignoreOffer = true;
              return;
            }
          }

          try {
            peersRef.current[from].isSettingRemote = true;
            await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
            peersRef.current[from].isSettingRemote = false;
          } catch (err) {
            peersRef.current[from].isSettingRemote = false;
            console.warn("Erro ao setRemoteDescription:", err);

            // 🔁 REINICIAR CONEXÃO SE SDP INVÁLIDA
            if (err.message?.includes("m-lines") || err.message?.includes("Failed to set")) {
              console.log("Reiniciando conexão com peer", from);
              cleanupPeer(from);
              createPeerIfNeeded(from);
              createAndSendOffer(from);
            }
            return;
          }

          if (isOffer) {
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socket.emit("voice-signal", {
              target: from,
              data: { sdp: pc.localDescription },
            });
          } else {
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
  }, [userNick, inVoice]);

  // 🎙 Entrar no chat de voz
  async function startVoice() {
    if (inVoice) return;
    try {
      await unlockAudio?.();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;

      Object.values(peersRef.current).forEach((entry) => {
        try {
          addLocalTracksToPeer(entry.pc);
        } catch (e) {
          console.warn("Erro ao adicionar tracks:", e);
        }
      });

      socket.emit("voice-join", { nick: userNick || "Jogador" });
      setInVoice(true);
      startLocalAnalyser(stream);
    } catch (e) {
      console.error("startVoice erro:", e);
      alert("⚠️ Permita o microfone e tente novamente.");
    }
  }

  function leaveVoice() {
    socket.emit("voice-leave");
    if (localStreamRef.current)
      localStreamRef.current.getTracks().forEach((t) => t.stop());
    Object.keys(peersRef.current).forEach(cleanupPeer);
    stopLocalAnalyser();
    setInVoice(false);
  }

  function toggleLocalMute() {
    if (!localStreamRef.current) return;
    const muted = !localMuted;
    localStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = !muted));
    setLocalMuted(muted);
  }

  useEffect(() => () => leaveVoice(), []); // cleanup

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

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
  const [localAvatar, setLocalAvatar] = useState("");

  const localStreamRef = useRef(null);
  const peersRef = useRef({});
  const pendingCandidatesRef = useRef({});
  const analyserRef = useRef(null);
  const rafRef = useRef(null);
  const localSocketIdRef = useRef(null);
  const loadedAvatarIdsRef = useRef(new Set());
  const avatarsRef = useRef({});
  const prevLocalSpeakingRef = useRef(false);
  const isUnmountedRef = useRef(false);

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
      analyser.fftSize = 2048;
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
            if (speaking) s.add(sid);
            else s.delete(sid);
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
    rafRef.current = null;
    if (analyserRef.current) {
      try {
        analyserRef.current.src.disconnect();
        analyserRef.current.ctx.close();
      } catch {}
      analyserRef.current = null;
    }
  }

  // 🔈 Cria <audio> oculto para streams remotas
  function createHiddenAudio(remoteId, stream) {
    const el = document.createElement("audio");
    el.autoplay = true;
    el.playsInline = true;
    el.style.display = "none";
    el.srcObject = stream;
    document.body.appendChild(el);
    unlockAudio?.();
    el.play().catch(() => {});
    peersRef.current[remoteId] = { ...(peersRef.current[remoteId] || {}), audioEl: el, _stream: stream };
    return el;
  }

  async function applyPendingCandidates(remoteId) {
    const arr = pendingCandidatesRef.current[remoteId] || [];
    const pc = peersRef.current[remoteId]?.pc;
    if (!pc) return;
    for (const c of arr) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(c));
      } catch {}
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

  // 🔁 Cria ou recupera PeerConnection
  function createPeerIfNeeded(remoteId) {
    if (!remoteId) return null;
    if (peersRef.current[remoteId]?.pc) return peersRef.current[remoteId].pc;

    const polite = socket.id < remoteId;
    const pc = new RTCPeerConnection(RTC_CONFIG);
    peersRef.current[remoteId] = { pc, polite };

    pc.onicecandidate = (ev) => {
      if (ev.candidate)
        socket.emit("voice-signal", { target: remoteId, data: { candidate: ev.candidate } });
    };

    pc.ontrack = (e) => createHiddenAudio(remoteId, e.streams[0]);
    pc.onconnectionstatechange = () => {
      if (["failed", "disconnected", "closed"].includes(pc.connectionState))
        cleanupPeer(remoteId);
    };

    // adiciona microfone
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => pc.addTrack(t, localStreamRef.current));
    }

    // adiciona música (somente mestre, após desbloqueio)
    if (userNick === MASTER_EMAIL) {
      (async () => {
        await unlockAudio();
        const ms = getMusicStream?.();
        if (ms) {
          const existing = pc.getSenders().map((s) => s.track?.id);
          ms.getAudioTracks().forEach((t) => {
            if (!existing.includes(t.id)) pc.addTrack(t, ms);
          });
        }
      })();
    }

    applyPendingCandidates(remoteId);
    return pc;
  }

  // 🔁 Negociação WebRTC
  async function createAndSendOffer(remoteId) {
    const pc = createPeerIfNeeded(remoteId);
    if (!pc) return;
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit("voice-signal", { target: remoteId, data: { sdp: pc.localDescription } });
    } catch (e) {
      console.warn("Erro em createAndSendOffer:", e);
    }
  }

  // 🧠 Avatares
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

  // 🔌 Eventos do Socket
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
        if (socket.id < p.id) createAndSendOffer(p.id);
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
      const entry = peersRef.current[from];
      try {
        if (data.sdp) {
          const offerCollision =
            data.sdp.type === "offer" && (pc.signalingState !== "stable" || entry.makingOffer);
          if (offerCollision && !entry.polite) return;
          await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
          if (data.sdp.type === "offer") {
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socket.emit("voice-signal", { target: from, data: { sdp: pc.localDescription } });
          }
          await applyPendingCandidates(from);
        } else if (data.candidate) {
          if (!pc.remoteDescription)
            (pendingCandidatesRef.current[from] = pendingCandidatesRef.current[from] || []).push(data.candidate);
          else await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
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
  }, [userNick]);

  // 🎙 Entrar no chat de voz
  async function startVoice() {
    if (inVoice) return;
    try {
      await unlockAudio();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
      socket.emit("voice-join", { nick: userNick || "Jogador" });
      setInVoice(true);
      startLocalAnalyser(stream);
    } catch (e) {
      alert("⚠️ Permita o microfone.");
    }
  }

  // 🚪 Sair do chat
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

  useEffect(() => () => leaveVoice(), []);

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
        localAvatar,
      }}
    >
      {children}
    </VoiceContext.Provider>
  );
}

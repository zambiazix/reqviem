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
  const isUnmountedRef = useRef(false);
  const localSocketIdRef = useRef(null);
  const loadedAvatarIdsRef = useRef(new Set());
  const avatarsRef = useRef({});
  const prevLocalSpeakingRef = useRef(false);

  const { getMusicStream } = useAudio();
  const RTC_CONFIG = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };

  // --- Identidade do usuário (nick) ---
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

  // --- Detecção de fala local ---
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
      function detect() {
        if (!analyserRef.current) return;
        analyser.getByteFrequencyData(data);
        const vol = data.reduce((a, b) => a + b, 0) / data.length;
        const isSpeaking = vol > 18;
        const sid = localSocketIdRef.current || socket?.id || null;
        if (sid && isSpeaking !== prevLocalSpeakingRef.current) {
          prevLocalSpeakingRef.current = isSpeaking;
          setSpeakingIds((prev) => {
            const s = new Set(prev);
            if (isSpeaking) s.add(sid);
            else s.delete(sid);
            return s;
          });
          try {
            socket.emit("voice-speaking", { id: sid, speaking: isSpeaking });
          } catch {}
        }
        rafRef.current = requestAnimationFrame(detect);
      }
      detect();
    } catch (e) {
      console.warn("startLocalAnalyser falhou:", e);
    }
  }

  function stopLocalAnalyser() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    prevLocalSpeakingRef.current = false;
    if (analyserRef.current) {
      try {
        analyserRef.current.src.disconnect();
        analyserRef.current.ctx.close();
      } catch {}
      analyserRef.current = null;
    }
  }

  // --- Cria <audio> oculto para cada stream remota ---
  function createHiddenAudioForStream(remoteId, stream) {
    const existing = peersRef.current[remoteId]?.audioEl;
    if (existing) {
      existing.srcObject = stream;
      existing.play().catch(() => {});
      return existing;
    }
    const audioEl = document.createElement("audio");
    audioEl.autoplay = true;
    audioEl.playsInline = true;
    audioEl.controls = false;
    audioEl.style.display = "none";
    audioEl.dataset.id = remoteId;
    audioEl.srcObject = stream;
    document.body.appendChild(audioEl);
    audioEl.play().catch(() => {});
    return audioEl;
  }

  // --- Criação e envio de Offer para um peer ---
  async function createAndSendOffer(remoteId) {
    try {
      const entry = peersRef.current[remoteId] || {};
      const pc = entry.pc || createPeerIfNeeded(remoteId);
      if (!pc) return;
      if (entry.makingOffer) return;
      entry.makingOffer = true;
      peersRef.current[remoteId] = entry;
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit("voice-signal", { target: remoteId, data: { sdp: pc.localDescription } });
      } finally {
        entry.makingOffer = false;
      }
    } catch (e) {
      if (peersRef.current[remoteId]) peersRef.current[remoteId].makingOffer = false;
      console.warn("Falha ao enviar offer inicial:", e);
    }
  }

  // --- Criação de PeerConnection ---
  function createPeerIfNeeded(remoteId) {
    if (!remoteId) return null;
    if (peersRef.current[remoteId]?.pc) return peersRef.current[remoteId].pc;

    const polite = socket?.id && socket.id < remoteId;
    const pc = new RTCPeerConnection(RTC_CONFIG);

    peersRef.current[remoteId] = {
      pc,
      audioEl: peersRef.current[remoteId]?.audioEl || null,
      nick: peersRef.current[remoteId]?.nick || undefined,
      _stream: peersRef.current[remoteId]?._stream || null,
      polite,
      makingOffer: false,
      ignoreOffer: false,
    };

    pc.onnegotiationneeded = async () => {
      const entry = peersRef.current[remoteId];
      if (!entry) return;
      try {
        if (entry.makingOffer) return;
        entry.makingOffer = true;
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit("voice-signal", { target: remoteId, data: { sdp: pc.localDescription } });
      } catch (err) {
        console.warn("negotiationneeded falhou:", err);
      } finally {
        const e2 = peersRef.current[remoteId];
        if (e2) e2.makingOffer = false;
      }
    };

    pc.onicecandidate = (ev) => {
      if (ev.candidate) {
        try {
          socket.emit("voice-signal", { target: remoteId, data: { candidate: ev.candidate } });
        } catch (e) {
          console.warn("Falha emit candidate:", e);
        }
      }
    };

    pc.ontrack = (e) => {
      const stream = e.streams[0];
      const audioEl = createHiddenAudioForStream(remoteId, stream);
      peersRef.current[remoteId] = {
        ...(peersRef.current[remoteId] || {}),
        pc,
        audioEl,
        _stream: stream,
        nick: peersRef.current[remoteId]?.nick,
      };
      setTimeout(() => {
        setParticipants((prev) => (Array.isArray(prev) ? prev.slice() : prev));
      }, 50);
    };

    pc.onconnectionstatechange = () => {
      const st = pc.connectionState;
      if (["closed", "failed", "disconnected"].includes(st)) {
        cleanupPeer(remoteId);
      }
    };

    try {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => {
          try { pc.addTrack(t, localStreamRef.current); } catch {}
        });
      }
      try {
        const musicStream = getMusicStream();
        if (
          musicStream &&
          (userNick === MASTER_EMAIL || (typeof userNick === "string" && userNick === MASTER_EMAIL))
        ) {
          musicStream.getAudioTracks().forEach((t) => {
            const already = pc.getSenders().some((s) => s.track && s.track.id === t.id);
            if (!already) {
              try { pc.addTrack(t, musicStream); } catch {}
            }
          });
        }
      } catch {}
    } catch (e) {
      console.warn("Erro ao adicionar tracks ao pc:", e);
    }

    applyPendingCandidates(remoteId).catch(() => {});
    return pc;
  }

  async function applyPendingCandidates(remoteId) {
    const arr = pendingCandidatesRef.current[remoteId] || [];
    const pc = peersRef.current[remoteId]?.pc;
    if (!pc) return;
    for (const c of arr) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(c));
      } catch (e) {
        console.warn("Erro ao adicionar pending candidate:", e);
      }
    }
    pendingCandidatesRef.current[remoteId] = [];
  }

  function cleanupPeer(remoteId) {
    try {
      const entry = peersRef.current[remoteId];
      if (entry?.pc) {
        try { entry.pc.close(); } catch {}
      }
      if (entry?.audioEl) {
        try {
          entry.audioEl.pause();
          entry.audioEl.srcObject = null;
          entry.audioEl.remove();
        } catch {}
      }
    } catch {}
    delete peersRef.current[remoteId];
    delete pendingCandidatesRef.current[remoteId];
    setParticipants((prev) => (Array.isArray(prev) ? prev.slice() : prev));
    if (loadedAvatarIdsRef.current.has(remoteId)) {
      loadedAvatarIdsRef.current.delete(remoteId);
      delete avatarsRef.current[remoteId];
      setAvatars({ ...avatarsRef.current });
    }
  }

  // --- Busca avatar e nick ---
  async function fetchAvatarForParticipant(p) {
    try {
      let email = p.email || null;
      if (!email && p.nick) {
        try {
          const usersColl = collection(db, "users");
          const q = firestoreQuery(usersColl, where("nick", "==", p.nick));
          const snaps = await getDocs(q);
          if (snaps && snaps.size > 0) {
            const doc0 = snaps.docs[0];
            email = doc0.id;
          }
        } catch {}
      }
      if (email) {
        try {
          const fichaRef = doc(db, "fichas", email);
          const fichaSnap = await getDoc(fichaRef);
          if (fichaSnap.exists()) {
            const img = fichaSnap.data().imagemPersonagem || "";
            return { email, url: img || "" };
          }
        } catch {}
      }
    } catch {}
    return { email: null, url: "" };
  }

  // --- Socket Events ---
  useEffect(() => {
    if (!socket) return;
    setLocalSocketId(socket.id);
    localSocketIdRef.current = socket.id;

    async function onParticipants(list) {
      const arr = Array.isArray(list) ? list : [];
      setParticipants(arr.map((p) => ({ ...p, avatar: null })));
      try {
        const serverSpeaking = new Set(arr.filter((p) => p && p.speaking).map((p) => p.id));
        setSpeakingIds(serverSpeaking);
      } catch {}

      arr.forEach((p) => {
        if (!p || !p.id) return;
        if (p.id === socket.id) return;
        peersRef.current[p.id] = { ...(peersRef.current[p.id] || {}), nick: p.nick };
        createPeerIfNeeded(p.id);
        try {
          if (socket.id < p.id) createAndSendOffer(p.id);
        } catch {}
      });

      const toFetch = arr.filter((p) => p && p.id && !loadedAvatarIdsRef.current.has(p.id));
      await Promise.all(
        toFetch.map(async (p) => {
          try {
            const { url } = await fetchAvatarForParticipant(p);
            avatarsRef.current[p.id] = url || "";
            loadedAvatarIdsRef.current.add(p.id);
          } catch {
            avatarsRef.current[p.id] = "";
            loadedAvatarIdsRef.current.add(p.id);
          }
        })
      );

      setAvatars({ ...avatarsRef.current });
      const withAvatars = arr.map((p) => ({
        ...p,
        avatar: avatarsRef.current[p.id] || null,
      }));
      setParticipants(withAvatars);

      const localId = localSocketIdRef.current;
      if (localId && avatarsRef.current[localId]) {
        setLocalAvatar(avatarsRef.current[localId] || "");
      }
    }

    async function onSignal({ from, data }) {
      if (!from || !data) return;
      if (from === socket.id) return;
      const pc = createPeerIfNeeded(from);
      if (!pc) return;

      const entry = (peersRef.current[from] = peersRef.current[from] || {});
      try {
        if (data.sdp) {
          const offerCollision =
            data.sdp.type === "offer" &&
            (entry.makingOffer || pc.signalingState !== "stable");
          if (offerCollision && !entry.polite) {
            entry.ignoreOffer = true;
            console.log("VoiceProvider: ignorando offer por colisão (impolite)", { from });
            return;
          }
          entry.ignoreOffer = false;

          await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));

          if (data.sdp.type === "offer") {
            try {
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              socket.emit("voice-signal", { target: from, data: { sdp: pc.localDescription } });
            } catch (err) {
              console.warn("Erro ao criar answer:", err);
            }
          }
          await applyPendingCandidates(from);
        } else if (data.candidate) {
          if (!pc.remoteDescription || !pc.remoteDescription.type) {
            pendingCandidatesRef.current[from] =
              pendingCandidatesRef.current[from] || [];
            pendingCandidatesRef.current[from].push(data.candidate);
          } else {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
            } catch (err) {
              pendingCandidatesRef.current[from] =
                pendingCandidatesRef.current[from] || [];
              pendingCandidatesRef.current[from].push(data.candidate);
            }
          }
        }
      } catch (e) {
        console.warn("Erro onSignal processing:", e);
      }
    }

    function onSpeaking({ id, speaking }) {
      if (!id) return;
      setSpeakingIds((prev) => {
        const s = new Set(prev);
        if (speaking) s.add(id);
        else s.delete(id);
        return s;
      });
    }

    socket.on("voice-participants", onParticipants);
    socket.on("voice-signal", onSignal);
    socket.on("voice-speaking", onSpeaking);

    socket.on("disconnect", () => {
      Object.keys(peersRef.current).forEach((rid) => cleanupPeer(rid));
      if (localStreamRef.current) {
        try { localStreamRef.current.getTracks().forEach((t) => t.stop()); } catch {}
        localStreamRef.current = null;
      }
      stopLocalAnalyser();
      setInVoice(false);
      setParticipants([]);
      setSpeakingIds(new Set());
      localSocketIdRef.current = null;
      setLocalSocketId(null);
    });

    return () => {
      socket.off("voice-participants", onParticipants);
      socket.off("voice-signal", onSignal);
      socket.off("voice-speaking", onSpeaking);
    };
  }, [userNick]);

  // --- se música do mestre chegar depois, injeta nas peers existentes e renegocia ---
  useEffect(() => {
    if (!getMusicStream) return;
    try {
      const musicStream = getMusicStream();
      if (!musicStream) return;
      if (userNick !== MASTER_EMAIL) return;
      Object.keys(peersRef.current).forEach(async (rid) => {
        const entry = peersRef.current[rid];
        const pc = entry?.pc;
        if (!pc) return;
        const existingIds = pc.getSenders().map((s) => s.track && s.track.id).filter(Boolean);
        musicStream.getAudioTracks().forEach((t) => {
          if (!existingIds.includes(t.id)) {
            try { pc.addTrack(t, musicStream); } catch (e) { console.warn("Erro addTrack musicStream:", e); }
          }
        });
        try {
          await createAndSendOffer(rid);
        } catch (e) {
          console.warn("Erro ao renegociar com musicStream:", e);
        }
      });
    } catch (e) {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getMusicStream, userNick]);

  // --- Entrar no chat de voz (pega microfone) ---
  async function startVoice() {
    if (inVoice) return;
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
      try {
        socket.emit("voice-join", { nick: userNick || "Jogador" });
      } catch (e) {}
      setInVoice(true);
      startLocalAnalyser(stream);

      Object.keys(peersRef.current).forEach(async (rid) => {
        const entry = peersRef.current[rid];
        const pc = entry?.pc;
        if (!pc) return;
        const currentSenderTrackIds = pc.getSenders().map((s) => s.track && s.track.id).filter(Boolean);
        stream.getTracks().forEach((t) => {
          if (!currentSenderTrackIds.includes(t.id)) {
            try { pc.addTrack(t, stream); } catch (e) { console.warn("Erro addTrack local to pc:", e); }
          }
        });
        try {
          await createAndSendOffer(rid);
        } catch (e) {
          console.warn("Erro ao renegociar após startVoice:", e);
        }
      });
    } catch (err) {
      alert("⚠️ Permita o acesso ao microfone para usar o chat de voz.");
      console.error("Erro ao iniciar voz:", err);
    }
  }

  // --- Sair do chat ---
  function leaveVoice() {
    try {
      socket.emit("voice-leave");
    } catch (e) {}
    if (localStreamRef.current) {
      try { localStreamRef.current.getTracks().forEach((t) => t.stop()); } catch {}
      localStreamRef.current = null;
    }
    Object.keys(peersRef.current).forEach((rid) => cleanupPeer(rid));
    peersRef.current = {};
    pendingCandidatesRef.current = {};
    stopLocalAnalyser();
    setInVoice(false);
    setParticipants([]);
    setSpeakingIds(new Set());
    localSocketIdRef.current = null;
    setLocalSocketId(null);
  }

  function toggleLocalMute() {
    if (!localStreamRef.current) return;
    const muted = !localMuted;
    localStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = !muted));
    setLocalMuted(muted);
  }

  // cleanup on unmount
  useEffect(() => {
    return () => {
      isUnmountedRef.current = true;
      try { leaveVoice(); } catch (e) {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // expose remoteStreams for UI components that expect them (e.g. MesaRPG)
  const remoteStreams = Object.keys(peersRef.current).map((id) => {
    return { id, stream: peersRef.current[id]?._stream || null, nick: peersRef.current[id]?.nick };
  });

  // provider value
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
        remoteStreams,
        avatars,      // map participantId -> url
        localAvatar,  // avatar do usuário local (se houver)
      }}
    >
      {children}
    </VoiceContext.Provider>
  );
}

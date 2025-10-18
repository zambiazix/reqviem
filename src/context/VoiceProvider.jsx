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
  const [avatars, setAvatars] = useState({});
  const [localAvatar, setLocalAvatar] = useState("");

  const localStreamRef = useRef(null);
  const peersRef = useRef({});
  const pendingCandidatesRef = useRef({});
  const analyserRef = useRef(null);
  const rafRef = useRef(null);
  const prevLocalSpeakingRef = useRef(false);
  const localSocketIdRef = useRef(null);
  const avatarsRef = useRef({});
  const loadedAvatarIdsRef = useRef(new Set());

  const { unlockAudio, getMusicStream } = useAudio();

  const RTC_CONFIG = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };

  // --- Identidade do usuário ---
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
      } else setUserNick("");
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
        const sid = localSocketIdRef.current || socket?.id;
        if (sid && isSpeaking !== prevLocalSpeakingRef.current) {
          prevLocalSpeakingRef.current = isSpeaking;
          setSpeakingIds((prev) => {
            const s = new Set(prev);
            if (isSpeaking) s.add(sid);
            else s.delete(sid);
            return s;
          });
          socket.emit("voice-speaking", { id: sid, speaking: isSpeaking });
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

  // --- <audio> oculto para streams ---
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
    audioEl.style.display = "none";
    audioEl.srcObject = stream;
    document.body.appendChild(audioEl);
    audioEl.play().catch(() => {});
    return audioEl;
  }

  // --- Busca avatar ---
  async function fetchAvatarForParticipant(p) {
    try {
      let email = p.email || null;
      if (!email && p.nick) {
        const usersColl = collection(db, "users");
        const q = firestoreQuery(usersColl, where("nick", "==", p.nick));
        const snaps = await getDocs(q);
        if (snaps.size > 0) email = snaps.docs[0].id;
      }
      if (email) {
        const fichaRef = doc(db, "fichas", email);
        const fichaSnap = await getDoc(fichaRef);
        if (fichaSnap.exists()) {
          const img = fichaSnap.data().imagemPersonagem || "";
          return { email, url: img || "" };
        }
      }
    } catch {}
    return { email: null, url: "" };
  }

  // --- Criação de PeerConnection ---
  function createPeerIfNeeded(remoteId) {
    if (!remoteId) return null;
    if (peersRef.current[remoteId]?.pc) return peersRef.current[remoteId].pc;

    const pc = new RTCPeerConnection(RTC_CONFIG);
    peersRef.current[remoteId] = { pc };

    pc.onicecandidate = (ev) => {
      if (ev.candidate)
        socket.emit("voice-signal", { target: remoteId, data: { candidate: ev.candidate } });
    };

    pc.ontrack = (e) => {
      const stream = e.streams[0];
      createHiddenAudioForStream(remoteId, stream);
    };

    if (localStreamRef.current)
      localStreamRef.current.getTracks().forEach((t) => pc.addTrack(t, localStreamRef.current));

    (async () => {
      try {
        await unlockAudio();
        const musicStream = getMusicStream();
        if (musicStream && userNick === MASTER_EMAIL)
          musicStream.getAudioTracks().forEach((t) => pc.addTrack(t, musicStream));
      } catch (e) {
        console.warn("Falha injetando música:", e);
      }
    })();

    return pc;
  }

  async function createAndSendOffer(remoteId) {
    const pc = createPeerIfNeeded(remoteId);
    if (!pc) return;
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit("voice-signal", { target: remoteId, data: { sdp: pc.localDescription } });
    } catch (e) {
      console.warn("Falha ao criar offer:", e);
    }
  }

  // --- Entrar ---
  async function startVoice() {
    if (inVoice) return;
    try {
      await unlockAudio();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
      socket.emit("voice-join", { nick: userNick || "Jogador" });
      setInVoice(true);
      startLocalAnalyser(stream);
    } catch (err) {
      alert("⚠️ Permita o acesso ao microfone para usar o chat de voz.");
      console.error("Erro ao iniciar voz:", err);
    }
  }

  // --- Sair ---
  function leaveVoice() {
    socket.emit("voice-leave");
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    setInVoice(false);
    stopLocalAnalyser();
  }

  function toggleLocalMute() {
    if (!localStreamRef.current) return;
    const muted = !localMuted;
    localStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = !muted));
    setLocalMuted(muted);
  }

  // --- Socket events ---
  useEffect(() => {
    if (!socket) return;
    localSocketIdRef.current = socket.id;

    async function onParticipants(list) {
      const arr = Array.isArray(list) ? list : [];
      setParticipants(arr);
      const toFetch = arr.filter((p) => p && p.id && !loadedAvatarIdsRef.current.has(p.id));
      await Promise.all(
        toFetch.map(async (p) => {
          const { url } = await fetchAvatarForParticipant(p);
          avatarsRef.current[p.id] = url || "";
          loadedAvatarIdsRef.current.add(p.id);
        })
      );
      setAvatars({ ...avatarsRef.current });
    }

    socket.on("voice-participants", onParticipants);
    socket.on("voice-signal", async ({ from, data }) => {
      if (from === socket.id) return;
      const pc = createPeerIfNeeded(from);
      if (!pc) return;
      if (data.sdp) {
        await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
        if (data.sdp.type === "offer") {
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit("voice-signal", { target: from, data: { sdp: pc.localDescription } });
        }
      } else if (data.candidate) {
        await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
      }
    });
    socket.on("voice-speaking", ({ id, speaking }) => {
      setSpeakingIds((prev) => {
        const s = new Set(prev);
        if (speaking) s.add(id);
        else s.delete(id);
        return s;
      });
    });

    return () => {
      socket.off("voice-participants", onParticipants);
      socket.off("voice-signal");
      socket.off("voice-speaking");
    };
  }, [userNick, unlockAudio, getMusicStream]);

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
        avatars,
        localAvatar,
      }}
    >
      {children}
    </VoiceContext.Provider>
  );
}

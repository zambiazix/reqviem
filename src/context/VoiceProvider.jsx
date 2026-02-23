import React, { createContext, useContext, useState, useRef } from "react";
import { Room, createLocalAudioTrack } from "livekit-client";

const VoiceContext = createContext();

const VoiceProvider = ({ children }) => {
  const [inVoice, setInVoice] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [isMuted, setIsMuted] = useState(false);

  const roomRef = useRef(null);
  const audioElementsRef = useRef({});

  const SERVER_URL =
    import.meta.env.VITE_SERVER_URL || "http://localhost:5000";

  const LIVEKIT_URL =
    import.meta.env.VITE_LIVEKIT_URL ||
    "wss://rpg-app-cu3pb8j9.livekit.cloud";

  // ===============================
  // Atualiza participantes
  // ===============================
  const updateParticipants = (activeSpeakers = []) => {
    if (!roomRef.current) return;

    const room = roomRef.current;
    const speakingIds = new Set(activeSpeakers.map((p) => p.identity));

    const allParticipants = [
      room.localParticipant,
      ...Array.from(room.remoteParticipants.values()),
    ];

    const mapped = allParticipants.map((p) => {
      let metadata = {};
      try {
        metadata = p.metadata ? JSON.parse(p.metadata) : {};
      } catch {}

      const audioPub = Array.from(p.audioTrackPublications.values())[0];

      const micEnabled = audioPub?.track
        ? !audioPub.track.isMuted
        : true;

      // 🔥 Se for o participante local, sincroniza o estado real
      if (p === room.localParticipant) {
        setIsMuted(!micEnabled);
      }

      return {
        identity: p.identity,
        name: p.name || p.identity,
        avatar: metadata.avatar || null,
        isSpeaking: speakingIds.has(p.identity),
        isMuted: !micEnabled,
      };
    });

    setParticipants(mapped);
  };

  // ===============================
  // Reprodução segura
  // ===============================
  const playAudioElement = async (element) => {
    try {
      element.autoplay = true;
      element.playsInline = true;
      element.muted = false;
      element.volume = 1;
      await element.play();
    } catch (err) {
      console.warn("Autoplay bloqueado:", err);
    }
  };

  // ===============================
  // Entrar
  // ===============================
  const joinVoice = async ({ roomName, identity, nick, avatar }) => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });

      const response = await fetch(`${SERVER_URL}/livekit/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          room: roomName,
          identity,
          name: nick,
          avatar,
        }),
      });

      if (!response.ok) {
        throw new Error("Erro ao gerar token");
      }

      const { token } = await response.json();
      if (!token) throw new Error("Token inválido");

      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
      });

      await room.connect(LIVEKIT_URL, token);

      const audioTrack = await createLocalAudioTrack({
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      });

      await room.localParticipant.publishTrack(audioTrack);

      // 🔥 Eventos robustos
      room.on("participantConnected", () => updateParticipants());
      room.on("participantDisconnected", () => updateParticipants());

      room.on("activeSpeakersChanged", (speakers) => {
        updateParticipants(speakers);
      });

      room.on("trackMuted", () => updateParticipants());
      room.on("trackUnmuted", () => updateParticipants());

      room.on("trackSubscribed", async (track, publication, participant) => {
        if (track.kind !== "audio") return;

        const id = participant.identity;
        if (audioElementsRef.current[id]) return;

        const element = track.attach();
        element.style.display = "none";
        document.body.appendChild(element);

        audioElementsRef.current[id] = element;

        await playAudioElement(element);
      });

      roomRef.current = room;
      setInVoice(true);
      updateParticipants();
    } catch (err) {
      console.error("Erro ao conectar:", err);
    }
  };

  // ===============================
  // 🔥 Mute 100% sincronizado
  // ===============================
  const toggleMute = async () => {
    if (!roomRef.current) return;

    const local = roomRef.current.localParticipant;

    const audioPub = Array.from(
      local.audioTrackPublications.values()
    )[0];

    if (!audioPub?.track) return;

    if (audioPub.track.isMuted) {
      await audioPub.track.unmute();
    } else {
      await audioPub.track.mute();
    }

    updateParticipants();
  };

  // ===============================
  // Sair
  // ===============================
  const leaveVoice = async () => {
    if (roomRef.current) {
      await roomRef.current.disconnect();
      roomRef.current = null;
    }

    Object.values(audioElementsRef.current).forEach((el) => {
      el.pause();
      el.remove();
    });

    audioElementsRef.current = {};
    setParticipants([]);
    setInVoice(false);
    setIsMuted(false);
  };

  return (
    <VoiceContext.Provider
      value={{
        inVoice,
        participants,
        joinVoice,
        leaveVoice,
        toggleMute,
        isMuted,
      }}
    >
      {children}
    </VoiceContext.Provider>
  );
};

export const useVoice = () => useContext(VoiceContext);
export default VoiceProvider;
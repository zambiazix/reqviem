import React, { createContext, useContext, useState, useRef } from "react";
import { Room, createLocalAudioTrack } from "livekit-client";

const VoiceContext = createContext();

const VoiceProvider = ({ children }) => {
  const [inVoice, setInVoice] = useState(false);
  const [participants, setParticipants] = useState([]);
  const roomRef = useRef(null);

  // Atualiza lista de participantes com controle real de fala
  const updateParticipants = (activeSpeakers = []) => {
    if (!roomRef.current) return;

    const room = roomRef.current;

    const speakingIds = new Set(
      activeSpeakers.map((p) => p.identity)
    );

    const allParticipants = [
      room.localParticipant,
      ...Array.from(room.remoteParticipants.values()),
    ];

    const mapped = allParticipants.map((p) => ({
      identity: p.identity,
      name: p.name || p.identity,
      isSpeaking: speakingIds.has(p.identity),
    }));

    setParticipants(mapped);
  };

  const joinVoice = async ({ roomName, identity, nick }) => {
    try {
      // 🔓 Garante permissão e libera autoplay (importante!)
      await navigator.mediaDevices.getUserMedia({ audio: true });

      const response = await fetch(
        `${import.meta.env.VITE_SERVER_URL}/livekit/token`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            room: roomName,
            identity,
            name: nick,
          }),
        }
      );

      const data = await response.json();
      if (!data.token) return;

      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
      });

      await room.connect(import.meta.env.VITE_LIVEKIT_URL, data.token);

      // 🎤 Cria e publica áudio local manualmente
      const audioTrack = await createLocalAudioTrack({
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      });

      await room.localParticipant.publishTrack(audioTrack);

      // Eventos de conexão
      room.on("participantConnected", () => updateParticipants([]));
      room.on("participantDisconnected", () => updateParticipants([]));

      // Detecção real de fala
      room.on("activeSpeakersChanged", (speakers) => {
        updateParticipants(speakers);
      });

      // 🔊 Reprodução de áudio remoto (com autoplay forçado)
      room.on("trackSubscribed", (track) => {
        if (track.kind === "audio") {
          const element = track.attach();

          element.autoplay = true;
          element.playsInline = true;
          element.style.display = "none";

          document.body.appendChild(element);

          // Força tentativa de reprodução
          element.play().catch((err) => {
            console.warn("Autoplay bloqueado:", err);
          });
        }
      });

      roomRef.current = room;
      setInVoice(true);
      updateParticipants([]);
    } catch (err) {
      console.error("Erro ao conectar no voice:", err);
    }
  };

  const leaveVoice = async () => {
    if (roomRef.current) {
      await roomRef.current.disconnect();
      roomRef.current = null;
    }
    setParticipants([]);
    setInVoice(false);
  };

  return (
    <VoiceContext.Provider
      value={{
        inVoice,
        participants,
        joinVoice,
        leaveVoice,
      }}
    >
      {children}
    </VoiceContext.Provider>
  );
};

export const useVoice = () => useContext(VoiceContext);
export default VoiceProvider;

import React, { createContext, useContext, useState, useRef } from "react";
import { Room, createLocalAudioTrack } from "livekit-client";

const VoiceContext = createContext();

const VoiceProvider = ({ children }) => {
  const [inVoice, setInVoice] = useState(false);
  const [participants, setParticipants] = useState([]);
  const roomRef = useRef(null);
  const audioElementsRef = useRef({}); // controla elementos criados

  // ===============================
  // Atualiza participantes
  // ===============================
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

  // ===============================
  // Força reprodução segura (Brave fix)
  // ===============================
  const playAudioElement = async (element) => {
    try {
      element.autoplay = true;
      element.playsInline = true;
      element.muted = false;
      element.volume = 1;

      await element.play();
      console.log("🔊 Áudio remoto tocando");
    } catch (err) {
      console.warn("⚠️ Autoplay bloqueado, tentando interação:", err);
    }
  };

  // ===============================
  // Entrar na sala
  // ===============================
  const joinVoice = async ({ roomName, identity, nick }) => {
    try {
      // 🔓 Libera autoplay e permissão
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

      // 🎤 Publica áudio local
      const audioTrack = await createLocalAudioTrack({
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      });

      await room.localParticipant.publishTrack(audioTrack);

      // ===============================
      // Eventos
      // ===============================

      room.on("participantConnected", () => updateParticipants([]));
      room.on("participantDisconnected", () => updateParticipants([]));

      room.on("activeSpeakersChanged", (speakers) => {
        updateParticipants(speakers);
      });

      // 🔊 Quando nova track for assinada
      room.on("trackSubscribed", async (track, publication, participant) => {
        if (track.kind !== "audio") return;

        const id = participant.identity;

        if (audioElementsRef.current[id]) return; // evita duplicado

        const element = track.attach();
        element.style.display = "none";

        document.body.appendChild(element);

        audioElementsRef.current[id] = element;

        await playAudioElement(element);
      });

      // 🔁 IMPORTANTE: pega tracks já existentes
      room.remoteParticipants.forEach((participant) => {
        participant.trackPublications.forEach(async (publication) => {
          if (
            publication.kind === "audio" &&
            publication.isSubscribed &&
            publication.track
          ) {
            const element = publication.track.attach();
            element.style.display = "none";
            document.body.appendChild(element);

            audioElementsRef.current[participant.identity] = element;

            await playAudioElement(element);
          }
        });
      });

      roomRef.current = room;
      setInVoice(true);
      updateParticipants([]);

    } catch (err) {
      console.error("Erro ao conectar no voice:", err);
    }
  };

  // ===============================
  // Sair da sala
  // ===============================
  const leaveVoice = async () => {
    if (roomRef.current) {
      await roomRef.current.disconnect();
      roomRef.current = null;
    }

    // Remove áudios criados
    Object.values(audioElementsRef.current).forEach((el) => {
      el.pause();
      el.remove();
    });

    audioElementsRef.current = {};

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

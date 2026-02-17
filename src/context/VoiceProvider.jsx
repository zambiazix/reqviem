import React, { createContext, useContext, useState, useRef } from "react";
import { Room } from "livekit-client";

const VoiceContext = createContext();

const VoiceProvider = ({ children }) => {
  const [inVoice, setInVoice] = useState(false);
  const [participants, setParticipants] = useState([]);
  const roomRef = useRef(null);

  const updateParticipants = () => {
    if (!roomRef.current) return;

    const room = roomRef.current;

    const allParticipants = [
      room.localParticipant,
      ...Array.from(room.remoteParticipants.values()),
    ];

    const mapped = allParticipants.map((p) => ({
      identity: p.identity,
      name: p.name || p.identity,
      isSpeaking: p.isSpeaking || false,
    }));

    setParticipants(mapped);
  };

  const joinVoice = async ({ roomName, identity, nick }) => {
    try {
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

      await room.localParticipant.enableMicrophone({
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      });

      room.on("participantConnected", updateParticipants);
      room.on("participantDisconnected", updateParticipants);
      room.on("activeSpeakersChanged", updateParticipants);

      room.on("trackSubscribed", (track) => {
        if (track.kind === "audio") {
          const element = track.attach();
          element.style.display = "none";
          document.body.appendChild(element);
        }
      });

      roomRef.current = room;
      setInVoice(true);
      updateParticipants();
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

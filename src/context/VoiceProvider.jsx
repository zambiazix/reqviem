import React, { createContext, useContext, useState } from "react";
import { Room, RoomEvent } from "livekit-client";

const VoiceContext = createContext();
export const useVoice = () => useContext(VoiceContext);

export default function VoiceProvider({ children }) {
  const [room, setRoom] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [inVoice, setInVoice] = useState(false);

  async function joinVoice({ roomName, identity, nick }) {
    if (room) return;
console.log("🔥 joinVoice FOI CHAMADO");
    const res = await fetch(
  `${import.meta.env.VITE_API_URL}/livekit/token`,
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

console.log("📡 fetch enviado");

    if (!res.ok) {
      console.error("Erro ao obter token");
      return;
    }

    const { token } = await res.json();

    const livekitRoom = new Room({
      adaptiveStream: false,
      dynacast: true,
    });

    livekitRoom.on(RoomEvent.ParticipantConnected, () =>
      updateParticipants(livekitRoom)
    );
    livekitRoom.on(RoomEvent.ParticipantDisconnected, () =>
      updateParticipants(livekitRoom)
    );

    await livekitRoom.connect(
      import.meta.env.VITE_LIVEKIT_URL,
      token
    );

    await livekitRoom.localParticipant.enableMicrophone();

    setRoom(livekitRoom);
    setInVoice(true);
    updateParticipants(livekitRoom);
  }

  function updateParticipants(r) {
    if (!r) return;
    setParticipants([
      r.localParticipant,
      ...Array.from(r.remoteParticipants.values()),
    ]);
  }

  function leaveVoice() {
    if (!room) return;
    room.disconnect();
    setRoom(null);
    setParticipants([]);
    setInVoice(false);
  }

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
}

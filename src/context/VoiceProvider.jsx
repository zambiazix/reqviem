import React, { createContext, useContext, useState, useRef } from "react";
import { Room, RoomEvent, Track } from "livekit-client";
import { useAudio } from "./AudioProvider";

const VoiceContext = createContext();

const VoiceProvider = ({ children }) => {
  const [inVoice, setInVoice] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [isMuted, setIsMuted] = useState(false);
  const { getMusicStream } = useAudio();
  const musicTrackRef = useRef(null);

  const roomRef = useRef(null);
  const audioElementsRef = useRef({});

  const SERVER_URL =
    import.meta.env.VITE_SERVER_URL || "http://localhost:5000";

  const LIVEKIT_URL =
    import.meta.env.VITE_LIVEKIT_URL ||
    "wss://rpg-app-cu3pb8j9.livekit.cloud";

  // ===============================
  // Atualização de participantes
  // ===============================
  const updateParticipants = (activeSpeakers = []) => {
    const room = roomRef.current;
    if (!room) return;

    const speakingIds = new Set(activeSpeakers.map((p) => p.identity));

    const all = [
      room.localParticipant,
      ...Array.from(room.remoteParticipants.values()),
    ];

    const mapped = all.map((p) => {
      let metadata = {};
      try {
        metadata = p.metadata ? JSON.parse(p.metadata) : {};
      } catch {}

      const audioPub = Array.from(
        p.audioTrackPublications.values()
      )[0];

      const micEnabled =
        audioPub?.track ? !audioPub.track.isMuted : false;

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
  // Limpeza segura de áudio
  // ===============================
  const removeAudioElement = (identity) => {
    const el = audioElementsRef.current[identity];
    if (el) {
      try {
        el.pause();
        el.srcObject = null;
        el.remove();
      } catch {}
      delete audioElementsRef.current[identity];
    }
  };

  // 🎵 PUBLICAR MÚSICA
  const publishMusicTrack = async (room) => {
    let musicStream = getMusicStream();
    
    if (!musicStream) {
      console.log("Criando stream de música silencioso...");
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioCtx();
      const dest = ctx.createMediaStreamDestination();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      gain.gain.value = 0;
      osc.connect(gain);
      gain.connect(dest);
      osc.start();
      musicStream = dest.stream;
    }
    
    if (musicStream && room.localParticipant) {
      try {
        const audioTrack = musicStream.getAudioTracks()[0];
        if (audioTrack) {
          const musicTrack = await room.localParticipant.publishTrack(
            audioTrack,
            {
              name: "music",
              source: "unknown",
            }
          );
          musicTrackRef.current = musicTrack;
          console.log("✅ Track de música publicado!");
        }
      } catch (err) {
        console.warn("Erro ao publicar música:", err);
      }
    }
  };

  // ===============================
  // Entrar na sala
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

      if (!response.ok) throw new Error("Erro ao gerar token");

      const { token } = await response.json();
      if (!token) throw new Error("Token inválido");

      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
      });

      // Eventos principais
      room
        .on(RoomEvent.ParticipantConnected, () =>
          updateParticipants()
        )
        .on(RoomEvent.ParticipantDisconnected, (participant) => {
          removeAudioElement(participant.identity);
          updateParticipants();
        })
        .on(RoomEvent.ActiveSpeakersChanged, (speakers) =>
          updateParticipants(speakers)
        )
        .on(RoomEvent.TrackMuted, () => updateParticipants())
        .on(RoomEvent.TrackUnmuted, () => updateParticipants())
        .on(RoomEvent.TrackPublished, (pub, participant) => {
          if (pub.trackName === "music" || pub.source === "unknown") {
            pub.setSubscribed(true);
            console.log("🎵 Inscrito na track de música de:", participant.identity);
          }
        })
                        .on(RoomEvent.TrackSubscribed, async (track, pub, participant) => {
          console.log('🎤 Track recebida:', track.kind, 'de:', participant.identity);
          
          if (track.kind !== Track.Kind.Audio) return;

          const id = participant.identity;
          removeAudioElement(id);

          const element = track.attach();
          element.autoplay = true;
          element.playsInline = true;
          element.volume = 1.0;
          element.muted = false;
          element.style.display = "none";

          document.body.appendChild(element);
          audioElementsRef.current[id] = element;

          const tryPlay = async (retries = 3) => {
            for (let i = 0; i < retries; i++) {
              try {
                await element.play();
                console.log('✅ Áudio reproduzindo para:', participant.identity);
                return true;
              } catch (e) {
                console.warn(`Tentativa ${i + 1} falhou:`, e.message);
                if (i === retries - 1) {
                  console.warn('Aguardando interação do usuário...');
                  const unlockPlay = () => {
                    element.play().catch(err => console.warn('Falha final:', err));
                    document.removeEventListener('click', unlockPlay);
                    document.removeEventListener('keydown', unlockPlay);
                  };
                  document.addEventListener('click', unlockPlay, { once: true });
                  document.addEventListener('keydown', unlockPlay, { once: true });
                }
                await new Promise(resolve => setTimeout(resolve, 500));
              }
            }
          };
          
          tryPlay();
        })
        .on(RoomEvent.TrackUnsubscribed, (track, pub, participant) => {
          if (track.kind !== Track.Kind.Audio) return;
          removeAudioElement(participant.identity);
        })
        .on(RoomEvent.Disconnected, () => {
          Object.keys(audioElementsRef.current).forEach((id) =>
            removeAudioElement(id)
          );
          audioElementsRef.current = {};
          setParticipants([]);
          setInVoice(false);
          setIsMuted(false);
        });

      await room.connect(LIVEKIT_URL, token, {
        autoSubscribe: true,
      });

                  await room.localParticipant.setMicrophoneEnabled(true);
      
      // 🟢 Desbloqueia áudio no primeiro clique
      const unlockAudio = () => {
        const audio = new Audio();
        audio.play().then(() => {
          console.log('🔓 Áudio desbloqueado!');
        }).catch(() => {});
        document.removeEventListener('click', unlockAudio);
        document.removeEventListener('touchstart', unlockAudio);
      };
      document.addEventListener('click', unlockAudio);
      document.addEventListener('touchstart', unlockAudio);
      
      // 🎵 PUBLICAR MÚSICA
      await publishMusicTrack(room);

      roomRef.current = room;
      setInVoice(true);
      updateParticipants();
    } catch (err) {
      console.error("Erro ao conectar no voice:", err);
    }
  };

  // ===============================
  // Toggle Mute real
  // ===============================
  const toggleMute = async () => {
    const room = roomRef.current;
    if (!room) return;

    const local = room.localParticipant;

    const pub = Array.from(
      local.audioTrackPublications.values()
    )[0];

    if (!pub?.track) return;

    if (pub.track.isMuted) {
      await pub.track.unmute();
    } else {
      await pub.track.mute();
    }

    updateParticipants();
  };

  // ===============================
  // Sair da sala
  // ===============================
  const leaveVoice = async () => {
    // Despublicar track de música
    if (musicTrackRef.current) {
      try {
        await roomRef.current?.localParticipant.unpublishTrack(
          musicTrackRef.current
        );
      } catch {}
      musicTrackRef.current = null;
    }

    const room = roomRef.current;
    if (room) {
      await room.disconnect();
      roomRef.current = null;
    }

    Object.keys(audioElementsRef.current).forEach((id) =>
      removeAudioElement(id)
    );

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
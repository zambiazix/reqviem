// src/components/MesaRPG.jsx
import React from "react";
import {
  Paper,
  Typography,
  Button,
  List,
  ListItem,
  Box,
} from "@mui/material";
import { useVoice } from "../context/VoiceProvider";
import { useAudio } from "../context/AudioProvider";

export default function MesaRPG({ userNick }) {
  const {
    inVoice,
    participants,
    localMuted,
    speakingIds,
    startVoice,
    leaveVoice,
    toggleLocalMute,
    localSocketId,
    avatars,
  } = useVoice() || {};

  const { unlockAudio } = useAudio() || {};

  // segurança pra evitar erros se algum dado estiver nulo
  const safeParticipants = Array.isArray(participants) ? participants : [];
  const safeSpeakingIds = speakingIds instanceof Set ? speakingIds : new Set();

  return (
    <Paper
      sx={{
        p: 2,
        mb: 2,
        bgcolor: "#1e272e",
        color: "white",
        borderRadius: 3,
        boxShadow: "0 0 12px rgba(0,0,0,0.3)",
      }}
    >
      <Typography variant="h6" sx={{ mb: 2 }}>
        Mesa RPG — Chat de Voz
      </Typography>

      {!inVoice ? (
        <Button
          variant="contained"
          color="success"
          onClick={async () => {
            try {
              await unlockAudio?.();
              await startVoice?.();
            } catch (err) {
              console.error("Erro ao entrar no chat de voz:", err);
              alert("Não foi possível iniciar o chat de voz.");
            }
          }}
        >
          Entrar no Chat de Voz
        </Button>
      ) : (
        <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
          <Button variant="outlined" color="error" onClick={leaveVoice}>
            Sair
          </Button>
          <Button
            variant="contained"
            color={localMuted ? "warning" : "primary"}
            onClick={toggleLocalMute}
          >
            {localMuted ? "Desmutar" : "Mutar"}
          </Button>
        </Box>
      )}

      <List>
        {safeParticipants.map((p) => {
          const isSpeaking = safeSpeakingIds.has(p.id);
          const avatarSrc = p.avatar || avatars?.[p.id] || "";

          return (
            <ListItem
              key={p.id}
              sx={{
                display: "flex",
                alignItems: "center",
                py: 1,
                px: 0,
                borderBottom: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                {/* 🔵 Avatar com anel de fala */}
                <Box
                  sx={{
                    position: "relative",
                    width: 48,
                    height: 48,
                    "@keyframes voice-pulse": {
                      "0%": { boxShadow: "0 0 0 0 rgba(34,197,94,0.6)" },
                      "70%": { boxShadow: "0 0 0 10px rgba(34,197,94,0)" },
                      "100%": { boxShadow: "0 0 0 0 rgba(34,197,94,0)" },
                    },
                  }}
                >
                  <Box
                    sx={{
                      width: "100%",
                      height: "100%",
                      borderRadius: "50%",
                      overflow: "hidden",
                      border: isSpeaking
                        ? "3px solid #22c55e"
                        : "3px solid transparent",
                      animation: isSpeaking ? "voice-pulse 1.5s infinite" : "none",
                      transition: "border-color 0.2s ease, box-shadow 0.2s ease",
                      boxShadow: isSpeaking
                        ? "0 0 10px rgba(34,197,94,0.4)"
                        : "none",
                    }}
                  >
                    {avatarSrc ? (
                      <img
                        src={avatarSrc}
                        alt={p.nick}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          borderRadius: "50%",
                        }}
                      />
                    ) : (
                      <Box
                        sx={{
                          width: "100%",
                          height: "100%",
                          bgcolor: "#2f3640",
                          color: "white",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: "bold",
                          fontSize: 18,
                          borderRadius: "50%",
                        }}
                      >
                        {p.nick ? p.nick.charAt(0).toUpperCase() : "?"}
                      </Box>
                    )}
                  </Box>
                </Box>

                {/* Nome */}
                <Typography
                  sx={{
                    color: isSpeaking ? "#22c55e" : "white",
                    fontWeight: isSpeaking ? "bold" : "normal",
                    transition: "color 0.2s ease",
                  }}
                >
                  {p.nick}
                  {p.id === localSocketId && " (Você)"}
                </Typography>
              </Box>
            </ListItem>
          );
        })}
      </List>
    </Paper>
  );
}

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

const MASTER_EMAIL = "mestre@reqviemrpg.com";

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
          const isMaster = p.email === MASTER_EMAIL || p.nick === "Mestre";

          // 🎖️ estilos especiais do Mestre
          const borderColor = isMaster
            ? "#FFD700"
            : isSpeaking
            ? "#22c55e"
            : "transparent";

          const glowColor = isMaster
            ? "rgba(255,215,0,0.6)"
            : isSpeaking
            ? "rgba(34,197,94,0.4)"
            : "none";

          const nameColor = isMaster
            ? "#FFD700"
            : isSpeaking
            ? "#22c55e"
            : "white";

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
                {/* Avatar com borda especial */}
                <Box
                  sx={{
                    position: "relative",
                    width: 48,
                    height: 48,
                    "@keyframes voice-pulse": {
                      "0%": { boxShadow: `0 0 0 0 ${glowColor}` },
                      "70%": { boxShadow: `0 0 0 10px transparent` },
                      "100%": { boxShadow: `0 0 0 0 transparent` },
                    },
                  }}
                >
                  <Box
                    sx={{
                      width: "100%",
                      height: "100%",
                      borderRadius: "50%",
                      overflow: "hidden",
                      border: `3px solid ${borderColor}`,
                      animation:
                        isSpeaking || isMaster
                          ? "voice-pulse 1.5s infinite"
                          : "none",
                      transition: "border-color 0.2s ease, box-shadow 0.2s ease",
                      boxShadow: isSpeaking || isMaster ? `0 0 10px ${glowColor}` : "none",
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

                {/* Nome com destaque do Mestre */}
                <Typography
                  sx={{
                    color: nameColor,
                    fontWeight: isMaster ? "bold" : isSpeaking ? "bold" : "normal",
                    textShadow: isMaster
                      ? "0 0 6px rgba(255,215,0,0.6)"
                      : "none",
                    transition: "color 0.2s ease",
                  }}
                >
                  {p.nick}
                  {p.id === localSocketId && " (Você)"}
                  {isMaster && " 👑"}
                </Typography>
              </Box>
            </ListItem>
          );
        })}
      </List>
    </Paper>
  );
}

import React from "react";
import {
  Paper,
  Typography,
  Button,
  List,
  ListItem,
  Box,
  Avatar,
  Stack,
} from "@mui/material";
import { useVoice } from "../context/VoiceProvider";

const MASTER_EMAIL = "mestre@reqviemrpg.com";

export default function MesaRPG({ userNick, userEmail, ficha }) {
  const {
    inVoice,
    participants,
    joinVoice,
    leaveVoice,
    toggleMute,
    isMuted,
  } = useVoice();

  // 🔥 Pegando avatar salvo (ajuste se necessário)
  const avatarUrl = ficha?.imagemPersonagem || null;

  const handleJoin = () => {
    joinVoice({
      roomName: "mesa-rpg",
      identity: userEmail || userNick, // 🔥 identity estável
      nick: userNick || "Jogador",
      avatar: avatarUrl,
    });
  };

  return (
    <Paper
      sx={{
        p: 2,
        mb: 2,
        bgcolor: "#1e272e",
        color: "white",
        borderRadius: 3,
        boxShadow: "0 0 12px rgba(0,0,0,0.3)",
        maxHeight: 350,              // 🔥 altura fixa
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Typography variant="h6" sx={{ mb: 2 }}>
        Mesa RPG — Chat de Voz
      </Typography>

      {!inVoice ? (
        <Button variant="contained" color="success" onClick={handleJoin}>
          Entrar no Chat de Voz
        </Button>
      ) : (
        <Stack direction="row" spacing={2}>
          <Button variant="outlined" color="error" onClick={leaveVoice}>
            Sair
          </Button>

          <Button
            variant="contained"
            color={isMuted ? "warning" : "primary"}
            onClick={toggleMute}
          >
            {isMuted ? "Desmutar" : "Mutar"}
          </Button>
        </Stack>
      )}

      <List
        sx={{
          mt: 2,
          overflowY: "auto",  // 🔥 scroll interno
          maxHeight: 160,
          flex: 1,
        }}
      >
        {participants.map((p) => {
          const isMaster =
            p.name?.toLowerCase() === "mestre" ||
            p.identity === MASTER_EMAIL;

          const isSpeaking = p.isSpeaking;
          const isYou = p.identity === (userEmail || userNick);

          const borderColor = isMaster
            ? "#FFD700"
            : isSpeaking
            ? "#22c55e"
            : "transparent";

          const boxShadow = isMaster
            ? "0 0 10px rgba(255,215,0,0.6)"
            : isSpeaking
            ? "0 0 10px rgba(34,197,94,0.5)"
            : "none";

          return (
            <ListItem
              key={p.identity}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 2,
                borderBottom: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              <Avatar
                src={p.avatar || undefined}
                sx={{
                  width: 48,
                  height: 48,
                  border: `3px solid ${borderColor}`,
                  boxShadow,
                  bgcolor: "#2f3640",
                }}
              >
                {!p.avatar && p.name?.charAt(0).toUpperCase()}
              </Avatar>

              <Typography
                sx={{
                  color: borderColor === "transparent" ? "white" : borderColor,
                  fontWeight: isSpeaking || isMaster ? "bold" : "normal",
                }}
              >
                {p.name}
                {isYou && " (Você)"}
                {isMaster && " 👑"}
                {p.isMuted && " 🔇"}
              </Typography>
            </ListItem>
          );
        })}
      </List>
    </Paper>
  );
}
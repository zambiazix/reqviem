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

const MASTER_EMAIL = "mestre@reqviemrpg.com";

export default function MesaRPG({ userNick }) {
  const { inVoice, participants, joinVoice, leaveVoice } = useVoice();

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
          onClick={() =>
            joinVoice({
              roomName: "mesa-rpg",
              identity: crypto.randomUUID(),
              nick: userNick || "Jogador",
            })
          }
        >
          Entrar no Chat de Voz
        </Button>
      ) : (
        <Button variant="outlined" color="error" onClick={leaveVoice}>
          Sair do Chat de Voz
        </Button>
      )}

      <List sx={{ mt: 2 }}>
        {participants.map((p) => {
          const isMaster =
            p.name?.toLowerCase() === "mestre" ||
            p.identity === MASTER_EMAIL;

          const isSpeaking = p.isSpeaking;

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
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: "50%",
                  bgcolor: "#2f3640",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: "bold",
                  border: `3px solid ${borderColor}`,
                  boxShadow,
                }}
              >
                {p.name?.charAt(0).toUpperCase() || "?"}
              </Box>

              <Typography
                sx={{
                  color: borderColor === "transparent" ? "white" : borderColor,
                  fontWeight: isSpeaking || isMaster ? "bold" : "normal",
                }}
              >
                {p.name || p.identity}
                {isMaster && " 👑"}
                {p === participants[0] && " (Você)"}
              </Typography>
            </ListItem>
          );
        })}
      </List>
    </Paper>
  );
}

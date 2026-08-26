import React, { useState, useEffect } from "react";
import {
  Paper,
  Typography,
  Button,
  List,
  ListItem,
  Box,
  Avatar,
  Stack,
  Badge,
  IconButton,
} from "@mui/material";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useVoice } from "../context/VoiceProvider";
import { useJitsi } from "../context/JitsiProvider";

const MASTER_EMAIL = "mestre@reqviemrpg.com";

/* ===============================
   LIGHTBOX IMAGE (Zoom + Drag)
================================ */
function LightboxImage({ src, zoom, setZoom }) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [start, setStart] = useState({ x: 0, y: 0 });
  const [initialDistance, setInitialDistance] = useState(null);

  useEffect(() => {
    setPosition({ x: 0, y: 0 });
    setZoom(1);
  }, [src]);

  const handleMouseDown = (e) => {
    e.preventDefault();
    setDragging(true);
    setStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e) => {
    if (!dragging) return;
    setPosition({ x: e.clientX - start.x, y: e.clientY - start.y });
  };

  const handleMouseUp = () => setDragging(false);

  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom((z) => Math.min(Math.max(z * delta, 0.5), 5));
  };

  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      setDragging(true);
      setStart({
        x: touch.clientX - position.x,
        y: touch.clientY - position.y,
      });
    } else if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      setInitialDistance(dist);
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 1 && dragging) {
      const touch = e.touches[0];
      setPosition({
        x: touch.clientX - start.x,
        y: touch.clientY - start.y,
      });
    } else if (e.touches.length === 2 && initialDistance) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const delta = dist / initialDistance;
      setZoom((z) => Math.min(Math.max(z * delta, 0.5), 5));
      setInitialDistance(dist);
    }
  };

  const handleTouchEnd = () => {
    setDragging(false);
    setInitialDistance(null);
  };

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragging, start]);

  return (
    <img
      src={src}
      alt="ampliada"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={handleMouseDown}
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
        transition: dragging ? "none" : "transform 0.2s ease",
        maxWidth: "90%",
        maxHeight: "90%",
        borderRadius: 10,
        cursor: dragging ? "grabbing" : "grab",
        userSelect: "none",
        touchAction: "none",
      }}
    />
  );
}

/* ===============================
   COMPONENTE PRINCIPAL
================================ */
export default function MesaRPG({ userNick, userEmail, ficha }) {
  // 🟢 Substituir Voice pelo Jitsi
  const { startMeeting, endMeeting, showMeeting } = useJitsi();
  
  // Estados simulados para manter a UI funcionando
  const [inVoice, setInVoice] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [isMuted, setIsMuted] = useState(false);

  const [collapsed, setCollapsed] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState(null);
  const [zoom, setZoom] = useState(1);

  const avatarUrl = ficha?.imagemPersonagem || null;

  const handleJoin = () => {
  // 🟢 Usar Jitsi em vez de LiveKit
  startMeeting("requiem-rpg-mesa", {
    name: userNick || "Jogador",
    email: userEmail,
    avatar: avatarUrl,
  });
  setInVoice(true);
};
  
  const playerCount = participants.length;

  return (
    <>
      <Paper
        sx={{
          p: 2,
          mb: 2,
          bgcolor: "#1e272e",
          color: "white",
          borderRadius: 3,
          boxShadow: "0 0 12px rgba(0,0,0,0.3)",
          position: "relative",
          transition: "all 0.3s ease",
        }}
      >
        <Badge
          badgeContent={playerCount}
          color="primary"
          sx={{
            position: "absolute",
            top: 10,
            right: 10,
            "& .MuiBadge-badge": { fontWeight: "bold" },
          }}
        />

        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ mb: 2 }}
        >
          <Typography variant="h6">
            Mesa RPG — Chat de Voz
          </Typography>

          {inVoice && (
            <IconButton
              size="small"
              onClick={() => setCollapsed((prev) => !prev)}
              sx={{ color: "white" }}
            >
              {collapsed ? <ExpandMoreIcon /> : <ExpandLessIcon />}
            </IconButton>
          )}
        </Stack>

        {!inVoice ? (
          <Button variant="contained" color="success" onClick={handleJoin}>
            Entrar no Chat de Voz
          </Button>
        ) : (
          <Stack direction="row" spacing={2} sx={{ mb: collapsed ? 0 : 2 }}>
            <Button variant="outlined" color="error" onClick={() => {
  endMeeting();
  setInVoice(false);
}}>
  Sair
</Button>

            
          </Stack>
        )}

        {inVoice && !collapsed && (
          <List>
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
                    onClick={() =>
                      p.avatar && setLightboxSrc(p.avatar)
                    }
                    sx={{
                      width: 48,
                      height: 48,
                      border: `3px solid ${borderColor}`,
                      boxShadow,
                      bgcolor: "#2f3640",
                      cursor: p.avatar ? "pointer" : "default",
                    }}
                  >
                    {!p.avatar && p.name?.charAt(0).toUpperCase()}
                  </Avatar>

                  <Typography
                    sx={{
                      color:
                        borderColor === "transparent"
                          ? "white"
                          : borderColor,
                      fontWeight:
                        isSpeaking || isMaster ? "bold" : "normal",
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
        )}
      </Paper>

      {lightboxSrc && (
        <Box
          onClick={() => setLightboxSrc(null)}
          sx={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.85)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 9999,
          }}
        >
          <LightboxImage
            src={lightboxSrc}
            zoom={zoom}
            setZoom={setZoom}
          />
        </Box>
      )}
    </>
  );
}
// src/components/FloatingChat.jsx
import React, { useState, useEffect } from "react";
import { Box, Paper, Typography, IconButton } from "@mui/material";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import CloseIcon from "@mui/icons-material/Close";
import MinimizeIcon from "@mui/icons-material/Minimize";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import { useFloatingWindows } from "../context/FloatingWindowsContext";
import Chat from "./Chat";

const darkTheme = createTheme({
  palette: {
    mode: "dark",
  },
});

export default function FloatingChat({ userNick, userEmail }) {
  const { chatMinimized, toggleChatMinimize, chatOpen, setChatOpen, chatPos, setChatPos, toggleChat } = useFloatingWindows();
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  useEffect(() => {
    window.__toggleChat = toggleChat;
    return () => { window.__toggleChat = null; };
  }, [toggleChat]);

  if (!chatOpen) return null;

  const handleMouseDown = (e) => {
    setDragging(true);
    setDragStart({ x: e.clientX - chatPos.x, y: e.clientY - chatPos.y });
  };

  const handleMouseMove = (e) => {
    if (!dragging) return;
    setChatPos({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handleMouseUp = () => setDragging(false);

  return (
    <Box
      sx={{
        position: "fixed",
        left: chatPos.x,
        top: chatPos.y,
        zIndex: 100000,
        width: chatMinimized ? 200 : 450,
        height: chatMinimized ? 40 : 600,
        transition: "width 0.3s, height 0.3s",
        cursor: dragging ? "grabbing" : "grab",
        boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
        borderRadius: 2,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <Paper
        onMouseDown={handleMouseDown}
        sx={{
          p: 0.5,
          display: "flex",
          alignItems: "center",
          bgcolor: "#1a1a2e",
          borderRadius: chatMinimized ? 2 : "8px 8px 0 0",
          cursor: "grab",
          flexShrink: 0,
        }}
      >
        <DragIndicatorIcon sx={{ color: "#94a3b8", mr: 0.5, fontSize: 18 }} />
        <Typography variant="caption" sx={{ color: "#fff", fontWeight: "bold", flex: 1 }}>
          💬 Chat
        </Typography>
        <IconButton size="small" onClick={toggleChatMinimize} sx={{ color: "#94a3b8", p: 0.3 }}>
          <MinimizeIcon fontSize="small" />
        </IconButton>
        <IconButton size="small" onClick={() => setChatOpen(false)} sx={{ color: "#ef4444", p: 0.3 }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Paper>
      {!chatMinimized && (
        <Box sx={{ flex: 1, overflow: "hidden", borderRadius: "0 0 8px 8px" }}>
          <ThemeProvider theme={darkTheme}>
            <CssBaseline />
            <Chat userNick={userNick} userEmail={userEmail} />
          </ThemeProvider>
        </Box>
      )}
    </Box>
  );
}
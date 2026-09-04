import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Box, Paper, Typography, IconButton, TextField, Button,
  Avatar, CircularProgress,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import SendIcon from "@mui/icons-material/Send";
import ImageIcon from "@mui/icons-material/Image";

const API_BASE = window.location.hostname === "localhost" 
  ? "http://localhost:5000" 
  : "https://reqviem.onrender.com";

function IAChat({ onClose, userNick }) {
  const [posicao, setPosicao] = useState({ x: 200, y: 100 });
  const [tamanho, setTamanho] = useState({ width: 400, height: 550 });
  const [arrastando, setArrastando] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const [mensagens, setMensagens] = useState([
    { de: "ia", texto: `Olá! Eu sou o assistente do Réquiem RPG. Posso te ajudar com histórias, personagens, itens e muito mais! Pergunte qualquer coisa ou peça para eu criar uma imagem!` }
  ]);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [modoImagem, setModoImagem] = useState(false);
  const chatEndRef = useRef(null);
  const [minimizado, setMinimizado] = useState(false);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagens]);

  const enviarMensagem = async () => {
    if (!texto.trim() || enviando) return;
    
    const mensagemUsuario = texto.trim();
    setMensagens(prev => [...prev, { de: "jogador", texto: mensagemUsuario }]);
    setTexto("");
    setEnviando(true);
    
    try {
      if (modoImagem) {
        // Gera imagem
        const res = await fetch(`${API_BASE}/api/ia-imagem?prompt=${encodeURIComponent(mensagemUsuario)}`);
        const data = await res.json();
        setMensagens(prev => [...prev, { de: "ia", texto: "Aqui está sua imagem:", imagem: data.url }]);
      } else {
        // Gera texto
        const res = await fetch(`${API_BASE}/api/ia-texto`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mensagem: mensagemUsuario }),
        });
        const data = await res.json();
        setMensagens(prev => [...prev, { de: "ia", texto: data.resposta }]);
      }
    } catch (error) {
      setMensagens(prev => [...prev, { de: "ia", texto: "Erro ao conectar com a IA. Tente novamente." }]);
    } finally {
      setEnviando(false);
    }
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (arrastando) setPosicao({ x: e.clientX - dragStartRef.current.x, y: e.clientY - dragStartRef.current.y });
    };
    const handleMouseUp = () => setArrastando(false);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [arrastando]);

  return createPortal(
    <Paper elevation={10} sx={{
      position: "fixed", left: posicao.x, top: posicao.y,
      width: minimizado ? 280 : tamanho.width,
      height: minimizado ? 48 : tamanho.height,
      bgcolor: "#0f172a", color: "#fff", borderRadius: 2,
      border: "2px solid #a855f7", zIndex: 9998,
      display: "flex", flexDirection: "column", overflow: "hidden",
      boxShadow: "0 0 30px rgba(168,85,247,0.3)",
    }}>
      {/* BARRA DE TÍTULO */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", p: 1, bgcolor: "#1a1a2e", cursor: "move", minHeight: 40, borderBottom: "1px solid #a855f755" }}
        onMouseDown={(e) => { if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT') return; e.preventDefault(); setArrastando(true); dragStartRef.current = { x: e.clientX - posicao.x, y: e.clientY - posicao.y }; }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <span style={{ fontSize: '1.3rem' }}>🤖</span>
          <Typography variant="subtitle2" sx={{ color: "#a855f7", fontWeight: "bold" }}>
            {minimizado ? "IA Réquiem" : "🤖 IA Réquiem"}
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 0.5 }}>
          <Button
            size="small"
            variant={modoImagem ? "contained" : "outlined"}
            onClick={() => setModoImagem(!modoImagem)}
            sx={{ 
              color: modoImagem ? '#fff' : '#a855f7', 
              bgcolor: modoImagem ? '#a855f7' : 'transparent',
              borderColor: '#a855f7',
              fontSize: '0.6rem',
              minWidth: 'auto',
              px: 1,
              py: 0.3,
            }}
          >
            {modoImagem ? "🎨 Imagem" : "💬 Texto"}
          </Button>
          <IconButton size="small" onClick={() => setMinimizado(!minimizado)} sx={{ color: "#a855f7", p: 0.5 }}>{minimizado ? "□" : "−"}</IconButton>
          <IconButton size="small" onClick={onClose} sx={{ color: "#ef4444", p: 0.5 }}><CloseIcon fontSize="small" /></IconButton>
        </Box>
      </Box>

      {!minimizado && (
        <>
          {/* MENSAGENS */}
          <Box sx={{ flex: 1, overflowY: "auto", p: 1.5, display: "flex", flexDirection: "column", gap: 0.5, bgcolor: "#0a0f1a" }}>
            {mensagens.map((msg, i) => (
              <Box key={i} sx={{ display: "flex", justifyContent: msg.de === "jogador" ? "flex-end" : "flex-start" }}>
                <Paper sx={{
                  p: 1,
                  maxWidth: "80%",
                  bgcolor: msg.de === "jogador" ? "#1e3a5f" : "#1a1a2e",
                  border: msg.de === "jogador" ? "1px solid #00e0ff44" : "1px solid #a855f744",
                  borderRadius: msg.de === "jogador" ? "12px 12px 4px 12px" : "12px 12px 12px 4px",
                }}>
                  <Typography variant="caption" sx={{ color: msg.de === "jogador" ? "#00e0ff" : "#a855f7", fontWeight: "bold", display: "block", mb: 0.3 }}>
                    {msg.de === "jogador" ? userNick || "Você" : "🤖 IA Réquiem"}
                  </Typography>
                  {msg.imagem ? (
                    <img src={msg.imagem} alt="Gerada" style={{ maxWidth: 200, maxHeight: 200, borderRadius: 8 }} />
                  ) : (
                    <Typography sx={{ color: '#fff', fontSize: '0.8rem', whiteSpace: 'pre-line' }}>{msg.texto}</Typography>
                  )}
                </Paper>
              </Box>
            ))}
            {enviando && (
              <Box sx={{ display: "flex", justifyContent: "flex-start" }}>
                <Paper sx={{ p: 1, bgcolor: "#1a1a2e", border: "1px solid #a855f744", borderRadius: "12px 12px 12px 4px" }}>
                  <CircularProgress size={16} sx={{ color: '#a855f7' }} />
                </Paper>
              </Box>
            )}
            <div ref={chatEndRef} />
          </Box>

          {/* ÁREA DE ENVIO */}
          <Box sx={{ p: 1, borderTop: "1px solid #a855f733", bgcolor: "#1a1a2e" }}>
            <Box sx={{ display: "flex", gap: 0.5 }}>
              <TextField
                size="small"
                fullWidth
                placeholder={modoImagem ? "Descreva a imagem que você quer..." : "Pergunte algo..."}
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviarMensagem(); } }}
                InputProps={{ sx: { color: '#fff', fontSize: '0.8rem' } }}
              />
              <IconButton size="small" onClick={enviarMensagem} disabled={enviando} sx={{ color: '#a855f7' }}>
                <SendIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>
        </>
      )}
    </Paper>,
    document.body
  );
}

export default React.memo(IAChat);
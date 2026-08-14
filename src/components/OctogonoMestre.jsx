// src/components/OctogonoMestre.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { Box, Paper, Typography, IconButton, Button, TextField, Slider, Avatar } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import EditIcon from "@mui/icons-material/Edit";
import { db } from "../firebaseConfig";
import { doc, setDoc, onSnapshot, collection, getDocs } from "firebase/firestore";

const ASPECTOS = [
  { id: "recursos", label: "Recursos Externos", cor: "#ef4444" },
  { id: "narracao", label: "Narração e Descrição", cor: "#f97316" },
  { id: "preparacao", label: "Preparação e Dedicação", cor: "#fbbf24" },
  { id: "ritmo", label: "Gestão de Ritmo", cor: "#4caf50" },
  { id: "personagens", label: "Criação de Personagens", cor: "#2196f3" },
  { id: "mundo", label: "Construção de Mundo", cor: "#a855f7" },
  { id: "atuacao", label: "Atuação e Improvisação", cor: "#ec4899" },
  { id: "geral", label: "Avaliação Geral", cor: "#00e0ff" },
];

function OctogonoMestre({ isMaster, userEmail, userNick, onClose }) {
  const [posicao, setPosicao] = useState({ x: 350, y: 100 });
  const [tamanho, setTamanho] = useState({ width: 600, height: 550 });
  const [minimizado, setMinimizado] = useState(false);
  const [arrastando, setArrastando] = useState(false);
  const [redimensionando, setRedimensionando] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const resizeStartRef = useRef({ x: 0, y: 0, width: 0, height: 0 });
  const [notas, setNotas] = useState({ recursos: 0, narracao: 0, preparacao: 0, ritmo: 0, personagens: 0, mundo: 0, atuacao: 0, geral: 0 });
  const [nomeMestre, setNomeMestre] = useState("");
  const [todasAvaliacoes, setTodasAvaliacoes] = useState([]);
  const [vendoAvaliacoes, setVendoAvaliacoes] = useState(false);
  const canvasRef = useRef(null);

  useEffect(() => {
    const ref = doc(db, "octogono_mestre", "avaliacoes");
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) setTodasAvaliacoes(snap.data().lista || []);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (arrastando) setPosicao({ x: e.clientX - dragStartRef.current.x, y: e.clientY - dragStartRef.current.y });
      if (redimensionando) setTamanho({ width: Math.max(500, resizeStartRef.current.width + (e.clientX - resizeStartRef.current.x)), height: Math.max(450, resizeStartRef.current.height + (e.clientY - resizeStartRef.current.y)) });
    };
    const handleMouseUp = () => { setArrastando(false); setRedimensionando(false); };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => { window.removeEventListener("mousemove", handleMouseMove); window.removeEventListener("mouseup", handleMouseUp); };
  }, [arrastando, redimensionando]);

  const desenharOctogono = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const raioMax = Math.min(cx, cy) - 30;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, w, h);
    for (let nivel = 1; nivel <= 5; nivel++) {
      const r = (raioMax / 5) * nivel;
      ctx.beginPath();
      for (let i = 0; i <= 8; i++) { const ang = (Math.PI * 2 * i) / 8 - Math.PI / 2; const x = cx + r * Math.cos(ang); const y = cy + r * Math.sin(ang); i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
      ctx.closePath(); ctx.strokeStyle = "rgba(255,255,255,0.1)"; ctx.lineWidth = 1; ctx.stroke();
    }
    for (let i = 0; i < 8; i++) {
      const ang = (Math.PI * 2 * i) / 8 - Math.PI / 2;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + raioMax * Math.cos(ang), cy + raioMax * Math.sin(ang));
      ctx.strokeStyle = "rgba(255,255,255,0.15)"; ctx.lineWidth = 1; ctx.stroke();
    }
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const valor = notas[ASPECTOS[i].id] || 0;
      const r = (raioMax / 5) * valor;
      const ang = (Math.PI * 2 * i) / 8 - Math.PI / 2;
      const x = cx + r * Math.cos(ang); const y = cy + r * Math.sin(ang);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath(); ctx.fillStyle = "rgba(168, 85, 247, 0.3)"; ctx.fill(); ctx.strokeStyle = "#a855f7"; ctx.lineWidth = 2; ctx.stroke();
    for (let i = 0; i < 8; i++) {
      const valor = notas[ASPECTOS[i].id] || 0;
      const r = (raioMax / 5) * valor;
      const ang = (Math.PI * 2 * i) / 8 - Math.PI / 2;
      const x = cx + r * Math.cos(ang); const y = cy + r * Math.sin(ang);
      ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fillStyle = "#a855f7"; ctx.fill();
      ctx.fillStyle = "#fff"; ctx.font = "10px sans-serif"; ctx.textAlign = "center";
      const labelX = cx + (raioMax + 25) * Math.cos(ang); const labelY = cy + (raioMax + 25) * Math.sin(ang) + 4;
      ctx.fillText(ASPECTOS[i].label, labelX, labelY);
    }
  }, [notas]);

  useEffect(() => { desenharOctogono(); }, [desenharOctogono, vendoAvaliacoes]);

  const salvarAvaliacao = async () => {
    const chave = nomeMestre.trim() || "sem_nome";
    const novaLista = todasAvaliacoes.filter(a => !(a.jogador === userEmail && a.chave === chave));
    novaLista.push({ jogador: userEmail, jogadorNome: userNick, chave, notas: { ...notas }, data: new Date().toISOString() });
    await setDoc(doc(db, "octogono_mestre", "avaliacoes"), { lista: novaLista });
    alert("Avaliação salva!");
  };

  const avaliacoesFiltradas = todasAvaliacoes.filter(a => isMaster || a.jogador === userEmail);

  return createPortal(
    <Paper elevation={10} sx={{ position: "fixed", left: posicao.x, top: posicao.y, width: minimizado ? 300 : tamanho.width, height: minimizado ? 48 : tamanho.height, bgcolor: "#0f172a", color: "#fff", borderRadius: 2, border: "2px solid #a855f7", zIndex: 9998, display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.8)" }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", p: 1, bgcolor: "#a855f7", cursor: "move", minHeight: 40 }}
        onMouseDown={(e) => { if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT') return; e.preventDefault(); setArrastando(true); dragStartRef.current = { x: e.clientX - posicao.x, y: e.clientY - posicao.y }; }}>
        <Typography variant="subtitle2" sx={{ color: "#fff", fontWeight: "bold" }}>📊 {minimizado ? "Avaliar Mestre" : "Octógono do Mestre"}</Typography>
        <Box sx={{ display: "flex", gap: 0.5 }}>
          {isMaster && <Button size="small" variant="outlined" onClick={() => setVendoAvaliacoes(!vendoAvaliacoes)} sx={{ color: "#fff", borderColor: "#fff", fontSize: "0.65rem", mr: 1 }}>{vendoAvaliacoes ? "Voltar" : "Ver Todas"}</Button>}
          <IconButton size="small" onClick={() => setMinimizado(!minimizado)} sx={{ color: "#fff", p: 0.5 }}>{minimizado ? "□" : "−"}</IconButton>
          <IconButton size="small" onClick={onClose} sx={{ color: "#fff", p: 0.5 }}><CloseIcon fontSize="small" /></IconButton>
        </Box>
      </Box>
      {!minimizado && (
        <Box sx={{ flex: 1, display: "flex", flexDirection: "column", p: 1.5, gap: 1, overflowY: "auto" }}>
          {isMaster && vendoAvaliacoes ? (
            <Box>
              <Typography variant="subtitle2" sx={{ color: "#a855f7", mb: 1 }}>📋 Todas as Avaliações</Typography>
              {avaliacoesFiltradas.map((av, idx) => (
                <Paper key={idx} sx={{ p: 1, mb: 0.5, bgcolor: "#1a1a2e", border: "1px solid #334155" }}>
                  <Typography variant="caption" sx={{ color: "#fff", fontWeight: "bold" }}>{av.jogadorNome} → Mestre: {av.chave}</Typography>
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 0.5 }}>
                    {ASPECTOS.map(a => <Typography key={a.id} variant="caption" sx={{ color: a.cor }}>{a.label}: {av.notas[a.id]}/5</Typography>)}
                  </Box>
                </Paper>
              ))}
              {avaliacoesFiltradas.length === 0 && <Typography sx={{ color: "#64748b" }}>Nenhuma avaliação.</Typography>}
            </Box>
          ) : (
            <>
              <TextField size="small" placeholder="Nome do Mestre (ex: João)" value={nomeMestre} onChange={(e) => setNomeMestre(e.target.value)}
                InputProps={{ style: { color: '#fff' } }} sx={{ '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: '#334155' } } }} />
              <canvas ref={canvasRef} width={400} height={400} style={{ maxWidth: "100%" }} />
              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                {ASPECTOS.map(a => (
                  <Box key={a.id} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Typography variant="caption" sx={{ color: a.cor, minWidth: 160, fontSize: "0.7rem" }}>{a.label}</Typography>
                    <Slider value={notas[a.id]} min={0} max={5} step={1} onChange={(_, v) => setNotas(prev => ({ ...prev, [a.id]: v }))} sx={{ flex: 1, color: a.cor, '& .MuiSlider-thumb': { width: 14, height: 14 } }} />
                    <Typography variant="caption" sx={{ color: "#fff", minWidth: 20, textAlign: "right" }}>{notas[a.id]}/5</Typography>
                  </Box>
                ))}
              </Box>
              <Button variant="contained" fullWidth onClick={salvarAvaliacao} sx={{ bgcolor: '#a855f7', color: '#fff', fontWeight: 'bold', '&:hover': { bgcolor: '#9333ea' } }}>💾 Salvar Avaliação</Button>
            </>
          )}
        </Box>
      )}
      {!minimizado && <Box sx={{ position: "absolute", bottom: 0, right: 0, width: 16, height: 16, cursor: "nwse-resize", zIndex: 10 }}
        onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setRedimensionando(true); resizeStartRef.current = { x: e.clientX, y: e.clientY, width: tamanho.width, height: tamanho.height }; }} />}
    </Paper>, document.body
  );
}

export default React.memo(OctogonoMestre);
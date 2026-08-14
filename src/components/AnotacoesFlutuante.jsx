// src/components/AnotacoesFlutuante.jsx
import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Box, Paper, Typography, IconButton, Button, TextField } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import AddIcon from "@mui/icons-material/Add";
import SaveIcon from "@mui/icons-material/Save";
import DeleteIcon from "@mui/icons-material/Delete";
import ImageIcon from "@mui/icons-material/Image";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { db } from "../firebaseConfig";
import { doc, setDoc, onSnapshot } from "firebase/firestore";

const IMGBB_API_KEY = "73fcf242ce0108665fa0c9e9de33bd50";

function AnotacoesFlutuante({ userEmail, userNick, onClose }) {
  const [posicao, setPosicao] = useState({ x: 200, y: 100 });
  const [tamanho, setTamanho] = useState({ width: 650, height: 550 });
  const [minimizado, setMinimizado] = useState(false);
  const [arrastando, setArrastando] = useState(false);
  const [redimensionando, setRedimensionando] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const resizeStartRef = useRef({ x: 0, y: 0, width: 0, height: 0 });
  const [capitulos, setCapitulos] = useState([]);
  const [editandoIndex, setEditandoIndex] = useState(null);
  const [titulo, setTitulo] = useState("");
  const [texto, setTexto] = useState("");
  const [lightboxImage, setLightboxImage] = useState(null);
  const [zoom, setZoom] = useState(1);
  const textAreaRef = useRef(null);

  useEffect(() => {
    if (!userEmail) return;
    const ref = doc(db, "anotacoes_sidebar", userEmail);
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        const dados = snap.data();
        if (dados.capitulos && Array.isArray(dados.capitulos)) {
          setCapitulos(dados.capitulos);
        } else if (dados.texto) {
          setCapitulos([{ titulo: "Anotação 1", texto: dados.texto }]);
        }
      } else {
        setCapitulos([]);
      }
    });
    return () => unsub();
  }, [userEmail]);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (arrastando) setPosicao({ x: e.clientX - dragStartRef.current.x, y: e.clientY - dragStartRef.current.y });
      if (redimensionando) setTamanho({ width: Math.max(500, resizeStartRef.current.width + (e.clientX - resizeStartRef.current.x)), height: Math.max(350, resizeStartRef.current.height + (e.clientY - resizeStartRef.current.y)) });
    };
    const handleMouseUp = () => { setArrastando(false); setRedimensionando(false); };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => { window.removeEventListener("mousemove", handleMouseMove); window.removeEventListener("mouseup", handleMouseUp); };
  }, [arrastando, redimensionando]);

  const salvar = async (novosCapitulos) => {
    await setDoc(doc(db, "anotacoes_sidebar", userEmail), { capitulos: novosCapitulos, atualizadoEm: new Date().toISOString() }, { merge: true });
  };

  const novoCapitulo = () => {
    setEditandoIndex(null);
    setTitulo("");
    setTexto("");
  };

  const salvarCapitulo = async () => {
    let novos;
    if (editandoIndex !== null) {
      novos = [...capitulos];
      novos[editandoIndex] = { titulo: titulo || `Capítulo ${editandoIndex + 1}`, texto };
    } else {
      novos = [...capitulos, { titulo: titulo || `Capítulo ${capitulos.length + 1}`, texto }];
    }
    setCapitulos(novos);
    await salvar(novos);
    setEditandoIndex(null);
    setTitulo("");
    setTexto("");
  };

  const deletarCapitulo = async (idx) => {
    const novos = capitulos.filter((_, i) => i !== idx);
    setCapitulos(novos);
    await salvar(novos);
    if (editandoIndex === idx) { setEditandoIndex(null); setTitulo(""); setTexto(""); }
  };

  const handleUploadImagem = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("image", file);
    try {
      const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: "POST", body: fd });
      const data = await res.json();
      if (data?.success) {
        const url = data.data.url;
        const imagemMarkdown = `\n![Imagem](${url})\n`;
        setTexto(prev => prev + imagemMarkdown);
      }
    } catch (err) { alert("Erro ao enviar imagem"); }
  };

  return createPortal(
    <Paper elevation={10} sx={{ position: "fixed", left: posicao.x, top: posicao.y, width: minimizado ? 300 : tamanho.width, height: minimizado ? 48 : tamanho.height, bgcolor: "#0f172a", color: "#fff", borderRadius: 2, border: "2px solid #fbbf24", zIndex: 9998, display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.8)" }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", p: 1, bgcolor: "#fbbf24", cursor: "move", minHeight: 40 }}
        onMouseDown={(e) => { if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return; e.preventDefault(); setArrastando(true); dragStartRef.current = { x: e.clientX - posicao.x, y: e.clientY - posicao.y }; }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <span>📝</span>
          <Typography variant="subtitle2" sx={{ color: "#000", fontWeight: "bold" }}>{minimizado ? "Anotações" : `Anotações - ${userNick || "Mestre"}`}</Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 0.5 }}>
          <IconButton size="small" onClick={() => setMinimizado(!minimizado)} sx={{ color: "#000", p: 0.5 }}>{minimizado ? "□" : "−"}</IconButton>
          <IconButton size="small" onClick={onClose} sx={{ color: "#000", p: 0.5 }}><CloseIcon fontSize="small" /></IconButton>
        </Box>
      </Box>
      {!minimizado && (
        <Box sx={{ flex: 1, display: "flex", gap: 1, p: 1.5, overflow: "hidden" }}>
          {/* Lista de capítulos (igual à ficha) */}
          <Box sx={{ width: 200, borderRight: "1px solid #fbbf2433", pr: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 0.5 }}>
            <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={novoCapitulo} sx={{ bgcolor: '#fbbf24', color: '#000', fontSize: '0.7rem', mb: 1 }}>Novo</Button>
            {capitulos.map((cap, idx) => (
              <Paper key={idx} sx={{ p: 1, bgcolor: editandoIndex === idx ? '#1e3a5f' : '#1a1a2e', cursor: 'pointer', border: editandoIndex === idx ? '1px solid #fbbf24' : '1px solid #334155' }}
                onClick={() => { setEditandoIndex(idx); setTitulo(cap.titulo); setTexto(cap.texto); }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Typography variant="caption" sx={{ color: "#fff", fontWeight: "bold" }}>{cap.titulo}</Typography>
                  <IconButton size="small" onClick={(e) => { e.stopPropagation(); deletarCapitulo(idx); }} sx={{ color: '#ef4444', p: 0.3 }}><DeleteIcon sx={{ fontSize: 12 }} /></IconButton>
                </Box>
                <Typography variant="caption" sx={{ color: "#64748b", display: "block", maxHeight: 25, overflow: "hidden", fontSize: "0.6rem" }}>{cap.texto?.substring(0, 40)}...</Typography>
              </Paper>
            ))}
          </Box>
          {/* Editor */}
          <Box sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 1 }}>
            <TextField size="small" placeholder="Título" value={titulo} onChange={(e) => setTitulo(e.target.value)}
              InputProps={{ style: { color: '#fff', fontSize: '0.85rem' } }} sx={{ '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: '#334155' } } }} />
            <Box sx={{ display: "flex", gap: 0.5 }}>
              <Button size="small" component="label" startIcon={<ImageIcon sx={{ fontSize: 14 }} />} sx={{ color: '#94a3b8', fontSize: '0.65rem' }}>
                Imagem
                <input type="file" accept="image/*" hidden onChange={handleUploadImagem} />
              </Button>
              <Button size="small" variant="contained" startIcon={<SaveIcon sx={{ fontSize: 14 }} />} onClick={salvarCapitulo} sx={{ bgcolor: '#fbbf24', color: '#000', fontSize: '0.65rem' }}>Salvar</Button>
            </Box>
            <TextField multiline minRows={12} maxRows={30} value={texto} onChange={(e) => setTexto(e.target.value)}
              placeholder="Conteúdo (Markdown)..."
              InputProps={{ style: { color: '#fff', fontSize: '0.8rem', fontFamily: 'monospace' } }}
              sx={{ flex: 1, '& .MuiOutlinedInput-root': { height: '100%', alignItems: 'flex-start', '& fieldset': { borderColor: '#334155' }, '&:hover fieldset': { borderColor: '#fbbf24' }, '&.Mui-focused fieldset': { borderColor: '#fbbf24' } } }} />
            {texto && (
              <Box sx={{ p: 1, bgcolor: '#1a1a2e', borderRadius: 1, maxHeight: 120, overflowY: 'auto', border: '1px solid #334155' }}
                onClick={(e) => { if (e.target.tagName === 'IMG') { setLightboxImage(e.target.src); setZoom(1); } }}>
                <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mb: 0.5 }}>📄 Preview:</Typography>
                <Box sx={{ color: '#fff', '& img': { maxWidth: '100%', borderRadius: 1, cursor: 'pointer' } }}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{texto}</ReactMarkdown>
                </Box>
              </Box>
            )}
          </Box>
        </Box>
      )}
      {!minimizado && <Box sx={{ position: "absolute", bottom: 0, right: 0, width: 16, height: 16, cursor: "nwse-resize", zIndex: 10 }}
        onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setRedimensionando(true); resizeStartRef.current = { x: e.clientX, y: e.clientY, width: tamanho.width, height: tamanho.height }; }} />}
      {lightboxImage && (
        <Box onClick={() => setLightboxImage(null)} sx={{ position: "fixed", inset: 0, bgcolor: "rgba(0,0,0,0.92)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999999 }}>
          <img src={lightboxImage} alt="ampliada" style={{ maxWidth: "90%", maxHeight: "90%", borderRadius: 10, cursor: "zoom-out" }} />
        </Box>
      )}
    </Paper>, document.body
  );
}

export default React.memo(AnotacoesFlutuante);
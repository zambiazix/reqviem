// src/components/Home.jsx
import React, { memo, useEffect, useState, useRef, useCallback, useMemo } from "react";
import { ThemeProvider, CssBaseline, Box, Grid, Paper, Button, Typography, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, TextField } from "@mui/material";
import LogoutIcon from "@mui/icons-material/Logout";
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import { Link } from "react-router-dom";
import HomePage from "../pages/HomePage";
import SoundBoard from "./SoundBoard";
import AgendadorSessoes from "./AgendadorSessoes";
import SimuladorEngine from "./SimuladorEngine";
import FichaPersonagem from "./FichaPersonagem";
import MemoizedChat from "./Chat";
import LoginForm from "./LoginForm";
import { db } from "../firebaseConfig";
import { doc, setDoc, onSnapshot } from "firebase/firestore";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// 🟢 COMPONENTE DA GALERIA FLUTUANTE
const GaleriaFlutuante = memo(function GaleriaFlutuante({ 
  isMaster, onClose, setLightboxSrc, setZoom, setLightboxOpen 
}) {
  const [imagens, setImagens] = useState([]);
  const [minimizado, setMinimizado] = useState(false);
  const [posicao, setPosicao] = useState({ x: window.innerWidth > 800 ? window.innerWidth - 650 : 20, y: 100 });
  const [tamanho, setTamanho] = useState({ width: 600, height: 500 });
  const [arrastando, setArrastando] = useState(false);
  const [redimensionando, setRedimensionando] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const resizeStartRef = useRef({ x: 0, y: 0, width: 0, height: 0 });
  
  const [uploading, setUploading] = useState(false);
  const [editandoTitulo, setEditandoTitulo] = useState(null); // { id, titulo }
  const [dragOverIndex, setDragOverIndex] = useState(null);

  // Firebase Sync
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "game", "galeria_global"), (snap) => {
      if (snap.exists()) setImagens(snap.data().imagens || []);
      else setImagens([]);
    });
    return () => unsub();
  }, []);

  // Handle Drag & Resize Window
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (arrastando) {
        setPosicao({ x: e.clientX - dragStartRef.current.x, y: e.clientY - dragStartRef.current.y });
      }
      if (redimensionando) {
        const newWidth = Math.max(400, resizeStartRef.current.width + (e.clientX - resizeStartRef.current.x));
        const newHeight = Math.max(300, resizeStartRef.current.height + (e.clientY - resizeStartRef.current.y));
        setTamanho({ width: newWidth, height: newHeight });
      }
    };
    const handleMouseUp = () => { setArrastando(false); setRedimensionando(false); };

    if (arrastando || redimensionando) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [arrastando, redimensionando]);

  // Upload ImgBB Full Quality
  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    
    const fd = new FormData();
    fd.append("image", file);
    
    try {
      const res = await fetch(`https://api.imgbb.com/1/upload?key=73fcf242ce0108665fa0c9e9de33bd50`, { method: "POST", body: fd });
      const data = await res.json();
      if (data.success) {
        const novaImagem = {
          id: Date.now().toString(),
          url: data.data.url,
          titulo: file.name.split('.').slice(0, -1).join('.') || "Nova Imagem",
          data: new Date().toLocaleDateString('pt-BR')
        };
        const novasImagens = [...imagens, novaImagem];
        setImagens(novasImagens);
        await setDoc(doc(db, "game", "galeria_global"), { imagens: novasImagens }, { merge: true });
      } else {
        alert("Erro no upload: " + (data.error?.message || "Desconhecido"));
      }
    } catch (err) {
      alert("Erro ao enviar a imagem.");
    } finally {
      setUploading(false);
    }
  };

  // Delete Image
  const handleDelete = async (id) => {
    if (!window.confirm("Apagar esta imagem permanentemente?")) return;
    const novas = imagens.filter(img => img.id !== id);
    setImagens(novas);
    await setDoc(doc(db, "game", "galeria_global"), { imagens: novas }, { merge: true });
  };

  // Save Title Edit
  const salvarTitulo = async () => {
    if (!editandoTitulo) return;
    const novas = imagens.map(img => img.id === editandoTitulo.id ? { ...img, titulo: editandoTitulo.titulo } : img);
    setImagens(novas);
    await setDoc(doc(db, "game", "galeria_global"), { imagens: novas }, { merge: true });
    setEditandoTitulo(null);
  };

  // Reorder (Drag & Drop)
  const handleDrop = async (e, toIndex) => {
    e.preventDefault();
    setDragOverIndex(null);
    const fromIndex = parseInt(e.dataTransfer.getData("dragIndex"), 10);
    if (isNaN(fromIndex) || fromIndex === toIndex) return;
    
    const novasImagens = [...imagens];
    const [movida] = novasImagens.splice(fromIndex, 1);
    novasImagens.splice(toIndex, 0, movida);
    
    setImagens(novasImagens);
    await setDoc(doc(db, "game", "galeria_global"), { imagens: novasImagens }, { merge: true });
  };

  return (
    <Box
      sx={{
        position: "fixed",
        left: posicao.x,
        top: posicao.y,
        width: minimizado ? 300 : tamanho.width,
        height: minimizado ? 50 : tamanho.height,
        bgcolor: "#0f172a",
        border: "2px solid #00e0ff",
        borderRadius: 3,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        boxShadow: "0 10px 40px rgba(0,0,0,0.9), 0 0 20px rgba(0,224,255,0.2)",
        transition: arrastando || redimensionando ? "none" : "width 0.2s, height 0.2s",
      }}
    >
      {/* HEADER */}
      <Box
        sx={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          p: 1.5, bgcolor: "#00e0ff", cursor: "move", minHeight: 48,
        }}
        onMouseDown={(e) => {
          if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT') return;
          e.preventDefault();
          setArrastando(true);
          dragStartRef.current = { x: e.clientX - posicao.x, y: e.clientY - posicao.y };
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <span style={{ fontSize: '1.2rem' }}>📸</span>
          <Typography variant="subtitle2" sx={{ color: "#000", fontWeight: "bold" }}>
            {minimizado ? `Galeria (${imagens.length})` : "Galeria de Imagens"}
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 0.5 }}>
          {isMaster && !minimizado && (
            <Button
              component="label"
              size="small"
              disabled={uploading}
              sx={{ color: "#000", fontWeight: "bold", minWidth: "auto", p: 0.5, px: 1, bgcolor: 'rgba(0,0,0,0.1)', '&:hover': { bgcolor: 'rgba(0,0,0,0.2)' } }}
            >
              {uploading ? "⏳" : "➕ Upload"}
              <input type="file" accept="image/*" hidden onChange={handleUpload} />
            </Button>
          )}
          <IconButton size="small" onClick={() => setMinimizado(!minimizado)} sx={{ color: "#000", p: 0.5 }}>
            {minimizado ? "□" : "−"}
          </IconButton>
          <IconButton size="small" onClick={onClose} sx={{ color: "#000", p: 0.5 }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      {/* CONTENT */}
      {!minimizado && (
        <Box sx={{ flex: 1, overflowY: "auto", p: 2, display: 'flex', flexWrap: 'wrap', gap: 2, alignContent: 'flex-start' }}>
          {imagens.length === 0 && (
            <Typography sx={{ color: '#94a3b8', width: '100%', textAlign: 'center', mt: 4 }}>
              Nenhuma imagem na galeria.
            </Typography>
          )}
          
          {imagens.map((img, index) => (
            <Box
              key={img.id}
              draggable={isMaster}
              onDragStart={(e) => {
                if (!isMaster) return;
                e.dataTransfer.setData("dragIndex", index);
              }}
              onDragOver={(e) => {
                if (!isMaster) return;
                e.preventDefault();
                setDragOverIndex(index);
              }}
              onDragLeave={() => setDragOverIndex(null)}
              onDrop={(e) => isMaster && handleDrop(e, index)}
              sx={{
                width: 'calc(50% - 8px)',
                bgcolor: '#1a1a2e',
                borderRadius: 2,
                border: dragOverIndex === index ? '2px dashed #00e0ff' : '1px solid #334155',
                overflow: 'hidden',
                transition: 'all 0.2s',
                cursor: isMaster ? 'grab' : 'default',
                '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 4px 12px rgba(0,224,255,0.15)', borderColor: '#00e0ff88' },
                '&:active': { cursor: 'grabbing' }
              }}
            >
              {/* Image Container */}
              <Box sx={{ position: 'relative', width: '100%', height: 120, bgcolor: '#000' }}>
                <img 
                  src={img.url} 
                  alt={img.titulo} 
                  style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }} 
                  onClick={() => { setLightboxSrc(img.url); setZoom(1); setLightboxOpen(true); }}
                  loading="lazy"
                />
                {isMaster && (
                  <IconButton
                    size="small"
                    onClick={() => handleDelete(img.id)}
                    sx={{ position: 'absolute', top: 4, right: 4, bgcolor: 'rgba(0,0,0,0.7)', color: '#ef4444', '&:hover': { bgcolor: 'rgba(239,68,68,0.8)', color: '#fff' } }}
                  >
                    <DeleteIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                )}
              </Box>

              {/* Info Container */}
              <Box sx={{ p: 1 }}>
                {editandoTitulo?.id === img.id ? (
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <TextField
                      size="small"
                      value={editandoTitulo.titulo}
                      onChange={(e) => setEditandoTitulo(prev => ({ ...prev, titulo: e.target.value }))}
                      onKeyDown={(e) => e.key === 'Enter' && salvarTitulo()}
                      autoFocus
                      InputProps={{ style: { color: '#fff', fontSize: '0.75rem' } }}
                      sx={{ flex: 1, '& .MuiInputBase-root': { height: 26 } }}
                    />
                    <IconButton size="small" onClick={salvarTitulo} sx={{ color: '#4caf50', p: 0.5 }}>
                      ✔️
                    </IconButton>
                  </Box>
                ) : (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography sx={{ color: '#fff', fontSize: '0.75rem', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {img.titulo}
                    </Typography>
                    {isMaster && (
                      <IconButton size="small" onClick={() => setEditandoTitulo(img)} sx={{ color: '#94a3b8', p: 0.5 }}>
                        <EditIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                    )}
                  </Box>
                )}
                <Typography sx={{ color: '#64748b', fontSize: '0.6rem', mt: 0.5 }}>
                  📅 {img.data}
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>
      )}

      {/* Resize Handle */}
      {!minimizado && (
        <Box
          sx={{ position: "absolute", bottom: 0, right: 0, width: 16, height: 16, cursor: "nwse-resize", zIndex: 10 }}
          onMouseDown={(e) => {
            e.preventDefault(); e.stopPropagation();
            setRedimensionando(true);
            resizeStartRef.current = { x: e.clientX, y: e.clientY, width: tamanho.width, height: tamanho.height };
          }}
        />
      )}
    </Box>
  );
});

// 🟢 LIGHTBOX OTIMIZADO COM MEMO
const LightboxImage = memo(({ src, zoom, setZoom }) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [start, setStart] = useState({ x: 0, y: 0 });

  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    setDragging(true);
    setStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  }, [position]);

  useEffect(() => {
    if (!dragging) return;
    
    const handleMouseMove = (e) => {
      setPosition({ x: e.clientX - start.x, y: e.clientY - start.y });
    };
    const handleMouseUp = () => setDragging(false);
    
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragging, start]);

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom((z) => Math.min(Math.max(z + delta, 0.5), 5));
  }, [setZoom]);

  return (
    <img
      src={src}
      alt="ampliada"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={handleMouseDown}
      onWheel={handleWheel}
      loading="eager"
      decoding="async"
      draggable={false}
      style={{
        transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
        transition: dragging ? "none" : "transform 0.2s ease",
        maxWidth: "90%",
        maxHeight: "90%",
        borderRadius: 10,
        cursor: dragging ? "grabbing" : "grab",
        userSelect: "none",
        touchAction: "none",
        pointerEvents: dragging ? "none" : "auto",
      }}
    />
  );
});

// 🟢 COMPONENTE DO CABEÇALHO MEMOIZADO
const HeaderSection = memo(({ 
  userEmail, userNick, isMaster, fichaNome, displayName,
  handleLogout, setModalChangelogOpen, setModalTutorialOpen,
  setLightboxSrc, setZoom, setLightboxOpen, fichaAtual
}) => (
  <Paper
    sx={{
      p: 2,
      flexShrink: 0,
      position: "relative",
      backgroundImage: 'url("/background.jpg")',
      backgroundSize: "cover",
      backgroundPosition: "center",
      borderRadius: 2,
      overflow: "hidden",
      contentVisibility: 'auto',
      containIntrinsicSize: 'auto 200px',
      "&::before": {
        content: '""',
        position: "absolute",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.55)",
        zIndex: 0,
      },
    }}
  >
    <Box sx={{ position: "relative", zIndex: 1 }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Box 
            onClick={() => {
              setLightboxSrc("/logo.png");
              setZoom(1);
              setLightboxOpen(true);
            }}
            sx={{ cursor: 'pointer' }}
          >
            <img 
              src="/logo.png" 
              alt="Logo" 
              loading="eager"
              decoding="async"
              style={{ width: 80, height: 80, borderRadius: "50%", objectFit: "contain" }} 
            />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ color: "#fff" }}>Bem-vindo,</Typography>
            <Typography variant="subtitle1" sx={{ color: "#fff" }}>
              {isMaster ? `👑 MESTRE` : userNick}
            </Typography>
            <Typography variant="caption" display="block" sx={{ color: "rgba(255,255,255,0.8)" }}>{userEmail}</Typography>
            <Typography variant="caption" sx={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.6)", display: "block" }}>
              APP Réquiem RPG —{' '}
              <span
                onClick={() => setModalChangelogOpen(true)}
                style={{
                  color: '#FFD700',
                  fontWeight: 'bold',
                  textShadow: '0 0 8px rgba(255,215,0,0.5)',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                Versão 5.0
              </span>
              {' '}— By: Zambiazi
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <IconButton 
            color="inherit" 
            onClick={() => window.dispatchEvent(new CustomEvent('abrirGaleria'))} 
            title="Galeria de Imagens" 
            size="small"
            sx={{ 
              bgcolor: 'rgba(0, 224, 255, 0.15)', 
              border: '1px solid rgba(0, 224, 255, 0.5)',
              boxShadow: '0 0 10px rgba(0, 224, 255, 0.3)',
              transition: 'all 0.2s',
              '&:hover': { 
                bgcolor: 'rgba(0, 224, 255, 0.3)', 
                boxShadow: '0 0 15px rgba(0, 224, 255, 0.6)',
                transform: 'scale(1.08)'
              }
            }}
          >
            <span style={{ fontSize: '1.1rem' }}>📸</span>
          </IconButton>
          <IconButton color="inherit" onClick={() => setModalTutorialOpen(true)} title="Informações" size="small">
            <span style={{ fontSize: '1.3rem' }}>ℹ️</span>
          </IconButton>
          <IconButton color="inherit" onClick={handleLogout} title="Sair" size="small">
            <LogoutIcon />
          </IconButton>
        </Box>
      </Box>
      <Box sx={{ display: "flex", justifyContent: "center", gap: 1.5, flexWrap: "wrap" }}>
        
        <Button variant="contained" component={Link} to="/cronica" size="small">Crônica</Button>
        <Button variant="contained" component={Link} to="/sistema" size="small">Sistema</Button>
        {!fichaAtual?.isConvidado && (
          <Button 
            variant="contained" 
            size="small"
            onClick={() => {
              if (window.__toggleHUDMobile) window.__toggleHUDMobile();
            }}
            sx={{ bgcolor: '#ff9800', '&:hover': { bgcolor: '#f57c00' }, minWidth: 'auto', px: 1.5 }}
          >
            📊 HUD
          </Button>
        )}
        <Button 
          variant="contained" 
          size="small"
          onClick={() => window.__startJitsiMeeting?.({ 
            name: fichaAtual?.nome || userNick, 
            email: userEmail, 
            avatar: fichaAtual?.imagemPrincipal || fichaAtual?.imagemPersonagem || null 
          })} 
          sx={{ bgcolor: '#e74c3c', '&:hover': { bgcolor: '#c0392b' } }}
        >
          🎙️ Voice
        </Button>
        <Button 
          variant="contained" 
          size="small"
          onClick={() => { if (window.__toggleConquistas) window.__toggleConquistas(); }}
          sx={{ bgcolor: '#ffd700', '&:hover': { bgcolor: '#eab308' }, color: '#000', fontWeight: 'bold' }}
        >
          🏆 Conquistas
        </Button>
      </Box>
    </Box>

    <IconButton
      onClick={() => {
        setLightboxSrc("/background.jpg");
        setZoom(1);
        setLightboxOpen(true);
      }}
      sx={{
        position: "absolute",
        top: 8,
        right: 8,
        bgcolor: "rgba(0,0,0,0.5)",
        color: "#fff",
        zIndex: 2,
        "&:hover": { bgcolor: "rgba(0,0,0,0.8)" },
      }}
      title="Ver imagem de fundo"
      size="small"
    >
      🖼️
    </IconButton>
  </Paper>
));

// 🟢 MODAL DE MARKDOWN MEMOIZADO
const MarkdownModal = memo(({ 
  open, onClose, title, content, editando, isMaster,
  onToggleEdit, onSave, onContentChange, textareaRef,
  onImageClick, lightboxSrc, setLightboxSrc, setZoom, setLightboxOpen
}) => {
  const handleImageUpload = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const fd = new FormData();
    fd.append('file', file);
    const apiBase = window.location.hostname === 'localhost' ? 'http://localhost:5000' : 'https://reqviem.onrender.com';
    
    try {
      const res = await fetch(`${apiBase}/upload`, { method: 'POST', body: fd });
      const data = await res.json();
      if (data.url) {
        const textarea = textareaRef.current;
        if (textarea) {
          const start = textarea.selectionStart;
          const end = textarea.selectionEnd;
          const antes = content.substring(0, start);
          const depois = content.substring(end);
          const imagemMarkdown = `\n![Imagem](${data.url})\n`;
          onContentChange(antes + imagemMarkdown + depois);
          setTimeout(() => {
            textarea.focus();
            textarea.selectionStart = start + imagemMarkdown.length;
            textarea.selectionEnd = start + imagemMarkdown.length;
          }, 100);
        } else {
          onContentChange(prev => prev + `\n![Imagem](${data.url})\n`);
        }
      }
    } catch (err) {
      console.error("Erro ao enviar imagem:", err);
    }
  }, [content, onContentChange, textareaRef]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { bgcolor: '#0f172a', border: '1px solid #1e293b', borderRadius: 2, minHeight: '60vh' } }}
    >
      <DialogTitle sx={{ color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {title}
        <Box>
          {isMaster && (
            <Button
              size="small"
              variant="contained"
              onClick={onToggleEdit}
              sx={{ mr: 1, bgcolor: editando ? '#4caf50' : '#ff9800' }}
            >
              {editando ? 'Visualizar' : 'Editar'}
            </Button>
          )}
          <IconButton onClick={onClose} sx={{ color: '#94a3b8' }} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: 2 }}>
        {editando ? (
          <>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                size="small"
                variant="outlined"
                component="label"
                startIcon={<span>📷</span>}
                sx={{ color: '#94a3b8', borderColor: '#555' }}
              >
                Inserir Imagem
                <input hidden type="file" accept="image/*" onChange={handleImageUpload} />
              </Button>
              <Button size="small" variant="contained" onClick={onSave} sx={{ bgcolor: '#2e7d32' }}>Salvar</Button>
            </Box>
            <TextField
              inputRef={textareaRef}
              label="Conteúdo (Markdown)"
              fullWidth
              multiline
              minRows={12}
              maxRows={25}
              value={content}
              onChange={(e) => onContentChange(e.target.value)}
              InputProps={{ style: { color: '#fff', fontFamily: 'monospace' } }}
              InputLabelProps={{ style: { color: '#94a3b8' } }}
              sx={{ '& .MuiInputBase-root': { height: '100%', overflowY: 'auto' } }}
            />
          </>
        ) : (
          <Box
            sx={{ 
              color: '#fff', 
              overflowY: 'auto', 
              maxHeight: '60vh',
              WebkitOverflowScrolling: 'touch',
              '& img': { maxWidth: '100%', borderRadius: 2, cursor: 'pointer' },
            }}
            onClick={(e) => {
              if (e.target.tagName === 'IMG') {
                setLightboxSrc(e.target.src);
                setZoom(1);
                setLightboxOpen(true);
              }
            }}
          >
            {content ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
            ) : (
              <Typography sx={{ color: '#94a3b8', textAlign: 'center', mt: 4 }}>
                Nenhum conteúdo disponível.
              </Typography>
            )}
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
});

const Home = memo(function Home({ 
  user, 
  userNick, 
  role, 
  fichasList, 
  selectedFichaEmail, 
  setSelectedFichaEmail,
  criarContaEJogador,
  handleLogout,
  fichaAtual,
  theme, 
  onRegister,
}) {
  const [isMobileLocal, setIsMobileLocal] = useState(() => window.innerWidth < 1024);
  
  // 🟢 ESTADOS DO LIGHTBOX
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [lightboxSrc, setLightboxSrc] = useState(null);
  
  // 🟢 Nome da ficha selecionada
  const [fichaNome, setFichaNome] = useState("");

  // 🟢 GALERIA
  const [galeriaOpen, setGaleriaOpen] = useState(false);

  // 🟢 TUTORIAL E CHANGELOG
  const [modalTutorialOpen, setModalTutorialOpen] = useState(false);
  const [tutorialContent, setTutorialContent] = useState("");
  const [tutorialEditando, setTutorialEditando] = useState(false);

  const [modalChangelogOpen, setModalChangelogOpen] = useState(false);
  const [changelogContent, setChangelogContent] = useState("");
  const [changelogEditando, setChangelogEditando] = useState(false);

  const tutorialTextareaRef = useRef(null);
  const changelogTextareaRef = useRef(null);

  // 🟢 MEMOIZAR VALORES DERIVADOS
  const isMaster = useMemo(() => role === "master", [role]);
  const displayName = useMemo(() => isMaster ? (fichaNome || userNick || "Mestre") : userNick, [isMaster, fichaNome, userNick]);

  // 🟢 OUVIR EVENTO DA GALERIA
  useEffect(() => {
    const handleAbrir = () => setGaleriaOpen(true);
    window.addEventListener('abrirGaleria', handleAbrir);
    return () => window.removeEventListener('abrirGaleria', handleAbrir);
  }, []);

  // 🟢 CALLBACKS MEMOIZADOS
  const handleResize = useCallback(() => setIsMobileLocal(window.innerWidth < 1024), []);
  
  const handleOpenLightbox = useCallback((src) => {
    setLightboxSrc(src);
    setZoom(1);
    setLightboxOpen(true);
  }, []);

  const handleCloseLightbox = useCallback(() => setLightboxOpen(false), []);

  const salvarTutorial = useCallback(async () => {
    await setDoc(doc(db, "app_info", "tutorial"), { content: tutorialContent }, { merge: true });
    setTutorialEditando(false);
  }, [tutorialContent]);

  const salvarChangelog = useCallback(async () => {
    await setDoc(doc(db, "app_info", "changelog"), { content: changelogContent }, { merge: true });
    setChangelogEditando(false);
  }, [changelogContent]);

  const handleTutorialContentChange = useCallback((value) => setTutorialContent(value), []);
  const handleChangelogContentChange = useCallback((value) => setChangelogContent(value), []);

  // Atualizar nome da ficha selecionada
  useEffect(() => {
    if (selectedFichaEmail) {
      const fichaRef = doc(db, "fichas", selectedFichaEmail);
      const unsub = onSnapshot(fichaRef, (snap) => {
        if (snap.exists()) {
          setFichaNome(snap.data().nome || selectedFichaEmail);
        }
      });
      return () => unsub();
    } else {
      setFichaNome("");
    }
  }, [selectedFichaEmail]);
  
  // 🟢 RESIZE COM PASSIVE
  useEffect(() => {
    window.addEventListener("resize", handleResize, { passive: true });
    return () => window.removeEventListener("resize", handleResize);
  }, [handleResize]);

  // Carregar conteúdo do tutorial
  useEffect(() => {
    const ref = doc(db, "app_info", "tutorial");
    const unsub = onSnapshot(ref, (snap) => {
      setTutorialContent(snap.exists() ? (snap.data().content || "") : "");
    });
    return () => unsub();
  }, []);

  // Carregar conteúdo do changelog
  useEffect(() => {
    const ref = doc(db, "app_info", "changelog");
    const unsub = onSnapshot(ref, (snap) => {
      setChangelogContent(snap.exists() ? (snap.data().content || "") : "");
    });
    return () => unsub();
  }, []);

  // 🟢 OVERLAY DE FUNDO OTIMIZADO
  const lightboxOverlay = useMemo(() => {
    if (!lightboxOpen) return null;
    
    return (
      <Box
        onClick={handleCloseLightbox}
        sx={{
          position: "fixed",
          inset: 0,
          bgcolor: "rgba(0,0,0,0.85)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
        }}
      >
        <LightboxImage
          src={lightboxSrc}
          zoom={zoom}
          setZoom={setZoom}
        />
      </Box>
    );
  }, [lightboxOpen, lightboxSrc, zoom, handleCloseLightbox]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ height: "100vh", p: 2, overflow: 'hidden' }}>
        <Grid container direction={isMobileLocal ? "column" : "row"} wrap="nowrap" sx={{ height: "100%" }}>
          {/* Coluna do Chat */}
          <Grid item sx={{ 
            flex: isMobileLocal ? "1 1 100%" : "1 1 33%", 
            minWidth: 0, 
            display: "flex", 
            flexDirection: "column", 
            borderRight: isMobileLocal ? "none" : "1px solid rgba(255,255,255,0.08)" 
          }}>
            {!user ? (
              <LoginForm onLogin={() => {}} onRegister={onRegister} />
            ) : (
              <>
                <HeaderSection
                  userEmail={user?.email || user?.displayName || "Usuário"}
                  userNick={userNick}
                  isMaster={isMaster}
                  fichaNome={fichaNome}
                  displayName={displayName}
                  handleLogout={handleLogout}
                  setModalChangelogOpen={setModalChangelogOpen}
                  setModalTutorialOpen={setModalTutorialOpen}
                  setLightboxSrc={setLightboxSrc}
                  setZoom={setZoom}
                  setLightboxOpen={setLightboxOpen}
                  fichaAtual={fichaAtual}
                />
                <AgendadorSessoes
                  userEmail={user?.email}
                  userNick={displayName}
                  isMaster={isMaster}
                />
                <Paper sx={{ 
                  flex: 1, 
                  display: "flex", 
                  flexDirection: "column", 
                  mt: 2, 
                  overflow: "hidden",
                  contentVisibility: 'auto',
                  opacity: fichaAtual?.isConvidado ? 0.5 : 1,
                  pointerEvents: fichaAtual?.isConvidado ? 'none' : 'auto',
                }}>
                  <Box sx={{ flex: 1, overflowY: "auto", maxHeight: isMobileLocal ? "60vh" : "none", WebkitOverflowScrolling: 'touch' }}>
                    {fichaAtual?.isConvidado ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                        <Typography sx={{ color: '#94a3b8', textAlign: 'center' }}>
                          🔒 Chat indisponível para convidados
                        </Typography>
                      </Box>
                    ) : (
                      <MemoizedChat 
                        userNick={displayName} 
                        userEmail={user?.email}
                      />
                    )}
                  </Box>
                </Paper>
              </>
            )}
          </Grid>

          {/* Colunas do Mestre */}
          {isMaster && (
            <>
              <Grid item sx={{ flex: "1 1 25%", minWidth: 0, display: "flex", flexDirection: "column", borderRight: "1px solid rgba(255,255,255,0.08)" }}>
                <HomePage
                  user={user?.email || "Usuário"}
                  role={role}
                  fichasList={fichasList}
                  selectedFichaEmail={selectedFichaEmail}
                  setSelectedFichaEmail={setSelectedFichaEmail}
                  criarContaEJogador={criarContaEJogador}
                />
                <Box sx={{ borderTop: "1px solid rgba(255,255,255,0.1)", p: 1, maxHeight: "50vh", overflowY: "auto", WebkitOverflowScrolling: 'touch' }}>
                  <SoundBoard isMaster={true} />
                </Box>
              </Grid>
              <Grid item sx={{ flex: "1 1 42%", minWidth: 0, display: "flex", flexDirection: "column" }}>
                <Paper sx={{ flex: 1, overflowY: "auto", p: 2, WebkitOverflowScrolling: 'touch' }}>
                  {user ? (
                    selectedFichaEmail ? (
                      <FichaPersonagem 
                        key={selectedFichaEmail || 'empty'} 
                        user={{ email: user?.email }} 
                        fichaId={selectedFichaEmail} 
                        isMestre={true} 
                      />
                    ) : (
                      <Typography sx={{ color: '#94a3b8', textAlign: 'center', mt: 4 }}>
                        👑 Selecione uma ficha para visualizar
                      </Typography>
                    )
                  ) : (
                    <Typography>Faça login para editar suas fichas.</Typography>
                  )}
                </Paper>
              </Grid>
            </>
          )}

          {/* Coluna do Jogador */}
          {!isMaster && (
            <Grid item sx={{ flex: "1 1 67%", minWidth: 0, display: "flex", flexDirection: "column" }}>
              <Paper sx={{ 
                flex: 1, 
                overflowY: "auto", 
                p: 2, 
                WebkitOverflowScrolling: 'touch',
                opacity: fichaAtual?.isConvidado ? 0.5 : 1,
                pointerEvents: fichaAtual?.isConvidado ? 'none' : 'auto',
              }}>
                {user ? (
                  fichaAtual?.isConvidado ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                      <Typography sx={{ color: '#94a3b8', textAlign: 'center' }}>
                        🔒 Ficha indisponível para convidados
                      </Typography>
                    </Box>
                  ) : (
                    <FichaPersonagem 
                      key={user?.email || 'player'} 
                      user={{ email: user?.email }} 
                      fichaId={user?.email} 
                      isMestre={false} 
                    />
                  )
                ) : (
                  <Typography>Faça login para editar suas fichas.</Typography>
                )}
              </Paper>
            </Grid>
          )}
        </Grid>
      </Box>

      {/* MOTOR DO SIMULADOR */}
      {user?.email && (
        <SimuladorEngine
          userEmail={user.email}
          isMaster={isMaster}
          isConvidado={!!fichaAtual?.isConvidado}
        />
      )}

      {/* GALERIA FLUTUANTE */}
      {galeriaOpen && (
        <GaleriaFlutuante
          isMaster={isMaster}
          onClose={() => setGaleriaOpen(false)}
          setLightboxSrc={setLightboxSrc}
          setZoom={setZoom}
          setLightboxOpen={setLightboxOpen}
        />
      )}

      {/* LIGHTBOX */}
      {lightboxOverlay}

      {/* MODAL TUTORIAL */}
      <MarkdownModal
        open={modalTutorialOpen}
        onClose={() => setModalTutorialOpen(false)}
        title="📖 Informações do App"
        content={tutorialContent}
        editando={tutorialEditando}
        isMaster={isMaster}
        onToggleEdit={() => setTutorialEditando(!tutorialEditando)}
        onSave={salvarTutorial}
        onContentChange={handleTutorialContentChange}
        textareaRef={tutorialTextareaRef}
        setLightboxSrc={setLightboxSrc}
        setZoom={setZoom}
        setLightboxOpen={setLightboxOpen}
      />

      {/* MODAL CHANGELOG */}
      <MarkdownModal
        open={modalChangelogOpen}
        onClose={() => setModalChangelogOpen(false)}
        title="📋 Atualizações do App"
        content={changelogContent}
        editando={changelogEditando}
        isMaster={isMaster}
        onToggleEdit={() => setChangelogEditando(!changelogEditando)}
        onSave={salvarChangelog}
        onContentChange={handleChangelogContentChange}
        textareaRef={changelogTextareaRef}
        setLightboxSrc={setLightboxSrc}
        setZoom={setZoom}
        setLightboxOpen={setLightboxOpen}
      />
    </ThemeProvider>
  );
});

export default Home;
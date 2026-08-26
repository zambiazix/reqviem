import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from "react";
import {
  Box,
  Button,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  CircularProgress,
  Divider,
  Paper,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import CloseIcon from "@mui/icons-material/Close";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import { getAuth } from "firebase/auth";
import { db } from "../firebaseConfig";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
// 🟢 ESTILOS GLOBAIS DA PÁGINA
const globalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
  
  .sistema-page * {
    font-family: 'Inter', 'Segoe UI', 'Roboto', sans-serif !important;
  }
  
  .sistema-page h1, .sistema-page h2, .sistema-page h3, 
  .sistema-page h4, .sistema-page h5, .sistema-page h6 {
    font-weight: 800 !important;
    color: #ffffff !important;
    letter-spacing: 0.5px;
  }
  
  .sistema-page p, .sistema-page span, .sistema-page div {
    color: #e2e8f0 !important;
  }
  
  .sistema-page .MuiTypography-root {
    color: #e2e8f0 !important;
    font-weight: 500;
  }
  
  .sistema-page .markdown-content h1,
  .sistema-page .markdown-content h2,
  .sistema-page .markdown-content h3,
  .sistema-page .markdown-content h4,
  .sistema-page .markdown-content h5,
  .sistema-page .markdown-content h6 {
    color: #ffffff !important;
    font-weight: 800 !important;
    margin-top: 1em;
    margin-bottom: 0.5em;
  }
  
  .sistema-page .markdown-content p {
    color: #e2e8f0 !important;
    font-weight: 400;
    line-height: 1.7;
  }
  
  .sistema-page .markdown-content li {
    color: #e2e8f0 !important;
    font-weight: 400;
  }
  
  .sistema-page .markdown-content strong {
    color: #ffffff !important;
    font-weight: 800 !important;
  }
  
  .sistema-page .markdown-content em {
    color: #cbd5e1 !important;
  }
  
  /* 🟢 ANIMAÇÃO DE CHUVA DE CARACTERES VIOLETA */
  @keyframes matrixRain {
    0% {
      transform: translateY(0);
      opacity: 0;
    }
    10% {
      opacity: 0.7;
    }
    90% {
      opacity: 0.7;
    }
    100% {
      transform: translateY(calc(100vh + 100px));
      opacity: 0;
    }
  }

`;

const MESTRE_EMAIL = "mestre@reqviemrpg.com";

// 🟢 LIGHTBOX OTIMIZADO
const LightboxImage = memo(({ src, zoom, setZoom, onClose }) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [start, setStart] = useState({ x: 0, y: 0 });

  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
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
    setZoom((z) => Math.min(Math.max(z + e.deltaY * -0.001, 0.5), 5));
  }, [setZoom]);

  return (
    <div
      onClick={onClose}
      onWheel={handleWheel}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        background: "rgba(0,0,0,0.85)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 3000,
        cursor: "zoom-out",
      }}
    >
      <img
        src={src}
        alt="ampliada"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={handleMouseDown}
        draggable={false}
        loading="eager"
        decoding="async"
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
      <IconButton
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        sx={{
          position: "fixed",
          top: 16,
          right: 16,
          color: "#fff",
          background: "rgba(0,0,0,0.5)",
          "&:hover": { background: "rgba(0,0,0,0.8)" },
        }}
      >
        <CloseIcon />
      </IconButton>
    </div>
  );
});

// 🟢 COMPONENTE DE TÓPICO MEMOIZADO
const TopicCard = memo(({ topic, index, isMaster, onEdit, onDelete, setLightboxImage, setZoom }) => {
  return (
    <Box
      sx={{
        bgcolor: '#0f172a',
        borderRadius: 3,
        p: 2,
        position: "relative",
        overflowWrap: "break-word",
        contentVisibility: 'auto',
        containIntrinsicSize: 'auto 150px',
        border: '1px solid #334155',
        transition: 'all 0.3s ease',
        '&:hover': {
          border: '1px solid #9c27b0',
          boxShadow: '0 0 20px rgba(156,39,176,0.2)',
          transform: 'translateY(-2px)',
        },
      }}
    >
      <Typography 
        variant="h6" 
        sx={{ 
          fontWeight: 800,
          color: '#ffffff !important',
          borderBottom: '2px solid #9c27b0',
          pb: 1,
          mb: 1.5,
          letterSpacing: 0.5,
          textShadow: '0 0 10px rgba(255,255,255,0.2)',
        }}
      >
        {topic.title}
      </Typography>
      <Box sx={{ mt: 1 }} className="markdown-content">
        <ReactMarkdown
          children={topic.content}
          remarkPlugins={[remarkGfm]}
          components={{
            img: ({ ...props }) => (
              <img
                {...props}
                loading="lazy"
                decoding="async"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxImage(e.target.src);
                  setZoom(1);
                }}
                style={{
                  maxWidth: "100%",
                  borderRadius: "8px",
                  marginTop: "8px",
                  cursor: "pointer",
                }}
                draggable={false}
              />
            ),
            video: ({ ...props }) => (
              <video {...props} controls preload="none" style={{ maxWidth: "100%", borderRadius: "8px" }} />
            ),
          }}
        />
      </Box>

      {isMaster && (
        <Box sx={{ position: "absolute", top: 8, right: 8, display: 'flex', gap: 0.5 }}>
          <IconButton color="info" size="small" onClick={() => onEdit(index)}>
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton color="error" size="small" onClick={() => onDelete(index)}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      )}
    </Box>
  );
});

export default function Sistema() {
  const navigate = useNavigate();
  const auth = getAuth();
  const currentUser = auth.currentUser;
  const isMaster = useMemo(() => currentUser?.email === MESTRE_EMAIL, [currentUser]);
  const contentInputRef = useRef(null);

  // estados
  const [topicsLeft, setTopicsLeft] = useState([]);
  const [topicsRight, setTopicsRight] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editIndex, setEditIndex] = useState(null);
  const [side, setSide] = useState("left");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [uploading, setUploading] = useState(false);

  // 🖼️ Lightbox
  const [lightboxImage, setLightboxImage] = useState(null);
  const [zoom, setZoom] = useState(1);

  // 🟢 MEMOIZAR ESTILOS MARKDOWN
  const markdownStyles = useMemo(() => `
    .markdown-content img {
      max-width: 100%;
      height: auto;
      border-radius: 8px;
      margin: 8px 0;
      cursor: pointer;
      transition: transform 0.2s ease;
    }
    .markdown-content img:hover {
      transform: scale(1.02);
    }
    .markdown-content video {
      max-width: 100%;
      border-radius: 8px;
      margin: 8px 0;
      display: block;
    }
  `, []);

  // 🔹 Carrega tópicos do Firestore
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "world", "Sistema"), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setTopicsLeft(data.left || []);
        setTopicsRight(data.right || []);
      }
    });
    return () => unsub();
  }, []);

  // 🔹 Abre modal (MEMOIZADO)
  const handleOpenDialog = useCallback((sideSel, index = null) => {
    setSide(sideSel);
    setEditIndex(index);
    if (index !== null) {
      const topic = sideSel === "left" ? topicsLeft[index] : topicsRight[index];
      setTitle(topic.title);
      setContent(topic.content);
    } else {
      setTitle("");
      setContent("");
    }
    setOpenDialog(true);
  }, [topicsLeft, topicsRight]);

  // 🟢 Upload de imagem (MEMOIZADO)
  const handleImageUpload = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert("Arquivo muito grande. Máximo 10 MB.");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("https://reqviem.onrender.com/upload", {
        method: "POST",
        body: formData,
        mode: "cors",
        credentials: "include",
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error("Erro no upload:", errText);
        throw new Error(`Upload falhou: ${res.status}`);
      }

      const data = await res.json();
      const imageUrl = data.url;
      if (!imageUrl) throw new Error("URL não retornada");

      const markdownImage = `![${file.name}](${imageUrl})`;

      const textarea = contentInputRef.current;
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;
        const before = text.substring(0, start);
        const after = text.substring(end, text.length);
        const newText = before + markdownImage + after;
        setContent(newText);
        setTimeout(() => {
          textarea.focus();
          const newCursorPos = start + markdownImage.length;
          textarea.setSelectionRange(newCursorPos, newCursorPos);
        }, 0);
      } else {
        setContent(prev => prev + `\n${markdownImage}\n`);
      }
    } catch (err) {
      console.error("Erro no upload:", err);
      alert("Erro ao enviar imagem. Tente novamente.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }, []);

  // 🔹 Salvar tópico (MEMOIZADO)
  const handleSave = useCallback(async () => {
    const newLeft = [...topicsLeft];
    const newRight = [...topicsRight];

    if (side === "left") {
      if (editIndex !== null) newLeft[editIndex] = { title, content };
      else newLeft.push({ title, content });
    } else {
      if (editIndex !== null) newRight[editIndex] = { title, content };
      else newRight.push({ title, content });
    }

    await setDoc(doc(db, "world", "Sistema"), { left: newLeft, right: newRight });
    setTopicsLeft(newLeft);
    setTopicsRight(newRight);
    setOpenDialog(false);
  }, [topicsLeft, topicsRight, side, editIndex, title, content]);

  // 🔹 Deletar tópico (MEMOIZADO)
  const handleDelete = useCallback(async (sideSel, index) => {
    const newLeft = [...topicsLeft];
    const newRight = [...topicsRight];

    if (sideSel === "left") newLeft.splice(index, 1);
    else newRight.splice(index, 1);

    await setDoc(doc(db, "world", "Sistema"), { left: newLeft, right: newRight });
    setTopicsLeft(newLeft);
    setTopicsRight(newRight);
  }, [topicsLeft, topicsRight]);

  // 🟢 CALLBACKS PARA O TOPIC CARD
  const handleEditTopic = useCallback((sideSel, index) => {
    handleOpenDialog(sideSel, index);
  }, [handleOpenDialog]);

  const handleDeleteTopic = useCallback((sideSel, index) => {
    if (window.confirm("Excluir este tópico?")) {
      handleDelete(sideSel, index);
    }
  }, [handleDelete]);

  const handleCloseLightbox = useCallback(() => setLightboxImage(null), []);

  const handleCloseDialog = useCallback(() => setOpenDialog(false), []);

  const handleGoBack = useCallback(() => navigate("/"), [navigate]);

  // 🟢 RENDERIZAR COLUNA (MEMOIZADO)
  const renderColumn = useCallback((sideSel, topics) => (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2, height: "100%" }}>
       {isMaster && (
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog(sideSel)}
          size="small"
          sx={{
            bgcolor: '#9c27b0',
            '&:hover': { bgcolor: '#7b1fa2' },
            borderRadius: 2,
            py: 1,
            fontWeight: 'bold',
          }}
        >
          Adicionar Tópico ({sideSel === "left" ? "Esquerda" : "Direita"})
        </Button>
      )}

      {topics.length === 0 && (
        <Typography sx={{ textAlign: "center", color: "#aaa" }}>
          Nenhum tópico nesta coluna.
        </Typography>
      )}

      {topics.map((t, i) => (
        <TopicCard
          key={`${sideSel}-${i}-${t.title}`}
          topic={t}
          index={i}
          isMaster={isMaster}
          onEdit={(idx) => handleEditTopic(sideSel, idx)}
          onDelete={(idx) => handleDeleteTopic(sideSel, idx)}
          setLightboxImage={setLightboxImage}
          setZoom={setZoom}
        />
      ))}
    </Box>
  ), [isMaster, handleOpenDialog, handleEditTopic, handleDeleteTopic, setLightboxImage, setZoom]);

  return (
    <Box
      className="sistema-page"
      sx={{
        bgcolor: "#0a0a12",
        minHeight: "100vh",
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        width: "100vw",
        overflowX: "hidden",
        position: 'relative',
      }}
    >
      <style>{globalStyles}</style>
      <style>{markdownStyles}</style>
      {/* 🟢 CHUVA DE CARACTERES VIOLETA */}
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          pointerEvents: 'none',
          zIndex: 0,
          overflow: 'hidden',
        }}
      >
        {Array.from({ length: 100 }, (_, i) => {
          const simbolos = ['✦', '✧', '✶', '✷', '✹', '✺', '◆', '◇', '◈', '◉', '◊', '○', '●', '◎', '◐', '◑', '◒', '◓', '☯', '☮', '☸', '⚝', '⚜', '⛧', '⛤', '✠', '✡', '✦', '✧', '✩', '✪', '✫', '✬', '✭', '✮', '✯', '✰', '✱', '✲', '✳', '✴', '✵', '✶', '✷', '✸', '✹', '✺', '✻', '✼', '✽', '✾', '✿', '❀', '❁', '❂', '❃', '❄', '❅', '❆', '❇', '❈', '❉', '❊', '❋'];
          const simbolo = simbolos[Math.floor(Math.random() * simbolos.length)];
          const left = Math.random() * 100;
          const duration = 4 + Math.random() * 8;
          const delay = Math.random() * 4;
          const fontSize = 14 + Math.random() * 20;
          
          return (
            <Box
              key={i}
              sx={{
                position: 'absolute',
                top: '-50px',
                left: `${left}%`,
                color: '#a855f7',
                fontSize: `${fontSize}px`,
                fontWeight: 700,
                textShadow: '0 0 10px #a855f7, 0 0 20px #9c27b0, 0 0 40px #7b1fa2',
                opacity: 0.5,
                animation: 'matrixRain linear infinite',
                animationDuration: `${duration}s`,
                animationDelay: `${delay}s`,
                userSelect: 'none',
              }}
            >
              {simbolo}
            </Box>
          );
        })}
      </Box>

      {/* topo */}
      <Box sx={{ p: 3, pb: 2, position: 'relative', zIndex: 1 }}>
        <Button
          variant="contained"
          startIcon={<ArrowBackIcon />}
          onClick={handleGoBack}
          size="small"
          sx={{ 
            mb: 2,
            bgcolor: '#334155',
            '&:hover': { bgcolor: '#475569' },
            borderRadius: 2,
            px: 2,
          }}
        >
          Voltar
        </Button>

        <Typography 
          variant="h3" 
          sx={{ 
            mb: 3, 
            textAlign: "center",
            fontWeight: 900,
            color: '#ffffff',
            letterSpacing: 1,
            textShadow: '0 0 20px rgba(156,39,176,0.5), 0 0 40px rgba(0,224,255,0.3)',
          }}
        >
          📖 Sistema - Reqviem RPG
        </Typography>
        <Divider sx={{ borderColor: '#334155', mb: 2 }} />
      </Box>

      {/* corpo - duas colunas */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          position: 'relative',
          zIndex: 1,
          gap: 3,
          px: 3,
          pb: 4,
          flex: 1,
          width: "100%",
          boxSizing: "border-box",
          maxWidth: 1400,
          mx: "auto",
        }}
      >
               <Paper sx={{ p: 2, bgcolor: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(5px)', borderRadius: 3, border: '1px solid #334155', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
          {renderColumn("left", topicsLeft)}
        </Paper>
        <Paper sx={{ p: 2, bgcolor: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(5px)', borderRadius: 3, border: '1px solid #334155', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
          {renderColumn("right", topicsRight)}
        </Paper>
      </Box>

      {/* modal de criação/edição */}
      <Dialog 
        open={openDialog} 
        onClose={handleCloseDialog} 
        fullWidth 
        maxWidth="md"
        PaperProps={{
          sx: {
            bgcolor: '#1a1a2e',
            border: '1px solid #9c27b0',
            borderRadius: 3,
            boxShadow: '0 0 30px rgba(156,39,176,0.3)',
          }
        }}
      >
        <DialogTitle sx={{ 
          color: '#9c27b0', 
          fontWeight: 'bold',
          borderBottom: '1px solid #334155',
          bgcolor: '#0f172a',
        }}>
          {editIndex !== null ? "✏️ Editar Tópico" : "➕ Novo Tópico"}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
                    <TextField
            label="Título"
            fullWidth
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            sx={{ 
              mb: 2,
              '& .MuiInputLabel-root': { 
                color: '#94a3b8', 
                fontWeight: 700,
                fontFamily: 'Inter, sans-serif',
              },
              '& .MuiInputLabel-root.Mui-focused': { 
                color: '#9c27b0',
              },
              '& .MuiInputBase-input': { 
                color: '#ffffff', 
                fontWeight: 700,
                fontFamily: 'Inter, sans-serif',
                fontSize: '1rem',
              },
              '& .MuiOutlinedInput-root': {
                '& fieldset': { borderColor: '#334155' },
                '&:hover fieldset': { borderColor: '#9c27b0' },
                '&.Mui-focused fieldset': { borderColor: '#9c27b0' },
              },
            }}
          />

                    <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
            <Button
              variant="contained"
              component="label"
              startIcon={<CloudUploadIcon />}
              disabled={uploading}
              sx={{
                bgcolor: '#334155',
                '&:hover': { bgcolor: '#475569' },
                fontFamily: 'Inter, sans-serif',
                fontWeight: 700,
                borderRadius: 2,
              }}
            >
              {uploading ? (
                <>
                  <CircularProgress size={18} sx={{ color: "white", mr: 1 }} />
                  Enviando...
                </>
              ) : (
                "Enviar Imagem"
              )}
              <input type="file" hidden accept="image/*" onChange={handleImageUpload} />
            </Button>
          </Box>

                    <TextField
            label="Conteúdo (Markdown, emojis, imagens e vídeos suportados)"
            fullWidth
            multiline
            minRows={6}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            inputRef={contentInputRef}
            sx={{
              '& .MuiInputLabel-root': { 
                color: '#94a3b8', 
                fontWeight: 700,
                fontFamily: 'Inter, sans-serif',
              },
              '& .MuiInputLabel-root.Mui-focused': { 
                color: '#9c27b0',
              },
              '& .MuiInputBase-input': { 
                color: '#e2e8f0', 
                fontWeight: 400,
                fontFamily: 'Inter, sans-serif',
                fontSize: '0.95rem',
                lineHeight: 1.6,
              },
              '& .MuiOutlinedInput-root': {
                '& fieldset': { borderColor: '#334155' },
                '&:hover fieldset': { borderColor: '#9c27b0' },
                '&.Mui-focused fieldset': { borderColor: '#9c27b0' },
              },
            }}
          />
        </DialogContent>
        <DialogActions sx={{ borderTop: '1px solid #334155', bgcolor: '#0f172a' }}>
          <Button onClick={handleCloseDialog} sx={{ color: '#94a3b8' }}>
            Cancelar
          </Button>
          <Button 
            variant="contained" 
            onClick={handleSave}
            sx={{ bgcolor: '#9c27b0', '&:hover': { bgcolor: '#7b1fa2' } }}
          >
            Salvar
          </Button>
        </DialogActions>
      </Dialog>

      {/* LIGHTBOX */}
      {lightboxImage && (
        <LightboxImage
          src={lightboxImage}
          zoom={zoom}
          setZoom={setZoom}
          onClose={handleCloseLightbox}
        />
      )}
    </Box>
  );
}
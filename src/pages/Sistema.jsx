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
        bgcolor: "#2a2a2a",
        borderRadius: 2,
        p: 2,
        position: "relative",
        overflowWrap: "break-word",
        contentVisibility: 'auto',
        containIntrinsicSize: 'auto 150px',
      }}
    >
      <Typography variant="h6">{topic.title}</Typography>
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
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog(sideSel)}
          size="small"
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
      sx={{
        bgcolor: "#1e1e1e",
        minHeight: "100vh",
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        width: "100vw",
        overflowX: "hidden",
      }}
    >
      <style>{markdownStyles}</style>

      {/* topo */}
      <Box sx={{ p: 2 }}>
        <Button
          variant="contained"
          color="secondary"
          startIcon={<ArrowBackIcon />}
          onClick={handleGoBack}
          sx={{ mb: 3 }}
          size="small"
        >
          Voltar
        </Button>

        <Typography variant="h4" sx={{ mb: 3, textAlign: "center" }}>
          Sistema - Réquiem RPG
        </Typography>
      </Box>

      {/* corpo - duas colunas */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 2,
          px: 2,
          pb: 4,
          flex: 1,
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        {renderColumn("left", topicsLeft)}
        {renderColumn("right", topicsRight)}
      </Box>

      {/* modal de criação/edição */}
      <Dialog open={openDialog} onClose={handleCloseDialog} fullWidth maxWidth="md">
        <DialogTitle>{editIndex !== null ? "Editar Tópico" : "Novo Tópico"}</DialogTitle>
        <DialogContent>
          <TextField
            label="Título"
            fullWidth
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            sx={{ mb: 2 }}
          />

          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
            <Button
              variant="contained"
              component="label"
              startIcon={<CloudUploadIcon />}
              disabled={uploading}
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
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button variant="contained" onClick={handleSave}>
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
import React, { useState, useEffect } from "react";
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
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const MESTRE_EMAIL = "mestre@reqviemrpg.com";

export default function Sistema() {
  const navigate = useNavigate();
  const auth = getAuth();
  const currentUser = auth.currentUser;
  const isMaster = currentUser?.email === MESTRE_EMAIL;
  const storage = getStorage();

  // estados
  const [topicsLeft, setTopicsLeft] = useState([]);
  const [topicsRight, setTopicsRight] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editIndex, setEditIndex] = useState(null);
  const [side, setSide] = useState("left");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [uploading, setUploading] = useState(false);

  // 🖼️ Lightbox (imagem ampliável e arrastável)
  const [lightboxImage, setLightboxImage] = useState(null);
  const [zoom, setZoom] = useState(1);

  const markdownStyles = `
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
  `;

  // 🔹 Carrega tópicos do Firestore e ouve atualizações em tempo real
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

  // 🔹 Abre o modal (criar ou editar)
  const handleOpenDialog = (sideSel, index = null) => {
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
  };

  // 🔹 Upload de imagem (disponível no modal de criação e edição)
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const storageRef = ref(storage, `sistema/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setContent((prev) => `${prev}\n\n![](${url})\n`);
    } catch (error) {
      console.error("Erro ao enviar imagem:", error);
      alert("Erro ao enviar imagem.");
    }
    setUploading(false);
  };

  // 🔹 Salvar ou editar tópico
  const handleSave = async () => {
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
  };

  // 🔹 Deletar tópico
  const handleDelete = async (sideSel, index) => {
    const newLeft = [...topicsLeft];
    const newRight = [...topicsRight];

    if (sideSel === "left") newLeft.splice(index, 1);
    else newRight.splice(index, 1);

    await setDoc(doc(db, "world", "Sistema"), { left: newLeft, right: newRight });
    setTopicsLeft(newLeft);
    setTopicsRight(newRight);
  };

  // === Lightbox ===
  const handleWheelZoom = (e) => {
    e.preventDefault();
    setZoom((z) => Math.min(Math.max(z + e.deltaY * -0.001, 0.5), 5));
  };

  // 🔹 Renderiza coluna genérica
  const renderColumn = (sideSel, topics) => (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2, height: "100%" }}>
      {isMaster && (
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog(sideSel)}
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
        <Box
          key={i}
          sx={{
            bgcolor: "#2a2a2a",
            borderRadius: 2,
            p: 2,
            position: "relative",
            overflowWrap: "break-word",
          }}
        >
          <Typography variant="h6">{t.title}</Typography>
          <Box sx={{ mt: 1 }} className="markdown-content">
            <ReactMarkdown
              children={t.content}
              remarkPlugins={[remarkGfm]}
              components={{
                img: ({ ...props }) => (
                  <img
                    {...props}
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
                  <video {...props} controls style={{ maxWidth: "100%", borderRadius: "8px" }} />
                ),
              }}
            />
          </Box>

          {isMaster && (
            <Box sx={{ position: "absolute", top: 8, right: 8 }}>
              <IconButton color="info" onClick={() => handleOpenDialog(sideSel, i)}>
                <EditIcon />
              </IconButton>
              <IconButton color="error" onClick={() => handleDelete(sideSel, i)}>
                <DeleteIcon />
              </IconButton>
            </Box>
          )}
        </Box>
      ))}
    </Box>
  );

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
          onClick={() => navigate("/")}
          sx={{ mb: 3 }}
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
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} fullWidth maxWidth="md">
        <DialogTitle>{editIndex !== null ? "Editar Tópico" : "Novo Tópico"}</DialogTitle>
        <DialogContent>
          <TextField
            label="Título"
            fullWidth
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            sx={{ mb: 2 }}
          />

          {/* Botão de Upload sempre visível (criar ou editar) */}
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
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSave}>
            Salvar
          </Button>
        </DialogActions>
      </Dialog>

      {/* === LIGHTBOX (com zoom + arrastar) === */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          onWheel={handleWheelZoom}
          className="lightbox-overlay"
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
            cursor: "zoom-in",
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            const img = e.currentTarget.querySelector("img");
            const startX = e.clientX - (parseFloat(img.dataset.x || "0"));
            const startY = e.clientY - (parseFloat(img.dataset.y || "0"));

            const handleMouseMove = (ev) => {
              ev.preventDefault();
              const x = ev.clientX - startX;
              const y = ev.clientY - startY;
              img.style.transform = `translate(${x}px, ${y}px) scale(${zoom})`;
              img.dataset.x = x;
              img.dataset.y = y;
            };

            const handleMouseUp = () => {
              window.removeEventListener("mousemove", handleMouseMove);
              window.removeEventListener("mouseup", handleMouseUp);
            };

            window.addEventListener("mousemove", handleMouseMove);
            window.addEventListener("mouseup", handleMouseUp);
          }}
        >
          <img
            src={lightboxImage}
            alt="ampliada"
            style={{
              transform: `scale(${zoom})`,
              transition: "transform 0.1s ease",
              maxWidth: "90%",
              maxHeight: "90%",
              borderRadius: 10,
              cursor: "grab",
              userSelect: "none",
            }}
            onClick={(e) => e.stopPropagation()}
            draggable={false}
            data-x="0"
            data-y="0"
          />
          <IconButton
            onClick={() => setLightboxImage(null)}
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
      )}
    </Box>
  );
}

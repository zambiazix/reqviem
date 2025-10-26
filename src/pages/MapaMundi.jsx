// src/pages/MapaMundi.jsx
import React, { useState, useRef, useEffect, useCallback } from "react";
import svgPanZoom from "svg-pan-zoom";
import {
  Box,
  Button,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Divider,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import SaveIcon from "@mui/icons-material/Save";
import UploadIcon from "@mui/icons-material/Upload";
import CloseIcon from "@mui/icons-material/Close";
import { useNavigate } from "react-router-dom";
import { getAuth } from "firebase/auth";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { db } from "../firebaseConfig";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import LZString from "lz-string";

const MESTRE_EMAIL = "mestre@reqviemrpg.com";
const CHUNK_SIZE = 800000;

const MAPS = [
  { id: "MapaMundi", title: "Mapa Político" },
  { id: "Mapa2", title: "Mapa de Biomas" },
  { id: "Mapa3", title: "Mapa de Culturas" },
  { id: "Mapa4", title: "Mapa de Religiões" },
];

export default function MapaMundi() {
  const [isMestre, setIsMestre] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [svgContent, setSvgContent] = useState("");
  const [chaptersMap, setChaptersMap] = useState({});
  const [openDialog, setOpenDialog] = useState(false);
  const [editIndex, setEditIndex] = useState(null);
  const [chapterTitle, setChapterTitle] = useState("");
  const [chapterText, setChapterText] = useState("");
  const [currentMapEditing, setCurrentMapEditing] = useState(null);

  const [globalChapters, setGlobalChapters] = useState([]);
  const [openGlobalDialog, setOpenGlobalDialog] = useState(false);
  const [editGlobalIndex, setEditGlobalIndex] = useState(null);
  const [globalTitle, setGlobalTitle] = useState("");
  const [globalText, setGlobalText] = useState("");

  // 🖼️ Lightbox (igual ao Chat) — zoom with wheel, click outside to close, click on image stops propagation
  const [lightboxImage, setLightboxImage] = useState(null);
  const [zoom, setZoom] = useState(1);

  const mapSvgRefs = useRef({});
  const panZoomRef = useRef(null);
  const navigate = useNavigate();

  const markdownStyles = `
    .markdown-content img {
      max-width: 100%;
      height: auto;
      border-radius: 8px;
      display: block;
      margin: 10px 0;
      cursor: pointer;
      transition: transform 0.2s ease;
    }
    .markdown-content img:hover {
      transform: scale(1.02);
    }
    .markdown-content video {
      max-width: 100%;
      height: auto;
      display: block;
      margin: 10px 0;
      border-radius: 8px;
    }
    .markdown-content p,
    .markdown-content li,
    .markdown-content span,
    .markdown-content strong,
    .markdown-content em,
    .markdown-content a {
      color: #ffffff !important;
      word-break: break-word;
      white-space: pre-wrap;
      line-height: 1.5;
    }
    .markdown-content a { color: #66b3ff !important; text-decoration: underline; }

    /* Lightbox */
    .lightbox-overlay {
      position: fixed;
      top: 0; left: 0;
      width: 100%; height: 100%;
      background: rgba(0, 0, 0, 0.85);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 3000;
      cursor: zoom-in;
    }
    .lightbox-overlay img {
      transform-origin: center center;
      max-width: 90%;
      max-height: 90%;
      border-radius: 10px;
      transition: transform 0.1s ease;
      box-shadow: 0 0 15px rgba(0,0,0,0.6);
    }
  `;

  // 🔹 Verifica se é mestre
  useEffect(() => {
    const auth = getAuth();
    const unsub = auth.onAuthStateChanged((user) => {
      setIsMestre(user?.email === MESTRE_EMAIL);
    });
    return () => unsub();
  }, []);

  // 🔹 Snapshot Firestore (mapas e crônica global)
  useEffect(() => {
    const unsubscribers = MAPS.map((m) => {
      const ref = doc(db, "world", `Chapters_${m.id}`);
      return onSnapshot(ref, (snap) => {
        if (!snap.exists()) {
          setChaptersMap((prev) => ({ ...prev, [m.id]: [] }));
          return;
        }
        const data = snap.data();
        setChaptersMap((prev) => ({ ...prev, [m.id]: data.list || [] }));
      });
    });

    const globalRef = doc(db, "world", "Chapters");
    const unsubGlobal = onSnapshot(globalRef, (snap) => {
      if (!snap.exists()) {
        setGlobalChapters([]);
        return;
      }
      setGlobalChapters(snap.data().list || []);
    });

    return () => {
      unsubscribers.forEach((u) => u && u());
      unsubGlobal();
    };
  }, []);

  // 🔹 Controle do SVG e Zoom (svg-pan-zoom para os mapas)
  useEffect(() => {
    if (panZoomRef.current?.destroy) {
      try {
        panZoomRef.current.destroy();
      } catch {}
      panZoomRef.current = null;
    }

    if (!expanded) {
      setSvgContent("");
      return;
    }

    const host = mapSvgRefs.current[expanded];
    if (!host) return;

    host.innerHTML = svgContent || "";
    const svgEl = host.querySelector("svg");
    if (!svgEl) return;

    panZoomRef.current = svgPanZoom(svgEl, {
      zoomEnabled: true,
      controlIconsEnabled: true,
      fit: true,
      center: true,
      minZoom: 0.2,
      maxZoom: 40,
    });

    return () => {
      if (panZoomRef.current?.destroy) {
        try {
          panZoomRef.current.destroy();
        } catch {}
        panZoomRef.current = null;
      }
    };
  }, [svgContent, expanded]);

  const loadSvgForMap = useCallback(async (mapId) => {
    try {
      const dRef = doc(db, "world", `Map_${mapId}`);
      const snap = await getDoc(dRef);
      if (!snap.exists()) {
        setSvgContent("");
        return;
      }
      const data = snap.data();
      const parts = Object.keys(data)
        .filter((k) => k.startsWith("part_"))
        .sort((a, b) => parseInt(a.split("_")[1]) - parseInt(b.split("_")[1]))
        .map((k) => data[k]);
      const compressed = parts.join("");
      const decompressed = LZString.decompressFromUTF16(compressed);
      setSvgContent(decompressed || "");
    } catch (err) {
      console.error("Erro ao carregar SVG:", err);
      setSvgContent("");
    }
  }, []);

  useEffect(() => {
    if (expanded) loadSvgForMap(expanded);
    else {
      setSvgContent("");
      if (panZoomRef.current?.destroy) {
        try {
          panZoomRef.current.destroy();
        } catch {}
        panZoomRef.current = null;
      }
    }
  }, [expanded, loadSvgForMap]);

  // --- Upload de imagem (Cloudinary)
  const handleImageUpload = async (e, targetSetter) => {
    if (!isMestre) return;
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", "reqviem_upload");
      const res = await fetch("https://api.cloudinary.com/v1_1/dwaxw0l83/image/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.secure_url) {
        targetSetter((prev) => (prev ? prev + `\n\n![](${data.secure_url})\n` : `![](${data.secure_url})\n`));
      } else alert("Erro ao enviar imagem.");
    } catch {
      alert("Erro ao enviar imagem. Verifique a conexão.");
    }
  };

  // 🔹 Upload de SVG
  const handleFileUpload = async (e, mapId) => {
    if (!isMestre) return;
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const svgData = evt.target.result.trim();
        const compressed = LZString.compressToUTF16(svgData);
        const chunks = [];
        for (let i = 0; i < compressed.length; i += CHUNK_SIZE) {
          chunks.push(compressed.substring(i, i + CHUNK_SIZE));
        }
        const docData = {};
        chunks.forEach((c, idx) => (docData[`part_${idx + 1}`] = c));
        await setDoc(doc(db, "world", `Map_${mapId}`), docData);
        await loadSvgForMap(mapId);
      } catch (err) {
        console.error("Erro upload SVG:", err);
      }
    };
    reader.readAsText(file);
  };

  // 🔹 Funções para capítulos dos mapas
  const openChapterDialog = (mapId, index = null, e) => {
    if (e?.stopPropagation) e.stopPropagation();
    setCurrentMapEditing(mapId);
    setEditIndex(index);
    const list = chaptersMap[mapId] || [];
    setChapterTitle(index !== null ? list[index].title : "");
    setChapterText(index !== null ? list[index].text : "");
    setOpenDialog(true);
  };

  const saveChapterForMap = async () => {
    if (!currentMapEditing) return;
    const mapId = currentMapEditing;
    const existing = Array.isArray(chaptersMap[mapId]) ? [...chaptersMap[mapId]] : [];
    if (editIndex !== null) existing[editIndex] = { title: chapterTitle, text: chapterText };
    else existing.push({ title: chapterTitle, text: chapterText });
    await setDoc(doc(db, "world", `Chapters_${mapId}`), { list: existing });
    setOpenDialog(false);
  };

  const deleteChapterForMap = async (mapId, idx, e) => {
    if (e?.stopPropagation) e.stopPropagation();
    const existing = [...(chaptersMap[mapId] || [])];
    existing.splice(idx, 1);
    await setDoc(doc(db, "world", `Chapters_${mapId}`), { list: existing });
  };

  // 🔹 Crônica Global
  const openGlobalChapterDialog = (index = null, e) => {
    if (e?.stopPropagation) e.stopPropagation();
    setEditGlobalIndex(index);
    setGlobalTitle(index !== null ? globalChapters[index].title : "");
    setGlobalText(index !== null ? globalChapters[index].text : "");
    setOpenGlobalDialog(true);
  };

  const saveGlobalChapter = async () => {
    const existing = [...(globalChapters || [])];
    if (editGlobalIndex !== null) existing[editGlobalIndex] = { title: globalTitle, text: globalText };
    else existing.push({ title: globalTitle, text: globalText });
    await setDoc(doc(db, "world", "Chapters"), { list: existing });
    setOpenGlobalDialog(false);
  };

  const deleteGlobalChapter = async (idx, e) => {
    if (e?.stopPropagation) e.stopPropagation();
    const existing = [...(globalChapters || [])];
    existing.splice(idx, 1);
    await setDoc(doc(db, "world", "Chapters"), { list: existing });
  };

  const handleExpand = (mapId) => setExpanded((prev) => (prev === mapId ? null : mapId));

  // 🔹 Markdown com suporte ao lightbox (click on image opens lightbox)
  const renderMarkdown = (text) => (
    <div
      className="markdown-content"
      onClick={(e) => {
        if (e.target.tagName === "IMG") {
          setLightboxImage(e.target.src);
          setZoom(1);
        }
      }}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
    </div>
  );

  // === Lightbox handlers (igual ao chat) ===
  const handleLightboxWheel = (e) => {
    e.preventDefault();
    setZoom((z) => Math.min(Math.max(z + e.deltaY * -0.001, 0.5), 5));
  };

  // --- RENDERIZAÇÃO PRINCIPAL ---
  return (
    <Box sx={{ bgcolor: "#1e1e1e", minHeight: "100vh", color: "#fff", p: 2 }}>
      <style>{markdownStyles}</style>

      <Box sx={{ display: "flex", gap: 2, alignItems: "center", mb: 2 }}>
        <Button variant="contained" color="secondary" onClick={() => navigate("/")}>
          Voltar para Início
        </Button>
        <Typography variant="subtitle1" sx={{ color: "#fff" }}>
          Mapas recolhíveis — Clique para expandir!
        </Typography>
      </Box>

      {/* === MAPAS === */}
      {MAPS.map((m) => (
        <Accordion
          key={m.id}
          expanded={expanded === m.id}
          onChange={() => handleExpand(m.id)}
          sx={{ bgcolor: "#252525", mb: 1 }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: "#fff" }} />}>
            <Typography sx={{ flex: 1, color: "#fff" }}>{m.title}</Typography>
            {isMestre && (
              <Button
                variant="outlined"
                size="small"
                component="label"
                sx={{ ml: 1 }}
                onClick={(e) => e.stopPropagation()}
              >
                Upload SVG
                <input
                  hidden
                  accept=".svg"
                  type="file"
                  onChange={(e) => {
                    e.stopPropagation();
                    handleFileUpload(e, m.id);
                  }}
                />
              </Button>
            )}
          </AccordionSummary>

          <AccordionDetails
            sx={{
              bgcolor: "#1e1e1e",
              display: "flex",
              flexDirection: { xs: "column", md: "row" },
              gap: 2,
              height: { xs: "auto", md: "75vh" },
            }}
          >
            {/* Mapa */}
            <Box sx={{ flexBasis: { md: "70%" }, bgcolor: "#222", borderRadius: 1, overflow: "hidden", p: 1 }}>
              {expanded === m.id && (
                <div ref={(el) => (mapSvgRefs.current[m.id] = el)} style={{ width: "100%", height: "100%" }} />
              )}
            </Box>

            {/* Anotações */}
            <Box
              sx={{
                flexBasis: { md: "30%" },
                bgcolor: "#232323",
                p: 2,
                borderRadius: 1,
                overflow: "hidden",
                height: { md: "100%" },
                display: "flex",
                flexDirection: "column",
              }}
            >
              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1, alignItems: "center" }}>
                <Typography variant="h6" sx={{ color: "#fff" }}>
                  Anotações — {m.title}
                </Typography>
                {isMestre && (
                  <Button
                    startIcon={<AddIcon />}
                    size="small"
                    variant="contained"
                    onClick={(e) => openChapterDialog(m.id, null, e)}
                  >
                    Novo
                  </Button>
                )}
              </Box>
              <Divider sx={{ mb: 1 }} />

              <Box sx={{ overflowY: "auto", flex: 1 }}>
                {(chaptersMap[m.id] || []).length === 0 ? (
                  <Typography sx={{ color: "#999" }}>Nenhuma anotação.</Typography>
                ) : (
                  (chaptersMap[m.id] || []).map((ch, idx) => (
                    <Box key={idx} sx={{ mb: 1, p: 1, bgcolor: "#1a1a1a", borderRadius: 1 }}>
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <Typography sx={{ fontWeight: "bold", color: "#fff" }}>{ch.title}</Typography>
                        {isMestre && (
                          <Box>
                            <IconButton size="small" color="info" onClick={(e) => openChapterDialog(m.id, idx, e)}>
                              <EditIcon />
                            </IconButton>
                            <IconButton size="small" color="error" onClick={(e) => deleteChapterForMap(m.id, idx, e)}>
                              <DeleteIcon />
                            </IconButton>
                          </Box>
                        )}
                      </Box>
                      <Box sx={{ mt: 1, maxHeight: "calc(100vh - 350px)", overflowY: "auto" }}>
                        {renderMarkdown(ch.text)}
                      </Box>
                    </Box>
                  ))
                )}
              </Box>
            </Box>
          </AccordionDetails>
        </Accordion>
      ))}

      {/* === CRÔNICA GLOBAL === */}
      <Box sx={{ bgcolor: "#2a2a2a", p: 2, mt: 3, borderRadius: 1, mb: 3 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
          <Typography variant="h6" sx={{ color: "#fff" }}>
            Crônica Geral
          </Typography>
          {isMestre && (
            <Button startIcon={<AddIcon />} variant="contained" size="small" onClick={(e) => openGlobalChapterDialog(null, e)}>
              Novo
            </Button>
          )}
        </Box>

        {globalChapters.length === 0 ? (
          <Typography sx={{ color: "#aaa" }}>Nenhuma crônica global cadastrada.</Typography>
        ) : (
          globalChapters.map((ch, i) => (
            <Accordion key={i} sx={{ bgcolor: "#333", color: "#fff", mb: 1 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: "#fff" }} />}>
                <Typography sx={{ flex: 1, color: "#fff" }}>{ch.title}</Typography>
                {isMestre && (
                  <>
                    <IconButton size="small" color="info" onClick={(e) => openGlobalChapterDialog(i, e)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={(e) => deleteGlobalChapter(i, e)}>
                      <DeleteIcon />
                    </IconButton>
                  </>
                )}
              </AccordionSummary>
              <AccordionDetails>{renderMarkdown(ch.text)}</AccordionDetails>
            </Accordion>
          ))
        )}
      </Box>

      {/* === DIALOGOS === */}
      {/* Capítulos do Mapa */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} fullWidth maxWidth="md">
        <DialogTitle sx={{ bgcolor: "#1e1e1e", color: "#fff" }}>
          {editIndex !== null ? "Editar Capítulo" : "Novo Capítulo"}
        </DialogTitle>
        <DialogContent sx={{ bgcolor: "#1e1e1e" }}>
          <TextField
            label="Título"
            fullWidth
            value={chapterTitle}
            onChange={(e) => setChapterTitle(e.target.value)}
            sx={{ mb: 2 }}
            InputProps={{ style: { color: "#fff" } }}
            InputLabelProps={{ style: { color: "#ccc" } }}
          />
          <TextField
            label="Texto (Markdown, imagens)"
            fullWidth
            multiline
            minRows={8}
            value={chapterText}
            onChange={(e) => setChapterText(e.target.value)}
            InputProps={{ style: { color: "#fff" } }}
            InputLabelProps={{ style: { color: "#ccc" } }}
          />
          {isMestre && (
            <Box sx={{ mt: 2 }}>
              <Button variant="contained" component="label" startIcon={<UploadIcon />}>
                Upload Imagem
                <input hidden type="file" accept="image/*" onChange={(e) => handleImageUpload(e, setChapterText)} />
              </Button>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ bgcolor: "#1e1e1e" }}>
          <Button onClick={() => setOpenDialog(false)} sx={{ color: "#ccc" }}>
            Cancelar
          </Button>
          <Button variant="contained" startIcon={<SaveIcon />} onClick={saveChapterForMap}>
            Salvar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Crônica Global */}
      <Dialog open={openGlobalDialog} onClose={() => setOpenGlobalDialog(false)} fullWidth maxWidth="md">
        <DialogTitle sx={{ bgcolor: "#1e1e1e", color: "#fff" }}>
          {editGlobalIndex !== null ? "Editar Crônica Global" : "Nova Crônica Global"}
        </DialogTitle>
        <DialogContent sx={{ bgcolor: "#1e1e1e" }}>
          <TextField
            label="Título"
            fullWidth
            value={globalTitle}
            onChange={(e) => setGlobalTitle(e.target.value)}
            sx={{ mb: 2 }}
            InputProps={{ style: { color: "#fff" } }}
            InputLabelProps={{ style: { color: "#ccc" } }}
          />
          <TextField
            label="Texto (Markdown, imagens)"
            fullWidth
            multiline
            minRows={8}
            value={globalText}
            onChange={(e) => setGlobalText(e.target.value)}
            InputProps={{ style: { color: "#fff" } }}
            InputLabelProps={{ style: { color: "#ccc" } }}
          />
          {isMestre && (
            <Box sx={{ mt: 2 }}>
              <Button variant="contained" component="label" startIcon={<UploadIcon />}>
                Upload Imagem
                <input hidden type="file" accept="image/*" onChange={(e) => handleImageUpload(e, setGlobalText)} />
              </Button>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ bgcolor: "#1e1e1e" }}>
          <Button onClick={() => setOpenGlobalDialog(false)} sx={{ color: "#ccc" }}>
            Cancelar
          </Button>
          <Button variant="contained" startIcon={<SaveIcon />} onClick={saveGlobalChapter}>
            Salvar
          </Button>
        </DialogActions>
      </Dialog>

      {/* === LIGHTBOX (igual ao Chat) === */}
{/* === LIGHTBOX (igual ao Chat, com arrastar) === */}
{lightboxImage && (
  <div
    onClick={() => setLightboxImage(null)}
    onWheel={handleLightboxWheel}
    className="lightbox-overlay"
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

// src/components/SoundBoard.jsx
import React, { useState, useEffect, useRef } from "react";
import {
  Paper,
  Typography,
  Button,
  List,
  ListItem,
  ListItemText,
  Divider,
  Box,
  Slider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Chip,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import StopIcon from "@mui/icons-material/Stop";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import { db } from "../firebaseConfig";
import { doc, setDoc, onSnapshot } from "firebase/firestore";

// 🔹 Playlists padrão
const DEFAULT_MUSIC_LIST = [
  { name: "Aventura", url: "https://res.cloudinary.com/dwaxw0l83/video/upload/v1760632374/Aventura_wzo6of.mp3" },
  { name: "Batalha Final", url: "https://res.cloudinary.com/dwaxw0l83/video/upload/v1760632375/BatalhaFinal_dtaghp.mp3" },
  { name: "Batalha Medieval", url: "https://res.cloudinary.com/dwaxw0l83/video/upload/v1760632375/BatalhaMedieval_bqhfhq.mp3" },
  { name: "Vilarejo Feliz", url: "https://res.cloudinary.com/dwaxw0l83/video/upload/v1760632379/VilarejoFeliz_ytpk2v.mp3" },
  { name: "Misterioso", url: "https://res.cloudinary.com/dwaxw0l83/video/upload/v1760632377/Misterioso_myosst.mp3" },
];

const DEFAULT_AMBIANCE_LIST = [
  { name: "Taverna", url: "https://res.cloudinary.com/dwaxw0l83/video/upload/v1760632378/Taverna_wyfwlp.mp3" },
  { name: "Chuva", url: "https://res.cloudinary.com/dwaxw0l83/video/upload/v1760632375/Chuva_wewgga.m4a" },
  { name: "Trovoada", url: "https://res.cloudinary.com/dwaxw0l83/video/upload/v1760632378/Trovao_gatyrw.mp3" },
  { name: "Fogueira", url: "https://res.cloudinary.com/dwaxw0l83/video/upload/v1760632376/Fogueira_tjjv8t.mp3" },
];

export default function SoundBoard({ isMaster }) {
  const [musicTracks, setMusicTracks] = useState(DEFAULT_MUSIC_LIST);
  const [ambianceTracks, setAmbianceTracks] = useState(DEFAULT_AMBIANCE_LIST);
  const [othersTracks, setOthersTracks] = useState([]);

  // 🎵 Estados de reprodução
  const [activeTracks, setActiveTracks] = useState(new Set()); // 🟢 Várias faixas ativas
  const [volumes, setVolumes] = useState({});
  const audioRefs = useRef({});

  // Carregar biblioteca do Firestore
  useEffect(() => {
    const docs = [
      { id: "music", setter: setMusicTracks, fallback: DEFAULT_MUSIC_LIST },
      { id: "ambiance", setter: setAmbianceTracks, fallback: DEFAULT_AMBIANCE_LIST },
      { id: "others", setter: setOthersTracks, fallback: [] },
    ];

    const unsubs = docs.map((d) =>
      onSnapshot(doc(db, "soundLibrary", d.id), (snap) => {
        if (!snap.exists()) {
          d.setter(d.fallback);
          return;
        }
        const data = snap.data();
        d.setter(data.list || d.fallback);
      })
    );

    return () => unsubs.forEach((u) => u?.());
  }, []);

  // 🟢 PLAY (não para outras músicas)
const handlePlay = (url, name) => {
  if (!audioRefs.current[url]) {
    const audio = new Audio(url);
    audio.volume = (volumes[url] ?? 80) / 100;
    audio.addEventListener('ended', () => {
      setActiveTracks(prev => {
        const next = new Set(prev);
        next.delete(url);
        return next;
      });
    });
    audioRefs.current[url] = audio;
  }

  const audio = audioRefs.current[url];
  audio.play().catch(err => {
    console.error("Erro ao tocar áudio:", err);
    alert("Erro ao tocar áudio. Verifique o formato do arquivo.");
  });

  setActiveTracks(prev => new Set(prev).add(url));
};

// 🟢 STOP (apenas a faixa específica)
const handleStop = (url) => {
  const audio = audioRefs.current[url];
  if (audio) {
    audio.pause();
    audio.currentTime = 0;
  }
  setActiveTracks(prev => {
    const next = new Set(prev);
    next.delete(url);
    return next;
  });
};

// 🟢 STOP ALL (para todas as faixas ativas)
const handleStopAll = () => {
  activeTracks.forEach(url => {
    const audio = audioRefs.current[url];
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
  });
  setActiveTracks(new Set());
};

  const handleVolumeChange = (url, newVolume) => {
    setVolumes(prev => ({ ...prev, [url]: newVolume }));
    const audio = audioRefs.current[url];
    if (audio) {
      audio.volume = newVolume / 100;
    }
  };

  // -------------------------
  // ---- Library editing ----
  // -------------------------
  const [openLibDialog, setOpenLibDialog] = useState(false);
  const [libMode, setLibMode] = useState("music");
  const [editIndex, setEditIndex] = useState(null);
  const [libName, setLibName] = useState("");
  const [selectedFile, setSelectedFile] = useState(null); // 🟢 Arquivo selecionado
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef();

  const writeLibraryDoc = async (docId, list) => {
    await setDoc(doc(db, "soundLibrary", docId), { list });
  };

  const openAddDialog = (category) => {
    setLibMode(category);
    setEditIndex(null);
    setLibName("");
    setSelectedFile(null);
    setOpenLibDialog(true);
  };

  const openEditDialog = (category, idx) => {
    setLibMode(category);
    setEditIndex(idx);
    const list = category === "music" ? musicTracks : 
                 category === "ambiance" ? ambianceTracks : othersTracks;
    const entry = list[idx];
    setLibName(entry?.name || "");
    setSelectedFile(null); // na edição, não mexemos no arquivo a menos que seja trocado
    setOpenLibDialog(true);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const uploadToBackend = async (file) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("https://reqviem.onrender.com/upload", {
        method: "POST",
        body: formData,
        mode: 'cors',
        credentials: 'include',
      });
      if (!res.ok) {
        const errorText = await res.text();
        console.error('Erro no upload:', errorText);
        throw new Error(`Upload falhou: ${res.status}`);
      }
      const data = await res.json();
      console.log('✅ Upload sucesso:', data.url);
      return data?.url || null;
    } catch (err) {
      console.error("Erro no upload:", err);
      alert("Erro ao enviar arquivo. Verifique o console.");
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSaveLibrary = async () => {
    if (!libName.trim()) {
      alert("Informe o nome da faixa.");
      return;
    }

    let urlToUse = null;

    // Se estamos editando e não foi selecionado novo arquivo, mantém a URL original
    if (editIndex !== null && !selectedFile) {
      const list = libMode === "music" ? musicTracks : libMode === "ambiance" ? ambianceTracks : othersTracks;
      urlToUse = list[editIndex]?.url;
    }

    // Se há arquivo selecionado, faz upload
    if (selectedFile) {
      const uploadedUrl = await uploadToBackend(selectedFile);
      if (!uploadedUrl) return;
      urlToUse = uploadedUrl;
    }

    if (!urlToUse) {
      alert("Selecione um arquivo de áudio.");
      return;
    }

    const targetDoc = libMode;
    const currentList = targetDoc === "music" ? musicTracks : 
                       targetDoc === "ambiance" ? ambianceTracks : othersTracks;
    const newList = [...currentList];

    if (editIndex !== null) {
      newList[editIndex] = { name: libName.trim(), url: urlToUse };
    } else {
      newList.push({ name: libName.trim(), url: urlToUse });
    }

    await writeLibraryDoc(targetDoc, newList);

    if (targetDoc === "music") setMusicTracks(newList);
    else if (targetDoc === "ambiance") setAmbianceTracks(newList);
    else setOthersTracks(newList);

    setLibName("");
    setSelectedFile(null);
    setOpenLibDialog(false);
  };

  const handleDeleteLibrary = async (category, idx) => {
    if (!confirm("Excluir essa faixa do acervo?")) return;
    const list = category === "music" ? [...musicTracks] : 
                 category === "ambiance" ? [...ambianceTracks] : [...othersTracks];
    list.splice(idx, 1);
    await writeLibraryDoc(category, list);
    if (category === "music") setMusicTracks(list);
    else if (category === "ambiance") setAmbianceTracks(list);
    else setOthersTracks(list);
  };

  // 🎨 RENDERIZAÇÃO COM PLAY ANTES DO NOME
  function renderList(title, tracks, category) {
    return (
      <>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mt: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
            {title}
          </Typography>
          {isMaster && (
            <Button
              size="small"
              startIcon={<AddIcon />}
              variant="contained"
              onClick={() => openAddDialog(category)}
            >
              Adicionar
            </Button>
          )}
        </Box>

        <List dense>
          {tracks.map((t, i) => {
            const isPlaying = activeTracks.has(t.url);
            const trackVolume = volumes[t.url] ?? 80;
            return (
              <ListItem key={i} divider sx={{ flexDirection: "column", alignItems: "stretch" }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, width: "100%" }}>
                  {isPlaying ? (
  <IconButton color="error" onClick={() => handleStop(t.url)} size="small">
    <StopIcon />
  </IconButton>
) : (
  <IconButton color="primary" onClick={() => handlePlay(t.url, t.name)} size="small">
    <PlayArrowIcon />
  </IconButton>
)}
                  <ListItemText 
                    primary={t.name} 
                    sx={{ 
                      flex: 1,
                      '& .MuiListItemText-primary': {
                        fontWeight: isPlaying ? 'bold' : 'normal',
                        color: isPlaying ? '#4CAF50' : 'inherit'
                      }
                    }}
                  />
                  {isMaster && (
                    <Box>
                      <IconButton size="small" onClick={() => openEditDialog(category, i)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" color="error" onClick={() => handleDeleteLibrary(category, i)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  )}
                </Box>
                {isPlaying && (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1, pl: 4 }}>
                    <Typography variant="caption" sx={{ minWidth: 45 }}>
                      Vol:
                    </Typography>
                    <Slider
                      size="small"
                      value={trackVolume}
                      onChange={(_, v) => handleVolumeChange(t.url, v)}
                      min={0}
                      max={100}
                      sx={{ flex: 1 }}
                    />
                    <Typography variant="caption" sx={{ minWidth: 35 }}>
                      {trackVolume}%
                    </Typography>
                  </Box>
                )}
              </ListItem>
            );
          })}
        </List>
      </>
    );
  }

  if (!isMaster) {
    return (
      <Paper sx={{ p: 2, mt: 2, height: "50vh", overflowY: "auto" }}>
        <Typography variant="h6" sx={{ mb: 1 }}>🎵 Trilha Sonora</Typography>
        <Typography variant="body2" color="text.secondary">
          Aguardando o mestre tocar as músicas...
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 2, mt: 2, height: "50vh", overflowY: "auto" }}>
      <Typography variant="h6" sx={{ mb: 1, fontWeight: "bold" }}>
        🎵 Trilha Sonora
      </Typography>

      {renderList("🎶 Músicas", musicTracks, "music")}
      <Divider sx={{ my: 1 }} />
      {renderList("🌲 Ambientes", ambianceTracks, "ambiance")}
      <Divider sx={{ my: 1 }} />
      {renderList("🎧 Outros", othersTracks, "others")}

      {/* Modal de Adicionar/Editar */}
      <Dialog open={openLibDialog} onClose={() => setOpenLibDialog(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editIndex !== null ? "Editar Faixa" : "Adicionar Faixa"}</DialogTitle>
        <DialogContent>
          <TextField
            label="Nome da Faixa"
            fullWidth
            value={libName}
            onChange={(e) => setLibName(e.target.value)}
            sx={{ mb: 2, mt: 1 }}
          />

          {/* 🟢 Área de upload de arquivo (sem URL) */}
          <Box sx={{ mb: 2 }}>
            {!selectedFile ? (
              <Button
                variant="outlined"
                component="label"
                startIcon={<AttachFileIcon />}
                fullWidth
              >
                Selecionar arquivo de áudio
                <input
                  hidden
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*"
                  onChange={handleFileSelect}
                />
              </Button>
            ) : (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                <Chip
                  icon={<AttachFileIcon />}
                  label={`${selectedFile.name} (${(selectedFile.size / 1024 / 1024).toFixed(2)} MB)`}
                  onDelete={clearSelectedFile}
                  color="primary"
                  variant="outlined"
                />
                <Button size="small" onClick={clearSelectedFile}>
                  Trocar
                </Button>
              </Box>
            )}
            {editIndex !== null && !selectedFile && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
                Manter arquivo atual (selecione um novo apenas para substituir).
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenLibDialog(false)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleSaveLibrary}
            disabled={uploading || (!selectedFile && editIndex === null)}
          >
            {uploading ? "Enviando..." : "Salvar"}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
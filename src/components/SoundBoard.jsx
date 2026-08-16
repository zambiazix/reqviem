import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from "react";
import {
  Paper, Typography, Button, List, ListItem, ListItemText,
  Divider, Box, Slider, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, IconButton, Chip,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import StopIcon from "@mui/icons-material/Stop";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import { db } from "../firebaseConfig";
import { doc, setDoc, onSnapshot } from "firebase/firestore";
import { useAudio } from "../context/AudioProvider";

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

// 🟢 FUNÇÃO PARA NORMALIZAR URL
const normalizarUrl = (url) => (url || "").trim().replace(/\/+$/, "").toLowerCase();

// 🟢 COMPONENTE DE TRACK MEMOIZADO
const TrackItem = memo(({ 
  track, isPlaying, isMaster, volumes, 
  onPlay, onStop, onVolumeChange, onEdit, onDelete 
}) => {
  const trackVolume = volumes[track.url] ?? 80;
  
  return (
    <ListItem divider sx={{ flexDirection: "column", alignItems: "stretch", contentVisibility: 'auto', containIntrinsicSize: 'auto 50px' }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, width: "100%" }}>
        {isPlaying ? (
          <IconButton color="error" onClick={() => onStop(track.url)} size="small">
            <StopIcon fontSize="small" />
          </IconButton>
        ) : (
          <IconButton color="primary" onClick={() => onPlay(track.url, track.name)} size="small">
            <PlayArrowIcon fontSize="small" />
          </IconButton>
        )}
        <ListItemText 
          primary={track.name} 
          sx={{ 
            flex: 1,
            '& .MuiListItemText-primary': {
              fontWeight: isPlaying ? 'bold' : 'normal',
              color: isPlaying ? '#4CAF50' : 'inherit',
              fontSize: '0.8rem',
            }
          }}
        />
        {isMaster && (
          <Box sx={{ display: 'flex', flexShrink: 0 }}>
            <IconButton size="small" onClick={() => onEdit()} sx={{ p: 0.5 }}>
              <EditIcon fontSize="small" />
            </IconButton>
            <IconButton size="small" color="error" onClick={() => onDelete()} sx={{ p: 0.5 }}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Box>
        )}
      </Box>
      {isPlaying && (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1, pl: 4 }}>
          <Typography variant="caption" sx={{ minWidth: 45, fontSize: '0.6rem' }}>Vol:</Typography>
          <Slider
            size="small"
            value={trackVolume}
            onChange={(_, v) => onVolumeChange(track.url, v)}
            min={0}
            max={100}
            sx={{ flex: 1 }}
          />
          <Typography variant="caption" sx={{ minWidth: 35, fontSize: '0.6rem' }}>{trackVolume}%</Typography>
        </Box>
      )}
    </ListItem>
  );
});

// 🟢 COMPONENTE DE LISTA MEMOIZADO
const TrackList = memo(({ title, tracks, category, isMaster, playingTracks, volumes, onPlay, onStop, onVolumeChange, onEdit, onDelete, onAdd }) => (
  <>
    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mt: 1 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: "bold", fontSize: '0.9rem' }}>
        {title}
      </Typography>
      {isMaster && (
        <Button
          size="small"
          startIcon={<AddIcon />}
          variant="contained"
          onClick={() => onAdd(category)}
          sx={{ minWidth: 'auto', px: 1 }}
        >
          Adicionar
        </Button>
      )}
    </Box>

    <List dense>
      {tracks.map((t, i) => {
        const normalizedUrl = normalizarUrl(t.url);
        const isPlaying = Array.isArray(playingTracks) && playingTracks.includes(normalizedUrl);
        
        return (
          <TrackItem
            key={`${category}-${i}-${t.url}`}
            track={t}
            isPlaying={isPlaying}
            isMaster={isMaster}
            volumes={volumes}
            onPlay={onPlay}
            onStop={onStop}
            onVolumeChange={onVolumeChange}
            onEdit={() => onEdit(category, i)}
            onDelete={() => onDelete(category, i)}
          />
        );
      })}
    </List>
  </>
));

export default function SoundBoard({ isMaster }) {
  const { playMusic, pauseMusic, stopAllMusic, setVolume, playingTracks, unlockAudio } = useAudio();
  
  const [musicTracks, setMusicTracks] = useState(DEFAULT_MUSIC_LIST);
  const [ambianceTracks, setAmbianceTracks] = useState(DEFAULT_AMBIANCE_LIST);
  const [othersTracks, setOthersTracks] = useState([]);
  const [volumes, setVolumes] = useState({});

  // 🟢 Carregar biblioteca do Firestore (com cleanup otimizado)
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

  // 🟢 CALLBACKS MEMOIZADOS
  const handlePlay = useCallback((url, name) => {
    unlockAudio();
    playMusic(url, name);
  }, [unlockAudio, playMusic]);

  const handleStop = useCallback((url) => {
    pauseMusic(url);
  }, [pauseMusic]);

  const handleVolumeChange = useCallback((url, newVolume) => {
    setVolumes(prev => ({ ...prev, [url]: newVolume }));
    setVolume(url, newVolume);
  }, [setVolume]);

  // 🟢 ESTADOS DO MODAL
  const [openLibDialog, setOpenLibDialog] = useState(false);
  const [libMode, setLibMode] = useState("music");
  const [editIndex, setEditIndex] = useState(null);
  const [libName, setLibName] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef();

  // 🟢 WRITE LIBRARY DOC (MEMOIZADO)
  const writeLibraryDoc = useCallback(async (docId, list) => {
    await setDoc(doc(db, "soundLibrary", docId), { list });
  }, []);

  // 🟢 OPEN ADD DIALOG
  const openAddDialog = useCallback((category) => {
    setLibMode(category);
    setEditIndex(null);
    setLibName("");
    setSelectedFile(null);
    setOpenLibDialog(true);
  }, []);

  // 🟢 OPEN EDIT DIALOG
  const openEditDialog = useCallback((category, idx) => {
    setLibMode(category);
    setEditIndex(idx);
    const list = category === "music" ? musicTracks : 
                 category === "ambiance" ? ambianceTracks : othersTracks;
    const entry = list[idx];
    setLibName(entry?.name || "");
    setSelectedFile(null);
    setOpenLibDialog(true);
  }, [musicTracks, ambianceTracks, othersTracks]);

  // 🟢 HANDLE FILE SELECT
  const handleFileSelect = useCallback((e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  }, []);

  // 🟢 CLEAR SELECTED FILE
  const clearSelectedFile = useCallback(() => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  // 🟢 UPLOAD TO BACKEND (OTIMIZADO)
  const uploadToBackend = useCallback(async (file) => {
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
  }, []);

  // 🟢 HANDLE SAVE LIBRARY (OTIMIZADO)
  const handleSaveLibrary = useCallback(async () => {
    if (!libName.trim()) {
      alert("Informe o nome da faixa.");
      return;
    }

    let urlToUse = null;

    if (editIndex !== null && !selectedFile) {
      const list = libMode === "music" ? musicTracks : libMode === "ambiance" ? ambianceTracks : othersTracks;
      urlToUse = list[editIndex]?.url;
    }

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
  }, [libName, editIndex, selectedFile, libMode, musicTracks, ambianceTracks, othersTracks, uploadToBackend, writeLibraryDoc]);

  // 🟢 HANDLE DELETE LIBRARY (OTIMIZADO)
  const handleDeleteLibrary = useCallback(async (category, idx) => {
    if (!window.confirm("Excluir essa faixa do acervo?")) return;
    const list = category === "music" ? [...musicTracks] : 
                 category === "ambiance" ? [...ambianceTracks] : [...othersTracks];
    list.splice(idx, 1);
    await writeLibraryDoc(category, list);
    if (category === "music") setMusicTracks(list);
    else if (category === "ambiance") setAmbianceTracks(list);
    else setOthersTracks(list);
  }, [musicTracks, ambianceTracks, othersTracks, writeLibraryDoc]);

  // 🟢 MEMOIZAR PLAYING TRACKS PARA PERFORMANCE
  const playingTracksMemo = useMemo(() => {
    if (Array.isArray(playingTracks)) return playingTracks;
    if (typeof playingTracks === 'object' && playingTracks !== null) {
      return Object.keys(playingTracks).filter(key => playingTracks[key]);
    }
    return [];
  }, [playingTracks]);

  if (!isMaster) {
    return (
      <Paper sx={{ p: 2, mt: 2, height: "50vh", overflowY: "auto", WebkitOverflowScrolling: 'touch' }}>
        <Typography variant="h6" sx={{ mb: 1 }}>🎵 Trilha Sonora</Typography>
        <Typography variant="body2" color="text.secondary">
          Aguardando o mestre tocar as músicas...
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ 
      p: 2, 
      mt: 2, 
      height: "50vh", 
      overflowY: "auto", 
      WebkitOverflowScrolling: 'touch',
      '&::-webkit-scrollbar': { width: '4px' },
      '&::-webkit-scrollbar-thumb': { background: 'rgba(0,224,255,0.2)', borderRadius: '10px' },
    }}>
      <Typography variant="h6" sx={{ mb: 1, fontWeight: "bold" }}>
        🎵 Trilha Sonora
      </Typography>

      <TrackList
        title="🎶 Músicas"
        tracks={musicTracks}
        category="music"
        isMaster={isMaster}
        playingTracks={playingTracksMemo}
        volumes={volumes}
        onPlay={handlePlay}
        onStop={handleStop}
        onVolumeChange={handleVolumeChange}
        onEdit={openEditDialog}
        onDelete={handleDeleteLibrary}
        onAdd={openAddDialog}
      />
      <Divider sx={{ my: 1 }} />
      <TrackList
        title="🌲 Ambientes"
        tracks={ambianceTracks}
        category="ambiance"
        isMaster={isMaster}
        playingTracks={playingTracksMemo}
        volumes={volumes}
        onPlay={handlePlay}
        onStop={handleStop}
        onVolumeChange={handleVolumeChange}
        onEdit={openEditDialog}
        onDelete={handleDeleteLibrary}
        onAdd={openAddDialog}
      />
      <Divider sx={{ my: 1 }} />
      <TrackList
        title="🎧 Outros"
        tracks={othersTracks}
        category="others"
        isMaster={isMaster}
        playingTracks={playingTracksMemo}
        volumes={volumes}
        onPlay={handlePlay}
        onStop={handleStop}
        onVolumeChange={handleVolumeChange}
        onEdit={openEditDialog}
        onDelete={handleDeleteLibrary}
        onAdd={openAddDialog}
      />

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
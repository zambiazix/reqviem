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
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import { db } from "../firebaseConfig";
import { doc, setDoc, onSnapshot, serverTimestamp } from "firebase/firestore";
import { useAudio } from "../context/AudioProvider";

// 🔹 Playlists completas (defaults) - FORA DO COMPONENTE
const DEFAULT_MUSIC_LIST = [
  { name: "Aventura", url: "https://res.cloudinary.com/dwaxw0l83/video/upload/v1760632374/Aventura_wzo6of.mp3" },
  { name: "Batalha Final", url: "https://res.cloudinary.com/dwaxw0l83/video/upload/v1760632375/BatalhaFinal_dtaghp.mp3" },
  { name: "Batalha Marítima", url: "https://res.cloudinary.com/dwaxw0l83/video/upload/v1760632374/BatalhaMaritima_tmybyz.mp3" },
  { name: "Batalha Medieval", url: "https://res.cloudinary.com/dwaxw0l83/video/upload/v1760632375/BatalhaMedieval_bqhfhq.mp3" },
  { name: "Batalha Militar", url: "https://res.cloudinary.com/dwaxw0l83/video/upload/v1760632374/BatalhaMilitar_rmd0wb.mp3" },
  { name: "Batalha em Grupo", url: "https://res.cloudinary.com/dwaxw0l83/video/upload/v1760632374/BatalhaEmGrupo_eftntu.mp3" },
  { name: "Cidade Chuvosa", url: "https://res.cloudinary.com/dwaxw0l83/video/upload/v1760632374/CidadeChuvosa_jkfkon.mp3" },
  { name: "Cidade Nova", url: "https://res.cloudinary.com/dwaxw0l83/video/upload/v1760632375/CidadeNova_vdmsos.mp3" },
  { name: "Vilarejo Feliz", url: "https://res.cloudinary.com/dwaxw0l83/video/upload/v1760632379/VilarejoFeliz_ytpk2v.mp3" },
  { name: "Volta Para Casa", url: "https://res.cloudinary.com/dwaxw0l83/video/upload/v1760632381/VoltaParaCasa_fyco7w.mp3" },
  { name: "Viagem", url: "https://res.cloudinary.com/dwaxw0l83/video/upload/v1760632379/Viagem_qbhqn1.mp3" },
  { name: "Lúdico", url: "https://res.cloudinary.com/dwaxw0l83/video/upload/v1760632377/Ludico_c9u8qp.mp3" },
  { name: "Misterioso", url: "https://res.cloudinary.com/dwaxw0l83/video/upload/v1760632377/Misterioso_myosst.mp3" },
  { name: "Inverno", url: "https://res.cloudinary.com/dwaxw0l83/video/upload/v1760632377/Inverno_qs6qqy.mp3" },
];

const DEFAULT_AMBIANCE_LIST = [
  { name: "Taverna", url: "https://res.cloudinary.com/dwaxw0l83/video/upload/v1760632378/Taverna_wyfwlp.mp3" },
  { name: "Taverna 1", url: "https://res.cloudinary.com/dwaxw0l83/video/upload/v1760632378/Taverna1_gqd4z2.mp3" },
  { name: "Trovoada", url: "https://res.cloudinary.com/dwaxw0l83/video/upload/v1760632378/Trovao_gatyrw.mp3" },
  { name: "Trovoada 1", url: "https://res.cloudinary.com/dwaxw0l83/video/upload/v1760632378/Trovao1_wmrou8.mp3" },
  { name: "Chuva", url: "https://res.cloudinary.com/dwaxw0l83/video/upload/v1760632375/Chuva_wewgga.m4a" },
  { name: "Chuva 2", url: "https://res.cloudinary.com/dwaxw0l83/video/upload/v1760632373/Chuva2_mvi8qy.mp3" },
  { name: "Rio", url: "https://res.cloudinary.com/dwaxw0l83/video/upload/v1760632378/Rio_y4eowq.mp3" },
  { name: "Navio", url: "https://res.cloudinary.com/dwaxw0l83/video/upload/v1760632377/Navio_lksrzd.mp3" },
  { name: "Navio Ambiente", url: "https://res.cloudinary.com/dwaxw0l83/video/upload/v1760632377/NavioAmbiente_ogt70q.mp3" },
  { name: "Coliseu", url: "https://res.cloudinary.com/dwaxw0l83/video/upload/v1760632375/Coliseu_fnlnbu.mp3" },
  { name: "Fogueira", url: "https://res.cloudinary.com/dwaxw0l83/video/upload/v1760632376/Fogueira_tjjv8t.mp3" },
  { name: "Pessoas Conversando", url: "https://res.cloudinary.com/dwaxw0l83/video/upload/v1760632378/PessoasConversando_rz7whs.mp3" },
  { name: "Compras na Cidade", url: "https://res.cloudinary.com/dwaxw0l83/video/upload/v1760632375/ComprasNaCidade_n16mul.mp3" },
  { name: "Infiltração", url: "https://res.cloudinary.com/dwaxw0l83/video/upload/v1760632376/Infiltracao_fkszbd.mp3" },
  { name: "Deserto", url: "https://res.cloudinary.com/dwaxw0l83/video/upload/v1760632376/Deserto_olyldk.mp3" },
  { name: "Perseguição", url: "https://res.cloudinary.com/dwaxw0l83/video/upload/v1760632378/Perseguicao_pl9qww.mp3" },
];

export default function SoundBoard({ isMaster }) {
  const [musicTracks, setMusicTracks] = useState(DEFAULT_MUSIC_LIST);
  const [ambianceTracks, setAmbianceTracks] = useState(DEFAULT_AMBIANCE_LIST);
  const [othersTracks, setOthersTracks] = useState([]);
  const [volumes, setVolumes] = useState({});
  const unsubRef = useRef(null);
  const saveTimeoutRef = useRef(null);

  const {
    playMusic,
    pauseMusic,
    stopAllMusic,
    setVolume,
    getVolume,
    playingTracks,
    unlockAudio,
  } = useAudio();

  const getMusicUrl = (u) => {
    if (!u) return "";
    if (/^https?:\/\//i.test(u)) return u.trim();
    return u;
  };
  
  const normalizeUrl = (url = "") => (url || "").trim().replace(/\/+$/, "").toLowerCase();

  // --- Firestore: load library docs and keep them synced ---
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

    return () => {
      unsubs.forEach((u) => u && u());
    };
  }, []);

  // 🎵 Reproduzir
  async function handlePlay(url) {
  console.log('🎵 SoundBoard: handlePlay chamado para:', url);
  await unlockAudio();
  const normalizedUrl = normalizeUrl(getMusicUrl(url));
  console.log('🎵 SoundBoard: URL normalizada:', normalizedUrl);
  playMusic(normalizedUrl);
  setVolumes((p) => ({ ...p, [normalizedUrl]: 100 }));
  scheduleSave(buildState(normalizedUrl, true, 100));
}

  function handleStop(url) {
  console.log('🎵 SoundBoard: handleStop chamado para:', url);
  pauseMusic(url);
  setVolumes((p) => {
    const copy = { ...p };
    delete copy[url];
    return copy;
  });
  scheduleSave(buildState(url, false));
}

  function handleStopAll() {
    stopAllMusic();
    setVolumes({});
    scheduleSave([]);
  }

  function handleVolume(url, value) {
    setVolume(url, value);
    setVolumes((p) => ({ ...p, [url]: value }));
    scheduleSave(buildState(url, true, value));
  }

  function buildState(changedUrl, playing, volume) {
    return [...new Set([...playingTracks, changedUrl])]
      .filter((u) => playingTracks.includes(u) || u === changedUrl)
      .map((u) => ({
        url: u,
        playing: u === changedUrl ? playing : playingTracks.includes(u),
        volume: u === changedUrl ? volume : volumes[u] ?? 100,
      }));
  }

  function scheduleSave(state) {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => saveToFirestore(state), 400);
  }

  async function saveToFirestore(state) {
    const cleanState = state.filter(s => s.url && s.playing !== undefined && s.volume !== undefined);
    await setDoc(doc(db, "sound", "current"), {
      sounds: cleanState,
      updatedAt: serverTimestamp(),
    });
  }

  // 🔁 Sincronização Firestore (para não-mestres)
  useEffect(() => {
    if (!isMaster) {
      unsubRef.current = onSnapshot(doc(db, "sound", "current"), (snap) => {
        const data = snap.data();
        if (!data?.sounds) return;
        data.sounds.forEach(({ url, playing, volume }) => {
          if (playing) {
            playMusic(url);
            setVolume(url, volume);
          } else {
            pauseMusic(url);
          }
        });
      });
    }
    return () => unsubRef.current && unsubRef.current();
  }, [isMaster]);

  // 🔊 Atualizar volumes visuais
  useEffect(() => {
    const updated = {};
    playingTracks.forEach((url) => {
      updated[url] = Math.round((getVolume(url) ?? 1) * 100);
    });
    setVolumes((p) => ({ ...p, ...updated }));
  }, [playingTracks]);

  if (!isMaster) return null;

  // -------------------------
  // ---- Library editing ----
  // -------------------------
  const [openLibDialog, setOpenLibDialog] = useState(false);
  const [libMode, setLibMode] = useState("music");
  const [editIndex, setEditIndex] = useState(null);
  const [libName, setLibName] = useState("");
  const [libUrl, setLibUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef();

  const writeLibraryDoc = async (docId, list) => {
    await setDoc(doc(db, "soundLibrary", docId), { list });
  };

  const openAddDialog = (category) => {
    setLibMode(category);
    setEditIndex(null);
    setLibName("");
    setLibUrl("");
    setOpenLibDialog(true);
  };

  const openEditDialog = (category, idx) => {
    setLibMode(category);
    setEditIndex(idx);
    const list = category === "music" ? musicTracks : category === "ambiance" ? ambianceTracks : othersTracks;
    const entry = list[idx];
    setLibName(entry?.name || "");
    setLibUrl(entry?.url || "");
    setOpenLibDialog(true);
  };

  const uploadToBackend = async (file) => {
  setUploading(true);
  try {
    const formData = new FormData();
    formData.append("file", file);
    
    const res = await fetch("https://reqviem.onrender.com/upload", {
      method: "POST",
      body: formData,
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error('Erro no upload:', errorText);
      throw new Error(`Upload falhou: ${res.status}`);
    }
    
    const data = await res.json();
    setUploading(false);
    
    if (data?.url) {
      console.log('✅ Upload sucesso:', data.url);
      return data.url;
    }
    throw new Error("Upload falhou - sem URL");
  } catch (err) {
    setUploading(false);
    console.error("Erro no upload:", err);
    alert("Erro ao enviar arquivo.");
    throw err;
  }
};

  const handleSaveLibrary = async () => {
    let urlToUse = libUrl?.trim();
    const file = fileInputRef.current?.files?.[0];
    
    if (file) {
      try {
        urlToUse = await uploadToBackend(file);
      } catch {
        return;
      }
    }

    if (!libName.trim() || !urlToUse) {
      alert("Informe o nome e o link/arquivo da faixa.");
      return;
    }

    const targetDoc = libMode;
    const currentList = (targetDoc === "music" ? musicTracks : targetDoc === "ambiance" ? ambianceTracks : othersTracks) || [];
    const newList = [...currentList];

    if (editIndex !== null) {
      newList[editIndex] = { name: libName.trim(), url: urlToUse.trim() };
    } else {
      newList.push({ name: libName.trim(), url: urlToUse.trim() });
    }

    await writeLibraryDoc(targetDoc, newList);

    if (targetDoc === "music") setMusicTracks(newList);
    else if (targetDoc === "ambiance") setAmbianceTracks(newList);
    else setOthersTracks(newList);

    setLibName("");
    setLibUrl("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    setOpenLibDialog(false);
  };

  const handleDeleteLibrary = async (category, idx) => {
    if (!confirm("Excluir essa faixa do acervo?")) return;
    const list = category === "music" ? [...musicTracks] : category === "ambiance" ? [...ambianceTracks] : [...othersTracks];
    list.splice(idx, 1);
    await writeLibraryDoc(category, list);
    if (category === "music") setMusicTracks(list);
    else if (category === "ambiance") setAmbianceTracks(list);
    else setOthersTracks(list);
  };

  function renderList(title, tracks, category) {
    return (
      <>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mt: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
            {title}
          </Typography>
          <Box>
            <Button
              size="small"
              startIcon={<AddIcon />}
              variant="contained"
              onClick={() => openAddDialog(category)}
              sx={{ mr: 1 }}
            >
              Adicionar
            </Button>
          </Box>
        </Box>

        <List dense>
          {tracks.map((t, i) => {
            const canonical = normalizeUrl(getMusicUrl(t.url));
            const playing = playingTracks.includes(canonical);
            const vol100 = volumes[canonical] ?? 100;
            return (
              <ListItem
                key={i}
                divider
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  gap: 1,
                }}
                secondaryAction={
                  <Box>
                    <IconButton size="small" onClick={() => openEditDialog(category, i)} title="Editar faixa">
                      <EditIcon />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDeleteLibrary(category, i)} title="Excluir faixa">
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                }
              >
                <ListItemText primary={t.name} />
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    width: "100%",
                    justifyContent: "space-between",
                  }}
                >
                  {playing ? (
                    <Button variant="outlined" size="small" color="error" onClick={() => handleStop(t.url)}>
                      Parar
                    </Button>
                  ) : (
                    <Button variant="contained" size="small" onClick={() => handlePlay(t.url)}>
                      Play
                    </Button>
                  )}
                  <Box sx={{ flex: 1, ml: 1 }}>
                    <Slider
                      value={vol100}
                      onChange={(_, v) => handleVolume(t.url, Array.isArray(v) ? v[0] : v)}
                      min={0}
                      max={100}
                    />
                  </Box>
                </Box>
              </ListItem>
            );
          })}
        </List>
      </>
    );
  }

  const LibDialog = () => (
    <Dialog open={openLibDialog} onClose={() => setOpenLibDialog(false)} fullWidth maxWidth="sm">
      <DialogTitle>{editIndex !== null ? "Editar Faixa" : "Adicionar Faixa"}</DialogTitle>
      <DialogContent>
        <TextField
          label="Nome da Faixa"
          fullWidth
          value={libName}
          onChange={(e) => setLibName(e.target.value)}
          sx={{ mb: 2 }}
        />
        <TextField
          label="URL (ou deixe em branco para usar upload)"
          fullWidth
          value={libUrl}
          onChange={(e) => setLibUrl(e.target.value)}
          sx={{ mb: 2 }}
        />
        <Box sx={{ display: "flex", gap: 2, alignItems: "center", mb: 1 }}>
          <Button variant="contained" component="label">
            Selecionar Arquivo (upload)
            <input hidden ref={fileInputRef} type="file" accept="audio/*" />
          </Button>
          <Typography variant="caption" color="text.secondary">
            Ou cole a URL direta no campo acima.
          </Typography>
        </Box>
        {uploading && <Typography variant="body2">Enviando arquivo...</Typography>}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setOpenLibDialog(false)}>Cancelar</Button>
        <Button variant="contained" onClick={handleSaveLibrary}>
          {editIndex !== null ? "Salvar Alterações" : "Adicionar"}
        </Button>
      </DialogActions>
    </Dialog>
  );

  return (
    <Paper
      sx={{
        p: 2,
        mt: 2,
        height: "50vh",
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Typography variant="h6" sx={{ mb: 1, fontWeight: "bold" }}>
        🎵 Trilha Sonora
      </Typography>

      {renderList("🎶 Músicas", musicTracks, "music")}
      <Divider sx={{ my: 1 }} />
      {renderList("🌲 Ambientes", ambianceTracks, "ambiance")}
      <Divider sx={{ my: 1 }} />
      {renderList("🎧 Outros", othersTracks, "others")}

      {playingTracks.length > 0 && (
        <Button variant="outlined" color="error" fullWidth sx={{ mt: 1 }} onClick={handleStopAll}>
          Parar Todos
        </Button>
      )}

      <LibDialog />
    </Paper>
  );
}
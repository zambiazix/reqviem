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
} from "@mui/material";
import { db } from "../firebaseConfig";
import { doc, setDoc, onSnapshot, serverTimestamp } from "firebase/firestore";
import { useAudio } from "../context/AudioProvider";

export default function SoundBoard({ isMaster }) {
  const [musicTracks, setMusicTracks] = useState([]);
  const [ambianceTracks, setAmbianceTracks] = useState([]);
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

  // 🔗 Normalização e URL absoluta
  const getMusicUrl = (u) => {
    if (!u) return "";
    if (/^https?:\/\//i.test(u)) return u.trim();
    const backend = (import.meta.env.VITE_SERVER_URL || "").replace(/\/$/, "");
    if (u.startsWith("/musicas/")) return `${backend}${u}`;
    if (backend) return `${backend}/musicas/${u}`;
    return `/musicas/${u}`;
  };
  const normalizeUrl = (url = "") => (url || "").trim().replace(/\/+$/, "").toLowerCase();

  // 🔹 Playlists completas
  const musicList = [
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

  const ambianceList = [
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

  useEffect(() => {
    setMusicTracks(musicList);
    setAmbianceTracks(ambianceList);
  }, []);

  // 🎵 Reproduzir
  async function handlePlay(url) {
    await unlockAudio();
    playMusic(url);
    setVolumes((p) => ({ ...p, [url]: 100 }));
    scheduleSave(buildState(url, true, 100));
  }

  function handleStop(url) {
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

  // 🔧 Estado persistente
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
    await setDoc(doc(db, "sound", "current"), {
      sounds: state,
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

  // 🧩 Interface
  function renderList(title, tracks) {
    return (
      <>
        <Typography variant="subtitle1" sx={{ mt: 1, fontWeight: "bold" }}>
          {title}
        </Typography>
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
                    <Button
                      variant="outlined"
                      size="small"
                      color="error"
                      onClick={() => handleStop(t.url)}
                    >
                      Parar
                    </Button>
                  ) : (
                    <Button
                      variant="contained"
                      size="small"
                      onClick={() => handlePlay(t.url)}
                    >
                      Play
                    </Button>
                  )}
                  <Box sx={{ flex: 1, ml: 1 }}>
                    <Slider
                      value={vol100}
                      onChange={(_, v) =>
                        handleVolume(t.url, Array.isArray(v) ? v[0] : v)
                      }
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

  return (
    <Paper sx={{ p: 2, mt: 2, maxHeight: 450, overflowY: "auto" }}>
      <Typography variant="h6" sx={{ mb: 1, fontWeight: "bold" }}>
        🎵 Trilha Sonora
      </Typography>
      {renderList("🎶 Músicas", musicTracks)}
      <Divider sx={{ my: 1 }} />
      {renderList("🌲 Ambientes", ambianceTracks)}
      {playingTracks.length > 0 && (
        <Button
          variant="outlined"
          color="error"
          fullWidth
          sx={{ mt: 1 }}
          onClick={handleStopAll}
        >
          Parar Todos
        </Button>
      )}
    </Paper>
  );
}

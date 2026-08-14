import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Box, Paper, Typography, IconButton, Slider, Chip } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import VolumeDownIcon from "@mui/icons-material/VolumeDown";
import StopIcon from "@mui/icons-material/Stop";
import { db } from "../firebaseConfig";
import { doc, onSnapshot } from "firebase/firestore";

function MusicMixer({ visible, onToggle }) {
  const [sounds, setSounds] = useState([]);
  const [volumeGeral, setVolumeGeral] = useState(100);
  const [volumesIndividuais, setVolumesIndividuais] = useState({});
  const [posicao, setPosicao] = useState({ x: window.innerWidth - 350, y: 60 });
  const [arrastando, setArrastando] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  // 🟢 OUVIR MÚSICAS ATIVAS DO FIRESTORE
  useEffect(() => {
    const ref = doc(db, "sound", "current");
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const lista = data.sounds || [];
        setSounds(lista);
        
        // Inicializar volumes individuais
        const novosVolumes = {};
        lista.forEach(s => {
          novosVolumes[s.url] = s.volume != null ? s.volume : 100;
        });
        setVolumesIndividuais(prev => ({ ...novosVolumes, ...prev }));
      } else {
        setSounds([]);
      }
    });
    return () => unsub();
  }, []);

  // 🟢 ARRASTAR JANELA
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (arrastando) {
        setPosicao({ x: e.clientX - dragStartRef.current.x, y: e.clientY - dragStartRef.current.y });
      }
    };
    const handleMouseUp = () => setArrastando(false);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [arrastando]);

  // 🟢 APLICAR VOLUME GERAL A TODAS AS MÚSICAS
  const aplicarVolumeGeral = (valor) => {
    setVolumeGeral(valor);
    // Atualiza volumes individuais proporcionalmente
    const novosVolumes = {};
    sounds.forEach(s => {
      novosVolumes[s.url] = Math.round((s.volume || 100) * (valor / 100));
    });
    setVolumesIndividuais(novosVolumes);
    
    // Disparar evento para o AudioProvider ajustar
    window.dispatchEvent(new CustomEvent('ajustarVolumeGeral', { detail: { volume: valor } }));
  };

  // 🟢 APLICAR VOLUME INDIVIDUAL
  const aplicarVolumeIndividual = (url, valor) => {
    setVolumesIndividuais(prev => ({ ...prev, [url]: valor }));
    
    // Disparar evento para o AudioProvider ajustar
    window.dispatchEvent(new CustomEvent('ajustarVolumeIndividual', { detail: { url, volume: valor } }));
  };

  if (!visible) return null;

  return createPortal(
    <Paper
      elevation={10}
      sx={{
        position: "fixed",
        left: posicao.x,
        top: posicao.y,
        width: 280,
        bgcolor: "#1a1a2e",
        color: "#fff",
        borderRadius: 2,
        border: "1px solid #334155",
        zIndex: 99999,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        boxShadow: "0 8px 32px rgba(0,0,0,0.8)",
      }}
    >
      {/* BARRA DE TÍTULO */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          p: 1,
          bgcolor: "#0f172a",
          cursor: "move",
          minHeight: 36,
          borderBottom: "1px solid #334155",
        }}
        onMouseDown={(e) => {
          if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT') return;
          e.preventDefault();
          setArrastando(true);
          dragStartRef.current = { x: e.clientX - posicao.x, y: e.clientY - posicao.y };
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <VolumeUpIcon sx={{ color: "#4caf50", fontSize: 18 }} />
          <Typography variant="subtitle2" sx={{ fontWeight: "bold", fontSize: "0.8rem" }}>
            🎵 Mixer de Músicas
          </Typography>
          <Chip label={`${sounds.length} tocando`} size="small" sx={{ bgcolor: "#1e3a5f", color: "#4caf50", fontSize: "0.55rem", height: 18 }} />
        </Box>
        <IconButton size="small" onClick={onToggle} sx={{ color: "#94a3b8", p: 0.5 }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* CONTEÚDO */}
      <Box sx={{ p: 1.5, display: "flex", flexDirection: "column", gap: 1 }}>
        
        {/* VOLUME GERAL */}
        <Box>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.5 }}>
            <Typography variant="caption" sx={{ color: "#94a3b8", fontWeight: "bold" }}>
              🔊 Volume Geral
            </Typography>
            <Typography variant="caption" sx={{ color: "#4caf50", fontWeight: "bold" }}>
              {volumeGeral}%
            </Typography>
          </Box>
          <Slider
            size="small"
            value={volumeGeral}
            onChange={(_, v) => aplicarVolumeGeral(v)}
            min={0}
            max={100}
            sx={{ color: '#4caf50' }}
          />
        </Box>

        <Box sx={{ borderTop: "1px solid #334155", pt: 1 }} />

        {/* LISTA DE MÚSICAS ATIVAS */}
        {sounds.length === 0 ? (
          <Typography variant="caption" sx={{ color: "#64748b", textAlign: "center", py: 2 }}>
            Nenhuma música tocando
          </Typography>
        ) : (
          sounds.map((s, i) => {
            const volumeIndividual = volumesIndividuais[s.url] ?? s.volume ?? 100;
            // 🟢 Buscar nome da música na biblioteca do SoundBoard
            const nomeMusica = s.name || s.url.split("/").pop()?.replace(/\.[^/.]+$/, "") || `Música ${i + 1}`;
            
            return (
              <Box key={s.url} sx={{ mb: 1 }}>
                {/* NOME DA MÚSICA ACIMA DO SLIDER */}
                <Typography variant="caption" sx={{ color: "#00e0ff", fontSize: "0.65rem", fontWeight: "bold", display: "block", mb: 0.3 }}>
                  🎵 {nomeMusica}
                </Typography>
                
                {/* SLIDER */}
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <VolumeDownIcon sx={{ color: "#94a3b8", fontSize: 16, cursor: "pointer" }}
                    onClick={() => aplicarVolumeIndividual(s.url, 0)} />
                  <Slider
                    size="small"
                    value={volumeIndividual}
                    onChange={(_, v) => aplicarVolumeIndividual(s.url, v)}
                    min={0}
                    max={100}
                    sx={{ flex: 1, color: '#00e0ff' }}
                  />
                  <VolumeUpIcon sx={{ color: "#94a3b8", fontSize: 16, cursor: "pointer" }}
                    onClick={() => aplicarVolumeIndividual(s.url, 100)} />
                  <Typography variant="caption" sx={{ minWidth: 35, textAlign: "right", color: "#94a3b8", fontSize: "0.6rem" }}>
                    {volumeIndividual}%
                  </Typography>
                </Box>
              </Box>
            );
          })
        )}
      </Box>
    </Paper>,
    document.body
  );
}

export default React.memo(MusicMixer);
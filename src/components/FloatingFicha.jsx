// src/components/FloatingFicha.jsx
import React, { useState, useEffect } from "react";
import { Box, Paper, Typography, IconButton, FormControl, Select, MenuItem } from "@mui/material";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import CloseIcon from "@mui/icons-material/Close";
import MinimizeIcon from "@mui/icons-material/Minimize";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import { useFloatingWindows } from "../context/FloatingWindowsContext";
import FichaPersonagem from "./FichaPersonagem";
import { db } from "../firebaseConfig";
import { collection, onSnapshot, getDoc, doc } from "firebase/firestore";

const darkTheme = createTheme({
  palette: {
    mode: "dark",
  },
});

export default function FloatingFicha({ user, fichaId, isMestre }) {
  const { fichaMinimized, toggleFichaMinimize, fichaOpen, setFichaOpen, fichaPos, setFichaPos, toggleFicha } = useFloatingWindows();
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  // 🟢 ESTADO PARA LISTA DE FICHAS
  const [fichasList, setFichasList] = useState([]);
  const [selectedFicha, setSelectedFicha] = useState(fichaId);
  const [fichasDataMap, setFichasDataMap] = useState({});

  // 🟢 CARREGAR DADOS DAS FICHAS (nome, tipoFicha)
useEffect(() => {
  if (!fichasList.length) return;
  
  const carregarDados = async () => {
    const map = {};
    const promises = fichasList.map(async (fid) => {
      const snap = await getDoc(doc(db, "fichas", fid));
      if (snap.exists()) {
        map[fid] = snap.data();
      }
    });
    await Promise.all(promises);
    setFichasDataMap(map);
  };
  
  carregarDados();
}, [fichasList]);

  // 🟢 CARREGAR LISTA DE FICHAS
  useEffect(() => {
    const col = collection(db, "fichas");
    const unsub = onSnapshot(col, (snap) => {
      const list = snap.docs.map(d => d.id);
      setFichasList(list);
    });
    return () => unsub();
  }, []);

  // 🟢 Atualiza quando fichaId muda externamente
  useEffect(() => {
    setSelectedFicha(fichaId);
  }, [fichaId]);

  useEffect(() => {
    window.__toggleFicha = toggleFicha;
    return () => { window.__toggleFicha = null; };
  }, [toggleFicha]);

  if (!fichaOpen) return null;

  const handleMouseDown = (e) => {
    setDragging(true);
    setDragStart({ x: e.clientX - fichaPos.x, y: e.clientY - fichaPos.y });
  };

  const handleMouseMove = (e) => {
    if (!dragging) return;
    setFichaPos({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handleMouseUp = () => setDragging(false);

  return (
    <Box
      sx={{
        position: "fixed",
        left: fichaPos.x,
        top: fichaPos.y,
        zIndex: 100000,
        width: fichaMinimized ? 200 : 450,
        height: fichaMinimized ? 40 : 650,
        transition: "width 0.3s, height 0.3s",
        cursor: dragging ? "grabbing" : "grab",
        boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
        borderRadius: 2,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <Paper
        onMouseDown={handleMouseDown}
        sx={{
          p: 0.5,
          display: "flex",
          alignItems: "center",
          bgcolor: "#1a1a2e",
          borderRadius: fichaMinimized ? 2 : "8px 8px 0 0",
          cursor: "grab",
          flexShrink: 0,
          gap: 0.5,
        }}
      >
        <DragIndicatorIcon sx={{ color: "#94a3b8", fontSize: 18 }} />
        
        {isMestre ? (
  <FormControl size="small" sx={{ flex: 1, minWidth: 0 }}>
    <Select
      value={selectedFicha || ""}
      onChange={(e) => setSelectedFicha(e.target.value)}
      sx={{ 
        color: "#fff", 
        fontSize: "0.75rem",
        "& .MuiSelect-icon": { color: "#94a3b8" },
        "& .MuiOutlinedInput-notchedOutline": { borderColor: "#334155" },
      }}
      MenuProps={{
        container: document.body,
        PaperProps: { 
          sx: { 
            bgcolor: "#0f172a", 
            color: "#fff",
            maxHeight: 400,
            minWidth: 250,
          } 
        }
      }}
      renderValue={(selected) => {
        if (!selected) return "📋 Selecionar ficha";
        const fichaData = fichasDataMap[selected];
        return `📋 ${fichaData?.nome || selected}`;
      }}
    >
      <MenuItem value="" disabled sx={{ opacity: 0.5 }}>
        <Typography variant="caption" sx={{ color: "#64748b" }}>
          Selecione uma ficha
        </Typography>
      </MenuItem>
      
      {(() => {
        const pjFichas = fichasList.filter(fid => {
          const data = fichasDataMap[fid];
          return (data?.tipoFicha || "PJ") === "PJ";
        });
        const pmFichas = fichasList.filter(fid => {
          const data = fichasDataMap[fid];
          return data?.tipoFicha === "PM";
        });

        const items = [];
        
        if (pjFichas.length > 0) {
          items.push(
            <MenuItem key="header-pj" disabled sx={{ opacity: 1, borderBottom: "1px solid #4caf50", mb: 0.5 }}>
              <Typography variant="caption" sx={{ color: "#4caf50", fontWeight: "bold" }}>
                ── PERSONAGENS DO JOGADOR ──
              </Typography>
            </MenuItem>
          );
          pjFichas.forEach(email => {
            items.push(
              <MenuItem key={email} value={email} sx={{ pl: 3, fontSize: "0.75rem" }}>
                📋 {fichasDataMap[email]?.nome || email}
              </MenuItem>
            );
          });
        }
        
        if (pmFichas.length > 0) {
          items.push(
            <MenuItem key="header-pm" disabled sx={{ opacity: 1, borderBottom: "1px solid #ff9800", mb: 0.5, mt: 1 }}>
              <Typography variant="caption" sx={{ color: "#ff9800", fontWeight: "bold" }}>
                ── PERSONAGENS DO MESTRE ──
              </Typography>
            </MenuItem>
          );
          pmFichas.forEach(email => {
            items.push(
              <MenuItem key={email} value={email} sx={{ pl: 3, fontSize: "0.75rem" }}>
                📋 {fichasDataMap[email]?.nome || email}
              </MenuItem>
            );
          });
        }
        
        if (items.length === 0) {
          items.push(
            <MenuItem key="empty" disabled>
              <Typography variant="caption" sx={{ color: "#64748b" }}>
                Nenhuma ficha encontrada
              </Typography>
            </MenuItem>
          );
        }
        
        return items;
      })()}
    </Select>
  </FormControl>
) : (
          <Typography variant="caption" sx={{ color: "#fff", fontWeight: "bold", flex: 1 }}>
            📋 Ficha
          </Typography>
        )}
        
        <IconButton size="small" onClick={toggleFichaMinimize} sx={{ color: "#94a3b8", p: 0.3 }}>
          <MinimizeIcon fontSize="small" />
        </IconButton>
        <IconButton size="small" onClick={() => setFichaOpen(false)} sx={{ color: "#ef4444", p: 0.3 }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Paper>
      {!fichaMinimized && (
        <Box sx={{ flex: 1, overflow: "hidden", borderRadius: "0 0 8px 8px" }}>
          <ThemeProvider theme={darkTheme}>
            <CssBaseline />
            <FichaPersonagem 
              user={user} 
              fichaId={isMestre ? selectedFicha : fichaId} 
              isMestre={isMestre} 
            />
          </ThemeProvider>
        </Box>
      )}
    </Box>
  );
}
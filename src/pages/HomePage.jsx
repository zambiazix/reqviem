// src/pages/HomePage.jsx
import React, { useState, useEffect } from "react";
import {
  Paper, Typography, Divider, List, ListItem, ListItemText, ListItemAvatar,
  Button, TextField, Box, IconButton, Dialog, DialogTitle, DialogContent,
  DialogActions, Avatar, Chip
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import PersonRemoveIcon from "@mui/icons-material/PersonRemove";
import FichaPersonagem from "../components/FichaPersonagem";
import { db } from "../firebaseConfig";
import { doc, deleteDoc, onSnapshot, collection } from "firebase/firestore";

const CORES_AURA = {
  "Titã": "#ff3b3b", "Alquimista": "#00e0ff", "Artesão": "#ffd700",
  "Fundador": "#00ff88", "Déspota": "#a855f7", "Ás": "#e5e5e5",
};

function LightboxImage({ src, zoom, setZoom }) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [start, setStart] = useState({ x: 0, y: 0 });
  const handleMouseDown = (e) => { e.preventDefault(); setDragging(true); setStart({ x: e.clientX - position.x, y: e.clientY - position.y }); };
  const handleMouseMove = (e) => { if (!dragging) return; setPosition({ x: e.clientX - start.x, y: e.clientY - start.y }); };
  const handleMouseUp = () => setDragging(false);
  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => { window.removeEventListener("mousemove", handleMouseMove); window.removeEventListener("mouseup", handleMouseUp); };
  }, [dragging, start]);
  return (
    <img src={src} alt="ampliada" onClick={(e) => e.stopPropagation()} onMouseDown={handleMouseDown}
      onWheel={(e) => { e.preventDefault(); setZoom((z) => Math.min(Math.max(z + (e.deltaY > 0 ? -0.1 : 0.1), 0.5), 5)); }}
      style={{ transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`, transition: dragging ? "none" : "transform 0.2s ease", maxWidth: "90%", maxHeight: "90%", borderRadius: 10, cursor: dragging ? "grabbing" : "grab", userSelect: "none", touchAction: "none" }}
    />
  );
}

export default function HomePage({ user, role, fichasList, selectedFichaEmail, setSelectedFichaEmail, criarContaEJogador }) {
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [creating, setCreating] = useState(false);
  const [deleteFichaDialogOpen, setDeleteFichaDialogOpen] = useState(false);
  const [deleteContaDialogOpen, setDeleteContaDialogOpen] = useState(false);
  const [fichaToDelete, setFichaToDelete] = useState(null);
  const [contaToDelete, setContaToDelete] = useState(null);
  const [fichasDataMap, setFichasDataMap] = useState({});
  const [lightboxImage, setLightboxImage] = useState(null);
  const [zoom, setZoom] = useState(1);

  // 🟢 TEMPO REAL - onSnapshot na coleção de fichas
  useEffect(() => {
    const col = collection(db, "fichas");
    const unsub = onSnapshot(col, (snap) => {
      const map = {};
      snap.forEach((docSnap) => {
        map[docSnap.id] = docSnap.data();
      });
      setFichasDataMap(map);
    });
    return () => unsub();
  }, []);

  const handleCreateAccountAndFicha = async () => {
    if (!newEmail || !newPassword) { alert("Preencha o e-mail e a senha para criar a conta."); return; }
    if (newEmail === "mestre@reqviemrpg.com") { alert("Não é possível criar conta para o Mestre!"); return; }
    setCreating(true);
    try {
      await criarContaEJogador(newEmail, newPassword);
      setNewEmail(""); setNewPassword("");
    } catch (err) { console.error("Erro:", err); }
    finally { setCreating(false); }
  };

  const handleDeleteFicha = async (email) => {
    try {
      await deleteDoc(doc(db, "fichas", email));
      if (selectedFichaEmail === email) setSelectedFichaEmail(null);
      setDeleteFichaDialogOpen(false); setFichaToDelete(null);
    } catch (err) { alert("Erro ao deletar ficha: " + err.message); setDeleteFichaDialogOpen(false); }
  };

  const handleDeleteConta = async (email) => {
    try {
      const apiBase = window.location.hostname === "localhost" ? "http://localhost:5000" : "https://reqviem.onrender.com";
      const response = await fetch(`${apiBase}/api/admin/delete-user`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, mestreEmail: user?.email })
      });
      const data = await response.json();
      if (response.ok) {
        if (selectedFichaEmail === email) setSelectedFichaEmail(null);
      } else { alert(`Erro: ${data.error}`); }
      setDeleteContaDialogOpen(false); setContaToDelete(null);
    } catch (err) { alert("Erro ao conectar com o servidor: " + err.message); setDeleteContaDialogOpen(false); }
  };

  const isMestre = (email) => email === "mestre@reqviemrpg.com";
  const getAuraColor = (fichaData) => CORES_AURA[fichaData?.tipoAura] || null;

  if (role !== "master") {
    return <FichaPersonagem user={user} fichaId={selectedFichaEmail} isMestre={false} />;
  }

  // Pega todas as fichas do onSnapshot
  const todasFichas = Object.keys(fichasDataMap);
  const pjFichas = todasFichas.filter(fid => (fichasDataMap[fid]?.tipoFicha || "PJ") === "PJ" && fid !== "mestre@reqviemrpg.com");
  const pmFichas = todasFichas.filter(fid => fichasDataMap[fid]?.tipoFicha === "PM" && fid !== "mestre@reqviemrpg.com");

  return (
    <Paper sx={{ p: 2, flex: 1, overflowY: "auto", bgcolor: "#0f172a" }}>
      <Typography variant="h6" sx={{ color: "#fff" }}>Fichas</Typography>
      <Divider sx={{ my: 1, bgcolor: "#334155" }} />
      <Typography sx={{ mb: 1, color: "#94a3b8" }}>Lista de fichas (clique para abrir):</Typography>

      {/* 🟢 FICHA DO MESTRE COM DESTAQUE */}
      <ListItem
        selected={selectedFichaEmail === "mestre@reqviemrpg.com"}
        onClick={() => setSelectedFichaEmail("mestre@reqviemrpg.com")}
        sx={{ cursor: 'pointer', borderRadius: 2, mb: 1.5, bgcolor: selectedFichaEmail === "mestre@reqviemrpg.com" ? 'rgba(255,215,0,0.15)' : 'rgba(255,215,0,0.05)', border: selectedFichaEmail === "mestre@reqviemrpg.com" ? '2px solid #FFD700' : '1px solid rgba(255,215,0,0.3)', boxShadow: '0 0 12px rgba(255,215,0,0.2)', '&:hover': { bgcolor: 'rgba(255,215,0,0.12)', boxShadow: '0 0 20px rgba(255,215,0,0.4)' } }}
      >
        <ListItemAvatar>
          <Avatar src={fichasDataMap["mestre@reqviemrpg.com"]?.imagemPersonagem || ""} sx={{ width: 40, height: 40, border: '2px solid #FFD700', cursor: 'pointer' }}
            onClick={(e) => { e.stopPropagation(); const img = fichasDataMap["mestre@reqviemrpg.com"]?.imagemPersonagem; if (img) { setLightboxImage(img); setZoom(1); } }} />
        </ListItemAvatar>
        <ListItemText primary="👑 MESTRE" secondary="mestre@reqviemrpg.com"
          primaryTypographyProps={{ sx: { color: '#FFD700', fontWeight: 'bold', fontSize: '0.95rem', textShadow: '0 0 8px rgba(255,215,0,0.5)' } }}
          secondaryTypographyProps={{ sx: { color: 'rgba(255,215,0,0.6)', fontSize: '0.7rem' } }} />
      </ListItem>

      {todasFichas.length === 0 ? (
        <Typography sx={{ color: "#94a3b8" }}>Nenhuma ficha criada.</Typography>
      ) : (
        <>
          {pjFichas.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ color: '#4caf50', fontWeight: 'bold', borderBottom: '1px solid #4caf50', pb: 0.5, mb: 1 }}>── PERSONAGENS DO JOGADOR ──</Typography>
              <List dense>
                                {pjFichas.map((fid) => {
                  const ficha = fichasDataMap[fid];
                  const auraCor = getAuraColor(ficha);
                  return (
                    <ListItem key={fid} selected={selectedFichaEmail === fid} onClick={() => setSelectedFichaEmail(fid)}
                      sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' }, borderRadius: 1, mb: 0.5, bgcolor: selectedFichaEmail === fid ? '#1e3a5f' : 'transparent', borderLeft: auraCor ? `3px solid ${auraCor}` : 'none', pr: 8 }}
                      secondaryAction={
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <IconButton edge="end" size="small" onClick={(e) => { e.stopPropagation(); setFichaToDelete(fid); setDeleteFichaDialogOpen(true); }} sx={{ color: '#ef4444', '&:hover': { bgcolor: 'rgba(239, 68, 68, 0.1)' } }} title="Deletar Ficha"><DeleteIcon fontSize="small" /></IconButton>
                          {!isMestre(fid) && (
                            <IconButton edge="end" size="small" onClick={(e) => { e.stopPropagation(); setContaToDelete(fid); setDeleteContaDialogOpen(true); }} sx={{ color: '#dc2626', '&:hover': { bgcolor: 'rgba(220, 38, 38, 0.1)' } }} title="Deletar Conta"><PersonRemoveIcon fontSize="small" /></IconButton>
                          )}
                        </Box>
                      }
                    >
                      <ListItemAvatar>
                        <Avatar src={ficha?.imagemPersonagem || ficha?.imagens?.[0] || ""} sx={{ width: 36, height: 36, bgcolor: '#333', cursor: 'pointer', border: auraCor ? `2px solid ${auraCor}` : '1px solid #555' }}
                          onClick={(e) => { e.stopPropagation(); const img = ficha?.imagemPersonagem || ficha?.imagens?.[0]; if (img) { setLightboxImage(img); setZoom(1); } }}>
                          {(ficha?.nome || fid)[0]?.toUpperCase()}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText 
                        primary={ficha?.nome || fid}
                        secondary={
                          ficha?.tipoAura ? (
                            <Box component="span" sx={{ display: 'flex', alignItems: 'center', mt: 0.3 }}>
                              <Chip label={ficha.tipoAura} size="small" 
                                sx={{ bgcolor: `${auraCor}22`, color: auraCor, fontWeight: 'bold', fontSize: '0.55rem', height: 16 }} />
                            </Box>
                          ) : null
                        }
                        primaryTypographyProps={{ sx: { color: auraCor || '#fff', fontWeight: 'bold', fontSize: '0.85rem', textShadow: auraCor ? `0 0 6px ${auraCor}44` : 'none' } }}
                        secondaryTypographyProps={{ component: 'div' }}
                      />
                    </ListItem>
                  );
                })}
              </List>
            </Box>
          )}
          {pmFichas.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ color: '#ff9800', fontWeight: 'bold', borderBottom: '1px solid #ff9800', pb: 0.5, mb: 1 }}>── PERSONAGENS DO MESTRE ──</Typography>
              <List dense>
                                {pmFichas.map((fid) => {
                  const ficha = fichasDataMap[fid];
                  const auraCor = getAuraColor(ficha);
                  return (
                    <ListItem key={fid} selected={selectedFichaEmail === fid} onClick={() => setSelectedFichaEmail(fid)}
                      sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' }, borderRadius: 1, mb: 0.5, bgcolor: selectedFichaEmail === fid ? '#1e3a5f' : 'transparent', borderLeft: auraCor ? `3px solid ${auraCor}` : 'none', pr: 8 }}
                      secondaryAction={
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <IconButton edge="end" size="small" onClick={(e) => { e.stopPropagation(); setFichaToDelete(fid); setDeleteFichaDialogOpen(true); }} sx={{ color: '#ef4444' }} title="Deletar Ficha"><DeleteIcon fontSize="small" /></IconButton>
                        </Box>
                      }
                    >
                      <ListItemAvatar>
                        <Avatar src={ficha?.imagemPersonagem || ficha?.imagens?.[0] || ""} sx={{ width: 36, height: 36, bgcolor: '#333', cursor: 'pointer', border: auraCor ? `2px solid ${auraCor}` : '1px solid #555' }}
                          onClick={(e) => { e.stopPropagation(); const img = ficha?.imagemPersonagem || ficha?.imagens?.[0]; if (img) { setLightboxImage(img); setZoom(1); } }}>
                          {(ficha?.nome || fid)[0]?.toUpperCase()}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText 
                        primary={ficha?.nome || fid}
                        secondary={
                          ficha?.tipoAura ? (
                            <Box component="span" sx={{ display: 'flex', alignItems: 'center', mt: 0.3 }}>
                              <Chip label={ficha.tipoAura} size="small" 
                                sx={{ bgcolor: `${auraCor}22`, color: auraCor, fontWeight: 'bold', fontSize: '0.55rem', height: 16 }} />
                            </Box>
                          ) : null
                        }
                        primaryTypographyProps={{ sx: { color: auraCor || '#fff', fontWeight: 'bold', fontSize: '0.85rem' } }}
                        secondaryTypographyProps={{ component: 'div' }}
                      />
                    </ListItem>
                  );
                })}
              </List>
            </Box>
          )}
        </>
      )}

      <Divider sx={{ my: 1, bgcolor: "#334155" }} />
      <Typography variant="subtitle2" sx={{ mb: 1, color: "#fff" }}>Criar nova conta + ficha vazia</Typography>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        <TextField label="E-mail do jogador" fullWidth size="small" value={newEmail} onChange={(e) => setNewEmail(e.target.value)}
          sx={{ '& .MuiInputLabel-root': { color: '#94a3b8' }, '& .MuiInputBase-input': { color: '#fff' }, '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: '#334155' }, '&:hover fieldset': { borderColor: '#475569' } } }} />
        <TextField label="Senha" type="password" fullWidth size="small" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
          sx={{ '& .MuiInputLabel-root': { color: '#94a3b8' }, '& .MuiInputBase-input': { color: '#fff' }, '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: '#334155' }, '&:hover fieldset': { borderColor: '#475569' } } }} />
        <Button variant="contained" color="primary" fullWidth disabled={creating} onClick={handleCreateAccountAndFicha}>
          {creating ? "Criando..." : "Criar conta + ficha"}
        </Button>
      </Box>

      <Dialog open={deleteFichaDialogOpen} onClose={() => setDeleteFichaDialogOpen(false)}>
        <DialogTitle sx={{ color: '#fff', bgcolor: '#1a1a2e' }}>🗑️ Confirmar exclusão</DialogTitle>
        <DialogContent sx={{ bgcolor: '#1a1a2e', color: '#fff', pt: 2 }}>
          <Typography>Tem certeza que deseja deletar a ficha de <strong>{fichaToDelete}</strong>?</Typography>
          <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', mt: 1 }}>Isso removerá apenas a ficha do personagem. A conta continuará existindo.</Typography>
        </DialogContent>
        <DialogActions sx={{ bgcolor: '#1a1a2e', borderTop: '1px solid #334155' }}>
          <Button onClick={() => setDeleteFichaDialogOpen(false)} sx={{ color: '#94a3b8' }}>Cancelar</Button>
          <Button onClick={() => handleDeleteFicha(fichaToDelete)} sx={{ color: '#ef4444' }}>Deletar Ficha</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteContaDialogOpen} onClose={() => setDeleteContaDialogOpen(false)}>
        <DialogTitle sx={{ color: '#fff', bgcolor: '#1a1a2e' }}>⚠️ Confirmar exclusão</DialogTitle>
        <DialogContent sx={{ bgcolor: '#1a1a2e', color: '#fff', pt: 2 }}>
          <Typography>Tem certeza que deseja deletar a conta de <strong>{contaToDelete}</strong>?</Typography>
          <Typography variant="caption" sx={{ color: '#ef4444', display: 'block', mt: 1 }}>⚠️ Isso removerá a ficha permanentemente!</Typography>
        </DialogContent>
        <DialogActions sx={{ bgcolor: '#1a1a2e', borderTop: '1px solid #334155' }}>
          <Button onClick={() => setDeleteContaDialogOpen(false)} sx={{ color: '#94a3b8' }}>Cancelar</Button>
          <Button onClick={() => handleDeleteConta(contaToDelete)} sx={{ color: '#dc2626', fontWeight: 'bold' }}>Deletar Ficha</Button>
        </DialogActions>
      </Dialog>

      {/* LIGHTBOX */}
      {lightboxImage && (
        <Box onClick={() => setLightboxImage(null)} sx={{ position: "fixed", inset: 0, bgcolor: "rgba(0,0,0,0.92)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999999 }}>
          <LightboxImage src={lightboxImage} zoom={zoom} setZoom={setZoom} />
        </Box>
      )}
    </Paper>
  );
}
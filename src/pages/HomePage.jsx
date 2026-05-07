// src/pages/HomePage.jsx
import React, { useState, useEffect } from "react";
import {
  Paper,
  Typography,
  Divider,
  List,
  ListItem,
  ListItemText,
  Button,
  TextField,
  Box,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import PersonRemoveIcon from "@mui/icons-material/PersonRemove";
import FichaPersonagem from "../components/FichaPersonagem";
import { db } from "../firebaseConfig";
import { doc, deleteDoc, getDoc } from "firebase/firestore";

export default function HomePage({
  user,
  role,
  fichasList,
  selectedFichaEmail,
  setSelectedFichaEmail,
  criarContaEJogador,
}) {
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [creating, setCreating] = useState(false);
  
  const [deleteFichaDialogOpen, setDeleteFichaDialogOpen] = useState(false);
  const [deleteContaDialogOpen, setDeleteContaDialogOpen] = useState(false);
  const [fichaToDelete, setFichaToDelete] = useState(null);
  const [contaToDelete, setContaToDelete] = useState(null);
  const [fichasDataMap, setFichasDataMap] = useState({});

  useEffect(() => {
    const carregarTipos = async () => {
      if (!fichasList.length) return;
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
    carregarTipos();
  }, [fichasList]);

  const handleCreateAccountAndFicha = async () => {
  if (!newEmail || !newPassword) {
    alert("Preencha o e-mail e a senha para criar a conta.");
    return;
  }
  
  // 🚫 IMPEDIR CRIAÇÃO DE CONTA DO MESTRE
  if (newEmail === "mestre@reqviemrpg.com") {
    alert("Não é possível criar conta para o Mestre!");
    return;
  }
  
  setCreating(true);
  try {
    await criarContaEJogador(newEmail, newPassword);
    setNewEmail("");
    setNewPassword("");
  } catch (err) {
    console.error("Erro:", err);
  } finally {
    setCreating(false);
  }
};

  const handleDeleteFicha = async (email) => {
    try {
      await deleteDoc(doc(db, "fichas", email));
      alert(`Ficha de ${email} deletada com sucesso!`);
      
      if (selectedFichaEmail === email) {
        setSelectedFichaEmail(null);
      }
      
      setDeleteFichaDialogOpen(false);
      setFichaToDelete(null);
    } catch (err) {
      console.error("Erro ao deletar ficha:", err);
      alert("Erro ao deletar ficha: " + err.message);
      setDeleteFichaDialogOpen(false);
    }
  };

  const handleDeleteConta = async (email) => {
    try {
      const apiBase = import.meta?.env?.VITE_SERVER_URL || 
                      (window.location.hostname === "localhost" 
                        ? "http://localhost:5000" 
                        : "https://app-rpg.onrender.com");
      
      const response = await fetch(`${apiBase}/api/admin/delete-user`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email,
          mestreEmail: user?.email
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        alert(`✅ ${data.message || 'Conta deletada com sucesso!'}`);
        
        if (selectedFichaEmail === email) {
          setSelectedFichaEmail(null);
        }
      } else {
        alert(`❌ Erro: ${data.error || 'Erro ao deletar conta'}`);
      }
      
      setDeleteContaDialogOpen(false);
      setContaToDelete(null);
      
    } catch (err) {
      console.error("Erro ao deletar conta:", err);
      alert("Erro ao conectar com o servidor: " + err.message);
      setDeleteContaDialogOpen(false);
    }
  };

  const isMestre = (email) => email === "mestre@reqviemrpg.com";

  if (role !== "master") {
    return (
      <FichaPersonagem
        user={user}
        fichaId={selectedFichaEmail}
        isMestre={false}
      />
    );
  }

  return (
    <Paper sx={{ p: 2, flex: 1, overflowY: "auto", bgcolor: "#0f172a" }}>
      <Typography variant="h6" sx={{ color: "#fff" }}>Fichas</Typography>
      <Divider sx={{ my: 1, bgcolor: "#334155" }} />
      
      <Typography sx={{ mb: 1, color: "#94a3b8" }}>
        Lista de fichas (clique para abrir):
      </Typography>

      {fichasList.length === 0 ? (
        <Typography sx={{ color: "#94a3b8" }}>Nenhuma ficha criada.</Typography>
      ) : (() => {
        const pjFichas = fichasList.filter(fid => {
          const fichaData = fichasDataMap[fid];
          return (fichaData?.tipoFicha || "PJ") === "PJ";
        });
        const pmFichas = fichasList.filter(fid => {
          const fichaData = fichasDataMap[fid];
          return fichaData?.tipoFicha === "PM";
        });

        const grupos = [];
        if (pjFichas.length > 0) {
          grupos.push({ titulo: '── PERSONAGENS DO JOGADOR ──', fichas: pjFichas, cor: '#4caf50' });
        }
        if (pmFichas.length > 0) {
          grupos.push({ titulo: '── PERSONAGENS DO MESTRE ──', fichas: pmFichas, cor: '#ff9800' });
        }

        return grupos.map((grupo, gIdx) => (
          <Box key={gIdx} sx={{ mb: 2 }}>
            <Typography
              variant="subtitle2"
              sx={{
                color: grupo.cor,
                fontWeight: 'bold',
                borderBottom: `1px solid ${grupo.cor}`,
                pb: 0.5,
                mb: 1,
              }}
            >
              {grupo.titulo}
            </Typography>
            <List dense>
              {grupo.fichas.map((fid) => (
                <ListItem
                  key={fid}
                  selected={selectedFichaEmail === fid}
                  onClick={() => setSelectedFichaEmail(fid)}
                  sx={{
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' },
                    borderRadius: 1,
                    mb: 0.5,
                    bgcolor: selectedFichaEmail === fid ? '#1e3a5f' : 'transparent'
                  }}
                  secondaryAction={
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <IconButton
                        edge="end"
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFichaToDelete(fid);
                          setDeleteFichaDialogOpen(true);
                        }}
                        sx={{ 
                          color: '#ef4444',
                          '&:hover': { bgcolor: 'rgba(239, 68, 68, 0.1)' }
                        }}
                        title="Deletar Ficha"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                      
                      {!isMestre(fid) && (
                        <IconButton
                          edge="end"
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            setContaToDelete(fid);
                            setDeleteContaDialogOpen(true);
                          }}
                          sx={{ 
                            color: '#dc2626',
                            '&:hover': { bgcolor: 'rgba(220, 38, 38, 0.1)' }
                          }}
                          title="Deletar Conta"
                        >
                          <PersonRemoveIcon fontSize="small" />
                        </IconButton>
                      )}
                    </Box>
                  }
                >
                  <ListItemText 
  primary={fichasDataMap[fid]?.nome || fid}
  primaryTypographyProps={{
    sx: { 
      color: isMestre(fid) ? '#FFD700' : '#fff',
      fontWeight: isMestre(fid) ? 'bold' : 'normal'
    }
  }}
/>
                </ListItem>
              ))}
            </List>
          </Box>
        ));
      })()}

      <Divider sx={{ my: 1, bgcolor: "#334155" }} />

      <Typography variant="subtitle2" sx={{ mb: 1, color: "#fff" }}>
        Criar nova conta + ficha vazia
      </Typography>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        <TextField
          label="E-mail do jogador"
          fullWidth
          size="small"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          sx={{ 
            '& .MuiInputLabel-root': { color: '#94a3b8' },
            '& .MuiInputBase-input': { color: '#fff' },
            '& .MuiOutlinedInput-root': {
              '& fieldset': { borderColor: '#334155' },
              '&:hover fieldset': { borderColor: '#475569' },
            }
          }}
        />
        <TextField
          label="Senha"
          type="password"
          fullWidth
          size="small"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          sx={{ 
            '& .MuiInputLabel-root': { color: '#94a3b8' },
            '& .MuiInputBase-input': { color: '#fff' },
            '& .MuiOutlinedInput-root': {
              '& fieldset': { borderColor: '#334155' },
              '&:hover fieldset': { borderColor: '#475569' },
            }
          }}
        />
        <Button
          variant="contained"
          color="primary"
          fullWidth
          disabled={creating}
          onClick={handleCreateAccountAndFicha}
        >
          {creating ? "Criando..." : "Criar conta + ficha"}
        </Button>
      </Box>

      {/* Modal Deletar Ficha */}
      <Dialog open={deleteFichaDialogOpen} onClose={() => setDeleteFichaDialogOpen(false)}>
        <DialogTitle sx={{ color: '#fff', bgcolor: '#1a1a2e' }}>
          🗑️ Confirmar exclusão
        </DialogTitle>
        <DialogContent sx={{ bgcolor: '#1a1a2e', color: '#fff', pt: 2 }}>
          <Typography>
            Tem certeza que deseja deletar a ficha de <strong>{fichaToDelete}</strong>?
          </Typography>
          <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', mt: 1 }}>
            Isso removerá apenas a ficha do personagem. A conta continuará existindo.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ bgcolor: '#1a1a2e', borderTop: '1px solid #334155' }}>
          <Button onClick={() => setDeleteFichaDialogOpen(false)} sx={{ color: '#94a3b8' }}>
            Cancelar
          </Button>
          <Button onClick={() => handleDeleteFicha(fichaToDelete)} sx={{ color: '#ef4444' }}>
            Deletar Ficha
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal Deletar Conta */}
      <Dialog open={deleteContaDialogOpen} onClose={() => setDeleteContaDialogOpen(false)}>
        <DialogTitle sx={{ color: '#fff', bgcolor: '#1a1a2e' }}>
          ⚠️ Confirmar exclusão
        </DialogTitle>
        <DialogContent sx={{ bgcolor: '#1a1a2e', color: '#fff', pt: 2 }}>
          <Typography>
            Tem certeza que deseja deletar a conta de <strong>{contaToDelete}</strong>?
          </Typography>
          <Typography variant="caption" sx={{ color: '#ef4444', display: 'block', mt: 1 }}>
            ⚠️ Isso removerá a ficha permanentemente!
          </Typography>
        </DialogContent>
        <DialogActions sx={{ bgcolor: '#1a1a2e', borderTop: '1px solid #334155' }}>
          <Button onClick={() => setDeleteContaDialogOpen(false)} sx={{ color: '#94a3b8' }}>
            Cancelar
          </Button>
          <Button onClick={() => handleDeleteConta(contaToDelete)} sx={{ color: '#dc2626', fontWeight: 'bold' }}>
            Deletar Ficha
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
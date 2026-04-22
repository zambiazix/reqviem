// src/pages/HomePage.jsx
import React, { useState } from "react";
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
import { doc, deleteDoc } from "firebase/firestore";

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

  const handleCreateAccountAndFicha = async () => {
    if (!newEmail || !newPassword) {
      alert("Preencha o e-mail e a senha para criar a conta.");
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
      await deleteDoc(doc(db, "fichas", email));
      
      alert(`Ficha de ${email} deletada! A conta precisa ser deletada pelo próprio jogador.`);
      
      if (selectedFichaEmail === email) {
        setSelectedFichaEmail(null);
      }
      
      setDeleteContaDialogOpen(false);
      setContaToDelete(null);
    } catch (err) {
      console.error("Erro ao deletar conta:", err);
      alert("Erro ao deletar conta: " + err.message);
      setDeleteContaDialogOpen(false);
    }
  };

  const isMestre = (email) => email === "mestre@reqviemrpg.com";

  // Se não for mestre, mostra a ficha do próprio jogador
  if (role !== "master") {
    return (
      <FichaPersonagem
        user={user}
        fichaId={selectedFichaEmail}
        isMestre={false}
      />
    );
  }

  // Para o mestre, mostra a lista de fichas
  return (
    <Paper sx={{ p: 2, flex: 1, overflowY: "auto", bgcolor: "#0f172a" }}>
      <Typography variant="h6" sx={{ color: "#fff" }}>Fichas</Typography>
      <Divider sx={{ my: 1, bgcolor: "#334155" }} />
      
      <Typography sx={{ mb: 1, color: "#94a3b8" }}>
        Lista de fichas (clique para abrir):
      </Typography>
      <List dense>
        {fichasList.length === 0 && (
          <Typography sx={{ color: "#94a3b8" }}>Nenhuma ficha criada.</Typography>
        )}
        {fichasList.map((fid) => (
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
              primary={fid} 
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
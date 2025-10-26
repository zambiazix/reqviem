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
} from "@mui/material";
import { auth, db } from "../firebaseConfig";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import FichaPersonagem from "../components/FichaPersonagem";

export default function HomePage({
  user,
  role,
  fichasList,
  selectedFichaEmail,
  setSelectedFichaEmail,
  criarFichaParaEmail,
}) {
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [creating, setCreating] = useState(false);

  // 🔹 Criação de conta + ficha vazia
  const handleCreateAccountAndFicha = async () => {
    if (!newEmail || !newPassword) {
      alert("Preencha o e-mail e a senha para criar a conta.");
      return;
    }

    setCreating(true);
    try {
      // 1️⃣ Cria o usuário no Firebase Authentication
      await createUserWithEmailAndPassword(auth, newEmail, newPassword);

      // 2️⃣ Cria uma ficha vazia associada a esse e-mail
      const fichaRef = doc(db, "fichas", newEmail);
      await setDoc(fichaRef, {
        nome: "",
        genero: "",
        idade: "",
        altura: "",
        peso: "",
        movimentacao: "",
        pontosVida: 0,
        pontosEnergia: 0,
        armadura: "0/0",
        caracteristicas: "",
        atributos: {
          forca: 0,
          destreza: 0,
          agilidade: 0,
          constituicao: 0,
          inteligencia: 0,
        },
        defeit: "",
        tracos: "",
        criadoEm: new Date().toISOString(),
      });

      alert(`Conta e ficha criadas com sucesso para ${newEmail}!`);
      setNewEmail("");
      setNewPassword("");
    } catch (err) {
      console.error("Erro ao criar conta e ficha:", err);
      alert("Erro ao criar conta: " + err.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <Paper sx={{ p: 2, flex: 1, overflowY: "auto" }}>
      <Typography variant="h6">Fichas</Typography>
      <Divider sx={{ my: 1 }} />
      {!user ? (
        <Typography>Faça login para ver sua ficha.</Typography>
      ) : role === "master" ? (
        <>
          <Typography sx={{ mb: 1 }}>
            Lista de fichas (clique para abrir):
          </Typography>
          <List dense>
            {fichasList.length === 0 && (
              <Typography>Nenhuma ficha criada.</Typography>
            )}
            {fichasList.map((fid) => (
              <ListItem
                key={fid}
                button
                selected={selectedFichaEmail === fid}
                onClick={() => setSelectedFichaEmail(fid)}
              >
                <ListItemText primary={fid} />
              </ListItem>
            ))}
          </List>
          <Divider sx={{ my: 1 }} />

          {/* 🔹 Novo formulário de criação de conta + ficha */}
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Criar nova conta + ficha vazia
          </Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <TextField
              label="E-mail do jogador"
              fullWidth
              size="small"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
            />
            <TextField
              label="Senha"
              type="password"
              fullWidth
              size="small"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
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
        </>
      ) : (
        <FichaPersonagem
          user={user}
          fichaId={selectedFichaEmail}
          isMestre={role === "master"}
        />
      )}
    </Paper>
  );
}

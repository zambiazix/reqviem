// src/App.jsx
import React, { useEffect, useState, useCallback, memo } from "react";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import {
  CssBaseline,
  Box,
  Grid,
  Paper,
  Button,
  Typography,
  Divider,
  IconButton,
  TextField,
} from "@mui/material";
import LogoutIcon from "@mui/icons-material/Logout";

import { auth, db } from "./firebaseConfig";
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import { collection, getDocs, doc, getDoc, setDoc } from "firebase/firestore";
import SoundBoard from "./components/SoundBoard";
import Chat from "./components/Chat";
import FichaPersonagem from "./components/FichaPersonagem";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import BattleMap from "./components/BattleMap";
import AudioProvider from "./context/AudioProvider";
import VoiceProvider from "./context/VoiceProvider";
import MesaRPG from "./components/MesaRPG";
import MapaMundi from "./pages/MapaMundi";
import Sistema from "./pages/Sistema";
import HomePage from "./pages/HomePage";

const theme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: "#1976d2" },
    background: { default: "#121212", paper: "#1e1e1e" },
    text: { primary: "#ffffff" },
  },
});

const MASTER_EMAIL = "mestre@reqviemrpg.com";

const LoginForm = memo(function LoginForm({ onLogin }) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, senha);
      onLogin();
    } catch {
      setErro("Email ou senha incorretos");
    }
  };

  return (
    <Box
      sx={{
        height: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#121212",
      }}
    >
      <Paper
        sx={{
          p: 3,
          m: "auto",
          maxWidth: 400,
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: 2,
        }}
      >
        <Box sx={{ flexShrink: 0 }}>
          <img
            src="/logo.png"
            alt="Logo Réquiem RPG"
            style={{
              width: "80px",
              height: "80px",
              borderRadius: "50%",
              objectFit: "contain",
              boxShadow:
                "0 0 6px rgba(255,255,255,0.4), 0 0 10px rgba(255,255,255,0.2)",
            }}
          />
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Fazer Login
          </Typography>
          {erro && <Typography color="error">{erro}</Typography>}
          <form onSubmit={handleSubmit}>
            <TextField
              label="E-mail"
              variant="outlined"
              size="small"
              fullWidth
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              sx={{ mb: 1 }}
            />
            <TextField
              label="Senha"
              type="password"
              variant="outlined"
              size="small"
              fullWidth
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              sx={{ mb: 2 }}
            />
            <Button variant="contained" type="submit" fullWidth>
              Entrar
            </Button>
          </form>
        </Box>
      </Paper>
    </Box>
  );
});

export default function App() {
  const [user, setUser] = useState(null);
  const [authLoaded, setAuthLoaded] = useState(false);
  const [userNick, setUserNick] = useState("");
  const [role, setRole] = useState("");
  const [fichasList, setFichasList] = useState([]);
  const [selectedFichaEmail, setSelectedFichaEmail] = useState(null);
  const [createEmailInput, setCreateEmailInput] = useState("");
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Responsividade
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Carregar fichas
  const carregarListaFichas = useCallback(async () => {
    try {
      const col = collection(db, "fichas");
      const snapshot = await getDocs(col);
      const list = snapshot.docs.map((d) => d.id);
      setFichasList(list);
      if (list.length > 0 && !selectedFichaEmail) {
        setSelectedFichaEmail(list[0]);
      }
    } catch (err) {
      console.error("Erro ao carregar fichas:", err);
    }
  }, [selectedFichaEmail]);

  // Monitorar login
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u || null);
      setAuthLoaded(true);

      if (u) {
        try {
          const userDocRef = doc(db, "users", u.email);
          const userSnap = await getDoc(userDocRef);
          const data = userSnap.exists() ? userSnap.data() : {};
          const userRole =
            data.role || (u.email === MASTER_EMAIL ? "master" : "player");

          setUserNick(data.nick || u.email);
          setRole(userRole);

          if (userRole === "master") {
            carregarListaFichas();
          } else {
            // 🔹 Jogador comum vê apenas sua ficha
            setSelectedFichaEmail(u.email);
          }
        } catch (err) {
          console.error("Erro ao buscar user doc:", err);
        }
      } else {
        setUserNick("");
        setRole("");
        setFichasList([]);
        setSelectedFichaEmail(null);
      }
    });
    return () => unsub();
  }, [carregarListaFichas]);

  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
    setUserNick("");
    setRole("");
    setFichasList([]);
    setSelectedFichaEmail(null);
  };

  async function criarFichaParaEmail(email) {
    if (!email) return alert("Digite um e-mail para criar a ficha.");
    try {
      const fichaVazia = {
        nome: "",
        genero: "",
        idade: "",
        altura: "",
        peso: "",
        movimentacao: "",
        defeitos: "",
        tracos: "",
        pontosVida: 0,
        pontosEnergia: 0,
        armadura: "0/25",
        caracteristicas: "",
        atributos: {
          forca: 1,
          destreza: 1,
          agilidade: 1,
          constituicao: 1,
          inteligencia: 1,
          vontade: 1,
        },
        pericias: {},
        habilidades: [],
        equipamentos: [],
        vestes: [],
        diversos: [],
        moedas: { cobre: 0, prata: 0, ouro: 0 },
        anotacoes: "",
        dono: email,
      };

      await setDoc(doc(db, "fichas", email), fichaVazia);
      alert("Ficha criada para " + email);
      await carregarListaFichas();
      setSelectedFichaEmail(email);
    } catch (err) {
      console.error("Erro ao criar ficha:", err);
      alert("Erro ao criar ficha: " + err.message);
    }
  }

  // Aguarda o Firebase
  if (!authLoaded) {
    return (
      <Box
        sx={{
          height: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          color: "#aaa",
        }}
      >
        Carregando...
      </Box>
    );
  }

  if (!user) return <LoginForm onLogin={() => {}} />;

  const isMaster = role === "master";

  return (
    <VoiceProvider>
      <AudioProvider>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <Router>
            <Box sx={{ height: "100vh", p: 2 }}>
              <Grid
                container
                sx={{
                  height: "100%",
                  flexWrap: isMobile ? "wrap" : "nowrap",
                  flexDirection: isMobile ? "column" : "row",
                }}
              >
                {/* === COLUNA ESQUERDA === */}
                <Grid
                  item
                  sx={{
                    flex: isMobile ? "1 1 100%" : "1 1 33%",
                    minWidth: 0,
                    display: "flex",
                    flexDirection: "column",
                    borderRight: isMobile
                      ? "none"
                      : "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  {/* Cabeçalho */}
                  <Paper sx={{ p: 2, flexShrink: 0 }}>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        mb: 2,
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                        <img
                          src="/logo.png"
                          alt="Logo Réquiem RPG"
                          style={{
                            width: "80px",
                            height: "80px",
                            borderRadius: "50%",
                            objectFit: "contain",
                            boxShadow:
                              "0 0 6px rgba(255,255,255,0.4), 0 0 10px rgba(255,255,255,0.2)",
                          }}
                        />
                        <Box>
                          <Typography variant="h6">Bem-vindo,</Typography>
                          <Typography variant="subtitle1">
                            {userNick}
                          </Typography>
                          <Typography variant="caption" display="block">
                            {user?.email}
                          </Typography>
                        </Box>
                      </Box>
                      <IconButton color="inherit" onClick={handleLogout}>
                        <LogoutIcon />
                      </IconButton>
                    </Box>

                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "center",
                        gap: 1.5,
                        flexWrap: "wrap",
                      }}
                    >
                      <Button variant="contained" component={Link} to="/map">
                        Grid
                      </Button>
                      <Button variant="contained" component={Link} to="/cronica">
                        Crônica
                      </Button>
                      <Button variant="contained" component={Link} to="/sistema">
                        Sistema
                      </Button>
                    </Box>
                  </Paper>

                  {/* Chat de voz */}
                  <Paper sx={{ p: 1, flexShrink: 0, mt: 2 }}>
                    <MesaRPG userNick={userNick} />
                  </Paper>

                  {/* Chat */}
                  <Paper
                    sx={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      mt: 2,
                      overflow: "hidden",
                    }}
                  >
                    <Chat userNick={userNick} userEmail={user?.email} />
                  </Paper>
                </Grid>

                {/* === DIREITA (Fichas e Sons) === */}
                {!isMobile && (
                  <Grid
                    item
                    sx={{
                      flex: "1 1 67%",
                      display: "flex",
                      flexDirection: "row",
                      gap: 2,
                    }}
                  >
                    {isMaster ? (
                      <>
                        <HomePage
                          user={user}
                          role={role}
                          fichasList={fichasList}
                          selectedFichaEmail={selectedFichaEmail}
                          setSelectedFichaEmail={setSelectedFichaEmail}
                          criarFichaParaEmail={criarFichaParaEmail}
                        />
                        <Paper sx={{ flex: 1, overflowY: "auto", p: 2 }}>
                          <FichaPersonagem
                            user={user}
                            fichaId={selectedFichaEmail}
                            isMestre={true}
                          />
                        </Paper>
                      </>
                    ) : (
                      <Paper sx={{ flex: 1, overflowY: "auto", p: 2 }}>
                        <FichaPersonagem
                          user={user}
                          fichaId={selectedFichaEmail}
                          isMestre={false}
                        />
                      </Paper>
                    )}
                  </Grid>
                )}
              </Grid>
            </Box>

            <Routes>
              <Route path="/map" element={<BattleMap />} />
              <Route path="/cronica" element={<MapaMundi />} />
              <Route path="/sistema" element={<Sistema />} />
            </Routes>
          </Router>
        </ThemeProvider>
      </AudioProvider>
    </VoiceProvider>
  );
}

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
import HomePage from "./pages/HomePage"; // ✅ usa o componente novo

const theme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: "#1976d2" },
    background: { default: "#121212", paper: "#1e1e1e" },
    text: { primary: "#ffffff" },
  },
  components: {
    MuiInputBase: { styleOverrides: { input: { color: "#ffffff" } } },
    MuiInputLabel: { styleOverrides: { root: { color: "#ffffff" } } },
    MuiTextField: {
      styleOverrides: {
        root: {
          "& .MuiInputBase-input": { color: "#fff" },
          "& .MuiInputLabel-root": { color: "#fff" },
        },
      },
    },
  },
});

const MASTER_EMAIL = "mestre@reqviemrpg.com";

const LoginForm = memo(function LoginForm({ onLogin }) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await signInWithEmailAndPassword(auth, email, senha);
      onLogin();
    } catch {
      setErro("Email ou senha incorretos");
    }
  };

  return (
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
          <Button variant="contained" type="submit" fullWidth>
            Entrar
          </Button>
        </form>
      </Box>
    </Paper>
  );
});

export default function App() {
  const [user, setUser] = useState(null);
  const [userNick, setUserNick] = useState("");
  const [role, setRole] = useState("");
  const [fichasList, setFichasList] = useState([]);
  const [selectedFichaEmail, setSelectedFichaEmail] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const carregarListaFichas = useCallback(async () => {
    try {
      const col = collection(db, "fichas");
      const snapshot = await getDocs(col);
      const list = snapshot.docs.map((d) => d.id);
      setFichasList(list);
      if (list.length > 0 && !selectedFichaEmail) setSelectedFichaEmail(list[0]);
    } catch (err) {
      console.error("Erro ao carregar fichas:", err);
    }
  }, [selectedFichaEmail]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u || null);
      if (u) {
        try {
          const userDoc = doc(db, "users", u.email);
          const snap = await getDoc(userDoc);
          if (snap.exists()) {
            const data = snap.data();
            setUserNick(data.nick || u.email);
            setRole(
              data.role || (u.email === MASTER_EMAIL ? "master" : "player")
            );
          } else {
            setUserNick(u.email);
            setRole(u.email === MASTER_EMAIL ? "master" : "player");
          }
          if (u.email === MASTER_EMAIL) carregarListaFichas();
          else setSelectedFichaEmail(u.email);
        } catch (err) {
          console.error("Erro userDoc:", err);
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

  function Home() {
    const isMaster = role === "master";
    const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

    useEffect(() => {
      const handleResize = () => setIsMobile(window.innerWidth < 1024);
      handleResize();
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }, []);

    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
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
              {!user ? (
                <LoginForm onLogin={() => {}} />
              ) : (
                <>
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
                          <Typography variant="subtitle1">{userNick}</Typography>
                          <Typography variant="caption" display="block">
                            {user?.email}
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{
                              fontSize: "0.7rem",
                              color: "rgba(255,255,255,0.5)",
                              display: "block",
                            }}
                          >
                            APP Réquiem RPG — versão 2.3 - By: Zambiazi
                          </Typography>
                        </Box>
                      </Box>
                      <IconButton color="inherit" onClick={handleLogout} title="Sair">
                        <LogoutIcon />
                      </IconButton>
                    </Box>

                    {/* Navegação */}
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
                    <Box
                      sx={{
                        flex: 1,
                        overflowY: "auto",
                        maxHeight: isMobile ? "60vh" : "none",
                      }}
                    >
                      <Chat userNick={userNick} userEmail={user?.email} />
                    </Box>
                  </Paper>
                </>
              )}
            </Grid>

            {/* === COLUNAS EXTRAS (somente DESKTOP) === */}
            {!isMobile && isMaster && (
              <>
                <Grid
                  item
                  sx={{
                    flex: "1 1 25%",
                    minWidth: 0,
                    display: "flex",
                    flexDirection: "column",
                    borderRight: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <HomePage
                    user={user}
                    role={role}
                    fichasList={fichasList}
                    selectedFichaEmail={selectedFichaEmail}
                    setSelectedFichaEmail={setSelectedFichaEmail}
                  />
                  <Box
                    sx={{
                      borderTop: "1px solid rgba(255,255,255,0.1)",
                      p: 1,
                    }}
                  >
                    <SoundBoard isMaster={true} />
                  </Box>
                </Grid>

                <Grid
                  item
                  sx={{
                    flex: "1 1 42%",
                    minWidth: 0,
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <Paper sx={{ flex: 1, overflowY: "auto", p: 2 }}>
                    {user ? (
                      <FichaPersonagem
                        user={user}
                        fichaId={selectedFichaEmail}
                        isMestre={true}
                      />
                    ) : (
                      <Typography>Faça login para editar suas fichas.</Typography>
                    )}
                  </Paper>
                </Grid>
              </>
            )}
          </Grid>
        </Box>
      </ThemeProvider>
    );
  }

  return (
    <VoiceProvider>
      <AudioProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/map" element={<BattleMap />} />
            <Route path="/cronica" element={<MapaMundi />} />
            <Route path="/sistema" element={<Sistema />} />
          </Routes>
        </Router>
      </AudioProvider>
    </VoiceProvider>
  );
}

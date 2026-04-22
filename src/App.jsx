// src/App.jsx
import React, { useEffect, useState, useCallback } from "react";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { CssBaseline } from "@mui/material";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { auth, db } from "./firebaseConfig";
import { signOut, onAuthStateChanged, createUserWithEmailAndPassword } from "firebase/auth";
import { collection, getDocs, doc, getDoc, setDoc } from "firebase/firestore";

// Importe o Home do arquivo separado
import Home from "./components/Home";
import LoadingProvider from "./context/LoadingProvider";
import AudioProvider from "./context/AudioProvider";
import VoiceProvider from "./context/VoiceProvider";
import JitsiProvider from "./context/JitsiProvider";
import GameProvider from "./context/GameProvider";
import BattleMap from "./components/BattleMap";
import MapaMundi from "./pages/MapaMundi";
import Sistema from "./pages/Sistema";
import FloatingHUD from "./components/FloatingHUD";
import RouteLoadingWatcher from "./components/RouteLoadingWatcher"; // extraia também
import { openCommerceHUD, closeCommerceHUD } from "./CommerceHUDRoot";

const MASTER_EMAIL = "mestre@reqviemrpg.com";

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

const initialFichaBlank = {
  nome: "", genero: "", idade: "", altura: "", peso: "", movimentacao: "", defeitos: "", tracos: "",
  pontosVida: 0, pontosEnergia: 0, armadura: "0/25", caracteristicas: "",
  atributos: { forca: 1, destreza: 1, agilidade: 1, constituicao: 1, inteligencia: 1, vontade: 1 },
  pericias: {}, habilidades: [], equipamentos: [], vestes: [], diversos: [],
  moedas: { cobre: 0, prata: 0, ouro: 0 }, anotacoes: "", dono: "",
};

export default function App() {
  const [user, setUser] = useState(null);
  const [userNick, setUserNick] = useState("");
  const [role, setRole] = useState("");
  const [fichasList, setFichasList] = useState([]);
  const [selectedFichaEmail, setSelectedFichaEmail] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [fichaAtual, setFichaAtual] = useState(null);

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
      console.error("Erro ao carregar lista de fichas:", err);
    }
  }, [selectedFichaEmail]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u || null);
      if (u) {
        try {
          const fichaRef = doc(db, "fichas", u.email);
          const fichaSnap = await getDoc(fichaRef);
          if (fichaSnap.exists()) {
            const ficha = fichaSnap.data();
            setUserNick(ficha.nome || u.email);
            const imagemPrincipal = ficha.imagens?.[ficha.imagemPrincipalIndex || 0] || ficha.imagemPersonagem || null;
            setFichaAtual({ ...ficha, imagemPrincipal });
            localStorage.setItem('userName', ficha.nome || u.email);
            localStorage.setItem('userEmail', u.email);
            if (ficha.imagemPersonagem) localStorage.setItem('userAvatar', ficha.imagemPersonagem);
          } else {
            setUserNick(u.email);
            localStorage.setItem('userName', u.email);
            localStorage.setItem('userEmail', u.email);
            localStorage.removeItem('userAvatar');
          }
          setRole(u.email === MASTER_EMAIL ? "master" : "player");
          if (u.email === MASTER_EMAIL) {
            await carregarListaFichas();
          } else {
            setSelectedFichaEmail(u.email);
          }
        } catch (err) {
          console.error("Erro ao buscar user doc:", err);
          setUserNick(u.email);
          setRole(u.email === MASTER_EMAIL ? "master" : "player");
          localStorage.setItem('userName', u.email);
          localStorage.setItem('userEmail', u.email);
        }
      } else {
        setUserNick("");
        setRole("");
        setFichasList([]);
        setSelectedFichaEmail(null);
        localStorage.removeItem('userName');
        localStorage.removeItem('userEmail');
        localStorage.removeItem('userAvatar');
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

  async function criarContaEJogador(email, senha) {
    if (!email || !senha) return alert("Digite e-mail e senha para criar a conta.");
    if (senha.length < 6) return alert("A senha deve ter pelo menos 6 caracteres.");
    try {
      await createUserWithEmailAndPassword(auth, email, senha);
      const payload = { ...initialFichaBlank, dono: email, nome: email.split('@')[0] };
      await setDoc(doc(db, "fichas", email), payload);
      await carregarListaFichas();
      setSelectedFichaEmail(email);
      alert(`Conta criada com sucesso! Bem-vindo(a), ${email}`);
    } catch (err) {
      console.error("Erro ao criar conta:", err);
      if (err.code === 'auth/email-already-in-use') alert("Este e-mail já está cadastrado.");
      else if (err.code === 'auth/invalid-email') alert("E-mail inválido.");
      else if (err.code === 'auth/weak-password') alert("Senha muito fraca.");
      else alert("Erro ao criar conta: " + err.message);
    }
  }

  // 🟢 ADICIONE ESTA FUNÇÃO AQUI (linha ~140)
const handleRegister = useCallback(async (email) => {
  console.log("🎉 Nova conta criada:", email);
  
  // Se for o mestre, recarrega a lista de fichas
  if (role === "master") {
    await carregarListaFichas();
  }
  
  // Opcional: Mostrar uma mensagem de boas-vindas no chat ou console
  // Você pode adicionar uma notificação visual aqui se quiser
}, [role, carregarListaFichas]);

  const isMasterFlag = role === "master";
  const currentUserEmail = user?.email || null;

  return (
    <Router>
      <JitsiProvider>
        <VoiceProvider>
          <AudioProvider>
            <LoadingProvider>
              <RouteLoadingWatcher />
              <GameProvider currentUserEmail={currentUserEmail} isMaster={isMasterFlag}>
                {!isMobile && (
                  <FloatingHUD 
                    userEmail={currentUserEmail} 
                    openCommerce={openCommerceHUD} 
                    closeCommerce={closeCommerceHUD} 
                  />
                )}
                <Routes>
                  <Route 
                    path="/" 
                    element={
                      <Home
                        user={user}
                        userNick={userNick}
                        role={role}
                        fichasList={fichasList}
                        selectedFichaEmail={selectedFichaEmail}
                        setSelectedFichaEmail={setSelectedFichaEmail}
                        criarContaEJogador={criarContaEJogador}
                        handleLogout={handleLogout}
                        fichaAtual={fichaAtual}
                        theme={theme}
                        onRegister={handleRegister}
                      />
                    } 
                  />
                  <Route path="/map" element={<BattleMap />} />
                  <Route path="/cronica" element={<MapaMundi />} />
                  <Route path="/sistema" element={<Sistema />} />
                </Routes>
              </GameProvider>
            </LoadingProvider>
          </AudioProvider>
        </VoiceProvider>
      </JitsiProvider>
    </Router>
  );
}
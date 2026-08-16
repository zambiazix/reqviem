// src/App.jsx
import React, { useEffect, useState, useCallback, useMemo, lazy, Suspense } from "react";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { CssBaseline } from "@mui/material";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { auth, db } from "./firebaseConfig";
import { signOut, onAuthStateChanged, createUserWithEmailAndPassword } from "firebase/auth";
import { collection, getDocs, doc, getDoc, setDoc } from "firebase/firestore";
import { FloatingWindowsProvider } from "./context/FloatingWindowsContext";
import FloatingChat from "./components/FloatingChat";
import FloatingFicha from "./components/FloatingFicha";
import Conquistas from "./components/Conquistas";
import ConquistasWatcher from "./components/ConquistasWatcher";
import MusicMixerButton from "./components/MusicMixerButton";
import WhatsAppNotifier from "./components/WhatsAppNotifier";

// Importe o Home do arquivo separado
import Home from "./components/Home";
import BolsaValores from "./components/BolsaValores";
import LoadingProvider from "./context/LoadingProvider";
import AudioProvider from "./context/AudioProvider";
import VoiceProvider from "./context/VoiceProvider";
import JitsiProvider from "./context/JitsiProvider";
import GameProvider from "./context/GameProvider";
import BattleMap from "./components/BattleMap";
import MapaMundi from "./pages/MapaMundi";
import Sistema from "./pages/Sistema";
import FloatingHUD from "./components/FloatingHUD";
import SidebarHUD from "./components/SidebarHUD";
import HUDMobile from "./components/HUDMobile";
import RouteLoadingWatcher from "./components/RouteLoadingWatcher";
import { openCommerceHUD, closeCommerceHUD } from "./CommerceHUDRoot";

const MASTER_EMAIL = "mestre@reqviemrpg.com";

// 🟢 THEME (sem useMemo - já é criado apenas uma vez)
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
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  const [fichaAtual, setFichaAtual] = useState(null);
  const [bolsaAberta, setBolsaAberta] = useState(false);
  const [conquistasOpen, setConquistasOpen] = useState(false);
  const [whatsappNotificacoes, setWhatsappNotificacoes] = useState({});

  // 🟢 TOGGLE CONQUISTAS GLOBAL
  useEffect(() => {
    window.__toggleConquistas = () => setConquistasOpen(prev => !prev);
    return () => { delete window.__toggleConquistas; };
  }, []);

  // 🟢 OUVIR EVENTO PARA ABRIR A BOLSA
  useEffect(() => {
    const handleAbrirBolsa = () => setBolsaAberta(true);
    window.addEventListener('abrirBolsaValores', handleAbrirBolsa);
    return () => window.removeEventListener('abrirBolsaValores', handleAbrirBolsa);
  }, []);

  // 🟢 RESIZE COM PASSIVE
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize, { passive: true });
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // 🟢 CARREGAR LISTA DE FICHAS (MEMOIZADO)
  const carregarListaFichas = useCallback(async () => {
    try {
      const col = collection(db, "fichas");
      const snapshot = await getDocs(col);
      const list = snapshot.docs.map((d) => d.id);
      setFichasList(list);
      
      if (list.length > 0 && !selectedFichaEmail) {
        const mestreFicha = list.find(email => email === MASTER_EMAIL);
        if (mestreFicha && role === "master") {
          setSelectedFichaEmail(MASTER_EMAIL);
        } else {
          setSelectedFichaEmail(list[0]);
        }
      }
    } catch (err) {
      console.error("Erro ao carregar lista de fichas:", err);
    }
  }, [selectedFichaEmail, role]);

  // 🟢 AUTH STATE CHANGED (OTIMIZADO)
  useEffect(() => {
    let mounted = true;
    
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!mounted) return;
      
      setUser(u || null);
      
      if (u) {
        try {
          const fichaRef = doc(db, "fichas", u.email);
          const fichaSnap = await getDoc(fichaRef);
          
          if (!mounted) return;
          
          if (fichaSnap.exists()) {
            const ficha = fichaSnap.data();
            setUserNick(ficha.nome || u.email);
            const imagemPrincipal = ficha.imagens?.[ficha.imagemPrincipalIndex || 0] || ficha.imagemPersonagem || null;
            setFichaAtual({ ...ficha, imagemPrincipal });
            localStorage.setItem('userName', ficha.nome || u.email);
            localStorage.setItem('userEmail', u.email);
            if (ficha.imagemPersonagem) localStorage.setItem('userAvatar', ficha.imagemPersonagem);
          } else {
            if (u.email === MASTER_EMAIL) {
              setUserNick("MESTRE");
              const mestreRef = doc(db, "fichas", MASTER_EMAIL);
              const mestreSnap = await getDoc(mestreRef);
              
              if (!mounted) return;
              
              if (!mestreSnap.exists()) {
                await setDoc(mestreRef, {
                  nome: "👑 MESTRE",
                  tipoFicha: "PM",
                  dono: MASTER_EMAIL,
                  imagemPersonagem: "https://cdn-icons-png.flaticon.com/512/3171/3171927.png",
                  imagens: ["https://cdn-icons-png.flaticon.com/512/3171/3171927.png"],
                  imagemPrincipalIndex: 0,
                  genero: "Masculino",
                  idade: "",
                  altura: "",
                  peso: "",
                  pontosVida: 100,
                  pontosEnergia: 50,
                  armadura: 0,
                  atributos: { forca: 5, destreza: 5, agilidade: 5, constituicao: 5, inteligencia: 5, vontade: 5 },
                  pericias: { aura: 5 },
                  habilidades: [],
                  equipamentos: [],
                  vestes: [],
                  diversos: [],
                  moedas: 0,
                  anotacoes: "",
                  background: "",
                  defeitos: "",
                  tracos: "",
                  caracteristicas: "",
                  movimentacao: "",
                  ignorarLimitePeso: true,
                  ignorarLimiteHabilidades: true,
                  permitirRedistribuirPontos: false,
                  inventariosSecundarios: []
                });
                console.log("✅ Ficha do Mestre criada!");
              }
              localStorage.setItem('userName', "MESTRE");
              localStorage.setItem('userEmail', u.email);
            } else {
              setUserNick(u.email);
              localStorage.setItem('userName', u.email);
              localStorage.setItem('userEmail', u.email);
            }
            localStorage.removeItem('userAvatar');
          }
          
          setRole(u.email === MASTER_EMAIL ? "master" : "player");
          
          if (u.email === MASTER_EMAIL) {
            if (!selectedFichaEmail) {
              setSelectedFichaEmail(MASTER_EMAIL);
            }
            await carregarListaFichas();
          } else {
            setSelectedFichaEmail(u.email);
          }
        } catch (err) {
          console.error("Erro ao buscar user doc:", err);
          if (!mounted) return;
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
    
    return () => {
      mounted = false;
      unsub();
    };
  }, [carregarListaFichas]);

  // 🟢 LOGOUT (MEMOIZADO)
  const handleLogout = useCallback(async () => {
    await signOut(auth);
    setUser(null);
    setUserNick("");
    setRole("");
    setFichasList([]);
    setSelectedFichaEmail(null);
  }, []);

  // 🟢 CRIAR CONTA (MEMOIZADO)
  const criarContaEJogador = useCallback(async (email, senha) => {
    if (!email || !senha) return alert("Digite e-mail e senha para criar a conta.");
    if (senha.length < 6) return alert("A senha deve ter pelo menos 6 caracteres.");
    
    if (email === MASTER_EMAIL) {
      return alert("Não é possível criar outra conta de mestre.");
    }
    
    try {
      await createUserWithEmailAndPassword(auth, email, senha);
      const payload = { 
        ...initialFichaBlank, 
        dono: email, 
        nome: email.split('@')[0],
        tipoFicha: "PJ"
      };
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
  }, [carregarListaFichas]);

  // 🟢 HANDLE REGISTER (MEMOIZADO)
  const handleRegister = useCallback(async (email) => {
    console.log("🎉 Nova conta criada:", email);
    if (role === "master") {
      await carregarListaFichas();
    }
  }, [role, carregarListaFichas]);

  // 🟢 VALORES DERIVADOS (MEMOIZADO)
  const isMasterFlag = useMemo(() => role === "master", [role]);
  const currentUserEmail = useMemo(() => user?.email || null, [user]);

  // 🟢 FUNÇÕES GLOBAIS
  useEffect(() => {
    window.__togglePerfis = () => {
      window.dispatchEvent(new CustomEvent('togglePerfis'));
    };
    window.__toggleComercio = () => {
      openCommerceHUD();
    };
    
    return () => {
      delete window.__togglePerfis;
      delete window.__toggleComercio;
    };
  }, []);

  // 🟢 OUVIR EVENTOS DE TOGGLE
  useEffect(() => {
    const handleTogglePerfis = () => {
      window.dispatchEvent(new CustomEvent('abrirPerfilDetalhado'));
    };
    const handleToggleComercio = () => {
      openCommerceHUD();
    };
    
    window.addEventListener('togglePerfis', handleTogglePerfis);
    window.addEventListener('toggleComercio', handleToggleComercio);
    
    return () => {
      window.removeEventListener('togglePerfis', handleTogglePerfis);
      window.removeEventListener('toggleComercio', handleToggleComercio);
    };
  }, []);

  // 🟢 ATUALIZAR FICHAS MAP SOCIAL (OTIMIZADO COM RAF)
  useEffect(() => {
    let rafId = null;
    
    const atualizar = () => {
      if (window.__fichasMapSocial && Object.keys(window.__fichasMapSocial).length > 0) {
        window.dispatchEvent(new CustomEvent('fichasMapUpdated', { detail: window.__fichasMapSocial }));
      }
      rafId = requestAnimationFrame(atualizar);
    };
    
    rafId = requestAnimationFrame(atualizar);
    
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  // 🟢 MEMOIZAR PROPS DO FLOATING CHAT/FICHA
  const floatingChatProps = useMemo(() => ({
    userNick,
    userEmail: currentUserEmail
  }), [userNick, currentUserEmail]);

  const floatingFichaProps = useMemo(() => ({
    user,
    fichaId: selectedFichaEmail,
    isMestre: isMasterFlag
  }), [user, selectedFichaEmail, isMasterFlag]);

  const sidebarHudProps = useMemo(() => ({
    userEmail: currentUserEmail,
    userNick,
    isMaster: isMasterFlag,
    fichasMap: window.__fichasMapSocial || {},
    whatsappNotificacoes,
    setWhatsappNotificacoes
  }), [currentUserEmail, userNick, isMasterFlag, whatsappNotificacoes]);

  const floatingHudProps = useMemo(() => ({
    userEmail: currentUserEmail,
    openCommerce: openCommerceHUD,
    closeCommerce: closeCommerceHUD
  }), [currentUserEmail]);

  const hudMobileProps = useMemo(() => ({
    userEmail: currentUserEmail,
    openCommerce: openCommerceHUD,
    closeCommerce: closeCommerceHUD
  }), [currentUserEmail]);

  const bolsaProps = useMemo(() => ({
    userEmail: currentUserEmail,
    fichasMap: window.__fichasMapSocial || {},
    isMaster: isMasterFlag
  }), [currentUserEmail, isMasterFlag]);

  const conquistasProps = useMemo(() => ({
    userEmail: currentUserEmail,
    userNick
  }), [currentUserEmail, userNick]);

  const whatsappNotifierProps = useMemo(() => ({
    userEmail: currentUserEmail,
    fichasMap: window.__fichasMapSocial || {},
    setNotificacoes: setWhatsappNotificacoes
  }), [currentUserEmail]);

  return (
    <Router>
      <FloatingWindowsProvider>
        <JitsiProvider>
          <VoiceProvider>
            <AudioProvider>
              <MusicMixerButton />
              <LoadingProvider>
                <RouteLoadingWatcher />
                <GameProvider currentUserEmail={currentUserEmail} isMaster={isMasterFlag}>
                  <ConquistasWatcher userEmail={currentUserEmail} />
                  <WhatsAppNotifier {...whatsappNotifierProps} />
                  
                  {!isMobile && <SidebarHUD {...sidebarHudProps} />}
                  
                  {!isMobile && <FloatingHUD {...floatingHudProps} />}
                  
                  <HUDMobile {...hudMobileProps} />
                  
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
                    <Route path="/map" element={
                      <>
                        <BattleMap />
                        {!isMobile && <FloatingChat {...floatingChatProps} />}
                        {!isMobile && <FloatingFicha {...floatingFichaProps} />}
                      </>
                    } />
                    <Route path="/cronica" element={
                      <>
                        <MapaMundi />
                        {!isMobile && <FloatingChat {...floatingChatProps} />}
                        {!isMobile && <FloatingFicha {...floatingFichaProps} />}
                      </>
                    } />
                    <Route path="/sistema" element={
                      <>
                        <Sistema />
                        {!isMobile && <FloatingChat {...floatingChatProps} />}
                        {!isMobile && <FloatingFicha {...floatingFichaProps} />}
                      </>
                    } />
                  </Routes>
                  
                  {bolsaAberta && (
                    <BolsaValores 
                      {...bolsaProps}
                      onClose={() => setBolsaAberta(false)} 
                    />
                  )}
                  
                  {conquistasOpen && (
                    <Conquistas 
                      {...conquistasProps}
                      onClose={() => setConquistasOpen(false)} 
                    />
                  )}
                </GameProvider>
              </LoadingProvider>
            </AudioProvider>
          </VoiceProvider>
        </JitsiProvider>
      </FloatingWindowsProvider>
    </Router>
  );
}
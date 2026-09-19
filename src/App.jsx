// src/App.jsx
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { CssBaseline, Typography } from "@mui/material";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { auth, db } from "./firebaseConfig";
import { signOut, onAuthStateChanged, createUserWithEmailAndPassword } from "firebase/auth";
import {
  collection, getDocs, doc, getDoc, setDoc,
  query, where, onSnapshot,
} from "firebase/firestore";
import { FloatingWindowsProvider } from "./context/FloatingWindowsContext";
import FloatingChat from "./components/FloatingChat";
import FloatingFicha from "./components/FloatingFicha";
import Conquistas from "./components/Conquistas";
import ConquistasWatcher from "./components/ConquistasWatcher";
import MusicMixerButton from "./components/MusicMixerButton";
import WhatsAppNotifier from "./components/WhatsAppNotifier";

import Home from "./components/Home";
import BolsaValores from "./components/BolsaValores";
import LoadingProvider from "./context/LoadingProvider";
import { AudioProvider } from "./context/AudioProvider";
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
import CommerceHUD from "./components/CommerceHUD";
import HackeamentoGame from "./components/HackeamentoGame";

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
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  const [fichaAtual, setFichaAtual] = useState(null);
  const [bolsaAberta, setBolsaAberta] = useState(false);
  const [conquistasOpen, setConquistasOpen] = useState(false);
  const [whatsappNotificacoes, setWhatsappNotificacoes] = useState({});
  const [battleMapVisible, setBattleMapVisible] = useState(false);
  const [comercioOpen, setComercioOpen] = useState(false);

  // 🟢 Hackeamento global
  const [hackeamentoAtivo, setHackeamentoAtivo] = useState(null);
  const [hackeamentoMinimizado, setHackeamentoMinimizado] = useState(false);

  const openCommerceHUD = () => setComercioOpen(true);
  const closeCommerceHUD = () => setComercioOpen(false);

  useEffect(() => {
    window.__toggleConquistas = () => setConquistasOpen(prev => !prev);
    return () => { delete window.__toggleConquistas; };
  }, []);
  useEffect(() => {
    window.__toggleBattleMap = () => setBattleMapVisible(prev => !prev);
    return () => { delete window.__toggleBattleMap; };
  }, []);
  useEffect(() => {
    const handleAbrirBolsa = () => setBolsaAberta(true);
    window.addEventListener('abrirBolsaValores', handleAbrirBolsa);
    return () => window.removeEventListener('abrirBolsaValores', handleAbrirBolsa);
  }, []);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize, { passive: true });
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const carregarListaFichas = useCallback(async () => {
    try {
      const col = collection(db, "fichas");
      const snapshot = await getDocs(col);
      const list = snapshot.docs.map((d) => d.id);
      setFichasList(list);
      if (list.length > 0 && !selectedFichaEmail) {
        const mestreFicha = list.find(email => email === MASTER_EMAIL);
        if (mestreFicha && role === "master") setSelectedFichaEmail(MASTER_EMAIL);
        else setSelectedFichaEmail(list[0]);
      }
    } catch (err) { console.error("Erro ao carregar lista de fichas:", err); }
  }, [selectedFichaEmail, role]);

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
            if (!Array.isArray(ficha.carteiras)) {
              await setDoc(fichaRef, { carteiras: [{ nome: "Bolso", valor: 0 }] }, { merge: true });
              ficha.carteiras = [{ nome: "Bolso", valor: 0 }];
            }
            setUserNick(ficha.isConvidado ? (ficha.nome || u.email) : (ficha.nome || u.email));
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
                  nome: "👑 MESTRE", tipoFicha: "PM", dono: MASTER_EMAIL,
                  imagemPersonagem: "https://cdn-icons-png.flaticon.com/512/3171/3171927.png",
                  imagens: ["https://cdn-icons-png.flaticon.com/512/3171/3171927.png"],
                  imagemPrincipalIndex: 0, genero: "Masculino", idade: "", altura: "", peso: "",
                  pontosVida: 100, pontosEnergia: 50, armadura: 0,
                  carteiras: [{ nome: "Bolso", valor: 999999 }],
                  atributos: { forca: 5, destreza: 5, agilidade: 5, constituicao: 5, inteligencia: 5, vontade: 5 },
                  pericias: { aura: 5 }, habilidades: [], equipamentos: [], vestes: [], diversos: [],
                  moedas: 0, anotacoes: "", background: "", defeitos: "", tracos: "", caracteristicas: "",
                  movimentacao: "", ignorarLimitePeso: true, ignorarLimiteHabilidades: true,
                  permitirRedistribuirPontos: false, inventariosSecundarios: [],
                });
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
            if (!selectedFichaEmail) setSelectedFichaEmail(MASTER_EMAIL);
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
        setUserNick(""); setRole(""); setFichasList([]); setSelectedFichaEmail(null);
        localStorage.removeItem('userName');
        localStorage.removeItem('userEmail');
        localStorage.removeItem('userAvatar');
      }
    });
    return () => { mounted = false; unsub(); };
  }, [carregarListaFichas]);

  const handleLogout = useCallback(async () => {
    await signOut(auth);
    setUser(null); setUserNick(""); setRole(""); setFichasList([]); setSelectedFichaEmail(null);
  }, []);

  const criarContaEJogador = useCallback(async (email, senha) => {
    if (!email || !senha) return alert("Digite e-mail e senha para criar a conta.");
    if (senha.length < 6) return alert("A senha deve ter pelo menos 6 caracteres.");
    if (email === MASTER_EMAIL) return alert("Não é possível criar outra conta de mestre.");
    try {
      await createUserWithEmailAndPassword(auth, email, senha);
      const payload = { ...initialFichaBlank, dono: email, nome: email.split('@')[0], tipoFicha: "PJ" };
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

  const handleRegister = useCallback(async (email) => {
    if (role === "master") await carregarListaFichas();
  }, [role, carregarListaFichas]);

  const isMasterFlag = useMemo(() => role === "master", [role]);
  const currentUserEmail = useMemo(() => user?.email || null, [user]);

  useEffect(() => {
    window.__togglePerfis = () => window.dispatchEvent(new CustomEvent('togglePerfis'));
    window.__toggleComercio = () => openCommerceHUD();
    return () => { delete window.__togglePerfis; delete window.__toggleComercio; };
  }, []);

  useEffect(() => {
    const handleTogglePerfis = () => window.dispatchEvent(new CustomEvent('abrirPerfilDetalhado'));
    const handleToggleComercio = () => openCommerceHUD();
    window.addEventListener('togglePerfis', handleTogglePerfis);
    window.addEventListener('toggleComercio', handleToggleComercio);
    return () => {
      window.removeEventListener('togglePerfis', handleTogglePerfis);
      window.removeEventListener('toggleComercio', handleToggleComercio);
    };
  }, []);

  useEffect(() => {
    let rafId = null;
    const atualizar = () => {
      if (window.__fichasMapSocial && Object.keys(window.__fichasMapSocial).length > 0) {
        window.dispatchEvent(new CustomEvent('fichasMapUpdated', { detail: window.__fichasMapSocial }));
      }
      rafId = requestAnimationFrame(atualizar);
    };
    rafId = requestAnimationFrame(atualizar);
    return () => { if (rafId) cancelAnimationFrame(rafId); };
  }, []);

  // ====================================================================
  // 🟢 LISTENER GLOBAL DE INVASÕES — pega TODOS os docs, não só changes
  // ====================================================================
  useEffect(() => {
    if (!currentUserEmail) return;

    const processarSnap = (snap) => {
      // Varre TODOS os documentos do snapshot (não só docChanges)
      let jogoAtivo = null;
      snap.forEach((docSnap) => {
        const d = docSnap.data();
        const souEnvolvido = d.atacanteEmail === currentUserEmail || d.alvoEmail === currentUserEmail;
        const ativo = d.statusJogo === "ativo" || d.statusJogo === "aguardando_aceite";
        if (souEnvolvido && ativo && !jogoAtivo) jogoAtivo = d;
      });

      if (jogoAtivo) {
        const fichasMap = window.__fichasMapSocial || {};
        setHackeamentoAtivo(prev => {
          const mesmoJogo = prev && prev.atacanteEmail === jogoAtivo.atacanteEmail && prev.alvoEmail === jogoAtivo.alvoEmail;
          if (mesmoJogo) return prev;
          setHackeamentoMinimizado(false); // jogo novo → força abrir
          return {
            atacanteEmail: jogoAtivo.atacanteEmail,
            atacanteNome: jogoAtivo.atacanteNome || fichasMap[jogoAtivo.atacanteEmail]?.nome || jogoAtivo.atacanteEmail,
            alvoEmail: jogoAtivo.alvoEmail,
            alvoNome: jogoAtivo.alvoNome || fichasMap[jogoAtivo.alvoEmail]?.nome || jogoAtivo.alvoEmail,
          };
        });
      } else {
        setHackeamentoAtivo(null);
        setHackeamentoMinimizado(false);
      }
    };

    const q1 = query(collection(db, "hackeamento_games"), where("alvoEmail", "==", currentUserEmail));
    const q2 = query(collection(db, "hackeamento_games"), where("atacanteEmail", "==", currentUserEmail));
    const u1 = onSnapshot(q1, processarSnap);
    const u2 = onSnapshot(q2, processarSnap);
    return () => { u1(); u2(); };
  }, [currentUserEmail]);

  const floatingChatProps = useMemo(() => ({ userNick, userEmail: currentUserEmail }), [userNick, currentUserEmail]);
  const floatingFichaProps = useMemo(() => ({ user, fichaId: selectedFichaEmail, isMestre: isMasterFlag }), [user, selectedFichaEmail, isMasterFlag]);
  const sidebarHudProps = useMemo(() => ({
    userEmail: currentUserEmail, userNick, isMaster: isMasterFlag,
    fichasMap: window.__fichasMapSocial || {},
    whatsappNotificacoes, setWhatsappNotificacoes,
  }), [currentUserEmail, userNick, isMasterFlag, whatsappNotificacoes]);
  const floatingHudProps = useMemo(() => ({ userEmail: currentUserEmail, openCommerce: openCommerceHUD, closeCommerce: closeCommerceHUD }), [currentUserEmail]);
  const hudMobileProps = useMemo(() => ({ userEmail: currentUserEmail, openCommerce: openCommerceHUD, closeCommerce: closeCommerceHUD }), [currentUserEmail]);
  const bolsaProps = useMemo(() => ({ userEmail: currentUserEmail, fichasMap: window.__fichasMapSocial || {}, isMaster: isMasterFlag }), [currentUserEmail, isMasterFlag]);
  const conquistasProps = useMemo(() => ({ userEmail: currentUserEmail, userNick }), [currentUserEmail, userNick]);
  const whatsappNotifierProps = useMemo(() => ({
    userEmail: currentUserEmail, fichasMap: window.__fichasMapSocial || {}, setNotificacoes: setWhatsappNotificacoes,
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

                  <CommerceHUD
                    isMaster={isMasterFlag} visible={comercioOpen}
                    onClose={() => setComercioOpen(false)} currentUserEmail={currentUserEmail}
                  />

                  {!isMobile && <SidebarHUD {...sidebarHudProps} />}
                  {!isMobile && <FloatingHUD {...floatingHudProps} />}
                  <HUDMobile {...hudMobileProps} />

                  <Routes>
                    <Route path="/" element={
                      <Home
                        user={user ? { email: user.email, uid: user.uid, displayName: user.displayName } : null}
                        userNick={userNick} role={role} fichasList={fichasList}
                        selectedFichaEmail={selectedFichaEmail} setSelectedFichaEmail={setSelectedFichaEmail}
                        criarContaEJogador={criarContaEJogador} handleLogout={handleLogout}
                        fichaAtual={fichaAtual} theme={theme} onRegister={handleRegister}
                      />
                    } />
                    <Route path="/map" element={
                      <>
                        <Typography sx={{ color: '#fff', textAlign: 'center', mt: 4 }}>
                          Grid de Batalha disponível na Sidebar
                        </Typography>
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
                    <BolsaValores {...bolsaProps} onClose={() => setBolsaAberta(false)} />
                  )}

                  {conquistasOpen && (
                    <Conquistas {...conquistasProps} onClose={() => setConquistasOpen(false)} />
                  )}

                  <BattleMap visible={battleMapVisible} onClose={() => setBattleMapVisible(false)} />

                  {/* 🟢 HACKEAMENTO — janela principal */}
                  {hackeamentoAtivo && !hackeamentoMinimizado && (
                    <HackeamentoGame
                      atacanteEmail={hackeamentoAtivo.atacanteEmail}
                      atacanteNome={hackeamentoAtivo.atacanteNome}
                      alvoEmail={hackeamentoAtivo.alvoEmail}
                      alvoNome={hackeamentoAtivo.alvoNome}
                      fichasMap={window.__fichasMapSocial || {}}
                      userEmail={currentUserEmail}
                      isMaster={isMasterFlag}
                      onClose={() => setHackeamentoAtivo(null)}
                      onMinimize={() => setHackeamentoMinimizado(true)}
                    />
                  )}

                  {/* 🟢 HACKEAMENTO — versão minimizada (botão flutuante) */}
                  {hackeamentoAtivo && hackeamentoMinimizado && (
                    <Box
                      onClick={() => setHackeamentoMinimizado(false)}
                      sx={{
                        position: "fixed", bottom: 20, right: 20, zIndex: 99999,
                        bgcolor: "#0a0a0a",
                        border: `2px solid ${hackeamentoAtivo.atacanteEmail === currentUserEmail ? "#10b981" : "#3b82f6"}`,
                        borderRadius: 2, px: 2, py: 1, cursor: "pointer",
                        boxShadow: `0 0 25px ${hackeamentoAtivo.atacanteEmail === currentUserEmail ? "rgba(16,185,129,0.5)" : "rgba(59,130,246,0.5)"}`,
                        display: "flex", alignItems: "center", gap: 1,
                        "&:hover": { transform: "scale(1.05)" },
                        transition: "all 0.2s ease",
                        animation: "pulse 2s infinite",
                      }}
                    >
                      <Typography sx={{ fontSize: "1.5rem" }}>
                        {hackeamentoAtivo.atacanteEmail === currentUserEmail ? "💻" : "🛡️"}
                      </Typography>
                      <Box>
                        <Typography sx={{
                          color: hackeamentoAtivo.atacanteEmail === currentUserEmail ? "#10b981" : "#3b82f6",
                          fontWeight: "bold", fontSize: "0.8rem",
                        }}>
                          {hackeamentoAtivo.atacanteEmail === currentUserEmail ? "INVADINDO" : "SOB ATAQUE"}
                        </Typography>
                        <Typography sx={{ color: "#94a3b8", fontSize: "0.65rem" }}>
                          Clique para abrir
                        </Typography>
                      </Box>
                    </Box>
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
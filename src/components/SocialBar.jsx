// src/components/SocialBar.jsx
import React, { useState, useEffect, useRef } from "react";
import {
  Box, Paper, Typography, IconButton, Badge, Avatar, TextField,
  Button, Dialog, DialogTitle, DialogContent, DialogActions,
  List, ListItem, ListItemAvatar, ListItemText, Tabs, Tab,
  Menu, MenuItem, Popover, Chip, CircularProgress, keyframes, Fade, Fab, Divider
} from "@mui/material";
import { styled } from "@mui/material/styles";
import CloseIcon from "@mui/icons-material/Close";
import SendIcon from "@mui/icons-material/Send";
import ImageIcon from "@mui/icons-material/Image";
import GifBoxIcon from "@mui/icons-material/GifBox";
import NotificationsIcon from "@mui/icons-material/Notifications";
import ChatIcon from "@mui/icons-material/Chat";
import PeopleIcon from "@mui/icons-material/People";
import FavoriteIcon from "@mui/icons-material/Favorite";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import { db } from "../firebaseConfig";
import { 
  collection, addDoc, serverTimestamp, query, orderBy, limit,
  onSnapshot, doc, setDoc, getDoc, getDocs, where, updateDoc, deleteDoc 
} from "firebase/firestore";

const GIPHY_API_KEY = "PBsoFISvy4OFVTNfZbpB5yF79ODJyTsc";

// ==================== ANIMAÇÕES ====================
const glowPulse = keyframes`
  0% { box-shadow: 0 0 5px #00e0ff44; }
  50% { box-shadow: 0 0 20px #00e0ff88, 0 0 40px #00e0ff22; }
  100% { box-shadow: 0 0 5px #00e0ff44; }
`;
const floatUp = keyframes`
  0% { transform: translateY(10px); opacity: 0; }
  100% { transform: translateY(0); opacity: 1; }
`;
const matchGlow = keyframes`
  0% { box-shadow: 0 0 10px #ff4081; }
  50% { box-shadow: 0 0 30px #ff4081, 0 0 60px #ff408188; }
  100% { box-shadow: 0 0 10px #ff4081; }
`;

// ==================== COMPONENTES ESTILIZADOS ====================
const GlowPaper = styled(Paper)({
  background: "linear-gradient(145deg, #1a1a2e 0%, #0f172a 100%)",
  border: "1px solid rgba(0, 224, 255, 0.15)",
  backdropFilter: "blur(10px)",
  animation: `${glowPulse} 3s ease-in-out infinite`,
});
const MessageBubble = styled(Paper)(({ isMine }) => ({
  background: isMine ? "linear-gradient(135deg, #1e3a5f 0%, #1a2940 100%)" : "linear-gradient(135deg, #2a2a3a 0%, #1e1e2e 100%)",
  border: isMine ? "1px solid rgba(0, 224, 255, 0.2)" : "1px solid rgba(255,255,255,0.05)",
  borderRadius: isMine ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
  animation: `${floatUp} 0.3s ease-out`,
}));
const MatchCard = styled(Paper)(({ swipeX }) => ({
  width: 200, height: 280, borderRadius: 4, overflow: "hidden",
  bgcolor: "#1a1a2e", border: "1px solid rgba(255,64,129,0.2)",
  transform: `translateX(${swipeX || 0}px) rotate(${(swipeX || 0) * 0.05}deg)`,
  transition: "transform 0.3s ease-out",
  position: "relative",
  userSelect: "none",
  WebkitUserSelect: "none",
  msUserSelect: "none",
}));

// ==================== LIGHTBOX ====================
function LightboxImage({ src, zoom, setZoom }) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [start, setStart] = useState({ x: 0, y: 0 });
  const handleMouseDown = (e) => { e.preventDefault(); setDragging(true); setStart({ x: e.clientX - position.x, y: e.clientY - position.y }); };
  const handleMouseMove = (e) => { if (!dragging) return; setPosition({ x: e.clientX - start.x, y: e.clientY - start.y }); };
  const handleMouseUp = () => setDragging(false);
  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove); window.addEventListener("mouseup", handleMouseUp);
    return () => { window.removeEventListener("mousemove", handleMouseMove); window.removeEventListener("mouseup", handleMouseUp); };
  }, [dragging, start]);
  return (
    <img src={src} alt="ampliada" onClick={(e) => e.stopPropagation()} onMouseDown={handleMouseDown}
      onWheel={(e) => { e.preventDefault(); setZoom((z) => Math.min(Math.max(z + (e.deltaY > 0 ? -0.1 : 0.1), 0.5), 5)); }}
      style={{ transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`, transition: dragging ? "none" : "transform 0.2s ease", maxWidth: "90%", maxHeight: "90%", borderRadius: 10, cursor: dragging ? "grabbing" : "grab", userSelect: "none", touchAction: "none" }} />
  );
}

// ==================== COMPONENTE PRINCIPAL ====================
export default function SocialBar({ userEmail, userNick, fichasMap, isMaster, jogadorSelecionadoEmail }) {
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [notifAnchor, setNotifAnchor] = useState(null);
  const [solicitacoes, setSolicitacoes] = useState({});
  const [amigos, setAmigos] = useState({});
  const [chatAberto, setChatAberto] = useState(null);
  const [mensagens, setMensagens] = useState([]);
  const [textoMsg, setTextoMsg] = useState("");
  const [lightboxImage, setLightboxImage] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [gifOpen, setGifOpen] = useState(false);
  const [gifResults, setGifResults] = useState([]);
  const [gifSearch, setGifSearch] = useState("");
  const [filePreviews, setFilePreviews] = useState([]);
  const chatRef = useRef(null);
  const chatEndRef = useRef(null);
    const barRef = useRef(null);
  const [barPos, setBarPos] = useState(() => {
  try { 
    const saved = JSON.parse(localStorage.getItem('socialBarPos') || 'null');
    if (saved && saved.x !== undefined) {
      // Garante que a posição salva não ultrapasse os limites
      const maxX = window.innerWidth - 400; // 400 é a largura máxima da barra
      return { x: Math.max(0, Math.min(saved.x, maxX)), y: saved.y };
    }
    return null;
  } catch { return null; }
});
  const barDragRef = useRef({ dragging: false, startX: 0, startLeft: 0 });
  const [contextMenu, setContextMenu] = useState(null);
  const [solicitacoesEnviadas, setSolicitacoesEnviadas] = useState({});
  const [matchPerfil, setMatchPerfil] = useState(null);
  const [matchCriando, setMatchCriando] = useState(false);
  const [cartasMatch, setCartasMatch] = useState([]);
  const [cartaAtual, setCartaAtual] = useState(0);
  const [matches, setMatches] = useState([]);
  const [mensagensNaoLidas, setMensagensNaoLidas] = useState({});
  const [ultimaMensagem, setUltimaMensagem] = useState({});
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [swipeX, setSwipeX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartX = useRef(0);
  const [ultimaLeitura, setUltimaLeitura] = useState({});

  // 🟢 CARREGAR FICHAS DIRETAMENTE
  const [fichasMapLocal, setFichasMapLocal] = useState({});
  useEffect(() => {
    const col = collection(db, "fichas");
    const unsub = onSnapshot(col, (snap) => {
      const map = {};
      snap.forEach((docSnap) => {
        const data = docSnap.data() || {};
        map[docSnap.id] = { nome: data.nome || docSnap.id, imagemPersonagem: data.imagemPersonagem || "", imagens: data.imagens || [], ...data };
      });
      setFichasMapLocal(map);
    });
    return () => unsub();
  }, []);
  const fichasMapFinal = Object.keys(fichasMap).length > 0 ? fichasMap : fichasMapLocal;
  const emailAtivo = jogadorSelecionadoEmail || userEmail;
  

  // 🟢 LIMPEZA AO MUDAR DE PERSONAGEM
  const emailAnteriorRef = useRef(emailAtivo);
  useEffect(() => {
    if (emailAnteriorRef.current !== emailAtivo) {
      setChatAberto(null); setMensagens([]); setAmigos({}); setSolicitacoes({});
      emailAnteriorRef.current = emailAtivo;
    }
  }, [emailAtivo]);

 useEffect(() => {
    if (!emailAtivo || !Object.keys(fichasMapFinal).length) return;
    
    const checkPerfil = async () => {
      try {
        // Primeiro tenta Firebase
        try {
          const ref = doc(db, "social", emailAtivo);
          const snap = await getDoc(ref);
          if (snap.exists() && snap.data().matchPerfil) {
            setMatchPerfil(snap.data().matchPerfil);
            // Atualiza localStorage
            localStorage.setItem(`matchPerfil_${emailAtivo}`, JSON.stringify(snap.data().matchPerfil));
            await carregarCartas();
            return;
          }
        } catch (firebaseError) {
          console.warn("Firebase indisponível, usando cache local");
        }
        
        // Se Firebase falhou, tenta localStorage
        const savedProfile = localStorage.getItem(`matchPerfil_${emailAtivo}`);
        if (savedProfile) {
          setMatchPerfil(JSON.parse(savedProfile));
          await carregarCartas();
        }
      } catch (error) {
        console.error("Erro ao verificar perfil match:", error);
      }
    };
    
    checkPerfil();
  }, [emailAtivo, fichasMapFinal]);

  // 🟢 CARREGAR PERFIL MATCH DO LOCAL STORAGE COMO FALLBACK
useEffect(() => {
  if (!emailAtivo || matchPerfil) return;
  
  // Tenta carregar do localStorage se não tiver perfil ainda
  const savedProfile = localStorage.getItem(`matchPerfil_${emailAtivo}`);
  if (savedProfile) {
    try {
      const profile = JSON.parse(savedProfile);
      setMatchPerfil(profile);
      carregarCartas();
    } catch (e) {
      console.error("Erro ao carregar perfil local:", e);
    }
  }
}, [emailAtivo]);
  // 🟢 DRAG DA BARRA
  useEffect(() => {
    const handleMouseMove = (e) => {
  if (!barDragRef.current.dragging) return;
  const newLeft = barDragRef.current.startLeft + (e.clientX - barDragRef.current.startX);
  // Pega a largura REAL da barra
  const barWidth = barRef.current?.getBoundingClientRect().width || 400;
  // Limita: mínimo 0, máximo = largura da janela - largura da barra
  const boundedLeft = Math.max(0, Math.min(newLeft, window.innerWidth - barWidth));
  if (barRef.current) barRef.current.style.left = `${boundedLeft}px`;
};
    const handleMouseUp = (e) => {
      if (!barDragRef.current.dragging) return;
      barDragRef.current.dragging = false;
      const rect = barRef.current?.getBoundingClientRect();
      if (rect) {
        const pos = { x: rect.left, y: rect.top };
        setBarPos(pos);
        localStorage.setItem('socialBarPos', JSON.stringify(pos));
      }
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp); };
  }, []);
  // ==================== CARREGAR DADOS ====================
  useEffect(() => {
    if (!emailAtivo) return;
    const unsub = onSnapshot(doc(db, "social", emailAtivo), (snap) => {
      if (snap.exists()) { const d = snap.data(); setSolicitacoes(d.solicitacoes || {}); setAmigos(d.amigos || {}); }
      else { setSolicitacoes({}); setAmigos({}); }
    });
    return () => unsub();
  }, [emailAtivo]);

  useEffect(() => {
    if (!emailAtivo) return;
    const q = query(collection(db, "socialNotificacoes"), where("para", "==", emailAtivo), where("lida", "==", false), orderBy("timestamp", "desc"));
    const unsub = onSnapshot(q, (snap) => setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => unsub();
  }, [emailAtivo]);

  useEffect(() => {
    if (!emailAtivo) return;
    const q = query(collection(db, "socialNotificacoes"), where("para", "==", emailAtivo), where("tipo", "==", "mensagem"), where("lida", "==", false));
    const unsub = onSnapshot(q, (snap) => {
      const contagem = {};
      snap.docs.forEach(d => { const data = d.data(); contagem[data.de] = (contagem[data.de] || 0) + 1; });
      setMensagensNaoLidas(contagem);
    });
    return () => unsub();
  }, [emailAtivo]);

  useEffect(() => {
    if (!emailAtivo) return;
    const listaAmigos = Object.keys(amigos);
    if (listaAmigos.length === 0) return;
    const unsubs = listaAmigos.map(emailAmigo => {
      const chatId = [emailAtivo, emailAmigo].sort().join("_");
      const q = query(collection(db, "socialChats", chatId, "mensagens"), orderBy("timestamp", "desc"), limit(1));
      return onSnapshot(q, (snap) => {
        if (!snap.empty) {
          const ultima = snap.docs[0].data();
          setUltimaMensagem(prev => ({ ...prev, [emailAmigo]: { texto: ultima.texto || (ultima.tipo === "gif" ? "🎞️ GIF" : ultima.tipo === "imagens" ? "📷 Imagem" : ultima.tipo === "video" ? "🎬 Vídeo" : ""), timestamp: ultima.timestamp } }));
        }
      });
    });
    return () => unsubs.forEach(u => u());
  }, [emailAtivo, amigos]);

  useEffect(() => {
    if (!chatAberto) return;
    const chatId = [emailAtivo, chatAberto].sort().join("_");
    const q = query(collection(db, "socialChats", chatId, "mensagens"), orderBy("timestamp", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      setMensagens(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setTimeout(() => {
        // Scroll para o final ou para última leitura
        const ultimaLida = ultimaLeitura[chatAberto];
        if (ultimaLida && chatRef.current) {
          const el = document.getElementById(`msg-${ultimaLida}`);
          if (el) el.scrollIntoView({ behavior: "smooth" });
        } else {
          chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
      }, 200);
    });
    return () => unsub();
  }, [chatAberto, emailAtivo]);

  // Scroll listener
  useEffect(() => {
    const container = chatRef.current;
    if (!container) return;
    const handleScroll = () => {
      const distance = container.scrollHeight - container.scrollTop - container.clientHeight;
      if (distance < 60) {
        setAutoScroll(true); setShowScrollButton(false);
        if (chatAberto && mensagens.length > 0) {
          const lastMsg = mensagens[mensagens.length - 1];
          if (lastMsg) setUltimaLeitura(prev => ({ ...prev, [chatAberto]: lastMsg.id }));
        }
      } else {
        setAutoScroll(false); setShowScrollButton(true);
      }
    };
    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [chatAberto, mensagens]);

  // ==================== FUNÇÕES ====================
  const enviarSolicitacao = async (emailAlvo) => {
    const ref = doc(db, "social", emailAlvo);
    const snap = await getDoc(ref);
    const dados = snap.exists() ? snap.data() : { solicitacoes: {}, amigos: {} };
    dados.solicitacoes = { ...dados.solicitacoes, [emailAtivo]: { timestamp: Date.now(), nome: fichasMapFinal[emailAtivo]?.nome || emailAtivo } };
    await setDoc(ref, dados, { merge: true });
    await addDoc(collection(db, "socialNotificacoes"), { para: emailAlvo, de: emailAtivo, tipo: "solicitacao", nome: fichasMapFinal[emailAtivo]?.nome || emailAtivo, lida: false, timestamp: serverTimestamp() });
    setContextMenu(null);
  };

  const aceitarSolicitacao = async (emailDe) => {
    const ref = doc(db, "social", emailAtivo);
    const snap = await getDoc(ref);
    const dados = snap.exists() ? snap.data() : { solicitacoes: {}, amigos: {} };
    delete dados.solicitacoes[emailDe];
    dados.amigos = { ...dados.amigos, [emailDe]: { desde: Date.now(), nome: fichasMapFinal[emailDe]?.nome || emailDe } };
    await setDoc(ref, dados, { merge: true });
    const refDe = doc(db, "social", emailDe);
    const snapDe = await getDoc(refDe);
    const dadosDe = snapDe.exists() ? snapDe.data() : { solicitacoes: {}, amigos: {} };
    dadosDe.amigos = { ...dadosDe.amigos, [emailAtivo]: { desde: Date.now(), nome: fichasMapFinal[emailAtivo]?.nome || emailAtivo } };
    await setDoc(refDe, dadosDe, { merge: true });
    setContextMenu(null);
  };

  const recusarSolicitacao = async (emailDe) => {
    const ref = doc(db, "social", emailAtivo);
    const snap = await getDoc(ref);
    const dados = snap.exists() ? snap.data() : { solicitacoes: {}, amigos: {} };
    delete dados.solicitacoes[emailDe];
    await setDoc(ref, dados, { merge: true });
    setContextMenu(null);
  };

  const abrirChat = async (email) => {
    if (!amigos[email] && email !== "mestre@reqviemrpg.com") { alert("Vocês não são amigos! Envie uma solicitação primeiro."); return; }
    setChatAberto(email); setExpanded(true); setActiveTab(1);
    const q = query(collection(db, "socialNotificacoes"), where("para", "==", emailAtivo), where("de", "==", email), where("tipo", "==", "mensagem"), where("lida", "==", false));
    const snap = await getDocs(q);
    snap.docs.forEach(d => updateDoc(d.ref, { lida: true }));
  };

  const apagarConversa = async (emailAmigo, paraTodos = false) => {
    const chatId = [emailAtivo, emailAmigo].sort().join("_");
    const snap = await getDocs(collection(db, "socialChats", chatId, "mensagens"));
    snap.docs.forEach(d => deleteDoc(d.ref));
    if (paraTodos) {
      const ref = doc(db, "social", emailAtivo); const snapSocial = await getDoc(ref);
      if (snapSocial.exists()) { const d = snapSocial.data(); delete d.amigos[emailAmigo]; await setDoc(ref, d, { merge: true }); }
      const refAmigo = doc(db, "social", emailAmigo); const snapAmigo = await getDoc(refAmigo);
      if (snapAmigo.exists()) { const d = snapAmigo.data(); delete d.amigos[emailAtivo]; await setDoc(refAmigo, d, { merge: true }); }
    }
    setChatAberto(null);
  };

  const enviarMensagem = async () => {
    if (!textoMsg && filePreviews.length === 0) return;
    const chatId = [emailAtivo, chatAberto].sort().join("_");
    let tipo = "texto"; let texto = textoMsg;
    // Detecta YouTube
    if (textoMsg && (textoMsg.includes("youtube.com") || textoMsg.includes("youtu.be"))) {
      tipo = "video"; texto = textoMsg;
    }
    const msgData = { de: emailAtivo, para: chatAberto, tipo, texto, timestamp: serverTimestamp() };
    if (filePreviews.length > 0) { msgData.tipo = "imagens"; msgData.imagens = filePreviews; }
    await addDoc(collection(db, "socialChats", chatId, "mensagens"), msgData);
    await addDoc(collection(db, "socialNotificacoes"), { para: chatAberto, de: emailAtivo, tipo: "mensagem", texto: texto?.substring(0, 50) || "📷 Imagem", nome: fichasMapFinal[emailAtivo]?.nome || emailAtivo, lida: false, timestamp: serverTimestamp() });
    setTextoMsg(""); setFilePreviews([]);
  };

  const enviarGif = async (url) => {
    const chatId = [emailAtivo, chatAberto].sort().join("_");
    await addDoc(collection(db, "socialChats", chatId, "mensagens"), { de: emailAtivo, para: chatAberto, tipo: "gif", texto: url, timestamp: serverTimestamp() });
    await addDoc(collection(db, "socialNotificacoes"), { para: chatAberto, de: emailAtivo, tipo: "mensagem", texto: "🎞️ GIF", nome: fichasMapFinal[emailAtivo]?.nome || emailAtivo, lida: false, timestamp: serverTimestamp() });
    setGifOpen(false);
  };

  const searchGifs = async (query = "", offset = 0) => {
    const endpoint = query ? "https://api.giphy.com/v1/gifs/search" : "https://api.giphy.com/v1/gifs/trending";
    const res = await fetch(`${endpoint}?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(query)}&limit=25&offset=${offset}&rating=g`);
    const data = await res.json();
    setGifResults(offset === 0 ? data.data : [...gifResults, ...data.data]);
  };

  const uploadImagem = async (file) => {
    const fd = new FormData(); fd.append("file", file);
    const res = await fetch("https://reqviem.onrender.com/upload", { method: "POST", body: fd });
    const data = await res.json();
    return data.url;
  };

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files);
    for (const file of files) { const url = await uploadImagem(file); if (url) setFilePreviews(p => [...p, url]); }
  };

  // Ctrl+V para colar imagem
  useEffect(() => {
    const handlePaste = async (e) => {
      if (!chatAberto) return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let item of items) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) { const url = await uploadImagem(file); if (url) setFilePreviews(p => [...p, url]); }
        }
      }
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [chatAberto]);

  const criarPerfilMatch = async () => {
    setMatchCriando(true);
    try {
      const ref = doc(db, "social", emailAtivo);
      const ficha = fichasMapFinal[emailAtivo] || {};
      
      // Cria o perfil localmente primeiro para evitar loading infinito
      const novoPerfil = { 
        nome: ficha.nome || emailAtivo, 
        foto: ficha.imagemPersonagem || (ficha.imagens && ficha.imagens[0]) || "", 
        criadoEm: Date.now() 
      };
      
      // Tenta salvar no Firebase
      try {
        const snap = await getDoc(ref);
        const dados = snap.exists() ? snap.data() : {};
        dados.matchPerfil = novoPerfil;
        await setDoc(ref, dados, { merge: true });
      } catch (firebaseError) {
        console.warn("Firebase indisponível, salvando localmente:", firebaseError);
        // Salva no localStorage como backup
        localStorage.setItem(`matchPerfil_${emailAtivo}`, JSON.stringify(novoPerfil));
      }
      
      // Atualiza o estado local independente do Firebase
      setMatchPerfil(novoPerfil);
      
      // Tenta carregar cartas
      await carregarCartas();
      
    } catch (error) {
      console.error("Erro ao criar perfil match:", error);
      alert("Perfil criado localmente. Sincronizará quando o Firebase estiver disponível.");
    } finally {
      setMatchCriando(false);
    }
  };
  
  const carregarCartas = async () => {
    try {
      // Tenta carregar do Firebase
      let cartas = [];
      
      try {
        const col = collection(db, "social");
        const snap = await getDocs(col);
        const refSelf = await getDoc(doc(db, "social", emailAtivo));
        const dadosSelf = refSelf.exists() ? refSelf.data() : {};
        const perfisOcultos = dadosSelf.perfisOcultos || {};
        const agora = Date.now();
        
        Object.keys(perfisOcultos).forEach(k => {
          if (perfisOcultos[k] < agora) delete perfisOcultos[k];
        });
        
        snap.forEach(d => { 
          const data = d.data(); 
          if (d.id !== emailAtivo && data.matchPerfil && !data.matchPerfil.bloqueado && !perfisOcultos[d.id]) {
            cartas.push({ email: d.id, ...data.matchPerfil }); 
          }
        });
      } catch (firebaseError) {
        console.warn("Firebase indisponível para cartas:", firebaseError);
        // Carrega perfis do localStorage como fallback
        const allProfiles = {};
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('matchPerfil_')) {
            const email = key.replace('matchPerfil_', '');
            if (email !== emailAtivo) {
              try {
                const profileData = JSON.parse(localStorage.getItem(key));
                allProfiles[email] = profileData;
              } catch (e) {}
            }
          }
        }
        cartas = Object.entries(allProfiles).map(([email, data]) => ({ email, ...data }));
      }
      
      setCartasMatch(cartas.sort(() => Math.random() - 0.5));
      setCartaAtual(0);
      
    } catch (error) {
      console.error("Erro ao carregar cartas:", error);
      setCartasMatch([]);
    }
  };

  const darLike = async (emailAlvo) => {
    const ref = doc(db, "social", emailAtivo); const snap = await getDoc(ref);
    const dados = snap.exists() ? snap.data() : {};
    dados.likes = dados.likes || [];
    if (!dados.likes.includes(emailAlvo)) dados.likes.push(emailAlvo);
    await setDoc(ref, dados, { merge: true });
    const refAlvo = doc(db, "social", emailAlvo); const snapAlvo = await getDoc(refAlvo);
    const dadosAlvo = snapAlvo.exists() ? snapAlvo.data() : {};
    if (dadosAlvo.likes?.includes(emailAtivo)) {
      setMatches(p => [...p, { email: emailAlvo, nome: cartasMatch[cartaAtual]?.nome }]);
      await addDoc(collection(db, "socialNotificacoes"), { para: emailAtivo, tipo: "match", nome: cartasMatch[cartaAtual]?.nome, lida: false, timestamp: serverTimestamp() });
      await addDoc(collection(db, "socialNotificacoes"), { para: emailAlvo, tipo: "match", nome: fichasMapFinal[emailAtivo]?.nome || emailAtivo, lida: false, timestamp: serverTimestamp() });
    }
            if (emailAlvo) await ocultarPerfilTemporario(emailAlvo);
    setCartaAtual(p => Math.min(p + 1, cartasMatch.length - 1)); setSwipeX(0);
  };
    const pularCarta = async () => { 
        const emailAtual = cartasMatch[cartaAtual]?.email;
    if (emailAtual) await ocultarPerfilTemporario(emailAtual);
    setCartaAtual(p => Math.min(p + 1, cartasMatch.length - 1)); setSwipeX(0); 
  };
  

   const ocultarPerfilTemporario = async (emailAlvo) => {
  const ref = doc(db, "social", emailAtivo);
  const snap = await getDoc(ref);
  const dados = snap.exists() ? snap.data() : {};
  dados.perfisOcultos = dados.perfisOcultos || {};
  dados.perfisOcultos[emailAlvo] = Date.now() + (60 * 60 * 1000); // 1 hora
  await setDoc(ref, dados, { merge: true });
};
  // Drag da carta
  const handleDragStart = (e) => { setIsDragging(true); dragStartX.current = e.clientX || e.touches?.[0]?.clientX || 0; };
  const handleDragMove = (e) => {
    if (!isDragging) return;
    const clientX = e.clientX || e.touches?.[0]?.clientX || 0;
    setSwipeX(clientX - dragStartX.current);
  };
  const handleDragEnd = () => {
    setIsDragging(false);
    if (swipeX > 80) darLike(cartasMatch[cartaAtual]?.email);
    else if (swipeX < -80) pularCarta();
    else setSwipeX(0);
  };



  

  // ==================== RENDER ====================
  const amigosList = Object.keys(amigos);
  const solicitacoesPendentes = Object.keys(solicitacoes);
  const totalNotif = notifications.length + solicitacoesPendentes.length;
  const conversasOrdenadas = amigosList.sort((a, b) => {
    const ta = ultimaMensagem[a]?.timestamp?.toDate?.() || new Date(0);
    const tb = ultimaMensagem[b]?.timestamp?.toDate?.() || new Date(0);
    return tb - ta;
  });

  const getStatusBtn = (email) => {
    if (amigos[email]) return { label: "Conversar", cor: "#00e0ff", onClick: () => abrirChat(email) };
    if (solicitacoes[email]) return { 
      label: "Solicitação", cor: "#ff9800", 
      onClick: () => {
        if (confirm(`${fichasMapFinal[email]?.nome || email} quer ser seu amigo. Aceitar?`)) {
          aceitarSolicitacao(email);
        } else {
          recusarSolicitacao(email);
        }
      }
    };
    if (solicitacoesEnviadas[email]) return { label: "Enviado ✓", cor: "#64748b", onClick: () => {} };
    return { label: "Add", cor: "#fbbf24", onClick: () => { enviarSolicitacao(email); setSolicitacoesEnviadas(prev => ({ ...prev, [email]: true })); } };
  };

  // Contagem de mensagens NÃO LIDAS no chat aberto
  const msgNaoLidasNoChat = chatAberto ? mensagens.filter(m => m.de !== emailAtivo && (!ultimaLeitura[chatAberto] || m.id > ultimaLeitura[chatAberto])).length : 0;

  return (
    <>
      {/* BARRA INFERIOR */}
            <Box 
        ref={barRef}
        onMouseDown={(e) => {
          if (e.target.closest('button') || e.target.closest('input')) return;
          const rect = barRef.current.getBoundingClientRect();
          barDragRef.current = { dragging: true, startX: e.clientX, startLeft: rect.left };
        }}
                                sx={{ position: "fixed", bottom: 0, left: barPos ? `${barPos.x}px` : '50%', transform: barPos ? 'none' : 'translateX(-50%)', zIndex: 99999, animation: `${floatUp} 0.5s ease-out`, cursor: 'grab', userSelect: 'none' }}>
        <GlowPaper sx={{ display: "flex", alignItems: "center", gap: 1, px: 2, py: 0.8, borderRadius: "20px 20px 0 0", maxWidth: { xs: "95vw", sm: 400 } }}>
          <IconButton onClick={() => { setExpanded(!expanded); setActiveTab(0); }} sx={{ color: expanded ? "#00e0ff" : "#94a3b8" }}><ChatIcon /></IconButton>
          <Typography variant="caption" sx={{ color: "#fff", fontWeight: "bold", cursor: "pointer", letterSpacing: 1 }} onClick={() => { setExpanded(!expanded); setActiveTab(0); }}>{expanded ? "▼ SOCIAL" : "▲ SOCIAL"}</Typography>
          <Box sx={{ flex: 1 }} />
          <Badge badgeContent={totalNotif} color="error" sx={{ '& .MuiBadge-badge': { animation: `${floatUp} 0.3s ease-out` } }}>
            <IconButton onClick={(e) => { setNotifAnchor(e.currentTarget); setExpanded(true); }} sx={{ color: totalNotif > 0 ? "#ff9800" : "#94a3b8" }}><NotificationsIcon /></IconButton>
          </Badge>
          <IconButton onClick={() => setExpanded(false)} sx={{ color: "#94a3b8" }}><CloseIcon fontSize="small" /></IconButton>
        </GlowPaper>
      </Box>

      {/* PAINEL EXPANDIDO */}
      {expanded && (
                <GlowPaper sx={{ position: "fixed", bottom: 52, left: barPos ? `${barPos.x}px` : '50%', transform: barPos ? 'none' : 'translateX(-50%)', zIndex: 99998, width: 380, maxWidth: "95vw", height: 460, maxHeight: "65vh", display: "flex", flexDirection: "column", borderRadius: "16px 16px 0 0", overflow: "hidden", animation: `${floatUp} 0.3s ease-out` }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1.5, background: "linear-gradient(180deg, #1a1a2e 0%, #0f172a 100%)", borderBottom: '1px solid rgba(0,224,255,0.1)' }}>
            <Avatar src={fichasMapFinal[emailAtivo]?.imagemPersonagem || fichasMapFinal[emailAtivo]?.imagens?.[0] || ""} sx={{ width: 36, height: 36, bgcolor: '#333', fontSize: 16, cursor: 'pointer', border: '2px solid rgba(0,224,255,0.3)' }}
              onClick={() => { const img = fichasMapFinal[emailAtivo]?.imagemPersonagem || fichasMapFinal[emailAtivo]?.imagens?.[0]; if (img) { setLightboxImage(img); setZoom(1); } }}>
              {(fichasMapFinal[emailAtivo]?.nome || emailAtivo)?.[0]?.toUpperCase()}
            </Avatar>
            <Typography sx={{ color: '#fff', fontWeight: 'bold', fontSize: '0.85rem', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fichasMapFinal[emailAtivo]?.nome || emailAtivo?.split('@')[0] || 'Social'}</Typography>
          </Box>
          <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} sx={{ minHeight: 36, bgcolor: "#0f172a", borderBottom: "1px solid rgba(0,224,255,0.1)", "& .MuiTab-root": { minHeight: 36, fontSize: "0.7rem", color: "#64748b", "&.Mui-selected": { color: "#00e0ff" } } }}>
            <Tab icon={<PeopleIcon fontSize="small" />} label="Tudo" />
                        <Tab icon={<Badge badgeContent={amigosList.reduce((t, e) => t + (mensagensNaoLidas[e] || 0), 0)} color="error" sx={{ '& .MuiBadge-badge': { fontSize: '0.6rem', height: 16, minWidth: 16 } }}><ChatIcon fontSize="small" /></Badge>} label="Conversas" />
            <Tab icon={<FavoriteIcon fontSize="small" />} label="Match" />
          </Tabs>
          <Box sx={{ flex: 1, overflowY: "auto", p: 1, "&::-webkit-scrollbar": { width: "4px" }, "&::-webkit-scrollbar-thumb": { background: "rgba(0,224,255,0.2)", borderRadius: "10px" } }}>
            {/* ABA TUDO */}
            {activeTab === 0 && (
              <List dense>
                {Object.entries(fichasMapFinal).filter(([email]) => email !== emailAtivo).map(([email, data]) => {
                  const status = getStatusBtn(email);
                  return (
                    <ListItem key={email} sx={{ borderRadius: 2, mb: 0.5, "&:hover": { bgcolor: "rgba(0,224,255,0.05)" } }}
                      onContextMenu={(e) => { e.preventDefault(); setContextMenu({ anchor: e.currentTarget, email }); }}>
                      <ListItemAvatar>
                                               <Badge badgeContent={mensagensNaoLidas[email] || 0} color="error" invisible={!mensagensNaoLidas[email]}>
                          <Avatar src={data.imagemPersonagem || ""} sx={{ width: 32, height: 32, bgcolor: "#333", fontSize: 14, border: '1px solid rgba(255,255,255,0.1)' }}>{(data.nome || email)[0]?.toUpperCase()}</Avatar>
                        </Badge>
                      </ListItemAvatar>
                      <ListItemText primary={data.nome || email} primaryTypographyProps={{ sx: { color: "#fff", fontSize: "0.8rem" } }} />
                      <Button size="small" variant="outlined" onClick={status.onClick} sx={{ fontSize: "0.6rem", color: status.cor, borderColor: `${status.cor}44`, borderRadius: 3, "&:hover": { borderColor: status.cor, bgcolor: `${status.cor}11` } }}>{status.label}</Button>
                    </ListItem>
                  );
                })}
              </List>
            )}
            {/* ABA CONVERSAS */}
            {activeTab === 1 && !chatAberto && (
              <List dense>
                {conversasOrdenadas.length === 0 && <Typography sx={{ color: "#64748b", textAlign: "center", py: 4 }}>Nenhuma conversa ainda</Typography>}
                {conversasOrdenadas.map(email => (
                  <ListItem key={email} sx={{ borderRadius: 2, mb: 0.5, "&:hover": { bgcolor: "rgba(0,224,255,0.05)" }, pr: 1 }}>
                    <Box onClick={() => abrirChat(email)} sx={{ display: 'flex', alignItems: 'center', flex: 1, cursor: 'pointer', minWidth: 0 }}>
                      <ListItemAvatar>
                        <Badge badgeContent={mensagensNaoLidas[email] || 0} color="error" sx={{ '& .MuiBadge-badge': { fontSize: '0.6rem', height: 16, minWidth: 16 } }}>
                                                    <Avatar src={fichasMapFinal[email]?.imagemPersonagem || ""} sx={{ width: 32, height: 32, bgcolor: "#333", fontSize: 14, border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer' }}
                            onClick={(e) => { e.stopPropagation(); const img = fichasMapFinal[email]?.imagemPersonagem || fichasMapFinal[email]?.imagens?.[0]; if (img) { setLightboxImage(img); setZoom(1); } }}>
                            {(fichasMapFinal[email]?.nome || email)[0]?.toUpperCase()}
                          </Avatar>
                        </Badge>
                      </ListItemAvatar>
                      <ListItemText primary={fichasMapFinal[email]?.nome || email} secondary={ultimaMensagem[email]?.texto?.substring(0, 30) || ""}
                        primaryTypographyProps={{ sx: { color: "#fff", fontSize: "0.8rem" } }}
                        secondaryTypographyProps={{ sx: { color: "#64748b", fontSize: "0.65rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }} />
                    </Box>
                  </ListItem>
                ))}
              </List>
            )}
            {/* CHAT ABERTO */}
            {activeTab === 1 && chatAberto && (
              <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, pb: 1, borderBottom: "1px solid rgba(0,224,255,0.1)" }}>
                  <IconButton size="small" onClick={() => { if (mensagens.length > 0) setUltimaLeitura(prev => ({ ...prev, [chatAberto]: mensagens[mensagens.length-1].id })); setChatAberto(null); }} sx={{ color: '#94a3b8' }}><CloseIcon fontSize="small" /></IconButton>
                  <Avatar src={fichasMapFinal[chatAberto]?.imagemPersonagem || ""} sx={{ width: 26, height: 26, cursor: "pointer", border: '1px solid rgba(0,224,255,0.3)' }}
                    onClick={() => { if (fichasMapFinal[chatAberto]?.imagemPersonagem) { setLightboxImage(fichasMapFinal[chatAberto].imagemPersonagem); setZoom(1); } }} />
                  <Typography variant="subtitle2" sx={{ color: "#fff", fontSize: "0.8rem" }}>{fichasMapFinal[chatAberto]?.nome || chatAberto}</Typography>
                  {msgNaoLidasNoChat > 0 && <Chip label={`${msgNaoLidasNoChat} novas`} size="small" color="error" sx={{ height: 18, fontSize: '0.6rem' }} />}
                  <Box sx={{ flex: 1 }} />
                </Box>
                <Box ref={chatRef} sx={{ flex: 1, overflowY: "auto", py: 1, "&::-webkit-scrollbar": { width: "4px" }, "&::-webkit-scrollbar-thumb": { background: "rgba(0,224,255,0.2)", borderRadius: "10px" } }}>
                  {mensagens.map(m => {
                    const isNova = m.de !== emailAtivo && (!ultimaLeitura[chatAberto] || m.id > ultimaLeitura[chatAberto]);
                    return (
                      <Box key={m.id} id={`msg-${m.id}`}>
                        {isNova && <Divider sx={{ my: 0.5 }}><Chip label="Novas mensagens" size="small" color="error" sx={{ height: 16, fontSize: '0.55rem' }} /></Divider>}
                        <Box sx={{ display: "flex", justifyContent: m.de === emailAtivo ? "flex-end" : "flex-start", mb: 0.8 }}>
                          <MessageBubble isMine={m.de === emailAtivo} sx={{ p: 1.2, maxWidth: "80%" }}>
                            {m.tipo === "texto" && <Typography sx={{ color: "#e2e8f0", fontSize: "0.78rem", whiteSpace: "pre-line", lineHeight: 1.4 }}>{m.texto}</Typography>}
                            {m.tipo === "video" && (
                              <Box>
                                <Typography sx={{ color: "#e2e8f0", fontSize: "0.78rem", whiteSpace: "pre-line", mb: 0.5 }}>{m.texto}</Typography>
                                <iframe width="100%" height="120" src={m.texto.replace("watch?v=", "embed/").split("&")[0]} frameBorder="0" allowFullScreen style={{ borderRadius: 8 }} />
                              </Box>
                            )}
                            {m.tipo === "gif" && <img src={m.texto} style={{ maxWidth: 150, borderRadius: 10, cursor: "pointer" }} onClick={() => { setLightboxImage(m.texto); setZoom(1); }} />}
                            {m.tipo === "imagens" && m.imagens?.map((img, i) => <img key={i} src={img} style={{ maxWidth: 120, borderRadius: 10, cursor: "pointer", marginTop: 4 }} onClick={() => { setLightboxImage(img); setZoom(1); }} />)}
                          </MessageBubble>
                        </Box>
                      </Box>
                    );
                  })}
                  <div ref={chatEndRef} />
                </Box>
                {/* Preview de imagens */}
                {filePreviews.length > 0 && (
                  <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", px: 1, pb: 0.5 }}>
                    {filePreviews.map((img, i) => (
                      <Box key={i} sx={{ position: "relative" }}>
                        <img src={img} style={{ width: 48, height: 48, borderRadius: 6, objectFit: "cover" }} />
                        <IconButton size="small" onClick={() => setFilePreviews(p => p.filter((_, idx) => idx !== i))} sx={{ position: "absolute", top: -8, right: -8, bgcolor: "rgba(0,0,0,0.7)", color: "#fff", width: 18, height: 18 }}><CloseIcon sx={{ fontSize: 12 }} /></IconButton>
                      </Box>
                    ))}
                  </Box>
                )}
                <Box sx={{ display: "flex", gap: 0.5, pt: 1, borderTop: "1px solid rgba(0,224,255,0.1)" }}>
                  <IconButton size="small" component="label"><ImageIcon sx={{ fontSize: 18, color: '#94a3b8' }} /><input hidden type="file" accept="image/*" multiple onChange={handleFileChange} /></IconButton>
                  <IconButton size="small" onClick={() => { setGifOpen(true); searchGifs(); }}><GifBoxIcon sx={{ fontSize: 18, color: '#94a3b8' }} /></IconButton>
                  <TextField size="small" fullWidth placeholder="Mensagem..." value={textoMsg} onChange={e => setTextoMsg(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviarMensagem(); } }}
                    multiline maxRows={3}
                    InputProps={{ sx: { color: "#fff", fontSize: "0.78rem" } }}
                    sx={{ bgcolor: "rgba(255,255,255,0.03)", borderRadius: 2, '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'rgba(0,224,255,0.2)' }, '&:hover fieldset': { borderColor: 'rgba(0,224,255,0.4)' } } }} />
                  <IconButton size="small" onClick={enviarMensagem} sx={{ color: "#00e0ff" }}><SendIcon sx={{ fontSize: 18 }} /></IconButton>
                </Box>
                {/* Botão rolar para baixo */}
                <Fade in={showScrollButton}>
                  <Fab color="primary" size="small" onClick={() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); setShowScrollButton(false); setAutoScroll(true); }}
                    sx={{ position: "absolute", bottom: 60, right: 8, zIndex: 2000, width: 30, height: 30, minHeight: 30 }}>
                    <Badge badgeContent={msgNaoLidasNoChat} color="error"><ArrowDownwardIcon sx={{ fontSize: 16 }} /></Badge>
                  </Fab>
                </Fade>
              </Box>
            )}
            {/* ABA MATCH */}
            {activeTab === 2 && (
              <Box sx={{ textAlign: "center", py: 2 }}>
                {!matchPerfil && !matchCriando && (
                  <Box>
                    <Typography sx={{ color: "#fff", mb: 2, fontSize: "0.85rem" }}>Encontre parceiros de RPG!</Typography>
                    <Button variant="contained" onClick={criarPerfilMatch} sx={{ bgcolor: "#ff4081", borderRadius: 3, "&:hover": { bgcolor: "#f50057" }, mb: 1, fontSize: "0.75rem" }}>❤️ Criar Perfil</Button>
                    <Typography variant="caption" sx={{ color: "#64748b", display: "block" }}>Usa nome e foto da sua ficha</Typography>
                  </Box>
                )}
              {matchCriando && (
  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
    <CircularProgress sx={{ color: "#ff4081" }} />
    <Typography variant="caption" sx={{ color: "#64748b" }}>Criando perfil...</Typography>
  </Box>
)}
                {matchPerfil && cartasMatch.length > 0 && cartaAtual < cartasMatch.length && (
                  <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                                        <MatchCard swipeX={swipeX} 
                      onMouseDown={handleDragStart} onMouseMove={handleDragMove} onMouseUp={handleDragEnd} onMouseLeave={handleDragEnd}
                      onTouchStart={handleDragStart} onTouchMove={handleDragMove} onTouchEnd={handleDragEnd}
                      sx={{ userSelect: 'none', WebkitUserSelect: 'none', msUserSelect: 'none' }}>
                      {cartasMatch[cartaAtual]?.foto ? (
                        <img src={cartasMatch[cartaAtual].foto} style={{ width: "100%", height: "70%", objectFit: "cover", cursor: "pointer", pointerEvents: "none" }} onClick={() => { setLightboxImage(cartasMatch[cartaAtual].foto); setZoom(1); }} />
                      ) : (
                        <Box sx={{ width: "100%", height: "70%", bgcolor: "#333", display: "flex", alignItems: "center", justifyContent: "center" }}><PeopleIcon sx={{ fontSize: 60, color: "#666" }} /></Box>
                      )}
                      <Typography sx={{ color: "#fff", fontWeight: "bold", mt: 1, px: 1, fontSize: "0.85rem" }}>{cartasMatch[cartaAtual]?.nome}</Typography>
                      {swipeX > 40 && <Box sx={{ position: "absolute", top: 10, right: 10, bgcolor: "#4caf50", borderRadius: "50%", width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center" }}><FavoriteIcon sx={{ color: "#fff" }} /></Box>}
                      {swipeX < -40 && <Box sx={{ position: "absolute", top: 10, left: 10, bgcolor: "#ef4444", borderRadius: "50%", width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center" }}><CloseIcon sx={{ color: "#fff" }} /></Box>}
                    </MatchCard>
                    <Box sx={{ display: "flex", gap: 3 }}>
                      <IconButton onClick={pularCarta} sx={{ bgcolor: "#ef4444", color: "#fff", width: 48, height: 48, "&:hover": { bgcolor: "#dc2626" } }}><CloseIcon /></IconButton>
                      <IconButton onClick={() => darLike(cartasMatch[cartaAtual]?.email)} sx={{ bgcolor: "#4caf50", color: "#fff", width: 48, height: 48, "&:hover": { bgcolor: "#388e3c" } }}><FavoriteIcon /></IconButton>
                    </Box>
                  </Box>
                )}
                {cartasMatch.length === 0 && matchPerfil && <Typography sx={{ color: "#64748b", fontSize: "0.8rem" }}>Nenhum perfil disponível</Typography>}
                {matches.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography sx={{ color: "#ff4081", fontWeight: "bold", mb: 1, fontSize: "0.8rem" }}>❤️ Matches!</Typography>
                    {matches.map((m, i) => (
                      <Paper key={i} sx={{ p: 1, mb: 0.5, bgcolor: "rgba(255,64,129,0.15)", border: "1px solid rgba(255,64,129,0.4)", borderRadius: 2, animation: `${matchGlow} 2s ease-in-out infinite`, display: "flex", alignItems: "center", gap: 1, cursor: "pointer" }} onClick={() => abrirChat(m.email)}>
                        <Avatar sx={{ bgcolor: "#ff4081", color: "#fff", width: 28, height: 28, fontSize: 12 }}>{m.nome?.[0]}</Avatar>
                        <Box sx={{ flex: 1, textAlign: "left" }}>
                          <Typography sx={{ color: "#ff4081", fontWeight: "bold", fontSize: "0.75rem" }}>{m.nome}</Typography>
                          <Typography sx={{ color: "#f48fb1", fontSize: "0.6rem" }}>Match! Toque para conversar</Typography>
                        </Box>
                        <ChatIcon sx={{ color: "#ff4081", fontSize: 18 }} />
                      </Paper>
                    ))}
                  </Box>
                )}
              </Box>
            )}
          </Box>
        </GlowPaper>
      )}

      {/* POPOVER NOTIFICAÇÕES */}
      <Popover open={Boolean(notifAnchor)} anchorEl={notifAnchor} onClose={() => setNotifAnchor(null)} anchorOrigin={{ vertical: "top", horizontal: "center" }} transformOrigin={{ vertical: "bottom", horizontal: "center" }}
        PaperProps={{ sx: { bgcolor: "#0f172a", border: "1px solid rgba(0,224,255,0.2)", borderRadius: 3, maxHeight: 300, width: 300, backdropFilter: "blur(10px)" } }}>
        <Box sx={{ p: 1.5 }}>
          <Typography variant="subtitle2" sx={{ color: "#00e0ff", mb: 1, fontSize: "0.8rem", fontWeight: "bold" }}>Notificações</Typography>
          {totalNotif === 0 && <Typography variant="caption" sx={{ color: "#64748b" }}>Nenhuma notificação</Typography>}
          {solicitacoesPendentes.map(email => (
            <Paper key={email} sx={{ p: 1, mb: 0.5, bgcolor: "rgba(255,152,0,0.05)", border: "1px solid rgba(255,152,0,0.2)", borderRadius: 2, display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="caption" sx={{ color: "#fff", flex: 1, fontSize: "0.7rem" }}>🔔 {solicitacoes[email]?.nome || email} quer ser seu amigo</Typography>
              <Button size="small" onClick={() => aceitarSolicitacao(email)} sx={{ fontSize: "0.6rem", minWidth: "auto", color: "#4caf50", p: 0.3 }}>✓</Button>
              <IconButton size="small" onClick={() => recusarSolicitacao(email)} sx={{ color: "#ef4444", p: 0.3 }}><CloseIcon sx={{ fontSize: 14 }} /></IconButton>
            </Paper>
          ))}
          {notifications.filter(n => n.tipo === "mensagem").slice(0, 5).map(n => (
            <Paper key={n.id} sx={{ p: 1, mb: 0.5, bgcolor: "rgba(0,224,255,0.03)", border: "1px solid rgba(0,224,255,0.1)", borderRadius: 2, cursor: "pointer" }} onClick={() => { abrirChat(n.de); setNotifAnchor(null); }}>
              <Typography variant="caption" sx={{ color: "#fff", fontSize: "0.7rem" }}>💬 {n.nome}: {n.texto?.substring(0, 40)}</Typography>
            </Paper>
          ))}
          {notifications.filter(n => n.tipo === "match").map(n => (
            <Paper key={n.id} sx={{ p: 1, mb: 0.5, bgcolor: "rgba(255,64,129,0.1)", border: "1px solid rgba(255,64,129,0.3)", borderRadius: 2, animation: `${matchGlow} 2s ease-in-out infinite` }}>
              <Typography variant="caption" sx={{ color: "#ff4081", fontSize: "0.7rem", fontWeight: "bold" }}>❤️ Match com {n.nome}!</Typography>
            </Paper>
          ))}
        </Box>
      </Popover>

      {/* MENU CONTEXTO */}
      <Menu open={Boolean(contextMenu)} anchorEl={contextMenu?.anchor} onClose={() => setContextMenu(null)} PaperProps={{ sx: { bgcolor: "#1a1a2e", border: "1px solid rgba(0,224,255,0.2)", borderRadius: 2 } }}>
        <MenuItem onClick={() => { enviarSolicitacao(contextMenu?.email); }} sx={{ color: "#fff", fontSize: "0.8rem", "&:hover": { bgcolor: "rgba(0,224,255,0.1)" } }}>📨 Enviar Solicitação</MenuItem>
        <MenuItem onClick={() => { abrirChat(contextMenu?.email); }} sx={{ color: "#fff", fontSize: "0.8rem", "&:hover": { bgcolor: "rgba(0,224,255,0.1)" } }}>💬 Abrir Chat</MenuItem>
      </Menu>

      {/* LIGHTBOX */}
      {lightboxImage && (
        <Box onClick={() => setLightboxImage(null)} sx={{ position: "fixed", inset: 0, bgcolor: "rgba(0,0,0,0.92)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999999 }}>
          <LightboxImage src={lightboxImage} zoom={zoom} setZoom={setZoom} />
        </Box>
      )}

      {/* MODAL GIF */}
      <Dialog open={gifOpen} onClose={() => setGifOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { bgcolor: "#0f172a", border: "1px solid rgba(0,224,255,0.2)", borderRadius: 3 } }}>
        <DialogTitle sx={{ color: "#00e0ff", fontSize: "0.9rem" }}>GIF</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
            <TextField size="small" fullWidth placeholder="Buscar..." value={gifSearch} onChange={e => setGifSearch(e.target.value)} InputProps={{ sx: { color: "#fff", fontSize: "0.8rem" } }} sx={{ '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'rgba(0,224,255,0.2)' } } }} />
            <Button variant="contained" onClick={() => searchGifs(gifSearch)} sx={{ bgcolor: "#00e0ff", color: "#000", fontSize: "0.75rem", "&:hover": { bgcolor: "#00bcd4" } }}>Buscar</Button>
          </Box>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, maxHeight: 300, overflowY: "auto" }}>
            {gifResults.map(g => (
              <img key={g.id} src={g.images?.fixed_height?.url || g.images?.downsized?.url} style={{ width: 80, height: 80, cursor: "pointer", borderRadius: 8 }} onClick={() => enviarGif(g.images?.original?.url || g.images?.downsized?.url)} />
            ))}
          </Box>
        </DialogContent>
      </Dialog>
    </>
  );
}
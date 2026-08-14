import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  Box, Paper, Typography, IconButton, Button, TextField,
  Avatar, List, ListItem, ListItemAvatar, ListItemText,
  Divider, Badge, Tooltip, Fab, Chip
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SendIcon from "@mui/icons-material/Send";
import ImageIcon from "@mui/icons-material/Image";
import MinimizeIcon from "@mui/icons-material/Minimize";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { db } from "../firebaseConfig";
import { collection, doc, onSnapshot, addDoc, serverTimestamp, query, orderBy, updateDoc, deleteDoc, setDoc, getDoc } from "firebase/firestore";

const IMGBB_API_KEY = "73fcf242ce0108665fa0c9e9de33bd50";

const CORES_AURA = {
  "Titã": "#ff3b3b", "Alquimista": "#00e0ff", "Artesão": "#ffd700",
  "Fundador": "#00ff88", "Déspota": "#a855f7", "Ás": "#e5e5e5",
};

function LightboxImage({ src, zoom, setZoom }) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [start, setStart] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e) => { e.preventDefault(); setDragging(true); setStart({ x: e.clientX - position.x, y: e.clientY - position.y }); };
  useEffect(() => {
    const handleMouseMove = (e) => { if (!dragging) return; setPosition({ x: e.clientX - start.x, y: e.clientY - start.y }); };
    const handleMouseUp = () => setDragging(false);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => { window.removeEventListener("mousemove", handleMouseMove); window.removeEventListener("mouseup", handleMouseUp); };
  }, [dragging, start]);
  return (
    <img src={src} alt="ampliada" onClick={(e) => e.stopPropagation()} onMouseDown={handleMouseDown}
      onWheel={(e) => { e.preventDefault(); setZoom((z) => Math.min(Math.max(z + (e.deltaY > 0 ? -0.1 : 0.1), 0.5), 5)); }}
      style={{ transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`, transition: dragging ? "none" : "transform 0.2s ease", maxWidth: "90%", maxHeight: "90%", borderRadius: 10, cursor: dragging ? "grabbing" : "grab", userSelect: "none", touchAction: "none" }} />
  );
}

function WhatsAppChat({ userEmail, userNick, fichasMap, onClose, notificacoesSidebar, setNotificacoesSidebar }) {
  const [posicao, setPosicao] = useState({ x: window.innerWidth - 450, y: 100 });
  const [tamanho, setTamanho] = useState({ width: 400, height: 600 });
  const [minimizado, setMinimizado] = useState(false);
  const [arrastando, setArrastando] = useState(false);
  const [redimensionando, setRedimensionando] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const resizeStartRef = useRef({ x: 0, y: 0, width: 0, height: 0 });
  const [abaAtiva, setAbaAtiva] = useState("pj");
  const [chatAberto, setChatAberto] = useState(null);
  const [mensagens, setMensagens] = useState([]);
  const [textoMsg, setTextoMsg] = useState("");
  const [filePreviews, setFilePreviews] = useState([]); // 🟢 MULTIPLAS IMAGENS
  const [lightboxImage, setLightboxImage] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [ultimaLeitura, setUltimaLeitura] = useState({});
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [editandoMsg, setEditandoMsg] = useState(null);
  const [textoEdicao, setTextoEdicao] = useState("");
  const chatEndRef = useRef(null);
  const chatRef = useRef(null);
  const divisoriaRef = useRef(null);

  // 🟢 NOTIFICAÇÕES LOCAIS
  const [notificacoesLocais, setNotificacoesLocais] = useState({});

  // 🟢 CONTADOR DE NÃO LIDAS POR CHAT
  const [naoLidas, setNaoLidas] = useState({});

  // 🟢 CARREGAR MENSAGENS
  useEffect(() => {
    if (!chatAberto || !userEmail) return;
    const chatId = [userEmail, chatAberto].sort().join("_");
    const ref = collection(db, "whatsapp_chats", chatId, "mensagens");
    const q = query(ref, orderBy("timestamp", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setMensagens(msgs);
      
      // Calcular não lidas
      const ultimaLida = ultimaLeitura[chatAberto];
      const novas = msgs.filter(m => m.de !== userEmail && (!ultimaLida || m.id > ultimaLida));
      setNaoLidas(prev => ({ ...prev, [chatAberto]: novas.length }));
    });
    return () => unsub();
  }, [chatAberto, userEmail, ultimaLeitura]);

  // 🟢 ABRIR CHAT NA DIVISÓRIA
  useEffect(() => {
    if (!chatAberto || mensagens.length === 0) return;
    const ultimaLida = ultimaLeitura[chatAberto];
    if (ultimaLida) {
      const index = mensagens.findIndex(m => m.id === ultimaLida);
      if (index >= 0 && divisoriaRef.current) {
        divisoriaRef.current.scrollIntoView({ behavior: "instant", block: "center" });
      } else {
        chatEndRef.current?.scrollIntoView({ behavior: "instant" });
      }
    } else {
      chatEndRef.current?.scrollIntoView({ behavior: "instant" });
    }
  }, [chatAberto, mensagens]);

  // 🟢 SCROLL LISTENER
  useEffect(() => {
    const container = chatRef.current;
    if (!container) return;
    const handleScroll = () => {
      const distance = container.scrollHeight - container.scrollTop - container.clientHeight;
      if (distance < 80) {
        setShowScrollButton(false);
        if (chatAberto && mensagens.length > 0) {
          const ultima = mensagens[mensagens.length - 1];
          setUltimaLeitura(prev => ({ ...prev, [chatAberto]: ultima.id }));
          setNaoLidas(prev => ({ ...prev, [chatAberto]: 0 }));
          setNotificacoesLocais(prev => ({ ...prev, [chatAberto]: false }));
          if (setNotificacoesSidebar) setNotificacoesSidebar(prev => ({ ...prev, [chatAberto]: false }));
        }
      } else {
        setShowScrollButton(true);
      }
    };
    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [chatAberto, mensagens]);

  // 🟢 CARREGAR ÚLTIMA LEITURA
  useEffect(() => {
    if (!chatAberto || !userEmail) return;
    const ref = doc(db, "whatsapp_leituras", `${userEmail}_${chatAberto}`);
    getDoc(ref).then(snap => {
      if (snap.exists()) {
        setUltimaLeitura(prev => ({ ...prev, [chatAberto]: snap.data().ultimaLida }));
      }
    });
  }, [chatAberto, userEmail]);

  // 🟢 OUVIR NOVAS MENSAGENS DE TODOS OS CHATS
  useEffect(() => {
    if (!userEmail) return;
    const unsubs = [];
    const todosEmails = [...pjList, ...pmList].map(([email]) => email);
    todosEmails.forEach((email) => {
      const chatId = [userEmail, email].sort().join("_");
      const ref = collection(db, "whatsapp_chats", chatId, "mensagens");
      const q = query(ref, orderBy("timestamp", "desc"), orderBy("__name__", "desc"));
      const unsub = onSnapshot(q, (snap) => {
        if (snap.docs.length > 0) {
          const ultima = snap.docs[0].data();
          if (ultima.de !== userEmail && email !== chatAberto) {
            setNotificacoesLocais(prev => ({ ...prev, [email]: true }));
            if (setNotificacoesSidebar) setNotificacoesSidebar(prev => ({ ...prev, [email]: true }));
          }
        }
      });
      unsubs.push(unsub);
    });
    return () => unsubs.forEach(u => u());
  }, [userEmail, chatAberto, fichasMap]);

  // 🟢 ENVIAR MENSAGEM (com múltiplas imagens e texto)
  const enviarMensagem = async () => {
    if ((!textoMsg.trim() && filePreviews.length === 0) || !chatAberto) return;
    
    const chatId = [userEmail, chatAberto].sort().join("_");
    
    if (filePreviews.length > 0) {
      // Mensagem com imagens (e texto opcional)
      await addDoc(collection(db, "whatsapp_chats", chatId, "mensagens"), {
        de: userEmail,
        para: chatAberto,
        tipo: "imagem_grupo",
        conteudo: textoMsg.trim() || "",
        imagens: filePreviews,
        timestamp: serverTimestamp(),
        editada: false,
      });
    } else if (textoMsg.startsWith("http")) {
      if (textoMsg.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i)) {
        await addDoc(collection(db, "whatsapp_chats", chatId, "mensagens"), {
          de: userEmail, para: chatAberto, tipo: "imagem", conteudo: textoMsg.trim(), imagens: [textoMsg.trim()], timestamp: serverTimestamp(), editada: false,
        });
      } else {
        await addDoc(collection(db, "whatsapp_chats", chatId, "mensagens"), {
          de: userEmail, para: chatAberto, tipo: "link", conteudo: textoMsg.trim(), timestamp: serverTimestamp(), editada: false,
        });
      }
    } else {
      await addDoc(collection(db, "whatsapp_chats", chatId, "mensagens"), {
        de: userEmail, para: chatAberto, tipo: "texto", conteudo: textoMsg.trim(), timestamp: serverTimestamp(), editada: false,
      });
    }
    
    setTextoMsg("");
    setFilePreviews([]);
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // 🟢 EDITAR MENSAGEM
  const editarMensagem = async (msgId) => {
    if (!textoEdicao.trim()) return;
    const chatId = [userEmail, chatAberto].sort().join("_");
    await updateDoc(doc(db, "whatsapp_chats", chatId, "mensagens", msgId), {
      conteudo: textoEdicao.trim(),
      editada: true,
    });
    setEditandoMsg(null);
    setTextoEdicao("");
  };

  // 🟢 EXCLUIR MENSAGEM
  const excluirMensagem = async (msgId) => {
    if (!confirm("Excluir esta mensagem?")) return;
    const chatId = [userEmail, chatAberto].sort().join("_");
    await deleteDoc(doc(db, "whatsapp_chats", chatId, "mensagens", msgId));
  };

  // 🟢 UPLOAD DE MÚLTIPLAS IMAGENS
  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files || []);
    for (const file of files) {
      const fd = new FormData();
      fd.append("image", file);
      try {
        const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: "POST", body: fd });
        const data = await res.json();
        if (data?.success) {
          setFilePreviews(prev => [...prev, data.data.url]);
        }
      } catch (err) { alert("Erro ao enviar imagem"); }
    }
  };

  // 🟢 CTRL+V PARA COLAR IMAGEM
  useEffect(() => {
    const handlePaste = async (e) => {
      if (!chatAberto) return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            const fd = new FormData();
            fd.append("image", file);
            try {
              const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: "POST", body: fd });
              const data = await res.json();
              if (data?.success) {
                setFilePreviews(prev => [...prev, data.data.url]);
              }
            } catch (err) { alert("Erro ao colar imagem"); }
          }
        }
      }
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [chatAberto]);

  // 🟢 FORMATAR HORA
  const formatarHora = (timestamp) => {
    if (!timestamp?.toDate) return "";
    const data = timestamp.toDate();
    const hoje = new Date();
    const ontem = new Date(hoje);
    ontem.setDate(ontem.getDate() - 1);
    if (data.toDateString() === hoje.toDateString()) {
      return data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    } else if (data.toDateString() === ontem.toDateString()) {
      return `Ontem ${data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
    } else {
      return data.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) + " " + data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    }
  };

  const getFotoPersonagem = (email) => fichasMap[email]?.imagemPersonagem || fichasMap[email]?.imagens?.[0] || "";
  const getNomePersonagem = (email) => fichasMap[email]?.nome || email;
  const getAuraCor = (email) => fichasMap[email]?.tipoAura ? CORES_AURA[fichasMap[email].tipoAura] : "#4caf50";

  const pjList = Object.entries(fichasMap || {}).filter(([email, f]) => (f.tipoFicha || "PJ") === "PJ" && email !== userEmail);
  const pmList = Object.entries(fichasMap || {}).filter(([email, f]) => f.tipoFicha === "PM" && email !== userEmail);

  // 🟢 TOTAL NÃO LIDAS POR ABA
  const totalNaoLidasPJ = pjList.reduce((s, [email]) => s + (naoLidas[email] || 0), 0);
  const totalNaoLidasPM = pmList.reduce((s, [email]) => s + (naoLidas[email] || 0), 0);

  return createPortal(
    <Paper elevation={10} sx={{ position: "fixed", left: posicao.x, top: posicao.y, width: minimizado ? 300 : tamanho.width, height: minimizado ? 48 : tamanho.height, bgcolor: "#0f172a", color: "#fff", borderRadius: 2, border: "1px solid #334155", zIndex: 99999, display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.8)" }}>
      {/* BARRA DE TÍTULO */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", p: 1, bgcolor: "#1a1a2e", cursor: "move", minHeight: 40, borderBottom: "1px solid #334155" }}
        onMouseDown={(e) => { if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT') return; e.preventDefault(); setArrastando(true); dragStartRef.current = { x: e.clientX - posicao.x, y: e.clientY - posicao.y }; }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <span style={{ fontSize: '1.3rem' }}>💬</span>
          <Typography variant="subtitle2" sx={{ fontWeight: "bold", fontSize: '0.85rem' }}>
            {minimizado ? "Chat" : chatAberto ? getNomePersonagem(chatAberto) : "Chat dos Personagens"}
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 0.5 }}>
          <IconButton size="small" onClick={() => setMinimizado(!minimizado)} sx={{ color: "#94a3b8", p: 0.5 }}>
            <MinimizeIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" onClick={onClose} sx={{ color: "#ef4444", p: 0.5 }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      {!minimizado && (
        <Box sx={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {!chatAberto ? (
            <>
              {/* ABAS COM BADGE DE NÃO LIDAS */}
              <Box sx={{ display: "flex", borderBottom: "1px solid #334155" }}>
                <Button fullWidth onClick={() => setAbaAtiva("pj")} sx={{ color: abaAtiva === "pj" ? "#4caf50" : "#94a3b8", fontWeight: 'bold', borderRadius: 0, py: 1, bgcolor: abaAtiva === "pj" ? "rgba(76,175,80,0.1)" : "transparent", fontSize: '0.75rem', position: 'relative' }}>
                  🎮 PJ's ({pjList.length})
                  {totalNaoLidasPJ > 0 && (
                    <Badge 
                      badgeContent={totalNaoLidasPJ} 
                      color="error"
                      sx={{ position: 'absolute', top: 6, right: 6 }}
                    />
                  )}
                </Button>
                <Button fullWidth onClick={() => setAbaAtiva("pm")} sx={{ color: abaAtiva === "pm" ? "#ff9800" : "#94a3b8", fontWeight: 'bold', borderRadius: 0, py: 1, bgcolor: abaAtiva === "pm" ? "rgba(255,152,0,0.1)" : "transparent", fontSize: '0.75rem', position: 'relative' }}>
                  👑 PM's ({pmList.length})
                  {totalNaoLidasPM > 0 && (
                    <Badge 
                      badgeContent={totalNaoLidasPM} 
                      color="error"
                      sx={{ position: 'absolute', top: 6, right: 6 }}
                    />
                  )}
                </Button>
              </Box>

              <Box sx={{ flex: 1, overflowY: "auto", "&::-webkit-scrollbar": { width: "4px" }, "&::-webkit-scrollbar-thumb": { background: "rgba(0,224,255,0.2)", borderRadius: "10px" } }}>
                <List dense>
                  {(abaAtiva === "pj" ? pjList : pmList).map(([email, ficha]) => {
                    const auraCor = getAuraCor(email);
                    const foto = getFotoPersonagem(email);
                    const temNaoLida = notificacoesLocais[email];
                    return (
                      <ListItem key={email} onClick={() => { setChatAberto(email); setNotificacoesLocais(prev => ({ ...prev, [email]: false })); if (setNotificacoesSidebar) setNotificacoesSidebar(prev => ({ ...prev, [email]: false })); }}
                        sx={{ cursor: "pointer", "&:hover": { bgcolor: "rgba(0,224,255,0.05)" }, borderLeft: `3px solid ${auraCor}`, mb: 0.3, borderRadius: 1 }}>
                        <ListItemAvatar>
                          <Badge color="error" variant="dot" invisible={!temNaoLida}>
                            <Avatar src={foto} sx={{ width: 36, height: 36, border: `1px solid ${auraCor}`, cursor: 'pointer' }}
                              onClick={(e) => { e.stopPropagation(); if (foto) { setLightboxImage(foto); setZoom(1); } }}>
                              {(ficha?.nome || email)[0]?.toUpperCase()}
                            </Avatar>
                          </Badge>
                        </ListItemAvatar>
                        <ListItemText 
                          primary={ficha?.nome || email}
                          secondary={ficha?.tipoAura ? `✨ ${ficha.tipoAura}` : email}
                          primaryTypographyProps={{ sx: { color: auraCor, fontWeight: 'bold', fontSize: '0.8rem' } }}
                          secondaryTypographyProps={{ sx: { color: '#64748b', fontSize: '0.65rem' } }}
                        />
                      </ListItem>
                    );
                  })}
                </List>
              </Box>
            </>
          ) : (
            <>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, p: 1, bgcolor: "#1a1a2e", borderBottom: "1px solid #334155" }}>
                <IconButton size="small" onClick={() => setChatAberto(null)} sx={{ color: "#94a3b8" }}>
                  <ArrowBackIcon fontSize="small" />
                </IconButton>
                <Avatar src={getFotoPersonagem(chatAberto)} sx={{ width: 30, height: 30, border: `2px solid ${getAuraCor(chatAberto)}`, cursor: 'pointer' }}
                  onClick={() => { const foto = getFotoPersonagem(chatAberto); if (foto) { setLightboxImage(foto); setZoom(1); } }}>
                  {getNomePersonagem(chatAberto)[0]?.toUpperCase()}
                </Avatar>
                <Box>
                  <Typography sx={{ color: getAuraCor(chatAberto), fontWeight: 'bold', fontSize: '0.8rem' }}>
                    {getNomePersonagem(chatAberto)}
                  </Typography>
                </Box>
              </Box>

              <Box ref={chatRef} sx={{ flex: 1, overflowY: "auto", p: 1.5, display: "flex", flexDirection: "column", gap: 0.5, bgcolor: "#0a0f1a", position: 'relative', "&::-webkit-scrollbar": { width: "4px" }, "&::-webkit-scrollbar-thumb": { background: "rgba(0,224,255,0.2)", borderRadius: "10px" } }}>
                {mensagens.map((msg, index) => {
                  const ehMeu = msg.de === userEmail;
                  const fotoRemetente = ehMeu ? getFotoPersonagem(userEmail) : getFotoPersonagem(chatAberto);
                  const nomeRemetente = ehMeu ? userNick || userEmail : getNomePersonagem(chatAberto);
                  const ehNova = ultimaLeitura[chatAberto] && msg.id > ultimaLeitura[chatAberto];
                  const mostrarDivisoria = ehNova && mensagens[index - 1]?.id === ultimaLeitura[chatAberto];
                  
                  return (
                    <React.Fragment key={msg.id}>
                      {mostrarDivisoria && (
                        <Box ref={divisoriaRef} sx={{ display: "flex", alignItems: "center", gap: 1, my: 1 }}>
                          <Divider sx={{ flex: 1, borderColor: '#ef4444' }} />
                          <Chip label="Mensagens não lidas" size="small" sx={{ bgcolor: '#ef4444', color: '#fff', fontSize: '0.6rem', height: 18 }} />
                          <Divider sx={{ flex: 1, borderColor: '#ef4444' }} />
                        </Box>
                      )}
                      
                      <Box sx={{ display: "flex", justifyContent: ehMeu ? "flex-end" : "flex-start", alignItems: "flex-end", gap: 1, position: 'relative', '&:hover .msg-actions': { opacity: 1 } }}>
                        {!ehMeu && (
                          <Avatar src={fotoRemetente} sx={{ width: 26, height: 26, border: `1px solid ${getAuraCor(chatAberto)}`, cursor: 'pointer' }}
                            onClick={() => { if (fotoRemetente) { setLightboxImage(fotoRemetente); setZoom(1); } }}>
                            {nomeRemetente[0]?.toUpperCase()}
                          </Avatar>
                        )}
                        <Box sx={{ maxWidth: "70%" }}>
                          <Typography sx={{ color: '#64748b', fontSize: '0.55rem', mb: 0.2, textAlign: ehMeu ? 'right' : 'left' }}>
                            {ehMeu ? 'Você' : nomeRemetente} • {formatarHora(msg.timestamp)}
                          </Typography>
                          <Paper sx={{ p: 1.2, bgcolor: ehMeu ? '#1e3a5f' : '#1a1a2e', borderRadius: ehMeu ? '12px 12px 4px 12px' : '12px 12px 12px 4px', border: ehMeu ? '1px solid #00e0ff44' : '1px solid #334155' }}>
                            {editandoMsg === msg.id ? (
                              <Box sx={{ display: 'flex', gap: 0.5, flexDirection: 'column' }}>
                                <TextField size="small" fullWidth value={textoEdicao} onChange={(e) => setTextoEdicao(e.target.value)} autoFocus />
                                <Box sx={{ display: 'flex', gap: 0.5 }}>
                                  <Button size="small" onClick={() => editarMensagem(msg.id)}>Salvar</Button>
                                  <Button size="small" onClick={() => setEditandoMsg(null)}>Cancelar</Button>
                                </Box>
                              </Box>
                            ) : (
                              <>
                                {msg.tipo === "imagem" && (
                                  <img src={msg.conteudo} style={{ maxWidth: 200, maxHeight: 200, borderRadius: 8, cursor: "pointer" }}
                                    onClick={() => { setLightboxImage(msg.conteudo); setZoom(1); }} />
                                )}
                                {msg.tipo === "imagem_grupo" && (
                                  <Box>
                                    {msg.conteudo && <Typography sx={{ whiteSpace: 'pre-line', fontSize: '0.8rem', color: '#fff', mb: 0.5 }}>{msg.conteudo}</Typography>}
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                      {(msg.imagens || []).map((img, i) => (
                                        <img key={i} src={img} style={{ maxWidth: 100, maxHeight: 100, borderRadius: 6, cursor: "pointer" }}
                                          onClick={() => { setLightboxImage(img); setZoom(1); }} />
                                      ))}
                                    </Box>
                                  </Box>
                                )}
                                {msg.tipo === "link" && (
                                  <a href={msg.conteudo} target="_blank" rel="noreferrer" style={{ color: '#00e0ff', fontSize: '0.8rem' }}>{msg.conteudo}</a>
                                )}
                                {msg.tipo === "texto" && (
                                  <Typography sx={{ whiteSpace: 'pre-line', fontSize: '0.8rem', color: '#fff' }}>
                                    {msg.conteudo}
                                    {msg.editada && <span style={{ fontSize: '0.6rem', color: '#94a3b8', marginLeft: 4 }}>(editada)</span>}
                                  </Typography>
                                )}
                              </>
                            )}
                          </Paper>
                        </Box>
                        {ehMeu && (
                          <Avatar src={fotoRemetente} sx={{ width: 26, height: 26, border: `1px solid ${getAuraCor(userEmail)}`, cursor: 'pointer' }}
                            onClick={() => { if (fotoRemetente) { setLightboxImage(fotoRemetente); setZoom(1); } }}>
                            {(userNick || userEmail)[0]?.toUpperCase()}
                          </Avatar>
                        )}
                        
                        {/* BOTÕES EDITAR/EXCLUIR */}
                        <Box className="msg-actions" sx={{ position: 'absolute', top: 0, right: ehMeu ? 40 : undefined, left: ehMeu ? undefined : 40, display: 'flex', gap: 0.2, opacity: 0, transition: 'opacity 0.2s' }}>
                          <IconButton size="small" onClick={() => { setEditandoMsg(msg.id); setTextoEdicao(msg.conteudo); }} sx={{ bgcolor: '#1a1a2e', width: 18, height: 18 }}>
                            <EditIcon sx={{ fontSize: 10, color: '#ff9800' }} />
                          </IconButton>
                          <IconButton size="small" onClick={() => excluirMensagem(msg.id)} sx={{ bgcolor: '#1a1a2e', width: 18, height: 18 }}>
                            <DeleteIcon sx={{ fontSize: 10, color: '#ef4444' }} />
                          </IconButton>
                        </Box>
                      </Box>
                    </React.Fragment>
                  );
                })}
                <div ref={chatEndRef} />
              </Box>

              {/* BOTÃO DESCER */}
              {showScrollButton && (
                <Fab size="small" color="primary" onClick={() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); setShowScrollButton(false); }}
                  sx={{ position: 'absolute', bottom: 80, right: 16, zIndex: 10, width: 32, height: 32, minHeight: 32 }}>
                  <ArrowDownwardIcon sx={{ fontSize: 16 }} />
                </Fab>
              )}

              {/* ÁREA DE ENVIO */}
              <Box sx={{ p: 1, borderTop: "1px solid #334155", bgcolor: "#1a1a2e" }}>
                {/* PREVIEW DAS IMAGENS */}
                {filePreviews.length > 0 && (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 0.5 }}>
                    {filePreviews.map((img, i) => (
                      <Box key={i} sx={{ position: 'relative' }}>
                        <img src={img} style={{ width: 50, height: 50, borderRadius: 6, objectFit: 'cover' }} />
                        <IconButton size="small" onClick={() => setFilePreviews(prev => prev.filter((_, idx) => idx !== i))}
                          sx={{ position: 'absolute', top: -8, right: -8, bgcolor: '#ef4444', width: 16, height: 16 }}>
                          <CloseIcon sx={{ fontSize: 10, color: '#fff' }} />
                        </IconButton>
                      </Box>
                    ))}
                  </Box>
                )}
                
                <Box sx={{ display: "flex", gap: 0.5, alignItems: 'flex-end' }}>
                  <IconButton component="label" size="small" sx={{ color: '#94a3b8' }}>
                    <ImageIcon fontSize="small" />
                    <input type="file" accept="image/*" multiple hidden onChange={handleFileChange} />
                  </IconButton>
                  <TextField size="small" fullWidth placeholder="Mensagem... (Enter envia, Shift+Enter nova linha)" value={textoMsg}
                    onChange={(e) => setTextoMsg(e.target.value)}
                    onKeyDown={(e) => { 
                      if (e.key === "Enter" && !e.shiftKey) { 
                        e.preventDefault(); 
                        enviarMensagem(); 
                      }
                    }}
                    multiline maxRows={4}
                    InputProps={{ style: { color: '#fff', fontSize: '0.8rem' } }}
                    sx={{ '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: '#334155' } } }} />
                  <IconButton size="small" onClick={enviarMensagem} sx={{ color: '#00e0ff' }}>
                    <SendIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Box>
            </>
          )}
        </Box>
      )}

      {!minimizado && (
        <Box sx={{ position: "absolute", bottom: 0, right: 0, width: 16, height: 16, cursor: "nwse-resize", zIndex: 10 }}
          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setRedimensionando(true); resizeStartRef.current = { x: e.clientX, y: e.clientY, width: tamanho.width, height: tamanho.height }; }} />
      )}

      {lightboxImage && (
        <Box onClick={() => setLightboxImage(null)} sx={{ position: "fixed", inset: 0, bgcolor: "rgba(0,0,0,0.92)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999999 }}>
          <LightboxImage src={lightboxImage} zoom={zoom} setZoom={setZoom} />
        </Box>
      )}
    </Paper>,
    document.body
  );
}

export default React.memo(WhatsAppChat);
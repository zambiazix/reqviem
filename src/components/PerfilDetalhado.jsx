// src/components/PerfilDetalhado.jsx
import React, { useState, useEffect, useRef } from "react";
import {
  Box, Paper, Typography, IconButton, Button, Chip, Divider,
  Avatar, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, FormControl, InputLabel, Select,
  MenuItem, List, ListItem, ListItemAvatar, ListItemText
} from "@mui/material";
import { styled, keyframes } from "@mui/material/styles";
import CloseIcon from "@mui/icons-material/Close";
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import PublicIcon from "@mui/icons-material/Public";
import ImageIcon from "@mui/icons-material/Image";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { db } from "../firebaseConfig";
import { collection, doc, getDoc, setDoc, deleteDoc, onSnapshot } from "firebase/firestore";

// ==================== ANIMAÇÕES ====================
const floatIn = keyframes`
  0% { transform: translateY(20px); opacity: 0; }
  100% { transform: translateY(0); opacity: 1; }
`;

const pulseStatus = keyframes`
  0% { opacity: 0.7; }
  50% { opacity: 1; }
  100% { opacity: 0.7; }
`;

// ==================== LIGHTBOX COM ZOOM E ARRASTE ====================
function LightboxImage({ src, zoom, setZoom }) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [start, setStart] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e) => { 
    e.preventDefault(); 
    setDragging(true); 
    setStart({ x: e.clientX - position.x, y: e.clientY - position.y }); 
  };
  
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!dragging) return;
      setPosition({ x: e.clientX - start.x, y: e.clientY - start.y });
    };
    const handleMouseUp = () => setDragging(false);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragging, start]);

  return (
    <img
      src={src}
      alt="ampliada"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={handleMouseDown}
      onWheel={(e) => {
        e.preventDefault();
        setZoom((z) => Math.min(Math.max(z + (e.deltaY > 0 ? -0.1 : 0.1), 0.5), 5));
      }}
      style={{
        transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
        transition: dragging ? "none" : "transform 0.2s ease",
        maxWidth: "90%", maxHeight: "90%", borderRadius: 10,
        cursor: dragging ? "grabbing" : "grab", userSelect: "none",
        touchAction: "none",
      }}
    />
  );
}

// ==================== COMPONENTE PRINCIPAL ====================
function PerfilDetalhado({ isMaster = false, visible = false, onClose = () => {}, currentUserEmail = null, fichasMap = {} }) {
  // TODOS OS HOOKS AQUI PRIMEIRO!
  const [lightboxImage, setLightboxImage] = useState(null);
  const [zoom, setZoom] = useState(1);
  
  const [perfis, setPerfis] = useState([]);
  const [fichasDisponiveis, setFichasDisponiveis] = useState([]);
  
  const [modalOpen, setModalOpen] = useState(false);
  const [editandoPerfil, setEditandoPerfil] = useState(null);
  const [novoPerfil, setNovoPerfil] = useState({ 
    nome: "", tipo: "npc", foto: "", fichaEmail: "", 
    descricao: "", resumo: "", biografiaWiki: "",
    dataNascimento: "", dataFalecimento: "", status: "vivo"
  });
  
  const [wikiOpen, setWikiOpen] = useState(false);
  const [wikiPerfil, setWikiPerfil] = useState(null);
  const [wikiFicha, setWikiFicha] = useState(null);
  
  // Estados de edição inline
  const [editandoCampo, setEditandoCampo] = useState(null); // 'descricao', 'resumo', 'biografiaWiki'
  const [editandoTexto, setEditandoTexto] = useState("");
  const [salvando, setSalvando] = useState(false);
  
  // Upload de imagem
  const fileInputRef = useRef(null);
  const textAreaRef = useRef(null);

  useEffect(() => {
    if (!visible) return;
    const unsub = onSnapshot(collection(db, "perfis"), (snap) => {
      const arr = [];
      snap.forEach((docSnap) => arr.push({ id: docSnap.id, ...docSnap.data() }));
      setPerfis(arr);
    });
    return () => unsub();
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    const unsub = onSnapshot(collection(db, "fichas"), (snap) => {
      const arr = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        arr.push({ 
          email: docSnap.id, 
          nome: data.nome || docSnap.id, 
          imagemPersonagem: data.imagemPersonagem || "", 
          tipoFicha: data.tipoFicha || "PJ" 
        });
      });
      setFichasDisponiveis(arr);
    });
    return () => unsub();
  }, [visible]);

  // 🟢 CALCULAR IDADE
  const calcularIdade = (dataNasc, dataFalec) => {
    if (!dataNasc) return "—";
    const nasc = new Date(dataNasc);
    const fim = dataFalec ? new Date(dataFalec) : new Date();
    let idade = fim.getFullYear() - nasc.getFullYear();
    const mes = fim.getMonth() - nasc.getMonth();
    if (mes < 0 || (mes === 0 && fim.getDate() < nasc.getDate())) idade--;
    return idade;
  };

  // 🟢 UPLOAD DE IMAGEM E INSERIR NO TEXTO
  const handleUploadImagem = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const fd = new FormData();
    fd.append("file", file);
    
    try {
      const res = await fetch("https://reqviem.onrender.com/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (data.url) {
        // Insere markdown da imagem
        const imagemMarkdown = `\n![Imagem](${data.url})\n`;
        
        if (textAreaRef.current) {
          const textarea = textAreaRef.current.querySelector('textarea');
          if (textarea) {
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const antes = editandoTexto.substring(0, start);
            const depois = editandoTexto.substring(end);
            setEditandoTexto(antes + imagemMarkdown + depois);
            setTimeout(() => {
              textarea.focus();
              textarea.selectionStart = start + imagemMarkdown.length;
              textarea.selectionEnd = start + imagemMarkdown.length;
            }, 100);
          } else {
            setEditandoTexto(prev => prev + imagemMarkdown);
          }
        } else {
          setEditandoTexto(prev => prev + imagemMarkdown);
        }
      }
    } catch (err) {
      console.error("Erro no upload:", err);
      alert("Erro ao enviar imagem");
    }
  };

  // 🟢 SALVAR CAMPO INLINE
  const salvarCampoInline = async () => {
    if (!wikiPerfil?.id || !editandoCampo) return;
    setSalvando(true);
    try {
      const update = { [editandoCampo]: editandoTexto };
      await setDoc(doc(db, "perfis", wikiPerfil.id), update, { merge: true });
      setWikiPerfil(prev => ({ ...prev, ...update }));
      setEditandoCampo(null);
      setEditandoTexto("");
    } catch (err) {
      console.error("Erro ao salvar:", err);
    } finally {
      setSalvando(false);
    }
  };

  // 🟢 SALVAR PERFIL COMPLETO (modal criar/editar)
  const salvarPerfil = async () => {
    if (!novoPerfil.nome.trim()) return alert("Nome é obrigatório!");
    try {
      const payload = { ...novoPerfil };
      if (editandoPerfil?.id) {
        await setDoc(doc(db, "perfis", editandoPerfil.id), payload, { merge: true });
      } else {
        await setDoc(doc(db, "perfis", Date.now().toString()), payload);
      }
      setModalOpen(false);
      setEditandoPerfil(null);
      setNovoPerfil({ 
        nome: "", tipo: "npc", foto: "", fichaEmail: "", 
        descricao: "", resumo: "", biografiaWiki: "",
        dataNascimento: "", dataFalecimento: "", status: "vivo"
      });
    } catch (err) {
      console.error("Erro ao salvar perfil:", err);
      alert("Erro ao salvar perfil.");
    }
  };

  const deletarPerfil = async (id) => {
    if (!window.confirm("Deletar este perfil?")) return;
    await deleteDoc(doc(db, "perfis", id));
  };

  const abrirWiki = async (perfil) => {
    setWikiPerfil(perfil);
    setWikiFicha(null);
    setEditandoCampo(null);
    if (perfil.fichaEmail) {
      try {
        const fichaSnap = await getDoc(doc(db, "fichas", perfil.fichaEmail));
        if (fichaSnap.exists()) setWikiFicha(fichaSnap.data());
      } catch (err) { console.error("Erro ao carregar ficha:", err); }
    }
    setWikiOpen(true);
  };

  // 🟢 INICIAR EDIÇÃO INLINE
  const iniciarEdicao = (campo, valor) => {
    setEditandoCampo(campo);
    setEditandoTexto(valor || "");
  };

  const npcs = perfis.filter(p => p.tipo === "npc" || p.tipo === "PM");
  const players = perfis.filter(p => p.tipo === "player" || p.tipo === "PJ");

  if (!visible) return null;

  // 🟢 COMPONENTE DE TEXTO EDITÁVEL COM MARKDOWN
  const TextoEditavel = ({ valor, campo, titulo, corTitulo, iconTitulo }) => {
    const isEditando = editandoCampo === campo && wikiPerfil;
    
    if (isEditando) {
      return (
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
            <Typography variant="subtitle2" sx={{ color: corTitulo, fontWeight: "bold", fontSize: "0.8rem" }}>
              {iconTitulo} {titulo}
            </Typography>
            <Box sx={{ display: "flex", gap: 0.5 }}>
              <Button size="small" component="label" sx={{ color: '#94a3b8', fontSize: '0.6rem', minWidth: 'auto' }}>
                <ImageIcon sx={{ fontSize: 14 }} /> Foto
                <input type="file" accept="image/*" hidden onChange={handleUploadImagem} />
              </Button>
              <Button size="small" variant="contained" onClick={salvarCampoInline} disabled={salvando}
                startIcon={<SaveIcon sx={{ fontSize: 14 }} />} sx={{ bgcolor: corTitulo, fontSize: "0.6rem" }}>Salvar</Button>
              <Button size="small" onClick={() => setEditandoCampo(null)} sx={{ color: "#94a3b8", fontSize: "0.6rem" }}>Cancelar</Button>
            </Box>
          </Box>
          <TextField
            ref={textAreaRef}
            fullWidth
            multiline
            minRows={4}
            maxRows={15}
            value={editandoTexto}
            onChange={(e) => setEditandoTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && e.shiftKey) {
                e.preventDefault();
                const textarea = e.target;
                const start = textarea.selectionStart;
                const end = textarea.selectionEnd;
                setEditandoTexto(prev => prev.substring(0, start) + "\n" + prev.substring(end));
                setTimeout(() => { textarea.selectionStart = textarea.selectionEnd = start + 1; }, 0);
              }
            }}
            placeholder="Escreva aqui... (Shift+Enter para nova linha, Markdown suportado)"
            sx={{ '& .MuiOutlinedInput-root': { color: '#fff', fontSize: '0.8rem', '& fieldset': { borderColor: `${corTitulo}44` } } }}
          />
        </Box>
      );
    }
    
    // MODO VISUALIZAÇÃO
    return (
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.5 }}>
          <Typography variant="subtitle2" sx={{ color: corTitulo, fontWeight: "bold", fontSize: "0.8rem" }}>
            {iconTitulo} {titulo}
          </Typography>
          {isMaster && wikiPerfil && (
            <IconButton size="small" onClick={() => iniciarEdicao(campo, valor)}>
              <EditIcon sx={{ fontSize: 14, color: corTitulo }} />
            </IconButton>
          )}
        </Box>
        {valor ? (
          <Box className="markdown-content" sx={{ color: "#e2e8f0", fontSize: "0.8rem", lineHeight: 1.6, maxHeight: 200, overflowY: "auto", "& img": { maxWidth: "100%", borderRadius: 2, cursor: "pointer" }, "&::-webkit-scrollbar": { width: "4px" }, "&::-webkit-scrollbar-thumb": { background: "rgba(0,224,255,0.2)", borderRadius: "10px" } }}
            onClick={(e) => { if (e.target.tagName === "IMG") { setLightboxImage(e.target.src); setZoom(1); } }}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{valor}</ReactMarkdown>
          </Box>
        ) : (
          <Typography variant="body2" sx={{ color: "#64748b", fontStyle: "italic", fontSize: "0.75rem" }}>
            {isMaster ? "Clique no lápis para editar..." : "Nenhuma informação"}
          </Typography>
        )}
      </Box>
    );
  };

  return (
    <>
      {/* PAINEL PRINCIPAL - LISTA DE PERFIS */}
      <Paper elevation={10} sx={{ position: "fixed", top: 80, right: 280, width: 420, maxHeight: "80vh", zIndex: 200, bgcolor: "#0f172a", color: "#fff", borderRadius: 2, border: "1px solid rgba(0,224,255,0.15)", display: "flex", flexDirection: "column", animation: `${floatIn} 0.4s ease-out`, overflow: "hidden" }}>
        <Box sx={{ p: 2, borderBottom: "1px solid rgba(0,224,255,0.1)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <PublicIcon sx={{ color: "#00e0ff" }} />
            <Typography variant="h6" sx={{ fontWeight: "bold", fontSize: "1rem" }}>📚 Wikpédia Réquiem</Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 1 }}>
            {isMaster && (
              <Button size="small" variant="contained" startIcon={<AddIcon />}
                onClick={() => { 
                  setEditandoPerfil(null); 
                  setNovoPerfil({ nome: "", tipo: "npc", foto: "", fichaEmail: "", descricao: "", resumo: "", biografiaWiki: "", dataNascimento: "", dataFalecimento: "", status: "vivo" }); 
                  setModalOpen(true); 
                }}
                sx={{ bgcolor: "#4caf50", fontSize: "0.7rem" }}>Novo</Button>
            )}
            <IconButton onClick={onClose} size="small" sx={{ color: "#ef4444" }}><CloseIcon fontSize="small" /></IconButton>
          </Box>
        </Box>

        <Box sx={{ flex: 1, overflowY: "auto", p: 1.5, "&::-webkit-scrollbar": { width: "4px" }, "&::-webkit-scrollbar-thumb": { background: "rgba(0,224,255,0.2)", borderRadius: "10px" } }}>
          {players.length > 0 && (
            <>
              <Typography variant="subtitle2" sx={{ color: "#4caf50", fontWeight: "bold", mb: 1, borderBottom: "1px solid #4caf5022", pb: 0.5 }}>🎮 Personagens Jogadores</Typography>
              <List dense>
                {players.map(p => {
                  const idade = calcularIdade(p.dataNascimento, p.dataFalecimento);
                  const isMorto = p.status === "morto";
                  return (
                    <ListItem key={p.id} sx={{ borderRadius: 2, mb: 0.5, "&:hover": { bgcolor: "rgba(0,224,255,0.05)" }, cursor: "pointer", opacity: isMorto ? 0.6 : 1 }} onClick={() => abrirWiki(p)}>
                      <ListItemAvatar>
                        <Avatar src={p.foto || ""} sx={{ width: 40, height: 40, border: `2px solid ${isMorto ? "#ef4444" : "#4caf50"}` }}>
                          {(p.nome || "?")[0]?.toUpperCase()}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText 
                        primary={
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                            <Typography variant="body2" sx={{ color: "#fff", fontSize: "0.85rem" }}>{p.nome}</Typography>
                            {isMorto && <Chip label="💀" size="small" sx={{ height: 16, fontSize: "0.55rem", bgcolor: "#5e1b1b", color: "#ef4444" }} />}
                            {!isMorto && <Chip label="❤️" size="small" sx={{ height: 16, fontSize: "0.55rem", bgcolor: "#1b5e20", color: "#4caf50", animation: `${pulseStatus} 2s ease-in-out infinite` }} />}
                          </Box>
                        }
                        secondary={p.descricao?.substring(0, 60) || p.resumo?.substring(0, 60) || "Sem descrição"}
                        primaryTypographyProps={{ component: 'div' }}
                        secondaryTypographyProps={{ sx: { color: "#94a3b8", fontSize: "0.65rem", maxHeight: 30, overflow: "hidden" } }} />
                      {isMaster && (
                        <Box>
                          <IconButton size="small" onClick={(e) => { e.stopPropagation(); setEditandoPerfil(p); setNovoPerfil({ ...p }); setModalOpen(true); }}>
                            <EditIcon fontSize="small" sx={{ color: "#ff9800" }} />
                          </IconButton>
                          <IconButton size="small" onClick={(e) => { e.stopPropagation(); deletarPerfil(p.id); }}>
                            <DeleteIcon fontSize="small" sx={{ color: "#ef4444" }} />
                          </IconButton>
                        </Box>
                      )}
                    </ListItem>
                  );
                })}
              </List>
            </>
          )}
          {npcs.length > 0 && (
            <>
              <Typography variant="subtitle2" sx={{ color: "#ff9800", fontWeight: "bold", mb: 1, mt: 2, borderBottom: "1px solid #ff980022", pb: 0.5 }}>👤 NPCs / Personagens do Mestre</Typography>
              <List dense>
                {npcs.map(p => {
                  const idade = calcularIdade(p.dataNascimento, p.dataFalecimento);
                  const isMorto = p.status === "morto";
                  return (
                    <ListItem key={p.id} sx={{ borderRadius: 2, mb: 0.5, "&:hover": { bgcolor: "rgba(255,152,0,0.05)" }, cursor: "pointer", opacity: isMorto ? 0.6 : 1 }} onClick={() => abrirWiki(p)}>
                      <ListItemAvatar>
                        <Avatar src={p.foto || ""} sx={{ width: 40, height: 40, border: `2px solid ${isMorto ? "#ef4444" : "#ff9800"}` }}>
                          {(p.nome || "?")[0]?.toUpperCase()}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText 
                        primary={
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                            <Typography variant="body2" sx={{ color: "#fff", fontSize: "0.85rem" }}>{p.nome}</Typography>
                            {isMorto && <Chip label="💀" size="small" sx={{ height: 16, fontSize: "0.55rem", bgcolor: "#5e1b1b", color: "#ef4444" }} />}
                            {!isMorto && <Chip label="❤️" size="small" sx={{ height: 16, fontSize: "0.55rem", bgcolor: "#1b5e20", color: "#4caf50", animation: `${pulseStatus} 2s ease-in-out infinite` }} />}
                          </Box>
                        }
                        secondary={p.descricao?.substring(0, 60) || p.resumo?.substring(0, 60) || "Sem descrição"}
                        primaryTypographyProps={{ component: 'div' }}
                        secondaryTypographyProps={{ sx: { color: "#94a3b8", fontSize: "0.65rem", maxHeight: 30, overflow: "hidden" } }} />
                      {isMaster && (
                        <Box>
                          <IconButton size="small" onClick={(e) => { e.stopPropagation(); setEditandoPerfil(p); setNovoPerfil({ ...p }); setModalOpen(true); }}>
                            <EditIcon fontSize="small" sx={{ color: "#ff9800" }} />
                          </IconButton>
                          <IconButton size="small" onClick={(e) => { e.stopPropagation(); deletarPerfil(p.id); }}>
                            <DeleteIcon fontSize="small" sx={{ color: "#ef4444" }} />
                          </IconButton>
                        </Box>
                      )}
                    </ListItem>
                  );
                })}
              </List>
            </>
          )}
          {perfis.length === 0 && (
            <Typography sx={{ color: "#64748b", textAlign: "center", py: 4 }}>Nenhum perfil cadastrado.</Typography>
          )}
        </Box>
      </Paper>

      {/* 🟢 MODAL CRIAR/EDITAR PERFIL */}
      <Dialog open={modalOpen} onClose={() => setModalOpen(false)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { bgcolor: "#0f172a", color: "#fff", border: "1px solid #1e293b" } }}>
        <DialogTitle>{editandoPerfil?.id ? "Editar Perfil" : "Novo Perfil"}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
            <TextField label="Nome" fullWidth value={novoPerfil.nome} onChange={e => setNovoPerfil(p => ({ ...p, nome: e.target.value }))}
              InputProps={{ style: { color: '#fff' } }} InputLabelProps={{ style: { color: '#94a3b8' } }} />
            
            <FormControl fullWidth>
              <InputLabel sx={{ color: '#94a3b8' }}>Tipo</InputLabel>
              <Select value={novoPerfil.tipo} label="Tipo" onChange={e => setNovoPerfil(p => ({ ...p, tipo: e.target.value }))}
                sx={{ color: '#fff', '.MuiOutlinedInput-notchedOutline': { borderColor: '#334155' } }}>
                <MenuItem value="npc">NPC (Mestre)</MenuItem>
                <MenuItem value="player">Player (Jogador)</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel sx={{ color: '#94a3b8' }}>Status</InputLabel>
              <Select value={novoPerfil.status || "vivo"} label="Status" onChange={e => setNovoPerfil(p => ({ ...p, status: e.target.value }))}
                sx={{ color: '#fff', '.MuiOutlinedInput-notchedOutline': { borderColor: '#334155' } }}>
                <MenuItem value="vivo">❤️ Vivo</MenuItem>
                <MenuItem value="morto">💀 Morto</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel sx={{ color: '#94a3b8' }}>Vincular Ficha (opcional)</InputLabel>
              <Select value={novoPerfil.fichaEmail || ""} label="Vincular Ficha"
                onChange={e => {
                  const ficha = fichasDisponiveis.find(f => f.email === e.target.value);
                  setNovoPerfil(p => ({ ...p, fichaEmail: e.target.value, nome: p.nome || ficha?.nome || "", foto: p.foto || ficha?.imagemPersonagem || "" }));
                }}
                sx={{ color: '#fff', '.MuiOutlinedInput-notchedOutline': { borderColor: '#334155' } }}>
                <MenuItem value="">Nenhuma</MenuItem>
                {fichasDisponiveis.map(f => (
                  <MenuItem key={f.email} value={f.email}>{f.nome} ({f.tipoFicha})</MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField label="URL da Foto" fullWidth value={novoPerfil.foto || ""} onChange={e => setNovoPerfil(p => ({ ...p, foto: e.target.value }))}
              InputProps={{ style: { color: '#fff' } }} InputLabelProps={{ style: { color: '#94a3b8' } }} />

            <TextField label="Data de Nascimento" type="date" fullWidth value={novoPerfil.dataNascimento || ""} 
              onChange={e => setNovoPerfil(p => ({ ...p, dataNascimento: e.target.value }))}
              InputProps={{ style: { color: '#fff' } }} InputLabelProps={{ style: { color: '#94a3b8', shrink: true } }} />

            {(novoPerfil.status === "morto" || editandoPerfil?.status === "morto") && (
              <TextField label="Data de Falecimento" type="date" fullWidth value={novoPerfil.dataFalecimento || ""} 
                onChange={e => setNovoPerfil(p => ({ ...p, dataFalecimento: e.target.value }))}
                InputProps={{ style: { color: '#ef4444' } }} InputLabelProps={{ style: { color: '#ef4444', shrink: true } }}
                helperText="Ao definir falecimento, a idade para de contar" FormHelperTextProps={{ sx: { color: '#ef4444' } }} />
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModalOpen(false)} sx={{ color: '#94a3b8' }}>Cancelar</Button>
          <Button variant="contained" onClick={salvarPerfil} sx={{ bgcolor: '#4caf50' }}>Salvar</Button>
        </DialogActions>
      </Dialog>

      {/* 🟢 MODAL WIKIPEDIA DETALHADA */}
      <Dialog open={wikiOpen} onClose={() => setWikiOpen(false)} maxWidth="md" fullWidth
        PaperProps={{ sx: { bgcolor: "#0f172a", color: "#fff", border: "1px solid #1e293b", minHeight: "80vh" } }}>
        {wikiPerfil && (
          <>
            <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #334155" }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Avatar src={wikiPerfil.foto || ""} sx={{ width: 56, height: 56, border: `2px solid ${wikiPerfil.status === "morto" ? "#ef4444" : "#00e0ff"}`, cursor: "pointer" }}
                  onClick={() => { if (wikiPerfil.foto) { setLightboxImage(wikiPerfil.foto); setZoom(1); } }}>
                  {wikiPerfil.nome?.[0]?.toUpperCase()}
                </Avatar>
                <Box>
                  <Typography variant="h6">
                    {wikiPerfil.nome}
                    <Chip label={wikiPerfil.status === "morto" ? "💀 Falecido" : "❤️ Vivo"} size="small" 
                      sx={{ ml: 1, bgcolor: wikiPerfil.status === "morto" ? "#5e1b1b" : "#1b5e20", color: wikiPerfil.status === "morto" ? "#ef4444" : "#4caf50", animation: wikiPerfil.status !== "morto" ? `${pulseStatus} 2s ease-in-out infinite` : "none" }} />
                  </Typography>
                  <Typography variant="caption" sx={{ color: "#94a3b8", display: "block" }}>
                    {wikiPerfil.tipo === "player" ? "🎮 Jogador" : "👤 NPC"}
                    {wikiPerfil.dataNascimento && ` • Nasc: ${new Date(wikiPerfil.dataNascimento).toLocaleDateString('pt-BR')}`}
                    {wikiPerfil.dataNascimento && ` • Idade: ${calcularIdade(wikiPerfil.dataNascimento, wikiPerfil.dataFalecimento)} anos`}
                    {wikiPerfil.dataFalecimento && ` • Falec: ${new Date(wikiPerfil.dataFalecimento).toLocaleDateString('pt-BR')}`}
                  </Typography>
                </Box>
              </Box>
              <IconButton onClick={() => setWikiOpen(false)} sx={{ color: "#94a3b8" }}><CloseIcon /></IconButton>
            </DialogTitle>

            <DialogContent sx={{ display: "flex", gap: 2, p: 2, height: "65vh" }}>
              {/* COLUNA ESQUERDA - CONTEÚDO EDITÁVEL */}
              <Box sx={{ flex: 1, overflowY: "auto", pr: 1, "&::-webkit-scrollbar": { width: "4px" }, "&::-webkit-scrollbar-thumb": { background: "rgba(0,224,255,0.2)", borderRadius: "10px" } }}>
                
                {/* BIOGRAFIA WIKI */}
                <TextoEditavel valor={wikiPerfil.biografiaWiki} campo="biografiaWiki" titulo="Biografia" corTitulo="#a855f7" iconTitulo="📖" />
                
                <Divider sx={{ borderColor: "rgba(0,224,255,0.1)", mb: 2 }} />
                
                {/* DESCRIÇÃO */}
                <TextoEditavel valor={wikiPerfil.descricao} campo="descricao" titulo="Descrição" corTitulo="#00e0ff" iconTitulo="📝" />
                
                <Divider sx={{ borderColor: "rgba(0,224,255,0.1)", mb: 2 }} />
                
                {/* RESUMO */}
                <TextoEditavel valor={wikiPerfil.resumo} campo="resumo" titulo="Resumo" corTitulo="#fbbf24" iconTitulo="📋" />
              </Box>

              {/* COLUNA DIREITA - FICHA RESUMIDA */}
              {wikiFicha && (
                <Box sx={{ width: 280, borderLeft: "1px solid #334155", pl: 2, overflowY: "auto", "&::-webkit-scrollbar": { width: "4px" }, "&::-webkit-scrollbar-thumb": { background: "rgba(0,224,255,0.2)", borderRadius: "10px" } }}>
                  <Typography variant="subtitle1" sx={{ color: "#00e0ff", fontWeight: "bold", mb: 1 }}>📊 Ficha Resumida</Typography>
                  <Typography variant="caption" sx={{ color: "#94a3b8" }}>HP: {wikiFicha.pontosVida || 0} | PE: {wikiFicha.pontosEnergia || 0}</Typography>
                  
                  <Typography variant="subtitle2" sx={{ color: "#4caf50", mt: 1, mb: 0.5 }}>Atributos</Typography>
                  {wikiFicha.atributos && Object.entries(wikiFicha.atributos).map(([k, v]) => (
                    <Typography key={k} variant="caption" sx={{ color: "#94a3b8", display: "block" }}>{k.charAt(0).toUpperCase() + k.slice(1)}: {v}</Typography>
                  ))}
                  
                  <Typography variant="subtitle2" sx={{ color: "#2196f3", mt: 1, mb: 0.5 }}>Perícias (nível 5+)</Typography>
                  {wikiFicha.pericias && Object.entries(wikiFicha.pericias).filter(([_, v]) => v >= 5).map(([k, v]) => (
                    <Typography key={k} variant="caption" sx={{ color: "#94a3b8", display: "block" }}>{k}: {v}</Typography>
                  ))}
                  {wikiFicha.pericias && Object.entries(wikiFicha.pericias).filter(([_, v]) => v < 5 && v > 0).length === 0 && Object.entries(wikiFicha.pericias).filter(([_, v]) => v >= 5).length === 0 && (
                    <Typography variant="caption" sx={{ color: "#64748b" }}>Nenhuma perícia</Typography>
                  )}
                  
                  {wikiFicha.habilidades?.length > 0 && (
                    <>
                      <Typography variant="subtitle2" sx={{ color: "#ff9800", mt: 1, mb: 0.5 }}>Habilidades ({wikiFicha.habilidades.length})</Typography>
                      {wikiFicha.habilidades.map((h, i) => (
                        <Chip key={i} label={h.nome || `Habilidade ${i+1}`} size="small" sx={{ mb: 0.3, bgcolor: "#1e3a5f", color: "#fff" }} />
                      ))}
                    </>
                  )}
                  
                  <Typography variant="subtitle2" sx={{ color: "#fbbf24", mt: 1, mb: 0.5 }}>Itens</Typography>
                  <Typography variant="caption" sx={{ color: "#94a3b8" }}>
                    ⚔️ {wikiFicha.equipamentos?.length || 0} • 👕 {wikiFicha.vestes?.length || 0} • 📦 {wikiFicha.diversos?.length || 0}
                  </Typography>
                </Box>
              )}
            </DialogContent>
          </>
        )}
      </Dialog>

      {/* LIGHTBOX */}
      {lightboxImage && (
        <Box onClick={() => setLightboxImage(null)} sx={{ position: "fixed", inset: 0, bgcolor: "rgba(0,0,0,0.92)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999999 }}>
          <LightboxImage src={lightboxImage} zoom={zoom} setZoom={setZoom} />
        </Box>
      )}
    </>
  );
}

export default React.memo(PerfilDetalhado);
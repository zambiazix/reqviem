import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  Box, Paper, Typography, IconButton, Button, Chip, Divider,
  Avatar, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, FormControl, InputLabel, Select,
  MenuItem, List, ListItem, ListItemAvatar, ListItemText,
  InputAdornment, Tooltip
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import PublicIcon from "@mui/icons-material/Public";
import ImageIcon from "@mui/icons-material/Image";
import SearchIcon from "@mui/icons-material/Search";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { db } from "../firebaseConfig";
import { collection, doc, getDoc, setDoc, deleteDoc, onSnapshot } from "firebase/firestore";
import { CONQUISTAS, RARIDADES } from "./Conquistas";

const IMGBB_API_KEY = "73fcf242ce0108665fa0c9e9de33bd50";

const CORES_AURA = {
  "Titã": "#ff3b3b", "Alquimista": "#00e0ff", "Artesão": "#ffd700",
  "Fundador": "#00ff88", "Déspota": "#a855f7", "Ás": "#e5e5e5",
};

// 🟢 NOVOS TIPOS DE PERFIL
const TIPOS_PERFIL = [
  { valor: "pj", label: "🎮 Personagem do Jogador (PJ)", cor: "#4caf50" },
  { valor: "pm", label: "👑 Personagem do Mestre (PM)", cor: "#ff9800" },
  { valor: "npc_primario", label: "⭐ NPC Primário", cor: "#00e0ff" },
  { valor: "npc_secundario", label: "📘 NPC Secundário", cor: "#a855f7" },
  { valor: "npc_terciario", label: "📄 NPC Terciário", cor: "#64748b" },
];

const getTipoInfo = (tipo) => TIPOS_PERFIL.find(t => t.valor === tipo) || { label: tipo, cor: "#94a3b8" };

// ==================== LIGHTBOX ====================
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

// ==================== JANELA DE PERFIL INDIVIDUAL ====================
function JanelaPerfil({ perfil, onClose, isMaster, todasFichas, xpMap, jogadorPorFicha, ranking }) {
  const [posicao, setPosicao] = useState({ x: 150 + Math.random() * 300, y: 100 + Math.random() * 200 });
  const [tamanho, setTamanho] = useState({ width: 700, height: 600 });
  const [minimizado, setMinimizado] = useState(false);
  const [arrastando, setArrastando] = useState(false);
  const [redimensionando, setRedimensionando] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const resizeStartRef = useRef({ x: 0, y: 0, width: 0, height: 0 });
  const [lightboxImage, setLightboxImage] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [fichaVinculada, setFichaVinculada] = useState(null);
  const [editandoCampo, setEditandoCampo] = useState(null);
  const [editandoTexto, setEditandoTexto] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [dadosPerfil, setDadosPerfil] = useState(perfil);
  const [modalOpen, setModalOpen] = useState(false);
  const [novoPerfil, setNovoPerfil] = useState({ nome: "", tipo: "npc_secundario", foto: "", fichaEmail: "", descricao: "", biografiaWiki: "", dataNascimento: "", dataFalecimento: "", status: "vivo", habilidades: [] });
  const textAreaRef = useRef(null);
    const [conquistasDesbloqueadas, setConquistasDesbloqueadas] = useState({});

  // 🟢 CARREGAR CONQUISTAS DO PERSONAGEM VINCULADO
  useEffect(() => {
    if (!perfil.fichaEmail) {
      setConquistasDesbloqueadas({});
      return;
    }
    const ref = doc(db, "conquistas", perfil.fichaEmail);
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        setConquistasDesbloqueadas(snap.data().desbloqueadas || {});
      } else {
        setConquistasDesbloqueadas({});
      }
    });
    return () => unsub();
  }, [perfil.fichaEmail]);

  const calcularIdade = (dataNasc, dataFalec) => {
    if (!dataNasc) return "—";
    const nasc = new Date(dataNasc);
    const fim = dataFalec ? new Date(dataFalec) : new Date();
    let idade = fim.getFullYear() - nasc.getFullYear();
    const mes = fim.getMonth() - nasc.getMonth();
    if (mes < 0 || (mes === 0 && fim.getDate() < nasc.getDate())) idade--;
    return idade;
  };

  useEffect(() => {
    if (perfil.fichaEmail && todasFichas) {
      const ficha = todasFichas[perfil.fichaEmail] || null;
      setFichaVinculada(ficha);
    }
  }, [perfil.fichaEmail, todasFichas]);

  useEffect(() => { setDadosPerfil(perfil); }, [perfil]);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (arrastando) setPosicao({ x: e.clientX - dragStartRef.current.x, y: e.clientY - dragStartRef.current.y });
      if (redimensionando) {
        const newWidth = Math.max(500, resizeStartRef.current.width + (e.clientX - resizeStartRef.current.x));
        const newHeight = Math.max(400, resizeStartRef.current.height + (e.clientY - resizeStartRef.current.y));
        setTamanho({ width: newWidth, height: newHeight });
      }
    };
    const handleMouseUp = () => { setArrastando(false); setRedimensionando(false); };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => { window.removeEventListener("mousemove", handleMouseMove); window.removeEventListener("mouseup", handleMouseUp); };
  }, [arrastando, redimensionando]);

  const handleUploadImagem = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("image", file);
    try {
      const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: "POST", body: fd });
      const data = await res.json();
      if (data?.success) {
        const url = data.data.url;
        const imagemMarkdown = `\n![Imagem](${url})\n`;
        if (textAreaRef.current) {
          const textarea = textAreaRef.current.querySelector('textarea');
          if (textarea) {
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const antes = editandoTexto.substring(0, start);
            const depois = editandoTexto.substring(end);
            setEditandoTexto(antes + imagemMarkdown + depois);
            setTimeout(() => { textarea.focus(); textarea.selectionStart = textarea.selectionEnd = start + imagemMarkdown.length; }, 100);
          } else {
            setEditandoTexto(prev => prev + imagemMarkdown);
          }
        } else {
          setEditandoTexto(prev => prev + imagemMarkdown);
        }
      }
    } catch (err) { alert("Erro ao enviar imagem"); }
  };

  const salvarCampo = async () => {
    if (!editandoCampo) return;
    setSalvando(true);
    try {
      const update = { [editandoCampo]: editandoTexto };
      await setDoc(doc(db, "perfis", dadosPerfil.id), update, { merge: true });
      setDadosPerfil(prev => ({ ...prev, ...update }));
      setEditandoCampo(null);
      setEditandoTexto("");
    } catch (err) { console.error("Erro ao salvar:", err); }
    finally { setSalvando(false); }
  };

  const tipoInfo = getTipoInfo(dadosPerfil.tipo);
  const auraCor = fichaVinculada?.tipoAura ? CORES_AURA[fichaVinculada.tipoAura] : tipoInfo.cor;
  const isMorto = dadosPerfil.status === "morto";
  const idade = calcularIdade(dadosPerfil.dataNascimento, dadosPerfil.dataFalecimento);
    const emailFicha = dadosPerfil.fichaEmail;
  const nivelInfo = emailFicha && xpMap?.[emailFicha] ? { level: xpMap[emailFicha]?.level || 1, xp: xpMap[emailFicha]?.xp || 0 } : null;
  const posicaoRanking = emailFicha ? ranking?.find(r => r.email === emailFicha)?.posicao : null;
  const jogadorNome = emailFicha ? jogadorPorFicha?.[emailFicha] : null;

  return createPortal(
    <Paper
      elevation={10}
      sx={{
        position: "fixed", left: posicao.x, top: posicao.y,
        width: minimizado ? 350 : tamanho.width, height: minimizado ? 48 : tamanho.height,
        bgcolor: "#0f172a", color: "#fff", borderRadius: 2,
        border: `2px solid ${auraCor}44`, zIndex: 300,
        display: "flex", flexDirection: "column", overflow: "hidden",
        boxShadow: `0 8px 32px rgba(0,0,0,0.8), 0 0 20px ${auraCor}22`,
        transition: "none",
      }}
    >
      {/* BARRA DE TÍTULO */}
      <Box
        sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", p: 1, bgcolor: `${auraCor}22`, cursor: "move", minHeight: 40, borderBottom: `1px solid ${auraCor}44` }}
        onMouseDown={(e) => {
          if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT') return;
          e.preventDefault();
          setArrastando(true);
          dragStartRef.current = { x: e.clientX - posicao.x, y: e.clientY - posicao.y };
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Avatar src={dadosPerfil.foto} sx={{ width: 24, height: 24, border: `1px solid ${auraCor}` }}>
            {dadosPerfil.nome?.[0]?.toUpperCase()}
          </Avatar>
          <Typography variant="subtitle2" sx={{ fontWeight: "bold", color: auraCor }}>
            {minimizado ? dadosPerfil.nome : `📖 ${dadosPerfil.nome}`}
          </Typography>
          {isMorto && <Chip label="💀" size="small" sx={{ height: 18, bgcolor: "#5e1b1b", color: "#ef4444", fontSize: "0.6rem" }} />}
        </Box>
        <Box sx={{ display: "flex", gap: 0.5 }}>
          <IconButton size="small" onClick={() => setMinimizado(!minimizado)} sx={{ color: "#fff", p: 0.5 }}>{minimizado ? "□" : "−"}</IconButton>
          <IconButton size="small" onClick={onClose} sx={{ color: "#ef4444", p: 0.5 }}><CloseIcon fontSize="small" /></IconButton>
        </Box>
      </Box>

      {/* CONTEÚDO */}
      {!minimizado && (
        <Box sx={{ flex: 1, overflowY: "auto", p: 2, "&::-webkit-scrollbar": { width: "4px" }, "&::-webkit-scrollbar-thumb": { background: `${auraCor}44`, borderRadius: "10px" } }}>
          {/* TOPO: FOTO + INFOS */}
          <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
            <Box
              sx={{ width: 120, height: 120, minWidth: 120, borderRadius: 2, overflow: "hidden", border: `2px solid ${auraCor}`, cursor: dadosPerfil.foto ? "pointer" : "default", bgcolor: "#1a1a2e", display: "flex", alignItems: "center", justifyContent: "center" }}
              onClick={() => { if (dadosPerfil.foto) { setLightboxImage(dadosPerfil.foto); setZoom(1); } }}
            >
              {dadosPerfil.foto ? (
                <img src={dadosPerfil.foto} alt={dadosPerfil.nome} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <Typography sx={{ fontSize: "3rem", opacity: 0.5 }}>👤</Typography>
              )}
            </Box>
            <Box sx={{ flex: 1 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <Typography variant="h6" sx={{ fontWeight: "bold", color: auraCor }}>{dadosPerfil.nome}</Typography>
                {isMaster && (
                  <IconButton size="small" onClick={() => {
                    setNovoPerfil({ ...dadosPerfil });
                    setModalOpen(true);
                  }} sx={{ color: "#ff9800", p: 0.5 }}>
                    <EditIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                )}
              </Box>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 0.5 }}>
                {isMorto ? (
                  <Chip label="💀 Falecido" size="small" sx={{ bgcolor: "#5e1b1b", color: "#ef4444" }} />
                ) : (
                  <Chip label="❤️ Vivo" size="small" sx={{ bgcolor: "#1b5e20", color: "#4caf50" }} />
                )}
                <Chip label={tipoInfo.label} size="small" sx={{ bgcolor: `${tipoInfo.cor}33`, color: tipoInfo.cor }} />
                {fichaVinculada?.tipoAura && (
                  <Chip label={`✨ ${fichaVinculada.tipoAura}`} size="small" sx={{ bgcolor: `${auraCor}33`, color: auraCor, border: `1px solid ${auraCor}66` }} />
                )}
                                {posicaoRanking && (
                  <Chip 
                    label={`🏆 #${posicaoRanking}`} 
                    size="small" 
                    sx={{ 
                      bgcolor: posicaoRanking === 1 ? '#FFD700' : posicaoRanking === 2 ? '#C0C0C0' : posicaoRanking === 3 ? '#CD7F32' : '#1e3a5f',
                      color: posicaoRanking <= 3 ? '#000' : '#fff',
                      fontWeight: 'bold',
                      fontSize: '0.6rem'
                    }} 
                  />
                )}
                {nivelInfo && (
                  <Chip label={`⭐ LV ${nivelInfo.level}`} size="small" sx={{ bgcolor: '#1e3a5f', color: '#8ecaff', fontWeight: 'bold', fontSize: '0.6rem' }} />
                )}
                {jogadorNome && (
                  <Chip label={`👤 ${jogadorNome}`} size="small" sx={{ bgcolor: '#1e3a5f', color: '#94a3b8', fontSize: '0.6rem' }} />
                )}
              </Box>
              <Box sx={{ mt: 1, display: "flex", flexDirection: "column", gap: 0.3 }}>
                {dadosPerfil.dataNascimento && (
                  <Typography variant="caption" sx={{ color: "#94a3b8" }}>
                    🎂 {new Date(dadosPerfil.dataNascimento).toLocaleDateString('pt-BR')} • {idade} anos
                  </Typography>
                )}
                {dadosPerfil.dataFalecimento && (
                  <Typography variant="caption" sx={{ color: "#ef4444" }}>
                    🕊️ Falecimento: {new Date(dadosPerfil.dataFalecimento).toLocaleDateString('pt-BR')}
                  </Typography>
                )}
                {fichaVinculada?.origem && (
                  <Typography variant="caption" sx={{ color: "#94a3b8" }}>🏙️ {fichaVinculada.origem}</Typography>
                )}
                {fichaVinculada?.genero && (
                  <Typography variant="caption" sx={{ color: "#94a3b8" }}>⚧️ {fichaVinculada.genero}</Typography>
                )}
                {fichaVinculada?.gentilico && (
                  <Typography variant="caption" sx={{ color: "#94a3b8" }}>🌍 {fichaVinculada.gentilico}</Typography>
                )}
                {fichaVinculada?.backgroundTipo && (
                  <Typography variant="caption" sx={{ color: "#ff9800" }}>⚜️ {fichaVinculada.backgroundTipo}</Typography>
                )}
              </Box>
            </Box>
          </Box>

          <Divider sx={{ borderColor: `${auraCor}22`, mb: 2 }} />

          {/* FICHA RESUMIDA (SE VINCULADA) */}
          {fichaVinculada && (
            <Box sx={{ mb: 2, p: 1.5, bgcolor: "#1a1a2e", borderRadius: 1, border: `1px solid ${auraCor}44` }}>
              <Typography variant="subtitle2" sx={{ color: auraCor, mb: 1 }}>📊 Ficha Resumida</Typography>
              <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                <Typography variant="caption" sx={{ color: "#ff4d4f" }}>❤️ PV: {fichaVinculada.pontosVida || 0}</Typography>
                <Typography variant="caption" sx={{ color: "#facc15" }}>⚡ PE: {fichaVinculada.pontosEnergia || 0}</Typography>
                <Typography variant="caption" sx={{ color: "#94a3b8" }}>🛡️ Arm: {fichaVinculada.armadura || 0}</Typography>
              </Box>
              {fichaVinculada.atributos && (
                <Box sx={{ mt: 1, display: "flex", gap: 1, flexWrap: "wrap" }}>
                  {Object.entries(fichaVinculada.atributos).filter(([_, v]) => v > 0).map(([k, v]) => (
                    <Chip key={k} label={`${k.charAt(0).toUpperCase() + k.slice(1)}: ${v}`} size="small" sx={{ bgcolor: "#1e3a5f", color: "#fff", fontSize: "0.6rem", height: 18 }} />
                  ))}
                </Box>
              )}
              {fichaVinculada.pericias && (
                <Box sx={{ mt: 1, display: "flex", gap: 1, flexWrap: "wrap" }}>
                  {Object.entries(fichaVinculada.pericias).filter(([_, v]) => v >= 3).map(([k, v]) => (
                    <Chip key={k} label={`${k}: ${v}`} size="small" sx={{ bgcolor: "#1e3a5f", color: "#00e0ff", fontSize: "0.6rem", height: 18 }} />
                  ))}
                </Box>
              )}
            </Box>
          )}

          {/* HABILIDADES */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ color: auraCor, fontWeight: "bold", mb: 1 }}>⚡ Habilidades</Typography>
            {fichaVinculada?.habilidades && fichaVinculada.habilidades.length > 0 ? (
              <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                {fichaVinculada.habilidades.map((h, i) => (
                  <Chip key={i} label={`${h.nome || 'Habilidade'} (${h.dado || 1}d10)`} size="small" sx={{ bgcolor: `${auraCor}22`, color: auraCor, border: `1px solid ${auraCor}44` }} />
                ))}
              </Box>
            ) : dadosPerfil.habilidades && dadosPerfil.habilidades.length > 0 ? (
              <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                {dadosPerfil.habilidades.map((h, i) => (
                  <Chip key={i} label={typeof h === 'string' ? h : h.nome} size="small" sx={{ bgcolor: `${auraCor}22`, color: auraCor }} />
                ))}
              </Box>
            ) : (
              <Typography variant="caption" sx={{ color: "#64748b" }}>Nenhuma habilidade registrada.</Typography>
            )}
          </Box>
          {/* 🟢 CONQUISTAS DO PERSONAGEM */}
          {perfil.fichaEmail && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ color: "#ffd700", fontWeight: "bold", mb: 1 }}>
                🏆 Conquistas ({Object.keys(conquistasDesbloqueadas).length}/{CONQUISTAS?.length || 0})
              </Typography>
              {CONQUISTAS && CONQUISTAS.length > 0 ? (
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                  {CONQUISTAS.map(conquista => {
                    const desbloqueada = !!conquistasDesbloqueadas[conquista.id];
                    const raridade = RARIDADES?.[conquista.raridade] || { cor: "#94a3b8" };
                    return (
                      <Tooltip key={conquista.id} title={`${conquista.nome}: ${conquista.desc}`} arrow>
                        <Paper sx={{ 
                          p: 1, 
                          bgcolor: desbloqueada ? '#1a1a2e' : '#0a0a0a', 
                          border: `1px solid ${desbloqueada ? raridade.cor : '#333'}`,
                          borderRadius: 1,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.5,
                          opacity: desbloqueada ? 1 : 0.5,
                          cursor: 'default',
                        }}>
                          <Typography sx={{ fontSize: "1.2rem", filter: desbloqueada ? 'none' : 'grayscale(100%)' }}>
                            {desbloqueada ? conquista.icone : "🔒"}
                          </Typography>
                          <Typography variant="caption" sx={{ color: desbloqueada ? '#fff' : '#555', fontSize: '0.6rem', fontWeight: 'bold' }}>
                            {conquista.nome}
                          </Typography>
                        </Paper>
                      </Tooltip>
                    );
                  })}
                </Box>
              ) : (
                <Typography variant="caption" sx={{ color: "#64748b" }}>Nenhuma conquista disponível.</Typography>
              )}
            </Box>
          )}
          {/* DESCRIÇÃO */}
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.5 }}>
              <Typography variant="subtitle2" sx={{ color: "#00e0ff", fontWeight: "bold" }}>📝 Descrição</Typography>
              {isMaster && !editandoCampo && (
                <IconButton size="small" onClick={() => { setEditandoCampo("descricao"); setEditandoTexto(dadosPerfil.descricao || dadosPerfil.biografiaWiki || ""); }}>
                  <EditIcon sx={{ fontSize: 14, color: "#00e0ff" }} />
                </IconButton>
              )}
            </Box>
            {editandoCampo ? (
              <Box>
                <Box sx={{ display: "flex", gap: 0.5, mb: 1 }}>
                  <Button size="small" component="label" sx={{ color: '#94a3b8', fontSize: '0.6rem', minWidth: 'auto' }}>
                    <ImageIcon sx={{ fontSize: 14 }} /> Inserir Imagem
                    <input type="file" accept="image/*" hidden onChange={handleUploadImagem} />
                  </Button>
                  <Button size="small" variant="contained" onClick={salvarCampo} disabled={salvando} startIcon={<SaveIcon sx={{ fontSize: 14 }} />} sx={{ bgcolor: "#4caf50", fontSize: "0.6rem" }}>Salvar</Button>
                  <Button size="small" onClick={() => setEditandoCampo(null)} sx={{ color: "#94a3b8", fontSize: "0.6rem" }}>Cancelar</Button>
                </Box>
                <TextField
                  ref={textAreaRef}
                  fullWidth multiline minRows={8} maxRows={20}
                  value={editandoTexto}
                  onChange={(e) => setEditandoTexto(e.target.value)}
                  placeholder="Escreva aqui... (Markdown suportado)"
                  sx={{ '& .MuiOutlinedInput-root': { color: '#fff', fontSize: '0.8rem', '& fieldset': { borderColor: '#00e0ff44' } } }}
                />
              </Box>
            ) : (
              <Box className="markdown-content" sx={{ color: "#e2e8f0", fontSize: "0.8rem", lineHeight: 1.6, maxHeight: 350, overflowY: "auto", "& img": { maxWidth: "100%", borderRadius: 2, cursor: "pointer" }, "&::-webkit-scrollbar": { width: "4px" }, "&::-webkit-scrollbar-thumb": { background: "rgba(0,224,255,0.2)", borderRadius: "10px" } }}
                onClick={(e) => { if (e.target.tagName === "IMG") { setLightboxImage(e.target.src); setZoom(1); } }}>
                {dadosPerfil.descricao || dadosPerfil.biografiaWiki ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{dadosPerfil.descricao || dadosPerfil.biografiaWiki}</ReactMarkdown>
                ) : (
                  <Typography variant="body2" sx={{ color: "#64748b", fontStyle: "italic", fontSize: "0.75rem" }}>
                    {isMaster ? "Clique no lápis para editar..." : "Nenhuma informação"}
                  </Typography>
                )}
              </Box>
            )}
          </Box>
        </Box>
      )}

      {/* ALÇA DE REDIMENSIONAMENTO */}
      {!minimizado && (
        <Box sx={{ position: "absolute", bottom: 0, right: 0, width: 16, height: 16, cursor: "nwse-resize", zIndex: 10 }}
          onMouseDown={(e) => {
            e.preventDefault(); e.stopPropagation();
            setRedimensionando(true);
            resizeStartRef.current = { x: e.clientX, y: e.clientY, width: tamanho.width, height: tamanho.height };
          }} />
      )}

      {/* MODAL EDITAR PERFIL */}
      <Dialog open={modalOpen} onClose={() => setModalOpen(false)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { bgcolor: "#0f172a", color: "#fff", border: "1px solid #1e293b", zIndex: 99999 } }}>
        <DialogTitle>Editar Informações</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
            <TextField label="Nome" fullWidth value={novoPerfil.nome} onChange={e => setNovoPerfil(p => ({ ...p, nome: e.target.value }))}
              InputProps={{ style: { color: '#fff' } }} InputLabelProps={{ style: { color: '#94a3b8' } }} />
            
            <FormControl fullWidth>
              <InputLabel sx={{ color: '#94a3b8' }}>Tipo de Perfil</InputLabel>
              <Select value={novoPerfil.tipo} label="Tipo de Perfil" onChange={e => setNovoPerfil(p => ({ ...p, tipo: e.target.value }))}
                sx={{ color: '#fff', '.MuiOutlinedInput-notchedOutline': { borderColor: '#334155' } }}>
                {TIPOS_PERFIL.map(t => (
                  <MenuItem key={t.valor} value={t.valor} sx={{ color: t.cor }}>{t.label}</MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* 🟢 LINKAR FICHA */}
            <FormControl fullWidth>
              <InputLabel sx={{ color: '#94a3b8' }}>Vincular Ficha</InputLabel>
              <Select value={novoPerfil.fichaEmail || ""} label="Vincular Ficha"
                onChange={e => {
                  const email = e.target.value;
                  const ficha = todasFichas?.[email];
                  setNovoPerfil(p => ({ 
                    ...p, 
                    fichaEmail: email,
                    nome: p.nome || ficha?.nome || "",
                    foto: p.foto || ficha?.imagemPersonagem || "",
                    tipo: ficha?.tipoFicha === "PM" ? "pm" : "pj"
                  }));
                }}
                sx={{ color: '#fff', '.MuiOutlinedInput-notchedOutline': { borderColor: '#334155' } }}>
                <MenuItem value="">Nenhuma</MenuItem>
                <MenuItem disabled sx={{ opacity: 1, borderBottom: '1px solid #4caf50' }}>
                  <Typography variant="caption" sx={{ color: '#4caf50', fontWeight: 'bold' }}>── PERSONAGENS DO JOGADOR ──</Typography>
                </MenuItem>
                {Object.entries(todasFichas || {}).filter(([_, f]) => (f.tipoFicha || "PJ") === "PJ").map(([email, f]) => (
                  <MenuItem key={email} value={email} sx={{ pl: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: CORES_AURA[f.tipoAura] || '#4caf50' }} />
                      <Typography sx={{ fontSize: '0.8rem' }}>{f.nome || email}</Typography>
                    </Box>
                  </MenuItem>
                ))}
                {Object.entries(todasFichas || {}).some(([_, f]) => f.tipoFicha === "PM") && (
                  <MenuItem disabled sx={{ opacity: 1, borderBottom: '1px solid #ff9800' }}>
                    <Typography variant="caption" sx={{ color: '#ff9800', fontWeight: 'bold' }}>── PERSONAGENS DO MESTRE ──</Typography>
                  </MenuItem>
                )}
                {Object.entries(todasFichas || {}).filter(([_, f]) => f.tipoFicha === "PM").map(([email, f]) => (
                  <MenuItem key={email} value={email} sx={{ pl: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: CORES_AURA[f.tipoAura] || '#ff9800' }} />
                      <Typography sx={{ fontSize: '0.8rem' }}>{f.nome || email}</Typography>
                    </Box>
                  </MenuItem>
                ))}
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

            <TextField label="Data de Nascimento" type="date" fullWidth value={novoPerfil.dataNascimento || ""} 
              onChange={e => setNovoPerfil(p => ({ ...p, dataNascimento: e.target.value }))}
              InputProps={{ style: { color: '#fff' } }} InputLabelProps={{ style: { color: '#94a3b8', shrink: true } }} />

            {(novoPerfil.status === "morto") && (
              <TextField label="Data de Falecimento" type="date" fullWidth value={novoPerfil.dataFalecimento || ""} 
                onChange={e => setNovoPerfil(p => ({ ...p, dataFalecimento: e.target.value }))}
                InputProps={{ style: { color: '#ef4444' } }} InputLabelProps={{ style: { color: '#ef4444', shrink: true } }} />
            )}

            {/* Foto */}
            <Box>
              <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', mb: 0.5 }}>Foto do Perfil (upload sobrepõe ficha)</Typography>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                {novoPerfil.foto ? (
                  <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                    <img src={novoPerfil.foto} alt="" style={{ width: 80, height: 80, borderRadius: 8, objectFit: 'cover' }} />
                    <IconButton size="small" onClick={() => setNovoPerfil(p => ({ ...p, foto: "" }))}
                      sx={{ position: 'absolute', top: -8, right: -8, bgcolor: '#ef4444', width: 20, height: 20 }}>
                      <CloseIcon sx={{ fontSize: 12, color: '#fff' }} />
                    </IconButton>
                  </Box>
                ) : (
                  <Box sx={{ width: 80, height: 80, borderRadius: 2, bgcolor: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography sx={{ fontSize: '2rem', opacity: 0.5 }}>👤</Typography>
                  </Box>
                )}
                <Button variant="outlined" component="label" size="small" startIcon={<ImageIcon />} sx={{ color: '#94a3b8', borderColor: '#555' }}>
                  Upload
                  <input type="file" accept="image/*" hidden onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const fd = new FormData();
                    fd.append("image", file);
                    try {
                      const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: "POST", body: fd });
                      const data = await res.json();
                      if (data?.success) {
                        setNovoPerfil(p => ({ ...p, foto: data.data.url }));
                      }
                    } catch (err) { alert("Erro ao enviar imagem"); }
                  }} />
                </Button>
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModalOpen(false)} sx={{ color: '#94a3b8' }}>Cancelar</Button>
          <Button variant="contained" onClick={async () => {
            await setDoc(doc(db, "perfis", dadosPerfil.id), novoPerfil, { merge: true });
            setDadosPerfil(prev => ({ ...prev, ...novoPerfil }));
            setModalOpen(false);
          }} sx={{ bgcolor: '#4caf50' }}>Salvar</Button>
        </DialogActions>
      </Dialog>

      {/* LIGHTBOX */}
      {lightboxImage && (
        <Box onClick={() => setLightboxImage(null)} sx={{ position: "fixed", inset: 0, bgcolor: "rgba(0,0,0,0.92)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999999 }}>
          <LightboxImage src={lightboxImage} zoom={zoom} setZoom={setZoom} />
        </Box>
      )}
    </Paper>,
    document.body
  );
}

// ==================== PAINEL PRINCIPAL ====================
function PerfilDetalhado({ isMaster = false, visible = false, onClose = () => {}, currentUserEmail = null, fichasMap = {} }) {
  const [perfis, setPerfis] = useState([]);
  const [fichasDisponiveis, setFichasDisponiveis] = useState([]);
  const [janelasAbertas, setJanelasAbertas] = useState({});
  const [modalOpen, setModalOpen] = useState(false);
  const [editandoPerfil, setEditandoPerfil] = useState(null);
  const [novoPerfil, setNovoPerfil] = useState({ nome: "", tipo: "npc_secundario", foto: "", fichaEmail: "", descricao: "", biografiaWiki: "", dataNascimento: "", dataFalecimento: "", status: "vivo", habilidades: [] });
  const [termoBusca, setTermoBusca] = useState("");
  const [minimizado, setMinimizado] = useState(false);
  const [posicao, setPosicao] = useState({ x: window.innerWidth - 500, y: 80 });
  const [tamanho, setTamanho] = useState({ width: 420, height: 600 });
    const dragStartRef = useRef({ x: 0, y: 0 });
  const resizeStartRef = useRef({ x: 0, y: 0, width: 0, height: 0 });
  const [arrastando, setArrastando] = useState(false);
  const [redimensionando, setRedimensionando] = useState(false);

    const [xpMap, setXpMap] = useState({});
  const [jogadorPorFicha, setJogadorPorFicha] = useState({});

  // 🟢 CARREGAR XP MAP EM TEMPO REAL
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "game", "hud"), (snap) => {
      if (snap.exists()) {
        setXpMap(snap.data().xpMap || {});
      } else {
        setXpMap({});
      }
    });
    return () => unsub();
  }, []);

  // 🟢 CARREGAR MAPEAMENTO FICHA -> JOGADOR
  useEffect(() => {
    const carregar = async () => {
      try {
        const ref = doc(db, "app_info", "jogadorPorFicha");
        const snap = await getDoc(ref);
        if (snap.exists()) {
          setJogadorPorFicha(snap.data().map || {});
        }
      } catch {}
    };
    carregar();
  }, []);
    // 🟢 FUNÇÃO PARA CALCULAR RANKING
  const getRanking = () => {
    const ranking = [];
    Object.keys(xpMap).forEach(email => {
      const xpData = xpMap[email];
      const level = xpData?.level || 1;
      const xp = xpData?.xp || 0;
      ranking.push({ email, level, xp });
    });
    // Ordenar: primeiro por nível (desc), depois por XP (desc)
    ranking.sort((a, b) => {
      if (b.level !== a.level) return b.level - a.level;
      return b.xp - a.xp;
    });
    // Atribuir posição
    return ranking.map((r, index) => ({ ...r, posicao: index + 1 }));
  };

  const ranking = getRanking();

  // 🟢 FUNÇÃO PARA PEGAR POSIÇÃO DE UM EMAIL
  const getPosicao = (email) => {
    const encontrado = ranking.find(r => r.email === email);
    return encontrado ? encontrado.posicao : null;
  };

  // 🟢 FUNÇÃO PARA PEGAR NÍVEL E XP DE UM EMAIL
  const getNivelInfo = (email) => {
    const data = xpMap[email];
    return { level: data?.level || 1, xp: data?.xp || 0 };
  };

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "perfis"), (snap) => {
      const arr = [];
      snap.forEach((docSnap) => arr.push({ id: docSnap.id, ...docSnap.data() }));
      setPerfis(arr);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const arr = [];
    if (fichasMap) {
      Object.entries(fichasMap).forEach(([email, data]) => {
        arr.push({ email, nome: data.nome || email, imagemPersonagem: data.imagemPersonagem || "", tipoFicha: data.tipoFicha || "PJ", tipoAura: data.tipoAura, origem: data.origem, gentilico: data.gentilico, backgroundTipo: data.backgroundTipo, genero: data.genero, atributos: data.atributos, pericias: data.pericias, pontosVida: data.pontosVida, pontosEnergia: data.pontosEnergia, armadura: data.armadura, habilidades: data.habilidades });
      });
    }
    setFichasDisponiveis(arr);
  }, [fichasMap]);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (arrastando) setPosicao({ x: e.clientX - dragStartRef.current.x, y: e.clientY - dragStartRef.current.y });
      if (redimensionando) {
        const newWidth = Math.max(350, resizeStartRef.current.width + (e.clientX - resizeStartRef.current.x));
        const newHeight = Math.max(400, resizeStartRef.current.height + (e.clientY - resizeStartRef.current.y));
        setTamanho({ width: newWidth, height: newHeight });
      }
    };
    const handleMouseUp = () => { setArrastando(false); setRedimensionando(false); };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => { window.removeEventListener("mousemove", handleMouseMove); window.removeEventListener("mouseup", handleMouseUp); };
  }, [arrastando, redimensionando]);

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
      setNovoPerfil({ nome: "", tipo: "npc_secundario", foto: "", fichaEmail: "", descricao: "", biografiaWiki: "", dataNascimento: "", dataFalecimento: "", status: "vivo", habilidades: [] });
    } catch (err) { alert("Erro ao salvar perfil."); }
  };

  const deletarPerfil = async (id) => {
    if (!window.confirm("Deletar este perfil?")) return;
    await deleteDoc(doc(db, "perfis", id));
    const novasJanelas = { ...janelasAbertas };
    delete novasJanelas[id];
    setJanelasAbertas(novasJanelas);
  };

  const abrirPerfil = (p) => {
    setJanelasAbertas(prev => ({ ...prev, [p.id]: p }));
  };

  const fecharPerfil = (id) => {
    const novasJanelas = { ...janelasAbertas };
    delete novasJanelas[id];
    setJanelasAbertas(novasJanelas);
  };

  const perfisFiltrados = termoBusca
    ? perfis.filter(p => p.nome?.toLowerCase().includes(termoBusca.toLowerCase()))
    : perfis;

  // Agrupar por tipo
  const grupos = TIPOS_PERFIL.map(t => ({
    ...t,
    perfis: perfisFiltrados.filter(p => p.tipo === t.valor)
  })).filter(g => g.perfis.length > 0);

  useEffect(() => {
    const handleAbrir = () => {
      window.dispatchEvent(new CustomEvent('togglePerfilDetalhado'));
    };
    window.addEventListener('abrirPerfilDetalhado', handleAbrir);
    return () => window.removeEventListener('abrirPerfilDetalhado', handleAbrir);
  }, []);

  if (!visible) return null;

  return (
    <>
      {Object.entries(janelasAbertas).map(([id, perfil]) => (
        <JanelaPerfil key={id} perfil={perfil} onClose={() => fecharPerfil(id)} isMaster={isMaster} todasFichas={fichasMap} xpMap={xpMap} jogadorPorFicha={jogadorPorFicha} ranking={ranking} />
      ))}

      <Paper
        elevation={10}
        sx={{
          position: "fixed", left: posicao.x, top: posicao.y,
          width: minimizado ? 350 : tamanho.width, height: minimizado ? 48 : tamanho.height,
          bgcolor: "#0f172a", color: "#fff", borderRadius: 2,
          border: "1px solid rgba(0,224,255,0.15)", zIndex: 200,
          display: "flex", flexDirection: "column", overflow: "hidden",
          boxShadow: "0 8px 32px rgba(0,0,0,0.8)", transition: "none",
        }}
      >
        <Box
          sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", p: 1, bgcolor: "rgba(0,224,255,0.08)", cursor: "move", minHeight: 40, borderBottom: "1px solid rgba(0,224,255,0.1)" }}
          onMouseDown={(e) => {
            if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT') return;
            e.preventDefault();
            setArrastando(true);
            dragStartRef.current = { x: e.clientX - posicao.x, y: e.clientY - posicao.y };
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <PublicIcon sx={{ color: "#00e0ff" }} />
            <Typography variant="subtitle2" sx={{ fontWeight: "bold" }}>{minimizado ? "📚 Wikipédia" : "📚 Wikipédia Réquiem"}</Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 0.5 }}>
            {isMaster && (
              <Button size="small" variant="contained" startIcon={<AddIcon />}
                onClick={() => { setEditandoPerfil(null); setNovoPerfil({ nome: "", tipo: "npc_secundario", foto: "", fichaEmail: "", descricao: "", biografiaWiki: "", dataNascimento: "", dataFalecimento: "", status: "vivo", habilidades: [] }); setModalOpen(true); }}
                sx={{ bgcolor: "#4caf50", fontSize: "0.65rem", mr: 1 }}>Novo</Button>
            )}
            <IconButton size="small" onClick={() => setMinimizado(!minimizado)} sx={{ color: "#fff", p: 0.5 }}>{minimizado ? "□" : "−"}</IconButton>
            <IconButton size="small" onClick={onClose} sx={{ color: "#ef4444", p: 0.5 }}><CloseIcon fontSize="small" /></IconButton>
          </Box>
        </Box>

        {!minimizado && (
          <Box sx={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <Box sx={{ p: 1 }}>
              <TextField
                size="small"
                placeholder="🔍 Buscar perfil..."
                value={termoBusca}
                onChange={(e) => setTermoBusca(e.target.value)}
                fullWidth
                InputProps={{
                  startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: '#94a3b8', fontSize: 18 }} /></InputAdornment>,
                  style: { color: '#fff', fontSize: '0.8rem' },
                }}
                sx={{ '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: '#334155' }, '&:hover fieldset': { borderColor: '#475569' } } }}
              />
            </Box>

            <Box sx={{ flex: 1, overflowY: "auto", px: 1.5, pb: 1, "&::-webkit-scrollbar": { width: "4px" }, "&::-webkit-scrollbar-thumb": { background: "rgba(0,224,255,0.2)", borderRadius: "10px" } }}>
              {grupos.map(grupo => (
                <Box key={grupo.valor} sx={{ mb: 1.5 }}>
                  <Typography variant="subtitle2" sx={{ color: grupo.cor, fontWeight: "bold", mb: 1, borderBottom: `1px solid ${grupo.cor}22`, pb: 0.5 }}>
                    {grupo.label} ({grupo.perfis.length})
                  </Typography>
                  <List dense>
                    {grupo.perfis.map(p => {
                      const tipoInfo = getTipoInfo(p.tipo);
                      const ficha = p.fichaEmail ? fichasMap?.[p.fichaEmail] : null;
                      const auraCor = ficha?.tipoAura ? CORES_AURA[ficha.tipoAura] : tipoInfo.cor;
                      const emailFicha = p.fichaEmail;
                      const nivelInfo = emailFicha ? getNivelInfo(emailFicha) : { level: 1, xp: 0 };
                      const posicao = emailFicha ? getPosicao(emailFicha) : null;
                      const jogadorNome = emailFicha ? jogadorPorFicha[emailFicha] : null;
                      return (
                        <ListItem key={p.id} sx={{ borderRadius: 2, mb: 0.3, "&:hover": { bgcolor: `${auraCor}11` }, cursor: "pointer", borderLeft: `3px solid ${auraCor}` }} onClick={() => abrirPerfil(p)}>
                          <ListItemAvatar>
                            <Avatar src={p.foto} sx={{ width: 32, height: 32, border: `1px solid ${p.status === "morto" ? "#ef4444" : auraCor}` }}>{(p.nome || "?")[0]}</Avatar>
                          </ListItemAvatar>
                          <ListItemText 
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                                <Typography sx={{ color: "#fff", fontSize: "0.8rem", fontWeight: 'bold' }}>{p.nome}</Typography>
                                {posicao && (
                                  <Chip 
                                    label={`#${posicao}`} 
                                    size="small" 
                                    sx={{ 
                                      bgcolor: posicao === 1 ? '#FFD700' : posicao === 2 ? '#C0C0C0' : posicao === 3 ? '#CD7F32' : '#1e3a5f',
                                      color: posicao <= 3 ? '#000' : '#fff',
                                      fontSize: '0.55rem', 
                                      height: 16,
                                      fontWeight: 'bold'
                                    }} 
                                  />
                                )}
                                {jogadorNome && (
                                  <Chip label={`👤 ${jogadorNome}`} size="small" sx={{ bgcolor: '#1e3a5f', color: '#94a3b8', fontSize: '0.55rem', height: 16 }} />
                                )}
                              </Box>
                            }
                            secondary={
                              <Typography sx={{ fontSize: '0.65rem', color: p.status === "morto" ? "#ef4444" : "#4caf50" }}>
                                {p.status === "morto" ? "💀 Falecido" : "❤️ Vivo"}
                                {emailFicha && ` • LV ${nivelInfo.level} • ${nivelInfo.xp}/100 XP`}
                              </Typography>
                            }
                            primaryTypographyProps={{ component: 'div' }}
                            secondaryTypographyProps={{ component: 'div' }}
                          />
                          {ficha?.tipoAura && (
                            <Chip label={`✨ ${ficha.tipoAura}`} size="small" sx={{ bgcolor: `${auraCor}22`, color: auraCor, fontSize: "0.55rem", height: 16 }} />
                          )}
                          {isMaster && (
                            <Box>
                              <IconButton size="small" onClick={(e) => { e.stopPropagation(); setEditandoPerfil(p); setNovoPerfil({ ...p }); setModalOpen(true); }}><EditIcon sx={{ fontSize: 14, color: "#ff9800" }} /></IconButton>
                              <IconButton size="small" onClick={(e) => { e.stopPropagation(); deletarPerfil(p.id); }}><DeleteIcon sx={{ fontSize: 14, color: "#ef4444" }} /></IconButton>
                            </Box>
                          )}
                        </ListItem>
                      );
                    })}
                  </List>
                </Box>
              ))}
              {perfisFiltrados.length === 0 && (
                <Typography sx={{ color: "#64748b", textAlign: "center", py: 4 }}>Nenhum perfil encontrado.</Typography>
              )}
            </Box>
          </Box>
        )}

        {!minimizado && (
          <Box sx={{ position: "absolute", bottom: 0, right: 0, width: 16, height: 16, cursor: "nwse-resize", zIndex: 10 }}
            onMouseDown={(e) => {
              e.preventDefault(); e.stopPropagation();
              setRedimensionando(true);
              resizeStartRef.current = { x: e.clientX, y: e.clientY, width: tamanho.width, height: tamanho.height };
            }} />
        )}
      </Paper>

      {/* MODAL CRIAR/EDITAR */}
      <Dialog open={modalOpen} onClose={() => setModalOpen(false)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { bgcolor: "#0f172a", color: "#fff", border: "1px solid #1e293b" } }}>
        <DialogTitle>{editandoPerfil?.id ? "Editar Perfil" : "Novo Perfil"}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
            <TextField label="Nome" fullWidth value={novoPerfil.nome} onChange={e => setNovoPerfil(p => ({ ...p, nome: e.target.value }))}
              InputProps={{ style: { color: '#fff' } }} InputLabelProps={{ style: { color: '#94a3b8' } }} />
            
            <FormControl fullWidth>
              <InputLabel sx={{ color: '#94a3b8' }}>Tipo de Perfil</InputLabel>
              <Select value={novoPerfil.tipo} label="Tipo de Perfil" onChange={e => setNovoPerfil(p => ({ ...p, tipo: e.target.value }))}
                sx={{ color: '#fff', '.MuiOutlinedInput-notchedOutline': { borderColor: '#334155' } }}>
                {TIPOS_PERFIL.map(t => (
                  <MenuItem key={t.valor} value={t.valor} sx={{ color: t.cor }}>{t.label}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel sx={{ color: '#94a3b8' }}>Vincular Ficha</InputLabel>
              <Select value={novoPerfil.fichaEmail || ""} label="Vincular Ficha"
                onChange={e => {
                  const email = e.target.value;
                  const ficha = fichasMap?.[email];
                  setNovoPerfil(p => ({ 
                    ...p, 
                    fichaEmail: email,
                    nome: p.nome || ficha?.nome || "",
                    foto: p.foto || ficha?.imagemPersonagem || "",
                    tipo: ficha?.tipoFicha === "PM" ? "pm" : "pj"
                  }));
                }}
                sx={{ color: '#fff', '.MuiOutlinedInput-notchedOutline': { borderColor: '#334155' } }}>
                <MenuItem value="">Nenhuma</MenuItem>
                <MenuItem disabled sx={{ opacity: 1, borderBottom: '1px solid #4caf50' }}>
                  <Typography variant="caption" sx={{ color: '#4caf50', fontWeight: 'bold' }}>── PERSONAGENS DO JOGADOR ──</Typography>
                </MenuItem>
                {Object.entries(fichasMap || {}).filter(([_, f]) => (f.tipoFicha || "PJ") === "PJ").map(([email, f]) => (
                  <MenuItem key={email} value={email} sx={{ pl: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: CORES_AURA[f.tipoAura] || '#4caf50' }} />
                      <Typography sx={{ fontSize: '0.8rem' }}>{f.nome || email}</Typography>
                    </Box>
                  </MenuItem>
                ))}
                {Object.entries(fichasMap || {}).some(([_, f]) => f.tipoFicha === "PM") && (
                  <MenuItem disabled sx={{ opacity: 1, borderBottom: '1px solid #ff9800' }}>
                    <Typography variant="caption" sx={{ color: '#ff9800', fontWeight: 'bold' }}>── PERSONAGENS DO MESTRE ──</Typography>
                  </MenuItem>
                )}
                {Object.entries(fichasMap || {}).filter(([_, f]) => f.tipoFicha === "PM").map(([email, f]) => (
                  <MenuItem key={email} value={email} sx={{ pl: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: CORES_AURA[f.tipoAura] || '#ff9800' }} />
                      <Typography sx={{ fontSize: '0.8rem' }}>{f.nome || email}</Typography>
                    </Box>
                  </MenuItem>
                ))}
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

            <TextField label="Data de Nascimento" type="date" fullWidth value={novoPerfil.dataNascimento || ""} 
              onChange={e => setNovoPerfil(p => ({ ...p, dataNascimento: e.target.value }))}
              InputProps={{ style: { color: '#fff' } }} InputLabelProps={{ style: { color: '#94a3b8', shrink: true } }} />

            {(novoPerfil.status === "morto") && (
              <TextField label="Data de Falecimento" type="date" fullWidth value={novoPerfil.dataFalecimento || ""} 
                onChange={e => setNovoPerfil(p => ({ ...p, dataFalecimento: e.target.value }))}
                InputProps={{ style: { color: '#ef4444' } }} InputLabelProps={{ style: { color: '#ef4444', shrink: true } }} />
            )}

            <Box>
              <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', mb: 0.5 }}>Foto do Perfil</Typography>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                {novoPerfil.foto ? (
                  <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                    <img src={novoPerfil.foto} alt="" style={{ width: 80, height: 80, borderRadius: 8, objectFit: 'cover' }} />
                    <IconButton size="small" onClick={() => setNovoPerfil(p => ({ ...p, foto: "" }))}
                      sx={{ position: 'absolute', top: -8, right: -8, bgcolor: '#ef4444', width: 20, height: 20 }}>
                      <CloseIcon sx={{ fontSize: 12, color: '#fff' }} />
                    </IconButton>
                  </Box>
                ) : (
                  <Box sx={{ width: 80, height: 80, borderRadius: 2, bgcolor: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography sx={{ fontSize: '2rem', opacity: 0.5 }}>👤</Typography>
                  </Box>
                )}
                <Button variant="outlined" component="label" size="small" startIcon={<ImageIcon />} sx={{ color: '#94a3b8', borderColor: '#555' }}>
                  Upload
                  <input type="file" accept="image/*" hidden onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const fd = new FormData();
                    fd.append("image", file);
                    try {
                      const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: "POST", body: fd });
                      const data = await res.json();
                      if (data?.success) {
                        setNovoPerfil(p => ({ ...p, foto: data.data.url }));
                      }
                    } catch (err) { alert("Erro ao enviar imagem"); }
                  }} />
                </Button>
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModalOpen(false)} sx={{ color: '#94a3b8' }}>Cancelar</Button>
          <Button variant="contained" onClick={salvarPerfil} sx={{ bgcolor: '#4caf50' }}>Salvar</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default React.memo(PerfilDetalhado);
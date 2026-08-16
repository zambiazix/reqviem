// src/pages/HomePage.jsx
import React, { useState, useEffect, useMemo, useCallback, memo } from "react";
import {
  Paper, Typography, Divider, List, ListItem, ListItemText, ListItemAvatar,
  Button, TextField, Box, IconButton, Dialog, DialogTitle, DialogContent,
  DialogActions, Avatar, Chip, InputAdornment, FormControl, Select, MenuItem,
  Tooltip
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import PersonRemoveIcon from "@mui/icons-material/PersonRemove";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import EditIcon from "@mui/icons-material/Edit";
import AddIcon from "@mui/icons-material/Add";
import FichaPersonagem from "../components/FichaPersonagem";
import { db } from "../firebaseConfig";
import { doc, deleteDoc, onSnapshot, collection, setDoc, getDoc } from "firebase/firestore";

const CORES_AURA = {
  "Titã": "#ff3b3b", "Alquimista": "#00e0ff", "Artesão": "#ffd700",
  "Fundador": "#00ff88", "Déspota": "#a855f7", "Ás": "#e5e5e5",
};

const JOGADORES_INICIAIS = [
  "Rodrigo", "Carol", "Sergio", "Vini", "Gui", "Pedrin", "Silvia", "João", "Gabi"
];

// 🟢 NORMALIZAR TEXTO (memoizado global)
const normalizar = (texto) => {
  return (texto || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
};

// 🟢 LIGHTBOX OTIMIZADO
const LightboxImage = memo(({ src, zoom, setZoom }) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [start, setStart] = useState({ x: 0, y: 0 });

  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    setDragging(true);
    setStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  }, [position]);

  useEffect(() => {
    if (!dragging) return;
    
    const handleMouseMove = (e) => {
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

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    setZoom((z) => Math.min(Math.max(z + (e.deltaY > 0 ? -0.1 : 0.1), 0.5), 5));
  }, [setZoom]);

  return (
    <img
      src={src}
      alt="ampliada"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={handleMouseDown}
      onWheel={handleWheel}
      loading="eager"
      decoding="async"
      draggable={false}
      style={{
        transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
        transition: dragging ? "none" : "transform 0.2s ease",
        maxWidth: "90%",
        maxHeight: "90%",
        borderRadius: 10,
        cursor: dragging ? "grabbing" : "grab",
        userSelect: "none",
        touchAction: "none",
        pointerEvents: dragging ? "none" : "auto",
      }}
    />
  );
});

// 🟢 ITEM DE FICHA MEMOIZADO
const FichaItem = memo(({ 
  fid, ficha, isPM, selectedFichaEmail, setSelectedFichaEmail,
  setContaToDelete, setDeleteContaDialogOpen, setFichaToDelete, setDeleteFichaDialogOpen,
  setLightboxImage, setZoom, jogadorAtual, jogadores, atrelarJogador, isSalvando,
  nivelInfo, posicao, auraCor
}) => {
  return (
    <ListItem 
      selected={selectedFichaEmail === fid} 
      onClick={() => setSelectedFichaEmail(fid)}
      sx={{ 
        cursor: 'pointer', 
        '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' }, 
        borderRadius: 1, 
        mb: 0.5, 
        bgcolor: selectedFichaEmail === fid ? '#1e3a5f' : 'transparent', 
        borderLeft: auraCor ? `3px solid ${auraCor}` : 'none', 
        pr: 2,
        flexWrap: 'wrap',
        contentVisibility: 'auto',
        containIntrinsicSize: 'auto 60px',
      }}
      secondaryAction={
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          {!isPM && (
            <IconButton edge="end" size="small" onClick={(e) => { e.stopPropagation(); setContaToDelete(fid); setDeleteContaDialogOpen(true); }} sx={{ color: '#dc2626', '&:hover': { bgcolor: 'rgba(220, 38, 38, 0.1)' } }} title="Deletar Conta">
              <PersonRemoveIcon fontSize="small" />
            </IconButton>
          )}
          <IconButton edge="end" size="small" onClick={(e) => { e.stopPropagation(); setFichaToDelete(fid); setDeleteFichaDialogOpen(true); }} sx={{ color: '#ef4444', '&:hover': { bgcolor: 'rgba(239, 68, 68, 0.1)' } }} title="Deletar Ficha">
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      }
    >
      <ListItemAvatar>
        <Avatar 
          src={ficha?.imagemPersonagem || ficha?.imagens?.[0] || ""} 
          sx={{ width: 36, height: 36, bgcolor: '#333', cursor: 'pointer', border: auraCor ? `2px solid ${auraCor}` : '1px solid #555', flexShrink: 0 }}
          onClick={(e) => { e.stopPropagation(); const img = ficha?.imagemPersonagem || ficha?.imagens?.[0]; if (img) { setLightboxImage(img); setZoom(1); } }}
          imgProps={{ loading: 'lazy', decoding: 'async' }}
        >
          {(ficha?.nome || fid)[0]?.toUpperCase()}
        </Avatar>
      </ListItemAvatar>
      
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <ListItemText 
          primary={ficha?.nome || fid}
          secondary={
            <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.3, flexWrap: 'wrap' }}>
              {ficha?.tipoAura && (
                <Chip label={ficha.tipoAura} size="small" 
                  sx={{ bgcolor: `${auraCor}22`, color: auraCor, fontWeight: 'bold', fontSize: '0.55rem', height: 16 }} />
              )}
              {jogadorAtual && (
                <Chip 
                  label={`👤 ${jogadorAtual}`}
                  size="small"
                  sx={{ bgcolor: '#1e3a5f', color: '#94a3b8', fontSize: '0.55rem', height: 16 }}
                />
              )}
              {posicao && (
                <Chip 
                  label={`🏆 #${posicao}`} 
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
              <Chip 
                label={`⭐ LV ${nivelInfo.level}`} 
                size="small" 
                sx={{ bgcolor: '#1e3a5f', color: '#8ecaff', fontSize: '0.55rem', height: 16, fontWeight: 'bold' }} 
              />
            </Box>
          }
          primaryTypographyProps={{ sx: { color: auraCor || '#fff', fontWeight: 'bold', fontSize: '0.85rem', textShadow: auraCor ? `0 0 6px ${auraCor}44` : 'none' } }}
          secondaryTypographyProps={{ component: 'div' }}
        />
      </Box>
      
      <FormControl 
        size="small" 
        sx={{ minWidth: 120, ml: 1 }}
        onClick={(e) => e.stopPropagation()}
      >
        <Select
          value={jogadorAtual}
          onChange={(e) => atrelarJogador(fid, e.target.value)}
          disabled={isSalvando}
          displayEmpty
          sx={{ 
            color: jogadorAtual ? '#fff' : '#64748b',
            fontSize: '0.7rem',
            height: 30,
            '& .MuiOutlinedInput-notchedOutline': { borderColor: '#334155' },
            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#475569' },
            '& .MuiSelect-icon': { color: '#94a3b8' }
          }}
          MenuProps={{
            PaperProps: { 
              sx: { 
                bgcolor: "#1a1a2e", 
                color: "#fff",
                maxHeight: 300,
                '& .MuiMenuItem-root': {
                  fontSize: '0.75rem',
                  '&:hover': { bgcolor: '#1e3a5f' }
                }
              } 
            }
          }}
        >
          <MenuItem value="">
            <em style={{ color: '#64748b' }}>Nenhum</em>
          </MenuItem>
          {jogadores.map(nome => (
            <MenuItem key={nome} value={nome}>{nome}</MenuItem>
          ))}
        </Select>
      </FormControl>
    </ListItem>
  );
});

export default function HomePage({ user, role, fichasList, selectedFichaEmail, setSelectedFichaEmail, criarContaEJogador }) {
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [creating, setCreating] = useState(false);
  const [deleteFichaDialogOpen, setDeleteFichaDialogOpen] = useState(false);
  const [deleteContaDialogOpen, setDeleteContaDialogOpen] = useState(false);
  const [fichaToDelete, setFichaToDelete] = useState(null);
  const [contaToDelete, setContaToDelete] = useState(null);
  const [fichasDataMap, setFichasDataMap] = useState({});
  const [lightboxImage, setLightboxImage] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [termoBusca, setTermoBusca] = useState("");
  const [jogadores, setJogadores] = useState(JOGADORES_INICIAIS);
  const [editandoJogadores, setEditandoJogadores] = useState(false);
  const [novoJogadorNome, setNovoJogadorNome] = useState("");
  const [jogadorPorFicha, setJogadorPorFicha] = useState({});
  const [salvandoJogador, setSalvandoJogador] = useState({});
  const [xpMap, setXpMap] = useState({});

  // 🟢 CARREGAR XP MAP
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "game", "hud"), (snap) => {
      setXpMap(snap.exists() ? (snap.data().xpMap || {}) : {});
    });
    return () => unsub();
  }, []);

  // 🟢 CARREGAR FICHAS
  useEffect(() => {
    const col = collection(db, "fichas");
    const unsub = onSnapshot(col, (snap) => {
      const map = {};
      snap.forEach((docSnap) => {
        map[docSnap.id] = docSnap.data();
      });
      setFichasDataMap(map);
    });
    return () => unsub();
  }, []);

  // 🟢 CARREGAR JOGADORES E MAPEAMENTO
  useEffect(() => {
    let mounted = true;
    
    const carregarDados = async () => {
      try {
        const refJogadores = doc(db, "app_info", "jogadores");
        const snapJogadores = await getDoc(refJogadores);
        if (mounted && snapJogadores.exists() && snapJogadores.data().lista) {
          setJogadores(snapJogadores.data().lista);
        }
        
        const refMap = doc(db, "app_info", "jogadorPorFicha");
        const snapMap = await getDoc(refMap);
        if (mounted && snapMap.exists()) {
          setJogadorPorFicha(snapMap.data().map || {});
        }
      } catch (err) {
        console.error("Erro ao carregar dados:", err);
      }
    };
    
    carregarDados();
    return () => { mounted = false; };
  }, []);

  // 🟢 RANKING MEMOIZADO
  const ranking = useMemo(() => {
    const rankingArray = [];
    Object.keys(xpMap).forEach(email => {
      const xpData = xpMap[email];
      rankingArray.push({ email, level: xpData?.level || 1, xp: xpData?.xp || 0 });
    });
    rankingArray.sort((a, b) => {
      if (b.level !== a.level) return b.level - a.level;
      return b.xp - a.xp;
    });
    return rankingArray.map((r, index) => ({ ...r, posicao: index + 1 }));
  }, [xpMap]);

  // 🟢 MAPA DE POSIÇÕES MEMOIZADO
  const posicoesMap = useMemo(() => {
    const map = {};
    ranking.forEach(r => { map[r.email] = r.posicao; });
    return map;
  }, [ranking]);

  // 🟢 GETTERS MEMOIZADOS
  const getPosicao = useCallback((email) => posicoesMap[email] || null, [posicoesMap]);
  
  const getNivelInfo = useCallback((email) => {
    const data = xpMap[email];
    return { level: data?.level || 1, xp: data?.xp || 0 };
  }, [xpMap]);

  const getAuraColor = useCallback((fichaData) => CORES_AURA[fichaData?.tipoAura] || null, []);

  // 🟢 SALVAR JOGADORES
  const salvarJogadores = useCallback(async (novaLista) => {
    try {
      await setDoc(doc(db, "app_info", "jogadores"), { lista: novaLista }, { merge: true });
      setJogadores(novaLista);
    } catch (err) {
      console.error("Erro ao salvar jogadores:", err);
    }
  }, []);

  // 🟢 ADICIONAR JOGADOR
  const adicionarJogador = useCallback(() => {
    const nome = novoJogadorNome.trim();
    if (!nome) return;
    if (jogadores.includes(nome)) {
      alert("Este jogador já existe!");
      return;
    }
    const novaLista = [...jogadores, nome].sort((a, b) => normalizar(a).localeCompare(normalizar(b)));
    salvarJogadores(novaLista);
    setNovoJogadorNome("");
  }, [novoJogadorNome, jogadores, salvarJogadores]);

  // 🟢 REMOVER JOGADOR
  const removerJogador = useCallback((nome) => {
    if (!window.confirm(`Remover "${nome}" da lista de jogadores?`)) return;
    const novaLista = jogadores.filter(j => j !== nome);
    salvarJogadores(novaLista);
  }, [jogadores, salvarJogadores]);

  // 🟢 ATRELAR JOGADOR
  const atrelarJogador = useCallback(async (emailFicha, nomeJogador) => {
    setSalvandoJogador(prev => ({ ...prev, [emailFicha]: true }));
    try {
      const novoMap = { ...jogadorPorFicha, [emailFicha]: nomeJogador || null };
      if (!nomeJogador) delete novoMap[emailFicha];
      
      await setDoc(doc(db, "app_info", "jogadorPorFicha"), { map: novoMap }, { merge: true });
      setJogadorPorFicha(novoMap);
    } catch (err) {
      console.error("Erro ao atrelar jogador:", err);
      alert("Erro ao salvar.");
    } finally {
      setSalvandoJogador(prev => ({ ...prev, [emailFicha]: false }));
    }
  }, [jogadorPorFicha]);

  // 🟢 CRIAR CONTA
  const handleCreateAccountAndFicha = useCallback(async () => {
    if (!newEmail || !newPassword) { alert("Preencha o e-mail e a senha para criar a conta."); return; }
    if (newEmail === "mestre@reqviemrpg.com") { alert("Não é possível criar conta para o Mestre!"); return; }
    setCreating(true);
    try {
      await criarContaEJogador(newEmail, newPassword);
      setNewEmail(""); setNewPassword("");
    } catch (err) { console.error("Erro:", err); }
    finally { setCreating(false); }
  }, [newEmail, newPassword, criarContaEJogador]);

  // 🟢 DELETAR FICHA
  const handleDeleteFicha = useCallback(async (email) => {
    try {
      await deleteDoc(doc(db, "fichas", email));
      if (selectedFichaEmail === email) setSelectedFichaEmail(null);
      setDeleteFichaDialogOpen(false); setFichaToDelete(null);
    } catch (err) { 
      alert("Erro ao deletar ficha: " + err.message); 
      setDeleteFichaDialogOpen(false); 
    }
  }, [selectedFichaEmail, setSelectedFichaEmail]);

  // 🟢 DELETAR CONTA
  const handleDeleteConta = useCallback(async (email) => {
    try {
      const apiBase = window.location.hostname === "localhost" ? "http://localhost:5000" : "https://reqviem.onrender.com";
      const response = await fetch(`${apiBase}/api/admin/delete-user`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, mestreEmail: user?.email })
      });
      const data = await response.json();
      if (response.ok) {
        if (selectedFichaEmail === email) setSelectedFichaEmail(null);
      } else { alert(`Erro: ${data.error}`); }
      setDeleteContaDialogOpen(false); setContaToDelete(null);
    } catch (err) { 
      alert("Erro ao conectar com o servidor: " + err.message); 
      setDeleteContaDialogOpen(false); 
    }
  }, [selectedFichaEmail, setSelectedFichaEmail, user?.email]);

  // 🟢 FILTRAR FICHAS (MEMOIZADO)
  const fichasFiltradas = useMemo(() => {
    const todasFichas = Object.keys(fichasDataMap);
    let pj = todasFichas.filter(fid => (fichasDataMap[fid]?.tipoFicha || "PJ") === "PJ" && fid !== "mestre@reqviemrpg.com");
    let pm = todasFichas.filter(fid => fichasDataMap[fid]?.tipoFicha === "PM" && fid !== "mestre@reqviemrpg.com");
    
    if (termoBusca.trim()) {
      const termoNormalizado = normalizar(termoBusca);
      const filtro = (fid) => {
        const nome = normalizar(fichasDataMap[fid]?.nome || "");
        const email = normalizar(fid);
        const jogador = normalizar(jogadorPorFicha[fid] || "");
        return nome.includes(termoNormalizado) || email.includes(termoNormalizado) || jogador.includes(termoNormalizado);
      };
      pj = pj.filter(filtro);
      pm = pm.filter(filtro);
    }
    
    const ordenar = (a, b) => {
      const nomeA = normalizar(fichasDataMap[a]?.nome || a);
      const nomeB = normalizar(fichasDataMap[b]?.nome || b);
      return nomeA.localeCompare(nomeB);
    };
    
    pj.sort(ordenar);
    pm.sort(ordenar);
    
    return { pj, pm };
  }, [fichasDataMap, termoBusca, jogadorPorFicha]);

  if (role !== "master") {
    return <FichaPersonagem user={user} fichaId={selectedFichaEmail} isMestre={false} />;
  }

  const todasFichas = Object.keys(fichasDataMap);

  return (
    <Paper sx={{ 
      p: 2, 
      flex: 1, 
      overflowY: "auto", 
      bgcolor: "#0f172a",
      WebkitOverflowScrolling: 'touch',
      '&::-webkit-scrollbar': { width: '4px' },
      '&::-webkit-scrollbar-thumb': { background: 'rgba(0,224,255,0.2)', borderRadius: '10px' },
    }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="h6" sx={{ color: "#fff" }}>Fichas</Typography>
        
        <Button
          size="small"
          variant={editandoJogadores ? "contained" : "outlined"}
          startIcon={<EditIcon />}
          onClick={() => setEditandoJogadores(!editandoJogadores)}
          sx={{ 
            color: editandoJogadores ? '#000' : '#ff9800',
            borderColor: '#ff9800',
            bgcolor: editandoJogadores ? '#ff9800' : 'transparent',
            '&:hover': { bgcolor: editandoJogadores ? '#f57c00' : 'rgba(255,152,0,0.1)' }
          }}
        >
          {editandoJogadores ? "Concluir" : "Editar Jogadores"}
        </Button>
      </Box>
      
      {editandoJogadores && (
        <Paper sx={{ p: 2, mb: 2, bgcolor: '#1a1a2e', border: '1px solid #ff980044', borderRadius: 2 }}>
          <Typography variant="subtitle2" sx={{ color: '#ff9800', mb: 1 }}>
            👥 Gerenciar Jogadores ({jogadores.length})
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <TextField
              size="small"
              placeholder="Nome do jogador..."
              value={novoJogadorNome}
              onChange={(e) => setNovoJogadorNome(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') adicionarJogador(); }}
              InputProps={{ sx: { color: '#fff', fontSize: '0.8rem' } }}
              sx={{ flex: 1, '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: '#334155' } } }}
            />
            <Button
              size="small"
              variant="contained"
              startIcon={<AddIcon />}
              onClick={adicionarJogador}
              sx={{ bgcolor: '#ff9800', '&:hover': { bgcolor: '#f57c00' }, minWidth: 'auto' }}
            >
              Adicionar
            </Button>
          </Box>
          
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {jogadores.map(nome => (
              <Chip
                key={nome}
                label={nome}
                onDelete={() => removerJogador(nome)}
                size="small"
                sx={{ 
                  bgcolor: '#1e3a5f', 
                  color: '#fff',
                  '& .MuiChip-deleteIcon': { color: '#ef4444', '&:hover': { color: '#dc2626' } }
                }}
              />
            ))}
            {jogadores.length === 0 && (
              <Typography variant="caption" sx={{ color: '#64748b' }}>
                Nenhum jogador cadastrado.
              </Typography>
            )}
          </Box>
        </Paper>
      )}
      
      <Divider sx={{ my: 1, bgcolor: "#334155" }} />
      
      <TextField
        fullWidth
        size="small"
        placeholder="🔍 Buscar por nome do personagem, email ou jogador..."
        value={termoBusca}
        onChange={(e) => setTermoBusca(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon sx={{ color: '#94a3b8' }} />
            </InputAdornment>
          ),
          endAdornment: termoBusca && (
            <InputAdornment position="end">
              <IconButton size="small" onClick={() => setTermoBusca("")} sx={{ color: '#94a3b8' }}>
                <ClearIcon fontSize="small" />
              </IconButton>
            </InputAdornment>
          ),
          sx: { color: '#fff' }
        }}
        sx={{ 
          mb: 1.5,
          '& .MuiOutlinedInput-root': {
            bgcolor: '#1a1a2e',
            '& fieldset': { borderColor: '#334155' },
            '&:hover fieldset': { borderColor: '#475569' },
            '&.Mui-focused fieldset': { borderColor: '#00e0ff' }
          }
        }}
      />

      {(normalizar("mestre").includes(normalizar(termoBusca)) || !termoBusca) && (
        <ListItem
          selected={selectedFichaEmail === "mestre@reqviemrpg.com"}
          onClick={() => setSelectedFichaEmail("mestre@reqviemrpg.com")}
          sx={{ 
            cursor: 'pointer', 
            borderRadius: 2, 
            mb: 1.5, 
            bgcolor: selectedFichaEmail === "mestre@reqviemrpg.com" ? 'rgba(255,215,0,0.15)' : 'rgba(255,215,0,0.05)', 
            border: selectedFichaEmail === "mestre@reqviemrpg.com" ? '2px solid #FFD700' : '1px solid rgba(255,215,0,0.3)', 
            boxShadow: '0 0 12px rgba(255,215,0,0.2)', 
            '&:hover': { bgcolor: 'rgba(255,215,0,0.12)', boxShadow: '0 0 20px rgba(255,215,0,0.4)' },
            contentVisibility: 'auto',
            containIntrinsicSize: 'auto 50px',
          }}
        >
          <ListItemAvatar>
            <Avatar 
              src={fichasDataMap["mestre@reqviemrpg.com"]?.imagemPersonagem || ""} 
              sx={{ width: 40, height: 40, border: '2px solid #FFD700', cursor: 'pointer' }}
              onClick={(e) => { e.stopPropagation(); const img = fichasDataMap["mestre@reqviemrpg.com"]?.imagemPersonagem; if (img) { setLightboxImage(img); setZoom(1); } }} 
              imgProps={{ loading: 'lazy', decoding: 'async' }}
            />
          </ListItemAvatar>
          <ListItemText 
            primary="👑 MESTRE" 
            secondary="mestre@reqviemrpg.com"
            primaryTypographyProps={{ sx: { color: '#FFD700', fontWeight: 'bold', fontSize: '0.95rem', textShadow: '0 0 8px rgba(255,215,0,0.5)' } }}
            secondaryTypographyProps={{ sx: { color: 'rgba(255,215,0,0.6)', fontSize: '0.7rem' } }} 
          />
        </ListItem>
      )}

      {todasFichas.length === 0 ? (
        <Typography sx={{ color: "#94a3b8" }}>Nenhuma ficha criada.</Typography>
      ) : (
        <>
          {termoBusca && (
            <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mb: 1 }}>
              {fichasFiltradas.pj.length + fichasFiltradas.pm.length} resultado(s) para "{termoBusca}"
            </Typography>
          )}
          
          {fichasFiltradas.pj.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ color: '#4caf50', fontWeight: 'bold', borderBottom: '1px solid #4caf50', pb: 0.5, mb: 1 }}>── PERSONAGENS DO JOGADOR ──</Typography>
              <List dense>
                {fichasFiltradas.pj.map(fid => (
                  <FichaItem
                    key={fid}
                    fid={fid}
                    ficha={fichasDataMap[fid]}
                    isPM={false}
                    selectedFichaEmail={selectedFichaEmail}
                    setSelectedFichaEmail={setSelectedFichaEmail}
                    setContaToDelete={setContaToDelete}
                    setDeleteContaDialogOpen={setDeleteContaDialogOpen}
                    setFichaToDelete={setFichaToDelete}
                    setDeleteFichaDialogOpen={setDeleteFichaDialogOpen}
                    setLightboxImage={setLightboxImage}
                    setZoom={setZoom}
                    jogadorAtual={jogadorPorFicha[fid] || ""}
                    jogadores={jogadores}
                    atrelarJogador={atrelarJogador}
                    isSalvando={salvandoJogador[fid] || false}
                    nivelInfo={getNivelInfo(fid)}
                    posicao={getPosicao(fid)}
                    auraCor={getAuraColor(fichasDataMap[fid])}
                  />
                ))}
              </List>
            </Box>
          )}
          
          {fichasFiltradas.pm.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ color: '#ff9800', fontWeight: 'bold', borderBottom: '1px solid #ff9800', pb: 0.5, mb: 1 }}>── PERSONAGENS DO MESTRE ──</Typography>
              <List dense>
                {fichasFiltradas.pm.map(fid => (
                  <FichaItem
                    key={fid}
                    fid={fid}
                    ficha={fichasDataMap[fid]}
                    isPM={true}
                    selectedFichaEmail={selectedFichaEmail}
                    setSelectedFichaEmail={setSelectedFichaEmail}
                    setContaToDelete={setContaToDelete}
                    setDeleteContaDialogOpen={setDeleteContaDialogOpen}
                    setFichaToDelete={setFichaToDelete}
                    setDeleteFichaDialogOpen={setDeleteFichaDialogOpen}
                    setLightboxImage={setLightboxImage}
                    setZoom={setZoom}
                    jogadorAtual={jogadorPorFicha[fid] || ""}
                    jogadores={jogadores}
                    atrelarJogador={atrelarJogador}
                    isSalvando={salvandoJogador[fid] || false}
                    nivelInfo={getNivelInfo(fid)}
                    posicao={getPosicao(fid)}
                    auraCor={getAuraColor(fichasDataMap[fid])}
                  />
                ))}
              </List>
            </Box>
          )}
          
          {termoBusca && fichasFiltradas.pj.length === 0 && fichasFiltradas.pm.length === 0 && (
            <Typography sx={{ color: '#64748b', textAlign: 'center', py: 4 }}>
              Nenhum personagem encontrado para "{termoBusca}"
            </Typography>
          )}
        </>
      )}

      <Divider sx={{ my: 1, bgcolor: "#334155" }} />
      <Typography variant="subtitle2" sx={{ mb: 1, color: "#fff" }}>Criar nova conta + ficha vazia</Typography>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        <TextField label="E-mail do jogador" fullWidth size="small" value={newEmail} onChange={(e) => setNewEmail(e.target.value)}
          sx={{ '& .MuiInputLabel-root': { color: '#94a3b8' }, '& .MuiInputBase-input': { color: '#fff' }, '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: '#334155' }, '&:hover fieldset': { borderColor: '#475569' } } }} />
        <TextField label="Senha" type="password" fullWidth size="small" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
          sx={{ '& .MuiInputLabel-root': { color: '#94a3b8' }, '& .MuiInputBase-input': { color: '#fff' }, '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: '#334155' }, '&:hover fieldset': { borderColor: '#475569' } } }} />
        <Button variant="contained" color="primary" fullWidth disabled={creating} onClick={handleCreateAccountAndFicha}>
          {creating ? "Criando..." : "Criar conta + ficha"}
        </Button>
      </Box>

      <Dialog open={deleteFichaDialogOpen} onClose={() => setDeleteFichaDialogOpen(false)}>
        <DialogTitle sx={{ color: '#fff', bgcolor: '#1a1a2e' }}>🗑️ Confirmar exclusão</DialogTitle>
        <DialogContent sx={{ bgcolor: '#1a1a2e', color: '#fff', pt: 2 }}>
          <Typography>Tem certeza que deseja deletar a ficha de <strong>{fichaToDelete}</strong>?</Typography>
          <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', mt: 1 }}>Isso removerá apenas a ficha do personagem. A conta continuará existindo.</Typography>
        </DialogContent>
        <DialogActions sx={{ bgcolor: '#1a1a2e', borderTop: '1px solid #334155' }}>
          <Button onClick={() => setDeleteFichaDialogOpen(false)} sx={{ color: '#94a3b8' }}>Cancelar</Button>
          <Button onClick={() => handleDeleteFicha(fichaToDelete)} sx={{ color: '#ef4444' }}>Deletar Ficha</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteContaDialogOpen} onClose={() => setDeleteContaDialogOpen(false)}>
        <DialogTitle sx={{ color: '#fff', bgcolor: '#1a1a2e' }}>⚠️ Confirmar exclusão</DialogTitle>
        <DialogContent sx={{ bgcolor: '#1a1a2e', color: '#fff', pt: 2 }}>
          <Typography>Tem certeza que deseja deletar a conta de <strong>{contaToDelete}</strong>?</Typography>
          <Typography variant="caption" sx={{ color: '#ef4444', display: 'block', mt: 1 }}>⚠️ Isso removerá a ficha permanentemente!</Typography>
        </DialogContent>
        <DialogActions sx={{ bgcolor: '#1a1a2e', borderTop: '1px solid #334155' }}>
          <Button onClick={() => setDeleteContaDialogOpen(false)} sx={{ color: '#94a3b8' }}>Cancelar</Button>
          <Button onClick={() => handleDeleteConta(contaToDelete)} sx={{ color: '#dc2626', fontWeight: 'bold' }}>Deletar Conta</Button>
        </DialogActions>
      </Dialog>

      {lightboxImage && (
        <Box onClick={() => setLightboxImage(null)} sx={{ position: "fixed", inset: 0, bgcolor: "rgba(0,0,0,0.92)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999999 }}>
          <LightboxImage src={lightboxImage} zoom={zoom} setZoom={setZoom} />
        </Box>
      )}
    </Paper>
  );
}
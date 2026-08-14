import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  Box, Paper, Typography, IconButton, Button, Grid, Chip,
  Tooltip, LinearProgress, Dialog, DialogTitle, DialogContent, DialogActions
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import LockIcon from "@mui/icons-material/Lock";
import { db } from "../firebaseConfig";
import { doc, onSnapshot, setDoc, getDoc } from "firebase/firestore";

// ==================== DEFINIÇÃO DAS CONQUISTAS ====================
export const CONQUISTAS = [
  // ===== INÍCIO =====
  { id: "primeira_vez", nome: "Primeiros Passos", desc: "Entre no mundo de Réquiem pela primeira vez", icone: "👣", raridade: "comum", categoria: "Início" },
  { id: "criador_personagem", nome: "Nova Identidade", desc: "Crie seu primeiro personagem", icone: "📝", raridade: "comum", categoria: "Início" },
  { id: "primeiro_nivel", nome: "Subindo na Vida", desc: "Alcance o nível 2", icone: "⬆️", raridade: "comum", categoria: "Progressão" },
  { id: "nivel_5", nome: "Aventureiro Experiente", desc: "Alcance o nível 5", icone: "⭐", raridade: "incomum", categoria: "Progressão" },
  { id: "nivel_10", nome: "Lenda Viva", desc: "Alcance o nível 10", icone: "🌟", raridade: "raro", categoria: "Progressão" },
  { id: "nivel_20", nome: "Deus entre Mortais", desc: "Alcance o nível 20", icone: "👑", raridade: "lendario", categoria: "Progressão" },
  
  // ===== COMBATE =====
  { id: "primeira_vitoria", nome: "Sangue no Campo", desc: "Vença seu primeiro combate", icone: "⚔️", raridade: "comum", categoria: "Combate" },
  { id: "cacador_monstros", nome: "Caçador de Monstros", desc: "Derrote 10 inimigos", icone: "🏹", raridade: "incomum", categoria: "Combate" },
  { id: "exterminador", nome: "Exterminador", desc: "Derrote 50 inimigos", icone: "💀", raridade: "raro", categoria: "Combate" },
  { id: "critico_perfeito", nome: "Golpe Perfeito", desc: "Acerta um crítico em combate", icone: "🎯", raridade: "incomum", categoria: "Combate" },
  { id: "sobrevivente", nome: "Sobrevivente", desc: "Sobreviva com 1 PV restante", icone: "🩸", raridade: "raro", categoria: "Combate" },
  { id: "dano_massivo", nome: "Dano Massivo", desc: "Cause mais de 50 de dano em um único golpe", icone: "💥", raridade: "raro", categoria: "Combate" },
  
  // ===== AURA E HABILIDADES =====
  { id: "despertar_aura", nome: "Despertar da Aura", desc: "Desperte sua Aura pela primeira vez", icone: "✨", raridade: "comum", categoria: "Aura" },
  { id: "dominio_aura", nome: "Domínio da Aura", desc: "Alcance nível 5 em Aura", icone: "🔮", raridade: "incomum", categoria: "Aura" },
  { id: "primeira_habilidade", nome: "Poder Manifestado", desc: "Crie sua primeira habilidade", icone: "⚡", raridade: "comum", categoria: "Aura" },
  { id: "mestre_habilidades", nome: "Mestre das Habilidades", desc: "Tenha 5 habilidades", icone: "🌟", raridade: "raro", categoria: "Aura" },
  { id: "habilidade_maxima", nome: "Poder Supremo", desc: "Eleve uma habilidade ao nível 10", icone: "🔥", raridade: "lendario", categoria: "Aura" },
  
  // ===== SOCIAL =====
  { id: "primeiro_amigo", nome: "Laços Formados", desc: "Faça seu primeiro amigo", icone: "🤝", raridade: "comum", categoria: "Social" },
  { id: "popular", nome: "Alma da Festa", desc: "Tenha 5 amigos", icone: "🎉", raridade: "incomum", categoria: "Social" },
  { id: "mensagens", nome: "Comunicador", desc: "Envie 100 mensagens no chat", icone: "💬", raridade: "comum", categoria: "Social" },
  { id: "falador", nome: "Tagarela", desc: "Envie 1000 mensagens no chat", icone: "📢", raridade: "incomum", categoria: "Social" },
  
  // ===== ECONOMIA =====
  { id: "primeiro_dinheiro", nome: "Capitalista Iniciante", desc: "Acumule 1.000 moedas", icone: "💰", raridade: "comum", categoria: "Economia" },
  { id: "rico", nome: "Magnata", desc: "Acumule 100.000 moedas", icone: "🏦", raridade: "raro", categoria: "Economia" },
  { id: "milionario", nome: "Milionário", desc: "Acumule 1.000.000 moedas", icone: "💎", raridade: "lendario", categoria: "Economia" },
  { id: "primeiro_imovel", nome: "Lar Doce Lar", desc: "Compre seu primeiro imóvel", icone: "🏠", raridade: "incomum", categoria: "Economia" },
  { id: "investidor", nome: "Investidor", desc: "Compre sua primeira ação na bolsa", icone: "📈", raridade: "incomum", categoria: "Economia" },
  
  // ===== EXPLORAÇÃO =====
  { id: "viajante", nome: "Viajante", desc: "Visite 3 países diferentes", icone: "🧭", raridade: "incomum", categoria: "Exploração" },
  { id: "explorador", nome: "Explorador do Mundo", desc: "Visite 10 países diferentes", icone: "🗺️", raridade: "raro", categoria: "Exploração" },
  { id: "cartografo", nome: "Cartógrafo", desc: "Visite todos os países", icone: "🌍", raridade: "lendario", categoria: "Exploração" },
  
  // ===== ESPECIAIS =====
  { id: "hacker", nome: "Invasor", desc: "Complete uma invasão de hackeamento", icone: "💻", raridade: "raro", categoria: "Especial" },
  { id: "sorte_grande", nome: "Sorte Grande", desc: "Ganhe no cassino", icone: "🎰", raridade: "incomum", categoria: "Especial" },
  { id: "sobrevivente_morte", nome: "Escapou da Morte", desc: "Sobreviva a um dado de morte", icone: "💚", raridade: "raro", categoria: "Especial" },
  { id: "renascido", nome: "Renascido", desc: "Morra e volte à vida", icone: "🔄", raridade: "lendario", categoria: "Especial" },
  { id: "colecionador", nome: "Colecionador", desc: "Desbloqueie 20 conquistas", icone: "🏆", raridade: "raro", categoria: "Especial" },
  { id: "completista", nome: "Completista", desc: "Desbloqueie todas as conquistas", icone: "👑", raridade: "lendario", categoria: "Especial" },
];

export const RARIDADES = {
  comum: { cor: "#94a3b8", label: "Comum" },
  incomum: { cor: "#4caf50", label: "Incomum" },
  raro: { cor: "#3b82f6", label: "Raro" },
  lendario: { cor: "#ffd700", label: "Lendário" },
};

// ==================== COMPONENTE PRINCIPAL ====================
function Conquistas({ userEmail, userNick, isMaster, onClose }) {
  const [posicao, setPosicao] = useState({ x: 200, y: 80 });
  const [tamanho, setTamanho] = useState({ width: 650, height: 550 });
  const [minimizado, setMinimizado] = useState(false);
  const [arrastando, setArrastando] = useState(false);
  const [redimensionando, setRedimensionando] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const resizeStartRef = useRef({ x: 0, y: 0, width: 0, height: 0 });
  const [conquistasDesbloqueadas, setConquistasDesbloqueadas] = useState({});
  const [filtroCategoria, setFiltroCategoria] = useState("todas");
  const [notificacoes, setNotificacoes] = useState([]);
  const [fichaData, setFichaData] = useState(null);
  const [xpMap, setXpMap] = useState({});

  // 🟢 CARREGAR CONQUISTAS DO JOGADOR
  useEffect(() => {
    if (!userEmail) return;
    const ref = doc(db, "conquistas", userEmail);
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        setConquistasDesbloqueadas(snap.data().desbloqueadas || {});
      } else {
        setConquistasDesbloqueadas({});
        setDoc(ref, { desbloqueadas: {} });
      }
    });
    return () => unsub();
  }, [userEmail]);

  // 🟢 CARREGAR FICHA DO JOGADOR
  useEffect(() => {
    if (!userEmail) return;
    const ref = doc(db, "fichas", userEmail);
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        setFichaData(snap.data());
      }
    });
    return () => unsub();
  }, [userEmail]);

  // 🟢 CARREGAR XP MAP
  useEffect(() => {
    const ref = doc(db, "game", "hud");
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        setXpMap(snap.data().xpMap || {});
      }
    });
    return () => unsub();
  }, []);

  // 🟢 VERIFICAR E DESBLOQUEAR CONQUISTAS
  useEffect(() => {
    if (!userEmail || !fichaData) return;
    
    const verificar = async () => {
      const novas = { ...conquistasDesbloqueadas };
      let mudou = false;
      
      // Nível
      const nivel = xpMap[userEmail]?.level || 1;
      if (nivel >= 2 && !novas["primeiro_nivel"]) { novas["primeiro_nivel"] = { data: Date.now() }; mudou = true; }
      if (nivel >= 5 && !novas["nivel_5"]) { novas["nivel_5"] = { data: Date.now() }; mudou = true; }
      if (nivel >= 10 && !novas["nivel_10"]) { novas["nivel_10"] = { data: Date.now() }; mudou = true; }
      if (nivel >= 20 && !novas["nivel_20"]) { novas["nivel_20"] = { data: Date.now() }; mudou = true; }
      
      // Personagem criado
      if (fichaData.nome && fichaData.nome.trim() !== "" && !novas["criador_personagem"]) { novas["criador_personagem"] = { data: Date.now() }; mudou = true; }
      
      // Aura
      if (fichaData.tipoAura && !novas["despertar_aura"]) { novas["despertar_aura"] = { data: Date.now() }; mudou = true; }
      if (fichaData.pericias?.aura >= 5 && !novas["dominio_aura"]) { novas["dominio_aura"] = { data: Date.now() }; mudou = true; }
      
      // Habilidades
      if (fichaData.habilidades && fichaData.habilidades.length >= 1 && !novas["primeira_habilidade"]) { novas["primeira_habilidade"] = { data: Date.now() }; mudou = true; }
      if (fichaData.habilidades && fichaData.habilidades.length >= 5 && !novas["mestre_habilidades"]) { novas["mestre_habilidades"] = { data: Date.now() }; mudou = true; }
      if (fichaData.habilidades?.some(h => h.dado >= 10) && !novas["habilidade_maxima"]) { novas["habilidade_maxima"] = { data: Date.now() }; mudou = true; }
      
      // Dinheiro
      const totalDinheiro = (fichaData.carteiras || []).reduce((s, c) => s + (c.valor || 0), 0);
      if (totalDinheiro >= 1000 && !novas["primeiro_dinheiro"]) { novas["primeiro_dinheiro"] = { data: Date.now() }; mudou = true; }
      if (totalDinheiro >= 100000 && !novas["rico"]) { novas["rico"] = { data: Date.now() }; mudou = true; }
      if (totalDinheiro >= 1000000 && !novas["milionario"]) { novas["milionario"] = { data: Date.now() }; mudou = true; }
      
      // Imóveis
      if (fichaData.imoveis && fichaData.imoveis.length > 0 && !novas["primeiro_imovel"]) { novas["primeiro_imovel"] = { data: Date.now() }; mudou = true; }
      
      // Ações
      if (fichaData.acoes && Object.keys(fichaData.acoes).length > 0 && !novas["investidor"]) { novas["investidor"] = { data: Date.now() }; mudou = true; }
      
      // Conquista de colecionador
      const totalDesbloqueadas = Object.keys(novas).length;
      if (totalDesbloqueadas >= 20 && !novas["colecionador"]) { novas["colecionador"] = { data: Date.now() }; mudou = true; }
      if (totalDesbloqueadas >= CONQUISTAS.length && !novas["completista"]) { novas["completista"] = { data: Date.now() }; mudou = true; }
      
      if (mudou) {
        setConquistasDesbloqueadas(novas);
        await setDoc(doc(db, "conquistas", userEmail), { desbloqueadas: novas }, { merge: true });
        
        // 🟢 NOTIFICAR NOVAS CONQUISTAS
        for (const id in novas) {
          if (!conquistasDesbloqueadas[id]) {
            const conquista = CONQUISTAS.find(c => c.id === id);
            if (conquista) {
              mostrarNotificacao(conquista);
            }
          }
        }
      }
    };
    
    verificar();
  }, [fichaData, xpMap, userEmail]);

  // 🟢 MOSTRAR NOTIFICAÇÃO ESTILO STEAM
  const mostrarNotificacao = (conquista) => {
    const id = Date.now();
    setNotificacoes(prev => [...prev, { id, ...conquista }]);
    
    // Tocar som
    try {
      const audio = new Audio("data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdV1rYFJTXFxTWFNWVVVUU1JRUVBPUU9OTk1MS0pJSkhHR0ZFRURDQkJBQD8+Pj08PDs7Ojo5OTg4Nzc2NjU1NDQzMzIyMTAwLy8uLi0tLCwrKikoKCcmJiUkJCMiISAgHx8eHR0cGxsaGRgYFxYWFRQUExIREA8PDg0NDAsKCQgHBgUEAwIBAA==");
      audio.volume = 0.5;
      audio.play().catch(() => {});
    } catch {}
    
    // Remover após 5 segundos
    setTimeout(() => {
      setNotificacoes(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  // 🟢 OUVIR EVENTOS EXTERNOS DE CONQUISTA
  useEffect(() => {
    const handleConquista = (e) => {
      const { conquistaId } = e.detail;
      const conquista = CONQUISTAS.find(c => c.id === conquistaId);
      if (conquista && !conquistasDesbloqueadas[conquistaId]) {
        const novas = { ...conquistasDesbloqueadas, [conquistaId]: { data: Date.now() } };
        setConquistasDesbloqueadas(novas);
        setDoc(doc(db, "conquistas", userEmail), { desbloqueadas: novas }, { merge: true });
        mostrarNotificacao(conquista);
      }
    };
    window.addEventListener('desbloquearConquista', handleConquista);
    return () => window.removeEventListener('desbloquearConquista', handleConquista);
  }, [conquistasDesbloqueadas, userEmail]);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (arrastando) setPosicao({ x: e.clientX - dragStartRef.current.x, y: e.clientY - dragStartRef.current.y });
      if (redimensionando) setTamanho({ width: Math.max(500, resizeStartRef.current.width + (e.clientX - resizeStartRef.current.x)), height: Math.max(450, resizeStartRef.current.height + (e.clientY - resizeStartRef.current.y)) });
    };
    const handleMouseUp = () => { setArrastando(false); setRedimensionando(false); };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => { window.removeEventListener("mousemove", handleMouseMove); window.removeEventListener("mouseup", handleMouseUp); };
  }, [arrastando, redimensionando]);

  const categorias = ["todas", ...new Set(CONQUISTAS.map(c => c.categoria))];
  const totalDesbloqueadas = Object.keys(conquistasDesbloqueadas).length;
  const percentual = (totalDesbloqueadas / CONQUISTAS.length) * 100;

  const conquistasFiltradas = CONQUISTAS.filter(c => 
    filtroCategoria === "todas" || c.categoria === filtroCategoria
  );

  return createPortal(
    <>
      {/* NOTIFICAÇÕES ESTILO STEAM */}
      {notificacoes.map((n, index) => {
        const raridade = RARIDADES[n.raridade];
        return (
          <Paper
            key={n.id}
            elevation={10}
            sx={{
              position: "fixed",
              bottom: 20 + (index * 90),
              right: 20,
              zIndex: 999999,
              bgcolor: "#1a1a2e",
              border: `2px solid ${raridade.cor}`,
              borderRadius: 2,
              p: 1.5,
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              minWidth: 300,
              maxWidth: 400,
              animation: "slideInRight 0.5s ease-out",
              boxShadow: `0 8px 32px rgba(0,0,0,0.8), 0 0 20px ${raridade.cor}44`,
              "@keyframes slideInRight": {
                "0%": { transform: "translateX(400px)", opacity: 0 },
                "100%": { transform: "translateX(0)", opacity: 1 },
              },
            }}
          >
            <Box sx={{ fontSize: "2.5rem", minWidth: 50, textAlign: 'center' }}>{n.icone}</Box>
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ color: raridade.cor, fontWeight: 'bold', fontSize: '0.85rem' }}>
                🏆 Conquista Desbloqueada!
              </Typography>
              <Typography sx={{ color: '#fff', fontWeight: 'bold', fontSize: '0.9rem' }}>
                {n.nome}
              </Typography>
              <Typography sx={{ color: '#94a3b8', fontSize: '0.7rem' }}>
                {n.desc}
              </Typography>
            </Box>
            <IconButton size="small" onClick={() => setNotificacoes(prev => prev.filter(x => x.id !== n.id))} sx={{ color: '#94a3b8' }}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Paper>
        );
      })}

      {/* JANELA PRINCIPAL */}
      <Paper elevation={10} sx={{ position: "fixed", left: posicao.x, top: posicao.y, width: minimizado ? 300 : tamanho.width, height: minimizado ? 48 : tamanho.height, bgcolor: "#0f172a", color: "#fff", borderRadius: 2, border: "2px solid #ffd700", zIndex: 9998, display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 0 30px rgba(255,215,0,0.2), 0 8px 32px rgba(0,0,0,0.8)" }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", p: 1, bgcolor: "#2a1a00", cursor: "move", minHeight: 40, borderBottom: "1px solid #ffd70044" }}
          onMouseDown={(e) => { if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT') return; e.preventDefault(); setArrastando(true); dragStartRef.current = { x: e.clientX - posicao.x, y: e.clientY - posicao.y }; }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <EmojiEventsIcon sx={{ color: "#ffd700" }} />
            <Typography variant="subtitle2" sx={{ color: "#ffd700", fontWeight: "bold" }}>
              {minimizado ? "🏆 Conquistas" : "🏆 Conquistas de Réquiem"}
            </Typography>
            <Chip label={`${totalDesbloqueadas}/${CONQUISTAS.length}`} size="small" sx={{ bgcolor: "#3a2a00", color: "#ffd700", fontWeight: 'bold', height: 20 }} />
          </Box>
          <Box sx={{ display: "flex", gap: 0.5 }}>
            <IconButton size="small" onClick={() => setMinimizado(!minimizado)} sx={{ color: "#ffd700", p: 0.5 }}>{minimizado ? "□" : "−"}</IconButton>
            <IconButton size="small" onClick={onClose} sx={{ color: "#ffd700", p: 0.5 }}><CloseIcon fontSize="small" /></IconButton>
          </Box>
        </Box>
        {!minimizado && (
          <Box sx={{ flex: 1, display: "flex", flexDirection: "column", p: 1.5, gap: 1, overflowY: "auto", "&::-webkit-scrollbar": { width: "3px" }, "&::-webkit-scrollbar-thumb": { background: "#ffd70044", borderRadius: "10px" } }}>
            
            {/* BARRA DE PROGRESSO */}
            <Box>
              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                <Typography variant="caption" sx={{ color: "#94a3b8" }}>Progresso Total</Typography>
                <Typography variant="caption" sx={{ color: "#ffd700", fontWeight: 'bold' }}>{Math.round(percentual)}%</Typography>
              </Box>
              <LinearProgress variant="determinate" value={percentual} sx={{ height: 10, borderRadius: 5, bgcolor: '#1a1a2e', '& .MuiLinearProgress-bar': { bgcolor: '#ffd700' } }} />
            </Box>

            {/* FILTROS */}
            <Box sx={{ display: "flex", gap: 0.5, flexWrap: 'wrap' }}>
              {categorias.map(cat => (
                <Chip key={cat} label={cat === "todas" ? "Todas" : cat} onClick={() => setFiltroCategoria(cat)} size="small"
                  sx={{ bgcolor: filtroCategoria === cat ? '#ffd700' : '#1a1a2e', color: filtroCategoria === cat ? '#000' : '#94a3b8', fontWeight: 'bold', cursor: 'pointer' }} />
              ))}
            </Box>

            {/* GRID DE CONQUISTAS */}
            <Grid container spacing={1}>
              {conquistasFiltradas.map(conquista => {
                const desbloqueada = !!conquistasDesbloqueadas[conquista.id];
                const raridade = RARIDADES[conquista.raridade];
                return (
                  <Grid item xs={12} sm={6} key={conquista.id}>
                    <Paper sx={{ p: 1.5, bgcolor: desbloqueada ? '#1a1a2e' : '#0a0a0a', border: `1px solid ${desbloqueada ? raridade.cor : '#333'}`, borderRadius: 2, display: 'flex', alignItems: 'center', gap: 1.5, opacity: desbloqueada ? 1 : 0.6, transition: 'all 0.3s' }}>
                      <Box sx={{ fontSize: "2rem", minWidth: 40, textAlign: 'center', filter: desbloqueada ? 'none' : 'grayscale(100%)' }}>
                        {desbloqueada ? conquista.icone : <LockIcon sx={{ color: '#64748b', fontSize: 28 }} />}
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <Typography sx={{ color: desbloqueada ? '#fff' : '#64748b', fontWeight: 'bold', fontSize: '0.8rem' }}>
                          {conquista.nome}
                        </Typography>
                        <Typography sx={{ color: desbloqueada ? '#94a3b8' : '#555', fontSize: '0.65rem' }}>
                          {conquista.desc}
                        </Typography>
                        <Chip label={raridade.label} size="small" sx={{ bgcolor: `${raridade.cor}22`, color: raridade.cor, fontSize: '0.5rem', height: 16, mt: 0.5 }} />
                      </Box>
                      {desbloqueada && conquistasDesbloqueadas[conquista.id]?.data && (
                        <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.55rem' }}>
                          {new Date(conquistasDesbloqueadas[conquista.id].data).toLocaleDateString('pt-BR')}
                        </Typography>
                      )}
                    </Paper>
                  </Grid>
                );
              })}
            </Grid>
          </Box>
        )}
        {!minimizado && <Box sx={{ position: "absolute", bottom: 0, right: 0, width: 16, height: 16, cursor: "nwse-resize", zIndex: 10 }}
          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setRedimensionando(true); resizeStartRef.current = { x: e.clientX, y: e.clientY, width: tamanho.width, height: tamanho.height }; }} />}
      </Paper>
    </>,
    document.body
  );
}

export default React.memo(Conquistas);
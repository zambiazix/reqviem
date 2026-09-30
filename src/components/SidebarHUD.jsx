// src/components/SidebarHUD.jsx
import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Box, Paper, Tooltip, Badge } from "@mui/material";
import GroupsIcon from "@mui/icons-material/Groups";
import StorefrontIcon from "@mui/icons-material/Storefront";
import NoteAltIcon from "@mui/icons-material/NoteAlt";
import CasinoIcon from "@mui/icons-material/Casino";
import StarsIcon from "@mui/icons-material/Stars";
import AssessmentIcon from "@mui/icons-material/Assessment";
import LanguageIcon from "@mui/icons-material/Language";
import PublicIcon from "@mui/icons-material/Public";
import VideogameAssetIcon from "@mui/icons-material/VideogameAsset";
import WhatsAppChat from "./WhatsAppChat";
import { db } from "../firebaseConfig";
import { doc, onSnapshot } from "firebase/firestore";

// ==================== COMPONENTES IMPORTADOS ====================
import AnotacoesFlutuante from "./AnotacoesFlutuante";
import EventosAleatorios from "./EventosAleatorios";
import RoletaSincronizada from "./RoletaSincronizada";
import OctogonoMestre from "./OctogonoMestre";
import RedeCyberpunk from "./RedeCyberpunk";
import CassinoJogos from "./CassinoJogos";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import Chaveamento from "./Chaveamento";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import GridOnIcon from "@mui/icons-material/GridOn";
import IAChat from "./IAChat";
import SimuladorMundo from "./SimuladorMundo";

const ICONES_PADRAO = [
  { id: "whatsapp", icon: <GroupsIcon />, label: "Chat de Personagens", cor: "#00e0ff" },
  { id: "comercio", icon: <StorefrontIcon />, label: "Comércio", cor: "#f59e0b" },
  { id: "perfil", icon: <PublicIcon />, label: "Perfís Reqviem", cor: "#8b5cf6" },
  { id: "anotacoes", icon: <NoteAltIcon />, label: "Anotações", cor: "#fbbf24" },
  { id: "eventos", icon: <StarsIcon />, label: "Eventos Aleatórios", cor: "#ec4899" },
  { id: "roleta", icon: <CasinoIcon />, label: "Roleta da Sorte", cor: "#f44336" },
  { id: "octogono", icon: <AssessmentIcon />, label: "Avaliar Mestre", cor: "#a855f7" },
  { id: "rede", icon: <LanguageIcon />, label: "Rede", cor: "#10b981" },
  { id: "cassino", icon: <VideogameAssetIcon />, label: "Cassino", cor: "#eab308" },
    { id: "chaveamento", icon: <EmojiEventsIcon />, label: "Chaveamento", cor: "#a855f7" },
    { id: "ia", icon: <SmartToyIcon />, label: "IA Réquiem", cor: "#a855f7" },
        { id: "battlemap", icon: <GridOnIcon />, label: "Grid de Batalha", cor: "#00e0ff" },
    { id: "mundo", icon: <PublicIcon />, label: "Simulador do Mundo", cor: "#c9a961" },
];

function SidebarHUD({ userEmail = null, userNick = "", isMaster = false, fichasMap = {}, whatsappNotificacoes = {}, setWhatsappNotificacoes = () => {} }) {
  const [expandido, setExpandido] = useState(false);
  const timeoutRef = useRef(null);
  const [moduloAtivo, setModuloAtivo] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [travas, setTravas] = useState({
    chat: false, grid: false, cassino: false, rede: false,
    roleta: false, eventos: false, comercio: false,
  });
  const totalNotificacoesWhats = Object.values(whatsappNotificacoes).filter(v => v).length;

  useEffect(() => {
    const ref = doc(db, "game", "travaSessao");
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        const d = snap.data() || {};
        setTravas({
          chat: false, grid: false, cassino: false, rede: false,
          roleta: false, eventos: false, comercio: false,
          ...(d.travados || {}),
        });
      }
    });
    return () => unsub();
  }, []);

  const mapaTravas = {
    comercio: "comercio",
    eventos: "eventos",
    roleta: "roleta",
    rede: "rede",
    cassino: "cassino",
    battlemap: "grid",
  };

  const estaTravado = (id) => {
    const chave = mapaTravas[id];
    return !!chave && !!travas[chave];
  };

  useEffect(() => {
    if (moduloAtivo && mapaTravas[moduloAtivo] && travas[mapaTravas[moduloAtivo]]) {
      setModuloAtivo(null);
    }
  }, [travas, moduloAtivo]);

  // 🟢 DETECTAR DISPOSITIVO MÓVEL
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || 'ontouchstart' in window);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleMouseEnter = () => { 
    if (isMobile) return; // Não expande automaticamente no mobile
    clearTimeout(timeoutRef.current); 
    setExpandido(true); 
  };
  
  const handleMouseLeave = () => { 
    if (isMobile) return; // Não recolhe automaticamente no mobile
    timeoutRef.current = setTimeout(() => setExpandido(false), 400); 
  };

  // 🟢 TOGGLE PARA MOBILE (toque)
  const handleToggleMobile = () => {
    setExpandido(prev => !prev);
  };

const toggleModulo = (id) => {
  if (estaTravado(id)) return;
  if (id === "perfil") {
    window.dispatchEvent(new CustomEvent('togglePerfilDetalhado'));
    return;
  }
  if (id === "comercio") {
    window.dispatchEvent(new CustomEvent('toggleCommerceHUD'));
    return;
  }
  if (id === "battlemap") {
    if (typeof window.__toggleBattleMap === "function") window.__toggleBattleMap();
    return;
  }
  setModuloAtivo(prev => prev === id ? null : id);
};

  return createPortal(
    <>
      <Box 
        onMouseEnter={handleMouseEnter} 
        onMouseLeave={handleMouseLeave}
        onClick={isMobile ? handleToggleMobile : undefined}
        sx={{ 
          position: "fixed", 
          left: 0, 
          top: "50%", 
          transform: "translateY(-50%)", 
          zIndex: 9999, 
          display: "flex", 
          alignItems: "center",
          touchAction: 'manipulation',
        }}>
        <Paper elevation={8}
          sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0.5, py: 1.5, px: 1,
            bgcolor: "rgba(15, 23, 42, 0.95)", backdropFilter: "blur(10px)", border: "1px solid rgba(0, 224, 255, 0.2)", borderLeft: "none",
            borderRadius: "0 14px 14px 0", 
            transform: isMobile 
              ? (expandido ? "translateX(0)" : "translateX(-44px)")
              : (expandido ? "translateX(0)" : "translateX(-52px)"),
            transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)", 
            boxShadow: expandido ? "4px 0 25px rgba(0, 224, 255, 0.2)" : "2px 0 8px rgba(0, 0, 0, 0.4)",
            minWidth: isMobile ? 48 : 56, 
            maxHeight: "80vh", 
            overflowY: "auto",
            "&::-webkit-scrollbar": { width: "3px" }, "&::-webkit-scrollbar-thumb": { background: "rgba(0,224,255,0.3)", borderRadius: "10px" } }}>
          <Box sx={{ width: 4, height: 20, bgcolor: "rgba(0, 224, 255, 0.5)", borderRadius: 2, mb: 0.3 }} />
          {ICONES_PADRAO.map((item) => (
            <Tooltip
              key={item.id}
              title={estaTravado(item.id) ? `🔒 ${item.label} (travado pelo Mestre)` : item.label}
              placement={isMobile ? "left" : "right"}
              arrow
              disableHoverListener={isMobile}
              disableTouchListener={isMobile}
            >
              <Box 
                onClick={(e) => {
                  e.stopPropagation();
                  toggleModulo(item.id);
                }}
                sx={{
                  display: "flex", alignItems: "center", justifyContent: "center", 
                  width: isMobile ? 36 : 40, 
                  height: isMobile ? 36 : 40, 
                  borderRadius: 1.5,
                  touchAction: 'manipulation',
                  cursor: estaTravado(item.id) ? "not-allowed" : "pointer",
                  opacity: estaTravado(item.id) ? 0.35 : 1,
                  filter: estaTravado(item.id) ? "grayscale(100%)" : "none",
                  bgcolor: estaTravado(item.id)
                    ? "rgba(120,120,120,0.18)"
                    : (moduloAtivo === item.id ? `${item.cor}44` : `${item.cor}18`),
                  border: `1px solid ${estaTravado(item.id) ? "rgba(120,120,120,0.35)" : (moduloAtivo === item.id ? item.cor : item.cor + "33")}`,
                  transition: "all 0.2s ease",
                  "&:hover": estaTravado(item.id)
                    ? {}
                    : { bgcolor: `${item.cor}33`, border: `1px solid ${item.cor}66`, boxShadow: `0 0 12px ${item.cor}44`, transform: "scale(1.08)" },
                }}
              >
                {item.id === "whatsapp" && totalNotificacoesWhats > 0 ? (
                  <Badge badgeContent={totalNotificacoesWhats} color="error">
                    {React.cloneElement(item.icon, { sx: { color: item.cor, fontSize: 22, filter: `drop-shadow(0 0 4px ${item.cor}66)` } })}
                  </Badge>
                ) : (
                  React.cloneElement(item.icon, { sx: { color: item.cor, fontSize: 22, filter: `drop-shadow(0 0 4px ${item.cor}66)` } })
                )}
              </Box>
            </Tooltip>
          ))}
          <Box sx={{ width: 4, height: 20, bgcolor: "rgba(0, 224, 255, 0.5)", borderRadius: 2, mt: 0.3 }} />
        </Paper>
      </Box>
      {moduloAtivo === "whatsapp" && <WhatsAppChat userEmail={userEmail} userNick={userNick} fichasMap={fichasMap} onClose={() => setModuloAtivo(null)} notificacoesSidebar={whatsappNotificacoes} setNotificacoesSidebar={setWhatsappNotificacoes} />}
      {moduloAtivo === "anotacoes" && <AnotacoesFlutuante userEmail={userEmail} userNick={userNick} onClose={() => setModuloAtivo(null)} />}
      {moduloAtivo === "eventos" && <EventosAleatorios isMaster={isMaster} userNick={userNick} fichasMap={fichasMap} onClose={() => setModuloAtivo(null)} />}
      {moduloAtivo === "roleta" && <RoletaSincronizada isMaster={isMaster} onClose={() => setModuloAtivo(null)} />}
      {moduloAtivo === "octogono" && <OctogonoMestre isMaster={isMaster} userEmail={userEmail} userNick={userNick} onClose={() => setModuloAtivo(null)} />}
      {moduloAtivo === "rede" && <RedeCyberpunk 
  isMaster={isMaster} 
  onClose={() => setModuloAtivo(null)} 
  userEmail={userEmail}
  fichasMap={fichasMap}
/>}
      {moduloAtivo === "cassino" && <CassinoJogos userEmail={userEmail} userNick={userNick} isMaster={isMaster} onClose={() => setModuloAtivo(null)} />}
              {moduloAtivo === "chaveamento" && <Chaveamento isMaster={isMaster} fichasMap={fichasMap} onClose={() => setModuloAtivo(null)} />}
                {moduloAtivo === "ia" && <IAChat onClose={() => setModuloAtivo(null)} userNick={userNick} />}
                {moduloAtivo === "mundo" && (
                  <SimuladorMundo
                    userEmail={userEmail}
                    isMaster={isMaster}
                    fichasMap={fichasMap}
                    onClose={() => setModuloAtivo(null)}
                  />
                )}
    </>, document.body
  );
}

export default React.memo(SidebarHUD);
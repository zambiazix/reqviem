// src/components/SidebarHUD.jsx
import React, { useState, useRef } from "react";
import { createPortal } from "react-dom";
import { Box, Paper, Tooltip, Badge } from "@mui/material";
import GroupsIcon from "@mui/icons-material/Groups";
import StorefrontIcon from "@mui/icons-material/Storefront";
import NoteAltIcon from "@mui/icons-material/NoteAlt";
import CasinoIcon from "@mui/icons-material/Casino";
import StarsIcon from "@mui/icons-material/Stars";
import AssessmentIcon from "@mui/icons-material/Assessment";
import LanguageIcon from "@mui/icons-material/Language";
import VideogameAssetIcon from "@mui/icons-material/VideogameAsset";
import WhatsAppChat from "./WhatsAppChat";

// ==================== COMPONENTES IMPORTADOS ====================
import AnotacoesFlutuante from "./AnotacoesFlutuante";
import EventosAleatorios from "./EventosAleatorios";
import RoletaSincronizada from "./RoletaSincronizada";
import OctogonoMestre from "./OctogonoMestre";
import RedeCyberpunk from "./RedeCyberpunk";
import CassinoJogos from "./CassinoJogos";

const ICONES_PADRAO = [
    { id: "whatsapp", icon: <GroupsIcon />, label: "Chat de Personagens", cor: "#00e0ff" },
  { id: "anotacoes", icon: <NoteAltIcon />, label: "Anotações", cor: "#fbbf24" },
  { id: "eventos", icon: <StarsIcon />, label: "Eventos Aleatórios", cor: "#ec4899" },
  { id: "roleta", icon: <CasinoIcon />, label: "Roleta da Sorte", cor: "#f44336" },
  { id: "octogono", icon: <AssessmentIcon />, label: "Avaliar Mestre", cor: "#a855f7" },
  { id: "rede", icon: <LanguageIcon />, label: "Rede", cor: "#10b981" },
  { id: "cassino", icon: <VideogameAssetIcon />, label: "Cassino", cor: "#eab308" },
];

function SidebarHUD({ userEmail = null, userNick = "", isMaster = false, fichasMap = {}, whatsappNotificacoes = {}, setWhatsappNotificacoes = () => {} }) {
  const [expandido, setExpandido] = useState(false);
  const timeoutRef = useRef(null);
  const [moduloAtivo, setModuloAtivo] = useState(null);
    const totalNotificacoesWhats = Object.values(whatsappNotificacoes).filter(v => v).length;

  const handleMouseEnter = () => { clearTimeout(timeoutRef.current); setExpandido(true); };
  const handleMouseLeave = () => { timeoutRef.current = setTimeout(() => setExpandido(false), 400); };

const toggleModulo = (id) => {
  if (id === "perfil") {
    // 🟢 DISPARA O MESMO EVENTO QUE O FloatingHUD USA PARA ABRIR PERFIS
    window.dispatchEvent(new CustomEvent('togglePerfilDetalhado'));
    return;
  }
  if (id === "comercio") {
    // 🟢 DISPARA O MESMO EVENTO QUE O FloatingHUD USA PARA ABRIR COMÉRCIO
    window.dispatchEvent(new CustomEvent('toggleCommerceHUD'));
    return;
  }
  setModuloAtivo(prev => prev === id ? null : id);
};

  return createPortal(
    <>
      <Box onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}
        sx={{ position: "fixed", left: 0, top: "50%", transform: "translateY(-50%)", zIndex: 9999, display: "flex", alignItems: "center" }}>
        <Paper elevation={8}
          sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0.5, py: 1.5, px: 1,
            bgcolor: "rgba(15, 23, 42, 0.95)", backdropFilter: "blur(10px)", border: "1px solid rgba(0, 224, 255, 0.2)", borderLeft: "none",
            borderRadius: "0 14px 14px 0", transform: expandido ? "translateX(0)" : "translateX(-52px)",
            transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)", boxShadow: expandido ? "4px 0 25px rgba(0, 224, 255, 0.2)" : "2px 0 8px rgba(0, 0, 0, 0.4)",
            minWidth: 56, maxHeight: "80vh", overflowY: "auto",
            "&::-webkit-scrollbar": { width: "3px" }, "&::-webkit-scrollbar-thumb": { background: "rgba(0,224,255,0.3)", borderRadius: "10px" } }}>
          <Box sx={{ width: 4, height: 20, bgcolor: "rgba(0, 224, 255, 0.5)", borderRadius: 2, mb: 0.3 }} />
          {ICONES_PADRAO.map((item) => (
            <Tooltip key={item.id} title={item.label} placement="right" arrow>
              <Box onClick={() => toggleModulo(item.id)}
                sx={{ display: "flex", alignItems: "center", justifyContent: "center", width: 40, height: 40, borderRadius: 1.5, cursor: "pointer",
                  bgcolor: moduloAtivo === item.id ? `${item.cor}44` : `${item.cor}18`, border: `1px solid ${moduloAtivo === item.id ? item.cor : item.cor}33`,
                  transition: "all 0.2s ease", "&:hover": { bgcolor: `${item.cor}33`, border: `1px solid ${item.cor}66`, boxShadow: `0 0 12px ${item.cor}44`, transform: "scale(1.08)" } }}>
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
    </>, document.body
  );
}

export default React.memo(SidebarHUD);
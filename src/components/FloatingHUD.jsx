import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
  Box,
  Typography,
  LinearProgress,
  IconButton,
  Button,
  MenuItem,
  TextField,
  Divider,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  Slider,
  Tooltip,
  Chip,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";  // 🟢 ADICIONE ESTA LINHA
import { Popover } from "@mui/material";
import { Portal } from "@mui/material";
import { useGame } from "../context/GameProvider";
import { useAudio } from "../context/AudioProvider";
import ListIcon from "@mui/icons-material/List";
import PauseIcon from "@mui/icons-material/Pause";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import { collection, onSnapshot, getDocs, addDoc, deleteDoc, doc, setDoc } from "firebase/firestore";
import { updateDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";
import TurnModal from "./TurnModal";
import "./FloatingHUDBackgrounds.css";
import { createPortal } from "react-dom";
import CommerceHUD from "./CommerceHUD";
import PerfilDetalhado from "./PerfilDetalhado";

function playSFX(path) {
  try {
    const audio = new Audio(path);
    audio.volume = 1;
    audio.play().catch(() => {});
  } catch {}
}

const PHASES = ["manhã", "tarde", "noite", "madrugada"];
const SEASONS = ["Primavera", "Verão", "Outono", "Inverno"];

const TALENTOS_ICONS = {
    "Regeneração": { icon: "💚", color: "#4caf50", desc: "Regenera 5 PV por ação." },
    "Sobrecarga": { icon: "⚡", color: "#facc15", desc: "Regenera 2 PE por ação." },
    "Pós-Choque": { icon: "💥", color: "#ff9800", desc: "Rola dados novamente em caso de crítico." },
    "Demolidor": { icon: "💪", color: "#ef4444", desc: "Ignora 50% da armadura em ataques desarmados." },
    "The Flash": { icon: "🏃‍♂️", color: "#3b82f6", desc: "Movimentação dobrada." },
    "Pé Direito": { icon: "🦶", color: "#22c55e", desc: "Primeira esquiva é perfeita." },
    "Craft de Cibernética": { icon: "⚙️", color: "#ef4444", desc: "Cria tecnologias." },
    "Craft de Equipamentos de Combate": { icon: "🗡️", color: "#22c55e", desc: "Cria armas e explosivos." },
    "Craft das Gambiarras": { icon: "🔧", color: "#3b82f6", desc: "Cria itens diversos." },
    "Craft de Vestes e Armaduras": { icon: "🛡️", color: "#f97316", desc: "Cria vestes e armaduras." },
    "Craft de Medicamentos": { icon: "🧪", color: "#e5e5e5", desc: "Cria remédios." },
    "Mendigo": { icon: "🪙", color: "#facc15", desc: "50% de desconto em lojas." },
    "Mentalista": { icon: "🧠", color: "#a855f7", desc: "Vê detalhes ocultos." },
    "Craft de Alimentos Consumíveis": { icon: "🍲", color: "#facc15", desc: "Cria comidas e bebidas." }
};

const TRACOS_PERICIA = {
    "Atleta": "Atletismo", "Lutador": "Luta", "Espadachim": "Arma Branca", "Esgrimista": "Arma Branca", "Atirador": "Arma à Distância",
    "Sombra": "Furtividade", "Sobrevivente": "Sobrevivência", "Erudito": "Conhecimento", "Médico": "Medicina",
    "Naturalista": "Natureza", "Observador": "Percepção", "Detetive": "Investigação", "Persuasivo": "Lábia",
    "Artista": "Performance", "Intimidador": "Intimidação", "Auris": "Aura"
};

const TRACOS_ICONS = {
    "Atleta": { icon: "🏃‍♂️", color: "#22c55e", desc: "Segunda-Chance: Pode rolar novamente a morte." },
    "Lutador": { icon: "🥊", color: "#ef4444", desc: "Brigão: Dois golpes de mãos vazias por turno." },
    "Espadachim": { icon: "⚔️", color: "#c0c0c0", desc: "Espadachim: Dois golpes de lâminas por turno." },
    "Esgrimista": { icon: "⚔️", color: "#c0c0c0", desc: "Espadachim: Dois golpes de lâminas por turno." },
    "Atirador": { icon: "🏹", color: "#22c55e", desc: "Franco-Atirador: Dois golpes à distância por turno." },
    "Sombra": { icon: "🌫️", color: "#3b82f6", desc: "Treva: Não faz som ao se mover." },
    "Sobrevivente": { icon: "🛡️", color: "#7fff00", desc: "Imunidade: Imune a dano Tóxico." },
    "Erudito": { icon: "📚", color: "#e5e5e5", desc: "Sabe-Muito: Capaz de inventar novas tecnologias." },
    "Médico": { icon: "💊", color: "#e5e5e5", desc: "Doutorado: Cirurgias e diagnósticos complexos." },
    "Naturalista": { icon: "🌿", color: "#22c55e", desc: "Heremitra: A natureza está ao seu favor." },
    "Observador": { icon: "👁️", color: "#00e0ff", desc: "Terceiro Olho: Imune a golpes de oportunidade." },
    "Detetive": { icon: "🔍", color: "#e5e5e5", desc: "Detetive: Sempre encontra ao menos uma pista." },
    "Persuasivo": { icon: "🗣️", color: "#e5e5e5", desc: "Larapio: Pessoas sentem necessidade de te agradar." },
    "Artista": { icon: "🎭", color: "#e5e5e5", desc: "Astro: Famoso e reconhecido por seu talento." },
    "Intimidador": { icon: "😠", color: "#facc15", desc: "Presença: Intimida os mais fracos e incomoda os fortes." },
    "Auris": { icon: "✨", color: "#facc15", desc: "Aurano: Soma Aura com outra perícia em uma ação." }
};

export default function FloatingHUD({ userEmail, openCommerce, closeCommerce }) {

  const {
    hud,
    loading,
    isMaster,
    currentUserEmail,
    setTurn,
    addXP,
    setWorldPhase,
    setWorldSeasonDayYear,
    startTimer,
    stopTimer,
    resetTimer,
    setFloatingPosLocal,
    saveFloatingPosGlobal,
  } = useGame();

  // ----------------------------------------------------------------------------------

  const { playMusic } = useAudio?.() || {};
  const refBox = useRef(null);
  const dragOffset = useRef({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [turnAnchorEl, setTurnAnchorEl] = useState(null);
  const [xpEditValue, setXpEditValue] = useState(10);
  const [selectedPlayerForXP, setSelectedPlayerForXP] = useState("");
  const [openMasterDialogFallback, setOpenMasterDialogFallback] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
    // 🟢 JANELA FLUTUANTE - TAMANHO AJUSTÁVEL
  const [minimizado, setMinimizado] = useState(false);
  // 🟢 TAMANHO INICIAL - PODE SER SOBRESCRITO PELO FIRESTORE
const [tamanho, setTamanho] = useState(() => {
  // 🟢 Mudei para v5 para limpar o cache. Altura 0 força o uso da altura exata dos ícones
  const saved = localStorage.getItem('floatingHUD_tamanho_v5');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {}
  }
  return { width: 540, height: 0 }; // 🟢 Altura 0 é a chave!
});
  // 🟢 POSIÇÃO LOCAL (NÃO RESETA)
const [posicaoLocal, setPosicaoLocal] = useState({ x: 20, y: 20 });
const [posicaoSalva, setPosicaoSalva] = useState(false);
  const [redimensionando, setRedimensionando] = useState(false);
  const resizeStartRef = useRef({ x: 0, y: 0, width: 0, height: 0 });
  const [showTurnMenu, setShowTurnMenu] = useState(false);
  // 🟢 SORTE/AZAR
const [sorteAzarOpen, setSorteAzarOpen] = useState(false);
const [sorteAzarJogadores, setSorteAzarJogadores] = useState({});
const [selectedSorteAzarPlayer, setSelectedSorteAzarPlayer] = useState("");
const [sorteAzarValue, setSorteAzarValue] = useState(5.5);
  const [hudRect, setHudRect] = useState(null);
  const [fichasMap, setFichasMap] = useState({});
  const [loadingFichas, setLoadingFichas] = useState(false);
  // ================= PERFIS =================
const [profilesOpen, setProfilesOpen] = useState(false);
const [comercioOpen, setComercioOpen] = useState(false);
const [perfilVisivel, setPerfilVisivel] = useState(false);
const [perfis, setPerfis] = useState([]);
const [hudBackgrounds, setHudBackgrounds] = useState({ manha: "", tarde: "", noite: "", madrugada: "" });
const [uploadingBg, setUploadingBg] = useState("");
const [bgDialogOpen, setBgDialogOpen] = useState(false);
// 🟢 SISTEMA DE NOTIFICAÇÕES DE FOME/SEDE
const [notificacoesFomeSede, setNotificacoesFomeSede] = useState([]);

// 🟢 CARREGAR POSIÇÃO SALVA DO FIRESTORE
useEffect(() => {
  if (!hud?.floatingPos) return;
  setPosicaoLocal(hud.floatingPos);
  setPosicaoSalva(true);
}, [hud?.floatingPos]);
const [openProfileDialog, setOpenProfileDialog] = useState(false);
const [lightboxOpen, setLightboxOpen] = useState(false);
const [lightboxSrc, setLightboxSrc] = useState(null);
const [zoom, setZoom] = useState(1);



const [novoPerfil, setNovoPerfil] = useState({
  nome: "",
  tipo: "npc",
  foto: "",
  descricao: "",
  resumo: "",
});

  const mergedEmails = useMemo(() => Object.keys(fichasMap || {}), [fichasMap]);
  
  const pjEmails = useMemo(() => 
    mergedEmails.filter(e => (fichasMap[e]?.tipoFicha || "PJ") === "PJ"),
  [mergedEmails, fichasMap]);
  
  const pmEmails = useMemo(() => 
    mergedEmails.filter(e => fichasMap[e]?.tipoFicha === "PM"),
  [mergedEmails, fichasMap]);

  const isEmailOculto = useCallback((email) => {
    if (!email) return true;
    if (email === "mestre@reqviemrpg.com") return true;
    const f = fichasMap[email];
    if (!f) return false;
    return (
      f.tipoConta === "convidado" ||
      f.convidado === true ||
      f.isConvidado === true ||
      f.role === "convidado" ||
      f.tipoUsuario === "convidado"
    );
  }, [fichasMap]);

  const emailsXP = useMemo(
    () => mergedEmails.filter((e) => !isEmailOculto(e)),
    [mergedEmails, isEmailOculto]
  );

  const pjEmailsXP = useMemo(
    () => emailsXP.filter((e) => (fichasMap[e]?.tipoFicha || "PJ") === "PJ"),
    [emailsXP, fichasMap]
  );

  const pmEmailsXP = useMemo(
    () => emailsXP.filter((e) => fichasMap[e]?.tipoFicha === "PM"),
    [emailsXP, fichasMap]
  );
  
  const textShadow = "0px 0px 3px rgba(0,0,0,0.85)";
    const CORES_AURA_HUD = {
    "Titã": "#ff3b3b",
    "Alquimista": "#00e0ff",
    "Artesão": "#ffd700",
    "Fundador": "#00ff88",
    "Déspota": "#a855f7",
    "Ás": "#e5e5e5",
  };
// 🟢 SALVAR TAMANHO NO LOCALSTORAGE
useEffect(() => {
  localStorage.setItem('floatingHUD_tamanho_v5', JSON.stringify(tamanho));
}, [tamanho]);
// 🟢 SALVAR POSIÇÃO NO LOCALSTORAGE
useEffect(() => {
  localStorage.setItem('floatingHUD_posicao', JSON.stringify(posicaoLocal));
}, [posicaoLocal]);
// 🟢 CARREGAR POSIÇÃO DO LOCALSTORAGE (FALLBACK)
useEffect(() => {
  if (!posicaoSalva) {
    const saved = localStorage.getItem('floatingHUD_posicao');
    if (saved) {
      try {
        const pos = JSON.parse(saved);
        setPosicaoLocal(pos);
      } catch {}
    }
  }
}, [posicaoSalva]);
  // 🟢 KEYFRAMES DOS EFEITOS FLUTUANTES
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      @keyframes floatEffect {
        0%, 100% { transform: translateY(0px) rotate(-2deg); }
        50% { transform: translateY(-10px) rotate(2deg); }
      }
      @keyframes effectPulse {
        0%, 100% { box-shadow: 0 0 12px var(--ef-color), inset 0 0 8px var(--ef-color)33; }
        50% { box-shadow: 0 0 24px var(--ef-color), inset 0 0 14px var(--ef-color)66; }
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  // 🟢 CARREGAR SORTE/AZAR
useEffect(() => {
  const unsub = onSnapshot(doc(db, "game", "sorteAzar"), (snap) => {
    if (snap.exists()) {
      setSorteAzarJogadores(snap.data().jogadores || {});
    } else {
      setSorteAzarJogadores({});
    }
  });
  return () => unsub();
}, []);

useEffect(() => {
  const unsub = onSnapshot(doc(db, "hud_backgrounds", "dados"), (snap) => {
    if (snap.exists()) {
      const d = snap.data() || {};
      setHudBackgrounds({
        manha: d.manha || "",
        tarde: d.tarde || "",
        noite: d.noite || "",
        madrugada: d.madrugada || "",
      });
    }
  });
  return () => unsub();
}, []);

const uploadBackground = async (fase, file) => {
  if (!file || !isMaster) return;
  setUploadingBg(fase);
  try {
    const fd = new FormData();
    fd.append("image", file);
    const res = await fetch("https://api.imgbb.com/1/upload?key=73fcf242ce0108665fa0c9e9de33bd50", { method: "POST", body: fd });
    const data = await res.json();
    if (data?.success) {
      const url = data.data.url;
      await setDoc(doc(db, "hud_backgrounds", "dados"), { [fase]: url }, { merge: true });
      setHudBackgrounds((prev) => ({ ...prev, [fase]: url }));
    } else {
      alert("Falha no upload da imagem.");
    }
  } catch (e) {
    alert("Erro ao enviar imagem.");
  } finally {
    setUploadingBg("");
  }
};

const removerBackground = async (fase) => {
  if (!isMaster) return;
  await setDoc(doc(db, "hud_backgrounds", "dados"), { [fase]: "" }, { merge: true });
  setHudBackgrounds((prev) => ({ ...prev, [fase]: "" }));
};

const getBgKeyFase = useCallback((phase) => {
  if (phase === "manhã") return "manha";
  if (phase === "tarde") return "tarde";
  if (phase === "noite") return "noite";
  if (phase === "madrugada") return "madrugada";
  return "manha";
}, []);

  useEffect(() => {
  const col = collection(db, "fichas");

  const unsubscribe = onSnapshot(col, (snap) => {
    const map = {};
    snap.forEach((docSnap) => {
      const data = docSnap.data() || {};
      map[docSnap.id] = {
        ...data,
        __id: docSnap.id,
        nome: data.nome || docSnap.id,
      };
    });

    setFichasMap(map);
  });

  return () => unsubscribe();
}, []);

// ================= PERFIS REALTIME =================
useEffect(() => {
  const col = collection(db, "perfis");

  const unsubscribe = onSnapshot(col, (snap) => {
    const arr = [];
    snap.forEach((docSnap) => {
      arr.push({ id: docSnap.id, ...docSnap.data() });
    });
    const unique = Array.from(
  new Map(arr.map(p => [p.id, p])).values()
);

setPerfis(unique);
  });

  return () => unsubscribe();
}, []);
// 🟢 OUVIR EVENTOS DA SIDEBAR PARA ABRIR PERFIL E COMÉRCIO
useEffect(() => {
  const handleTogglePerfil = () => {
    setPerfilVisivel(prev => !prev);
  };
  
  const handleToggleComercio = () => {
    setComercioOpen(prev => !prev);
  };

  window.addEventListener('togglePerfilDetalhado', handleTogglePerfil);
  window.addEventListener('toggleCommerceHUD', handleToggleComercio);

  return () => {
    window.removeEventListener('togglePerfilDetalhado', handleTogglePerfil);
    window.removeEventListener('toggleCommerceHUD', handleToggleComercio);
  };
}, []);

  useEffect(() => {
    if (refBox.current) {
      try {
        const rect = refBox.current.getBoundingClientRect();
        setHudRect(rect);
      } catch (e) {
        setHudRect(null);
      }
    } else {
      setHudRect(null);
    }
  }, [collapsed, hud]); // depende do hud e collapsed para manter atualizado

  useEffect(() => {
    let rafId = null;
    
    function onMouseMove(e) {
      if (!dragging || !refBox.current) return;
      
      if (rafId) cancelAnimationFrame(rafId);
      
      rafId = requestAnimationFrame(() => {
        const newX = e.clientX - dragOffset.current.x;
        const newY = e.clientY - dragOffset.current.y;
        const boundedX = Math.max(8, Math.min(window.innerWidth - refBox.current.offsetWidth - 8, newX));
        const boundedY = Math.max(8, Math.min(window.innerHeight - refBox.current.offsetHeight - 8, newY));
        refBox.current.style.left = `${boundedX}px`;
        refBox.current.style.top = `${boundedY}px`;
        setPosicaoLocal({ x: boundedX, y: boundedY }); // 🟢 Atualiza o estado em tempo real
      });
    }
function onMouseUp() {
  if (!dragging) return;
  setDragging(false);
  try {
    const rect = refBox.current.getBoundingClientRect();
    const pos = { x: rect.left, y: rect.top };
    // 🟢 ATUALIZA POSIÇÃO LOCAL E SALVA NO FIRESTORE
    setPosicaoLocal(pos);
    setFloatingPosLocal(pos);
    saveFloatingPosGlobal(pos);
  } catch {}
}

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [dragging, setFloatingPosLocal]);

  useEffect(() => {
  if (refBox.current) {
    setHudRect(refBox.current.getBoundingClientRect());
  }
}, [collapsed, hud?.floatingPos]);
  // 🟢 REDIMENSIONAMENTO DA JANELA
  useEffect(() => {
    let rafId = null;
    
    const handleMouseMove = (e) => {
      if (redimensionando) {
        if (rafId) cancelAnimationFrame(rafId);
        
        rafId = requestAnimationFrame(() => {
          const newWidth = Math.max(400, resizeStartRef.current.width + (e.clientX - resizeStartRef.current.x));
          const newHeight = Math.max(400, resizeStartRef.current.height + (e.clientY - resizeStartRef.current.y));
          setTamanho({ width: newWidth, height: newHeight });
        });
      }
    };

const handleMouseUp = () => {
  setRedimensionando(false);
  // 🟢 NÃO SALVA NADA - O TAMANHO JÁ ESTÁ NO LOCALSTORAGE
};

    if (redimensionando) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [redimensionando]);

  const handleTurnClick = (e) => {
  if (!isMaster) return;

  // tenta obter rect sincronamente
  let rect = null;
  try {
    rect = refBox.current ? refBox.current.getBoundingClientRect() : null;
  } catch (err) {
    rect = null;
  }

  // guarda rect se houver
  if (rect) setHudRect(rect);

  // toggle menu
  setShowTurnMenu((prev) => {
    const next = !prev;
    // se vai abrir e não temos rect, tenta obter de novo (pequeno retry)
    if (next && !rect) {
      try {
        const r2 = refBox.current ? refBox.current.getBoundingClientRect() : null;
        if (r2) setHudRect(r2);
      } catch {}
    }
    return next;
  });

  // debug logs: tudo síncrono no clique
  try {
    // eslint-disable-next-line no-console
  } catch {}
};

  const handleSelectTurn = async (email) => {
    const nome = (fichasMap[email]?.nome) || email;
    try {
      await setTurn({ id: email, nick: nome, email });
      setShowTurnMenu(false);
    } catch (e) {
      console.error("handleSelectTurn erro:", e);
    }
  };

  const handleGiveXP = async () => {
    if (!selectedPlayerForXP) return;
    await addXP(selectedPlayerForXP, Math.abs(Number(xpEditValue || 0)));
  };
  const handleRemoveXP = async () => {
    if (!selectedPlayerForXP) return;
    await addXP(selectedPlayerForXP, -Math.abs(Number(xpEditValue || 0)));
  };

  // 🟢 SALVAR SORTE/AZAR
const salvarSorteAzar = async (email, valor) => {
  const novos = { ...sorteAzarJogadores, [email]: valor };
  setSorteAzarJogadores(novos);
  await setDoc(doc(db, "game", "sorteAzar"), { jogadores: novos }, { merge: true });
};

// 🟢 REMOVER SORTE/AZAR
const removerSorteAzar = async (email) => {
  const novos = { ...sorteAzarJogadores };
  delete novos[email];
  setSorteAzarJogadores(novos);
  await setDoc(doc(db, "game", "sorteAzar"), { jogadores: novos }, { merge: true });
};

  const [minutesInput, setMinutesInput] = useState(1);
  const [secondsInput, setSecondsInput] = useState(0);
  const [lastSetSeconds, setLastSetSeconds] = useState(60);
  const [remaining, setRemaining] = useState(hud?.timer?.remaining ?? hud?.timer?.duration ?? 0);
  const [runningLocal, setRunningLocal] = useState(false);
  const intervalRef = useRef(null);

  const faseClass = useMemo(() => {
    switch (hud?.world?.phase) {
      case "manhã": return "fase-manha text-dark";
      case "tarde": return "fase-tarde text-dark";
      case "noite": return "fase-noite text-light";
      case "madrugada": return "fase-madrugada text-light";
      default: return "fase-manha text-dark";
    }
  }, [hud?.world?.phase]);



function PortalSelect({ children }) {
  return (
    <Portal container={document.body}>
      <Box sx={{ position: "fixed", zIndex: 9999999999 }}>
        {children}
      </Box>
    </Portal>
  );
}

  useEffect(() => {
    if (runningLocal) return;
    const hudRem = hud?.timer?.remaining ?? hud?.timer?.duration ?? 0;
    setRemaining(hudRem);
    if (!hud?.timer?.running) {
      setLastSetSeconds(hudRem || 60);
      setMinutesInput(Math.floor((hudRem || 60) / 60));
      setSecondsInput((hudRem || 60) % 60);
    }
  }, [hud?.timer, runningLocal]);

  useEffect(() => {
    if (runningLocal) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(() => {
        setRemaining((r) => {
          const next = Math.max(0, (r ?? lastSetSeconds) - 1);
          if (next <= 0) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
            setRunningLocal(false);
            setTimeout(() => setRemaining(lastSetSeconds), 300);
            if (isMaster) {
              try { resetTimer(lastSetSeconds); } catch (e) {}
            }
            return 0;
          }
          return next;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [runningLocal, isMaster, lastSetSeconds]);

  // Força re-render quando turno ou XP mudarem
  useEffect(() => {
    // vazio de propósito: apenas força o componente a atualizar
  }, [hud.turn, hud.xpMap]);
  // 🟢 SALVAR DATA DO JOGO PARA A REDE
  useEffect(() => {
    if (!hud?.world) return;
    const season = hud.world.season || "Verão";
    const year = hud.world.year ?? "879";
    const day = hud.world.day ?? "1";
    const stationIndex = SEASONS.indexOf(season);
    const stationNum = stationIndex >= 0 ? stationIndex + 1 : 1;
    const dataJogo = `${season} — ${day}/${stationNum}/${year}`;
    localStorage.setItem('reqviem_world_date', dataJogo);
    // Também salva o ano separado para usar nas notícias
    localStorage.setItem('reqviem_world_year', `${year} D.C.`);
  }, [hud?.world]);

  // 🟢 FUNÇÃO PARA PASSAR O DIA E GASTAR/RECUPERAR FOME E SEDE
  const handleMudarDia = async (novoDia) => {
    if (!isMaster) return;
    const diaAtual = hud.world?.day || 1;
    const diferenca = novoDia - diaAtual; // Positivo se avançar, negativo se voltar
    
    if (diferenca !== 0) {
      for (const email of pjEmailsXP) {
        const ficha = fichasMap[email];
        if (ficha) {
          const fomeAtual = ficha.fome ?? 100;
          const sedeAtual = ficha.sede ?? 100;
          
          // Se diferenca > 0 (avançou), subtrai. Se diferenca < 0 (voltou), soma.
          const novaFome = Math.max(0, Math.min(100, fomeAtual - (20 * diferenca)));
          const novaSede = Math.max(0, Math.min(100, sedeAtual - (35 * diferenca)));

          let atualizacoes = { fome: novaFome, sede: novaSede };

          // 🟢 APLICA DEBUFF SE CHEGAR A 0%
          if (novaFome === 0 || novaSede === 0) {
            let pvAtual = ficha.pontosVida || 0;
            let dano = 0;
            if (novaFome === 0) dano += 10; // Perde 10 PV por fome 0
            if (novaSede === 0) dano += 20; // Perde 20 PV por sede 0
            atualizacoes.pontosVida = Math.max(0, pvAtual - dano);
          }

          await setDoc(doc(db, "fichas", email), atualizacoes, { merge: true });

          // Dispara evento em tempo real para a interface atualizar imediatamente
          window.dispatchEvent(new CustomEvent('atualizarFomeSede', { detail: { email, ...atualizacoes }}));
        }
      }
    }
    // Atualiza o dia no Firebase
    setWorldSeasonDayYear({ season: hud.world?.season, day: novoDia, year: hud.world?.year });
  };

  const handleTimerPlay = async () => {
    if (!isMaster) return;
    const total = Math.max(0, Math.floor((Number(minutesInput) || 0) * 60 + (Number(secondsInput) || 0)));
    if (total <= 0) return;
    setLastSetSeconds(total);
    setRemaining(total);
    setRunningLocal(true);
    try {
      await startTimer(total);
    } catch {}
  };
  const handleTimerPause = async () => {
    if (!isMaster) return;
    setRunningLocal(false);
    try {
      await stopTimer();
    } catch {}
  };

  const handleTimerReset = async () => {
    if (!isMaster) return;
    setRunningLocal(false);
    setRemaining(lastSetSeconds);
    try {
      await resetTimer(lastSetSeconds);
    } catch {}
  };

  const displayTime = useCallback((secs) => {
    const s = Number(secs) || 0;
    const mm = Math.floor(s / 60);
    const ss = s % 60;
    return `${String(mm).padStart(1, "0")}:${String(ss).padStart(2, "0")}`;
  }, []);

  const getBg = useCallback((phase) => {
    switch (phase) {
      case "manhã": return "linear-gradient(180deg,#fff9e6,#fff3c4)";
      case "tarde": return "linear-gradient(180deg,#fff0e0,#ffd1a8)";
      case "noite": return "linear-gradient(180deg,#071233,#0f284a)";
      case "madrugada": return "linear-gradient(180deg,#031026,#0a2440)";
      default: return "linear-gradient(180deg,#fff9e6,#fff3c4)";
    }
  }, []);

  const displayNameFor = useCallback((email) => {
    if (!email) return "—";
    return fichasMap[email]?.nome || email;
  }, [fichasMap]);

  const calcularStatus = useCallback((email) => {
    const ficha = fichasMap?.[email];
    if (!ficha) return null;

    const constituicao = Number(ficha?.atributos?.constituicao || 0);
    const sobrevivencia = Number(ficha?.pericias?.sobrevivencia || 0);
    const pvMax = 100 + (constituicao + sobrevivencia) * 10;
    const pvAtual = Number(ficha?.pontosVida || 0);

    const vontade = Number(ficha?.atributos?.vontade || 0);
    const aura = Number(ficha?.pericias?.aura || 0);
    const peMax = 10 + (vontade + aura) * 5;
    const peAtual = Number(ficha?.pontosEnergia || 0);

    return {
      pvAtual,
      pvMax,
      peAtual,
      peMax,
      pvPercent: pvMax > 0 ? (pvAtual / pvMax) * 100 : 0,
      pePercent: peMax > 0 ? (peAtual / peMax) * 100 : 0,
    };
  }, [fichasMap]);

  // 🟢 MONITORAR FOME/SEDE PARA NOTIFICAÇÕES DISCRETAS
  useEffect(() => {
    if (!fichasMap) return;
    const novasNotificacoes = [];
    
    Object.entries(fichasMap).forEach(([email, ficha]) => {
      const nome = ficha.nome || email;
      const fome = ficha.fome ?? 100;
      const sede = ficha.sede ?? 100;
      const alerts = [];
      
      if (fome === 0) alerts.push("FOME ZERO (-10 PV/dia)");
      else if (fome <= 10) alerts.push(`Fome Baixa (${fome}%)`);

      if (sede === 0) alerts.push("SEDE ZERO (-20 PV/dia)");
      else if (sede <= 10) alerts.push(`Sede Baixa (${sede}%)`);

      if (alerts.length > 0) {
        novasNotificacoes.push({
          text: `${nome}: ${alerts.join(" | ")}`,
          color: (fome === 0 || sede === 0) ? '#ef4444' : '#ff9800'
        });
      }
    });
    
    setNotificacoesFomeSede(novasNotificacoes);
  }, [fichasMap]);

  if (!currentUserEmail) return null;
  if (loading) return null;


  const CollapsedView = (
    <Paper
      elevation={12}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        px: 1,
        height: 80,
        width: "100%", // 🟢 Mudar para 100% para herdar a largura do HUD
        borderRadius: 2,
        cursor: "grab",
      }}
      onMouseDown={(e) => {
        const target = e.target;
        if (!target.closest("button") && !target.closest("svg")) {
          setDragging(true);
          try {
            const rect = refBox.current.getBoundingClientRect();
            dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
          } catch {}
        }
      }}
    >
      <DragIndicatorIcon sx={{ color: hud?.world?.phase === "noite" || hud?.world?.phase === "madrugada" ? "#fff" : "#111" }} />
      <Box sx={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, textShadow, color: "inherit" }}>
          HUD
        </Typography>
        <Typography variant="caption" sx={{ textShadow, color: "inherit" }}>
          {hud.turn?.nick ? `Turno: ${hud.turn.nick}` : "Turno: —"}
        </Typography>
      </Box>
      <Box sx={{ ml: "auto", display: "flex", gap: 0.5 }}>
        <IconButton size="small" onClick={(e) => { e.stopPropagation(); setCollapsed(false); }}>
          <ExpandMoreIcon />
        </IconButton>
      </Box>
    </Paper>
  );

  const anchorRect =
    turnAnchorEl && refBox.current ? refBox.current.getBoundingClientRect() : null;
  


// --- Substituir por este menuRect robusto ----
const menuRect = (() => {
  // prioriza hudRect salvo, senão tenta ler refBox.current ao render
  if (hudRect && typeof hudRect.top === "number" && typeof hudRect.left === "number") return hudRect;
  try {
    const r = refBox.current ? refBox.current.getBoundingClientRect() : null;
    // CHECAGEM CORRETA: typeof r.top === "number"
    if (r && typeof r.top === "number" && typeof r.left === "number") return r;
    return null;
  } catch (e) {
    return null;
  }
})();

if (!fichasMap) return null;

  // 🟢 CALCULAR ALTURA MÍNIMA BASEADA NOS ÍCONES
  const activeEmailForIcons = isMaster ? currentUserEmail : userEmail;
  const fichaForIcons = fichasMap[activeEmailForIcons] || {};
  
  // 🟢 Conta os ícones limpando os espaços em branco para não errar a conta
  const talentosListCount = fichaForIcons.caracteristicas ? fichaForIcons.caracteristicas.split(";").map(t => t.trim()).filter(Boolean).length : 0;
  const tracosListCount = fichaForIcons.tracos ? fichaForIcons.tracos.split(";").map(t => t.trim()).filter(Boolean).length : 0;
  const maxIcons = Math.max(talentosListCount, tracosListCount);
  
  // 🟢 O cálculo exato: 48px por ícone (40px do ícone + 8px de margem)
  const iconColumnHeight = maxIcons > 0 ? (maxIcons * 48) : 0;
  
  // 🟢 Se o jogador redimensionar, respeita o tamanho dele. Se não, usa a altura exata dos ícones.
  const effectiveHeight = Math.max(tamanho.height, iconColumnHeight);

  return (
    <>
      {/* 🟢 NOTIFICAÇÕES DISCRETAS DE FOME/SEDE (CANTO INFERIOR ESQUERDO) */}
      {notificacoesFomeSede.length > 0 && (
        <Box sx={{ position: 'fixed', bottom: 20, left: 20, zIndex: 9999999, display: 'flex', flexDirection: 'column', gap: 0.5, pointerEvents: 'none' }}>
          {notificacoesFomeSede.map((notif, i) => (
            <Paper 
              key={i} 
              elevation={4}
              sx={{ 
                p: 0.5, 
                px: 1.5, 
                bgcolor: 'rgba(15, 23, 42, 0.85)', 
                backdropFilter: 'blur(4px)',
                borderLeft: `3px solid ${notif.color}`, 
                color: '#cbd5e1', 
                fontSize: '0.7rem',
                borderRadius: 1,
                display: 'flex', 
                alignItems: 'center', 
                gap: 1 
              }}
            >
              <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: notif.color, animation: 'pulse 1.5s infinite' }} />
              {notif.text}
            </Paper>
          ))}
        </Box>
      )}
      <Box
  ref={refBox}
  className={`floating-hud ${faseClass}`}
  sx={{
    position: "fixed",
    left: posicaoLocal.x,
    top: posicaoLocal.y,
    zIndex: 120000,
    width: tamanho.width,
    minWidth: 380,
    height: collapsed ? 80 : (minimizado ? 75 : effectiveHeight),
    minHeight: collapsed ? 80 : (minimizado ? 75 : 400), // 🟢 Garante que o conteúdo interno não seja cortado
    maxWidth: "95vw",
    maxHeight: collapsed ? 80 : (minimizado ? 75 : "95vh"),
    transition: (dragging || redimensionando) ? "none" : "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    borderRadius: 2,
    p: collapsed ? 0.5 : (minimizado ? 0.5 : 1),
    cursor: "grab",
    userSelect: "none",
    overflow: "hidden",
    background: "inherit",
    ...(hudBackgrounds[getBgKeyFase(hud?.world?.phase)]
      ? {
          backgroundImage: `linear-gradient(rgba(0,0,0,0.18), rgba(0,0,0,0.18)), url(${hudBackgrounds[getBgKeyFase(hud?.world?.phase)]})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }
      : {}),
    color: hud?.world?.phase === "noite" || hud?.world?.phase === "madrugada" ? "#fff" : "#111",
    boxShadow: "0 12px 28px rgba(0,0,0,0.6)",
    display: "flex",
    flexDirection: "column",
  }}
  onMouseDown={(e) => {
    const t = e.target;

    if (t.closest && t.closest(".commerce-button")) {
      e.stopPropagation();
      return;
    }

    if (
      !t.closest("button") &&
      !t.closest("input") &&
      !t.closest("select") &&
      !t.closest("svg") &&
      !t.closest("a")
    ) {
      setDragging(true);
      try {
        const rect = refBox.current.getBoundingClientRect();
        dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      } catch {}
    }
  }}
>
        {collapsed ? (
          <Box sx={{ display: "flex", alignItems: "center" }}>{CollapsedView}</Box>
        ) : (
          <Paper elevation={0} sx={{ width: "100%", p: 0, bgcolor: "transparent" }}>
            
            {/* 🟢 MODO MINIMIZADO */}
            {minimizado && (() => {
              const activeEmail = isMaster ? (hud.turn?.id || currentUserEmail) : currentUserEmail;
              const activeName = isMaster
                ? (hud.turn?.nick || displayNameFor(currentUserEmail))
                : displayNameFor(currentUserEmail);
              const activeStatus = calcularStatus(activeEmail);
              const activeLevel = hud.xpMap?.[activeEmail]?.level ?? 1;
              
              const season = hud.world?.season || "Verão";
              const year = hud.world?.year ?? "879";
              const day = hud.world?.day ?? "1";
              const phase = hud.world?.phase || "manhã";
              const stationNum = SEASONS.indexOf(season) + 1 || 1;

              return (
                <Box sx={{ display: "flex", flexDirection: "column", width: "100%", px: 1, py: 0.5, gap: 0.6 }}>
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.8, flex: 1, minWidth: 0 }}>
                      <DragIndicatorIcon sx={{ color: "inherit", fontSize: 18, cursor: "grab" }} />
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, textShadow, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontSize: "0.85rem" }}>
                        {activeName}
                      </Typography>
                      <Chip label={`LV ${activeLevel}`} size="small" sx={{ height: 16, fontSize: "0.55rem", fontWeight: "bold", bgcolor: "rgba(0,0,0,0.4)", color: "#8ecaff", border: "1px solid rgba(142,202,255,0.3)" }} />
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Typography variant="caption" sx={{ color: "inherit", opacity: 0.8, textShadow, fontSize: "0.65rem", fontWeight: "bold" }}>
                        {season} — {day}/{stationNum}/{year} • {phase}
                      </Typography>
                      <IconButton size="small" onClick={() => setMinimizado(false)} title="Expandir HUD" sx={{ color: "inherit", p: 0.2 }}>
                        <ExpandMoreIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>
                  {activeStatus && (
                    <Box sx={{ display: "flex", gap: 1, alignItems: "center", width: "100%", px: 2.5 }}>
                      <Box sx={{ flex: 1, position: "relative" }}>
                        <LinearProgress variant="determinate" value={activeStatus.pvPercent} sx={{ height: 8, borderRadius: 4, bgcolor: "rgba(0,0,0,0.5)", "& .MuiLinearProgress-bar": { backgroundColor: "#ff3333" } }} />
                        <Typography sx={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 7.5, fontWeight: 900, color: "#fff", textShadow: "0 0 2px #000" }}>
                          {activeStatus.pvAtual}/{activeStatus.pvMax}
                        </Typography>
                      </Box>
                      <Box sx={{ flex: 1, position: "relative" }}>
                        <LinearProgress variant="determinate" value={activeStatus.pePercent} sx={{ height: 8, borderRadius: 4, bgcolor: "rgba(0,0,0,0.5)", "& .MuiLinearProgress-bar": { backgroundColor: "#facc15" } }} />
                        <Typography sx={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 7.5, fontWeight: 900, color: "#fff", textShadow: "0 0 2px #000" }}>
                          {activeStatus.peAtual}/{activeStatus.peMax}
                        </Typography>
                      </Box>
                    </Box>
                  )}
                </Box>
              );
            })()}

            {/* 🟢 MODO EXPANDIDO */}
            {!minimizado && (
              <>
                <Paper
                  elevation={0}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.2,
                    width: "100%",
                    mb: 1,
                    p: 1,
                    px: 1.4,
                    borderRadius: 2,
                    background: "linear-gradient(135deg, rgba(255,255,255,0.22), rgba(255,255,255,0.06))",
                    border: "1px solid rgba(255,255,255,0.18)",
                    backdropFilter: "blur(8px)",
                    boxShadow: "0 4px 14px rgba(0,0,0,0.18)",
                  }}
                >
                  <Box sx={{ width: 36, height: 36, borderRadius: 1.5, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.14)", flexShrink: 0 }}>
                    <DragIndicatorIcon sx={{ color: "inherit", fontSize: 20 }} />
                  </Box>
                  <Box sx={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}>
                    <Typography variant="caption" sx={{ opacity: 0.65, fontSize: "0.55rem", letterSpacing: 1.6, textTransform: "uppercase", fontWeight: 700, lineHeight: 1, mb: 0.2 }}>
                      Turno Atual
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 800, textShadow, lineHeight: 1.1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "1.05rem" }}>
                      {hud.turn?.nick ? hud.turn.nick : "—"}
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", gap: 0.5, alignItems: "center" }}>
                    {isMaster && (
                      <IconButton size="small" onClick={handleTurnClick} title="Selecionar Turno" sx={{ color: "inherit", bgcolor: "rgba(0,0,0,0.14)", "&:hover": { bgcolor: "rgba(0,0,0,0.24)" } }}>
                        <ListIcon fontSize="small" />
                      </IconButton>
                    )}
                    {isMaster && (
                      <IconButton size="small" onClick={() => setBgDialogOpen(true)} title="Fundos das Fases" sx={{ color: "inherit", bgcolor: "rgba(0,0,0,0.14)", "&:hover": { bgcolor: "rgba(0,0,0,0.24)" } }}>
                        <CloudUploadIcon fontSize="small" />
                      </IconButton>
                    )}
                    <IconButton size="small" onClick={() => setMinimizado(true)} title="Minimizar HUD" sx={{ color: "inherit", bgcolor: "rgba(0,0,0,0.14)", "&:hover": { bgcolor: "rgba(0,0,0,0.24)" } }}>
                      <ExpandLessIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Paper>

                {isMaster && showTurnMenu && createPortal(
                  <Paper elevation={12} sx={{ position: "absolute", top: (refBox.current?.getBoundingClientRect()?.top ?? 100) + window.scrollY + 60, left: (refBox.current?.getBoundingClientRect()?.left ?? 100) + window.scrollX, zIndex: 999999999, minWidth: 240, maxWidth: 320, p: 2, bgcolor: "rgba(25,25,25,0.95)", backdropFilter: "blur(6px)", color: "inherit", borderRadius: 2 }} onClick={(e) => e.stopPropagation()}>
                    <Typography sx={{ fontWeight: 700, mb: 1 }}>Selecionar turno</Typography>
                    {mergedEmails.length === 0 ? (
                      <Typography variant="caption">Nenhuma ficha registrada</Typography>
                    ) : (
                      <Box sx={{ maxHeight: 300, overflowY: 'auto', pr: 1, '&::-webkit-scrollbar': { width: '4px' }, '&::-webkit-scrollbar-thumb': { background: 'rgba(255,255,255,0.2)', borderRadius: '10px' } }}>
                        {(() => {
                          const grupos = [];
                          if (pjEmails.length > 0) grupos.push({ titulo: '── PERSONAGENS DO JOGADOR ──', fichas: pjEmails, cor: '#4caf50' });
                          if (pmEmails.length > 0) grupos.push({ titulo: '── PERSONAGENS DO MESTRE ──', fichas: pmEmails, cor: '#ff9800' });
                          return grupos.map((g, gi) => (
                            <Box key={gi} sx={{ mb: 1 }}>
                              <Typography variant="caption" sx={{ color: g.cor, fontWeight: 'bold', display: 'block', mb: 0.5, borderBottom: `1px solid ${g.cor}44`, pb: 0.3 }}>{g.titulo}</Typography>
                              {g.fichas.map(email => (
                                <Button key={email} fullWidth sx={{ justifyContent: "flex-start", textTransform: "none", color: "inherit", mb: 0.3, pl: 1.5, fontSize: '0.8rem' }} onClick={() => { handleSelectTurn(email); setShowTurnMenu(false); }}>
                                  {displayNameFor(email)}
                                </Button>
                              ))}
                            </Box>
                          ));
                        })()}
                      </Box>
                    )}
                    <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 1 }}>
                      <Button onClick={() => setShowTurnMenu(false)}>Fechar</Button>
                    </Box>
                  </Paper>, document.body
                )}

                <Box sx={{ display: "flex", flexDirection: "column", gap: 1.2, mt: 1 }}>
                  <Box sx={{ width: "100%", display: "flex", flexDirection: "column", gap: 0.5 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Box sx={{ width: 44, height: 44, borderRadius: 1.5, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.12)" }}>
                        {hud.world?.phase === "manhã" && "☀️"}
                        {hud.world?.phase === "tarde" && "🌤️"}
                        {hud.world?.phase === "noite" && "🌙"}
                        {hud.world?.phase === "madrugada" && "✨"}
                      </Box>
                      <Box sx={{ display: "flex", flexDirection: "column" }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, textShadow }}>
                          {(() => {
                            const season = hud.world?.season || "Verão";
                            const year = hud.world?.year ?? "—";
                            const day = hud.world?.day ?? "—";
                            const stationNum = SEASONS.indexOf(season) >= 0 ? SEASONS.indexOf(season) + 1 : 1;
                            return `${season} — ${day}/${stationNum}/${year}`;
                          })()}
                        </Typography>
                        <Typography variant="caption" sx={{ textShadow }}>Fase: {hud.world?.phase ?? "—"}</Typography>
                      </Box>
                    </Box>

                    {isMaster && (
                      <Box sx={{ display: "flex", gap: 2, mt: 1, flexWrap: "wrap" }}>
                        <FormControl size="small" sx={{ minWidth: 140 }}>
                          <InputLabel>Fase</InputLabel>
                          <Select value={hud.world?.phase || "manhã"} label="Fase" onChange={(e) => setWorldPhase(e.target.value)} MenuProps={{ disablePortal: false, container: typeof document !== "undefined" ? document.body : undefined, PaperProps: { sx: { zIndex: 140000, backdropFilter: "blur(4px)", maxHeight: 300, overflowY: 'auto', '&::-webkit-scrollbar': { width: '4px' }, '&::-webkit-scrollbar-thumb': { background: 'rgba(255,255,255,0.3)', borderRadius: '10px' } } }, anchorOrigin: { vertical: "bottom", horizontal: "left" }, transformOrigin: { vertical: "top", horizontal: "left" } }}>
                            {PHASES.map((p) => (<MenuItem key={p} value={p}>{p}</MenuItem>))}
                          </Select>
                        </FormControl>
                        <Box sx={{ display: "flex", gap: 1 }}>
                          <TextField size="small" label="Dia" type="number" value={hud.world?.day ?? ""} onChange={(e) => handleMudarDia(Number(e.target.value || 1))} sx={{ width: 70 }} />
                          <TextField size="small" label="Estação" type="number" value={SEASONS.indexOf(hud.world?.season) >= 0 ? SEASONS.indexOf(hud.world?.season) + 1 : 1} onChange={(e) => { let v = Number(e.target.value || 1); if (v < 1) v = 1; if (v > 4) v = 4; setWorldSeasonDayYear({ season: SEASONS[v - 1], day: hud.world?.day, year: hud.world?.year }); }} inputProps={{ min: 1, max: 4 }} sx={{ width: 70 }} />
                          <TextField size="small" label="Ano" type="number" value={hud.world?.year ?? ""} onChange={(e) => setWorldSeasonDayYear({ season: hud.world?.season, day: hud.world?.day, year: Number(e.target.value || 1) })} sx={{ width: 90 }} />
                        </Box>
                      </Box>
                    )}
                  </Box>
                  <Divider sx={{ width: "100%", opacity: 0.3 }} />
                  <Box sx={{ width: "100%" }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, textShadow, mb: 0.5 }}>XP</Typography>
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                      <Box sx={{ display: "flex", flexDirection: "column", gap: 1, maxHeight: "250px", overflowY: "auto", pr: 1, "&::-webkit-scrollbar": { width: "6px" }, "&::-webkit-scrollbar-track": { background: "rgba(255,255,255,0.1)", borderRadius: "10px" }, "&::-webkit-scrollbar-thumb": { background: "rgba(255,255,255,0.3)", borderRadius: "10px", "&:hover": { background: "rgba(255,255,255,0.5)" } } }}>
                        {isMaster ? (
                          <>
                            {pjEmailsXP.length > 0 && (
                              <Box sx={{ mb: 1 }}>
                                <Typography variant="caption" sx={{ color: '#4caf50', fontWeight: 'bold', borderBottom: '1px solid #4caf5022', pb: 0.3, mb: 0.5, display: 'block' }}>── PERSONAGENS DO JOGADOR ──</Typography>
                                {pjEmailsXP.map((email) => {
                                  const status = calcularStatus(email);
                                  const corAura = CORES_AURA_HUD[fichasMap[email]?.tipoAura] || '#4caf50';
                                  return (
                                    <Box key={email} sx={{ width: "100%", mb: 1, pl: 1, borderLeft: `3px solid ${corAura}` }}>
                                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                        <Typography variant="caption" sx={{ textShadow, color: corAura, fontWeight: 'bold' }}>{displayNameFor(email)}</Typography>
                                        {Array.isArray(fichasMap[email]?.efeitosAtivos) && fichasMap[email].efeitosAtivos.length > 0 && (
                                          <Box sx={{ display: "flex", gap: 0.3, alignItems: "center" }}>
                                            {fichasMap[email].efeitosAtivos.map((ef) => (
                                              <Tooltip key={ef.id} arrow title={<Box sx={{ p: 0.5 }}><Typography sx={{ fontWeight: "bold", fontSize: "0.75rem", color: ef.cor || "#fff" }}>{ef.icone} {ef.tipo}</Typography><Typography sx={{ fontSize: "0.65rem", color: "#cbd5e1" }}>{ef.descricao || ""}</Typography><Typography sx={{ fontSize: "0.6rem", color: "#94a3b8", mt: 0.3 }}>Restam: {ef.turnosRestantes ?? "?"} turno(s)</Typography></Box>}>
                                                <Box sx={{ width: 18, height: 18, borderRadius: "50%", bgcolor: "rgba(0,0,0,0.5)", border: `1px solid ${ef.cor || "#fff"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, boxShadow: `0 0 5px ${ef.cor || "#fff"}88`, cursor: "help" }}>{ef.icone}</Box>
                                              </Tooltip>
                                            ))}
                                          </Box>
                                        )}
                                      </Box>
                                      {status && (
                                        <Box sx={{ display: "flex", gap: 0.5, mb: 0.5 }}>
                                          <Box sx={{ position: "relative", flex: 1 }}><LinearProgress variant="determinate" value={status.pvPercent} sx={{ height: 6, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.25)", "& .MuiLinearProgress-bar": { backgroundColor: "#ff0000" } }} /><Box sx={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, pointerEvents: "none", color: "inherit", textShadow }}>{status.pvAtual}/{status.pvMax}</Box></Box>
                                          <Box sx={{ position: "relative", flex: 1 }}><LinearProgress variant="determinate" value={status.pePercent} sx={{ height: 6, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.25)", "& .MuiLinearProgress-bar": { backgroundColor: "#facc15" } }} /><Box sx={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, pointerEvents: "none", color: "inherit", textShadow }}>{status.peAtual}/{status.peMax}</Box></Box>
                                        </Box>
                                      )}
                                      <Box sx={{ position: "relative", mt: 0.5 }}><LinearProgress variant="determinate" value={hud.xpMap?.[email]?.xp ?? 0} sx={{ height: 12, borderRadius: 6, backgroundColor: "rgba(255,255,255,0.15)", "& .MuiLinearProgress-bar": { backgroundColor: "#8ecaff", boxShadow: "0 0 8px rgba(142,202,255,0.7)" } }} /><Box sx={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, pointerEvents: "none", color: "inherit", textShadow }}>LV {hud.xpMap?.[email]?.level ?? 1} — {hud.xpMap?.[email]?.xp ?? 0}/100</Box></Box>
{/* 🟢 BARRAS DE FOME E SEDE */}
<Box sx={{ display: "flex", gap: 0.5, mt: 0.5 }}>
  <Tooltip title={`Fome: ${fichasMap[email]?.fome ?? 100}%`} arrow>
    <Box sx={{ position: "relative", flex: 1, height: 8, bgcolor: "rgba(0,0,0,0.5)", borderRadius: 4, overflow: "hidden", border: "1px solid rgba(255,152,0,0.3)" }}>
      <Box sx={{ width: `${fichasMap[email]?.fome ?? 100}%`, height: "100%", bgcolor: "#ff9800", transition: "width 0.3s" }} />
      <Typography sx={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 7, fontWeight: 900, color: "#fff", textShadow: "0 0 2px #000" }}>🍖 {fichasMap[email]?.fome ?? 100}%</Typography>
    </Box>
  </Tooltip>
  <Tooltip title={`Sede: ${fichasMap[email]?.sede ?? 100}%`} arrow>
    <Box sx={{ position: "relative", flex: 1, height: 8, bgcolor: "rgba(0,0,0,0.5)", borderRadius: 4, overflow: "hidden", border: "1px solid rgba(59,130,246,0.3)" }}>
      <Box sx={{ width: `${fichasMap[email]?.sede ?? 100}%`, height: "100%", bgcolor: "#3b82f6", transition: "width 0.3s" }} />
      <Typography sx={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 7, fontWeight: 900, color: "#fff", textShadow: "0 0 2px #000" }}>💧 {fichasMap[email]?.sede ?? 100}%</Typography>
    </Box>
  </Tooltip>
</Box>
                                    </Box>
                                  );
                                })}
                              </Box>
                            )}
                            {pmEmailsXP.length > 0 && (
                              <Box sx={{ mb: 1 }}>
                                <Typography variant="caption" sx={{ color: '#ff9800', fontWeight: 'bold', borderBottom: '1px solid #ff980022', pb: 0.3, mb: 0.5, display: 'block' }}>── PERSONAGENS DO MESTRE ──</Typography>
                                {pmEmailsXP.map((email) => {
                                  const status = calcularStatus(email);
                                  const corAura = CORES_AURA_HUD[fichasMap[email]?.tipoAura] || '#ff9800';
                                  return (
                                    <Box key={email} sx={{ width: "100%", mb: 1, pl: 1, borderLeft: `3px solid ${corAura}` }}>
                                      <Box sx={{ display: "flex", justifyContent: "space-between" }}><Typography variant="caption" sx={{ textShadow, color: corAura, fontWeight: 'bold' }}>{displayNameFor(email)}</Typography></Box>
                                      {status && (
                                        <Box sx={{ display: "flex", gap: 0.5, mb: 0.5 }}>
                                          <Box sx={{ position: "relative", flex: 1 }}><LinearProgress variant="determinate" value={status.pvPercent} sx={{ height: 6, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.25)", "& .MuiLinearProgress-bar": { backgroundColor: "#ff0000" } }} /><Box sx={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, pointerEvents: "none", color: "inherit", textShadow }}>{status.pvAtual}/{status.pvMax}</Box></Box>
                                          <Box sx={{ position: "relative", flex: 1 }}><LinearProgress variant="determinate" value={status.pePercent} sx={{ height: 6, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.25)", "& .MuiLinearProgress-bar": { backgroundColor: "#facc15" } }} /><Box sx={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, pointerEvents: "none", color: "inherit", textShadow }}>{status.peAtual}/{status.peMax}</Box></Box>
                                        </Box>
                                      )}
                                      <Box sx={{ position: "relative", mt: 0.5 }}><LinearProgress variant="determinate" value={hud.xpMap?.[email]?.xp ?? 0} sx={{ height: 12, borderRadius: 6, backgroundColor: "rgba(255,255,255,0.15)", "& .MuiLinearProgress-bar": { backgroundColor: "#8ecaff", boxShadow: "0 0 8px rgba(142,202,255,0.7)" } }} /><Box sx={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, pointerEvents: "none", color: "inherit", textShadow }}>LV {hud.xpMap?.[email]?.level ?? 1} — {hud.xpMap?.[email]?.xp ?? 0}/100</Box></Box>
{/* 🟢 BARRAS DE FOME E SEDE */}
<Box sx={{ display: "flex", gap: 0.5, mt: 0.5 }}>
  <Tooltip title={`Fome: ${fichasMap[email]?.fome ?? 100}%`} arrow>
    <Box sx={{ position: "relative", flex: 1, height: 8, bgcolor: "rgba(0,0,0,0.5)", borderRadius: 4, overflow: "hidden", border: "1px solid rgba(255,152,0,0.3)" }}>
      <Box sx={{ width: `${fichasMap[email]?.fome ?? 100}%`, height: "100%", bgcolor: "#ff9800", transition: "width 0.3s" }} />
      <Typography sx={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 7, fontWeight: 900, color: "#fff", textShadow: "0 0 2px #000" }}>🍖 {fichasMap[email]?.fome ?? 100}%</Typography>
    </Box>
  </Tooltip>
  <Tooltip title={`Sede: ${fichasMap[email]?.sede ?? 100}%`} arrow>
    <Box sx={{ position: "relative", flex: 1, height: 8, bgcolor: "rgba(0,0,0,0.5)", borderRadius: 4, overflow: "hidden", border: "1px solid rgba(59,130,246,0.3)" }}>
      <Box sx={{ width: `${fichasMap[email]?.sede ?? 100}%`, height: "100%", bgcolor: "#3b82f6", transition: "width 0.3s" }} />
      <Typography sx={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 7, fontWeight: 900, color: "#fff", textShadow: "0 0 2px #000" }}>💧 {fichasMap[email]?.sede ?? 100}%</Typography>
    </Box>
  </Tooltip>
</Box>
                                    </Box>
                                  );
                                })}
                              </Box>
                            )}
                          </>
                        ) : (
                          (() => {
                            const email = currentUserEmail;
                            const status = calcularStatus(email);
                            const corAura = CORES_AURA_HUD[fichasMap[email]?.tipoAura] || '#00e0ff';
                            return (
                              <Box key={email} sx={{ width: "100%" }}>
                                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                  <Typography variant="caption" sx={{ textShadow, color: corAura }}>{displayNameFor(email)}</Typography>
                                  {Array.isArray(fichasMap[email]?.efeitosAtivos) && fichasMap[email].efeitosAtivos.length > 0 && (
                                    <Box sx={{ display: "flex", gap: 0.3 }}>
                                      {fichasMap[email].efeitosAtivos.map((ef) => (
                                        <Tooltip key={ef.id} arrow title={`${ef.icone} ${ef.tipo} — ${ef.turnosRestantes ?? "?"} turnos`}>
                                          <Box sx={{ width: 16, height: 16, borderRadius: "50%", bgcolor: "rgba(0,0,0,0.5)", border: `1px solid ${ef.cor}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, boxShadow: `0 0 4px ${ef.cor}88` }}>{ef.icone}</Box>
                                        </Tooltip>
                                      ))}
                                    </Box>
                                  )}
                                </Box>
                                {status && (
                                  <Box sx={{ display: "flex", gap: 0.5, mb: 0.5 }}>
                                    <Box sx={{ position: "relative", flex: 1 }}><LinearProgress variant="determinate" value={status.pvPercent} sx={{ height: 6, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.25)", "& .MuiLinearProgress-bar": { backgroundColor: "#ff0000" } }} /><Box sx={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, pointerEvents: "none", color: "inherit", textShadow }}>{status.pvAtual}/{status.pvMax}</Box></Box>
                                    <Box sx={{ position: "relative", flex: 1 }}><LinearProgress variant="determinate" value={status.pePercent} sx={{ height: 6, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.25)", "& .MuiLinearProgress-bar": { backgroundColor: "#facc15" } }} /><Box sx={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, pointerEvents: "none", color: "inherit", textShadow }}>{status.peAtual}/{status.peMax}</Box></Box>
                                  </Box>
                                )}
                                <Box sx={{ position: "relative", mt: 0.5 }}><LinearProgress variant="determinate" value={hud.xpMap?.[email]?.xp ?? 0} sx={{ height: 12, borderRadius: 6, backgroundColor: "rgba(255,255,255,0.15)", "& .MuiLinearProgress-bar": { backgroundColor: "#8ecaff", boxShadow: "0 0 8px rgba(142,202,255,0.7)" } }} /><Box sx={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, pointerEvents: "none", color: "inherit", textShadow }}>LV {hud.xpMap?.[email]?.level ?? 1} — {hud.xpMap?.[email]?.xp ?? 0}/100</Box></Box>
{/* 🟢 BARRAS DE FOME E SEDE */}
<Box sx={{ display: "flex", gap: 0.5, mt: 0.5 }}>
  <Tooltip title={`Fome: ${fichasMap[email]?.fome ?? 100}%`} arrow>
    <Box sx={{ position: "relative", flex: 1, height: 8, bgcolor: "rgba(0,0,0,0.5)", borderRadius: 4, overflow: "hidden", border: "1px solid rgba(255,152,0,0.3)" }}>
      <Box sx={{ width: `${fichasMap[email]?.fome ?? 100}%`, height: "100%", bgcolor: "#ff9800", transition: "width 0.3s" }} />
      <Typography sx={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 7, fontWeight: 900, color: "#fff", textShadow: "0 0 2px #000" }}>🍖 {fichasMap[email]?.fome ?? 100}%</Typography>
    </Box>
  </Tooltip>
  <Tooltip title={`Sede: ${fichasMap[email]?.sede ?? 100}%`} arrow>
    <Box sx={{ position: "relative", flex: 1, height: 8, bgcolor: "rgba(0,0,0,0.5)", borderRadius: 4, overflow: "hidden", border: "1px solid rgba(59,130,246,0.3)" }}>
      <Box sx={{ width: `${fichasMap[email]?.sede ?? 100}%`, height: "100%", bgcolor: "#3b82f6", transition: "width 0.3s" }} />
      <Typography sx={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 7, fontWeight: 900, color: "#fff", textShadow: "0 0 2px #000" }}>💧 {fichasMap[email]?.sede ?? 100}%</Typography>
    </Box>
  </Tooltip>
</Box>
                              </Box>
                            );
                          })()
                        )}
                      </Box>

                      {isMaster && (
                        <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
                          <TextField size="small" label="Valor" type="number" value={xpEditValue} onChange={(e) => setXpEditValue(Number(e.target.value))} sx={{ width: 80 }} />
                          <FormControl size="small" sx={{ minWidth: 150 }}>
                            <InputLabel>Jogador</InputLabel>
                            <Select value={selectedPlayerForXP || ""} label="Jogador" onChange={(e) => setSelectedPlayerForXP(e.target.value)} renderValue={(selected) => !selected ? <em style={{ color: "#94a3b8" }}>-- selecione --</em> : displayNameFor(selected)} sx={{ color: "#fff", bgcolor: "rgba(0,0,0,0.25)", borderRadius: 1.5, fontSize: "0.8rem", ".MuiOutlinedInput-notchedOutline": { borderColor: "rgba(255,255,255,0.18)" }, "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(255,255,255,0.35)" }, "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "#8ecaff" } }} MenuProps={{ disablePortal: false, container: typeof document !== "undefined" ? document.body : undefined, PaperProps: { sx: { zIndex: 140000, bgcolor: "rgba(20,20,20,0.98)", backdropFilter: "blur(10px)", color: "#fff", borderRadius: 2, border: "1px solid rgba(255,255,255,0.12)", boxShadow: "0 12px 40px rgba(0,0,0,0.7)", maxHeight: 340, mt: 0.5, overflowY: "auto", "&::-webkit-scrollbar": { width: "5px" }, "&::-webkit-scrollbar-thumb": { background: "rgba(255,255,255,0.25)", borderRadius: "10px" } } }, anchorOrigin: { vertical: "bottom", horizontal: "left" }, transformOrigin: { vertical: "top", horizontal: "left" } }}>
                              <MenuItem value="" sx={{ fontSize: "0.8rem" }}><em style={{ color: "#94a3b8" }}>-- selecione --</em></MenuItem>
                              <MenuItem disabled sx={{ opacity: 1, borderBottom: "1px solid #4caf5044", mt: 0.5, py: 0.3 }}><Typography variant="caption" sx={{ color: "#4caf50", fontWeight: 800, fontSize: "0.6rem", letterSpacing: 1 }}>── PERSONAGENS DO JOGADOR ──</Typography></MenuItem>
                              {pjEmailsXP.map((email) => (<MenuItem key={email} value={email} sx={{ pl: 3, fontSize: "0.8rem", py: 0.5, "&:hover": { bgcolor: "rgba(76,175,80,0.15)" } }}>{displayNameFor(email)}</MenuItem>))}
                              {pmEmailsXP.length > 0 && (<MenuItem disabled sx={{ opacity: 1, borderBottom: "1px solid #ff980044", mt: 0.5, py: 0.3 }}><Typography variant="caption" sx={{ color: "#ff9800", fontWeight: 800, fontSize: "0.6rem", letterSpacing: 1 }}>── PERSONAGENS DO MESTRE ──</Typography></MenuItem>)}
                              {pmEmailsXP.map((email) => (<MenuItem key={email} value={email} sx={{ pl: 3, fontSize: "0.8rem", py: 0.5, "&:hover": { bgcolor: "rgba(255,152,0,0.15)" } }}>{displayNameFor(email)}</MenuItem>))}
                            </Select>
                          </FormControl>
                          <IconButton color="primary" onClick={handleGiveXP}><AddIcon /></IconButton>
                          <IconButton color="secondary" onClick={handleRemoveXP}><RemoveIcon /></IconButton>
                          <IconButton onClick={() => setSorteAzarOpen(true)} title="Sorte/Azar" sx={{ color: '#ff9800' }}><span style={{ fontSize: '1.2rem' }}>🎲</span></IconButton>
                        </Box>
                      )}
                    </Box>
                  </Box>

                  <Divider sx={{ width: "100%", opacity: 0.3 }} />

                  <Box sx={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", pb: 1, position: "relative" }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Paper elevation={2} sx={{ px: 2, py: 1, borderRadius: 1, background: "rgba(0,0,0,0.25)" }}>
                        <Typography variant="h5" sx={{ fontWeight: 800, fontFamily: "monospace", textAlign: "center", minWidth: 96 }}>{displayTime(remaining)}</Typography>
                      </Paper>
                      <IconButton onClick={() => { if (window.__toggleChat) window.__toggleChat(); }} title="Chat Flutuante" sx={{ color: '#00e0ff', bgcolor: 'rgba(0,0,0,0.25)', width: 36, height: 36 }}><span style={{ fontSize: '1.1rem' }}>💬</span></IconButton>
                      <IconButton onClick={() => { if (window.__toggleFicha) window.__toggleFicha(); }} title="Ficha Flutuante" sx={{ color: '#ff9800', bgcolor: 'rgba(0,0,0,0.25)', width: 36, height: 36 }}><span style={{ fontSize: '1.1rem' }}>📋</span></IconButton>
                    </Box>
                    
                    {isMaster && (
                      <Box sx={{ display: "flex", gap: 1, alignItems: "center", mt: 0.5 }}>
                        <TextField size="small" label="Min" type="number" inputProps={{ min: 0 }} value={minutesInput} onChange={(e) => setMinutesInput(Math.max(0, Number(e.target.value || 0)))} sx={{ width: 84 }} />
                        <TextField size="small" label="Seg" type="number" inputProps={{ min: 0, max: 59 }} value={secondsInput} onChange={(e) => { let v = Number(e.target.value || 0); if (v < 0) v = 0; if (v > 59) v = 59; setSecondsInput(v); }} sx={{ width: 84 }} />
                      </Box>
                    )}

                    {isMaster && (
                      <Box sx={{ display: "flex", gap: 1, alignItems: "center", mt: 1 }}>
                        <IconButton onClick={runningLocal ? handleTimerPause : handleTimerPlay} title={runningLocal ? "Pausar" : "Iniciar"} size="small">{runningLocal ? <PauseIcon /> : <PlayArrowIcon />}</IconButton>
                        <IconButton onClick={handleTimerReset} title="Resetar" size="small"><RestartAltIcon /></IconButton>
                      </Box>
                    )}
                  </Box>
                </Box>
              </>
            )}
          </Paper>
        )}
        {/* 🟢 ALÇA DE REDIMENSIONAMENTO */}
        {!collapsed && !minimizado && (
          <Box
            sx={{
              position: "absolute",
              bottom: 0,
              right: 0,
              width: 16,
              height: 16,
              cursor: "nwse-resize",
              zIndex: 10,
            }}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setRedimensionando(true);
              resizeStartRef.current = {
                x: e.clientX,
                y: e.clientY,
                width: tamanho.width,
                height: tamanho.height,
              };
            }}
          />
        )}
      </Box>
      {/* 🟢 PAINEL ESQUERDO: EFEITOS ATIVOS */}
      {(() => {
        const activeEmail = isMaster ? (hud.turn?.id || currentUserEmail) : currentUserEmail;
        const efeitosAtivos = fichasMap?.[activeEmail]?.efeitosAtivos || [];
        if (efeitosAtivos.length === 0) return null;
        
        return (
          <Box sx={{ 
            position: "fixed", 
            top: 0,
            left: 0,
            transform: `translate(${Math.max(8, posicaoLocal.x - 62)}px, ${posicaoLocal.y}px)`,
            zIndex: 119999, 
            display: "flex", 
            flexDirection: "column", 
            gap: 0.8, 
            pointerEvents: "none",
            transition: dragging ? "none" : "transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
          }}>
            {efeitosAtivos.map((ef, i) => (
              <Tooltip
                key={ef.id || i}
                arrow
                placement="right"
                slotProps={{ tooltip: { sx: { bgcolor: "#0f172a", border: `1px solid ${ef.cor || "#fff"}`, maxWidth: 220 } } }}
                title={
                  <Box sx={{ p: 0.5 }}>
                    <Typography sx={{ fontWeight: "bold", color: ef.cor || "#fff", fontSize: "0.8rem" }}>{ef.icone} {ef.tipo}</Typography>
                    <Typography sx={{ fontSize: "0.7rem", color: "#cbd5e1" }}>{ef.descricao || ""}</Typography>
                    <Typography sx={{ fontSize: "0.65rem", color: "#94a3b8", mt: 0.3 }}>⏳ {ef.turnosRestantes ?? "?"} turno(s)</Typography>
                  </Box>
                }
              >
                <Box
                  sx={{
                    "--ef-color": ef.cor || "#fff",
                    width: 48, height: 48, borderRadius: "50%",
                    bgcolor: "rgba(0,0,0,0.75)",
                    border: `2px solid ${ef.cor || "#fff"}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 24, position: "relative",
                    pointerEvents: (collapsed || minimizado) ? "none" : "auto",
                    cursor: "help",
                    animation: `floatEffect ${2.4 + i * 0.2}s ease-in-out infinite, effectPulse 2s ease-in-out infinite`,
                    animationDelay: `${i * 0.25}s`,
                    backdropFilter: "blur(4px)",
                    // 🟢 Animação de Sugar para dentro do HUD
                    opacity: (collapsed || minimizado) ? 0 : 1,
                    transform: (collapsed || minimizado) ? "translateX(40px) scale(0.5)" : "translateX(0) scale(1)",
                    transition: "opacity 0.3s ease, transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
                  }}
                >
                  {ef.icone}
                  <Box
                    sx={{
                      position: "absolute", bottom: -6, right: -6,
                      bgcolor: "#0f172a", color: ef.cor || "#fff",
                      fontSize: "0.62rem", fontWeight: 900, borderRadius: "50%",
                      minWidth: 20, height: 20, px: 0.4,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      border: `2px solid ${ef.cor || "#fff"}`,
                      boxShadow: `0 0 8px ${ef.cor || "#fff"}88`,
                    }}
                  >
                    {ef.turnosRestantes === 999 ? "∞" : ef.turnosRestantes ?? "?"}
                  </Box>
                </Box>
              </Tooltip>
            ))}
          </Box>
        );
      })()}

      {/* 🟢 PAINEL DIREITO 1: TRAÇOS (VISÍVEL APENAS PARA O JOGADOR) */}
      {!isMaster && userEmail !== "mestre@reqviemrpg.com" && (() => {
        const playerFicha = fichasMap[userEmail] || {};
        // 🟢 Correção: .split(";").map(t => t.trim()) limpa os espaços extras que impediam de achar o ícone
        const tracosList = playerFicha.tracos ? playerFicha.tracos.split(";").map(t => t.trim()).filter(Boolean) : [];
        if (tracosList.length === 0) return null;

        return (
          <Box sx={{
            position: "fixed",
            top: 0,
            left: 0,
            transform: `translate(${posicaoLocal.x + tamanho.width + 10}px, ${posicaoLocal.y}px)`,
            zIndex: 119999,
            display: "flex",
            flexDirection: "column",
            gap: 0.8,
            pointerEvents: "none",
            transition: dragging ? "none" : "transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
          }}>
            {tracosList.map(t => {
              const info = TRACOS_ICONS[t] || { icon: "❓", color: "#888", desc: "Traço Desconhecido." };
              const periciaOrigem = TRACOS_PERICIA[t] || "Desconhecida";
              return (
                <Tooltip key={t} arrow placement="right" title={
                  <Box sx={{ p: 0.5 }}>
                    <Typography sx={{ fontWeight: 'bold', color: info.color, fontSize: '0.8rem' }}>{t}</Typography>
                    <Typography sx={{ fontSize: '0.65rem', color: '#4caf50', fontWeight: 'bold', mb: 0.3 }}>De: {periciaOrigem}</Typography>
                    <Typography sx={{ fontSize: '0.7rem', color: '#cbd5e1' }}>{info.desc}</Typography>
                  </Box>
                }>
                  <Box sx={{ 
                    width: 40, height: 40, borderRadius: 2, bgcolor: 'rgba(0,0,0,0.75)', border: `2px solid ${info.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, boxShadow: `0 0 10px ${info.color}88`, pointerEvents: (collapsed || minimizado) ? 'none' : 'auto', cursor: 'help',
                    // 🟢 Animação de Sugar
                    opacity: (collapsed || minimizado) ? 0 : 1,
                    transform: (collapsed || minimizado) ? "translateX(-40px) scale(0.5)" : "translateX(0) scale(1)",
                    transition: "opacity 0.3s ease, transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
                  }}>
                    {info.icon}
                  </Box>
                </Tooltip>
              );
            })}
          </Box>
        );
      })()}

      {/* 🟢 PAINEL DIREITO 2: TALENTOS (VISÍVEL APENAS PARA O JOGADOR) */}
      {!isMaster && userEmail !== "mestre@reqviemrpg.com" && (() => {
        const playerFicha = fichasMap[userEmail] || {};
        // 🟢 Correção: .split(";").map(t => t.trim()) limpa os espaços extras
        const talentosList = playerFicha.caracteristicas ? playerFicha.caracteristicas.split(";").map(t => t.trim()).filter(Boolean) : [];
        if (talentosList.length === 0) return null;

        return (
          <Box sx={{
            position: "fixed",
            top: 0,
            left: 0,
            transform: `translate(${posicaoLocal.x + tamanho.width + 55}px, ${posicaoLocal.y}px)`,
            zIndex: 119999,
            display: "flex",
            flexDirection: "column",
            gap: 0.8,
            pointerEvents: "none",
            transition: dragging ? "none" : "transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
          }}>
            {talentosList.map(t => {
              const info = TALENTOS_ICONS[t] || { icon: "❓", color: "#888", desc: "Talento Desconhecido." };
              return (
                <Tooltip key={t} arrow placement="right" title={
                  <Box sx={{ p: 0.5 }}>
                    <Typography sx={{ fontWeight: 'bold', color: info.color, fontSize: '0.8rem' }}>{t}</Typography>
                    <Typography sx={{ fontSize: '0.7rem', color: '#cbd5e1' }}>{info.desc}</Typography>
                  </Box>
                }>
                  <Box sx={{ 
                    width: 40, height: 40, borderRadius: 2, bgcolor: 'rgba(0,0,0,0.75)', border: `2px solid ${info.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, boxShadow: `0 0 10px ${info.color}88`, pointerEvents: (collapsed || minimizado) ? 'none' : 'auto', cursor: 'help',
                    // 🟢 Animação de Sugar
                    opacity: (collapsed || minimizado) ? 0 : 1,
                    transform: (collapsed || minimizado) ? "translateX(-40px) scale(0.5)" : "translateX(0) scale(1)",
                    transition: "opacity 0.3s ease, transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
                  }}>
                    {info.icon}
                  </Box>
                </Tooltip>
              );
            })}
          </Box>
        );
      })()}

      {/* 🟢 MODAL SORTE/AZAR */}
      <Dialog 
        open={sorteAzarOpen} 
        onClose={() => setSorteAzarOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: "#0f172a",
            border: "1px solid #1e293b",
            borderRadius: 2
          }
        }}
      >
        <DialogTitle sx={{ color: '#fff', display: 'flex', alignItems: 'center', gap: 1 }}>
          <span style={{ fontSize: '1.5rem' }}>🎲</span>
          Sorte/Azar
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <FormControl fullWidth size="small">
              <InputLabel sx={{ color: '#94a3b8' }}>Selecionar Jogador</InputLabel>
              <Select
                value={selectedSorteAzarPlayer}
                onChange={(e) => {
                  setSelectedSorteAzarPlayer(e.target.value);
                  setSorteAzarValue(sorteAzarJogadores[e.target.value] ?? 5.5);
                }}
                sx={{ color: '#fff', bgcolor: '#1a1a2e' }}
                                MenuProps={{
                  container: document.body,
                  PaperProps: { 
                    sx: { 
                      zIndex: 999999, 
                      bgcolor: '#1a1a2e', 
                      color: '#fff',
                      maxHeight: 300,
                      overflowY: 'auto',
                      '&::-webkit-scrollbar': { width: '4px' },
                      '&::-webkit-scrollbar-thumb': { background: 'rgba(255,255,255,0.3)', borderRadius: '10px' }
                    } 
                  }
                }}
              >
                                <MenuItem value="">-- selecione --</MenuItem>
                <MenuItem disabled sx={{ opacity: 1, borderBottom: '1px solid #4caf50', mt: 0.5 }}>
                  <Typography variant="caption" sx={{ color: '#4caf50', fontWeight: 'bold', fontSize: '0.65rem' }}>
                    ── PERSONAGENS DO JOGADOR ──
                  </Typography>
                </MenuItem>
                {pjEmails.map((email) => (
                  <MenuItem key={email} value={email} sx={{ pl: 3, fontSize: '0.8rem' }}>
                    {displayNameFor(email)}
                  </MenuItem>
                ))}
                {mergedEmails.some(e => fichasMap[e]?.tipoFicha === "PM") && (
                  <MenuItem disabled sx={{ opacity: 1, borderBottom: '1px solid #ff9800', mt: 0.5 }}>
                    <Typography variant="caption" sx={{ color: '#ff9800', fontWeight: 'bold', fontSize: '0.65rem' }}>
                      ── PERSONAGENS DO MESTRE ──
                    </Typography>
                  </MenuItem>
                )}
                {pmEmails.map((email) => (
                  <MenuItem key={email} value={email} sx={{ pl: 3, fontSize: '0.8rem' }}>
                    {displayNameFor(email)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {selectedSorteAzarPlayer && (
              <Box sx={{ px: 2 }}>
                <Typography sx={{ color: '#94a3b8', mb: 1, textAlign: 'center' }}>
                  Chance de dados bons: {Math.round((sorteAzarValue / 10) * 100)}%
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography sx={{ color: '#ef4444', fontWeight: 'bold' }}>😈</Typography>
                  <Slider
                    value={sorteAzarValue}
                    onChange={(e, val) => setSorteAzarValue(val)}
                    min={1}
                    max={10}
                    step={0.5}
                    marks={[
                      { value: 1, label: '1' },
                      { value: 5.5, label: '5.5' },
                      { value: 10, label: '10' },
                    ]}
                    sx={{
                      color: sorteAzarValue > 5.5 ? '#4caf50' : sorteAzarValue < 5.5 ? '#ef4444' : '#ff9800',
                      '& .MuiSlider-thumb': { width: 20, height: 20 },
                      '& .MuiSlider-markLabel': { color: '#94a3b8', fontSize: '0.7rem' },
                    }}
                  />
                  <Typography sx={{ color: '#4caf50', fontWeight: 'bold' }}>🍀</Typography>
                </Box>
                <Button 
                  variant="contained" 
                  fullWidth
                  onClick={() => {
                    salvarSorteAzar(selectedSorteAzarPlayer, sorteAzarValue);
                    setSelectedSorteAzarPlayer("");
                    setSorteAzarValue(5.5);
                  }}
                  sx={{ mt: 2, bgcolor: '#ff9800', '&:hover': { bgcolor: '#f57c00' } }}
                >
                  Aplicar
                </Button>
              </Box>
            )}
            <Divider sx={{ bgcolor: '#334155' }} />
            <Typography variant="subtitle2" sx={{ color: '#fff' }}>
              Jogadores afetados:
            </Typography>
            <Box sx={{ maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 1 }}>
              {Object.keys(sorteAzarJogadores).length === 0 && (
                <Typography variant="caption" sx={{ color: '#64748b' }}>Nenhum</Typography>
              )}
              {Object.entries(sorteAzarJogadores).map(([email, valor]) => (
                <Paper key={email} sx={{ p: 1.5, bgcolor: '#1a1a2e', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid #334155' }}>
                  <Box>
                    <Typography variant="body2" sx={{ color: '#fff', fontWeight: 'bold' }}>
                      {displayNameFor(email)}
                    </Typography>
                    <Typography variant="caption" sx={{ color: valor > 5.5 ? '#4caf50' : valor < 5.5 ? '#ef4444' : '#ff9800' }}>
                      {valor > 5.5 ? '🍀' : valor < 5.5 ? '😈' : '⚖️'} {Math.round((valor / 10) * 100)}%
                    </Typography>
                  </Box>
                  <IconButton size="small" onClick={() => removerSorteAzar(email)} sx={{ color: '#ef4444' }}>
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Paper>
              ))}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: '1px solid #334155' }}>
          <Button onClick={() => setSorteAzarOpen(false)} sx={{ color: '#94a3b8' }}>Fechar</Button>
        </DialogActions>
      </Dialog>
      {/* 🟢 MODAL DE COMÉRCIO */}
<CommerceHUD 
  isMaster={isMaster}
  visible={comercioOpen}
  onClose={() => setComercioOpen(false)}
  currentUserEmail={currentUserEmail}
/>
      {/* 🟢 PERFIL DETALHADO DO PERSONAGEM */}
      <PerfilDetalhado
        isMaster={isMaster}
        visible={perfilVisivel}
        onClose={() => setPerfilVisivel(false)}
        currentUserEmail={currentUserEmail}
        fichaData={fichasMap[currentUserEmail] || {}}
        fichasMap={fichasMap}
      />
      {/* 🟢 FUNDOS DAS FASES */}
      <Dialog
        open={bgDialogOpen}
        onClose={() => setBgDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: "#0f172a",
            border: "1px solid #1e293b",
            borderRadius: 2,
            backgroundImage: "linear-gradient(135deg, rgba(0,224,255,0.06), rgba(0,0,0,0.4))",
          },
        }}
      >
        <DialogTitle sx={{ color: "#00e0ff", display: "flex", alignItems: "center", gap: 1, borderBottom: "1px solid #1e293b" }}>
          <CloudUploadIcon />
          Fundos das Fases
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Typography variant="caption" sx={{ color: "#94a3b8", display: "block", mb: 2, fontSize: "0.7rem" }}>
            Envie uma imagem para cada fase do dia. Elas aparecem como plano de fundo do HUD quando a fase correspondente estiver ativa.
          </Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.2 }}>
            {[
              { key: "manha", label: "☀️ Manhã" },
              { key: "tarde", label: "🌤️ Tarde" },
              { key: "noite", label: "🌙 Noite" },
              { key: "madrugada", label: "✨ Madrugada" },
            ].map(({ key, label }) => (
              <Paper
                key={key}
                sx={{
                  p: 1.2,
                  bgcolor: "rgba(26,26,46,0.85)",
                  border: "1px solid #334155",
                  borderRadius: 1.5,
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                  transition: "all 0.2s",
                  "&:hover": { borderColor: "#00e0ff44" },
                }}
              >
                <Box
                  sx={{
                    width: 90,
                    height: 58,
                    borderRadius: 1,
                    overflow: "hidden",
                    bgcolor: "#0a0a0a",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    border: "1px solid #1e293b",
                  }}
                >
                  {hudBackgrounds[key] ? (
                    <img src={hudBackgrounds[key]} alt={label} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <Typography variant="caption" sx={{ color: "#475569", fontSize: "0.6rem" }}>
                      sem imagem
                    </Typography>
                  )}
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" sx={{ color: "#fff", fontWeight: 700, mb: 0.6 }}>
                    {label}
                  </Typography>
                  <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                    <Button
                      component="label"
                      size="small"
                      variant="contained"
                      disabled={uploadingBg === key}
                      startIcon={<CloudUploadIcon sx={{ fontSize: 14 }} />}
                      sx={{
                        bgcolor: "#00e0ff",
                        color: "#000",
                        fontSize: "0.65rem",
                        fontWeight: 800,
                        "&:hover": { bgcolor: "#22d3ee" },
                        "&.Mui-disabled": { bgcolor: "#334155", color: "#64748b" },
                      }}
                    >
                      {uploadingBg === key ? "Enviando..." : "Enviar"}
                      <input
                        type="file"
                        accept="image/*"
                        hidden
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) uploadBackground(key, file);
                          e.target.value = "";
                        }}
                      />
                    </Button>
                    {hudBackgrounds[key] && (
                      <Button
                        size="small"
                        onClick={() => removerBackground(key)}
                        sx={{ color: "#ef4444", fontSize: "0.65rem" }}
                      >
                        Remover
                      </Button>
                    )}
                  </Box>
                </Box>
              </Paper>
            ))}
          </Box>
        </DialogContent>
        <DialogActions sx={{ borderTop: "1px solid #1e293b", p: 2 }}>
          <Button onClick={() => setBgDialogOpen(false)} sx={{ color: "#94a3b8" }}>
            Fechar
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

Popover.defaultProps = {
  ...(Popover.defaultProps || {}),
  container: document.body,
  slotProps: {
    paper: {
      sx: {
        zIndex: 300000,
      },
    },
  },
};

function LightboxImage({ src, zoom, setZoom }) {
  const [position, setPosition] = React.useState({ x: 0, y: 0 });
  const [dragging, setDragging] = React.useState(false);
  const [start, setStart] = React.useState({ x: 0, y: 0 });

  const handleMouseDown = (e) => {
    e.preventDefault();
    setDragging(true);
    setStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  const handleMouseMove = (e) => {
    if (!dragging) return;
    setPosition({
      x: e.clientX - start.x,
      y: e.clientY - start.y,
    });
  };

  const handleMouseUp = () => setDragging(false);

  React.useEffect(() => {
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
      style={{
        transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
        maxWidth: "90vw",
        maxHeight: "90vh",
        cursor: dragging ? "grabbing" : "grab",
        userSelect: "none",
        transition: dragging ? "none" : "transform 0.2s ease",
      }}
    />
  );
}
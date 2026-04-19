import React, { useEffect, useRef, useState, useCallback } from "react";
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
} from "@mui/material";
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
import { collection, onSnapshot, getDocs, addDoc, deleteDoc, doc } from "firebase/firestore";
import { updateDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";
import TurnModal from "./TurnModal";
import "./FloatingHUDBackgrounds.css";
import { createPortal } from "react-dom";

function playSFX(path) {
  try {
    const audio = new Audio(path);
    audio.volume = 1;
    audio.play().catch(() => {});
  } catch {}
}

const PHASES = ["manhã", "tarde", "noite", "madrugada"];
const SEASONS = ["Primavera", "Verão", "Outono", "Inverno"];

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
  const [showTurnMenu, setShowTurnMenu] = useState(false);
  const [hudRect, setHudRect] = useState(null);
  const [fichasMap, setFichasMap] = useState({});
  const [loadingFichas, setLoadingFichas] = useState(false);
  // ================= PERFIS =================
const [profilesOpen, setProfilesOpen] = useState(false);
const [perfis, setPerfis] = useState([]);
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

  const playersFromXp = Object.keys(hud?.xpMap || {});
  const mergedEmails = Object.keys(fichasMap || {});
  const textShadow = "0px 0px 3px rgba(0,0,0,0.85)";

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
    function onMouseMove(e) {
      if (!dragging || !refBox.current) return;
      const newX = e.clientX - dragOffset.current.x;
      const newY = e.clientY - dragOffset.current.y;
      const boundedX = Math.max(8, Math.min(window.innerWidth - refBox.current.offsetWidth - 8, newX));
      const boundedY = Math.max(8, Math.min(window.innerHeight - refBox.current.offsetHeight - 8, newY));
      refBox.current.style.left = `${boundedX}px`;
      refBox.current.style.top = `${boundedY}px`;
    }
    function onMouseUp() {
  if (!dragging) return;
  setDragging(false);
  try {
    const rect = refBox.current.getBoundingClientRect();
    const pos = { x: rect.left, y: rect.top };
    setFloatingPosLocal(pos);
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
    if (!refBox.current || !hud) return;
    const pos = hud.floatingPos || { x: 20, y: 20 };
    try {
      const x = Math.max(8, Math.min(window.innerWidth - (refBox.current.offsetWidth || 640) - 8, pos.x));
      const y = Math.max(8, Math.min(window.innerHeight - (refBox.current.offsetHeight || 160) - 8, pos.y));
      refBox.current.style.left = `${x}px`;
      refBox.current.style.top = `${y}px`;
    } catch {}
  }, [hud]);

  useEffect(() => {
  if (refBox.current) {
    setHudRect(refBox.current.getBoundingClientRect());
  }
}, [collapsed, hud?.floatingPos]);

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
    console.log("handleTurnClick -> sync rect:", {
      rect,
      refBoxCurrent: !!refBox.current,
      hudRectBefore: hudRect,
      showTurnMenuBefore: showTurnMenu,
    });
  } catch {}
};

  const handleSelectTurn = async (email) => {
    const nome = (fichasMap[email]?.nome) || email;
    try {
      await setTurn({ id: email, nick: nome, email });
      handleCloseTurnModal();
      setShowTurnMenu(false);
      try { playSFX("/musicas/mudou_turno.mp3"); } catch {}
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

  const [minutesInput, setMinutesInput] = useState(1);
  const [secondsInput, setSecondsInput] = useState(0);
  const [lastSetSeconds, setLastSetSeconds] = useState(60);
  const [remaining, setRemaining] = useState(hud?.timer?.remaining ?? hud?.timer?.duration ?? 0);
  const [runningLocal, setRunningLocal] = useState(false);
  const intervalRef = useRef(null);

  const faseClass = (() => {
  switch (hud?.world?.phase) {
    case "manhã": return "fase-manha text-dark";
    case "tarde": return "fase-tarde text-dark";
    case "noite": return "fase-noite text-light";
    case "madrugada": return "fase-madrugada text-light";
    default: return "fase-manha text-dark";
  }
})();

console.log("HUD DEBUG:", {
  fichasMap,
  hud
});

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

// ================================
// SOM DO CRONÔMETRO: dispara no 1
// ================================
const prevRemainingRef = useRef(null);

useEffect(() => {
  const remaining = hud?.timer?.remaining;

  // evita tocar várias vezes enquanto o valor repete
  if (prevRemainingRef.current !== remaining) {
    if (remaining === 1) {
      console.log("🔔 TIMER: chegou no 1 → tocando SFX");
      playSFX("/musicas/cronometro_zerou.mp3");
    }
  }

  prevRemainingRef.current = remaining;
}, [hud?.timer?.remaining]);

// ======================
// SOM QUANDO O TURNO MUDA
// ======================
const prevTurnRef = useRef(null);

useEffect(() => {
  const atual = hud?.turn?.id || null;

  if (prevTurnRef.current === null) {
    prevTurnRef.current = atual;
    return;
  }

  if (prevTurnRef.current !== atual) {
    playSFX("/musicas/mudou_turno.mp3");
  }

  prevTurnRef.current = atual;
}, [hud?.turn?.id]);

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

  const displayTime = (secs) => {
    const s = Number(secs) || 0;
    const mm = Math.floor(s / 60);
    const ss = s % 60;
    return `${String(mm).padStart(1, "0")}:${String(ss).padStart(2, "0")}`;
  };

  if (!currentUserEmail) return null;
  if (loading) return null;

  const getBg = (phase) => {
    switch (phase) {
      case "manhã": return "linear-gradient(180deg,#fff9e6,#fff3c4)";
      case "tarde": return "linear-gradient(180deg,#fff0e0,#ffd1a8)";
      case "noite": return "linear-gradient(180deg,#071233,#0f284a)";
      case "madrugada": return "linear-gradient(180deg,#031026,#0a2440)";
      default: return "linear-gradient(180deg,#fff9e6,#fff3c4)";
    }
  };

  const displayNameFor = (email) => {
    if (!email) return "—";
    return fichasMap[email]?.nome || email;
  };

  const calcularStatus = (email) => {
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
};

  const CollapsedView = (
    <Paper
      elevation={12}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        px: 1,
        height: 80,
        width: 360,
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
  
console.log("FASE ATUAL:", hud?.world?.phase, "CLASS:", faseClass);

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
console.log("HUD DEBUG:", {
  fichasMap,
  hud
});
  return (
    <>
      <Box
  ref={refBox}
  className={`floating-hud ${faseClass}`}
  sx={{
    position: "fixed",
    left: hud?.floatingPos?.x ?? 20,
    top: hud?.floatingPos?.y ?? 20,
    zIndex: 120000,
    width: collapsed ? 360 : 540,
    maxWidth: "95vw",
    borderRadius: 2,
    p: collapsed ? 0.5 : 1,
    cursor: "grab",
    userSelect: "none",
    overflow: "visible",          // <-- IMPORTANTE PARA AS ANIMAÇÕES
    background: "inherit",
    color:
      hud?.world?.phase === "noite" || hud?.world?.phase === "madrugada"
        ? "#fff"
        : "#111",

    boxShadow: "0 12px 28px rgba(0,0,0,0.6)",
  }}
       onMouseDown={(e) => {
  const t = e.target;

  // Se o clique começou no botão do comércio (ou em qualquer filho dele), ignora todo o drag.
  if (t.closest && t.closest(".commerce-button")) {
    // evita iniciar drag e impede qualquer efeito colateral
    e.stopPropagation();
    return;
  }

  // CHECAGEM: proteger contra elementos controláveis (botões, inputs, selects, svgs)
  // importante: parênteses garantem a lógica correta
  if (
    !t.closest("button") &&
    !t.closest("input") &&
    !t.closest("select") &&
    !t.closest("svg") &&
    !t.closest("a") // adiciona anchors também
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
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, width: "100%", mb: 0.5 }}>
              <DragIndicatorIcon sx={{ color: "inherit" }} />
              <Typography variant="h6" sx={{ fontWeight: 800, textShadow }}>
                {hud.turn?.nick ? `Turno atual: ${hud.turn.nick}` : "Turno: —"}
              </Typography>
              <Box sx={{ ml: "auto", display: "flex", gap: 0.5, alignItems: "center" }}>
                {isMaster && (
                  <IconButton size="small" onClick={handleTurnClick} title="Selecionar Turno" aria-label="selecionar-turno">
                    <ListIcon />
                  </IconButton>
                )}
                <IconButton
                  size="small"
                  onClick={() => {
                    if (showTurnMenu) setShowTurnMenu(false);
                    setCollapsed(true);
                  }}
                  title="Recolher HUD"
                  aria-label="recolher-hud"
                >
                  <ExpandLessIcon />
                </IconButton>
              </Box>
            </Box>

            {isMaster && showTurnMenu &&
  createPortal(
    <Paper
      elevation={12}
      sx={{
        position: "absolute",
        top:
          (refBox.current?.getBoundingClientRect()?.top ?? 100) +
          window.scrollY +
          60,
        left:
          (refBox.current?.getBoundingClientRect()?.left ?? 100) +
          window.scrollX,
        zIndex: 999999999,
        minWidth: 240,
        maxWidth: 320,
        p: 2,
        bgcolor: "rgba(25,25,25,0.95)",
        backdropFilter: "blur(6px)",
        color: "inherit",
        borderRadius: 2,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      
      <Typography sx={{ fontWeight: 700, mb: 1 }}>
        Selecionar turno
      </Typography>

      {mergedEmails.length === 0 ? (
        <Typography variant="caption">Nenhuma ficha registrada</Typography>
      ) : (
        (mergedEmails || []).map((email) => (
          <Button
            key={email}
            fullWidth
            sx={{
              justifyContent: "flex-start",
              textTransform: "none",
              color: "inherit",
              mb: 0.5,
            }}
            onClick={() => {
              handleSelectTurn(email);
              setShowTurnMenu(false);
            }}
          >
            {displayNameFor(email)}
          </Button>
        ))
      )}

      <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 1 }}>
        <Button onClick={() => setShowTurnMenu(false)}>Fechar</Button>
      </Box>
    </Paper>,
    document.body
  )
}
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: 1.2,
                mt: 1,
              }}
            >
              <Box sx={{ width: "100%", display: "flex", flexDirection: "column", gap: 0.5 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Box
                    sx={{
                      width: 44,
                      height: 44,
                      borderRadius: 1.5,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "rgba(255,255,255,0.12)",
                    }}
                  >
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
                        const stationIndex = SEASONS.indexOf(season);
                        const stationNum = stationIndex >= 0 ? stationIndex + 1 : 1;
                        return `${season} — ${day}/${stationNum}/${year}`;
                      })()}
                    </Typography>

                    <Typography variant="caption" sx={{ textShadow }}>
                      Fase: {hud.world?.phase ?? "—"}
                    </Typography>
                  </Box>
                </Box>

                {/** ———————————————————————————————————————————————— */}
                {/** AQUI ENTRA A OPÇÃO A (SELECT DE FASE)             */}
                {/** ———————————————————————————————————————————————— */}

                {isMaster && (
                  <Box sx={{ display: "flex", gap: 2, mt: 1, flexWrap: "wrap" }}>
                    <FormControl size="small" sx={{ minWidth: 140 }}>
                      <InputLabel>Fase</InputLabel>
                      <Select
  value={hud.world?.phase || "manhã"}
  label="Fase"
  onChange={(e) => setWorldPhase(e.target.value)}
  MenuProps={{
    disablePortal: false,
    container: typeof document !== "undefined" ? document.body : undefined,
    PaperProps: {
      sx: {
        zIndex: 140000,
        backdropFilter: "blur(4px)",
      },
    },
    anchorOrigin: { vertical: "bottom", horizontal: "left" },
    transformOrigin: { vertical: "top", horizontal: "left" },
  }}
>
  {PHASES.map((p) => (
    <MenuItem key={p} value={p}>
      {p}
    </MenuItem>
  ))}
</Select>

                    </FormControl>

                    <Box sx={{ display: "flex", gap: 1 }}>
                      <TextField
                        size="small"
                        label="Dia"
                        type="number"
                        value={hud.world?.day ?? ""}
                        onChange={(e) =>
                          setWorldSeasonDayYear({
                            season: hud.world?.season,
                            day: Number(e.target.value || 1),
                            year: hud.world?.year,
                          })
                        }
                        sx={{ width: 70 }}
                      />
                      <TextField
                        size="small"
                        label="Estação"
                        type="number"
                        value={(() => {
                          const si = SEASONS.indexOf(hud.world?.season);
                          return si >= 0 ? si + 1 : 1;
                        })()}
                        onChange={(e) => {
                          let v = Number(e.target.value || 1);
                          if (v < 1) v = 1;
                          if (v > 4) v = 4;
                          setWorldSeasonDayYear({
                            season: SEASONS[v - 1],
                            day: hud.world?.day,
                            year: hud.world?.year,
                          });
                        }}
                        inputProps={{ min: 1, max: 4 }}
                        sx={{ width: 70 }}
                      />
                      <TextField
                        size="small"
                        label="Ano"
                        type="number"
                        value={hud.world?.year ?? ""}
                        onChange={(e) =>
                          setWorldSeasonDayYear({
                            season: hud.world?.season,
                            day: hud.world?.day,
                            year: Number(e.target.value || 1),
                          })
                        }
                        sx={{ width: 90 }}
                      />
                    </Box>
                  </Box>
                )}
              </Box>

              <Divider sx={{ width: "100%", opacity: 0.3 }} />

              <Box sx={{ width: "100%" }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, textShadow, mb: 0.5 }}>
                  XP
                </Typography>

                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  

                  <Box 
  sx={{ 
    display: "flex", 
    flexDirection: "column", 
    gap: 1,
    maxHeight: "400px",      // 🟢 ALTURA MÁXIMA FIXA
    overflowY: "auto",       // 🟢 ATIVA SCROLL VERTICAL
    pr: 1,                   // 🟢 Espaço para a barra de scroll
    "&::-webkit-scrollbar": {
      width: "6px",
    },
    "&::-webkit-scrollbar-track": {
      background: "rgba(255,255,255,0.1)",
      borderRadius: "10px",
    },
    "&::-webkit-scrollbar-thumb": {
      background: "rgba(255,255,255,0.3)",
      borderRadius: "10px",
      "&:hover": {
        background: "rgba(255,255,255,0.5)",
      },
    },
  }}
>
  {(isMaster ? mergedEmails : [currentUserEmail]).map((email) => {
    const status = calcularStatus(email);
    return (
      <Box key={email} sx={{ width: "100%" }}>
        {/* NOME + LEVEL */}
        <Box sx={{ display: "flex", justifyContent: "space-between" }}>
          <Typography variant="caption" sx={{ textShadow }}>
            {displayNameFor(email)}
          </Typography>
        </Box>

        {/* BARRAS PV / PE */}
        {status && (
          <Box sx={{ display: "flex", gap: 0.5, mb: 0.5 }}>
            {/* PV */}
            <Box sx={{ position: "relative", flex: 1 }}>
              <LinearProgress
                variant="determinate"
                value={status.pvPercent}
                sx={{
                  height: 6,
                  borderRadius: 4,
                  backgroundColor: "rgba(255,255,255,0.25)",
                  boxShadow: "inset 0 0 3px rgba(0,0,0,0.6)",
                  "& .MuiLinearProgress-bar": {
                    backgroundColor: "#ff0000",
                  },
                }}
              />
              <Box
                sx={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 9,
                  fontWeight: 700,
                  color: hud?.world?.phase === "noite" || hud?.world?.phase === "madrugada" ? "#fff" : "#111",
                  textShadow: hud?.world?.phase === "noite" || hud?.world?.phase === "madrugada" ? "0 0 4px rgba(0,0,0,0.9)" : "0 0 4px rgba(255,255,255,0.9)",
                  pointerEvents: "none",
                }}
              >
                {status.pvAtual}/{status.pvMax}
              </Box>
            </Box>

            {/* PE */}
            <Box sx={{ position: "relative", flex: 1 }}>
              <LinearProgress
                variant="determinate"
                value={status.pePercent}
                sx={{
                  height: 6,
                  borderRadius: 4,
                  backgroundColor: "rgba(255,255,255,0.25)",
                  boxShadow: "inset 0 0 3px rgba(0,0,0,0.6)",
                  "& .MuiLinearProgress-bar": {
                    backgroundColor: "#facc15",
                  },
                }}
              />
              <Box
                sx={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 9,
                  fontWeight: 700,
                  color: hud?.world?.phase === "noite" || hud?.world?.phase === "madrugada" ? "#fff" : "#111",
                  textShadow: hud?.world?.phase === "noite" || hud?.world?.phase === "madrugada" ? "0 0 4px rgba(0,0,0,0.9)" : "0 0 4px rgba(255,255,255,0.9)",
                  pointerEvents: "none",
                }}
              >
                {status.peAtual}/{status.peMax}
              </Box>
            </Box>
          </Box>
        )}

        {/* XP */}
        <Box sx={{ position: "relative", mt: 0.5 }}>
          <LinearProgress
            variant="determinate"
            value={hud.xpMap?.[email]?.xp ?? 0}
            sx={{
              height: 12,
              borderRadius: 6,
              backgroundColor: "rgba(255,255,255,0.15)",
              backdropFilter: "blur(4px)",
              boxShadow: "inset 0 0 4px rgba(0,0,0,0.6)",
              "& .MuiLinearProgress-bar": {
                backgroundColor: "#8ecaff",
                boxShadow: "0 0 8px rgba(142,202,255,0.7)",
              },
            }}
          />
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: 0.5,
              pointerEvents: "none",
              color: hud?.world?.phase === "noite" || hud?.world?.phase === "madrugada" ? "#fff" : "#111",
              textShadow: hud?.world?.phase === "noite" || hud?.world?.phase === "madrugada" ? "0 0 4px rgba(0,0,0,0.9)" : "0 0 4px rgba(255,255,255,0.9)",
            }}
          >
            LV {hud.xpMap?.[email]?.level ?? 1} — {hud.xpMap?.[email]?.xp ?? 0}/100
          </Box>
        </Box>
      </Box>
    );
  })}
</Box>
                  {/** ———————————————————————————————————————————————— */}
                  {/** AQUI ENTRA A OPÇÃO A (SELECT DE JOGADOR XP)      */}
                  {/** ———————————————————————————————————————————————— */}

                  {isMaster && (
                    <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
                      <TextField
                        size="small"
                        label="Valor"
                        type="number"
                        value={xpEditValue}
                        onChange={(e) => setXpEditValue(Number(e.target.value))}
                        sx={{ width: 80 }}
                      />

                      <FormControl size="small" sx={{ minWidth: 150 }}>
                        <InputLabel>Jogador</InputLabel>
                        <Select
  value={selectedPlayerForXP || ""}
  label="Jogador"
  onChange={(e) => setSelectedPlayerForXP(e.target.value)}
  MenuProps={{
    disablePortal: false,
    container: typeof document !== "undefined" ? document.body : undefined,
    PaperProps: {
      sx: {
        zIndex: 140000,
        backdropFilter: "blur(4px)",
      },
    },
    anchorOrigin: { vertical: "bottom", horizontal: "left" },
    transformOrigin: { vertical: "top", horizontal: "left" },
  }}
>
  <MenuItem value="">
    <em>-- selecione --</em>
  </MenuItem>

  {(mergedEmails || []).map((email) => (
    <MenuItem key={email} value={email}>
      {displayNameFor(email)}
    </MenuItem>
  ))}
</Select>

                      </FormControl>

                      <IconButton color="primary" onClick={handleGiveXP}>
                        <AddIcon />
                      </IconButton>

                      <IconButton color="secondary" onClick={handleRemoveXP}>
                        <RemoveIcon />
                      </IconButton>
                    </Box>
                  )}
                </Box>
              </Box>

              <Divider sx={{ width: "100%", opacity: 0.3 }} />

              <Box
                sx={{
                  width: "100%",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  pb: 1,
                  position: "relative",
                }}
              >
                <Paper
                  elevation={2}
                  sx={{
                    px: 2,
                    py: 1,
                    borderRadius: 1,
                    background: "rgba(0,0,0,0.25)",
                    mb: 1,
                  }}
                >
                  <Typography
                    variant="h5"
                    sx={{
                      fontWeight: 800,
                      fontFamily: "monospace",
                      textAlign: "center",
                      minWidth: 96,
                    }}
                  >
                    {displayTime(remaining)}
                  </Typography>
                </Paper>
<IconButton
  size="small"
  type="button"
  aria-label="Abrir comércio"
  className="commerce-button"
  
 onClick={(e) => {
  e.stopPropagation();
  e.preventDefault();
  if (window.__commerceVisible) {
    window.closeCommerceHUD?.();
    window.__commerceVisible = false;
  } else {
    window.openCommerceHUD?.({
      isMaster,
      currentUserEmail
    });
    window.__commerceVisible = true;
  }
}}

  sx={{
    position: "absolute",
    right: 10,
    bottom: 10,
    backgroundColor: "rgba(0,0,0,0.5)",
    color: "white",
    "&:hover": { backgroundColor: "rgba(0,0,0,0.7)" },
    width: 40,
    height: 40,
    zIndex: 20,
  }}
>
  <span style={{ fontSize: 20, pointerEvents: "none" }}>🏪</span>
</IconButton>
<IconButton
  size="small"
  aria-label="Abrir perfis"
  onClick={(e) => {
    e.stopPropagation();
    setProfilesOpen((prev) => !prev);
  }}
  sx={{
    position: "absolute",
    left: 10,
    bottom: 10,
    backgroundColor: "rgba(0,0,0,0.5)",
    color: "white",
    "&:hover": { backgroundColor: "rgba(0,0,0,0.7)" },
    width: 40,
    height: 40,
    zIndex: 20,
  }}
>
  <span style={{ fontSize: 20, pointerEvents: "none" }}>👥</span>
</IconButton>
                {isMaster && (
                  <Box
                    sx={{
                      display: "flex",
                      gap: 1,
                      alignItems: "center",
                      mt: 0.5,
                    }}
                  >
                    <TextField
                      size="small"
                      label="Min"
                      type="number"
                      inputProps={{ min: 0 }}
                      value={minutesInput}
                      onChange={(e) =>
                        setMinutesInput(Math.max(0, Number(e.target.value || 0)))
                      }
                      sx={{ width: 84 }}
                    />

                    <TextField
                      size="small"
                      label="Seg"
                      type="number"
                      inputProps={{ min: 0, max: 59 }}
                      value={secondsInput}
                      onChange={(e) => {
                        let v = Number(e.target.value || 0);
                        if (v < 0) v = 0;
                        if (v > 59) v = 59;
                        setSecondsInput(v);
                      }}
                      sx={{ width: 84 }}
                    />
                  </Box>
                )}

                {isMaster && (
                  <Box sx={{ display: "flex", gap: 1, alignItems: "center", mt: 1 }}>
                    <IconButton
                      onClick={runningLocal ? handleTimerPause : handleTimerPlay}
                      title={runningLocal ? "Pausar" : "Iniciar"}
                      size="small"
                      aria-label={runningLocal ? "pausar" : "iniciar"}
                    >
                      {runningLocal ? <PauseIcon /> : <PlayArrowIcon />}
                    </IconButton>

                    <IconButton
                      onClick={handleTimerReset}
                      title="Resetar"
                      size="small"
                      aria-label="resetar"
                    >
                      <RestartAltIcon />
                    </IconButton>
                  </Box>
                )}
              </Box>
            </Box>
          </Paper>
        )}
      </Box>
      {profilesOpen &&
  createPortal(
    <Paper
      elevation={16}
      sx={{
  position: "fixed",
  bottom: 100,
  left: 30,
  width: 500,            // 🔥 um pouco maior
  maxHeight: "80vh",     // 🔥 maior
  overflowY: "auto",     // 🔥 scroll ativo
  p: 2,
  borderRadius: 2,
  zIndex: 999999999,
  background: "rgba(20,20,20,0.95)",
  backdropFilter: "blur(6px)",
  color: "white",
}}
    >
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
        <Typography variant="h6">Perfis</Typography>

        {isMaster && (
          <Button
  size="small"
  variant="contained"
  onClick={() => {
    setNovoPerfil({
      nome: "",
      tipo: "npc",
      foto: "",
      descricao: "",
      resumo: "",
    });
    setOpenProfileDialog(true);
  }}
>
  + Novo
</Button>
        )}
      </Box>

      {perfis.map((p) => (
        <Paper
          key={`perfil-${p.id}`}
          sx={{
            p: 1.5,
            mb: 1.5,
            background: "rgba(255,255,255,0.05)",
          }}
        >
          <Box sx={{ display: "flex", gap: 1 }}>
            {p.foto && (
  <img
  src={p.foto}
  alt={p.nome}
  style={{ width: 60, height: 60, borderRadius: 8, cursor: "pointer" }}
  onClick={() => {
    setLightboxSrc(p.foto);
    setZoom(1);
    setLightboxOpen(true);
  }}
/>
)}
            <Box sx={{ flex: 1 }}>
              <Typography
  variant="subtitle1"
  sx={{
    color: "#fff",
    textShadow: "1px 1px 2px #000",
    fontWeight: 600
  }}
>
  {p.nome}
</Typography>

              <Typography
  variant="body2"
  sx={{
    color: "#fff",
    textShadow: "1px 1px 2px #000",
    whiteSpace: "pre-line"
  }}
>
  {p.descricao}
</Typography>

<Typography
  variant="body2"
  sx={{
    color: "#fff",
    textShadow: "1px 1px 2px #000",
    whiteSpace: "pre-line"
  }}
>
  {p.resumo}
</Typography>
            </Box>
          </Box>

          {isMaster && (
  <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
    <Button
  size="small"
  variant="outlined"
  onClick={() => {
    setNovoPerfil({
      id: p.id,
      nome: p.nome || "",
      tipo: p.tipo || "npc",
      foto: p.foto || "",
      descricao: p.descricao || "",
      resumo: p.resumo || "",
    });
    setOpenProfileDialog(true);
  }}
>
  Editar
</Button>

    <Button
  size="small"
  color="error"
  onClick={async () => {
    if (!p.id) return;

    await deleteDoc(doc(db, "perfis", p.id));
  }}
>
  Remover
</Button>
  </Box>
)}
        </Paper>
      ))}

      <Box sx={{ textAlign: "right", mt: 2 }}>
        <Button onClick={() => setProfilesOpen(false)}>
          Fechar
        </Button>
      </Box>
    </Paper>,
    document.body
  )
}
<Dialog
  open={openProfileDialog}
  onClose={() => setOpenProfileDialog(false)}
  maxWidth="sm"
  fullWidth
>
  <DialogTitle>Novo Perfil</DialogTitle>

  <DialogContent
    sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}
  >
    <TextField
      label="Nome"
      value={novoPerfil.nome}
      onChange={(e) =>
        setNovoPerfil({ ...novoPerfil, nome: e.target.value })
      }
    />
<FormControl fullWidth>
  <InputLabel>Tipo</InputLabel>
  <Select
    value={novoPerfil.tipo}
    label="Tipo"
    onChange={(e) =>
      setNovoPerfil({ ...novoPerfil, tipo: e.target.value })
    }
  >
    <MenuItem value="npc">NPC (PM)</MenuItem>
    <MenuItem value="player">Player (PJ)</MenuItem>
  </Select>
</FormControl>
    <Button
  variant="outlined"
  component="label"
  sx={{ mt: 2 }}
>
  Selecionar imagem
  <input
    type="file"
    hidden
    accept="image/*"
    onChange={async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      // 🔹 preview imediata
      const previewUrl = URL.createObjectURL(file);

      setNovoPerfil((p) => ({
        ...p,
        foto: previewUrl,
      }));

      // 🔹 upload para seu backend
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(
        "https://reqviem.onrender.com/upload",
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (data.url) {
        setNovoPerfil((p) => ({
          ...p,
          foto: data.url,
        }));
      }
    }}
  />
</Button>

{novoPerfil.foto ? (
  <Box
    component="img"
    src={novoPerfil.foto}
    sx={{
      mt: 2,
      width: 120,
      height: 120,
      borderRadius: 2,
      objectFit: "cover",
    }}
  />
) : null}

    <TextField
      label="Descrição"
      value={novoPerfil.descricao}
      onChange={(e) =>
        setNovoPerfil({ ...novoPerfil, descricao: e.target.value })
      }
    />

    <TextField
      label="Resumo"
      multiline
      rows={3}
      value={novoPerfil.resumo}
      onChange={(e) =>
        setNovoPerfil({ ...novoPerfil, resumo: e.target.value })
      }
    />
  </DialogContent>

  <DialogActions>
    <Button onClick={() => setOpenProfileDialog(false)}>
      Cancelar
    </Button>

    <Button
  variant="contained"
  onClick={async () => {
    try {
      const payload = {
        nome: novoPerfil.nome,
        tipo: novoPerfil.tipo,
        foto: novoPerfil.foto,
        descricao: novoPerfil.descricao,
        resumo: novoPerfil.resumo,
      };

      if (novoPerfil.id) {
        // 🔥 Atualiza se existir
        await updateDoc(
          doc(db, "perfis", novoPerfil.id),
          payload
        );
      } else {
        // 🔥 Cria novo
        await addDoc(
          collection(db, "perfis"),
          payload
        );
      }

      setOpenProfileDialog(false);

      setNovoPerfil({
        nome: "",
        tipo: "npc",
        foto: "",
        descricao: "",
        resumo: "",
      });

    } catch (err) {
      console.error("ERRO AO SALVAR PERFIL:", err);
    }
  }}
>
  Salvar
</Button>
  </DialogActions>
</Dialog>
      <Dialog
        open={openMasterDialogFallback}
        onClose={() => setOpenMasterDialogFallback(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Painel do Mestre (Fallback)</DialogTitle>

        <DialogContent>
          <Typography>
            Use o HUDMasterModal para ter painel completo — este é apenas um fallback rápido.
          </Typography>

          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Mudar fase / estação
            </Typography>

            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              {PHASES.map((p) => (
                <Button key={p} onClick={() => setWorldPhase(p)}>
                  {p}
                </Button>
              ))}
            </Box>
          </Box>

          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2">Ajuste rápido de tempo</Typography>

            <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
              <Typography variant="caption">
                Use a caixa para definir Minutos/Segundos
              </Typography>
            </Box>
          </Box>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setOpenMasterDialogFallback(false)}>Fechar</Button>
        </DialogActions>
      </Dialog>
      {lightboxOpen &&
  createPortal(
    <Box
      onClick={() => setLightboxOpen(false)}
      sx={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.92)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999999999,
      }}
    >
      <LightboxImage
        src={lightboxSrc}
        zoom={zoom}
        setZoom={setZoom}
      />
    </Box>,
    document.body
  )
}
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
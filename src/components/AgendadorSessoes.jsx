import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Box, Paper, Typography, Button, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, Chip, Divider, Avatar,
  FormControl, InputLabel, Select, MenuItem, Tabs, Tab,
  Snackbar, Alert, Badge,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import EventIcon from "@mui/icons-material/Event";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import ScheduleIcon from "@mui/icons-material/Schedule";
import { db } from "../firebaseConfig";
import { collection, doc, setDoc, deleteDoc, onSnapshot } from "firebase/firestore";

const HORAS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTOS = ["00", "15", "30", "45"];
const DURACOES = [
  { v: 60, l: "1h" },
  { v: 120, l: "2h" },
  { v: 180, l: "3h" },
  { v: 240, l: "4h" },
  { v: 300, l: "5h" },
  { v: 360, l: "6h" },
  { v: 480, l: "8h" },
];

const formatarDataBR = (iso) => {
  if (!iso) return "—";
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
};

const formatarDuracao = (min) => {
  const n = Number(min) || 0;
  const h = Math.floor(n / 60);
  const m = n % 60;
  if (h > 0 && m > 0) return `${h}h ${m}min`;
  if (h > 0) return `${h}h`;
  return `${m}min`;
};

const getTimestamp = (s) => new Date(`${s.data}T${s.hora}:00`).getTime();
const getFim = (s) => getTimestamp(s) + (Number(s.duracaoMinutos) || 0) * 60000;
const gerarIdSlot = () => `slot_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

function AgendadorSessoes({ userEmail, userNick, isMaster }) {
  const [fichasMap, setFichasMap] = useState({});
  const [open, setOpen] = useState(false);
  const [aba, setAba] = useState(0);
  const [sessoes, setSessoes] = useState([]);
  const [disponibilidades, setDisponibilidades] = useState({});
  const [modalSessao, setModalSessao] = useState(false);
  const [editandoSessao, setEditandoSessao] = useState(null);
  const [formSessao, setFormSessao] = useState({
    titulo: "", descricao: "", data: "", hora: "20:00", duracaoMinutos: 240,
  });
  const [modalSlot, setModalSlot] = useState(false);
  const [editandoSlot, setEditandoSlot] = useState(null);
  const [formSlot, setFormSlot] = useState({
    data: "", inicio: "20:00", fim: "23:00", observacao: "",
  });
  const [snackbar, setSnackbar] = useState({ open: false, msg: "", tipo: "info" });
  const [tituloPiscando, setTituloPiscando] = useState(false);
  const sessoesConhecidasRef = useRef(null);
  const alarmeDisparadoRef = useRef({});

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "fichas"),
      (snap) => {
        const map = {};
        snap.forEach((d) => {
          const data = d.data() || {};
          map[d.id] = { ...data, nome: data.nome || d.id };
        });
        setFichasMap(map);
      },
      (err) => console.error("[fichas] snapshot error:", err)
    );
    return () => unsub();
  }, []);

  const pjEmails = useMemo(() => {
    return Object.keys(fichasMap || {}).filter(
      (e) => (fichasMap[e]?.tipoFicha || "PJ") === "PJ" && e !== "mestre@reqviemrpg.com"
    );
  }, [fichasMap]);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "sessoes_agendadas"),
      (snap) => {
        const agora = Date.now();
        const arr = [];
        snap.forEach((d) => {
          const s = { id: d.id, ...d.data() };
          const fim = getFim(s);
          if (fim < agora) {
            deleteDoc(doc(db, "sessoes_agendadas", s.id)).catch(() => {});
            return;
          }
          const limite = getTimestamp(s) - 24 * 60 * 60 * 1000;
          if (agora >= limite) {
            const conf = s.confirmacoes || {};
            let mudou = false;
            const novas = { ...conf };
            Object.entries(novas).forEach(([email, c]) => {
              if (c.status === "pendente") {
                novas[email] = {
                  ...c,
                  status: "recusado",
                  respondidoEm: new Date().toISOString(),
                  autoAusente: true,
                };
                mudou = true;
              }
            });
            if (mudou) {
              setDoc(doc(db, "sessoes_agendadas", s.id), { confirmacoes: novas }, { merge: true }).catch(() => {});
              s.confirmacoes = novas;
            }
          }
          arr.push(s);
        });
        arr.sort((a, b) => getTimestamp(a) - getTimestamp(b));
        setSessoes(arr);
      },
      (err) => console.error("[sessoes_agendadas] snapshot error:", err)
    );
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "disponibilidade"),
      (snap) => {
        const agora = Date.now();
        const map = {};
        snap.forEach((d) => {
          const dados = d.data() || {};
          const slots = Array.isArray(dados.slots) ? dados.slots : [];
          const validos = slots.filter((slot) => {
            const fim = new Date(`${slot.data}T${slot.fim}:00`).getTime();
            return fim >= agora;
          });
          if (validos.length !== slots.length) {
            setDoc(doc(db, "disponibilidade", d.id), { slots: validos }, { merge: true }).catch(() => {});
          }
          map[d.id] = validos;
        });
        setDisponibilidades(map);
      },
      (err) => console.error("[disponibilidade] snapshot error:", err)
    );
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!userEmail) return;
    const idsAtuais = sessoes.map((s) => s.id);
    if (sessoesConhecidasRef.current === null) {
      sessoesConhecidasRef.current = new Set(idsAtuais);
      return;
    }
    if (!isMaster) {
      const novas = sessoes.filter((s) => !sessoesConhecidasRef.current.has(s.id));
      if (novas.length > 0) {
        const s = novas[0];
        setSnackbar({
          open: true,
          msg: `📅 Nova sessão agendada: "${s.titulo}" — ${formatarDataBR(s.data)} às ${s.hora}`,
          tipo: "info",
        });
      }
    }
    sessoesConhecidasRef.current = new Set(idsAtuais);
  }, [sessoes, userEmail, isMaster]);

  useEffect(() => {
    if (!userEmail || isMaster) {
      setTituloPiscando(false);
      return;
    }
    const agora = Date.now();
    const limites24h = 24 * 60 * 60 * 1000;
    let temPendente24h = false;
    sessoes.forEach((s) => {
      const inicio = getTimestamp(s);
      if (inicio <= agora) return;
      const tempoAte = inicio - agora;
      if (tempoAte > limites24h) return;
      const minhaConf = s.confirmacoes?.[userEmail];
      if (minhaConf && minhaConf.status === "pendente") {
        temPendente24h = true;
        if (!alarmeDisparadoRef.current[s.id]) {
          alarmeDisparadoRef.current[s.id] = true;
          try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = "sine";
            gain.gain.setValueAtTime(0.12, ctx.currentTime);
            osc.frequency.setValueAtTime(880, ctx.currentTime);
            osc.frequency.setValueAtTime(660, ctx.currentTime + 0.15);
            osc.frequency.setValueAtTime(880, ctx.currentTime + 0.3);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.55);
            osc.start();
            osc.stop(ctx.currentTime + 0.55);
          } catch (e) {}
          setSnackbar({
            open: true,
            msg: `⏰ Falta menos de 24h para "${s.titulo}" e você ainda não respondeu!`,
            tipo: "warning",
          });
        }
      }
    });
    setTituloPiscando(temPendente24h);
  }, [sessoes, userEmail, isMaster]);

  useEffect(() => {
    if (!tituloPiscando) return;
    const original = document.title;
    let visivel = false;
    const i = setInterval(() => {
      document.title = visivel ? original : "🔔 SESSÃO PENDENTE!";
      visivel = !visivel;
    }, 800);
    return () => {
      clearInterval(i);
      document.title = original;
    };
  }, [tituloPiscando]);

  const proximaSessao = useMemo(() => {
    const agora = Date.now();
    return sessoes.find((s) => getTimestamp(s) > agora) || null;
  }, [sessoes]);

  const minhaConfirmacao = proximaSessao?.confirmacoes?.[userEmail];

  const mostrarBadgePendente =
    !isMaster &&
    !!proximaSessao &&
    (minhaConfirmacao?.status || "pendente") === "pendente";

  const totalConfirmados = proximaSessao
    ? Object.values(proximaSessao.confirmacoes || {}).filter((c) => c.status === "confirmado").length
    : 0;
  const totalPendentes = proximaSessao
    ? Object.values(proximaSessao.confirmacoes || {}).filter((c) => c.status === "pendente").length
    : 0;

  const meusSlots = disponibilidades[userEmail] || [];

  const abrirNovaSessao = () => {
    setEditandoSessao(null);
    const daquiUmDia = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const iso = daquiUmDia.toISOString().split("T")[0];
    setFormSessao({
      titulo: "",
      descricao: "",
      data: iso,
      hora: "20:00",
      duracaoMinutos: 240,
    });
    setModalSessao(true);
  };

  const abrirEdicaoSessao = (s) => {
    setEditandoSessao(s);
    setFormSessao({
      titulo: s.titulo || "",
      descricao: s.descricao || "",
      data: s.data || "",
      hora: s.hora || "20:00",
      duracaoMinutos: s.duracaoMinutos || 240,
    });
    setModalSessao(true);
  };

  const salvarSessao = async () => {
    if (!isMaster) return;
    if (!formSessao.titulo.trim() || !formSessao.data || !formSessao.hora) {
      alert("Preencha título, data e hora!");
      return;
    }
    if (editandoSessao) {
      const updates = {
        titulo: formSessao.titulo.trim(),
        descricao: formSessao.descricao.trim(),
        data: formSessao.data,
        hora: formSessao.hora,
        duracaoMinutos: Number(formSessao.duracaoMinutos) || 240,
      };
      setSessoes((prev) =>
        prev
          .map((s) => (s.id === editandoSessao.id ? { ...s, ...updates } : s))
          .sort((a, b) => getTimestamp(a) - getTimestamp(b))
      );
      await setDoc(doc(db, "sessoes_agendadas", editandoSessao.id), updates, { merge: true });
    } else {
      const confirmacoes = {};
      pjEmails.forEach((email) => {
        confirmacoes[email] = { status: "pendente", respondidoEm: null };
      });
      const id = `ses_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
      const novaSessao = {
        id,
        titulo: formSessao.titulo.trim(),
        descricao: formSessao.descricao.trim(),
        data: formSessao.data,
        hora: formSessao.hora,
        duracaoMinutos: Number(formSessao.duracaoMinutos) || 240,
        criadoPor: userEmail,
        criadoEm: new Date().toISOString(),
        confirmacoes,
      };
      setSessoes((prev) =>
        [...prev, novaSessao].sort((a, b) => getTimestamp(a) - getTimestamp(b))
      );
      await setDoc(doc(db, "sessoes_agendadas", id), novaSessao);
    }
    setModalSessao(false);
    setEditandoSessao(null);
  };

  const apagarSessao = async (id) => {
    if (!isMaster) return;
    if (!window.confirm("Apagar esta sessão?")) return;
    setSessoes((prev) => prev.filter((s) => s.id !== id));
    await deleteDoc(doc(db, "sessoes_agendadas", id));
  };

  const responderSessao = async (sessao, status) => {
    const confirmacoes = { ...(sessao.confirmacoes || {}) };
    confirmacoes[userEmail] = {
      status,
      respondidoEm: new Date().toISOString(),
      nome: fichasMap[userEmail]?.nome || userNick || userEmail,
    };
    setSessoes((prev) =>
      prev.map((s) => (s.id === sessao.id ? { ...s, confirmacoes } : s))
    );
    await setDoc(
      doc(db, "sessoes_agendadas", sessao.id),
      { confirmacoes },
      { merge: true }
    );
  };

  const abrirNovoSlot = () => {
    setEditandoSlot(null);
    const iso = new Date().toISOString().split("T")[0];
    setFormSlot({ data: iso, inicio: "20:00", fim: "23:00", observacao: "" });
    setModalSlot(true);
  };

  const abrirEdicaoSlot = (slot) => {
    setEditandoSlot(slot);
    setFormSlot({
      data: slot.data || "",
      inicio: slot.inicio || "20:00",
      fim: slot.fim || "23:00",
      observacao: slot.observacao || "",
    });
    setModalSlot(true);
  };

  const salvarSlot = async () => {
    if (!formSlot.data || !formSlot.inicio || !formSlot.fim) {
      alert("Preencha data, início e fim!");
      return;
    }
    if (formSlot.inicio >= formSlot.fim) {
      alert("Horário de início deve ser antes do fim!");
      return;
    }
    const atual = meusSlots.slice();
    if (editandoSlot) {
      const idx = atual.findIndex((s) => s.id === editandoSlot.id);
      if (idx >= 0) {
        atual[idx] = {
          ...atual[idx],
          data: formSlot.data,
          inicio: formSlot.inicio,
          fim: formSlot.fim,
          observacao: formSlot.observacao.trim(),
        };
      }
    } else {
      atual.push({
        id: gerarIdSlot(),
        data: formSlot.data,
        inicio: formSlot.inicio,
        fim: formSlot.fim,
        observacao: formSlot.observacao.trim(),
        criadoEm: new Date().toISOString(),
      });
    }
    setDisponibilidades((prev) => ({ ...prev, [userEmail]: atual }));
    await setDoc(doc(db, "disponibilidade", userEmail), { slots: atual }, { merge: true });
    setModalSlot(false);
    setEditandoSlot(null);
  };

  const apagarSlot = async (id) => {
    if (!window.confirm("Remover este horário?")) return;
    const atual = meusSlots.filter((s) => s.id !== id);
    setDisponibilidades((prev) => ({ ...prev, [userEmail]: atual }));
    await setDoc(doc(db, "disponibilidade", userEmail), { slots: atual }, { merge: true });
  };

  const corStatus = (st) => {
    if (st === "confirmado") return "#4caf50";
    if (st === "recusado") return "#ef4444";
    return "#f59e0b";
  };

  const labelStatus = (st) => {
    if (st === "confirmado") return "✓ Confirmado";
    if (st === "recusado") return "✗ Recusado";
    return "⏳ Pendente";
  };

  return (
    <>
      <Paper
        onClick={() => setOpen(true)}
        sx={{
          p: 1,
          mb: 1,
          bgcolor: "#0f172a",
          border: "1px solid rgba(0, 224, 255, 0.3)",
          borderRadius: 2,
          display: "flex",
          alignItems: "center",
          gap: 1,
          cursor: "pointer",
          transition: "all 0.2s",
          "&:hover": { borderColor: "#00e0ff", boxShadow: "0 0 12px rgba(0, 224, 255, 0.3)" },
        }}
      >
        {mostrarBadgePendente ? (
          <Badge
            color="error"
            variant="dot"
            sx={{
              "& .MuiBadge-badge": {
                animation: "pulseDot 1.5s infinite",
                "@keyframes pulseDot": {
                  "0%": { transform: "scale(1)", opacity: 1 },
                  "50%": { transform: "scale(1.35)", opacity: 0.7 },
                  "100%": { transform: "scale(1)", opacity: 1 },
                },
              },
            }}
          >
            <EventIcon sx={{ color: "#00e0ff" }} />
          </Badge>
        ) : (
          <EventIcon sx={{ color: "#00e0ff" }} />
        )}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="caption" sx={{ color: "#00e0ff", fontWeight: "bold", fontSize: "0.65rem" }}>
            AGENDA DE SESSÕES
          </Typography>
          {proximaSessao ? (
            <Typography variant="body2" sx={{ color: "#fff", fontWeight: "bold", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {proximaSessao.titulo} — {formatarDataBR(proximaSessao.data)} às {proximaSessao.hora} ({formatarDuracao(proximaSessao.duracaoMinutos)})
            </Typography>
          ) : (
            <Typography variant="body2" sx={{ color: "#94a3b8" }}>
              Nenhuma sessão agendada
            </Typography>
          )}
        </Box>
        {proximaSessao && (
          <Box sx={{ display: "flex", gap: 0.5, alignItems: "center", flexShrink: 0 }}>
            {isMaster ? (
              <Chip
                label={`${totalConfirmados} confirmado${totalConfirmados !== 1 ? "s" : ""}${totalPendentes > 0 ? ` • ${totalPendentes} pendente${totalPendentes !== 1 ? "s" : ""}` : ""}`}
                size="small"
                sx={{ bgcolor: "rgba(0, 224, 255, 0.15)", color: "#00e0ff", fontWeight: "bold", fontSize: "0.6rem" }}
              />
            ) : (
              <Chip
                label={labelStatus(minhaConfirmacao?.status || "pendente")}
                size="small"
                sx={{
                  bgcolor: `${corStatus(minhaConfirmacao?.status || "pendente")}22`,
                  color: corStatus(minhaConfirmacao?.status || "pendente"),
                  fontWeight: "bold",
                  fontSize: "0.6rem",
                  border: `1px solid ${corStatus(minhaConfirmacao?.status || "pendente")}66`,
                  ...((minhaConfirmacao?.status || "pendente") === "pendente" && {
                    animation: "pulseNotif 1.5s infinite",
                    "@keyframes pulseNotif": {
                      "0%": { boxShadow: "0 0 0px #f59e0b" },
                      "50%": { boxShadow: "0 0 14px #f59e0b, 0 0 24px #f59e0b66" },
                      "100%": { boxShadow: "0 0 0px #f59e0b" },
                    },
                  }),
                }}
              />
            )}
          </Box>
        )}
        <Button size="small" sx={{ color: "#00e0ff", fontWeight: "bold", fontSize: "0.7rem", minWidth: "auto" }}>
          ABRIR
        </Button>
      </Paper>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: "#0f172a",
            border: "2px solid #00e0ff",
            borderRadius: 3,
            background: "linear-gradient(145deg, #0f172a, #1a1a2e)",
            boxShadow: "0 0 40px rgba(0, 224, 255, 0.3)",
            minHeight: "70vh",
          },
        }}
      >
        <DialogTitle sx={{
          color: "#00e0ff",
          display: "flex",
          alignItems: "center",
          gap: 1,
          borderBottom: "1px solid rgba(0, 224, 255, 0.3)",
          background: "linear-gradient(90deg, rgba(0, 224, 255, 0.15), transparent)",
        }}>
          <EventIcon />
          <Typography variant="h6" sx={{ fontWeight: "bold", flex: 1 }}>
            Agenda de Sessões
          </Typography>
          <IconButton onClick={() => setOpen(false)} sx={{ color: "#94a3b8" }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <Tabs
          value={aba}
          onChange={(_, v) => setAba(v)}
          sx={{
            borderBottom: "1px solid rgba(0, 224, 255, 0.2)",
            "& .MuiTab-root": { color: "#94a3b8", fontWeight: "bold", fontSize: "0.75rem" },
            "& .Mui-selected": { color: "#00e0ff !important" },
            "& .MuiTabs-indicator": { bgcolor: "#00e0ff" },
          }}
        >
          <Tab label="📅 SESSÕES" />
          <Tab label="🕐 MINHA DISPONIBILIDADE" />
          {isMaster && <Tab label="👥 TODOS OS JOGADORES" />}
        </Tabs>

        <DialogContent sx={{ pt: 2 }}>
          {aba === 0 && (
            <Box>
              {isMaster && (
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={abrirNovaSessao}
                  sx={{ bgcolor: "#4caf50", mb: 2, "&:hover": { bgcolor: "#388e3c" } }}
                >
                  Nova Sessão
                </Button>
              )}

              {sessoes.length === 0 && (
                <Typography sx={{ color: "#64748b", textAlign: "center", py: 4 }}>
                  Nenhuma sessão agendada no momento.
                </Typography>
              )}

              {sessoes.map((s) => {
                const confirmacoes = s.confirmacoes || {};
                const confirmados = Object.entries(confirmacoes).filter(([, c]) => c.status === "confirmado");
                const recusados = Object.entries(confirmacoes).filter(([, c]) => c.status === "recusado");
                const pendentes = Object.entries(confirmacoes).filter(([, c]) => c.status === "pendente");
                const minhaConf = confirmacoes[userEmail]?.status;

                return (
                  <Paper
                    key={s.id}
                    sx={{
                      p: 2,
                      mb: 1.5,
                      bgcolor: "#1a1a2e",
                      border: "1px solid #334155",
                      borderRadius: 2,
                    }}
                  >
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 1, mb: 1 }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="h6" sx={{ color: "#fff", fontWeight: "bold" }}>
                          {s.titulo}
                        </Typography>
                        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 0.5 }}>
                          <Chip label={`📅 ${formatarDataBR(s.data)}`} size="small" sx={{ bgcolor: "#1e3a5f", color: "#00e0ff", fontSize: "0.65rem" }} />
                          <Chip label={`🕐 ${s.hora}`} size="small" sx={{ bgcolor: "#1e3a5f", color: "#00e0ff", fontSize: "0.65rem" }} />
                          <Chip label={`⏱️ ${formatarDuracao(s.duracaoMinutos)}`} size="small" sx={{ bgcolor: "#1e3a5f", color: "#00e0ff", fontSize: "0.65rem" }} />
                        </Box>
                        {s.descricao && (
                          <Typography variant="caption" sx={{ color: "#94a3b8", display: "block", mt: 1, whiteSpace: "pre-line" }}>
                            {s.descricao}
                          </Typography>
                        )}
                      </Box>
                      {isMaster && (
                        <Box sx={{ display: "flex", gap: 0.5 }}>
                          <IconButton size="small" onClick={() => abrirEdicaoSessao(s)} sx={{ color: "#ff9800" }}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton size="small" onClick={() => apagarSessao(s.id)} sx={{ color: "#ef4444" }}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      )}
                    </Box>

                    {!isMaster && confirmacoes[userEmail] && (
                      <Box sx={{ display: "flex", gap: 1, mb: 1.5 }}>
                        <Button
                          size="small"
                          variant={minhaConf === "confirmado" ? "contained" : "outlined"}
                          startIcon={<CheckCircleIcon />}
                          onClick={() => responderSessao(s, "confirmado")}
                          sx={{
                            flex: 1,
                            color: minhaConf === "confirmado" ? "#fff" : "#4caf50",
                            bgcolor: minhaConf === "confirmado" ? "#4caf50" : "transparent",
                            borderColor: "#4caf50",
                            fontWeight: "bold",
                            "&:hover": { bgcolor: minhaConf === "confirmado" ? "#388e3c" : "rgba(76, 175, 80, 0.15)" },
                          }}
                        >
                          Confirmar
                        </Button>
                        <Button
                          size="small"
                          variant={minhaConf === "recusado" ? "contained" : "outlined"}
                          startIcon={<CancelIcon />}
                          onClick={() => responderSessao(s, "recusado")}
                          sx={{
                            flex: 1,
                            color: minhaConf === "recusado" ? "#fff" : "#ef4444",
                            bgcolor: minhaConf === "recusado" ? "#ef4444" : "transparent",
                            borderColor: "#ef4444",
                            fontWeight: "bold",
                            "&:hover": { bgcolor: minhaConf === "recusado" ? "#dc2626" : "rgba(239, 68, 68, 0.15)" },
                          }}
                        >
                          Recusar
                        </Button>
                      </Box>
                    )}

                    <Divider sx={{ my: 1, borderColor: "#334155" }} />

                    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                      <Typography variant="caption" sx={{ color: "#00e0ff", fontWeight: "bold", fontSize: "0.65rem" }}>
                        CONFIRMAÇÕES ({confirmados.length}/{Object.keys(confirmacoes).length})
                      </Typography>
                      {confirmados.map(([email, c]) => (
                        <Box key={email} sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                          <CheckCircleIcon sx={{ fontSize: 14, color: "#4caf50" }} />
                          <Typography variant="caption" sx={{ color: "#4caf50" }}>
                            {fichasMap[email]?.nome || c.nome || email}
                          </Typography>
                        </Box>
                      ))}
                      {pendentes.map(([email, c]) => (
                        <Box key={email} sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                          <ScheduleIcon sx={{ fontSize: 14, color: "#f59e0b" }} />
                          <Typography variant="caption" sx={{ color: "#f59e0b" }}>
                            {fichasMap[email]?.nome || c.nome || email} (pendente)
                          </Typography>
                        </Box>
                      ))}
                      {recusados.map(([email, c]) => (
                        <Box key={email} sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                          <CancelIcon sx={{ fontSize: 14, color: "#ef4444" }} />
                          <Typography variant="caption" sx={{ color: "#ef4444" }}>
                            {fichasMap[email]?.nome || c.nome || email}
                            {c.autoAusente && " (ausência automática)"}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  </Paper>
                );
              })}
            </Box>
          )}

          {aba === 1 && (
            <Box>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={abrirNovoSlot}
                sx={{ bgcolor: "#4caf50", mb: 2, "&:hover": { bgcolor: "#388e3c" } }}
              >
                Adicionar Horário Disponível
              </Button>

              {meusSlots.length === 0 && (
                <Typography sx={{ color: "#64748b", textAlign: "center", py: 4 }}>
                  Você ainda não marcou nenhum horário disponível.
                </Typography>
              )}

              {meusSlots.map((slot) => (
                <Paper
                  key={slot.id}
                  sx={{
                    p: 1.5,
                    mb: 1,
                    bgcolor: "#1a1a2e",
                    border: "1px solid #334155",
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                  }}
                >
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" sx={{ color: "#fff", fontWeight: "bold" }}>
                      📅 {formatarDataBR(slot.data)} — 🕐 {slot.inicio} às {slot.fim}
                    </Typography>
                    {slot.observacao && (
                      <Typography variant="caption" sx={{ color: "#94a3b8", display: "block" }}>
                        {slot.observacao}
                      </Typography>
                    )}
                  </Box>
                  <IconButton size="small" onClick={() => abrirEdicaoSlot(slot)} sx={{ color: "#ff9800" }}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" onClick={() => apagarSlot(slot.id)} sx={{ color: "#ef4444" }}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Paper>
              ))}
            </Box>
          )}

          {isMaster && aba === 2 && (
            <Box>
              {pjEmails.length === 0 && (
                <Typography sx={{ color: "#64748b", textAlign: "center", py: 4 }}>
                  Nenhum jogador cadastrado.
                </Typography>
              )}
              {pjEmails.map((email) => {
                const slots = disponibilidades[email] || [];
                return (
                  <Paper
                    key={email}
                    sx={{
                      p: 1.5,
                      mb: 1,
                      bgcolor: "#1a1a2e",
                      border: `1px solid ${slots.length > 0 ? "#4caf50" : "#334155"}`,
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                      <Avatar sx={{ width: 26, height: 26, bgcolor: "#00e0ff33", color: "#00e0ff", fontSize: 12 }}>
                        {(fichasMap[email]?.nome || email)[0]?.toUpperCase()}
                      </Avatar>
                      <Typography variant="body2" sx={{ color: "#fff", fontWeight: "bold", flex: 1 }}>
                        {fichasMap[email]?.nome || email}
                      </Typography>
                      <Chip
                        label={`${slots.length} horário${slots.length !== 1 ? "s" : ""}`}
                        size="small"
                        sx={{
                          bgcolor: slots.length > 0 ? "#4caf5022" : "#33415522",
                          color: slots.length > 0 ? "#4caf50" : "#64748b",
                          fontSize: "0.6rem",
                        }}
                      />
                    </Box>
                    {slots.length > 0 && (
                      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.3, pl: 1 }}>
                        {slots.map((slot) => (
                          <Typography key={slot.id} variant="caption" sx={{ color: "#94a3b8" }}>
                            • {formatarDataBR(slot.data)} — {slot.inicio} às {slot.fim}
                            {slot.observacao && ` — ${slot.observacao}`}
                          </Typography>
                        ))}
                      </Box>
                    )}
                    {slots.length === 0 && (
                      <Typography variant="caption" sx={{ color: "#64748b", pl: 1 }}>
                        Sem horários marcados.
                      </Typography>
                    )}
                  </Paper>
                );
              })}
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2, borderTop: "1px solid rgba(0, 224, 255, 0.3)" }}>
          <Typography variant="caption" sx={{ color: "#64748b", flex: 1, fontSize: "0.65rem" }}>
            ⏰ Ausência em até 24h antes = recusa automática • Sessões passadas são removidas
          </Typography>
          <Button onClick={() => setOpen(false)} sx={{ color: "#94a3b8" }}>
            Fechar
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={modalSessao}
        onClose={() => setModalSessao(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { bgcolor: "#0f172a", border: "1px solid #1e293b", borderRadius: 2 } }}
      >
        <DialogTitle sx={{ color: "#00e0ff" }}>
          {editandoSessao ? "✏️ Editar Sessão" : "➕ Nova Sessão"}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}>
            <TextField
              label="Título da Sessão"
              fullWidth
              size="small"
              value={formSessao.titulo}
              onChange={(e) => setFormSessao((p) => ({ ...p, titulo: e.target.value }))}
              InputProps={{ sx: { color: "#fff" } }}
              InputLabelProps={{ sx: { color: "#94a3b8" } }}
              placeholder="Ex: A Queda de Auraxia"
            />
            <TextField
              label="Descrição / Pauta"
              fullWidth
              size="small"
              multiline
              rows={3}
              value={formSessao.descricao}
              onChange={(e) => setFormSessao((p) => ({ ...p, descricao: e.target.value }))}
              InputProps={{ sx: { color: "#fff" } }}
              InputLabelProps={{ sx: { color: "#94a3b8" } }}
              placeholder="O que vai rolar, o que trazer, etc."
            />
            <TextField
              label="Data"
              type="date"
              fullWidth
              size="small"
              value={formSessao.data}
              onChange={(e) => setFormSessao((p) => ({ ...p, data: e.target.value }))}
              InputProps={{ sx: { color: "#fff" } }}
              InputLabelProps={{ sx: { color: "#94a3b8", shrink: true } }}
            />
            <Box sx={{ display: "flex", gap: 1 }}>
              <FormControl fullWidth size="small">
                <InputLabel sx={{ color: "#94a3b8" }}>Hora</InputLabel>
                <Select
                  value={formSessao.hora}
                  onChange={(e) => setFormSessao((p) => ({ ...p, hora: e.target.value }))}
                  sx={{ color: "#fff", bgcolor: "#1a1a2e" }}
                >
                  {HORAS.flatMap((h) =>
                    MINUTOS.map((m) => (
                      <MenuItem key={`${h}:${m}`} value={`${h}:${m}`}>
                        {h}:{m}
                      </MenuItem>
                    ))
                  )}
                </Select>
              </FormControl>
              <FormControl fullWidth size="small">
                <InputLabel sx={{ color: "#94a3b8" }}>Duração</InputLabel>
                <Select
                  value={formSessao.duracaoMinutos}
                  onChange={(e) => setFormSessao((p) => ({ ...p, duracaoMinutos: e.target.value }))}
                  sx={{ color: "#fff", bgcolor: "#1a1a2e" }}
                >
                  {DURACOES.map((d) => (
                    <MenuItem key={d.v} value={d.v}>{d.l}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModalSessao(false)} sx={{ color: "#94a3b8" }}>
            Cancelar
          </Button>
          <Button variant="contained" onClick={salvarSessao} sx={{ bgcolor: "#4caf50" }}>
            {editandoSessao ? "Salvar" : "Agendar"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={modalSlot}
        onClose={() => setModalSlot(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { bgcolor: "#0f172a", border: "1px solid #1e293b", borderRadius: 2 } }}
      >
        <DialogTitle sx={{ color: "#00e0ff" }}>
          {editandoSlot ? "✏️ Editar Horário" : "🕐 Marcar Disponibilidade"}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}>
            <TextField
              label="Data"
              type="date"
              fullWidth
              size="small"
              value={formSlot.data}
              onChange={(e) => setFormSlot((p) => ({ ...p, data: e.target.value }))}
              InputProps={{ sx: { color: "#fff" } }}
              InputLabelProps={{ sx: { color: "#94a3b8", shrink: true } }}
            />
            <Box sx={{ display: "flex", gap: 1 }}>
              <FormControl fullWidth size="small">
                <InputLabel sx={{ color: "#94a3b8" }}>Início</InputLabel>
                <Select
                  value={formSlot.inicio}
                  onChange={(e) => setFormSlot((p) => ({ ...p, inicio: e.target.value }))}
                  sx={{ color: "#fff", bgcolor: "#1a1a2e" }}
                >
                  {HORAS.flatMap((h) =>
                    MINUTOS.map((m) => (
                      <MenuItem key={`i-${h}:${m}`} value={`${h}:${m}`}>
                        {h}:{m}
                      </MenuItem>
                    ))
                  )}
                </Select>
              </FormControl>
              <FormControl fullWidth size="small">
                <InputLabel sx={{ color: "#94a3b8" }}>Fim</InputLabel>
                <Select
                  value={formSlot.fim}
                  onChange={(e) => setFormSlot((p) => ({ ...p, fim: e.target.value }))}
                  sx={{ color: "#fff", bgcolor: "#1a1a2e" }}
                >
                  {HORAS.flatMap((h) =>
                    MINUTOS.map((m) => (
                      <MenuItem key={`f-${h}:${m}`} value={`${h}:${m}`}>
                        {h}:{m}
                      </MenuItem>
                    ))
                  )}
                </Select>
              </FormControl>
            </Box>
            <TextField
              label="Observação (opcional)"
              fullWidth
              size="small"
              value={formSlot.observacao}
              onChange={(e) => setFormSlot((p) => ({ ...p, observacao: e.target.value }))}
              InputProps={{ sx: { color: "#fff" } }}
              InputLabelProps={{ sx: { color: "#94a3b8" } }}
              placeholder="Ex: só depois das 22h, prefiro sábado, etc."
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModalSlot(false)} sx={{ color: "#94a3b8" }}>
            Cancelar
          </Button>
          <Button variant="contained" onClick={salvarSlot} sx={{ bgcolor: "#4caf50" }}>
            {editandoSlot ? "Salvar" : "Marcar"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar((p) => ({ ...p, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert
          onClose={() => setSnackbar((p) => ({ ...p, open: false }))}
          severity={snackbar.tipo}
          variant="filled"
          sx={{
            bgcolor:
              snackbar.tipo === "warning"
                ? "#f59e0b"
                : snackbar.tipo === "error"
                ? "#ef4444"
                : "#00e0ff",
            color: "#000",
            fontWeight: "bold",
            border: "1px solid rgba(0,0,0,0.3)",
          }}
        >
          {snackbar.msg}
        </Alert>
      </Snackbar>
    </>
  );
}

export default React.memo(AgendadorSessoes);
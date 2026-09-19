// src/components/HackeamentoGame.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  Box, Paper, Typography, IconButton, Button, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField,
  LinearProgress, Chip, Grid, Card, CardContent,
  FormControl, InputLabel, Select, MenuItem,
  CircularProgress, Zoom,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import MinimizeIcon from "@mui/icons-material/Minimize";
import SecurityIcon from "@mui/icons-material/Security";
import ShieldIcon from "@mui/icons-material/Shield";
import ComputerIcon from "@mui/icons-material/Computer";
import CasinoIcon from "@mui/icons-material/Casino";
import VisibilityIcon from "@mui/icons-material/Visibility";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import LockIcon from "@mui/icons-material/Lock";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import { db } from "../firebaseConfig";
import {
  doc, getDoc, setDoc, onSnapshot, collection,
  addDoc, serverTimestamp, updateDoc,
} from "firebase/firestore";
import { keyframes } from "@mui/material/styles";

const pulseRed = keyframes`
  0% { box-shadow: 0 0 5px #ef4444; }
  50% { box-shadow: 0 0 20px #ef4444, 0 0 40px #ef444488; }
  100% { box-shadow: 0 0 5px #ef4444; }
`;
const pulseGreen = keyframes`
  0% { box-shadow: 0 0 5px #10b981; }
  50% { box-shadow: 0 0 20px #10b981, 0 0 40px #10b98188; }
  100% { box-shadow: 0 0 5px #10b981; }
`;
const glitchEffect = keyframes`
  0% { transform: translate(0); }
  20% { transform: translate(-2px, 2px); }
  40% { transform: translate(2px, -2px); }
  60% { transform: translate(-1px, 1px); }
  80% { transform: translate(1px, -1px); }
  100% { transform: translate(0); }
`;

const calcularTempoTurno = (progresso) => {
  if (progresso >= 90) return 2;
  if (progresso >= 80) return 3;
  if (progresso >= 60) return 5;
  return 10;
};

const nomeItem = (i) => (typeof i === "string" ? i : i?.nome || "item");

// ==================== TEMAS ====================
const TEMA_ATACANTE = {
  corPrincipal: "#10b981",
  corSecundaria: "#ef4444",
  corFundo: "#0d1f0d",
  corBorda: "#10b981",
  gradiente: "linear-gradient(180deg, #0a1f0d 0%, #0a0a0a 50%, #0a1f0d 100%)",
  icone: <SecurityIcon sx={{ fontSize: 32 }} />,
  titulo: "💻 INVADINDO",
  subtitulo: (atacante, alvo) => `Você é o ATACANTE · Alvo: ${alvo}`,
  textoAcao: "🎲 Rolar D10 (ATAQUE)",
};

const TEMA_DEFENSOR = {
  corPrincipal: "#3b82f6",
  corSecundaria: "#06b6d4",
  corFundo: "#0a1828",
  corBorda: "#3b82f6",
  gradiente: "linear-gradient(180deg, #0a1428 0%, #0a0a0a 50%, #0a1428 100%)",
  icone: <ShieldIcon sx={{ fontSize: 32 }} />,
  titulo: "🛡️ SENDO INVADIDO",
  subtitulo: (atacante, alvo) => `Você é o DEFENSOR · Invasor: ${atacante}`,
  textoAcao: "🎲 Rolar D10 (DEFESA)",
};

function HackeamentoGame({
  atacanteEmail, atacanteNome, alvoEmail, alvoNome,
  fichasMap, onClose, onMinimize, userEmail, isMaster,
}) {
  const gameId = `${atacanteEmail}_${alvoEmail}`;
  const isAtacante = userEmail === atacanteEmail;
  const isAlvo = userEmail === alvoEmail;
  const tema = isAtacante ? TEMA_ATACANTE : TEMA_DEFENSOR;

  const [progresso, setProgresso] = useState(0);
  const [rodada, setRodada] = useState(0);
  const [turno, setTurno] = useState("atacante");
  const [dadoAtacante, setDadoAtacante] = useState(null);
  const [dadoDefensor, setDadoDefensor] = useState(null);
  const [totalAtacante, setTotalAtacante] = useState(null);
  const [totalDefensor, setTotalDefensor] = useState(null);
  const [nivelInvasao, setNivelInvasao] = useState(0);
  const [derrotasConsecutivas, setDerrotasConsecutivas] = useState(0);
  const [perdeu, setPerdeu] = useState(false);
  const [ganhou, setGanhou] = useState(false);
  const [historicoTurnos, setHistoricoTurnos] = useState([]);
  const [statusJogo, setStatusJogo] = useState("aguardando_aceite");
  const [ultimaRodadaResumo, setUltimaRodadaResumo] = useState(null);
  const [timestampTurno, setTimestampTurno] = useState(null);

  const [jogandoDado, setJogandoDado] = useState(false);
  const [resultadoDado, setResultadoDado] = useState(null);
  const [segundosRestantes, setSegundosRestantes] = useState(10);

  const [fichaAtacante, setFichaAtacante] = useState(null);
  const [fichaAlvo, setFichaAlvo] = useState(null);
  const [intAtacante, setIntAtacante] = useState(1);
  const [conAtacante, setConAtacante] = useState(0);
  const [intAlvo, setIntAlvo] = useState(1);
  const [conAlvo, setConAlvo] = useState(0);

  const [modalFichaAlvo, setModalFichaAlvo] = useState(false);
  const [modalTransferencia, setModalTransferencia] = useState(false);
  const [tipoTransferencia, setTipoTransferencia] = useState("");
  const [itensAlvo, setItensAlvo] = useState([]);
  const [itensSelecionados, setItensSelecionados] = useState([]);
  const [carteiraAlvo, setCarteiraAlvo] = useState({});
  const [carteiraAtacante, setCarteiraAtacante] = useState({});
  const [quantidadeTransferencia, setQuantidadeTransferencia] = useState(0);
  const [carteiraSelecionada, setCarteiraSelecionada] = useState("");
  const [titulosAlvo, setTitulosAlvo] = useState([]);
  const [imoveisAlvo, setImoveisAlvo] = useState([]);

  const timeoutRef = useRef(null);
  const timeoutDisparouRef = useRef(false);
  const notificouInicioRef = useRef(false);

  // ===== MENSAGEM DE SISTEMA =====
  const mensagemSistema = useCallback(async (texto) => {
    try {
      await addDoc(collection(db, "chat"), {
        userNick: "SISTEMA", userEmail: "sistema@reqviemrpg.com",
        type: "text", text: texto, timestamp: serverTimestamp(),
      });
    } catch (e) { console.error("[Hack] chat principal:", e); }
    const chatId = [atacanteEmail, alvoEmail].sort().join("_");
    try {
      await addDoc(collection(db, "socialChats", chatId, "mensagens"), {
        de: "sistema", para: chatId, tipo: "sistema",
        texto: texto, timestamp: serverTimestamp(),
      });
    } catch (e) { console.error("[Hack] socialChat:", e); }
  }, [atacanteEmail, alvoEmail]);

  // ===== CARREGAR FICHAS =====
  useEffect(() => {
    (async () => {
      try {
        const sA = await getDoc(doc(db, "fichas", atacanteEmail));
        if (sA.exists()) {
          const d = sA.data();
          setFichaAtacante(d);
          setIntAtacante(d.atributos?.inteligencia || 1);
          setConAtacante(d.pericias?.conhecimento || 0);
          setCarteiraAtacante(d.carteiras || {});
        }
        const sB = await getDoc(doc(db, "fichas", alvoEmail));
        if (sB.exists()) {
          const d = sB.data();
          setFichaAlvo(d);
          setIntAlvo(d.atributos?.inteligencia || 1);
          setConAlvo(d.pericias?.conhecimento || 0);
          setCarteiraAlvo(d.carteiras || {});
          setTitulosAlvo(Object.entries(d.acoes || {}).map(([id, v]) => ({ id, ...v })));
          setImoveisAlvo(d.imoveis || []);
          setItensAlvo([...(d.equipamentos || []), ...(d.vestes || []), ...(d.diversos || [])]);
        }
      } catch (e) { console.error("[Hack] Fichas:", e); }
    })();
  }, [atacanteEmail, alvoEmail]);

  // ===== CRIAR JOGO =====
  useEffect(() => {
    if (!isAtacante) return;
    (async () => {
      const ref = doc(db, "hackeamento_games", gameId);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        await setDoc(ref, {
          atacanteEmail, alvoEmail, atacanteNome, alvoNome,
          progresso: 0, rodada: 0, turno: "atacante",
          dadoAtacante: null, dadoDefensor: null,
          totalAtacante: null, totalDefensor: null,
          nivelInvasao: 0, derrotasConsecutivas: 0,
          perdeu: false, ganhou: false, historicoTurnos: [],
          statusJogo: "aguardando_aceite",
          timestampTurno: Date.now(),
          criadoEm: serverTimestamp(),
        });
      }
    })();
  }, [gameId, isAtacante, atacanteEmail, alvoEmail, atacanteNome, alvoNome]);

  // ===== OUVIR ESTADO =====
  useEffect(() => {
    const ref = doc(db, "hackeamento_games", gameId);
    const unsub = onSnapshot(ref, (snap) => {
      if (!snap.exists()) return;
      const d = snap.data();
      setProgresso(d.progresso || 0);
      setRodada(d.rodada || 0);
      setTurno(d.turno || "atacante");
      setDadoAtacante(d.dadoAtacante ?? null);
      setDadoDefensor(d.dadoDefensor ?? null);
      setTotalAtacante(d.totalAtacante ?? null);
      setTotalDefensor(d.totalDefensor ?? null);
      setNivelInvasao(d.nivelInvasao || 0);
      setDerrotasConsecutivas(d.derrotasConsecutivas || 0);
      setPerdeu(d.perdeu || false);
      setGanhou(d.ganhou || false);
      setHistoricoTurnos(d.historicoTurnos || []);
      setStatusJogo(d.statusJogo || "ativo");
      setTimestampTurno(d.timestampTurno || null);
      setUltimaRodadaResumo(d.ultimaRodadaResumo || null);
    });
    return () => unsub();
  }, [gameId]);

  // ===== INÍCIO (notifica 1x) =====
  useEffect(() => {
    if (!isAtacante || notificouInicioRef.current) return;
    if (statusJogo === "aguardando_aceite" && progresso === 0 && rodada === 0) {
      notificouInicioRef.current = true;
      mensagemSistema(`🚨 INVASÃO INICIADA: ${atacanteNome} está tentando hackear ${alvoNome}!`);
    }
  }, [isAtacante, statusJogo, progresso, rodada, atacanteNome, alvoNome, mensagemSistema]);

  // ===== ALVO ACEITA =====
  useEffect(() => {
    if (!isAlvo || statusJogo !== "aguardando_aceite") return;
    (async () => {
      try {
        await updateDoc(doc(db, "hackeamento_games", gameId), {
          statusJogo: "ativo", turno: "atacante", timestampTurno: Date.now(),
        });
      } catch (e) { console.error(e); }
    })();
  }, [isAlvo, statusJogo, gameId]);

  // ===== NOTIFICAÇÕES =====
  const notificarNivelInvasao = useCallback(async (nivel) => {
    const niveis = {
      1: "🔓 Nível 1: Acesso à ficha",
      2: "🔓🔓 Nível 2: Acesso a títulos e imóveis",
      3: "🔓🔓🔓 Nível 3: Acesso ao inventário e carteira",
    };
    try {
      await addDoc(collection(db, "socialNotificacoes"), {
        para: alvoEmail, de: atacanteEmail, tipo: "hackeamento",
        texto: `⚠️ ${atacanteNome} atingiu o ${niveis[nivel]}!`,
        nome: atacanteNome, lida: false, timestamp: serverTimestamp(),
      });
    } catch (e) { console.error(e); }
    await mensagemSistema(`⚠️ ${atacanteNome} desbloqueou ${niveis[nivel]} na invasão contra ${alvoNome}!`);
  }, [atacanteEmail, alvoEmail, atacanteNome, alvoNome, mensagemSistema]);

  const notificarFracasso = useCallback(async () => {
    const codigo = localStorage.getItem(`rede_codigo_pessoal_${atacanteEmail}`) || "?";
    try {
      await addDoc(collection(db, "socialNotificacoes"), {
        para: alvoEmail, de: atacanteEmail, tipo: "hackeamento_fracasso",
        texto: `🛡️ Invasão repelida! Código do invasor: ${codigo}`,
        nome: atacanteNome, lida: false, timestamp: serverTimestamp(),
      });
    } catch (e) { console.error(e); }
    await mensagemSistema(`🛡️ DEFESA BEM-SUCEDIDA: ${alvoNome} repeliu a invasão de ${atacanteNome}! Código do invasor exposto: ${codigo}`);
  }, [atacanteEmail, alvoEmail, atacanteNome, alvoNome, mensagemSistema]);

  const notificarVitoria = useCallback(async () => {
    try {
      await addDoc(collection(db, "socialNotificacoes"), {
        para: alvoEmail, de: atacanteEmail, tipo: "hackeamento_vitoria",
        texto: `💀 Você foi hackeado por ${atacanteNome}!`,
        nome: atacanteNome, lida: false, timestamp: serverTimestamp(),
      });
    } catch (e) { console.error(e); }
    await mensagemSistema(`💀 INVASÃO CONCLUÍDA: ${atacanteNome} hackeou ${alvoNome} com sucesso!`);
  }, [atacanteEmail, alvoEmail, atacanteNome, alvoNome, mensagemSistema]);

  // ===== TIMEOUT =====
  const handleTimeout = useCallback(async () => {
    if (timeoutDisparouRef.current) return;
    timeoutDisparouRef.current = true;
    setTimeout(() => { timeoutDisparouRef.current = false; }, 2500);

    const souEuDoTurno = (turno === "atacante" && isAtacante) || (turno === "defensor" && isAlvo);
    if (!souEuDoTurno) return;

    const ref = doc(db, "hackeamento_games", gameId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    const d = snap.data();
    if (d.timestampTurno !== timestampTurno) return;

    if (turno === "atacante") {
      const novoProg = Math.max(0, (d.progresso || 0) - 10);
      const novasDerrotas = (d.derrotasConsecutivas || 0) + 1;
      const resumo = {
        rodada: (d.rodada || 0) + 1, tipo: "timeout_atacante", progressoNovo: novoProg,
        mensagem: `⏰ ${atacanteNome} não jogou a tempo! -10%`, timestamp: Date.now(),
      };
      const perdeuJogo = novasDerrotas >= 2 && novoProg === 0;
      await updateDoc(ref, {
        progresso: novoProg, derrotasConsecutivas: novasDerrotas, rodada: (d.rodada || 0) + 1,
        turno: "defensor", dadoAtacante: null, totalAtacante: null,
        ultimaRodadaResumo: resumo,
        historicoTurnos: [resumo, ...(d.historicoTurnos || [])].slice(0, 30),
        timestampTurno: Date.now(), perdeu: perdeuJogo,
      });
      await mensagemSistema(`⏰ TIMEOUT: ${atacanteNome} não jogou a tempo contra ${alvoNome}! Progresso caiu para ${novoProg}%.`);
      if (perdeuJogo) await notificarFracasso();
    } else {
      const novoProg = Math.min(100, (d.progresso || 0) + 10);
      const novoNivel = novoProg >= 100 ? 3 : novoProg >= 80 ? 2 : novoProg >= 60 ? 1 : 0;
      const resumo = {
        rodada: (d.rodada || 0) + 1, tipo: "timeout_defensor", progressoNovo: novoProg,
        mensagem: `⏰ ${alvoNome} não jogou a tempo! +10%`, timestamp: Date.now(),
      };
      const ganhouJogo = novoProg >= 100;
      await updateDoc(ref, {
        progresso: novoProg, rodada: (d.rodada || 0) + 1, turno: "atacante",
        nivelInvasao: Math.max(d.nivelInvasao || 0, novoNivel),
        dadoDefensor: null, totalDefensor: null,
        ultimaRodadaResumo: resumo,
        historicoTurnos: [resumo, ...(d.historicoTurnos || [])].slice(0, 30),
        timestampTurno: Date.now(), ganhou: ganhouJogo, derrotasConsecutivas: 0,
      });
      await mensagemSistema(`⏰ TIMEOUT: ${alvoNome} não defendeu a tempo! ${atacanteNome} ganhou +10% (progresso: ${novoProg}%).`);
      if (novoNivel > (d.nivelInvasao || 0)) await notificarNivelInvasao(novoNivel);
      if (ganhouJogo) await notificarVitoria();
    }
  }, [turno, isAtacante, isAlvo, timestampTurno, gameId, atacanteNome, alvoNome, mensagemSistema, notificarFracasso, notificarNivelInvasao, notificarVitoria]);

  // ===== TIMER =====
  const tempoTurno = calcularTempoTurno(progresso);

  useEffect(() => {
    if (statusJogo !== "ativo" || perdeu || ganhou || !timestampTurno) return;
    const duracaoMs = tempoTurno * 1000;
    const tick = () => {
      const decorrido = Date.now() - timestampTurno;
      const restante = Math.max(0, Math.ceil((duracaoMs - decorrido) / 1000));
      setSegundosRestantes(restante);
      if (restante <= 0) {
        if (timeoutRef.current) clearInterval(timeoutRef.current);
        handleTimeout();
      }
    };
    tick();
    timeoutRef.current = setInterval(tick, 250);
    return () => clearInterval(timeoutRef.current);
  }, [timestampTurno, statusJogo, tempoTurno, perdeu, ganhou, handleTimeout]);

  // ===== ROLAR DADO =====
  const rolarDado = async () => {
    if (jogandoDado || perdeu || ganhou) return;
    const minhaVez = (turno === "atacante" && isAtacante) || (turno === "defensor" && isAlvo);
    if (!minhaVez) return;

    setJogandoDado(true);
    setResultadoDado(null);
    const interval = setInterval(() => {
      setResultadoDado(Math.floor(Math.random() * 10) + 1);
    }, 80);

    setTimeout(async () => {
      clearInterval(interval);
      const dado = Math.floor(Math.random() * 10) + 1;
      setResultadoDado(dado);

      const ref = doc(db, "hackeamento_games", gameId);
      const snap = await getDoc(ref);
      if (!snap.exists()) { setJogandoDado(false); return; }
      const d = snap.data();

      if (turno === "atacante") {
        const total = dado + intAtacante + conAtacante;
        await updateDoc(ref, {
          dadoAtacante: dado, totalAtacante: total,
          turno: "defensor", timestampTurno: Date.now(),
        });
        await mensagemSistema(`🎲 ${atacanteNome} rolou no ataque: dado ${dado} + INT ${intAtacante} + CON ${conAtacante} = ${total}. Aguardando defesa de ${alvoNome}...`);
      } else {
        const totalD = dado + intAlvo + conAlvo;
        const totalA = d.totalAtacante || 0;
        const atacanteVence = totalA > totalD;
        const novoProg = atacanteVence ? Math.min(100, (d.progresso || 0) + 10) : Math.max(0, (d.progresso || 0) - 10);
        const novasDerrotas = atacanteVence ? 0 : (d.derrotasConsecutivas || 0) + 1;
        const resumo = {
          rodada: (d.rodada || 0) + 1,
          dadoAtacante: d.dadoAtacante, totalAtacante: totalA,
          dadoDefensor: dado, totalDefensor: totalD,
          atacanteVence, progressoNovo: novoProg,
          mensagem: atacanteVence
            ? `💻 ${atacanteNome} venceu (${totalA} vs ${totalD})! +10%`
            : `🛡️ ${alvoNome} defendeu (${totalA} vs ${totalD})! -10%`,
          timestamp: Date.now(),
        };
        const novoNivel = novoProg >= 100 ? 3 : novoProg >= 80 ? 2 : novoProg >= 60 ? 1 : 0;
        const ganhouJogo = novoProg >= 100;
        const perdeuJogo = !atacanteVence && novasDerrotas >= 2 && novoProg === 0;

        await updateDoc(ref, {
          dadoDefensor: dado, totalDefensor: totalD, progresso: novoProg,
          rodada: (d.rodada || 0) + 1, turno: "atacante",
          nivelInvasao: atacanteVence ? Math.max(d.nivelInvasao || 0, novoNivel) : (d.nivelInvasao || 0),
          derrotasConsecutivas: novasDerrotas,
          ultimaRodadaResumo: resumo,
          historicoTurnos: [resumo, ...(d.historicoTurnos || [])].slice(0, 30),
          timestampTurno: Date.now(), ganhou: ganhouJogo, perdeu: perdeuJogo,
        });

        await mensagemSistema(`⚔️ RODADA ${(d.rodada || 0) + 1} — ${atacanteNome}: 🎲${d.dadoAtacante} + ${intAtacante + conAtacante} = ${totalA} | ${alvoNome}: 🎲${dado} + ${intAlvo + conAlvo} = ${totalD} — ${atacanteVence ? `✅ ATACANTE VENCE! Progresso: ${novoProg}%` : `❌ DEFENSOR VENCE! Progresso: ${novoProg}%`}`);

        if (atacanteVence && novoNivel > (d.nivelInvasao || 0)) await notificarNivelInvasao(novoNivel);
        if (ganhouJogo) await notificarVitoria();
        if (perdeuJogo) await notificarFracasso();
      }
      setJogandoDado(false);
    }, 1200);
  };

  // ===== TRANSFERÊNCIAS =====
  const transferirItens = async () => {
    if (!itensSelecionados.length) return;
    try {
      const rA = doc(db, "fichas", alvoEmail);
      const rB = doc(db, "fichas", atacanteEmail);
      const sA = await getDoc(rA); const sB = await getDoc(rB);
      if (!sA.exists() || !sB.exists()) return;
      const dA = sA.data(); const dB = sB.data();
      const novosEq = (dA.equipamentos || []).filter(i => !itensSelecionados.includes(i));
      const novasVe = (dA.vestes || []).filter(i => !itensSelecionados.includes(i));
      const novosDi = (dA.diversos || []).filter(i => !itensSelecionados.includes(i));
      await updateDoc(rA, { equipamentos: novosEq, vestes: novasVe, diversos: novosDi });
      await updateDoc(rB, {
        equipamentos: [...(dB.equipamentos || []), ...itensSelecionados.filter(i => dA.equipamentos?.includes(i))],
        vestes: [...(dB.vestes || []), ...itensSelecionados.filter(i => dA.vestes?.includes(i))],
        diversos: [...(dB.diversos || []), ...itensSelecionados.filter(i => dA.diversos?.includes(i))],
      });
      const lista = itensSelecionados.map(nomeItem).join(", ");
      await mensagemSistema(`🎒 HACKEAMENTO: ${atacanteNome} roubou ${itensSelecionados.length} item(ns) de ${alvoNome}: ${lista}`);
      setModalTransferencia(false);
      setItensSelecionados([]);
    } catch (e) { console.error(e); }
  };

  const transferirCarteira = async () => {
    if (!carteiraSelecionada || quantidadeTransferencia <= 0) return;
    try {
      const rA = doc(db, "fichas", alvoEmail);
      const rB = doc(db, "fichas", atacanteEmail);
      const sA = await getDoc(rA); const sB = await getDoc(rB);
      if (!sA.exists() || !sB.exists()) return;
      const cAarr = sA.data().carteiras || [];
      const cBarr = sB.data().carteiras || [];
      const cA = Array.isArray(cAarr) ? cAarr.reduce((a, c) => ({ ...a, [c.nome]: c.valor || 0 }), {}) : cAarr;
      const cB = Array.isArray(cBarr) ? cBarr.reduce((a, c) => ({ ...a, [c.nome]: c.valor || 0 }), {}) : cBarr;
      if ((cA[carteiraSelecionada] || 0) < quantidadeTransferencia) return;
      const novaA = { ...cA, [carteiraSelecionada]: cA[carteiraSelecionada] - quantidadeTransferencia };
      const novaB = { ...cB, [carteiraSelecionada]: (cB[carteiraSelecionada] || 0) + quantidadeTransferencia };
      await updateDoc(rA, { carteiras: Object.entries(novaA).map(([nome, valor]) => ({ nome, valor })) });
      await updateDoc(rB, { carteiras: Object.entries(novaB).map(([nome, valor]) => ({ nome, valor })) });
      await mensagemSistema(`💵 HACKEAMENTO: ${atacanteNome} roubou 💰 ${quantidadeTransferencia.toFixed(2)} da carteira "${carteiraSelecionada}" de ${alvoNome}!`);
      setModalTransferencia(false);
      setQuantidadeTransferencia(0);
      setCarteiraSelecionada("");
    } catch (e) { console.error(e); }
  };

  const transferirTitulos = async (idx) => {
    try {
      const rA = doc(db, "fichas", alvoEmail);
      const rB = doc(db, "fichas", atacanteEmail);
      const sA = await getDoc(rA); const sB = await getDoc(rB);
      if (!sA.exists() || !sB.exists()) return;
      const dA = sA.data(); const dB = sB.data();
      const arr = Object.entries(dA.acoes || {}).map(([id, v]) => ({ id, ...v }));
      if (idx >= arr.length) return;
      const transferida = arr[idx];
      arr.splice(idx, 1);
      const novasA = {}; arr.forEach(a => { const { id, ...r } = a; novasA[id] = r; });
      const novasB = { ...(dB.acoes || {}), [transferida.id]: (() => { const { id, ...r } = transferida; return r; })() };
      await updateDoc(rA, { acoes: novasA });
      await updateDoc(rB, { acoes: novasB });
      setTitulosAlvo(arr);
      const nome = transferida.nome || transferida.id;
      await mensagemSistema(`📜 HACKEAMENTO: ${atacanteNome} roubou o título "${nome}" de ${alvoNome}!`);
      window.dispatchEvent(new CustomEvent('desbloquearConquista', { detail: { conquistaId: 'hacker' } }));
    } catch (e) { console.error(e); }
  };

  const transferirImoveis = async (idx) => {
    try {
      const rA = doc(db, "fichas", alvoEmail);
      const rB = doc(db, "fichas", atacanteEmail);
      const sA = await getDoc(rA); const sB = await getDoc(rB);
      if (!sA.exists() || !sB.exists()) return;
      const dA = sA.data(); const dB = sB.data();
      const arr = [...(dA.imoveis || [])];
      if (idx >= arr.length) return;
      const im = arr[idx];
      arr.splice(idx, 1);
      await updateDoc(rA, { imoveis: arr });
      await updateDoc(rB, { imoveis: [...(dB.imoveis || []), im] });
      setImoveisAlvo(arr);
      const nome = im.nome || im.endereco || "imóvel sem nome";
      await mensagemSistema(`🏠 HACKEAMENTO: ${atacanteNome} roubou o imóvel "${nome}" de ${alvoNome}!`);
    } catch (e) { console.error(e); }
  };

  // ===== FECHAR / MINIMIZAR =====
  const handleClose = async () => {
    if (perdeu || ganhou) {
      try {
        await updateDoc(doc(db, "hackeamento_games", gameId), { statusJogo: "finalizado" });
      } catch (e) {}
      onClose?.();
    } else {
      onMinimize?.();
    }
  };

  const minhaVez =
    statusJogo === "ativo" && !perdeu && !ganhou &&
    ((turno === "atacante" && isAtacante) || (turno === "defensor" && isAlvo));

  return createPortal(
    <Box
      sx={{
        position: "fixed", inset: 0, bgcolor: "rgba(0,0,0,0.95)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 99999, fontFamily: "'Courier New', monospace",
      }}
      onClick={(e) => { if (e.target === e.currentTarget && (perdeu || ganhou)) handleClose(); }}
    >
      <Paper
        elevation={24}
        sx={{
          width: "90vw", maxWidth: 800, maxHeight: "90vh",
          bgcolor: "#0a0a0a", border: `2px solid ${tema.corBorda}`,
          borderRadius: 2, overflow: "hidden", display: "flex", flexDirection: "column",
          boxShadow: `0 0 50px ${tema.corPrincipal}55`,
          background: tema.gradiente,
          animation: `${glitchEffect} 0.3s ease-in-out`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <Box sx={{
          p: 2, bgcolor: tema.corFundo,
          borderBottom: `1px solid ${tema.corPrincipal}66`,
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Box sx={{ color: tema.corPrincipal }}>{tema.icone}</Box>
            <Box>
              <Typography variant="h6" sx={{ color: tema.corPrincipal, fontWeight: "bold" }}>
                {tema.titulo}
              </Typography>
              <Typography variant="caption" sx={{ color: tema.corSecundaria }}>
                {tema.subtitulo(atacanteNome, alvoNome)}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: "flex", gap: 0.5 }}>
            {!perdeu && !ganhou && (
              <IconButton onClick={onMinimize} sx={{ color: tema.corPrincipal }} title="Minimizar">
                <MinimizeIcon />
              </IconButton>
            )}
            <IconButton onClick={handleClose} sx={{ color: perdeu || ganhou ? "#ef4444" : tema.corPrincipal }} title={perdeu || ganhou ? "Fechar" : "Minimizar"}>
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>

        {/* Conteúdo */}
        <Box sx={{ flex: 1, overflowY: "auto", p: 3 }}>
          {statusJogo === "aguardando_aceite" && (
            <Paper sx={{ p: 2, mb: 2, bgcolor: `${tema.corPrincipal}22`, border: `1px solid ${tema.corPrincipal}`, textAlign: "center" }}>
              <Typography sx={{ color: tema.corPrincipal }}>
                {isAtacante ? "⏳ Aguardando alvo aceitar a invasão..." : "🎯 Invasão em andamento"}
              </Typography>
            </Paper>
          )}

          {statusJogo === "ativo" && !perdeu && !ganhou && (
            <Box sx={{ mb: 2, textAlign: "center" }}>
              <Chip
                icon={<AccessTimeIcon />}
                label={`${segundosRestantes}s — ${minhaVez ? "SUA VEZ" : `Vez de ${turno === "atacante" ? atacanteNome : alvoNome}`}`}
                sx={{
                  bgcolor: minhaVez ? (segundosRestantes <= 3 ? "#ef444422" : `${tema.corPrincipal}22`) : "#1a1a2e",
                  color: minhaVez ? (segundosRestantes <= 3 ? "#ef4444" : tema.corPrincipal) : "#64748b",
                  fontSize: "0.9rem", fontWeight: "bold", height: 32, px: 2,
                }}
              />
            </Box>
          )}

          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6}>
              <Card sx={{ bgcolor: isAtacante ? tema.corFundo : "#0d1f0d", border: `1px solid ${isAtacante ? tema.corPrincipal : "#10b981"}44` }}>
                <CardContent>
                  <Typography variant="subtitle2" sx={{ color: "#10b981", mb: 1 }}>🖥️ INVASOR</Typography>
                  <Typography variant="body1" sx={{ color: "#fff", fontWeight: "bold" }}>{atacanteNome}{isAtacante && " (Você)"}</Typography>
                  <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
                    <Chip icon={<ComputerIcon />} label={`INT ${intAtacante}`} size="small" sx={{ bgcolor: "#10b98122", color: "#10b981" }} />
                    <Chip icon={<ComputerIcon />} label={`CON ${conAtacante}`} size="small" sx={{ bgcolor: "#10b98122", color: "#10b981" }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6}>
              <Card sx={{ bgcolor: isAlvo ? tema.corFundo : "#0d1f0d", border: `1px solid ${isAlvo ? tema.corPrincipal : "#3b82f6"}44` }}>
                <CardContent>
                  <Typography variant="subtitle2" sx={{ color: "#3b82f6", mb: 1 }}>🛡️ DEFENSOR</Typography>
                  <Typography variant="body1" sx={{ color: "#fff", fontWeight: "bold" }}>{alvoNome}{isAlvo && " (Você)"}</Typography>
                  <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
                    <Chip icon={<ShieldIcon />} label={`INT ${intAlvo}`} size="small" sx={{ bgcolor: "#3b82f622", color: "#3b82f6" }} />
                    <Chip icon={<ShieldIcon />} label={`CON ${conAlvo}`} size="small" sx={{ bgcolor: "#3b82f622", color: "#3b82f6" }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
              <Typography variant="caption" sx={{ color: tema.corPrincipal }}>Progresso: {progresso}%</Typography>
              <Typography variant="caption" sx={{ color: tema.corSecundaria }}>Rodada: {rodada}</Typography>
            </Box>
            <LinearProgress variant="determinate" value={progresso} sx={{
              height: 20, borderRadius: 2, bgcolor: "#0d1f0d",
              '& .MuiLinearProgress-bar': {
                bgcolor: progresso >= 80 ? "#ef4444" : progresso >= 60 ? "#fbbf24" : tema.corPrincipal,
              },
            }} />
            <Box sx={{ display: "flex", justifyContent: "space-between", mt: 0.5, px: 1 }}>
              <Chip label="Nv 1 (60%)" size="small" icon={progresso >= 60 ? <LockOpenIcon /> : <LockIcon />}
                sx={{ bgcolor: progresso >= 60 ? "#fbbf24" : "#333", color: progresso >= 60 ? "#000" : "#666", fontSize: "0.6rem" }} />
              <Chip label="Nv 2 (80%)" size="small" icon={progresso >= 80 ? <LockOpenIcon /> : <LockIcon />}
                sx={{ bgcolor: progresso >= 80 ? "#fbbf24" : "#333", color: progresso >= 80 ? "#000" : "#666", fontSize: "0.6rem" }} />
              <Chip label="Nv 3 (100%)" size="small" icon={progresso >= 100 ? <LockOpenIcon /> : <LockIcon />}
                sx={{ bgcolor: progresso >= 100 ? "#ef4444" : "#333", color: progresso >= 100 ? "#fff" : "#666", fontSize: "0.6rem" }} />
            </Box>
          </Box>

          {(dadoAtacante || dadoDefensor) && (
            <Paper sx={{ p: 2, mb: 3, bgcolor: tema.corFundo, border: `1px solid ${tema.corPrincipal}44`, textAlign: "center" }}>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="caption" sx={{ color: "#10b981" }}>Atacante</Typography>
                  <Typography variant="h4" sx={{ color: dadoAtacante ? "#10b981" : "#333" }}>🎲 {dadoAtacante ?? "—"}</Typography>
                  {totalAtacante != null && <Typography variant="caption" sx={{ color: "#10b981" }}>Total: {totalAtacante}</Typography>}
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" sx={{ color: "#3b82f6" }}>Defensor</Typography>
                  <Typography variant="h4" sx={{ color: dadoDefensor ? "#3b82f6" : "#333" }}>🎲 {dadoDefensor ?? "—"}</Typography>
                  {totalDefensor != null && <Typography variant="caption" sx={{ color: "#3b82f6" }}>Total: {totalDefensor}</Typography>}
                </Grid>
              </Grid>
              {ultimaRodadaResumo && (
                <Chip
                  icon={ultimaRodadaResumo.atacanteVence ? <CheckCircleIcon /> : <CancelIcon />}
                  label={ultimaRodadaResumo.mensagem}
                  sx={{
                    mt: 2,
                    bgcolor: ultimaRodadaResumo.atacanteVence ? "#10b98122" : "#3b82f622",
                    color: ultimaRodadaResumo.atacanteVence ? "#10b981" : "#3b82f6",
                  }}
                />
              )}
            </Paper>
          )}

          {statusJogo === "ativo" && !perdeu && !ganhou && (
            <Box sx={{ textAlign: "center", mb: 3 }}>
              <Button
                variant="contained" onClick={rolarDado}
                disabled={!minhaVez || jogandoDado}
                startIcon={jogandoDado ? <CircularProgress size={20} /> : <CasinoIcon />}
                sx={{
                  bgcolor: minhaVez ? tema.corPrincipal : "#333",
                  color: minhaVez ? (isAtacante ? "#000" : "#fff") : "#666",
                  fontWeight: "bold", fontSize: "1.2rem", px: 4, py: 1.5,
                  "&:hover": { bgcolor: minhaVez ? tema.corPrincipal + "cc" : "#333" },
                  "&:disabled": { bgcolor: "#333", color: "#666" },
                  animation: minhaVez && !jogandoDado ? `${isAtacante ? pulseGreen : pulseRed} 2s infinite` : "none",
                }}
              >
                {jogandoDado ? "Rolando..." :
                 !minhaVez ? `Aguarde ${turno === "atacante" ? atacanteNome : alvoNome}...` :
                 `${tema.textoAcao} · ${segundosRestantes}s`}
              </Button>
            </Box>
          )}

          {isAtacante && statusJogo === "ativo" && !perdeu && !ganhou && (
            <Box sx={{ display: "flex", gap: 1, justifyContent: "center", mb: 3, flexWrap: "wrap" }}>
              <Button variant="contained" disabled={nivelInvasao < 1} onClick={() => setModalFichaAlvo(true)}
                startIcon={<VisibilityIcon />}
                sx={{ bgcolor: nivelInvasao >= 1 ? "#fbbf24" : "#333", color: nivelInvasao >= 1 ? "#000" : "#666" }}>
                Nv 1: Ver Ficha
              </Button>
              <Button variant="contained" disabled={nivelInvasao < 2}
                onClick={() => { setTipoTransferencia("titulos"); setModalTransferencia(true); }}
                startIcon={<SwapHorizIcon />}
                sx={{ bgcolor: nivelInvasao >= 2 ? "#fbbf24" : "#333", color: nivelInvasao >= 2 ? "#000" : "#666" }}>
                Nv 2: Títulos/Imóveis
              </Button>
              <Button variant="contained" disabled={nivelInvasao < 3}
                onClick={() => { setTipoTransferencia("inventario"); setModalTransferencia(true); }}
                startIcon={<SwapHorizIcon />}
                sx={{ bgcolor: nivelInvasao >= 3 ? "#ef4444" : "#333", color: nivelInvasao >= 3 ? "#fff" : "#666" }}>
                Nv 3: Inventário/Carteira
              </Button>
            </Box>
          )}

          {(perdeu || ganhou) && (
            <Paper sx={{
              p: 3, textAlign: "center",
              bgcolor: (isAtacante && ganhou) || (isAlvo && perdeu) ? "#10b98122" : "#3b82f622",
              border: `2px solid ${(isAtacante && ganhou) || (isAlvo && perdeu) ? "#10b981" : "#3b82f6"}`,
            }}>
              <Typography variant="h5" sx={{ color: (isAtacante && ganhou) || (isAlvo && perdeu) ? "#10b981" : "#3b82f6", fontWeight: "bold" }}>
                {(isAtacante && ganhou) ? "💀 INVASÃO BEM-SUCEDIDA!" : (isAlvo && ganhou) ? "🛡️ VOCÊ REPELIU A INVASÃO!" : (isAtacante && perdeu) ? "🛡️ SUA INVASÃO FRACASSOU!" : "💀 VOCÊ FOI HACKEADO!"}
              </Typography>
              <Typography variant="body2" sx={{ color: "#fff", mt: 1 }}>
                {(isAtacante && ganhou) || (isAlvo && ganhou)
                  ? `${atacanteNome} invadiu ${alvoNome}!`
                  : `${alvoNome} repeliu a invasão de ${atacanteNome}!`}
              </Typography>
              <Button variant="contained" onClick={handleClose} sx={{ mt: 2, bgcolor: "#ef4444" }}>
                Fechar
              </Button>
            </Paper>
          )}

          {historicoTurnos.length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle2" sx={{ color: tema.corPrincipal, mb: 1 }}>📜 Histórico</Typography>
              <Box sx={{ maxHeight: 180, overflowY: "auto" }}>
                {historicoTurnos.map((t, i) => (
                  <Paper key={i} sx={{ p: 1, mb: 0.5, bgcolor: tema.corFundo, border: `1px solid ${tema.corPrincipal}22` }}>
                    <Typography variant="caption" sx={{ color: t.atacanteVence || t.tipo === "timeout_defensor" ? "#10b981" : "#3b82f6" }}>
                      {t.mensagem || `R${t.rodada} — ${t.totalAtacante ?? "?"} vs ${t.totalDefensor ?? "?"}`}
                    </Typography>
                  </Paper>
                ))}
              </Box>
            </Box>
          )}
        </Box>
      </Paper>

      {/* Modal Ficha */}
      <Dialog open={modalFichaAlvo} onClose={() => setModalFichaAlvo(false)} maxWidth="md" fullWidth
        PaperProps={{ sx: { bgcolor: "#0f172a", border: "2px solid #fbbf24" } }}>
        <DialogTitle sx={{ color: "#fbbf24" }}>🔓 Ficha de {alvoNome}</DialogTitle>
        <DialogContent>
          {fichaAlvo ? (
            <Box sx={{ color: "#fff" }}>
              <Typography variant="h6" sx={{ color: "#fbbf24", mb: 2 }}>{fichaAlvo.nome || alvoNome}</Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" sx={{ color: "#94a3b8" }}>Atributos</Typography>
                  {fichaAlvo.atributos && Object.entries(fichaAlvo.atributos).map(([k, v]) => (
                    <Typography key={k} variant="body2">{k}: {v}</Typography>
                  ))}
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" sx={{ color: "#94a3b8" }}>Perícias</Typography>
                  {fichaAlvo.pericias && Object.entries(fichaAlvo.pericias).map(([k, v]) => (
                    <Typography key={k} variant="body2">{k}: {v}</Typography>
                  ))}
                </Grid>
              </Grid>
            </Box>
          ) : <Typography sx={{ color: "#94a3b8" }}>Carregando...</Typography>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModalFichaAlvo(false)} sx={{ color: "#94a3b8" }}>Fechar</Button>
        </DialogActions>
      </Dialog>

      {/* Modal Transferência */}
      <Dialog open={modalTransferencia} onClose={() => setModalTransferencia(false)} maxWidth="md" fullWidth
        PaperProps={{ sx: { bgcolor: "#0f172a", border: "2px solid #fbbf24" } }}>
        <DialogTitle sx={{ color: "#fbbf24" }}>
          {tipoTransferencia === "titulos" && "📜 Transferir Títulos"}
          {tipoTransferencia === "imoveis" && "🏠 Transferir Imóveis"}
          {tipoTransferencia === "inventario" && "🎒 Transferir Itens"}
          {tipoTransferencia === "carteira" && "💰 Transferir Dinheiro"}
        </DialogTitle>
        <DialogContent>
          {tipoTransferencia === "titulos" && (
            titulosAlvo.length === 0 ? <Typography sx={{ color: "#64748b" }}>Nada disponível</Typography> :
            titulosAlvo.map((a, i) => (
              <Paper key={i} sx={{ p: 1.5, mb: 1, bgcolor: "#1a1a2e", border: "1px solid #fbbf2444" }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Typography variant="body2" sx={{ color: "#fff" }}>{a.nome || a.id}</Typography>
                  <Button size="small" variant="contained" onClick={() => transferirTitulos(i)}
                    sx={{ bgcolor: "#fbbf24", color: "#000" }}>Transferir</Button>
                </Box>
              </Paper>
            ))
          )}
          {tipoTransferencia === "imoveis" && (
            imoveisAlvo.length === 0 ? <Typography sx={{ color: "#64748b" }}>Nada disponível</Typography> :
            imoveisAlvo.map((im, i) => (
              <Paper key={i} sx={{ p: 1.5, mb: 1, bgcolor: "#1a1a2e", border: "1px solid #3b82f644" }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Typography variant="body2" sx={{ color: "#fff" }}>{im.nome || im.endereco || `Imóvel ${i + 1}`}</Typography>
                  <Button size="small" variant="contained" onClick={() => transferirImoveis(i)}
                    sx={{ bgcolor: "#3b82f6" }}>Transferir</Button>
                </Box>
              </Paper>
            ))
          )}
          {tipoTransferencia === "inventario" && (
            <>
              {itensAlvo.map((item, i) => (
                <Paper key={i}
                  onClick={() => {
                    if (itensSelecionados.includes(item)) setItensSelecionados(p => p.filter(x => x !== item));
                    else setItensSelecionados(p => [...p, item]);
                  }}
                  sx={{
                    p: 1.5, mb: 1, cursor: "pointer",
                    bgcolor: itensSelecionados.includes(item) ? "#ef444422" : "#1a1a2e",
                    border: itensSelecionados.includes(item) ? "2px solid #ef4444" : "1px solid #334155",
                  }}>
                  <Typography variant="body2" sx={{ color: "#fff" }}>{nomeItem(item)}</Typography>
                </Paper>
              ))}
              <Button fullWidth variant="contained" onClick={transferirItens}
                disabled={!itensSelecionados.length} sx={{ bgcolor: "#ef4444", mt: 2 }}>
                Transferir {itensSelecionados.length}
              </Button>
            </>
          )}
          {tipoTransferencia === "carteira" && (
            <>
              <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                <InputLabel sx={{ color: "#94a3b8" }}>Carteira</InputLabel>
                <Select value={carteiraSelecionada} onChange={(e) => setCarteiraSelecionada(e.target.value)}
                  sx={{ color: "#fff", bgcolor: "#1a1a2e" }}>
                  {Object.entries(carteiraAlvo).map(([nome, valor]) => (
                    <MenuItem key={nome} value={nome}>{nome}: 💰 {typeof valor === "number" ? valor.toFixed(2) : "0"}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField fullWidth type="number" label="Quantidade" value={quantidadeTransferencia}
                onChange={(e) => setQuantidadeTransferencia(parseFloat(e.target.value) || 0)}
                InputProps={{ sx: { color: "#fff" } }} InputLabelProps={{ sx: { color: "#94a3b8" } }} />
              <Button fullWidth variant="contained" onClick={transferirCarteira}
                sx={{ bgcolor: "#ef4444", mt: 2 }}>Transferir 💰 {quantidadeTransferencia}</Button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Box>,
    document.body
  );
}

export default React.memo(HackeamentoGame);
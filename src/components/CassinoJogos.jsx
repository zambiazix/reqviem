// src/components/CassinoJogos.jsx
import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  Box, Paper, Typography, IconButton, Button, TextField,
  Chip, Grid
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import CasinoIcon from "@mui/icons-material/Casino";
import SportsScoreIcon from "@mui/icons-material/SportsScore";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import { db } from "../firebaseConfig";
import {
  doc, setDoc, onSnapshot, collection, addDoc, serverTimestamp,
  getDoc, query, orderBy, limit
} from "firebase/firestore";

// ============ SIMBOLOS DO TIGRINHO ============
const SIMBOLOS = [
  { emoji: "🍒", peso: 20, mult: 2 },
  { emoji: "🍋", peso: 18, mult: 3 },
  { emoji: "🍊", peso: 16, mult: 4 },
  { emoji: "🍇", peso: 14, mult: 5 },
  { emoji: "🔔", peso: 12, mult: 8 },
  { emoji: "⭐", peso: 10, mult: 12 },
  { emoji: "💎", peso: 6, mult: 25 },
  { emoji: "7️⃣", peso: 4, mult: 75 },
];
const PESO_TOTAL = SIMBOLOS.reduce((s, x) => s + x.peso, 0);

const sortearSimbolo = () => {
  let r = Math.random() * PESO_TOTAL;
  for (const s of SIMBOLOS) {
    if (r < s.peso) return s;
    r -= s.peso;
  }
  return SIMBOLOS[0];
};

// Grid 3x3 → índices:
// 0 1 2
// 3 4 5
// 6 7 8
const PAYLINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

// ============ CAVALOS ============
// Ordem: 0=Vermelho, 1=Azul, 2=Verde (azarão), 3=Amarelo, 4=Roxo, 5=Laranja (favorito)
const CAVALOS = [
  { id: 0, cor: "#ef4444", nome: "Boadicea",   emoji: "🐎" },
  { id: 1, cor: "#3b82f6", nome: "Roach",      emoji: "🐎" },
  { id: 2, cor: "#22c55e", nome: "Sleipnir",   emoji: "🐎" }, // azarão
  { id: 3, cor: "#eab308", nome: "Shadowmere", emoji: "🐎" },
  { id: 4, cor: "#a855f7", nome: "Agro",       emoji: "🐎" },
  { id: 5, cor: "#f97316", nome: "Carpeado",   emoji: "🐎" }, // favorito
];

// ============ ODDS (10 min por bloco, iguais pra todo mundo) ============
const ODDS_BLOCO_MS = 10 * 60 * 1000;

const seededRandom = (seed) => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

const calcularOdds = (bloco) => {
  return CAVALOS.map((c) => {
    const r = seededRandom(bloco * 7.31 + c.id * 3.17);
    let odd;
    if (c.id === 2) {
      // Verde — azarão (odd sempre alta)
      odd = 8.0 + r * 5.0; // 8.0 a 13.0
    } else if (c.id === 5) {
      // Laranja — favorito (odd sempre baixa)
      odd = 1.4 + r * 0.9; // 1.4 a 2.3
    } else {
      odd = 2.5 + r * 4.0; // 2.5 a 6.5
    }
    return { ...c, odd: Math.round(odd * 10) / 10 };
  });
};

const formatarTempoRestante = (ms) => {
  if (ms <= 0) return "00:00";
  const totalSeg = Math.floor(ms / 1000);
  const m = Math.floor(totalSeg / 60);
  const s = totalSeg % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

function CassinoJogos({ userEmail, userNick, isMaster, onClose }) {
  // ============ JANELA ============
  const [posicao, setPosicao] = useState({ x: 100, y: 40 });
  const [tamanho, setTamanho] = useState({ width: 920, height: 820 });
  const [minimizado, setMinimizado] = useState(false);
  const [arrastando, setArrastando] = useState(false);
  const [redimensionando, setRedimensionando] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const resizeStartRef = useRef({ x: 0, y: 0, width: 0, height: 0 });

  // ============ SALDO ============
  const [saldo, setSaldo] = useState(0);

  // ============ ABA ============
  const [abaAtiva, setAbaAtiva] = useState("tigrinho");

  // ============ TIGRINHO ============
  const [apostaTigrinho, setApostaTigrinho] = useState(10);
  const [colunas, setColunas] = useState([
    ["🍒", "🍋", "🍊"],
    ["🔔", "⭐", "💎"],
    ["7️⃣", "🍒", "🍋"],
  ]);
  const [girando, setGirando] = useState(false);
  const [colunasParando, setColunasParando] = useState([false, false, false]);
  const [linhasVencedoras, setLinhasVencedoras] = useState([]);
  const [resultadoTigrinho, setResultadoTigrinho] = useState(null);
  const [streak, setStreak] = useState(0);
  const [melhorStreak, setMelhorStreak] = useState(0);
  const [mostrarStreak, setMostrarStreak] = useState(false);

  // ============ CORRIDA ============
  const [apostaCorrida, setApostaCorrida] = useState(50);
  const [cavaloEscolhido, setCavaloEscolhido] = useState(null);
  const [corrida, setCorrida] = useState(null);
  const [resultadoCorrida, setResultadoCorrida] = useState(null);
  const rafRef = useRef(null);
  const corridaRef = useRef(null);
  const [oddsAtuais, setOddsAtuais] = useState(() => calcularOdds(Math.floor(Date.now() / ODDS_BLOCO_MS)));
  const [tempoAteAtualizacao, setTempoAteAtualizacao] = useState(0);

  // ============ CHAT GLOBAL ============
  const [chatMensagens, setChatMensagens] = useState([]);
  const [chatVisibleCount, setChatVisibleCount] = useState(50);
  const [chatNoFundo, setChatNoFundo] = useState(true);
  const chatEndRef = useRef(null);
  const chatBoxRef = useRef(null);

  // ============ RANKING ============
  const [ranking, setRanking] = useState([]);

  // ============ SALDO EM TEMPO REAL ============
  useEffect(() => {
    if (!userEmail) return;
    const ref = doc(db, "fichas", userEmail);
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        const ficha = snap.data();
        const carteiras = ficha.carteiras || [];
        const total = Array.isArray(carteiras)
          ? carteiras.reduce((sum, c) => sum + (c.valor || 0), 0)
          : Object.values(carteiras).reduce(
              (sum, v) => sum + (typeof v === "number" ? v : 0), 0
            );
        setSaldo(total);
      }
    });
    return () => unsub();
  }, [userEmail]);

  // ============ CHAT GLOBAL (Firestore) — mais antigas ficam ocultas ============
  useEffect(() => {
    const q = query(
      collection(db, "cassino_chat"),
      orderBy("timestamp", "desc"),
      limit(200)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const arr = [];
        snap.forEach((d) => arr.push({ id: d.id, ...d.data() }));
        setChatMensagens(arr.reverse());
      },
      (err) => console.warn("Erro chat cassino:", err)
    );
    return () => unsub();
  }, []);

  // Auto-scroll só quando o usuário já está no fundo
  useEffect(() => {
    if (chatNoFundo && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMensagens, chatNoFundo]);

  const handleChatScroll = (e) => {
    const el = e.currentTarget;
    const isBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    setChatNoFundo(isBottom);
    // Carrega mais antigas ao chegar no topo
    if (el.scrollTop < 20 && chatVisibleCount < chatMensagens.length) {
      setChatVisibleCount((prev) => Math.min(prev + 30, chatMensagens.length));
    }
  };

  const scrollToBottom = () => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
      setChatNoFundo(true);
    }
  };

  // ============ RANKING EM TEMPO REAL ============
  useEffect(() => {
    const q = query(
      collection(db, "cassino_ranking"),
      orderBy("totalJogadas", "desc"),
      limit(10)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const arr = [];
        snap.forEach((d) => arr.push({ id: d.id, ...d.data() }));
        setRanking(arr);
      },
      (err) => console.warn("Erro ranking:", err)
    );
    return () => unsub();
  }, []);

  // ============ ODDS — atualiza a cada 10 min ============
  useEffect(() => {
    const tick = () => {
      const agora = Date.now();
      const bloco = Math.floor(agora / ODDS_BLOCO_MS);
      const proximoBloco = (bloco + 1) * ODDS_BLOCO_MS;
      setOddsAtuais(calcularOdds(bloco));
      setTempoAteAtualizacao(proximoBloco - agora);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // ============ DRAG/RESIZE ============
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (arrastando) {
        setPosicao({
          x: e.clientX - dragStartRef.current.x,
          y: e.clientY - dragStartRef.current.y,
        });
      }
      if (redimensionando) {
        setTamanho({
          width: Math.max(750, resizeStartRef.current.width + (e.clientX - resizeStartRef.current.x)),
          height: Math.max(650, resizeStartRef.current.height + (e.clientY - resizeStartRef.current.y)),
        });
      }
    };
    const handleMouseUp = () => {
      setArrastando(false);
      setRedimensionando(false);
    };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [arrastando, redimensionando]);

  // ============ FINANCEIRO ============
  const debitarSaldo = async (valor) => {
    const ref = doc(db, "fichas", userEmail);
    const snap = await getDoc(ref);
    if (!snap.exists()) return false;
    const ficha = snap.data();
    const carteiras = ficha.carteiras || [];
    let restante = valor;
    let debited = false;

    let novasCarteiras;
    if (Array.isArray(carteiras)) {
      novasCarteiras = carteiras.map((c) => {
        if (restante <= 0) return c;
        if ((c.valor || 0) >= restante) {
          const novo = { ...c, valor: (c.valor || 0) - restante };
          restante = 0; debited = true; return novo;
        } else {
          restante -= c.valor || 0;
          return { ...c, valor: 0 };
        }
      });
    } else {
      novasCarteiras = { ...carteiras };
      for (const k of Object.keys(novasCarteiras)) {
        if (restante <= 0) break;
        const v = novasCarteiras[k] || 0;
        if (v >= restante) {
          novasCarteiras[k] = v - restante;
          restante = 0; debited = true;
        } else {
          restante -= v;
          novasCarteiras[k] = 0;
        }
      }
    }

    if (!debited && restante > 0) return false;
    await setDoc(ref, { carteiras: novasCarteiras }, { merge: true });
    return true;
  };

  const creditarSaldo = async (valor) => {
    const ref = doc(db, "fichas", userEmail);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    const ficha = snap.data();
    const carteiras = ficha.carteiras || [];

    let novasCarteiras;
    if (Array.isArray(carteiras)) {
      novasCarteiras = [...carteiras];
      if (novasCarteiras.length === 0) {
        novasCarteiras.push({ nome: "Geral", valor });
      } else {
        novasCarteiras[0] = {
          ...novasCarteiras[0],
          valor: (novasCarteiras[0].valor || 0) + valor,
        };
      }
    } else {
      novasCarteiras = { ...carteiras };
      const chaves = Object.keys(novasCarteiras);
      if (chaves.length === 0) {
        novasCarteiras["Geral"] = valor;
      } else {
        novasCarteiras[chaves[0]] = (novasCarteiras[chaves[0]] || 0) + valor;
      }
    }

    await setDoc(ref, { carteiras: novasCarteiras }, { merge: true });
  };

  // ============ CHAT (só sistema) ============
  const enviarMensagemChat = async (texto, tipo = "sistema") => {
    try {
      await addDoc(collection(db, "cassino_chat"), {
        userEmail: userEmail || "sistema",
        userNick: userNick || "Anônimo",
        texto,
        tipo,
        timestamp: serverTimestamp(),
      });
    } catch (e) {
      console.warn("Erro ao enviar mensagem:", e);
    }
  };

  const formatarData = (ts) => {
    if (!ts) return "agora";
    try {
      const date = ts.toDate ? ts.toDate() : new Date(ts);
      return date.toLocaleString("pt-BR", {
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit", second: "2-digit",
      });
    } catch {
      return "—";
    }
  };

  // ============ RANKING ============
  const atualizarRanking = async (tipo, aposta, premio) => {
    if (!userEmail) return;
    try {
      const ref = doc(db, "cassino_ranking", userEmail);
      const snap = await getDoc(ref);
      const atual = snap.exists() ? snap.data() : {
        userNick: userNick || "Anônimo",
        totalJogadas: 0,
        totalTigrinho: 0,
        totalCorrida: 0,
        totalApostado: 0,
        totalGanho: 0,
        melhorStreak: 0,
      };

      const novo = {
        ...atual,
        userNick: userNick || atual.userNick || "Anônimo",
        totalJogadas: (atual.totalJogadas || 0) + 1,
        totalApostado: (atual.totalApostado || 0) + aposta,
        totalGanho: (atual.totalGanho || 0) + (premio || 0),
        melhorStreak: Math.max(atual.melhorStreak || 0, streak, melhorStreak),
      };

      if (tipo === "tigrinho") novo.totalTigrinho = (atual.totalTigrinho || 0) + 1;
      if (tipo === "corrida") novo.totalCorrida = (atual.totalCorrida || 0) + 1;

      await setDoc(ref, novo, { merge: true });
    } catch (e) {
      console.warn("Erro ranking:", e);
    }
  };

  // ============ TIGRINHO: GIRAR ============
  const girarTigrinho = async () => {
    if (girando) return;
    if (apostaTigrinho <= 0) return alert("Aposta inválida!");
    if (saldo < apostaTigrinho) return alert("Saldo insuficiente!");

    const ok = await debitarSaldo(apostaTigrinho);
    if (!ok) return alert("Saldo insuficiente!");

    setGirando(true);
    setResultadoTigrinho(null);
    setLinhasVencedoras([]);
    setColunasParando([false, false, false]);

    const resultadoFinal = [];
    for (let col = 0; col < 3; col++) {
      const colunaRes = [];
      for (let row = 0; row < 3; row++) {
        colunaRes.push(sortearSimbolo().emoji);
      }
      resultadoFinal.push(colunaRes);
    }

    const intervalos = [];
    for (let col = 0; col < 3; col++) {
      intervalos[col] = setInterval(() => {
        setColunas((prev) => {
          const novo = prev.map((c) => [...c]);
          novo[col] = [
            sortearSimbolo().emoji,
            sortearSimbolo().emoji,
            sortearSimbolo().emoji,
          ];
          return novo;
        });
      }, 70 + col * 15);
    }

    const delays = [900, 1400, 1900];
    for (let col = 0; col < 3; col++) {
      setTimeout(() => {
        clearInterval(intervalos[col]);
        setColunas((prev) => {
          const novo = prev.map((c) => [...c]);
          novo[col] = [...resultadoFinal[col]];
          return novo;
        });
        setColunasParando((prev) => {
          const novo = [...prev];
          novo[col] = true;
          return novo;
        });
      }, delays[col]);
    }

    setTimeout(async () => {
      const grid = [];
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
          grid[row * 3 + col] = resultadoFinal[col][row];
        }
      }

      const linhasGanhadoras = [];
      let premioTotal = 0;

      for (const linha of PAYLINES) {
        const [a, b, c] = linha;
        if (grid[a] === grid[b] && grid[b] === grid[c]) {
          const info = SIMBOLOS.find((s) => s.emoji === grid[a]);
          if (info) {
            premioTotal += apostaTigrinho * info.mult;
            linhasGanhadoras.push(linha);
          }
        }
      }

      if (premioTotal > 0) {
        await creditarSaldo(premioTotal);
        setLinhasVencedoras(linhasGanhadoras);
        const novoStreak = streak + 1;
        setStreak(novoStreak);
        if (novoStreak > melhorStreak) setMelhorStreak(novoStreak);

        let msg = `🎰 ${userNick} ganhou 💰 ${premioTotal} no Tigrinho! 🎉`;
        if (novoStreak >= 3) {
          msg += ` 🔥 STREAK x${novoStreak}!`;
          setMostrarStreak(true);
          setTimeout(() => setMostrarStreak(false), 2500);
        }

        setResultadoTigrinho({
          tipo: "vitoria",
          premio: premioTotal,
          mensagem: `🎉 Você ganhou 💰 ${premioTotal}!${novoStreak >= 3 ? ` 🔥 STREAK x${novoStreak}` : ""}`,
        });
        await enviarMensagemChat(msg, "vitoria");
        await atualizarRanking("tigrinho", apostaTigrinho, premioTotal);
      } else {
        setStreak(0);
        setResultadoTigrinho({
          tipo: "derrota",
          mensagem: `❌ Não foi dessa vez! Perdeu 💰 ${apostaTigrinho}.`,
        });
        await enviarMensagemChat(
          `🎰 ${userNick} perdeu 💰 ${apostaTigrinho} no Tigrinho.`,
          "derrota"
        );
        await atualizarRanking("tigrinho", apostaTigrinho, 0);
      }

      setGirando(false);
      setColunasParando([false, false, false]);
    }, 2400);
  };

  // ============ CORRIDA ============
  const pontoNoCircuito = (progress) => {
    const cx = 200, cy = 150, rx = 150, ry = 100;
    const theta = -Math.PI / 2 + progress * Math.PI * 2;
    return {
      x: cx + rx * Math.cos(theta),
      y: cy + ry * Math.sin(theta),
    };
  };

  const iniciarCorrida = async () => {
    if (corrida?.rodando) return;
    if (cavaloEscolhido === null) return alert("Escolha um cavalo!");
    if (apostaCorrida <= 0) return alert("Aposta inválida!");
    if (saldo < apostaCorrida) return alert("Saldo insuficiente!");

    const ok = await debitarSaldo(apostaCorrida);
    if (!ok) return alert("Saldo insuficiente!");

    setResultadoCorrida(null);

    const cavalos = oddsAtuais.map((c) => {
      // Velocidade base inversamente proporcional à odd (azarão mais lento)
      const speedBias = Math.pow(1.5 / c.odd, 0.3);
      return {
        id: c.id,
        cor: c.cor,
        nome: c.nome,
        odd: c.odd,
        progress: 0,
        baseSpeed: (0.15 + Math.random() * 0.05) * speedBias,
      };
    });

    corridaRef.current = {
      cavalos, rodando: true, vencedor: null,
      cavaloEscolhido, ultimaAtualizacao: performance.now(),
    };

    setCorrida({ cavalos, rodando: true, vencedor: null });

    const loop = (now) => {
      const ref = corridaRef.current;
      if (!ref || !ref.rodando) return;

      const dt = Math.min(0.1, (now - ref.ultimaAtualizacao) / 1000);
      ref.ultimaAtualizacao = now;

      let vencedorId = null;

      ref.cavalos = ref.cavalos.map((c) => {
        if (vencedorId !== null) return c;
        const turbulencia = 0.7 + Math.random() * 0.7;
        const delta = c.baseSpeed * turbulencia * dt * 2;
        const novaProgress = Math.min(1, c.progress + delta);
        if (novaProgress >= 1 && vencedorId === null) {
          vencedorId = c.id;
        }
        return { ...c, progress: novaProgress };
      });

      if (vencedorId !== null) {
        ref.rodando = false;
        ref.vencedor = vencedorId;
      }

      setCorrida({
        cavalos: [...ref.cavalos],
        rodando: ref.rodando,
        vencedor: ref.vencedor,
      });

      if (ref.rodando) {
        rafRef.current = requestAnimationFrame(loop);
      } else {
        setTimeout(() => finalizarCorrida(ref.vencedor), 900);
      }
    };

    rafRef.current = requestAnimationFrame(loop);
  };

  const finalizarCorrida = async (vencedorId) => {
    const ref = corridaRef.current;
    if (!ref) return;
    const cavaloVencedor = CAVALOS[vencedorId];
    const cavaloApostado = CAVALOS[ref.cavaloEscolhido];

    if (ref.cavaloEscolhido === vencedorId) {
      const premio = Math.floor(apostaCorrida * cavaloVencedor.id === 0 ? apostaCorrida : apostaCorrida);
      // Payout: aposta * odd
      const oddVencedor = oddsAtuais.find((c) => c.id === vencedorId)?.odd || 2;
      const premioReal = Math.floor(apostaCorrida * oddVencedor);
      await creditarSaldo(premioReal);
      setResultadoCorrida({
        tipo: "vitoria",
        mensagem: `🏆 Você acertou! ${cavaloVencedor.nome} venceu — ganhou 💰 ${premioReal} (odd ${oddVencedor}x)!`,
      });
      await enviarMensagemChat(
        `🏇 ${userNick} apostou em ${cavaloApostado.nome} e ACERTOU! Ganhou 💰 ${premioReal} (odd ${oddVencedor}x).`,
        "vitoria"
      );
      await atualizarRanking("corrida", apostaCorrida, premioReal);
    } else {
      setResultadoCorrida({
        tipo: "derrota",
        mensagem: `❌ ${cavaloVencedor.nome} venceu. Você apostou em ${cavaloApostado.nome} e perdeu 💰 ${apostaCorrida}.`,
      });
      await enviarMensagemChat(
        `🏇 ${userNick} apostou em ${cavaloApostado.nome} mas ${cavaloVencedor.nome} venceu. Perdeu 💰 ${apostaCorrida}.`,
        "derrota"
      );
      await atualizarRanking("corrida", apostaCorrida, 0);
    }

    setTimeout(() => {
      corridaRef.current = null;
      setCorrida(null);
    }, 3000);
  };

  // Cleanup rAF
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (corridaRef.current) corridaRef.current.rodando = false;
    };
  }, []);

  // ============ HELPERS ============
  const celulaVencedora = (flatIdx) =>
    linhasVencedoras.some((l) => l.includes(flatIdx));

  // Mensagens visíveis (oculta as mais antigas)
  const chatVisivel = chatMensagens.slice(-chatVisibleCount);

  // ============ RENDER ============
  return createPortal(
    <Paper
      elevation={10}
      sx={{
        position: "fixed", left: posicao.x, top: posicao.y,
        width: minimizado ? 320 : tamanho.width,
        height: minimizado ? 48 : tamanho.height,
        bgcolor: "#0f0a00", color: "#eab308",
        borderRadius: 2, border: "2px solid #eab308",
        zIndex: 9998, display: "flex", flexDirection: "column",
        overflow: "hidden",
        boxShadow: "0 0 40px rgba(234,179,8,0.4), 0 8px 32px rgba(0,0,0,0.9)",
        background: "radial-gradient(ellipse at top, #2a1a00 0%, #0f0a00 70%)",
      }}
    >
      {/* BARRA DE TÍTULO */}
      <Box
        sx={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          p: 1, bgcolor: "#1a0f00", cursor: "move", minHeight: 42,
          borderBottom: "1px solid #eab30844",
        }}
        onMouseDown={(e) => {
          if (e.target.tagName === "BUTTON" || e.target.tagName === "INPUT") return;
          e.preventDefault();
          setArrastando(true);
          dragStartRef.current = { x: e.clientX - posicao.x, y: e.clientY - posicao.y };
        }}
      >
        <Typography variant="subtitle2" sx={{ color: "#eab308", fontWeight: "bold", fontSize: "0.9rem" }}>
          🎰 {minimizado ? "Cassino" : "Cassino Réquiem"}
        </Typography>
        <Box sx={{ display: "flex", gap: 0.5, alignItems: "center" }}>
          <Chip
            label={`💰 ${saldo.toLocaleString("pt-BR")}`}
            size="small"
            sx={{ bgcolor: "#3a2a00", color: "#facc15", fontWeight: "bold", mr: 1, fontSize: "0.7rem" }}
          />
          <IconButton size="small" onClick={() => setMinimizado(!minimizado)} sx={{ color: "#eab308", p: 0.5 }}>
            {minimizado ? "□" : "−"}
          </IconButton>
          <IconButton size="small" onClick={onClose} sx={{ color: "#eab308", p: 0.5 }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      {!minimizado && (
        <Box sx={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* ABAS */}
          <Box sx={{ display: "flex", gap: 0.5, borderBottom: "1px solid #eab30833", px: 1.5, pt: 1 }}>
            <Button
              size="small"
              onClick={() => setAbaAtiva("tigrinho")}
              startIcon={<CasinoIcon sx={{ fontSize: 16 }} />}
              sx={{
                color: abaAtiva === "tigrinho" ? "#facc15" : "#a16207",
                fontSize: "0.75rem", fontWeight: "bold",
                bgcolor: abaAtiva === "tigrinho" ? "#eab30822" : "transparent",
                borderBottom: abaAtiva === "tigrinho" ? "2px solid #eab308" : "none",
                borderRadius: 0, py: 0.8,
              }}
            >
              🐯 Tigrinho
            </Button>
            <Button
              size="small"
              onClick={() => setAbaAtiva("aposta")}
              startIcon={<SportsScoreIcon sx={{ fontSize: 16 }} />}
              sx={{
                color: abaAtiva === "aposta" ? "#facc15" : "#a16207",
                fontSize: "0.75rem", fontWeight: "bold",
                bgcolor: abaAtiva === "aposta" ? "#eab30822" : "transparent",
                borderBottom: abaAtiva === "aposta" ? "2px solid #eab308" : "none",
                borderRadius: 0, py: 0.8,
              }}
            >
              🏇 Aposta
            </Button>
          </Box>

          {/* CONTEÚDO PRINCIPAL — GAME + SIDEBAR */}
          <Box sx={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>
            {/* ÁREA DE JOGO */}
            <Box
              sx={{
                flex: 1, p: 1.5, overflowY: "auto",
                display: "flex", flexDirection: "column",
                "&::-webkit-scrollbar": { width: "4px" },
                "&::-webkit-scrollbar-thumb": { background: "#eab30844", borderRadius: "10px" },
              }}
            >
              {/* ==================== TIGRINHO ==================== */}
              {abaAtiva === "tigrinho" && (
                <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1.5 }}>
                  {/* Streak flutuante */}
                  {mostrarStreak && (
                    <Box
                      sx={{
                        position: "absolute",
                        top: "30%", left: "50%",
                        transform: "translate(-50%, -50%)",
                        zIndex: 100,
                        animation: "streakPop 0.6s ease",
                        pointerEvents: "none",
                      }}
                    >
                      <Typography
                        sx={{
                          fontSize: "2.5rem", fontWeight: 900,
                          color: "#facc15",
                          textShadow: "0 0 20px #facc15, 0 0 40px #eab308",
                        }}
                      >
                        🔥 STREAK x{streak}!
                      </Typography>
                    </Box>
                  )}

                  {/* Moldura decorativa */}
                  <Paper
                    sx={{
                      p: 2, bgcolor: "#1a0f00",
                      border: "3px solid #eab308", borderRadius: 3,
                      boxShadow: "0 0 30px rgba(234,179,8,0.5), inset 0 0 30px rgba(234,179,8,0.15)",
                      position: "relative",
                    }}
                  >
                    <Box sx={{ display: "flex", justifyContent: "center", gap: 0.5, mb: 1 }}>
                      {Array(9).fill(0).map((_, i) => (
                        <Box
                          key={i}
                          sx={{
                            width: 8, height: 8, borderRadius: "50%",
                            bgcolor: girando ? (i % 3 === 0 ? "#facc15" : "#a16207") : "#facc15",
                            boxShadow: "0 0 8px #facc15",
                            animation: girando ? `pulse${i % 3} 0.6s infinite` : "none",
                          }}
                        />
                      ))}
                    </Box>

                    <Grid container spacing={0.8}>
                      {[0, 1, 2].map((colIdx) => (
                        <Grid item xs={4} key={colIdx}>
                          {[0, 1, 2].map((rowIdx) => {
                            const flatIdx = rowIdx * 3 + colIdx;
                            const isWinner = celulaVencedora(flatIdx);
                            const estaGirando = girando && !colunasParando[colIdx];
                            return (
                              <Paper
                                key={rowIdx}
                                sx={{
                                  py: 1, my: 0.4, textAlign: "center",
                                  bgcolor: isWinner ? "#3a2a00" : "#0a0500",
                                  border: isWinner ? "2px solid #facc15" : "1px solid #a1620733",
                                  boxShadow: isWinner
                                    ? "0 0 25px rgba(250,204,21,0.8), inset 0 0 15px rgba(250,204,21,0.3)"
                                    : "inset 0 0 10px rgba(0,0,0,0.6)",
                                  transition: "all 0.3s ease",
                                  filter: estaGirando ? "blur(1.8px) brightness(1.3)"
                                    : isWinner ? "brightness(1.15)" : "none",
                                  transform: isWinner ? "scale(1.03)" : "scale(1)",
                                }}
                              >
                                <Typography sx={{ fontSize: "2.2rem", lineHeight: 1, userSelect: "none" }}>
                                  {colunas[colIdx]?.[rowIdx] || "❓"}
                                </Typography>
                              </Paper>
                            );
                          })}
                        </Grid>
                      ))}
                    </Grid>

                    <Box sx={{ display: "flex", justifyContent: "center", gap: 0.5, mt: 1 }}>
                      {Array(9).fill(0).map((_, i) => (
                        <Box
                          key={i}
                          sx={{
                            width: 8, height: 8, borderRadius: "50%",
                            bgcolor: girando ? (i % 3 === 1 ? "#facc15" : "#a16207") : "#facc15",
                            boxShadow: "0 0 8px #facc15",
                          }}
                        />
                      ))}
                    </Box>
                  </Paper>

                  {/* Controles */}
                  <Box sx={{ display: "flex", gap: 1, alignItems: "center", width: "100%", maxWidth: 400 }}>
                    <TextField
                      size="small" type="number" label="Aposta"
                      value={apostaTigrinho}
                      onChange={(e) => setApostaTigrinho(Math.max(1, Number(e.target.value) || 1))}
                      disabled={girando}
                      InputProps={{ style: { color: "#eab308", fontSize: "0.85rem" } }}
                      InputLabelProps={{ style: { color: "#a16207" } }}
                      sx={{
                        width: 110,
                        "& .MuiOutlinedInput-root": {
                          "& fieldset": { borderColor: "#a1620744" },
                          "&:hover fieldset": { borderColor: "#eab308" },
                          "&.Mui-focused fieldset": { borderColor: "#eab308" },
                        },
                      }}
                    />
                    <Button
                      variant="contained" onClick={girarTigrinho}
                      disabled={girando || apostaTigrinho <= 0}
                      startIcon={<CasinoIcon />} fullWidth
                      sx={{
                        bgcolor: "#eab308", color: "#000",
                        fontWeight: "bold", py: 1.2, fontSize: "0.95rem",
                        boxShadow: "0 0 20px rgba(234,179,8,0.5)",
                        "&:hover": { bgcolor: "#ca8a04" },
                        "&:disabled": { bgcolor: "#5a4a10", color: "#8a7a30" },
                      }}
                    >
                      {girando ? "🎰 GIRANDO..." : "🎰 GIRAR!"}
                    </Button>
                  </Box>

                  {resultadoTigrinho && !girando && (
                    <Paper
                      sx={{
                        p: 1.5, width: "100%", maxWidth: 400,
                        bgcolor: resultadoTigrinho.tipo === "vitoria" ? "#1b5e20" : "#5e1b1b",
                        border: `2px solid ${resultadoTigrinho.tipo === "vitoria" ? "#4caf50" : "#ef4444"}`,
                        textAlign: "center",
                        animation: resultadoTigrinho.tipo === "vitoria" ? "victory 0.6s ease" : "none",
                      }}
                    >
                      <Typography
                        sx={{
                          color: resultadoTigrinho.tipo === "vitoria" ? "#4caf50" : "#ef4444",
                          fontWeight: "bold", fontSize: "1rem",
                        }}
                      >
                        {resultadoTigrinho.mensagem}
                      </Typography>
                    </Paper>
                  )}
                </Box>
              )}

              {/* ==================== APOSTA (CORRIDA) ==================== */}
              {abaAtiva === "aposta" && (
                <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1.5 }}>
                  {/* Pista */}
                  <Paper
                    sx={{
                      p: 1.5, bgcolor: "#0a1a0a",
                      border: "2px solid #22c55e", borderRadius: 3,
                      boxShadow: "0 0 30px rgba(34,197,94,0.35)",
                      width: "100%", maxWidth: 620,
                    }}
                  >
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.5 }}>
                      <Typography variant="caption" sx={{ color: "#22c55e", fontWeight: "bold" }}>
                        🏇 CIRCUITO
                      </Typography>
                      <Box sx={{ display: "flex", gap: 0.5 }}>
                        <Chip
                          label={`⏱️ Odds em ${formatarTempoRestante(tempoAteAtualizacao)}`}
                          size="small"
                          sx={{ bgcolor: "#facc1522", color: "#facc15", fontSize: "0.6rem", height: 18 }}
                        />
                        {corrida?.rodando && (
                          <Chip
                            label="CORRENDO!"
                            size="small"
                            sx={{
                              bgcolor: "#22c55e22", color: "#22c55e",
                              fontSize: "0.6rem", height: 18,
                              animation: "blink 0.8s infinite",
                            }}
                          />
                        )}
                        {!corrida?.rodando && corrida?.vencedor != null && (
                          <Chip
                            label={`🏆 ${CAVALOS[corrida.vencedor]?.nome} venceu!`}
                            size="small"
                            sx={{ bgcolor: "#facc1522", color: "#facc15", fontSize: "0.6rem", height: 18 }}
                          />
                        )}
                      </Box>
                    </Box>

                    <Box sx={{ width: "100%", aspectRatio: "4 / 3", maxHeight: 300, mx: "auto" }}>
                      <svg viewBox="0 0 400 300" style={{ width: "100%", height: "100%" }}>
                        <ellipse cx="200" cy="150" rx="150" ry="100" fill="none" stroke="#14532d" strokeWidth="46" />
                        <ellipse cx="200" cy="150" rx="150" ry="100" fill="none" stroke="#1e3a1e" strokeWidth="40" strokeDasharray="6 4" />
                        <ellipse cx="200" cy="150" rx="130" ry="80" fill="none" stroke="#22c55e" strokeWidth="1.5" />
                        <ellipse cx="200" cy="150" rx="170" ry="120" fill="none" stroke="#22c55e" strokeWidth="1.5" />

                        <line x1="200" y1="30" x2="200" y2="70" stroke="#fff" strokeWidth="3" strokeDasharray="4 3" />
                        <text x="200" y="20" textAnchor="middle" fill="#facc15" fontSize="10" fontWeight="bold">
                          🏁 CHEGADA
                        </text>

                        {(corrida?.cavalos || []).map((c) => {
                          const p = pontoNoCircuito(c.progress);
                          const isEscolhido = cavaloEscolhido === c.id;
                          const isVencedor = corrida?.vencedor === c.id;
                          return (
                            <g key={c.id}>
                              {isVencedor && (
                                <circle cx={p.x} cy={p.y} r="20" fill="none" stroke="#facc15" strokeWidth="3" opacity="0.8">
                                  <animate attributeName="r" values="16;24;16" dur="0.8s" repeatCount="indefinite" />
                                  <animate attributeName="opacity" values="0.9;0.3;0.9" dur="0.8s" repeatCount="indefinite" />
                                </circle>
                              )}
                              <circle
                                cx={p.x} cy={p.y} r="14"
                                fill={c.cor}
                                stroke={isEscolhido ? "#facc15" : "#fff"}
                                strokeWidth={isEscolhido ? "3" : "2"}
                              />
                              <text x={p.x} y={p.y + 5} textAnchor="middle" fontSize="12" fill="#fff" fontWeight="bold">
                                {c.id + 1}
                              </text>
                            </g>
                          );
                        })}

                        {!corrida && (
                          <>
                            {CAVALOS.map((c, i) => {
                              const x = 160 + i * 16;
                              const y = 150;
                              return (
                                <circle key={i} cx={x} cy={y} r="6" fill={c.cor} stroke="#fff" strokeWidth="1" />
                              );
                            })}
                            <text x="200" y="180" textAnchor="middle" fill="#22c55e" fontSize="11">
                              Aguardando largada...
                            </text>
                          </>
                        )}
                      </svg>
                    </Box>
                  </Paper>

                  {/* Painel de odds */}
                  <Paper
                    sx={{
                      p: 1.5, width: "100%", maxWidth: 620,
                      bgcolor: "#0a0a00",
                      border: "1px solid #eab30844",
                      borderRadius: 2,
                    }}
                  >
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                      <Typography variant="caption" sx={{ color: "#facc15", fontWeight: "bold" }}>
                        📊 ODDS ATUAIS
                      </Typography>
                      <Typography variant="caption" sx={{ color: "#a16207", fontSize: "0.6rem" }}>
                        Atualiza a cada 10 min (igual pra todos)
                      </Typography>
                    </Box>
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.6 }}>
                      {oddsAtuais.map((c) => (
                        <Chip
                          key={c.id}
                          label={`${c.emoji} ${c.nome} · ${c.odd}x${c.id === 2 ? " 🔥" : c.id === 5 ? " ⭐" : ""}`}
                          onClick={() => setCavaloEscolhido(c.id)}
                          disabled={!!corrida?.rodando}
                          sx={{
                            bgcolor: cavaloEscolhido === c.id ? c.cor : "#1a0f00",
                            color: cavaloEscolhido === c.id ? "#fff" : c.cor,
                            border: `2px solid ${c.cor}`,
                            fontWeight: "bold", cursor: "pointer",
                            fontSize: "0.7rem",
                            transition: "all 0.2s",
                            transform: cavaloEscolhido === c.id ? "scale(1.05)" : "scale(1)",
                            "&:hover": { bgcolor: c.cor + "44" },
                          }}
                        />
                      ))}
                    </Box>
                  </Paper>

                  {/* Controles */}
                  <Box sx={{ display: "flex", gap: 1, alignItems: "center", width: "100%", maxWidth: 400 }}>
                    <TextField
                      size="small" type="number" label="Aposta"
                      value={apostaCorrida}
                      onChange={(e) => setApostaCorrida(Math.max(1, Number(e.target.value) || 1))}
                      disabled={!!corrida?.rodando}
                      InputProps={{ style: { color: "#eab308", fontSize: "0.85rem" } }}
                      InputLabelProps={{ style: { color: "#a16207" } }}
                      sx={{
                        width: 110,
                        "& .MuiOutlinedInput-root": {
                          "& fieldset": { borderColor: "#a1620744" },
                          "&:hover fieldset": { borderColor: "#eab308" },
                          "&.Mui-focused fieldset": { borderColor: "#eab308" },
                        },
                      }}
                    />
                    <Button
                      variant="contained"
                      onClick={iniciarCorrida}
                      disabled={!!corrida?.rodando || cavaloEscolhido === null}
                      startIcon={<SportsScoreIcon />} fullWidth
                      sx={{
                        bgcolor: "#22c55e", color: "#fff",
                        fontWeight: "bold", py: 1.2, fontSize: "0.95rem",
                        boxShadow: "0 0 20px rgba(34,197,94,0.5)",
                        "&:hover": { bgcolor: "#16a34a" },
                        "&:disabled": { bgcolor: "#1a3a1a", color: "#5a8a5a" },
                      }}
                    >
                      {corrida?.rodando ? "🏇 CORRENDO..." : "🏇 APOSTAR!"}
                    </Button>
                  </Box>

                  {resultadoCorrida && !corrida?.rodando && (
                    <Paper
                      sx={{
                        p: 1.5, width: "100%", maxWidth: 400,
                        bgcolor: resultadoCorrida.tipo === "vitoria" ? "#1b5e20" : "#5e1b1b",
                        border: `2px solid ${resultadoCorrida.tipo === "vitoria" ? "#4caf50" : "#ef4444"}`,
                        textAlign: "center",
                      }}
                    >
                      <Typography
                        sx={{
                          color: resultadoCorrida.tipo === "vitoria" ? "#4caf50" : "#ef4444",
                          fontWeight: "bold", fontSize: "0.9rem",
                        }}
                      >
                        {resultadoCorrida.mensagem}
                      </Typography>
                    </Paper>
                  )}
                </Box>
              )}
            </Box>

            {/* ==================== SIDEBAR ==================== */}
            <Box
              sx={{
                width: 210, bgcolor: "#0a0500",
                borderLeft: "1px solid #eab30833",
                display: "flex", flexDirection: "column",
                overflowY: "auto", flexShrink: 0,
                "&::-webkit-scrollbar": { width: "3px" },
                "&::-webkit-scrollbar-thumb": { background: "#eab30844", borderRadius: "10px" },
              }}
            >
              {/* RANKING */}
              <Box sx={{ p: 1.2, borderBottom: "1px solid #eab30822" }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 1 }}>
                  <EmojiEventsIcon sx={{ fontSize: 16, color: "#facc15" }} />
                  <Typography variant="caption" sx={{ color: "#facc15", fontWeight: "bold" }}>
                    RANKING
                  </Typography>
                </Box>
                {ranking.length === 0 ? (
                  <Typography variant="caption" sx={{ color: "#665500", fontStyle: "italic", fontSize: "0.65rem" }}>
                    Ninguém jogou ainda
                  </Typography>
                ) : (
                  ranking.map((r, i) => (
                    <Box
                      key={r.id}
                      sx={{
                        display: "flex", alignItems: "center", gap: 0.5,
                        mb: 0.5, fontSize: "0.65rem",
                      }}
                    >
                      <Typography
                        sx={{
                          color: i === 0 ? "#facc15" : i === 1 ? "#c0c0c0" : i === 2 ? "#cd7f32" : "#a16207",
                          fontWeight: "bold", fontSize: "0.7rem",
                          minWidth: 18,
                        }}
                      >
                        {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                      </Typography>
                      <Typography
                        sx={{
                          flex: 1, color: r.id === userEmail ? "#facc15" : "#ddd",
                          fontWeight: r.id === userEmail ? "bold" : "normal",
                          fontSize: "0.65rem",
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}
                      >
                        {r.userNick || "Anônimo"}
                      </Typography>
                      <Typography sx={{ color: "#a16207", fontSize: "0.6rem" }}>
                        {r.totalJogadas || 0}
                      </Typography>
                    </Box>
                  ))
                )}
              </Box>

              {/* MULTIPLICADORES (só no tigrinho) */}
              {abaAtiva === "tigrinho" && (
                <Box sx={{ p: 1.2, borderBottom: "1px solid #eab30822" }}>
                  <Typography variant="caption" sx={{ color: "#facc15", fontWeight: "bold", display: "block", mb: 1 }}>
                    📊 MULTIPLICADORES
                  </Typography>
                  {SIMBOLOS.map((s) => (
                    <Box
                      key={s.emoji}
                      sx={{ display: "flex", justifyContent: "space-between", mb: 0.3, fontSize: "0.65rem" }}
                    >
                      <Typography sx={{ color: "#ddd", fontSize: "0.65rem" }}>
                        {s.emoji} {s.emoji} {s.emoji}
                      </Typography>
                      <Typography sx={{ color: s.mult >= 25 ? "#ef4444" : s.mult >= 12 ? "#facc15" : "#22c55e", fontWeight: "bold", fontSize: "0.65rem" }}>
                        {s.mult}x
                      </Typography>
                    </Box>
                  ))}
                </Box>
              )}

              {/* STREAK (só no tigrinho) */}
              {abaAtiva === "tigrinho" && (
                <Box sx={{ p: 1.2 }}>
                  <Typography variant="caption" sx={{ color: "#facc15", fontWeight: "bold", display: "block", mb: 1 }}>
                    🔥 STREAK
                  </Typography>
                  <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.3, fontSize: "0.65rem" }}>
                    <Typography sx={{ color: "#ddd", fontSize: "0.65rem" }}>Atual</Typography>
                    <Typography sx={{ color: streak >= 3 ? "#ef4444" : "#facc15", fontWeight: "bold", fontSize: "0.7rem" }}>
                      {streak}
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", justifyContent: "space-between", fontSize: "0.65rem" }}>
                    <Typography sx={{ color: "#ddd", fontSize: "0.65rem" }}>Melhor</Typography>
                    <Typography sx={{ color: "#22c55e", fontWeight: "bold", fontSize: "0.7rem" }}>
                      {melhorStreak}
                    </Typography>
                  </Box>
                </Box>
              )}
            </Box>
          </Box>

          {/* ==================== CHAT GLOBAL ==================== */}
          <Box
            sx={{
              borderTop: "2px solid #eab30844",
              bgcolor: "#0a0500", height: 210,
              display: "flex", flexDirection: "column",
              position: "relative",
            }}
          >
            <Box
              sx={{
                px: 1.5, py: 0.5, bgcolor: "#1a0f00",
                borderBottom: "1px solid #eab30833",
                display: "flex", justifyContent: "space-between", alignItems: "center",
              }}
            >
              <Typography variant="caption" sx={{ color: "#eab308", fontWeight: "bold" }}>
                💬 Chat do Cassino (somente sistema)
              </Typography>
              <Typography variant="caption" sx={{ color: "#a16207", fontSize: "0.6rem" }}>
                {chatVisivel.length} / {chatMensagens.length} mensagens
              </Typography>
            </Box>

            <Box
              ref={chatBoxRef}
              onScroll={handleChatScroll}
              sx={{
                flex: 1, overflowY: "auto", px: 1.5, py: 0.8,
                "&::-webkit-scrollbar": { width: "4px" },
                "&::-webkit-scrollbar-thumb": { background: "#eab30844", borderRadius: "10px" },
              }}
            >
              {chatVisibleCount < chatMensagens.length && (
                <Typography
                  variant="caption"
                  sx={{
                    color: "#665500", fontSize: "0.6rem",
                    display: "block", textAlign: "center",
                    mb: 0.5, fontStyle: "italic",
                  }}
                >
                  ⬆ Role para cima para ver mais antigas
                </Typography>
              )}

              {chatVisivel.length === 0 && (
                <Typography
                  variant="caption"
                  sx={{ color: "#665500", fontStyle: "italic", display: "block", textAlign: "center", mt: 2 }}
                >
                  Nenhum jogo ainda. Seja o primeiro a girar!
                </Typography>
              )}

              {chatVisivel.map((m) => (
                <Box
                  key={m.id}
                  sx={{ display: "flex", alignItems: "flex-start", gap: 0.6, mb: 0.5, fontSize: "0.72rem" }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      color: "#665500", fontSize: "0.6rem",
                      flexShrink: 0, mt: 0.15, fontFamily: "monospace",
                    }}
                  >
                    [{formatarData(m.timestamp)}]
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      color: m.tipo === "vitoria" ? "#4caf50" : m.tipo === "derrota" ? "#ef4444" : "#ddd",
                      fontSize: "0.72rem", wordBreak: "break-word",
                    }}
                  >
                    {m.texto}
                  </Typography>
                </Box>
              ))}
              <div ref={chatEndRef} />
            </Box>

            {/* Botão "ir para o final" */}
            {!chatNoFundo && (
              <IconButton
                size="small"
                onClick={scrollToBottom}
                sx={{
                  position: "absolute",
                  right: 12, bottom: 12,
                  bgcolor: "#eab308", color: "#000",
                  width: 30, height: 30,
                  boxShadow: "0 0 15px rgba(234,179,8,0.6)",
                  animation: "blink 1.2s infinite",
                  "&:hover": { bgcolor: "#facc15" },
                }}
              >
                <KeyboardArrowDownIcon fontSize="small" />
              </IconButton>
            )}
          </Box>
        </Box>
      )}

      {/* CSS de animações */}
      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes pulse0 { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes pulse1 { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }
        @keyframes pulse2 { 0%, 100% { opacity: 0.7; } 50% { opacity: 0.3; } }
        @keyframes victory {
          0% { transform: scale(0.8); opacity: 0; }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes streakPop {
          0% { transform: translate(-50%, -50%) scale(0.3); opacity: 0; }
          50% { transform: translate(-50%, -50%) scale(1.3); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
        }
      `}</style>

      {/* Alça de redimensionamento */}
      {!minimizado && (
        <Box
          sx={{
            position: "absolute", bottom: 0, right: 0,
            width: 16, height: 16,
            cursor: "nwse-resize", zIndex: 10,
          }}
          onMouseDown={(e) => {
            e.preventDefault(); e.stopPropagation();
            setRedimensionando(true);
            resizeStartRef.current = {
              x: e.clientX, y: e.clientY,
              width: tamanho.width, height: tamanho.height,
            };
          }}
        />
      )}
    </Paper>,
    document.body
  );
}

export default React.memo(CassinoJogos);
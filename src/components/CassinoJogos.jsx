// src/components/CassinoJogos.jsx
import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  Box, Paper, Typography, IconButton, Button, TextField,
  Chip, Avatar, Grid
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import SendIcon from "@mui/icons-material/Send";
import CasinoIcon from "@mui/icons-material/Casino";
import SportsScoreIcon from "@mui/icons-material/SportsScore";
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
  [0, 1, 2], // topo
  [3, 4, 5], // meio
  [6, 7, 8], // baixo
  [0, 3, 6], // esq
  [1, 4, 7], // centro
  [2, 5, 8], // dir
  [0, 4, 8], // diagonal \
  [2, 4, 6], // diagonal /
];

const CORES_CAVALOS = [
  { cor: "#ef4444", nome: "Vermelho" },
  { cor: "#3b82f6", nome: "Azul" },
  { cor: "#22c55e", nome: "Verde" },
  { cor: "#eab308", nome: "Amarelo" },
  { cor: "#a855f7", nome: "Roxo" },
  { cor: "#f97316", nome: "Laranja" },
];

function CassinoJogos({ userEmail, userNick, isMaster, onClose }) {
  // ============ JANELA ============
  const [posicao, setPosicao] = useState({ x: 150, y: 50 });
  const [tamanho, setTamanho] = useState({ width: 820, height: 780 });
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

  // ============ CORRIDA ============
  const [apostaCorrida, setApostaCorrida] = useState(50);
  const [cavaloEscolhido, setCavaloEscolhido] = useState(null);
  const [corrida, setCorrida] = useState(null);
  const [resultadoCorrida, setResultadoCorrida] = useState(null);
  const rafRef = useRef(null);
  const corridaRef = useRef(null);

  // ============ CHAT GLOBAL ============
  const [chatMensagens, setChatMensagens] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const chatEndRef = useRef(null);

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
              (sum, v) => sum + (typeof v === "number" ? v : 0),
              0
            );
        setSaldo(total);
      }
    });
    return () => unsub();
  }, [userEmail]);

  // ============ CHAT GLOBAL (Firestore) ============
  useEffect(() => {
    const q = query(
      collection(db, "cassino_chat"),
      orderBy("timestamp", "desc"),
      limit(60)
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

  // Auto-scroll no chat
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMensagens]);

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
          width: Math.max(
            650,
            resizeStartRef.current.width +
              (e.clientX - resizeStartRef.current.x)
          ),
          height: Math.max(
            600,
            resizeStartRef.current.height +
              (e.clientY - resizeStartRef.current.y)
          ),
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
          restante = 0;
          debited = true;
          return novo;
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
          restante = 0;
          debited = true;
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
        novasCarteiras[chaves[0]] =
          (novasCarteiras[chaves[0]] || 0) + valor;
      }
    }

    await setDoc(ref, { carteiras: novasCarteiras }, { merge: true });
  };

  // ============ CHAT ============
  const enviarMensagemChat = async (texto, tipo = "chat") => {
    try {
      await addDoc(collection(db, "cassino_chat"), {
        userEmail: userEmail || "anon",
        userNick: userNick || "Anônimo",
        texto,
        tipo,
        timestamp: serverTimestamp(),
      });
    } catch (e) {
      console.warn("Erro ao enviar mensagem:", e);
    }
  };

  const enviarChatManual = async () => {
    if (!chatInput.trim()) return;
    const texto = chatInput.trim();
    setChatInput("");
    await enviarMensagemChat(texto, "chat");
  };

  const formatarData = (ts) => {
    if (!ts) return "agora";
    try {
      const date = ts.toDate ? ts.toDate() : new Date(ts);
      return date.toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch {
      return "—";
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

    // 1) Sorteia o resultado final (antes de parar)
    const resultadoFinal = [];
    for (let col = 0; col < 3; col++) {
      const colunaRes = [];
      for (let row = 0; row < 3; row++) {
        colunaRes.push(sortearSimbolo().emoji);
      }
      resultadoFinal.push(colunaRes);
    }

    // 2) Anima cada coluna com sorteio rápido
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

    // 3) Para cada coluna com delay escalonado
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

    // 4) Finaliza: checa paylines e paga
    setTimeout(async () => {
      // Grid em row-major: grid[row*3 + col] = emoji
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
        setResultadoTigrinho({
          tipo: "vitoria",
          premio: premioTotal,
          mensagem: `🎉 Você ganhou 💰 ${premioTotal}!`,
        });
        await enviarMensagemChat(
          `🎰 ${userNick} ganhou 💰 ${premioTotal} no Tigrinho! 🎉`,
          "vitoria"
        );
      } else {
        setResultadoTigrinho({
          tipo: "derrota",
          mensagem: `❌ Não foi dessa vez! Perdeu 💰 ${apostaTigrinho}.`,
        });
        await enviarMensagemChat(
          `🎰 ${userNick} perdeu 💰 ${apostaTigrinho} no Tigrinho.`,
          "derrota"
        );
      }

      setGirando(false);
      setColunasParando([false, false, false]);
    }, 2400);
  };

  // ============ CORRIDA ============
  const pontoNoCircuito = (progress) => {
    const cx = 200;
    const cy = 150;
    const rx = 150;
    const ry = 100;
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

    const cavalos = CORES_CAVALOS.map((c, i) => ({
      id: i,
      cor: c.cor,
      nome: c.nome,
      progress: 0,
      baseSpeed: 0.18 + Math.random() * 0.05,
    }));

    corridaRef.current = {
      cavalos,
      rodando: true,
      vencedor: null,
      cavaloEscolhido,
      ultimaAtualizacao: performance.now(),
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
    const cavaloVencedor = CORES_CAVALOS[vencedorId];
    const cavaloApostado = CORES_CAVALOS[ref.cavaloEscolhido];

    if (ref.cavaloEscolhido === vencedorId) {
      const premio = Math.floor(apostaCorrida * 5);
      await creditarSaldo(premio);
      setResultadoCorrida({
        tipo: "vitoria",
        mensagem: `🏆 Você acertou! ${cavaloVencedor.nome} venceu — ganhou 💰 ${premio}!`,
      });
      await enviarMensagemChat(
        `🏇 ${userNick} apostou no ${cavaloApostado.nome} e ACERTOU! Ganhou 💰 ${premio}.`,
        "vitoria"
      );
    } else {
      setResultadoCorrida({
        tipo: "derrota",
        mensagem: `❌ ${cavaloVencedor.nome} venceu. Você apostou no ${cavaloApostado.nome} e perdeu 💰 ${apostaCorrida}.`,
      });
      await enviarMensagemChat(
        `🏇 ${userNick} apostou no ${cavaloApostado.nome} mas ${cavaloVencedor.nome} venceu. Perdeu 💰 ${apostaCorrida}.`,
        "derrota"
      );
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

  // ============ HELPERS DE RENDER ============
  const celulaVencedora = (flatIdx) =>
    linhasVencedoras.some((l) => l.includes(flatIdx));

  // ============ RENDER ============
  return createPortal(
    <Paper
      elevation={10}
      sx={{
        position: "fixed",
        left: posicao.x,
        top: posicao.y,
        width: minimizado ? 320 : tamanho.width,
        height: minimizado ? 48 : tamanho.height,
        bgcolor: "#0f0a00",
        color: "#eab308",
        borderRadius: 2,
        border: "2px solid #eab308",
        zIndex: 9998,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        boxShadow:
          "0 0 40px rgba(234,179,8,0.4), 0 8px 32px rgba(0,0,0,0.9)",
        background:
          "radial-gradient(ellipse at top, #2a1a00 0%, #0f0a00 70%)",
      }}
    >
      {/* BARRA DE TÍTULO */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          p: 1,
          bgcolor: "#1a0f00",
          cursor: "move",
          minHeight: 42,
          borderBottom: "1px solid #eab30844",
        }}
        onMouseDown={(e) => {
          if (e.target.tagName === "BUTTON" || e.target.tagName === "INPUT")
            return;
          e.preventDefault();
          setArrastando(true);
          dragStartRef.current = {
            x: e.clientX - posicao.x,
            y: e.clientY - posicao.y,
          };
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography
            variant="subtitle2"
            sx={{ color: "#eab308", fontWeight: "bold", fontSize: "0.9rem" }}
          >
            🎰 {minimizado ? "Cassino" : "Cassino Réquiem"}
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 0.5, alignItems: "center" }}>
          <Chip
            label={`💰 ${saldo.toLocaleString("pt-BR")}`}
            size="small"
            sx={{
              bgcolor: "#3a2a00",
              color: "#facc15",
              fontWeight: "bold",
              mr: 1,
              fontSize: "0.7rem",
            }}
          />
          <IconButton
            size="small"
            onClick={() => setMinimizado(!minimizado)}
            sx={{ color: "#eab308", p: 0.5 }}
          >
            {minimizado ? "□" : "−"}
          </IconButton>
          <IconButton
            size="small"
            onClick={onClose}
            sx={{ color: "#eab308", p: 0.5 }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      {!minimizado && (
        <Box
          sx={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* ABAS */}
          <Box
            sx={{
              display: "flex",
              gap: 0.5,
              borderBottom: "1px solid #eab30833",
              px: 1.5,
              pt: 1,
            }}
          >
            <Button
              size="small"
              onClick={() => setAbaAtiva("tigrinho")}
              startIcon={<CasinoIcon sx={{ fontSize: 16 }} />}
              sx={{
                color: abaAtiva === "tigrinho" ? "#facc15" : "#a16207",
                fontSize: "0.75rem",
                fontWeight: "bold",
                bgcolor:
                  abaAtiva === "tigrinho" ? "#eab30822" : "transparent",
                borderBottom:
                  abaAtiva === "tigrinho" ? "2px solid #eab308" : "none",
                borderRadius: 0,
                py: 0.8,
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
                fontSize: "0.75rem",
                fontWeight: "bold",
                bgcolor: abaAtiva === "aposta" ? "#eab30822" : "transparent",
                borderBottom:
                  abaAtiva === "aposta" ? "2px solid #eab308" : "none",
                borderRadius: 0,
                py: 0.8,
              }}
            >
              🏇 Aposta
            </Button>
          </Box>

          {/* ÁREA DE JOGO */}
          <Box
            sx={{
              flex: 1,
              p: 1.5,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              "&::-webkit-scrollbar": { width: "4px" },
              "&::-webkit-scrollbar-thumb": {
                background: "#eab30844",
                borderRadius: "10px",
              },
            }}
          >
            {/* ==================== TIGRINHO ==================== */}
            {abaAtiva === "tigrinho" && (
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 1.5,
                }}
              >
                {/* Moldura decorativa */}
                <Paper
                  sx={{
                    p: 2,
                    bgcolor: "#1a0f00",
                    border: "3px solid #eab308",
                    borderRadius: 3,
                    boxShadow:
                      "0 0 30px rgba(234,179,8,0.5), inset 0 0 30px rgba(234,179,8,0.15)",
                    position: "relative",
                  }}
                >
                  {/* Luzes de topo (decorativo) */}
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "center",
                      gap: 0.5,
                      mb: 1,
                    }}
                  >
                    {Array(9)
                      .fill(0)
                      .map((_, i) => (
                        <Box
                          key={i}
                          sx={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            bgcolor: girando
                              ? i % 3 === 0
                                ? "#facc15"
                                : "#a16207"
                              : "#facc15",
                            boxShadow: "0 0 8px #facc15",
                            animation: girando
                              ? `pulse${i % 3} 0.6s infinite`
                              : "none",
                          }}
                        />
                      ))}
                  </Box>

                  {/* Grid 3x3 */}
                  <Grid container spacing={0.8}>
                    {[0, 1, 2].map((colIdx) => (
                      <Grid item xs={4} key={colIdx}>
                        {[0, 1, 2].map((rowIdx) => {
                          const flatIdx = rowIdx * 3 + colIdx;
                          const isWinner = celulaVencedora(flatIdx);
                          const estaGirando =
                            girando && !colunasParando[colIdx];
                          return (
                            <Paper
                              key={rowIdx}
                              sx={{
                                py: 1,
                                my: 0.4,
                                textAlign: "center",
                                bgcolor: isWinner ? "#3a2a00" : "#0a0500",
                                border: isWinner
                                  ? "2px solid #facc15"
                                  : "1px solid #a1620733",
                                boxShadow: isWinner
                                  ? "0 0 25px rgba(250,204,21,0.8), inset 0 0 15px rgba(250,204,21,0.3)"
                                  : "inset 0 0 10px rgba(0,0,0,0.6)",
                                transition: "all 0.3s ease",
                                filter: estaGirando
                                  ? "blur(1.8px) brightness(1.3)"
                                  : isWinner
                                  ? "brightness(1.15)"
                                  : "none",
                                transform: isWinner
                                  ? "scale(1.03)"
                                  : "scale(1)",
                              }}
                            >
                              <Typography
                                sx={{
                                  fontSize: "2.2rem",
                                  lineHeight: 1,
                                  userSelect: "none",
                                }}
                              >
                                {colunas[colIdx]?.[rowIdx] || "❓"}
                              </Typography>
                            </Paper>
                          );
                        })}
                      </Grid>
                    ))}
                  </Grid>

                  {/* Rodapé da moldura */}
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "center",
                      gap: 0.5,
                      mt: 1,
                    }}
                  >
                    {Array(9)
                      .fill(0)
                      .map((_, i) => (
                        <Box
                          key={i}
                          sx={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            bgcolor: girando
                              ? i % 3 === 1
                                ? "#facc15"
                                : "#a16207"
                              : "#facc15",
                            boxShadow: "0 0 8px #facc15",
                          }}
                        />
                      ))}
                  </Box>
                </Paper>

                {/* Controles */}
                <Box
                  sx={{
                    display: "flex",
                    gap: 1,
                    alignItems: "center",
                    width: "100%",
                    maxWidth: 400,
                  }}
                >
                  <TextField
                    size="small"
                    type="number"
                    label="Aposta"
                    value={apostaTigrinho}
                    onChange={(e) =>
                      setApostaTigrinho(
                        Math.max(1, Number(e.target.value) || 1)
                      )
                    }
                    disabled={girando}
                    InputProps={{
                      style: { color: "#eab308", fontSize: "0.85rem" },
                    }}
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
                    onClick={girarTigrinho}
                    disabled={girando || apostaTigrinho <= 0}
                    startIcon={<CasinoIcon />}
                    fullWidth
                    sx={{
                      bgcolor: "#eab308",
                      color: "#000",
                      fontWeight: "bold",
                      py: 1.2,
                      fontSize: "0.95rem",
                      boxShadow: "0 0 20px rgba(234,179,8,0.5)",
                      "&:hover": { bgcolor: "#ca8a04" },
                      "&:disabled": { bgcolor: "#5a4a10", color: "#8a7a30" },
                    }}
                  >
                    {girando ? "🎰 GIRANDO..." : "🎰 GIRAR!"}
                  </Button>
                </Box>

                {/* Resultado */}
                {resultadoTigrinho && !girando && (
                  <Paper
                    sx={{
                      p: 1.5,
                      width: "100%",
                      maxWidth: 400,
                      bgcolor:
                        resultadoTigrinho.tipo === "vitoria"
                          ? "#1b5e20"
                          : "#5e1b1b",
                      border: `2px solid ${
                        resultadoTigrinho.tipo === "vitoria"
                          ? "#4caf50"
                          : "#ef4444"
                      }`,
                      textAlign: "center",
                      animation:
                        resultadoTigrinho.tipo === "vitoria"
                          ? "victory 0.6s ease"
                          : "none",
                    }}
                  >
                    <Typography
                      sx={{
                        color:
                          resultadoTigrinho.tipo === "vitoria"
                            ? "#4caf50"
                            : "#ef4444",
                        fontWeight: "bold",
                        fontSize: "1rem",
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
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 1.5,
                }}
              >
                {/* Pista */}
                <Paper
                  sx={{
                    p: 1.5,
                    bgcolor: "#0a1a0a",
                    border: "2px solid #22c55e",
                    borderRadius: 3,
                    boxShadow: "0 0 30px rgba(34,197,94,0.35)",
                    width: "100%",
                    maxWidth: 600,
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      mb: 0.5,
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{ color: "#22c55e", fontWeight: "bold" }}
                    >
                      🏇 CIRCUITO
                    </Typography>
                    {corrida?.rodando && (
                      <Chip
                        label="CORRENDO!"
                        size="small"
                        sx={{
                          bgcolor: "#22c55e22",
                          color: "#22c55e",
                          fontSize: "0.6rem",
                          height: 18,
                          animation: "blink 0.8s infinite",
                        }}
                      />
                    )}
                    {!corrida?.rodando && corrida?.vencedor !== undefined && corrida?.vencedor !== null && (
                      <Chip
                        label={`🏆 ${
                          CORES_CAVALOS[corrida.vencedor]?.nome
                        } venceu!`}
                        size="small"
                        sx={{
                          bgcolor: "#facc1522",
                          color: "#facc15",
                          fontSize: "0.6rem",
                          height: 18,
                        }}
                      />
                    )}
                  </Box>

                  <Box
                    sx={{
                      width: "100%",
                      aspectRatio: "4 / 3",
                      maxHeight: 320,
                      mx: "auto",
                    }}
                  >
                    <svg
                      viewBox="0 0 400 300"
                      style={{ width: "100%", height: "100%" }}
                    >
                      {/* Pista externa */}
                      <ellipse
                        cx="200"
                        cy="150"
                        rx="150"
                        ry="100"
                        fill="none"
                        stroke="#14532d"
                        strokeWidth="46"
                      />
                      {/* Pista interna (asfalto) */}
                      <ellipse
                        cx="200"
                        cy="150"
                        rx="150"
                        ry="100"
                        fill="none"
                        stroke="#1e3a1e"
                        strokeWidth="40"
                        strokeDasharray="6 4"
                      />
                      {/* Borda interna */}
                      <ellipse
                        cx="200"
                        cy="150"
                        rx="130"
                        ry="80"
                        fill="none"
                        stroke="#22c55e"
                        strokeWidth="1.5"
                      />
                      {/* Borda externa */}
                      <ellipse
                        cx="200"
                        cy="150"
                        rx="170"
                        ry="120"
                        fill="none"
                        stroke="#22c55e"
                        strokeWidth="1.5"
                      />

                      {/* Linha de chegada (topo) */}
                      <line
                        x1="200"
                        y1="30"
                        x2="200"
                        y2="70"
                        stroke="#fff"
                        strokeWidth="3"
                        strokeDasharray="4 3"
                      />
                      <text
                        x="200"
                        y="20"
                        textAnchor="middle"
                        fill="#facc15"
                        fontSize="10"
                        fontWeight="bold"
                      >
                        🏁 CHEGADA
                      </text>

                      {/* Cavalos (bolinhas) */}
                      {(corrida?.cavalos || []).map((c) => {
                        const p = pontoNoCircuito(c.progress);
                        const isEscolhido = cavaloEscolhido === c.id;
                        const isVencedor = corrida?.vencedor === c.id;
                        return (
                          <g key={c.id}>
                            {/* Halo do vencedor */}
                            {isVencedor && (
                              <circle
                                cx={p.x}
                                cy={p.y}
                                r="20"
                                fill="none"
                                stroke="#facc15"
                                strokeWidth="3"
                                opacity="0.8"
                              >
                                <animate
                                  attributeName="r"
                                  values="16;24;16"
                                  dur="0.8s"
                                  repeatCount="indefinite"
                                />
                                <animate
                                  attributeName="opacity"
                                  values="0.9;0.3;0.9"
                                  dur="0.8s"
                                  repeatCount="indefinite"
                                />
                              </circle>
                            )}
                            <circle
                              cx={p.x}
                              cy={p.y}
                              r="14"
                              fill={c.cor}
                              stroke={isEscolhido ? "#facc15" : "#fff"}
                              strokeWidth={isEscolhido ? "3" : "2"}
                            />
                            <text
                              x={p.x}
                              y={p.y + 5}
                              textAnchor="middle"
                              fontSize="12"
                              fill="#fff"
                              fontWeight="bold"
                            >
                              {c.id + 1}
                            </text>
                          </g>
                        );
                      })}

                      {/* Se não começou, mostra cavalos no grid de partida */}
                      {!corrida && (
                        <>
                          {CORES_CAVALOS.map((c, i) => {
                            const x = 160 + i * 16;
                            const y = 150;
                            return (
                              <g key={i}>
                                <circle
                                  cx={x}
                                  cy={y}
                                  r="6"
                                  fill={c.cor}
                                  stroke="#fff"
                                  strokeWidth="1"
                                />
                              </g>
                            );
                          })}
                          <text
                            x="200"
                            y="180"
                            textAnchor="middle"
                            fill="#22c55e"
                            fontSize="11"
                          >
                            Aguardando largada...
                          </text>
                        </>
                      )}
                    </svg>
                  </Box>
                </Paper>

                {/* Escolha de cavalo */}
                <Box
                  sx={{
                    display: "flex",
                    gap: 0.7,
                    flexWrap: "wrap",
                    justifyContent: "center",
                    width: "100%",
                    maxWidth: 600,
                  }}
                >
                  {CORES_CAVALOS.map((c, i) => (
                    <Chip
                      key={i}
                      label={`${i + 1} ${c.nome}`}
                      onClick={() => setCavaloEscolhido(i)}
                      disabled={!!corrida?.rodando}
                      sx={{
                        bgcolor:
                          cavaloEscolhido === i ? c.cor : "#1a0f00",
                        color: cavaloEscolhido === i ? "#fff" : c.cor,
                        border: `2px solid ${c.cor}`,
                        fontWeight: "bold",
                        cursor: "pointer",
                        fontSize: "0.75rem",
                        transition: "all 0.2s",
                        transform:
                          cavaloEscolhido === i ? "scale(1.08)" : "scale(1)",
                        "&:hover": { bgcolor: c.cor + "44" },
                      }}
                    />
                  ))}
                </Box>

                {/* Controles */}
                <Box
                  sx={{
                    display: "flex",
                    gap: 1,
                    alignItems: "center",
                    width: "100%",
                    maxWidth: 400,
                  }}
                >
                  <TextField
                    size="small"
                    type="number"
                    label="Aposta"
                    value={apostaCorrida}
                    onChange={(e) =>
                      setApostaCorrida(
                        Math.max(1, Number(e.target.value) || 1)
                      )
                    }
                    disabled={!!corrida?.rodando}
                    InputProps={{
                      style: { color: "#eab308", fontSize: "0.85rem" },
                    }}
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
                    startIcon={<SportsScoreIcon />}
                    fullWidth
                    sx={{
                      bgcolor: "#22c55e",
                      color: "#fff",
                      fontWeight: "bold",
                      py: 1.2,
                      fontSize: "0.95rem",
                      boxShadow: "0 0 20px rgba(34,197,94,0.5)",
                      "&:hover": { bgcolor: "#16a34a" },
                      "&:disabled": { bgcolor: "#1a3a1a", color: "#5a8a5a" },
                    }}
                  >
                    {corrida?.rodando ? "🏇 CORRENDO..." : "🏇 APOSTAR!"}
                  </Button>
                </Box>

                {/* Resultado da corrida */}
                {resultadoCorrida && !corrida?.rodando && (
                  <Paper
                    sx={{
                      p: 1.5,
                      width: "100%",
                      maxWidth: 400,
                      bgcolor:
                        resultadoCorrida.tipo === "vitoria"
                          ? "#1b5e20"
                          : "#5e1b1b",
                      border: `2px solid ${
                        resultadoCorrida.tipo === "vitoria"
                          ? "#4caf50"
                          : "#ef4444"
                      }`,
                      textAlign: "center",
                    }}
                  >
                    <Typography
                      sx={{
                        color:
                          resultadoCorrida.tipo === "vitoria"
                            ? "#4caf50"
                            : "#ef4444",
                        fontWeight: "bold",
                        fontSize: "0.9rem",
                      }}
                    >
                      {resultadoCorrida.mensagem}
                    </Typography>
                  </Paper>
                )}
              </Box>
            )}
          </Box>

          {/* ==================== CHAT GLOBAL ==================== */}
          <Box
            sx={{
              borderTop: "2px solid #eab30844",
              bgcolor: "#0a0500",
              height: 200,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Box
              sx={{
                px: 1.5,
                py: 0.5,
                bgcolor: "#1a0f00",
                borderBottom: "1px solid #eab30833",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Typography
                variant="caption"
                sx={{ color: "#eab308", fontWeight: "bold" }}
              >
                💬 Chat Global do Cassino
              </Typography>
              <Typography variant="caption" sx={{ color: "#a16207", fontSize: "0.6rem" }}>
                {chatMensagens.length} mensagens
              </Typography>
            </Box>

            <Box
              sx={{
                flex: 1,
                overflowY: "auto",
                px: 1.5,
                py: 0.8,
                "&::-webkit-scrollbar": { width: "4px" },
                "&::-webkit-scrollbar-thumb": {
                  background: "#eab30844",
                  borderRadius: "10px",
                },
              }}
            >
              {chatMensagens.length === 0 && (
                <Typography
                  variant="caption"
                  sx={{
                    color: "#665500",
                    fontStyle: "italic",
                    display: "block",
                    textAlign: "center",
                    mt: 2,
                  }}
                >
                  Nenhuma mensagem ainda. Seja o primeiro!
                </Typography>
              )}
              {chatMensagens.map((m) => {
                const isSystem = m.tipo && m.tipo !== "chat";
                const isMine = m.userEmail === userEmail;
                return (
                  <Box
                    key={m.id}
                    sx={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 0.6,
                      mb: 0.5,
                      fontSize: "0.72rem",
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{
                        color: "#665500",
                        fontSize: "0.6rem",
                        flexShrink: 0,
                        mt: 0.15,
                        fontFamily: "monospace",
                      }}
                    >
                      [{formatarData(m.timestamp)}]
                    </Typography>
                    {!isSystem && (
                      <Typography
                        variant="caption"
                        sx={{
                          color: isMine ? "#facc15" : "#22c55e",
                          fontWeight: "bold",
                          fontSize: "0.72rem",
                          flexShrink: 0,
                        }}
                      >
                        {m.userNick}:
                      </Typography>
                    )}
                    <Typography
                      variant="caption"
                      sx={{
                        color: isSystem
                          ? m.tipo === "vitoria"
                            ? "#4caf50"
                            : "#ef4444"
                          : "#ddd",
                        fontSize: "0.72rem",
                        wordBreak: "break-word",
                      }}
                    >
                      {m.texto}
                    </Typography>
                  </Box>
                );
              })}
              <div ref={chatEndRef} />
            </Box>

            {/* Input do chat */}
            <Box
              sx={{
                p: 0.7,
                borderTop: "1px solid #eab30833",
                display: "flex",
                gap: 0.5,
                bgcolor: "#1a0f00",
              }}
            >
              <TextField
                size="small"
                fullWidth
                placeholder="Digite uma mensagem..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    enviarChatManual();
                  }
                }}
                InputProps={{
                  style: { color: "#eab308", fontSize: "0.75rem" },
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    "& fieldset": { borderColor: "#a1620744" },
                    "&:hover fieldset": { borderColor: "#eab308" },
                    "&.Mui-focused fieldset": { borderColor: "#eab308" },
                  },
                }}
              />
              <IconButton
                size="small"
                onClick={enviarChatManual}
                sx={{
                  color: "#eab308",
                  bgcolor: "#2a1a00",
                  "&:hover": { bgcolor: "#3a2a00" },
                }}
              >
                <SendIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>
        </Box>
      )}

      {/* CSS de animações */}
      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes pulse0 {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes pulse1 {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
        @keyframes pulse2 {
          0%, 100% { opacity: 0.7; }
          50% { opacity: 0.3; }
        }
        @keyframes victory {
          0% { transform: scale(0.8); opacity: 0; }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>

      {/* Alça de redimensionamento */}
      {!minimizado && (
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
    </Paper>,
    document.body
  );
}

export default React.memo(CassinoJogos);
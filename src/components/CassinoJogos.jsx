// src/components/CassinoJogos.jsx
import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Box, Paper, Typography, IconButton, Button, TextField, Chip, Avatar, Grid, Divider } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import AddIcon from "@mui/icons-material/Add";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import CasinoIcon from "@mui/icons-material/Casino";
import { db } from "../firebaseConfig";
import { doc, setDoc, onSnapshot, collection, addDoc, serverTimestamp, getDoc, updateDoc, deleteDoc } from "firebase/firestore";

function CassinoJogos({ userEmail, userNick, isMaster, onClose }) {
  const [posicao, setPosicao] = useState({ x: 200, y: 80 });
  const [tamanho, setTamanho] = useState({ width: 700, height: 600 });
  const [minimizado, setMinimizado] = useState(false);
  const [arrastando, setArrastando] = useState(false);
  const [redimensionando, setRedimensionando] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const resizeStartRef = useRef({ x: 0, y: 0, width: 0, height: 0 });
  const [saldo, setSaldo] = useState(0);
  const [salas, setSalas] = useState([]);
  const [salaAtual, setSalaAtual] = useState(null);
  const [jogadoresSala, setJogadoresSala] = useState([]);
  const [abaAtiva, setAbaAtiva] = useState("salas");
  const [resultado, setResultado] = useState(null);
  const [jogando, setJogando] = useState(false);
  const [historico, setHistorico] = useState([]);
  const [novaSalaNome, setNovaSalaNome] = useState("");
  const [novaSalaJogo, setNovaSalaJogo] = useState("dados");
  const [novaSalaEntrada, setNovaSalaEntrada] = useState(50);
  const [novaSalaMaxJogadores, setNovaSalaMaxJogadores] = useState(4);
  const [todosProntos, setTodosProntos] = useState(false);
  
  // 🟢 JOGOS SOLO
  const [soloJogo, setSoloJogo] = useState("tigrinho");
  const [soloAposta, setSoloAposta] = useState(10);
  const [soloResultado, setSoloResultado] = useState(null);
  const [soloGirando, setSoloGirando] = useState(false);
  const [tigrinhoGrid, setTigrinhoGrid] = useState([]);
  
  // 🟢 JOGOS DE SALA
  const [jogoSala, setJogoSala] = useState("dados");
  const [cartasJogador, setCartasJogador] = useState([]);
  const [cartasMesa, setCartasMesa] = useState([]);
  const [roletaAngulo, setRoletaAngulo] = useState(0);
  const [roletaGirando, setRoletaGirando] = useState(false);
  const [dadosRolagem, setDadosRolagem] = useState([]);

  useEffect(() => {
    if (!userEmail) return;
    const ref = doc(db, "fichas", userEmail);
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        const ficha = snap.data();
        const carteiras = ficha.carteiras || [];
        const total = carteiras.reduce((sum, c) => sum + (c.valor || 0), 0);
        setSaldo(total);
      }
    });
    return () => unsub();
  }, [userEmail]);

  useEffect(() => {
    const ref = collection(db, "cassino_salas");
    const unsub = onSnapshot(ref, (snap) => {
      const arr = [];
      snap.forEach(d => arr.push({ id: d.id, ...d.data() }));
      setSalas(arr);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!salaAtual) return;
    const ref = collection(db, "cassino_salas", salaAtual.id, "jogadores");
    const unsub = onSnapshot(ref, (snap) => {
      const arr = [];
      snap.forEach(d => arr.push({ id: d.id, ...d.data() }));
      setJogadoresSala(arr);
      // Atualizar prontidão
      if (arr.length >= 2 && arr.every(j => j.pronto)) {
        setTodosProntos(true);
      } else {
        setTodosProntos(false);
      }
      // Atualizar jogo da sala
      const salaRef = doc(db, "cassino_salas", salaAtual.id);
      getDoc(salaRef).then(snap => {
        if (snap.exists()) {
          setJogoSala(snap.data().jogo || "dados");
        }
      });
    });
    return () => unsub();
  }, [salaAtual]);

  // 🟢 OUVIR RESULTADOS DA SALA
  useEffect(() => {
    if (!salaAtual) return;
    const ref = collection(db, "cassino_salas", salaAtual.id, "resultados");
    const unsub = onSnapshot(ref, (snap) => {
      snap.docChanges().forEach(change => {
        if (change.type === "added") {
          const data = change.doc.data();
          setResultado(data);
          setHistorico(prev => [data, ...prev].slice(0, 30));
          setJogando(false);
          setRoletaGirando(false);
        }
      });
    });
    return () => unsub();
  }, [salaAtual]);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (arrastando) setPosicao({ x: e.clientX - dragStartRef.current.x, y: e.clientY - dragStartRef.current.y });
      if (redimensionando) setTamanho({ width: Math.max(550, resizeStartRef.current.width + (e.clientX - resizeStartRef.current.x)), height: Math.max(500, resizeStartRef.current.height + (e.clientY - resizeStartRef.current.y)) });
    };
    const handleMouseUp = () => { setArrastando(false); setRedimensionando(false); };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => { window.removeEventListener("mousemove", handleMouseMove); window.removeEventListener("mouseup", handleMouseUp); };
  }, [arrastando, redimensionando]);

  // 🟢 DEBITAR SALDO
  const debitarSaldo = async (valor) => {
    const ref = doc(db, "fichas", userEmail);
    const snap = await getDoc(ref);
    const ficha = snap.data();
    const carteiras = ficha.carteiras || [];
    let restante = valor;
    let debited = false;
    const novasCarteiras = carteiras.map(c => {
      if (restante <= 0) return c;
      if (c.valor >= restante) { const novo = { ...c, valor: c.valor - restante }; restante = 0; debited = true; return novo; }
      else { restante -= c.valor; return { ...c, valor: 0 }; }
    });
    if (!debited && restante > 0) return false;
    await setDoc(ref, { carteiras: novasCarteiras }, { merge: true });
    return true;
  };

  // 🟢 CREDITAR SALDO
  const creditarSaldo = async (valor) => {
    const ref = doc(db, "fichas", userEmail);
    const snap = await getDoc(ref);
    const ficha = snap.data();
    const carteiras = ficha.carteiras || [];
    if (carteiras.length === 0) return;
    const novasCarteiras = [...carteiras];
    novasCarteiras[0] = { ...novasCarteiras[0], valor: (novasCarteiras[0].valor || 0) + valor };
    await setDoc(ref, { carteiras: novasCarteiras }, { merge: true });
  };

  // 🟢 JOGO SOLO: TIGRINHO
  const jogarTigrinho = async () => {
    if (soloGirando || soloAposta <= 0 || saldo < soloAposta) return;
    const ok = await debitarSaldo(soloAposta);
    if (!ok) return alert("Saldo insuficiente!");
    setSoloGirando(true);
    setSoloResultado(null);
    
    const simbolos = ["🍒", "🍋", "🍊", "🔔", "⭐", "💎", "7️⃣"];
    const grid = [];
    for (let i = 0; i < 9; i++) {
      grid.push(simbolos[Math.floor(Math.random() * simbolos.length)]);
    }
    
    // Animação
    const interval = setInterval(() => {
      setTigrinhoGrid(() => {
        const nova = [];
        for (let i = 0; i < 9; i++) {
          nova.push(simbolos[Math.floor(Math.random() * simbolos.length)]);
        }
        return nova;
      });
    }, 100);
    
    setTimeout(async () => {
      clearInterval(interval);
      setTigrinhoGrid(grid);
      
      // Verificar linhas (3 linhas horizontais)
      let premio = 0;
      const linhas = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6]
      ];
      
      for (const linha of linhas) {
        if (grid[linha[0]] === grid[linha[1]] && grid[linha[1]] === grid[linha[2]]) {
          const idx = simbolos.indexOf(grid[linha[0]]);
          premio += soloAposta * (2 + idx);
        }
      }
      
          if (premio > 0) {
        await creditarSaldo(premio);
        setSoloResultado({ tipo: "vitoria", mensagem: `Você ganhou 💰 ${premio}!`, grid });
        window.dispatchEvent(new CustomEvent('desbloquearConquista', { detail: { conquistaId: 'sorte_grande' } }));
      } else {
        setSoloResultado({ tipo: "derrota", mensagem: "Não foi dessa vez!", grid });
      }
      setSoloGirando(false);
    }, 2000);
  };

  // 🟢 JOGO SOLO: DADOS
  const jogarDadosSolo = async () => {
    if (soloGirando || soloAposta <= 0 || saldo < soloAposta) return;
    const ok = await debitarSaldo(soloAposta);
    if (!ok) return alert("Saldo insuficiente!");
    setSoloGirando(true);
    setSoloResultado(null);
    
    const rolagens = [];
    const interval = setInterval(() => {
      setDadosRolagem([Math.floor(Math.random() * 6) + 1, Math.floor(Math.random() * 6) + 1]);
    }, 100);
    
    setTimeout(async () => {
      clearInterval(interval);
      const dado1 = Math.floor(Math.random() * 6) + 1;
      const dado2 = Math.floor(Math.random() * 6) + 1;
      setDadosRolagem([dado1, dado2]);
      
      const soma = dado1 + dado2;
      let premio = 0;
      let mensagem = "";
      
      if (soma === 7 || soma === 11) { premio = soloAposta * 2; mensagem = "🎉 Lucky 7/11!"; }
      else if (dado1 === dado2) { premio = soloAposta * 3; mensagem = "🎯 Par!"; }
      else if (soma >= 9) { premio = soloAposta * 1.5; mensagem = "📈 Soma alta!"; }
      else { mensagem = "❌ Perdeu!"; }
      
      if (premio > 0) {
        await creditarSaldo(premio);
        setSoloResultado({ tipo: "vitoria", mensagem: `${mensagem} Ganhou 💰 ${premio}!` });
      } else {
        setSoloResultado({ tipo: "derrota", mensagem });
      }
      setSoloGirando(false);
    }, 1500);
  };

  // 🟢 JOGO SOLO: CARTAS
  const jogarCartasSolo = async () => {
    if (soloGirando || soloAposta <= 0 || saldo < soloAposta) return;
    const ok = await debitarSaldo(soloAposta);
    if (!ok) return alert("Saldo insuficiente!");
    setSoloGirando(true);
    setSoloResultado(null);
    
    const naipes = ["♠", "♥", "♦", "♣"];
    const valores = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
    
    const cartaJogador = { naipe: naipes[Math.floor(Math.random() * 4)], valor: valores[Math.floor(Math.random() * 13)] };
    const cartaBanca = { naipe: naipes[Math.floor(Math.random() * 4)], valor: valores[Math.floor(Math.random() * 13)] };
    
    const valorJogador = valores.indexOf(cartaJogador.valor);
    const valorBanca = valores.indexOf(cartaBanca.valor);
    
    let premio = 0;
    let mensagem = "";
    if (valorJogador > valorBanca) { premio = soloAposta * 2; mensagem = "🎉 Sua carta é maior!"; }
    else if (valorJogador < valorBanca) { mensagem = "❌ A banca venceu!"; }
    else { premio = soloAposta; mensagem = "🤝 Empate! Aposta devolvida!"; }
    
    setCartasJogador([cartaJogador]);
    setCartasMesa([cartaBanca]);
    
    setTimeout(async () => {
      if (premio > 0) await creditarSaldo(premio);
      setSoloResultado({ tipo: premio > 0 ? "vitoria" : "derrota", mensagem });
      setSoloGirando(false);
    }, 1200);
  };

  // 🟢 CRIAR SALA
  const criarSala = async () => {
    if (!novaSalaNome.trim()) return;
    await addDoc(collection(db, "cassino_salas"), {
      nome: novaSalaNome,
      entrada: novaSalaEntrada,
      jogo: novaSalaJogo,
      maxJogadores: novaSalaMaxJogadores,
      criador: userEmail,
      criadorNome: userNick,
      ativa: true,
      createdAt: serverTimestamp(),
    });
    setNovaSalaNome("");
    setNovaSalaEntrada(50);
  };

  // 🟢 ENTRAR SALA
  const entrarSala = async (sala) => {
    if (saldo < sala.entrada) return alert("Saldo insuficiente!");
    const ok = await debitarSaldo(sala.entrada);
    if (!ok) return;
    await setDoc(doc(db, "cassino_salas", sala.id, "jogadores", userEmail), {
      email: userEmail,
      nome: userNick,
      pronto: false,
      saldoSala: sala.entrada,
    });
    setSalaAtual(sala);
    setJogoSala(sala.jogo || "dados");
  };

  const togglePronto = async () => {
    if (!salaAtual) return;
    const ref = doc(db, "cassino_salas", salaAtual.id, "jogadores", userEmail);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      await updateDoc(ref, { pronto: !snap.data().pronto });
    }
  };

  const sairSala = async () => {
    if (!salaAtual) return;
    const ref = doc(db, "cassino_salas", salaAtual.id, "jogadores", userEmail);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const valorDevolver = snap.data().saldoSala || 0;
      if (valorDevolver > 0) await creditarSaldo(valorDevolver);
      await deleteDoc(ref);
    }
    setSalaAtual(null);
    setTodosProntos(false);
    setResultado(null);
  };

  // 🟢 JOGAR SALA (qualquer jogo)
  const jogarSala = async () => {
    if (!todosProntos || !salaAtual) return;
    setJogando(true);
    setResultado(null);
    
    const pote = jogadoresSala.reduce((s, j) => s + (j.saldoSala || 0), 0);
    const vencedor = jogadoresSala[Math.floor(Math.random() * jogadoresSala.length)];
    const premio = Math.floor(pote * 0.85);
    
    let dadosResultado = null;
    
    if (jogoSala === "dados") {
      const dado1 = Math.floor(Math.random() * 6) + 1;
      const dado2 = Math.floor(Math.random() * 6) + 1;
      dadosResultado = { dado1, dado2, soma: dado1 + dado2 };
      setDadosRolagem([dado1, dado2]);
    } else if (jogoSala === "roleta") {
      const numero = Math.floor(Math.random() * 36);
      dadosResultado = { numero };
      setRoletaGirando(true);
      setTimeout(() => {
        setRoletaGirando(false);
        setRoletaAngulo(numero * 10);
      }, 2000);
    } else if (jogoSala === "cartas") {
      const naipes = ["♠", "♥", "♦", "♣"];
      const valores = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
      const carta = { naipe: naipes[Math.floor(Math.random() * 4)], valor: valores[Math.floor(Math.random() * 13)] };
      dadosResultado = carta;
      setCartasMesa([carta]);
    }
    
    const resultadoFinal = { 
      vencedor: vencedor.nome, 
      premio, 
      jogo: jogoSala, 
      detalhes: dadosResultado,
      timestamp: Date.now()
    };
    
    // 🟢 Se o vencedor for o usuário atual
    if (vencedor.email === userEmail) {
      window.dispatchEvent(new CustomEvent('desbloquearConquista', { detail: { conquistaId: 'sorte_grande' } }));
    }
    
    await addDoc(collection(db, "cassino_salas", salaAtual.id, "resultados"), resultadoFinal);
    await creditarSaldoVencedor(vencedor.email, premio);
    
    // Resetar prontidão
    for (const j of jogadoresSala) {
      await updateDoc(doc(db, "cassino_salas", salaAtual.id, "jogadores", j.email), { pronto: false });
    }
    setJogando(false);
  };

  const creditarSaldoVencedor = async (emailVencedor, valor) => {
    const ref = doc(db, "fichas", emailVencedor);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    const ficha = snap.data();
    const carteiras = ficha.carteiras || [];
    if (carteiras.length === 0) return;
    const novasCarteiras = [...carteiras];
    novasCarteiras[0] = { ...novasCarteiras[0], valor: (novasCarteiras[0].valor || 0) + valor };
    await setDoc(ref, { carteiras: novasCarteiras }, { merge: true });
  };

  const deletarSala = async (id) => {
    await deleteDoc(doc(db, "cassino_salas", id));
  };

  const JOGOS_SALA = [
    { id: "dados", nome: "🎲 Dados", desc: "Role 2 dados, maior soma vence" },
    { id: "cartas", nome: "🃏 Cartas", desc: "Carta mais alta vence" },
    { id: "roleta", nome: "🎰 Roleta", desc: "Sorte pura!" },
  ];

  return createPortal(
    <Paper elevation={10} sx={{ position: "fixed", left: posicao.x, top: posicao.y, width: minimizado ? 300 : tamanho.width, height: minimizado ? 48 : tamanho.height, bgcolor: "#1a0a0a", color: "#ffd700", borderRadius: 2, border: "2px solid #eab308", zIndex: 9998, display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 0 30px rgba(234,179,8,0.3), 0 8px 32px rgba(0,0,0,0.8)" }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", p: 1, bgcolor: "#2a1a00", cursor: "move", minHeight: 40, borderBottom: "1px solid #eab30844" }}
        onMouseDown={(e) => { if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT') return; e.preventDefault(); setArrastando(true); dragStartRef.current = { x: e.clientX - posicao.x, y: e.clientY - posicao.y }; }}>
        <Typography variant="subtitle2" sx={{ color: "#eab308", fontWeight: "bold" }}>🎰 {minimizado ? "Cassino" : "Cassino Réquiem"}</Typography>
        <Box sx={{ display: "flex", gap: 0.5, alignItems: 'center' }}>
          <Chip label={`💰 ${saldo.toLocaleString()}`} size="small" sx={{ bgcolor: "#3a2a00", color: "#eab308", fontWeight: "bold", mr: 1 }} />
          <IconButton size="small" onClick={() => setMinimizado(!minimizado)} sx={{ color: "#eab308", p: 0.5 }}>{minimizado ? "□" : "−"}</IconButton>
          <IconButton size="small" onClick={onClose} sx={{ color: "#eab308", p: 0.5 }}><CloseIcon fontSize="small" /></IconButton>
        </Box>
      </Box>
      {!minimizado && (
        <Box sx={{ flex: 1, display: "flex", flexDirection: "column", p: 1.5, gap: 1, overflowY: "auto", "&::-webkit-scrollbar": { width: "3px" }, "&::-webkit-scrollbar-thumb": { background: "#eab30844", borderRadius: "10px" } }}>
          
          {/* 🟢 ABAS */}
          <Box sx={{ display: "flex", gap: 0.5, borderBottom: "1px solid #eab30833", pb: 1 }}>
            <Button size="small" onClick={() => { setAbaAtiva("salas"); setSalaAtual(null); }} sx={{ color: abaAtiva === "salas" ? "#eab308" : "#ca8a04", fontSize: "0.65rem", bgcolor: abaAtiva === "salas" ? "#eab30822" : "transparent" }}>
              🏠 Salas Multiplayer
            </Button>
            <Button size="small" onClick={() => setAbaAtiva("solo")} sx={{ color: abaAtiva === "solo" ? "#eab308" : "#ca8a04", fontSize: "0.65rem", bgcolor: abaAtiva === "solo" ? "#eab30822" : "transparent" }}>
              🎮 Jogos Solo
            </Button>
          </Box>

          {/* 🟢 ABA SALAS MULTIPLAYER */}
          {abaAtiva === "salas" && !salaAtual && (
            <>
              <Typography variant="subtitle2" sx={{ color: "#eab308" }}>🏠 Salas Disponíveis</Typography>
              <Box sx={{ display: "flex", gap: 0.5, flexWrap: 'wrap', mb: 1 }}>
                <TextField size="small" placeholder="Nome da sala" value={novaSalaNome} onChange={(e) => setNovaSalaNome(e.target.value)}
                  InputProps={{ style: { color: '#eab308', fontSize: '0.7rem' } }} sx={{ flex: 1, minWidth: 120, '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: '#eab30844' } } }} />
                <TextField size="small" type="number" placeholder="💰" value={novaSalaEntrada} onChange={(e) => setNovaSalaEntrada(Math.max(1, Number(e.target.value) || 1))}
                  InputProps={{ style: { color: '#eab308', fontSize: '0.7rem' } }} sx={{ width: 70, '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: '#eab30844' } } }} />
                <TextField size="small" type="number" placeholder="👥" value={novaSalaMaxJogadores} onChange={(e) => setNovaSalaMaxJogadores(Math.max(2, Math.min(10, Number(e.target.value) || 2)))}
                  InputProps={{ style: { color: '#eab308', fontSize: '0.7rem' } }} sx={{ width: 60, '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: '#eab30844' } } }} />
              </Box>
              <Box sx={{ display: "flex", gap: 0.5, flexWrap: 'wrap', mb: 1 }}>
                {JOGOS_SALA.map(j => (
                  <Chip key={j.id} label={j.nome} onClick={() => setNovaSalaJogo(j.id)} size="small"
                    sx={{ bgcolor: novaSalaJogo === j.id ? '#eab308' : '#2a1a00', color: novaSalaJogo === j.id ? '#000' : '#eab308', fontWeight: 'bold', cursor: 'pointer' }} />
                ))}
                <Button size="small" variant="contained" onClick={criarSala} sx={{ bgcolor: '#eab308', color: '#000', fontWeight: 'bold', ml: 'auto' }}><AddIcon sx={{ fontSize: 16 }} /> Criar</Button>
              </Box>
              {salas.filter(s => s.ativa).map(sala => {
                const jogoInfo = JOGOS_SALA.find(j => j.id === sala.jogo) || JOGOS_SALA[0];
                return (
                  <Paper key={sala.id} sx={{ p: 1.5, mb: 0.5, bgcolor: "#2a1a00", border: "1px solid #eab30844" }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <Box>
                        <Typography variant="body2" sx={{ color: "#eab308", fontWeight: "bold" }}>
                          {jogoInfo.nome} - {sala.nome}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "#ca8a04" }}>
                          💰 {sala.entrada} | 👥 {sala.maxJogadores || 4} máx | Criador: {sala.criadorNome}
                        </Typography>
                      </Box>
                      <Box sx={{ display: "flex", gap: 0.5 }}>
                        <Button size="small" variant="contained" onClick={() => entrarSala(sala)} sx={{ bgcolor: '#4caf50', color: '#fff', fontSize: '0.7rem' }}>Entrar</Button>
                        {(isMaster || sala.criador === userEmail) && (
                          <Button size="small" variant="outlined" onClick={() => deletarSala(sala.id)} sx={{ color: '#ef4444', borderColor: '#ef4444', fontSize: '0.65rem' }}>🗑️</Button>
                        )}
                      </Box>
                    </Box>
                  </Paper>
                );
              })}
            </>
          )}

          {/* 🟢 DENTRO DA SALA */}
          {abaAtiva === "salas" && salaAtual && (
            <>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Typography variant="subtitle2" sx={{ color: "#eab308" }}>
                  {JOGOS_SALA.find(j => j.id === jogoSala)?.nome} - {salaAtual.nome}
                </Typography>
                <Button size="small" variant="outlined" onClick={sairSala} sx={{ color: '#ef4444', borderColor: '#ef4444', fontSize: '0.65rem' }}>Sair</Button>
              </Box>
              <Typography variant="caption" sx={{ color: "#ca8a04" }}>Jogadores ({jogadoresSala.length}/{salaAtual.maxJogadores || 4}):</Typography>
              {jogadoresSala.map(j => (
                <Paper key={j.email} sx={{ p: 1, mb: 0.3, bgcolor: "#2a1a00", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Avatar sx={{ width: 24, height: 24, bgcolor: '#eab308', color: '#000', fontSize: '0.7rem' }}>{(j.nome || "?")[0]}</Avatar>
                    <Typography variant="caption" sx={{ color: "#fff" }}>{j.nome}</Typography>
                    {j.pronto && <Chip label="✅ Pronto" size="small" sx={{ bgcolor: "#1b5e20", color: "#4caf50", fontSize: '0.55rem', height: 18 }} />}
                  </Box>
                </Paper>
              ))}
              
              {/* 🟢 ÁREA DE JOGO */}
              {jogoSala === "dados" && (
                <Box sx={{ display: "flex", gap: 1, justifyContent: "center", alignItems: 'center', p: 2 }}>
                  {dadosRolagem.length > 0 ? (
                    dadosRolagem.map((d, i) => (
                      <Typography key={i} sx={{ fontSize: "3rem", color: "#eab308", fontWeight: 'bold' }}>🎲{d}</Typography>
                    ))
                  ) : (
                    <Typography sx={{ color: "#ca8a04" }}>Aguardando jogada...</Typography>
                  )}
                </Box>
              )}
              
              {jogoSala === "cartas" && (
                <Box sx={{ display: "flex", gap: 2, justifyContent: "center", p: 2 }}>
                  {cartasMesa.length > 0 ? (
                    cartasMesa.map((c, i) => (
                      <Paper key={i} sx={{ p: 2, bgcolor: "#fff", color: c.naipe === "♥" || c.naipe === "♦" ? "#ef4444" : "#000", borderRadius: 2, textAlign: 'center', minWidth: 60 }}>
                        <Typography sx={{ fontSize: "1.5rem", fontWeight: 'bold' }}>{c.valor}</Typography>
                        <Typography sx={{ fontSize: "1.5rem" }}>{c.naipe}</Typography>
                      </Paper>
                    ))
                  ) : (
                    <Typography sx={{ color: "#ca8a04" }}>Aguardando carta...</Typography>
                  )}
                </Box>
              )}
              
              {jogoSala === "roleta" && (
                <Box sx={{ textAlign: 'center', p: 2 }}>
                  <Typography sx={{ fontSize: "4rem", color: roletaGirando ? "#ffd700" : "#4caf50", fontWeight: 'bold', transition: 'all 0.3s' }}>
                    {roletaGirando ? "🎰" : resultado?.detalhes?.numero !== undefined ? resultado.detalhes.numero : "🎯"}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "#ca8a04" }}>Número da sorte</Typography>
                </Box>
              )}
              
              <Button variant="contained" fullWidth onClick={togglePronto}
                sx={{ bgcolor: '#eab308', color: '#000', fontWeight: 'bold', '&:hover': { bgcolor: '#ca8a04' } }}>
                🎯 Estou Pronto!
              </Button>
              {todosProntos && (
                <Button variant="contained" fullWidth startIcon={<PlayArrowIcon />} onClick={jogarSala} disabled={jogando}
                  sx={{ bgcolor: '#ef4444', color: '#fff', fontWeight: 'bold', py: 1.5, fontSize: '1rem', '&:hover': { bgcolor: '#dc2626' } }}>
                  {jogando ? "🎰 Jogando..." : "🎲 JOGAR!"}
                </Button>
              )}
              {resultado && !jogando && (
                <Paper sx={{ p: 2, bgcolor: "#0a0505", border: "1px solid #4caf50", textAlign: "center" }}>
                  <Typography sx={{ color: "#4caf50", fontWeight: 'bold' }}>
                    🏆 {resultado.vencedor} ganhou 💰 {resultado.premio}!
                  </Typography>
                </Paper>
              )}
              <Typography variant="caption" sx={{ color: "#eab308", mt: 1 }}>Últimos vencedores:</Typography>
              {historico.slice(0, 10).map((h, i) => (
                <Typography key={i} variant="caption" sx={{ color: "#4caf50", display: "block", fontSize: "0.6rem" }}>
                  🏆 {h.vencedor} ganhou 💰 {h.premio} ({h.jogo})
                </Typography>
              ))}
            </>
          )}

          {/* 🟢 ABA JOGOS SOLO */}
          {abaAtiva === "solo" && (
            <>
              <Box sx={{ display: "flex", gap: 0.5, flexWrap: 'wrap', mb: 1 }}>
                <Chip label="🐯 Tigrinho" onClick={() => setSoloJogo("tigrinho")} size="small"
                  sx={{ bgcolor: soloJogo === "tigrinho" ? '#eab308' : '#2a1a00', color: soloJogo === "tigrinho" ? '#000' : '#eab308', fontWeight: 'bold', cursor: 'pointer' }} />
                <Chip label="🎲 Dados" onClick={() => setSoloJogo("dados")} size="small"
                  sx={{ bgcolor: soloJogo === "dados" ? '#eab308' : '#2a1a00', color: soloJogo === "dados" ? '#000' : '#eab308', fontWeight: 'bold', cursor: 'pointer' }} />
                <Chip label="🃏 Carta Alta" onClick={() => setSoloJogo("cartas")} size="small"
                  sx={{ bgcolor: soloJogo === "cartas" ? '#eab308' : '#2a1a00', color: soloJogo === "cartas" ? '#000' : '#eab308', fontWeight: 'bold', cursor: 'pointer' }} />
              </Box>
              
              <Box sx={{ display: "flex", gap: 1, alignItems: 'center', mb: 1 }}>
                <TextField size="small" type="number" label="Aposta" value={soloAposta} onChange={(e) => setSoloAposta(Math.max(1, Number(e.target.value) || 1))}
                  InputProps={{ style: { color: '#eab308', fontSize: '0.8rem' } }} InputLabelProps={{ style: { color: '#ca8a04' } }}
                  sx={{ width: 100, '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: '#eab30844' } } }} />
                <Button variant="contained" 
                  onClick={soloJogo === "tigrinho" ? jogarTigrinho : soloJogo === "dados" ? jogarDadosSolo : jogarCartasSolo} 
                  disabled={soloGirando || soloAposta <= 0}
                  startIcon={<CasinoIcon />}
                  sx={{ bgcolor: '#eab308', color: '#000', fontWeight: 'bold', flex: 1, '&:hover': { bgcolor: '#ca8a04' } }}>
                  {soloGirando ? "🎰 Girando..." : "🎲 JOGAR!"}
                </Button>
              </Box>
              
              {/* 🟢 TIGRINHO */}
              {soloJogo === "tigrinho" && (
                <Paper sx={{ p: 2, bgcolor: "#0a0505", border: "1px solid #eab30844", textAlign: 'center' }}>
                  <Grid container spacing={1} sx={{ maxWidth: 240, mx: 'auto' }}>
                    {(tigrinhoGrid.length > 0 ? tigrinhoGrid : Array(9).fill("❓")).map((s, i) => (
                      <Grid item xs={4} key={i}>
                        <Paper sx={{ p: 1, bgcolor: "#1a0a0a", border: "1px solid #eab30844", fontSize: "2rem", textAlign: 'center' }}>
                          {s}
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>
                  <Typography variant="caption" sx={{ color: "#ca8a04", display: 'block', mt: 1 }}>
                    8 linhas de prêmio! Alinhe 3 símbolos iguais!
                  </Typography>
                </Paper>
              )}
              
              {/* 🟢 DADOS SOLO */}
              {soloJogo === "dados" && (
                <Paper sx={{ p: 2, bgcolor: "#0a0505", border: "1px solid #eab30844", textAlign: 'center' }}>
                  <Box sx={{ display: "flex", gap: 1, justifyContent: "center" }}>
                    {(dadosRolagem.length > 0 ? dadosRolagem : [0, 0]).map((d, i) => (
                      <Typography key={i} sx={{ fontSize: "3rem", color: d > 0 ? "#eab308" : "#ca8a04", fontWeight: 'bold' }}>
                        {d > 0 ? `🎲${d}` : "🎲?"}
                      </Typography>
                    ))}
                  </Box>
                  <Typography variant="caption" sx={{ color: "#ca8a04", display: 'block', mt: 1 }}>
                    Soma 7 ou 11 = 2x | Par = 3x | Soma 9+ = 1.5x
                  </Typography>
                </Paper>
              )}
              
              {/* 🟢 CARTAS SOLO */}
              {soloJogo === "cartas" && (
                <Paper sx={{ p: 2, bgcolor: "#0a0505", border: "1px solid #eab30844", textAlign: 'center' }}>
                  <Box sx={{ display: "flex", gap: 2, justifyContent: "center" }}>
                    <Box>
                      <Typography variant="caption" sx={{ color: "#ca8a04" }}>Você</Typography>
                      {cartasJogador.map((c, i) => (
                        <Paper key={i} sx={{ p: 2, bgcolor: "#fff", color: c.naipe === "♥" || c.naipe === "♦" ? "#ef4444" : "#000", borderRadius: 2, minWidth: 60, mt: 1 }}>
                          <Typography sx={{ fontSize: "1.5rem", fontWeight: 'bold' }}>{c.valor}</Typography>
                          <Typography sx={{ fontSize: "1.5rem" }}>{c.naipe}</Typography>
                        </Paper>
                      ))}
                      {cartasJogador.length === 0 && (
                        <Paper sx={{ p: 2, bgcolor: "#1a0a0a", borderRadius: 2, minWidth: 60, mt: 1 }}>
                          <Typography sx={{ fontSize: "2rem", color: "#ca8a04" }}>?</Typography>
                        </Paper>
                      )}
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ color: "#ca8a04" }}>Banca</Typography>
                      {cartasMesa.map((c, i) => (
                        <Paper key={i} sx={{ p: 2, bgcolor: "#fff", color: c.naipe === "♥" || c.naipe === "♦" ? "#ef4444" : "#000", borderRadius: 2, minWidth: 60, mt: 1 }}>
                          <Typography sx={{ fontSize: "1.5rem", fontWeight: 'bold' }}>{c.valor}</Typography>
                          <Typography sx={{ fontSize: "1.5rem" }}>{c.naipe}</Typography>
                        </Paper>
                      ))}
                      {cartasMesa.length === 0 && (
                        <Paper sx={{ p: 2, bgcolor: "#1a0a0a", borderRadius: 2, minWidth: 60, mt: 1 }}>
                          <Typography sx={{ fontSize: "2rem", color: "#ca8a04" }}>?</Typography>
                        </Paper>
                      )}
                    </Box>
                  </Box>
                  <Typography variant="caption" sx={{ color: "#ca8a04", display: 'block', mt: 1 }}>
                    Carta mais alta vence! Empate devolve aposta!
                  </Typography>
                </Paper>
              )}
              
              {soloResultado && (
                <Paper sx={{ p: 2, bgcolor: soloResultado.tipo === "vitoria" ? "#1b5e20" : "#5e1b1b", textAlign: 'center', mt: 1 }}>
                  <Typography sx={{ color: soloResultado.tipo === "vitoria" ? "#4caf50" : "#ef4444", fontWeight: 'bold', fontSize: '1.1rem' }}>
                    {soloResultado.mensagem}
                  </Typography>
                </Paper>
              )}
            </>
          )}
        </Box>
      )}
      {!minimizado && <Box sx={{ position: "absolute", bottom: 0, right: 0, width: 16, height: 16, cursor: "nwse-resize", zIndex: 10 }}
        onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setRedimensionando(true); resizeStartRef.current = { x: e.clientX, y: e.clientY, width: tamanho.width, height: tamanho.height }; }} />}
    </Paper>, document.body
  );
}

export default React.memo(CassinoJogos);
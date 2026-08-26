// src/components/HackeamentoGame.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  Box, Paper, Typography, IconButton, Button, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField,
  LinearProgress, Chip, Avatar, Badge, Tooltip, Divider,
  Grid, Card, CardContent, FormControl, InputLabel, Select, MenuItem,
  CircularProgress, Fade, Zoom
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import SecurityIcon from "@mui/icons-material/Security";
import ShieldIcon from "@mui/icons-material/Shield";
import ComputerIcon from "@mui/icons-material/Computer";
import CasinoIcon from "@mui/icons-material/Casino";
import VisibilityIcon from "@mui/icons-material/Visibility";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import WarningIcon from "@mui/icons-material/Warning";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import LockIcon from "@mui/icons-material/Lock";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import PersonIcon from "@mui/icons-material/Person";
import { db } from "../firebaseConfig";
import { 
  doc, getDoc, setDoc, onSnapshot, collection, 
  addDoc, serverTimestamp, updateDoc, deleteDoc, query, where, getDocs 
} from "firebase/firestore";
import { keyframes } from "@mui/material/styles";

// ==================== ANIMAÇÕES ====================
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

const matrixRain = keyframes`
  0% { opacity: 0; transform: translateY(-100%); }
  50% { opacity: 1; }
  100% { opacity: 0; transform: translateY(100vh); }
`;

// ==================== COMPONENTE PRINCIPAL ====================
function HackeamentoGame({ 
  atacanteEmail, 
  atacanteNome, 
  alvoEmail, 
  alvoNome,
  fichasMap,
  onClose,
  userEmail,
  isMaster 
}) {
  // ===== ESTADOS DO JOGO =====
  const [progresso, setProgresso] = useState(0);
  const [rodada, setRodada] = useState(0);
  const [turno, setTurno] = useState("atacante"); // "atacante" ou "defensor"
  const [jogandoDado, setJogandoDado] = useState(false);
  const [resultadoDado, setResultadoDado] = useState(null);
  const [detalhesTurno, setDetalhesTurno] = useState(null);
  const [historicoTurnos, setHistoricoTurnos] = useState([]);
  const [nivelInvasao, setNivelInvasao] = useState(0); // 0, 1, 2, 3
  const [perdeu, setPerdeu] = useState(false);
  const [derrotasConsecutivas, setDerrotasConsecutivas] = useState(0);
  
  // ===== ESTADOS DE DADOS =====
  const [fichaAtacante, setFichaAtacante] = useState(null);
  const [fichaAlvo, setFichaAlvo] = useState(null);
  const [inteligenciaAtacante, setInteligenciaAtacante] = useState(1);
  const [conhecimentoAtacante, setConhecimentoAtacante] = useState(0);
  const [inteligenciaAlvo, setInteligenciaAlvo] = useState(1);
  const [conhecimentoAlvo, setConhecimentoAlvo] = useState(0);
  
  // ===== ESTADOS DE MODAIS =====
  const [modalFichaAlvo, setModalFichaAlvo] = useState(false);
  const [modalTransferencia, setModalTransferencia] = useState(false);
  const [tipoTransferencia, setTipoTransferencia] = useState(""); // "titulos", "imoveis", "inventario", "carteira"
  const [itensAlvo, setItensAlvo] = useState([]);
  const [itensSelecionados, setItensSelecionados] = useState([]);
  const [carteiraAlvo, setCarteiraAlvo] = useState({});
  const [carteiraAtacante, setCarteiraAtacante] = useState({});
  const [quantidadeTransferencia, setQuantidadeTransferencia] = useState(0);
  const [carteiraSelecionada, setCarteiraSelecionada] = useState("");
  const [titulosAlvo, setTitulosAlvo] = useState([]);
  const [imoveisAlvo, setImoveisAlvo] = useState([]);
  
  // ===== ESTADOS DE NOTIFICAÇÃO =====
  const [notificacaoEnviada, setNotificacaoEnviada] = useState(false);
  const [mensagemChatEnviada, setMensagemChatEnviada] = useState(false);

  // ===== REFS =====
  const gameRef = useRef(null);

  // ===== CARREGAR FICHAS =====
  useEffect(() => {
    const carregarFichas = async () => {
      try {
        // Carregar ficha do atacante
        const refAtacante = doc(db, "fichas", atacanteEmail);
        const snapAtacante = await getDoc(refAtacante);
        if (snapAtacante.exists()) {
          const dados = snapAtacante.data();
          setFichaAtacante(dados);
          setInteligenciaAtacante(dados.atributos?.inteligencia || 1);
          setConhecimentoAtacante(dados.pericias?.conhecimento || 0);
          setCarteiraAtacante(dados.carteiras || {});
        }

        // Carregar ficha do alvo
        const refAlvo = doc(db, "fichas", alvoEmail);
        const snapAlvo = await getDoc(refAlvo);
        if (snapAlvo.exists()) {
          const dados = snapAlvo.data();
          setFichaAlvo(dados);
          setInteligenciaAlvo(dados.atributos?.inteligencia || 1);
          setConhecimentoAlvo(dados.pericias?.conhecimento || 0);
          setCarteiraAlvo(dados.carteiras || {});
 const acoesObj = dados.acoes || {};
const acoesArray = Object.entries(acoesObj).map(([id, data]) => ({ id, ...data }));
setTitulosAlvo(acoesArray);
          setImoveisAlvo(dados.imoveis || []);
          setItensAlvo([
            ...(dados.equipamentos || []),
            ...(dados.vestes || []),
            ...(dados.diversos || []),
          ]);
        }
      } catch (error) {
        console.error("Erro ao carregar fichas:", error);
      }
    };

    carregarFichas();
  }, [atacanteEmail, alvoEmail]);

  // ===== ROLAR DADO =====
  const rolarDado = useCallback(async () => {
    if (jogandoDado) return;
    
    setJogandoDado(true);
    setResultadoDado(null);
    
    // Animação de rolagem
    const interval = setInterval(() => {
      setResultadoDado(Math.floor(Math.random() * 10) + 1);
    }, 100);
    
    setTimeout(async () => {
      clearInterval(interval);
      
      const dado = Math.floor(Math.random() * 10) + 1;
      setResultadoDado(dado);
      
      // Cálculo do resultado
      const bonusAtacante = inteligenciaAtacante + conhecimentoAtacante;
      const bonusDefesa = inteligenciaAlvo + conhecimentoAlvo;
      
      const totalAtacante = dado + bonusAtacante;
      const dadoDefesa = Math.floor(Math.random() * 10) + 1;
      const totalDefesa = dadoDefesa + bonusDefesa;
      
      const sucesso = totalAtacante > totalDefesa;
      
      const detalhes = {
        rodada: rodada + 1,
        dadoAtacante: dado,
        bonusAtacante,
        totalAtacante,
        dadoDefesa,
        bonusDefesa,
        totalDefesa,
        sucesso,
        timestamp: new Date().toISOString(),
      };
      
      setDetalhesTurno(detalhes);
      setHistoricoTurnos(prev => [detalhes, ...prev]);
      
      if (sucesso) {
        // Aumenta progresso em 10%
        const novoProgresso = Math.min(progresso + 10, 100);
        setProgresso(novoProgresso);
        setDerrotasConsecutivas(0);
        
        // Verificar níveis de invasão
        if (novoProgresso >= 100 && nivelInvasao < 3) {
          setNivelInvasao(3);
          notificarNivelInvasao(3);
        } else if (novoProgresso >= 80 && nivelInvasao < 2) {
          setNivelInvasao(2);
          notificarNivelInvasao(2);
        } else if (novoProgresso >= 60 && nivelInvasao < 1) {
          setNivelInvasao(1);
          notificarNivelInvasao(1);
        }
      } else {
        // Diminui progresso em 10%
        const novoProgresso = Math.max(progresso - 10, 0);
        setProgresso(novoProgresso);
        
        const novasDerrotas = derrotasConsecutivas + 1;
        setDerrotasConsecutivas(novasDerrotas);
        
        // Verificar falha crítica (2 derrotas consecutivas com progresso 0)
        if (novasDerrotas >= 2 && novoProgresso === 0) {
          setPerdeu(true);
          notificarFracasso();
        }
      }
      
      setRodada(prev => prev + 1);
      setJogandoDado(false);
      
      // Enviar notificação para o chat
      enviarNotificacaoChat(detalhes);
      
      // Salvar estado do jogo
      salvarEstadoJogo();
    }, 1500);
  }, [progresso, rodada, inteligenciaAtacante, conhecimentoAtacante, inteligenciaAlvo, conhecimentoAlvo, derrotasConsecutivas, nivelInvasao]);

const notificarNivelInvasao = async (nivel) => {
  const niveis = {
    1: "🔓 Nível 1: Acesso à ficha do alvo",
    2: "🔓🔓 Nível 2: Acesso a títulos e imóveis",
    3: "🔓🔓🔓 Nível 3: Acesso ao inventário e carteira",
  };
  
  // Notificação para o alvo
  try {
    await addDoc(collection(db, "socialNotificacoes"), {
      para: alvoEmail,
      de: atacanteEmail,
      tipo: "hackeamento",
      texto: `⚠️ ALERTA DE INVASÃO! ${atacanteNome} atingiu o ${niveis[nivel]}!`,
      nome: atacanteNome,
      lida: false,
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    console.error("Erro ao notificar:", error);
  }
  
  // Mensagem no chat principal
  await enviarParaChatPrincipal(`🚨 ALERTA DE HACKEAMENTO: ${atacanteNome} atingiu o ${niveis[nivel]} contra ${alvoNome}!`);
};

  // ===== NOTIFICAR FRACASSO =====
const notificarFracasso = async () => {
  const codigo = localStorage.getItem(`rede_codigo_pessoal_${atacanteEmail}`) || "DESCONHECIDO";
  
  try {
    await addDoc(collection(db, "socialNotificacoes"), {
      para: alvoEmail,
      de: atacanteEmail,
      tipo: "hackeamento_fracasso",
      texto: `🛡️ Tentativa de invasão fracassou! Código do invasor: ${codigo}`,
      nome: atacanteNome,
      lida: false,
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    console.error("Erro ao notificar fracasso:", error);
  }
  
  await enviarParaChatPrincipal(`🛡️ DEFESA BEM-SUCEDIDA: ${alvoNome} repeliu a invasão de ${atacanteNome}! Código do invasor exposto: ${codigo}`);
};

const enviarNotificacaoChat = async (detalhes) => {
  const mensagem = detalhes.sucesso 
    ? `💻 [HACKEAMENTO] ${atacanteNome} avançou na invasão de ${alvoNome}! (${detalhes.totalAtacante} vs ${detalhes.totalDefesa})`
    : `🛡️ [HACKEAMENTO] ${alvoNome} se defendeu de ${atacanteNome}! (${detalhes.totalAtacante} vs ${detalhes.totalDefesa})`;
  
  // Enviar para o chat do SocialBar
  const chatId = [atacanteEmail, alvoEmail].sort().join("_");
  try {
    await addDoc(collection(db, "socialChats", chatId, "mensagens"), {
      de: "sistema",
      para: chatId,
      tipo: "sistema",
      texto: mensagem,
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    console.error("Erro ao enviar para socialChat:", error);
  }
  
  // Enviar para o chat principal
  await enviarParaChatPrincipal(mensagem);
};
 // ===== ENVIAR PARA CHAT PRINCIPAL =====
const enviarParaChatPrincipal = async (texto) => {
  try {
    await addDoc(collection(db, "chat"), {
      userNick: "SISTEMA",
      userEmail: "sistema@reqviemrpg.com",
      type: "text",
      text: texto,
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    console.error("Erro ao enviar para chat principal:", error);
  }
};

// ===== ENVIAR MENSAGEM PARA O CHAT =====
const enviarMensagemChat = async (texto) => {
  // Enviar para o chat do SocialBar
  const chatId = [atacanteEmail, alvoEmail].sort().join("_");
  try {
    await addDoc(collection(db, "socialChats", chatId, "mensagens"), {
      de: "sistema",
      para: chatId,
      tipo: "sistema",
      texto,
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    console.error("Erro ao enviar para socialChat:", error);
  }
  
  // Enviar para o chat principal
  await enviarParaChatPrincipal(texto);
};

  // ===== SALVAR ESTADO DO JOGO =====
  const salvarEstadoJogo = async () => {
    try {
      const gameRef = doc(db, "hackeamento_games", `${atacanteEmail}_${alvoEmail}`);
      await setDoc(gameRef, {
        atacanteEmail,
        alvoEmail,
        progresso,
        rodada,
        nivelInvasao,
        derrotasConsecutivas,
        perdeu,
        historicoTurnos,
        ultimaAtualizacao: serverTimestamp(),
      }, { merge: true });
    } catch (error) {
      console.error("Erro ao salvar jogo:", error);
    }
  };

  // ===== TRANSFERIR ITENS =====
  const transferirItens = async () => {
    if (itensSelecionados.length === 0) {
      alert("Selecione pelo menos um item para transferir!");
      return;
    }

    try {
      const refAlvo = doc(db, "fichas", alvoEmail);
      const refAtacante = doc(db, "fichas", atacanteEmail);
      
      const snapAlvo = await getDoc(refAlvo);
      const snapAtacante = await getDoc(refAtacante);
      
      if (!snapAlvo.exists() || !snapAtacante.exists()) {
        alert("Erro ao carregar fichas!");
        return;
      }

      const dadosAlvo = snapAlvo.data();
      const dadosAtacante = snapAtacante.data();

      // Remover itens do alvo
      const novosEquipamentos = (dadosAlvo.equipamentos || []).filter(item => !itensSelecionados.includes(item));
      const novasVestes = (dadosAlvo.vestes || []).filter(item => !itensSelecionados.includes(item));
      const novosDiversos = (dadosAlvo.diversos || []).filter(item => !itensSelecionados.includes(item));

      // Adicionar itens ao atacante
      const novosEquipamentosAtacante = [...(dadosAtacante.equipamentos || []), ...itensSelecionados.filter(item => dadosAlvo.equipamentos?.includes(item))];
      const novasVestesAtacante = [...(dadosAtacante.vestes || []), ...itensSelecionados.filter(item => dadosAlvo.vestes?.includes(item))];
      const novosDiversosAtacante = [...(dadosAtacante.diversos || []), ...itensSelecionados.filter(item => dadosAlvo.diversos?.includes(item))];

      // Atualizar alvo
      await updateDoc(refAlvo, {
        equipamentos: novosEquipamentos,
        vestes: novasVestes,
        diversos: novosDiversos,
      });

      // Atualizar atacante
      await updateDoc(refAtacante, {
        equipamentos: novosEquipamentosAtacante,
        vestes: novasVestesAtacante,
        diversos: novosDiversosAtacante,
      });

      alert(`✅ ${itensSelecionados.length} itens transferidos com sucesso!`);
      setModalTransferencia(false);
      setItensSelecionados([]);
      
      enviarMensagemChat(`💰 HACKEAMENTO: ${atacanteNome} transferiu ${itensSelecionados.length} itens do inventário de ${alvoNome}!`);
    } catch (error) {
      console.error("Erro ao transferir itens:", error);
      alert("Erro ao transferir itens!");
    }
  };

  // ===== TRANSFERIR CARTEIRA =====
  const transferirCarteira = async () => {
    if (!carteiraSelecionada || quantidadeTransferencia <= 0) {
      alert("Selecione uma carteira e defina a quantidade!");
      return;
    }

    try {
      const refAlvo = doc(db, "fichas", alvoEmail);
      const refAtacante = doc(db, "fichas", atacanteEmail);
      
      const snapAlvo = await getDoc(refAlvo);
      const snapAtacante = await getDoc(refAtacante);
      
      if (!snapAlvo.exists() || !snapAtacante.exists()) {
        alert("Erro ao carregar fichas!");
        return;
      }

const dadosAlvo = snapAlvo.data();
const dadosAtacante = snapAtacante.data();

// Converter array do Firestore para objeto (FichaPersonagem salva como array)
const carteirasAlvoArray = dadosAlvo.carteiras || [];
const carteirasAlvo = Array.isArray(carteirasAlvoArray) 
  ? carteirasAlvoArray.reduce((acc, c) => ({ ...acc, [c.nome]: c.valor || 0 }), {})
  : carteirasAlvoArray;

const carteirasAtacanteArray = dadosAtacante.carteiras || [];
const carteirasAtacante = Array.isArray(carteirasAtacanteArray)
  ? carteirasAtacanteArray.reduce((acc, c) => ({ ...acc, [c.nome]: c.valor || 0 }), {})
  : carteirasAtacanteArray;

const saldoDisponivel = carteirasAlvo[carteiraSelecionada] || 0;
      
      if (quantidadeTransferencia > saldoDisponivel) {
        alert("Saldo insuficiente!");
        return;
      }

      // Atualizar carteiras
      const novasCarteirasAlvo = {
        ...carteirasAlvo,
        [carteiraSelecionada]: saldoDisponivel - quantidadeTransferencia,
      };

      const novasCarteirasAtacante = {
        ...carteirasAtacante,
        [carteiraSelecionada]: (carteirasAtacante[carteiraSelecionada] || 0) + quantidadeTransferencia,
      };

// Converter objeto de volta para array antes de salvar
const novasCarteirasAlvoArray = Object.entries(novasCarteirasAlvo).map(([nome, valor]) => ({ nome, valor }));
const novasCarteirasAtacanteArray = Object.entries(novasCarteirasAtacante).map(([nome, valor]) => ({ nome, valor }));

await updateDoc(refAlvo, { carteiras: novasCarteirasAlvoArray });
await updateDoc(refAtacante, { carteiras: novasCarteirasAtacanteArray });

      alert(`✅ 💰 ${quantidadeTransferencia.toFixed(2)} transferidos com sucesso!`);
      setModalTransferencia(false);
      setQuantidadeTransferencia(0);
      setCarteiraSelecionada("");
      
      enviarMensagemChat(`💵 HACKEAMENTO: ${atacanteNome} transferiu 💰 ${quantidadeTransferencia.toFixed(2)} da carteira de ${alvoNome}!`);
    } catch (error) {
      console.error("Erro ao transferir carteira:", error);
      alert("Erro ao transferir carteira!");
    }
  };
// ===== TRANSFERIR TÍTULOS (AÇÕES) =====
const transferirTitulos = async (tituloIndex) => {
  try {
    const refAlvo = doc(db, "fichas", alvoEmail);
    const refAtacante = doc(db, "fichas", atacanteEmail);
    
    const snapAlvo = await getDoc(refAlvo);
    const snapAtacante = await getDoc(refAtacante);
    
    if (!snapAlvo.exists() || !snapAtacante.exists()) {
      alert("Erro ao carregar fichas!");
      return;
    }

    const dadosAlvo = snapAlvo.data();
    const dadosAtacante = snapAtacante.data();

    // Converter ações de objeto para array para manipular por índice
    const acoesAlvoObj = dadosAlvo.acoes || {};
    const acoesArray = Object.entries(acoesAlvoObj).map(([id, data]) => ({ id, ...data }));
    
    if (tituloIndex >= acoesArray.length) {
      alert("Título não encontrado!");
      return;
    }
    
    const acaoTransferida = acoesArray[tituloIndex];
    
    // Remover do alvo
    acoesArray.splice(tituloIndex, 1);
    const novasAcoesAlvo = {};
    acoesArray.forEach(a => { 
      const { id, ...resto } = a;
      novasAcoesAlvo[id] = resto;
    });
    
    // Adicionar ao atacante
    const acoesAtacante = { ...(dadosAtacante.acoes || {}) };
    const { id: acaoId, ...dadosAcao } = acaoTransferida;
    acoesAtacante[acaoId] = dadosAcao;
    
    // Salvar no Firestore
    await updateDoc(refAlvo, { acoes: novasAcoesAlvo });
    await updateDoc(refAtacante, { acoes: acoesAtacante });

    // Atualizar estado local
    setTitulosAlvo(acoesArray);
    
    const nomeAcao = dadosAcao.nome || acaoId;
    alert(`✅ Título "${nomeAcao}" transferido com sucesso!`);
    
    enviarMensagemChat(`📜 HACKEAMENTO: ${atacanteNome} transferiu o título "${nomeAcao}" de ${alvoNome}!`);
        // 🟢 CONQUISTA: Hacker
    window.dispatchEvent(new CustomEvent('desbloquearConquista', { detail: { conquistaId: 'hacker' } }));
  } catch (error) {
    console.error("Erro ao transferir título:", error);
    alert("Erro ao transferir título!");
  }
};

  // ===== TRANSFERIR IMÓVEIS =====
  const transferirImoveis = async (imovelIndex) => {
    try {
      const refAlvo = doc(db, "fichas", alvoEmail);
      const refAtacante = doc(db, "fichas", atacanteEmail);
      
      const snapAlvo = await getDoc(refAlvo);
      const snapAtacante = await getDoc(refAtacante);
      
      if (!snapAlvo.exists() || !snapAtacante.exists()) {
        alert("Erro ao carregar fichas!");
        return;
      }

      const dadosAlvo = snapAlvo.data();
      const dadosAtacante = snapAtacante.data();

      const imoveisAlvo = [...(dadosAlvo.imoveis || [])];
      const imovel = imoveisAlvo[imovelIndex];
      
      if (!imovel) {
        alert("Imóvel não encontrado!");
        return;
      }

      // Remover imóvel do alvo
      imoveisAlvo.splice(imovelIndex, 1);
      
      // Adicionar imóvel ao atacante
      const imoveisAtacante = [...(dadosAtacante.imoveis || []), imovel];

      await updateDoc(refAlvo, { imoveis: imoveisAlvo });
      await updateDoc(refAtacante, { imoveis: imoveisAtacante });

      // Atualizar estado local
      setImoveisAlvo(imoveisAlvo);
      
      alert(`✅ Imóvel "${imovel.nome || imovel.endereco}" transferido com sucesso!`);
      
      enviarMensagemChat(`🏠 HACKEAMENTO: ${atacanteNome} transferiu o imóvel "${imovel.nome || imovel.endereco}" de ${alvoNome}!`);
    } catch (error) {
      console.error("Erro ao transferir imóvel:", error);
      alert("Erro ao transferir imóvel!");
    }
  };

  // ===== RENDER =====
  return createPortal(
    <Box
      ref={gameRef}
      sx={{
        position: "fixed",
        inset: 0,
        bgcolor: "rgba(0,0,0,0.95)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 99999,
        fontFamily: "'Courier New', monospace",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <Paper
        elevation={24}
        sx={{
          width: "90vw",
          maxWidth: 800,
          maxHeight: "90vh",
          bgcolor: "#0a0a0a",
          border: "2px solid #10b981",
          borderRadius: 2,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 0 50px rgba(16,185,129,0.3)",
          animation: `${glitchEffect} 0.3s ease-in-out`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <Box
          sx={{
            p: 2,
            bgcolor: "#0d1f0d",
            borderBottom: "1px solid #10b98144",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <SecurityIcon sx={{ color: "#10b981", fontSize: 30 }} />
            <Box>
              <Typography variant="h6" sx={{ color: "#10b981", fontWeight: "bold" }}>
                💻 HACKEAMENTO.exe
              </Typography>
              <Typography variant="caption" sx={{ color: "#0f5" }}>
                {atacanteNome} vs {alvoNome}
              </Typography>
            </Box>
          </Box>
          <IconButton onClick={onClose} sx={{ color: "#10b981" }}>
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Conteúdo */}
        <Box sx={{ flex: 1, overflowY: "auto", p: 3 }}>
          {/* Info dos jogadores */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6}>
              <Card sx={{ bgcolor: "#0d1f0d", border: "1px solid #10b98144" }}>
                <CardContent>
                  <Typography variant="subtitle2" sx={{ color: "#10b981", mb: 1 }}>
                    🖥️ INVASOR
                  </Typography>
                  <Typography variant="body1" sx={{ color: "#fff", fontWeight: "bold" }}>
                    {atacanteNome}
                  </Typography>
                  <Box sx={{ display: "flex", gap: 2, mt: 1 }}>
                    <Chip 
                      icon={<ComputerIcon />}
                      label={`INT: ${inteligenciaAtacante}`}
                      size="small"
                      sx={{ bgcolor: "#10b98122", color: "#10b981" }}
                    />
                    <Chip 
                      icon={<ComputerIcon />}
                      label={`CON: ${conhecimentoAtacante}`}
                      size="small"
                      sx={{ bgcolor: "#10b98122", color: "#10b981" }}
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6}>
              <Card sx={{ bgcolor: "#0d1f0d", border: "1px solid #ef444444" }}>
                <CardContent>
                  <Typography variant="subtitle2" sx={{ color: "#ef4444", mb: 1 }}>
                    🛡️ DEFENSOR
                  </Typography>
                  <Typography variant="body1" sx={{ color: "#fff", fontWeight: "bold" }}>
                    {alvoNome}
                  </Typography>
                  <Box sx={{ display: "flex", gap: 2, mt: 1 }}>
                    <Chip 
                      icon={<ShieldIcon />}
                      label={`INT: ${inteligenciaAlvo}`}
                      size="small"
                      sx={{ bgcolor: "#ef444422", color: "#ef4444" }}
                    />
                    <Chip 
                      icon={<ShieldIcon />}
                      label={`CON: ${conhecimentoAlvo}`}
                      size="small"
                      sx={{ bgcolor: "#ef444422", color: "#ef4444" }}
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Barra de Progresso */}
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
              <Typography variant="caption" sx={{ color: "#10b981" }}>
                Progresso da Invasão: {progresso}%
              </Typography>
              <Typography variant="caption" sx={{ color: "#0f5" }}>
                Rodada: {rodada}
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={progresso}
              sx={{
                height: 20,
                borderRadius: 2,
                bgcolor: "#0d1f0d",
                '& .MuiLinearProgress-bar': {
                  bgcolor: 
                    progresso >= 80 ? "#ef4444" :
                    progresso >= 60 ? "#fbbf24" :
                    "#10b981",
                  animation: progresso >= 80 ? `${pulseRed} 1s infinite` :
                            progresso >= 60 ? `${pulseGreen} 1s infinite` :
                            "none",
                },
              }}
            />
            {/* Marcadores de nível */}
            <Box sx={{ display: "flex", justifyContent: "space-between", mt: 0.5, px: 1 }}>
              <Chip 
                label="Nível 1 (60%)"
                size="small"
                sx={{ 
                  bgcolor: progresso >= 60 ? "#fbbf24" : "#333",
                  color: progresso >= 60 ? "#000" : "#666",
                  fontSize: "0.6rem",
                }}
                icon={progresso >= 60 ? <LockOpenIcon /> : <LockIcon />}
              />
              <Chip 
                label="Nível 2 (80%)"
                size="small"
                sx={{ 
                  bgcolor: progresso >= 80 ? "#fbbf24" : "#333",
                  color: progresso >= 80 ? "#000" : "#666",
                  fontSize: "0.6rem",
                }}
                icon={progresso >= 80 ? <LockOpenIcon /> : <LockIcon />}
              />
              <Chip 
                label="Nível 3 (100%)"
                size="small"
                sx={{ 
                  bgcolor: progresso >= 100 ? "#ef4444" : "#333",
                  color: progresso >= 100 ? "#fff" : "#666",
                  fontSize: "0.6rem",
                }}
                icon={progresso >= 100 ? <LockOpenIcon /> : <LockIcon />}
              />
            </Box>
          </Box>

          {/* Resultado do Dado */}
          {resultadoDado && (
            <Zoom in={!!resultadoDado}>
              <Paper sx={{ p: 3, mb: 3, bgcolor: "#0d1f0d", border: "1px solid #10b98144", textAlign: "center" }}>
                <Typography variant="h2" sx={{ 
                  color: detalhesTurno?.sucesso ? "#10b981" : "#ef4444",
                  fontFamily: "'Courier New', monospace",
                  textShadow: detalhesTurno?.sucesso ? "0 0 20px #10b981" : "0 0 20px #ef4444",
                }}>
                  🎲 {resultadoDado}
                </Typography>
                {detalhesTurno && (
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="caption" sx={{ color: "#0f5", display: "block" }}>
                      Atacante: {detalhesTurno.dadoAtacante} + {detalhesTurno.bonusAtacante} = {detalhesTurno.totalAtacante}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "#ef4444", display: "block" }}>
                      Defensor: {detalhesTurno.dadoDefesa} + {detalhesTurno.bonusDefesa} = {detalhesTurno.totalDefesa}
                    </Typography>
                    <Chip
                      icon={detalhesTurno.sucesso ? <CheckCircleIcon /> : <CancelIcon />}
                      label={detalhesTurno.sucesso ? "SUCESSO! +10%" : "FRACASSO! -10%"}
                      sx={{
                        mt: 1,
                        bgcolor: detalhesTurno.sucesso ? "#10b98122" : "#ef444422",
                        color: detalhesTurno.sucesso ? "#10b981" : "#ef4444",
                      }}
                    />
                  </Box>
                )}
              </Paper>
            </Zoom>
          )}

          {/* Botão de Rolar Dado */}
          <Box sx={{ textAlign: "center", mb: 3 }}>
            <Button
              variant="contained"
              onClick={rolarDado}
              disabled={jogandoDado || perdeu}
              startIcon={jogandoDado ? <CircularProgress size={20} /> : <CasinoIcon />}
              sx={{
                bgcolor: "#10b981",
                color: "#000",
                fontWeight: "bold",
                fontSize: "1.2rem",
                px: 4,
                py: 1.5,
                "&:hover": { bgcolor: "#0d9488" },
                "&:disabled": { bgcolor: "#333", color: "#666" },
                animation: !jogandoDado ? `${pulseGreen} 2s infinite` : "none",
              }}
            >
              {jogandoDado ? "Rolando..." : "🎲 Rolar D10"}
            </Button>
          </Box>

          {/* Botões de Invasão (Níveis) */}
          <Box sx={{ display: "flex", gap: 1, justifyContent: "center", mb: 3, flexWrap: "wrap" }}>
            <Button
              variant="contained"
              disabled={nivelInvasao < 1}
              onClick={() => setModalFichaAlvo(true)}
              startIcon={<VisibilityIcon />}
              sx={{
                bgcolor: nivelInvasao >= 1 ? "#fbbf24" : "#333",
                color: nivelInvasao >= 1 ? "#000" : "#666",
                "&:hover": { bgcolor: "#eab308" },
              }}
            >
              Invasão Nível 1: Ver Ficha
            </Button>
            <Button
              variant="contained"
              disabled={nivelInvasao < 2}
              onClick={() => {
                setTipoTransferencia("titulos");
                setModalTransferencia(true);
              }}
              startIcon={<SwapHorizIcon />}
              sx={{
                bgcolor: nivelInvasao >= 2 ? "#fbbf24" : "#333",
                color: nivelInvasao >= 2 ? "#000" : "#666",
                "&:hover": { bgcolor: "#eab308" },
              }}
            >
              Invasão Nível 2: Títulos e Imóveis
            </Button>
            <Button
              variant="contained"
              disabled={nivelInvasao < 3}
              onClick={() => {
                setTipoTransferencia("inventario");
                setModalTransferencia(true);
              }}
              startIcon={<SwapHorizIcon />}
              sx={{
                bgcolor: nivelInvasao >= 3 ? "#ef4444" : "#333",
                color: nivelInvasao >= 3 ? "#fff" : "#666",
                "&:hover": { bgcolor: "#dc2626" },
                animation: nivelInvasao >= 3 ? `${pulseRed} 1s infinite` : "none",
              }}
            >
              Invasão Nível 3: Inventário e Carteira
            </Button>
          </Box>

          {/* Falha */}
          {perdeu && (
            <Paper sx={{ p: 2, bgcolor: "#ef444422", border: "1px solid #ef4444", textAlign: "center", mb: 3 }}>
              <Typography variant="h6" sx={{ color: "#ef4444" }}>
                🛡️ INVASÃO FRACASSOU!
              </Typography>
              <Typography variant="body2" sx={{ color: "#fca5a5" }}>
                O código do invasor foi exposto: <strong>{localStorage.getItem(`rede_codigo_pessoal_${atacanteEmail}`) || "DESCONHECIDO"}</strong>
              </Typography>
              <Typography variant="caption" sx={{ color: "#fca5a5", display: "block", mt: 1 }}>
                O alvo foi notificado sobre a tentativa de invasão.
              </Typography>
              <Button
                variant="contained"
                onClick={onClose}
                sx={{ mt: 2, bgcolor: "#ef4444", "&:hover": { bgcolor: "#dc2626" } }}
              >
                Fechar
              </Button>
            </Paper>
          )}

          {/* Histórico de Turnos */}
          {historicoTurnos.length > 0 && (
            <Box>
              <Typography variant="subtitle2" sx={{ color: "#10b981", mb: 1 }}>
                📜 Histórico de Rodadas
              </Typography>
              <Box sx={{ maxHeight: 200, overflowY: "auto" }}>
                {historicoTurnos.map((turno, index) => (
                  <Paper key={index} sx={{ p: 1, mb: 0.5, bgcolor: "#0d1f0d", border: "1px solid #10b98122" }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <Typography variant="caption" sx={{ color: "#0f5" }}>
                        Rodada {turno.rodada}
                      </Typography>
                      <Chip
                        size="small"
                        label={turno.sucesso ? "✅ +10%" : "❌ -10%"}
                        sx={{
                          bgcolor: turno.sucesso ? "#10b98122" : "#ef444422",
                          color: turno.sucesso ? "#10b981" : "#ef4444",
                          fontSize: "0.6rem",
                          height: 16,
                        }}
                      />
                      <Typography variant="caption" sx={{ color: "#666" }}>
                        {turno.totalAtacante} vs {turno.totalDefesa}
                      </Typography>
                    </Box>
                  </Paper>
                ))}
              </Box>
            </Box>
          )}
        </Box>
      </Paper>

      {/* Modal de Ficha do Alvo */}
      <Dialog
        open={modalFichaAlvo}
        onClose={() => setModalFichaAlvo(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: "#0f172a",
            border: "2px solid #fbbf24",
            borderRadius: 2,
            maxHeight: "80vh",
          }
        }}
      >
        <DialogTitle sx={{ color: "#fbbf24", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          🔓 Ficha de {alvoNome} (Nível 1)
          <IconButton onClick={() => setModalFichaAlvo(false)} sx={{ color: "#94a3b8" }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ maxHeight: "60vh", overflowY: "auto" }}>
          {fichaAlvo ? (
            <Box sx={{ color: "#fff" }}>
              <Typography variant="h6" sx={{ color: "#fbbf24", mb: 2 }}>
                {fichaAlvo.nome || alvoNome}
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" sx={{ color: "#94a3b8" }}>Atributos</Typography>
                  {fichaAlvo.atributos && Object.entries(fichaAlvo.atributos).map(([nome, valor]) => (
                    <Typography key={nome} variant="body2" sx={{ color: "#fff" }}>
                      {nome}: {valor}
                    </Typography>
                  ))}
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" sx={{ color: "#94a3b8" }}>Perícias</Typography>
                  {fichaAlvo.pericias && Object.entries(fichaAlvo.pericias).map(([nome, valor]) => (
                    <Typography key={nome} variant="body2" sx={{ color: "#fff" }}>
                      {nome}: {valor}
                    </Typography>
                  ))}
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" sx={{ color: "#94a3b8" }}>Status</Typography>
                  <Typography variant="body2" sx={{ color: "#fff" }}>
                    Vida: {fichaAlvo.pontosVida || 0}
                  </Typography>
                  <Typography variant="body2" sx={{ color: "#fff" }}>
                    Energia: {fichaAlvo.pontosEnergia || 0}
                  </Typography>
                  <Typography variant="body2" sx={{ color: "#fff" }}>
                    Armadura: {fichaAlvo.armadura || 0}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" sx={{ color: "#94a3b8" }}>Equipamentos</Typography>
                  {fichaAlvo.equipamentos?.map((item, i) => (
                    <Typography key={i} variant="body2" sx={{ color: "#fff" }}>
                      • {item.nome || item}
                    </Typography>
                  ))}
                </Grid>
              </Grid>
            </Box>
          ) : (
            <Typography sx={{ color: "#94a3b8" }}>Carregando ficha...</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModalFichaAlvo(false)} sx={{ color: "#94a3b8" }}>
            Fechar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal de Transferência */}
      <Dialog
        open={modalTransferencia}
        onClose={() => setModalTransferencia(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: "#0f172a",
            border: tipoTransferencia === "inventario" || tipoTransferencia === "carteira" ? "2px solid #ef4444" : "2px solid #fbbf24",
            borderRadius: 2,
          }
        }}
      >
        <DialogTitle sx={{ 
          color: tipoTransferencia === "inventario" || tipoTransferencia === "carteira" ? "#ef4444" : "#fbbf24",
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center" 
        }}>
          {tipoTransferencia === "titulos" && "📜 Transferir Títulos (Nível 2)"}
          {tipoTransferencia === "imoveis" && "🏠 Transferir Imóveis (Nível 2)"}
          {tipoTransferencia === "inventario" && "🎒 Transferir Itens (Nível 3)"}
          {tipoTransferencia === "carteira" && "💰 Transferir Dinheiro (Nível 3)"}
          <Box>
            {tipoTransferencia !== "carteira" && (
              <Button 
                size="small" 
                onClick={() => {
                  if (tipoTransferencia === "inventario") setTipoTransferencia("carteira");
                  else setTipoTransferencia("inventario");
                }}
                sx={{ mr: 1, color: "#94a3b8", fontSize: "0.7rem" }}
              >
                Alternar para {tipoTransferencia === "inventario" ? "Carteira" : "Inventário"}
              </Button>
            )}
            <IconButton onClick={() => setModalTransferencia(false)} sx={{ color: "#94a3b8" }}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {/* Títulos */}
          {tipoTransferencia === "titulos" && (
            <Box>
              <Typography variant="body2" sx={{ color: "#94a3b8", mb: 2 }}>
                Selecione um título para transferir para você:
              </Typography>
              {titulosAlvo.length === 0 ? (
                <Typography sx={{ color: "#64748b", textAlign: "center", py: 4 }}>
                  Nenhum título disponível
                </Typography>
              ) : (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
{titulosAlvo.map((acao, index) => (
  <Paper key={index} sx={{ p: 1.5, bgcolor: "#1a1a2e", border: "1px solid #fbbf2444" }}>
    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <Box>
        <Typography variant="body2" sx={{ color: "#fff", fontWeight: "bold" }}>
          {acao.id || `Ação #${index + 1}`}
        </Typography>
        <Typography variant="caption" sx={{ color: "#fbbf24" }}>
          Qtd: {acao.quantidade || 1} • Preço Médio: 💰 {(acao.precoMedio || 0).toFixed(2)}
        </Typography>
      </Box>
      <Button
        size="small"
        variant="contained"
        onClick={() => transferirTitulos(index)}
        sx={{ bgcolor: "#fbbf24", color: "#000", "&:hover": { bgcolor: "#eab308" } }}
      >
        Transferir
      </Button>
    </Box>
  </Paper>
))}
                </Box>
              )}
            </Box>
          )}

          {/* Imóveis */}
          {tipoTransferencia === "imoveis" && (
            <Box>
              <Typography variant="body2" sx={{ color: "#94a3b8", mb: 2 }}>
                Selecione um imóvel para transferir para você:
              </Typography>
              {imoveisAlvo.length === 0 ? (
                <Typography sx={{ color: "#64748b", textAlign: "center", py: 4 }}>
                  Nenhum imóvel disponível
                </Typography>
              ) : (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  {imoveisAlvo.map((imovel, index) => (
                    <Paper key={index} sx={{ p: 1.5, bgcolor: "#1a1a2e", border: "1px solid #3b82f644" }}>
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <Box>
                          <Typography variant="body2" sx={{ color: "#fff", fontWeight: "bold" }}>
                            {imovel.nome || imovel.endereco || `Imóvel #${index + 1}`}
                          </Typography>
                          {imovel.valor && (
                            <Typography variant="caption" sx={{ color: "#3b82f6" }}>
                              Valor: 💰 {imovel.valor}
                            </Typography>
                          )}
                        </Box>
                        <Button
                          size="small"
                          variant="contained"
                          onClick={() => transferirImoveis(index)}
                          sx={{ bgcolor: "#3b82f6", color: "#fff", "&:hover": { bgcolor: "#2563eb" } }}
                        >
                          Transferir
                        </Button>
                      </Box>
                    </Paper>
                  ))}
                </Box>
              )}
            </Box>
          )}

          {/* Inventário */}
          {tipoTransferencia === "inventario" && (
            <Box>
              <Typography variant="body2" sx={{ color: "#94a3b8", mb: 2 }}>
                Selecione itens para transferir para você:
              </Typography>
              {itensAlvo.length === 0 ? (
                <Typography sx={{ color: "#64748b", textAlign: "center", py: 4 }}>
                  Nenhum item disponível
                </Typography>
              ) : (
                <>
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 1, mb: 2 }}>
                    {itensAlvo.map((item, index) => (
                      <Paper 
                        key={index} 
                        sx={{ 
                          p: 1.5, 
                          bgcolor: itensSelecionados.includes(item) ? "#ef444422" : "#1a1a2e",
                          border: itensSelecionados.includes(item) ? "2px solid #ef4444" : "1px solid #ef444444",
                          cursor: "pointer",
                        }}
                        onClick={() => {
                          if (itensSelecionados.includes(item)) {
                            setItensSelecionados(prev => prev.filter(i => i !== item));
                          } else {
                            setItensSelecionados(prev => [...prev, item]);
                          }
                        }}
                      >
                        <Typography variant="body2" sx={{ color: "#fff" }}>
                          {typeof item === "string" ? item : item.nome || `Item #${index + 1}`}
                        </Typography>
                      </Paper>
                    ))}
                  </Box>
                  <Button
                    fullWidth
                    variant="contained"
                    onClick={transferirItens}
                    disabled={itensSelecionados.length === 0}
                    sx={{ bgcolor: "#ef4444", "&:hover": { bgcolor: "#dc2626" } }}
                  >
                    Transferir {itensSelecionados.length} Itens Selecionados
                  </Button>
                </>
              )}
            </Box>
          )}

          {/* Carteira */}
          {tipoTransferencia === "carteira" && (
            <Box>
              <Typography variant="body2" sx={{ color: "#94a3b8", mb: 2 }}>
                Transfira dinheiro da carteira do alvo:
              </Typography>
              
              <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                <InputLabel sx={{ color: "#94a3b8" }}>Carteira do Alvo</InputLabel>
                <Select
                  value={carteiraSelecionada}
                  onChange={(e) => setCarteiraSelecionada(e.target.value)}
                  sx={{ color: "#fff", bgcolor: "#1a1a2e" }}
                >
                  {Object.entries(carteiraAlvo).map(([nome, valor]) => (
                    <MenuItem key={nome} value={nome}>
                      {nome}: 💰 {typeof valor === "number" ? valor.toFixed(2) : "0.00"}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                fullWidth
                type="number"
                label="Quantidade"
                value={quantidadeTransferencia}
                onChange={(e) => setQuantidadeTransferencia(parseFloat(e.target.value) || 0)}
                InputProps={{ sx: { color: "#fff" } }}
                InputLabelProps={{ sx: { color: "#94a3b8" } }}
                sx={{ mb: 2, "& .MuiOutlinedInput-root": { "& fieldset": { borderColor: "#ef444444" } } }}
              />

              {carteiraSelecionada && (
                <Typography variant="caption" sx={{ color: "#ef4444", display: "block", mb: 2 }}>
                  Saldo disponível: 💰 {(carteiraAlvo[carteiraSelecionada] || 0).toFixed(2)}
                </Typography>
              )}

              <Button
                fullWidth
                variant="contained"
                onClick={transferirCarteira}
                sx={{ bgcolor: "#ef4444", "&:hover": { bgcolor: "#dc2626" } }}
              >
                Transferir 💰 {quantidadeTransferencia.toFixed(2)}
              </Button>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Box>,
    document.body
  );
}

export default React.memo(HackeamentoGame);
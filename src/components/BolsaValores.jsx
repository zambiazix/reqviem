import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Button,
  TextField,
  Grid,
  Chip,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  LinearProgress,
  Tooltip,
  Avatar,
  Badge,
} from "@mui/material";
import { createPortal } from "react-dom";
import CloseIcon from "@mui/icons-material/Close";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import SellIcon from "@mui/icons-material/Sell";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import EditIcon from "@mui/icons-material/Edit";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import { db } from "../firebaseConfig";
import { doc, getDoc, setDoc, onSnapshot, updateDoc } from "firebase/firestore";

// ==================== EMPRESAS INICIAIS ====================
const EMPRESAS_INICIAIS = [
  { 
    id: "hollow", 
    nome: "Hollow Corp", 
    setor: "Tecnologia", 
    sigla: "HLC",
    preco: 847.50,
    variacao: 0,
    historico: [],
    logo: "🏢"
  },
  { 
    id: "nexavolt", 
    nome: "NexaVolt", 
    setor: "Energia", 
    sigla: "NXV",
    preco: 312.25,
    variacao: 0,
    historico: [],
    logo: "⚡"
  },
  { 
    id: "sidera", 
    nome: "Sidera Combinatus", 
    setor: "Mineração", 
    sigla: "SID",
    preco: 128.90,
    variacao: 0,
    historico: [],
    logo: "⛏️"
  },
  { 
    id: "omnitech", 
    nome: "OmniTech", 
    setor: "Cibernética", 
    sigla: "OMN",
    preco: 456.75,
    variacao: 0,
    historico: [],
    logo: "🧠"
  },
  { 
    id: "bioMarin", 
    nome: "BioMarin", 
    setor: "Farmacêutica", 
    sigla: "BIO",
    preco: 234.50,
    variacao: 0,
    historico: [],
    logo: "🧬"
  },
  { 
    id: "ferrus", 
    nome: "Ferrus Industries", 
    setor: "Metalurgia", 
    sigla: "FER",
    preco: 189.30,
    variacao: 0,
    historico: [],
    logo: "🔨"
  },
  { 
    id: "aurum", 
    nome: "Banco Central Aurano", 
    setor: "Financeiro", 
    sigla: "BCA",
    preco: 567.80,
    variacao: 0,
    historico: [],
    logo: "💰"
  },
  { 
    id: "verdearida", 
    nome: "VerdeÁrida", 
    setor: "Agrícola", 
    sigla: "VER",
    preco: 78.40,
    variacao: 0,
    historico: [],
    logo: "🌾"
  },
  { 
    id: "kael", 
    nome: "Clã Kael (Ferglacius)", 
    setor: "Mineração", 
    sigla: "KAE",
    preco: 345.20,
    variacao: 0,
    historico: [],
    logo: "❄️"
  },
  { 
    id: "hrothgar", 
    nome: "Clã Hrothgar", 
    setor: "Mineração", 
    sigla: "HRO",
    preco: 298.70,
    variacao: 0,
    historico: [],
    logo: "🔥"
  },
];

// ==================== COMPONENTE PRINCIPAL ====================
function BolsaValores({ userEmail, onClose, fichasMap, isMaster }) {
  // ===== ESTADOS DA JANELA =====
  const [posicao, setPosicao] = useState({ x: 150, y: 80 });
  const [tamanho, setTamanho] = useState({ width: 800, height: 650 });
  const [minimizado, setMinimizado] = useState(false);
  const [arrastando, setArrastando] = useState(false);
  const [redimensionando, setRedimensionando] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const resizeStartRef = useRef({ x: 0, y: 0, width: 0, height: 0 });

  // ===== ESTADOS DA BOLSA =====
  const [empresas, setEmpresas] = useState(EMPRESAS_INICIAIS);
  const [carteiraJogador, setCarteiraJogador] = useState({});
  const [acoesJogador, setAcoesJogador] = useState({});
  const [abaAtiva, setAbaAtiva] = useState("mercado");
  const [empresaSelecionada, setEmpresaSelecionada] = useState(null);
  const [quantidadeCompra, setQuantidadeCompra] = useState(1);
  const [quantidadeVenda, setQuantidadeVenda] = useState(1);
  const [carteiraSelecionada, setCarteiraSelecionada] = useState("");
  const [loading, setLoading] = useState(false);
  const [modalCompra, setModalCompra] = useState(false);
  const [modalVenda, setModalVenda] = useState(false);
  const [filtroSetor, setFiltroSetor] = useState("todos");
  const [busca, setBusca] = useState("");
  // ===== EMAIL DO JOGADOR SELECIONADO (RESPEITANDO O CHAT) =====
const [emailParaCarteira, setEmailParaCarteira] = useState(userEmail);
  // ===== ESTADOS DE EDIÇÃO (MESTRE) =====
const [modoEdicao, setModoEdicao] = useState(false);
const [empresaEditando, setEmpresaEditando] = useState(null);
const [modalEdicaoOpen, setModalEdicaoOpen] = useState(false);
const [novaEmpresa, setNovaEmpresa] = useState({
  id: "",
  nome: "",
  setor: "Tecnologia",
  sigla: "",
  preco: 100,
  logo: "🏢"
});

  // ===== HISTÓRICO DE PREÇOS =====
  const [historicoGlobal, setHistoricoGlobal] = useState([]);

  // ===== OUVIR O EMAIL SELECIONADO NO CHAT =====
useEffect(() => {
  const handleEmailSelecionado = (event) => {
    const email = event.detail;
    if (email) {
      setEmailParaCarteira(email);
    }
  };
  
  window.addEventListener('jogadorSelecionadoChat', handleEmailSelecionado);
  return () => window.removeEventListener('jogadorSelecionadoChat', handleEmailSelecionado);
}, []);

  // ===== CARREGAR DADOS DO FIRESTORE =====
  useEffect(() => {
    const ref = doc(db, "bolsa_valores", "dados");
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        const dados = snap.data();
        if (dados.empresas) {
          setEmpresas(dados.empresas);
        }
        if (dados.historico) {
          setHistoricoGlobal(dados.historico);
        }
      }
    });
    return () => unsub();
  }, []);

  // ===== CARREGAR CARTEIRA DO JOGADOR =====
useEffect(() => {
  const emailAtual = emailParaCarteira || userEmail;
  if (!emailAtual) {
    setCarteiraJogador({});
    setAcoesJogador({});
    return;
  }
  const fichaRef = doc(db, "fichas", emailAtual);
  const unsub = onSnapshot(fichaRef, (snap) => {
    if (snap.exists()) {
      const dados = snap.data();
      // Garante que carteiras é um objeto e não um array
      const carteiras = dados.carteiras || {};
      const acoes = dados.acoes || {};
      
      // 🟢 CONVERTE PARA OBJETO SE FOR ARRAY
      const carteirasObj = Array.isArray(carteiras) 
        ? carteiras.reduce((acc, item) => ({ ...acc, [item.nome || 'default']: item.valor || 0 }), {})
        : carteiras;
      
      setCarteiraJogador(carteirasObj);
      setAcoesJogador(acoes);
    } else {
      setCarteiraJogador({});
      setAcoesJogador({});
    }
  });
  return () => unsub();
}, [emailParaCarteira, userEmail]);

  // ===== SALVAR DADOS =====
  const salvarDados = async (novasEmpresas) => {
    await setDoc(doc(db, "bolsa_valores", "dados"), {
      empresas: novasEmpresas,
      historico: historicoGlobal,
    }, { merge: true });
  };

  // ===== SALVAR CARTEIRA DO JOGADOR =====
  const salvarCarteiraJogador = async (novasAcoes, novasCarteiras) => {
    const fichaRef = doc(db, "fichas", emailParaCarteira || userEmail);
    const atualizacao = {};
    if (novasAcoes) atualizacao.acoes = novasAcoes;
    if (novasCarteiras) atualizacao.carteiras = novasCarteiras;
    await setDoc(fichaRef, atualizacao, { merge: true });
  };
  // ===== GERAR FLUTUAÇÃO DE PREÇOS (mais realista: -30% a +30%) =====
  useEffect(() => {
    const interval = setInterval(() => {
      setEmpresas(prev => {
        const novas = prev.map(emp => {
          // Variação entre -30% e +30% (mas geralmente pequena)
          const variacaoPercentual = (Math.random() - 0.5) * 0.60;
          const variacao = emp.preco * variacaoPercentual;
          const novoPreco = Math.max(0.01, emp.preco + variacao);
          const variacaoPercentualExibicao = ((novoPreco - emp.preco) / emp.preco) * 100;
          
          const novoHistorico = [...emp.historico, novoPreco];
          if (novoHistorico.length > 100) {
            novoHistorico.shift();
          }
          
          return {
            ...emp,
            preco: Math.round(novoPreco * 100) / 100,
            variacao: Math.round(variacaoPercentualExibicao * 100) / 100,
            historico: novoHistorico,
          };
        });
        
        // Salva no Firestore a cada atualização
        salvarDados(novas);
        
        return novas;
      });
    }, 30000); // A cada 30 segundos (para não sobrecarregar)
    
    return () => clearInterval(interval);
  }, [empresas]);
  // ===== EVENTOS DE ARRASTAR/REDIMENSIONAR =====
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (arrastando) setPosicao({ x: e.clientX - dragStartRef.current.x, y: e.clientY - dragStartRef.current.y });
      if (redimensionando) setTamanho({ width: Math.max(500, resizeStartRef.current.width + (e.clientX - resizeStartRef.current.x)), height: Math.max(400, resizeStartRef.current.height + (e.clientY - resizeStartRef.current.y)) });
    };
    const handleMouseUp = () => { setArrastando(false); setRedimensionando(false); };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => { window.removeEventListener("mousemove", handleMouseMove); window.removeEventListener("mouseup", handleMouseUp); };
  }, [arrastando, redimensionando]);

  // ===== COMPRAR AÇÕES =====
  const comprarAcoes = async () => {
    if (!empresaSelecionada || quantidadeCompra <= 0) return;
    if (!carteiraSelecionada) {
      alert("Selecione uma carteira para debitar!");
      return;
    }

    const valorTotal = empresaSelecionada.preco * quantidadeCompra;
    const carteiraAtual = carteiraJogador[carteiraSelecionada] || 0;

    if (carteiraAtual < valorTotal) {
      alert(`Saldo insuficiente! Você precisa de ${valorTotal.toFixed(2)} 💰, mas tem ${carteiraAtual.toFixed(2)} 💰`);
      return;
    }

    setLoading(true);

    try {
      // Atualiza carteira
      const novasCarteiras = {
        ...carteiraJogador,
        [carteiraSelecionada]: carteiraAtual - valorTotal,
      };

      // Atualiza ações do jogador
      const novasAcoes = { ...acoesJogador };
      if (novasAcoes[empresaSelecionada.id]) {
        const acaoAtual = novasAcoes[empresaSelecionada.id];
        const quantidadeAtual = acaoAtual.quantidade || 0;
        const precoMedio = (acaoAtual.precoMedio * quantidadeAtual + empresaSelecionada.preco * quantidadeCompra) / (quantidadeAtual + quantidadeCompra);
        novasAcoes[empresaSelecionada.id] = {
          quantidade: quantidadeAtual + quantidadeCompra,
          precoMedio: precoMedio,
          precoAtual: empresaSelecionada.preco,
          dataCompra: new Date().toISOString(),
        };
      } else {
        novasAcoes[empresaSelecionada.id] = {
          quantidade: quantidadeCompra,
          precoMedio: empresaSelecionada.preco,
          precoAtual: empresaSelecionada.preco,
          dataCompra: new Date().toISOString(),
        };
      }

      await salvarCarteiraJogador(novasAcoes, novasCarteiras);
      setCarteiraJogador(novasCarteiras);
      setAcoesJogador(novasAcoes);
      
      alert(`✅ Compra realizada!\n${quantidadeCompra}x ${empresaSelecionada.sigla} por ${valorTotal.toFixed(2)} 💰`);
      setModalCompra(false);
      setQuantidadeCompra(1);
      setEmpresaSelecionada(null);
    } catch (error) {
      console.error("Erro na compra:", error);
      alert("Erro ao realizar compra.");
    } finally {
      setLoading(false);
    }
  };

  // ===== VENDER AÇÕES =====
  const venderAcoes = async () => {
    if (!empresaSelecionada || quantidadeVenda <= 0) return;

    const acaoJogador = acoesJogador[empresaSelecionada.id];
    if (!acaoJogador || acaoJogador.quantidade < quantidadeVenda) {
      alert(`Você só tem ${acaoJogador?.quantidade || 0} ações da ${empresaSelecionada.sigla}`);
      return;
    }

    const valorTotal = empresaSelecionada.preco * quantidadeVenda;

    setLoading(true);

    try {
      // Atualiza ações do jogador
      const novasAcoes = { ...acoesJogador };
      const novaQuantidade = acaoJogador.quantidade - quantidadeVenda;
      if (novaQuantidade <= 0) {
        delete novasAcoes[empresaSelecionada.id];
      } else {
        novasAcoes[empresaSelecionada.id] = {
          ...acaoJogador,
          quantidade: novaQuantidade,
        };
      }

      // Atualiza carteira (crédito)
      const carteiraPadrao = Object.keys(carteiraJogador)[0] || "Bolso";
      const novasCarteiras = {
        ...carteiraJogador,
        [carteiraPadrao]: (carteiraJogador[carteiraPadrao] || 0) + valorTotal,
      };

      await salvarCarteiraJogador(novasAcoes, novasCarteiras);
      setCarteiraJogador(novasCarteiras);
      setAcoesJogador(novasAcoes);
      
      alert(`✅ Venda realizada!\n${quantidadeVenda}x ${empresaSelecionada.sigla} por ${valorTotal.toFixed(2)} 💰`);
      setModalVenda(false);
      setQuantidadeVenda(1);
      setEmpresaSelecionada(null);
    } catch (error) {
      console.error("Erro na venda:", error);
      alert("Erro ao realizar venda.");
    } finally {
      setLoading(false);
    }
  };

  // ===== CALCULAR RENTABILIDADE =====
  const calcularRentabilidade = (empresaId) => {
    const acao = acoesJogador[empresaId];
    if (!acao) return null;
    const empresa = empresas.find(e => e.id === empresaId);
    if (!empresa) return null;
    const valorInvestido = acao.precoMedio * acao.quantidade;
    const valorAtual = empresa.preco * acao.quantidade;
    const lucro = valorAtual - valorInvestido;
    const percentual = (lucro / valorInvestido) * 100;
    return { valorInvestido, valorAtual, lucro, percentual };
  };

  // ===== EMPRESAS FILTRADAS =====
  const empresasFiltradas = empresas.filter(emp => {
    const matchSetor = filtroSetor === "todos" || emp.setor === filtroSetor;
    const matchBusca = emp.nome.toLowerCase().includes(busca.toLowerCase()) || 
                       emp.sigla.toLowerCase().includes(busca.toLowerCase());
    return matchSetor && matchBusca;
  });

  // ===== SETORES ÚNICOS =====
  const setores = ["todos", ...new Set(empresas.map(e => e.setor))];

  // ===== RENDER =====
return createPortal(
  <Paper
    elevation={10}
    sx={{
      position: "fixed",
      left: posicao.x,
      top: posicao.y,
      width: minimizado ? 300 : tamanho.width,
      height: minimizado ? 48 : tamanho.height,
      bgcolor: "#0a0a0a",
      color: "#fff",
      borderRadius: 2,
      border: "2px solid #fbbf24",
      zIndex: 9998,
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      boxShadow: "0 0 30px rgba(251,191,36,0.3), 0 8px 32px rgba(0,0,0,0.8)",
      fontFamily: "'Courier New', monospace",
    }}
  >
      {/* BARRA DE TÍTULO */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          p: 1,
          bgcolor: "#1a1a0a",
          cursor: "move",
          minHeight: 40,
          borderBottom: "1px solid #fbbf2444",
        }}
        onMouseDown={(e) => {
          if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT') return;
          e.preventDefault();
          setArrastando(true);
          dragStartRef.current = { x: e.clientX - posicao.x, y: e.clientY - posicao.y };
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <ShowChartIcon sx={{ color: "#fbbf24" }} />
          <Typography variant="subtitle2" sx={{ color: "#fbbf24", fontWeight: "bold" }}>
            {minimizado ? "📈 Bolsa" : "📈 BOLSA DE VALORES"}
          </Typography>
          {!minimizado && (
            <Chip
              label={empresas.length > 0 ? "🔴 MERCADO ABERTO" : "⚪ FECHADO"}
              size="small"
              sx={{ bgcolor: empresas.length > 0 ? "#22c55e22" : "#ef444422", color: empresas.length > 0 ? "#22c55e" : "#ef4444", fontSize: "0.5rem", height: 16 }}
            />
          )}
{!minimizado && (
  <Chip
    label={`💰 ${(() => {
      try {
        // Verifica se carteiraJogador é um objeto e tem valores
        if (carteiraJogador && typeof carteiraJogador === 'object') {
          const valores = Object.values(carteiraJogador);
          if (valores.length > 0 && valores.some(v => typeof v === 'number')) {
            const total = valores.reduce((a, b) => a + (typeof b === 'number' ? b : 0), 0);
            return total.toFixed(2);
          }
        }
        return "0.00";
      } catch {
        return "0.00";
      }
    })()}`}
    size="small"
    sx={{ bgcolor: "#fbbf2422", color: "#fbbf24", fontSize: "0.6rem", height: 20, fontWeight: "bold" }}
  />
)}
        </Box>
<Box sx={{ display: "flex", gap: 0.5 }}>
  {isMaster && (
    <IconButton 
      size="small" 
      onClick={() => setModoEdicao(!modoEdicao)} 
      sx={{ color: modoEdicao ? "#ff9800" : "#fbbf24", p: 0.5 }}
      title={modoEdicao ? "Sair do modo edição" : "Editar empresas"}
    >
      <EditIcon fontSize="small" />
    </IconButton>
  )}
  <IconButton size="small" onClick={() => setMinimizado(!minimizado)} sx={{ color: "#fbbf24", p: 0.5 }}>
    {minimizado ? "□" : "−"}
  </IconButton>
  <IconButton size="small" onClick={onClose} sx={{ color: "#fbbf24", p: 0.5 }}>
    <CloseIcon fontSize="small" />
  </IconButton>
</Box>
      </Box>

      {/* CONTEÚDO */}
      {!minimizado && (
        <Box sx={{ flex: 1, display: "flex", flexDirection: "column", p: 1.5, gap: 1, overflowY: "auto", "&::-webkit-scrollbar": { width: "3px" }, "&::-webkit-scrollbar-thumb": { background: "#fbbf2444", borderRadius: "10px" } }}>
          
          {/* ABAS */}
          <Box sx={{ display: "flex", gap: 0.5, borderBottom: "1px solid #fbbf2433", pb: 1, flexWrap: "wrap" }}>
            <Button size="small" onClick={() => setAbaAtiva("mercado")}
              sx={{ color: abaAtiva === "mercado" ? "#fbbf24" : "#888", fontSize: "0.65rem", bgcolor: abaAtiva === "mercado" ? "#fbbf2422" : "transparent" }}>
              [MERCADO]
            </Button>
            <Button size="small" onClick={() => setAbaAtiva("carteira")}
              sx={{ color: abaAtiva === "carteira" ? "#fbbf24" : "#888", fontSize: "0.65rem", bgcolor: abaAtiva === "carteira" ? "#fbbf2422" : "transparent" }}>
              [MINHAS AÇÕES]
            </Button>
            <Button size="small" onClick={() => setAbaAtiva("historico")}
              sx={{ color: abaAtiva === "historico" ? "#fbbf24" : "#888", fontSize: "0.65rem", bgcolor: abaAtiva === "historico" ? "#fbbf2422" : "transparent" }}>
              [HISTÓRICO]
            </Button>
          </Box>

          {/* ABA MERCADO */}
          {abaAtiva === "mercado" && (
            <Box>
              {/* Filtros */}
              <Box sx={{ display: "flex", gap: 1, mb: 1.5, flexWrap: "wrap", alignItems: "center" }}>
                <TextField
                  size="small"
                  placeholder="🔍 Buscar empresa..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  sx={{ flex: 1, minWidth: 150, '& .MuiInputBase-root': { color: '#fff', fontSize: '0.8rem' } }}
                  InputProps={{ sx: { bgcolor: '#1a1a1a' } }}
                />
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel sx={{ color: '#94a3b8' }}>Setor</InputLabel>
                  <Select
                    value={filtroSetor}
                    onChange={(e) => setFiltroSetor(e.target.value)}
                    sx={{ color: '#fff', bgcolor: '#1a1a1a' }}
                  >
                    {setores.map(s => (
                      <MenuItem key={s} value={s}>{s === "todos" ? "Todos" : s}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Typography variant="caption" sx={{ color: '#64748b' }}>
                  {empresasFiltradas.length} empresas
                </Typography>
                {isMaster && modoEdicao && (
  <Button 
    size="small" 
    variant="contained" 
    startIcon={<AddIcon />}
    onClick={() => {
      setEmpresaEditando(null);
      setNovaEmpresa({
        id: "",
        nome: "",
        setor: "Tecnologia",
        sigla: "",
        preco: 100,
        logo: "🏢"
      });
      setModalEdicaoOpen(true);
    }}
    sx={{ bgcolor: "#22c55e", '&:hover': { bgcolor: "#16a34a" }, fontSize: "0.6rem" }}
  >
    Nova Empresa
  </Button>
)}
              </Box>

              {/* Lista de Empresas */}
              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                {empresasFiltradas.map((emp) => {
                  const rentabilidade = calcularRentabilidade(emp.id);
                  const temAcoes = acoesJogador[emp.id] && acoesJogador[emp.id].quantidade > 0;
                  const variacaoPositiva = emp.variacao >= 0;
                  
                  return (
                    <Paper
                      key={emp.id}
                      sx={{
                        p: 1.5,
                        bgcolor: "#1a1a1a",
                        border: "1px solid #333",
                        '&:hover': { borderColor: "#fbbf2466" },
                        display: "flex",
                        alignItems: "center",
                        gap: 1.5,
                        flexWrap: "wrap",
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, flex: 1, minWidth: 150 }}>
                        <Typography sx={{ fontSize: "1.5rem" }}>{emp.logo}</Typography>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: "bold", color: "#fff" }}>
                            {emp.nome}
                          </Typography>
                          <Typography variant="caption" sx={{ color: "#64748b", display: "block" }}>
                            {emp.sigla} • {emp.setor}
                          </Typography>
                        </Box>
                      </Box>

                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                        <Box sx={{ textAlign: "right" }}>
                          <Typography variant="body2" sx={{ color: "#fff", fontWeight: "bold" }}>
                            💰 {emp.preco.toFixed(2)}
                          </Typography>
                          <Typography variant="caption" sx={{ color: variacaoPositiva ? "#22c55e" : "#ef4444", fontWeight: "bold" }}>
                            {variacaoPositiva ? "▲" : "▼"} {Math.abs(emp.variacao).toFixed(2)}%
                          </Typography>
                        </Box>

                        {/* Mini gráfico */}
                        <Box sx={{ width: 60, height: 30, display: "flex", alignItems: "flex-end", gap: 0.5 }}>
                          {emp.historico.slice(-10).map((valor, i) => {
                            const max = Math.max(...emp.historico.slice(-10));
                            const min = Math.min(...emp.historico.slice(-10));
                            const altura = max - min > 0 ? ((valor - min) / (max - min)) * 25 : 15;
                            return (
                              <Box
                                key={i}
                                sx={{
                                  width: 4,
                                  height: Math.max(3, altura),
                                  bgcolor: valor >= emp.historico.slice(-10)[0] ? "#22c55e" : "#ef4444",
                                  borderRadius: 1,
                                }}
                              />
                            );
                          })}
                        </Box>

                        {temAcoes && (
                          <Chip
                            label={`📦 ${acoesJogador[emp.id].quantidade}`}
                            size="small"
                            sx={{ bgcolor: "#fbbf2422", color: "#fbbf24", fontSize: "0.55rem", height: 18 }}
                          />
                        )}

                        {rentabilidade && (
                          <Chip
                            label={rentabilidade.percentual >= 0 ? `📈 +${rentabilidade.percentual.toFixed(1)}%` : `📉 ${rentabilidade.percentual.toFixed(1)}%`}
                            size="small"
                            sx={{ bgcolor: rentabilidade.percentual >= 0 ? "#22c55e22" : "#ef444422", color: rentabilidade.percentual >= 0 ? "#22c55e" : "#ef4444", fontSize: "0.55rem", height: 18 }}
                          />
                        )}

                        <Box sx={{ display: "flex", gap: 0.5 }}>
                          <Button
                            size="small"
                            variant="contained"
                            startIcon={<ShoppingCartIcon sx={{ fontSize: 14 }} />}
                            onClick={() => {
                              setEmpresaSelecionada(emp);
                              setQuantidadeCompra(1);
                              setModalCompra(true);
                            }}
                            sx={{ bgcolor: "#22c55e", '&:hover': { bgcolor: "#16a34a" }, fontSize: "0.6rem", minWidth: 70 }}
                          >
                            Comprar
                          </Button>
                          {temAcoes && (
                            <Button
                              size="small"
                              variant="contained"
                              startIcon={<SellIcon sx={{ fontSize: 14 }} />}
                              onClick={() => {
                                setEmpresaSelecionada(emp);
                                setQuantidadeVenda(1);
                                setModalVenda(true);
                              }}
                              sx={{ bgcolor: "#ef4444", '&:hover': { bgcolor: "#dc2626" }, fontSize: "0.6rem", minWidth: 70 }}
                            >
                              Vender
                            </Button>
                          )}
                        </Box>
                      </Box>
                      {modoEdicao && isMaster && (
  <Box sx={{ display: "flex", gap: 0.5, ml: "auto" }}>
    <IconButton 
      size="small" 
      onClick={() => {
        setEmpresaEditando(emp);
        setNovaEmpresa({
          id: emp.id,
          nome: emp.nome,
          setor: emp.setor,
          sigla: emp.sigla,
          preco: emp.preco,
          logo: emp.logo
        });
        setModalEdicaoOpen(true);
      }}
      sx={{ color: "#ff9800" }}
    >
      <EditIcon fontSize="small" />
    </IconButton>
    <IconButton 
      size="small" 
      onClick={() => {
        if (window.confirm(`Remover a empresa "${emp.nome}"?`)) {
          const novas = empresas.filter(e => e.id !== emp.id);
          setEmpresas(novas);
          salvarDados(novas);
        }
      }}
      sx={{ color: "#ef4444" }}
    >
      <DeleteIcon fontSize="small" />
    </IconButton>
  </Box>
)}
                    </Paper>
                  );
                })}
              </Box>
            </Box>
          )}

          {/* ABA CARTEIRA */}
          {abaAtiva === "carteira" && (
            <Box>
              <Typography variant="subtitle2" sx={{ color: "#fbbf24", mb: 1.5 }}>
                💰 MINHAS AÇÕES
              </Typography>
              
              {Object.keys(acoesJogador).length === 0 ? (
                <Typography sx={{ color: "#64748b", textAlign: "center", py: 4 }}>
                  Você não possui ações. Comece a investir no mercado!
                </Typography>
              ) : (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                  {Object.entries(acoesJogador).map(([empresaId, acao]) => {
                    const empresa = empresas.find(e => e.id === empresaId);
                    if (!empresa) return null;
                    const rentabilidade = calcularRentabilidade(empresaId);
                    
                    return (
                      <Paper key={empresaId} sx={{ p: 1.5, bgcolor: "#1a1a1a", border: "1px solid #333" }}>
                        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: "bold", color: "#fff" }}>
                              {empresa.nome} ({empresa.sigla})
                            </Typography>
                            <Typography variant="caption" sx={{ color: "#64748b" }}>
                              📦 {acao.quantidade} ações • 💰 {acao.precoMedio.toFixed(2)} (médio)
                            </Typography>
                          </Box>
                          
                          <Box sx={{ textAlign: "right" }}>
                            <Typography variant="body2" sx={{ color: "#fff", fontWeight: "bold" }}>
                              💰 {empresa.preco.toFixed(2)}
                            </Typography>
                            {rentabilidade && (
                              <Typography variant="caption" sx={{ color: rentabilidade.percentual >= 0 ? "#22c55e" : "#ef4444", fontWeight: "bold" }}>
                                {rentabilidade.percentual >= 0 ? "▲" : "▼"} {Math.abs(rentabilidade.percentual).toFixed(2)}%
                              </Typography>
                            )}
                          </Box>
                          
                          <Box sx={{ display: "flex", gap: 0.5 }}>
                            <Button
                              size="small"
                              variant="contained"
                              startIcon={<ShoppingCartIcon sx={{ fontSize: 14 }} />}
                              onClick={() => {
                                setEmpresaSelecionada(empresa);
                                setQuantidadeCompra(1);
                                setModalCompra(true);
                              }}
                              sx={{ bgcolor: "#22c55e", '&:hover': { bgcolor: "#16a34a" }, fontSize: "0.6rem" }}
                            >
                              Comprar
                            </Button>
                            <Button
                              size="small"
                              variant="contained"
                              startIcon={<SellIcon sx={{ fontSize: 14 }} />}
                              onClick={() => {
                                setEmpresaSelecionada(empresa);
                                setQuantidadeVenda(1);
                                setModalVenda(true);
                              }}
                              sx={{ bgcolor: "#ef4444", '&:hover': { bgcolor: "#dc2626" }, fontSize: "0.6rem" }}
                            >
                              Vender
                            </Button>
                          </Box>
                        </Box>
                      </Paper>
                    );
                  })}
                  
                  {/* Resumo da carteira */}
                  <Paper sx={{ p: 2, mt: 1, bgcolor: "#1a1a2e", border: "1px solid #fbbf2433" }}>
                    <Typography variant="caption" sx={{ color: "#94a3b8" }}>
                      📊 Resumo da Carteira
                    </Typography>
                    {(() => {
                      const totalInvestido = Object.entries(acoesJogador).reduce((total, [id, acao]) => {
                        const empresa = empresas.find(e => e.id === id);
                        if (!empresa) return total;
                        return total + (acao.quantidade * acao.precoMedio);
                      }, 0);
                      
                      const totalAtual = Object.entries(acoesJogador).reduce((total, [id, acao]) => {
                        const empresa = empresas.find(e => e.id === id);
                        if (!empresa) return total;
                        return total + (acao.quantidade * empresa.preco);
                      }, 0);
                      
                      const lucroTotal = totalAtual - totalInvestido;
                      const percentualTotal = totalInvestido > 0 ? (lucroTotal / totalInvestido) * 100 : 0;
                      
                      return (
                        <Box sx={{ display: "flex", gap: 2, mt: 1, flexWrap: "wrap" }}>
                          <Typography variant="body2" sx={{ color: "#94a3b8" }}>
                            Investido: <strong style={{ color: "#fff" }}>💰 {totalInvestido.toFixed(2)}</strong>
                          </Typography>
                          <Typography variant="body2" sx={{ color: "#94a3b8" }}>
                            Atual: <strong style={{ color: "#fff" }}>💰 {totalAtual.toFixed(2)}</strong>
                          </Typography>
                          <Typography variant="body2" sx={{ color: lucroTotal >= 0 ? "#22c55e" : "#ef4444", fontWeight: "bold" }}>
                            {lucroTotal >= 0 ? "📈" : "📉"} {lucroTotal.toFixed(2)} ({percentualTotal.toFixed(2)}%)
                          </Typography>
                        </Box>
                      );
                    })()}
                  </Paper>
                </Box>
              )}
            </Box>
          )}

          {/* ABA HISTÓRICO */}
          {abaAtiva === "historico" && (
            <Box>
              <Typography variant="subtitle2" sx={{ color: "#fbbf24", mb: 1.5 }}>
                📜 HISTÓRICO DE TRANSAÇÕES
              </Typography>
              <Typography variant="caption" sx={{ color: "#64748b" }}>
                Aqui aparecerão suas compras e vendas realizadas.
              </Typography>
            </Box>
          )}
        </Box>
      )}

      {/* ALÇA DE REDIMENSIONAMENTO */}
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

      {/* MODAL DE COMPRA */}
      <Dialog open={modalCompra} onClose={() => setModalCompra(false)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { bgcolor: "#0f172a", border: "1px solid #1e293b", borderRadius: 2 } }}>
        <DialogTitle sx={{ color: '#fbbf24' }}>📈 Comprar Ações</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            {empresaSelecionada && (
              <>
                <Typography variant="body1" sx={{ color: '#fff' }}>
                  {empresaSelecionada.nome} ({empresaSelecionada.sigla})
                </Typography>
                <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                  Preço atual: <strong style={{ color: '#fbbf24' }}>💰 {empresaSelecionada.preco.toFixed(2)}</strong>
                </Typography>
                
                <FormControl fullWidth size="small">
                  <InputLabel sx={{ color: '#94a3b8' }}>Carteira para débito</InputLabel>
                  <Select
                    value={carteiraSelecionada}
                    onChange={(e) => setCarteiraSelecionada(e.target.value)}
                    sx={{ color: '#fff', bgcolor: '#1a1a2e' }}
                  >
                    {Object.entries(carteiraJogador).map(([nome, valor]) => (
                      <MenuItem key={nome} value={nome}>
                        {nome}: 💰 {valor.toFixed(2)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                
                <TextField
                  label="Quantidade"
                  type="number"
                  size="small"
                  value={quantidadeCompra}
                  onChange={(e) => setQuantidadeCompra(Math.max(1, Number(e.target.value) || 1))}
                  InputProps={{ inputProps: { min: 1 }, sx: { color: '#fff' } }}
                  sx={{ bgcolor: '#1a1a2e' }}
                />
                
                <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                  Total: <strong style={{ color: '#fbbf24' }}>💰 {(empresaSelecionada.preco * quantidadeCompra).toFixed(2)}</strong>
                </Typography>
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModalCompra(false)} sx={{ color: '#94a3b8' }}>Cancelar</Button>
          <Button variant="contained" onClick={comprarAcoes} disabled={loading} sx={{ bgcolor: '#22c55e', '&:hover': { bgcolor: '#16a34a' } }}>
            {loading ? "Processando..." : "Comprar"}
          </Button>
        </DialogActions>
      </Dialog>
      {/* MODAL DE VENDA */}
      <Dialog open={modalVenda} onClose={() => setModalVenda(false)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { bgcolor: "#0f172a", border: "1px solid #1e293b", borderRadius: 2 } }}>
        <DialogTitle sx={{ color: '#ef4444' }}>📉 Vender Ações</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            {empresaSelecionada && (
              <>
                <Typography variant="body1" sx={{ color: '#fff' }}>
                  {empresaSelecionada.nome} ({empresaSelecionada.sigla})
                </Typography>
                <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                  Preço atual: <strong style={{ color: '#fbbf24' }}>💰 {empresaSelecionada.preco.toFixed(2)}</strong>
                </Typography>
                <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                  Você tem: <strong style={{ color: '#fff' }}>{acoesJogador[empresaSelecionada.id]?.quantidade || 0} ações</strong>
                </Typography>
                
                <TextField
                  label="Quantidade"
                  type="number"
                  size="small"
                  value={quantidadeVenda}
                  onChange={(e) => setQuantidadeVenda(Math.min(acoesJogador[empresaSelecionada.id]?.quantidade || 0, Math.max(1, Number(e.target.value) || 1)))}
                  InputProps={{ inputProps: { min: 1, max: acoesJogador[empresaSelecionada.id]?.quantidade || 0 }, sx: { color: '#fff' } }}
                  sx={{ bgcolor: '#1a1a2e' }}
                />
                
                <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                  Total: <strong style={{ color: '#fbbf24' }}>💰 {(empresaSelecionada.preco * quantidadeVenda).toFixed(2)}</strong>
                </Typography>
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModalVenda(false)} sx={{ color: '#94a3b8' }}>Cancelar</Button>
          <Button variant="contained" onClick={venderAcoes} disabled={loading} sx={{ bgcolor: '#ef4444', '&:hover': { bgcolor: '#dc2626' } }}>
            {loading ? "Processando..." : "Vender"}
          </Button>
        </DialogActions>
      </Dialog>
            {/* MODAL DE EDIÇÃO DE EMPRESA */}
      <Dialog open={modalEdicaoOpen} onClose={() => setModalEdicaoOpen(false)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { bgcolor: "#0f172a", border: "1px solid #1e293b", borderRadius: 2 } }}>
        <DialogTitle sx={{ color: '#fbbf24' }}>
          {empresaEditando ? "✏️ Editar Empresa" : "➕ Nova Empresa"}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              label="Nome da Empresa"
              fullWidth
              size="small"
              value={novaEmpresa.nome}
              onChange={(e) => setNovaEmpresa({ ...novaEmpresa, nome: e.target.value })}
              InputProps={{ sx: { color: '#fff' } }}
              InputLabelProps={{ sx: { color: '#94a3b8' } }}
              sx={{ bgcolor: '#1a1a2e' }}
            />
            <TextField
              label="Sigla (ex: HLC)"
              fullWidth
              size="small"
              value={novaEmpresa.sigla}
              onChange={(e) => setNovaEmpresa({ ...novaEmpresa, sigla: e.target.value.toUpperCase() })}
              InputProps={{ sx: { color: '#fff' } }}
              InputLabelProps={{ sx: { color: '#94a3b8' } }}
              sx={{ bgcolor: '#1a1a2e' }}
              helperText="Máximo 4 letras"
              FormHelperTextProps={{ sx: { color: '#64748b' } }}
            />
            <FormControl fullWidth size="small">
              <InputLabel sx={{ color: '#94a3b8' }}>Setor</InputLabel>
              <Select
                value={novaEmpresa.setor}
                onChange={(e) => setNovaEmpresa({ ...novaEmpresa, setor: e.target.value })}
                sx={{ color: '#fff', bgcolor: '#1a1a2e' }}
              >
                <MenuItem value="Tecnologia">Tecnologia</MenuItem>
                <MenuItem value="Energia">Energia</MenuItem>
                <MenuItem value="Mineração">Mineração</MenuItem>
                <MenuItem value="Cibernética">Cibernética</MenuItem>
                <MenuItem value="Farmacêutica">Farmacêutica</MenuItem>
                <MenuItem value="Metalurgia">Metalurgia</MenuItem>
                <MenuItem value="Financeiro">Financeiro</MenuItem>
                <MenuItem value="Agrícola">Agrícola</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Preço Inicial"
              type="number"
              fullWidth
              size="small"
              value={novaEmpresa.preco}
              onChange={(e) => setNovaEmpresa({ ...novaEmpresa, preco: Math.max(0.01, Number(e.target.value) || 0) })}
              InputProps={{ sx: { color: '#fff' }, inputProps: { min: 0.01, step: 0.01 } }}
              InputLabelProps={{ sx: { color: '#94a3b8' } }}
              sx={{ bgcolor: '#1a1a2e' }}
            />
            <TextField
              label="Emoji/Logo"
              fullWidth
              size="small"
              value={novaEmpresa.logo}
              onChange={(e) => setNovaEmpresa({ ...novaEmpresa, logo: e.target.value })}
              InputProps={{ sx: { color: '#fff' } }}
              InputLabelProps={{ sx: { color: '#94a3b8' } }}
              sx={{ bgcolor: '#1a1a2e' }}
              helperText="Use um emoji (ex: 🏢, ⚡, ⛏️)"
              FormHelperTextProps={{ sx: { color: '#64748b' } }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModalEdicaoOpen(false)} sx={{ color: '#94a3b8' }}>Cancelar</Button>
          <Button 
            variant="contained" 
            onClick={() => {
              if (!novaEmpresa.nome.trim() || !novaEmpresa.sigla.trim()) {
                alert("Preencha nome e sigla!");
                return;
              }
              
              let novasEmpresas;
              if (empresaEditando) {
                // Edição
                novasEmpresas = empresas.map(e => 
                  e.id === empresaEditando.id 
                    ? { 
                        ...novaEmpresa, 
                        id: e.id,
                        variacao: e.variacao,
                        historico: e.historico
                      }
                    : e
                );
              } else {
                // Nova empresa
                const id = novaEmpresa.nome.toLowerCase().replace(/\s+/g, '_');
                novasEmpresas = [
                  ...empresas,
                  {
                    ...novaEmpresa,
                    id: id + '_' + Date.now(),
                    variacao: 0,
                    historico: [novaEmpresa.preco]
                  }
                ];
              }
              
              setEmpresas(novasEmpresas);
              salvarDados(novasEmpresas);
              setModalEdicaoOpen(false);
            }}
            sx={{ bgcolor: '#22c55e', '&:hover': { bgcolor: '#16a34a' } }}
          >
            {empresaEditando ? "Salvar Alterações" : "Adicionar Empresa"}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>,
    document.body
  );
}

export default React.memo(BolsaValores);
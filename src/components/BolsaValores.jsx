import React, { useState, useEffect, useRef } from "react";
import {
  Box, Paper, Typography, IconButton, Button, TextField, Grid, Chip,
  Divider, Dialog, DialogTitle, DialogContent, DialogActions,
  FormControl, InputLabel, Select, MenuItem, Tooltip,
} from "@mui/material";
import { createPortal } from "react-dom";
import CloseIcon from "@mui/icons-material/Close";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import SellIcon from "@mui/icons-material/Sell";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import EditIcon from "@mui/icons-material/Edit";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import { db } from "../firebaseConfig";
import { doc, setDoc, onSnapshot } from "firebase/firestore";

const EMPRESAS_INICIAIS = [
  { id: "hollow", nome: "Hollow Corp", setor: "Tecnologia", sigla: "HLC", preco: 847.50, variacao: 0, historico: [], logo: "🏢", imagem: "", descricao: "Maior corporação de tecnologia do Império Aurano.", sede: "Auraxia", fundador: "Viktor Hollow", ceoAtual: "Sarah Hollow", tipoEmpresa: "Pública", valorEmpresa: 1200000000000, faturamentoAnual: 480000000000, historia: "Fundada em 722 D.C.", empresasAfiliadas: [{ nome: "Hollow Defense", relacao: "Subsidiária" }] },
  { id: "nexavolt", nome: "NexaVolt", setor: "Energia", sigla: "NXV", preco: 312.25, variacao: 0, historico: [], logo: "⚡", imagem: "", descricao: "Principal fornecedora de energia do Império.", sede: "Vértex", fundador: "Marcus Vex", ceoAtual: "Julia Vex", tipoEmpresa: "Pública", valorEmpresa: 890000000000, faturamentoAnual: 310000000000, historia: "Revolucionou o mercado energético.", empresasAfiliadas: [{ nome: "VoltPower", relacao: "Subsidiária" }] },
  { id: "sidera", nome: "Sidera Combinatus", setor: "Mineração", sigla: "SID", preco: 128.90, variacao: 0, historico: [], logo: "⛏️", imagem: "", descricao: "Maior mineradora do Império.", sede: "Ferrogênese", fundador: "Guilda dos Mineiros", ceoAtual: "Thorne Ironhand", tipoEmpresa: "Pública", valorEmpresa: 450000000000, faturamentoAnual: 190000000000, historia: "União de guildas de mineração.", empresasAfiliadas: [] },
  { id: "omnitech", nome: "OmniTech", setor: "Cibernética", sigla: "OMN", preco: 456.75, variacao: 0, historico: [], logo: "🧠", imagem: "", descricao: "Líder em implantes cibernéticos.", sede: "Sensus", fundador: "Dr. Maya Chen", ceoAtual: "Dr. Maya Chen", tipoEmpresa: "Pública", valorEmpresa: 670000000000, faturamentoAnual: 230000000000, historia: "De laboratório a maior empresa de cibernética.", empresasAfiliadas: [] },
  { id: "bioMarin", nome: "BioMarin", setor: "Farmacêutica", sigla: "BIO", preco: 234.50, variacao: 0, historico: [], logo: "🧬", imagem: "", descricao: "Desenvolve medicamentos biotecnológicos.", sede: "Sensus", fundador: "Dr. Elias Marin", ceoAtual: "Dra. Laura Marin", tipoEmpresa: "Pública", valorEmpresa: 320000000000, faturamentoAnual: 110000000000, historia: "De farmácia a maior farmacêutica.", empresasAfiliadas: [] },
  { id: "ferrus", nome: "Ferrus Industries", setor: "Metalurgia", sigla: "FER", preco: 189.30, variacao: 0, historico: [], logo: "🔨", imagem: "", descricao: "Principal metalúrgica do Império.", sede: "Caldeira", fundador: "Casa Ferrus", ceoAtual: "Garon Ferrus", tipoEmpresa: "Privada", valorEmpresa: 280000000000, faturamentoAnual: 95000000000, historia: "Forja metais desde antes do Império.", empresasAfiliadas: [] },
  { id: "aurum", nome: "Banco Central Aurano", setor: "Financeiro", sigla: "BCA", preco: 567.80, variacao: 0, historico: [], logo: "💰", imagem: "", descricao: "Instituição financeira mais poderosa.", sede: "Auraxia", fundador: "Império Aurano", ceoAtual: "Conselho Imperial", tipoEmpresa: "Pública", valorEmpresa: 2000000000000, faturamentoAnual: 700000000000, historia: "Pilar da economia imperial.", empresasAfiliadas: [] },
  { id: "verdearida", nome: "VerdeÁrida", setor: "Agrícola", sigla: "VER", preco: 78.40, variacao: 0, historico: [], logo: "🌾", imagem: "", descricao: "Maior empresa de agricultura.", sede: "Arenna", fundador: "Comunidade Agrícola", ceoAtual: "Rosa Verde", tipoEmpresa: "Pública", valorEmpresa: 150000000000, faturamentoAnual: 60000000000, historia: "De cooperativa a dominar o mercado.", empresasAfiliadas: [] },
  { id: "kael", nome: "Clã Kael (Ferglacius)", setor: "Mineração", sigla: "KAE", preco: 345.20, variacao: 0, historico: [], logo: "❄️", imagem: "", descricao: "Minas de Pyridium de Ferglacius.", sede: "Kaelheim", fundador: "Lorde Kael", ceoAtual: "Jarl Kael", tipoEmpresa: "Privada", valorEmpresa: 400000000000, faturamentoAnual: 140000000000, historia: "Poder e riqueza por gerações.", empresasAfiliadas: [] },
  { id: "hrothgar", nome: "Clã Hrothgar", setor: "Mineração", sigla: "HRO", preco: 298.70, variacao: 0, historico: [], logo: "🔥", imagem: "", descricao: "Forjas e minas vulcânicas.", sede: "Hrothgard", fundador: "Lorde Hrothgar", ceoAtual: "Jarl Hrothgar", tipoEmpresa: "Privada", valorEmpresa: 350000000000, faturamentoAnual: 120000000000, historia: "Mestres na forja de armas.", empresasAfiliadas: [] },
];

function BolsaValores({ userEmail, onClose, fichasMap, isMaster }) {
  const [posicao, setPosicao] = useState({ x: 150, y: 80 });
  const [tamanho, setTamanho] = useState({ width: 900, height: 650 });
  const [minimizado, setMinimizado] = useState(false);
  const [arrastando, setArrastando] = useState(false);
  const [redimensionando, setRedimensionando] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const resizeStartRef = useRef({ x: 0, y: 0, width: 0, height: 0 });
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
  const [emailParaCarteira, setEmailParaCarteira] = useState(userEmail);
  const [modoEdicao, setModoEdicao] = useState(false);
  const [empresaEditando, setEmpresaEditando] = useState(null);
  const [modalEdicaoOpen, setModalEdicaoOpen] = useState(false);
  const [modalDetalhesOpen, setModalDetalhesOpen] = useState(false);
  const [novaEmpresa, setNovaEmpresa] = useState({
    id: "", nome: "", setor: "Tecnologia", sigla: "", preco: 100,
    logo: "🏢", imagem: "", descricao: "", sede: "", fundador: "",
    ceoAtual: "", tipoEmpresa: "Pública", valorEmpresa: 0,
    faturamentoAnual: 0, historia: "", empresasAfiliadas: [],
  });
  // 🟢 Atualização a cada 10 segundos (preço flutua mas sempre volta ao original)
  useEffect(() => {
    const interval = setInterval(async () => {
      setEmpresas(prev => {
        const novas = prev.map(emp => {
          // 🟢 O preco ATUAL é o que flutua
          const precoAtual = emp.precoAtual || emp.preco;
          
          // 🟢 O preco ORIGINAL é o definido pelo Mestre (NUNCA muda)
          const precoOriginal = emp.preco;
          
          // 🟢 Gera um alvo aleatório entre -40% e +40% do ORIGINAL
          const variacaoAlvo = (Math.random() * 2 - 1) * 40;
          const alvo = precoOriginal * (1 + variacaoAlvo / 100);
          
          // 🟢 Puxa o preço atual 30% em direção ao alvo (reversão à média)
          const novoPreco = precoAtual + (alvo - precoAtual) * 0.3;
          
          // 🟢 Limites: nunca abaixo de 20% do original, nunca acima de 180% do original
          const minimo = precoOriginal * 0.20;
          const maximo = precoOriginal * 1.80;
          const precoFinal = Math.min(maximo, Math.max(minimo, novoPreco));
          
          // 🟢 Variação REAL em relação ao original
          const variacaoReal = ((precoFinal - precoOriginal) / precoOriginal) * 100;
          
          const novoHistorico = [...(emp.historico || []), precoFinal];
          if (novoHistorico.length > 50) novoHistorico.shift();
          
          return {
            ...emp,
            precoAtual: Math.round(precoFinal * 100) / 100,
            variacao: Math.round(variacaoReal * 100) / 100,
            historico: novoHistorico,
          };
        });
        
        setDoc(doc(db, "bolsa_valores", "dados"), { empresas: novas }, { merge: true });
        
        return novas;
      });
    }, 10000); // 🟢 A cada 10 segundos
    
    return () => clearInterval(interval);
  }, []);

  // 🟢 Sincronização em tempo real
  useEffect(() => {
    const ref = doc(db, "bolsa_valores", "dados");
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists() && snap.data().empresas) {
        setEmpresas(snap.data().empresas);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const emailAtual = emailParaCarteira || userEmail;
    if (!emailAtual) return;
    const fichaRef = doc(db, "fichas", emailAtual);
    const unsub = onSnapshot(fichaRef, (snap) => {
      if (snap.exists()) {
        const dados = snap.data();
        const carteiras = Array.isArray(dados.carteiras) 
          ? dados.carteiras.reduce((acc, item) => ({ ...acc, [item.nome || 'default']: item.valor || 0 }), {})
          : (dados.carteiras || {});
        setCarteiraJogador(carteiras);
        setAcoesJogador(dados.acoes || {});
      }
    });
    return () => unsub();
  }, [emailParaCarteira, userEmail]);

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

  const salvarDados = async (novasEmpresas) => {
    await setDoc(doc(db, "bolsa_valores", "dados"), { empresas: novasEmpresas }, { merge: true });
  };

  const salvarCarteiraJogador = async (novasAcoes, novasCarteiras) => {
    const fichaRef = doc(db, "fichas", emailParaCarteira || userEmail);
    const atualizacao = {};
    if (novasAcoes) atualizacao.acoes = novasAcoes;
    if (novasCarteiras) atualizacao.carteiras = novasCarteiras;
    await setDoc(fichaRef, atualizacao, { merge: true });
  };

  const comprarAcoes = async () => {
    if (!empresaSelecionada || quantidadeCompra <= 0) return;
    if (!carteiraSelecionada) { alert("Selecione uma carteira!"); return; }
    const valorTotal = (empresaSelecionada.precoAtual || empresaSelecionada.preco) * quantidadeCompra;
    const carteiraAtual = carteiraJogador[carteiraSelecionada] || 0;
    if (carteiraAtual < valorTotal) { alert("Saldo insuficiente!"); return; }
    setLoading(true);
    try {
      const novasCarteiras = { ...carteiraJogador, [carteiraSelecionada]: carteiraAtual - valorTotal };
      const novasAcoes = { ...acoesJogador };
      if (novasAcoes[empresaSelecionada.id]) {
        const acaoAtual = novasAcoes[empresaSelecionada.id];
        const quantidadeAtual = acaoAtual.quantidade || 0;
        const precoMedio = (acaoAtual.precoMedio * quantidadeAtual + (empresaSelecionada.precoAtual || empresaSelecionada.preco) * quantidadeCompra) / (quantidadeAtual + quantidadeCompra);
        novasAcoes[empresaSelecionada.id] = { quantidade: quantidadeAtual + quantidadeCompra, precoMedio, precoAtual: (empresaSelecionada.precoAtual || empresaSelecionada.preco), dataCompra: new Date().toISOString() };
      } else {
        novasAcoes[empresaSelecionada.id] = { quantidade: quantidadeCompra, precoMedio: (empresaSelecionada.precoAtual || empresaSelecionada.preco), precoAtual: (empresaSelecionada.precoAtual || empresaSelecionada.preco), dataCompra: new Date().toISOString() };
      }
      await salvarCarteiraJogador(novasAcoes, novasCarteiras);
      setCarteiraJogador(novasCarteiras);
      setAcoesJogador(novasAcoes);
      setModalCompra(false);
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const venderAcoes = async () => {
    if (!empresaSelecionada || quantidadeVenda <= 0) return;
    const acaoJogador = acoesJogador[empresaSelecionada.id];
    if (!acaoJogador || acaoJogador.quantidade < quantidadeVenda) { alert("Ações insuficientes!"); return; }
    const valorTotal = (empresaSelecionada.precoAtual || empresaSelecionada.preco) * quantidadeVenda;
    setLoading(true);
    try {
      const novasAcoes = { ...acoesJogador };
      const novaQuantidade = acaoJogador.quantidade - quantidadeVenda;
      if (novaQuantidade <= 0) delete novasAcoes[empresaSelecionada.id];
      else novasAcoes[empresaSelecionada.id] = { ...acaoJogador, quantidade: novaQuantidade };
      const carteiraPadrao = Object.keys(carteiraJogador)[0] || "Bolso";
      const novasCarteiras = { ...carteiraJogador, [carteiraPadrao]: (carteiraJogador[carteiraPadrao] || 0) + valorTotal };
      await salvarCarteiraJogador(novasAcoes, novasCarteiras);
      setCarteiraJogador(novasCarteiras);
      setAcoesJogador(novasAcoes);
      setModalVenda(false);
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const calcularRentabilidade = (empresaId) => {
    const acao = acoesJogador[empresaId];
    if (!acao) return null;
    const empresa = empresas.find(e => e.id === empresaId);
    if (!empresa) return null;
    const valorInvestido = acao.precoMedio * acao.quantidade;
    const valorAtual = (empresa.precoAtual || empresa.preco) * acao.quantidade;
    const lucro = valorAtual - valorInvestido;
    const percentual = valorInvestido > 0 ? (lucro / valorInvestido) * 100 : 0;
    return { valorInvestido, valorAtual, lucro, percentual };
  };

  const empresasFiltradas = empresas.filter(emp => {
    const matchSetor = filtroSetor === "todos" || emp.setor === filtroSetor;
    const matchBusca = emp.nome.toLowerCase().includes(busca.toLowerCase()) || emp.sigla.toLowerCase().includes(busca.toLowerCase());
    return matchSetor && matchBusca;
  });

  const setores = ["todos", ...new Set(empresas.map(e => e.setor))];

  // 🟢 Mini gráfico SVG
  const MiniGrafico = ({ historico }) => {
    if (!historico || historico.length < 2) return <Box sx={{ width: 150, height: 30 }} />;
    const dados = historico.slice(-30);
    const max = Math.max(...dados);
    const min = Math.min(...dados);
    const range = max - min || 1;
    const pontos = dados.map((valor, i) => {
      const x = (i / (dados.length - 1)) * 150;
      const y = 25 - ((valor - min) / range) * 25;
      return `${x},${y}`;
    }).join(' ');
    const cor = dados[dados.length - 1] >= dados[0] ? "#22c55e" : "#ef4444";
    
    return (
      <svg width="150" height="30">
        <polyline points={pontos} fill="none" stroke={cor} strokeWidth="1.5" />
      </svg>
    );
  };

  return createPortal(
    <Paper elevation={10} sx={{
      position: "fixed", left: posicao.x, top: posicao.y,
      width: minimizado ? 300 : tamanho.width, height: minimizado ? 48 : tamanho.height,
      bgcolor: "#0f172a", color: "#fff", borderRadius: 2,
      border: "2px solid #fbbf24", zIndex: 9998,
      display: "flex", flexDirection: "column", overflow: "hidden",
      boxShadow: "0 0 30px rgba(251,191,36,0.3), 0 8px 32px rgba(0,0,0,0.8)",
    }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", p: 1, bgcolor: "#1a1a0a", cursor: "move", minHeight: 40, borderBottom: "1px solid #fbbf2444" }}
        onMouseDown={(e) => { if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT') return; e.preventDefault(); setArrastando(true); dragStartRef.current = { x: e.clientX - posicao.x, y: e.clientY - posicao.y }; }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <ShowChartIcon sx={{ color: "#fbbf24" }} />
          <Typography variant="subtitle2" sx={{ color: "#fbbf24", fontWeight: "bold" }}>
            {minimizado ? "📈 Bolsa" : "📈 BOLSA DE VALORES"}
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 0.5 }}>
          {isMaster && (
            <IconButton size="small" onClick={() => setModoEdicao(!modoEdicao)} sx={{ color: modoEdicao ? "#ff9800" : "#fbbf24", p: 0.5 }}>
              <EditIcon fontSize="small" />
            </IconButton>
          )}
          <IconButton size="small" onClick={() => setMinimizado(!minimizado)} sx={{ color: "#fbbf24", p: 0.5 }}>{minimizado ? "□" : "−"}</IconButton>
          <IconButton size="small" onClick={onClose} sx={{ color: "#fbbf24", p: 0.5 }}><CloseIcon fontSize="small" /></IconButton>
        </Box>
      </Box>

      {!minimizado && (
        <Box sx={{ flex: 1, display: "flex", flexDirection: "column", p: 1.5, gap: 1, overflowY: "auto" }}>
          <Box sx={{ display: "flex", gap: 0.5, borderBottom: "1px solid #fbbf2433", pb: 1 }}>
            <Button size="small" onClick={() => setAbaAtiva("mercado")} sx={{ color: abaAtiva === "mercado" ? "#fbbf24" : "#888", fontSize: "0.65rem", bgcolor: abaAtiva === "mercado" ? "#fbbf2422" : "transparent" }}>[MERCADO]</Button>
            <Button size="small" onClick={() => setAbaAtiva("carteira")} sx={{ color: abaAtiva === "carteira" ? "#fbbf24" : "#888", fontSize: "0.65rem", bgcolor: abaAtiva === "carteira" ? "#fbbf2422" : "transparent" }}>[MINHAS AÇÕES]</Button>
          </Box>

          {abaAtiva === "mercado" && (
            <Box>
              <Box sx={{ display: "flex", gap: 1, mb: 1.5, flexWrap: "wrap", alignItems: "center" }}>
                <TextField size="small" placeholder="🔍 Buscar..." value={busca} onChange={(e) => setBusca(e.target.value)}
                  sx={{ flex: 1, minWidth: 150, '& .MuiInputBase-root': { color: '#fff', fontSize: '0.8rem' } }} />
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel sx={{ color: '#94a3b8' }}>Setor</InputLabel>
                  <Select value={filtroSetor} onChange={(e) => setFiltroSetor(e.target.value)} sx={{ color: '#fff', bgcolor: '#1a1a2e' }}>
                    {setores.map(s => <MenuItem key={s} value={s}>{s === "todos" ? "Todos" : s}</MenuItem>)}
                  </Select>
                </FormControl>
                {isMaster && modoEdicao && (
                  <Button size="small" variant="contained" startIcon={<AddIcon />}
                    onClick={() => { setEmpresaEditando(null); setNovaEmpresa({ id: "", nome: "", setor: "Tecnologia", sigla: "", preco: 100, logo: "🏢", imagem: "", descricao: "", sede: "", fundador: "", ceoAtual: "", tipoEmpresa: "Pública", valorEmpresa: 0, faturamentoAnual: 0, historia: "", empresasAfiliadas: [] }); setModalEdicaoOpen(true); }}
                    sx={{ bgcolor: "#22c55e", fontSize: "0.6rem" }}>Nova Empresa</Button>
                )}
              </Box>

              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                {empresasFiltradas.map((emp) => {
                  const variacaoPositiva = emp.variacao >= 0;
                  return (
                    <Paper key={emp.id} onClick={() => { setEmpresaSelecionada(emp); setModalDetalhesOpen(true); }}
                      sx={{ p: 1, bgcolor: "#1a1a2e", border: "1px solid #334155", cursor: "pointer", '&:hover': { borderColor: "#fbbf2466" }, display: "flex", alignItems: "center", gap: 1 }}>
                                            {emp.imagem ? (
                        <Box sx={{ width: 32, height: 32, borderRadius: 1, overflow: 'hidden', flexShrink: 0 }}>
                          <img src={emp.imagem} alt={emp.nome} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </Box>
                      ) : (
                        <Typography sx={{ fontSize: "1.5rem", flexShrink: 0 }}>{emp.logo}</Typography>
                      )}
                      <Box sx={{ minWidth: 120 }}>
                        <Typography variant="body2" sx={{ fontWeight: "bold", color: "#fff", fontSize: "0.75rem" }}>{emp.nome}</Typography>
                        <Typography variant="caption" sx={{ color: "#64748b" }}>{emp.sigla} • {emp.setor}</Typography>
                      </Box>
                      <MiniGrafico historico={emp.historico} />
                      <Box sx={{ textAlign: "right", minWidth: 70 }}>
                        <Typography variant="body2" sx={{ color: "#fbbf24", fontWeight: "bold", fontSize: "0.75rem" }}>💰 {(emp.precoAtual || emp.preco).toFixed(2)}</Typography>
                        <Typography variant="caption" sx={{ color: variacaoPositiva ? "#22c55e" : "#ef4444", fontWeight: "bold" }}>
                          {variacaoPositiva ? "▲" : "▼"} {Math.abs(emp.variacao).toFixed(2)}%
                        </Typography>
                      </Box>
                      <Button size="small" variant="contained" startIcon={<ShoppingCartIcon sx={{ fontSize: 14 }} />}
                        onClick={(e) => { e.stopPropagation(); setEmpresaSelecionada(emp); setQuantidadeCompra(1); setModalCompra(true); }}
                        sx={{ bgcolor: "#22c55e", fontSize: "0.6rem", minWidth: 70 }}>Comprar</Button>
                      {isMaster && modoEdicao && (
                        <Box sx={{ display: "flex", gap: 0.3 }}>
                          <IconButton size="small" onClick={(e) => { e.stopPropagation(); setEmpresaEditando(emp); setNovaEmpresa({ ...emp }); setModalEdicaoOpen(true); }} sx={{ color: "#ff9800", p: 0.3 }}>
                            <EditIcon sx={{ fontSize: 14 }} />
                          </IconButton>
                          <IconButton size="small" onClick={(e) => { e.stopPropagation(); if (window.confirm(`Remover ${emp.nome}?`)) { const novas = empresas.filter(x => x.id !== emp.id); setEmpresas(novas); salvarDados(novas); } }} sx={{ color: "#ef4444", p: 0.3 }}>
                            <DeleteIcon sx={{ fontSize: 14 }} />
                          </IconButton>
                        </Box>
                      )}
                    </Paper>
                  );
                })}
              </Box>
            </Box>
          )}

          {abaAtiva === "carteira" && (
            <Box>
              <Typography variant="subtitle2" sx={{ color: "#fbbf24", mb: 1.5 }}>💰 MINHAS AÇÕES</Typography>
              {Object.keys(acoesJogador).length === 0 ? (
                <Typography sx={{ color: "#64748b", textAlign: "center", py: 4 }}>Nenhuma ação comprada.</Typography>
              ) : (
                Object.entries(acoesJogador).map(([empresaId, acao]) => {
                  const empresa = empresas.find(e => e.id === empresaId);
                  if (!empresa) return null;
                  const rent = calcularRentabilidade(empresaId);
                  return (
                    <Paper key={empresaId} sx={{ p: 1.5, bgcolor: "#1a1a2e", border: "1px solid #334155", mb: 0.5 }}>
                      <Typography variant="body2" sx={{ color: "#fff", fontWeight: "bold" }}>{empresa.nome}</Typography>
                      <Typography variant="caption" sx={{ color: "#94a3b8" }}>📦 {acao.quantidade} ações • Preço médio: 💰 {acao.precoMedio.toFixed(2)}</Typography>
                      {acao.dataCompra && (
                        <Typography variant="caption" sx={{ color: "#64748b", display: "block" }}>
                          📅 Comprado: {new Date(acao.dataCompra).toLocaleDateString('pt-BR')}
                        </Typography>
                      )}
                      {rent && (
                        <Typography variant="caption" sx={{ color: rent.percentual >= 0 ? "#22c55e" : "#ef4444" }}>
                          {rent.percentual >= 0 ? "📈" : "📉"} {Math.abs(rent.percentual).toFixed(2)}%
                        </Typography>
                      )}
                      <Button size="small" variant="contained" startIcon={<SellIcon sx={{ fontSize: 14 }} />}
                        onClick={() => { setEmpresaSelecionada(empresa); setQuantidadeVenda(1); setModalVenda(true); }}
                        sx={{ bgcolor: "#ef4444", fontSize: "0.6rem", mt: 0.5 }}>Vender</Button>
                    </Paper>
                  );
                })
              )}
            </Box>
          )}
        </Box>
      )}

      {!minimizado && (
        <Box sx={{ position: "absolute", bottom: 0, right: 0, width: 16, height: 16, cursor: "nwse-resize", zIndex: 10 }}
          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setRedimensionando(true); resizeStartRef.current = { x: e.clientX, y: e.clientY, width: tamanho.width, height: tamanho.height }; }} />
      )}

      {/* MODAL DE DETALHES */}
      <Dialog open={modalDetalhesOpen} onClose={() => setModalDetalhesOpen(false)} maxWidth="md" fullWidth
        PaperProps={{ sx: { bgcolor: "#0f172a", border: "2px solid #fbbf24", borderRadius: 2, maxHeight: "90vh" } }}>
        {empresaSelecionada && (
          <>
            <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1, bgcolor: "#1a1a0a", borderBottom: "1px solid #fbbf2444" }}>
              {empresaSelecionada.imagem ? (
                <Box sx={{ width: 48, height: 48, borderRadius: 1, overflow: 'hidden', flexShrink: 0 }}>
                  <img src={empresaSelecionada.imagem} alt={empresaSelecionada.nome} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </Box>
              ) : (
                <Typography sx={{ fontSize: "2rem", flexShrink: 0 }}>{empresaSelecionada.logo}</Typography>
              )}
              <Box sx={{ flex: 1 }}>
                <Typography sx={{ color: "#fbbf24", fontWeight: "bold", fontSize: "1.2rem" }}>{empresaSelecionada.nome}</Typography>
                <Typography variant="caption" sx={{ color: "#94a3b8" }}>{empresaSelecionada.sigla} • {empresaSelecionada.setor}</Typography>
              </Box>
              <IconButton onClick={() => setModalDetalhesOpen(false)} sx={{ color: "#94a3b8" }}><CloseIcon /></IconButton>
            </DialogTitle>
            <DialogContent sx={{ p: 2, overflowY: "auto" }}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" sx={{ color: "#fbbf24", mb: 0.5 }}>📊 Informações</Typography>
                  <Typography variant="body2" sx={{ color: "#fff" }}>💰 Preço: <strong>{(empresaSelecionada.precoAtual || empresaSelecionada.preco).toFixed(2)}</strong></Typography>
                  <Typography variant="body2" sx={{ color: "#fff" }}>🏙️ Sede: <strong>{empresaSelecionada.sede || "—"}</strong></Typography>
                  <Typography variant="body2" sx={{ color: "#fff" }}>👤 Fundador: <strong>{empresaSelecionada.fundador || "—"}</strong></Typography>
                  <Typography variant="body2" sx={{ color: "#fff" }}>👔 CEO: <strong>{empresaSelecionada.ceoAtual || "—"}</strong></Typography>
                  <Typography variant="body2" sx={{ color: "#fff" }}>🏢 Tipo: <strong>{empresaSelecionada.tipoEmpresa || "—"}</strong></Typography>
                  <Typography variant="body2" sx={{ color: "#fff" }}>💎 Valor: <strong>{empresaSelecionada.valorEmpresa ? empresaSelecionada.valorEmpresa.toLocaleString('pt-BR') : "—"}</strong></Typography>
                  <Typography variant="body2" sx={{ color: "#fff" }}>📈 Faturamento: <strong>{empresaSelecionada.faturamentoAnual ? empresaSelecionada.faturamentoAnual.toLocaleString('pt-BR') : "—"}</strong></Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" sx={{ color: "#fbbf24", mb: 0.5 }}>📝 Descrição</Typography>
                  <Typography variant="body2" sx={{ color: "#94a3b8" }}>{empresaSelecionada.descricao || "Sem descrição."}</Typography>
                  <Divider sx={{ my: 1, bgcolor: "#fbbf2433" }} />
                  <Typography variant="subtitle2" sx={{ color: "#fbbf24", mb: 0.5 }}>📜 História</Typography>
                  <Typography variant="body2" sx={{ color: "#94a3b8" }}>{empresaSelecionada.historia || "Sem história."}</Typography>
                </Grid>
                {empresaSelecionada.empresasAfiliadas && empresaSelecionada.empresasAfiliadas.length > 0 && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" sx={{ color: "#fbbf24", mb: 0.5 }}>🔗 Afiliadas</Typography>
                    {empresaSelecionada.empresasAfiliadas.map((af, i) => (
                      <Chip key={i} label={`${af.nome} (${af.relacao})`} size="small" sx={{ bgcolor: "#fbbf2422", color: "#fbbf24", mr: 0.5, mb: 0.5 }} />
                    ))}
                  </Grid>
                )}
              </Grid>
            </DialogContent>
            <DialogActions sx={{ borderTop: "1px solid #fbbf2433" }}>
              <Button size="small" startIcon={<ShoppingCartIcon />} onClick={() => { setModalDetalhesOpen(false); setQuantidadeCompra(1); setModalCompra(true); }}
                sx={{ bgcolor: "#22c55e", color: "#fff", fontSize: "0.7rem" }}>Comprar</Button>
              <Button onClick={() => setModalDetalhesOpen(false)} sx={{ color: "#94a3b8" }}>Fechar</Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* MODAL DE COMPRA */}
      <Dialog open={modalCompra} onClose={() => setModalCompra(false)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { bgcolor: "#0f172a", border: "1px solid #1e293b" } }}>
        <DialogTitle sx={{ color: '#fbbf24' }}>📈 Comprar Ações</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            {empresaSelecionada && (
              <>
                <Typography sx={{ color: '#fff' }}>{empresaSelecionada.nome} ({empresaSelecionada.sigla})</Typography>
                <Typography sx={{ color: '#94a3b8' }}>Preço: <strong style={{ color: '#fbbf24' }}>💰 {(empresaSelecionada.precoAtual || empresaSelecionada.preco).toFixed(2)}</strong></Typography>
                <FormControl fullWidth size="small">
                  <InputLabel sx={{ color: '#94a3b8' }}>Carteira</InputLabel>
                  <Select value={carteiraSelecionada} onChange={(e) => setCarteiraSelecionada(e.target.value)} sx={{ color: '#fff', bgcolor: '#1a1a2e' }}>
                    {Object.entries(carteiraJogador).map(([nome, valor]) => (
                      <MenuItem key={nome} value={nome}>{nome}: 💰 {valor.toFixed(2)}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <TextField label="Quantidade" type="number" size="small" value={quantidadeCompra}
                  onChange={(e) => setQuantidadeCompra(Math.max(1, Number(e.target.value) || 1))}
                  InputProps={{ sx: { color: '#fff' } }} />
                <Typography sx={{ color: '#94a3b8' }}>Total: <strong style={{ color: '#fbbf24' }}>💰 {((empresaSelecionada.precoAtual || empresaSelecionada.preco) * quantidadeCompra).toFixed(2)}</strong></Typography>
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModalCompra(false)} sx={{ color: '#94a3b8' }}>Cancelar</Button>
          <Button variant="contained" onClick={comprarAcoes} sx={{ bgcolor: '#22c55e' }}>Comprar</Button>
        </DialogActions>
      </Dialog>

      {/* MODAL DE VENDA */}
      <Dialog open={modalVenda} onClose={() => setModalVenda(false)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { bgcolor: "#0f172a", border: "1px solid #1e293b" } }}>
        <DialogTitle sx={{ color: '#ef4444' }}>📉 Vender Ações</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            {empresaSelecionada && (
              <>
                <Typography sx={{ color: '#fff' }}>{empresaSelecionada.nome} ({empresaSelecionada.sigla})</Typography>
                <Typography sx={{ color: '#94a3b8' }}>Você tem: <strong>{acoesJogador[empresaSelecionada.id]?.quantidade || 0} ações</strong></Typography>
                <TextField label="Quantidade" type="number" size="small" value={quantidadeVenda}
                  onChange={(e) => setQuantidadeVenda(Math.min(acoesJogador[empresaSelecionada.id]?.quantidade || 0, Math.max(1, Number(e.target.value) || 1)))}
                  InputProps={{ sx: { color: '#fff' } }} />
                <Typography sx={{ color: '#94a3b8' }}>Total: <strong style={{ color: '#fbbf24' }}>💰 {((empresaSelecionada.precoAtual || empresaSelecionada.preco) * quantidadeVenda).toFixed(2)}</strong></Typography>
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModalVenda(false)} sx={{ color: '#94a3b8' }}>Cancelar</Button>
          <Button variant="contained" onClick={venderAcoes} sx={{ bgcolor: '#ef4444' }}>Vender</Button>
        </DialogActions>
      </Dialog>

      {/* MODAL DE EDIÇÃO */}
      <Dialog open={modalEdicaoOpen} onClose={() => setModalEdicaoOpen(false)} maxWidth="md" fullWidth
        PaperProps={{ sx: { bgcolor: "#0f172a", border: "1px solid #1e293b", maxHeight: "90vh" } }}>
        <DialogTitle sx={{ color: '#fbbf24' }}>{empresaEditando ? "✏️ Editar Empresa" : "➕ Nova Empresa"}</DialogTitle>
        <DialogContent sx={{ overflowY: "auto" }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
            <TextField label="Nome" fullWidth size="small" value={novaEmpresa.nome} onChange={(e) => setNovaEmpresa({ ...novaEmpresa, nome: e.target.value })} InputProps={{ sx: { color: '#fff' } }} InputLabelProps={{ sx: { color: '#94a3b8' } }} />
            <TextField label="Sigla" fullWidth size="small" value={novaEmpresa.sigla} onChange={(e) => setNovaEmpresa({ ...novaEmpresa, sigla: e.target.value.toUpperCase() })} InputProps={{ sx: { color: '#fff' } }} InputLabelProps={{ sx: { color: '#94a3b8' } }} />
            <FormControl fullWidth size="small">
              <InputLabel sx={{ color: '#94a3b8' }}>Setor</InputLabel>
              <Select value={novaEmpresa.setor} onChange={(e) => setNovaEmpresa({ ...novaEmpresa, setor: e.target.value })} sx={{ color: '#fff' }}>
                {["Tecnologia", "Energia", "Mineração", "Cibernética", "Farmacêutica", "Metalurgia", "Financeiro", "Agrícola"].map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField label="Preço Inicial" type="number" fullWidth size="small" value={novaEmpresa.preco} onChange={(e) => setNovaEmpresa({ ...novaEmpresa, preco: Math.max(0.01, Number(e.target.value) || 0) })} InputProps={{ sx: { color: '#fff' } }} InputLabelProps={{ sx: { color: '#94a3b8' } }} />
            <TextField label="Emoji/Logo" fullWidth size="small" value={novaEmpresa.logo} onChange={(e) => setNovaEmpresa({ ...novaEmpresa, logo: e.target.value })} InputProps={{ sx: { color: '#fff' } }} InputLabelProps={{ sx: { color: '#94a3b8' } }} />
            <TextField label="URL da Imagem (opcional - imgbb)" fullWidth size="small" value={novaEmpresa.imagem} onChange={(e) => setNovaEmpresa({ ...novaEmpresa, imagem: e.target.value })} InputProps={{ sx: { color: '#fff' } }} InputLabelProps={{ sx: { color: '#94a3b8' } }} helperText="Cole a URL direta da imagem (ex: https://i.ibb.co/...)" FormHelperTextProps={{ sx: { color: '#64748b' } }} />
            <TextField label="Descrição" fullWidth multiline rows={2} size="small" value={novaEmpresa.descricao} onChange={(e) => setNovaEmpresa({ ...novaEmpresa, descricao: e.target.value })} InputProps={{ sx: { color: '#fff' } }} InputLabelProps={{ sx: { color: '#94a3b8' } }} />
            <TextField label="Sede" fullWidth size="small" value={novaEmpresa.sede} onChange={(e) => setNovaEmpresa({ ...novaEmpresa, sede: e.target.value })} InputProps={{ sx: { color: '#fff' } }} InputLabelProps={{ sx: { color: '#94a3b8' } }} />
            <TextField label="Fundador" fullWidth size="small" value={novaEmpresa.fundador} onChange={(e) => setNovaEmpresa({ ...novaEmpresa, fundador: e.target.value })} InputProps={{ sx: { color: '#fff' } }} InputLabelProps={{ sx: { color: '#94a3b8' } }} />
            <TextField label="CEO Atual" fullWidth size="small" value={novaEmpresa.ceoAtual} onChange={(e) => setNovaEmpresa({ ...novaEmpresa, ceoAtual: e.target.value })} InputProps={{ sx: { color: '#fff' } }} InputLabelProps={{ sx: { color: '#94a3b8' } }} />
            <FormControl fullWidth size="small">
              <InputLabel sx={{ color: '#94a3b8' }}>Tipo</InputLabel>
              <Select value={novaEmpresa.tipoEmpresa} onChange={(e) => setNovaEmpresa({ ...novaEmpresa, tipoEmpresa: e.target.value })} sx={{ color: '#fff' }}>
                <MenuItem value="Pública">Pública</MenuItem>
                <MenuItem value="Privada">Privada</MenuItem>
              </Select>
            </FormControl>
            <TextField label="Valor da Empresa (numeral)" type="number" fullWidth size="small" value={novaEmpresa.valorEmpresa} onChange={(e) => setNovaEmpresa({ ...novaEmpresa, valorEmpresa: Number(e.target.value) || 0 })} InputProps={{ sx: { color: '#fff' } }} InputLabelProps={{ sx: { color: '#94a3b8' } }} />
            <TextField label="Faturamento Anual (numeral)" type="number" fullWidth size="small" value={novaEmpresa.faturamentoAnual} onChange={(e) => setNovaEmpresa({ ...novaEmpresa, faturamentoAnual: Number(e.target.value) || 0 })} InputProps={{ sx: { color: '#fff' } }} InputLabelProps={{ sx: { color: '#94a3b8' } }} />
            <TextField label="História" fullWidth multiline rows={2} size="small" value={novaEmpresa.historia} onChange={(e) => setNovaEmpresa({ ...novaEmpresa, historia: e.target.value })} InputProps={{ sx: { color: '#fff' } }} InputLabelProps={{ sx: { color: '#94a3b8' } }} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModalEdicaoOpen(false)} sx={{ color: '#94a3b8' }}>Cancelar</Button>
          <Button variant="contained" onClick={() => {
            if (!novaEmpresa.nome.trim() || !novaEmpresa.sigla.trim()) { alert("Preencha nome e sigla!"); return; }
            let novasEmpresas;
            if (empresaEditando) {
              novasEmpresas = empresas.map(e => e.id === empresaEditando.id ? { ...novaEmpresa, id: e.id, variacao: e.variacao, historico: e.historico } : e);
            } else {
              const id = novaEmpresa.nome.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now();
              novasEmpresas = [...empresas, { ...novaEmpresa, id, variacao: 0, historico: [novaEmpresa.preco] }];
            }
            setEmpresas(novasEmpresas);
            salvarDados(novasEmpresas);
            setModalEdicaoOpen(false);
          }} sx={{ bgcolor: '#22c55e' }}>{empresaEditando ? "Salvar" : "Adicionar"}</Button>
        </DialogActions>
      </Dialog>
    </Paper>,
    document.body
  );
}

export default React.memo(BolsaValores);
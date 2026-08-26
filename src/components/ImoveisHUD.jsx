import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Chip,
  Divider,
  Card,
  CardContent,
  CardActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Badge,
  Tooltip,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import HomeIcon from "@mui/icons-material/Home";
import BusinessIcon from "@mui/icons-material/Business";
import SearchIcon from "@mui/icons-material/Search";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import SellIcon from "@mui/icons-material/Sell";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import { db } from "../firebaseConfig";
import { doc, getDoc, setDoc, onSnapshot, updateDoc } from "firebase/firestore";

// ==================== CORES DE AURA ====================
const CORES_AURA = {
  "Titã": "#ff3b3b",
  "Alquimista": "#00e0ff",
  "Artesão": "#ffd700",
  "Fundador": "#00ff88",
  "Déspota": "#a855f7",
  "Ás": "#e5e5e5",
};

// ==================== IMÓVEIS INICIAIS ====================
const IMOVEIS_INICIAIS = [
  {
    id: "casa_auraxia_1",
    nome: "Mansão Imperial",
    descricao: "Imponente mansão no coração de Auraxia, com vista para a Torre Hollow.",
    cidade: "Auraxia",
    pais: "Império Aurano",
    tipo: "Casa",
    metrosQuadrados: 450,
    quartos: 5,
    banheiros: 4,
    precoVenda: 850000,
    precoAluguel: 3500,
    disponivel: true,
    imagem: "",
    dono: null,
    dataCompra: null,
    status: "disponivel",
  },
  {
    id: "apto_nexa_1",
    nome: "Apartamento Nexa Tower",
    descricao: "Apartamento moderno no 45º andar, com vista panorâmica da cidade.",
    cidade: "Nexa",
    pais: "Império Aurano",
    tipo: "Apartamento",
    metrosQuadrados: 180,
    quartos: 2,
    banheiros: 2,
    precoVenda: 320000,
    precoAluguel: 1500,
    disponivel: true,
    imagem: "",
    dono: null,
    dataCompra: null,
    status: "disponivel",
  },
  {
    id: "casa_laxeado_1",
    nome: "Casa do Vale",
    descricao: "Casa térrea em Laxeado, com jardim e vista para as montanhas.",
    cidade: "Laxeado",
    pais: "Império Aurano",
    tipo: "Casa",
    metrosQuadrados: 280,
    quartos: 3,
    banheiros: 2,
    precoVenda: 210000,
    precoAluguel: 900,
    disponivel: true,
    imagem: "",
    dono: null,
    dataCompra: null,
    status: "disponivel",
  },
  {
    id: "loja_sideris_1",
    nome: "Galpão Comercial Sideris",
    descricao: "Galpão comercial próximo ao centro de Sideris, ideal para negócios.",
    cidade: "Sideris",
    pais: "Império Aurano",
    tipo: "Comercial",
    metrosQuadrados: 600,
    quartos: 0,
    banheiros: 2,
    precoVenda: 450000,
    precoAluguel: 2200,
    disponivel: true,
    imagem: "",
    dono: null,
    dataCompra: null,
    status: "disponivel",
  },
];

// ==================== COMPONENTE PRINCIPAL ====================
function ImoveisHUD({ userEmail, onClose, fichasMap, isMaster }) {
  // ===== ESTADOS DA JANELA =====
  const [minimizado, setMinimizado] = useState(false);

  // ===== ESTADOS DOS IMÓVEIS =====
  const [imoveis, setImoveis] = useState(IMOVEIS_INICIAIS);
  const [imoveisJogador, setImoveisJogador] = useState([]);
  const [abaAtiva, setAbaAtiva] = useState("comprar");
  const [busca, setBusca] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [filtroCidade, setFiltroCidade] = useState("todos");
  const [filtroPais, setFiltroPais] = useState("todos");
  const [filtroStatus, setFiltroStatus] = useState("todos");

  // ===== ESTADOS DE EDIÇÃO =====
  const [modoEdicao, setModoEdicao] = useState(false);
  const [imovelEditando, setImovelEditando] = useState(null);
  const [modalEdicaoOpen, setModalEdicaoOpen] = useState(false);
  const [novoImovel, setNovoImovel] = useState({
    nome: "",
    descricao: "",
    cidade: "",
    pais: "Império Aurano",
    tipo: "Casa",
    metrosQuadrados: 100,
    quartos: 1,
    banheiros: 1,
    precoVenda: 100000,
    precoAluguel: 500,
    imagem: "",
  });

  // ===== ESTADOS DE COMPRA/VENDA =====
  const [imovelSelecionado, setImovelSelecionado] = useState(null);
  const [modalCompraOpen, setModalCompraOpen] = useState(false);
  const [modalVendaOpen, setModalVendaOpen] = useState(false);
  const [carteiraSelecionada, setCarteiraSelecionada] = useState("");
  const [carteiraJogador, setCarteiraJogador] = useState({});
  const [emailParaCarteira, setEmailParaCarteira] = useState(userEmail);
  const [loading, setLoading] = useState(false);

  // ===== CARREGAR DADOS DO FIRESTORE =====
  useEffect(() => {
    const ref = doc(db, "imoveis", "dados");
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        const dados = snap.data();
        if (dados.imoveis) {
          setImoveis(dados.imoveis);
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
      return;
    }
    const fichaRef = doc(db, "fichas", emailAtual);
    const unsub = onSnapshot(fichaRef, (snap) => {
      if (snap.exists()) {
        const dados = snap.data();
        const carteiras = dados.carteiras || {};
        const carteirasObj = Array.isArray(carteiras)
          ? carteiras.reduce((acc, item) => ({ ...acc, [item.nome || 'default']: item.valor || 0 }), {})
          : carteiras;
        setCarteiraJogador(carteirasObj);
        
        const imoveisDoJogador = dados.imoveis || [];
        setImoveisJogador(imoveisDoJogador);
      }
    });
    return () => unsub();
  }, [emailParaCarteira, userEmail]);

  // ===== OUVIR EMAIL SELECIONADO NO CHAT =====
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

  // ===== SALVAR DADOS =====
  const salvarDados = async (novosImoveis) => {
    await setDoc(doc(db, "imoveis", "dados"), {
      imoveis: novosImoveis || imoveis,
    }, { merge: true });
  };

  // ===== SALVAR CARTEIRA DO JOGADOR =====
  const salvarCarteiraJogador = async (novasCarteiras, novosImoveis) => {
    const fichaRef = doc(db, "fichas", emailParaCarteira || userEmail);
    const atualizacao = {};
    if (novasCarteiras) atualizacao.carteiras = novasCarteiras;
    if (novosImoveis) atualizacao.imoveis = novosImoveis;
    await setDoc(fichaRef, atualizacao, { merge: true });
  };

  // ===== COMPRAR IMÓVEL =====
  const comprarImovel = async () => {
    if (!imovelSelecionado || !carteiraSelecionada) {
      alert("Selecione um imóvel e uma carteira!");
      return;
    }

    const valorTotal = imovelSelecionado.precoVenda;
    const carteiraAtual = carteiraJogador[carteiraSelecionada] || 0;

    if (carteiraAtual < valorTotal) {
      alert(`Saldo insuficiente! Você precisa de ${valorTotal.toFixed(2)} 💰, mas tem ${carteiraAtual.toFixed(2)} 💰`);
      return;
    }

    setLoading(true);

    try {
      const novasCarteiras = {
        ...carteiraJogador,
        [carteiraSelecionada]: carteiraAtual - valorTotal,
      };

      const imovelParaAdicionar = {
        ...imovelSelecionado,
        dono: emailParaCarteira || userEmail,
        dataCompra: new Date().toISOString(),
        status: "ocupado",
        valorCompra: valorTotal,
      };
      delete imovelParaAdicionar.disponivel;

      const novosImoveisJogador = [...imoveisJogador, imovelParaAdicionar];
      setImoveisJogador(novosImoveisJogador);

      const imoveisDisponiveis = imoveis.filter(i => i.id !== imovelSelecionado.id);
      setImoveis(imoveisDisponiveis);

      await salvarCarteiraJogador(novasCarteiras, novosImoveisJogador);
      await salvarDados(imoveisDisponiveis);

      setCarteiraJogador(novasCarteiras);
      alert(`✅ Compra realizada!\n${imovelSelecionado.nome} por ${valorTotal.toFixed(2)} 💰`);
      setModalCompraOpen(false);
      setImovelSelecionado(null);
    } catch (error) {
      console.error("Erro na compra:", error);
      alert("Erro ao realizar compra.");
    } finally {
      setLoading(false);
    }
  };

  // ===== VENDER IMÓVEL =====
  const venderImovel = async () => {
    if (!imovelSelecionado) return;

    const valorVenda = Math.round(imovelSelecionado.valorCompra * 0.85);
    const carteiraPadrao = Object.keys(carteiraJogador)[0] || "Bolso";

    setLoading(true);

    try {
      const novasCarteiras = {
        ...carteiraJogador,
        [carteiraPadrao]: (carteiraJogador[carteiraPadrao] || 0) + valorVenda,
      };

      const novosImoveisJogador = imoveisJogador.filter(i => i.id !== imovelSelecionado.id);
      setImoveisJogador(novosImoveisJogador);

      const imovelParaMercado = {
        ...imovelSelecionado,
        dono: null,
        dataCompra: null,
        status: "disponivel",
        disponivel: true,
      };
      delete imovelParaMercado.valorCompra;

      const imoveisDisponiveis = [...imoveis, imovelParaMercado];
      setImoveis(imoveisDisponiveis);

      await salvarCarteiraJogador(novasCarteiras, novosImoveisJogador);
      await salvarDados(imoveisDisponiveis);

      setCarteiraJogador(novasCarteiras);
      alert(`✅ Venda realizada!\n${imovelSelecionado.nome} por ${valorVenda.toFixed(2)} 💰`);
      setModalVendaOpen(false);
      setImovelSelecionado(null);
    } catch (error) {
      console.error("Erro na venda:", error);
      alert("Erro ao realizar venda.");
    } finally {
      setLoading(false);
    }
  };

  // ===== CRUD DE IMÓVEIS (MESTRE) =====
  const salvarImovel = async () => {
    if (!novoImovel.nome.trim() || !novoImovel.cidade.trim()) {
      alert("Preencha nome e cidade!");
      return;
    }

    if (imovelEditando) {
      const novosImoveis = imoveis.map(i =>
        i.id === imovelEditando.id ? { ...novoImovel, id: i.id } : i
      );
      setImoveis(novosImoveis);
      await salvarDados(novosImoveis);
    } else {
      const id = `${novoImovel.nome.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`;
      const imovelCompleto = {
        ...novoImovel,
        id,
        disponivel: true,
        dono: null,
        dataCompra: null,
        status: "disponivel",
      };
      const novosImoveis = [...imoveis, imovelCompleto];
      setImoveis(novosImoveis);
      await salvarDados(novosImoveis);
    }

    setModalEdicaoOpen(false);
    setImovelEditando(null);
    setNovoImovel({
      nome: "",
      descricao: "",
      cidade: "",
      pais: "Império Aurano",
      tipo: "Casa",
      metrosQuadrados: 100,
      quartos: 1,
      banheiros: 1,
      precoVenda: 100000,
      precoAluguel: 500,
      imagem: "",
    });
  };

  const deletarImovel = async (id) => {
    if (!window.confirm("Remover este imóvel?")) return;
    const novosImoveis = imoveis.filter(i => i.id !== id);
    setImoveis(novosImoveis);
    await salvarDados(novosImoveis);
  };

  // ===== FILTROS =====
  const cidades = [...new Set(imoveis.map(i => i.cidade))];
  const paises = [...new Set(imoveis.map(i => i.pais))];
  const tipos = [...new Set(imoveis.map(i => i.tipo))];

  const imoveisFiltrados = imoveis.filter(i => {
    const matchBusca = i.nome.toLowerCase().includes(busca.toLowerCase()) ||
                       i.cidade.toLowerCase().includes(busca.toLowerCase()) ||
                       i.pais.toLowerCase().includes(busca.toLowerCase());
    const matchTipo = filtroTipo === "todos" || i.tipo === filtroTipo;
    const matchCidade = filtroCidade === "todos" || i.cidade === filtroCidade;
    const matchPais = filtroPais === "todos" || i.pais === filtroPais;
    return matchBusca && matchTipo && matchCidade && matchPais;
  });

  // ===== CALCULAR TOTAL DA CARTEIRA =====
  const totalCarteira = Object.values(carteiraJogador).reduce((a, b) => a + (typeof b === 'number' ? b : 0), 0);

  // ===== RENDER =====
  return (
    <Box
      sx={{
        width: "100%",
        height: "100%",
        position: "relative",
        bgcolor: "#0a0a0a",
        color: "#fff",
        fontFamily: "'Courier New', monospace",
      }}
    >
      {/* BARRA DE TÍTULO INTERNA (sem arrastar) */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          p: 1,
          bgcolor: "#0a1628",
          minHeight: 40,
          borderBottom: "1px solid #3b82f644",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <HomeIcon sx={{ color: "#3b82f6" }} />
          <Typography variant="subtitle2" sx={{ color: "#3b82f6", fontWeight: "bold" }}>
            🏠 IMÓVEIS
          </Typography>
          <Chip
            label={`💰 ${totalCarteira.toFixed(2)}`}
            size="small"
            sx={{ bgcolor: "#fbbf2422", color: "#fbbf24", fontSize: "0.6rem", height: 20 }}
          />
        </Box>
        <Box sx={{ display: "flex", gap: 0.5 }}>
          {isMaster && (
            <IconButton
              size="small"
              onClick={() => setModoEdicao(!modoEdicao)}
              sx={{ color: modoEdicao ? "#ff9800" : "#3b82f6", p: 0.5 }}
              title={modoEdicao ? "Sair do modo edição" : "Editar imóveis"}
            >
              <EditIcon fontSize="small" />
            </IconButton>
          )}
          <IconButton size="small" onClick={onClose} sx={{ color: "#3b82f6", p: 0.5 }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      {/* CONTEÚDO */}
      <Box sx={{ flex: 1, display: "flex", flexDirection: "column", p: 1.5, gap: 1, overflowY: "auto", height: "calc(100% - 56px)", "&::-webkit-scrollbar": { width: "3px" }, "&::-webkit-scrollbar-thumb": { background: "#3b82f644", borderRadius: "10px" } }}>
        
        {/* ABAS */}
        <Box sx={{ display: "flex", gap: 0.5, borderBottom: "1px solid #3b82f633", pb: 1, flexWrap: "wrap" }}>
          <Button size="small" onClick={() => setAbaAtiva("comprar")}
            sx={{ color: abaAtiva === "comprar" ? "#3b82f6" : "#888", fontSize: "0.65rem", bgcolor: abaAtiva === "comprar" ? "#3b82f622" : "transparent" }}>
            [COMPRAR]
          </Button>
          <Button size="small" onClick={() => setAbaAtiva("meus_bens")}
            sx={{ color: abaAtiva === "meus_bens" ? "#3b82f6" : "#888", fontSize: "0.65rem", bgcolor: abaAtiva === "meus_bens" ? "#3b82f622" : "transparent" }}>
            [MEUS BENS]
          </Button>
        </Box>

        {/* ABA COMPRAR */}
        {abaAtiva === "comprar" && (
          <Box>
            {/* Barra de pesquisa e filtros */}
            <Box sx={{ display: "flex", gap: 1, mb: 1.5, flexWrap: "wrap", alignItems: "center" }}>
              <TextField
                size="small"
                placeholder="🔍 Buscar imóvel, cidade ou país..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                sx={{ flex: 1, minWidth: 150, '& .MuiInputBase-root': { color: '#fff', fontSize: '0.8rem' } }}
                InputProps={{ sx: { bgcolor: '#1a1a1a' } }}
              />
              <FormControl size="small" sx={{ minWidth: 100 }}>
                <InputLabel sx={{ color: '#94a3b8' }}>Tipo</InputLabel>
                <Select
                  value={filtroTipo}
                  onChange={(e) => setFiltroTipo(e.target.value)}
                  sx={{ color: '#fff', bgcolor: '#1a1a1a' }}
                >
                  <MenuItem value="todos">Todos</MenuItem>
                  {tipos.map(t => (
                    <MenuItem key={t} value={t}>{t}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 100 }}>
                <InputLabel sx={{ color: '#94a3b8' }}>Cidade</InputLabel>
                <Select
                  value={filtroCidade}
                  onChange={(e) => setFiltroCidade(e.target.value)}
                  sx={{ color: '#fff', bgcolor: '#1a1a1a' }}
                >
                  <MenuItem value="todos">Todas</MenuItem>
                  {cidades.map(c => (
                    <MenuItem key={c} value={c}>{c}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 100 }}>
                <InputLabel sx={{ color: '#94a3b8' }}>País</InputLabel>
                <Select
                  value={filtroPais}
                  onChange={(e) => setFiltroPais(e.target.value)}
                  sx={{ color: '#fff', bgcolor: '#1a1a1a' }}
                >
                  <MenuItem value="todos">Todos</MenuItem>
                  {paises.map(p => (
                    <MenuItem key={p} value={p}>{p}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              {isMaster && modoEdicao && (
                <Button
                  size="small"
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => {
                    setImovelEditando(null);
                    setNovoImovel({
                      nome: "",
                      descricao: "",
                      cidade: "",
                      pais: "Império Aurano",
                      tipo: "Casa",
                      metrosQuadrados: 100,
                      quartos: 1,
                      banheiros: 1,
                      precoVenda: 100000,
                      precoAluguel: 500,
                      imagem: "",
                    });
                    setModalEdicaoOpen(true);
                  }}
                  sx={{ bgcolor: "#22c55e", '&:hover': { bgcolor: "#16a34a" }, fontSize: "0.6rem" }}
                >
                  + Imóvel
                </Button>
              )}
            </Box>

            {/* Lista de imóveis */}
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
              {imoveisFiltrados.map((imovel) => (
                <Paper
                  key={imovel.id}
                  sx={{
                    p: 1.5,
                    bgcolor: "#1a1a1a",
                    border: "1px solid #333",
                    '&:hover': { borderColor: "#3b82f666" },
                    display: "flex",
                    gap: 1.5,
                    flexWrap: "wrap",
                  }}
                >
                  {/* Imagem ou placeholder */}
                  <Box sx={{ width: 120, height: 90, flexShrink: 0, borderRadius: 1, overflow: 'hidden', bgcolor: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {imovel.imagem ? (
                      <img src={imovel.imagem} alt={imovel.nome} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <Typography sx={{ fontSize: '2rem', opacity: 0.3 }}>🏠</Typography>
                    )}
                  </Box>

                  {/* Informações */}
                  <Box sx={{ flex: 1, minWidth: 150 }}>
                    <Typography variant="body2" sx={{ fontWeight: "bold", color: "#fff" }}>
                      {imovel.nome}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "#64748b", display: "block" }}>
                      {imovel.cidade}, {imovel.pais} • {imovel.tipo}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "#64748b" }}>
                      {imovel.metrosQuadrados}m² • {imovel.quartos} quartos • {imovel.banheiros} banheiros
                    </Typography>
                  </Box>

                  {/* Preços e ações */}
                  <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-end", justifyContent: "space-between", gap: 0.5 }}>
                    <Box sx={{ textAlign: "right" }}>
                      <Typography variant="body2" sx={{ color: "#fbbf24", fontWeight: "bold" }}>
                        💰 {imovel.precoVenda.toFixed(2)}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "#64748b" }}>
                        Aluguel: {imovel.precoAluguel}/mês
                      </Typography>
                    </Box>
                    <Box sx={{ display: "flex", gap: 0.5 }}>
                      <Button
                        size="small"
                        variant="contained"
                        startIcon={<ShoppingCartIcon sx={{ fontSize: 14 }} />}
                        onClick={() => {
                          setImovelSelecionado(imovel);
                          setModalCompraOpen(true);
                        }}
                        sx={{ bgcolor: "#22c55e", '&:hover': { bgcolor: "#16a34a" }, fontSize: "0.6rem" }}
                      >
                        Comprar
                      </Button>
                      {isMaster && modoEdicao && (
                        <>
                          <IconButton
                            size="small"
                            onClick={() => {
                              setImovelEditando(imovel);
                              setNovoImovel({
                                nome: imovel.nome,
                                descricao: imovel.descricao || "",
                                cidade: imovel.cidade,
                                pais: imovel.pais || "Império Aurano",
                                tipo: imovel.tipo,
                                metrosQuadrados: imovel.metrosQuadrados || 100,
                                quartos: imovel.quartos || 1,
                                banheiros: imovel.banheiros || 1,
                                precoVenda: imovel.precoVenda,
                                precoAluguel: imovel.precoAluguel || 0,
                                imagem: imovel.imagem || "",
                              });
                              setModalEdicaoOpen(true);
                            }}
                            sx={{ color: "#ff9800" }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => deletarImovel(imovel.id)}
                            sx={{ color: "#ef4444" }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </>
                      )}
                    </Box>
                  </Box>
                </Paper>
              ))}
              {imoveisFiltrados.length === 0 && (
                <Typography sx={{ color: "#64748b", textAlign: "center", py: 4 }}>
                  Nenhum imóvel disponível.
                </Typography>
              )}
            </Box>
          </Box>
        )}

        {/* ABA MEUS BENS */}
        {abaAtiva === "meus_bens" && (
          <Box>
            <Typography variant="subtitle2" sx={{ color: "#3b82f6", mb: 1.5 }}>
              🏠 MEUS IMÓVEIS ({imoveisJogador.length})
            </Typography>

            {imoveisJogador.length === 0 ? (
              <Typography sx={{ color: "#64748b", textAlign: "center", py: 4 }}>
                Você não possui imóveis. Compre um no mercado!
              </Typography>
            ) : (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                {imoveisJogador.map((imovel) => {
                  const valorAtual = imovel.valorCompra || imovel.precoVenda || 0;
                  const valorMercado = imoveis.find(i => i.id === imovel.id)?.precoVenda || valorAtual;
                  const valorizacao = ((valorMercado - valorAtual) / valorAtual) * 100;

                  return (
                    <Paper
                      key={imovel.id}
                      sx={{
                        p: 1.5,
                        bgcolor: "#1a1a1a",
                        border: "1px solid #333",
                        display: "flex",
                        gap: 1.5,
                        flexWrap: "wrap",
                      }}
                    >
                      <Box sx={{ width: 120, height: 90, flexShrink: 0, borderRadius: 1, overflow: 'hidden', bgcolor: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {imovel.imagem ? (
                          <img src={imovel.imagem} alt={imovel.nome} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <Typography sx={{ fontSize: '2rem', opacity: 0.3 }}>🏠</Typography>
                        )}
                      </Box>

                      <Box sx={{ flex: 1, minWidth: 150 }}>
                        <Typography variant="body2" sx={{ fontWeight: "bold", color: "#fff" }}>
                          {imovel.nome}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "#64748b", display: "block" }}>
                          {imovel.cidade}, {imovel.pais}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "#64748b" }}>
                          Comprado em: {new Date(imovel.dataCompra).toLocaleDateString('pt-BR')}
                        </Typography>
                        <Chip
                          label={imovel.status || "Ocupado"}
                          size="small"
                          sx={{ mt: 0.5, bgcolor: imovel.status === "ocupado" ? "#22c55e22" : "#ef444422", color: imovel.status === "ocupado" ? "#22c55e" : "#ef4444", fontSize: "0.5rem", height: 16 }}
                        />
                      </Box>

                      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-end", justifyContent: "space-between", gap: 0.5 }}>
                        <Box sx={{ textAlign: "right" }}>
                          <Typography variant="body2" sx={{ color: "#fbbf24", fontWeight: "bold" }}>
                            💰 {valorMercado.toFixed(2)}
                          </Typography>
                          <Typography variant="caption" sx={{ color: valorizacao >= 0 ? "#22c55e" : "#ef4444" }}>
                            {valorizacao >= 0 ? "📈" : "📉"} {Math.abs(valorizacao).toFixed(1)}%
                          </Typography>
                          <Typography variant="caption" sx={{ color: "#64748b", display: "block" }}>
                            Compra: {valorAtual.toFixed(2)}
                          </Typography>
                        </Box>
                        <Button
                          size="small"
                          variant="contained"
                          startIcon={<SellIcon sx={{ fontSize: 14 }} />}
                          onClick={() => {
                            setImovelSelecionado(imovel);
                            setModalVendaOpen(true);
                          }}
                          sx={{ bgcolor: "#ef4444", '&:hover': { bgcolor: "#dc2626" }, fontSize: "0.6rem" }}
                        >
                          Vender
                        </Button>
                      </Box>
                    </Paper>
                  );
                })}
              </Box>
            )}
          </Box>
        )}
      </Box>

      {/* MODAL DE COMPRA */}
      <Dialog open={modalCompraOpen} onClose={() => setModalCompraOpen(false)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { bgcolor: "#0f172a", border: "1px solid #1e293b", borderRadius: 2 } }}>
        <DialogTitle sx={{ color: '#3b82f6' }}>🏠 Comprar Imóvel</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            {imovelSelecionado && (
              <>
                <Typography variant="body1" sx={{ color: '#fff', fontWeight: 'bold' }}>
                  {imovelSelecionado.nome}
                </Typography>
                <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                  {imovelSelecionado.cidade}, {imovelSelecionado.pais}
                </Typography>
                <Typography variant="body2" sx={{ color: '#fbbf24' }}>
                  Preço: 💰 {imovelSelecionado.precoVenda.toFixed(2)}
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
                        {nome}: 💰 {typeof valor === 'number' ? valor.toFixed(2) : '0.00'}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModalCompraOpen(false)} sx={{ color: '#94a3b8' }}>Cancelar</Button>
          <Button variant="contained" onClick={comprarImovel} disabled={loading} sx={{ bgcolor: '#22c55e', '&:hover': { bgcolor: '#16a34a' } }}>
            {loading ? "Processando..." : "Comprar"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* MODAL DE VENDA */}
      <Dialog open={modalVendaOpen} onClose={() => setModalVendaOpen(false)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { bgcolor: "#0f172a", border: "1px solid #1e293b", borderRadius: 2 } }}>
        <DialogTitle sx={{ color: '#ef4444' }}>📉 Vender Imóvel</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            {imovelSelecionado && (
              <>
                <Typography variant="body1" sx={{ color: '#fff', fontWeight: 'bold' }}>
                  {imovelSelecionado.nome}
                </Typography>
                <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                  {imovelSelecionado.cidade}, {imovelSelecionado.pais}
                </Typography>
                <Typography variant="body2" sx={{ color: '#fbbf24' }}>
                  Valor de venda: 💰 {Math.round((imovelSelecionado.valorCompra || 0) * 0.85).toFixed(2)}
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748b' }}>
                  💡 Taxa de corretagem: 15% (inclusa no valor)
                </Typography>
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModalVendaOpen(false)} sx={{ color: '#94a3b8' }}>Cancelar</Button>
          <Button variant="contained" onClick={venderImovel} disabled={loading} sx={{ bgcolor: '#ef4444', '&:hover': { bgcolor: '#dc2626' } }}>
            {loading ? "Processando..." : "Vender"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* MODAL DE EDIÇÃO DE IMÓVEL */}
      <Dialog open={modalEdicaoOpen} onClose={() => setModalEdicaoOpen(false)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { bgcolor: "#0f172a", border: "1px solid #1e293b", borderRadius: 2 } }}>
        <DialogTitle sx={{ color: '#3b82f6' }}>
          {imovelEditando ? "✏️ Editar Imóvel" : "➕ Novo Imóvel"}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              label="Nome do Imóvel"
              fullWidth
              size="small"
              value={novoImovel.nome}
              onChange={(e) => setNovoImovel({ ...novoImovel, nome: e.target.value })}
              InputProps={{ sx: { color: '#fff' } }}
              InputLabelProps={{ sx: { color: '#94a3b8' } }}
              sx={{ bgcolor: '#1a1a2e' }}
            />
            <TextField
              label="Descrição"
              fullWidth
              size="small"
              multiline
              rows={2}
              value={novoImovel.descricao}
              onChange={(e) => setNovoImovel({ ...novoImovel, descricao: e.target.value })}
              InputProps={{ sx: { color: '#fff' } }}
              InputLabelProps={{ sx: { color: '#94a3b8' } }}
              sx={{ bgcolor: '#1a1a2e' }}
            />
            <TextField
              label="Cidade"
              fullWidth
              size="small"
              value={novoImovel.cidade}
              onChange={(e) => setNovoImovel({ ...novoImovel, cidade: e.target.value })}
              InputProps={{ sx: { color: '#fff' } }}
              InputLabelProps={{ sx: { color: '#94a3b8' } }}
              sx={{ bgcolor: '#1a1a2e' }}
            />
            <FormControl fullWidth size="small">
              <InputLabel sx={{ color: '#94a3b8' }}>País</InputLabel>
              <Select
                value={novoImovel.pais}
                onChange={(e) => setNovoImovel({ ...novoImovel, pais: e.target.value })}
                sx={{ color: '#fff', bgcolor: '#1a1a2e' }}
              >
                <MenuItem value="Império Aurano">Império Aurano</MenuItem>
                <MenuItem value="Kratória">Kratória</MenuItem>
                <MenuItem value="Arcádia">Arcádia</MenuItem>
                <MenuItem value="Vaurana">Vaurana</MenuItem>
                <MenuItem value="Parax">Parax</MenuItem>
                <MenuItem value="Varosia">Varosia</MenuItem>
                <MenuItem value="Burgo">Burgo</MenuItem>
                <MenuItem value="Narshan">Narshan</MenuItem>
                <MenuItem value="Dryadalis">Dryadalis</MenuItem>
                <MenuItem value="Quark">Quark</MenuItem>
                <MenuItem value="Tsar">Tsar</MenuItem>
                <MenuItem value="Amuras">Amuras</MenuItem>
                <MenuItem value="Ferglacius">Ferglacius</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth size="small">
              <InputLabel sx={{ color: '#94a3b8' }}>Tipo</InputLabel>
              <Select
                value={novoImovel.tipo}
                onChange={(e) => setNovoImovel({ ...novoImovel, tipo: e.target.value })}
                sx={{ color: '#fff', bgcolor: '#1a1a2e' }}
              >
                <MenuItem value="Casa">Casa</MenuItem>
                <MenuItem value="Apartamento">Apartamento</MenuItem>
                <MenuItem value="Comercial">Comercial</MenuItem>
                <MenuItem value="Terreno">Terreno</MenuItem>
                <MenuItem value="Fazenda">Fazenda</MenuItem>
                <MenuItem value="Castelo">Castelo</MenuItem>
              </Select>
            </FormControl>
            <Grid container spacing={1}>
              <Grid item xs={6}>
                <TextField
                  label="m²"
                  fullWidth
                  size="small"
                  type="number"
                  value={novoImovel.metrosQuadrados}
                  onChange={(e) => setNovoImovel({ ...novoImovel, metrosQuadrados: Math.max(1, Number(e.target.value) || 1) })}
                  InputProps={{ sx: { color: '#fff' } }}
                  InputLabelProps={{ sx: { color: '#94a3b8' } }}
                  sx={{ bgcolor: '#1a1a2e' }}
                />
              </Grid>
              <Grid item xs={3}>
                <TextField
                  label="Quartos"
                  fullWidth
                  size="small"
                  type="number"
                  value={novoImovel.quartos}
                  onChange={(e) => setNovoImovel({ ...novoImovel, quartos: Math.max(0, Number(e.target.value) || 0) })}
                  InputProps={{ sx: { color: '#fff' } }}
                  InputLabelProps={{ sx: { color: '#94a3b8' } }}
                  sx={{ bgcolor: '#1a1a2e' }}
                />
              </Grid>
              <Grid item xs={3}>
                <TextField
                  label="Banheiros"
                  fullWidth
                  size="small"
                  type="number"
                  value={novoImovel.banheiros}
                  onChange={(e) => setNovoImovel({ ...novoImovel, banheiros: Math.max(0, Number(e.target.value) || 0) })}
                  InputProps={{ sx: { color: '#fff' } }}
                  InputLabelProps={{ sx: { color: '#94a3b8' } }}
                  sx={{ bgcolor: '#1a1a2e' }}
                />
              </Grid>
            </Grid>
            <TextField
              label="Preço de Venda"
              fullWidth
              size="small"
              type="number"
              value={novoImovel.precoVenda}
              onChange={(e) => setNovoImovel({ ...novoImovel, precoVenda: Math.max(0, Number(e.target.value) || 0) })}
              InputProps={{ sx: { color: '#fbbf24' }, inputProps: { min: 0, step: 1000 } }}
              InputLabelProps={{ sx: { color: '#94a3b8' } }}
              sx={{ bgcolor: '#1a1a2e' }}
            />
            <TextField
              label="Preço de Aluguel (mensal)"
              fullWidth
              size="small"
              type="number"
              value={novoImovel.precoAluguel}
              onChange={(e) => setNovoImovel({ ...novoImovel, precoAluguel: Math.max(0, Number(e.target.value) || 0) })}
              InputProps={{ sx: { color: '#94a3b8' }, inputProps: { min: 0, step: 100 } }}
              InputLabelProps={{ sx: { color: '#94a3b8' } }}
              sx={{ bgcolor: '#1a1a2e' }}
            />
            <TextField
              label="URL da Imagem"
              fullWidth
              size="small"
              value={novoImovel.imagem}
              onChange={(e) => setNovoImovel({ ...novoImovel, imagem: e.target.value })}
              InputProps={{ sx: { color: '#fff' } }}
              InputLabelProps={{ sx: { color: '#94a3b8' } }}
              sx={{ bgcolor: '#1a1a2e' }}
              helperText="Cole o link da imagem do imóvel"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModalEdicaoOpen(false)} sx={{ color: '#94a3b8' }}>Cancelar</Button>
          <Button variant="contained" onClick={salvarImovel} sx={{ bgcolor: '#3b82f6', '&:hover': { bgcolor: '#2563eb' } }}>
            {imovelEditando ? "Salvar Alterações" : "Adicionar Imóvel"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default React.memo(ImoveisHUD);
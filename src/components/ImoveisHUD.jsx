import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Box, Paper, Typography, IconButton, Button, TextField, Dialog, DialogTitle,
  DialogContent, DialogActions, Grid, Chip, Divider, Card, CardContent, CardActions,
  FormControl, InputLabel, Select, MenuItem, Badge, Tooltip,
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
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import KeyIcon from "@mui/icons-material/VpnKey";
import CancelIcon from "@mui/icons-material/Cancel";
import ReceiptIcon from "@mui/icons-material/Receipt";
import AutorenewIcon from "@mui/icons-material/Autorenew";
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

// ==================== HELPERS RPG ====================
const getDataRPG = () => {
  try {
    return localStorage.getItem("reqviem_world_date") || "Verão — 1/1/879";
  } catch {
    return "Verão — 1/1/879";
  }
};

// Parse "Verão — 12/2/879" → { estacao, dia, mes, ano, raw }
const parseDataRPG = () => {
  try {
    const raw = getDataRPG();
    const match = raw.match(/^(.+?)\s*[—\-–]\s*(\d+)\s*\/\s*(\d+)\s*\/\s*(\d+)/);
    if (match) {
      return {
        estacao: (match[1] || "Verão").trim(),
        dia: parseInt(match[2], 10) || 1,
        mes: parseInt(match[3], 10) || 1,
        ano: parseInt(match[4], 10) || 879,
        raw,
      };
    }
    return { estacao: "Verão", dia: 1, mes: 1, ano: 879, raw };
  } catch {
    return { estacao: "Verão", dia: 1, mes: 1, ano: 879, raw: "" };
  }
};

// Chave única do mês RPG — usada pra saber se já cobrou esse mês
const getChaveMesRPG = () => {
  const d = parseDataRPG();
  return `${d.ano}-${String(d.mes).padStart(2, "0")}`;
};

const gerarIdImovel = () =>
  `imv_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

const gerarIdImposto = () =>
  `ipt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

// ==================== CONFIGURAÇÕES DO MERCADO ====================
const MAX_IMOVEIS = 50;
const INTERVALO_GERACAO_MS = 10 * 60 * 1000; // 10 minutos
const INTERVALO_DESCONTO_MS = 24 * 60 * 60 * 1000; // 24h
const DESCONTO_MIN = 0.15; // 15%
const DESCONTO_MAX = 0.25; // 25%
const CHANCE_VENDA_AUTO = 0.0004;
const IDADE_MINIMA_VENDA_MS = 60 * 60 * 1000;
const TICK_MS = 60 * 1000;

// ==================== CONFIGURAÇÕES DE VENDA/FLUTUAÇÃO ====================
const INTERVALO_FLUTUACAO_MS = 10 * 60 * 1000; // 10 min
const FLUTUACAO_MIN = -0.30; // -30%
const FLUTUACAO_MAX = 0.30;  // +30%
const CORRETAGEM = 0.15;     // 15% na venda

// ==================== IMÓVEIS INICIAIS ====================
const IMOVEIS_INICIAIS = [
  {
    id: "casa_auraxia_1",
    nome: "Mansão Imperial",
    descricao: "Imponente mansão no coração de Auraxia, com vista para a Torre Hollow.",
    cidade: "Auraxia",
    pais: "Império Aurano",
    tipo: "Casa",
    emoji: "🏠",
    metrosQuadrados: 450,
    quartos: 5,
    banheiros: 4,
    precoVenda: 850000,
    precoOriginal: 850000,
    precoAluguel: 3500,
    disponivel: true,
    disponivelAluguel: true,
    imagem: "",
    dono: null,
    dataCompra: null,
    status: "disponivel",
    geradoEm: Date.now(),
    descontoAtivo: false,
    descontoPercent: 0,
    origemAleatoria: false,
  },
  {
    id: "apto_nexa_1",
    nome: "Apartamento Nexa Tower",
    descricao: "Apartamento moderno no 45º andar, com vista panorâmica da cidade.",
    cidade: "Nexa",
    pais: "Império Aurano",
    tipo: "Apartamento",
    emoji: "🏢",
    metrosQuadrados: 180,
    quartos: 2,
    banheiros: 2,
    precoVenda: 320000,
    precoOriginal: 320000,
    precoAluguel: 1500,
    disponivel: true,
    disponivelAluguel: true,
    imagem: "",
    dono: null,
    dataCompra: null,
    status: "disponivel",
    geradoEm: Date.now(),
    descontoAtivo: false,
    descontoPercent: 0,
    origemAleatoria: false,
  },
  {
    id: "casa_laxeado_1",
    nome: "Casa do Vale",
    descricao: "Casa térrea em Laxeado, com jardim e vista para as montanhas.",
    cidade: "Laxeado",
    pais: "Império Aurano",
    tipo: "Casa",
    emoji: "🏠",
    metrosQuadrados: 280,
    quartos: 3,
    banheiros: 2,
    precoVenda: 210000,
    precoOriginal: 210000,
    precoAluguel: 900,
    disponivel: true,
    disponivelAluguel: true,
    imagem: "",
    dono: null,
    dataCompra: null,
    status: "disponivel",
    geradoEm: Date.now(),
    descontoAtivo: false,
    descontoPercent: 0,
    origemAleatoria: false,
  },
  {
    id: "loja_sideris_1",
    nome: "Galpão Comercial Sideris",
    descricao: "Galpão comercial próximo ao centro de Sideris, ideal para negócios.",
    cidade: "Sideris",
    pais: "Império Aurano",
    tipo: "Comercial",
    emoji: "🏭",
    metrosQuadrados: 600,
    quartos: 0,
    banheiros: 2,
    precoVenda: 450000,
    precoOriginal: 450000,
    precoAluguel: 2200,
    disponivel: true,
    disponivelAluguel: true,
    imagem: "",
    dono: null,
    dataCompra: null,
    status: "disponivel",
    geradoEm: Date.now(),
    descontoAtivo: false,
    descontoPercent: 0,
    origemAleatoria: false,
  },
];

// ==================== IMPOSTOS INICIAIS ====================
const IMPOSTOS_INICIAIS = [
  {
    id: "ipt_predial",
    nome: "IPTU Predial",
    tipoImovel: "Casa",
    pais: "todos",
    cidade: "",
    percentual: 1.2,
    valorFixo: 0,
    descricao: "Imposto Predial e Territorial Urbano sobre casas.",
    editavel: true,
  },
  {
    id: "ipt_apto",
    nome: "IPTU Residencial",
    tipoImovel: "Apartamento",
    pais: "todos",
    cidade: "",
    percentual: 1.0,
    valorFixo: 0,
    descricao: "Imposto sobre apartamentos residenciais.",
    editavel: true,
  },
  {
    id: "ipt_comercial",
    nome: "IPTU Comercial",
    tipoImovel: "Comercial",
    pais: "todos",
    cidade: "",
    percentual: 2.0,
    valorFixo: 0,
    descricao: "Imposto sobre imóveis comerciais.",
    editavel: true,
  },
  {
    id: "ipt_geral",
    nome: "Imposto Imperial Geral",
    tipoImovel: "todos",
    pais: "todos",
    cidade: "",
    percentual: 0.3,
    valorFixo: 0,
    descricao: "Imposto básico aplicado a todos os imóveis.",
    editavel: true,
  },
];

// ==================== LOCAIS PERMITIDOS ====================
const LOCAIS_PERMITIDOS = [
  { cidade: "Auraxia", pais: "Império Aurano" },
  { cidade: "Laxeado", pais: "Império Aurano" },
  { cidade: "Sideris", pais: "Império Aurano" },
  { cidade: "Caldeira", pais: "Império Aurano" },
  { cidade: "Nexa", pais: "Império Aurano" },
  { cidade: "Vindicta", pais: "Império Aurano" },
  { cidade: "Sensus", pais: "Império Aurano" },
  { cidade: "Porto Névoa", pais: "Império Aurano" },
  { cidade: "Solaris", pais: "Império Aurano" },
  { cidade: "Arenna", pais: "Império Aurano" },
  { cidade: "Vértex", pais: "Império Aurano" },
  { cidade: "Ferrogênese", pais: "Império Aurano" },
  { cidade: "Passaredo", pais: "Império Aurano" },
  { cidade: "Cinzas", pais: "Império Aurano" },
  { cidade: "Polaris", pais: "Império Aurano" },
  { cidade: "Miragem", pais: "Império Aurano" },
  { cidade: "Vapor", pais: "Império Aurano" },
  { cidade: "Obsidyan", pais: "Império Aurano" },
  { cidade: "Eco", pais: "Império Aurano" },
  { cidade: "Lacuna", pais: "Império Aurano" },
  { cidade: "Têmpera", pais: "Império Aurano" },
  { cidade: "Gris", pais: "Império Aurano" },
  { cidade: "Anelo", pais: "Império Aurano" },
  { cidade: "Chamusca", pais: "Império Aurano" },
  { cidade: "Ruptura", pais: "Império Aurano" },
  { cidade: "Praxys", pais: "Kratória" },
  { cidade: "Misty", pais: "Arcádia" },
  { cidade: "Vaura", pais: "Vaurana" },
  { cidade: "Abyssus", pais: "Parax" },
  { cidade: "Vondaris", pais: "Varosia" },
  { cidade: "Burguia", pais: "Burgo" },
  { cidade: "Novareia", pais: "Narshan" },
  { cidade: "Dryadalis", pais: "Dryadalis" },
  { cidade: "Quark", pais: "Quark" },
  { cidade: "Tsar", pais: "Tsar" },
  { cidade: "Harâm", pais: "Amuras" },
  { cidade: "Fawkes", pais: "Ilha Hollow" },
  { cidade: "Yörk", pais: "Ferglacius" },
];

// ==================== TIPOS DE IMÓVEIS (para geração) ====================
const TIPOS_GERACAO = [
  { tipo: "Apartamento", emoji: "🏢", precoBase: 150000, metrosBase: 90, quartosBase: 2, banheirosBase: 1 },
  { tipo: "Casa", emoji: "🏠", precoBase: 220000, metrosBase: 180, quartosBase: 3, banheirosBase: 2 },
  { tipo: "Comercial", emoji: "🏭", precoBase: 300000, metrosBase: 250, quartosBase: 0, banheirosBase: 2 },
  { tipo: "Cobertura", emoji: "🌆", precoBase: 500000, metrosBase: 220, quartosBase: 4, banheirosBase: 3 },
  { tipo: "Terreno", emoji: "🌳", precoBase: 80000, metrosBase: 500, quartosBase: 0, banheirosBase: 0 },
  { tipo: "Loft", emoji: "🏙️", precoBase: 180000, metrosBase: 100, quartosBase: 1, banheirosBase: 1 },
  { tipo: "Castelo", emoji: "🏰", precoBase: 1200000, metrosBase: 800, quartosBase: 10, banheirosBase: 6 },
  { tipo: "Fazenda", emoji: "🚜", precoBase: 400000, metrosBase: 2000, quartosBase: 4, banheirosBase: 3 },
];

// ==================== NOMES PARA GERAÇÃO ====================
const NOMES_PREFIXO = [
  "Residência", "Mansão", "Vila", "Edifício", "Torre", "Solar", "Palacete",
  "Cobertura", "Loft", "Estúdio", "Chácara", "Sobrado", "Casa", "Refúgio",
  "Santuário", "Fortaleza", "Complexo", "Condomínio",
];

const NOMES_SUFIXO = [
  "das Sombras", "do Crepúsculo", "Aurora", "das Estrelas", "do Vale",
  "Vermelha", "de Ferro", "Dourada", "das Brumas", "da Alvorada",
  "Esmeralda", "de Obsidiana", "do Alvorecer", "Sombria", "Silenciosa",
  "do Titã", "do Alquimista", "do Fundador", "do Déspota", "do Ás",
  "do Dragão", "do Fênix", "do Corvo", "da Serpente", "do Trovão",
];

// ==================== HELPERS ====================
const getEmojiPorTipo = (tipo) => {
  switch (tipo) {
    case "Apartamento": return "🏢";
    case "Casa": return "🏠";
    case "Comercial": return "🏭";
    case "Cobertura": return "🌆";
    case "Terreno": return "🌳";
    case "Loft": return "🏙️";
    case "Fazenda": return "🚜";
    case "Castelo": return "🏰";
    default: return "🏠";
  }
};

const processarImagemUpload = (file, maxWidth = 400) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          const scale = Math.min(1, maxWidth / img.width);
          canvas.width = Math.max(1, Math.round(img.width * scale));
          canvas.height = Math.max(1, Math.round(img.height * scale));
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/jpeg", 0.7));
        } catch (e) {
          reject(e);
        }
      };
      img.onerror = reject;
      img.src = ev.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const gerarImovelAleatorio = () => {
  const local = LOCAIS_PERMITIDOS[Math.floor(Math.random() * LOCAIS_PERMITIDOS.length)];
  const tipoInfo = TIPOS_GERACAO[Math.floor(Math.random() * TIPOS_GERACAO.length)];

  const variacaoPreco = 0.6 + Math.random() * 1.0;
  const precoVenda = Math.round((tipoInfo.precoBase * variacaoPreco) / 1000) * 1000;

  const metrosQuadrados = Math.round(tipoInfo.metrosBase * (0.7 + Math.random() * 0.8));
  const quartos = Math.max(0, tipoInfo.quartosBase + Math.floor(Math.random() * 3) - 1);
  const banheiros = Math.max(0, tipoInfo.banheirosBase + Math.floor(Math.random() * 2));

  const prefixo = NOMES_PREFIXO[Math.floor(Math.random() * NOMES_PREFIXO.length)];
  const sufixo = NOMES_SUFIXO[Math.floor(Math.random() * NOMES_SUFIXO.length)];
  const nome = `${prefixo} ${sufixo}`;

  const descricoes = [
    `Imóvel em ${local.cidade}, com ${metrosQuadrados}m² e acabamento de qualidade.`,
    `Localizado no coração de ${local.cidade}, perfeito para quem busca conforto e estilo.`,
    `Propriedade em ${local.cidade} com vista privilegiada da região.`,
    `Excelente oportunidade em ${local.cidade}! Pronto para mudança.`,
    `Em ${local.cidade}, com acesso fácil a mercados e transporte.`,
    `Refúgio em ${local.cidade}, ideal para quem valoriza tranquilidade sem perder a vida urbana.`,
    `Espaço amplo em ${local.cidade}, com ${quartos} quartos e ${banheiros} banheiros.`,
    `Raridade em ${local.cidade}! Não perca esta chance.`,
  ];
  const descricao = descricoes[Math.floor(Math.random() * descricoes.length)];

  const now = Date.now();

  return {
    id: gerarIdImovel(),
    nome,
    descricao,
    cidade: local.cidade,
    pais: local.pais,
    tipo: tipoInfo.tipo,
    emoji: tipoInfo.emoji,
    metrosQuadrados,
    quartos,
    banheiros,
    precoVenda,
    precoOriginal: precoVenda,
    precoAluguel: Math.round(precoVenda * 0.005),
    disponivel: true,
    disponivelAluguel: true,
    imagem: "",
    dono: null,
    dataCompra: null,
    status: "disponivel",
    geradoEm: now,
    descontoAtivo: false,
    descontoPercent: 0,
    origemAleatoria: true,
  };
};

const gerarImpostoAleatorio = () => {
  const tipos = ["Casa", "Apartamento", "Comercial", "Cobertura", "Loft", "Fazenda", "Castelo", "Terreno", "todos"];
  const paises = ["todos", "Império Aurano", "Kratória", "Arcádia", "Parax", "Varosia"];
  const tipoImovel = tipos[Math.floor(Math.random() * tipos.length)];
  const pais = paises[Math.floor(Math.random() * paises.length)];
  const cidades = pais === "todos" ? [""] : [...LOCAIS_PERMITIDOS.filter(l => l.pais === pais).map(l => l.cidade), ""];
  const cidade = cidades[Math.floor(Math.random() * cidades.length)] || "";

  const prefixos = ["Taxa", "Imposto", "Tributo", "Cota", "Tarifa"];
  const nomes = ["Predial", "Residencial", "Comercial", "de Manutenção", "Imperial", "Real", "Municipal", "Distrital"];
  const nome = `${prefixos[Math.floor(Math.random() * prefixos.length)]} ${nomes[Math.floor(Math.random() * nomes.length)]}`;

  return {
    id: gerarIdImposto(),
    nome,
    tipoImovel,
    pais,
    cidade,
    percentual: Math.round((0.2 + Math.random() * 2.5) * 10) / 10,
    valorFixo: Math.random() < 0.5 ? 0 : Math.round(Math.random() * 500),
    descricao: `Tributo gerado automaticamente (${tipoImovel} em ${pais}${cidade ? ` - ${cidade}` : ""}).`,
    editavel: true,
  };
};

// Calcula o valor total de imposto de um imóvel
const calcularImpostoImovel = (imovel, impostos) => {
  if (!imovel || !Array.isArray(impostos)) return 0;
  const base = imovel.valorMercado || imovel.valorCompra || imovel.precoVenda || 0;
  let total = 0;
  for (const i of impostos) {
    const matchTipo = !i.tipoImovel || i.tipoImovel === "todos" || i.tipoImovel === imovel.tipo;
    const matchPais = !i.pais || i.pais === "todos" || i.pais === imovel.pais;
    const matchCidade = !i.cidade || i.cidade === imovel.cidade;
    if (matchTipo && matchPais && matchCidade) {
      total += base * ((i.percentual || 0) / 100) + (i.valorFixo || 0);
    }
  }
  return Math.round(total * 100) / 100;
};

// ==================== COMPONENTE PRINCIPAL ====================
function ImoveisHUD({ userEmail, onClose, fichasMap, isMaster }) {
  // ===== ESTADOS DA JANELA =====
  const [minimizado, setMinimizado] = useState(false);

  // ===== ESTADOS DOS IMÓVEIS =====
  const [imoveis, setImoveis] = useState(IMOVEIS_INICIAIS);
  const [imoveisJogador, setImoveisJogador] = useState([]);
  const [imoveisAlugados, setImoveisAlugados] = useState([]);
  const [impostos, setImpostos] = useState(IMPOSTOS_INICIAIS);
  const [historicoPagamentos, setHistoricoPagamentos] = useState([]);
  const [ultimaCobrancaRPG, setUltimaCobrancaRPG] = useState("");
  const [abaAtiva, setAbaAtiva] = useState("comprar");
  const [busca, setBusca] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [filtroCidade, setFiltroCidade] = useState("todos");
  const [filtroPais, setFiltroPais] = useState("todos");
  const [filtroStatus, setFiltroStatus] = useState("todos");

  // ===== ESTADOS DE EDIÇÃO (IMÓVEIS) =====
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
    disponivelAluguel: true,
    imagem: "",
  });

  // ===== ESTADOS DE EDIÇÃO (IMPOSTOS) =====
  const [impostoEditando, setImpostoEditando] = useState(null);
  const [modalImpostoOpen, setModalImpostoOpen] = useState(false);
  const [novoImposto, setNovoImposto] = useState({
    nome: "",
    tipoImovel: "todos",
    pais: "todos",
    cidade: "",
    percentual: 0.5,
    valorFixo: 0,
    descricao: "",
    editavel: true,
  });

  // ===== ESTADOS DE COMPRA/VENDA/ALUGUEL =====
  const [imovelSelecionado, setImovelSelecionado] = useState(null);
  const [modalCompraOpen, setModalCompraOpen] = useState(false);
  const [modalVendaOpen, setModalVendaOpen] = useState(false);
  const [modalAluguelOpen, setModalAluguelOpen] = useState(false);
  const [modalCancelarAluguelOpen, setModalCancelarAluguelOpen] = useState(false);
  const [carteiraSelecionada, setCarteiraSelecionada] = useState("");
  const [carteiraJogador, setCarteiraJogador] = useState({});
  const [emailParaCarteira, setEmailParaCarteira] = useState(userEmail);
  const [loading, setLoading] = useState(false);

  // 🟢 GUARDA O FORMATO ORIGINAL DAS CARTEIRAS ("array" ou "object")
  const carteirasFormatoRef = useRef("array");

  // Refs para acessar dados dentro dos intervalos
  const imoveisRef = useRef(imoveis);
  const imoveisJogadorRef = useRef(imoveisJogador);
  const imoveisAlugadosRef = useRef(imoveisAlugados);
  const impostosRef = useRef(impostos);
  const ultimaCobrancaRef = useRef(ultimaCobrancaRPG);
  const historicoRef = useRef(historicoPagamentos);

  useEffect(() => { imoveisRef.current = imoveis; }, [imoveis]);
  useEffect(() => { imoveisJogadorRef.current = imoveisJogador; }, [imoveisJogador]);
  useEffect(() => { imoveisAlugadosRef.current = imoveisAlugados; }, [imoveisAlugados]);
  useEffect(() => { impostosRef.current = impostos; }, [impostos]);
  useEffect(() => { ultimaCobrancaRef.current = ultimaCobrancaRPG; }, [ultimaCobrancaRPG]);
  useEffect(() => { historicoRef.current = historicoPagamentos; }, [historicoPagamentos]);

  // ===== CARREGAR IMÓVEIS DO FIRESTORE =====
  useEffect(() => {
    const ref = doc(db, "imoveis", "dados");
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        const dados = snap.data();
        if (dados.imoveis) {
          let precisaSalvar = false;
          const normalized = dados.imoveis.map((imv) => {
            if (
              imv.precoOriginal === undefined ||
              imv.geradoEm === undefined ||
              imv.descontoAtivo === undefined ||
              imv.disponivelAluguel === undefined
            ) {
              precisaSalvar = true;
              return {
                ...imv,
                precoOriginal: imv.precoOriginal ?? imv.precoVenda,
                geradoEm: imv.geradoEm ?? Date.now(),
                descontoAtivo: imv.descontoAtivo ?? false,
                descontoPercent: imv.descontoPercent ?? 0,
                disponivelAluguel: imv.disponivelAluguel ?? true,
                emoji: imv.emoji || getEmojiPorTipo(imv.tipo),
              };
            }
            return imv;
          });
          setImoveis(normalized);
          if (precisaSalvar) {
            setDoc(doc(db, "imoveis", "dados"), { imoveis: normalized }, { merge: true }).catch(() => {});
          }
        }
      }
    });
    return () => unsub();
  }, []);

  // ===== CARREGAR IMPOSTOS DO FIRESTORE =====
  useEffect(() => {
    const ref = doc(db, "imoveis_impostos", "dados");
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        const dados = snap.data();
        if (Array.isArray(dados.impostos)) {
          setImpostos(dados.impostos);
        } else {
          // Primeira vez: inicializa com os padrões
          setDoc(doc(db, "imoveis_impostos", "dados"), { impostos: IMPOSTOS_INICIAIS }, { merge: true }).catch(() => {});
        }
      } else {
        // Doc não existe, cria com os padrões
        setDoc(doc(db, "imoveis_impostos", "dados"), { impostos: IMPOSTOS_INICIAIS }, { merge: true }).catch(() => {});
      }
    });
    return () => unsub();
  }, []);

  // ===== CARREGAR FICHA DO JOGADOR =====
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

        // 🟢 DETECTA O FORMATO ORIGINAL E GUARDA NA REF
        carteirasFormatoRef.current = Array.isArray(dados.carteiras) ? "array" : "object";

        const carteiras = dados.carteiras || {};
        const carteirasObj = Array.isArray(carteiras)
          ? carteiras.reduce(
              (acc, item) => ({ ...acc, [item.nome || "default"]: item.valor || 0 }),
              {}
            )
          : carteiras;
        setCarteiraJogador(carteirasObj);

        setImoveisJogador(dados.imoveis || []);
        setImoveisAlugados(dados.imoveisAlugados || []);
        setHistoricoPagamentos(dados.historicoPagamentos || []);
        setUltimaCobrancaRPG(dados.ultimaCobrancaRPG || "");
      }
    });
    return () => unsub();
  }, [emailParaCarteira, userEmail]);

  // ===== OUVIR EMAIL SELECIONADO NO CHAT =====
  useEffect(() => {
    const handleEmailSelecionado = (event) => {
      const email = event.detail;
      if (email) setEmailParaCarteira(email);
    };
    window.addEventListener("jogadorSelecionadoChat", handleEmailSelecionado);
    return () => window.removeEventListener("jogadorSelecionadoChat", handleEmailSelecionado);
  }, []);

  // ===== SALVAR IMÓVEIS NO MERCADO =====
  const salvarDados = async (novosImoveis) => {
    await setDoc(
      doc(db, "imoveis", "dados"),
      { imoveis: novosImoveis || imoveis },
      { merge: true }
    );
  };

  // ===== SALVAR IMPOSTOS =====
  const salvarImpostos = async (novosImpostos) => {
    await setDoc(
      doc(db, "imoveis_impostos", "dados"),
      { impostos: novosImpostos || impostos },
      { merge: true }
    );
  };

  // ===== SALVAR DADOS DO JOGADOR (preservando formato original das carteiras) =====
  const salvarDadosJogador = async ({
    novasCarteirasFlat,
    novosImoveis,
    novosImoveisAlugados,
    novoHistorico,
    novaUltimaCobranca,
  } = {}) => {
    const fichaRef = doc(db, "fichas", emailParaCarteira || userEmail);
    const atualizacao = {};
    if (novasCarteirasFlat) {
      if (carteirasFormatoRef.current === "array") {
        atualizacao.carteiras = Object.entries(novasCarteirasFlat).map(([nome, valor]) => ({
          nome,
          valor,
        }));
      } else {
        atualizacao.carteiras = novasCarteirasFlat;
      }
    }
    if (novosImoveis !== undefined) atualizacao.imoveis = novosImoveis;
    if (novosImoveisAlugados !== undefined) atualizacao.imoveisAlugados = novosImoveisAlugados;
    if (novoHistorico !== undefined) atualizacao.historicoPagamentos = novoHistorico;
    if (novaUltimaCobranca !== undefined) atualizacao.ultimaCobrancaRPG = novaUltimaCobranca;
    await setDoc(fichaRef, atualizacao, { merge: true });
  };

  // ============ TICK DO MERCADO (a cada 1 min) ============
  // 1. Atualiza descontos (ciclo 24h)
  // 2. Simula vendas/aluguéis automáticos
  // 3. Repõe imóveis vendidos
  // 4. Enforça o limite de MAX_IMOVEIS
  useEffect(() => {
    const tick = async () => {
      const lista = imoveisRef.current;
      if (!Array.isArray(lista) || lista.length === 0) return;

      const now = Date.now();
      let changed = false;

      // ----- PASSO 1: DESCONTOS -----
      let atualizados = lista.map((imv) => {
        if (imv.dono) return imv;
        const original = imv.precoOriginal ?? imv.precoVenda;
        const geradoEm = imv.geradoEm ?? now;
        const elapsed = now - geradoEm;
        const cycles = Math.floor(elapsed / INTERVALO_DESCONTO_MS);
        const shouldDiscount = cycles % 2 === 1;

        if (
          imv.precoOriginal === undefined ||
          imv.geradoEm === undefined ||
          imv.descontoAtivo === undefined
        ) {
          changed = true;
          return {
            ...imv,
            precoOriginal: original,
            geradoEm,
            descontoAtivo: false,
            descontoPercent: 0,
            disponivelAluguel: imv.disponivelAluguel ?? true,
            emoji: imv.emoji || getEmojiPorTipo(imv.tipo),
          };
        }

        if (shouldDiscount && !imv.descontoAtivo) {
          const descPct = DESCONTO_MIN + Math.random() * (DESCONTO_MAX - DESCONTO_MIN);
          changed = true;
          return {
            ...imv,
            precoVenda: Math.round(original * (1 - descPct)),
            descontoAtivo: true,
            descontoPercent: Math.round(descPct * 100),
          };
        }

        if (!shouldDiscount && imv.descontoAtivo) {
          changed = true;
          return {
            ...imv,
            precoVenda: original,
            descontoAtivo: false,
            descontoPercent: 0,
          };
        }

        return imv;
      });

      // ----- PASSO 2: VENDAS/ALUGUÉIS AUTOMÁTICOS -----
      const vendidos = [];
      atualizados = atualizados.filter((imv) => {
        if (imv.dono) return true;
        const idade = now - (imv.geradoEm || now);
        if (idade < IDADE_MINIMA_VENDA_MS) return true;
        if (Math.random() < CHANCE_VENDA_AUTO) {
          vendidos.push(imv);
          return false;
        }
        return true;
      });

      if (vendidos.length > 0) changed = true;

      // ----- PASSO 3: REPOR -----
      vendidos.forEach(() => atualizados.push(gerarImovelAleatorio()));

      // ----- PASSO 4: LIMITE -----
      const disponiveis = atualizados.filter((i) => !i.dono);
      if (disponiveis.length > MAX_IMOVEIS) {
        const disponiveisOrdenados = [...disponiveis].sort(
          (a, b) => (a.geradoEm || 0) - (b.geradoEm || 0)
        );
        const paraRemover = disponiveisOrdenados.slice(0, disponiveis.length - MAX_IMOVEIS);
        const idsRemover = new Set(paraRemover.map((i) => i.id));
        atualizados = atualizados.filter((i) => !idsRemover.has(i.id));
        changed = true;
      }

      if (changed) {
        setImoveis(atualizados);
        try {
          await salvarDados(atualizados);
        } catch (e) {
          console.error("Erro ao salvar mercado:", e);
        }
      }
    };

    const intervalId = setInterval(tick, TICK_MS);
    tick();
    return () => clearInterval(intervalId);
  }, []);

  // ============ TICK DE FLUTUAÇÃO DE PREÇO DAS PROPRIEDADES DO JOGADOR ============
  // A cada 10 min, atualiza valorMercado das propriedades do jogador (±30% em relação
  // ao valor de compra)
  useEffect(() => {
    const tick = async () => {
      const imoveisProp = imoveisJogadorRef.current;
      if (!Array.isArray(imoveisProp) || imoveisProp.length === 0) return;

      const now = Date.now();
      let changed = false;

      const atualizados = imoveisProp.map((imv) => {
        const ultima = imv.ultimaFlutuacao || 0;
        if (now - ultima < INTERVALO_FLUTUACAO_MS) return imv;
        const base = imv.valorCompra || imv.precoVenda || 0;
        if (base <= 0) return imv;
        const fator = 1 + (FLUTUACAO_MIN + Math.random() * (FLUTUACAO_MAX - FLUTUACAO_MIN));
        const novoValor = Math.round(base * fator * 100) / 100;
        changed = true;
        return {
          ...imv,
          valorMercado: novoValor,
          ultimaFlutuacao: now,
        };
      });

      if (changed) {
        setImoveisJogador(atualizados);
        try {
          await salvarDadosJogador({ novosImoveis: atualizados });
        } catch (e) {
          console.error("Erro ao salvar flutuação:", e);
        }
      }
    };

    const intervalId = setInterval(tick, TICK_MS);
    tick();
    return () => clearInterval(intervalId);
  }, []);

  // ============ TICK DE COBRANÇA (ALUGUEL + IMPOSTO) ============
  // Quando muda o mês RPG (ano-mes diferente do último registrado), cobra:
  //  - Aluguel de imóveis alugados
  //  - Impostos dos imóveis comprados
  useEffect(() => {
    const tick = async () => {
      const emailAtual = emailParaCarteira || userEmail;
      if (!emailAtual) return;

      const chaveAtual = getChaveMesRPG();
      const chaveAnterior = ultimaCobrancaRef.current || "";

      if (chaveAtual === chaveAnterior) return; // já cobrou esse mês

      // Se nunca cobrou, apenas registra o marco (não cobra retroativo)
      if (!chaveAnterior) {
        try {
          await salvarDadosJogador({ novaUltimaCobranca: chaveAtual });
          setUltimaCobrancaRPG(chaveAtual);
        } catch (e) {
          console.error("Erro ao registrar primeira cobrança:", e);
        }
        return;
      }

      // Aqui: mudou o mês → cobrar
      const alugados = imoveisAlugadosRef.current || [];
      const comprados = imoveisJogadorRef.current || [];
      const regrasImposto = impostosRef.current || [];

      // Calcula totais
      const detalhes = [];
      let totalAluguel = 0;
      let totalImposto = 0;

      for (const a of alugados) {
        const v = a.precoAluguel || 0;
        totalAluguel += v;
        detalhes.push({ tipo: "aluguel", imovelId: a.id, nome: a.nome, valor: v });
      }
      for (const c of comprados) {
        const v = calcularImpostoImovel(c, regrasImposto);
        if (v > 0) {
          totalImposto += v;
          detalhes.push({ tipo: "imposto", imovelId: c.id, nome: c.nome, valor: v });
        }
      }
      const total = Math.round((totalAluguel + totalImposto) * 100) / 100;

      // Debita das carteiras (na ordem)
      const carteirasFlat = { ...(carteiraJogador || {}) };
      let restante = total;
      let debited = false;
      for (const k of Object.keys(carteirasFlat)) {
        if (restante <= 0) break;
        const v = carteirasFlat[k] || 0;
        if (v >= restante) {
          carteirasFlat[k] = v - restante;
          restante = 0;
          debited = true;
        } else {
          restante -= v;
          carteirasFlat[k] = 0;
        }
      }
      const totalCobrado = debited ? total : (total - restante);

      const historico = [
        ...(historicoRef.current || []),
        {
          chave: chaveAtual,
          dataRPG: getDataRPG(),
          total: Math.round(totalCobrado * 100) / 100,
          totalAluguel: Math.round(totalAluguel * 100) / 100,
          totalImposto: Math.round(totalImposto * 100) / 100,
          detalhes,
          pagoEm: new Date().toISOString(),
          insuficiente: !debited && restante > 0,
        },
      ];
      // Mantém só os 50 últimos
      while (historico.length > 50) historico.shift();

      try {
        await salvarDadosJogador({
          novasCarteirasFlat: carteirasFlat,
          novoHistorico: historico,
          novaUltimaCobranca: chaveAtual,
        });
        setCarteiraJogador(carteirasFlat);
        setHistoricoPagamentos(historico);
        setUltimaCobrancaRPG(chaveAtual);
        console.log(`💰 Cobrança ${chaveAtual}: aluguel=${totalAluguel}, imposto=${totalImposto}, total=${total}`);
      } catch (e) {
        console.error("Erro na cobrança:", e);
      }
    };

    const intervalId = setInterval(tick, TICK_MS);
    tick();
    return () => clearInterval(intervalId);
  }, [emailParaCarteira, userEmail]);

  // ==================== GERAÇÃO AUTOMÁTICA (10 min) ====================
  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      const lista = imoveisRef.current;
      let novos = [...lista];
      const novoImovel = gerarImovelAleatorio();
      novos.push(novoImovel);

      const disponiveis = novos.filter((i) => !i.dono);
      if (disponiveis.length > MAX_IMOVEIS) {
        const maisAntigo = [...disponiveis].sort(
          (a, b) => (a.geradoEm || 0) - (b.geradoEm || 0)
        )[0];
        novos = novos.filter((i) => i.id !== maisAntigo.id);
      }

      setImoveis(novos);
      try {
        await salvarDados(novos);
      } catch (e) {
        console.error("Erro ao gerar imóvel:", e);
      }
    }, INTERVALO_GERACAO_MS);

    return () => clearTimeout(timeoutId);
  }, [imoveis]);

  // ===== COMPRAR IMÓVEL =====
  const comprarImovel = async () => {
    if (!imovelSelecionado || !carteiraSelecionada) {
      alert("Selecione um imóvel e uma carteira!");
      return;
    }

    const valorTotal = imovelSelecionado.precoVenda;
    const carteiraAtual = carteiraJogador[carteiraSelecionada] || 0;

    if (carteiraAtual < valorTotal) {
      alert(
        `Saldo insuficiente! Você precisa de ${valorTotal.toFixed(2)} 💰, mas tem ${carteiraAtual.toFixed(2)} 💰`
      );
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
        valorMercado: valorTotal,
        ultimaFlutuacao: Date.now(),
        descontoAtivo: false,
        descontoPercent: 0,
      };
      delete imovelParaAdicionar.disponivel;

      const novosImoveisJogador = [...imoveisJogador, imovelParaAdicionar];
      setImoveisJogador(novosImoveisJogador);

      const imoveisDisponiveis = imoveis.filter((i) => i.id !== imovelSelecionado.id);
      setImoveis(imoveisDisponiveis);

      await salvarDadosJogador({
        novasCarteirasFlat: novasCarteiras,
        novosImoveis: novosImoveisJogador,
      });
      await salvarDados(imoveisDisponiveis);

      setCarteiraJogador(novasCarteiras);
      alert(
        `✅ Compra realizada!\n${imovelSelecionado.nome} por ${valorTotal.toFixed(2)} 💰`
      );
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

    const valorMercado =
      imovelSelecionado.valorMercado ||
      imovelSelecionado.valorCompra ||
      imovelSelecionado.precoVenda ||
      0;
    const valorVenda = Math.round(valorMercado * (1 - CORRETAGEM) * 100) / 100;
    const carteiraPadrao = Object.keys(carteiraJogador)[0] || "Bolso";

    setLoading(true);

    try {
      const novasCarteiras = {
        ...carteiraJogador,
        [carteiraPadrao]: (carteiraJogador[carteiraPadrao] || 0) + valorVenda,
      };

      const novosImoveisJogador = imoveisJogador.filter(
        (i) => i.id !== imovelSelecionado.id
      );
      setImoveisJogador(novosImoveisJogador);

      const imovelParaMercado = {
        ...imovelSelecionado,
        dono: null,
        dataCompra: null,
        status: "disponivel",
        disponivel: true,
        disponivelAluguel: true,
        geradoEm: Date.now(),
        precoOriginal: valorMercado,
        precoVenda: valorMercado,
        descontoAtivo: false,
        descontoPercent: 0,
      };
      delete imovelParaMercado.valorCompra;
      delete imovelParaMercado.valorMercado;
      delete imovelParaMercado.ultimaFlutuacao;

      const imoveisDisponiveis = [...imoveis, imovelParaMercado];
      setImoveis(imoveisDisponiveis);

      await salvarDadosJogador({
        novasCarteirasFlat: novasCarteiras,
        novosImoveis: novosImoveisJogador,
      });
      await salvarDados(imoveisDisponiveis);

      setCarteiraJogador(novasCarteiras);
      alert(
        `✅ Venda realizada!\n${imovelSelecionado.nome} por ${valorVenda.toFixed(2)} 💰\n(corretagem de ${CORRETAGEM * 100}% já descontada)`
      );
      setModalVendaOpen(false);
      setImovelSelecionado(null);
    } catch (error) {
      console.error("Erro na venda:", error);
      alert("Erro ao realizar venda.");
    } finally {
      setLoading(false);
    }
  };

  // ===== ALUGAR IMÓVEL =====
  const alugarImovel = async () => {
    if (!imovelSelecionado || !carteiraSelecionada) {
      alert("Selecione um imóvel e uma carteira!");
      return;
    }
    const primeiroAluguel = imovelSelecionado.precoAluguel || 0;
    const carteiraAtual = carteiraJogador[carteiraSelecionada] || 0;
    if (carteiraAtual < primeiroAluguel) {
      alert(`Saldo insuficiente! Você precisa de ${primeiroAluguel.toFixed(2)} 💰`);
      return;
    }

    setLoading(true);
    try {
      const novasCarteiras = {
        ...carteiraJogador,
        [carteiraSelecionada]: carteiraAtual - primeiroAluguel,
      };

      const imovelAlugado = {
        ...imovelSelecionado,
        alugadoPor: emailParaCarteira || userEmail,
        dataInicioAluguel: new Date().toISOString(),
        dataInicioRPG: getDataRPG(),
        proximoVencimento: getDataRPG(),
        valorAluguelMensal: primeiroAluguel,
      };

      const novosAlugados = [...imoveisAlugados, imovelAlugado];
      setImoveisAlugados(novosAlugados);

      const imoveisDisponiveis = imoveis.filter((i) => i.id !== imovelSelecionado.id);
      setImoveis(imoveisDisponiveis);

      await salvarDadosJogador({
        novasCarteirasFlat: novasCarteiras,
        novosImoveisAlugados: novosAlugados,
      });
      await salvarDados(imoveisDisponiveis);

      setCarteiraJogador(novasCarteiras);
      alert(
        `🔑 Aluguel realizado!\n${imovelSelecionado.nome} — 1º mês pago (${primeiroAluguel.toFixed(2)} 💰)\nPróxima cobrança: dia 1 do próximo mês RPG.`
      );
      setModalAluguelOpen(false);
      setImovelSelecionado(null);
    } catch (error) {
      console.error("Erro no aluguel:", error);
      alert("Erro ao realizar aluguel.");
    } finally {
      setLoading(false);
    }
  };

  // ===== CANCELAR ALUGUEL =====
  const cancelarAluguel = async () => {
    if (!imovelSelecionado) return;
    setLoading(true);
    try {
      const novosAlugados = imoveisAlugados.filter((i) => i.id !== imovelSelecionado.id);
      setImoveisAlugados(novosAlugados);

      // Devolve o imóvel ao mercado
      const imovelParaMercado = {
        ...imovelSelecionado,
        alugadoPor: null,
        dataInicioAluguel: null,
        dataInicioRPG: null,
        proximoVencimento: null,
        valorAluguelMensal: null,
        dono: null,
        dataCompra: null,
        status: "disponivel",
        disponivel: true,
        disponivelAluguel: true,
        geradoEm: Date.now(),
        descontoAtivo: false,
        descontoPercent: 0,
      };
      const imoveisDisponiveis = [...imoveis, imovelParaMercado];
      setImoveis(imoveisDisponiveis);

      await salvarDadosJogador({ novosImoveisAlugados: novosAlugados });
      await salvarDados(imoveisDisponiveis);

      alert(`❌ Aluguel cancelado: ${imovelSelecionado.nome}`);
      setModalCancelarAluguelOpen(false);
      setImovelSelecionado(null);
    } catch (error) {
      console.error("Erro ao cancelar aluguel:", error);
      alert("Erro ao cancelar aluguel.");
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
      const novosImoveis = imoveis.map((i) =>
        i.id === imovelEditando.id
          ? {
              ...i,
              ...novoImovel,
              id: i.id,
              emoji: getEmojiPorTipo(novoImovel.tipo),
            }
          : i
      );
      setImoveis(novosImoveis);
      await salvarDados(novosImoveis);
    } else {
      const id = gerarIdImovel();
      const imovelCompleto = {
        ...novoImovel,
        id,
        emoji: getEmojiPorTipo(novoImovel.tipo),
        disponivel: true,
        dono: null,
        dataCompra: null,
        status: "disponivel",
        geradoEm: Date.now(),
        precoOriginal: novoImovel.precoVenda,
        descontoAtivo: false,
        descontoPercent: 0,
        origemAleatoria: false,
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
      disponivelAluguel: true,
      imagem: "",
    });
  };

  const deletarImovel = async (id) => {
    if (!window.confirm("Remover este imóvel?")) return;
    const novosImoveis = imoveis.filter((i) => i.id !== id);
    setImoveis(novosImoveis);
    await salvarDados(novosImoveis);
  };

  // ===== CRUD DE IMPOSTOS (MESTRE) =====
  const salvarImposto = async () => {
    if (!novoImposto.nome.trim()) {
      alert("Preencha o nome do imposto!");
      return;
    }
    let novosImpostos;
    if (impostoEditando) {
      novosImpostos = impostos.map((i) =>
        i.id === impostoEditando.id ? { ...novoImposto, id: i.id } : i
      );
    } else {
      novosImpostos = [...impostos, { ...novoImposto, id: gerarIdImposto() }];
    }
    setImpostos(novosImpostos);
    await salvarImpostos(novosImpostos);
    setModalImpostoOpen(false);
    setImpostoEditando(null);
    setNovoImposto({
      nome: "",
      tipoImovel: "todos",
      pais: "todos",
      cidade: "",
      percentual: 0.5,
      valorFixo: 0,
      descricao: "",
      editavel: true,
    });
  };

  const deletarImposto = async (id) => {
    if (!window.confirm("Remover este imposto?")) return;
    const novos = impostos.filter((i) => i.id !== id);
    setImpostos(novos);
    await salvarImpostos(novos);
  };

  const gerarImpostoAuto = async () => {
    const novo = gerarImpostoAleatorio();
    const novos = [...impostos, novo];
    setImpostos(novos);
    await salvarImpostos(novos);
    alert(`✅ Imposto gerado: ${novo.nome}`);
  };

  // ===== FILTROS =====
  const cidades = [...new Set(imoveis.map((i) => i.cidade))];
  const paises = [...new Set(imoveis.map((i) => i.pais))];
  const tipos = [...new Set(imoveis.map((i) => i.tipo))];

  const imoveisFiltrados = imoveis.filter((i) => {
    const matchBusca =
      i.nome.toLowerCase().includes(busca.toLowerCase()) ||
      i.cidade.toLowerCase().includes(busca.toLowerCase()) ||
      i.pais.toLowerCase().includes(busca.toLowerCase());
    const matchTipo = filtroTipo === "todos" || i.tipo === filtroTipo;
    const matchCidade = filtroCidade === "todos" || i.cidade === filtroCidade;
    const matchPais = filtroPais === "todos" || i.pais === filtroPais;
    return matchBusca && matchTipo && matchCidade && matchPais;
  });

  const totalCarteira = Object.values(carteiraJogador).reduce(
    (a, b) => a + (typeof b === "number" ? b : 0),
    0
  );

  // Totais mensais (estimados)
  const totalAluguelMensal = imoveisAlugados.reduce(
    (sum, a) => sum + (a.precoAluguel || 0),
    0
  );
  const totalImpostoMensal = imoveisJogador.reduce(
    (sum, i) => sum + calcularImpostoImovel(i, impostos),
    0
  );

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
      {/* BARRA DE TÍTULO INTERNA */}
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
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
          <HomeIcon sx={{ color: "#3b82f6" }} />
          <Typography variant="subtitle2" sx={{ color: "#3b82f6", fontWeight: "bold" }}>
            🏠 IMÓVEIS
          </Typography>
          <Chip
            label={`💰 ${totalCarteira.toFixed(2)}`}
            size="small"
            sx={{ bgcolor: "#fbbf2422", color: "#fbbf24", fontSize: "0.6rem", height: 20 }}
          />
          <Chip
            label={`📦 ${imoveis.length} no mercado`}
            size="small"
            sx={{ bgcolor: "#3b82f622", color: "#3b82f6", fontSize: "0.6rem", height: 20 }}
          />
          {(totalAluguelMensal > 0 || totalImpostoMensal > 0) && (
            <Chip
              label={`📅 Mensal: 💰 ${(totalAluguelMensal + totalImpostoMensal).toFixed(0)}`}
              size="small"
              sx={{ bgcolor: "#ef444422", color: "#ef4444", fontSize: "0.6rem", height: 20 }}
            />
          )}
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
      <Box
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          p: 1.5,
          gap: 1,
          overflowY: "auto",
          height: "calc(100% - 56px)",
          "&::-webkit-scrollbar": { width: "3px" },
          "&::-webkit-scrollbar-thumb": { background: "#3b82f644", borderRadius: "10px" },
        }}
      >
        {/* ABAS */}
        <Box
          sx={{
            display: "flex",
            gap: 0.5,
            borderBottom: "1px solid #3b82f633",
            pb: 1,
            flexWrap: "wrap",
          }}
        >
          <Button
            size="small"
            onClick={() => setAbaAtiva("comprar")}
            sx={{
              color: abaAtiva === "comprar" ? "#3b82f6" : "#888",
              fontSize: "0.65rem",
              bgcolor: abaAtiva === "comprar" ? "#3b82f622" : "transparent",
            }}
          >
            [MERCADO]
          </Button>
          <Button
            size="small"
            onClick={() => setAbaAtiva("meus_bens")}
            sx={{
              color: abaAtiva === "meus_bens" ? "#3b82f6" : "#888",
              fontSize: "0.65rem",
              bgcolor: abaAtiva === "meus_bens" ? "#3b82f622" : "transparent",
            }}
          >
            [IMÓVEIS COMPRADOS]
          </Button>
          <Button
            size="small"
            onClick={() => setAbaAtiva("alugados")}
            sx={{
              color: abaAtiva === "alugados" ? "#3b82f6" : "#888",
              fontSize: "0.65rem",
              bgcolor: abaAtiva === "alugados" ? "#3b82f622" : "transparent",
            }}
          >
            [ALUGADOS {imoveisAlugados.length > 0 ? `(${imoveisAlugados.length})` : ""}]
          </Button>
          <Button
            size="small"
            onClick={() => setAbaAtiva("impostos")}
            sx={{
              color: abaAtiva === "impostos" ? "#3b82f6" : "#888",
              fontSize: "0.65rem",
              bgcolor: abaAtiva === "impostos" ? "#3b82f622" : "transparent",
            }}
          >
            [IMPOSTOS {impostos.length > 0 ? `(${impostos.length})` : ""}]
          </Button>
          <Button
            size="small"
            onClick={() => setAbaAtiva("historico")}
            sx={{
              color: abaAtiva === "historico" ? "#3b82f6" : "#888",
              fontSize: "0.65rem",
              bgcolor: abaAtiva === "historico" ? "#3b82f622" : "transparent",
            }}
          >
            [PAGAMENTOS]
          </Button>
        </Box>

        {/* ABA MERCADO */}
        {abaAtiva === "comprar" && (
          <Box>
            <Box
              sx={{
                display: "flex",
                gap: 1,
                mb: 1.5,
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              <TextField
                size="small"
                placeholder="🔍 Buscar imóvel, cidade ou país..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                sx={{
                  flex: 1,
                  minWidth: 150,
                  "& .MuiInputBase-root": { color: "#fff", fontSize: "0.8rem" },
                }}
                InputProps={{ sx: { bgcolor: "#1a1a1a" } }}
              />
              <FormControl size="small" sx={{ minWidth: 100 }}>
                <InputLabel sx={{ color: "#94a3b8" }}>Tipo</InputLabel>
                <Select
                  value={filtroTipo}
                  onChange={(e) => setFiltroTipo(e.target.value)}
                  sx={{ color: "#fff", bgcolor: "#1a1a1a" }}
                >
                  <MenuItem value="todos">Todos</MenuItem>
                  {tipos.map((t) => (
                    <MenuItem key={t} value={t}>{t}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 100 }}>
                <InputLabel sx={{ color: "#94a3b8" }}>Cidade</InputLabel>
                <Select
                  value={filtroCidade}
                  onChange={(e) => setFiltroCidade(e.target.value)}
                  sx={{ color: "#fff", bgcolor: "#1a1a1a" }}
                >
                  <MenuItem value="todos">Todas</MenuItem>
                  {cidades.map((c) => (
                    <MenuItem key={c} value={c}>{c}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 100 }}>
                <InputLabel sx={{ color: "#94a3b8" }}>País</InputLabel>
                <Select
                  value={filtroPais}
                  onChange={(e) => setFiltroPais(e.target.value)}
                  sx={{ color: "#fff", bgcolor: "#1a1a1a" }}
                >
                  <MenuItem value="todos">Todos</MenuItem>
                  {paises.map((p) => (
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
                      disponivelAluguel: true,
                      imagem: "",
                    });
                    setModalEdicaoOpen(true);
                  }}
                  sx={{
                    bgcolor: "#22c55e",
                    "&:hover": { bgcolor: "#16a34a" },
                    fontSize: "0.6rem",
                  }}
                >
                  + Imóvel
                </Button>
              )}
            </Box>

            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
              {imoveisFiltrados.map((imovel) => (
                <Paper
                  key={imovel.id}
                  sx={{
                    p: 1.5,
                    bgcolor: "#1a1a1a",
                    border: imovel.descontoAtivo
                      ? "1px solid #ef444488"
                      : "1px solid #333",
                    "&:hover": { borderColor: "#3b82f666" },
                    display: "flex",
                    gap: 1.5,
                    flexWrap: "wrap",
                    position: "relative",
                  }}
                >
                  <Box
                    sx={{
                      width: 120,
                      height: 90,
                      flexShrink: 0,
                      borderRadius: 1,
                      overflow: "hidden",
                      bgcolor: "#0a0a0a",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {imovel.imagem ? (
                      <img
                        src={imovel.imagem}
                        alt={imovel.nome}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      <Typography sx={{ fontSize: "2.5rem", opacity: 0.6 }}>
                        {imovel.emoji || getEmojiPorTipo(imovel.tipo)}
                      </Typography>
                    )}
                  </Box>

                  <Box sx={{ flex: 1, minWidth: 150 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, flexWrap: "wrap" }}>
                      <Typography variant="body2" sx={{ fontWeight: "bold", color: "#fff" }}>
                        {imovel.nome}
                      </Typography>
                      {imovel.descontoAtivo && (
                        <Chip
                          label={`🔥 -${imovel.descontoPercent}%`}
                          size="small"
                          sx={{
                            bgcolor: "#ef444422",
                            color: "#ef4444",
                            fontSize: "0.55rem",
                            height: 16,
                            fontWeight: "bold",
                          }}
                        />
                      )}
                      {imovel.disponivelAluguel && (
                        <Chip
                          label="🔑 Aluguel"
                          size="small"
                          sx={{
                            bgcolor: "#3b82f622",
                            color: "#3b82f6",
                            fontSize: "0.55rem",
                            height: 16,
                          }}
                        />
                      )}
                    </Box>
                    <Typography variant="caption" sx={{ color: "#64748b", display: "block" }}>
                      {imovel.cidade}, {imovel.pais} • {imovel.tipo}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "#64748b" }}>
                      {imovel.metrosQuadrados}m² • {imovel.quartos} quartos • {imovel.banheiros} banheiros
                    </Typography>
                  </Box>

                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-end",
                      justifyContent: "space-between",
                      gap: 0.5,
                    }}
                  >
                    <Box sx={{ textAlign: "right" }}>
                      {imovel.descontoAtivo && imovel.precoOriginal && (
                        <Typography
                          variant="caption"
                          sx={{ color: "#64748b", textDecoration: "line-through", display: "block" }}
                        >
                          💰 {imovel.precoOriginal.toFixed(2)}
                        </Typography>
                      )}
                      <Typography
                        variant="body2"
                        sx={{
                          color: imovel.descontoAtivo ? "#ef4444" : "#fbbf24",
                          fontWeight: "bold",
                        }}
                      >
                        💰 {imovel.precoVenda.toFixed(2)}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "#64748b" }}>
                        🔑 Aluguel: {imovel.precoAluguel}/mês
                      </Typography>
                    </Box>
                    <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", justifyContent: "flex-end" }}>
                      <Button
                        size="small"
                        variant="contained"
                        startIcon={<ShoppingCartIcon sx={{ fontSize: 14 }} />}
                        onClick={() => {
                          setImovelSelecionado(imovel);
                          setModalCompraOpen(true);
                        }}
                        sx={{ bgcolor: "#22c55e", "&:hover": { bgcolor: "#16a34a" }, fontSize: "0.6rem" }}
                      >
                        Comprar
                      </Button>
                      {imovel.disponivelAluguel && (
                        <Button
                          size="small"
                          variant="contained"
                          startIcon={<KeyIcon sx={{ fontSize: 14 }} />}
                          onClick={() => {
                            setImovelSelecionado(imovel);
                            setModalAluguelOpen(true);
                          }}
                          sx={{ bgcolor: "#3b82f6", "&:hover": { bgcolor: "#2563eb" }, fontSize: "0.6rem" }}
                        >
                          Alugar
                        </Button>
                      )}
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
                                precoVenda: imovel.precoOriginal ?? imovel.precoVenda,
                                precoAluguel: imovel.precoAluguel || 0,
                                disponivelAluguel: imovel.disponivelAluguel ?? true,
                                imagem: imovel.imagem || "",
                              });
                              setModalEdicaoOpen(true);
                            }}
                            sx={{ color: "#ff9800" }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton size="small" onClick={() => deletarImovel(imovel.id)} sx={{ color: "#ef4444" }}>
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

        {/* ABA IMÓVEIS COMPRADOS */}
        {abaAtiva === "meus_bens" && (
          <Box>
            <Typography variant="subtitle2" sx={{ color: "#3b82f6", mb: 1.5 }}>
              🏠 IMÓVEIS COMPRADOS ({imoveisJogador.length})
              {totalImpostoMensal > 0 && (
                <Chip
                  label={`📅 Imposto mensal: 💰 ${totalImpostoMensal.toFixed(2)}`}
                  size="small"
                  sx={{ ml: 1, bgcolor: "#ef444422", color: "#ef4444", fontSize: "0.6rem", height: 18 }}
                />
              )}
            </Typography>

            {imoveisJogador.length === 0 ? (
              <Typography sx={{ color: "#64748b", textAlign: "center", py: 4 }}>
                Você não possui imóveis. Compre um no mercado!
              </Typography>
            ) : (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                {imoveisJogador.map((imovel) => {
                  const valorCompra = imovel.valorCompra || imovel.precoVenda || 0;
                  const valorMercado = imovel.valorMercado || valorCompra;
                  const valorizacao =
                    valorCompra > 0
                      ? ((valorMercado - valorCompra) / valorCompra) * 100
                      : 0;
                  const impostoMensal = calcularImpostoImovel(imovel, impostos);
                  const valorVendaLiquido = Math.round(valorMercado * (1 - CORRETAGEM) * 100) / 100;

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
                      <Box
                        sx={{
                          width: 120,
                          height: 90,
                          flexShrink: 0,
                          borderRadius: 1,
                          overflow: "hidden",
                          bgcolor: "#0a0a0a",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {imovel.imagem ? (
                          <img
                            src={imovel.imagem}
                            alt={imovel.nome}
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          />
                        ) : (
                          <Typography sx={{ fontSize: "2.5rem", opacity: 0.6 }}>
                            {imovel.emoji || getEmojiPorTipo(imovel.tipo)}
                          </Typography>
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
                          Comprado em: {getDataRPG()}
                        </Typography>
                        {impostoMensal > 0 && (
                          <Typography variant="caption" sx={{ color: "#ef4444", display: "block" }}>
                            📅 Imposto: 💰 {impostoMensal.toFixed(2)}/mês
                          </Typography>
                        )}
                      </Box>

                      <Box
                        sx={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "flex-end",
                          justifyContent: "space-between",
                          gap: 0.5,
                        }}
                      >
                        <Box sx={{ textAlign: "right" }}>
                          <Typography variant="body2" sx={{ color: "#fbbf24", fontWeight: "bold" }}>
                            💰 {valorMercado.toFixed(2)}
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{ color: valorizacao >= 0 ? "#22c55e" : "#ef4444" }}
                          >
                            {valorizacao >= 0 ? "📈" : "📉"} {Math.abs(valorizacao).toFixed(1)}%
                          </Typography>
                          <Typography variant="caption" sx={{ color: "#64748b", display: "block" }}>
                            Compra: {valorCompra.toFixed(2)}
                          </Typography>
                          <Typography variant="caption" sx={{ color: "#22c55e", display: "block" }}>
                            Venda líq.: 💰 {valorVendaLiquido.toFixed(2)}
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
                          sx={{
                            bgcolor: "#ef4444",
                            "&:hover": { bgcolor: "#dc2626" },
                            fontSize: "0.6rem",
                          }}
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

        {/* ABA ALUGADOS */}
        {abaAtiva === "alugados" && (
          <Box>
            <Typography variant="subtitle2" sx={{ color: "#3b82f6", mb: 1.5 }}>
              🔑 IMÓVEIS ALUGADOS ({imoveisAlugados.length})
              {totalAluguelMensal > 0 && (
                <Chip
                  label={`📅 Aluguel mensal: 💰 ${totalAluguelMensal.toFixed(2)}`}
                  size="small"
                  sx={{ ml: 1, bgcolor: "#ef444422", color: "#ef4444", fontSize: "0.6rem", height: 18 }}
                />
              )}
            </Typography>

            {imoveisAlugados.length === 0 ? (
              <Typography sx={{ color: "#64748b", textAlign: "center", py: 4 }}>
                Você não tem imóveis alugados. Vá em [MERCADO] e alugue um!
              </Typography>
            ) : (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                {imoveisAlugados.map((imovel) => (
                  <Paper
                    key={imovel.id}
                    sx={{
                      p: 1.5,
                      bgcolor: "#1a1a1a",
                      border: "1px solid #3b82f644",
                      display: "flex",
                      gap: 1.5,
                      flexWrap: "wrap",
                    }}
                  >
                    <Box
                      sx={{
                        width: 120,
                        height: 90,
                        flexShrink: 0,
                        borderRadius: 1,
                        overflow: "hidden",
                        bgcolor: "#0a0a0a",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {imovel.imagem ? (
                        <img
                          src={imovel.imagem}
                          alt={imovel.nome}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      ) : (
                        <Typography sx={{ fontSize: "2.5rem", opacity: 0.6 }}>
                          {imovel.emoji || getEmojiPorTipo(imovel.tipo)}
                        </Typography>
                      )}
                    </Box>

                    <Box sx={{ flex: 1, minWidth: 150 }}>
                      <Typography variant="body2" sx={{ fontWeight: "bold", color: "#fff" }}>
                        {imovel.nome}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "#64748b", display: "block" }}>
                        {imovel.cidade}, {imovel.pais}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "#64748b", display: "block" }}>
                        📅 Início: {imovel.dataInicioRPG || getDataRPG()}
                      </Typography>
                      <Chip
                        label={`🔑 ${imovel.precoAluguel}/mês`}
                        size="small"
                        sx={{
                          mt: 0.5,
                          bgcolor: "#3b82f622",
                          color: "#3b82f6",
                          fontSize: "0.55rem",
                          height: 18,
                        }}
                      />
                    </Box>

                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-end",
                        justifyContent: "space-between",
                        gap: 0.5,
                      }}
                    >
                      <Typography variant="caption" sx={{ color: "#94a3b8", textAlign: "right" }}>
                        Cobrança todo dia 1<br />
                        do mês RPG
                      </Typography>
                      <Button
                        size="small"
                        variant="contained"
                        startIcon={<CancelIcon sx={{ fontSize: 14 }} />}
                        onClick={() => {
                          setImovelSelecionado(imovel);
                          setModalCancelarAluguelOpen(true);
                        }}
                        sx={{
                          bgcolor: "#ef4444",
                          "&:hover": { bgcolor: "#dc2626" },
                          fontSize: "0.6rem",
                        }}
                      >
                        Cancelar
                      </Button>
                    </Box>
                  </Paper>
                ))}
              </Box>
            )}
          </Box>
        )}

        {/* ABA IMPOSTOS */}
        {abaAtiva === "impostos" && (
          <Box>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5, flexWrap: "wrap", gap: 1 }}>
              <Typography variant="subtitle2" sx={{ color: "#3b82f6" }}>
                🧾 REGRAS DE IMPOSTO ({impostos.length})
              </Typography>
              {isMaster && modoEdicao && (
                <Box sx={{ display: "flex", gap: 0.5 }}>
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={<AutorenewIcon />}
                    onClick={gerarImpostoAuto}
                    sx={{ bgcolor: "#a855f7", "&:hover": { bgcolor: "#9333ea" }, fontSize: "0.6rem" }}
                  >
                    Gerar Aleatório
                  </Button>
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => {
                      setImpostoEditando(null);
                      setNovoImposto({
                        nome: "",
                        tipoImovel: "todos",
                        pais: "todos",
                        cidade: "",
                        percentual: 0.5,
                        valorFixo: 0,
                        descricao: "",
                        editavel: true,
                      });
                      setModalImpostoOpen(true);
                    }}
                    sx={{ bgcolor: "#22c55e", "&:hover": { bgcolor: "#16a34a" }, fontSize: "0.6rem" }}
                  >
                    + Imposto
                  </Button>
                </Box>
              )}
            </Box>

            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
              {impostos.map((imp) => (
                <Paper
                  key={imp.id}
                  sx={{
                    p: 1.2,
                    bgcolor: "#1a1a1a",
                    border: "1px solid #333",
                    display: "flex",
                    gap: 1,
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <Box sx={{ flex: 1, minWidth: 150 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, flexWrap: "wrap" }}>
                      <Typography variant="body2" sx={{ fontWeight: "bold", color: "#fff" }}>
                        {imp.nome}
                      </Typography>
                      <Chip
                        label={imp.tipoImovel === "todos" ? "Todos os tipos" : imp.tipoImovel}
                        size="small"
                        sx={{ bgcolor: "#3b82f622", color: "#3b82f6", fontSize: "0.55rem", height: 16 }}
                      />
                      <Chip
                        label={imp.pais === "todos" ? "Todos os países" : imp.pais}
                        size="small"
                        sx={{ bgcolor: "#fbbf2422", color: "#fbbf24", fontSize: "0.55rem", height: 16 }}
                      />
                      {imp.cidade && (
                        <Chip
                          label={`📍 ${imp.cidade}`}
                          size="small"
                          sx={{ bgcolor: "#22c55e22", color: "#22c55e", fontSize: "0.55rem", height: 16 }}
                        />
                      )}
                    </Box>
                    <Typography variant="caption" sx={{ color: "#64748b", display: "block", mt: 0.3 }}>
                      {imp.descricao || "Sem descrição."}
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: "right", minWidth: 90 }}>
                    <Typography variant="body2" sx={{ color: "#ef4444", fontWeight: "bold" }}>
                      {imp.percentual}%
                    </Typography>
                    {imp.valorFixo > 0 && (
                      <Typography variant="caption" sx={{ color: "#94a3b8" }}>
                        + 💰 {imp.valorFixo}
                      </Typography>
                    )}
                  </Box>
                  {isMaster && modoEdicao && (
                    <Box sx={{ display: "flex", gap: 0.3 }}>
                      <IconButton
                        size="small"
                        onClick={() => {
                          setImpostoEditando(imp);
                          setNovoImposto({ ...imp });
                          setModalImpostoOpen(true);
                        }}
                        sx={{ color: "#ff9800" }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={() => deletarImposto(imp.id)} sx={{ color: "#ef4444" }}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  )}
                </Paper>
              ))}
              {impostos.length === 0 && (
                <Typography sx={{ color: "#64748b", textAlign: "center", py: 4 }}>
                  Nenhum imposto configurado.
                </Typography>
              )}
            </Box>

            {!isMaster && (
              <Typography variant="caption" sx={{ color: "#475569", display: "block", mt: 2, fontStyle: "italic" }}>
                💡 Apenas o mestre pode criar e editar impostos. Fale com ele se achar algo estranho.
              </Typography>
            )}
          </Box>
        )}

        {/* ABA HISTÓRICO DE PAGAMENTOS */}
        {abaAtiva === "historico" && (
          <Box>
            <Typography variant="subtitle2" sx={{ color: "#3b82f6", mb: 1.5 }}>
              💰 HISTÓRICO DE PAGAMENTOS ({historicoPagamentos.length})
            </Typography>
            {historicoPagamentos.length === 0 ? (
              <Typography sx={{ color: "#64748b", textAlign: "center", py: 4 }}>
                Nenhum pagamento registrado ainda.
              </Typography>
            ) : (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                {[...historicoPagamentos].reverse().map((h, idx) => (
                  <Paper
                    key={idx}
                    sx={{
                      p: 1.2,
                      bgcolor: "#1a1a1a",
                      border: h.insuficiente ? "1px solid #ef444488" : "1px solid #333",
                    }}
                  >
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.5, flexWrap: "wrap", gap: 0.5 }}>
                      <Typography variant="caption" sx={{ color: "#3b82f6", fontWeight: "bold" }}>
                        📅 {h.dataRPG}
                      </Typography>
                      <Box sx={{ display: "flex", gap: 0.5 }}>
                        {h.totalAluguel > 0 && (
                          <Chip
                            label={`🔑 Aluguel: ${h.totalAluguel.toFixed(2)}`}
                            size="small"
                            sx={{ bgcolor: "#3b82f622", color: "#3b82f6", fontSize: "0.55rem", height: 16 }}
                          />
                        )}
                        {h.totalImposto > 0 && (
                          <Chip
                            label={`🧾 Imposto: ${h.totalImposto.toFixed(2)}`}
                            size="small"
                            sx={{ bgcolor: "#ef444422", color: "#ef4444", fontSize: "0.55rem", height: 16 }}
                          />
                        )}
                        {h.insuficiente && (
                          <Chip
                            label="⚠️ Saldo insuficiente"
                            size="small"
                            sx={{ bgcolor: "#f9731622", color: "#f97316", fontSize: "0.55rem", height: 16 }}
                          />
                        )}
                      </Box>
                    </Box>
                    <Typography variant="caption" sx={{ color: "#fbbf24", fontWeight: "bold" }}>
                      Total cobrado: 💰 {h.total.toFixed(2)}
                    </Typography>
                    <Box sx={{ mt: 0.5 }}>
                      {h.detalhes?.map((d, i) => (
                        <Typography key={i} variant="caption" sx={{ color: "#64748b", display: "block", fontSize: "0.6rem" }}>
                          {d.tipo === "aluguel" ? "🔑" : "🧾"} {d.nome}: 💰 {d.valor.toFixed(2)}
                        </Typography>
                      ))}
                    </Box>
                  </Paper>
                ))}
              </Box>
            )}
          </Box>
        )}
      </Box>

      {/* MODAL DE COMPRA */}
      <Dialog
        open={modalCompraOpen}
        onClose={() => setModalCompraOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { bgcolor: "#0f172a", border: "1px solid #1e293b", borderRadius: 2 } }}
      >
        <DialogTitle sx={{ color: "#3b82f6" }}>🏠 Comprar Imóvel</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}>
            {imovelSelecionado && (
              <>
                <Typography variant="body1" sx={{ color: "#fff", fontWeight: "bold" }}>
                  {imovelSelecionado.nome}
                </Typography>
                <Typography variant="body2" sx={{ color: "#94a3b8" }}>
                  {imovelSelecionado.cidade}, {imovelSelecionado.pais}
                </Typography>
                {imovelSelecionado.descontoAtivo && imovelSelecionado.precoOriginal && (
                  <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                    <Typography variant="body2" sx={{ color: "#64748b", textDecoration: "line-through" }}>
                      💰 {imovelSelecionado.precoOriginal.toFixed(2)}
                    </Typography>
                    <Chip
                      label={`-${imovelSelecionado.descontoPercent}%`}
                      size="small"
                      sx={{ bgcolor: "#ef444422", color: "#ef4444", fontSize: "0.65rem", fontWeight: "bold" }}
                    />
                  </Box>
                )}
                <Typography variant="body2" sx={{ color: "#fbbf24", fontWeight: "bold" }}>
                  Preço: 💰 {imovelSelecionado.precoVenda.toFixed(2)}
                </Typography>

                <FormControl fullWidth size="small">
                  <InputLabel sx={{ color: "#94a3b8" }}>Carteira para débito</InputLabel>
                  <Select
                    value={carteiraSelecionada}
                    onChange={(e) => setCarteiraSelecionada(e.target.value)}
                    sx={{ color: "#fff", bgcolor: "#1a1a2e" }}
                  >
                    {Object.entries(carteiraJogador).map(([nome, valor]) => (
                      <MenuItem key={nome} value={nome}>
                        {nome}: 💰 {typeof valor === "number" ? valor.toFixed(2) : "0.00"}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModalCompraOpen(false)} sx={{ color: "#94a3b8" }}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={comprarImovel}
            disabled={loading}
            sx={{ bgcolor: "#22c55e", "&:hover": { bgcolor: "#16a34a" } }}
          >
            {loading ? "Processando..." : "Comprar"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* MODAL DE ALUGUEL */}
      <Dialog
        open={modalAluguelOpen}
        onClose={() => setModalAluguelOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { bgcolor: "#0f172a", border: "1px solid #1e293b", borderRadius: 2 } }}
      >
        <DialogTitle sx={{ color: "#3b82f6" }}>🔑 Alugar Imóvel</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}>
            {imovelSelecionado && (
              <>
                <Typography variant="body1" sx={{ color: "#fff", fontWeight: "bold" }}>
                  {imovelSelecionado.nome}
                </Typography>
                <Typography variant="body2" sx={{ color: "#94a3b8" }}>
                  {imovelSelecionado.cidade}, {imovelSelecionado.pais}
                </Typography>
                <Typography variant="body2" sx={{ color: "#3b82f6", fontWeight: "bold" }}>
                  💰 {imovelSelecionado.precoAluguel}/mês
                </Typography>
                <Typography variant="caption" sx={{ color: "#94a3b8" }}>
                  📅 O 1º mês é cobrado agora. Depois, cobrança automática todo dia 1 do mês RPG.
                </Typography>
                <FormControl fullWidth size="small">
                  <InputLabel sx={{ color: "#94a3b8" }}>Carteira para débito do 1º mês</InputLabel>
                  <Select
                    value={carteiraSelecionada}
                    onChange={(e) => setCarteiraSelecionada(e.target.value)}
                    sx={{ color: "#fff", bgcolor: "#1a1a2e" }}
                  >
                    {Object.entries(carteiraJogador).map(([nome, valor]) => (
                      <MenuItem key={nome} value={nome}>
                        {nome}: 💰 {typeof valor === "number" ? valor.toFixed(2) : "0.00"}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModalAluguelOpen(false)} sx={{ color: "#94a3b8" }}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={alugarImovel}
            disabled={loading}
            sx={{ bgcolor: "#3b82f6", "&:hover": { bgcolor: "#2563eb" } }}
          >
            {loading ? "Processando..." : "Alugar"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* MODAL DE CANCELAR ALUGUEL */}
      <Dialog
        open={modalCancelarAluguelOpen}
        onClose={() => setModalCancelarAluguelOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { bgcolor: "#0f172a", border: "1px solid #1e293b", borderRadius: 2 } }}
      >
        <DialogTitle sx={{ color: "#ef4444" }}>❌ Cancelar Aluguel</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}>
            {imovelSelecionado && (
              <>
                <Typography variant="body1" sx={{ color: "#fff", fontWeight: "bold" }}>
                  {imovelSelecionado.nome}
                </Typography>
                <Typography variant="body2" sx={{ color: "#94a3b8" }}>
                  Você tem certeza que deseja cancelar o aluguel deste imóvel?
                </Typography>
                <Typography variant="caption" sx={{ color: "#ef4444" }}>
                  ⚠️ Não há reembolso do mês já pago.
                </Typography>
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModalCancelarAluguelOpen(false)} sx={{ color: "#94a3b8" }}>
            Voltar
          </Button>
          <Button
            variant="contained"
            onClick={cancelarAluguel}
            disabled={loading}
            sx={{ bgcolor: "#ef4444", "&:hover": { bgcolor: "#dc2626" } }}
          >
            {loading ? "Processando..." : "Cancelar Aluguel"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* MODAL DE VENDA */}
      <Dialog
        open={modalVendaOpen}
        onClose={() => setModalVendaOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { bgcolor: "#0f172a", border: "1px solid #1e293b", borderRadius: 2 } }}
      >
        <DialogTitle sx={{ color: "#ef4444" }}>📉 Vender Imóvel</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}>
            {imovelSelecionado && (
              <>
                <Typography variant="body1" sx={{ color: "#fff", fontWeight: "bold" }}>
                  {imovelSelecionado.nome}
                </Typography>
                <Typography variant="body2" sx={{ color: "#94a3b8" }}>
                  {imovelSelecionado.cidade}, {imovelSelecionado.pais}
                </Typography>
                <Typography variant="body2" sx={{ color: "#fbbf24" }}>
                  Valor de mercado: 💰{" "}
                  {(imovelSelecionado.valorMercado || imovelSelecionado.valorCompra || 0).toFixed(2)}
                </Typography>
                <Typography variant="body2" sx={{ color: "#22c55e", fontWeight: "bold" }}>
                  Você recebe: 💰{" "}
                  {Math.round(
                    (imovelSelecionado.valorMercado ||
                      imovelSelecionado.valorCompra ||
                      0) * (1 - CORRETAGEM) * 100
                  ) / 100}
                </Typography>
                <Typography variant="caption" sx={{ color: "#64748b" }}>
                  💡 Taxa de corretagem: {CORRETAGEM * 100}% · O preço de mercado flutua ±30% a cada 10 minutos.
                </Typography>
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModalVendaOpen(false)} sx={{ color: "#94a3b8" }}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={venderImovel}
            disabled={loading}
            sx={{ bgcolor: "#ef4444", "&:hover": { bgcolor: "#dc2626" } }}
          >
            {loading ? "Processando..." : "Vender"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* MODAL DE EDIÇÃO DE IMÓVEL (MESTRE) */}
      <Dialog
        open={modalEdicaoOpen}
        onClose={() => setModalEdicaoOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { bgcolor: "#0f172a", border: "1px solid #1e293b", borderRadius: 2 } }}
      >
        <DialogTitle sx={{ color: "#3b82f6" }}>
          {imovelEditando ? "✏️ Editar Imóvel" : "➕ Novo Imóvel"}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}>
            <TextField
              label="Nome do Imóvel"
              fullWidth
              size="small"
              value={novoImovel.nome}
              onChange={(e) => setNovoImovel({ ...novoImovel, nome: e.target.value })}
              InputProps={{ sx: { color: "#fff" } }}
              InputLabelProps={{ sx: { color: "#94a3b8" } }}
              sx={{ bgcolor: "#1a1a2e" }}
            />
            <TextField
              label="Descrição"
              fullWidth
              size="small"
              multiline
              rows={2}
              value={novoImovel.descricao}
              onChange={(e) => setNovoImovel({ ...novoImovel, descricao: e.target.value })}
              InputProps={{ sx: { color: "#fff" } }}
              InputLabelProps={{ sx: { color: "#94a3b8" } }}
              sx={{ bgcolor: "#1a1a2e" }}
            />
            <TextField
              label="Cidade"
              fullWidth
              size="small"
              value={novoImovel.cidade}
              onChange={(e) => setNovoImovel({ ...novoImovel, cidade: e.target.value })}
              InputProps={{ sx: { color: "#fff" } }}
              InputLabelProps={{ sx: { color: "#94a3b8" } }}
              sx={{ bgcolor: "#1a1a2e" }}
            />
            <FormControl fullWidth size="small">
              <InputLabel sx={{ color: "#94a3b8" }}>País</InputLabel>
              <Select
                value={novoImovel.pais}
                onChange={(e) => setNovoImovel({ ...novoImovel, pais: e.target.value })}
                sx={{ color: "#fff", bgcolor: "#1a1a2e" }}
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
              <InputLabel sx={{ color: "#94a3b8" }}>Tipo</InputLabel>
              <Select
                value={novoImovel.tipo}
                onChange={(e) => setNovoImovel({ ...novoImovel, tipo: e.target.value })}
                sx={{ color: "#fff", bgcolor: "#1a1a2e" }}
              >
                <MenuItem value="Casa">Casa</MenuItem>
                <MenuItem value="Apartamento">Apartamento</MenuItem>
                <MenuItem value="Comercial">Comercial</MenuItem>
                <MenuItem value="Terreno">Terreno</MenuItem>
                <MenuItem value="Fazenda">Fazenda</MenuItem>
                <MenuItem value="Castelo">Castelo</MenuItem>
                <MenuItem value="Cobertura">Cobertura</MenuItem>
                <MenuItem value="Loft">Loft</MenuItem>
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
                  onChange={(e) =>
                    setNovoImovel({ ...novoImovel, metrosQuadrados: Math.max(1, Number(e.target.value) || 1) })
                  }
                  InputProps={{ sx: { color: "#fff" } }}
                  InputLabelProps={{ sx: { color: "#94a3b8" } }}
                  sx={{ bgcolor: "#1a1a2e" }}
                />
              </Grid>
              <Grid item xs={3}>
                <TextField
                  label="Quartos"
                  fullWidth
                  size="small"
                  type="number"
                  value={novoImovel.quartos}
                  onChange={(e) =>
                    setNovoImovel({ ...novoImovel, quartos: Math.max(0, Number(e.target.value) || 0) })
                  }
                  InputProps={{ sx: { color: "#fff" } }}
                  InputLabelProps={{ sx: { color: "#94a3b8" } }}
                  sx={{ bgcolor: "#1a1a2e" }}
                />
              </Grid>
              <Grid item xs={3}>
                <TextField
                  label="Banheiros"
                  fullWidth
                  size="small"
                  type="number"
                  value={novoImovel.banheiros}
                  onChange={(e) =>
                    setNovoImovel({ ...novoImovel, banheiros: Math.max(0, Number(e.target.value) || 0) })
                  }
                  InputProps={{ sx: { color: "#fff" } }}
                  InputLabelProps={{ sx: { color: "#94a3b8" } }}
                  sx={{ bgcolor: "#1a1a2e" }}
                />
              </Grid>
            </Grid>
            <TextField
              label="Preço de Venda"
              fullWidth
              size="small"
              type="number"
              value={novoImovel.precoVenda}
              onChange={(e) =>
                setNovoImovel({ ...novoImovel, precoVenda: Math.max(0, Number(e.target.value) || 0) })
              }
              InputProps={{ sx: { color: "#fbbf24" }, inputProps: { min: 0, step: 1000 } }}
              InputLabelProps={{ sx: { color: "#94a3b8" } }}
              sx={{ bgcolor: "#1a1a2e" }}
            />
            <TextField
              label="Preço de Aluguel (mensal)"
              fullWidth
              size="small"
              type="number"
              value={novoImovel.precoAluguel}
              onChange={(e) =>
                setNovoImovel({ ...novoImovel, precoAluguel: Math.max(0, Number(e.target.value) || 0) })
              }
              InputProps={{ sx: { color: "#3b82f6" }, inputProps: { min: 0, step: 100 } }}
              InputLabelProps={{ sx: { color: "#94a3b8" } }}
              sx={{ bgcolor: "#1a1a2e" }}
            />
            <FormControl fullWidth size="small">
              <InputLabel sx={{ color: "#94a3b8" }}>Disponível para aluguel?</InputLabel>
              <Select
                value={novoImovel.disponivelAluguel ? "sim" : "nao"}
                onChange={(e) => setNovoImovel({ ...novoImovel, disponivelAluguel: e.target.value === "sim" })}
                sx={{ color: "#fff", bgcolor: "#1a1a2e" }}
              >
                <MenuItem value="sim">🔑 Sim</MenuItem>
                <MenuItem value="nao">🚫 Não</MenuItem>
              </Select>
            </FormControl>

            {/* UPLOAD DE IMAGEM */}
            <Box>
              <Typography variant="caption" sx={{ color: "#94a3b8", display: "block", mb: 1 }}>
                Imagem do Imóvel (opcional — redimensionada automaticamente)
              </Typography>
              {novoImovel.imagem ? (
                <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
                  <Box
                    sx={{
                      width: 120,
                      height: 90,
                      borderRadius: 1,
                      overflow: "hidden",
                      border: "1px solid #334155",
                      flexShrink: 0,
                    }}
                  >
                    <img
                      src={novoImovel.imagem}
                      alt="Preview"
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  </Box>
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                    <Button
                      component="label"
                      size="small"
                      variant="outlined"
                      sx={{ color: "#3b82f6", borderColor: "#3b82f644", fontSize: "0.65rem" }}
                    >
                      Trocar
                      <input
                        type="file"
                        hidden
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          try {
                            const dataUrl = await processarImagemUpload(file);
                            setNovoImovel((prev) => ({ ...prev, imagem: dataUrl }));
                          } catch (err) {
                            console.error(err);
                            alert("Erro ao processar imagem.");
                          }
                        }}
                      />
                    </Button>
                    <Button
                      size="small"
                      onClick={() => setNovoImovel((prev) => ({ ...prev, imagem: "" }))}
                      sx={{ color: "#ef4444", fontSize: "0.65rem" }}
                    >
                      Remover
                    </Button>
                  </Box>
                </Box>
              ) : (
                <Button
                  component="label"
                  variant="outlined"
                  startIcon={<CloudUploadIcon />}
                  size="small"
                  sx={{
                    color: "#3b82f6",
                    borderColor: "#3b82f644",
                    fontSize: "0.7rem",
                    "&:hover": { borderColor: "#3b82f6" },
                  }}
                >
                  Enviar Imagem
                  <input
                    type="file"
                    hidden
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        const dataUrl = await processarImagemUpload(file);
                        setNovoImovel((prev) => ({ ...prev, imagem: dataUrl }));
                      } catch (err) {
                        console.error(err);
                        alert("Erro ao processar imagem.");
                      }
                    }}
                  />
                </Button>
              )}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModalEdicaoOpen(false)} sx={{ color: "#94a3b8" }}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={salvarImovel}
            sx={{ bgcolor: "#3b82f6", "&:hover": { bgcolor: "#2563eb" } }}
          >
            {imovelEditando ? "Salvar Alterações" : "Adicionar Imóvel"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* MODAL DE EDIÇÃO DE IMPOSTO (MESTRE) */}
      <Dialog
        open={modalImpostoOpen}
        onClose={() => setModalImpostoOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { bgcolor: "#0f172a", border: "1px solid #1e293b", borderRadius: 2 } }}
      >
        <DialogTitle sx={{ color: "#3b82f6" }}>
          {impostoEditando ? "✏️ Editar Imposto" : "➕ Novo Imposto"}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}>
            <TextField
              label="Nome do Imposto"
              fullWidth
              size="small"
              value={novoImposto.nome}
              onChange={(e) => setNovoImposto({ ...novoImposto, nome: e.target.value })}
              InputProps={{ sx: { color: "#fff" } }}
              InputLabelProps={{ sx: { color: "#94a3b8" } }}
              sx={{ bgcolor: "#1a1a2e" }}
            />
            <TextField
              label="Descrição"
              fullWidth
              size="small"
              multiline
              rows={2}
              value={novoImposto.descricao}
              onChange={(e) => setNovoImposto({ ...novoImposto, descricao: e.target.value })}
              InputProps={{ sx: { color: "#fff" } }}
              InputLabelProps={{ sx: { color: "#94a3b8" } }}
              sx={{ bgcolor: "#1a1a2e" }}
            />
            <FormControl fullWidth size="small">
              <InputLabel sx={{ color: "#94a3b8" }}>Tipo de Imóvel</InputLabel>
              <Select
                value={novoImposto.tipoImovel}
                onChange={(e) => setNovoImposto({ ...novoImposto, tipoImovel: e.target.value })}
                sx={{ color: "#fff", bgcolor: "#1a1a2e" }}
              >
                <MenuItem value="todos">Todos os tipos</MenuItem>
                {["Casa", "Apartamento", "Comercial", "Terreno", "Fazenda", "Castelo", "Cobertura", "Loft"].map((t) => (
                  <MenuItem key={t} value={t}>{t}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth size="small">
              <InputLabel sx={{ color: "#94a3b8" }}>País</InputLabel>
              <Select
                value={novoImposto.pais}
                onChange={(e) => setNovoImposto({ ...novoImposto, pais: e.target.value })}
                sx={{ color: "#fff", bgcolor: "#1a1a2e" }}
              >
                <MenuItem value="todos">Todos os países</MenuItem>
                {["Império Aurano", "Kratória", "Arcádia", "Vaurana", "Parax", "Varosia", "Burgo", "Narshan", "Dryadalis", "Quark", "Tsar", "Amuras", "Ferglacius"].map((p) => (
                  <MenuItem key={p} value={p}>{p}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Cidade (opcional)"
              fullWidth
              size="small"
              value={novoImposto.cidade}
              onChange={(e) => setNovoImposto({ ...novoImposto, cidade: e.target.value })}
              InputProps={{ sx: { color: "#fff" } }}
              InputLabelProps={{ sx: { color: "#94a3b8" } }}
              helperText="Deixe vazio para valer em qualquer cidade"
              FormHelperTextProps={{ sx: { color: "#64748b" } }}
              sx={{ bgcolor: "#1a1a2e" }}
            />
            <Grid container spacing={1}>
              <Grid item xs={6}>
                <TextField
                  label="Percentual (%)"
                  fullWidth
                  size="small"
                  type="number"
                  value={novoImposto.percentual}
                  onChange={(e) =>
                    setNovoImposto({ ...novoImposto, percentual: Math.max(0, Number(e.target.value) || 0) })
                  }
                  InputProps={{ sx: { color: "#ef4444" }, inputProps: { min: 0, step: 0.1 } }}
                  InputLabelProps={{ sx: { color: "#94a3b8" } }}
                  sx={{ bgcolor: "#1a1a2e" }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Valor Fixo (opcional)"
                  fullWidth
                  size="small"
                  type="number"
                  value={novoImposto.valorFixo}
                  onChange={(e) =>
                    setNovoImposto({ ...novoImposto, valorFixo: Math.max(0, Number(e.target.value) || 0) })
                  }
                  InputProps={{ sx: { color: "#fbbf24" }, inputProps: { min: 0, step: 10 } }}
                  InputLabelProps={{ sx: { color: "#94a3b8" } }}
                  sx={{ bgcolor: "#1a1a2e" }}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModalImpostoOpen(false)} sx={{ color: "#94a3b8" }}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={salvarImposto}
            sx={{ bgcolor: "#3b82f6", "&:hover": { bgcolor: "#2563eb" } }}
          >
            {impostoEditando ? "Salvar Alterações" : "Adicionar Imposto"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default React.memo(ImoveisHUD);
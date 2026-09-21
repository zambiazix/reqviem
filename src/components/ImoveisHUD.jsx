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
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
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

const gerarIdImovel = () =>
  `imv_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

// ==================== CONFIGURAÇÕES DO MERCADO ====================
const MAX_IMOVEIS = 50;
const INTERVALO_GERACAO_MS = 10 * 60 * 1000; // 10 minutos
const INTERVALO_DESCONTO_MS = 24 * 60 * 60 * 1000; // 24h
const DESCONTO_MIN = 0.15; // 15%
const DESCONTO_MAX = 0.25; // 25%
const CHANCE_VENDA_AUTO = 0.0004; // 0.04% por propriedade por minuto (~35% em 24h)
const IDADE_MINIMA_VENDA_MS = 60 * 60 * 1000; // 1h — só vende após 1h no mercado
const TICK_MS = 60 * 1000; // 1 minuto

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

// ==================== LOCAIS PERMITIDOS ====================
// Apenas Império Aurano (todas as cidades) + Capitais de outras nações
const LOCAIS_PERMITIDOS = [
  // ===== IMPÉRIO AURANO =====
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
  // ===== CAPITAIS ESTRANGEIRAS =====
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

// Redimensiona imagem para caber no Firestore (máx 400px, JPEG 70%)
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

// Gera um imóvel aleatório baseado no lore
const gerarImovelAleatorio = () => {
  const local = LOCAIS_PERMITIDOS[Math.floor(Math.random() * LOCAIS_PERMITIDOS.length)];
  const tipoInfo = TIPOS_GERACAO[Math.floor(Math.random() * TIPOS_GERACAO.length)];

  // Variação de preço (-40% a +60%)
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

  // Ref para acessar imóveis dentro dos intervalos sem recriar
  const imoveisRef = useRef(imoveis);
  useEffect(() => {
    imoveisRef.current = imoveis;
  }, [imoveis]);

  // ===== CARREGAR DADOS DO FIRESTORE =====
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
              imv.descontoAtivo === undefined
            ) {
              precisaSalvar = true;
              return {
                ...imv,
                precoOriginal: imv.precoOriginal ?? imv.precoVenda,
                geradoEm: imv.geradoEm ?? Date.now(),
                descontoAtivo: imv.descontoAtivo ?? false,
                descontoPercent: imv.descontoPercent ?? 0,
                emoji: imv.emoji || getEmojiPorTipo(imv.tipo),
              };
            }
            return imv;
          });
          setImoveis(normalized);
          if (precisaSalvar) {
            // Persiste a normalização uma única vez
            setDoc(
              doc(db, "imoveis", "dados"),
              { imoveis: normalized },
              { merge: true }
            ).catch(() => {});
          }
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
          ? carteiras.reduce(
              (acc, item) => ({ ...acc, [item.nome || "default"]: item.valor || 0 }),
              {}
            )
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
    window.addEventListener("jogadorSelecionadoChat", handleEmailSelecionado);
    return () => window.removeEventListener("jogadorSelecionadoChat", handleEmailSelecionado);
  }, []);

  // ===== SALVAR DADOS =====
  const salvarDados = async (novosImoveis) => {
    await setDoc(
      doc(db, "imoveis", "dados"),
      {
        imoveis: novosImoveis || imoveis,
      },
      { merge: true }
    );
  };

  // ===== SALVAR CARTEIRA DO JOGADOR =====
  const salvarCarteiraJogador = async (novasCarteiras, novosImoveis) => {
    const fichaRef = doc(db, "fichas", emailParaCarteira || userEmail);
    const atualizacao = {};
    if (novasCarteiras) atualizacao.carteiras = novasCarteiras;
    if (novosImoveis) atualizacao.imoveis = novosImoveis;
    await setDoc(fichaRef, atualizacao, { merge: true });
  };

  // ==================== TICK DO MERCADO (a cada 1 min) ====================
  // Responsável por:
  //  1. Atualizar descontos (ciclo 24h)
  //  2. Simular vendas/aluguéis automáticos
  //  3. Repor imóveis vendidos
  //  4. Enforçar o limite de MAX_IMOVEIS
  useEffect(() => {
    const tick = async () => {
      const lista = imoveisRef.current;
      if (!Array.isArray(lista) || lista.length === 0) return;

      const now = Date.now();
      let changed = false;

      // ----- PASSO 1: ATUALIZAR DESCONTOS -----
      let atualizados = lista.map((imv) => {
        // Propriedades do jogador não sofrem desconto
        if (imv.dono) return imv;

        const original = imv.precoOriginal ?? imv.precoVenda;
        const geradoEm = imv.geradoEm ?? now;
        const elapsed = now - geradoEm;
        const cycles = Math.floor(elapsed / INTERVALO_DESCONTO_MS);
        const shouldDiscount = cycles % 2 === 1;

        // Inicializa campos faltantes
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
            emoji: imv.emoji || getEmojiPorTipo(imv.tipo),
          };
        }

        // Aplicar desconto
        if (shouldDiscount && !imv.descontoAtivo) {
          const descPct =
            DESCONTO_MIN + Math.random() * (DESCONTO_MAX - DESCONTO_MIN);
          changed = true;
          return {
            ...imv,
            precoVenda: Math.round(original * (1 - descPct)),
            descontoAtivo: true,
            descontoPercent: Math.round(descPct * 100),
          };
        }

        // Remover desconto (volta ao normal)
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

      // ----- PASSO 2: SIMULAR VENDAS/ALUGUÉIS AUTOMÁTICOS -----
      const vendidos = [];
      atualizados = atualizados.filter((imv) => {
        if (imv.dono) return true; // mantém propriedades de jogadores
        const idade = now - (imv.geradoEm || now);
        if (idade < IDADE_MINIMA_VENDA_MS) return true; // muito novo, deixa quieto

        if (Math.random() < CHANCE_VENDA_AUTO) {
          vendidos.push(imv);
          return false; // remove do mercado (foi "vendido/alugado")
        }
        return true;
      });

      if (vendidos.length > 0) {
        changed = true;
        console.log(
          `🏘️ Mercado: ${vendidos.length} imóvel(is) vendido(s)/alugado(s) automaticamente.`
        );
      }

      // ----- PASSO 3: REPOR VENDIDOS COM NOVOS ALEATÓRIOS -----
      vendidos.forEach(() => {
        atualizados.push(gerarImovelAleatorio());
      });

      // ----- PASSO 4: ENFORÇAR LIMITE MÁXIMO -----
      const disponiveis = atualizados.filter((i) => !i.dono);
      if (disponiveis.length > MAX_IMOVEIS) {
        const disponiveisOrdenados = [...disponiveis].sort(
          (a, b) => (a.geradoEm || 0) - (b.geradoEm || 0)
        );
        const paraRemover = disponiveisOrdenados.slice(
          0,
          disponiveis.length - MAX_IMOVEIS
        );
        const idsRemover = new Set(paraRemover.map((i) => i.id));
        atualizados = atualizados.filter((i) => !idsRemover.has(i.id));
        changed = true;
      }

      // ----- PERSISTE SE MUDOU ALGO -----
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
    // Roda uma vez logo de cara para normalizar/atualizar
    tick();

    return () => clearInterval(intervalId);
  }, []);

  // ==================== GERAÇÃO AUTOMÁTICA (a cada 10 min) ====================
  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      const lista = imoveisRef.current;
      let novos = [...lista];
      const novoImovel = gerarImovelAleatorio();
      novos.push(novoImovel);

      // Se ultrapassar limite, remove o mais antigo disponível
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
        console.log("🏘️ Novo imóvel gerado:", novoImovel.nome, "-", novoImovel.cidade);
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
        descontoAtivo: false,
        descontoPercent: 0,
      };
      delete imovelParaAdicionar.disponivel;

      const novosImoveisJogador = [...imoveisJogador, imovelParaAdicionar];
      setImoveisJogador(novosImoveisJogador);

      const imoveisDisponiveis = imoveis.filter((i) => i.id !== imovelSelecionado.id);
      setImoveis(imoveisDisponiveis);

      await salvarCarteiraJogador(novasCarteiras, novosImoveisJogador);
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

    const valorVenda = Math.round(imovelSelecionado.valorCompra * 0.85);
    const carteiraPadrao = Object.keys(carteiraJogador)[0] || "Bolso";

    setLoading(true);

    try {
      const novasCarteiras = {
        ...carteiraJogador,
        [carteiraPadrao]:
          (carteiraJogador[carteiraPadrao] || 0) + valorVenda,
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
        geradoEm: Date.now(), // reinicia ciclo de desconto
        precoOriginal: imovelSelecionado.precoOriginal ?? imovelSelecionado.precoVenda,
        descontoAtivo: false,
        descontoPercent: 0,
      };
      delete imovelParaMercado.valorCompra;

      const imoveisDisponiveis = [...imoveis, imovelParaMercado];
      setImoveis(imoveisDisponiveis);

      await salvarCarteiraJogador(novasCarteiras, novosImoveisJogador);
      await salvarDados(imoveisDisponiveis);

      setCarteiraJogador(novasCarteiras);
      alert(
        `✅ Venda realizada!\n${imovelSelecionado.nome} por ${valorVenda.toFixed(2)} 💰`
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
      imagem: "",
    });
  };

  const deletarImovel = async (id) => {
    if (!window.confirm("Remover este imóvel?")) return;
    const novosImoveis = imoveis.filter((i) => i.id !== id);
    setImoveis(novosImoveis);
    await salvarDados(novosImoveis);
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

  // ===== CALCULAR TOTAL DA CARTEIRA =====
  const totalCarteira = Object.values(carteiraJogador).reduce(
    (a, b) => a + (typeof b === "number" ? b : 0),
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
          <Chip
            label={`📦 ${imoveis.length} no mercado`}
            size="small"
            sx={{ bgcolor: "#3b82f622", color: "#3b82f6", fontSize: "0.6rem", height: 20 }}
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
            [COMPRAR]
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
            [MEUS BENS]
          </Button>
        </Box>

        {/* ABA COMPRAR */}
        {abaAtiva === "comprar" && (
          <Box>
            {/* Barra de pesquisa e filtros */}
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
                    <MenuItem key={t} value={t}>
                      {t}
                    </MenuItem>
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
                    <MenuItem key={c} value={c}>
                      {c}
                    </MenuItem>
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
                    <MenuItem key={p} value={p}>
                      {p}
                    </MenuItem>
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

            {/* Lista de imóveis */}
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
                  {/* Imagem ou placeholder (emoji) */}
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

                  {/* Informações */}
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
                    </Box>
                    <Typography
                      variant="caption"
                      sx={{ color: "#64748b", display: "block" }}
                    >
                      {imovel.cidade}, {imovel.pais} • {imovel.tipo}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "#64748b" }}>
                      {imovel.metrosQuadrados}m² • {imovel.quartos} quartos •{" "}
                      {imovel.banheiros} banheiros
                    </Typography>
                  </Box>

                  {/* Preços e ações */}
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
                          sx={{
                            color: "#64748b",
                            textDecoration: "line-through",
                            display: "block",
                          }}
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
                        sx={{
                          bgcolor: "#22c55e",
                          "&:hover": { bgcolor: "#16a34a" },
                          fontSize: "0.6rem",
                        }}
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
                                precoVenda:
                                  imovel.precoOriginal ?? imovel.precoVenda,
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
                  const valorAtual =
                    imovel.valorCompra || imovel.precoVenda || 0;
                  const valorMercado =
                    imoveis.find((i) => i.id === imovel.id)?.precoVenda ||
                    valorAtual;
                  const valorizacao =
                    valorAtual > 0
                      ? ((valorMercado - valorAtual) / valorAtual) * 100
                      : 0;

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
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                            }}
                          />
                        ) : (
                          <Typography sx={{ fontSize: "2.5rem", opacity: 0.6 }}>
                            {imovel.emoji || getEmojiPorTipo(imovel.tipo)}
                          </Typography>
                        )}
                      </Box>

                      <Box sx={{ flex: 1, minWidth: 150 }}>
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: "bold", color: "#fff" }}
                        >
                          {imovel.nome}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{ color: "#64748b", display: "block" }}
                        >
                          {imovel.cidade}, {imovel.pais}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{ color: "#64748b" }}
                        >
                          Comprado em: {getDataRPG()}
                        </Typography>
                        <Chip
                          label={imovel.status || "Ocupado"}
                          size="small"
                          sx={{
                            mt: 0.5,
                            bgcolor:
                              imovel.status === "ocupado"
                                ? "#22c55e22"
                                : "#ef444422",
                            color:
                              imovel.status === "ocupado"
                                ? "#22c55e"
                                : "#ef4444",
                            fontSize: "0.5rem",
                            height: 16,
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
                        <Box sx={{ textAlign: "right" }}>
                          <Typography
                            variant="body2"
                            sx={{ color: "#fbbf24", fontWeight: "bold" }}
                          >
                            💰 {valorMercado.toFixed(2)}
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{
                              color: valorizacao >= 0 ? "#22c55e" : "#ef4444",
                            }}
                          >
                            {valorizacao >= 0 ? "📈" : "📉"}{" "}
                            {Math.abs(valorizacao).toFixed(1)}%
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{ color: "#64748b", display: "block" }}
                          >
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
      </Box>

      {/* MODAL DE COMPRA */}
      <Dialog
        open={modalCompraOpen}
        onClose={() => setModalCompraOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { bgcolor: "#0f172a", border: "1px solid #1e293b", borderRadius: 2 },
        }}
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
                    <Typography
                      variant="body2"
                      sx={{ color: "#64748b", textDecoration: "line-through" }}
                    >
                      💰 {imovelSelecionado.precoOriginal.toFixed(2)}
                    </Typography>
                    <Chip
                      label={`-${imovelSelecionado.descontoPercent}%`}
                      size="small"
                      sx={{
                        bgcolor: "#ef444422",
                        color: "#ef4444",
                        fontSize: "0.65rem",
                        fontWeight: "bold",
                      }}
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

      {/* MODAL DE VENDA */}
      <Dialog
        open={modalVendaOpen}
        onClose={() => setModalVendaOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { bgcolor: "#0f172a", border: "1px solid #1e293b", borderRadius: 2 },
        }}
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
                  Valor de venda: 💰{" "}
                  {Math.round((imovelSelecionado.valorCompra || 0) * 0.85).toFixed(2)}
                </Typography>
                <Typography variant="caption" sx={{ color: "#64748b" }}>
                  💡 Taxa de corretagem: 15% (inclusa no valor)
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

      {/* MODAL DE EDIÇÃO DE IMÓVEL */}
      <Dialog
        open={modalEdicaoOpen}
        onClose={() => setModalEdicaoOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { bgcolor: "#0f172a", border: "1px solid #1e293b", borderRadius: 2 },
        }}
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
              onChange={(e) =>
                setNovoImovel({ ...novoImovel, nome: e.target.value })
              }
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
              onChange={(e) =>
                setNovoImovel({ ...novoImovel, descricao: e.target.value })
              }
              InputProps={{ sx: { color: "#fff" } }}
              InputLabelProps={{ sx: { color: "#94a3b8" } }}
              sx={{ bgcolor: "#1a1a2e" }}
            />
            <TextField
              label="Cidade"
              fullWidth
              size="small"
              value={novoImovel.cidade}
              onChange={(e) =>
                setNovoImovel({ ...novoImovel, cidade: e.target.value })
              }
              InputProps={{ sx: { color: "#fff" } }}
              InputLabelProps={{ sx: { color: "#94a3b8" } }}
              sx={{ bgcolor: "#1a1a2e" }}
            />
            <FormControl fullWidth size="small">
              <InputLabel sx={{ color: "#94a3b8" }}>País</InputLabel>
              <Select
                value={novoImovel.pais}
                onChange={(e) =>
                  setNovoImovel({ ...novoImovel, pais: e.target.value })
                }
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
                onChange={(e) =>
                  setNovoImovel({ ...novoImovel, tipo: e.target.value })
                }
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
                    setNovoImovel({
                      ...novoImovel,
                      metrosQuadrados: Math.max(1, Number(e.target.value) || 1),
                    })
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
                    setNovoImovel({
                      ...novoImovel,
                      quartos: Math.max(0, Number(e.target.value) || 0),
                    })
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
                    setNovoImovel({
                      ...novoImovel,
                      banheiros: Math.max(0, Number(e.target.value) || 0),
                    })
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
                setNovoImovel({
                  ...novoImovel,
                  precoVenda: Math.max(0, Number(e.target.value) || 0),
                })
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
                setNovoImovel({
                  ...novoImovel,
                  precoAluguel: Math.max(0, Number(e.target.value) || 0),
                })
              }
              InputProps={{ sx: { color: "#94a3b8" }, inputProps: { min: 0, step: 100 } }}
              InputLabelProps={{ sx: { color: "#94a3b8" } }}
              sx={{ bgcolor: "#1a1a2e" }}
            />

            {/* UPLOAD DE IMAGEM DO DISPOSITIVO */}
            <Box>
              <Typography
                variant="caption"
                sx={{ color: "#94a3b8", display: "block", mb: 1 }}
              >
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
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  </Box>
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                    <Button
                      component="label"
                      size="small"
                      variant="outlined"
                      sx={{
                        color: "#3b82f6",
                        borderColor: "#3b82f644",
                        fontSize: "0.65rem",
                      }}
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
                            setNovoImovel((prev) => ({
                              ...prev,
                              imagem: dataUrl,
                            }));
                          } catch (err) {
                            console.error(err);
                            alert("Erro ao processar imagem.");
                          }
                        }}
                      />
                    </Button>
                    <Button
                      size="small"
                      onClick={() =>
                        setNovoImovel((prev) => ({ ...prev, imagem: "" }))
                      }
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
              <Typography
                variant="caption"
                sx={{ color: "#475569", display: "block", mt: 0.5, fontSize: "0.6rem" }}
              >
                💡 Dica: se não enviar imagem, o imóvel usa um emoji automático.
              </Typography>
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
    </Box>
  );
}

export default React.memo(ImoveisHUD);
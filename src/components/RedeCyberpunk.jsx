import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
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
  Badge,
  Tooltip,
  Card,
  CardContent,
  CardActions,
  Avatar,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import EditIcon from "@mui/icons-material/Edit";
import PublicIcon from "@mui/icons-material/Public";
import NewspaperIcon from "@mui/icons-material/Newspaper";
import SecurityIcon from "@mui/icons-material/Security";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import HomeIcon from "@mui/icons-material/Home";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import BusinessIcon from "@mui/icons-material/Business";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import CasinoIcon from "@mui/icons-material/Casino";
import BolsaValores from "./BolsaValores";
import { db } from "../firebaseConfig";
import { doc, setDoc, onSnapshot, getDoc } from "firebase/firestore";
import ImoveisHUD from "./ImoveisHUD";
import HackeamentoGame from "./HackeamentoGame";

// ==================== ESTILOS MATRIX ====================
const matrixStyles = {
  fontFamily: "'Courier New', monospace",
  bgGradient: "linear-gradient(180deg, #0a0a0a 0%, #0d1f0d 50%, #0a0a0a 100%)",
  borderGlow: "1px solid rgba(16,185,129,0.3)",
  textGlow: "0 0 10px rgba(16,185,129,0.5), 0 0 20px rgba(16,185,129,0.2)",
  cardBg: "rgba(13,31,13,0.8)",
  colorPrimary: "#10b981",
  colorSecondary: "#0f5",
  colorDim: "#0a3",
};
// ==================== IMAGEM PADRÃO PARA NOTÍCIAS ====================
const IMAGEM_NOTICIA_PADRAO = `data:image/svg+xml,${encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="400" height="200">
    <rect width="400" height="200" fill="#0a0a0a"/>
    <rect x="10" y="10" width="380" height="180" rx="8" fill="#0d1f0d" stroke="#10b981" stroke-width="2"/>
    <text x="200" y="70" text-anchor="middle" fill="#10b981" font-family="Courier New, monospace" font-size="18" font-weight="bold">⬡ NOTÍCIA</text>
    <text x="200" y="100" text-anchor="middle" fill="#0f5" font-family="Courier New, monospace" font-size="14">RÉQUIEM</text>
    <text x="200" y="130" text-anchor="middle" fill="#0a3" font-family="Courier New, monospace" font-size="12">REDE NEURAL</text>
  </svg>
`)}`;

// ==================== NOTÍCIAS PADRÃO ====================
const NOTICIAS_PADRAO = [
  { titulo: "Nova tecnologia de implantes revoluciona o mercado", subtitulo: "Nos últimos dias, os laboratórios de Nexa apresentaram avanços que prometem mudar a forma como interagimos com a Aura. Especialistas apontam que os próximos meses serão decisivos para o setor.", categoria: "Tecnologia" },
  { titulo: "Produção de Obsidiana atinge recorde histórico", subtitulo: "As minas de Sideris anunciaram que a extração deste mês superou todas as expectativas, consolidando o Império como líder no fornecimento do mineral.", categoria: "Economia" },
  { titulo: "Cientistas descobrem nova aplicação para Pyridium", subtitulo: "Pesquisadores do Instituto de Thalassa revelaram que o cristal pode ser usado de formas nunca antes imaginadas. O anúncio aconteceu ontem e já movimenta o mercado.", categoria: "Ciência" },
  { titulo: "Senado debate novas leis de regulamentação Aurana", subtitulo: "A sessão de hoje promete ser longa. Os senadores discutem medidas que podem afetar diretamente a vida de todos os cidadãos do Império.", categoria: "Política" },
  { titulo: "Tensões comerciais entre Império e Kratória aumentam", subtitulo: "Nas últimas semanas, as relações entre as duas nações se deterioraram. Comerciantes temem que a situação piore antes do próximo ciclo.", categoria: "Política" },
];

// ==================== APPS INICIAIS ====================
const APPS_INICIAIS = [
  { id: "noticias", titulo: "📰 Notícias", descricao: "Últimas notícias do mundo", cor: "#10b981" },
  { id: "hackeamento", titulo: "💻 Hackeamento", descricao: "Mini-game de invasão", cor: "#ef4444" },
  { id: "bolsa", titulo: "📈 Bolsa de Valores", descricao: "Compre e venda ações", cor: "#fbbf24" },
  { id: "imoveis", titulo: "🏠 Imóveis", descricao: "Compre casas e apartamentos", cor: "#3b82f6" },
  { id: "clandestina", titulo: "🌑 Redes Clandestinas", descricao: "Deep Web - Acesso restrito", cor: "#8b5cf6" },
  { id: "servicos", titulo: "⭐ Serviços Especiais", descricao: "Segurança, eventos, luxo", cor: "#f472b6" },
];

// ==================== TEMPLATES DE NOTÍCIAS ====================
const TEMPLATES_NOTICIAS = [
  // ===== IMPÉRIO AURANO =====
  { 
    titulo: "👑 IMPERADOR DECRETA EXPANSÃO DA FROTA IMPERIAL",
    subtitulo: "Em discurso histórico no Senado Aurano, Jax Doflamingo, o Passada Eterna, declarou que 'a Pax Aurana será garantida pela força bruta, não pela diplomacia'. A nova frota de zepelins de guerra, construída com Obsidiana de Grau Militar das minas de Sideris, terá 50 navios e estará operacional em 882 D.C. Críticos apontam que a medida é uma resposta direta às tensões com Kratória.",
    categoria: "⚔️ Política Militar",
  },
  { 
    titulo: "🔍 CAÇADORES CAPTURAM FUNDADOR RENEGADO EM SIDERIS",
    subtitulo: "Após semanas de perseguição implacável, o Caçador Kael Thorne e sua equipe capturaram Kael Vex, um Fundador cujas criaturas de Aura devastaram três vilarejos na região central do Império. Testemunhas relatam que as criaturas eram descritas como 'bestas de sombras' que atacavam ao anoitecer. Vex será julgado no Tribunal de Auraxia.",
    categoria: "🛡️ Segurança",
  },
  { 
    titulo: "📜 SENADOR É FLAGRADO EM ESCÂNDALO DE TRÁFICO DE AURITA",
    subtitulo: "Documentos vazados revelam que o senador Aldric Voss, da facção Pró-Pax, negociou secretamente com contrabandistas de Ferglacius para desviar carregamentos de Aurita para o mercado negro de Kratória. O Imperador Jax Doflamingo prometeu 'punição exemplar' e abriu investigação formal. A Casa Voss nega todas as acusações.",
    categoria: "🏛️ Política",
  },
  { 
    titulo: "🏙️ AURAXIA ATINGE 1 MILHÃO DE HABITANTES",
    subtitulo: "A metrópole imperial consolidou-se como a maior cidade do mundo, com 1.001.983 residentes oficiais. O crescimento trouxe desafios: superlotação nos distritos operários, aumento de 30% na criminalidade nos últimos dois anos e tensões crescentes entre Auranos e não-Auranos. O Senado já debate medidas de contenção.",
    categoria: "📊 Social",
  },
  { 
    titulo: "⚡ NOVA TECNOLOGIA DE IMPLANTES NEURAIS É APRESENTADA EM NEXA",
    subtitulo: "A corporação NexaVolt revelou o protótipo do 'Implante Sétima Geração', que promete aumentar a capacidade de processamento neural em 400%. Especialistas alertam para riscos de dependência cibernética, mas o mercado já projeta lucros bilionários. O lançamento comercial está previsto para 880 D.C.",
    categoria: "💻 Tecnologia",
  },
  
  // ===== KRATÓRIA =====
  { 
    titulo: "⚔️ REI KYLLIAN FERNSBY IV MOBILIZA TROPAS NA FRONTEIRA COM VAROSIA",
    subtitulo: "Em um movimento que aumenta as tensões regionais, o Reino de Kratória mobilizou 50.000 soldados na fronteira norte. Fontes do palácio indicam que a medida é uma resposta à 'interferência Aurana' na região. Varosia já convocou uma reunião de emergência do Conselho dos Clãs.",
    categoria: "⚔️ Militar",
  },
  { 
    titulo: "🔨 FORJAS DE GUME PRODUZEM NOVA LIGA DE OBSIDIANA",
    subtitulo: "Os mestres ferreiros de Gume anunciaram a criação de uma liga de Obsidiana e Adamantina que, segundo testes, é 70% mais resistente que o aço tradicional. A tecnologia, mantida em segredo, pode redefinir a indústria bélica mundial. O Império Aurano já manifestou interesse em adquirir os direitos de produção.",
    categoria: "🏭 Indústria",
  },
  { 
    titulo: "💀 CRISE DE FOME ATINGE CINZAS: MILHARES AMEAÇADOS",
    subtitulo: "A cidade mineira de Cinzas, no extremo sul de Kratória, enfrenta a pior crise alimentar em décadas. A seca que assola a região há três anos devastou as colheitas, e o governo local acusa o Império Aurano de bloquear as rotas de suprimentos. Organizações humanitárias pedem intervenção internacional.",
    categoria: "⚠️ Emergência",
  },
  
  // ===== FERGLACIUS =====
  { 
    titulo: "❄️ GLACIAIS REPELEM EXPEDIÇÃO DA CORPORAÇÃO HOLLOW",
    subtitulo: "Uma expedição de mineração da Corporação Hollow foi expulsa dos Picos do Céu após confronto com guerreiros do Clã Kael. O líder Draven Kael declarou que 'as montanhas sagradas não serão profanadas por máquinas' e que qualquer nova tentativa será respondida com força letal. A Corporação Hollow não comentou o incidente.",
    categoria: "⚔️ Conflito",
    
  },
  { 
    titulo: "🔥 SIV HROTHGAR CONVOCA CONSELHO DE GUERRA DOS CLÃS",
    subtitulo: "A líder dos Ferglanos convocou uma reunião de emergência de todos os clãs de Ferglacius para discutir a 'ameaça crescente do sul'. Fontes indicam que o assunto principal é a expansão da influência Aurana na região. Analistas temem que o encontro possa levar a uma escalada militar.",
    categoria: "⚔️ Política",
    
  },
  
  // ===== PARAX =====
  { 
    titulo: "💊 PARAX DESENVOLVE NOVA CURA PARA DOENÇA RARA",
    subtitulo: "Os laboratórios de Thalassa anunciaram uma descoberta revolucionária: um composto derivado de algas das fossas de Nadir que cura a 'Síndrome do Despertar Instável', condição que afeta Auranos recém-despertos. A cura já está em fase de testes clínicos e pode salvar milhares de vidas.",
    categoria: "🧬 Ciência",
    
  },
  { 
    titulo: "💧 CRISE HÍDRICA EM SALARIA: USINAS DE DESSALINIZAÇÃO SOFREM SABOTAGEM",
    subtitulo: "Um ataque coordenado danificou três das principais usinas de dessalinização de Salaria, deixando mais de 500.000 pessoas sem água potável. A Família Marcone é apontada como suspeita, mas nega envolvimento. O Senado de Vidro declarou estado de emergência.",
    categoria: "⚠️ Emergência",
    
  },
  { 
    titulo: "🔬 CIENTISTAS DE PARAX SINTETIZAM PYRIDIUM EM LABORATÓRIO",
    subtitulo: "Em uma descoberta que pode redefinir o equilíbrio energético mundial, pesquisadores do Instituto de Tecnologia de Thalassa conseguiram sintetizar Pyridium em laboratório. O processo ainda é caro e ineficiente, mas abre caminho para a independência energética de nações que não possuem jazidas naturais.",
    categoria: "💻 Tecnologia",
    
  },
  
  // ===== VAROSIA =====
  { 
    titulo: "🌳 ÁRVORE VONDARIS FLORESCE APÓS DÉCADAS DE ESTIAGEM",
    subtitulo: "A Árvore Vondaris, símbolo espiritual de Varosia, floresceu pela primeira vez em 45 anos. Os sacerdotes dos Herbenos interpretam o evento como um 'presságio divino' e convocaram peregrinos de todo o país para celebrar. Cientistas de Eco estudam o fenômeno, mas não encontraram explicação natural.",
    categoria: "🌿 Espiritualidade",
    
  },
  { 
    titulo: "⚖️ CONSELHO DOS CLÃS DECIDE SOBRE SUCESSÃO DOS SAWSKY",
    subtitulo: "Os seis clãs restantes de Varosia se reuniram em Vondaris para discutir o futuro do trono após o quase-extermínio do Clã Sawsky na Cerimônia de Fogo. A decisão deve ser anunciada nos próximos dias, mas fontes indicam que a disputa entre conservadores e progressistas está mais acirrada do que nunca.",
    categoria: "🏛️ Política",
    
  },
  
  // ===== BURGO =====
  { 
    titulo: "🏭 BURGO ANUNCIA EXPANSÃO INDUSTRIAL COM INVESTIMENTOS AURANOS",
    subtitulo: "O Reino Burgo recebeu um investimento recorde de 50 milhões de Créditos Auranos para expandir suas fábricas de aço e têxteis. O acordo, celebrado em Burguia, foi visto como um fortalecimento da aliança com o Império, mas gerou protestos de facções descontentes que veem a influência Aurana como uma ameaça à soberania.",
    categoria: "📊 Economia",
    
  },
  { 
    titulo: "🍺 FESTIVAL DA CERVEJA DE LOTHARSBERG ATRAI MILHARES",
    subtitulo: "O tradicional festival anual da cerveja em Lotharsberg superou todas as expectativas, atraindo mais de 50.000 visitantes de todo o continente. As 12 cervejarias da Casa Lothar apresentaram receitas exclusivas, e a 'Cerveja do Dragão' foi eleita a melhor do evento.",
    categoria: "🎉 Cultura",
    
  },
  
  // ===== DRYADALIS =====
  { 
    titulo: "📚 ACADEMIA DE DRYADALIS DECIFRA TEXTO PRÉ-REQVIEM",
    subtitulo: "Estudiosos da Cátedra de Aura decifraram um texto pré-Reqviem encontrado nas ruínas de uma antiga biblioteca. O documento descreve técnicas de manipulação de Aura que, segundo os pesquisadores, 'eram consideradas perdidas'. O Rei Thalion Valenwood autorizou a continuação das pesquisas.",
    categoria: "🧬 Ciência",
    
  },
  
  // ===== NARSHAN =====
  { 
    titulo: "💰 NARSHAN ANUNCIA DESCOBERTA DE NOVA JAZIDA DE OURO",
    subtitulo: "Exploradores do Reino de Narshan encontraram uma das maiores jazidas de ouro já registradas, a 50 quilômetros de Aurópolis. A descoberta pode aumentar a produção anual do país em 15%, consolidando ainda mais sua posição como o maior exportador de ouro do mundo.",
    categoria: "📊 Economia",
    
  },
  
  // ===== QUARK =====
  { 
    titulo: "⛏️ QUARK EXTRAI ADAMANTINA EM QUANTIDADE RECORDE",
    subtitulo: "As minas de Ferrus Secundus produziram 500 toneladas de Adamantina no último trimestre, um recorde histórico. O metal, que rivaliza com a Obsidiana em resistência, é usado na fabricação de armas e componentes de cibernética. A demanda internacional já está em alta.",
    categoria: "🏭 Indústria",
    
  },
  
  // ===== ILHA HOLLOW =====
  { 
    titulo: "💻 AGATHA D'HOLLOW ANUNCIA NOVO IMPLANTE DE QUINTA GERAÇÃO",
    subtitulo: "Em um evento exclusivo em Fawkes, a CEO da Corporação Hollow apresentou o 'Implante Neural Modelo Phoenix', que promete comunicação instantânea e processamento de dados 10 vezes mais rápido que os modelos atuais. O dispositivo já está em pré-venda para clientes selecionados.",
    categoria: "💻 Tecnologia",
    
  },
  { 
    titulo: "🛡️ EXÉRCITO PRIVADO HOLLOW É MOBILIZADO EM FERG­LACIUS",
    subtitulo: "Imagens de satélite mostram o movimento de tropas da Corporação Hollow na fronteira com Ferglacius, dias após a expulsão da expedição de mineração. A corporação afirma que as tropas são para 'proteção de ativos', mas analistas temem uma escalada do conflito.",
    categoria: "⚔️ Militar",
    
  },
  
  // ===== TERRAS BALDIAS =====
  { 
    titulo: "🏜️ SENHOR DA GUERRA DE KAEL'DRAK DECLARA GUERRA A TOR'ZHAN",
    subtitulo: "O conflito entre as duas maiores cidades livres das Terras Baldias se intensificou após o assassinato de um emissário de Kael'Drak. Milhares de combatentes já estão mobilizados, e comerciantes temem o bloqueio das rotas de contrabando que cruzam o Deserto de Cinzas.",
    categoria: "⚔️ Conflito",
    
  },
];

// ==================== COMPONENTE PRINCIPAL ====================
function RedeCyberpunk({ isMaster, onClose, userEmail = null, fichasMap = {} }) {
  // ===== ESTADOS DA JANELA =====
  const [posicao, setPosicao] = useState({ x: 200, y: 100 });
  const [tamanho, setTamanho] = useState({ width: 750, height: 600 });
  const [minimizado, setMinimizado] = useState(false);
  const [arrastando, setArrastando] = useState(false);
  const [redimensionando, setRedimensionando] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const resizeStartRef = useRef({ x: 0, y: 0, width: 0, height: 0 });
  
  // ===== ESTADOS DE CONTEÚDO =====
  const [editando, setEditando] = useState(false);
  const [noticias, setNoticias] = useState(NOTICIAS_PADRAO);
  const [abaAtiva, setAbaAtiva] = useState("principal");
  const [links, setLinks] = useState([
    { id: 1, titulo: "Portal Hollow", url: "#", descricao: "Acesso corporativo nível 3" },
    { id: 2, titulo: "Mercado Negro", url: "#", descricao: "Itens não rastreáveis" },
    { id: 3, titulo: "Biblioteca Arcana", url: "#", descricao: "Grimórios e tomos antigos" },
  ]);
  
  // ===== APPS/SITES =====
  const [apps, setApps] = useState(APPS_INICIAIS);
  
  // ===== NOTÍCIAS =====
  const [ultimaNoticia, setUltimaNoticia] = useState(null);
  const [noticiaAberta, setNoticiaAberta] = useState(null);
    // 🟢 NOVO: Notícias com timestamp e histórico
  const [noticiasHistoricas, setNoticiasHistoricas] = useState([]);
  const [abaNoticias, setAbaNoticias] = useState("ativas"); // "ativas" | "historico"
  const [empresasBolsa, setEmpresasBolsa] = useState([]);
  const [noticiaEditando, setNoticiaEditando] = useState(null);
  const [modalNoticiaOpen, setModalNoticiaOpen] = useState(false);
  const [novaNoticiaDados, setNovaNoticiaDados] = useState({
    titulo: "",
    subtitulo: "",
    categoria: "📊 Economia",
    empresasAfetadas: [],
    variacaoPercentual: 0,
    afetarImoveis: false,
    cidadeAlvo: "",
    variacaoImoveis: 0,
  });
  
  // ===== CÓDIGO PESSOAL =====
  const [codigoPessoal, setCodigoPessoal] = useState("");
  
  // ===== LATÊNCIA OSCILANTE =====
  const [latencia, setLatencia] = useState("12");
  
  // ===== SUBSISTEMAS =====
  const [subsistemaAberto, setSubsistemaAberto] = useState(null);
  const [subsistemaMinimizado, setSubsistemaMinimizado] = useState(false);
  const [subsistemaPos, setSubsistemaPos] = useState({ x: 250, y: 150 });
  const [subsistemaSize, setSubsistemaSize] = useState({ width: 600, height: 500 });
  const [arrastandoSub, setArrastandoSub] = useState(false);
  const [redimensionandoSub, setRedimensionandoSub] = useState(false);
  // ===== ESTADOS PARA COMPRA CLANDESTINA E SERVIÇOS =====
const [itemSelecionado, setItemSelecionado] = useState(null);
const [precoItem, setPrecoItem] = useState(0);
const [modalCompraClandestina, setModalCompraClandestina] = useState(false);
const [modalCompraServicos, setModalCompraServicos] = useState(false);
const [carteiraSelecionadaCompra, setCarteiraSelecionadaCompra] = useState("");
const [carteiraJogadorCompra, setCarteiraJogadorCompra] = useState({});
const [emailParaCarteiraCompra, setEmailParaCarteiraCompra] = useState(userEmail);
// Adicione os estados:
const [hackeamentoAberto, setHackeamentoAberto] = useState(false);
const [hackeamentoAlvo, setHackeamentoAlvo] = useState(null);
// ===== OUVIR EMAIL SELECIONADO NO CHAT =====
useEffect(() => {
  const handleEmailSelecionado = (event) => {
    const email = event.detail;
    if (email) {
      console.log('📧 Email selecionado no Chat:', email);
      setEmailParaCarteiraCompra(email);
    }
  };
  window.addEventListener('jogadorSelecionadoChat', handleEmailSelecionado);
  return () => window.removeEventListener('jogadorSelecionadoChat', handleEmailSelecionado);
}, []);
const [totalCarteira, setTotalCarteira] = useState(0);
const [historicoAcessos, setHistoricoAcessos] = useState([]);
  const dragSubRef = useRef({ x: 0, y: 0 });
  const resizeSubRef = useRef({ x: 0, y: 0, width: 0, height: 0 });

// Substitua o useEffect do código pessoal por:
useEffect(() => {
  const gerarCodigo = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let codigo = "";
    for (let i = 0; i < 8; i++) {
      codigo += chars[Math.floor(Math.random() * chars.length)];
    }
    return codigo;
  };
  
  const chaveCodigo = `rede_codigo_pessoal_${userEmail || 'anonimo'}`;
  const codigoSalvo = localStorage.getItem(chaveCodigo);
  if (codigoSalvo) {
    setCodigoPessoal(codigoSalvo);
  } else {
    const novoCodigo = gerarCodigo();
    localStorage.setItem(chaveCodigo, novoCodigo);
    setCodigoPessoal(novoCodigo);
  }
}, [userEmail]);

// ===== CARREGAR CARTEIRA PARA COMPRAS =====
useEffect(() => {
  const emailAtual = emailParaCarteiraCompra || userEmail;
  console.log('🔍 Carregando carteira para:', emailAtual, '| userEmail:', userEmail, '| emailParaCarteiraCompra:', emailParaCarteiraCompra);
  
  if (!emailAtual) {
    setCarteiraJogadorCompra({});
    setTotalCarteira(0);
    return;
  }
  const fichaRef = doc(db, "fichas", emailAtual);
  const unsub = onSnapshot(fichaRef, (snap) => {
    if (snap.exists()) {
      const dados = snap.data();
      console.log('📊 Dados da ficha:', dados);
      const carteiras = dados.carteiras || {};
      const carteirasObj = Array.isArray(carteiras)
        ? carteiras.reduce((acc, item) => ({ ...acc, [item.nome || 'default']: item.valor || 0 }), {})
        : carteiras;
      console.log('💳 Carteiras carregadas:', carteirasObj);
      setCarteiraJogadorCompra(carteirasObj);
      const total = Object.values(carteirasObj).reduce((a, b) => a + (typeof b === 'number' ? b : 0), 0);
      setTotalCarteira(total);
    } else {
      console.log('⚠️ Ficha não encontrada para:', emailAtual);
      setCarteiraJogadorCompra({});
      setTotalCarteira(0);
    }
  });
  return () => unsub();
}, [emailParaCarteiraCompra, userEmail]);

// ===== HISTÓRICO DE ACESSOS =====
useEffect(() => {
  const salvarAcesso = () => {
    if (!subsistemaAberto) return;
    const app = apps.find(a => a.id === subsistemaAberto);
    if (!app) return;
    
    const dataJogo = "Hoje";
    
    const novoAcesso = {
      id: Date.now(),
      appId: app.id,
      titulo: app.titulo,
      data: dataJogo,
      timestamp: new Date().toISOString(),
    };
    
    setHistoricoAcessos(prev => [novoAcesso, ...prev.slice(0, 49)]);
  };
  
  salvarAcesso();
}, [subsistemaAberto]);

  // ===== LATÊNCIA OSCILANTE =====
  useEffect(() => {
    const interval = setInterval(() => {
      const base = 8 + Math.random() * 20;
      setLatencia(base.toFixed(1));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // ===== EFETO MATRIX =====
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      @keyframes matrixRain {
        0% { opacity: 0; transform: translateY(-100%); }
        50% { opacity: 1; }
        100% { opacity: 0; transform: translateY(100vh); }
      }
      @keyframes pulseGlow {
        0%, 100% { box-shadow: 0 0 5px rgba(16,185,129,0.3); }
        50% { box-shadow: 0 0 20px rgba(16,185,129,0.6), 0 0 40px rgba(16,185,129,0.2); }
      }
      @keyframes scanline {
        0% { transform: translateY(-100%); }
        100% { transform: translateY(100%); }
      }
      .matrix-text {
        text-shadow: 0 0 10px rgba(16,185,129,0.5);
      }
      .matrix-glow {
        animation: pulseGlow 2s infinite;
      }
      .scanline {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 2px;
        background: rgba(16,185,129,0.1);
        animation: scanline 4s linear infinite;
        pointer-events: none;
        z-index: 1;
      }
      .card-hover {
        transition: all 0.3s ease;
      }
      .card-hover:hover {
        transform: scale(1.05);
        border-color: #10b981;
        box-shadow: 0 0 30px rgba(16,185,129,0.2);
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  // ===== CARREGAR DADOS DO FIRESTORE =====
  useEffect(() => {
    const ref = doc(db, "rede_cyberpunk", "dados");
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        if (d.noticias) setNoticias(d.noticias);
        if (d.links) setLinks(d.links);
        if (d.apps) setApps(d.apps);
      }
    });
    return () => unsub();
  }, []);
    // 🟢 CARREGAR EMPRESAS DA BOLSA
  useEffect(() => {
    const ref = doc(db, "bolsa_valores", "dados");
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists() && snap.data().empresas) {
        setEmpresasBolsa(snap.data().empresas);
      }
    });
    return () => unsub();
  }, []);

  // ===== SALVAR DADOS =====
  const salvarDados = async (n, l, a) => {
    await setDoc(doc(db, "rede_cyberpunk", "dados"), { 
      noticias: n || noticias, 
      links: l || links,
      apps: a || apps 
    });
  };
// ===== GERAR NOTÍCIA PROCEDURAL =====
const gerarNoticia = (dadosPersonalizados = null) => {
  const agora = Date.now();
  
  // Se veio dados personalizados do modal, usa eles
  if (dadosPersonalizados) {
    const novaNoticia = {
      id: agora,
      titulo: dadosPersonalizados.titulo,
      subtitulo: dadosPersonalizados.subtitulo,
      categoria: dadosPersonalizados.categoria,
      timestamp: agora,
      empresasAfetadas: dadosPersonalizados.empresasAfetadas || [],
      variacaoPercentual: dadosPersonalizados.variacaoPercentual || 0,
      afetarImoveis: dadosPersonalizados.afetarImoveis || false,
      cidadeAlvo: dadosPersonalizados.cidadeAlvo || "",
      variacaoImoveis: dadosPersonalizados.variacaoImoveis || 0,
      imagem: `data:image/svg+xml,${encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="400" height="200">
          <rect width="400" height="200" fill="#0a0a0a"/>
          <rect x="10" y="10" width="380" height="180" rx="8" fill="#0d1f0d" stroke="#10b981" stroke-width="2"/>
          <text x="200" y="80" text-anchor="middle" fill="#10b981" font-family="Courier New, monospace" font-size="14" font-weight="bold">⬡ NOTÍCIA</text>
          <text x="200" y="110" text-anchor="middle" fill="#0f5" font-family="Courier New, monospace" font-size="12">RÉQUIEM</text>
          <text x="200" y="140" text-anchor="middle" fill="#0a3" font-family="Courier New, monospace" font-size="12">REDE NEURAL</text>
        </svg>
      `)}`
    };
    
    setNoticias(prev => [novaNoticia, ...prev]);
    aplicarEfeitosNoticia(novaNoticia);
    salvarDados([novaNoticia, ...noticias]);
    return novaNoticia;
  }
  
  // Notícia procedural aleatória
  const prefixosTempo = ["Na noite de ontem", "Esta manhã", "Há poucas horas", "Durante a madrugada", "No final da tarde de ontem"];
  const tempo = prefixosTempo[Math.floor(Math.random() * prefixosTempo.length)];
  
  const empresasAleatorias = empresasBolsa.length > 0 
    ? [empresasBolsa[Math.floor(Math.random() * empresasBolsa.length)]]
    : [];
  
  const variacao = Math.floor(Math.random() * 30) + 1; // 1-30%
  const positiva = Math.random() > 0.5;
  const direcao = positiva ? "subiram" : "caíram";
  const sinal = positiva ? "+" : "-";
  
  const titulo = `${tempo}, ${empresasAleatorias[0]?.nome || "o mercado"} surpreendeu investidores`;
  const subtitulo = `${tempo}, as ações da ${empresasAleatorias[0]?.nome || "empresa"} ${direcao} ${variacao}% após rumores de mudanças no setor de ${empresasAleatorias[0]?.setor || "tecnologia"}. Analistas da Rede Neural apontam que o movimento pode continuar nos próximos dias. Investidores estão atentos às próximas movimentações do mercado.`;
  
  const novaNoticia = {
    id: agora,
    titulo,
    subtitulo,
    categoria: "📊 Economia",
    timestamp: agora,
    empresasAfetadas: empresasAleatorias.map(e => e.id),
    variacaoPercentual: positiva ? variacao : -variacao,
    afetarImoveis: false,
    cidadeAlvo: "",
    variacaoImoveis: 0,
    imagem: `data:image/svg+xml,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="400" height="200">
        <rect width="400" height="200" fill="#0a0a0a"/>
        <rect x="10" y="10" width="380" height="180" rx="8" fill="#0d1f0d" stroke="#10b981" stroke-width="2"/>
        <text x="200" y="80" text-anchor="middle" fill="#10b981" font-family="Courier New, monospace" font-size="14" font-weight="bold">⬡ NOTÍCIA</text>
        <text x="200" y="110" text-anchor="middle" fill="#0f5" font-family="Courier New, monospace" font-size="12">RÉQUIEM</text>
        <text x="200" y="140" text-anchor="middle" fill="#0a3" font-family="Courier New, monospace" font-size="12">REDE NEURAL</text>
      </svg>
    `)}`
  };
  
  setNoticias(prev => [novaNoticia, ...prev]);
  aplicarEfeitosNoticia(novaNoticia);
  salvarDados([novaNoticia, ...noticias]);
  return novaNoticia;
};

// ===== APLICAR EFEITOS DA NOTÍCIA NA BOLSA E IMÓVEIS =====
const aplicarEfeitosNoticia = async (noticia) => {
  // Efeitos na Bolsa
  if (noticia.empresasAfetadas && noticia.empresasAfetadas.length > 0 && noticia.variacaoPercentual !== 0) {
    const bolsaRef = doc(db, "bolsa_valores", "dados");
    const bolsaSnap = await getDoc(bolsaRef);
    if (bolsaSnap.exists()) {
      const dados = bolsaSnap.data();
      const empresasAtualizadas = (dados.empresas || []).map(emp => {
        if (noticia.empresasAfetadas.includes(emp.id)) {
          const variacaoDecimal = noticia.variacaoPercentual / 100;
          const novoPreco = Math.max(0.01, emp.preco * (1 + variacaoDecimal));
          return {
            ...emp,
            preco: Math.round(novoPreco * 100) / 100,
            variacao: noticia.variacaoPercentual,
          };
        }
        return emp;
      });
      await setDoc(bolsaRef, { empresas: empresasAtualizadas }, { merge: true });
    }
  }
  
  // Efeitos nos Imóveis
  if (noticia.afetarImoveis && noticia.cidadeAlvo && noticia.variacaoImoveis !== 0) {
    const imoveisRef = doc(db, "imoveis", "dados");
    const imoveisSnap = await getDoc(imoveisRef);
    if (imoveisSnap.exists()) {
      const dados = imoveisSnap.data();
      const imoveisAtualizados = (dados.imoveis || []).map(imv => {
        if (imv.cidade === noticia.cidadeAlvo) {
          const variacaoDecimal = noticia.variacaoImoveis / 100;
          return {
            ...imv,
            precoVenda: Math.round(imv.precoVenda * (1 + variacaoDecimal)),
            precoAluguel: Math.round(imv.precoAluguel * (1 + variacaoDecimal)),
          };
        }
        return imv;
      });
      await setDoc(imoveisRef, { imoveis: imoveisAtualizados }, { merge: true });
    }
  }
};
  // ===== NOTÍCIAS AUTOMÁTICAS (intervalo variável 5-30 minutos) =====
  useEffect(() => {
    let timeoutId = null;
    
    const agendarProximaNoticia = () => {
      // Intervalo aleatório entre 5 e 30 minutos (300000ms a 1800000ms)
      const intervalo = 300000 + Math.random() * 1500000;
      
      timeoutId = setTimeout(() => {
        gerarNoticia();
        agendarProximaNoticia();
      }, intervalo);
    };
    
    agendarProximaNoticia();
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [noticias]);
  // 🟢 LIMPAR NOTÍCIAS EXPIRADAS (mover para histórico após 2h)
  useEffect(() => {
    const interval = setInterval(() => {
      const agora = Date.now();
      const duasHoras = 2 * 60 * 60 * 1000;
      
      setNoticias(prev => {
        const ativas = prev.filter(n => !n.timestamp || (agora - n.timestamp) < duasHoras);
        const expiradas = prev.filter(n => n.timestamp && (agora - n.timestamp) >= duasHoras);
        
        if (expiradas.length > 0) {
          setNoticiasHistoricas(hist => [...expiradas, ...hist].slice(0, 100));
          salvarDados(ativas);
        }
        
        return ativas;
      });
    }, 60000); // Verifica a cada 1 minuto
    
    return () => clearInterval(interval);
  }, []);

  // ===== EVENTOS DE ARRASTAR/REDIMENSIONAR =====
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (arrastando) setPosicao({ x: e.clientX - dragStartRef.current.x, y: e.clientY - dragStartRef.current.y });
      if (redimensionando) setTamanho({ width: Math.max(500, resizeStartRef.current.width + (e.clientX - resizeStartRef.current.x)), height: Math.max(400, resizeStartRef.current.height + (e.clientY - resizeStartRef.current.y)) });
      if (arrastandoSub) setSubsistemaPos({ x: e.clientX - dragSubRef.current.x, y: e.clientY - dragSubRef.current.y });
      if (redimensionandoSub) setSubsistemaSize({ width: Math.max(400, resizeSubRef.current.width + (e.clientX - resizeSubRef.current.x)), height: Math.max(300, resizeSubRef.current.height + (e.clientY - resizeSubRef.current.y)) });
    };
    const handleMouseUp = () => { setArrastando(false); setRedimensionando(false); setArrastandoSub(false); setRedimensionandoSub(false); };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => { window.removeEventListener("mousemove", handleMouseMove); window.removeEventListener("mouseup", handleMouseUp); };
  }, [arrastando, redimensionando, arrastandoSub, redimensionandoSub]);

  // ===== ABRIR SUBSISTEMA =====
  const abrirSubsistema = (appId) => {
    setSubsistemaAberto(appId);
    setSubsistemaMinimizado(false);
  };

  // ===== ABRIR NOTÍCIA COMPLETA =====
  const abrirNoticia = (noticia) => {
    setNoticiaAberta(noticia);
  };

  // ===== RENDER SUBSISTEMA =====
  const renderSubsistema = () => {
    if (!subsistemaAberto) return null;
    
    const app = apps.find(a => a.id === subsistemaAberto);
    if (!app) return null;

    let conteudo = null;
    
    switch (subsistemaAberto) {
      case "noticias":
        conteudo = (
          <Box sx={{ p: 2, overflowY: "auto", flex: 1 }}>
            <Typography variant="h6" sx={{ color: matrixStyles.colorPrimary, mb: 2, fontFamily: "'Courier New', monospace" }}>
              📰 FEED_NOTICIAS.exe
            </Typography>
            
            {/* 🟢 ABAS ATIVAS/HISTÓRICO */}
            <Box sx={{ display: "flex", gap: 0.5, mb: 2 }}>
              <Button size="small" onClick={() => setAbaNoticias("ativas")}
                sx={{ color: abaNoticias === "ativas" ? "#10b981" : "#0f5", fontSize: "0.65rem", bgcolor: abaNoticias === "ativas" ? "#10b98122" : "transparent" }}>
                [ATIVAS ({noticias.length})]
              </Button>
              <Button size="small" onClick={() => setAbaNoticias("historico")}
                sx={{ color: abaNoticias === "historico" ? "#10b981" : "#0f5", fontSize: "0.65rem", bgcolor: abaNoticias === "historico" ? "#10b98122" : "transparent" }}>
                [HISTÓRICO ({noticiasHistoricas.length})]
              </Button>
            </Box>
            
            {abaNoticias === "ativas" && (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {noticias.map((n, i) => (
                  <Paper key={n.id || i} sx={{ p: 1.5, bgcolor: matrixStyles.cardBg, border: matrixStyles.borderGlow, cursor: 'pointer', '&:hover': { borderColor: matrixStyles.colorPrimary }, position: 'relative' }}
                    onClick={() => abrirNoticia(n)}>
                    {isMaster && (
                      <Box sx={{ position: 'absolute', top: 4, right: 4, display: 'flex', gap: 0.3, zIndex: 2 }}>
                        <IconButton size="small" onClick={(e) => { e.stopPropagation(); setNoticiaEditando(n); setNovaNoticiaDados({ titulo: n.titulo, subtitulo: n.subtitulo, categoria: n.categoria, empresasAfetadas: n.empresasAfetadas || [], variacaoPercentual: n.variacaoPercentual || 0, afetarImoveis: n.afetarImoveis || false, cidadeAlvo: n.cidadeAlvo || "", variacaoImoveis: n.variacaoImoveis || 0 }); setModalNoticiaOpen(true); }}
                          sx={{ color: '#ff9800', bgcolor: 'rgba(0,0,0,0.5)', '&:hover': { bgcolor: 'rgba(255,152,0,0.3)' }, width: 24, height: 24 }}>
                          <EditIcon sx={{ fontSize: 14 }} />
                        </IconButton>
                        <IconButton size="small" onClick={(e) => { e.stopPropagation(); apagarNoticia(n.id); }}
                          sx={{ color: '#ef4444', bgcolor: 'rgba(0,0,0,0.5)', '&:hover': { bgcolor: 'rgba(239,68,68,0.3)' }, width: 24, height: 24 }}>
                          <DeleteIcon sx={{ fontSize: 14 }} />
                        </IconButton>
                      </Box>
                    )}
                    <Box sx={{ display: "flex", gap: 1.5 }}>
                      <Box sx={{ width: 120, height: 80, flexShrink: 0, borderRadius: 1, overflow: 'hidden', bgcolor: '#0a0a0a' }}>
                        <img src={n.imagem || `https://picsum.photos/seed/${i}/400/200`} alt={n.titulo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="caption" sx={{ color: matrixStyles.colorPrimary, fontWeight: "bold", fontFamily: "'Courier New', monospace" }}>
                          {n.titulo}
                        </Typography>
                        <Typography variant="caption" sx={{ color: matrixStyles.colorSecondary, display: "block", fontFamily: "'Courier New', monospace" }}>
                          {n.subtitulo?.substring(0, 120)}...
                        </Typography>
                        {n.empresasAfetadas?.length > 0 && (
                          <Typography variant="caption" sx={{ color: '#fbbf24', display: 'block', fontFamily: "'Courier New', monospace" }}>
                            📈 Afeta: {n.empresasAfetadas.map(id => empresasBolsa.find(e => e.id === id)?.sigla || id).join(', ')} ({n.variacaoPercentual > 0 ? '+' : ''}{n.variacaoPercentual}%)
                          </Typography>
                        )}
                        {n.afetarImoveis && n.cidadeAlvo && (
                          <Typography variant="caption" sx={{ color: '#3b82f6', display: 'block', fontFamily: "'Courier New', monospace" }}>
                            🏠 Afeta imóveis em: {n.cidadeAlvo} ({n.variacaoImoveis > 0 ? '+' : ''}{n.variacaoImoveis}%)
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </Paper>
                ))}
                {noticias.length === 0 && (
                  <Typography sx={{ color: '#64748b', textAlign: 'center', py: 4 }}>Nenhuma notícia ativa.</Typography>
                )}
              </Box>
            )}
            
            {abaNoticias === "historico" && (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {noticiasHistoricas.map((n, i) => (
                  <Paper key={n.id || i} sx={{ p: 1.5, bgcolor: "#0d1f0d", border: "1px solid #334155", opacity: 0.7, cursor: 'pointer', '&:hover': { opacity: 1 } }}
                    onClick={() => abrirNoticia(n)}>
                    <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: "bold", fontFamily: "'Courier New', monospace" }}>
                      📰 {n.titulo}
                    </Typography>
<Typography variant="caption" sx={{ color: '#64748b', display: "block", fontFamily: "'Courier New', monospace", fontSize: '0.65rem' }}>
  Publicada anteriormente
</Typography>
                  </Paper>
                ))}
                {noticiasHistoricas.length === 0 && (
                  <Typography sx={{ color: '#64748b', textAlign: 'center', py: 4 }}>Nenhuma notícia no histórico.</Typography>
                )}
              </Box>
            )}
            
            {/* Botões do Mestre */}
            {isMaster && (
              <Box sx={{ display: 'flex', gap: 1, mt: 2, flexWrap: 'wrap' }}>
                <Button size="small" variant="contained" startIcon={<AddIcon />} 
                  onClick={() => { setNoticiaEditando(null); setNovaNoticiaDados({ titulo: "", subtitulo: "", categoria: "📊 Economia", empresasAfetadas: [], variacaoPercentual: 0, afetarImoveis: false, cidadeAlvo: "", variacaoImoveis: 0 }); setModalNoticiaOpen(true); }}
                  sx={{ bgcolor: matrixStyles.colorPrimary, color: '#000', fontWeight: 'bold' }}>
                  + Nova Notícia
                </Button>
                <Button size="small" variant="contained" onClick={gerarNoticia} sx={{ bgcolor: '#1976d2', color: '#fff', fontWeight: 'bold' }}>
                  🎲 Gerar Aleatória
                </Button>
              </Box>
            )}
          </Box>
        );
        break;
        // No case "hackeamento" do renderSubsistema:
case "hackeamento":
  conteudo = (
    <Box sx={{ p: 2, overflowY: "auto", flex: 1 }}>
      <Typography variant="h6" sx={{ color: "#ef4444", mb: 2, fontFamily: "'Courier New', monospace" }}>
        💻 SISTEMA_DE_INVASAO.exe
      </Typography>
      <Typography variant="caption" sx={{ color: "#666", display: "block", mb: 2 }}>
        Selecione um alvo para iniciar a invasão:
      </Typography>
      
      {/* Campo para código do alvo */}
      <TextField
        fullWidth
        size="small"
        placeholder="Digite o código do alvo..."
        value={hackeamentoAlvo?.codigo || ""}
        onChange={(e) => setHackeamentoAlvo({ codigo: e.target.value })}
        InputProps={{ sx: { color: "#fff", fontFamily: "'Courier New', monospace" } }}
        sx={{ mb: 2, "& .MuiOutlinedInput-root": { "& fieldset": { borderColor: "#ef444444" } } }}
      />
      
      {/* Lista de jogadores com seus códigos (visível apenas para o mestre) */}
      {isMaster && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="caption" sx={{ color: "#fbbf24", mb: 1, display: "block" }}>
            🔍 CÓDIGOS DOS JOGADORES (Modo Mestre):
          </Typography>
          {Object.entries(fichasMap).map(([email, data]) => {
            const codigo = localStorage.getItem(`rede_codigo_pessoal_${email}`);
            return (
              <Paper key={email} sx={{ p: 1, mb: 0.5, bgcolor: "#0d1f0d", border: "1px solid #10b98144" }}>
                <Typography variant="caption" sx={{ color: "#0f5" }}>
                  {data.nome || email}: <strong>{codigo || "N/A"}</strong>
                </Typography>
              </Paper>
            );
          })}
        </Box>
      )}
      
      <Button
        fullWidth
        variant="contained"
        onClick={() => {
          if (!hackeamentoAlvo?.codigo) {
            alert("Digite o código do alvo!");
            return;
          }
          
          // Procurar jogador pelo código
          const codigoAlvo = hackeamentoAlvo.codigo.toUpperCase();
          let emailEncontrado = null;
          let nomeEncontrado = null;
          
          Object.entries(fichasMap).forEach(([email, data]) => {
            const codigo = localStorage.getItem(`rede_codigo_pessoal_${email}`);
            if (codigo && codigo.toUpperCase() === codigoAlvo) {
              emailEncontrado = email;
              nomeEncontrado = data.nome || email;
            }
          });
          
          // Fallback: procurar no localStorage
          if (!emailEncontrado) {
            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i);
              if (key.startsWith('rede_codigo_pessoal_')) {
                const email = key.replace('rede_codigo_pessoal_', '');
                const codigo = localStorage.getItem(key);
                if (codigo && codigo.toUpperCase() === codigoAlvo) {
                  emailEncontrado = email;
                  nomeEncontrado = fichasMap[email]?.nome || email;
                  break;
                }
              }
            }
          }
          
          if (!emailEncontrado) {
            alert("Código não encontrado! Verifique o código e tente novamente.");
            return;
          }
          
          if (emailEncontrado === userEmail) {
            alert("Você não pode hackear a si mesmo!");
            return;
          }
          
          setHackeamentoAlvo({
            ...hackeamentoAlvo,
            email: emailEncontrado,
            nome: nomeEncontrado,
          });
          
          setHackeamentoAberto(true);
        }}
        sx={{ bgcolor: "#ef4444", color: "#fff", fontWeight: "bold", "&:hover": { bgcolor: "#dc2626" } }}
      >
        🎯 INICIAR INVASÃO
      </Button>
      
      <Typography variant="caption" sx={{ color: "#ef4444", display: "block", mt: 2, textAlign: "center" }}>
        ⚠️ ATENÇÃO: Invasões são ilegais e podem resultar em retaliação!
      </Typography>
    </Box>
  );
  break;
        
case "clandestina":
  conteudo = (
    <Box sx={{ p: 2, overflowY: "auto", flex: 1, bgcolor: "#0a0a0a" }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Typography variant="h6" sx={{ color: "#ef4444", fontFamily: "'Courier New', monospace", textShadow: "0 0 20px #ef4444" }}>
          🌑 DEEP_WEEP.exe
        </Typography>
        <Chip 
          label={`💰 ${totalCarteira.toFixed(2)}`}
          size="small"
          sx={{ bgcolor: "#fbbf2422", color: "#fbbf24", fontSize: "0.6rem", height: 20 }}
        />
      </Box>
      <Typography variant="caption" sx={{ color: "#666", display: "block", mb: 2, fontFamily: "'Courier New', monospace" }}>
        ⚠️ ACESSO RESTRITO - USO SOB PRÓPRIA RESPONSABILIDADE ⚠️
      </Typography>
      
      {/* Lista de itens clandestinos */}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        {[
          { 
            id: "armas", 
            titulo: "🔫 Arsenal Ilegal", 
            desc: "Armamentos não rastreáveis, munição especial, explosivos artesanais. Qualidade militar sem registro.",
            preco: "500-5.000 💰",
            detalhes: "Fornecedor: 'O Mercador' • Entrega em 24h • Local: Porto Negro"
          },
          { 
            id: "drogas", 
            titulo: "💊 Substâncias Controladas", 
            desc: "Estimulantes sintéticos, alucinógenos de alta pureza, calmantes ilegais. Efeitos intensos e duradouros.",
            preco: "200-2.000 💰",
            detalhes: "Fornecedor: 'Doutor Sombra' • Pureza garantida • Entrega discreta"
          },
          { 
            id: "documentos", 
            titulo: "🆔 Identidades Falsas", 
            desc: "Passaportes, credenciais corporativas, identidades oficiais. Incluem verificação biométrica falsa.",
            preco: "1.000-10.000 💰",
            detalhes: "Fornecedor: 'O Artesão' • 3 níveis de autenticidade • Entrega em 48h"
          },
          { 
            id: "dados", 
            titulo: "💻 Dados Roubados", 
            desc: "Informações confidenciais, segredos corporativos, planos militares, listas de clientes de alto perfil.",
            preco: "5.000-50.000 💰",
            detalhes: "Fornecedor: 'Espectro' • Dados verificados • Atualização diária"
          },
          { 
            id: "acesso", 
            titulo: "🔑 Chaves de Acesso Ilegal", 
            desc: "Códigos de segurança, chaves criptográficas, acessos a sistemas restritos e instalações seguras.",
            preco: "2.000-20.000 💰",
            detalhes: "Fornecedor: 'Porteiro' • Acesso garantido • Suporte técnico incluído"
          },
          { 
            id: "biohacking", 
            titulo: "🧬 Modificações Genéticas", 
            desc: "Aprimoramentos ilegais, edição genética, implantes não regulamentados. Risco alto, recompensa maior.",
            preco: "10.000-100.000 💰",
            detalhes: "Fornecedor: 'O Biomante' • Procedimentos clandestinos • Garantia limitada"
          },
          { 
            id: "info", 
            titulo: "🔍 Informações Privilegiadas", 
            desc: "Segredos de estado, escândalos políticos, localizações de alvos, rotas de contrabando.",
            preco: "3.000-30.000 💰",
            detalhes: "Fornecedor: 'Olho de Vidro' • Informação verificada • Atualização em tempo real"
          },
        ].map((item) => {
          const [min, max] = item.preco.replace('💰', '').trim().split('-').map(v => parseFloat(v.replace(/\D/g, '')) || 0);
          const precoReal = min + Math.random() * (max - min);
          
          return (
            <Paper key={item.id} sx={{ p: 1.5, bgcolor: "#0d0d0d", border: "1px solid #ef444433", '&:hover': { borderColor: "#ef444488" } }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 1 }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" sx={{ color: "#ef4444", fontWeight: "bold", fontFamily: "'Courier New', monospace" }}>
                    {item.titulo}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "#888", display: "block", fontFamily: "'Courier New', monospace" }}>
                    {item.desc}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "#666", display: "block", fontFamily: "'Courier New', monospace", mt: 0.5 }}>
                    {item.detalhes}
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 0.5 }}>
                  <Typography variant="caption" sx={{ color: "#fbbf24", fontFamily: "'Courier New', monospace", fontWeight: "bold" }}>
                    💰 {precoReal.toFixed(2)}
                  </Typography>
                  <Button
                    size="small"
                    variant="contained"
                    onClick={() => {
                      // Abrir modal de compra
                      setItemSelecionado(item);
                      setPrecoItem(precoReal);
                      setModalCompraClandestina(true);
                    }}
                    sx={{ bgcolor: "#ef4444", '&:hover': { bgcolor: "#dc2626" }, fontSize: "0.6rem" }}
                  >
                    Adquirir
                  </Button>
                </Box>
              </Box>
            </Paper>
          );
        })}
      </Box>
    </Box>
  );
  break;
        
case "servicos":
  conteudo = (
    <Box sx={{ p: 2, overflowY: "auto", flex: 1 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Typography variant="h6" sx={{ color: matrixStyles.colorPrimary, fontFamily: "'Courier New', monospace" }}>
          ⭐ SERVICOS_PREMIUM.exe
        </Typography>
        <Chip 
          label={`💰 ${totalCarteira.toFixed(2)}`}
          size="small"
          sx={{ bgcolor: "#fbbf2422", color: "#fbbf24", fontSize: "0.6rem", height: 20 }}
        />
      </Box>
      <Typography variant="caption" sx={{ color: matrixStyles.colorDim, display: "block", mb: 2, fontFamily: "'Courier New', monospace" }}>
        Para clientes selecionados - Elite & Luxo
      </Typography>
      
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        {[
          { 
            id: "seguranca", 
            titulo: "🛡️ Segurança Privada de Elite", 
            desc: "Proteção pessoal 24/7, escolta armada, segurança de eventos VIP, análise de ameaças.",
            preco: "A partir de 10.000 💰",
            detalhes: "Equipe: Ex-Caçadores Auranos • Armamento de ponta • Discrição garantida"
          },
          { 
            id: "eventos", 
            titulo: "🎭 Organização de Eventos de Luxo", 
            desc: "Festas exclusivas, galas, leilões privados, casamentos de elite. Experiência impecável.",
            preco: "A partir de 25.000 💰",
            detalhes: "Equipe: Especialistas em eventos • Localizações secretas • Catering gourmet"
          },
          { 
            id: "transporte", 
            titulo: "🚁 Transporte de Luxo", 
            desc: "Frotas de veículos blindados, helicópteros executivos, iates particulares, aeronaves.",
            preco: "A partir de 5.000 💰",
            detalhes: "Frota: Veículos premium • Pilotos experientes • Rotas personalizadas"
          },
          { 
            id: "consultoria", 
            titulo: "🏛️ Consultoria Política Estratégica", 
            desc: "Assessoria para figuras públicas, lobby, relações governamentais, gestão de crises.",
            preco: "Sob consulta",
            detalhes: "Equipe: Ex-assessores senatoriais • Rede de contatos • Resultados garantidos"
          },
          { 
            id: "inteligencia", 
            titulo: "💼 Inteligência Competitiva", 
            desc: "Análise de mercado, inteligência competitiva, due diligence, investigações corporativas.",
            preco: "A partir de 15.000 💰",
            detalhes: "Equipe: Especialistas em dados • Análise aprofundada • Relatórios confidenciais"
          },
          { 
            id: "arte", 
            titulo: "🎨 Curadoria de Arte e Antiguidades", 
            desc: "Arte rara, antiguidades, coleções exclusivas, restauração, avaliação, aquisição.",
            preco: "Sob consulta",
            detalhes: "Curadores especializados • Peças únicas • Autenticidade garantida"
          },
        ].map((item) => {
          const precoMin = item.preco.includes('Sob consulta') ? 0 : parseFloat(item.preco.replace(/[^\d.]/g, ''));
          const precoReal = precoMin > 0 ? precoMin + Math.random() * precoMin * 2 : 0;
          
          return (
            <Paper key={item.id} sx={{ p: 1.5, bgcolor: matrixStyles.cardBg, border: matrixStyles.borderGlow }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 1 }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" sx={{ color: matrixStyles.colorPrimary, fontWeight: "bold", fontFamily: "'Courier New', monospace" }}>
                    {item.titulo}
                  </Typography>
                  <Typography variant="caption" sx={{ color: matrixStyles.colorSecondary, display: "block", fontFamily: "'Courier New', monospace" }}>
                    {item.desc}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "#666", display: "block", fontFamily: "'Courier New', monospace", mt: 0.5 }}>
                    {item.detalhes}
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 0.5 }}>
                  <Typography variant="caption" sx={{ color: "#fbbf24", fontFamily: "'Courier New', monospace", fontWeight: "bold" }}>
                    {item.preco}
                  </Typography>
                  <Button
                    size="small"
                    variant="contained"
                    onClick={() => {
                      setItemSelecionado(item);
                      setPrecoItem(precoReal);
                      setModalCompraServicos(true);
                    }}
                    sx={{ bgcolor: matrixStyles.colorPrimary, '&:hover': { bgcolor: "#0d9488" }, fontSize: "0.6rem" }}
                  >
                    Contratar
                  </Button>
                </Box>
              </Box>
            </Paper>
          );
        })}
      </Box>
    </Box>
  );
  break;
        
        case "imoveis":
  conteudo = (
    <ImoveisHUD 
      userEmail={userEmail} 
      onClose={() => setSubsistemaAberto(null)} 
      fichasMap={fichasMap}
      isMaster={isMaster}
    />
  );
  break;

case "bolsa":
  // Fecha a Rede e abre a Bolsa separadamente
  setSubsistemaAberto(null);
  window.dispatchEvent(new CustomEvent('abrirBolsaValores'));
  conteudo = null;
  break;
        
      default:
        conteudo = (
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, gap: 2 }}>
            <Typography variant="h2" sx={{ fontSize: "4rem" }}>{app?.titulo?.split(" ")[0] || "🔧"}</Typography>
            <Typography variant="h6" sx={{ color: matrixStyles.colorPrimary, fontFamily: "'Courier New', monospace" }}>
              🚧 EM CONSTRUÇÃO 🚧
            </Typography>
            <Typography variant="caption" sx={{ color: matrixStyles.colorDim, fontFamily: "'Courier New', monospace" }}>
              {app?.descricao || "Aguardando desenvolvimento..."}
            </Typography>
          </Box>
        );
    }
    
    return (
      <Paper
        elevation={10}
        sx={{
          position: "fixed",
          left: subsistemaPos.x,
          top: subsistemaPos.y,
          width: subsistemaMinimizado ? 300 : subsistemaSize.width,
          height: subsistemaMinimizado ? 48 : subsistemaSize.height,
          bgcolor: "#0a0a0a",
          border: `2px solid ${app?.cor || matrixStyles.colorPrimary}`,
          borderRadius: 2,
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: `0 0 30px ${app?.cor || matrixStyles.colorPrimary}33, 0 8px 32px rgba(0,0,0,0.8)`,
          fontFamily: "'Courier New', monospace",
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            p: 1,
            bgcolor: "#0d1f0d",
            cursor: "move",
            minHeight: 40,
            borderBottom: `1px solid ${app?.cor || matrixStyles.colorPrimary}44`,
          }}
          onMouseDown={(e) => {
            if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT') return;
            e.preventDefault();
            setArrastandoSub(true);
            dragSubRef.current = { x: e.clientX - subsistemaPos.x, y: e.clientY - subsistemaPos.y };
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography variant="caption" sx={{ color: app?.cor || matrixStyles.colorPrimary, fontWeight: "bold" }}>
              {subsistemaMinimizado ? `🔽 ${app?.titulo}` : app?.titulo}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 0.5 }}>
            <IconButton size="small" onClick={() => setSubsistemaMinimizado(!subsistemaMinimizado)} sx={{ color: app?.cor || matrixStyles.colorPrimary, p: 0.5 }}>
              {subsistemaMinimizado ? "□" : "−"}
            </IconButton>
            <IconButton size="small" onClick={() => { setSubsistemaAberto(null); setSubsistemaMinimizado(false); }} sx={{ color: app?.cor || matrixStyles.colorPrimary, p: 0.5 }}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>
        
        {!subsistemaMinimizado && conteudo}
        
        {!subsistemaMinimizado && (
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
              setRedimensionandoSub(true);
              resizeSubRef.current = {
                x: e.clientX,
                y: e.clientY,
                width: subsistemaSize.width,
                height: subsistemaSize.height,
              };
            }}
          />
        )}
      </Paper>
    );
  };
// ===== APAGAR NOTÍCIA =====
const apagarNoticia = (id) => {
  if (!window.confirm("Apagar esta notícia?")) return;
  const novas = noticias.filter(n => n.id !== id);
  setNoticias(novas);
  salvarDados(novas);
};

// ===== APAGAR TODAS AS NOTÍCIAS =====
const apagarTodasNoticias = () => {
  if (!window.confirm("⚠️ Apagar TODAS as notícias? Esta ação não pode ser desfeita!")) return;
  setNoticias([]);
  salvarDados([]);
  setUltimaNoticia(null);
};
// ===== MODAL DA NOTÍCIA =====
const renderNoticiaModal = () => {
  if (!noticiaAberta) return null;
  
  return (
    <Dialog
      open={!!noticiaAberta}
      onClose={() => setNoticiaAberta(null)}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: "#0f172a",
          border: "2px solid #10b981",
          borderRadius: 2,
          boxShadow: "0 0 30px rgba(16,185,129,0.3)",
        }
      }}
    >
      <DialogTitle sx={{ color: matrixStyles.colorPrimary, borderBottom: '1px solid #10b98133', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 'bold', fontFamily: "'Courier New', monospace" }}>
            {noticiaAberta.titulo}
          </Typography>
          <Typography variant="caption" sx={{ color: matrixStyles.colorDim, fontFamily: "'Courier New', monospace" }}>
            {noticiaAberta.data} • {noticiaAberta.categoria}
          </Typography>
        </Box>
        <IconButton onClick={() => setNoticiaAberta(null)} sx={{ color: '#94a3b8' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ p: 3 }}>
        {/* Imagem da notícia */}
        <Box sx={{ width: '100%', maxHeight: 300, overflow: 'hidden', borderRadius: 2, mb: 3, bgcolor: '#0a0a0a' }}>
          <img 
            src={noticiaAberta.imagem} 
            alt="Notícia"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </Box>
        
        <Typography variant="h5" sx={{ color: '#fff', fontWeight: 'bold', mb: 2, fontFamily: "'Courier New', monospace" }}>
          {noticiaAberta.titulo.replace(/^[^\s]+\s/, '')}
        </Typography>
        
        <Typography variant="body1" sx={{ color: '#94a3b8', mb: 2, lineHeight: 1.8 }}>
          {noticiaAberta.subtitulo}
        </Typography>
        
        <Typography variant="body2" sx={{ color: '#64748b', lineHeight: 1.8 }}>
          {noticiaAberta.categoria.includes("Emergência") || noticiaAberta.categoria.includes("⚠️") ? (
            <>
              ⚠️ <strong style={{ color: '#ef4444' }}>ALERTA DE EMERGÊNCIA</strong><br/>
              Esta notícia contém informações urgentes. As autoridades recomendam cautela e seguimento das orientações oficiais. A Rede Neural continuará monitorando a situação e fornecerá atualizações conforme disponíveis.
            </>
          ) : (
            <>
              📰 Esta notícia foi fornecida pela <strong style={{ color: matrixStyles.colorPrimary }}>Rede Neural</strong>, o principal veículo de informação do mundo de Réquiem.
              Nossa equipe de jornalistas e correspondentes cobre os acontecimentos mais importantes do Império Aurano e de todas as nações.
              Fique ligado para mais atualizações sobre este e outros acontecimentos.
            </>
          )}
        </Typography>
        
        <Divider sx={{ my: 2, borderColor: '#334155' }} />
<Typography variant="caption" sx={{ color: '#64748b' }}>
  📡 Fonte: Rede Neural
</Typography>
      </DialogContent>
      <DialogActions sx={{ p: 2, borderTop: '1px solid #334155' }}>
        <Button onClick={() => setNoticiaAberta(null)} sx={{ color: '#94a3b8' }}>
          Fechar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

  // ===== RENDER PRINCIPAL =====
  return createPortal(
    <>
      {/* Janela Principal */}
      <Paper
        elevation={10}
        sx={{
          position: "fixed",
          left: posicao.x,
          top: posicao.y,
          width: minimizado ? 300 : tamanho.width,
          height: minimizado ? 48 : tamanho.height,
          bgcolor: "#0a0a0a",
          color: "#0f0",
          borderRadius: 2,
          border: "2px solid #10b981",
          zIndex: 9998,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 0 30px rgba(16,185,129,0.3), 0 8px 32px rgba(0,0,0,0.8)",
          fontFamily: "'Courier New', monospace",
          background: matrixStyles.bgGradient,
        }}
      >
        {/* Scanline */}
        <Box className="scanline" />
        
        {/* Barra de título */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            p: 1,
            bgcolor: "#0d1f0d",
            cursor: "move",
            minHeight: 40,
            borderBottom: "1px solid #10b98144",
          }}
          onMouseDown={(e) => {
            if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT') return;
            e.preventDefault();
            setArrastando(true);
            dragStartRef.current = { x: e.clientX - posicao.x, y: e.clientY - posicao.y };
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <PublicIcon sx={{ color: "#10b981" }} />
            <Typography variant="subtitle2" sx={{ color: "#10b981", fontWeight: "bold", fontFamily: "'Courier New', monospace" }}>
              {minimizado ? "🌐 Rede" : "🌐 REDE // NEURAL.LINK"}
            </Typography>
            {!minimizado && (
              <>
                <Chip
                  label="🔒 CONECTADO"
                  size="small"
                  sx={{ bgcolor: "#10b98122", color: "#10b981", fontSize: "0.5rem", height: 16 }}
                />
                <Chip
                  label={`⏱️ ${latencia}ms`}
                  size="small"
                  sx={{ bgcolor: "#10b98111", color: "#10b981", fontSize: "0.5rem", height: 16 }}
                />
                <Chip
                  label={`🆔 ${codigoPessoal}`}
                  size="small"
                  sx={{ bgcolor: "#10b98111", color: "#10b981", fontSize: "0.5rem", height: 16 }}
                />
              </>
            )}
          </Box>
          <Box sx={{ display: "flex", gap: 0.5 }}>
            {isMaster && (
              <IconButton size="small" onClick={() => setEditando(!editando)} sx={{ color: "#10b981", p: 0.5 }}>
                <EditIcon fontSize="small" />
              </IconButton>
            )}
            <IconButton size="small" onClick={() => setMinimizado(!minimizado)} sx={{ color: "#10b981", p: 0.5 }}>
              {minimizado ? "□" : "−"}
            </IconButton>
            <IconButton size="small" onClick={onClose} sx={{ color: "#10b981", p: 0.5 }}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>

        {/* Conteúdo */}
        {!minimizado && (
          <Box sx={{ flex: 1, display: "flex", flexDirection: "column", p: 1.5, gap: 1, overflowY: "auto", "&::-webkit-scrollbar": { width: "3px" }, "&::-webkit-scrollbar-thumb": { background: "#10b98144", borderRadius: "10px" } }}>
{/* Abas */}
<Box sx={{ display: "flex", gap: 0.5, borderBottom: "1px solid #10b98133", pb: 1, flexWrap: "wrap" }}>
  <Button size="small" onClick={() => setAbaAtiva("principal")}
    sx={{ color: abaAtiva === "principal" ? "#10b981" : "#0f5", fontSize: "0.65rem", fontFamily: "'Courier New', monospace", bgcolor: abaAtiva === "principal" ? "#10b98122" : "transparent", '&:hover': { bgcolor: "#10b98111" } }}>
    [Principal]
  </Button>
  <Button size="small" onClick={() => setAbaAtiva("historico")}
    sx={{ color: abaAtiva === "historico" ? "#10b981" : "#0f5", fontSize: "0.65rem", fontFamily: "'Courier New', monospace", bgcolor: abaAtiva === "historico" ? "#10b98122" : "transparent", '&:hover': { bgcolor: "#10b98111" } }}>
    [Histórico]
  </Button>
</Box>

            {/* Aba Principal - APPS */}
            {abaAtiva === "principal" && (
              <Box sx={{ textAlign: "center", py: 2 }}>
                <Typography variant="h4" sx={{ color: "#10b981", mb: 1, fontFamily: "'Courier New', monospace", textShadow: "0 0 20px #10b981" }}>
                  ⬡ REDE
                </Typography>
                <Typography variant="caption" sx={{ color: "#0a3", fontFamily: "'Courier New', monospace", display: "block", mb: 2 }}>
                  Conexão: SEGURA | Latência: {latencia}ms | 🆔 {codigoPessoal}
                </Typography>
                
                {/* Grid de Apps */}
                <Grid container spacing={1.5} sx={{ mt: 1 }}>
                  {apps.map((app) => (
                    <Grid item xs={6} sm={4} md={3} key={app.id}>
                      <Card
                        className="card-hover"
                        sx={{
                          bgcolor: matrixStyles.cardBg,
                          border: `1px solid ${app.cor}44`,
                          cursor: "pointer",
                          transition: "all 0.3s",
                          '&:hover': {
                            borderColor: app.cor,
                            transform: "scale(1.05)",
                            boxShadow: `0 0 20px ${app.cor}33`,
                          },
                        }}
                        onClick={() => abrirSubsistema(app.id)}
                      >
                        <CardContent sx={{ p: 1.5, textAlign: "center" }}>
                          <Typography variant="h4" sx={{ fontSize: "2rem" }}>
                            {app.titulo.split(" ")[0]}
                          </Typography>
                          <Typography variant="caption" sx={{ color: app.cor, fontWeight: "bold", fontFamily: "'Courier New', monospace", display: "block" }}>
                            {app.titulo.split(" ").slice(1).join(" ")}
                          </Typography>
                          <Typography variant="caption" sx={{ color: matrixStyles.colorDim, fontFamily: "'Courier New', monospace", fontSize: "0.55rem" }}>
                            {app.descricao}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Box>
              
            )}
                {/* 🟢 ABA HISTÓRICO */}
    {abaAtiva === "historico" && (
      <Box sx={{ py: 2 }}>
        <Typography variant="h6" sx={{ color: matrixStyles.colorPrimary, mb: 2, fontFamily: "'Courier New', monospace" }}>
          📜 HISTÓRICO DE NAVEGAÇÃO
        </Typography>
        {historicoAcessos.length === 0 ? (
          <Typography sx={{ color: '#64748b', textAlign: 'center', py: 4 }}>
            Nenhum acesso registrado ainda.
          </Typography>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {historicoAcessos.map((item) => (
              <Paper key={item.id} sx={{ p: 1, bgcolor: matrixStyles.cardBg, border: matrixStyles.borderGlow }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="caption" sx={{ color: '#fff', fontWeight: 'bold' }}>
                      {item.titulo || item.descricao}
                    </Typography>
                    {item.tipo && (
                      <Chip 
                        label={item.tipo === 'transacao_clandestina' ? '🔴 Clandestino' : '⭐ Serviço'}
                        size="small"
                        sx={{ ml: 1, bgcolor: item.tipo === 'transacao_clandestina' ? '#ef444422' : '#10b98122', color: item.tipo === 'transacao_clandestina' ? '#ef4444' : '#10b981', fontSize: '0.5rem', height: 16 }}
                      />
                    )}
                  </Box>
                  <Typography variant="caption" sx={{ color: matrixStyles.colorDim }}>
                    {item.data}
                  </Typography>
                </Box>
              </Paper>
            ))}
          </Box>
        )}
      </Box>
    )}
          </Box>
        )}

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
      </Paper>

      {/* Subsistema */}
      {renderSubsistema()}
      
      {/* Modal da Notícia */}
      {renderNoticiaModal()}
            {/* 🟢 HACKEAMENTO GAME */}
      {hackeamentoAberto && hackeamentoAlvo?.email && (
        <HackeamentoGame
          atacanteEmail={userEmail}
          atacanteNome={fichasMap[userEmail]?.nome || userEmail}
          alvoEmail={hackeamentoAlvo.email}
          alvoNome={hackeamentoAlvo.nome}
          fichasMap={fichasMap}
          onClose={() => {
            setHackeamentoAberto(false);
            setHackeamentoAlvo(null);
          }}
          userEmail={userEmail}
          isMaster={isMaster}
        />
      )}
            {/* 🟢 MODAL DE CRIAÇÃO/EDIÇÃO DE NOTÍCIA */}
      <Dialog open={modalNoticiaOpen} onClose={() => setModalNoticiaOpen(false)} maxWidth="md" fullWidth
        PaperProps={{ sx: { bgcolor: "#0f172a", border: "1px solid #10b981", borderRadius: 2 } }}>
        <DialogTitle sx={{ color: '#10b981', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {noticiaEditando ? "✏️ Editar Notícia" : "📰 Nova Notícia"}
          <IconButton onClick={() => setModalNoticiaOpen(false)} sx={{ color: '#94a3b8' }}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField fullWidth size="small" label="Título" value={novaNoticiaDados.titulo}
              onChange={(e) => setNovaNoticiaDados(prev => ({ ...prev, titulo: e.target.value }))}
              InputProps={{ sx: { color: '#fff' } }} InputLabelProps={{ sx: { color: '#94a3b8' } }} />
            
            <TextField fullWidth size="small" label="Corpo da notícia" multiline rows={3} value={novaNoticiaDados.subtitulo}
              onChange={(e) => setNovaNoticiaDados(prev => ({ ...prev, subtitulo: e.target.value }))}
              InputProps={{ sx: { color: '#fff' } }} InputLabelProps={{ sx: { color: '#94a3b8' } }} />
            
            <FormControl fullWidth size="small">
              <InputLabel sx={{ color: '#94a3b8' }}>Categoria</InputLabel>
              <Select value={novaNoticiaDados.categoria} onChange={(e) => setNovaNoticiaDados(prev => ({ ...prev, categoria: e.target.value }))}
                sx={{ color: '#fff' }} label="Categoria">
                <MenuItem value="📊 Economia">📊 Economia</MenuItem>
                <MenuItem value="🏛️ Política">🏛️ Política</MenuItem>
                <MenuItem value="⚔️ Militar">⚔️ Militar</MenuItem>
                <MenuItem value="💻 Tecnologia">💻 Tecnologia</MenuItem>
                <MenuItem value="🧬 Ciência">🧬 Ciência</MenuItem>
                <MenuItem value="⚠️ Emergência">⚠️ Emergência</MenuItem>
                <MenuItem value="🏙️ Imobiliário">🏙️ Imobiliário</MenuItem>
              </Select>
            </FormControl>
            
            {/* 🟢 SELETOR DE EMPRESAS AFETADAS */}
            <FormControl fullWidth size="small">
              <InputLabel sx={{ color: '#94a3b8' }}>Empresas Afetadas (selecione uma ou mais)</InputLabel>
              <Select multiple value={novaNoticiaDados.empresasAfetadas}
                onChange={(e) => setNovaNoticiaDados(prev => ({ ...prev, empresasAfetadas: e.target.value }))}
                sx={{ color: '#fff' }} label="Empresas Afetadas">
                {empresasBolsa.map(emp => (
                  <MenuItem key={emp.id} value={emp.id}>{emp.sigla} - {emp.nome}</MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <TextField fullWidth size="small" label="Variação % na Bolsa (-99 a +99)" type="number"
              value={novaNoticiaDados.variacaoPercentual}
              onChange={(e) => {
                const val = Math.max(-99, Math.min(99, Number(e.target.value) || 0));
                setNovaNoticiaDados(prev => ({ ...prev, variacaoPercentual: val }));
              }}
              InputProps={{ sx: { color: '#fbbf24' } }} InputLabelProps={{ sx: { color: '#94a3b8' } }}
              helperText="Use negativo para queda, positivo para alta" />
            
            <Divider sx={{ my: 1, borderColor: '#334155' }} />
            
            {/* 🟢 AFETAR IMÓVEIS */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <input type="checkbox" checked={novaNoticiaDados.afetarImoveis}
                onChange={(e) => setNovaNoticiaDados(prev => ({ ...prev, afetarImoveis: e.target.checked }))} />
              <Typography variant="body2" sx={{ color: '#94a3b8' }}>Afetar imóveis</Typography>
            </Box>
            
            {novaNoticiaDados.afetarImoveis && (
              <>
                <TextField fullWidth size="small" label="Cidade alvo (imóveis)" value={novaNoticiaDados.cidadeAlvo}
                  onChange={(e) => setNovaNoticiaDados(prev => ({ ...prev, cidadeAlvo: e.target.value }))}
                  InputProps={{ sx: { color: '#fff' } }} InputLabelProps={{ sx: { color: '#94a3b8' } }}
                  placeholder="Ex: Auraxia, Nexa, Laxeado..." />
                <TextField fullWidth size="small" label="Variação % nos Imóveis" type="number"
                  value={novaNoticiaDados.variacaoImoveis}
                  onChange={(e) => {
                    const val = Math.max(-50, Math.min(50, Number(e.target.value) || 0));
                    setNovaNoticiaDados(prev => ({ ...prev, variacaoImoveis: val }));
                  }}
                  InputProps={{ sx: { color: '#3b82f6' } }} InputLabelProps={{ sx: { color: '#94a3b8' } }} />
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: '1px solid #334155' }}>
          <Button onClick={() => setModalNoticiaOpen(false)} sx={{ color: '#94a3b8' }}>Cancelar</Button>
          <Button variant="contained" onClick={() => { gerarNoticia(novaNoticiaDados); setModalNoticiaOpen(false); }}
            sx={{ bgcolor: '#10b981', color: '#000' }}>
            {noticiaEditando ? "Salvar" : "Publicar"}
          </Button>
        </DialogActions>
      </Dialog>
      {/* 🟢 MODAL DE COMPRA CLANDESTINA */}
      <Dialog open={modalCompraClandestina} onClose={() => setModalCompraClandestina(false)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { bgcolor: "#0f172a", border: "1px solid #1e293b", borderRadius: 2 } }}>
        <DialogTitle sx={{ color: '#ef4444' }}>🌑 Adquirir Serviço Clandestino</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            {itemSelecionado && (
              <>
                <Typography variant="body1" sx={{ color: '#fff', fontWeight: 'bold' }}>
                  {itemSelecionado.titulo}
                </Typography>
                <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                  {itemSelecionado.desc}
                </Typography>
                <Typography variant="body2" sx={{ color: '#fbbf24' }}>
                  Preço: 💰 {precoItem.toFixed(2)}
                </Typography>
                <Typography variant="caption" sx={{ color: '#ef4444' }}>
                  ⚠️ Transação ilegal. Seu anonimato está garantido, mas o risco é seu.
                </Typography>

                <FormControl fullWidth size="small">
                  <InputLabel sx={{ color: '#94a3b8' }}>Carteira para débito</InputLabel>
                  <Select
                    value={carteiraSelecionadaCompra}
                    onChange={(e) => setCarteiraSelecionadaCompra(e.target.value)}
                    sx={{ color: '#fff', bgcolor: '#1a1a2e' }}
                  >
                    {Object.entries(carteiraJogadorCompra).map(([nome, valor]) => (
                      <MenuItem key={nome} value={nome}>
                        {nome}: 💰 {typeof valor === 'number' ? valor.toFixed(2) : '0.00'}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                
                <Typography variant="caption" sx={{ color: '#64748b' }}>
                  📝 Um representante entrará em contato para organizar os detalhes.
                </Typography>
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModalCompraClandestina(false)} sx={{ color: '#94a3b8' }}>Cancelar</Button>
          <Button 
            variant="contained" 
            onClick={async () => {
              if (!carteiraSelecionadaCompra) {
                alert("Selecione uma carteira!");
                return;
              }
              
              const valor = precoItem;
              const carteiraAtual = carteiraJogadorCompra[carteiraSelecionadaCompra] || 0;
              
              if (carteiraAtual < valor) {
                alert(`Saldo insuficiente! Necessário: ${valor.toFixed(2)} 💰`);
                return;
              }
              
              try {
                const novasCarteiras = {
                  ...carteiraJogadorCompra,
                  [carteiraSelecionadaCompra]: carteiraAtual - valor,
                };
                
                const fichaRef = doc(db, "fichas", emailParaCarteiraCompra || userEmail);
                await setDoc(fichaRef, { carteiras: novasCarteiras }, { merge: true });
                
                setCarteiraJogadorCompra(novasCarteiras);
                setTotalCarteira(Object.values(novasCarteiras).reduce((a, b) => a + b, 0));
                
                alert(`✅ Transação realizada!\n💰 ${valor.toFixed(2)} debitado.\n📝 Um contato será enviado em breve.`);
                
                const dataJogo = "Hoje";
                setHistoricoAcessos(prev => [{
                  id: Date.now(),
                  tipo: "transacao_clandestina",
                  descricao: `${itemSelecionado.titulo} - ${valor.toFixed(2)} 💰`,
                  data: dataJogo,
                  timestamp: new Date().toISOString(),
                }, ...prev.slice(0, 49)]);
                
                setModalCompraClandestina(false);
                setCarteiraSelecionadaCompra("");
              } catch (error) {
                alert("Erro ao processar transação.");
              }
            }}
            sx={{ bgcolor: '#ef4444', '&:hover': { bgcolor: '#dc2626' } }}
          >
            Confirmar Pagamento
          </Button>
        </DialogActions>
      </Dialog>

      {/* 🟢 MODAL DE COMPRA SERVIÇOS */}
      <Dialog open={modalCompraServicos} onClose={() => setModalCompraServicos(false)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { bgcolor: "#0f172a", border: "1px solid #1e293b", borderRadius: 2 } }}>
        <DialogTitle sx={{ color: matrixStyles.colorPrimary }}>⭐ Contratar Serviço</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            {itemSelecionado && (
              <>
                <Typography variant="body1" sx={{ color: '#fff', fontWeight: 'bold' }}>
                  {itemSelecionado.titulo}
                </Typography>
                <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                  {itemSelecionado.desc}
                </Typography>
                <Typography variant="body2" sx={{ color: '#fbbf24' }}>
                  {itemSelecionado.preco}
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748b' }}>
                  ✨ Serviço premium com garantia de qualidade e discrição total.
                </Typography>

                <FormControl fullWidth size="small">
                  <InputLabel sx={{ color: '#94a3b8' }}>Carteira para débito</InputLabel>
                  <Select
                    value={carteiraSelecionadaCompra}
                    onChange={(e) => setCarteiraSelecionadaCompra(e.target.value)}
                    sx={{ color: '#fff', bgcolor: '#1a1a2e' }}
                  >
                    {Object.entries(carteiraJogadorCompra).map(([nome, valor]) => (
                      <MenuItem key={nome} value={nome}>
                        {nome}: 💰 {typeof valor === 'number' ? valor.toFixed(2) : '0.00'}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                
                <Typography variant="caption" sx={{ color: '#64748b' }}>
                  📝 Nossa equipe entrará em contato em até 24h para organizar o serviço.
                </Typography>
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModalCompraServicos(false)} sx={{ color: '#94a3b8' }}>Cancelar</Button>
          <Button 
            variant="contained" 
            onClick={async () => {
              if (!carteiraSelecionadaCompra) {
                alert("Selecione uma carteira!");
                return;
              }
              
              const valor = precoItem;
              const carteiraAtual = carteiraJogadorCompra[carteiraSelecionadaCompra] || 0;
              
              if (carteiraAtual < valor) {
                alert(`Saldo insuficiente! Necessário: ${valor.toFixed(2)} 💰`);
                return;
              }
              
              try {
                const novasCarteiras = {
                  ...carteiraJogadorCompra,
                  [carteiraSelecionadaCompra]: carteiraAtual - valor,
                };
                
                const fichaRef = doc(db, "fichas", emailParaCarteiraCompra || userEmail);
                await setDoc(fichaRef, { carteiras: novasCarteiras }, { merge: true });
                
                setCarteiraJogadorCompra(novasCarteiras);
                setTotalCarteira(Object.values(novasCarteiras).reduce((a, b) => a + b, 0));
                
                alert(`✅ Serviço contratado!\n💰 ${valor.toFixed(2)} debitado.\n📝 Entraremos em contato em breve.`);
                
                const dataJogo = "Hoje";
                setHistoricoAcessos(prev => [{
                  id: Date.now(),
                  tipo: "transacao_servico",
                  descricao: `${itemSelecionado.titulo} - ${valor.toFixed(2)} 💰`,
                  data: dataJogo,
                  timestamp: new Date().toISOString(),
                }, ...prev.slice(0, 49)]);
                
                setModalCompraServicos(false);
                setCarteiraSelecionadaCompra("");
              } catch (error) {
                alert("Erro ao processar transação.");
              }
            }}
            sx={{ bgcolor: matrixStyles.colorPrimary, '&:hover': { bgcolor: '#0d9488' } }}
          >
            Confirmar Pagamento
          </Button>
        </DialogActions>
      </Dialog>
    </>,
    document.body
  );
}

export default React.memo(RedeCyberpunk);
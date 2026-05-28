  // src/components/FichaPersonagem.jsx
  import React, { useEffect, useState, useRef } from "react";
  import { useGame } from "../context/GameProvider";
  import {
  Box,
  Button,
  Grid,
  Paper,
  TextField,
  Typography,
  Slider,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
} from "@mui/material";
import { Divider } from "@mui/material";
  import AddIcon from "@mui/icons-material/Add";
  import DeleteIcon from "@mui/icons-material/Delete";
  import CloseIcon from "@mui/icons-material/Close";
  import { db } from "../firebaseConfig";
  import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
  import { Checkbox, FormControlLabel } from "@mui/material";
  import { collection, getDocs } from "firebase/firestore";
  import { CircularProgress } from "@mui/material";
  import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

  export default function FichaPersonagem({ user, fichaId, isMestre }) {
  const { hud } = useGame();
  const [ficha, setFicha] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mostrarBackground, setMostrarBackground] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [lightboxSrc, setLightboxSrc] = useState(null);
  // Pega o email do dono da ficha (se já carregada) ou do usuário logado
  const donoEmail = ficha?.dono || user?.email;
  // Usa o fichaId como email do jogador (que é como o FloatingHUD faz)
const nivel = hud?.xpMap?.[fichaId]?.level ?? 1;

    const modelo = {
      tipoFicha: "PJ",   // novo campo
      nome: "",
      genero: "",
      idade: "",
      altura: "",
      peso: "",
      movimentacao: "",
      defeitos: "",
      tracos: "",
      pontosVida: 0,
  pontosEnergia: 0,
  armadura: 0,
      caracteristicas: "",
      imagemPersonagem: "",
      imagens: [],
  imagemPrincipalIndex: 0,
      background: "",
  tipoAura: "",


      atributos: {
        forca: 0,
        destreza: 0,
        agilidade: 0,
        constituicao: 0,
        inteligencia: 0,
        vontade: 0,
      },

      pericias: {
        atletismo: 0,
        luta: 0,
        armaBranca: 0,
        armaDistancia: 0,
        furtividade: 0,
        sobrevivencia: 0,
        conhecimento: 0,
        medicina: 0,
        natureza: 0,
        percepcao: 0,
        investigacao: 0,
        labia: 0,
        performance: 0,
        intimidacao: 0,
        aura: 0,
      },

      habilidades: [],
      moedas: 0,
      equipamentos: [],
      vestes: [],
      diversos: [],
      anotacoes: "",
      dono: user?.email || "",

      ignorarLimitePeso: false,
      ignorarLimiteHabilidades: false,
      permitirRedistribuirPontos: false, // 🟢 NOVO CAMPO
    };

    const LABELS = {
      titulo: "● FICHA RPG RÉQUIEM ●",
      atributosTitulo: "● ATRIBUTOS ●",
      periciasTitulo: "● PERÍCIAS ●",
      habilidadesTitulo: "● HABILIDADES AURANAS ●",
      itensTitulo: "● ITENS ●",
      anotacoesTitulo: "● ANOTAÇÕES ●",
      backgroundTitulo: "● BACKGROUND ●",
    };

    const TIPOS_AURA = [
    "Titã",
    "Alquimista",
    "Artesão",
    "Fundador",
    "Déspota",
    "Ás",
  ];

const SEASONS = ["Primavera", "Verão", "Outono", "Inverno"];

  const CORES_AURA = {
    "Titã": "#ff3b3b",
    "Alquimista": "#00e0ff",
    "Artesão": "#ffd700",
    "Fundador": "#00ff88",
    "Déspota": "#a855f7",
    "Ás": "#e5e5e5",
  };
    // 🟢 TIPOS DE DANO DISPONÍVEIS
  const TIPOS_DANO = [
    { valor: "Nenhum", label: "Nenhum (sem efeito)", cor: "#888888", descricao: "Sem efeito de dano." },
    { valor: "Ácido", label: "Ácido", cor: "#7fff00", descricao: "Corrói materiais e tecidos. 100% Eficaz contra tudo." },
    { valor: "Contundente", label: "Contundente", cor: "#a0522d", descricao: "Impactos e quedas. 50% Chance de soltar itens empunhados." },
    { valor: "Cortante", label: "Cortante", cor: "#c0c0c0", descricao: "Lâminas e garras. 50% Eficaz contra tecidos." },
    { valor: "Elétrico", label: "Elétrico", cor: "#ffff00", descricao: "Queimaduras e paralisia. 50% Chance de paralisar o local." },
    { valor: "Aurano", label: "Aurano", cor: "#00e0ff", descricao: "Dano puro de Aura. Eficaz contra quase todas as defesas." },
    { valor: "Gélido", label: "Gélido", cor: "#87ceeb", descricao: "Congelamento e lentidão. 20% Chance de causar necrose." },
    { valor: "Térmico", label: "Térmico", cor: "#ff4500", descricao: "Queima e incendeia. 50% Menos cura/regeneração." },
    { valor: "Perfurante", label: "Perfurante", cor: "#daa520", descricao: "Penetra armaduras. 50% Eficaz contra armaduras." },
    { valor: "Psíquico", label: "Psíquico", cor: "#ff69b4", descricao: "Afeta a mente. 50% Chance de perder a Aura no próximo turno." },
    { valor: "Trovejante", label: "Trovejante", cor: "#4169e1", descricao: "Dano sonoro. 50% Chance de desorientar por 1 turno." },
    { valor: "Tóxico", label: "Tóxico", cor: "#8b008b", descricao: "Toxinas e venenos. Perde 5 PV a cada turno." },
  ];
    // 🟢 TIPOS DE CONSUMÍVEL
  const TIPOS_CONSUMIVEL = [
    { valor: "Nenhum", label: "Nenhum", cor: "#888888" },
    { valor: "PV", label: "PV (Vida)", cor: "#ff4d4f" },
    { valor: "PE", label: "PE (Energia)", cor: "#facc15" },
    { valor: "RE", label: "R.E (Remover Efeito)", cor: "#00e0ff" },
  ];
    // Mapeamento textual com acentos e espaços bonitos
    const LABEL_MAP = {
      // Campos principais
      nome: "Nome",
      genero: "Gênero",
      idade: "Idade",
      altura: "Altura",
      peso: "Peso",
      movimentacao: "Movimentação",
      defeitos: "Defeitos",
      tracos: "Traços",
      pontosVida: "Pontos de Vida",
      pontosEnergia: "Pontos de Energia",
      armadura: "Armadura",
      caracteristicas: "Talentos",
      imagemPersonagem: "Imagem do Personagem",
      background: "História do Personagem",
      anotacoes: "Anotações",

      // Atributos
      forca: "Força",
      destreza: "Destreza",
      agilidade: "Agilidade",
      constituicao: "Constituição",
      inteligencia: "Inteligência",
      vontade: "Vontade",

      // Perícias
      atletismo: "Atletismo",
      luta: "Luta",
      armaBranca: "Arma Branca",
      armaDistancia: "Arma à Distância",
      furtividade: "Furtividade",
      sobrevivencia: "Sobrevivência",
      conhecimento: "Conhecimento",
      medicina: "Medicina",
      natureza: "Natureza",
      percepcao: "Percepção",
      investigacao: "Investigação",
      labia: "Lábia",
      performance: "Performance",
      intimidacao: "Intimidação",
      aura: "Aura",

      // Itens e outros
      equipamentos: "Equipamentos",
      vestes: "Vestuário",
      diversos: "Diversos",
      moedas: "Moedas",
      cobre: "Cobre",
      prata: "Prata",
      ouro: "Ouro",
    };

    // Lista de defeitos disponíveis
const DEFEITOS_DISPONIVEIS = [
  // Nível 1
  { nome: "Fobia", nivel: 1, pontos: 1, bloqueia: null },
  { nome: "Compulsão", nivel: 1, pontos: 1, bloqueia: null },
  { nome: "Cabeça Quente", nivel: 1, pontos: 1, bloqueia: null },
  { nome: "Infâmia", nivel: 1, pontos: 1, bloqueia: null },
  { nome: "Honesto", nivel: 1, pontos: 1, bloqueia: null },
  
  // Nível 2
  { nome: "Insônia", nivel: 2, pontos: 2, bloqueia: null },
  { nome: "Sono Pesado", nivel: 2, pontos: 2, bloqueia: null },
  { nome: "Sonambulismo", nivel: 2, pontos: 2, bloqueia: null },
  { nome: "Alergia", nivel: 2, pontos: 2, bloqueia: null },
  { nome: "Vício", nivel: 2, pontos: 2, bloqueia: null },
  
  // Nível 3
  { nome: "7 Pecados Capitais", nivel: 3, pontos: 3, bloqueia: "natureza" },
  { nome: "5 Sentidos", nivel: 3, pontos: 3, bloqueia: "investigacao" },
  { nome: "Amnésia", nivel: 3, pontos: 3, bloqueia: "conhecimento" },
  { nome: "Enfermo", nivel: 3, pontos: 3, bloqueia: "atletismo" },
  { nome: "Deficiência", nivel: 3, pontos: 3, bloqueia: "intimidacao" },
  { nome: "Alucinação", nivel: 3, pontos: 3, bloqueia: "percepcao" },
  { nome: "TDI", nivel: 3, pontos: 3, bloqueia: "performance" },
];

// Estado para o modal de defeitos
const [modalDefeitosOpen, setModalDefeitosOpen] = useState(false);
const [defeitosSelecionados, setDefeitosSelecionados] = useState([]);

// Calcular pontos extras de perícia dos defeitos
const pontosPericiaExtras = defeitosSelecionados.reduce((total, defeito) => {
  const defeitoInfo = DEFEITOS_DISPONIVEIS.find(d => d.nome === defeito);
  return total + (defeitoInfo?.pontos || 0);
}, 0);

// Lista de Talentos disponíveis por atributo
const TALENTOS_POR_ATRIBUTO = {
  forca: [
    { nome: "Penetrador", custo: 1, descricao: "Seus golpes usando 'lâminas' ignoram 50% de Armadura." },
    { nome: "Demolidor", custo: 1, descricao: "Seus golpes em não criaturas utilizando 'lâminas' ou de 'mãos vazias' causam +50% de dano." },
  ],
  destreza: [
    { nome: "Penetrante", custo: 1, descricao: "Seus golpes utilizando 'Armas à Distância' ignoram 50% de Armadura." },
    { nome: "Pós-Choque", custo: 1, descricao: "Ao acertar um crítico pode-se rolar seus dados mais uma vez para somar ao dano final." },
  ],
  agilidade: [
    { nome: "Talento Ágil 1", custo: 1, descricao: "Descrição do talento ágil 1." },
    { nome: "Talento Ágil 2", custo: 1, descricao: "Descrição do talento ágil 2." },
  ],
  constituicao: [
    { nome: "Regen", custo: 1, descricao: "Regenera o P.V do personagem em 10 pontos à cada T/C ou à cada hora de R.P." },
    { nome: "Regen Parcial", custo: 2, descricao: "Regenera tecidos e carne de forma muito acelerada." },
    { nome: "Regen Total", custo: 3, descricao: "Regenera órgãos e ossos em horas." },
  ],
  inteligencia: [
    { nome: "Anti-Lábia", custo: 1, descricao: "Você só pode cair em Lábia se o oponente acertar crítico." },
    { nome: "Memória Fotográfica", custo: 1, descricao: "Você lembra de tudo desde o dia em que nasceu." },
    { nome: "Decifrador", custo: 1, descricao: "Você pode entender as funções básicas de qualquer item e equipamento." },
  ],
  vontade: [
    { nome: "Foco Absoluto", custo: 1, descricao: "Você pode entrar em um estado de transe, ficando imune à controles mentais." },
    { nome: "Com dor, com Ganho", custo: 1, descricao: "Você pode trocar valores de dados por P.V." },
    { nome: "Energético", custo: 2, descricao: "Regenera o P.E do personagem em 5 pontos à cada T/C ou à cada hora de R.P." },
  ],
};

// Estado para o modal de talentos
const [modalTalentosOpen, setModalTalentosOpen] = useState(false);
const [talentosSelecionados, setTalentosSelecionados] = useState([]);
const [calendarioOpen, setCalendarioOpen] = useState(false);
const [nascimentoDia, setNascimentoDia] = useState(1);
const [nascimentoEstacao, setNascimentoEstacao] = useState(1);
const [nascimentoAno, setNascimentoAno] = useState(879);
// 🟢 NOVOS ESTADOS PARA O MODAL DE HABILIDADES
const [modalHabilidadesOpen, setModalHabilidadesOpen] = useState(false);
const [habilidadeExpandida, setHabilidadeExpandida] = useState(null);
const [avaliacaoIA, setAvaliacaoIA] = useState(null);
const [carregandoIA, setCarregandoIA] = useState(false);
const [modalDinheiroOpen, setModalDinheiroOpen] = useState(false);
const [carteiras, setCarteiras] = useState([]);
const [novaCarteiraNome, setNovaCarteiraNome] = useState("");
const [modalGaleriaOpen, setModalGaleriaOpen] = useState(false);
const [modalTransferenciaOpen, setModalTransferenciaOpen] = useState(false);
const [modalPagamentoOpen, setModalPagamentoOpen] = useState(false);
const [jogadorSelecionado, setJogadorSelecionado] = useState("");
const [carteiraOrigem, setCarteiraOrigem] = useState("");
const [carteiraDestino, setCarteiraDestino] = useState("");
const [valorTransferencia, setValorTransferencia] = useState(0);
const [valorPagamento, setValorPagamento] = useState(0);
const [carteiraPagamento, setCarteiraPagamento] = useState("");
const [listaJogadores, setListaJogadores] = useState([]);
const [modalInventarioOpen, setModalInventarioOpen] = useState(false);
const [abaAtiva, setAbaAtiva] = useState("equipamentos"); // equipamentos, vestes, diversos
const [itemDadoModalOpen, setItemDadoModalOpen] = useState(false);
const [itemSelecionadoParaDado, setItemSelecionadoParaDado] = useState(null);
const [dadoQuantidade, setDadoQuantidade] = useState(1);
const [dadoLados, setDadoLados] = useState(20);
const [dadoModificador, setDadoModificador] = useState(0);
const [resultadoDado, setResultadoDado] = useState(null);
// 🟢 ADICIONE ESTES ESTADOS:
const [modalTransferirItemOpen, setModalTransferirItemOpen] = useState(false);
const [modalDroparItemOpen, setModalDroparItemOpen] = useState(false);

// 🟢 MODAIS DE ANOTAÇÕES E BACKGROUND
const [modalAnotacoesOpen, setModalAnotacoesOpen] = useState(false);
const [modalBackgroundOpen, setModalBackgroundOpen] = useState(false);
const [anotacoesTexto, setAnotacoesTexto] = useState("");
const [backgroundTexto, setBackgroundTexto] = useState("");
const [anotacoesSalvos, setAnotacoesSalvos] = useState([]);
const [anotacaoEditandoIndex, setAnotacaoEditandoIndex] = useState(null);
const [anotacaoTitulo, setAnotacaoTitulo] = useState("");

// 🟢 REFERÊNCIA PARA O TEXTAREA (para inserir imagem no cursor)
const anotacaoTextareaRef = useRef(null);
const backgroundTextareaRef = useRef(null);
const lightboxImageAnotacaoRef = useRef(null);
const [itemParaTransferir, setItemParaTransferir] = useState(null);
const [itemParaDropar, setItemParaDropar] = useState(null);
const [jogadorDestinoItem, setJogadorDestinoItem] = useState("");
const [quantidadeTransferir, setQuantidadeTransferir] = useState(1);
const [quantidadeDropar, setQuantidadeDropar] = useState(1);
const [categoriaDestino, setCategoriaDestino] = useState("equipamentos"); // 🟢 NOVO
// Lista de Traços (desbloqueados ao atingir nível 5 na perícia)
const TRACOS_POR_PERICIA = {
  atletismo: "Atleta",
  luta: "Lutador",
  armaBranca: "Esgrimista",
  armaDistancia: "Atirador",
  furtividade: "Sombra",
  sobrevivencia: "Sobrevivente",
  conhecimento: "Erudito",
  medicina: "Médico",
  natureza: "Naturalista",
  percepcao: "Observador",
  investigacao: "Detetive",
  labia: "Persuasivo",
  performance: "Artista",
  intimidacao: "Intimidador",
  aura: "Auris",
};

// ✅ NOVO - Carrega talentos APENAS uma vez quando a ficha é carregada
useEffect(() => {
  if (ficha?.caracteristicas && talentosSelecionados.length === 0) {
    const talentosArray = ficha.caracteristicas.split('; ').filter(t => t.trim() !== '');
    // Só carrega se forem talentos válidos da lista
    const talentosValidos = talentosArray.filter(t => 
      Object.values(TALENTOS_POR_ATRIBUTO).some(arr => 
        arr.some(tal => tal.nome === t)
      )
    );
    setTalentosSelecionados(talentosValidos);
  }
}, [ficha]); // Dependência apenas de ficha, não de ficha.caracteristicas

const calcularIdade = () => {
  if (!ficha?.idade) return "—";
  const partes = ficha.idade.split('/');
  if (partes.length !== 3) return "—";
  
  const diaNasc = parseInt(partes[0]);
  const estacaoNasc = parseInt(partes[1]);
  const anoNasc = parseInt(partes[2]);
  
  const anoAtual = hud?.world?.year || 879;
  const estacaoAtual = SEASONS.indexOf(hud?.world?.season || "Primavera") + 1;
  const diaAtual = hud?.world?.day || 1;
  
  let idade = anoAtual - anoNasc;
  
  if (estacaoAtual < estacaoNasc || (estacaoAtual === estacaoNasc && diaAtual < diaNasc)) {
    idade--;
  }
  
  return idade;
};

// Atualizar Traços automaticamente quando perícias atingirem nível 5
// Atualizar Traços automaticamente quando perícias atingirem nível 5
useEffect(() => {
  if (!ficha) return;
  
  const tracosDesbloqueados = Object.entries(ficha.pericias || {})
    .filter(([_, valor]) => valor >= 5)
    .map(([pericia]) => TRACOS_POR_PERICIA[pericia])
    .filter(t => t); // Remove undefined
  
  const tracosString = tracosDesbloqueados.join("; ");
  
  if (ficha.tracos !== tracosString) {
    setFicha(p => ({ ...p, tracos: tracosString }));
  }
}, [ficha?.pericias]);

// 🟢 NOVO - Calcular armadura automaticamente das vestimentas
useEffect(() => {
  if (!ficha) return;
  
  // Garante que vestes existe e é um array
  const vestes = ficha.vestes || [];
  
  // Soma o valor do "dado" de todos os itens de vestimenta
  const armaduraTotal = vestes.reduce((total, item) => {
    // Garante que o valor é um número
    const dado = Number(item.dado) || 0;
    return total + dado;
  }, 0);
  
  // Limita ao máximo de 50
  const armaduraFinal = Math.min(armaduraTotal, 50);
  
  // Atualiza o campo armadura se for diferente
  if (ficha.armadura !== armaduraFinal) {
    console.log(`🛡️ Armadura calculada: ${armaduraTotal} → ${armaduraFinal} (máx 50)`);
    setFicha(p => ({ ...p, armadura: armaduraFinal }));
  }
}, [ficha?.vestes, ficha]); // Adiciona ficha como dependência também

        useEffect(() => {
      if (!fichaId) {
        setFicha({ ...modelo });
        setLoading(false);
        return;
      }
      
      setLoading(true);
      const ref = doc(db, "fichas", fichaId);
      
      // 🟢 USA onSnapshot PARA ATUALIZAR EM TEMPO REAL
      const unsub = onSnapshot(ref, (snap) => {
        if (snap.exists()) {
          const dados = snap.data();
          if (!dados.imagens && dados.imagemPersonagem) {
            dados.imagens = [dados.imagemPersonagem];
            dados.imagemPrincipalIndex = 0;
          }
          
                              const garantirDadoNosItens = (itens) => {
            if (!Array.isArray(itens)) return [];
            return itens.map(item => ({
              ...item,
              dado: item.dado || 1,
              tipoDano: item.tipoDano || "Nenhum",
                            consumivel: item.consumivel || "Nenhum",
              consumivelValor: item.consumivelValor || 0,
              consumivelPercentual: item.consumivelPercentual || 100,
            }));
          };

          const combinado = {
            ...modelo,
            ...dados,
            atributos: { ...modelo.atributos, ...(dados.atributos || {}) },
            pericias: { ...modelo.pericias, ...(dados.pericias || {}) },
                        habilidades: Array.isArray(dados.habilidades) 
  ? dados.habilidades.map(h => ({ 
      dado: 1, 
      tipoDano: "Aurano",
      custoPE: 0,
      condicoes: [],
      imagem: "",  // 🟢 NOVO
      ...h,
      condicoes: Array.isArray(h.condicoes) 
        ? h.condicoes 
        : (typeof h.condicoes === 'string' && h.condicoes.trim() 
            ? [{ 
                id: Date.now(), 
                titulo: "Condição 1", 
                descricao: h.condicoes,
                dificuldade: 0,
                janela: 0,
                custo: 0,
                risco: 0
              }] 
            : [])
    })) 
  : [],
            moedas: { ...modelo.moedas, ...(dados.moedas || {}) },
            equipamentos: garantirDadoNosItens(Array.isArray(dados.equipamentos) ? dados.equipamentos : []),
            vestes: garantirDadoNosItens(Array.isArray(dados.vestes) ? dados.vestes : []),
            diversos: garantirDadoNosItens(Array.isArray(dados.diversos) ? dados.diversos : []),
          };
          
          setFicha(combinado);
        } else {
          setDoc(ref, modelo);
          setFicha({ ...modelo });
        }
        setLoading(false);
      }, (err) => {
        console.error("Erro carregar ficha:", err);
        setFicha({ ...modelo });
        setLoading(false);
      });
      
      return () => unsub();
    }, [fichaId]);

    function setCampo(chave, valor) {
      setFicha((p) => ({ ...p, [chave]: valor }));
    }
    function setSubCampo(obj, chave, valor) {
      setFicha((p) => ({ ...p, [obj]: { ...p[obj], [chave]: valor } }));
    }

        function adicionarHabilidade() {
  setFicha((p) => ({
    ...p,
    habilidades: [
      ...(p.habilidades || []),
      { 
        nome: "", 
        descricao: "", 
        condicoes: [],      // 🟢 Agora é array de objetos, não string
        dado: 1, 
        tipoDano: "Aurano",
        custoPE: 0,           // 🟢 Novo campo
        imagem: ""
      },
    ],
  }));
}
    function atualizarHabilidade(i, campo, valor) {
      setFicha((p) => {
        const arr = [...(p.habilidades || [])];
        arr[i] = { ...arr[i], [campo]: valor };
        return { ...p, habilidades: arr };
      });
    }
    function removerHabilidade(i) {
      setFicha((p) => ({
        ...p,
        habilidades: p.habilidades.filter((_, idx) => idx !== i),
      }));
    }
    
    // 🟢 FUNÇÃO DE AVALIAÇÃO DA IA
const avaliarHabilidadeComIA = async (habilidade) => {
  setCarregandoIA(true);
  
  try {
    // Prepara os dados para enviar à IA
    const dadosParaAvaliar = {
      nome: habilidade.nome,
      descricao: habilidade.descricao,
      dado: habilidade.dado || 1,
      tipoDano: habilidade.tipoDano || "Aurano",
      custoPE: habilidade.custoPE || 0,
      condicoes: habilidade.condicoes || []
    };

    // Aqui você vai integrar com sua API de IA (OpenAI, etc.)
    // Por enquanto, vou simular uma avaliação
    const apiBase = window.location.hostname === "localhost" 
      ? "http://localhost:5000" 
      : "https://app-rpg.onrender.com";

    const response = await fetch(`${apiBase}/api/avaliar-habilidade`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dadosParaAvaliar)
    });

    if (!response.ok) throw new Error("Erro na avaliação");
    
    const resultado = await response.json();
    setAvaliacaoIA(resultado);
    return resultado;
    
  } catch (error) {
    console.error("Erro ao avaliar habilidade:", error);
    
    // Fallback: avaliação local básica se a IA falhar
    const avaliacaoLocal = avaliarHabilidadeLocal(habilidade);
    setAvaliacaoIA(avaliacaoLocal);
    return avaliacaoLocal;
    
  } finally {
    setCarregandoIA(false);
  }
};
// 🟢 AVALIAÇÃO LOCAL (FALLBACK) - VERSÃO CORRIGIDA E RIGOROSA
const avaliarHabilidadeLocal = (habilidade) => {
  // Calcula poder base
  const poderBase = calcularPoderBase(habilidade);
  
  // Calcula nível de restrição
  const nivelRestricao = calcularNivelRestricao(habilidade.condicoes || []);
  
  // Fator de restrição: 0 restrições = fator 1.0, muitas = fator 0.15
  const fatorRestricao = Math.max(0.15, 1 - (nivelRestricao / 8));
  const poderEfetivo = poderBase * fatorRestricao;
  
  // Limite máximo
  const limiteMaximo = 3;
  const percentual = Math.min((poderEfetivo / limiteMaximo) * 100, 200);
  
  let status, mensagem, sugestoes = [];
  
  if (nivelRestricao === 0 && poderBase > 5) {
    status = "Muito Desequilibrada 🔴🔴";
    mensagem = "Habilidade extremamente forte SEM nenhuma condição! Adicione restrições severas.";
    sugestoes = [
      "Adicione pelo menos 2 condições severas",
      "Condições como 'só funciona 1 vez por dia' ajudam muito",
      "Riscos como 'chance de perder a própria vida' são poderosos balanceadores"
    ];
  } else if (percentual <= 40) {
    status = "Perfeitamente Equilibrada ✅✅";
    mensagem = "Excelente! As restrições controlam perfeitamente o poder da habilidade.";
  } else if (percentual <= 70) {
    status = "Bem Equilibrada ✅";
    mensagem = "A habilidade está bem balanceada com as restrições atuais.";
  } else if (percentual <= 100) {
    status = "Equilibrada ✅";
    mensagem = "A habilidade está dentro do limite aceitável.";
  } else if (percentual <= 130) {
    status = "Pouco Equilibrada ⚠️";
    mensagem = "A habilidade está um pouco acima do ideal. Considere adicionar mais condições.";
    sugestoes = [
      "Adicione condições de dificuldade (ex: requer concentração)",
      "Restrinja o uso (ex: só funciona à noite)",
      "Adicione um custo (ex: consome 5 PE adicionais)"
    ];
  } else if (percentual <= 180) {
    status = "Desequilibrada 🔴";
    mensagem = "Habilidade muito forte para as restrições atuais. Precisa de mais limitações.";
    sugestoes = [
      "Adicione múltiplas condições severas",
      "Condições com risco de vida são as mais eficazes",
      "Reduza o dado de dano ou poder base"
    ];
  } else {
    status = "Extremamente Desequilibrada 🔴🔴";
    mensagem = "Esta habilidade quebra completamente o jogo! Necessita de restrições extremas.";
    sugestoes = [
      "Adicione uma condição de 'risco de morte' (nível 5)",
      "Restrinja para '1 uso por dia' ou menos",
      "Adicione custo de vida/sangue",
      "Considere reduzir drasticamente o poder base"
    ];
  }
  
  return {
    poderBase: Math.min(poderBase, 10),
    restricoes: Math.min(nivelRestricao, 10),
    percentual: Math.min(percentual, 200),
    status,
    mensagem,
    sugestoes
  };
};

// 🟢 NOVA FUNÇÃO: Calcular nível de restrição
const calcularNivelRestricao = (condicoes) => {
  if (!condicoes || condicoes.length === 0) return 0;
  
  return condicoes.reduce((total, cond) => {
    return total + (
      (cond.dificuldade || 0) * 0.3 +
      (cond.janela || 0) * 0.5 +
      (cond.custo || 0) * 0.4 +
      (cond.risco || 0) * 0.6
    );
  }, 0);
};

// 🟢 CALCULAR PODER BASE - VERSÃO RIGOROSA
const calcularPoderBase = (habilidade) => {
  let poder = 0;
  
  const descLower = (habilidade.descricao || "").toLowerCase();
  const nomeLower = (habilidade.nome || "").toLowerCase();
  
  // Peso do dado (1-10)
  poder += (Number(habilidade.dado) || 1) * 0.5;
  
  // Tipo de dano
  const danosFortes = ["Aurano", "Psíquico", "Tóxico", "Térmico"];
  if (danosFortes.includes(habilidade.tipoDano)) poder += 1.5;
  
  // Custo de PE
  poder -= (Number(habilidade.custoPE) || 0) * 0.15;
  
  // 🔴 PODER ABSOLUTO
  if (descLower.includes("mata instantaneamente") || 
      descLower.includes("morte instantânea") ||
      descLower.includes("mata qualquer") ||
      descLower.includes("matar tudo") ||
      (descLower.includes("todos os inimigos") && descLower.includes("mata"))) {
    poder += 8;
  }
  
  // 🔴 MORTE GARANTIDA
  if (descLower.includes("morte certa") || 
      descLower.includes("mata na hora") ||
      descLower.includes("sem chance de defesa") ||
      descLower.includes("impossível de sobreviver")) {
    poder += 7;
  }
  
  // 🔴 DANO EM ÁREA MASSIVO
  if ((descLower.includes("todos") || descLower.includes("todos os inimigos")) && 
      (descLower.includes("dano") || descLower.includes("mata") || descLower.includes("destrói"))) {
    poder += 5;
  }
  
  // 🔴 INVENCIBILIDADE
  if (descLower.includes("invencível") || 
      descLower.includes("imune a tudo") ||
      (descLower.includes("nada pode") && descLower.includes("atingir")) ||
      descLower.includes("invulnerável")) {
    poder += 6;
  }
  
  // 🟠 PODERES MUITO FORTES
  if (descLower.includes("controla") && descLower.includes("mente")) poder += 4;
  if (descLower.includes("controla") && descLower.includes("tempo")) poder += 5;
  if (descLower.includes("controla") && descLower.includes("realidade")) poder += 6;
  if (descLower.includes("teleporte")) poder += 2;
  if (descLower.includes("invisível") || descLower.includes("invisibilidade")) poder += 2;
  if (descLower.includes("cura") && descLower.includes("tudo")) poder += 3;
  if (descLower.includes("ressuscita")) poder += 5;
  if (descLower.includes("paralisa")) poder += 2;
  
  // 🟡 DANO MODERADO
  if (descLower.includes("dano massivo") || descLower.includes("dano devastador")) poder += 4;
  if (descLower.includes("dano alto") || descLower.includes("dano grande")) poder += 3;
  if (descLower.includes("explosão")) poder += 2;
  if (descLower.includes("corte profundo")) poder += 2;
  
  // 🟢 DEFESAS
  if (descLower.includes("escudo") || descLower.includes("defesa")) poder += 1;
  if (descLower.includes("barreira")) poder += 1.5;
  
  // 🔴 ANÁLISE DO NOME
  if (nomeLower.includes("morte") || nomeLower.includes("destruição")) poder += 3;
  if (nomeLower.includes("juízo final") || nomeLower.includes("apocalipse")) poder += 5;
  if (nomeLower.includes("deus") || nomeLower.includes("divino")) poder += 4;
  
  return Math.max(0, poder);
};

// 🟢 REMOVA a função calcularRestricoesTotais antiga se existir
// e use apenas calcularNivelRestricao no lugar

// 🟢 FUNÇÕES PARA CONDIÇÕES
const adicionarCondicao = (habilidadeIndex) => {
  setFicha((p) => {
    const habilidades = [...p.habilidades];
    const condicoes = habilidades[habilidadeIndex].condicoes || [];
    habilidades[habilidadeIndex] = {
      ...habilidades[habilidadeIndex],
      condicoes: [
        ...condicoes,
        {
          id: Date.now(),
          titulo: `Condição ${condicoes.length + 1}`,
          descricao: "",
          dificuldade: 0,
          janela: 0,
          custo: 0,
          risco: 0
        }
      ]
    };
    return { ...p, habilidades };
  });
};

const atualizarCondicao = (habilidadeIndex, condicaoId, campo, valor) => {
  setFicha((p) => {
    const habilidades = [...p.habilidades];
    const condicoes = [...(habilidades[habilidadeIndex].condicoes || [])];
    const idx = condicoes.findIndex(c => c.id === condicaoId);
    if (idx !== -1) {
      condicoes[idx] = { ...condicoes[idx], [campo]: valor };
      habilidades[habilidadeIndex] = { ...habilidades[habilidadeIndex], condicoes };
    }
    return { ...p, habilidades };
  });
};

const removerCondicao = (habilidadeIndex, condicaoId) => {
  setFicha((p) => {
    const habilidades = [...p.habilidades];
    const condicoes = (habilidades[habilidadeIndex].condicoes || [])
      .filter(c => c.id !== condicaoId)
      .map((c, i) => ({ ...c, titulo: `Condição ${i + 1}` }));
    habilidades[habilidadeIndex] = { ...habilidades[habilidadeIndex], condicoes };
    return { ...p, habilidades };
  });
};

// 🟢 Verificar se alguma habilidade restringe outras
const temRestricaoHabilidades = () => {
  return ficha.habilidades.some(h => 
    (h.condicoes || []).some(c => 
      c.descricao?.toLowerCase().includes("não pode ter outras habilidades") ||
      c.descricao?.toLowerCase().includes("única habilidade") ||
      c.descricao?.toLowerCase().includes("sacrifica outras habilidades")
    )
  );
};

// 🟢 FUNÇÃO PARA SALVAR AVALIAÇÃO DO MESTRE (TREINAMENTO DA IA)
const salvarAvaliacaoMestre = async (habilidade, avaliacaoFinal) => {
  if (!isMestre) return;
  
  try {
    const apiBase = window.location.hostname === "localhost" 
      ? "http://localhost:5000" 
      : "https://app-rpg.onrender.com";
      
    await fetch(`${apiBase}/api/salvar-avaliacao`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fichaId,
        habilidade: {
          nome: habilidade.nome,
          descricao: habilidade.descricao,
          dado: habilidade.dado,
          tipoDano: habilidade.tipoDano,
          custoPE: habilidade.custoPE,
          condicoes: habilidade.condicoes
        },
        avaliacaoMestre: avaliacaoFinal,
        timestamp: new Date().toISOString(),
        mestreEmail: user?.email
      })
    });
    
    console.log("✅ Avaliação do mestre salva para treinamento");
  } catch (error) {
    console.error("Erro ao salvar avaliação:", error);
  }
};

// 🟢 FUNÇÃO DE ANÁLISE AUTOMÁTICA DE DESCRIÇÕES
const analisarDescricaoComIA = (habilidade) => {
  const condicoes = habilidade.condicoes || [];
  
  const novasCondicoes = condicoes.map(cond => {
    const desc = (cond.descricao || "").toLowerCase();
    let dificuldade = cond.dificuldade;
    let janela = cond.janela;
    let custo = cond.custo;
    let risco = cond.risco;
    
    // Só sugere se o mestre não definiu manualmente
    if (dificuldade === 0 && janela === 0 && custo === 0 && risco === 0) {
      // Análise de dificuldade
      if (desc.includes("50 pulos") || desc.includes("100 flexões") || desc.includes("correr 10km")) dificuldade = 4;
      else if (desc.includes("concentração") || desc.includes("meditar") || desc.includes("foco")) dificuldade = 2;
      else if (desc.includes("gritar") || desc.includes("falar") || desc.includes("palavra")) dificuldade = 1;
      
      // Análise de janela
      if (desc.includes("eclipse") || desc.includes("lua cheia") || desc.includes("alinhamento")) janela = 5;
      else if (desc.includes("noite") || desc.includes("escuridão") || desc.includes("meia-noite")) janela = 3;
      else if (desc.includes("dia") || desc.includes("manhã") || desc.includes("amanhecer")) janela = 2;
      else if (desc.includes("uma vez por") || desc.includes("1 vez por")) janela = 4;
      
      // Análise de custo
      if (desc.includes("vida") || desc.includes("sangue") || desc.includes("morte") || desc.includes("alma")) custo = 5;
      else if (desc.includes("energia") || desc.includes("cansaço") || desc.includes("exaustão")) custo = 3;
      else if (desc.includes("pe") || desc.includes("aura") || desc.includes("nen")) custo = 2;
      
      // Análise de risco
      if (desc.includes("chance de morrer") || desc.includes("morte certa") || desc.includes("sacrifício")) risco = 5;
      else if (desc.includes("pode falhar") || desc.includes("chance de") || desc.includes("probabilidade")) risco = 3;
      else if (desc.includes("dano colateral") || desc.includes("aliados") || desc.includes("inocentes")) risco = 2;
    }
    
    return { ...cond, dificuldade, janela, custo, risco };
  });
  
  return novasCondicoes;
};

                function adicionarItem(tipo) {
  setFicha((p) => ({
    ...p,
    [tipo]: [
      ...(p[tipo] || []),
      { quantidade: 1, nome: "", durabilidade: 100, imagem: "", dado: 1, tipoDano: "Nenhum", consumivel: "Nenhum", consumivelValor: 0 },
    ],
  }));
}

    function atualizarItem(tipo, i, campo, valor) {
      setFicha((p) => {
        const arr = [...(p[tipo] || [])];
        arr[i] = { ...arr[i], [campo]: valor };
        return { ...p, [tipo]: arr };
      });
    }
    function removerItem(tipo, i) {
      setFicha((p) => ({
        ...p,
        [tipo]: p[tipo].filter((_, idx) => idx !== i),
      }));
    }

    
    // Adicione estas funções após as funções de item existentes

const rolarDadoItem = (item) => {
  const quantidade = dadoQuantidade || 1;
  const lados = dadoLados || 20;
  const mod = dadoModificador || 0;
  
  const rolagens = [];
  let total = 0;
  
  for (let i = 0; i < quantidade; i++) {
    const valor = Math.floor(Math.random() * lados) + 1;
    rolagens.push(valor);
    total += valor;
  }
  
  total += mod;
  
  const resultado = {
    item: item.nome,
    quantidade,
    lados,
    mod,
    rolagens,
    total,
    formula: `${quantidade}d${lados}${mod >= 0 ? '+' : ''}${mod}`
  };
  
  setResultadoDado(resultado);
};

const abrirModalDado = (item, tipo) => {
  setItemSelecionadoParaDado({ ...item, tipo });
  setItemDadoModalOpen(true);
};

    async function salvarFicha() {
  if (!fichaId) return alert("FichaId inválido.");
  setSaving(true);
  try {
    const ref = doc(db, "fichas", fichaId);
    const toSave = {
      ...ficha,
      atributos: Object.fromEntries(
        Object.entries(ficha.atributos || {}).map(([k, v]) => [k, Math.min(Number(v || 0), 5)])
      ),
      pericias: Object.fromEntries(
        Object.entries(ficha.pericias || {}).map(([k, v]) => [k, Math.min(Number(v || 0), 5)])
      ),
      moedas: Number(ficha.moedas || 0),
    };
    await setDoc(ref, toSave, { merge: true });
    alert("Ficha salva com sucesso!");
  } catch (err) {
    console.error(err);
    alert("Erro ao salvar.");
  } finally {
    setSaving(false);
  }
}

    async function handleUploadImagem(e) {
    const file = e.target.files?.[0];
    if (!file || !fichaId) return;

    if ((ficha.imagens?.length || 0) >= 5) {
      alert("Limite máximo de 5 imagens atingido.");
      return;
    }

    let apiBase = "";
    try {
      apiBase = import.meta?.env?.VITE_SERVER_URL || "";
    } catch {
      apiBase = "";
    }

    if (!apiBase) {
      apiBase =
        window.location.hostname === "localhost"
          ? "http://localhost:5000"
          : "https://app-rpg.onrender.com";
    }

    const fd = new FormData();
    fd.append("file", file);

    try {
      const res = await fetch(`${apiBase}/upload`, {
        method: "POST",
        body: fd,
      });

      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      if (!data?.url) throw new Error("Sem URL");

      const novasImagens = [...(ficha.imagens || []), data.url];

      const novoIndex =
        ficha.imagens?.length === 0 ? 0 : ficha.imagemPrincipalIndex || 0;

      const novaFicha = {
        ...ficha,
        imagens: novasImagens,
        imagemPrincipalIndex: novoIndex,
        imagemPersonagem: novasImagens[novoIndex],
      };

      setFicha(novaFicha);

      const ref = doc(db, "fichas", fichaId);
      await setDoc(ref, novaFicha, { merge: true });

    } catch (err) {
      alert("Erro no upload: " + err.message);
    }
  }


// 🟢 ADICIONE AQUI (LINHA 524):
// Função para abrir o modal de defeitos e carregar existentes
const abrirModalDefeitos = () => {
  if (ficha?.defeitos) {
    const defeitosArray = ficha.defeitos.split('; ').filter(d => d.trim() !== '');
    setDefeitosSelecionados(defeitosArray);
  } else {
    setDefeitosSelecionados([]);
  }
  setModalDefeitosOpen(true);
};

useEffect(() => {
  if (ficha?.carteiras) {
    setCarteiras(ficha.carteiras);
  }
}, [ficha?.carteiras]);

// 🟢 CARREGAR ANOTAÇÕES
useEffect(() => {
  if (ficha?.anotacoes) {
    // Tenta parsear como JSON (novo formato) ou texto simples (antigo)
    try {
      const parsed = JSON.parse(ficha.anotacoes);
      if (Array.isArray(parsed)) {
        setAnotacoesSalvos(parsed);
      } else {
        setAnotacoesSalvos([{ titulo: "Anotação", texto: ficha.anotacoes || "" }]);
      }
    } catch {
      setAnotacoesSalvos([{ titulo: "Anotação", texto: ficha.anotacoes || "" }]);
    }
  }
  if (ficha?.background) {
    setBackgroundTexto(ficha.background);
  }
}, [ficha]);

// 🟢 Carregar defeitos ao carregar a ficha
useEffect(() => {
  if (ficha?.defeitos) {
    const defeitosArray = ficha.defeitos.split('; ').filter(d => d.trim() !== '');
    setDefeitosSelecionados(defeitosArray);
  }
}, [ficha?.defeitos]);

// Carregar lista de jogadores para transferência
useEffect(() => {
  const carregarJogadores = async () => {
    if (!fichaId) return;
    
    const col = collection(db, "fichas");
    const snapshot = await getDocs(col);
    const jogadores = [];
    
    // Adiciona SI MESMO primeiro (dados atualizados)
    const fichaAtual = await getDoc(doc(db, "fichas", fichaId));
    if (fichaAtual.exists()) {
      jogadores.push({
        id: fichaId,
        nome: fichaAtual.data().nome || "Você mesmo",
        carteiras: fichaAtual.data().carteiras || []
      });
    }
    
    // Adiciona os outros jogadores
    snapshot.forEach((doc) => {
      if (doc.id !== fichaId) {
        jogadores.push({
          id: doc.id,
          nome: doc.data().nome || doc.id,
          carteiras: doc.data().carteiras || []
        });
      }
    });
    setListaJogadores(jogadores);
  };
  
  // Recarrega a lista sempre que o modal de transferência for aberto
  if (modalTransferenciaOpen) {
    carregarJogadores();
  }
}, [fichaId, modalTransferenciaOpen]);
// Função para realizar transferência
// 🟢 Função para realizar transferência - VERSÃO CORRIGIDA (TEMPO REAL)
const realizarTransferencia = async () => {
  if (!jogadorSelecionado || !carteiraOrigem || !carteiraDestino || valorTransferencia <= 0) {
    alert("Preencha todos os campos!");
    return;
  }
  
  const carteiraOrig = carteiras.find(c => c.nome === carteiraOrigem);
  if (!carteiraOrig || carteiraOrig.valor < valorTransferencia) {
    alert("Saldo insuficiente!");
    return;
  }
  
  try {
    // Atualiza carteiras do jogador atual (origem)
    const novasCarteirasOrig = carteiras.map(c => 
      c.nome === carteiraOrigem ? { ...c, valor: c.valor - valorTransferencia } : c
    );
    
    // Salva no Firestore do jogador atual
    const refOrigem = doc(db, "fichas", fichaId);
    await setDoc(refOrigem, { carteiras: novasCarteirasOrig }, { merge: true });
    
    // Verifica se é transferência para si mesmo
    if (jogadorSelecionado === fichaId) {
      // Transferência entre carteiras do mesmo jogador
      const carteirasAtualizadas = novasCarteirasOrig.map(c => 
        c.nome === carteiraDestino ? { ...c, valor: c.valor + valorTransferencia } : c
      );
      
      // Salva no Firestore (isso já vai disparar o onSnapshot da própria ficha)
      await setDoc(refOrigem, { carteiras: carteirasAtualizadas }, { merge: true });
      
      alert(`Transferência de ${valorTransferencia} realizada com sucesso!`);
    } else {
      // Transferência para OUTRO jogador
      
      // Atualiza carteiras do jogador destino
      const refDestino = doc(db, "fichas", jogadorSelecionado);
      const fichaDestino = await getDoc(refDestino);
      
      if (fichaDestino.exists()) {
        const carteirasDestinoAtuais = fichaDestino.data().carteiras || [];
        
        // Verifica se a carteira destino existe, se não, cria
        const carteiraExiste = carteirasDestinoAtuais.find(c => c.nome === carteiraDestino);
        let carteirasDestinoAtualizadas;
        
        if (carteiraExiste) {
          carteirasDestinoAtualizadas = carteirasDestinoAtuais.map(c => 
            c.nome === carteiraDestino ? { ...c, valor: (c.valor || 0) + valorTransferencia } : c
          );
        } else {
          // Se a carteira não existe, adiciona nova
          carteirasDestinoAtualizadas = [
            ...carteirasDestinoAtuais,
            { nome: carteiraDestino, valor: valorTransferencia }
          ];
        }
        
        // Salva no Firestore do destino (isso vai disparar o onSnapshot dele)
        await setDoc(refDestino, { carteiras: carteirasDestinoAtualizadas }, { merge: true });
        
        alert(`Transferência de ${valorTransferencia} para ${listaJogadores.find(j => j.id === jogadorSelecionado)?.nome} realizada!`);
      } else {
        alert("Jogador destino não encontrado!");
        return;
      }
    }
    
    // Limpa o modal
    setModalTransferenciaOpen(false);
    setJogadorSelecionado("");
    setCarteiraOrigem("");
    setCarteiraDestino("");
    setValorTransferencia(0);
    
  } catch (error) {
    console.error("Erro na transferência:", error);
    alert("Erro ao realizar transferência: " + error.message);
  }
};

// Função para realizar pagamento (débito)
const realizarPagamento = async () => {
  if (!carteiraPagamento || valorPagamento <= 0) {
    alert("Selecione uma carteira e um valor válido!");
    return;
  }
  
  const carteira = carteiras.find(c => c.nome === carteiraPagamento);
  if (!carteira || carteira.valor < valorPagamento) {
    alert("Saldo insuficiente!");
    return;
  }
  
  const novasCarteiras = carteiras.map(c => 
    c.nome === carteiraPagamento ? { ...c, valor: c.valor - valorPagamento } : c
  );
  setCarteiras(novasCarteiras);
  
  const ref = doc(db, "fichas", fichaId);
  await setDoc(ref, { carteiras: novasCarteiras }, { merge: true });
  
  alert(`Pagamento de ${valorPagamento} realizado com sucesso!`);
  setModalPagamentoOpen(false);
  setCarteiraPagamento("");
  setValorPagamento(0);
};
const salvarDefeitos = async (defeitos) => {
  const defeitosString = defeitos.join('; ');
  const periciasAtualizadas = { ...ficha.pericias };
  
  // Aplica bloqueios das perícias
  defeitos.forEach(defeitoNome => {
    const defeitoInfo = DEFEITOS_DISPONIVEIS.find(d => d.nome === defeitoNome);
    if (defeitoInfo?.bloqueia) {
      periciasAtualizadas[defeitoInfo.bloqueia] = 0;
    }
  });
  
  // ATUALIZA O ESTADO LOCAL PRIMEIRO
  setDefeitosSelecionados(defeitos);
  setFicha(p => ({ 
    ...p, 
    defeitos: defeitosString,
    pericias: periciasAtualizadas
  }));
  
  // DEPOIS SALVA NO FIRESTORE
  const ref = doc(db, "fichas", fichaId);
  await setDoc(ref, { 
    defeitos: defeitosString,
    pericias: periciasAtualizadas 
  }, { merge: true });
  
  console.log('✅ Defeitos salvos:', defeitosString);
  
  // NÃO RECARREGA - apenas fecha o modal
  setModalDefeitosOpen(false);
};

// Função para salvar talentos - VERSÃO QUE FUNCIONA
const salvarTalentos = async (talentos) => {
  const talentosString = talentos.join('; ');
  
  // ATUALIZA O ESTADO LOCAL PRIMEIRO
  setTalentosSelecionados(talentos);
  setFicha(p => ({ ...p, caracteristicas: talentosString }));
  
  // DEPOIS SALVA NO FIRESTORE
  const ref = doc(db, "fichas", fichaId);
  await setDoc(ref, { 
    caracteristicas: talentosString 
  }, { merge: true });
  
  console.log('✅ Talentos salvos:', talentosString);
  
  // NÃO RECARREGA - apenas fecha o modal
  setModalTalentosOpen(false);
};

// 🟢 Função para transferir item (ATUALIZADA)
// 🟢 Função para transferir item - VERSÃO CORRIGIDA (TEMPO REAL)
const transferirItem = async () => {
  if (!itemParaTransferir || !jogadorDestinoItem) {
    alert("Selecione um item e um jogador!");
    return;
  }
  
  if (quantidadeTransferir > itemParaTransferir.quantidade) {
    alert("Quantidade maior que a disponível!");
    return;
  }
  
  try {
    // Verifica se é para SI MESMO (mover entre categorias)
    if (jogadorDestinoItem === fichaId) {
      // Mover item para outra categoria
      const itemMovido = {
        ...itemParaTransferir.item,
        quantidade: quantidadeTransferir
      };
      delete itemMovido.index;
      
      // Remove da categoria atual
      const novosItensOrigem = ficha[abaAtiva].map((item, idx) => {
        if (idx === itemParaTransferir.index) {
          const novaQuantidade = item.quantidade - quantidadeTransferir;
          return novaQuantidade > 0 ? { ...item, quantidade: novaQuantidade } : null;
        }
        return item;
      }).filter(item => item !== null);
      
      // Adiciona na nova categoria
      const itensDestino = [...(ficha[categoriaDestino] || []), itemMovido];
      
      // Salva no Firestore (onSnapshot da própria ficha vai atualizar)
      const ref = doc(db, "fichas", fichaId);
      await setDoc(ref, { 
        [abaAtiva]: novosItensOrigem,
        [categoriaDestino]: itensDestino
      }, { merge: true });
      
      const nomesCategorias = {
        equipamentos: 'Equipamentos',
        vestes: 'Vestimentas',
        diversos: 'Diversos'
      };
      
      alert(`${quantidadeTransferir}x ${itemParaTransferir.item.nome} movido para ${nomesCategorias[categoriaDestino]}!`);
      
    } else {
      // Transferência para OUTRO jogador
      
      // 1. Remove item do jogador atual
      const novosItens = ficha[abaAtiva].map((item, idx) => {
        if (idx === itemParaTransferir.index) {
          const novaQuantidade = item.quantidade - quantidadeTransferir;
          return novaQuantidade > 0 ? { ...item, quantidade: novaQuantidade } : null;
        }
        return item;
      }).filter(item => item !== null);
      
      // Salva no Firestore do jogador atual
      const refOrigem = doc(db, "fichas", fichaId);
      await setDoc(refOrigem, { [abaAtiva]: novosItens }, { merge: true });
      
      // 2. Adiciona item no jogador destino
      const refDestino = doc(db, "fichas", jogadorDestinoItem);
      const fichaDestino = await getDoc(refDestino);
      
      if (fichaDestino.exists()) {
        const dadosDestino = fichaDestino.data();
        const itemParaAdicionar = {
          ...itemParaTransferir.item,
          quantidade: quantidadeTransferir
        };
        delete itemParaAdicionar.index;
        
        // Adiciona na mesma categoria do jogador destino
        const itensDestino = [...(dadosDestino[abaAtiva] || []), itemParaAdicionar];
        
        // Salva no Firestore do destino (onSnapshot dele vai disparar)
        await setDoc(refDestino, { [abaAtiva]: itensDestino }, { merge: true });
        
        const jogadorDestinoNome = listaJogadores.find(j => j.id === jogadorDestinoItem)?.nome || "Desconhecido";
        alert(`${quantidadeTransferir}x ${itemParaTransferir.item.nome} transferido para ${jogadorDestinoNome}!`);
      } else {
        alert("Jogador destino não encontrado!");
        return;
      }
    }
    
    // Limpa o modal
    setModalTransferirItemOpen(false);
    setItemParaTransferir(null);
    setJogadorDestinoItem("");
    setQuantidadeTransferir(1);
    setCategoriaDestino("equipamentos");
    
  } catch (error) {
    console.error("Erro na transferência de item:", error);
    alert("Erro ao transferir item: " + error.message);
  }
};

// 🟢 Função para dropar item
const droparItem = async () => {
  if (!itemParaDropar) {
    alert("Selecione um item!");
    return;
  }
  
  if (quantidadeDropar > itemParaDropar.quantidade) {
    alert("Quantidade maior que a disponível!");
    return;
  }
  
  if (!window.confirm(`Dropar ${quantidadeDropar}x ${itemParaDropar.item.nome}?`)) {
    return;
  }
  
  // Remove item do inventário
  const novosItens = ficha[abaAtiva].map((item, idx) => {
    if (idx === itemParaDropar.index) {
      const novaQuantidade = item.quantidade - quantidadeDropar;
      return novaQuantidade > 0 ? { ...item, quantidade: novaQuantidade } : null;
    }
    return item;
  }).filter(item => item !== null);
  
  setFicha(p => ({ ...p, [abaAtiva]: novosItens }));
  
  // Salva no Firestore
  const ref = doc(db, "fichas", fichaId);
  await setDoc(ref, { [abaAtiva]: novosItens }, { merge: true });
  
  alert(`${quantidadeDropar}x ${itemParaDropar.item.nome} dropado!`);
  
  setModalDroparItemOpen(false);
  setItemParaDropar(null);
  setQuantidadeDropar(1);
};


    if (loading)
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
      <CircularProgress sx={{ color: '#00e0ff' }} />
    </Box>
  );
  // ================= PESO AUTOMÁTICO =================

  // Peso atual (cada item conta 1 independente da quantidade)
  const pesoAtual =
    (ficha.equipamentos?.length || 0) +
    (ficha.vestes?.length || 0) +
    (ficha.diversos?.length || 0);

  // Atributos relevantes
  const forca = Number(ficha.atributos?.forca || 0);
  const atletismo = Number(ficha.pericias?.atletismo || 0);

  // Fórmula
  const pesoMaximo = 10 + (forca * 2) + (atletismo * 2);

  // Verificação
  const sobrecarregado =
    !ficha?.ignorarLimitePeso && pesoAtual >= pesoMaximo;

    // ================= STATUS AUTOMÁTICOS =================

  // ===== VIDA =====
  const constituicao = Number(ficha?.atributos?.constituicao || 0);
  const sobrevivencia = Number(ficha?.pericias?.sobrevivencia || 0);
  const pontosVidaMax = 100 + (constituicao + sobrevivencia) * 10;

  // ===== ENERGIA =====
  const vontade = Number(ficha?.atributos?.vontade || 0);
  const aura = Number(ficha?.pericias?.aura || 0);
  const limiteHabilidades = Math.min(aura, 5);
  const podeIgnorarLimiteHab = ficha?.ignorarLimiteHabilidades || false;
  const habilidadesNoLimite =
    !podeIgnorarLimiteHab &&
    ficha.habilidades.length >= limiteHabilidades;
  const pontosEnergiaMax = 10 + (vontade + aura) * 5;

  // ===== MOVIMENTAÇÃO =====
  const agilidade = Number(ficha?.atributos?.agilidade || 0);
  const furtividade = Number(ficha?.pericias?.furtividade || 0);
  const movimentacaoCalculada = 10 + (agilidade + furtividade) * 5;

  // ===== ARMADURA =====
  const armaduraMax = 50;
  // ===== PONTOS POR NÍVEL =====
const nivelJogador = hud?.xpMap?.[fichaId]?.level ?? 1;
const pontosAtributoMax = 2 + (nivelJogador - 1);
const pontosPericiaBase = 7 + ((nivelJogador - 1) * 2);
const pontosPericiaMax = pontosPericiaBase + pontosPericiaExtras;

// Cálculo de custo progressivo para atributos
const pontosAtributoGastos = Object.entries(ficha.atributos || {})
  .reduce((total, [key, valor]) => {
    const valorAtual = Number(valor || 0);
    if (valorAtual <= 1) return total; // Nível 1 é grátis
    
    // Soma o custo para cada nível acima de 1
    let custo = 0;
    for (let i = 2; i <= valorAtual; i++) {
      custo += (i - 1); // Nível 2 custa 1, nível 3 custa 2...
    }
    return total + custo;
  }, 0);

  // Adiciona o custo dos talentos selecionados
const custoTalentos = talentosSelecionados.reduce((total, talentoNome) => {
  for (const atributo in TALENTOS_POR_ATRIBUTO) {
    const talento = TALENTOS_POR_ATRIBUTO[atributo].find(t => t.nome === talentoNome);
    if (talento) return total + talento.custo;
  }
  return total;
}, 0);
// Perícias: cada ponto custa 1 (sistema simples)
const pontosPericiaGastos = Object.values(ficha.pericias || {})
  .reduce((a, b) => a + Number(b || 0), 0);

const pontosAtributoRestantes = pontosAtributoMax - pontosAtributoGastos - custoTalentos;
const pontosPericiaRestantes = pontosPericiaMax - pontosPericiaGastos;


    return (
      <Paper sx={{ p: 2, bgcolor: "#07121a", color: "#fff", height: "100%", overflowY: "auto" }}>
        {/* Título, dropdown de tipo e checkbox de redistribuição */}
<Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
    <Typography variant="h5" component="h2">{LABELS.titulo}</Typography>
    
    {/* Dropdown PJ / PM (apenas Mestre vê) */}
    {isMestre && (
      <FormControl size="small" sx={{ minWidth: 100 }}>
        <InputLabel sx={{ color: '#94a3b8' }}>Tipo</InputLabel>
        <Select
          value={ficha.tipoFicha || "PJ"}
          label="Tipo"
          onChange={(e) => setCampo("tipoFicha", e.target.value)}
          sx={{
            color: '#fff',
            '.MuiOutlinedInput-notchedOutline': { borderColor: '#334155' },
            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#475569' },
          }}
        >
          <MenuItem value="PJ">PJ</MenuItem>
          <MenuItem value="PM">PM</MenuItem>
        </Select>
      </FormControl>
    )}
  </Box>

  {/* Checkbox para permitir redistribuir pontos */}
  {isMestre && (
    <FormControlLabel
      control={
        <Checkbox
          checked={ficha?.permitirRedistribuirPontos || false}
          onChange={async (e) => {
            const novoValor = e.target.checked;
            setFicha((prev) => ({
              ...prev,
              permitirRedistribuirPontos: novoValor,
            }));
            const ref = doc(db, "fichas", fichaId);
            await setDoc(ref, { permitirRedistribuirPontos: novoValor }, { merge: true });
          }}
          size="small"
          sx={{ color: '#ff9800' }}
        />
      }
      label={
        <Typography variant="caption" sx={{ color: '#ff9800', fontWeight: 'bold' }}>
          Permitir redistribuir pontos
        </Typography>
      }
    />
  )}
</Box>

        <Grid container spacing={2}>
          <Grid item xs={12} md={9}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                {/* CAMPO NOME */}
<Box sx={{ mb: 1 }}>
  <Typography component="div">{LABEL_MAP["nome"]}</Typography>
  <Box sx={{ position: 'relative' }}>
    <TextField 
      fullWidth 
      size="small" 
      value={ficha.nome || ""} 
      onChange={(e) => setCampo("nome", e.target.value)} 
      InputProps={{ sx: { pr: 5 } }}
    />
    <IconButton
      size="small"
      onClick={() => {
        const nomesMasculinos = ["Cassius", "Elias", "Oliver", "Morgan", "Isaiah", "Aldric", "Thorne", "Cedric"];
        const nomesFemininos = ["Agatha", "Katherine", "Nuxia", "Anna", "Lyra", "Seraphine", "Morgana", "Elara"];
        const sobrenomes = ["D'Hollow", "Aktreniz", "Sawsky", "Thorne", "Oigres", "Severus", "Fields", "Maha"];
        
        const genero = ficha.genero || "Feminino";
        const listaNomes = genero === "Masculino" ? nomesMasculinos : nomesFemininos;
        const nomeAleatorio = listaNomes[Math.floor(Math.random() * listaNomes.length)];
        const sobrenomeAleatorio = sobrenomes[Math.floor(Math.random() * sobrenomes.length)];
        
        setCampo("nome", `${nomeAleatorio} ${sobrenomeAleatorio}`);
      }}
      sx={{ 
        position: 'absolute',
        right: 4,
        top: '50%',
        transform: 'translateY(-50%)',
        minWidth: 'auto',
        p: 0.5
      }}
    >
      🎲
    </IconButton>
  </Box>
</Box>

{/* CAMPO GÊNERO */}
<Box sx={{ mb: 1 }}>
  <Typography component="div">{LABEL_MAP["genero"]}</Typography>
  <TextField
    select
    fullWidth
    size="small"
    value={ficha.genero || "Feminino"}
    onChange={(e) => setCampo("genero", e.target.value)}
    SelectProps={{ native: true }}
  >
    <option value="Feminino">Feminino</option>
    <option value="Masculino">Masculino</option>
  </TextField>
</Box>

{/* CAMPO IDADE */}
<Box sx={{ mb: 1 }}>
  <Typography component="div">{LABEL_MAP["idade"]}</Typography>
  <Box sx={{ position: 'relative' }}>
    <TextField
      fullWidth
      size="small"
      value={ficha.idade ? `${calcularIdade()} - ${ficha.idade}` : ""}
      InputProps={{ 
        readOnly: true,
        sx: { pr: 5 }
      }}
      placeholder="Selecione a data de nascimento"
    />
    <IconButton
      size="small"
      onClick={() => setCalendarioOpen(true)}
      sx={{ 
        position: 'absolute',
        right: 4,
        top: '50%',
        transform: 'translateY(-50%)',
        minWidth: 'auto',
        p: 0.5
      }}
    >
      📅
    </IconButton>
  </Box>
</Box>

{/* CAMPO ALTURA */}
<Box sx={{ mb: 1 }}>
  <Typography component="div">{LABEL_MAP["altura"]}</Typography>
  <TextField
    fullWidth
    size="small"
    type="number"
    value={ficha.altura || "0.00"}
    onChange={(e) => setCampo("altura", e.target.value)}
    InputProps={{
      endAdornment: <InputAdornment position="end">m</InputAdornment>,
      inputProps: { step: 0.01, min: 0 }
    }}
  />
</Box>

{/* CAMPO PESO */}
<Box sx={{ mb: 1 }}>
  <Typography component="div">{LABEL_MAP["peso"]}</Typography>
  <TextField
    fullWidth
    size="small"
    type="number"
    value={ficha.peso || "0"}
    onChange={(e) => setCampo("peso", e.target.value)}
    InputProps={{
      endAdornment: <InputAdornment position="end">kg</InputAdornment>,
      inputProps: { step: 1, min: 0 }
    }}
  />
</Box>
                <Box sx={{ mb: 1 }}>
    <Typography component="div">Movimentação</Typography>
    <TextField
      fullWidth
      size="small"
      value={`${movimentacaoCalculada} m/t`}
      InputProps={{ readOnly: true }}
    />
  </Box>
              </Grid>
              <Grid item xs={12} md={6}>

                
                {/* Campo de Defeitos - NOVO */}
<Box sx={{ mb: 1 }}>
  <Typography component="div">{LABEL_MAP["defeitos"]}</Typography>
  <Box sx={{ position: 'relative' }}>
    <TextField
      fullWidth
      size="small"
      value={ficha.defeitos || ""}
      InputProps={{ 
        readOnly: true,
        sx: { pr: 7 } // padding right para não sobrepor o botão
      }}
      placeholder="Nenhum defeito selecionado"
    />
    <Button
      variant="contained"
      size="small"
      onClick={() => {
  if (ficha?.defeitos) {
    const defeitosArray = ficha.defeitos.split('; ').filter(d => d.trim() !== '');
    setDefeitosSelecionados(defeitosArray);
  } else {
    setDefeitosSelecionados([]);
  }
  setModalDefeitosOpen(true);
}}
      sx={{ 
        position: 'absolute',
        right: 4,
        top: '50%',
        transform: 'translateY(-50%)',
        minWidth: 'auto',
        px: 1,
        py: 0.5,
        fontSize: '0.7rem',
        height: 28,
        bgcolor: '#1976d2',
        '&:hover': { bgcolor: '#115293' }
      }}
    >
      Selecionar
    </Button>
  </Box>
</Box>

{/* Campo de Traços - READONLY */}
<Box sx={{ mb: 1 }}>
  <Typography component="div">{LABEL_MAP["tracos"]}</Typography>
  <TextField
    fullWidth
    size="small"
    value={ficha.tracos || ""}
    InputProps={{ readOnly: true }}
    placeholder="Traços serão desbloqueados ao atingir nível 5 nas perícias"
  />
</Box>

{/* Campo de Talentos - NOVO */}
<Box sx={{ mb: 1 }}>
  <Typography component="div">{LABEL_MAP["caracteristicas"]}</Typography>
  <Box sx={{ position: 'relative' }}>
    <TextField
      fullWidth
      size="small"
      value={ficha.caracteristicas || ""}
      InputProps={{ 
        readOnly: true,
        sx: { pr: 7 }
      }}
      placeholder="Nenhum talento selecionado"
    />
    <Button
      variant="contained"
      size="small"
      onClick={() => setModalTalentosOpen(true)}
      sx={{ 
        position: 'absolute',
        right: 4,
        top: '50%',
        transform: 'translateY(-50%)',
        minWidth: 'auto',
        px: 1,
        py: 0.5,
        fontSize: '0.7rem',
        height: 28,
        bgcolor: '#9c27b0',
        '&:hover': { bgcolor: '#7b1fa2' }
      }}
    >
      Talentos
    </Button>
  </Box>
</Box>

  {/* Pontos de Vida */}
  <Box sx={{ mb: 1 }}>
    <Typography component="div">Pontos de Vida</Typography>
    <Grid container spacing={1} alignItems="center">
      <Grid item xs={6}>
        <TextField
          fullWidth
          size="small"
          type="number"
          value={ficha.pontosVida}
          onChange={async (e) => {
  const valor = Math.min(Number(e.target.value), pontosVidaMax);

  setCampo("pontosVida", valor);

  const ref = doc(db, "fichas", fichaId);
  await setDoc(ref, { pontosVida: valor }, { merge: true });
}}
        />
      </Grid>
      <Grid item xs={6}>
        <Typography>
    / <span style={{ color: "#ff4d4f", fontWeight: 600 }}>
        {pontosVidaMax}
      </span>
  </Typography>
      </Grid>
    </Grid>
  </Box>

  {/* Pontos de Energia */}
  <Box sx={{ mb: 1 }}>
    <Typography component="div">Pontos de Energia</Typography>
    <Grid container spacing={1} alignItems="center">
      <Grid item xs={6}>
        <TextField
          fullWidth
          size="small"
          type="number"
          value={ficha.pontosEnergia}
          onChange={async (e) => {
  const valor = Math.min(Number(e.target.value), pontosEnergiaMax);

  setCampo("pontosEnergia", valor);

  const ref = doc(db, "fichas", fichaId);
  await setDoc(ref, { pontosEnergia: valor }, { merge: true });
}}
        />
      </Grid>
      <Grid item xs={6}>
        <Typography>
    / <span style={{ color: "#facc15", fontWeight: 600 }}>
        {pontosEnergiaMax}
      </span>
  </Typography>
      </Grid>
    </Grid>
  </Box>

  {/* Armadura */}
<Box sx={{ mb: 1 }}>
  <Typography component="div">Armadura</Typography>
  <Grid container spacing={1} alignItems="center">
    <Grid item xs={6}>
      <TextField
        fullWidth
        size="small"
        type="number"
        value={ficha.armadura}
        disabled={!isMestre} // 🟢 Apenas Mestre pode editar manualmente
        onChange={(e) => {
          if (!isMestre) return; // Jogador não pode mexer
          const valor = Math.min(Number(e.target.value), armaduraMax);
          setCampo("armadura", valor);
        }}
        InputProps={{
          readOnly: !isMestre,
          sx: { color: '#fff' }
        }}
        helperText={!isMestre ? "Calculado pelas vestimentas" : ""}
        FormHelperTextProps={{ sx: { color: '#00e0ff', fontSize: '0.7rem' } }}
      />
    </Grid>
    <Grid item xs={6}>
      <Typography>
        / {armaduraMax}
      </Typography>
    </Grid>
  </Grid>
</Box>
              </Grid>
            </Grid>

            <Box mt={2}>
  <Box
    display="flex"
    justifyContent="space-between"
    alignItems="center"
    sx={{
      borderBottom: "2px solid #00e0ff",
      pb: 1,
      mb: 1,
    }}
  >
    <Typography component="div" sx={{ fontWeight: "bold" }}>
      {LABELS.atributosTitulo}
    </Typography>

    <Typography sx={{ fontWeight: "bold", color: "#00e0ff" }}>
  Pontos de Atributo: {pontosAtributoRestantes}
</Typography>
  </Box>
              {Object.entries(ficha.atributos).map(([k, v]) => (
                <Box key={k} sx={{ mb: 1 }}>
                  <Typography component="div" sx={{ fontSize: 14 }}>{LABEL_MAP[k] || k}</Typography>
                  <Slider
  value={Number(v || 1)}
  min={0}
  max={5}
  step={1}
  onChange={(e, val) => {
  // Não deixa ir abaixo de 1
  if (val < 1) return;
  
  const atual = Number(v || 1);
  const diferenca = val - atual;
  
  // Se está tentando DIMINUIR (val < atual)
  if (diferenca < 0) {
    // Só permite diminuir se:
    // 1. É o mestre
    // 2. OU a checkbox "permitirRedistribuirPontos" está marcada
    if (!isMestre && !ficha?.permitirRedistribuirPontos) {
      return; // Bloqueia a diminuição
    }
  }
  
  // Se está tentando AUMENTAR
  if (diferenca > 0) {
    let custo = 0;
    for (let i = atual + 1; i <= val; i++) {
      custo += (i - 1);
    }
    
    if (pontosAtributoRestantes < custo) return;
  }
  
  setSubCampo("atributos", k, val);
}}
  valueLabelDisplay="auto"
/>
                </Box>
              ))}
            </Box>

            <Box mt={2}>
  <Box
    display="flex"
    justifyContent="space-between"
    alignItems="center"
    sx={{
      borderBottom: "2px solid #00e0ff",
      pb: 1,
      mb: 1,
    }}
  >
    <Typography component="div" sx={{ fontWeight: "bold" }}>
      {LABELS.periciasTitulo}
    </Typography>

    <Typography sx={{ fontWeight: "bold", color: "#00e0ff" }}>
      Pontos de Perícia: {pontosPericiaRestantes}
    </Typography>
  </Box>
              {Object.entries(ficha.pericias).map(([k, v]) => (
                <Box key={k} sx={{ mb: 1 }}>
                  <Typography component="div" sx={{ fontSize: 14 }}>{LABEL_MAP[k] || k}</Typography>
                 <Slider
  value={Number(v || 0)}
  min={0}
  max={5}
  step={1}
  disabled={
    defeitosSelecionados.some(d => {
      const info = DEFEITOS_DISPONIVEIS.find(def => def.nome === d);
      return info?.bloqueia === k;
    }) || (pontosPericiaRestantes <= 0 && Number(v || 0) === 0)
  }
  onChange={(e, val) => {
  const atual = Number(v || 0);
  const diferenca = val - atual;
  
  // Se está tentando DIMINUIR
  if (diferenca < 0) {
    if (!isMestre && !ficha?.permitirRedistribuirPontos) {
      return; // Bloqueia a diminuição
    }
  }
  
  // Se está tentando AUMENTAR
  if (diferenca > 0 && pontosPericiaRestantes < diferenca) return;
  
  setSubCampo("pericias", k, val);
}}
  valueLabelDisplay="auto"
/>
                </Box>
              ))}
            </Box>
            {/* 🟢 NOVA SEÇÃO DE HABILIDADES - BOTÃO QUE ABRE MODAL */}
<Box mt={2}>
  <Box
    display="flex"
    justifyContent="space-between"
    alignItems="center"
    sx={{
      borderBottom: `2px solid ${CORES_AURA[ficha.tipoAura] || "#00e0ff"}`,
      pb: 1,
      mb: 1,
    }}
  >
    <Typography component="div" sx={{ fontWeight: "bold" }}>
      {LABELS.habilidadesTitulo}
    </Typography>

    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      {!isMestre && (
        <Typography
          sx={{
            fontWeight: "bold",
            color: CORES_AURA[ficha.tipoAura] || "#00e0ff",
            textDecoration: "underline",
            textShadow: `0 0 6px ${CORES_AURA[ficha.tipoAura] || "#00e0ff"}`,
            fontSize: 16,
          }}
        >
          ✨ {ficha.tipoAura || "—"}
        </Typography>
      )}
      
      {isMestre && (
        <TextField
          select
          size="small"
          value={ficha.tipoAura || ""}
          onChange={(e) => setCampo("tipoAura", e.target.value)}
          SelectProps={{ native: true }}
          sx={{
            minWidth: 160,
            bgcolor: "#021319",
            borderRadius: 1,
          }}
        >
          <option value=""></option>
          {TIPOS_AURA.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </TextField>
      )}
    </Box>
  </Box>

  {/* Botão para abrir modal de habilidades */}
  <Button
    variant="contained"
    fullWidth
    onClick={() => setModalHabilidadesOpen(true)}
    sx={{
      bgcolor: CORES_AURA[ficha.tipoAura] || "#00e0ff",
      color: '#000',
      fontWeight: 'bold',
      py: 1.5,
      fontSize: '1.1rem',
      '&:hover': {
        bgcolor: CORES_AURA[ficha.tipoAura] 
          ? `${CORES_AURA[ficha.tipoAura]}dd` 
          : '#00bcd4'
      }
    }}
  >
    ⚡ HABILIDADES AURANAS ({ficha.habilidades?.length || 0}/{limiteHabilidades})
  </Button>
</Box>

                        {/* 🟢 SUBSTITUA OS DOIS BOTÕES POR ESTE: */}
<Box mt={2} sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
  <Button
    variant="contained"
    startIcon={<span>🎒</span>}
    onClick={() => setModalInventarioOpen(true)}
    sx={{ 
      bgcolor: '#8B4513', 
      '&:hover': { bgcolor: '#654321' }, 
      px: 4, 
      py: 1,
      fontSize: '1.1rem',
      fontWeight: 'bold',
      flex: 1
    }}
  >
    INVENTÁRIO ({pesoAtual}/{pesoMaximo})
  </Button>
  <Button
    variant="contained"
    startIcon={<span>💰</span>}
    onClick={() => setModalDinheiroOpen(true)}
    sx={{ 
      bgcolor: '#2e7d32', 
      '&:hover': { bgcolor: '#1b5e20' }, 
      px: 4, 
      py: 1,
      fontSize: '1.1rem',
      fontWeight: 'bold',
      flex: 1
    }}
  >
    DINHEIRO
  </Button>
</Box>
                        {/* Anotações e Background - Botões */}
            <Box mt={2} sx={{ display: 'flex', gap: 2 }}>
              <Button 
                variant="outlined" 
                startIcon={<span>📝</span>}
                onClick={() => setModalAnotacoesOpen(true)}
                sx={{ color: '#fff', borderColor: '#ff9800', flex: 1 }}
              >
                Anotações ({anotacoesSalvos.length})
              </Button>
              <Button 
                variant="outlined" 
                startIcon={<span>📖</span>}
                onClick={() => { setBackgroundTexto(ficha?.background || ""); setModalBackgroundOpen(true); }}
                sx={{ color: '#fff', borderColor: '#9c27b0', flex: 1 }}
              >
                Background
              </Button>
            </Box>

            {/* Botões Galeria e Salvar */}
<Box mt={2} sx={{ display: "flex", justifyContent: "space-between" }}>
  <Button variant="outlined" startIcon={<span>🖼️</span>} onClick={() => setModalGaleriaOpen(true)} sx={{ color: '#fff', borderColor: '#9c27b0' }}>
    Galeria
  </Button>
  <Button variant="contained" color="primary" onClick={salvarFicha} disabled={saving}>
    {saving ? "Salvando..." : "Salvar Ficha"}
  </Button>
</Box>
          </Grid>

          {/* Painel da imagem */}
          <Grid item xs={12} md={3}>
            <Paper
    sx={{
      p: 2,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 1,
    }}
  >
    <Typography component="div">Personagem</Typography>

    {/* IMAGEM PRINCIPAL */}
    {ficha.imagens?.length > 0 ? (
      <img
    src={ficha.imagens[ficha.imagemPrincipalIndex || 0]}
    onClick={() => {
      setZoom(1);
      setLightboxOpen(true);
    }}
    style={{
      width: "100%",
      borderRadius: 8,
      objectFit: "cover",
      cursor: "zoom-in",
    }}
  />
    ) : (
      <Box
        sx={{
          width: "100%",
          height: 180,
          bgcolor: "#021319",
          borderRadius: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Typography>Sem imagem</Typography>
      </Box>
    )}

    {/* MINIATURAS COM DRAG */}
    <Box
      sx={{
        display: "flex",
        gap: 1,
        flexWrap: "wrap",
        mt: 1,
      }}
    >
    {(ficha.imagens || []).map((url, index) => (
    <Box
      key={url}
      sx={{
        position: "relative",
        width: 70,
        height: 70,
      }}
    >
      <img
        src={url}
        draggable
        onClick={async () => {
    const novaFicha = {
      ...ficha,
      imagemPrincipalIndex: index,
      imagemPersonagem: ficha.imagens[index],
    };

    setFicha(novaFicha);

    const ref = doc(db, "fichas", fichaId);
    await setDoc(ref, {
      imagemPrincipalIndex: index,
      imagemPersonagem: ficha.imagens[index],
    }, { merge: true });
  }}
        onDragStart={(e) => {
          e.dataTransfer.setData("index", index);
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={async (e) => {
          const from = Number(e.dataTransfer.getData("index"));
          const to = index;

          const novas = [...ficha.imagens];
          const [movida] = novas.splice(from, 1);
          novas.splice(to, 0, movida);

          const novaFicha = {
            ...ficha,
            imagens: novas,
            imagemPrincipalIndex: 0,
            imagemPersonagem: novas[0],
          };

          setFicha(novaFicha);

          const ref = doc(db, "fichas", fichaId);
          await setDoc(ref, novaFicha, { merge: true });
        }}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          borderRadius: 6,
          cursor: "grab",
          border:
            index === (ficha.imagemPrincipalIndex || 0)
              ? "3px solid gold"
              : "1px solid #333",
        }}
      />

      {/* BOTÃO DEFINIR PRINCIPAL */}
      {index !== ficha.imagemPrincipalIndex && (
        <Button
          size="small"
          variant="contained"
          sx={{
            position: "absolute",
            bottom: 2,
            left: 2,
            fontSize: 10,
            minWidth: 0,
            px: 1,
          }}
          onClick={async () => {
            const novaFicha = {
              ...ficha,
              imagemPrincipalIndex: index,
              imagemPersonagem: ficha.imagens[index],
            };

            setFicha(novaFicha);

            const ref = doc(db, "fichas", fichaId);
            await setDoc(ref, {
              imagemPrincipalIndex: index,
              imagemPersonagem: ficha.imagens[index],
            }, { merge: true });
          }}
        >
          ⭐
        </Button>
      )}

      {/* BOTÃO REMOVER */}
      <IconButton
        size="small"
        color="error"
        sx={{
          position: "absolute",
          top: -10,
          right: -10,
          bgcolor: "#111",
        }}
        onClick={async () => {
          const novas = ficha.imagens.filter((_, i) => i !== index);

          const novoIndex =
            index === ficha.imagemPrincipalIndex ? 0 : ficha.imagemPrincipalIndex;

          const novaFicha = {
            ...ficha,
            imagens: novas,
            imagemPrincipalIndex: novas.length ? novoIndex : 0,
            imagemPersonagem: novas.length ? novas[novoIndex] : "",
          };

          setFicha(novaFicha);

          const ref = doc(db, "fichas", fichaId);
          await setDoc(ref, novaFicha, { merge: true });
        }}
      >
        <DeleteIcon fontSize="small" />
      </IconButton>
    </Box>
  ))}
    </Box>

    <Button
      variant="outlined"
      component="label"
      sx={{ mt: 1, width: "100%" }}
    >
      Upload Imagem
      <input
        type="file"
        accept="image/*"
        hidden
        onChange={handleUploadImagem}
      />
    </Button>
  </Paper>
                  </Grid>
        </Grid>

        {lightboxOpen && (
  <Box
    onClick={() => setLightboxOpen(false)}
    sx={{
      position: "fixed",
      inset: 0,
      bgcolor: "rgba(0,0,0,0.85)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 9999,
    }}
  >
    <LightboxImage
      src={lightboxSrc || ficha.imagens?.[ficha.imagemPrincipalIndex || 0]}
      zoom={zoom}
      setZoom={setZoom}
    />
  </Box>
)}

      {/* Modal de Defeitos */}
      <Dialog 
        open={modalDefeitosOpen} 
        onClose={() => setModalDefeitosOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Selecionar Defeitos</DialogTitle>
        <DialogContent sx={{ bgcolor: '#1a1a2e', color: '#fff' }}>
  <Box sx={{ mb: 3, p: 2, bgcolor: '#16213e', borderRadius: 2 }}>
    <Typography variant="h6" sx={{ color: '#00e0ff' }}>
      Pontos de Perícia Extras: +{pontosPericiaExtras}
    </Typography>
  </Box>
  
  {[1, 2, 3].map(nivel => (
    <Box key={nivel} sx={{ mb: 3 }}>
      <Typography 
        variant="h6" 
        sx={{ 
          color: nivel === 1 ? '#4caf50' : nivel === 2 ? '#ff9800' : '#f44336',
          fontWeight: 'bold',
          mb: 1,
          borderBottom: '2px solid',
          borderColor: nivel === 1 ? '#4caf50' : nivel === 2 ? '#ff9800' : '#f44336',
          pb: 1
        }}
      >
        Nível {nivel} {nivel === 3 && '(Bloqueia Perícia)'}
      </Typography>
      
      <Grid container spacing={1}>
        {DEFEITOS_DISPONIVEIS.filter(d => d.nivel === nivel).map(defeito => {
          const isSelected = defeitosSelecionados.includes(defeito.nome);
          const isBlocked = defeito.bloqueia && 
            defeitosSelecionados.some(d => {
              const info = DEFEITOS_DISPONIVEIS.find(def => def.nome === d);
              return info?.bloqueia === defeito.bloqueia;
            });
          
          return (
            <Grid item xs={12} sm={6} key={defeito.nome}>
              <Paper 
                sx={{ 
                  p: 1.5, 
                  bgcolor: isSelected ? '#1e3a5f' : '#0f172a',
                  border: isSelected ? '1px solid #00e0ff' : '1px solid #333',
                  borderRadius: 1,
                  transition: 'all 0.2s',
                  '&:hover': { bgcolor: '#1e293b' }
                }}
              >
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={isSelected}
                      disabled={isBlocked && !isSelected}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setDefeitosSelecionados([...defeitosSelecionados, defeito.nome]);
                        } else {
                          setDefeitosSelecionados(defeitosSelecionados.filter(d => d !== defeito.nome));
                        }
                      }}
                      sx={{ color: '#00e0ff' }}
                    />
                  }
                  label={
                    <Box sx={{ ml: 1 }}>
                      <Typography variant="body1" sx={{ fontWeight: 'bold', color: '#fff' }}>
                        {defeito.nome}
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#00e0ff' }}>
                        +{defeito.pontos} P.P
                      </Typography>
                      {defeito.bloqueia && (
                        <Typography variant="caption" sx={{ color: '#f44336', display: 'block' }}>
                          Bloqueia: {LABEL_MAP[defeito.bloqueia]}
                        </Typography>
                      )}
                    </Box>
                  }
                />
              </Paper>
            </Grid>
          );
        })}
      </Grid>
      
      <Divider sx={{ mt: 2, bgcolor: '#333' }} />
    </Box>
  ))}
</DialogContent>
        <DialogActions>
  <Button onClick={() => {
    setDefeitosSelecionados([]);
  }}>
    Limpar Seleção
  </Button>
  <Button onClick={() => setModalDefeitosOpen(false)}>
    Cancelar
  </Button>
  <Button 
    variant="contained"
    color="error"
    onClick={async () => {
      await salvarDefeitos([]);
      setModalDefeitosOpen(false);
    }}
  >
    LIMPAR TUDO
  </Button>
  <Button 
    variant="contained"
    onClick={async () => {
      await salvarDefeitos(defeitosSelecionados);
      setModalDefeitosOpen(false);
    }}
  >
    Salvar Defeitos
  </Button>
</DialogActions>
      </Dialog>
            {/* Modal Calendário */}
      <Dialog open={calendarioOpen} onClose={() => setCalendarioOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Data de Nascimento</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Dia"
              type="number"
              value={nascimentoDia}
              onChange={(e) => setNascimentoDia(Math.min(100, Math.max(1, parseInt(e.target.value) || 1)))}
              inputProps={{ min: 1, max: 100 }}
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>Estação</InputLabel>
              <Select
                value={nascimentoEstacao}
                label="Estação"
                onChange={(e) => setNascimentoEstacao(e.target.value)}
              >
                <MenuItem value={1}>Primavera (84 dias)</MenuItem>
                <MenuItem value={2}>Verão (100 dias)</MenuItem>
                <MenuItem value={3}>Outono (84 dias)</MenuItem>
                <MenuItem value={4}>Inverno (100 dias)</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Ano"
              type="number"
              value={nascimentoAno}
              onChange={(e) => setNascimentoAno(Math.min(hud?.world?.year || 879, Math.max(1, parseInt(e.target.value) || 1)))}
              inputProps={{ min: 1, max: hud?.world?.year || 879 }}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCalendarioOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={() => {
            setCampo("idade", `${nascimentoDia}/${nascimentoEstacao}/${nascimentoAno}`);
            setCalendarioOpen(false);
          }}>
            Confirmar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal Dinheiro */}
      <Dialog open={modalDinheiroOpen} onClose={() => setModalDinheiroOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: '#1a1a2e', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
  💰 Carteiras
  <Box>
    <Button variant="contained" size="small" onClick={async () => {
  // Recarrega a lista de jogadores antes de abrir
  const col = collection(db, "fichas");
  const snapshot = await getDocs(col);
  const jogadores = [];
  
  const fichaAtual = await getDoc(doc(db, "fichas", fichaId));
  if (fichaAtual.exists()) {
    jogadores.push({
      id: fichaId,
      nome: fichaAtual.data().nome || "Você mesmo",
      carteiras: fichaAtual.data().carteiras || []
    });
  }
  
  snapshot.forEach((doc) => {
    if (doc.id !== fichaId) {
      jogadores.push({
        id: doc.id,
        nome: doc.data().nome || doc.id,
        carteiras: doc.data().carteiras || []
      });
    }
  });
  
  setListaJogadores(jogadores);
  setModalTransferenciaOpen(true);
}} sx={{ mr: 1, bgcolor: '#1976d2' }}>
  🔄 Transferir
</Button>
    <Button variant="contained" size="small" onClick={() => setModalPagamentoOpen(true)} sx={{ bgcolor: '#ff9800' }}>
      💳 Pagar
    </Button>
  </Box>
</DialogTitle>
        <DialogContent sx={{ bgcolor: '#1a1a2e', color: '#fff' }}>
          <Box sx={{ mb: 2, display: 'flex', gap: 1 }}>
            <TextField
  size="small"
  placeholder="Ex: Bolso, Banco Hollow..."
  value={novaCarteiraNome}
  onChange={(e) => setNovaCarteiraNome(e.target.value)}
  sx={{ 
    flex: 1, 
    bgcolor: '#0f172a', 
    borderRadius: 1,
    '& input::placeholder': {
      color: '#666',
      fontStyle: 'italic',
      fontSize: '0.85rem'
    }
  }}
  InputProps={{ style: { color: '#fff' } }}
/>
            <Button variant="contained" onClick={() => {
              if (novaCarteiraNome.trim()) {
                setCarteiras([...carteiras, { nome: novaCarteiraNome, valor: 0 }]);
                setNovaCarteiraNome("");
              }
            }} sx={{ bgcolor: '#1976d2' }}>+ Adicionar</Button>
          </Box>
          {carteiras.map((carteira, index) => (
            <Paper key={index} sx={{ p: 2, mb: 1, bgcolor: '#0f172a' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="subtitle1" sx={{ color: '#fff', fontWeight: 'bold' }}>{carteira.nome}</Typography>
                <Box>
                  <IconButton size="small" onClick={() => {
                    const novoNome = prompt("Novo nome:", carteira.nome);
                    if (novoNome) {
                      const novasCarteiras = [...carteiras];
                      novasCarteiras[index].nome = novoNome;
                      setCarteiras(novasCarteiras);
                    }
                  }}>✏️</IconButton>
                  <IconButton size="small" onClick={() => {
  const carteiraParaExcluir = carteiras[index];
  const outrasCarteiras = carteiras.filter((_, i) => i !== index);
  
  // Se tem dinheiro e existem outras carteiras
  if (carteiraParaExcluir.valor > 0 && outrasCarteiras.length > 0) {
    // Pergunta para qual carteira transferir
    const destino = prompt(
      `A carteira "${carteiraParaExcluir.nome}" tem ${carteiraParaExcluir.valor} 💰.\n` +
      `Digite o nome da carteira para transferir o saldo:\n` +
      `Opções: ${outrasCarteiras.map(c => c.nome).join(', ')}`
    );
    
    if (destino) {
      const carteiraDestino = outrasCarteiras.find(c => 
        c.nome.toLowerCase() === destino.toLowerCase()
      );
      
      if (carteiraDestino) {
        // Transfere o valor
        const novasCarteiras = outrasCarteiras.map(c => 
          c.nome === carteiraDestino.nome 
            ? { ...c, valor: c.valor + carteiraParaExcluir.valor }
            : c
        );
        setCarteiras(novasCarteiras);
      } else {
        alert('Carteira não encontrada!');
        return;
      }
    } else {
      return; // Cancelou
    }
  } else if (carteiraParaExcluir.valor > 0 && outrasCarteiras.length === 0) {
    // Última carteira com dinheiro - não pode excluir
    alert('Não é possível excluir a última carteira com dinheiro!');
    return;
  } else {
    // Sem dinheiro, exclui normalmente
    setCarteiras(outrasCarteiras);
  }
}}>🗑️</IconButton>
                </Box>
              </Box>
              <TextField
  fullWidth
  size="small"
  type="number"
  value={carteira.valor}
  disabled={!isMestre} // 🔴 Apenas mestre pode editar
  onChange={(e) => {
    if (!isMestre) return; // Segurança extra
    const novasCarteiras = [...carteiras];
    novasCarteiras[index].valor = Number(e.target.value);
    setCarteiras(novasCarteiras);
  }}
  InputProps={{ 
    startAdornment: <InputAdornment position="start">💰</InputAdornment>, 
    style: { color: '#fff' },
    readOnly: !isMestre // Remove setinhas para jogadores
  }}
  sx={{ 
    bgcolor: '#1a1a2e',
    '& input[type=number]::-webkit-inner-spin-button': {
      display: isMestre ? 'block' : 'none' // Esconde setinhas para jogadores
    }
  }}
/>
            </Paper>
          ))}
          {carteiras.length > 0 && (
            <Box sx={{ mt: 2, p: 2, bgcolor: '#16213e', borderRadius: 1 }}>
              <Typography variant="h6" sx={{ color: '#00e0ff' }}>
                Total: 💰 {carteiras.reduce((total, c) => total + (c.valor || 0), 0)}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ bgcolor: '#1a1a2e' }}>
          <Button onClick={() => setModalDinheiroOpen(false)} sx={{ color: '#fff' }}>Fechar</Button>
          <Button variant="contained" onClick={async () => {
  const ref = doc(db, "fichas", fichaId);
  await setDoc(ref, { carteiras }, { merge: true });
  
  // Atualiza a ficha local
  setFicha(p => ({ ...p, carteiras }));
  
  setModalDinheiroOpen(false);
}} sx={{ bgcolor: '#2e7d32' }}>Salvar</Button>
        </DialogActions>
      </Dialog>
      {/* Modal Transferência */}
<Dialog open={modalTransferenciaOpen} onClose={() => setModalTransferenciaOpen(false)} maxWidth="sm" fullWidth>
  <DialogTitle sx={{ bgcolor: '#1a1a2e', color: '#fff' }}>🔄 Transferir Dinheiro</DialogTitle>
  <DialogContent sx={{ bgcolor: '#1a1a2e', color: '#fff' }}>
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
      <FormControl fullWidth>
        <InputLabel sx={{ color: '#fff' }}>Jogador Destino</InputLabel>
        <Select
          value={jogadorSelecionado}
          label="Jogador Destino"
          onChange={(e) => setJogadorSelecionado(e.target.value)}
          sx={{ color: '#fff' }}
        >
          {listaJogadores.map(jogador => (
            <MenuItem key={jogador.id} value={jogador.id}>{jogador.nome}</MenuItem>
          ))}
        </Select>
      </FormControl>
      
      <FormControl fullWidth>
        <InputLabel sx={{ color: '#fff' }}>Sua Carteira (Origem)</InputLabel>
        <Select
          value={carteiraOrigem}
          label="Sua Carteira (Origem)"
          onChange={(e) => setCarteiraOrigem(e.target.value)}
          sx={{ color: '#fff' }}
        >
          {carteiras.map(c => (
            <MenuItem key={c.nome} value={c.nome}>{c.nome} (Saldo: {c.valor})</MenuItem>
          ))}
        </Select>
      </FormControl>
      
      {jogadorSelecionado && (
        <FormControl fullWidth>
          <InputLabel sx={{ color: '#fff' }}>Carteira Destino</InputLabel>
          <Select
            value={carteiraDestino}
            label="Carteira Destino"
            onChange={(e) => setCarteiraDestino(e.target.value)}
            sx={{ color: '#fff' }}
          >
            {listaJogadores.find(j => j.id === jogadorSelecionado)?.carteiras.map(c => (
              <MenuItem key={c.nome} value={c.nome}>{c.nome}</MenuItem>
            ))}
          </Select>
        </FormControl>
      )}
      
      <TextField
        label="Valor"
        type="text"
        value={valorTransferencia}
        onChange={(e) => {
          const valor = Number(e.target.value);
          const maximo = carteiraOrigem ? carteiras.find(c => c.nome === carteiraOrigem)?.valor || 0 : 0;
          if (valor <= maximo) {
            setValorTransferencia(valor);
          }
        }}
        InputProps={{ 
          startAdornment: <InputAdornment position="start">💰</InputAdornment>,
          endAdornment: carteiraOrigem && (
            <InputAdornment position="end">
              <Button 
                size="small" 
                onClick={() => {
                  const maximo = carteiras.find(c => c.nome === carteiraOrigem)?.valor || 0;
                  setValorTransferencia(maximo);
                }}
                sx={{ minWidth: 'auto', p: 0.5 }}
              >
                Max
              </Button>
            </InputAdornment>
          )
        }}
        sx={{ input: { color: '#fff' } }}
        helperText={carteiraOrigem ? `Máximo: ${carteiras.find(c => c.nome === carteiraOrigem)?.valor || 0}` : "Selecione uma carteira"}
        FormHelperTextProps={{ sx: { color: '#aaa' } }}
      />
    </Box>
  </DialogContent>
  <DialogActions sx={{ bgcolor: '#1a1a2e' }}>
    <Button onClick={() => setModalTransferenciaOpen(false)} sx={{ color: '#fff' }}>Cancelar</Button>
    <Button variant="contained" onClick={realizarTransferencia} sx={{ bgcolor: '#1976d2' }}>Transferir</Button>
  </DialogActions>
</Dialog>

      {/* Modal Pagamento */}
      <Dialog open={modalPagamentoOpen} onClose={() => setModalPagamentoOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: '#1a1a2e', color: '#fff' }}>💳 Realizar Pagamento</DialogTitle>
        <DialogContent sx={{ bgcolor: '#1a1a2e', color: '#fff' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <FormControl fullWidth>
              <InputLabel sx={{ color: '#fff' }}>Carteira</InputLabel>
              <Select
                value={carteiraPagamento}
                label="Carteira"
                onChange={(e) => setCarteiraPagamento(e.target.value)}
                sx={{ color: '#fff' }}
              >
                {carteiras.map(c => (
                  <MenuItem key={c.nome} value={c.nome}>{c.nome} (Saldo: {c.valor})</MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <TextField
  label="Valor do Pagamento"
  type="number"
  value={valorPagamento}
  onChange={(e) => {
    const valor = Number(e.target.value);
    const maximo = carteiraPagamento ? carteiras.find(c => c.nome === carteiraPagamento)?.valor || 0 : 0;
    if (valor <= maximo) {
      setValorPagamento(valor);
    }
  }}
  InputProps={{ 
    startAdornment: <InputAdornment position="start">💰</InputAdornment>,
    endAdornment: carteiraPagamento && (
      <InputAdornment position="end">
        <Button 
          size="small" 
          onClick={() => {
            const maximo = carteiras.find(c => c.nome === carteiraPagamento)?.valor || 0;
            setValorPagamento(maximo);
          }}
          sx={{ minWidth: 'auto', p: 0.5 }}
        >
          Max
        </Button>
      </InputAdornment>
    )
  }}
  sx={{ input: { color: '#fff' } }}
  helperText={carteiraPagamento ? `Máximo: ${carteiras.find(c => c.nome === carteiraPagamento)?.valor || 0}` : "Selecione uma carteira"}
  FormHelperTextProps={{ sx: { color: '#aaa' } }}
/>
          </Box>
        </DialogContent>
        <DialogActions sx={{ bgcolor: '#1a1a2e' }}>
          <Button onClick={() => setModalPagamentoOpen(false)} sx={{ color: '#fff' }}>Cancelar</Button>
          <Button variant="contained" onClick={realizarPagamento} sx={{ bgcolor: '#ff9800' }}>Pagar</Button>
        </DialogActions>
      </Dialog>

{/* Modal de Talentos */}
<Dialog 
  open={modalTalentosOpen} 
  onClose={() => setModalTalentosOpen(false)}
  maxWidth="lg"
  fullWidth
>
  <DialogTitle sx={{ bgcolor: '#1a1a2e', color: '#fff' }}>
    Selecionar Talentos
  </DialogTitle>
  <DialogContent sx={{ bgcolor: '#1a1a2e', color: '#fff' }}>
    <Box sx={{ mb: 3, p: 2, bgcolor: '#16213e', borderRadius: 2 }}>
      <Typography variant="h6" sx={{ color: '#9c27b0' }}>
        Pontos de Atributo Disponíveis: {pontosAtributoRestantes}
      </Typography>
    </Box>
    
    {Object.entries(TALENTOS_POR_ATRIBUTO).map(([atributo, talentos]) => {
      const nivelAtributo = ficha.atributos?.[atributo] || 1;
      const liberado = nivelAtributo >= 5;
      
      return (
        <Box key={atributo} sx={{ mb: 3, opacity: liberado ? 1 : 0.5 }}>
          <Typography 
            variant="h6" 
            sx={{ 
              color: '#9c27b0',
              fontWeight: 'bold',
              mb: 1,
              borderBottom: '2px solid #9c27b0',
              pb: 1
            }}
          >
            {LABEL_MAP[atributo]} {!liberado && '(Nível 5 necessário)'}
          </Typography>
          
          <Grid container spacing={1}>
            {talentos.map(talento => {
              const isSelected = talentosSelecionados.includes(talento.nome);
              const podeComprar = liberado && (isSelected || pontosAtributoRestantes >= talento.custo);
              
              return (
                <Grid item xs={12} sm={6} md={4} key={talento.nome}>
                  <Paper 
                    sx={{ 
                      p: 1.5, 
                      bgcolor: isSelected ? '#2d1b4e' : '#0f172a',
                      border: isSelected ? '2px solid #9c27b0' : '1px solid #333',
                      borderRadius: 1,
                      transition: 'all 0.2s',
                      '&:hover': { bgcolor: '#1e293b' }
                    }}
                  >
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={isSelected}
                          disabled={!podeComprar}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setTalentosSelecionados([...talentosSelecionados, talento.nome]);
                            } else {
                              setTalentosSelecionados(talentosSelecionados.filter(t => t !== talento.nome));
                            }
                          }}
                          sx={{ color: '#9c27b0' }}
                        />
                      }
                      label={
                        <Box sx={{ ml: 1 }}>
                          <Typography variant="body1" sx={{ fontWeight: 'bold', color: '#fff' }}>
                            {talento.nome}
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#9c27b0' }}>
                            Custo: {talento.custo} P.A
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#aaa', display: 'block', mt: 0.5 }}>
                            {talento.descricao}
                          </Typography>
                        </Box>
                      }
                    />
                  </Paper>
                </Grid>
              );
            })}
          </Grid>
          
          <Divider sx={{ mt: 2, bgcolor: '#333' }} />
        </Box>
      );
    })}
  </DialogContent>
  <DialogActions sx={{ bgcolor: '#1a1a2e' }}>
    <Button onClick={() => setTalentosSelecionados([])} sx={{ color: '#fff' }}>
      Limpar Seleção
    </Button>
    <Button onClick={() => setModalTalentosOpen(false)} sx={{ color: '#fff' }}>
      Cancelar
    </Button>
    <Button 
      variant="contained"
      color="error"
      onClick={async () => {
        await salvarTalentos([]);
        setModalTalentosOpen(false);
      }}
    >
      LIMPAR TUDO
    </Button>
    <Button 
      variant="contained"
      sx={{ bgcolor: '#9c27b0', '&:hover': { bgcolor: '#7b1fa2' } }}
      onClick={async () => {
        await salvarTalentos(talentosSelecionados);
        setModalTalentosOpen(false);
      }}
    >
      Salvar Talentos
    </Button>
  </DialogActions>
</Dialog>
          {/* Modal Galeria */}
      <Dialog open={modalGaleriaOpen} onClose={() => setModalGaleriaOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ bgcolor: '#1a1a2e', color: '#fff' }}>🖼️ Galeria de Imagens</DialogTitle>
        <DialogContent sx={{ bgcolor: '#1a1a2e', color: '#fff', minHeight: 400 }}>
          <Box sx={{ mb: 2 }}>
            <Button variant="contained" component="label" startIcon={<span>📤</span>} sx={{ bgcolor: '#9c27b0' }}>
              Upload de Imagem
              <input type="file" accept="image/*" hidden multiple onChange={async (e) => {
                const files = Array.from(e.target.files);
                for (const file of files) {
                  const fd = new FormData();
                  fd.append("file", file);
                  try {
                    const res = await fetch("https://reqviem.onrender.com/upload", { method: "POST", body: fd });
                    const data = await res.json();
                    if (data.url) {
                      const novasImagens = [...(ficha.imagens || []), data.url];
                      setFicha(p => ({ ...p, imagens: novasImagens }));
                      const ref = doc(db, "fichas", fichaId);
                      await setDoc(ref, { imagens: novasImagens }, { merge: true });
                    }
                  } catch (err) { console.error("Erro no upload:", err); }
                }
              }} />
            </Button>
          </Box>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {(ficha.imagens || []).map((url, index) => (
              <Box key={index} sx={{ position: 'relative', width: 100, height: 100 }}>
                <img src={url} alt={`Imagem ${index}`} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 4, cursor: 'pointer' }}
                  onClick={() => { setZoom(1); setLightboxSrc(url); setLightboxOpen(true); }} />
                <IconButton size="small" sx={{ position: 'absolute', top: -5, right: -5, bgcolor: '#ff0000', '&:hover': { bgcolor: '#cc0000' } }}
                  onClick={async () => {
                    const novasImagens = ficha.imagens.filter((_, i) => i !== index);
                    setFicha(p => ({ ...p, imagens: novasImagens }));
                    const ref = doc(db, "fichas", fichaId);
                    await setDoc(ref, { imagens: novasImagens }, { merge: true });
                  }}>🗑️</IconButton>
              </Box>
            ))}
          </Box>
        </DialogContent>
        <DialogActions sx={{ bgcolor: '#1a1a2e' }}>
          <Button onClick={() => setModalGaleriaOpen(false)} sx={{ color: '#fff' }}>Fechar</Button>
        </DialogActions>
      </Dialog>
      {/* 🟢 ADICIONE AQUI - Modal Inventário */}
      <Dialog 
        open={modalInventarioOpen} 
        onClose={() => setModalInventarioOpen(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: "#0f172a",
            border: "1px solid #1e293b",
            borderRadius: 2,
            minHeight: "70vh"
          }
        }}
      >
        <DialogTitle sx={{ 
  bgcolor: '#1a1a2e', 
  color: '#fff', 
  display: 'flex', 
  justifyContent: 'space-between', 
  alignItems: 'center',
  borderBottom: '1px solid #1e293b'
}}>
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
    <span style={{ fontSize: '1.5rem' }}>🎒</span>
    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
      INVENTÁRIO
    </Typography>
    <Typography
      sx={{
        fontWeight: "bold",
        color: ficha?.ignorarLimitePeso
          ? "#00ffff"
          : sobrecarregado
          ? "#ff4444"
          : "#ffaa00",
        fontSize: 16,
        ml: 2
      }}
    >
      🏋️ {pesoAtual} / {pesoMaximo}
    </Typography>
  </Box>
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
    {/* 🟢 Botão Transferir Item */}
    <Button
      variant="contained"
      size="small"
      onClick={async () => {
        // Carregar lista de jogadores
        const col = collection(db, "fichas");
        const snapshot = await getDocs(col);
        const jogadores = [];
        
        const fichaAtual = await getDoc(doc(db, "fichas", fichaId));
        if (fichaAtual.exists()) {
          jogadores.push({
            id: fichaId,
            nome: fichaAtual.data().nome || "Você mesmo",
            equipamentos: fichaAtual.data().equipamentos || [],
            vestes: fichaAtual.data().vestes || [],
            diversos: fichaAtual.data().diversos || []
          });
        }
        
        snapshot.forEach((doc) => {
          if (doc.id !== fichaId) {
            jogadores.push({
              id: doc.id,
              nome: doc.data().nome || doc.id,
              equipamentos: doc.data().equipamentos || [],
              vestes: doc.data().vestes || [],
              diversos: doc.data().diversos || []
            });
          }
        });
        
        setListaJogadores(jogadores);
        setModalTransferirItemOpen(true);
      }}
      sx={{ mr: 1, bgcolor: '#1976d2', '&:hover': { bgcolor: '#115293' } }}
    >
      🔄 Transferir
    </Button>
    
    {/* 🟢 Botão Dropar Item */}
    <Button
      variant="contained"
      size="small"
      onClick={() => setModalDroparItemOpen(true)}
      sx={{ mr: 1, bgcolor: '#ff9800', '&:hover': { bgcolor: '#f57c00' } }}
    >
      🗑️ Dropar
    </Button>
    
    {isMestre && (
      <FormControlLabel
        control={
          <Checkbox
            checked={ficha.ignorarLimitePeso || false}
            onChange={async (e) => {
              const novoValor = e.target.checked;
              setFicha((prev) => ({
                ...prev,
                ignorarLimitePeso: novoValor,
              }));
              const ref = doc(db, "fichas", fichaId);
              await setDoc(ref, { ignorarLimitePeso: novoValor }, { merge: true });
            }}
            size="small"
            sx={{ color: '#fff' }}
          />
        }
        label="Ignorar limite"
      />
    )}
    <IconButton onClick={() => setModalInventarioOpen(false)} sx={{ color: '#94a3b8' }}>
      <CloseIcon />
    </IconButton>
  </Box>
</DialogTitle>

        <DialogContent sx={{ p: 3 }}>
          {/* Tabs */}
          <Box sx={{ borderBottom: 1, borderColor: '#334155', mb: 3 }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              {[
                { id: 'equipamentos', label: '⚔️ Equipamentos', desc: '(Armas, ferramentas, itens de acesso rápido)' },
                { id: 'vestes', label: '👕 Vestimentas', desc: '(Roupas, armaduras, acessórios vestidos)' },
                { id: 'diversos', label: '📦 Diversos', desc: '(Itens gerais, consumíveis, materiais)' }
              ].map((aba) => (
                <Button
                  key={aba.id}
                  onClick={() => setAbaAtiva(aba.id)}
                  sx={{
                    color: abaAtiva === aba.id ? '#00e0ff' : '#94a3b8',
                    borderBottom: abaAtiva === aba.id ? '2px solid #00e0ff' : '2px solid transparent',
                    borderRadius: 0,
                    px: 3,
                    py: 1,
                    '&:hover': {
                      color: '#00e0ff',
                      bgcolor: 'transparent'
                    }
                  }}
                >
                  <Box sx={{ textAlign: 'left' }}>
                    <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                      {aba.label}
                    </Typography>
                    <Typography variant="caption" sx={{ fontSize: '0.7rem', opacity: 0.7 }}>
                      {aba.desc}
                    </Typography>
                  </Box>
                </Button>
              ))}
            </Box>
          </Box>

          {/* Lista de Itens */}
          <Box sx={{ mb: 2 }}>
  <Typography variant="body2" sx={{ color: '#94a3b8', mb: 1 }}>
    {ficha[abaAtiva]?.length || 0} itens • Clique na imagem para ampliar
  </Typography>   
              {ficha[abaAtiva]?.map((item, index) => {
    const durabilidadePercent = (item.durabilidade || 100) / 100;
    const barColor = durabilidadePercent > 0.66 ? '#4caf50' : durabilidadePercent > 0.33 ? '#ff9800' : '#f44336';
    
    return (
      <Box key={index} sx={{ mb: 2 }}>
        {/* TÍTULOS */}
        <Box sx={{ display: 'flex', mb: 0.5, px: 1 }}>
                    <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 'bold', width: 60 }}>Imagem</Typography>
          <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 'bold', width: 45 }}>Qtd</Typography>
          <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 'bold', flex: 1.2 }}>Nome</Typography>
          <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 'bold', flex: 1 }}>Durabilidade</Typography>
                    <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 'bold', flex: 1.2 }}>Tipo Dano</Typography>
          {isMestre && (
            <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 'bold', flex: 1.2 }}>Consumível</Typography>
          )}
          {!isMestre && (
            <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 'bold', width: 60 }}>Usar</Typography>
          )}
          <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 'bold', width: 50, textAlign: 'right' }}>Dado</Typography>
        </Box>

        {/* BOX DO ITEM */}
        <Paper 
          sx={{ 
            p: 1.5, 
            bgcolor: '#1a1a2e',
            border: '1px solid #334155',
            '&:hover': { borderColor: '#00e0ff' }
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {/* Imagem */}
            <Box sx={{ width: 60, position: 'relative' }}>
              <Box
                sx={{
                  width: 50,
                  height: 50,
                  bgcolor: '#0f172a',
                  borderRadius: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: item.imagem ? 'pointer' : 'default',
                  border: '1px solid #334155',
                  overflow: 'hidden'
                }}
                onClick={() => {
                  if (item.imagem) {
                    setLightboxSrc(item.imagem);
                    setZoom(1);
                    setLightboxOpen(true);
                  }
                }}
              >
                {item.imagem ? (
                  <img 
                    src={item.imagem} 
                    alt={item.nome}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <Typography sx={{ fontSize: '1.2rem', opacity: 0.5 }}>📦</Typography>
                )}
              </Box>
              
              {item.imagem && (
                <IconButton
                  size="small"
                  onClick={() => atualizarItem(abaAtiva, index, "imagem", "")}
                  sx={{
                    position: 'absolute',
                    top: -5,
                    right: 5,
                    bgcolor: '#ef4444',
                    width: 16,
                    height: 16,
                    '&:hover': { bgcolor: '#dc2626' }
                  }}
                >
                  <CloseIcon sx={{ fontSize: 10, color: '#fff' }} />
                </IconButton>
              )}
              
              <Button
                size="small"
                component="label"
                sx={{ mt: 0.5, fontSize: '0.5rem', minWidth: 'auto', p: 0 }}
              >
                📷
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    
                    const fd = new FormData();
                    fd.append("file", file);
                    
                    try {
                      const res = await fetch("https://reqviem.onrender.com/upload", {
                        method: "POST",
                        body: fd,
                      });
                      const data = await res.json();
                      if (data.url) {
                        atualizarItem(abaAtiva, index, "imagem", data.url);
                      }
                    } catch (err) {
                      console.error("Erro no upload:", err);
                    }
                  }}
                />
              </Button>
            </Box>

            {/* Quantidade */}
            <TextField
              size="small"
              type="number"
              value={item.quantidade || 1}
              disabled={!isMestre}
              onChange={(e) => {
                if (!isMestre) return;
                atualizarItem(abaAtiva, index, "quantidade", Number(e.target.value));
              }}
              InputProps={{ 
                inputProps: { min: 1 },
                sx: { color: '#fff' }
              }}
              sx={{ 
                width: 50,
                bgcolor: '#0f172a',
                '& input': { textAlign: 'center' }
              }}
            />

            {/* Nome - MENOR AGORA (flex: 1) */}
            <TextField
              size="small"
              placeholder="Nome"
              value={item.nome || ""}
              disabled={!isMestre && !item.editandoNome}
              onChange={(e) => {
                if (!isMestre && !item.editandoNome) return;
                atualizarItem(abaAtiva, index, "nome", e.target.value);
              }}
              InputProps={{ 
                sx: { color: '#fff', fontWeight: 'bold' },
                endAdornment: !isMestre && (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={() => {
                        const novosItens = [...ficha[abaAtiva]];
                        novosItens[index] = { 
                          ...novosItens[index], 
                          editandoNome: !novosItens[index].editandoNome 
                        };
                        setFicha(p => ({ ...p, [abaAtiva]: novosItens }));
                      }}
                      sx={{ color: item.editandoNome ? '#4caf50' : '#94a3b8' }}
                    >
                      {item.editandoNome ? '✅' : '✏️'}
                    </IconButton>
                  </InputAdornment>
                )
              }}
              sx={{ 
                flex: 1,
                bgcolor: '#0f172a',
                '& .MuiInputBase-input': { 
                  color: '#fff',
                  fontWeight: 'bold'
                }
              }}
            />

            {/* Durabilidade - MAIOR AGORA (flex: 2.5) */}
            <Box sx={{ flex: 2.5, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="caption" sx={{ color: '#94a3b8', minWidth: 30 }}>
                Dur:
              </Typography>
              
              <Box sx={{ 
                flex: 1, 
                height: 12, 
                bgcolor: '#1e293b', 
                borderRadius: 6, 
                overflow: 'hidden',
                border: '1px solid #475569'
              }}>
                <Box 
                  sx={{ 
                    width: `${durabilidadePercent * 100}%`, 
                    height: '100%', 
                    bgcolor: barColor,
                    transition: 'width 0.3s'
                  }} 
                />
              </Box>
              
              <TextField
                size="small"
                type="number"
                value={item.durabilidade || 100}
                disabled={!isMestre}
                onChange={(e) => {
                  if (!isMestre) return;
                  const valor = Math.min(100, Math.max(0, Number(e.target.value)));
                  atualizarItem(abaAtiva, index, "durabilidade", valor);
                }}
                InputProps={{ 
                  inputProps: { min: 0, max: 100 },
                  sx: { color: '#fff' }
                }}
                sx={{ width: 65, bgcolor: '#0f172a' }}
              />
              <Typography variant="caption" sx={{ color: '#94a3b8' }}>%</Typography>
            </Box>
{/* 🟢 TIPO DE DANO */}
            <Box sx={{ flex: 1.2 }}>
              <FormControl fullWidth size="small">
                <Select
                  value={item.tipoDano || "Nenhum"}
                  disabled={!isMestre}
                  onChange={(e) => {
                    if (!isMestre) return;
                    atualizarItem(abaAtiva, index, "tipoDano", e.target.value);
                  }}
                  sx={{ 
                    color: TIPOS_DANO.find(t => t.valor === (item.tipoDano || "Nenhum"))?.cor || '#888',
                    bgcolor: '#0f172a',
                    fontSize: '0.7rem',
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: '#334155' },
                  }}
                  MenuProps={{
                    PaperProps: { 
                      sx: { 
                        bgcolor: "#0f172a", 
                        color: "#fff",
                        maxHeight: 300,
                      } 
                    }
                  }}
                >
                  {TIPOS_DANO.map(td => (
                    <MenuItem key={td.valor} value={td.valor}>
                      <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                        <Typography variant="body2" sx={{ color: td.cor, fontWeight: 'bold' }}>
                          {td.label}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.6rem' }}>
                          {td.descricao}
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
                        {/* 🟢 CONSUMÍVEL (SÓ MESTRE) */}
            {isMestre && (
              <Box sx={{ flex: 1.2 }}>
                <FormControl fullWidth size="small">
                  <Select
                    value={item.consumivel || "Nenhum"}
                    onChange={(e) => {
                      const val = e.target.value;
                      atualizarItem(abaAtiva, index, "consumivel", val);
                      if (val === "Nenhum") {
                        atualizarItem(abaAtiva, index, "consumivelValor", 0);
                      }
                    }}
                    sx={{ 
                      color: TIPOS_CONSUMIVEL.find(t => t.valor === (item.consumivel || "Nenhum"))?.cor || '#888',
                      bgcolor: '#0f172a',
                      fontSize: '0.7rem',
                      '& .MuiOutlinedInput-notchedOutline': { borderColor: '#334155' },
                    }}
                    MenuProps={{
                      PaperProps: { 
                        sx: { 
                          bgcolor: "#0f172a", 
                          color: "#fff",
                          maxHeight: 200,
                        } 
                      }
                    }}
                  >
                    {TIPOS_CONSUMIVEL.map(tc => (
                      <MenuItem key={tc.valor} value={tc.valor}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: tc.cor }} />
                          <Typography sx={{ color: tc.cor, fontWeight: 'bold', fontSize: '0.8rem' }}>
                            {tc.label}
                          </Typography>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                                {(item.consumivel && item.consumivel !== "Nenhum") && (
                  <Box sx={{ display: 'flex', gap: 0.3, mt: 0.3 }}>
                    <TextField
                      size="small"
                      type="number"
                      value={item.consumivelValor || 0}
                      onChange={(e) => {
                        atualizarItem(abaAtiva, index, "consumivelValor", Math.max(0, Number(e.target.value) || 0));
                      }}
                      InputProps={{ 
                        inputProps: { min: 0 },
                        sx: { color: '#fff', fontSize: '0.6rem' }
                      }}
                      sx={{ 
                        flex: 1,
                        bgcolor: '#0f172a',
                        '& input': { textAlign: 'center' }
                      }}
                      placeholder="Valor"
                    />
                    <TextField
                      size="small"
                      type="number"
                      value={item.consumivelPercentual || 100}
                      onChange={(e) => {
                        const val = Math.min(100, Math.max(1, Number(e.target.value) || 1));
                        atualizarItem(abaAtiva, index, "consumivelPercentual", val);
                      }}
                      InputProps={{ 
                        inputProps: { min: 1, max: 100 },
                        sx: { color: '#fff', fontSize: '0.6rem' },
                        endAdornment: <InputAdornment position="end" sx={{ '& p': { color: '#888', fontSize: '0.55rem' } }}>%</InputAdornment>
                      }}
                      sx={{ 
                        flex: 1,
                        bgcolor: '#0f172a',
                        '& input': { textAlign: 'center' }
                      }}
                      placeholder="%"
                    />
                  </Box>
                )}
              </Box>
            )}
          
            {/* Dado e Deletar - MAIOR AGORA (width: 90) */}
            <Box sx={{ width: 90, display: 'flex', gap: 0.5, justifyContent: 'flex-end', alignItems: 'center' }}>
              <TextField
                size="small"
                type="number"
                value={item.dado || 1}
                disabled={!isMestre}
                onChange={(e) => {
                  if (!isMestre) return;
                  const valor = Math.min(10, Math.max(1, Number(e.target.value) || 1));
                  atualizarItem(abaAtiva, index, "dado", valor);
                }}
                InputProps={{ 
                  inputProps: { min: 1, max: 10 },
                  sx: { color: '#fff' }
                }}
                sx={{ 
                  width: 55,
                  bgcolor: '#0f172a',
                  '& input': { textAlign: 'center' },
                  '& .MuiInputBase-input.Mui-disabled': {
                    WebkitTextFillColor: '#fff !important',
                    opacity: 0.7
                  }
                }}
              />

              {isMestre && (
                <IconButton
                  color="error"
                  size="small"
                  onClick={() => removerItem(abaAtiva, index)}
                  sx={{ bgcolor: 'rgba(244, 67, 54, 0.1)' }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              )}
            </Box>
          </Box>
        </Paper>
      </Box>
    );
  })}
          </Box>

         {/* Botão Adicionar Item - Apenas Mestre */}

  <Button
    startIcon={<AddIcon />}
    variant="outlined"
    fullWidth
    disabled={!ficha?.ignorarLimitePeso && pesoAtual >= pesoMaximo}
    onClick={() => {
              if (!ficha?.ignorarLimitePeso && pesoAtual >= pesoMaximo) {
                alert("Peso máximo atingido");
                return;
              }
              adicionarItem(abaAtiva);
            }}
            sx={{ 
              color: '#00e0ff',
              borderColor: '#334155',
              '&:hover': { borderColor: '#00e0ff', bgcolor: 'rgba(0, 224, 255, 0.1)' }
            }}
          >
            Adicionar {LABEL_MAP[abaAtiva] || abaAtiva}
          </Button>

        </DialogContent>

        <DialogActions sx={{ p: 2, borderTop: '1px solid #1e293b' }}>
          <Button 
            onClick={async () => {
              await salvarFicha();
              setModalInventarioOpen(false);
            }}
            variant="contained"
            sx={{ bgcolor: '#2e7d32', '&:hover': { bgcolor: '#1b5e20' } }}
          >
            Salvar e Fechar
          </Button>
        </DialogActions>
      </Dialog>

      {/* 🟢 Modal Transferir Item - ATUALIZADO */}
<Dialog
  open={modalTransferirItemOpen}
  onClose={() => setModalTransferirItemOpen(false)}
  maxWidth="sm"
  fullWidth
  PaperProps={{
    sx: {
      bgcolor: "#0f172a",
      border: "1px solid #1e293b",
      borderRadius: 2
    }
  }}
>
  <DialogTitle sx={{ color: '#fff' }}>
    🔄 Transferir Item
  </DialogTitle>
  <DialogContent>
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
      {/* Selecionar Item */}
      <FormControl fullWidth>
        <InputLabel sx={{ color: '#fff' }}>Item para Transferir</InputLabel>
        <Select
          value={itemParaTransferir?.index || ''}
          onChange={(e) => {
            const idx = e.target.value;
            setItemParaTransferir({
              index: idx,
              item: ficha[abaAtiva][idx],
              quantidade: ficha[abaAtiva][idx].quantidade
            });
            setQuantidadeTransferir(1);
          }}
          sx={{ color: '#fff' }}
        >
          {ficha[abaAtiva]?.map((item, idx) => (
            <MenuItem key={idx} value={idx}>
              {item.quantidade}x {item.nome || 'Sem nome'}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      
      {/* Quantidade */}
      {itemParaTransferir && (
        <TextField
          label="Quantidade"
          type="number"
          fullWidth
          value={quantidadeTransferir}
          onChange={(e) => {
            const val = Math.min(itemParaTransferir.quantidade, Math.max(1, Number(e.target.value) || 1));
            setQuantidadeTransferir(val);
          }}
          InputProps={{ 
            inputProps: { min: 1, max: itemParaTransferir.quantidade },
            sx: { color: '#fff' }
          }}
          helperText={`Máximo: ${itemParaTransferir.quantidade}`}
          FormHelperTextProps={{ sx: { color: '#aaa' } }}
        />
      )}
      
      {/* Jogador Destino (incluindo SI MESMO) */}
      <FormControl fullWidth>
        <InputLabel sx={{ color: '#fff' }}>Jogador Destino</InputLabel>
        <Select
          value={jogadorDestinoItem}
          onChange={(e) => setJogadorDestinoItem(e.target.value)}
          sx={{ color: '#fff' }}
        >
          {/* 🟢 Opção para SI MESMO */}
          <MenuItem value={fichaId}>
            🔄 Você mesmo (mover para outra categoria)
          </MenuItem>
          
          {/* Outros jogadores */}
          {listaJogadores.filter(j => j.id !== fichaId).map(jogador => (
            <MenuItem key={jogador.id} value={jogador.id}>
              {jogador.nome}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      
      {/* 🟢 Se for para SI MESMO, mostra seleção de categoria */}
      {jogadorDestinoItem === fichaId && (
        <FormControl fullWidth>
          <InputLabel sx={{ color: '#fff' }}>Categoria Destino</InputLabel>
          <Select
            value={categoriaDestino}
            onChange={(e) => setCategoriaDestino(e.target.value)}
            sx={{ color: '#fff' }}
          >
            <MenuItem value="equipamentos">⚔️ Equipamentos</MenuItem>
            <MenuItem value="vestes">👕 Vestimentas</MenuItem>
            <MenuItem value="diversos">📦 Diversos</MenuItem>
          </Select>
        </FormControl>
      )}
    </Box>
  </DialogContent>
  <DialogActions sx={{ p: 2 }}>
    <Button onClick={() => setModalTransferirItemOpen(false)} sx={{ color: '#94a3b8' }}>
      Cancelar
    </Button>
    <Button 
      variant="contained"
      onClick={transferirItem}
      sx={{ bgcolor: '#1976d2' }}
    >
      {jogadorDestinoItem === fichaId ? 'Mover' : 'Transferir'}
    </Button>
  </DialogActions>
</Dialog>

      {/* 🟢 Modal Dropar Item */}
      <Dialog
        open={modalDroparItemOpen}
        onClose={() => setModalDroparItemOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: "#0f172a",
            border: "1px solid #1e293b",
            borderRadius: 2
          }
        }}
      >
        <DialogTitle sx={{ color: '#fff' }}>
          🗑️ Dropar Item
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <FormControl fullWidth>
              <InputLabel sx={{ color: '#fff' }}>Item para Dropar</InputLabel>
              <Select
                value={itemParaDropar?.index || ''}
                onChange={(e) => {
                  const idx = e.target.value;
                  setItemParaDropar({
                    index: idx,
                    item: ficha[abaAtiva][idx],
                    quantidade: ficha[abaAtiva][idx].quantidade
                  });
                  setQuantidadeDropar(1);
                }}
                sx={{ color: '#fff' }}
              >
                {ficha[abaAtiva]?.map((item, idx) => (
                  <MenuItem key={idx} value={idx}>
                    {item.quantidade}x {item.nome || 'Sem nome'}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            {itemParaDropar && (
              <TextField
                label="Quantidade"
                type="number"
                fullWidth
                value={quantidadeDropar}
                onChange={(e) => {
                  const val = Math.min(itemParaDropar.quantidade, Math.max(1, Number(e.target.value) || 1));
                  setQuantidadeDropar(val);
                }}
                InputProps={{ 
                  inputProps: { min: 1, max: itemParaDropar.quantidade },
                  sx: { color: '#fff' }
                }}
                helperText={`Máximo: ${itemParaDropar.quantidade}`}
                FormHelperTextProps={{ sx: { color: '#aaa' } }}
              />
            )}
            
            <Typography variant="caption" sx={{ color: '#ef4444' }}>
              ⚠️ Itens dropados serão perdidos permanentemente!
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setModalDroparItemOpen(false)} sx={{ color: '#94a3b8' }}>
            Cancelar
          </Button>
          <Button 
            variant="contained"
            onClick={droparItem}
            sx={{ bgcolor: '#ef4444', '&:hover': { bgcolor: '#dc2626' } }}
          >
            Dropar
          </Button>
        </DialogActions>
      </Dialog>
      {/* 🟢 MODAL DE ANOTAÇÕES */}
      <Dialog 
        open={modalAnotacoesOpen} 
        onClose={() => setModalAnotacoesOpen(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{ sx: { bgcolor: "#0f172a", border: "1px solid #1e293b", borderRadius: 2, minHeight: "80vh" } }}
      >
        <DialogTitle sx={{ color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <span style={{ fontSize: '1.5rem' }}>📝</span>
            Anotações - {ficha?.nome || "Personagem"}
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button 
              size="small" 
              variant="contained" 
              startIcon={<AddIcon />}
              onClick={() => {
                setAnotacaoEditandoIndex(null);
                setAnotacaoTitulo("");
                setAnotacoesTexto("");
              }}
              sx={{ bgcolor: '#ff9800' }}
            >
              Nova Anotação
            </Button>
            <IconButton onClick={() => setModalAnotacoesOpen(false)} sx={{ color: '#94a3b8' }}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        
        <DialogContent sx={{ display: 'flex', gap: 2, p: 2, height: "70vh" }}>
          {/* Lista de anotações salvas */}
          <Box sx={{ width: 250, borderRight: '1px solid #334155', pr: 2, overflowY: 'auto' }}>
            <Typography variant="subtitle2" sx={{ color: '#94a3b8', mb: 1 }}>
              {anotacoesSalvos.length} anotações
            </Typography>
            {anotacoesSalvos.map((anot, idx) => (
              <Paper 
                key={idx}
                sx={{ 
                  p: 1.5, mb: 1, 
                  bgcolor: anotacaoEditandoIndex === idx ? '#1e3a5f' : '#1a1a2e',
                  cursor: 'pointer',
                  border: anotacaoEditandoIndex === idx ? '1px solid #ff9800' : '1px solid #334155',
                  '&:hover': { borderColor: '#ff9800' }
                }}
                onClick={() => {
                  setAnotacaoEditandoIndex(idx);
                  setAnotacaoTitulo(anot.titulo);
                  setAnotacoesTexto(anot.texto);
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="caption" sx={{ color: '#fff', fontWeight: 'bold' }}>
                    {anot.titulo || `Anotação ${idx + 1}`}
                  </Typography>
                  <IconButton 
                    size="small" 
                    onClick={(e) => {
                      e.stopPropagation();
                      const novas = anotacoesSalvos.filter((_, i) => i !== idx);
                      setAnotacoesSalvos(novas);
                      if (anotacaoEditandoIndex === idx) {
                        setAnotacaoEditandoIndex(null);
                        setAnotacaoTitulo("");
                        setAnotacoesTexto("");
                      }
                    }}
                    sx={{ color: '#ef4444' }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
                <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mt: 0.5, maxHeight: 30, overflow: 'hidden' }}>
                  {anot.texto?.substring(0, 50)}...
                </Typography>
              </Paper>
            ))}
            {anotacoesSalvos.length === 0 && (
              <Typography variant="caption" sx={{ color: '#64748b' }}>
                Nenhuma anotação salva
              </Typography>
            )}
          </Box>
          
          {/* Editor de anotação */}
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <TextField
              label="Título da anotação"
              fullWidth
              size="small"
              value={anotacaoTitulo}
              onChange={(e) => setAnotacaoTitulo(e.target.value)}
              InputProps={{ style: { color: '#fff' } }}
              InputLabelProps={{ style: { color: '#94a3b8' } }}
              sx={{ mb: 1 }}
            />
            
            <Box sx={{ mb: 1, display: 'flex', gap: 1 }}>
              <Button 
                size="small" 
                variant="outlined" 
                component="label"
                startIcon={<span>📷</span>}
                sx={{ color: '#94a3b8', borderColor: '#555' }}
              >
                Inserir Imagem
                <input
                  hidden
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      const apiBase = window.location.hostname === "localhost" ? "http://localhost:5000" : "https://app-rpg.onrender.com";
                      const fd = new FormData();
                      fd.append("file", file);
                      const res = await fetch(`${apiBase}/upload`, { method: "POST", body: fd });
                      const data = await res.json();
                      if (data.url) {
                        // Insere no local do cursor
                        const textarea = document.querySelector('#anotacao-textarea textarea');
                        if (textarea) {
                          const start = textarea.selectionStart;
                          const end = textarea.selectionEnd;
                          const antes = anotacoesTexto.substring(0, start);
                          const depois = anotacoesTexto.substring(end);
                          const imagemMarkdown = `\n![Imagem](${data.url})\n`;
                          setAnotacoesTexto(antes + imagemMarkdown + depois);
                          setTimeout(() => {
                            textarea.focus();
                            textarea.selectionStart = start + imagemMarkdown.length;
                            textarea.selectionEnd = start + imagemMarkdown.length;
                          }, 100);
                        } else {
                          setAnotacoesTexto(prev => prev + `\n![Imagem](${data.url})\n`);
                        }
                      }
                    } catch (err) {
                      alert("Erro ao enviar imagem");
                    }
                  }}
                />
              </Button>
              
              {anotacaoEditandoIndex !== null && (
                <Button 
                  size="small" 
                  variant="contained" 
                  onClick={async () => {
                    const novas = [...anotacoesSalvos];
                    novas[anotacaoEditandoIndex] = { titulo: anotacaoTitulo, texto: anotacoesTexto };
                    setAnotacoesSalvos(novas);
                    await setDoc(doc(db, "fichas", fichaId), { anotacoes: JSON.stringify(novas) }, { merge: true });
                    alert("Anotação atualizada!");
                  }}
                  sx={{ bgcolor: '#ff9800' }}
                >
                  💾 Atualizar
                </Button>
              )}
              
              {anotacaoEditandoIndex === null && anotacoesTexto.trim() && (
                <Button 
                  size="small" 
                  variant="contained" 
                  onClick={async () => {
                    const novas = [...anotacoesSalvos, { titulo: anotacaoTitulo || "Anotação", texto: anotacoesTexto }];
                    setAnotacoesSalvos(novas);
                    setAnotacaoTitulo("");
                    setAnotacoesTexto("");
                    await setDoc(doc(db, "fichas", fichaId), { anotacoes: JSON.stringify(novas) }, { merge: true });
                    alert("Anotação salva!");
                  }}
                  sx={{ bgcolor: '#4caf50' }}
                >
                  ➕ Salvar
                </Button>
              )}
            </Box>
            
            <TextField
              id="anotacao-textarea"
              label="Conteúdo (Markdown)"
              fullWidth
              multiline
              minRows={15}
              maxRows={30}
              value={anotacoesTexto}
              onChange={(e) => setAnotacoesTexto(e.target.value)}
              InputProps={{ 
                style: { color: '#fff', fontFamily: 'monospace', fontSize: '0.85rem' },
              }}
              InputLabelProps={{ style: { color: '#94a3b8' } }}
              sx={{ 
                flex: 1, 
                '& .MuiInputBase-root': { 
                  height: '100%', 
                  overflowY: 'auto',
                  alignItems: 'flex-start'
                } 
              }}
            />
            
            {/* Preview do Markdown */}
            {anotacoesTexto && (
              <Box 
                sx={{ 
                  mt: 2, p: 2, 
                  bgcolor: '#1a1a2e', 
                  borderRadius: 1, 
                  maxHeight: 200, 
                  overflowY: 'auto',
                  border: '1px solid #334155'
                }}
                className="markdown-content"
                onClick={(e) => {
                  if (e.target.tagName === "IMG") {
                    setLightboxSrc(e.target.src);
                    setZoom(1);
                    setLightboxOpen(true);
                  }
                }}
              >
                <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mb: 1 }}>
                  📄 Preview:
                </Typography>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{anotacoesTexto}</ReactMarkdown>
              </Box>
            )}
          </Box>
        </DialogContent>
        
        <DialogActions sx={{ p: 2, borderTop: '1px solid #334155' }}>
          <Button onClick={() => setModalAnotacoesOpen(false)} sx={{ color: '#94a3b8' }}>Fechar</Button>
          <Button 
            variant="contained"
            onClick={async () => {
              await setDoc(doc(db, "fichas", fichaId), { anotacoes: JSON.stringify(anotacoesSalvos) }, { merge: true });
              setModalAnotacoesOpen(false);
            }}
            sx={{ bgcolor: '#2e7d32' }}
          >
            Salvar e Fechar
          </Button>
        </DialogActions>
      </Dialog>
            {/* 🟢 MODAL DE BACKGROUND */}
      <Dialog 
        open={modalBackgroundOpen} 
        onClose={() => setModalBackgroundOpen(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{ sx: { bgcolor: "#0f172a", border: "1px solid #1e293b", borderRadius: 2, minHeight: "80vh" } }}
      >
        <DialogTitle sx={{ color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <span style={{ fontSize: '1.5rem' }}>📖</span>
            Background - {ficha?.nome || "Personagem"}
          </Box>
          <IconButton onClick={() => setModalBackgroundOpen(false)} sx={{ color: '#94a3b8' }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        
        <DialogContent sx={{ p: 2, display: 'flex', flexDirection: 'column', height: "70vh" }}>
          <Box sx={{ mb: 1, display: 'flex', gap: 1 }}>
            <Button 
              size="small" 
              variant="outlined" 
              component="label"
              startIcon={<span>📷</span>}
              sx={{ color: '#94a3b8', borderColor: '#555' }}
            >
              Inserir Imagem
              <input
                hidden
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  try {
                    const apiBase = window.location.hostname === "localhost" ? "http://localhost:5000" : "https://app-rpg.onrender.com";
                    const fd = new FormData();
                    fd.append("file", file);
                    const res = await fetch(`${apiBase}/upload`, { method: "POST", body: fd });
                    const data = await res.json();
                    if (data.url) {
                      const textarea = document.querySelector('#background-textarea textarea');
                      if (textarea) {
                        const start = textarea.selectionStart;
                        const end = textarea.selectionEnd;
                        const antes = backgroundTexto.substring(0, start);
                        const depois = backgroundTexto.substring(end);
                        const imagemMarkdown = `\n![Imagem](${data.url})\n`;
                        setBackgroundTexto(antes + imagemMarkdown + depois);
                        setTimeout(() => {
                          textarea.focus();
                          textarea.selectionStart = start + imagemMarkdown.length;
                          textarea.selectionEnd = start + imagemMarkdown.length;
                        }, 100);
                      } else {
                        setBackgroundTexto(prev => prev + `\n![Imagem](${data.url})\n`);
                      }
                    }
                  } catch (err) {
                    alert("Erro ao enviar imagem");
                  }
                }}
              />
            </Button>
          </Box>
          
          <TextField
            id="background-textarea"
            label="História do Personagem (Markdown)"
            fullWidth
            multiline
            minRows={20}
            maxRows={35}
            value={backgroundTexto}
            onChange={(e) => setBackgroundTexto(e.target.value)}
            InputProps={{ 
              style: { color: '#fff', fontFamily: 'monospace', fontSize: '0.85rem' },
            }}
            InputLabelProps={{ style: { color: '#94a3b8' } }}
            sx={{ 
              flex: 1, 
              '& .MuiInputBase-root': { 
                height: '100%', 
                overflowY: 'auto',
                alignItems: 'flex-start'
              } 
            }}
          />
          
          {/* Preview */}
          {backgroundTexto && (
            <Box 
              sx={{ 
                mt: 2, p: 2, 
                bgcolor: '#1a1a2e', 
                borderRadius: 1, 
                maxHeight: 200, 
                overflowY: 'auto',
                border: '1px solid #334155'
              }}
              className="markdown-content"
              onClick={(e) => {
                if (e.target.tagName === "IMG") {
                  setLightboxSrc(e.target.src);
                  setZoom(1);
                  setLightboxOpen(true);
                }
              }}
            >
              <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mb: 1 }}>
                📄 Preview:
              </Typography>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{backgroundTexto}</ReactMarkdown>
            </Box>
          )}
        </DialogContent>
        
        <DialogActions sx={{ p: 2, borderTop: '1px solid #334155' }}>
          <Button onClick={() => setModalBackgroundOpen(false)} sx={{ color: '#94a3b8' }}>Cancelar</Button>
          <Button 
            variant="contained"
            onClick={async () => {
              setCampo("background", backgroundTexto);
              await setDoc(doc(db, "fichas", fichaId), { background: backgroundTexto }, { merge: true });
              setModalBackgroundOpen(false);
            }}
            sx={{ bgcolor: '#9c27b0' }}
          >
            Salvar Background
          </Button>
        </DialogActions>
      </Dialog>
  {/* 🟢🟢🟢 MODAL DE HABILIDADES (VERSÃO FINAL COM IMAGEM + IA FUSIONADA) 🟢🟢🟢 */}
<Dialog
  open={modalHabilidadesOpen}
  onClose={() => {
    setModalHabilidadesOpen(false);
    setHabilidadeExpandida(null);
    setAvaliacaoIA(null);
  }}
  maxWidth="lg"
  fullWidth
  PaperProps={{
    sx: {
      bgcolor: "#0f172a",
      border: `2px solid ${CORES_AURA[ficha.tipoAura] || "#00e0ff"}`,
      borderRadius: 2,
      minHeight: "85vh",
      maxHeight: "92vh"
    }
  }}
>
  <DialogTitle sx={{ 
    color: CORES_AURA[ficha.tipoAura] || "#00e0ff",
    textAlign: 'center',
    borderBottom: `2px solid ${CORES_AURA[ficha.tipoAura] || "#00e0ff"}22`,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  }}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      <span style={{ fontSize: '2rem' }}>⚡</span>
      <Box>
        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
          HABILIDADES AURANAS
        </Typography>
        {ficha.tipoAura && (
          <Typography variant="caption" sx={{ color: CORES_AURA[ficha.tipoAura] }}>
            ✨ Tipo de Aura: {ficha.tipoAura}
          </Typography>
        )}
      </Box>
    </Box>
    <IconButton onClick={() => {
      setModalHabilidadesOpen(false);
      setHabilidadeExpandida(null);
    }} sx={{ color: '#94a3b8' }}>
      <CloseIcon />
    </IconButton>
  </DialogTitle>

  <DialogContent sx={{ p: 3 }}>
    {ficha.habilidades.length === 0 && (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography variant="h6" sx={{ color: '#64748b' }}>
          Nenhuma habilidade criada ainda
        </Typography>
        <Typography variant="body2" sx={{ color: '#475569', mt: 1 }}>
          Use o botão abaixo para criar sua primeira habilidade aurana!
        </Typography>
      </Box>
    )}

    {ficha.habilidades.map((h, i) => (
      <Paper 
        key={i}
        sx={{ 
          mb: 2,
          bgcolor: '#1a1a2e',
          border: `1px solid ${CORES_AURA[ficha.tipoAura] || "#00e0ff"}44`,
          borderRadius: 2,
          overflow: 'hidden'
        }}
      >
        {/* ========== CABEÇALHO RECOLHIDO ========== */}
        <Box
          onClick={() => setHabilidadeExpandida(habilidadeExpandida === i ? null : i)}
          sx={{
            p: 2,
            cursor: 'pointer',
            display: 'flex',
            gap: 2,
            alignItems: 'center',
            bgcolor: habilidadeExpandida === i ? `${CORES_AURA[ficha.tipoAura] || "#00e0ff"}22` : 'transparent',
            transition: 'all 0.2s',
            '&:hover': {
              bgcolor: `${CORES_AURA[ficha.tipoAura] || "#00e0ff"}11`
            }
          }}
        >
          {/* 🟢 IMAGEM QUADRADA (RECOLHIDA) */}
          <Box
            sx={{
              width: 60,
              height: 60,
              minWidth: 60,
              borderRadius: 1,
              overflow: 'hidden',
              border: `1px solid ${CORES_AURA[ficha.tipoAura] || "#00e0ff"}44`,
              bgcolor: '#0f172a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: h.imagem ? 'pointer' : 'default'
            }}
            onClick={(e) => {
              if (h.imagem) {
                e.stopPropagation();
                setLightboxSrc(h.imagem);
                setZoom(1);
                setLightboxOpen(true);
              }
            }}
          >
            {h.imagem ? (
              <img 
                src={h.imagem} 
                alt={h.nome || "Habilidade"}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <Typography sx={{ fontSize: '1.5rem', opacity: 0.4 }}>⚡</Typography>
            )}
          </Box>

          {/* INFO DA HABILIDADE */}
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" sx={{ color: '#fff', fontWeight: 'bold' }}>
              {h.nome || `Habilidade ${i + 1}`}
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, mt: 0.5, flexWrap: 'wrap' }}>
              <Chip 
                label={`🎲 ${h.dado || 1}d10`}
                size="small"
                sx={{ bgcolor: '#0f172a', color: '#fff' }}
              />
              <Chip 
                label={`⚡ PE: ${h.custoPE || 0}`}
                size="small"
                sx={{ bgcolor: '#0f172a', color: '#facc15' }}
              />
              <Chip 
                label={h.tipoDano || "Aurano"}
                size="small"
                sx={{ 
                  bgcolor: '#0f172a', 
                  color: TIPOS_DANO.find(t => t.valor === (h.tipoDano || "Aurano"))?.cor || '#00e0ff'
                }}
              />
              {h.condicoes && h.condicoes.length > 0 && (
                <Chip 
                  label={`📜 ${h.condicoes.length} condição(ões)`}
                  size="small"
                  sx={{ bgcolor: '#0f172a', color: '#94a3b8' }}
                />
              )}
            </Box>
          </Box>
          
          <Typography sx={{ color: '#94a3b8', fontSize: '1.5rem' }}>
            {habilidadeExpandida === i ? '▼' : '▶'}
          </Typography>
        </Box>

        {/* ========== CONTEÚDO EXPANDIDO ========== */}
        {habilidadeExpandida === i && (
          <Box sx={{ p: 3, borderTop: `1px solid ${CORES_AURA[ficha.tipoAura] || "#00e0ff"}22` }}>
            
            {/* LINHA 1: IMAGEM + NOME + DESCRIÇÃO */}
            <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
              {/* 🟢 IMAGEM QUADRADA GRANDE (EXPANDIDA) */}
              <Box sx={{ width: 140, minWidth: 140 }}>
                <Box
                  sx={{
                    width: 140,
                    height: 140,
                    borderRadius: 2,
                    overflow: 'hidden',
                    border: `2px solid ${CORES_AURA[ficha.tipoAura] || "#00e0ff"}66`,
                    bgcolor: '#0f172a',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: h.imagem ? 'pointer' : 'default',
                    position: 'relative'
                  }}
                  onClick={() => {
                    if (h.imagem) {
                      setLightboxSrc(h.imagem);
                      setZoom(1);
                      setLightboxOpen(true);
                    }
                  }}
                >
                  {h.imagem ? (
                    <img 
                      src={h.imagem} 
                      alt={h.nome || "Habilidade"}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <Typography sx={{ fontSize: '3rem', opacity: 0.3 }}>⚡</Typography>
                  )}
                </Box>
                
                {/* BOTÕES DE UPLOAD/REMOVER IMAGEM */}
                <Box sx={{ display: 'flex', gap: 0.5, mt: 1 }}>
                  <Button
                    size="small"
                    component="label"
                    sx={{ 
                      flex: 1, 
                      fontSize: '0.65rem', 
                      minWidth: 'auto',
                      bgcolor: '#1e293b',
                      color: '#94a3b8',
                      '&:hover': { bgcolor: '#334155' }
                    }}
                  >
                    📷 Upload
                    <input
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        
                        const fd = new FormData();
                        fd.append("file", file);
                        
                        try {
                          const apiBase = window.location.hostname === "localhost" 
                            ? "http://localhost:5000" 
                            : "https://app-rpg.onrender.com";
                          const res = await fetch(`${apiBase}/upload`, { method: "POST", body: fd });
                          const data = await res.json();
                          if (data.url) {
                            atualizarHabilidade(i, "imagem", data.url);
                          }
                        } catch (err) {
                          console.error("Erro no upload:", err);
                          alert("Erro ao enviar imagem");
                        }
                      }}
                    />
                  </Button>
                  {h.imagem && (
                    <Button
                      size="small"
                      onClick={() => atualizarHabilidade(i, "imagem", "")}
                      sx={{ 
                        fontSize: '0.65rem', 
                        minWidth: 'auto',
                        bgcolor: '#7f1d1d',
                        color: '#fca5a5',
                        '&:hover': { bgcolor: '#991b1b' }
                      }}
                    >
                      ✕
                    </Button>
                  )}
                </Box>
              </Box>

              {/* NOME + DESCRIÇÃO */}
              <Box sx={{ flex: 1 }}>
                <TextField
                  fullWidth
                  label="Nome da Habilidade"
                  value={h.nome || ""}
                  onChange={(e) => atualizarHabilidade(i, "nome", e.target.value)}
                  sx={{ mb: 1 }}
                  InputProps={{ style: { color: '#fff', fontWeight: 'bold', fontSize: '1.1rem' } }}
                  InputLabelProps={{ style: { color: '#94a3b8' } }}
                />

                <TextField
                  fullWidth
                  multiline
                  minRows={3}
                  label="Descrição"
                  value={h.descricao || ""}
                  onChange={(e) => atualizarHabilidade(i, "descricao", e.target.value)}
                  InputProps={{ style: { color: '#fff' } }}
                  InputLabelProps={{ style: { color: '#94a3b8' } }}
                />
              </Box>
            </Box>

            {/* Grid: Dado, Custo PE, Tipo Dano */}
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={4}>
                <TextField
                  fullWidth
                  label="Dado (1-10)"
                  type="number"
                  value={h.dado || 1}
                  onChange={(e) => {
                    const val = Math.min(10, Math.max(1, Number(e.target.value) || 1));
                    atualizarHabilidade(i, "dado", val);
                  }}
                  InputProps={{ 
                    inputProps: { min: 1, max: 10 },
                    style: { color: '#fff' }
                  }}
                  InputLabelProps={{ style: { color: '#94a3b8' } }}
                />
              </Grid>
              <Grid item xs={4}>
                <TextField
                  fullWidth
                  label="Custo de PE"
                  type="number"
                  value={h.custoPE || 0}
                  onChange={(e) => {
                    atualizarHabilidade(i, "custoPE", Number(e.target.value));
                  }}
                  InputProps={{ 
                    inputProps: { min: 0 },
                    style: { color: '#facc15' }
                  }}
                  InputLabelProps={{ style: { color: '#94a3b8' } }}
                />
              </Grid>
              <Grid item xs={4}>
                <FormControl fullWidth>
                  <InputLabel sx={{ color: '#94a3b8' }}>Tipo de Dano</InputLabel>
                  <Select
                    value={h.tipoDano || "Aurano"}
                    onChange={(e) => atualizarHabilidade(i, "tipoDano", e.target.value)}
                    sx={{ 
                      color: TIPOS_DANO.find(t => t.valor === (h.tipoDano || "Aurano"))?.cor || '#00e0ff',
                    }}
                    MenuProps={{
                      PaperProps: { sx: { bgcolor: "#0f172a", color: "#fff" } }
                    }}
                  >
                    {TIPOS_DANO.map(td => (
                      <MenuItem key={td.valor} value={td.valor}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: td.cor }} />
                          <Typography sx={{ color: td.cor }}>{td.label}</Typography>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            {/* Condições */}
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle1" sx={{ color: '#fff', fontWeight: 'bold' }}>
                  📜 Condições
                </Typography>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={() => adicionarCondicao(i)}
                  sx={{ color: '#00e0ff', borderColor: '#00e0ff' }}
                >
                  Adicionar Condição
                </Button>
              </Box>

              {(h.condicoes || []).length === 0 && (
                <Typography variant="body2" sx={{ color: '#64748b', textAlign: 'center', py: 2 }}>
                  Nenhuma condição adicionada. Condições fortalecem a habilidade!
                </Typography>
              )}

              {(h.condicoes || []).map((cond, ci) => (
                <Paper 
                  key={cond.id}
                  sx={{ 
                    p: 2, 
                    mb: 1, 
                    bgcolor: '#0f172a',
                    border: '1px solid #334155'
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="subtitle2" sx={{ color: '#00e0ff', fontWeight: 'bold' }}>
                      {cond.titulo}
                    </Typography>
                    <IconButton 
                      size="small" 
                      onClick={() => removerCondicao(i, cond.id)}
                      sx={{ color: '#ef4444' }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>

                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Descreva a condição (ex: Dar 50 pulinhos, só funciona à noite...)"
                    value={cond.descricao || ""}
                    onChange={(e) => atualizarCondicao(i, cond.id, "descricao", e.target.value)}
                    sx={{ mb: 2 }}
                    InputProps={{ style: { color: '#fff' } }}
                  />

                  {/* Sliders de avaliação */}
                  <Grid container spacing={2}>
                    {[
                      { campo: 'dificuldade', label: 'Dificuldade', cor: '#ff9800', desc: 'Quão difícil é executar?' },
                      { campo: 'janela', label: 'Janela', cor: '#2196f3', desc: 'Quão restrito é o momento?' },
                      { campo: 'custo', label: 'Custo/Preço', cor: '#f44336', desc: 'O que é sacrificado?' },
                      { campo: 'risco', label: 'Risco', cor: '#9c27b0', desc: 'Chance de falha/consequência?' }
                    ].map(({ campo, label, cor, desc }) => (
                      <Grid item xs={6} key={campo}>
                        <Typography variant="caption" sx={{ color: cor }}>
                          {label}: {'●'.repeat(cond[campo] || 0)}{'○'.repeat(5 - (cond[campo] || 0))}
                        </Typography>
                        <Slider
                          value={cond[campo] || 0}
                          min={0}
                          max={5}
                          step={1}
                          onChange={(_, val) => atualizarCondicao(i, cond.id, campo, val)}
                          sx={{ 
                            color: cor,
                            '& .MuiSlider-thumb': { width: 16, height: 16 }
                          }}
                        />
                        <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.65rem' }}>
                          {desc}
                        </Typography>
                      </Grid>
                    ))}
                  </Grid>
                </Paper>
              ))}
            </Box>

            {/* Avaliação de Poder */}
            <Box sx={{ mt: 2, p: 2, bgcolor: '#0f172a', borderRadius: 2, border: '1px solid #334155' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle1" sx={{ color: '#fff', fontWeight: 'bold' }}>
                  📊 AVALIAÇÃO DE PODER
                </Typography>
                <Button
                  size="small"
                  variant="contained"
                  onClick={() => avaliarHabilidadeComIA(h)}
                  disabled={carregandoIA}
                  sx={{ 
                    bgcolor: '#9c27b0',
                    '&:hover': { bgcolor: '#7b1fa2' }
                  }}
                >
                  {carregandoIA ? "Analisando..." : "🔄 Avaliar com IA"}
                </Button>
              </Box>

              {avaliacaoIA && habilidadeExpandida === i ? (
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                      Efeito Base: {'●'.repeat(Math.min(5, Math.ceil(avaliacaoIA.poderBase)))}{'○'.repeat(Math.max(0, 5 - Math.ceil(avaliacaoIA.poderBase)))}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                      Restrições: {'●'.repeat(Math.min(5, Math.ceil(avaliacaoIA.restricoes)))}{'○'.repeat(Math.max(0, 5 - Math.ceil(avaliacaoIA.restricoes)))}
                    </Typography>
                  </Box>

                  {/* Barra de progresso */}
                  <Box sx={{ 
                    height: 14, 
                    bgcolor: '#1e293b', 
                    borderRadius: 7, 
                    overflow: 'hidden',
                    mb: 1
                  }}>
                    <Box sx={{ 
                      width: `${avaliacaoIA.percentual}%`,
                      height: '100%',
                      bgcolor: avaliacaoIA.percentual <= 100 ? '#4caf50' : 
                               avaliacaoIA.percentual <= 130 ? '#ff9800' : '#f44336',
                      transition: 'width 0.5s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Typography variant="caption" sx={{ color: '#000', fontWeight: 'bold', fontSize: '0.7rem' }}>
                        {avaliacaoIA.percentual.toFixed(0)}%
                      </Typography>
                    </Box>
                  </Box>

                  <Typography 
                    variant="body1" 
                    sx={{ 
                      color: avaliacaoIA.percentual <= 100 ? '#4caf50' : 
                             avaliacaoIA.percentual <= 130 ? '#ff9800' : '#f44336',
                      fontWeight: 'bold',
                      mb: 1
                    }}
                  >
                    {avaliacaoIA.status}
                  </Typography>

                  <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                    {avaliacaoIA.mensagem}
                  </Typography>

                  {avaliacaoIA.sugestoes && avaliacaoIA.sugestoes.length > 0 && (
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="caption" sx={{ color: '#ff9800', fontWeight: 'bold' }}>
                        Sugestões:
                      </Typography>
                      <ul style={{ margin: '4px 0', paddingLeft: 20 }}>
                        {avaliacaoIA.sugestoes.map((sug, idx) => (
                          <li key={idx} style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{sug}</li>
                        ))}
                      </ul>
                    </Box>
                  )}

                  {/* 🟢 BOTÕES DO MESTRE */}
                  {isMestre && (
                    <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                      <Button
                        size="small"
                        variant="contained"
                        onClick={async () => {
                          const avaliacaoMestre = {
                            poderBase: avaliacaoIA?.poderBase || calcularPoderBase(h),
                            restricoes: calcularNivelRestricao(h.condicoes || []),
                            condicoesAprovadas: h.condicoes || []
                          };
                          await salvarAvaliacaoMestre(h, avaliacaoMestre);
                          alert("✅ Avaliação do mestre registrada! A IA vai aprender com isso.");
                        }}
                        sx={{ bgcolor: '#4caf50', '&:hover': { bgcolor: '#388e3c' } }}
                      >
                        ✅ Confirmar Avaliação
                      </Button>
                      
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => {
  const condicoesAnalisadas = analisarDescricaoComIA(h);
  // 🟢 CORRIGIDO: usa 'i' que já está disponível no map
  setFicha(p => {
    const habilidades = [...p.habilidades];
    habilidades[i] = { ...habilidades[i], condicoes: condicoesAnalisadas };
    return { ...p, habilidades };
  });
  avaliarHabilidadeComIA({...h, condicoes: condicoesAnalisadas});
}}
                        sx={{ color: '#ff9800', borderColor: '#ff9800' }}
                      >
                        🔄 Reavaliar Automaticamente
                      </Button>
                    </Box>
                  )}
                </Box>
              ) : (
                <Typography variant="body2" sx={{ color: '#64748b', textAlign: 'center', py: 2 }}>
                  Clique em "Avaliar com IA" para ver o balanceamento da habilidade
                </Typography>
              )}
            </Box>

            {/* Botão remover habilidade */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
              <Button
                variant="outlined"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={() => {
                  if (window.confirm("Remover esta habilidade?")) {
                    removerHabilidade(i);
                    setHabilidadeExpandida(null);
                  }
                }}
              >
                Remover Habilidade
              </Button>
            </Box>
          </Box>
        )}
      </Paper>
    ))}
  </DialogContent>

  <DialogActions sx={{ p: 2, borderTop: '1px solid #334155' }}>
    <Button 
      onClick={() => {
        setModalHabilidadesOpen(false);
        setHabilidadeExpandida(null);
      }}
      sx={{ color: '#94a3b8' }}
    >
      Fechar
    </Button>

    <Button
      variant="contained"
      startIcon={<AddIcon />}
      disabled={!podeIgnorarLimiteHab && ficha.habilidades.length >= limiteHabilidades}
      onClick={() => {
        if (!podeIgnorarLimiteHab && ficha.habilidades.length >= limiteHabilidades) {
          alert(`Limite de ${limiteHabilidades} habilidades atingido! Aumente sua Perícia Aura.`);
          return;
        }
        adicionarHabilidade();
        setHabilidadeExpandida(ficha.habilidades.length);
      }}
      sx={{ 
        bgcolor: CORES_AURA[ficha.tipoAura] || "#00e0ff",
        color: '#000',
        fontWeight: 'bold',
        '&:hover': {
          bgcolor: CORES_AURA[ficha.tipoAura] 
            ? `${CORES_AURA[ficha.tipoAura]}dd` 
            : '#00bcd4'
        }
      }}
    >
      Nova Habilidade
    </Button>
  </DialogActions>
</Dialog>
    </Paper>
    );
  }
  // ================= LIGHTBOX IMAGE =================
  function LightboxImage({ src, zoom, setZoom }) {
    const [position, setPosition] = React.useState({ x: 0, y: 0 });
    const [dragging, setDragging] = React.useState(false);
    const [start, setStart] = React.useState({ x: 0, y: 0 });
    const [initialDistance, setInitialDistance] = React.useState(null);

    const handleMouseDown = (e) => {
      e.preventDefault();
      setDragging(true);
      setStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    };

    const handleMouseMove = (e) => {
      if (!dragging) return;
      setPosition({ x: e.clientX - start.x, y: e.clientY - start.y });
    };

    const handleMouseUp = () => setDragging(false);

    const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom((z) => Math.min(Math.max(z + delta, 0.5), 5));
  };

    const handleTouchStart = (e) => {
      if (e.touches.length === 1) {
        const touch = e.touches[0];
        setDragging(true);
        setStart({ x: touch.clientX - position.x, y: touch.clientY - position.y });
      } else if (e.touches.length === 2) {
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        setInitialDistance(dist);
      }
    };

    const handleTouchMove = (e) => {
      if (e.touches.length === 1 && dragging) {
        const touch = e.touches[0];
        setPosition({ x: touch.clientX - start.x, y: touch.clientY - start.y });
      } else if (e.touches.length === 2 && initialDistance) {
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        const delta = dist / initialDistance;
        setZoom((z) => Math.min(Math.max(z * delta, 0.5), 5));
        setInitialDistance(dist);
      }
    };

    const handleTouchEnd = () => {
      setDragging(false);
      setInitialDistance(null);
    };

    React.useEffect(() => {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }, [dragging, start]);

    return (
      <img
        src={src}
        alt="ampliada"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={handleMouseDown}
          onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
          transition: dragging ? "none" : "transform 0.2s ease",
          maxWidth: "90%",
          maxHeight: "90%",
          borderRadius: 10,
          cursor: dragging ? "grabbing" : "grab",
          userSelect: "none",
          touchAction: "none",
        }}
      />
    );
  }
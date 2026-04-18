  // src/components/FichaPersonagem.jsx
  import React, { useEffect, useState } from "react";
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
} from "@mui/material";
import { Divider } from "@mui/material";
  import AddIcon from "@mui/icons-material/Add";
  import DeleteIcon from "@mui/icons-material/Delete";
  import { db } from "../firebaseConfig";
  import { doc, getDoc, setDoc } from "firebase/firestore";
  import { Checkbox, FormControlLabel } from "@mui/material";
  import { collection, getDocs } from "firebase/firestore";

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



    useEffect(() => {
      let mounted = true;
      async function carregar() {
        setLoading(true);
        try {
          if (!fichaId) {
            if (mounted) setFicha({ ...modelo });
            return;
          }
          const ref = doc(db, "fichas", fichaId);
          const snap = await getDoc(ref);
          if (snap.exists()) {
            const dados = snap.data();
            if (!dados.imagens && dados.imagemPersonagem) {
    dados.imagens = [dados.imagemPersonagem];
    dados.imagemPrincipalIndex = 0;
  }
            const combinadoBase = {
  ...modelo,
  ...dados,
  atributos: { ...modelo.atributos, ...(dados.atributos || {}) },
  pericias: { ...modelo.pericias, ...(dados.pericias || {}) },
  habilidades: Array.isArray(dados.habilidades)
    ? dados.habilidades
    : [],
  moedas: { ...modelo.moedas, ...(dados.moedas || {}) },
  equipamentos: Array.isArray(dados.equipamentos)
    ? dados.equipamentos
    : [],
  vestes: Array.isArray(dados.vestes) ? dados.vestes : [],
  diversos: Array.isArray(dados.diversos) ? dados.diversos : [],
};

// 🔴 AQUI É O PONTO CRÍTICO
const combinado = {
  ...combinadoBase,
  atributos: { ...modelo.atributos, ...(dados.atributos || {}) },
  pericias: { ...modelo.pericias, ...(dados.pericias || {}) },
};
            if (mounted) setFicha(combinado);
          } else {
            await setDoc(ref, modelo);
            if (mounted) setFicha({ ...modelo });
          }
        } catch (err) {
          console.error("Erro carregar ficha:", err);
          if (mounted) setFicha({ ...modelo });
        } finally {
          if (mounted) setLoading(false);
        }
      }
      carregar();
      return () => (mounted = false);
      // eslint-disable-next-line react-hooks/exhaustive-deps
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
          { nome: "", descricao: "", condicoes: "", limitacoes: "" },
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

    function adicionarItem(tipo) {
      setFicha((p) => ({
        ...p,
        [tipo]: [
          ...(p[tipo] || []),
          { quantidade: 1, nome: "", durabilidade: 100 },
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
  
  // Atualiza carteiras do jogador atual (origem)
const novasCarteirasOrig = carteiras.map(c => 
  c.nome === carteiraOrigem ? { ...c, valor: c.valor - valorTransferencia } : c
);
setCarteiras(novasCarteirasOrig);

// Salva no Firestore do jogador atual
const refOrigem = doc(db, "fichas", fichaId);
await setDoc(refOrigem, { carteiras: novasCarteirasOrig }, { merge: true });
  
  // Verifica se é transferência para si mesmo
if (jogadorSelecionado === fichaId) {
  // Transferência entre carteiras do mesmo jogador
  const carteirasAtualizadas = novasCarteirasOrig.map(c => 
    c.nome === carteiraDestino ? { ...c, valor: c.valor + valorTransferencia } : c
  );
  setCarteiras(carteirasAtualizadas);
  
  // Salva no Firestore
  const ref = doc(db, "fichas", fichaId);
  await setDoc(ref, { carteiras: carteirasAtualizadas }, { merge: true });
  
  alert(`Transferência de ${valorTransferencia} realizada com sucesso!`);
  setModalTransferenciaOpen(false);
  setJogadorSelecionado("");
  setCarteiraOrigem("");
  setCarteiraDestino("");
  setValorTransferencia(0);
  return; // Importante: sair da função para não executar o resto
} 
    else {
    // Transferência para outro jogador
    // Já setamos as carteiras locais como novasCarteirasOrig
    setCarteiras(novasCarteirasOrig);
    
    // Atualiza carteiras do jogador destino
    const jogadorDestino = listaJogadores.find(j => j.id === jogadorSelecionado);
    if (jogadorDestino) {
      const carteirasDestino = jogadorDestino.carteiras.map(c => 
        c.nome === carteiraDestino ? { ...c, valor: (c.valor || 0) + valorTransferencia } : c
      );
      
      // Salva no Firestore do destino
      const refDestino = doc(db, "fichas", jogadorSelecionado);
      await setDoc(refDestino, { carteiras: carteirasDestino }, { merge: true });
      
      alert(`Transferência de ${valorTransferencia} realizada com sucesso!`);
    } else {
      alert("Jogador destino não encontrado!");
    }
    
    setModalTransferenciaOpen(false);
    setJogadorSelecionado("");
    setCarteiraOrigem("");
    setCarteiraDestino("");
    setValorTransferencia(0);
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

    if (loading)
      
      return (
        <Box p={2}>
          <Typography component="div">Carregando ficha...</Typography>
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
        {/* título como h5 (mantém sem p) */}
        <Typography variant="h5" gutterBottom component="h2">{LABELS.titulo}</Typography>

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
          onChange={(e) => {
    const valor = Math.min(Number(e.target.value), armaduraMax);
    setCampo("armadura", valor);
  }}
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
    
    // Se está tentando aumentar mas não tem pontos suficientes
    if (diferenca > 0) {
      let custo = 0;
      for (let i = atual + 1; i <= val; i++) {
        custo += (i - 1);
      }
      
      if (pontosAtributoRestantes < custo) return; // Não deixa aumentar
    }
    
    // Se está diminuindo, sempre permite (desde que não seja abaixo de 1)
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
    
    if (diferenca > 0 && pontosPericiaRestantes < diferenca) return;
    
    setSubCampo("pericias", k, val);
  }}
  valueLabelDisplay="auto"
/>
                </Box>
              ))}
            </Box>
            <Box mt={2}>
              {/* usar div para evitar p-nested */}
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

    {isMestre ? (
  <>
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

    <FormControlLabel
      control={
        <Checkbox
          checked={ficha.ignorarLimiteHabilidades || false}
          onChange={async (e) => {
            const novoValor = e.target.checked;

            setFicha((prev) => ({
              ...prev,
              ignorarLimiteHabilidades: novoValor,
            }));

            const ref = doc(db, "fichas", fichaId);
            await setDoc(
              ref,
              { ignorarLimiteHabilidades: novoValor },
              { merge: true }
            );
          }}
          size="small"
        />
      }
      label="Ignorar limite"
    />
  </>
) : (
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
  </Box>
              {ficha.habilidades.map((h, i) => (
                <Paper key={i} sx={{ p: 1, mb: 1 }}>
                  <Grid container spacing={1}>
                    <Grid item xs={11}>
                      {["nome", "descricao", "condicoes", "limitacoes"].map((campo) => (
                        <TextField
                          key={campo}
                          label={campo.charAt(0).toUpperCase() + campo.slice(1)}
                          fullWidth
                          size="small"
                          multiline={["descricao", "condicoes", "limitacoes"].includes(campo)}
                          value={h[campo]}
                          onChange={(e) => atualizarHabilidade(i, campo, e.target.value)}
                          sx={{ mb: 1 }}
                        />
                      ))}
                    </Grid>
                    <Grid item xs={1}>
                      <IconButton color="error" onClick={() => removerHabilidade(i)}>
                        <DeleteIcon />
                      </IconButton>
                    </Grid>
                  </Grid>
                </Paper>
              ))}
              <Button
    variant="outlined"
    startIcon={<AddIcon />}
    disabled={habilidadesNoLimite}
    onClick={() => {
      if (habilidadesNoLimite) {
        alert("Limite de habilidades atingido pela Perícia Aura.");
        return;
      }
      adicionarHabilidade();
    }}
  >
                Adicionar Habilidade
              </Button>
            </Box>

            <Box mt={2}>
              <Box
    display="flex"
    justifyContent="space-between"
    alignItems="center"
    sx={{
      borderBottom: `2px solid ${
        ficha?.ignorarLimitePeso
          ? "#00ffff"
          : sobrecarregado
          ? "#ff0000"
          : "#ffaa00"
      }`,
      pb: 1,
      mb: 1,
    }}
  >
    <Typography component="div" sx={{ fontWeight: "bold" }}>
      {LABELS.itensTitulo}
    </Typography>

    <Box display="flex" alignItems="center" gap={2}>
      <Typography
        sx={{
          fontWeight: "bold",
          color: ficha?.ignorarLimitePeso
            ? "#00ffff"
            : sobrecarregado
            ? "#ff4444"
            : "#ffaa00",
          textDecoration: "underline",
          fontSize: 16,
        }}
      >
        🏋️ {pesoAtual} / {pesoMaximo}
      </Typography>

      {isMestre && (
        <FormControlLabel
          control={
            <Checkbox
              checked={ficha.ignorarLimitePeso || false}
  onChange={async (e) => {
    const novoValor = e.target.checked;

    // Atualiza estado local
    setFicha((prev) => ({
      ...prev,
      ignorarLimitePeso: novoValor,
    }));

    // Salva no Firestore
    const ref = doc(db, "fichas", fichaId);
    await setDoc(ref, { ignorarLimitePeso: novoValor }, { merge: true });
  }}
              size="small"
            />
          }
          label="Ignorar limite"
        />
      )}
    </Box>
  </Box>
              {["equipamentos", "vestes", "diversos"].map((tipo) => (
                <Box mt={2} key={tipo}>
                  <Typography component="div">{LABEL_MAP[tipo] || tipo}</Typography>
                  {ficha[tipo].map((it, i) => (
                    <Grid
                      container
                      key={i}
                      spacing={1}
                      alignItems="center"
                      sx={{ mt: 1 }}
                    >
                      <Grid item xs={2}>
                        <TextField
                          label="Quantidade"
                          type="number"
                          size="small"
                          value={it.quantidade}
                          onChange={(e) =>
                            atualizarItem(tipo, i, "quantidade", Number(e.target.value))
                          }
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <TextField
                          label="Nome"
                          fullWidth
                          size="small"
                          value={it.nome}
                          onChange={(e) => atualizarItem(tipo, i, "nome", e.target.value)}
                        />
                      </Grid>
                      <Grid item xs={3}>
                        <TextField
                          label="Durabilidade"
                          type="number"
                          size="small"
                          value={it.durabilidade}
                          onChange={(e) =>
                            atualizarItem(
                              tipo,
                              i,
                              "durabilidade",
                              Number(e.target.value)
                            )
                          }
                        />
                      </Grid>
                      <Grid item xs={1}>
                        <IconButton color="error" onClick={() => removerItem(tipo, i)}>
                          <DeleteIcon />
                        </IconButton>
                      </Grid>
                    </Grid>
                  ))}
                  <Button
    startIcon={<AddIcon />}
    variant="outlined"
    sx={{ mt: 1 }}
  disabled={!ficha?.ignorarLimitePeso && pesoAtual >= pesoMaximo}
    onClick={() => {
      if (!ficha?.ignorarLimitePeso && pesoAtual >= pesoMaximo) {
    alert("Peso máximo atingido");
    return;
  }
      adicionarItem(tipo);
    }}
  >
                    Adicionar {LABEL_MAP[tipo] || tipo}
                  </Button>
                </Box>
              ))}
            </Box>
{/* Botão Dinheiro */}
<Box mt={2} sx={{ display: 'flex', justifyContent: 'center' }}>
  <Button
    variant="contained"
    startIcon={<span>💰</span>}
    onClick={() => setModalDinheiroOpen(true)}
    sx={{ bgcolor: '#2e7d32', '&:hover': { bgcolor: '#1b5e20' }, px: 4, py: 1 }}
  >
    DINHEIRO
  </Button>
</Box>
            {/* Anotações */}
            <Box mt={2}>
              <Typography component="div">{LABELS.anotacoesTitulo}</Typography>
              <TextField
                fullWidth
                multiline
                rows={4}
                value={ficha.anotacoes}
                onChange={(e) => setCampo("anotacoes", e.target.value)}
              />
            </Box>

            {/* Background */}
            <Box mt={2}>
              <Button
                variant="outlined"
                onClick={() => setMostrarBackground(!mostrarBackground)}
                sx={{ mb: 1 }}
              >
                {mostrarBackground ? "Esconder Background" : "Mostrar Background"}
              </Button>
              {mostrarBackground && (
                <TextField
                  fullWidth
                  multiline
                  rows={6}
                  value={ficha.background}
                  onChange={(e) => setCampo("background", e.target.value)}
                  placeholder="Escreva aqui a história do personagem..."
                />
              )}
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
        type="number"
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
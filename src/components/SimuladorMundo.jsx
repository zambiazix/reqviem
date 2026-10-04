import React, { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import {
  Box, Paper, Typography, IconButton, Button, Tabs, Tab, Chip, Divider,
  Dialog, DialogTitle, DialogContent, DialogActions, FormControlLabel,
  Checkbox, TextField, FormControl, InputLabel, Select, MenuItem, Tooltip,
  Accordion, AccordionSummary, AccordionDetails, InputAdornment,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import CloseIcon from "@mui/icons-material/Close";
import PublicIcon from "@mui/icons-material/Public";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import SaveIcon from "@mui/icons-material/Save";
import DeleteIcon from "@mui/icons-material/Delete";
import AutorenewIcon from "@mui/icons-material/Autorenew";
import AddIcon from "@mui/icons-material/Add";
import DashboardIcon from "@mui/icons-material/Dashboard";
import FlagIcon from "@mui/icons-material/Flag";
import LocationCityIcon from "@mui/icons-material/LocationCity";
import CategoryIcon from "@mui/icons-material/Category";
import GroupsIcon from "@mui/icons-material/Groups";
import BadgeIcon from "@mui/icons-material/Badge";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import HandshakeIcon from "@mui/icons-material/Handshake";
import SettingsIcon from "@mui/icons-material/Settings";
import BusinessIcon from "@mui/icons-material/Business";
import { db } from "../firebaseConfig";
import {
  doc, onSnapshot, setDoc, collection, writeBatch, getDocs, deleteDoc, addDoc,
} from "firebase/firestore";
import { COMMODITIES, CATEGORIAS_COMMODITY, PAISES, CARGOS_TEMPLATE, gerarIgLocais, gerarCargosLocais, gerarProvinciasDePais, idsProvinciasECidades } from "../data/simSeed";
import { EDIFICIOS_CATALOGO, CATEGORIAS_EDIFICIO, custoEdificio, producaoEdificio, edifBloqueado, gerarEdificiosIniciais } from "../data/edificios";
import { EMPRESA_EDIFICIOS_CATALOGO, CATEGORIA_CORPORATIVO, custoEmpresaEdificio } from "../data/empresaEdificios";
import { CATEGORIAS_EMPRESA, getCategoriaEmpresa, tributoExtraCategorias, calcularPontosEmpresa, categoriaAutomaticaEmpresa, categoriaEfetivaEmpresa, contarEdificiosEmpresa } from "../data/empresaCategorias";
import { CARGOS_EMPRESA, ACESSOS_LABEL, cargosDisponiveisParaEmpresa, getCargoEmpresa, salarioDoCargo, temAcesso, getCfgCargos, calcularSalarioMembro, calcularMultaRescisoria, calcularBonusAnual, CFG_CARGOS_DEFAULT, criarCfgCargosEmpresa, criarCargoCustom } from "../data/empresaCargos";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { LEIS_CATALOGO, CATEGORIAS_LEI, ESCALAS_LEI, resolverLeiEfetiva, leisAplicaveisEm, LEIS_DEFAULT_PAIS } from "../data/leis";
import useSimulador from "../hooks/useSimulador";
import IASimulador from "./IASimulador";
import FloatingDialog from "./FloatingDialog";
import { INVESTIMENTOS_CATALOGO, INVESTIMENTO_MAX, custoUp, normalizarInvestimentos } from "../data/investimentos";
import { CRISES_ESPONTANEAS } from "../data/simCrises";
import { TIPOS_NEGOCIACAO, calcularChanceNegociacao, gerarIdNegociacao, calcularValorPacote } from "../data/negociacoes";
import { getCustoLeis, getImpostoEfetivo } from "../data/leis";
import { aplicarEfeitosNegociacao } from "../data/negociacoesEfeitos";
import { calcularFinanciamento, gerarIdFinanciamento, PARCELAS_FINANCIAMENTO, TAXA_JUROS_FINANCIAMENTO } from "../data/financiamentos";
import { ERAS, TECNOLOGIAS, tecnologiasDaEra, tecDisponivel, pesquisadasSet, tecConcluida, horasRestantes, formatarTempoRestante, getFatoresTecnologias } from "../data/tecnologias";

const V3 = {
  bg: "#1a1512",
  bg2: "#2a2018",
  paper: "#e8dcc0",
  paperDark: "#d4c4a0",
  gold: "#b8945a",
  goldLight: "#c9a961",
  ink: "#3a2e20",
  red: "#8b2f2f",
  green: "#4a6b3a",
  blue: "#5a6b7a",
};

const CLASSES_POP = ["pobre", "medio", "rico"];
const CLASSES_LABEL = { pobre: "POBRE ($)", medio: "MÉDIA ($$)", rico: "RICA ($$$)" };
const CATEGORIAS_IMPOSTO = ["residencial", "comercial", "industrial"];
const CATEGORIAS_IMPOSTO_LABEL = { residencial: "🏠 Residencial", comercial: "🏪 Comercial", industrial: "⚙️ Industrial" };

function SimuladorMundo({ userEmail, isMaster, fichasMap = {}, onClose }) {
  const { meusCargos, temPoderNoEscopo } = useSimulador();
  const [aba, setAba] = useState(0);
  const [config, setConfig] = useState({
    initialized: false,
    ultimoTick: null,
    congelarTudo: false,
    congelamentos: {},
    permitirCrises: true,
    iaNarradorAtiva: false,
  });
  const [paises, setPaises] = useState({});
  const [cidades, setCidades] = useState({});
  const [commodities, setCommodities] = useState({});
  const [igs, setIgs] = useState({});
  const [seedando, setSeedando] = useState(false);
  const [paisAberto, setPaisAberto] = useState(null);
  const [cidadeAberta, setCidadeAberta] = useState(null);
  const [editandoCidade, setEditandoCidade] = useState(null);
  const [cargosAbertos, setCargosAbertos] = useState(null);
  const [leisEditando, setLeisEditando] = useState(null);
  const [salvandoLeis, setSalvandoLeis] = useState(false);
  const [provincias, setProvincias] = useState({});
  const [provinciaAberta, setProvinciaAberta] = useState(null);
  const [buscaGlobal, setBuscaGlobal] = useState("");
  const [buscasPorAba, setBuscasPorAba] = useState({});
  const [negociacoes, setNegociacoes] = useState({});
  const [alertas, setAlertas] = useState({});
  const [empresas, setEmpresas] = useState({});
  const [empresaAberta, setEmpresaAberta] = useState(null);
  const [empresaAba, setEmpresaAba] = useState("visao");
  const [empresaEditando, setEmpresaEditando] = useState(null);
  const [modalEmpresaOpen, setModalEmpresaOpen] = useState(false);
  const [buscaEmpresa, setBuscaEmpresa] = useState("");
  const [bolsaEmpresas, setBolsaEmpresas] = useState([]);
  const [fichasDisponiveis, setFichasDisponiveis] = useState({});
  const [lightboxSrc, setLightboxSrc] = useState(null);
  const [uploadandoImg, setUploadandoImg] = useState(false);
  const [formEmpresa, setFormEmpresa] = useState({
    nome: "",
    descricao: "",
    imagemUrl: "",
    tipo: "local",
    valor: 0,
    origemNivel: "pais",
    origemId: "",
    sedes: [],
    bolsaEmpresaId: "",
    donoModo: "pj",
    donoEmail: "",
    donoNomeLivre: "",
    subsidiarias: [],
    categorias: [],
  });
  const [modalNegociacaoOpen, setModalNegociacaoOpen] = useState(false);
  const [negociacaoSelecionada, setNegociacaoSelecionada] = useState(null);
  const [techTreeOpen, setTechTreeOpen] = useState(false);
  const [donoEditando, setDonoEditando] = useState(null);
  const [donoVisualizando, setDonoVisualizando] = useState(null);
  const [investindoEst, setInvestindoEst] = useState(null);
  const [agoraTick, setAgoraTick] = useState(Date.now());
  const [origemNeg, setOrigemNeg] = useState({ nivel: "pais", id: "", nome: "", holderEmail: "" });
  const [formNegociacao, setFormNegociacao] = useState({
    tipo: "concessao",
    destinoId: "",
    destinoNivel: "pais",
    titulo: "",
    descricao: "",
    ofertaDinheiro: 0,
    ofertaCommodityId: "",
    ofertaCommodityQtd: 0,
    ofertaPoderIGId: "",
    ofertaPoderIGValor: 0,
    pedidoDinheiro: 0,
    pedidoCommodityId: "",
    pedidoCommodityQtd: 0,
    pedidoPoderIGId: "",
    pedidoPoderIGValor: 0,
  });
  const autoMinimizouRef = useRef(false);
  useEffect(() => {
    if (!modalNegociacaoOpen || !userEmail) return;
    const cargos = meusCargos(userEmail);
    const cargosPais = cargos.filter((c) => (c.escopoNivel === "pais" || c.escopo?.nivel === "pais"));
    if (cargosPais.length > 0) {
      const c = cargosPais[0];
      setOrigemNeg({
        nivel: "pais",
        id: c.paisId,
        nome: c.paisNome || c.paisId,
        holderEmail: userEmail,
      });
    }
  }, [modalNegociacaoOpen, userEmail]);

  useEffect(() => {
    const algumModalAberto = !!(paisAberto || cidadeAberta || provinciaAberta || cargosAbertos);
    if (algumModalAberto) {
      autoMinimizouRef.current = true;
      setMinimizado(true);
    } else if (autoMinimizouRef.current) {
      autoMinimizouRef.current = false;
      setMinimizado(false);
    }
  }, [paisAberto, cidadeAberta, provinciaAberta, cargosAbertos]);
  const [posicao, setPosicao] = useState({ x: Math.max(20, window.innerWidth - 940), y: 80 });
  const [tamanho, setTamanho] = useState({ width: 900, height: 640 });
  const [minimizado, setMinimizado] = useState(false);
  const [arrastando, setArrastando] = useState(false);
  const [redimensionando, setRedimensionando] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const resizeStartRef = useRef({ x: 0, y: 0, width: 0, height: 0 });

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "sim_config", "mundo"), (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        setConfig((prev) => ({ ...prev, ...d }));
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (arrastando) {
        const nx = e.clientX - dragStartRef.current.x;
        const ny = e.clientY - dragStartRef.current.y;
        const maxX = window.innerWidth - 80;
        const maxY = window.innerHeight - 60;
        setPosicao({
          x: Math.min(Math.max(-tamanho.width + 200, nx), maxX),
          y: Math.min(Math.max(0, ny), maxY),
        });
      }
      if (redimensionando) {
        const nw = Math.max(560, resizeStartRef.current.width + (e.clientX - resizeStartRef.current.x));
        const nh = Math.max(380, resizeStartRef.current.height + (e.clientY - resizeStartRef.current.y));
        setTamanho({ width: nw, height: nh });
      }
    };
    const handleMouseUp = () => {
      setArrastando(false);
      setRedimensionando(false);
    };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [arrastando, redimensionando, tamanho.width]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "sim_paises"), (snap) => {
      const m = {};
      snap.forEach((d) => { m[d.id] = { id: d.id, ...d.data() }; });
      setPaises(m);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "sim_cidades"), (snap) => {
      const m = {};
      snap.forEach((d) => { m[d.id] = { id: d.id, ...d.data() }; });
      setCidades(m);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "sim_commodities"), (snap) => {
      const m = {};
      snap.forEach((d) => { m[d.id] = { id: d.id, ...d.data() }; });
      setCommodities(m);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "sim_igs"), (snap) => {
      const m = {};
      snap.forEach((d) => { m[d.id] = { id: d.id, ...d.data() }; });
      setIgs(m);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "sim_provincias"), (snap) => {
      const m = {};
      snap.forEach((d) => { m[d.id] = { id: d.id, ...d.data() }; });
      setProvincias(m);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "sim_negociacoes"), (snap) => {
      const m = {};
      snap.forEach((d) => { m[d.id] = { id: d.id, ...d.data() }; });
      setNegociacoes(m);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "sim_alertas"), (snap) => {
      const m = {};
      snap.forEach((d) => { m[d.id] = { id: d.id, ...d.data() }; });
      setAlertas(m);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "sim_empresas"), (snap) => {
      const m = {};
      snap.forEach((d) => { m[d.id] = { id: d.id, ...d.data() }; });
      setEmpresas(m);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "bolsa_valores", "dados"), (snap) => {
      if (snap.exists()) {
        setBolsaEmpresas(snap.data().empresas || []);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!modalEmpresaOpen) return;
    if (fichasMap && Object.keys(fichasMap).length > 0) {
      setFichasDisponiveis(fichasMap);
      return;
    }
    const unsub = onSnapshot(collection(db, "fichas"), (snap) => {
      const m = {};
      snap.forEach((d) => { m[d.id] = { email: d.id, ...d.data() }; });
      setFichasDisponiveis(m);
    });
    return () => unsub();
  }, [modalEmpresaOpen, fichasMap]);

  useEffect(() => {
    if (empresaEditando) {
      setFormEmpresa({
        nome: empresaEditando.nome || "",
        descricao: empresaEditando.descricao || "",
        imagemUrl: empresaEditando.imagemUrl || "",
        tipo: empresaEditando.tipo || "local",
        valor: empresaEditando.valor || 0,
        origemNivel: empresaEditando.origem?.nivel || "pais",
        origemId: empresaEditando.origem?.id || "",
        sedes: Array.isArray(empresaEditando.sedes) ? [...empresaEditando.sedes] : (empresaEditando.sede ? [empresaEditando.sede] : []),
        bolsaEmpresaId: empresaEditando.bolsaEmpresaId || "",
        donoModo: empresaEditando.donoEmail ? "pj" : (empresaEditando.donoNomeLivre ? "livre" : "pj"),
        donoEmail: empresaEditando.donoEmail || "",
        donoNomeLivre: empresaEditando.donoNomeLivre || "",
        subsidiarias: Array.isArray(empresaEditando.subsidiarias) ? [...empresaEditando.subsidiarias] : [],
        categorias: Array.isArray(empresaEditando.categorias) ? [...empresaEditando.categorias] : [],
      });
    } else if (modalEmpresaOpen) {
      setFormEmpresa({
        nome: "",
        descricao: "",
        imagemUrl: "",
        tipo: "local",
        valor: 0,
        origemNivel: "pais",
        origemId: "",
        sedes: [],
        bolsaEmpresaId: "",
        donoModo: "pj",
        donoEmail: "",
        donoNomeLivre: "",
        subsidiarias: [],
        categorias: [],
      });
    }
  }, [empresaEditando, modalEmpresaOpen]);

  useEffect(() => {
    const iv = setInterval(() => setAgoraTick(Date.now()), 30000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    if (!paisAberto) return;
    const p = paises[paisAberto.id];
    if (!p) return;
    const pesq = p.pesquisaAtual;
    if (!pesq || !pesq.id) return;
    if (!tecConcluida(pesq)) return;

    const tecnologiasAtuais = [...(p.tecnologias || [])];
    if (!tecnologiasAtuais.includes(pesq.id)) tecnologiasAtuais.push(pesq.id);
    setDoc(doc(db, "sim_paises", p.id), {
      tecnologias: tecnologiasAtuais,
      pesquisaAtual: null,
      ultimaPesquisaConcluida: { id: pesq.id, concluidoEm: new Date().toISOString() },
    }, { merge: true }).catch(() => {});
  }, [agoraTick, paisAberto, paises]);

  useEffect(() => {
    if (!empresaAberta) return;
    const emp = empresas[empresaAberta.id];
    if (!emp) return;
    const pesq = emp.pesquisaEmpresa?.pesquisaAtual;
    if (!pesq || !pesq.id) return;
    if (!tecConcluida(pesq)) return;

    const tecnologiasAtuais = [...(emp.pesquisaEmpresa?.tecnologias || [])];
    if (!tecnologiasAtuais.includes(pesq.id)) tecnologiasAtuais.push(pesq.id);
    setDoc(doc(db, "sim_empresas", emp.id), {
      pesquisaEmpresa: {
        tecnologias: tecnologiasAtuais,
        pesquisaAtual: null,
      },
      atualizadoEm: new Date().toISOString(),
    }, { merge: true }).catch(() => {});
  }, [agoraTick, empresaAberta, empresas]);

  const totalPopMundo = useMemo(
    () => Object.values(paises).reduce((s, p) => s + (p.popTotal || 0), 0),
    [paises]
  );

  const termoAba = (aba) => (buscasPorAba[aba] || "").toLowerCase().trim();
  const setTermoAba = (aba, valor) =>
    setBuscasPorAba((prev) => ({ ...prev, [aba]: valor }));

  const filtrar = (lista, chaves) => {
    const termo = termoAba(aba) || buscaGlobal.toLowerCase().trim();
    if (!termo) return lista;
    return lista.filter((item) =>
      chaves.some((k) => String(item[k] || "").toLowerCase().includes(termo))
    );
  };

  const migrarProvincias = async () => {
    if (!isMaster) return;
    if (!window.confirm("Criar províncias a partir das regiões dos países e ligar as cidades a elas?")) return;
    try {
      let batch = writeBatch(db);
      let ops = 0;
      const commitSe = async () => {
        if (ops >= 400) { await batch.commit(); batch = writeBatch(db); ops = 0; }
      };

      for (const p of PAISES) {
        const provs = gerarProvinciasDePais(p);
        const mapa = idsProvinciasECidades(p);
        for (const prov of provs) {
          batch.set(doc(db, "sim_provincias", prov.id), {
            ...prov,
            criadoEm: new Date().toISOString(),
          }, { merge: true });
          ops++;
          await commitSe();
        }
        for (const [cidadeId, provId] of Object.entries(mapa)) {
          batch.set(doc(db, "sim_cidades", cidadeId), {
            provinciaId: provId,
          }, { merge: true });
          ops++;
          await commitSe();
        }
      }
      if (ops > 0) await batch.commit();
      alert("✅ Províncias criadas e cidades vinculadas.");
    } catch (e) {
      alert("Erro: " + e.message);
    }
  };

  const seedMundo = async () => {
    if (!isMaster) return;
    if (!window.confirm("Inicializar o mundo? Isso criará todos os países, cidades, commodities e IGs.")) return;
    setSeedando(true);
    try {
      const existentes = await getDocs(collection(db, "sim_paises"));
      if (!existentes.empty) {
        const ok = window.confirm("Já existem dados de mundo. Sobrescrever?");
        if (!ok) { setSeedando(false); return; }
      }

      let batch = writeBatch(db);
      let ops = 0;
      const commitSeNecessario = async () => {
        if (ops >= 400) {
          await batch.commit();
          batch = writeBatch(db);
          ops = 0;
        }
      };

      for (const c of COMMODITIES) {
        const ref = doc(db, "sim_commodities", c.id);
        batch.set(ref, {
          ...c,
          precoAtual: c.precoBase,
          historico: [c.precoBase],
          atualizadoEm: new Date().toISOString(),
        }, { merge: true });
        ops++;
        await commitSeNecessario();
      }

      for (const p of PAISES) {
        const paisRef = doc(db, "sim_paises", p.id);
        const cargosTemplate = CARGOS_TEMPLATE[p.formaGoverno] || [];
        const cargos = cargosTemplate.map((c) => ({
          ...c,
          id: `${p.id}_${c.id}`,
          escopo: { nivel: c.escopoNivel, alvoId: c.escopoNivel === "pais" ? p.id : "" },
          holderEmail: "",
          atribuidoPor: "",
          atribuidoEm: "",
        }));

        const pops = gerarPopsPadrao(p);

        const igsDoPais = p.igs.map((ig) => ({
          ...ig,
          id: `${p.id}_${ig.id}`,
          paisOrigem: p.id,
          composicaoPops: { operarios: 0.3, camponeses: 0.2, mercadores: 0.2, clero: 0.1, militares: 0.1, nobres: 0.1 },
        }));

        batch.set(paisRef, {
          id: p.id,
          nome: p.nome,
          capitalId: p.capitalId,
          formaGoverno: p.formaGoverno,
          popTotal: p.popTotal,
          aurana: p.aurana,
          moeda: p.moeda,
          cor: p.cor,
          descricao: p.descricao,
          regioes: p.regioes,
          pops,
          igs: igsDoPais.map((i) => i.id),
          leis: { ...LEIS_DEFAULT_PAIS },
          cofre: p.cofre,
          reputacao: 50,
          estoque: {},
          taxaProvincias: 10,
          taxaProvinciasIndividual: {},
          impostoInternacional: 10,
          instrucao: 0,
          cargos,
          atualizadoEm: new Date().toISOString(),
        }, { merge: true });
        ops++;
        await commitSeNecessario();

        for (const ig of igsDoPais) {
          batch.set(doc(db, "sim_igs", ig.id), ig, { merge: true });
          ops++;
          await commitSeNecessario();
        }

        const provincias = gerarProvinciasDePais(p);
        const mapaProvincia = idsProvinciasECidades(p);

        for (const prov of provincias) {
          batch.set(doc(db, "sim_provincias", prov.id), {
            ...prov,
            pops: {},
            investimentos: {
              infraestrutura: 3,
              educacao: 3,
              saude: 3,
              seguranca: 3,
              cultura: 1,
              pesquisa: 1,
              militar: 1,
            },
            leis: {},
            cofre: 0,
            estoque: {},
            taxaCidades: 10,
            taxaCidadesIndividual: {},
            taxaComercioProvincias: 5,
            producao: {},
            consumo: {},
            prosperidade: 55,
            radicalizacao: 20,
            lealdade: 60,
            criminalidade: 20,
            instrucao: 0,
            igs: [],
            criadoEm: new Date().toISOString(),
          }, { merge: true });
          ops++;
          await commitSeNecessario();
        }

        for (const cid of p.cidades) {
          const cIdFull = `${p.id}_${cid.id}`;
          const cProsp = cid.tipo === "capital" ? 75 : cid.tipo === "industrial" ? 65 : cid.tipo === "militar" ? 45 : 55;
          const cRad = cid.tipo === "industrial" ? 35 : 15;
          const popsCidade = gerarPopsCidade(cid);

          const igsLocais = gerarIgLocais(cid, p.id);
          const cargosLocais = gerarCargosLocais(cid, p.id);

          batch.set(doc(db, "sim_cidades", cIdFull), {
            id: cIdFull,
            nome: cid.nome,
            paisId: p.id,
            provinciaId: mapaProvincia[cIdFull] || "",
            tipo: cid.tipo,
            pop: cid.pop,
            pops: popsCidade,
            prosperidade: cProsp,
            criminalidade: cid.tipo === "porto" ? 40 : 20,
            lealdade: 60,
            radicalizacao: cRad,
            infraestrutura: cid.tipo === "capital" ? 80 : 50,
            educacao: 5,
            saude: 5,
            seguranca: 3,
            cultura: 2,
            pesquisa: 2,
            militar: 1,
            producao: cid.prod,
            consumo: cid.cons,
            edificios: gerarEdificiosIniciais(cid.prod, cid.cons),
            edificiosDonos: {},
            estoque: {},
            cofre: 0,
            instrucao: 0,
            igsLocais: igsLocais.map((i) => i.id),
            cargosLocais,
            impostos: {
              residencial: { pobre: 10, medio: 15, rico: 20 },
              comercial:   { pobre: 10, medio: 15, rico: 20 },
              industrial:  { pobre: 10, medio: 15, rico: 20 },
            },
            leis: {},
            atualizadoEm: new Date().toISOString(),
          }, { merge: true });
          ops++;
          await commitSeNecessario();

          for (const ig of igsLocais) {
            batch.set(doc(db, "sim_igs", ig.id), ig, { merge: true });
            ops++;
            await commitSeNecessario();
          }
        }
      }

      batch.set(doc(db, "sim_config", "mundo"), {
        initialized: true,
        ultimoTick: new Date().toISOString(),
        congelarTudo: false,
        congelamentos: {},
        permitirCrises: true,
        iaNarradorAtiva: false,
        criadoEm: new Date().toISOString(),
      }, { merge: true });
      ops++;

      await batch.commit();
      alert("✅ Mundo inicializado!");
    } catch (err) {
      console.error(err);
      alert("Erro ao inicializar: " + err.message);
    } finally {
      setSeedando(false);
    }
  };

  const resetarMundo = async () => {
    if (!isMaster) return;
    if (!window.confirm("⚠️ Apagar TODO o mundo simulado? Países, cidades, IGs, commodities. Não afeta fichas.")) return;
    if (!window.confirm("Tem certeza mesmo? Sem volta.")) return;
    try {
      for (const col of ["sim_paises", "sim_provincias", "sim_cidades", "sim_commodities", "sim_igs", "sim_alertas"]) {
        const snap = await getDocs(collection(db, col));
        let batch = writeBatch(db);
        let ops = 0;
        for (const d of snap.docs) {
          batch.delete(d.ref);
          ops++;
          if (ops >= 400) { await batch.commit(); batch = writeBatch(db); ops = 0; }
        }
        if (ops > 0) await batch.commit();
      }
      await setDoc(doc(db, "sim_config", "mundo"), { initialized: false }, { merge: true });
      alert("🗑️ Mundo resetado.");
    } catch (err) {
      alert("Erro ao resetar: " + err.message);
    }
  };

  const alternarCongelamento = async (chave) => {
    if (!isMaster) return;
    const novos = { ...(config.congelamentos || {}) };
    novos[chave] = !novos[chave];
    await setDoc(doc(db, "sim_config", "mundo"), { congelamentos: novos }, { merge: true });
  };

  const atualizarConfig = async (patch) => {
    if (!isMaster) return;
    await setDoc(doc(db, "sim_config", "mundo"), patch, { merge: true });
  };

  const abrirPais = (p) => {
    setLeisEditando(null);
    setPaisAberto(p);
  };

  const FATOR_PROPAGACAO = 0.3;

  const construirEdificio = async (edificioId, nivelOrigem, alvoId) => {
    if (!isMaster) return;
    const ed = EDIFICIOS_CATALOGO.find((e) => e.id === edificioId);
    if (!ed) return;

    const todasCid = Object.values(cidades);
    const todasProv = Object.values(provincias);

    let cidadesAfetadas = [];
    let cofrePais = null;
    let paisId = null;

    if (nivelOrigem === "cidade") {
      const c = todasCid.find((x) => x.id === alvoId);
      if (!c) return;
      cidadesAfetadas = [c];
      paisId = c.paisId;
    } else if (nivelOrigem === "provincia") {
      const pv = todasProv.find((x) => x.id === alvoId);
      if (!pv) return;
      paisId = pv.paisId;
      const cids = pv.cidadesIds || [];
      const cidadesProv = cids.map((id) => todasCid.find((c) => c.id === id)).filter(Boolean);
      const qtd = Math.max(1, Math.round(cidadesProv.length * FATOR_PROPAGACAO));
      cidadesAfetadas = [...cidadesProv].sort(() => Math.random() - 0.5).slice(0, qtd);
    } else if (nivelOrigem === "pais") {
      paisId = alvoId;
      const provsDoPais = todasProv.filter((pv) => pv.paisId === alvoId);
      const qtdProv = Math.max(1, Math.round(provsDoPais.length * FATOR_PROPAGACAO));
      const provsAfetadas = [...provsDoPais].sort(() => Math.random() - 0.5).slice(0, qtdProv);
      for (const pv of provsAfetadas) {
        const cids = pv.cidadesIds || [];
        const cidadesProv = cids.map((id) => todasCid.find((c) => c.id === id)).filter(Boolean);
        const qtdCid = Math.max(1, Math.round(cidadesProv.length * FATOR_PROPAGACAO));
        cidadesAfetadas.push(...[...cidadesProv].sort(() => Math.random() - 0.5).slice(0, qtdCid));
      }
    }

    if (!paisId || cidadesAfetadas.length === 0) return;
    const pais = paises[paisId];
    if (!pais) return;
    cofrePais = pais.cofre || 0;

    const paisFull = paises[paisId];
    const fatoresTec = getFatoresTecnologias(paisFull);
    const multCusto = fatoresTec.custoEdificios || 1;

    let custoTotal = 0;
    for (const c of cidadesAfetadas) {
      const nivelAtual = (c.edificios || {})[edificioId] || 0;
      if (nivelAtual >= 10) continue;
      custoTotal += Math.round(custoEdificio(ed, nivelAtual) * multCusto);
    }

    if (custoTotal === 0) {
      alert("Todos os alvos já estão no nível máximo.");
      return;
    }

    // Master tem controle absoluto: não valida cofre nem desconta custo

    for (const c of cidadesAfetadas) {
      const edifAtuais = { ...(c.edificios || {}) };
      const nivelAtual = edifAtuais[edificioId] || 0;
      if (nivelAtual >= 10) continue;
      edifAtuais[edificioId] = nivelAtual + 1;
      await setDoc(doc(db, "sim_cidades", c.id), { edificios: edifAtuais }, { merge: true });
    }

    alert(`✅ ${ed.nome} construído em ${cidadesAfetadas.length} cidade(s).\nCusto: 0 (master)`);
  };

  const removerEdificio = async (edificioId, nivelOrigem, alvoId) => {
    if (!isMaster) return;
    const ed = EDIFICIOS_CATALOGO.find((e) => e.id === edificioId);
    if (!ed) return;

    const todasCid = Object.values(cidades);
    const todasProv = Object.values(provincias);

    let cidadesAfetadas = [];

    if (nivelOrigem === "cidade") {
      const c = todasCid.find((x) => x.id === alvoId);
      if (c) cidadesAfetadas = [c];
    } else if (nivelOrigem === "provincia") {
      const pv = todasProv.find((x) => x.id === alvoId);
      if (pv) {
        cidadesAfetadas = (pv.cidadesIds || []).map((id) => todasCid.find((c) => c.id === id)).filter(Boolean);
      }
    } else if (nivelOrigem === "pais") {
      cidadesAfetadas = todasCid.filter((c) => c.paisId === alvoId);
    }

    if (cidadesAfetadas.length === 0) return;

    let removidos = 0;
    for (const c of cidadesAfetadas) {
      const edifAtuais = { ...(c.edificios || {}) };
      const nivelAtual = edifAtuais[edificioId] || 0;
      if (nivelAtual <= 0) continue;
      edifAtuais[edificioId] = nivelAtual - 1;
      if (edifAtuais[edificioId] === 0) delete edifAtuais[edificioId];
      await setDoc(doc(db, "sim_cidades", c.id), { edificios: edifAtuais }, { merge: true });
      removidos++;
    }

    alert(`⬇️ ${ed.nome} rebaixado em ${removidos} cidade(s).`);
  };
  const renderPainelEdificios = (nivel, alvo, alvoId) => {
    if (!isMaster) {
      return (
        <Paper sx={{ p: 1.5, bgcolor: V3.paperDark, border: `1px dashed ${V3.gold}44`, mb: 2, textAlign: "center" }}>
          <Typography sx={{ color: V3.ink, opacity: 0.6, fontSize: "0.7rem" }}>
            Só o Mestre pode construir edifícios neste nível.
          </Typography>
        </Paper>
      );
    }

    const cidadesAlvo = nivel === "cidade"
      ? Object.values(cidades).filter((c) => c.id === alvoId)
      : nivel === "provincia"
        ? Object.values(cidades).filter((c) => c.provinciaId === alvoId)
        : Object.values(cidades).filter((c) => c.paisId === alvoId);

    const nivelMedio = {};
    for (const c of cidadesAlvo) {
      for (const [edId, nv] of Object.entries(c.edificios || {})) {
        nivelMedio[edId] = (nivelMedio[edId] || 0) + nv;
      }
    }
    for (const id of Object.keys(nivelMedio)) {
      nivelMedio[id] = Math.round((nivelMedio[id] / cidadesAlvo.length) * 10) / 10;
    }

    const categoriasOrdem = ["basico", "luxo", "industria", "militar"];
    const porCategoria = {};
    for (const ed of EDIFICIOS_CATALOGO) {
      if (!porCategoria[ed.categoria]) porCategoria[ed.categoria] = [];
      porCategoria[ed.categoria].push(ed);
    }

    const label = nivel === "cidade" ? "MUNICIPAL" : nivel === "provincia" ? "PROVINCIAL" : "NACIONAL";

    return (
      <>
        <Typography variant="caption" sx={{ color: V3.gold, fontWeight: 900, letterSpacing: 1, fontSize: "0.7rem", display: "block", mb: 0.5 }}>
          🏗️ EDIFÍCIOS — {label}
        </Typography>
        <Typography variant="caption" sx={{ color: V3.ink, opacity: 0.55, fontSize: "0.55rem", display: "block", mb: 1.5, fontStyle: "italic" }}>
          {nivel === "cidade" && "Construir aqui afeta só esta cidade."}
          {nivel === "provincia" && "Construir aqui afeta 30% das cidades desta província."}
          {nivel === "pais" && "Construir aqui afeta 30% das províncias, que propagam a 30% das suas cidades."}
        </Typography>

        {categoriasOrdem.map((catId) => {
          const catInfo = CATEGORIAS_EDIFICIO[catId] || { nome: catId, icone: "📦", cor: V3.gold };
          const lista = porCategoria[catId] || [];
          if (lista.length === 0) return null;
          return (
            <Box key={catId} sx={{ mb: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.6, mb: 1, pb: 0.5, borderBottom: `1px solid ${catInfo.cor}44` }}>
                <Typography sx={{ fontSize: "0.9rem" }}>{catInfo.icone}</Typography>
                <Typography variant="caption" sx={{ color: catInfo.cor, fontWeight: 900, letterSpacing: 1.2, fontSize: "0.65rem", fontFamily: "Georgia, serif" }}>
                  {catInfo.nome.toUpperCase()}
                </Typography>
              </Box>
              <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1 }}>
                {lista.map((ed) => {
                  const medio = nivelMedio[ed.id] || 0;
                  const qtdAfetadas = nivel === "cidade" ? 1
                    : nivel === "provincia" ? Math.max(1, Math.round(cidadesAlvo.length * FATOR_PROPAGACAO))
                    : Math.max(1, Math.round(cidadesAlvo.length * FATOR_PROPAGACAO * FATOR_PROPAGACAO));
                  const fatoresTecPreview = getFatoresTecnologias(paises[alvo.paisId] || alvo);
                  const multCustoPreview = fatoresTecPreview.custoEdificios || 1;
                  const custoEstimado = Math.round(ed.baseCusto * qtdAfetadas * multCustoPreview);
                  return (
                    <Paper
                      key={ed.id}
                      sx={{
                        p: 0,
                        bgcolor: V3.paperDark,
                        border: medio > 0 ? `1px solid ${ed.cor}` : `1px solid ${V3.gold}22`,
                        borderRadius: 2,
                        background: medio > 0
                          ? `linear-gradient(135deg, ${V3.paperDark} 0%, ${ed.cor}18 100%)`
                          : V3.paperDark,
                        boxShadow: medio >= 10 ? `0 0 14px ${ed.cor}88, inset 0 0 8px ${ed.cor}33` : medio > 0 ? `0 2px 6px rgba(0,0,0,0.18)` : "none",
                        position: "relative",
                        overflow: "hidden",
                        transition: "all 0.2s",
                        "&:hover": { boxShadow: medio >= 10 ? `0 0 18px ${ed.cor}cc` : `0 4px 10px rgba(0,0,0,0.25)` },
                      }}
                    >
                      {medio > 0 && (
                        <Box sx={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, bgcolor: ed.cor, boxShadow: medio >= 10 ? `0 0 10px ${ed.cor}` : "none" }} />
                      )}

                      <Box sx={{ p: 1.2 }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.8, mb: 0.6 }}>
                          <Box
                            sx={{
                              width: 32, height: 32, borderRadius: "50%",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              bgcolor: `${ed.cor}33`,
                              border: `2px solid ${ed.cor}`,
                              fontSize: "1rem", flexShrink: 0,
                              boxShadow: medio >= 10 ? `0 0 8px ${ed.cor}` : "none",
                            }}
                          >
                            {ed.icone}
                          </Box>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="caption" sx={{ color: V3.ink, fontWeight: 900, fontSize: "0.72rem", display: "block", lineHeight: 1.15, fontFamily: "Georgia, serif", letterSpacing: 0.3 }}>
                              {ed.nome}
                            </Typography>
                            <Typography variant="caption" sx={{ color: ed.cor, opacity: 0.9, fontSize: "0.55rem", fontWeight: 800, letterSpacing: 0.5 }}>
                              NÍVEL MÉDIO {medio.toFixed(1)}/10
                            </Typography>
                            {(() => {
                              if (nivel !== "cidade") return null;
                              const dono = (alvo.edificiosDonos || {})[ed.id];
                              const privado = dono?.tipo === "privado";
                              const ehEmpresa = privado && !!dono.empresaId;
                              const nome = ehEmpresa
                                ? `🏢 ${dono.empresaNome || "Empresa"}`
                                : privado
                                  ? `👤 ${dono.holderNome || "Privado"}`
                                  : "🏛️ Público";
                              const cor = ehEmpresa ? V3.green : privado ? V3.blue : V3.gold;
                              return (
                                <Box
                                  onClick={() => setDonoVisualizando({
                                    cidadeId: alvo.id,
                                    cidadeNome: alvo.nome,
                                    edId: ed.id,
                                    edNome: ed.nome,
                                    edCor: ed.cor,
                                    edIcone: ed.icone,
                                    nivel: medio,
                                  })}
                                  sx={{
                                    mt: 0.3,
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 0.3,
                                    bgcolor: `${cor}33`,
                                    color: V3.ink,
                                    border: `1px solid ${cor}66`,
                                    borderRadius: 1,
                                    px: 0.6,
                                    py: 0.15,
                                    cursor: "pointer",
                                    "&:hover": { bgcolor: `${cor}55`, boxShadow: `0 0 6px ${cor}88` },
                                  }}
                                  title="Ver donos deste edifício"
                                >
                                  <Typography sx={{ fontSize: "0.55rem", fontWeight: 800, lineHeight: 1 }}>
                                    {nome}
                                  </Typography>
                                  <Typography sx={{ fontSize: "0.5rem", opacity: 0.75, fontWeight: 700, lineHeight: 1 }}>
                                    · Nv {medio.toFixed(0)} · 👁️
                                  </Typography>
                                </Box>
                              );
                            })()}
                          </Box>
                          {medio >= 10 && (
                            <Chip label="MAX" size="small" sx={{ bgcolor: ed.cor, color: "#fff", fontWeight: 900, fontSize: "0.5rem", height: 16 }} />
                          )}
                        </Box>

                        <Box sx={{ height: 6, bgcolor: "rgba(0,0,0,0.25)", borderRadius: 3, overflow: "hidden", mb: 0.8 }}>
                          <Box sx={{ height: "100%", width: `${(medio / 10) * 100}%`, bgcolor: ed.cor, transition: "width 0.3s", boxShadow: medio > 0 ? `0 0 6px ${ed.cor}` : "none" }} />
                        </Box>

                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, flexWrap: "wrap" }}>
                          {nivel === "cidade" && (
                            <>
                              <Button
                                size="small"
                                onClick={() => {
                                  const donoAtual = (alvo.edificiosDonos || {})[ed.id];
                                  setDonoEditando({ cidadeId: alvo.id, cidadeNome: alvo.nome, edId: ed.id, edNome: ed.nome, donoAtual });
                                }}
                                sx={{
                                  minWidth: 0, height: 26, p: "0 6px",
                                  bgcolor: `${V3.blue}22`,
                                  color: V3.blue,
                                  border: `1px solid ${V3.blue}`,
                                  fontWeight: 800, fontSize: "0.6rem",
                                  "&:hover": { bgcolor: `${V3.blue}44` },
                                }}
                                title="Definir dono do edifício"
                              >
                                👤
                              </Button>
                              <Button
                                size="small"
                                onClick={() => {
                                  const donoAtual = (alvo.edificiosDonos || {})[ed.id];
                                  setInvestindoEst({
                                    cidadeId: alvo.id,
                                    cidadeNome: alvo.nome,
                                    cidadePaisId: alvo.paisId,
                                    edId: ed.id,
                                    edNome: ed.nome,
                                    edCusto: ed.baseCusto,
                                    nivelAtual: medio,
                                    donoAtual,
                                  });
                                }}
                                sx={{
                                  minWidth: 0, height: 26, p: "0 6px",
                                  bgcolor: `${V3.gold}22`,
                                  color: V3.gold,
                                  border: `1px solid ${V3.gold}`,
                                  fontWeight: 800, fontSize: "0.6rem",
                                  "&:hover": { bgcolor: `${V3.gold}44` },
                                }}
                                title="Investir estrangeiro"
                              >
                                🌎
                              </Button>
                            </>
                          )}
                          <Button
                            size="small"
                            onClick={() => removerEdificio(ed.id, nivel, alvoId)}
                            disabled={medio <= 0}
                            sx={{
                              minWidth: 30, height: 26, p: 0,
                              bgcolor: medio > 0 ? `${V3.red}22` : "transparent",
                              color: medio > 0 ? V3.red : "#888",
                              border: `1px solid ${medio > 0 ? V3.red : "#555"}`,
                              fontWeight: 900, fontSize: "1rem",
                              "&:hover": { bgcolor: `${V3.red}44` },
                            }}
                          >
                            −
                          </Button>
                          <Button
                            size="small"
                            onClick={() => construirEdificio(ed.id, nivel, alvoId)}
                            disabled={medio >= 10}
                            sx={{
                              minWidth: 30, height: 26, p: 0,
                              bgcolor: medio < 10 ? `${V3.green}22` : "transparent",
                              color: medio < 10 ? V3.green : "#888",
                              border: `1px solid ${medio < 10 ? V3.green : "#555"}`,
                              fontWeight: 900, fontSize: "1rem",
                              "&:hover": { bgcolor: `${V3.green}44` },
                            }}
                          >
                            +
                          </Button>
                          <Typography variant="caption" sx={{ color: V3.ink, opacity: 0.7, fontSize: "0.55rem", ml: "auto", fontWeight: 700 }}>
                            💰 {custoEstimado.toLocaleString("pt-BR")}
                          </Typography>
                        </Box>
                        <Typography variant="caption" sx={{ color: V3.ink, opacity: 0.5, fontSize: "0.5rem", display: "block", mt: 0.4, textAlign: "right" }}>
                          afeta {qtdAfetadas} cidad{qtdAfetadas > 1 ? "es" : "e"}
                        </Typography>
                      </Box>
                    </Paper>
                  );
                })}
              </Box>
            </Box>
          );
        })}
      </>
    );
  };
  return createPortal(
    <>
    <Paper
      elevation={16}
      sx={{
        position: "fixed",
        left: posicao.x,
        top: posicao.y,
        width: minimizado ? 320 : tamanho.width,
        height: minimizado ? 48 : tamanho.height,
        bgcolor: V3.bg,
        border: `2px solid ${V3.gold}`,
        borderRadius: 3,
        zIndex: 9998,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        background: `linear-gradient(160deg, ${V3.bg2} 0%, ${V3.bg} 100%)`,
        boxShadow: `0 0 40px ${V3.gold}44, 0 12px 40px rgba(0,0,0,0.8)`,
        transition: arrastando || redimensionando ? "none" : "width 0.2s ease, height 0.2s ease",
      }}
    >
      <Box
        onMouseDown={(e) => {
          if (e.target.tagName === "BUTTON" || e.target.closest("button") || e.target.closest("svg")) return;
          e.preventDefault();
          setArrastando(true);
          dragStartRef.current = { x: e.clientX - posicao.x, y: e.clientY - posicao.y };
        }}
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          p: 1.2,
          bgcolor: V3.bg2,
          borderBottom: `2px solid ${V3.gold}`,
          cursor: arrastando ? "grabbing" : "grab",
          userSelect: "none",
        }}
      >
        <PublicIcon sx={{ color: V3.gold }} />
        <Typography
          variant="subtitle1"
          sx={{ color: V3.gold, fontWeight: 900, fontFamily: "Georgia, serif", letterSpacing: 1.5, whiteSpace: "nowrap" }}
        >
          {minimizado ? "SIMULADOR" : "SIMULADOR DO MUNDO"}
        </Typography>
        {!minimizado && config.initialized && (
          <Chip
            label="MUNDO ATIVO"
            size="small"
            sx={{ bgcolor: V3.green, color: V3.paper, fontWeight: 800, fontSize: "0.6rem" }}
          />
        )}
        {!minimizado && !config.initialized && (
          <Chip
            label="NÃO INICIALIZADO"
            size="small"
            sx={{ bgcolor: V3.red, color: V3.paper, fontWeight: 800, fontSize: "0.6rem" }}
          />
        )}
        {!minimizado && config.congelarTudo && (
          <Chip
            label="❄️ CONGELADO"
            size="small"
            sx={{ bgcolor: V3.blue, color: V3.paper, fontWeight: 800, fontSize: "0.6rem" }}
          />
        )}
        <Box sx={{ flex: 1 }} />
        {!minimizado && (
          <TextField
            size="small"
            placeholder="🔍 Buscar tudo..."
            value={buscaGlobal}
            onChange={(e) => setBuscaGlobal(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            sx={{
              width: 220,
              "& .MuiInputBase-root": {
                color: V3.paper,
                bgcolor: `${V3.gold}22`,
                fontSize: "0.75rem",
                height: 32,
              },
              "& .MuiOutlinedInput-notchedOutline": { borderColor: `${V3.gold}66` },
              "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: V3.gold },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: V3.gold, fontSize: 16 }} />
                </InputAdornment>
              ),
            }}
          />
        )}
        <IconButton
          onClick={() => setMinimizado((v) => !v)}
          size="small"
          sx={{ color: V3.gold }}
          title={minimizado ? "Expandir" : "Minimizar"}
        >
          {minimizado ? <ExpandMoreIcon fontSize="small" /> : <ExpandLessIcon fontSize="small" />}
        </IconButton>
        <IconButton onClick={onClose} sx={{ color: V3.gold }} size="small" title="Fechar">
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      {!minimizado && (
        <Tabs
          value={aba}
          onChange={(_, v) => setAba(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            bgcolor: V3.bg2,
            borderBottom: `1px solid ${V3.gold}33`,
            "& .MuiTab-root": {
              color: `${V3.gold}88`,
              fontWeight: 800,
              fontSize: "0.7rem",
              minHeight: 40,
              fontFamily: "Georgia, serif",
            },
            "& .Mui-selected": { color: `${V3.goldLight} !important` },
            "& .MuiTabs-indicator": { bgcolor: V3.gold },
          }}
        >
          <Tab icon={<DashboardIcon />} aria-label="Visão Geral" title="Visão Geral" sx={{ minWidth: 52 }} />
          <Tab icon={<FlagIcon />} aria-label="Países" title="Países" sx={{ minWidth: 52 }} />
          <Tab icon={<AccountTreeIcon />} aria-label="Províncias" title="Províncias" sx={{ minWidth: 52 }} />
          <Tab icon={<LocationCityIcon />} aria-label="Cidades" title="Cidades" sx={{ minWidth: 52 }} />
          <Tab icon={<CategoryIcon />} aria-label="Commodities" title="Commodities" sx={{ minWidth: 52 }} />
          <Tab icon={<GroupsIcon />} aria-label="IGs" title="IGs" sx={{ minWidth: 52 }} />
          <Tab icon={<BadgeIcon />} aria-label="Cargos" title="Cargos" sx={{ minWidth: 52 }} />
          <Tab icon={<AutoAwesomeIcon />} aria-label="Narrador" title="Narrador" sx={{ minWidth: 52 }} />
          <Tab icon={<HandshakeIcon />} aria-label="Negociações" title="Negociações" sx={{ minWidth: 52 }} />
          <Tab icon={<SettingsIcon />} aria-label="Config" title="Config" sx={{ minWidth: 52 }} />
          <Tab icon={<BusinessIcon />} aria-label="Empresas" title="Empresas" sx={{ minWidth: 52 }} />
        </Tabs>
      )}

      <Box sx={{ flex: 1, overflowY: "auto", p: 2, "&::-webkit-scrollbar": { width: 6 }, "&::-webkit-scrollbar-thumb": { background: `${V3.gold}44`, borderRadius: 3 } }}>
        {aba === 0 && (
          <Box>
            {config.ultimoRelatorio && (
              <Paper sx={{
                p: 1.5, mb: 2,
                bgcolor: V3.paperDark,
                border: `1px solid ${V3.gold}66`,
              }}>
                <Typography variant="caption" sx={{ color: V3.ink, fontWeight: 900, letterSpacing: 1, fontSize: "0.65rem" }}>
                  📊 RELATÓRIO DO MUNDO — {new Date(config.ultimoRelatorio.data).toLocaleString("pt-BR")}
                </Typography>
                <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, mt: 1 }}>
                  <Box>
                    <Typography variant="caption" sx={{ color: V3.green, fontWeight: 800, fontSize: "0.6rem", display: "block" }}>
                      📈 EM ALTA
                    </Typography>
                    {(config.ultimoRelatorio.topAlta || []).map((c) => (
                      <Typography key={c.id} variant="caption" sx={{ color: V3.ink, display: "block", fontSize: "0.65rem" }}>
                        {c.icone} {c.nome}: ▲ {c.variacao.toFixed(1)}%
                      </Typography>
                    ))}
                  </Box>
                  <Box>
                    <Typography variant="caption" sx={{ color: V3.red, fontWeight: 800, fontSize: "0.6rem", display: "block" }}>
                      📉 EM BAIXA
                    </Typography>
                    {(config.ultimoRelatorio.topBaixa || []).map((c) => (
                      <Typography key={c.id} variant="caption" sx={{ color: V3.ink, display: "block", fontSize: "0.65rem" }}>
                        {c.icone} {c.nome}: ▼ {Math.abs(c.variacao).toFixed(1)}%
                      </Typography>
                    ))}
                  </Box>
                </Box>
                {(config.ultimoRelatorio.cidadesAlerta || []).length > 0 && (
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="caption" sx={{ color: V3.red, fontWeight: 800, fontSize: "0.6rem", display: "block" }}>
                      🔥 CIDADES EM ALERTA
                    </Typography>
                    {config.ultimoRelatorio.cidadesAlerta.map((c) => (
                      <Typography key={c.nome} variant="caption" sx={{ color: V3.ink, display: "block", fontSize: "0.65rem" }}>
                        • {c.nome}: radicalização {c.radicalizacao}, prosperidade {c.prosperidade}
                      </Typography>
                    ))}
                  </Box>
                )}
              </Paper>
            )}
            <Box sx={{ display: "flex", gap: 1, mb: 2, flexWrap: "wrap" }}>
              <Paper sx={{ p: 1.5, flex: 1, minWidth: 140, bgcolor: V3.paperDark, border: `1px solid ${V3.gold}66` }}>
                <Typography variant="caption" sx={{ color: V3.ink, fontWeight: 800, fontSize: "0.6rem", letterSpacing: 1 }}>
                  PAÍSES
                </Typography>
                <Typography variant="h6" sx={{ color: V3.ink, fontFamily: "Georgia, serif", fontWeight: 900 }}>
                  {Object.keys(paises).length}
                </Typography>
              </Paper>
              <Paper sx={{ p: 1.5, flex: 1, minWidth: 140, bgcolor: V3.paperDark, border: `1px solid ${V3.gold}66` }}>
                <Typography variant="caption" sx={{ color: V3.ink, fontWeight: 800, fontSize: "0.6rem", letterSpacing: 1 }}>
                  CIDADES
                </Typography>
                <Typography variant="h6" sx={{ color: V3.ink, fontFamily: "Georgia, serif", fontWeight: 900 }}>
                  {Object.keys(cidades).length}
                </Typography>
              </Paper>
              <Paper sx={{ p: 1.5, flex: 1, minWidth: 140, bgcolor: V3.paperDark, border: `1px solid ${V3.gold}66` }}>
                <Typography variant="caption" sx={{ color: V3.ink, fontWeight: 800, fontSize: "0.6rem", letterSpacing: 1 }}>
                  IGs
                </Typography>
                <Typography variant="h6" sx={{ color: V3.ink, fontFamily: "Georgia, serif", fontWeight: 900 }}>
                  {Object.keys(igs).length}
                </Typography>
              </Paper>
              <Paper sx={{ p: 1.5, flex: 1, minWidth: 140, bgcolor: V3.paperDark, border: `1px solid ${V3.gold}66` }}>
                <Typography variant="caption" sx={{ color: V3.ink, fontWeight: 800, fontSize: "0.6rem", letterSpacing: 1 }}>
                  POP. MUNDIAL
                </Typography>
                <Typography variant="h6" sx={{ color: V3.ink, fontFamily: "Georgia, serif", fontWeight: 900 }}>
                  {(totalPopMundo / 1000000).toFixed(1)}M
                </Typography>
              </Paper>
            </Box>

            <Divider sx={{ borderColor: `${V3.gold}44`, mb: 2 }} />

            <Typography variant="caption" sx={{ color: V3.gold, fontWeight: 800, letterSpacing: 1, fontSize: "0.65rem" }}>
              AÇÕES
            </Typography>
            <Box sx={{ display: "flex", gap: 1, mt: 1, mb: 2, flexWrap: "wrap" }}>
              {isMaster && (
                <>
                  <Button
                    variant="contained"
                    startIcon={<AutorenewIcon />}
                    onClick={seedMundo}
                    disabled={seedando}
                    sx={{
                      bgcolor: V3.gold,
                      color: V3.ink,
                      fontWeight: 900,
                      fontFamily: "Georgia, serif",
                      "&:hover": { bgcolor: V3.goldLight },
                    }}
                  >
                    {seedando ? "Inicializando..." : config.initialized ? "Reinicializar Mundo" : "Inicializar Mundo"}
                  </Button>
                  {config.initialized && (
                    <Button
                      variant="outlined"
                      startIcon={<DeleteIcon />}
                      onClick={resetarMundo}
                      sx={{ color: V3.red, borderColor: V3.red, fontWeight: 900 }}
                    >
                      Resetar
                    </Button>
                  )}
                </>
              )}
              {!isMaster && (
                <Typography variant="caption" sx={{ color: V3.goldLight, display: "block", fontStyle: "italic", alignSelf: "center" }}>
                  Modo leitura. Apenas o Mestre pode inicializar ou resetar o mundo.
                </Typography>
              )}
            </Box>

            {(() => {
              const meusAlertas = Object.values(alertas)
                .filter((a) => {
                  if (isMaster) return true;
                  const cidade = cidades[a.entidadeId];
                  if (!cidade) return false;
                  const temMeuCargo = (cidade.cargosLocais || []).some((c) => c.holderEmail === userEmail) ||
                    (paises[cidade.paisId]?.cargos || []).some((c) => c.holderEmail === userEmail);
                  return temMeuCargo;
                })
                .sort((a, b) => {
                  const ta = a.atualizadoEm ? new Date(a.atualizadoEm).getTime() : 0;
                  const tb = b.atualizadoEm ? new Date(b.atualizadoEm).getTime() : 0;
                  return tb - ta;
                });
              if (meusAlertas.length === 0) return null;

              return (
                <>
                  <Divider sx={{ borderColor: `${V3.red}44`, mb: 2 }} />
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1, flexWrap: "wrap" }}>
                    <WarningAmberIcon sx={{ color: V3.red, fontSize: 20 }} />
                    <Typography variant="caption" sx={{ color: V3.red, fontWeight: 900, letterSpacing: 1.2, fontSize: "0.75rem", flex: 1 }}>
                      ⚠️ ALERTAS DE DÉFICIT ({meusAlertas.length})
                    </Typography>
                    {isMaster && meusAlertas.length > 0 && (
                      <Button
                        size="small"
                        onClick={async () => {
                          if (!window.confirm(`Apagar TODOS os ${meusAlertas.length} alertas? Sem volta.`)) return;
                          try {
                            for (const a of meusAlertas) {
                              await deleteDoc(doc(db, "sim_alertas", a.id));
                            }
                            alert("🗑️ Alertas apagados. Eles vão reaparecer no próximo tick apenas se o déficit continuar.");
                          } catch (e) {
                            alert("Erro: " + e.message);
                          }
                        }}
                        sx={{ bgcolor: `${V3.red}22`, color: V3.red, border: `1px solid ${V3.red}`, fontWeight: 800, fontSize: "0.55rem", py: 0.3, px: 0.8, minWidth: 0, "&:hover": { bgcolor: `${V3.red}44` } }}
                      >
                        🗑️ Limpar todos
                      </Button>
                    )}
                    <Typography variant="caption" sx={{ color: V3.ink, opacity: 0.55, fontSize: "0.5rem", fontStyle: "italic", width: "100%" }}>
                      Mais recentes primeiro. Só os 50 mais recentes são guardados.
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 1,
                      mb: 2,
                      maxHeight: 380,
                      overflowY: "auto",
                      pr: 0.5,
                      "&::-webkit-scrollbar": { width: 6 },
                      "&::-webkit-scrollbar-thumb": { background: `${V3.red}66`, borderRadius: 3 },
                    }}
                  >
                    {meusAlertas.map((a) => (
                      <Paper key={a.id} sx={{ p: 1.2, bgcolor: V3.paperDark, border: `2px solid ${V3.red}66` }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.6, mb: 0.5 }}>
                          <Typography sx={{ fontSize: "1rem" }}>📍</Typography>
                          <Typography variant="body2" sx={{ color: V3.ink, fontWeight: 900, fontFamily: "Georgia, serif", flex: 1 }}>
                            {a.entidadeNome}
                          </Typography>
                          <Chip
                            label={a.temPJ ? "👤 SEU CARGO" : a.iaDecidiu ? "🤖 IA AGIU" : "⏳ PENDENTE"}
                            size="small"
                            sx={{ bgcolor: a.temPJ ? V3.blue : a.iaDecidiu ? V3.green : V3.red, color: "#fff", fontWeight: 800, fontSize: "0.5rem", height: 16 }}
                          />
                        </Box>
                        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.3, mb: 0.5 }}>
                          {a.deficits.map((d) => (
                            <Chip
                              key={d.commodityId}
                              label={`${d.commodityId}: ${Math.round(d.saldo)}`}
                              size="small"
                              sx={{ bgcolor: "#6b1f1f", color: "#fff", fontSize: "0.5rem", height: 14, fontWeight: 700 }}
                            />
                          ))}
                        </Box>
                        {a.iaDecidiu && a.iaAviso && (
                          <Typography variant="caption" sx={{ color: V3.green, fontSize: "0.6rem", fontStyle: "italic", display: "block" }}>
                            🤖 {a.iaAviso}
                          </Typography>
                        )}
                        {a.iaAcoes?.length > 0 && (
                          <Box sx={{ mt: 0.4 }}>
                            {a.iaAcoes.map((acao, i) => (
                              <Typography key={i} variant="caption" sx={{ color: V3.ink, opacity: 0.8, fontSize: "0.55rem", display: "block" }}>
                                ✓ {acao}
                              </Typography>
                            ))}
                          </Box>
                        )}
                        {!a.temPJ && !a.iaDecidiu && a.motivo && (
                          <Typography variant="caption" sx={{ color: V3.red, fontSize: "0.55rem", display: "block" }}>
                            ⚠️ {a.motivo}
                          </Typography>
                        )}
                      </Paper>
                    ))}
                  </Box>
                </>
              );
            })()}

          </Box>
        )}

        {aba === 1 && (
          <Box>
            {Object.values(paises).length === 0 ? (
              <Typography sx={{ color: V3.paper, textAlign: "center", py: 4 }}>
                {config.initialized ? "Nenhum país." : "Mundo não inicializado."}
              </Typography>
            ) : (
              <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
                {Object.values(paises).map((p) => (
                  <Paper
                    key={p.id}
                    sx={{
                      p: 1.5,
                      bgcolor: V3.paperDark,
                      border: `1px solid ${V3.gold}66`,
                      cursor: "pointer",
                      transition: "all 0.2s",
                      "&:hover": { borderColor: V3.goldLight, boxShadow: `0 0 20px ${V3.gold}44` },
                    }}
                    onClick={() => abrirPais(p)}
                  >
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <Typography variant="subtitle2" sx={{ color: V3.ink, fontWeight: 900, fontFamily: "Georgia, serif" }}>
                        {p.nome}
                      </Typography>
                      <Chip
                        label={`${(p.popTotal / 1000000).toFixed(1)}M`}
                        size="small"
                        sx={{ bgcolor: V3.ink, color: V3.gold, fontWeight: 900, fontSize: "0.6rem", height: 18 }}
                      />
                    </Box>
                    <Typography variant="caption" sx={{ color: V3.ink, opacity: 0.75, display: "block", mt: 0.5 }}>
                      {p.formaGoverno?.replace(/_/g, " ")}
                    </Typography>
                    <Box sx={{ display: "flex", gap: 0.5, mt: 1, flexWrap: "wrap" }}>
                      <Chip label={`✨ ${(p.aurana * 100).toFixed(0)}% Aurana`} size="small" sx={{ bgcolor: V3.blue, color: V3.paper, fontSize: "0.55rem", height: 16 }} />
                      <Chip label={`💰 ${p.cofre?.toLocaleString("pt-BR") || 0}`} size="small" sx={{ bgcolor: V3.green, color: V3.paper, fontSize: "0.55rem", height: 16 }} />
                    </Box>
                  </Paper>
                ))}
              </Box>
            )}
          </Box>
        )}

        {aba === 2 && (
          <Box>
            <BarraBuscaAba valor={buscasPorAba[2] || ""} onChange={(v) => setTermoAba(2, v)} placeholder="🔍 Buscar província..." />
            {Object.values(paises).length === 0 ? (
              <Typography sx={{ color: V3.paper, textAlign: "center", py: 4 }}>
                Nenhum país. Inicialize primeiro.
              </Typography>
            ) : (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.8 }}>
                {Object.values(paises).map((p) => {
                  const provs = Object.values(provincias).filter((pv) => pv.paisId === p.id);
                  const provsFiltradas = filtrar(provs, ["nome", "id"]);
                  if (provsFiltradas.length === 0) return null;
                  return (
                    <Accordion
                      key={p.id}
                      defaultExpanded={!!termoAba(2) || !!buscaGlobal}
                      disableGutters
                      sx={{
                        bgcolor: V3.paperDark,
                        border: `1px solid ${V3.gold}44`,
                        "&:before": { display: "none" },
                        borderRadius: 1,
                        overflow: "hidden",
                      }}
                    >
                      <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: V3.ink }} />} sx={{ bgcolor: `${p.cor}22`, minHeight: 44 }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, width: "100%" }}>
                          <Box sx={{ width: 6, height: 24, bgcolor: p.cor || V3.gold, borderRadius: 1 }} />
                          <Typography sx={{ flex: 1, color: V3.ink, fontWeight: 900, fontFamily: "Georgia, serif", fontSize: "0.85rem" }}>
                            {p.nome}
                          </Typography>
                          <Chip label={`${provsFiltradas.length} prov.`} size="small" sx={{ bgcolor: V3.ink, color: V3.gold, fontSize: "0.55rem", height: 18 }} />
                        </Box>
                      </AccordionSummary>
                      <AccordionDetails sx={{ p: 1 }}>
                        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0.8 }}>
                          {provsFiltradas.map((pv) => {
                            const pop = Object.values(cidades).filter((c) => c.provinciaId === pv.id).reduce((s, c) => s + (c.pop || 0), 0);
                            return (
                              <Paper
                                key={pv.id}
                                sx={{
                                  p: 1,
                                  bgcolor: V3.paper,
                                  border: `1px solid ${V3.gold}33`,
                                  transition: "all 0.15s",
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: 0.6,
                                  "&:hover": { borderColor: V3.gold, boxShadow: `0 0 12px ${V3.gold}44` },
                                }}
                              >
                                <Box sx={{ display: "flex", alignItems: "center", gap: 0.6 }}>
                                  <AccountTreeIcon sx={{ color: V3.gold, fontSize: 16 }} />
                                  <Typography variant="body2" sx={{ flex: 1, color: V3.ink, fontWeight: 900, fontFamily: "Georgia, serif", fontSize: "0.78rem" }}>
                                    {pv.nome}
                                  </Typography>
                                </Box>
                                <Typography variant="caption" sx={{ color: V3.ink, opacity: 0.7, fontSize: "0.55rem" }}>
                                  {pv.cidadesIds?.length || 0} cidades • 👥 {(pop / 1000).toFixed(0)}k • 📚 {Math.round((pv.instrucao || 0) * 10) / 10}%
                                </Typography>
                                <Button
                                  size="small"
                                  onClick={() => setProvinciaAberta(pv)}
                                  sx={{
                                    alignSelf: "stretch",
                                    bgcolor: V3.gold,
                                    color: V3.ink,
                                    fontWeight: 900,
                                    fontSize: "0.6rem",
                                    fontFamily: "Georgia, serif",
                                    letterSpacing: 1,
                                    py: 0.3,
                                    "&:hover": { bgcolor: V3.goldLight },
                                  }}
                                >
                                  📂 ABRIR PAINEL
                                </Button>
                              </Paper>
                            );
                          })}
                        </Box>
                      </AccordionDetails>
                    </Accordion>
                  );
                })}
              </Box>
            )}
          </Box>
        )}

        {aba === 3 && (
          <Box>
            <BarraBuscaAba valor={buscasPorAba[3] || ""} onChange={(v) => setTermoAba(3, v)} placeholder="🔍 Buscar cidade..." />
            {Object.values(paises).length === 0 ? (
              <Typography sx={{ color: V3.paper, textAlign: "center", py: 4 }}>
                Nenhum país. Inicialize primeiro.
              </Typography>
            ) : (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.8 }}>
                {Object.values(paises).map((p) => {
                  const provs = Object.values(provincias).filter((pv) => pv.paisId === p.id);
                  const cidadesSemProv = Object.values(cidades).filter((c) => c.paisId === p.id && !c.provinciaId);
                  const provsFiltradas = provs.filter((pv) => {
                    const termo = termoAba(3) || buscaGlobal.toLowerCase().trim();
                    if (!termo) return true;
                    const cids = (pv.cidadesIds || []).map((id) => cidades[id]).filter(Boolean);
                    return (
                      String(pv.nome || "").toLowerCase().includes(termo) ||
                      cids.some((c) => String(c.nome || "").toLowerCase().includes(termo))
                    );
                  });
                  const cidadesSemProvFiltradas = cidadesSemProv.filter((c) => filtrar([c], ["nome", "id", "tipo"]).length > 0);
                  if (provsFiltradas.length === 0 && cidadesSemProvFiltradas.length === 0) return null;
                  return (
                    <Accordion
                      key={p.id}
                      defaultExpanded={!!termoAba(3) || !!buscaGlobal}
                      disableGutters
                      sx={{
                        bgcolor: V3.paperDark,
                        border: `1px solid ${V3.gold}44`,
                        "&:before": { display: "none" },
                        borderRadius: 1,
                        overflow: "hidden",
                      }}
                    >
                      <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: V3.ink }} />} sx={{ bgcolor: `${p.cor}22`, minHeight: 44 }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, width: "100%" }}>
                          <Box sx={{ width: 6, height: 24, bgcolor: p.cor || V3.gold, borderRadius: 1 }} />
                          <Typography sx={{ flex: 1, color: V3.ink, fontWeight: 900, fontFamily: "Georgia, serif", fontSize: "0.85rem" }}>
                            {p.nome}
                          </Typography>
                          <Chip label={`${Object.values(cidades).filter((c) => c.paisId === p.id).length} cidades`} size="small" sx={{ bgcolor: V3.ink, color: V3.gold, fontSize: "0.55rem", height: 18 }} />
                        </Box>
                      </AccordionSummary>
                      <AccordionDetails sx={{ p: 1 }}>
                        {provsFiltradas.map((pv) => {
                          const cids = (pv.cidadesIds || []).map((id) => cidades[id]).filter(Boolean);
                          const termo = termoAba(3) || buscaGlobal.toLowerCase().trim();
                          const cidsFiltradas = termo
                            ? cids.filter((c) => String(c.nome || "").toLowerCase().includes(termo))
                            : cids;
                          return (
                            <Box key={pv.id} sx={{ mb: 1.2 }}>
                              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 0.5, pl: 0.5 }}>
                                <AccountTreeIcon sx={{ color: V3.gold, fontSize: 14 }} />
                                <Typography variant="caption" sx={{ color: V3.ink, fontWeight: 900, letterSpacing: 0.5, fontSize: "0.65rem", flex: 1 }}>
                                  {pv.nome}
                                </Typography>
                                <Button size="small" onClick={() => setProvinciaAberta(pv)} sx={{ color: V3.ink, fontSize: "0.55rem", minWidth: 0, p: 0.3 }}>
                                  abrir
                                </Button>
                              </Box>
                              {cidsFiltradas.map((c) => (
                                <Paper
                                  key={c.id}
                                  onClick={() => setCidadeAberta(c)}
                                  sx={{
                                    p: 0.8,
                                    mb: 0.4,
                                    bgcolor: V3.paper,
                                    border: `1px solid ${V3.gold}22`,
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 0.8,
                                    cursor: "pointer",
                                    "&:hover": { borderColor: V3.gold, boxShadow: `0 0 10px ${V3.gold}44` },
                                  }}
                                >
                                  <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <Typography variant="body2" sx={{ color: V3.ink, fontWeight: 900, fontFamily: "Georgia, serif", fontSize: "0.75rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                      {c.nome}
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: V3.ink, opacity: 0.7, fontSize: "0.55rem" }}>
                                      {c.tipo}
                                    </Typography>
                                  </Box>
                                  <Chip label={`👥 ${((c.pop || 0) / 1000).toFixed(0)}k`} size="small" sx={{ bgcolor: V3.ink, color: V3.gold, fontSize: "0.5rem", height: 15 }} />
                                  <Chip label={`📈 ${c.prosperidade || 0}`} size="small" sx={{ bgcolor: V3.green, color: V3.paper, fontSize: "0.5rem", height: 15 }} />
                                  <Chip label={`🔥 ${c.radicalizacao || 0}`} size="small" sx={{ bgcolor: V3.red, color: V3.paper, fontSize: "0.5rem", height: 15 }} />
                                </Paper>
                              ))}
                              {cidsFiltradas.length === 0 && (
                                <Typography variant="caption" sx={{ color: V3.ink, opacity: 0.5, fontSize: "0.6rem", pl: 2.5 }}>
                                  Nenhuma cidade corresponde à busca.
                                </Typography>
                              )}
                            </Box>
                          );
                        })}
                        {cidadesSemProvFiltradas.length > 0 && (
                          <Box sx={{ mb: 1.2 }}>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 0.5, pl: 0.5 }}>
                              <Typography variant="caption" sx={{ color: V3.red, fontWeight: 900, letterSpacing: 0.5, fontSize: "0.65rem" }}>
                                ⚠️ Sem província
                              </Typography>
                            </Box>
                            {cidadesSemProvFiltradas.map((c) => (
                              <Paper
                                key={c.id}
                                onClick={() => setCidadeAberta(c)}
                                sx={{
                                  p: 0.8, mb: 0.4, bgcolor: V3.paper,
                                  border: `1px solid ${V3.red}44`,
                                  display: "flex", alignItems: "center", gap: 0.8, cursor: "pointer",
                                }}
                              >
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                  <Typography variant="body2" sx={{ color: V3.ink, fontWeight: 900, fontFamily: "Georgia, serif", fontSize: "0.75rem" }}>
                                    {c.nome}
                                  </Typography>
                                </Box>
                                <Chip label={`👥 ${((c.pop || 0) / 1000).toFixed(0)}k`} size="small" sx={{ bgcolor: V3.ink, color: V3.gold, fontSize: "0.5rem", height: 15 }} />
                              </Paper>
                            ))}
                          </Box>
                        )}
                      </AccordionDetails>
                    </Accordion>
                  );
                })}
              </Box>
            )}
          </Box>
        )}
        {aba === 4 && (() => {
          const idsValidos = new Set(COMMODITIES.map((c) => c.id));
          const todas = Object.values(commodities).filter((c) => idsValidos.has(c.id));
          const porCategoria = {};
          for (const c of todas) {
            const cat = c.categoria || "outros";
            if (!porCategoria[cat]) porCategoria[cat] = [];
            porCategoria[cat].push(c);
          }
          const categoriasOrdem = ["basico", "luxo", "industria", "militar"];
          return (
            <Box>
              <BarraBuscaAba valor={buscasPorAba[4] || ""} onChange={(v) => setTermoAba(4, v)} placeholder="🔍 Buscar commodity..." />
              {todas.length === 0 ? (
                <Typography sx={{ color: V3.paper, textAlign: "center", py: 4 }}>
                  Nenhuma commodity. Rode Resetar + Inicializar.
                </Typography>
              ) : (
                categoriasOrdem.map((catId) => {
                  const catInfo = CATEGORIAS_COMMODITY[catId] || { nome: catId, icone: "📦", cor: V3.gold };
                  const lista = (porCategoria[catId] || []).filter((c) => filtrar([c], ["nome", "id", "categoria"]).length > 0);
                  if (lista.length === 0) return null;
                  return (
                    <Box key={catId} sx={{ mb: 2 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1, p: 0.8, bgcolor: `${catInfo.cor}22`, borderLeft: `4px solid ${catInfo.cor}`, borderRadius: 1 }}>
                        <Typography sx={{ fontSize: "1.1rem" }}>{catInfo.icone}</Typography>
                        <Typography variant="caption" sx={{ color: V3.ink, fontWeight: 900, letterSpacing: 1.5, fontSize: "0.75rem", fontFamily: "Georgia, serif" }}>
                          {catInfo.nome.toUpperCase()}
                        </Typography>
                        <Box sx={{ flex: 1 }} />
                        <Chip label={`${lista.length}`} size="small" sx={{ bgcolor: catInfo.cor, color: "#fff", fontWeight: 800, fontSize: "0.55rem", height: 18 }} />
                      </Box>
                      <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 1 }}>
                        {lista.map((c) => {
                          const variacao = c.precoAtual && c.precoBase
                            ? ((c.precoAtual - c.precoBase) / c.precoBase) * 100
                            : 0;
                          return (
                            <Paper
                              key={c.id}
                              sx={{
                                p: 1,
                                bgcolor: V3.paperDark,
                                border: `1px solid ${catInfo.cor}44`,
                                display: "flex",
                                flexDirection: "column",
                                gap: 0.3,
                              }}
                            >
                              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                                <Typography sx={{ fontSize: "1.1rem" }}>{c.icone}</Typography>
                                <Typography variant="caption" sx={{ color: V3.ink, fontWeight: 900, fontFamily: "Georgia, serif" }}>
                                  {c.nome}
                                </Typography>
                              </Box>
                              <Typography variant="body2" sx={{ color: V3.ink, fontFamily: "Georgia, serif", fontWeight: 900 }}>
                                💰 {(c.precoAtual || c.precoBase).toFixed(2)}
                              </Typography>
                              <Typography
                                variant="caption"
                                sx={{ color: variacao >= 0 ? V3.green : V3.red, fontWeight: 800, fontSize: "0.55rem" }}
                              >
                                {variacao >= 0 ? "▲" : "▼"} {Math.abs(variacao).toFixed(1)}%
                              </Typography>
                            </Paper>
                          );
                        })}
                      </Box>
                    </Box>
                  );
                })
              )}
            </Box>
          );
        })()}
        {aba === 5 && (
          <Box>
            <BarraBuscaAba valor={buscasPorAba[5] || ""} onChange={(v) => setTermoAba(5, v)} placeholder="🔍 Buscar IG..." />
            {Object.values(igs).filter((i) => filtrar([i], ["nome", "id", "tipo", "paisOrigem"]).length > 0).length === 0 ? (
              <Typography sx={{ color: V3.paper, textAlign: "center", py: 4 }}>
                Nenhum IG.
              </Typography>
            ) : (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.6 }}>
                {Object.values(igs)
                  .filter((i) => filtrar([i], ["nome", "id", "tipo", "paisOrigem"]).length > 0)
                  .map((ig) => (
                  <Paper
                    key={ig.id}
                    sx={{
                      p: 1,
                      bgcolor: V3.paperDark,
                      border: `1px solid ${ig.cor || V3.gold}66`,
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                    }}
                  >
                    <Box
                      sx={{
                        width: 30, height: 30, borderRadius: "50%",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        bgcolor: `${ig.cor || V3.gold}33`,
                        border: `1px solid ${ig.cor || V3.gold}`,
                        fontSize: "1rem",
                      }}
                    >
                      {ig.icone}
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" sx={{ color: V3.ink, fontWeight: 900, fontFamily: "Georgia, serif" }}>
                        {ig.nome}
                      </Typography>
                      <Typography variant="caption" sx={{ color: V3.ink, opacity: 0.7, fontSize: "0.6rem" }}>
                        {paises[ig.paisOrigem]?.nome || "—"} • {ig.tipo}
                      </Typography>
                    </Box>
                    <Chip label={`Poder ${ig.poder}`} size="small" sx={{ bgcolor: V3.red, color: V3.paper, fontSize: "0.55rem", height: 16 }} />
                    <Chip label={`Humor ${ig.humor}`} size="small" sx={{ bgcolor: V3.green, color: V3.paper, fontSize: "0.55rem", height: 16 }} />
                  </Paper>
                ))}
              </Box>
            )}
          </Box>
        )}

        {aba === 6 && (
          <Box>
            <BarraBuscaAba valor={buscasPorAba[6] || ""} onChange={(v) => setTermoAba(6, v)} placeholder="🔍 Buscar país..." />
            {!paisAberto && (
              <Typography variant="caption" sx={{ color: V3.gold, fontWeight: 800, letterSpacing: 1, fontSize: "0.65rem", display: "block", mb: 1 }}>
                🏛️ CARGOS DO MUNDO
              </Typography>
            )}
            {Object.values(paises).length === 0 ? (
              <Typography sx={{ color: V3.paper, textAlign: "center", py: 4 }}>
                Nenhum país. Inicialize primeiro.
              </Typography>
            ) : (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.8 }}>
                {Object.values(paises)
                  .filter((p) => filtrar([p], ["nome", "id"]).length > 0)
                  .map((p) => {
                  const cargos = p.cargos || [];
                  const vagos = cargos.filter((c) => !c.holderEmail).length;
                  const ocupados = cargos.length - vagos;
                  return (
                    <Paper
                      key={p.id}
                      onClick={() => setCargosAbertos(p)}
                      sx={{
                        p: 1,
                        bgcolor: V3.paperDark,
                        border: `1px solid ${V3.gold}33`,
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        cursor: "pointer",
                        "&:hover": { borderColor: V3.gold },
                      }}
                    >
                      <Box sx={{ width: 6, height: 28, bgcolor: p.cor || V3.gold, borderRadius: 1 }} />
                      <Typography variant="body2" sx={{ flex: 1, color: V3.ink, fontWeight: 900, fontFamily: "Georgia, serif" }}>
                        {p.nome}
                      </Typography>
                      <Chip label={`${ocupados} ocupado(s)`} size="small" sx={{ bgcolor: V3.green, color: V3.paper, fontSize: "0.55rem", height: 16 }} />
                      <Chip label={`${vagos} vago(s)`} size="small" sx={{ bgcolor: V3.red, color: V3.paper, fontSize: "0.55rem", height: 16 }} />
                      <Chip label={`${cargos.length} total`} size="small" sx={{ bgcolor: V3.ink, color: V3.gold, fontSize: "0.55rem", height: 16 }} />
                    </Paper>
                  );
                })}
              </Box>
            )}
          </Box>
        )}

        {aba === 7 && (
          <Box>
            <Typography variant="caption" sx={{ color: V3.gold, fontWeight: 900, letterSpacing: 1, fontSize: "0.65rem", display: "block", mb: 1 }}>
              ⚡ EVENTOS RÁPIDOS (Modo A)
            </Typography>
            <Paper sx={{ p: 1.5, bgcolor: V3.paperDark, border: `1px solid ${V3.gold}66`, mb: 2 }}>
              <Typography variant="caption" sx={{ color: V3.ink, display: "block", mb: 1, fontSize: "0.65rem", fontStyle: "italic" }}>
                Clique para aplicar uma crise diretamente em uma cidade aleatória.
              </Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.8 }}>
                {CRISES_ESPONTANEAS.map((crise) => (
                  <Button
                    key={crise.id}
                    size="small"
                    onClick={async () => {
                      if (!isMaster) return;
                      const listaCidades = Object.values(cidades).filter((c) => c.pop > 0);
                      if (listaCidades.length === 0) return alert("Nenhuma cidade disponível.");
                      const cidadeAlvo = listaCidades[Math.floor(Math.random() * listaCidades.length)];
                      const paisAlvo = paises[cidadeAlvo.paisId];
                      const efeitos = crise.aplicar(cidadeAlvo, paisAlvo);

                      if (efeitos.cidade) {
                        const updCidade = {};
                        Object.entries(efeitos.cidade).forEach(([k, v]) => {
                          updCidade[k] = Math.max(0, Math.min(100, (cidadeAlvo[k] || 0) + v));
                        });
                        await setDoc(doc(db, "sim_cidades", cidadeAlvo.id), updCidade, { merge: true });
                      }
                      if (efeitos.commodities) {
                        for (const cmd of efeitos.commodities) {
                          if (commodities[cmd.id]) {
                            const atual = commodities[cmd.id];
                            await setDoc(doc(db, "sim_commodities", cmd.id), {
                              oferta: Math.max(1, (atual.oferta || 100) + (cmd.oferta || 0)),
                              demanda: Math.max(1, (atual.demanda || 100) + (cmd.demanda || 0)),
                            }, { merge: true });
                          }
                        }
                      }

                      await addDoc(collection(db, "sim_historico"), {
                        tipo: "crise_manual",
                        criseId: crise.id,
                        cidade: cidadeAlvo.id,
                        pais: cidadeAlvo.paisId,
                        noticia: crise.noticia(cidadeAlvo, paisAlvo),
                        criadoEm: new Date().toISOString(),
                        criadoPor: userEmail,
                      });
                      alert(`⚡ ${crise.nome} aplicada em ${cidadeAlvo.nome}!`);
                    }}
                    disabled={!isMaster}
                    sx={{
                      bgcolor: `${V3.red}22`,
                      color: V3.ink,
                      border: `1px solid ${V3.red}66`,
                      fontWeight: 800,
                      fontSize: "0.65rem",
                      "&:hover": { bgcolor: `${V3.red}44` },
                    }}
                  >
                    {crise.icone} {crise.nome}
                  </Button>
                ))}
              </Box>
            </Paper>

            <IASimulador
              paises={paises}
              cidades={cidades}
              commodities={commodities}
              igs={igs}
            />
          </Box>
        )}

        {aba === 8 && (
          <Box>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5, flexWrap: "wrap", gap: 1 }}>
              <Typography variant="caption" sx={{ color: V3.gold, fontWeight: 900, letterSpacing: 1, fontSize: "0.7rem" }}>
                🤝 NEGOCIAÇÕES ({Object.keys(negociacoes).length})
              </Typography>
              <Button
                size="small"
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => {
                  setFormNegociacao({
                    tipo: "concessao",
                    destinoId: "",
                    destinoNivel: "pais",
                    titulo: "",
                    descricao: "",
                    ofertaDinheiro: 0,
                    ofertaCommodityId: "",
                    ofertaCommodityQtd: 0,
                    ofertaPoderIGId: "",
                    ofertaPoderIGValor: 0,
                    pedidoDinheiro: 0,
                    pedidoCommodityId: "",
                    pedidoCommodityQtd: 0,
                    pedidoPoderIGId: "",
                    pedidoPoderIGValor: 0,
                  });
                  setOrigemNeg({ nivel: "pais", id: "" });
                  setModalNegociacaoOpen(true);
                }}
                sx={{ bgcolor: V3.gold, color: V3.ink, fontWeight: 900, fontFamily: "Georgia, serif", "&:hover": { bgcolor: V3.goldLight } }}
              >
                Nova Proposta
              </Button>
            </Box>

            {(() => {
              const lista = Object.values(negociacoes);
              const recebidas = lista.filter((n) => {
                const alvo = n.para;
                if (!alvo) return false;
                if (alvo.nivel === "pais") {
                  const p = paises[alvo.id];
                  return p?.cargos?.some((c) => c.holderEmail === userEmail);
                }
                if (alvo.nivel === "provincia") {
                  const p = provincias[alvo.id];
                  return p?.cargos?.some((c) => c.holderEmail === userEmail);
                }
                if (alvo.nivel === "cidade") {
                  const c = cidades[alvo.id];
                  return c?.cargosLocais?.some((cg) => cg.holderEmail === userEmail);
                }
                return false;
              });

              if (lista.length === 0) {
                return (
                  <Paper sx={{ p: 3, textAlign: "center", bgcolor: V3.paperDark, border: `1px dashed ${V3.gold}44`, borderRadius: 1 }}>
                    <Typography sx={{ color: V3.ink, opacity: 0.6 }}>
                      Nenhuma negociação em andamento. Crie uma proposta.
                    </Typography>
                  </Paper>
                );
              }

              return (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  {lista.map((n) => {
                    const tipo = TIPOS_NEGOCIACAO.find((t) => t.id === n.tipo) || TIPOS_NEGOCIACAO[0];
                    const ehRecebida = recebidas.some((r) => r.id === n.id);
                    const ehEnviada = n.de?.holderEmail === userEmail;
                    const podeResponder = isMaster || ehRecebida;

                    return (
                      <Paper
                        key={n.id}
                        sx={{
                          p: 1.5,
                          bgcolor: V3.paperDark,
                          border: `1px solid ${
                            n.status === "aceita" ? V3.green :
                            n.status === "recusada" ? V3.red :
                            n.status === "expirada" ? "#999" :
                            tipo.cor
                          }66`,
                          borderRadius: 1,
                        }}
                      >
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1, flexWrap: "wrap" }}>
                          <Typography sx={{ fontSize: "1.2rem" }}>{tipo.icone}</Typography>
                          <Typography variant="body2" sx={{ color: V3.ink, fontWeight: 900, fontFamily: "Georgia, serif", flex: 1, minWidth: 0 }}>
                            {n.titulo || tipo.nome}
                          </Typography>
                          {n.respondidoPor === "IA" && (
                            <Chip label="🤖 IA" size="small" sx={{ bgcolor: "#a855f7", color: "#fff", fontWeight: 800, fontSize: "0.5rem", height: 16 }} />
                          )}
                          {n.contrapropostaDe && (
                            <Chip label="↩️ Contraproposta" size="small" sx={{ bgcolor: "#5a6b7a", color: "#fff", fontWeight: 800, fontSize: "0.5rem", height: 16 }} />
                          )}
                          <Chip
                            label={
                              n.status === "pendente" ? "⏳ Pendente" :
                              n.status === "aceita" ? "✓ Aceita" :
                              n.status === "recusada" ? "✗ Recusada" :
                              "⌛ Expirada"
                            }
                            size="small"
                            sx={{
                              bgcolor:
                                n.status === "aceita" ? V3.green :
                                n.status === "recusada" ? V3.red :
                                n.status === "expirada" ? "#999" :
                                tipo.cor,
                              color: "#fff",
                              fontWeight: 800,
                              fontSize: "0.55rem",
                              height: 18,
                            }}
                          />
                        </Box>
                        <Typography variant="caption" sx={{ color: V3.ink, opacity: 0.8, display: "block", mb: 0.5, fontSize: "0.65rem" }}>
                          <strong>De:</strong> {n.de?.nome || "—"} ({n.de?.nivel}) → <strong>Para:</strong> {n.para?.nome || "—"} ({n.para?.nivel})
                        </Typography>
                        {n.descricao && (
                          <Typography variant="caption" sx={{ color: V3.ink, opacity: 0.7, display: "block", mb: 0.5, fontSize: "0.6rem", fontStyle: "italic" }}>
                            "{n.descricao}"
                          </Typography>
                        )}
                        {n.respondidoPor === "IA" && n.iaJustificativa && (
                          <Paper sx={{ p: 0.8, mb: 0.5, bgcolor: "#a855f715", border: `1px dashed #a855f7`, borderRadius: 1 }}>
                            <Typography variant="caption" sx={{ color: "#a855f7", fontWeight: 800, fontSize: "0.55rem", display: "block", letterSpacing: 1 }}>
                              🤖 DECISÃO DA IA
                            </Typography>
                            <Typography variant="caption" sx={{ color: V3.ink, fontSize: "0.6rem", fontStyle: "italic" }}>
                              "{n.iaJustificativa}"
                            </Typography>
                          </Paper>
                        )}
                        {n.status === "pendente" && (
                          <Box sx={{ display: "flex", gap: 0.5, alignItems: "center", mt: 1 }}>
                            <Chip label={`🎲 ${n.chanceSucesso}%`} size="small" sx={{ bgcolor: V3.gold, color: V3.ink, fontWeight: 800, fontSize: "0.55rem", height: 18 }} />
                            {podeResponder && (
                              <>
                                <Button
                                  size="small"
                                  onClick={async () => {
                                    const r = Math.random() * 100;
                                    const aceita = r < n.chanceSucesso;
                                    const novoStatus = aceita ? "aceita" : "recusada";
                                    await setDoc(doc(db, "sim_negociacoes", n.id), {
                                      status: novoStatus,
                                      respondidoEm: new Date().toISOString(),
                                      respondidoPor: userEmail,
                                      resultadoRolagem: Math.round(r),
                                    }, { merge: true });

                                    if (aceita) {
                                      const erros = await aplicarEfeitosNegociacao(n, { paises, cidades, commodities, igs, provincias });
                                      if (erros.length > 0) {
                                        alert("⚠️ Efeitos aplicados com avisos:\n\n" + erros.join("\n"));
                                      }
                                    }
                                  }}
                                  sx={{ bgcolor: V3.green, color: "#fff", fontWeight: 800, fontSize: "0.65rem" }}
                                >
                                  Responder
                                </Button>
                              </>
                            )}
                            {ehEnviada && (
                              <Button
                                size="small"
                                onClick={async () => {
                                  if (!window.confirm("Cancelar proposta?")) return;
                                  await deleteDoc(doc(db, "sim_negociacoes", n.id));
                                }}
                                sx={{ color: V3.red, fontSize: "0.65rem", ml: "auto" }}
                              >
                                Cancelar
                              </Button>
                            )}
                          </Box>
                        )}
                      </Paper>
                    );
                  })}
                </Box>
              );
            })()}
          </Box>
        )}

        {aba === 9 && (
          <Box>
            <Typography variant="caption" sx={{ color: V3.gold, fontWeight: 800, letterSpacing: 1, fontSize: "0.65rem" }}>
              CONTROLE GLOBAL
            </Typography>
            <Paper sx={{ p: 1.5, mt: 1, bgcolor: V3.paperDark, border: `1px solid ${V3.gold}66` }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={!!config.congelarTudo}
                    onChange={(e) => atualizarConfig({ congelarTudo: e.target.checked })}
                    disabled={!isMaster}
                    sx={{ color: V3.blue, "&.Mui-checked": { color: V3.blue } }}
                  />
                }
                label={<Typography sx={{ color: V3.ink, fontWeight: 800, fontFamily: "Georgia, serif" }}>❄️ Congelar TUDO (para tudo por completo)</Typography>}
              />
              <Divider sx={{ borderColor: `${V3.gold}44`, my: 1 }} />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={!!config.permitirCrises}
                    onChange={(e) => atualizarConfig({ permitirCrises: e.target.checked })}
                    disabled={!isMaster}
                    sx={{ color: V3.red, "&.Mui-checked": { color: V3.red } }}
                  />
                }
                label={<Typography sx={{ color: V3.ink, fontWeight: 800, fontFamily: "Georgia, serif" }}>💥 Permitir crises espontâneas</Typography>}
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={!!config.iaNarradorAtiva}
                    onChange={(e) => atualizarConfig({ iaNarradorAtiva: e.target.checked })}
                    disabled={!isMaster}
                    sx={{ color: V3.gold, "&.Mui-checked": { color: V3.gold } }}
                  />
                }
                label={<Typography sx={{ color: V3.ink, fontWeight: 800, fontFamily: "Georgia, serif" }}>🤖 IA Narrador ativa</Typography>}
              />
              <Box sx={{ mt: 1.5, mb: 0.5 }}>
                <Typography variant="caption" sx={{ color: V3.ink, fontWeight: 900, letterSpacing: 1, fontSize: "0.65rem", display: "block", mb: 0.5 }}>
                  ⚙️ INTERVALO DO TICK AUTOMÁTICO
                </Typography>
                <FormControl size="small" fullWidth>
                  <Select
                    value={config.tickIntervalo !== undefined ? Number(config.tickIntervalo) : 60}
                    onChange={(e) => atualizarConfig({ tickIntervalo: Number(e.target.value) })}
                    disabled={!isMaster}
                    sx={{ bgcolor: V3.paper, color: V3.ink, fontSize: "0.8rem", fontWeight: 800 }}
                    MenuProps={{ PaperProps: { sx: { bgcolor: V3.paper } } }}
                  >
                    <MenuItem value={0} sx={{ fontSize: "0.8rem", color: V3.red, fontWeight: 800 }}>🚫 DESATIVADO</MenuItem>
                    <MenuItem value={10} sx={{ fontSize: "0.8rem", color: V3.ink }}>10 Minutos</MenuItem>
                    <MenuItem value={30} sx={{ fontSize: "0.8rem", color: V3.ink }}>30 Minutos</MenuItem>
                    <MenuItem value={60} sx={{ fontSize: "0.8rem", color: V3.ink }}>60 Minutos</MenuItem>
                    <MenuItem value={120} sx={{ fontSize: "0.8rem", color: V3.ink }}>120 Minutos</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </Paper>

            <Typography variant="caption" sx={{ color: V3.gold, fontWeight: 800, letterSpacing: 1, fontSize: "0.65rem", mt: 2, display: "block" }}>
              CONGELAMENTO INDIVIDUAL
            </Typography>
            <Paper sx={{ p: 1.5, mt: 1, bgcolor: V3.paperDark, border: `1px solid ${V3.gold}44` }}>
              {["pops", "igs", "commodities", "leis", "cidades"].map((k) => (
                <FormControlLabel
                  key={k}
                  control={
                    <Checkbox
                      checked={!!config.congelamentos?.[k]}
                      onChange={() => alternarCongelamento(k)}
                      disabled={!isMaster}
                      sx={{ color: V3.blue, "&.Mui-checked": { color: V3.blue } }}
                    />
                  }
                  label={<Typography sx={{ color: V3.ink, fontWeight: 700, fontFamily: "Georgia, serif", fontSize: "0.8rem" }}>{k}</Typography>}
                />
              ))}
            </Paper>

            <Box sx={{ mt: 3, p: 1.5, bgcolor: V3.bg2, border: `1px dashed ${V3.gold}44`, borderRadius: 1 }}>
              <Typography variant="caption" sx={{ color: V3.goldLight, display: "block", fontSize: "0.65rem", fontWeight: 800, letterSpacing: 1 }}>
                ⏱️ STATUS DO MOTOR
              </Typography>
              {config.ultimoTick ? (
                <Typography variant="caption" sx={{ color: V3.goldLight, display: "block", fontSize: "0.65rem", mt: 0.5 }}>
                  Último tick: {new Date(config.ultimoTick).toLocaleString("pt-BR")}
                </Typography>
              ) : (
                <Typography variant="caption" sx={{ color: V3.goldLight, display: "block", fontSize: "0.65rem", mt: 0.5 }}>
                  Aguardando primeiro tick...
                </Typography>
              )}
              {config.ultimoTick && (() => {
                const intervaloMin = config.tickIntervalo !== undefined ? Number(config.tickIntervalo) : 60;
                if (intervaloMin <= 0) {
                  return (
                    <Typography variant="caption" sx={{ color: V3.red, display: "block", fontSize: "0.6rem", fontWeight: 800 }}>
                      🚫 Tick automático DESATIVADO
                    </Typography>
                  );
                }
                const tickMs = intervaloMin * 60 * 1000;
                const restante = Math.max(0, Math.ceil((tickMs - (Date.now() - new Date(config.ultimoTick).getTime())) / 60000));
                return (
                  <Typography variant="caption" sx={{ color: V3.goldLight, display: "block", fontSize: "0.6rem" }}>
                    Próximo em ~{restante} min (a cada {intervaloMin}min)
                  </Typography>
                );
              })()}
              {config.tickEmAndamento && (
                <Typography variant="caption" sx={{ color: V3.gold, display: "block", fontSize: "0.65rem", fontWeight: 800, mt: 0.5 }}>
                  🔄 Tick em andamento...
                </Typography>
              )}
              <Typography variant="caption" sx={{ color: `${V3.goldLight}88`, display: "block", fontSize: "0.55rem", mt: 1, fontStyle: "italic" }}>
                Roda no cliente mais antigo online. Se ninguém estiver logado, congela sozinho.
              </Typography>
              {isMaster && config.initialized && (
                <Button
                  size="small"
                  onClick={async () => {
                    const intervaloMin = config.tickIntervalo !== undefined ? Number(config.tickIntervalo) : 60;
                    const baseMs = (intervaloMin > 0 ? intervaloMin : 60) * 60 * 1000;
                    const voltarMs = baseMs + 60 * 1000;
                    await setDoc(doc(db, "sim_config", "mundo"), {
                      ultimoTick: new Date(Date.now() - voltarMs).toISOString(),
                      tickEmAndamento: false,
                      tickIniciadoEm: null,
                      forcarTick: true,
                    }, { merge: true });
                    alert("⏱️ O motor vai rodar em até 60s, mesmo se estiver desativado.");
                  }}
                  sx={{
                    mt: 1.5,
                    bgcolor: V3.gold,
                    color: V3.ink,
                    fontWeight: 900,
                    fontFamily: "Georgia, serif",
                    "&:hover": { bgcolor: V3.goldLight },
                  }}
                >
                  ⏱️ Forçar tick agora
                </Button>
              )}
              {isMaster && config.initialized && (
                <Button
                  size="small"
                  onClick={migrarProvincias}
                  sx={{
                    mt: 1.5,
                    ml: 1,
                    bgcolor: V3.blue,
                    color: V3.paper,
                    fontWeight: 900,
                    fontFamily: "Georgia, serif",
                    "&:hover": { bgcolor: "#3a4b5a" },
                  }}
                >
                  🏛️ Migrar Províncias
                </Button>
              )}
            </Box>
          </Box>
        )}

        {aba === 10 && (
          <Box>
            <TextField
              fullWidth
              size="small"
              placeholder="🔍 Buscar empresa..."
              value={buscaEmpresa}
              onChange={(e) => setBuscaEmpresa(e.target.value)}
              sx={{
                mb: 1.5,
                "& .MuiInputBase-root": {
                  color: V3.paper,
                  bgcolor: `${V3.gold}15`,
                  fontSize: "0.75rem",
                  height: 36,
                },
                "& .MuiOutlinedInput-notchedOutline": { borderColor: `${V3.gold}44` },
                "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: V3.gold },
                "& .MuiInputBase-input::placeholder": { color: `${V3.paper}88` },
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: V3.gold, fontSize: 16 }} />
                  </InputAdornment>
                ),
              }}
            />

            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5, flexWrap: "wrap", gap: 1 }}>
              <Typography variant="caption" sx={{ color: V3.gold, fontWeight: 900, letterSpacing: 1, fontSize: "0.7rem" }}>
                🏢 EMPRESAS ({Object.keys(empresas).length})
              </Typography>
              {isMaster && (
                <Button
                  size="small"
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => { setEmpresaEditando(null); setModalEmpresaOpen(true); }}
                  sx={{ bgcolor: V3.gold, color: V3.ink, fontWeight: 900, fontFamily: "Georgia, serif", "&:hover": { bgcolor: V3.goldLight } }}
                >
                  Nova Empresa
                </Button>
              )}
            </Box>

            {(() => {
              const termo = buscaEmpresa.toLowerCase().trim();
              const lista = Object.values(empresas).filter((e) => {
                if (!termo) return true;
                return String(e.nome || "").toLowerCase().includes(termo) ||
                       String(e.descricao || "").toLowerCase().includes(termo) ||
                       String(e.origem?.nome || "").toLowerCase().includes(termo);
              });
              if (lista.length === 0) {
                return (
                  <Paper sx={{ p: 3, textAlign: "center", bgcolor: V3.paperDark, border: `1px dashed ${V3.gold}44`, borderRadius: 1 }}>
                    <Typography sx={{ color: V3.ink, opacity: 0.6 }}>
                      {termo ? "Nenhuma empresa corresponde à busca." : "Nenhuma empresa. Crie a primeira."}
                    </Typography>
                  </Paper>
                );
              }
              return (
                <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
                  {lista.map((emp) => (
                    <Paper
                      key={emp.id}
                      sx={{
                        p: 1.5,
                        bgcolor: V3.paperDark,
                        border: `1px solid ${V3.gold}66`,
                        cursor: "pointer",
                        transition: "all 0.2s",
                        "&:hover": { borderColor: V3.goldLight, boxShadow: `0 0 20px ${V3.gold}44` },
                      }}
                      onClick={() => setEmpresaAberta(emp)}
                    >
                      {emp.imagemUrl && (
                        <Box
                          component="img"
                          src={emp.imagemUrl}
                          sx={{ width: "100%", height: 100, objectFit: "cover", borderRadius: 1, mb: 1, border: `1px solid ${V3.gold}44` }}
                        />
                      )}
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <Typography variant="subtitle2" sx={{ color: V3.ink, fontWeight: 900, fontFamily: "Georgia, serif" }}>
                          {emp.nome}
                        </Typography>
                        {emp.tipo && (
                          <Chip label={emp.tipo} size="small" sx={{ bgcolor: V3.ink, color: V3.gold, fontSize: "0.55rem", height: 18 }} />
                        )}
                      </Box>
                      {emp.descricao && (
                        <Typography variant="caption" sx={{ color: V3.ink, opacity: 0.75, display: "block", mt: 0.5, fontSize: "0.65rem" }}>
                          {emp.descricao.slice(0, 100)}{emp.descricao.length > 100 ? "..." : ""}
                        </Typography>
                      )}
                      <Box sx={{ display: "flex", gap: 0.5, mt: 1, flexWrap: "wrap" }}>
                        {emp.origem?.nome && (
                          <Chip label={`📍 ${emp.origem.nome}`} size="small" sx={{ bgcolor: V3.blue, color: V3.paper, fontSize: "0.55rem", height: 16 }} />
                        )}
                        {emp.valor > 0 && (
                          <Chip label={`💰 ${Number(emp.valor).toLocaleString("pt-BR")}`} size="small" sx={{ bgcolor: V3.green, color: V3.paper, fontSize: "0.55rem", height: 16 }} />
                        )}
                      </Box>
                    </Paper>
                  ))}
                </Box>
              );
            })()}
          </Box>
        )}
      </Box>

      {!minimizado && (
        <Box
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
          sx={{
            position: "absolute",
            bottom: 0,
            right: 0,
            width: 18,
            height: 18,
            cursor: "nwse-resize",
            zIndex: 20,
            "&::after": {
              content: '""',
              position: "absolute",
              right: 3,
              bottom: 3,
              width: 8,
              height: 8,
              borderRight: `2px solid ${V3.gold}`,
              borderBottom: `2px solid ${V3.gold}`,
            },
          }}
        />
      )}
      <FloatingDialog
        open={modalEmpresaOpen}
        onClose={() => { setModalEmpresaOpen(false); setEmpresaEditando(null); }}
        id="sim_empresa_form"
        titulo={empresaEditando ? `✏️ Editar ${empresaEditando.nome}` : "🏢 Nova Empresa"}
        subtitulo={empresaEditando ? "Altere os campos e salve" : "Preencha os dados da empresa"}
        cor={V3.gold}
        larguraInicial={680}
        alturaInicial={700}
      >
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          <TextField
            label="Nome *"
            size="small"
            fullWidth
            value={formEmpresa.nome}
            onChange={(e) => setFormEmpresa((p) => ({ ...p, nome: e.target.value }))}
            sx={{ bgcolor: V3.paper }}
            InputProps={{ sx: { color: V3.ink, fontSize: "0.85rem" } }}
            InputLabelProps={{ sx: { color: V3.ink, fontSize: "0.8rem" } }}
          />

          <TextField
            label="Descrição"
            size="small"
            fullWidth
            multiline
            rows={3}
            value={formEmpresa.descricao}
            onChange={(e) => setFormEmpresa((p) => ({ ...p, descricao: e.target.value }))}
            sx={{ bgcolor: V3.paper }}
            InputProps={{ sx: { color: V3.ink, fontSize: "0.8rem" } }}
            InputLabelProps={{ sx: { color: V3.ink, fontSize: "0.8rem" } }}
          />

          <Typography variant="caption" sx={{ color: V3.gold, fontWeight: 900, letterSpacing: 1, fontSize: "0.65rem" }}>
            🖼️ IMAGEM
          </Typography>
          <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
            <Button
              component="label"
              size="small"
              variant="outlined"
              disabled={uploadandoImg}
              sx={{ color: V3.gold, borderColor: V3.gold, fontWeight: 800, fontSize: "0.7rem" }}
            >
              {uploadandoImg ? "⏳ Enviando..." : "📤 Upload"}
              <input
                hidden
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setUploadandoImg(true);
                  try {
                    const fd = new FormData();
                    fd.append("file", file);
                    const base = window.location.hostname === "localhost" ? "http://localhost:5000" : "https://reqviem.onrender.com";
                    const resp = await fetch(`${base}/upload`, { method: "POST", body: fd });
                    const data = await resp.json();
                    if (data?.url) {
                      setFormEmpresa((p) => ({ ...p, imagemUrl: data.url }));
                    } else {
                      alert("Falha no upload. Detalhes: " + (data?.message || "sem resposta"));
                    }
                  } catch (err) {
                    alert("Erro no upload: " + err.message);
                  } finally {
                    setUploadandoImg(false);
                  }
                }}
              />
            </Button>
            {formEmpresa.imagemUrl && (
              <Button
                size="small"
                onClick={() => setFormEmpresa((p) => ({ ...p, imagemUrl: "" }))}
                sx={{ color: V3.red, fontWeight: 800, fontSize: "0.7rem" }}
              >
                🗑️ Remover imagem
              </Button>
            )}
          </Box>
          {formEmpresa.imagemUrl && (
            <Box
              component="img"
              src={formEmpresa.imagemUrl}
              onClick={() => setLightboxSrc(formEmpresa.imagemUrl)}
              onError={(e) => { e.target.style.display = "none"; }}
              sx={{ width: 120, height: 120, objectFit: "cover", borderRadius: 1, border: `2px solid ${V3.gold}66`, cursor: "zoom-in", alignSelf: "flex-start" }}
            />
          )}

          <Box sx={{ display: "flex", gap: 1 }}>
            <FormControl size="small" sx={{ flex: 1 }}>
              <InputLabel sx={{ color: V3.ink, fontSize: "0.8rem" }}>Tipo</InputLabel>
              <Select
                value={formEmpresa.tipo}
                onChange={(e) => setFormEmpresa((p) => ({ ...p, tipo: e.target.value }))}
                label="Tipo"
                sx={{ bgcolor: V3.paper, color: V3.ink, fontSize: "0.8rem" }}
                MenuProps={{ PaperProps: { sx: { bgcolor: V3.paper } } }}
              >
                <MenuItem value="local" sx={{ fontSize: "0.8rem", color: V3.ink }}>🏪 Local (bairro)</MenuItem>
                <MenuItem value="regional" sx={{ fontSize: "0.8rem", color: V3.ink }}>🏬 Regional</MenuItem>
                <MenuItem value="nacional" sx={{ fontSize: "0.8rem", color: V3.ink }}>🏛️ Nacional</MenuItem>
                <MenuItem value="multinacional" sx={{ fontSize: "0.8rem", color: V3.ink }}>🌍 Multinacional</MenuItem>
              </Select>
            </FormControl>
          </Box>

          <Typography variant="caption" sx={{ color: V3.gold, fontWeight: 900, letterSpacing: 1, fontSize: "0.65rem" }}>
            💰 VÍNCULO COM A BOLSA
          </Typography>
          <Typography variant="caption" sx={{ color: V3.ink, opacity: 0.6, fontSize: "0.55rem", fontStyle: "italic", display: "block", mt: -1 }}>
            Escolha uma empresa da Bolsa de Valores para puxar valor e preço. Ou deixe sem vínculo.
          </Typography>
          <FormControl size="small" fullWidth>
            <Select
              value={formEmpresa.bolsaEmpresaId || ""}
              onChange={(e) => {
                const bolsaId = e.target.value;
                if (!bolsaId) {
                  setFormEmpresa((p) => ({ ...p, bolsaEmpresaId: "", valor: 0 }));
                  return;
                }
                const b = bolsaEmpresas.find((x) => x.id === bolsaId);
                setFormEmpresa((p) => ({
                  ...p,
                  bolsaEmpresaId: bolsaId,
                  valor: b?.valorEmpresa || b?.valor || 0,
                  nome: p.nome || b?.nome || "",
                  descricao: p.descricao || b?.descricao || "",
                  imagemUrl: p.imagemUrl || b?.imagem || "",
                }));
              }}
              displayEmpty
              sx={{ bgcolor: V3.paper, color: V3.ink, fontSize: "0.8rem" }}
              MenuProps={{ PaperProps: { sx: { bgcolor: V3.paper, maxHeight: 300 } } }}
            >
              <MenuItem value="" sx={{ fontSize: "0.8rem", color: V3.red }}>— Sem vínculo —</MenuItem>
              {bolsaEmpresas.map((b) => (
                <MenuItem key={b.id} value={b.id} sx={{ fontSize: "0.8rem", color: V3.ink }}>
                  {b.logo || "🏢"} {b.nome} ({b.sigla}) — 💰 {Number(b.valorEmpresa || 0).toLocaleString("pt-BR")}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="Valor (💰) — editável"
            type="number"
            size="small"
            fullWidth
            value={formEmpresa.valor}
            onChange={(e) => setFormEmpresa((p) => ({ ...p, valor: Number(e.target.value) || 0 }))}
            sx={{ bgcolor: V3.paper }}
            InputProps={{ sx: { color: V3.ink, fontSize: "0.8rem" } }}
            InputLabelProps={{ sx: { color: V3.ink, fontSize: "0.8rem" } }}
            helperText={formEmpresa.bolsaEmpresaId ? "Puxado da Bolsa (você pode sobrescrever)" : "Sem vínculo — digite um valor livre"}
            FormHelperTextProps={{ sx: { color: V3.ink, opacity: 0.55, fontSize: "0.55rem" } }}
          />

          <Divider sx={{ borderColor: `${V3.gold}44` }} />

          <Typography variant="caption" sx={{ color: V3.gold, fontWeight: 900, letterSpacing: 1, fontSize: "0.65rem" }}>
            🏷️ RAMOS DA EMPRESA (opcional, múltiplos)
          </Typography>
          <Typography variant="caption" sx={{ color: V3.ink, opacity: 0.6, fontSize: "0.55rem", fontStyle: "italic", display: "block", mt: -0.8 }}>
            Cada ramo soma imposto extra ao tributo base. Ramos desbloqueiam pesquisas e edifícios específicos.
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
            {CATEGORIAS_EMPRESA.map((cat) => {
              const ativo = (formEmpresa.categorias || []).includes(cat.id);
              return (
                <Button
                  key={cat.id}
                  size="small"
                  onClick={() =>
                    setFormEmpresa((p) => {
                      const atual = p.categorias || [];
                      return {
                        ...p,
                        categorias: ativo
                          ? atual.filter((x) => x !== cat.id)
                          : [...atual, cat.id],
                      };
                    })
                  }
                  sx={{
                    bgcolor: ativo ? cat.cor : `${cat.cor}22`,
                    color: ativo ? "#fff" : V3.ink,
                    border: `1px solid ${cat.cor}`,
                    fontWeight: 800,
                    fontSize: "0.6rem",
                    py: 0.3,
                    px: 0.8,
                    textTransform: "none",
                    "&:hover": { bgcolor: `${cat.cor}44` },
                  }}
                >
                  {cat.icone} {cat.nome}
                </Button>
              );
            })}
          </Box>
          {(formEmpresa.categorias || []).length > 0 && (
            <Paper sx={{ p: 1, bgcolor: `${V3.red}15`, border: `1px dashed ${V3.red}66`, borderRadius: 1 }}>
              <Typography variant="caption" sx={{ color: V3.red, fontWeight: 800, fontSize: "0.55rem", display: "block" }}>
                💸 Imposto extra acumulado: +{(tributoExtraCategorias(formEmpresa.categorias) * 100).toFixed(1)}% sobre faturamento por ciclo.
              </Typography>
              <Typography variant="caption" sx={{ color: V3.ink, opacity: 0.65, fontSize: "0.5rem", display: "block", fontStyle: "italic" }}>
                Soma ao tributo base da empresa (definido pela categoria $/$$/$$$, na aba Config).
              </Typography>
            </Paper>
          )}

          <Divider sx={{ borderColor: `${V3.gold}44` }} />

          <Typography variant="caption" sx={{ color: V3.gold, fontWeight: 900, letterSpacing: 1, fontSize: "0.65rem" }}>
            📍 ORIGEM (cidade / cidade-estado)
          </Typography>
          <Typography variant="caption" sx={{ color: V3.ink, opacity: 0.6, fontSize: "0.55rem", fontStyle: "italic", display: "block", mt: -1 }}>
            A empresa nasce em uma cidade. Cidades agrupadas por país.
          </Typography>
          <FormControl size="small" fullWidth>
            <Select
              value={formEmpresa.origemId || ""}
              onChange={(e) => {
                const id = e.target.value;
                setFormEmpresa((p) => {
                  if (!id) return { ...p, origemId: "", origemNivel: "cidade" };
                  const c = cidades[id];
                  if (!c) return p;
                  const origemAntigaId = p.origemId;
                  const sedesLimpa = p.sedes.filter(
                    (s) => s.id !== origemAntigaId && s.id !== c.id
                  );
                  const novasSedes = [{ nivel: "cidade", id: c.id, nome: c.nome }, ...sedesLimpa];
                  return { ...p, origemNivel: "cidade", origemId: id, sedes: novasSedes };
                });
              }}
              displayEmpty
              sx={{ bgcolor: V3.paper, color: V3.ink, fontSize: "0.8rem" }}
              MenuProps={{ PaperProps: { sx: { bgcolor: V3.paper, maxHeight: 400 } } }}
            >
              <MenuItem value="" sx={{ fontSize: "0.8rem", color: V3.red }}>— Selecione a cidade de origem —</MenuItem>
              {Object.values(paises).flatMap((p) => {
                const cidadesDoPais = Object.values(cidades).filter((c) => c.paisId === p.id);
                if (cidadesDoPais.length === 0) return [];
                return [
                  <MenuItem key={`hdr_origem_${p.id}`} disabled sx={{ fontSize: "0.65rem", color: V3.gold, fontWeight: 900, letterSpacing: 1, opacity: 1, borderTop: `1px solid ${V3.gold}44`, mt: 0.3 }}>
                    {p.cor && <Box component="span" sx={{ display: "inline-block", width: 8, height: 8, bgcolor: p.cor, borderRadius: 0.5, mr: 0.7 }} />}
                    {p.nome.toUpperCase()}
                  </MenuItem>,
                  ...cidadesDoPais.map((c) => (
                    <MenuItem key={c.id} value={c.id} sx={{ pl: 3.5, fontSize: "0.75rem", color: V3.ink }}>
                      🏙️ {c.nome} <Typography component="span" sx={{ ml: 0.5, fontSize: "0.6rem", color: V3.ink, opacity: 0.5 }}>({c.tipo || "—"})</Typography>
                    </MenuItem>
                  )),
                ];
              })}
            </Select>
          </FormControl>

          <Typography variant="caption" sx={{ color: V3.gold, fontWeight: 900, letterSpacing: 1, fontSize: "0.65rem" }}>
            🏛️ SEDES (mínimo 1, várias cidades)
          </Typography>
          {formEmpresa.sedes.length > 0 && (
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
              {formEmpresa.sedes.map((s, idx) => (
                <Chip
                  key={`${s.id}-${idx}`}
                  label={`🏙️ ${s.nome}`}
                  size="small"
                  onDelete={() => setFormEmpresa((p) => ({ ...p, sedes: p.sedes.filter((_, i) => i !== idx) }))}
                  sx={{ bgcolor: V3.blue, color: V3.paper, fontSize: "0.6rem", fontWeight: 700 }}
                />
              ))}
            </Box>
          )}
          <FormControl size="small" fullWidth>
            <Select
              value=""
              onChange={(e) => {
                const id = e.target.value;
                if (!id) return;
                const c = cidades[id];
                if (!c) return;
                if (formEmpresa.sedes.some((s) => s.id === id)) return;
                setFormEmpresa((p) => ({ ...p, sedes: [...p.sedes, { nivel: "cidade", id, nome: c.nome }] }));
              }}
              displayEmpty
              sx={{ bgcolor: V3.paper, color: V3.ink, fontSize: "0.75rem" }}
              MenuProps={{ PaperProps: { sx: { bgcolor: V3.paper, maxHeight: 400 } } }}
            >
              <MenuItem value="" sx={{ fontSize: "0.75rem", color: V3.blue, fontWeight: 800 }}>+ Adicionar sede (cidade)...</MenuItem>
              {Object.values(paises).flatMap((p) => {
                const cidadesDoPais = Object.values(cidades).filter((c) => c.paisId === p.id && !formEmpresa.sedes.some((s) => s.id === c.id));
                if (cidadesDoPais.length === 0) return [];
                return [
                  <MenuItem key={`hdr_sede_${p.id}`} disabled sx={{ fontSize: "0.65rem", color: V3.blue, fontWeight: 900, letterSpacing: 1, opacity: 1, borderTop: `1px solid ${V3.blue}44`, mt: 0.3 }}>
                    {p.cor && <Box component="span" sx={{ display: "inline-block", width: 8, height: 8, bgcolor: p.cor, borderRadius: 0.5, mr: 0.7 }} />}
                    {p.nome.toUpperCase()}
                  </MenuItem>,
                  ...cidadesDoPais.map((c) => (
                    <MenuItem key={c.id} value={c.id} sx={{ pl: 3.5, fontSize: "0.75rem", color: V3.ink }}>
                      🏙️ {c.nome} <Typography component="span" sx={{ ml: 0.5, fontSize: "0.6rem", color: V3.ink, opacity: 0.5 }}>({c.tipo || "—"})</Typography>
                    </MenuItem>
                  )),
                ];
              })}
            </Select>
          </FormControl>

          <Typography variant="caption" sx={{ color: V3.gold, fontWeight: 900, letterSpacing: 1, fontSize: "0.65rem" }}>
            🌿 SUBSIDIÁRIAS (opcional)
          </Typography>
          <Typography variant="caption" sx={{ color: V3.ink, opacity: 0.6, fontSize: "0.55rem", fontStyle: "italic", display: "block", mt: -1 }}>
            Adicione outras empresas existentes como subsidiárias desta.
          </Typography>
          {formEmpresa.subsidiarias.length > 0 && (
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
              {formEmpresa.subsidiarias.map((s, idx) => (
                <Chip
                  key={`${s.id}-${idx}`}
                  label={`🌿 ${s.nome}`}
                  size="small"
                  onDelete={() => setFormEmpresa((p) => ({ ...p, subsidiarias: p.subsidiarias.filter((_, i) => i !== idx) }))}
                  sx={{ bgcolor: V3.green, color: V3.paper, fontSize: "0.6rem", fontWeight: 700 }}
                />
              ))}
            </Box>
          )}
          <FormControl size="small" fullWidth>
            <Select
              value=""
              onChange={(e) => {
                const id = e.target.value;
                if (!id) return;
                if (empresaEditando?.id === id) return;
                const emp = empresas[id];
                if (!emp) return;
                if (formEmpresa.subsidiarias.some((s) => s.id === id)) return;
                setFormEmpresa((p) => ({ ...p, subsidiarias: [...p.subsidiarias, { id, nome: emp.nome }] }));
              }}
              displayEmpty
              sx={{ bgcolor: V3.paper, color: V3.ink, fontSize: "0.75rem" }}
              MenuProps={{ PaperProps: { sx: { bgcolor: V3.paper, maxHeight: 320 } } }}
            >
              <MenuItem value="" sx={{ fontSize: "0.75rem", color: V3.green, fontWeight: 800 }}>+ Adicionar subsidiária...</MenuItem>
              {Object.values(empresas)
                .filter((e) => e.id !== empresaEditando?.id && !formEmpresa.subsidiarias.some((s) => s.id === e.id))
                .map((e) => (
                  <MenuItem key={e.id} value={e.id} sx={{ fontSize: "0.75rem", color: V3.ink }}>
                    {e.nome} {e.origem?.nome ? `(${e.origem.nome})` : ""}
                  </MenuItem>
                ))}
            </Select>
          </FormControl>

          <Typography variant="caption" sx={{ color: V3.gold, fontWeight: 900, letterSpacing: 1, fontSize: "0.65rem" }}>
            👤 DONO (opcional)
          </Typography>
          <Box sx={{ display: "flex", gap: 0.5 }}>
            {[
              { id: "pj", label: "👥 PJ da lista" },
              { id: "livre", label: "✍️ Nome livre" },
            ].map((m) => (
              <Button
                key={m.id}
                size="small"
                onClick={() => setFormEmpresa((p) => ({ ...p, donoModo: m.id }))}
                sx={{
                  bgcolor: formEmpresa.donoModo === m.id ? V3.gold : `${V3.gold}22`,
                  color: V3.ink,
                  border: `1px solid ${V3.gold}`,
                  fontWeight: 800,
                  fontSize: "0.6rem",
                  flex: 1,
                }}
              >
                {m.label}
              </Button>
            ))}
          </Box>
          {formEmpresa.donoModo === "pj" ? (
            <FormControl size="small" fullWidth>
              <Select
                value={formEmpresa.donoEmail || ""}
                onChange={(e) => setFormEmpresa((p) => ({ ...p, donoEmail: e.target.value }))}
                displayEmpty
                sx={{ bgcolor: V3.paper, color: V3.ink, fontSize: "0.8rem" }}
                MenuProps={{ PaperProps: { sx: { bgcolor: V3.paper, maxHeight: 420 } } }}
                renderValue={(val) => {
                  if (!val) return <Typography sx={{ fontSize: "0.8rem", color: V3.ink, opacity: 0.55, fontStyle: "italic" }}>Nenhum dono</Typography>;
                  const f = fichasDisponiveis?.[val];
                  const isPM = f?.tipoFicha === "PM";
                  return (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.6 }}>
                      <Typography sx={{ fontSize: "0.8rem" }}>{isPM ? "👑" : "🎮"}</Typography>
                      <Typography sx={{ fontSize: "0.8rem", color: V3.ink }}>{f?.nome || val}</Typography>
                    </Box>
                  );
                }}
              >
                <MenuItem value="" sx={{ fontSize: "0.8rem", color: V3.ink, opacity: 0.6, fontStyle: "italic" }}>
                  Nenhum dono
                </MenuItem>

                {(() => {
                  const entradas = Object.entries(fichasDisponiveis || {});
                  const pjs = entradas
                    .filter(([email, f]) => email !== "mestre@reqviemrpg.com" && !f?.isConvidado && (f?.tipoFicha || "PJ") === "PJ")
                    .sort((a, b) => String(a[1]?.nome || a[0]).localeCompare(String(b[1]?.nome || b[0])));
                  const pms = entradas
                    .filter(([email, f]) => email !== "mestre@reqviemrpg.com" && f?.tipoFicha === "PM")
                    .sort((a, b) => String(a[1]?.nome || a[0]).localeCompare(String(b[1]?.nome || b[0])));
                  const total = pjs.length + pms.length;
                  const itens = [];
                  if (pjs.length > 0) {
                    itens.push(
                      <MenuItem key="hdr_pj" disabled sx={{ fontSize: "0.6rem", color: "#22c55e", fontWeight: 900, letterSpacing: 1.5, opacity: 1, borderTop: `1px solid #22c55e44`, mt: 0.3 }}>
                        ── PJ (JOGADORES) ──
                      </MenuItem>
                    );
                  }
                  pjs.forEach(([email, f]) => {
                    itens.push(
                      <MenuItem key={`pj_${email}`} value={email} sx={{ pl: 3, fontSize: "0.8rem", color: V3.ink }}>
                        🎮 {f?.nome || email}
                      </MenuItem>
                    );
                  });
                  if (pms.length > 0) {
                    itens.push(
                      <MenuItem key="hdr_pm" disabled sx={{ fontSize: "0.6rem", color: "#fbbf24", fontWeight: 900, letterSpacing: 1.5, opacity: 1, borderTop: `1px solid #fbbf2444`, mt: 0.3 }}>
                        ── PM (MESTRE) ──
                      </MenuItem>
                    );
                  }
                  pms.forEach(([email, f]) => {
                    itens.push(
                      <MenuItem key={`pm_${email}`} value={email} sx={{ pl: 3, fontSize: "0.8rem", color: V3.ink }}>
                        👑 {f?.nome || email}
                      </MenuItem>
                    );
                  });
                  if (total === 0) {
                    itens.push(
                      <MenuItem key="vazio" disabled sx={{ fontSize: "0.7rem", color: V3.ink, opacity: 0.5, fontStyle: "italic" }}>
                        Nenhuma ficha de jogador encontrada
                      </MenuItem>
                    );
                  }
                  return itens;
                })()}
              </Select>
            </FormControl>
          ) : (
            <TextField
              label="Nome do dono (livre)"
              size="small"
              fullWidth
              placeholder="Ex: Barão Vex, Casa Hollow, etc."
              value={formEmpresa.donoNomeLivre}
              onChange={(e) => setFormEmpresa((p) => ({ ...p, donoNomeLivre: e.target.value }))}
              sx={{ bgcolor: V3.paper }}
              InputProps={{ sx: { color: V3.ink, fontSize: "0.8rem" } }}
              InputLabelProps={{ sx: { color: V3.ink, fontSize: "0.8rem" } }}
            />
          )}

          <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end", mt: 2 }}>
            {empresaEditando && (
              <Button
                onClick={async () => {
                  if (!window.confirm(`Excluir "${empresaEditando.nome}"? Sem volta.`)) return;
                  await deleteDoc(doc(db, "sim_empresas", empresaEditando.id));
                  setModalEmpresaOpen(false);
                  setEmpresaEditando(null);
                  alert("🗑️ Empresa excluída.");
                }}
                sx={{ color: V3.red, fontWeight: 800, mr: "auto" }}
              >
                🗑️ Excluir
              </Button>
            )}
            <Button
              onClick={() => { setModalEmpresaOpen(false); setEmpresaEditando(null); }}
              sx={{ color: V3.red, fontWeight: 800 }}
            >
              Cancelar
            </Button>
            <Button
              variant="contained"
              onClick={async () => {
                if (!formEmpresa.nome.trim()) return alert("Nome é obrigatório.");
                if (!formEmpresa.origemId) return alert("Origem é obrigatória.");
                if (formEmpresa.sedes.length === 0) return alert("Pelo menos 1 sede é obrigatória.");

                const cidadeOrigem = cidades[formEmpresa.origemId];
                if (!cidadeOrigem) {
                  alert("Origem inválida. Selecione uma cidade.");
                  return;
                }
                const origemObj = {
                  nivel: "cidade",
                  id: cidadeOrigem.id,
                  nome: cidadeOrigem.nome || formEmpresa.origemId,
                };

                const id = empresaEditando?.id || `emp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

                const sedesCofres = { ...(empresaEditando?.sedesCofres || {}) };
                for (const s of formEmpresa.sedes) {
                  if (sedesCofres[s.id] === undefined) sedesCofres[s.id] = 0;
                }

                await setDoc(doc(db, "sim_empresas", id), {
                  id,
                  nome: formEmpresa.nome.trim(),
                  descricao: formEmpresa.descricao.trim(),
                  imagemUrl: formEmpresa.imagemUrl.trim(),
                  tipo: formEmpresa.tipo,
                  valor: Number(formEmpresa.valor) || 0,
                  origem: origemObj,
                  sedes: formEmpresa.sedes,
                  sedesCofres,
                  bolsaEmpresaId: formEmpresa.bolsaEmpresaId || "",
                  donoModo: formEmpresa.donoModo,
                  donoEmail: formEmpresa.donoModo === "pj" ? (formEmpresa.donoEmail || "") : "",
                  donoNomeLivre: formEmpresa.donoModo === "livre" ? (formEmpresa.donoNomeLivre || "") : "",
                  subsidiarias: formEmpresa.subsidiarias,
                  categorias: formEmpresa.categorias || [],
                  cofre: empresaEditando?.cofre ?? 0,
                  categoria: empresaEditando?.categoria ?? "$",
                  categoriaModo: empresaEditando?.categoriaModo ?? "auto",
                  categoriaOverride: empresaEditando?.categoriaOverride ?? "",
                  nivelEmpresa: empresaEditando?.nivelEmpresa ?? 1,
                  xpEmpresa: empresaEditando?.xpEmpresa ?? 0,
                  edificiosPorCidade: empresaEditando?.edificiosPorCidade ?? {},
                  estoqueEmpresa: empresaEditando?.estoqueEmpresa ?? {},
                  estoqueOrigem: empresaEditando?.estoqueOrigem ?? {},
                  instrucaoBonusEmpresa: empresaEditando?.instrucaoBonusEmpresa ?? 0,
                  pesquisaEmpresa: empresaEditando?.pesquisaEmpresa ?? { tecnologias: [], pesquisaAtual: null },
                  criadoPor: userEmail,
                  criadoEm: empresaEditando?.criadoEm || new Date().toISOString(),
                  atualizadoEm: new Date().toISOString(),
                }, { merge: true });

                alert(empresaEditando ? "✅ Empresa atualizada." : "✅ Empresa criada.");
                setModalEmpresaOpen(false);
                setEmpresaEditando(null);
              }}
              sx={{ bgcolor: V3.gold, color: V3.ink, fontWeight: 900, fontFamily: "Georgia, serif", "&:hover": { bgcolor: V3.goldLight } }}
            >
              {empresaEditando ? "💾 Salvar" : "🏢 Criar"}
            </Button>
          </Box>
        </Box>
      </FloatingDialog>

            <FloatingDialog
        open={!!empresaAberta}
        onClose={() => setEmpresaAberta(null)}
        id="sim_empresa_painel"
        titulo={empresaAberta ? `🏢 ${empresas[empresaAberta.id]?.nome || empresaAberta.nome}` : "Empresa"}
        subtitulo={empresaAberta ? `${empresas[empresaAberta.id]?.tipo || empresaAberta.tipo || ""}` : ""}
        cor={V3.green}
        larguraInicial={860}
        alturaInicial={680}
      >
        {empresaAberta && (() => {
          const empLive = empresas[empresaAberta.id] || empresaAberta;
          const donoEmail = empLive.donoEmail || "";
          const ehDono = donoEmail && donoEmail === userEmail;
          const podeEditar = isMaster || ehDono;
          const podeNaAba = (aba) => {
            if (isMaster) return true;
            if (ehDono) return true;
            const membro = (empLive.equipe || []).find((m) => m.holderEmail === userEmail);
            return !!(membro && (membro.acessos || []).includes(aba));
          };
          const sedesArr = Array.isArray(empLive.sedes) ? empLive.sedes : (empLive.sede ? [empLive.sede] : []);
          const bolsaEmp = empLive.bolsaEmpresaId ? bolsaEmpresas.find((b) => b.id === empLive.bolsaEmpresaId) : null;
          const categoriaCor = empLive.categoria === "$$$" ? "#fbbf24" : empLive.categoria === "$$" ? "#c9a961" : "#b8945a";
          const xpAtual = empLive.xpEmpresa || 0;
          const nivel = empLive.nivelEmpresa || 1;
          const xpProxNivel = nivel * 1000;
          const pctNivel = Math.min(100, (xpAtual / xpProxNivel) * 100);

          return (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
              <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", alignItems: "center" }}>
                {(() => {
                  const totalE = contarEdificiosEmpresa(empLive);
                  const efetiva = categoriaEfetivaEmpresa(empLive, totalE);
                  const cor = efetiva === "$$$" ? "#fbbf24" : efetiva === "$$" ? "#c9a961" : "#b8945a";
                  const ehAuto = empLive.categoriaModo !== "manual";
                  return (
                    <Chip
                      label={ehAuto ? `${efetiva} 🤖` : `${efetiva} ✋`}
                      size="small"
                      title={ehAuto ? "Categoria automática" : "Categoria fixada manualmente"}
                      sx={{ bgcolor: cor, color: "#000", fontWeight: 900, fontSize: "0.7rem", height: 22, minWidth: 34 }}
                    />
                  );
                })()}
                <Chip label={`Nv ${nivel}`} size="small" sx={{ bgcolor: V3.ink, color: V3.gold, fontWeight: 900, fontSize: "0.6rem" }} />
                {(empLive.categorias || []).map((catId) => {
                  const cat = getCategoriaEmpresa(catId);
                  if (!cat) return null;
                  return (
                    <Chip
                      key={catId}
                      label={`${cat.icone} ${cat.nome}`}
                      size="small"
                      sx={{
                        bgcolor: `${cat.cor}33`,
                        color: V3.ink,
                        border: `1px solid ${cat.cor}66`,
                        fontWeight: 800,
                        fontSize: "0.55rem",
                        height: 18,
                      }}
                    />
                  );
                })}
                <Chip label={`💰 ${Number(empLive.cofre || 0).toLocaleString("pt-BR")}`} size="small" sx={{ bgcolor: V3.green, color: V3.paper, fontSize: "0.6rem" }} />
                {(() => {
                  const valorVivo = bolsaEmp
                    ? Number(bolsaEmp.valorEmpresa ?? bolsaEmp.valor ?? 0)
                    : Number(empLive.valor || 0);
                  if (valorVivo <= 0) return null;
                  return (
                    <Chip label={`💎 ${valorVivo.toLocaleString("pt-BR")}`} size="small" sx={{ bgcolor: V3.blue, color: V3.paper, fontSize: "0.6rem" }} />
                  );
                })()}
                {donoEmail && (
                  <Chip label={`👤 ${fichasDisponiveis[donoEmail]?.nome || donoEmail}`} size="small" sx={{ bgcolor: V3.ink, color: V3.gold, fontSize: "0.6rem" }} />
                )}
                {!donoEmail && empLive.donoNomeLivre && (
                  <Chip label={`👤 ${empLive.donoNomeLivre}`} size="small" sx={{ bgcolor: V3.ink, color: V3.gold, fontSize: "0.6rem" }} />
                )}
                {empLive.falida && (
                  <Chip label="💀 FALIDA" size="small" sx={{ bgcolor: V3.red, color: "#fff", fontWeight: 900, fontSize: "0.55rem", animation: "pulse 1.5s infinite" }} />
                )}
                {!podeEditar && (
                  <Chip label="👁️ MODO LEITURA" size="small" sx={{ bgcolor: "#666", color: "#fff", fontSize: "0.55rem" }} />
                )}
              </Box>

              <Box>
                <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.3 }}>
                  <Typography variant="caption" sx={{ color: V3.ink, opacity: 0.7, fontSize: "0.55rem", fontWeight: 800 }}>
                    XP da Empresa
                  </Typography>
                  <Typography variant="caption" sx={{ color: V3.ink, opacity: 0.7, fontSize: "0.55rem" }}>
                    {xpAtual.toLocaleString("pt-BR")} / {xpProxNivel.toLocaleString("pt-BR")}
                  </Typography>
                </Box>
                <Box sx={{ height: 10, bgcolor: "rgba(0,0,0,0.15)", borderRadius: 5, overflow: "hidden", border: `1px solid ${V3.gold}44` }}>
                  <Box sx={{ height: "100%", width: `${pctNivel}%`, bgcolor: categoriaCor, transition: "width 0.4s", boxShadow: `0 0 6px ${categoriaCor}` }} />
                </Box>
              </Box>

              <Tabs
                value={empresaAba}
                onChange={(_, v) => setEmpresaAba(v)}
                variant="scrollable"
                scrollButtons="auto"
                sx={{
                  bgcolor: V3.bg2,
                  borderBottom: `1px solid ${V3.gold}33`,
                  "& .MuiTab-root": { color: `${V3.gold}88`, fontWeight: 800, fontSize: "0.65rem", minHeight: 38, fontFamily: "Georgia, serif" },
                  "& .Mui-selected": { color: `${V3.goldLight} !important` },
                  "& .MuiTabs-indicator": { bgcolor: V3.gold },
                }}
              >
                <Tab value="visao" label="📊 Visão" />
                <Tab value="edificios" label="🏗️ Edifícios" />
                <Tab value="pesquisa" label="🔬 Pesquisa" />
                <Tab value="cofre" label="💰 Cofre" />
                <Tab value="equipe" label="👥 Equipe" />
                <Tab value="config" label="⚙️ Config" />
              </Tabs>
              {!podeEditar && (
                <Paper sx={{ p: 0.8, bgcolor: `${V3.blue}15`, border: `1px dashed ${V3.blue}66`, borderRadius: 1, textAlign: "center" }}>
                  <Typography variant="caption" sx={{ color: V3.blue, fontWeight: 800, fontSize: "0.6rem" }}>
                    👁️ MODO VISITANTE — você pode ver tudo, mas só edita as abas liberadas pra você.
                  </Typography>
                </Paper>
              )}

              {empresaAba === "visao" && (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                  {empLive.falida && (
                    <Paper sx={{ p: 1.2, bgcolor: `${V3.red}22`, border: `2px solid ${V3.red}`, borderRadius: 1 }}>
                      <Typography variant="caption" sx={{ color: V3.red, fontWeight: 900, fontSize: "0.75rem", display: "block", letterSpacing: 1 }}>
                        💀 EMPRESA FALIDA
                      </Typography>
                      <Typography variant="caption" sx={{ color: V3.ink, fontSize: "0.6rem", display: "block", mt: 0.4, lineHeight: 1.5 }}>
                        O cofre consolidado cruzou o limite de <strong>-{Number(empLive.valor || 0).toLocaleString("pt-BR")}</strong>.
                        Produção, tributo, salários e pesquisas estão congelados. Faça um aporte no <strong>💰 Cofre</strong> pra recuperar.
                      </Typography>
                    </Paper>
                  )}
                  {empLive.imagemUrl && (
                    <Box
                      component="img"
                      src={empLive.imagemUrl}
                      onClick={() => setLightboxSrc(empLive.imagemUrl)}
                      onError={(e) => { e.target.style.display = "none"; }}
                      sx={{ width: "100%", maxHeight: 220, objectFit: "cover", borderRadius: 1, border: `1px solid ${V3.gold}44`, cursor: "zoom-in" }}
                    />
                  )}

                  {empLive.descricao && (
                    <Paper sx={{ p: 1.5, bgcolor: V3.paperDark, border: `1px solid ${V3.gold}44`, borderRadius: 1 }}>
                      <Typography sx={{ color: V3.ink, fontFamily: "Georgia, serif", fontSize: "0.75rem", lineHeight: 1.5 }}>
                        {empLive.descricao}
                      </Typography>
                    </Paper>
                  )}

                  {sedesArr.length > 0 && (
                    <Paper sx={{ p: 1.2, bgcolor: V3.paperDark, border: `1px solid ${V3.blue}66`, borderRadius: 1 }}>
                      <Typography variant="caption" sx={{ color: V3.blue, fontWeight: 900, letterSpacing: 1, fontSize: "0.65rem", display: "block", mb: 0.8 }}>
                        🏛️ SEDES ({sedesArr.length})
                      </Typography>
                      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                        {sedesArr.map((s, i) => (
                          <Chip
                            key={`${s.id}-${i}`}
                            label={`🏙️ ${s.nome}`}
                            size="small"
                            sx={{ bgcolor: V3.blue, color: V3.paper, fontSize: "0.6rem", fontWeight: 700 }}
                          />
                        ))}
                      </Box>
                    </Paper>
                  )}

                  {(() => {
                    const vinculado = !!bolsaEmp;
                    const valorAtual = vinculado
                      ? Number(bolsaEmp.valorEmpresa ?? bolsaEmp.valor ?? 0)
                      : Number(empLive.valor || 0);

                    const setValor = async (raw) => {
                      const n = Math.max(0, Number(String(raw).replace(",", ".")) || 0);
                      try {
                        if (vinculado) {
                          const dadosRef = doc(db, "bolsa_valores", "dados");
                          const atual = (bolsaEmpresas || []).map((b) =>
                            b.id === bolsaEmp.id
                              ? { ...b, valorEmpresa: n, valor: n }
                              : b
                          );
                          await setDoc(dadosRef, { empresas: atual }, { merge: true });
                        } else {
                          await setDoc(doc(db, "sim_empresas", empLive.id), {
                            valor: n,
                            atualizadoEm: new Date().toISOString(),
                          }, { merge: true });
                        }
                      } catch (e) {
                        alert("Erro ao salvar valor: " + e.message);
                      }
                    };

                    const desvincular = async () => {
                      if (!window.confirm("Desvincular a empresa da Bolsa de Valores?\n\nO valor atual será copiado pra empresa e ficará editável só aqui.")) return;
                      const vAtual = Number(bolsaEmp.valorEmpresa ?? bolsaEmp.valor ?? empLive.valor ?? 0);
                      await setDoc(doc(db, "sim_empresas", empLive.id), {
                        valor: vAtual,
                        bolsaEmpresaId: "",
                        atualizadoEm: new Date().toISOString(),
                      }, { merge: true });
                      alert("🔓 Desvinculado. Agora o valor é editável só aqui.");
                    };

                    const vincular = async (bolsaId) => {
                      const b = (bolsaEmpresas || []).find((x) => x.id === bolsaId);
                      if (!b) return;
                      const vBolsa = Number(b.valorEmpresa ?? b.valor ?? 0);
                      await setDoc(doc(db, "sim_empresas", empLive.id), {
                        bolsaEmpresaId: bolsaId,
                        valor: vBolsa,
                        atualizadoEm: new Date().toISOString(),
                      }, { merge: true });
                      alert(`🔗 Vinculado a ${b.nome} (${b.sigla}).`);
                    };

                    return (
                      <Paper sx={{ p: 1.5, bgcolor: V3.paperDark, border: `2px solid ${vinculado ? V3.gold : V3.green}66`, borderRadius: 1 }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.6, mb: 0.8 }}>
                          <Typography sx={{ fontSize: "1rem" }}>💎</Typography>
                          <Typography variant="caption" sx={{ color: vinculado ? V3.gold : V3.green, fontWeight: 900, letterSpacing: 1, fontSize: "0.7rem", flex: 1 }}>
                            {vinculado ? "VALOR DA EMPRESA (VINCULADO À BOLSA)" : "VALOR DA EMPRESA"}
                          </Typography>
                          {vinculado && (
                            <Chip
                              label={`🔗 ${bolsaEmp.sigla || bolsaEmp.id}`}
                              size="small"
                              sx={{ bgcolor: V3.gold, color: V3.ink, fontWeight: 900, fontSize: "0.5rem", height: 16 }}
                            />
                          )}
                        </Box>

                        {podeEditar ? (
                          <>
                            <TextField
                              type="number"
                              size="small"
                              fullWidth
                              value={valorAtual}
                              onChange={(e) => setValor(e.target.value)}
                              sx={{ bgcolor: V3.paper }}
                              InputProps={{ sx: { color: V3.ink, fontFamily: "Georgia, serif", fontWeight: 800, fontSize: "0.95rem" } }}
                            />
                            <Typography variant="caption" sx={{ color: V3.ink, opacity: 0.6, fontSize: "0.5rem", display: "block", mt: 0.4, fontStyle: "italic" }}>
                              {vinculado
                                ? "Editar aqui atualiza a Bolsa de Valores. Sem flutuações automáticas do mercado."
                                : "Sem vínculo com a bolsa. Valor puramente privado da empresa."}
                            </Typography>

                            {vinculado ? (
                              <Button
                                size="small"
                                onClick={desvincular}
                                sx={{ mt: 0.8, color: V3.red, fontSize: "0.55rem", fontWeight: 800, textTransform: "none" }}
                              >
                                🔓 Desvincular da bolsa
                              </Button>
                            ) : (
                              <Box sx={{ mt: 0.8 }}>
                                <Typography variant="caption" sx={{ color: V3.gold, fontWeight: 800, fontSize: "0.55rem", display: "block", mb: 0.3 }}>
                                  Vincular a uma empresa da Bolsa:
                                </Typography>
                                <FormControl size="small" fullWidth>
                                  <Select
                                    value=""
                                    onChange={(e) => { if (e.target.value) vincular(e.target.value); }}
                                    displayEmpty
                                    sx={{ bgcolor: V3.paper, color: V3.ink, fontSize: "0.75rem" }}
                                    MenuProps={{ PaperProps: { sx: { bgcolor: V3.paper, maxHeight: 260 } } }}
                                  >
                                    <MenuItem value="" sx={{ fontSize: "0.75rem", color: V3.ink, opacity: 0.6, fontStyle: "italic" }}>
                                      — Escolher empresa da Bolsa —
                                    </MenuItem>
                                    {(bolsaEmpresas || []).map((b) => (
                                      <MenuItem key={b.id} value={b.id} sx={{ fontSize: "0.75rem", color: V3.ink }}>
                                        {b.logo || "🏢"} {b.nome} ({b.sigla}) — 💰 {Number(b.valorEmpresa ?? b.valor ?? 0).toLocaleString("pt-BR")}
                                      </MenuItem>
                                    ))}
                                  </Select>
                                </FormControl>
                              </Box>
                            )}
                          </>
                        ) : (
                          <Typography sx={{ color: V3.ink, fontFamily: "Georgia, serif", fontWeight: 900, fontSize: "1.1rem" }}>
                            💰 {valorAtual.toLocaleString("pt-BR")}
                          </Typography>
                        )}
                      </Paper>
                    );
                  })()}

                  {bolsaEmp && (
                    <Paper sx={{ p: 1.2, bgcolor: V3.paperDark, border: `1px solid ${V3.gold}66`, borderRadius: 1 }}>
                      <Typography variant="caption" sx={{ color: V3.gold, fontWeight: 900, letterSpacing: 1, fontSize: "0.65rem", display: "block", mb: 0.8 }}>
                        📈 VÍNCULO COM A BOLSA
                      </Typography>
                      <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                        {bolsaEmp.imagem ? (
                          <Box component="img" src={bolsaEmp.imagem} sx={{ width: 32, height: 32, borderRadius: 1, objectFit: "cover" }} />
                        ) : (
                          <Typography sx={{ fontSize: "1.5rem" }}>{bolsaEmp.logo || "🏢"}</Typography>
                        )}
                        <Box sx={{ flex: 1 }}>
                          <Typography sx={{ color: V3.ink, fontWeight: 900, fontSize: "0.75rem", fontFamily: "Georgia, serif" }}>
                            {bolsaEmp.nome} ({bolsaEmp.sigla})
                          </Typography>
                          <Typography variant="caption" sx={{ color: V3.ink, opacity: 0.7, fontSize: "0.55rem" }}>
                            Setor: {bolsaEmp.setor} • 💰 {Number(bolsaEmp.precoAtual || bolsaEmp.preco || 0).toFixed(2)}
                          </Typography>
                        </Box>
                      </Box>
                    </Paper>
                  )}

                  {(() => {
                    const acoes = Array.isArray(empLive.ultimasAcoesNpc) ? empLive.ultimasAcoesNpc : [];
                    if (acoes.length === 0) return null;
                    const temNpc = (empLive.equipe || []).some((m) => m.tipo === "npc");
                    if (!temNpc) return null;
                    return (
                      <Paper sx={{ p: 1.5, bgcolor: V3.paperDark, border: `1px solid ${V3.blue}66`, borderRadius: 1 }}>
                        <Typography variant="caption" sx={{ color: V3.blue, fontWeight: 900, letterSpacing: 1, fontSize: "0.65rem", display: "block", mb: 0.6 }}>
                          🤖 ÚLTIMAS AÇÕES DA IA
                        </Typography>
                        <Typography variant="caption" sx={{ color: V3.ink, opacity: 0.55, fontSize: "0.5rem", display: "block", mb: 0.8, fontStyle: "italic" }}>
                          Seus funcionários NPC tomam decisões sozinhos a cada ciclo.
                        </Typography>
                        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.4 }}>
                          {[...acoes].reverse().map((log, i) => (
                            <Paper key={i} sx={{ p: 0.7, bgcolor: `${V3.blue}11`, border: `1px dashed ${V3.blue}44`, borderRadius: 1 }}>
                              <Typography variant="caption" sx={{ color: V3.ink, fontSize: "0.6rem", display: "block", lineHeight: 1.4 }}>
                                {log}
                              </Typography>
                            </Paper>
                          ))}
                        </Box>
                      </Paper>
                    );
                  })()}

                  {(() => {
                    const subs = Array.isArray(empLive.subsidiarias) ? empLive.subsidiarias : [];
                    const pai = Object.values(empresas).find(
                      (e) => Array.isArray(e.subsidiarias) && e.subsidiarias.some((s) => s.id === empLive.id)
                    ) || null;
                    const temSubs = subs.length > 0;
                    const ehSubs = !!pai;
                    if (!temSubs && !ehSubs) return null;

                    const taxaAtual = Number.isFinite(empLive.taxaSubsidiariaParent) ? empLive.taxaSubsidiariaParent : 0.10;

                    return (
                      <Paper sx={{ p: 1.5, bgcolor: V3.paperDark, border: `1px solid ${V3.green}66`, borderRadius: 1 }}>
                        {ehSubs && (
                          <Box sx={{ mb: temSubs ? 1.5 : 0 }}>
                            <Typography variant="caption" sx={{ color: V3.gold, fontWeight: 900, letterSpacing: 1, fontSize: "0.65rem", display: "block", mb: 0.5 }}>
                              👑 EMPRESA-MÃE
                            </Typography>
                            <Chip
                              label={`👑 ${pai.nome}`}
                              size="small"
                              onClick={() => {
                                const emp = empresas[pai.id];
                                if (emp) {
                                  setEmpresaAba("visao");
                                  setEmpresaAberta(null);
                                  setTimeout(() => setEmpresaAberta(emp), 50);
                                }
                              }}
                              sx={{ bgcolor: V3.gold, color: V3.ink, fontSize: "0.7rem", fontWeight: 800, cursor: "pointer" }}
                            />
                            {podeEditar && (
                              <Box sx={{ mt: 1 }}>
                                <Typography variant="caption" sx={{ color: V3.ink, opacity: 0.7, fontSize: "0.55rem", display: "block", mb: 0.4, fontWeight: 800 }}>
                                  % do meu cofre central enviado à mãe por ciclo:
                                </Typography>
                                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                  <input
                                    type="range" min="0" max="50" step="1"
                                    value={Math.round(taxaAtual * 100)}
                                    onChange={(e) => {
                                      const v = Number(e.target.value) / 100;
                                      setDoc(doc(db, "sim_empresas", empLive.id), {
                                        taxaSubsidiariaParent: v,
                                        atualizadoEm: new Date().toISOString(),
                                      }, { merge: true });
                                    }}
                                    style={{ flex: 1, accentColor: V3.gold }}
                                  />
                                  <Typography sx={{ color: V3.gold, fontWeight: 900, fontFamily: "Georgia, serif", minWidth: 42, textAlign: "right" }}>
                                    {Math.round(taxaAtual * 100)}%
                                  </Typography>
                                </Box>
                                {empLive.ultimoEnvioParent > 0 && (
                                  <Typography variant="caption" sx={{ color: V3.red, fontWeight: 700, fontSize: "0.55rem", display: "block", mt: 0.4 }}>
                                    Último ciclo: 💰 {Number(empLive.ultimoEnvioParent).toLocaleString("pt-BR")} enviados à mãe.
                                  </Typography>
                                )}
                              </Box>
                            )}
                          </Box>
                        )}

                        {temSubs && (
                          <>
                            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 0.8 }}>
                              <Typography variant="caption" sx={{ color: V3.green, fontWeight: 900, letterSpacing: 1, fontSize: "0.65rem" }}>
                                🌿 SUBSIDIÁRIAS ({subs.length})
                              </Typography>
                              {empLive.ultimaReceitaSubsidiarias > 0 && (
                                <Chip
                                  label={`+💰 ${Number(empLive.ultimaReceitaSubsidiarias).toLocaleString("pt-BR")}`}
                                  size="small"
                                  sx={{ bgcolor: V3.green, color: V3.paper, fontWeight: 800, fontSize: "0.5rem", height: 16 }}
                                />
                              )}
                            </Box>
                            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                              {subs.map((s, i) => {
                                const subLive = empresas[s.id];
                                const taxaSub = subLive && Number.isFinite(subLive.taxaSubsidiariaParent)
                                  ? subLive.taxaSubsidiariaParent
                                  : 0.10;
                                return (
                                  <Chip
                                    key={`${s.id}-${i}`}
                                    label={`🌿 ${s.nome} · ${Math.round(taxaSub * 100)}%`}
                                    size="small"
                                    onClick={() => {
                                      const emp = empresas[s.id];
                                      if (emp) {
                                        setEmpresaAba("visao");
                                        setEmpresaAberta(null);
                                        setTimeout(() => setEmpresaAberta(emp), 50);
                                      }
                                    }}
                                    sx={{ bgcolor: V3.green, color: V3.paper, fontSize: "0.6rem", fontWeight: 700, cursor: "pointer" }}
                                  />
                                );
                              })}
                            </Box>
                          </>
                        )}
                      </Paper>
                    );
                  })()}
                </Box>
              )}

              {empresaAba === "edificios" && (() => {
                const edsPorCidade = empLive.edificiosPorCidade || {};
                const sedesCofres = empLive.sedesCofres || {};
                const pesq = empLive.pesquisaEmpresa || { tecnologias: [], pesquisaAtual: null };
                const categoriasOrdem = ["basico", "luxo", "industria", "militar"];
                const porCategoria = {};
                for (const ed of EDIFICIOS_CATALOGO) {
                  if (!porCategoria[ed.categoria]) porCategoria[ed.categoria] = [];
                  porCategoria[ed.categoria].push(ed);
                }

                const construir = async (sedeId, ed, delta) => {
                  if (!podeNaAba("edificios")) return;
                  const edsSede = { ...(edsPorCidade[sedeId] || {}) };
                  const nivelAtual = edsSede[ed.id] || 0;
                  const novoNivel = Math.max(0, Math.min(10, nivelAtual + delta));
                  if (novoNivel === nivelAtual) return;

                  const cofreSede = Number(sedesCofres[sedeId] || 0);

                  if (novoNivel > nivelAtual) {
                    let custoTotal = 0;
                    for (let i = nivelAtual; i < novoNivel; i++) custoTotal += custoEdificio(ed, i);
                    if (!isMaster && cofreSede < custoTotal) {
                      alert(`💰 Cofre da sede insuficiente!\nNecessário: ${custoTotal.toLocaleString("pt-BR")}\nDisponível: ${cofreSede.toLocaleString("pt-BR")}`);
                      return;
                    }
                    const novosCofres = isMaster
                      ? sedesCofres
                      : { ...sedesCofres, [sedeId]: cofreSede - custoTotal };
                    const novosEds = { ...edsPorCidade, [sedeId]: { ...edsSede, [ed.id]: novoNivel } };
                    await setDoc(doc(db, "sim_empresas", empLive.id), {
                      edificiosPorCidade: novosEds,
                      sedesCofres: novosCofres,
                      atualizadoEm: new Date().toISOString(),
                    }, { merge: true });
                  } else {
                    if (novoNivel === 0) delete edsSede[ed.id];
                    else edsSede[ed.id] = novoNivel;
                    const novosEds = { ...edsPorCidade, [sedeId]: edsSede };
                    await setDoc(doc(db, "sim_empresas", empLive.id), {
                      edificiosPorCidade: novosEds,
                      atualizadoEm: new Date().toISOString(),
                    }, { merge: true });
                  }
                };

                if (sedesArr.length === 0) {
                  return (
                    <Paper sx={{ p: 2, bgcolor: V3.paperDark, border: `1px dashed ${V3.red}66`, borderRadius: 1, textAlign: "center" }}>
                      <Typography variant="caption" sx={{ color: V3.red, fontWeight: 800, fontSize: "0.7rem" }}>
                        ⚠️ Nenhuma sede cadastrada. Edite a empresa pra adicionar pelo menos 1.
                      </Typography>
                    </Paper>
                  );
                }

                const totalEdificios = Object.values(edsPorCidade).reduce((s, eds) => s + Object.keys(eds || {}).length, 0);

                return (
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                    <Paper sx={{ p: 1.2, bgcolor: `${V3.green}15`, border: `1px solid ${V3.green}66`, borderRadius: 1 }}>
                      <Typography variant="caption" sx={{ color: V3.green, fontWeight: 900, letterSpacing: 1, fontSize: "0.7rem", display: "block", mb: 0.5 }}>
                        🏗️ EDIFÍCIOS CORPORATIVOS ({totalEdificios})
                      </Typography>
                      <Typography variant="caption" sx={{ color: V3.ink, opacity: 0.65, fontSize: "0.55rem", display: "block", lineHeight: 1.5, fontStyle: "italic" }}>
                        Edifícios da empresa são separados dos edifícios da cidade. Níveis 1-10. Custo sai do <strong>cofre da sede</strong>. Produção vai pro estoque da empresa.
                      </Typography>
                    </Paper>

                    {(() => {
                      const est = empLive.estoqueEmpresa || {};
                      const origem = empLive.estoqueOrigem || {};
                      const listaEst = Object.entries(est)
                        .map(([cmId, qtd]) => {
                          const cm = commodities[cmId];
                          const o = origem[cmId] || { producao: 0, compra: 0 };
                          return {
                            cmId,
                            qtd: Number(qtd) || 0,
                            cm,
                            producao: Number(o.producao) || 0,
                            compra: Number(o.compra) || 0,
                          };
                        })
                        .filter((x) => x.qtd !== 0)
                        .sort((a, b) => b.qtd - a.qtd);

                      const valorTotal = listaEst.reduce((s, x) => {
                        const preco = commodities[x.cmId]?.precoAtual || commodities[x.cmId]?.precoBase || 10;
                        return s + x.qtd * preco;
                      }, 0);

                      const positivos = listaEst.filter((x) => x.qtd > 0);
                      const negativos = listaEst.filter((x) => x.qtd < 0);

                      return (
                        <Paper sx={{ p: 1.2, bgcolor: V3.paperDark, border: `1px solid ${V3.blue}66`, borderRadius: 1 }}>
                          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 0.6 }}>
                            <Typography variant="caption" sx={{ color: V3.blue, fontWeight: 900, letterSpacing: 1, fontSize: "0.7rem" }}>
                              📦 ESTOQUE DA EMPRESA ({listaEst.length})
                            </Typography>
                            <Chip label={`💎 ${Math.round(valorTotal).toLocaleString("pt-BR")}`} size="small" sx={{ bgcolor: V3.gold, color: V3.ink, fontSize: "0.6rem", fontWeight: 900, height: 18 }} />
                          </Box>
                          <Typography variant="caption" sx={{ color: V3.ink, opacity: 0.6, fontSize: "0.55rem", display: "block", mb: 1, fontStyle: "italic" }}>
                            Estoque consolidado de todos os edifícios da empresa. Vende automaticamente pra cidade-sede a 85% do preço de mercado a cada ciclo.
                          </Typography>
                          {listaEst.length === 0 ? (
                            <Typography variant="caption" sx={{ color: V3.ink, opacity: 0.55, fontSize: "0.65rem" }}>
                              Sem estoque. Construa edifícios nas sedes pra produzir.
                            </Typography>
                          ) : (
                            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.4 }}>
                              {positivos.map((x) => {
                                const detalhe = [];
                                if (x.producao > 0) detalhe.push(`${x.producao.toFixed(0)} prod`);
                                if (x.compra > 0) detalhe.push(`${x.compra.toFixed(0)} compra`);
                                const sufixo = detalhe.length > 0 ? ` (${detalhe.join(" + ")})` : "";
                                return (
                                  <Chip
                                    key={x.cmId}
                                    label={`${x.cm?.icone || "📦"} ${x.cm?.nome || x.cmId} ${x.qtd.toFixed(0)}${sufixo}`}
                                    size="small"
                                    sx={{ bgcolor: "#2d4a1f", color: "#fff", fontSize: "0.55rem", height: 18, fontWeight: 700, "& .MuiChip-label": { px: 0.8 } }}
                                  />
                                );
                              })}
                              {negativos.map((x) => (
                                <Chip
                                  key={x.cmId}
                                  label={`${x.cm?.icone || "📦"} ${x.cm?.nome || x.cmId} ${x.qtd.toFixed(0)}`}
                                  size="small"
                                  sx={{ bgcolor: "#6b1f1f", color: "#fff", fontSize: "0.55rem", height: 18, fontWeight: 700, "& .MuiChip-label": { px: 0.8 } }}
                                />
                              ))}
                            </Box>
                          )}
                        </Paper>
                      );
                    })()}

                    {sedesArr.map((sede) => {
                      const edsSede = edsPorCidade[sede.id] || {};
                      const cofreSede = Number(sedesCofres[sede.id] || 0);
                      const qtdEdSede = Object.keys(edsSede).length;

                      return (
                        <Accordion
                          key={sede.id}
                          disableGutters
                          sx={{
                            bgcolor: V3.paperDark,
                            border: `1px solid ${V3.blue}66`,
                            "&:before": { display: "none" },
                            borderRadius: 1,
                            overflow: "hidden",
                          }}
                        >
                          <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: V3.ink }} />} sx={{ bgcolor: `${V3.blue}22`, minHeight: 46 }}>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1, width: "100%" }}>
                              <Typography sx={{ fontSize: "1.2rem" }}>🏙️</Typography>
                              <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography variant="body2" sx={{ color: V3.ink, fontWeight: 900, fontFamily: "Georgia, serif", fontSize: "0.82rem" }}>
                                  {sede.nome}
                                </Typography>
                                <Typography variant="caption" sx={{ color: V3.ink, opacity: 0.6, fontSize: "0.55rem" }}>
                                  💰 Cofre da sede: {cofreSede.toLocaleString("pt-BR")}
                                </Typography>
                              </Box>
                              <Chip label={`${qtdEdSede} edif.`} size="small" sx={{ bgcolor: V3.blue, color: V3.paper, fontSize: "0.55rem", height: 18 }} />
                            </Box>
                          </AccordionSummary>
                          <AccordionDetails sx={{ p: 1 }}>
                            <Box sx={{ mb: 2 }}>
                              <Box sx={{ display: "flex", alignItems: "center", gap: 0.6, mb: 1, pb: 0.5, borderBottom: `2px solid ${CATEGORIA_CORPORATIVO.cor}88` }}>
                                <Typography sx={{ fontSize: "0.9rem" }}>{CATEGORIA_CORPORATIVO.icone}</Typography>
                                <Typography variant="caption" sx={{ color: CATEGORIA_CORPORATIVO.cor, fontWeight: 900, letterSpacing: 1.2, fontSize: "0.7rem", fontFamily: "Georgia, serif" }}>
                                  {CATEGORIA_CORPORATIVO.nome.toUpperCase()}
                                </Typography>
                                <Typography variant="caption" sx={{ color: V3.ink, opacity: 0.55, fontSize: "0.5rem", fontStyle: "italic", ml: "auto" }}>
                                  Exclusivos da empresa
                                </Typography>
                              </Box>
                              <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1 }}>
                                {EMPRESA_EDIFICIOS_CATALOGO.filter((ed) => !ed.ramo || (empLive.categorias || []).includes(ed.ramo)).map((ed) => {
                                  const nivel = edsSede[ed.id] || 0;
                                  const custoProx = nivel < 10 ? custoEmpresaEdificio(ed, nivel) : 0;
                                  const temGran = isMaster || cofreSede >= custoProx;
                                  const tecsEmpresaSet = new Set(pesq.tecnologias || []);
                                  const temTech = !ed.requerTech || tecsEmpresaSet.has(ed.requerTech);
                                  const travado = !temTech && nivel === 0 && !isMaster;

                                  return (
                                    <Paper
                                      key={ed.id}
                                      sx={{
                                        p: 1.2,
                                        bgcolor: travado ? "#2a2520" : V3.paperDark,
                                        border: nivel > 0 ? `2px solid ${ed.cor}` : travado ? `1px dashed #666` : `1px solid ${ed.cor}44`,
                                        opacity: travado ? 0.55 : 1,
                                        filter: travado ? "grayscale(0.7)" : "none",
                                        borderRadius: 1.5,
                                      }}
                                    >
                                      <Box sx={{ display: "flex", alignItems: "flex-start", gap: 0.8, mb: 0.6 }}>
                                        <Box
                                          sx={{
                                            width: 32, height: 32, borderRadius: "50%",
                                            display: "flex", alignItems: "center", justifyContent: "center",
                                            bgcolor: `${ed.cor}33`, border: `2px solid ${ed.cor}`, fontSize: "1rem", flexShrink: 0,
                                          }}
                                        >
                                          {ed.icone}
                                        </Box>
                                        <Box sx={{ flex: 1, minWidth: 0 }}>
                                          <Typography variant="body2" sx={{ color: travado ? "#888" : V3.ink, fontWeight: 900, fontSize: "0.75rem", lineHeight: 1.15 }}>
                                            {ed.nome}
                                          </Typography>
                                          <Typography variant="caption" sx={{ color: travado ? "#666" : ed.cor, fontSize: "0.55rem", fontWeight: 800 }}>
                                            {nivel > 0 ? `Nv ${nivel}/10` : "Nv 0"}
                                            {ed.ramo && (() => {
                                              const cat = getCategoriaEmpresa(ed.ramo);
                                              return cat ? ` • ${cat.icone} ${cat.nome}` : "";
                                            })()}
                                          </Typography>
                                        </Box>
                                      </Box>

                                      {travado ? (
                                        <Paper sx={{ p: 0.8, bgcolor: "#1a1512", border: `1px dashed #666`, textAlign: "center" }}>
                                          <Typography variant="caption" sx={{ color: "#cc8080", fontWeight: 800, fontSize: "0.6rem", display: "block" }}>
                                            🔒 REQUER PESQUISA
                                          </Typography>
                                          <Typography variant="caption" sx={{ color: "#999", fontSize: "0.55rem" }}>
                                            {TECNOLOGIAS.find((t) => t.id === ed.requerTech)?.nome || ed.requerTech}
                                          </Typography>
                                        </Paper>
                                      ) : (
                                        <>
                                          <Typography variant="caption" sx={{ color: V3.ink, opacity: 0.7, fontSize: "0.55rem", display: "block", mb: 0.5 }}>
                                            {ed.desc}
                                          </Typography>
                                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                                            {nivel > 0 && (
                                              <Button
                                                size="small"
                                                onClick={async () => {
                                                  if (!podeNaAba("edificios")) return;
                                                  const edsAtuais = { ...edsSede };
                                                  const novo = Math.max(0, nivel - 1);
                                                  if (novo === 0) delete edsAtuais[ed.id];
                                                  else edsAtuais[ed.id] = novo;
                                                  await setDoc(doc(db, "sim_empresas", empLive.id), {
                                                    edificiosPorCidade: { ...edsPorCidade, [sede.id]: edsAtuais },
                                                    atualizadoEm: new Date().toISOString(),
                                                  }, { merge: true });
                                                }}
                                                disabled={!podeNaAba("edificios")}
                                                sx={{ minWidth: 24, p: 0.2, color: V3.red, fontWeight: 900, fontSize: "0.9rem" }}
                                              >
                                                −
                                              </Button>
                                            )}
                                            <Box sx={{ flex: 1, height: 6, bgcolor: "rgba(0,0,0,0.2)", borderRadius: 3, overflow: "hidden" }}>
                                              <Box sx={{ height: "100%", width: `${(nivel / 10) * 100}%`, bgcolor: ed.cor }} />
                                            </Box>
                                            {nivel < 10 && (
                                              <Button
                                                size="small"
                                                onClick={async () => {
                                                  if (!podeNaAba("edificios")) return;
                                                  if (!isMaster && cofreSede < custoProx) {
                                                    alert(`💰 Cofre da sede insuficiente.\nNecessário: ${custoProx.toLocaleString("pt-BR")}\nDisponível: ${cofreSede.toLocaleString("pt-BR")}`);
                                                    return;
                                                  }
                                                  const edsAtuais = { ...edsSede, [ed.id]: nivel + 1 };
                                                  const novosCofres = isMaster
                                                    ? sedesCofres
                                                    : { ...sedesCofres, [sede.id]: cofreSede - custoProx };
                                                  await setDoc(doc(db, "sim_empresas", empLive.id), {
                                                    edificiosPorCidade: { ...edsPorCidade, [sede.id]: edsAtuais },
                                                    sedesCofres: novosCofres,
                                                    atualizadoEm: new Date().toISOString(),
                                                  }, { merge: true });
                                                }}
                                                disabled={!podeNaAba("edificios") || (!isMaster && !temGran)}
                                                sx={{ minWidth: 24, p: 0.2, color: temGran ? V3.green : "#888", fontWeight: 900, fontSize: "0.9rem" }}
                                              >
                                                +
                                              </Button>
                                            )}
                                          </Box>
                                          {nivel < 10 && (
                                            <Typography variant="caption" sx={{ color: temGran ? V3.green : V3.red, fontSize: "0.55rem", fontWeight: 700, display: "block", mt: 0.3 }}>
                                              💰 {custoProx.toLocaleString("pt-BR")}
                                            </Typography>
                                          )}
                                        </>
                                      )}
                                    </Paper>
                                  );
                                })}
                              </Box>
                            </Box>

                            {categoriasOrdem.map((catId) => {
                              const catInfo = CATEGORIAS_EDIFICIO[catId] || { nome: catId, icone: "📦", cor: V3.gold };
                              const lista = porCategoria[catId] || [];
                              if (lista.length === 0) return null;
                              return (
                                <Box key={catId} sx={{ mb: 2 }}>
                                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.6, mb: 1, pb: 0.5, borderBottom: `1px solid ${catInfo.cor}44` }}>
                                    <Typography sx={{ fontSize: "0.9rem" }}>{catInfo.icone}</Typography>
                                    <Typography variant="caption" sx={{ color: catInfo.cor, fontWeight: 900, letterSpacing: 1.2, fontSize: "0.65rem", fontFamily: "Georgia, serif" }}>
                                      {catInfo.nome.toUpperCase()}
                                    </Typography>
                                  </Box>
                                  <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1 }}>
                                    {lista.map((ed) => {
                                      const nivel = edsSede[ed.id] || 0;
                                      const cm = commodities[ed.commodityId];
                                      const prodAtual = producaoEdificio(ed, nivel);
                                      const prodProx = producaoEdificio(ed, nivel + 1);
                                      const custoProx = nivel < 10 ? custoEdificio(ed, nivel) : 0;
                                      const temGran = isMaster || cofreSede >= custoProx;
                                      const cidadeSede = cidades[sede.id] || { pop: 0, instrucao: 0, pops: {} };
                                      const bonusInstrucao = Number(empLive.instrucaoBonusEmpresa || 0);
                                      const cidadeAjustada = {
                                        ...cidadeSede,
                                        instrucao: Math.min(100, (cidadeSede.instrucao || 0) + bonusInstrucao),
                                      };
                                      const tecsEmpresa = new Set(pesq.tecnologias || []);
                                      const bloqueadoBase = edifBloqueado(ed, cidadeAjustada, tecsEmpresa);
                                      const travado = bloqueadoBase.bloqueado && nivel === 0 && !isMaster;

                                      return (
                                        <Paper
                                          key={ed.id}
                                          sx={{
                                            p: 1.2,
                                            bgcolor: travado ? "#2a2520" : V3.paperDark,
                                            border: nivel > 0 ? `2px solid ${ed.cor}` : travado ? `1px dashed #666` : `1px solid ${V3.gold}44`,
                                            opacity: travado ? 0.55 : 1,
                                            filter: travado ? "grayscale(0.7)" : "none",
                                            borderRadius: 1.5,
                                          }}
                                        >
                                          <Box sx={{ display: "flex", alignItems: "flex-start", gap: 0.8, mb: 0.6 }}>
                                            <Box
                                              sx={{
                                                width: 32, height: 32, borderRadius: "50%",
                                                display: "flex", alignItems: "center", justifyContent: "center",
                                                bgcolor: `${ed.cor}33`, border: `2px solid ${ed.cor}`, fontSize: "1rem", flexShrink: 0,
                                              }}
                                            >
                                              {ed.icone}
                                            </Box>
                                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                              <Typography variant="body2" sx={{ color: travado ? "#888" : V3.ink, fontWeight: 900, fontSize: "0.75rem", lineHeight: 1.15 }}>
                                                {ed.nome}
                                              </Typography>
                                              <Typography variant="caption" sx={{ color: travado ? "#666" : ed.cor, fontSize: "0.55rem", fontWeight: 800 }}>
                                                {nivel > 0 ? `Nv ${nivel}/10` : "Nv 0"}
                                              </Typography>
                                            </Box>
                                          </Box>

                                          {travado ? (
                                            <Paper sx={{ p: 0.8, bgcolor: "#1a1512", border: `1px dashed #666`, textAlign: "center" }}>
                                              <Typography variant="caption" sx={{ color: "#cc8080", fontWeight: 800, fontSize: "0.6rem", display: "block" }}>
                                                🔒 BLOQUEADO
                                              </Typography>
                                              <Typography variant="caption" sx={{ color: "#999", fontSize: "0.55rem" }}>
                                                {bloqueadoBase.motivo}
                                              </Typography>
                                            </Paper>
                                          ) : (
                                            <>
                                              {nivel > 0 && (
                                                <Typography variant="caption" sx={{ color: V3.ink, opacity: 0.75, fontSize: "0.58rem", display: "block", mb: 0.5 }}>
                                                  Produz {cm?.icone} <strong>{prodAtual}</strong> {cm?.nome || ed.commodityId}
                                                </Typography>
                                              )}
                                              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                                                {nivel > 0 && (
                                                  <Button
                                                    size="small"
                                                    onClick={() => construir(sede.id, ed, -1)}
                                                    disabled={!podeEditar}
                                                    sx={{ minWidth: 24, p: 0.2, color: V3.red, fontWeight: 900, fontSize: "0.9rem" }}
                                                  >
                                                    −
                                                  </Button>
                                                )}
                                                <Box sx={{ flex: 1, height: 6, bgcolor: "rgba(0,0,0,0.2)", borderRadius: 3, overflow: "hidden" }}>
                                                  <Box sx={{ height: "100%", width: `${(nivel / 10) * 100}%`, bgcolor: ed.cor }} />
                                                </Box>
                                                {nivel < 10 && (
                                                  <Button
                                                    size="small"
                                                    onClick={() => construir(sede.id, ed, +1)}
                                                    disabled={!podeEditar || !temGran}
                                                    sx={{ minWidth: 24, p: 0.2, color: temGran ? V3.green : "#888", fontWeight: 900, fontSize: "0.9rem" }}
                                                  >
                                                    +
                                                  </Button>
                                                )}
                                              </Box>
                                              {nivel < 10 && (
                                                <Box sx={{ display: "flex", justifyContent: "space-between", mt: 0.3 }}>
                                                  <Typography variant="caption" sx={{ color: temGran ? V3.green : V3.red, fontSize: "0.55rem", fontWeight: 700 }}>
                                                    💰 {custoProx.toLocaleString("pt-BR")}
                                                  </Typography>
                                                  {nivel > 0 && (
                                                    <Typography variant="caption" sx={{ color: V3.ink, opacity: 0.6, fontSize: "0.55rem" }}>
                                                      → {prodProx} {cm?.nome || ed.commodityId}
                                                    </Typography>
                                                  )}
                                                </Box>
                                              )}
                                            </>
                                          )}
                                        </Paper>
                                      );
                                    })}
                                  </Box>
                                </Box>
                              );
                            })}
                          </AccordionDetails>
                        </Accordion>
                      );
                    })}
                  </Box>
                );
              })()}

              {empresaAba === "pesquisa" && (() => {
                const pesq = empLive.pesquisaEmpresa || { tecnologias: [], pesquisaAtual: null };
                const pesquisadas = [...(pesq.tecnologias || [])];
                const pesquisando = pesq.pesquisaAtual?.id || null;
                const cofre = empLive.cofre || 0;

                const iniciarPesquisa = async (tec) => {
                  if (!podeNaAba("pesquisa")) return;
                  if (pesquisadas.includes(tec.id)) return;
                  if (pesquisando) {
                    alert("Já existe uma pesquisa em andamento. Conclua ou cancele primeiro.");
                    return;
                  }
                  if (!isMaster && cofre < tec.custo) {
                    alert(`💰 Cofre da empresa insuficiente.\nNecessário: ${tec.custo.toLocaleString("pt-BR")}\nDisponível: ${cofre.toLocaleString("pt-BR")}`);
                    return;
                  }
                  let aceleracao = 0;
                  for (const edsSede of Object.values(empLive.edificiosPorCidade || {})) {
                    for (const [edId, nivel] of Object.entries(edsSede || {})) {
                      if (!nivel || nivel <= 0) continue;
                      const edCorp = EMPRESA_EDIFICIOS_CATALOGO.find((e) => e.id === edId);
                      if (edCorp?.efeitos?.aceleracaoPesquisa) aceleracao += edCorp.efeitos.aceleracaoPesquisa * nivel;
                    }
                  }
                  const redutor = Math.min(0.8, aceleracao);
                  const tempoEfetivo = Math.max(0.05, tec.tempoHoras * (1 - redutor));
                  const agora = Date.now();
                  const concluiEm = new Date(agora + tempoEfetivo * 60 * 60 * 1000).toISOString();
                  await setDoc(doc(db, "sim_empresas", empLive.id), {
                    cofre: isMaster ? cofre : cofre - tec.custo,
                    pesquisaEmpresa: {
                      tecnologias: pesquisadas,
                      pesquisaAtual: { id: tec.id, iniciadoEm: new Date(agora).toISOString(), concluiEm },
                    },
                    atualizadoEm: new Date().toISOString(),
                  }, { merge: true });
                  const msgAcel = redutor > 0 ? `\n⚡ Aceleração: -${Math.round(redutor * 100)}% (${tec.tempoHoras}h → ${tempoEfetivo.toFixed(1)}h)` : "";
                  alert(`🔬 Pesquisa iniciada: ${tec.nome}\nCusto: ${tec.custo.toLocaleString("pt-BR")}\nConclusão em ${tempoEfetivo.toFixed(1)}h.${msgAcel}`);
                };

                const cancelarPesquisa = async () => {
                  if (!pesquisando) return;
                  if (!window.confirm("Cancelar pesquisa em andamento? O custo NÃO é devolvido.")) return;
                  await setDoc(doc(db, "sim_empresas", empLive.id), {
                    pesquisaEmpresa: {
                      tecnologias: pesquisadas,
                      pesquisaAtual: null,
                    },
                    atualizadoEm: new Date().toISOString(),
                  }, { merge: true });
                };

                return (
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                    <Paper sx={{ p: 1.2, bgcolor: `${V3.gold}15`, border: `1px solid ${V3.gold}66`, borderRadius: 1 }}>
                      <Typography variant="caption" sx={{ color: V3.gold, fontWeight: 900, letterSpacing: 1, fontSize: "0.7rem", display: "block", mb: 0.5 }}>
                        🔬 LABORATÓRIO DA EMPRESA
                      </Typography>
                      <Typography variant="caption" sx={{ color: V3.ink, opacity: 0.65, fontSize: "0.55rem", display: "block", lineHeight: 1.5, fontStyle: "italic", mb: 1 }}>
                        Árvore de techs própria. Progresso 100% independente do país. Custo sai do <strong>cofre central</strong> da empresa. Techs liberam edifícios corporativos e aumentam a instrução efetiva.
                      </Typography>
                      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                        {(() => {
                          const instrucaoMediaSedes = sedesArr.length > 0
                            ? sedesArr.reduce((s, sed) => s + (cidades[sed.id]?.instrucao || 0), 0) / sedesArr.length
                            : 0;
                          const bonus = Number(empLive.instrucaoBonusEmpresa || 0);
                          const efetiva = Math.min(100, instrucaoMediaSedes + bonus);
                          return (
                            <>
                              <Chip
                                label={`📚 Instrução (cidade): ${instrucaoMediaSedes.toFixed(1)}%`}
                                size="small"
                                sx={{ bgcolor: V3.blue, color: V3.paper, fontSize: "0.55rem", fontWeight: 700, height: 18 }}
                              />
                              <Chip
                                label={`🔬 Bônus tech empresa: +${bonus.toFixed(1)}%`}
                                size="small"
                                sx={{ bgcolor: bonus > 0 ? V3.green : "#555", color: V3.paper, fontSize: "0.55rem", fontWeight: 700, height: 18 }}
                              />
                              <Chip
                                label={`= ${efetiva.toFixed(1)}% efetiva`}
                                size="small"
                                sx={{ bgcolor: V3.gold, color: V3.ink, fontSize: "0.55rem", fontWeight: 900, height: 18 }}
                              />
                            </>
                          );
                        })()}
                      </Box>
                    </Paper>

                    {pesquisando && (() => {
                      const tec = TECNOLOGIAS.find((t) => t.id === pesquisando);
                      const restantes = horasRestantes(pesq.pesquisaAtual);
                      const total = tec?.tempoHoras || 1;
                      const decorrido = total - restantes;
                      const pct = Math.max(0, Math.min(100, (decorrido / total) * 100));
                      return (
                        <Paper sx={{ p: 1.2, bgcolor: `${V3.gold}22`, border: `2px solid ${V3.gold}66`, borderRadius: 1 }}>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            <Typography sx={{ fontSize: "1.3rem" }}>{tec?.icone}</Typography>
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="caption" sx={{ color: V3.ink, fontWeight: 900, fontSize: "0.7rem", display: "block" }}>
                                🔬 PESQUISANDO: {tec?.nome}
                              </Typography>
                              <Box sx={{ height: 8, bgcolor: "rgba(0,0,0,0.2)", borderRadius: 4, overflow: "hidden", mt: 0.5 }}>
                                <Box sx={{ height: "100%", width: `${pct}%`, bgcolor: V3.gold, transition: "width 0.3s" }} />
                              </Box>
                            </Box>
                            <Typography variant="caption" sx={{ color: V3.ink, fontWeight: 900, fontFamily: "Georgia, serif", minWidth: 70, textAlign: "right" }}>
                              ⏱️ {formatarTempoRestante(restantes)}
                            </Typography>
                            {podeNaAba("pesquisa") && (
                              <Button size="small" onClick={cancelarPesquisa} sx={{ color: V3.red, fontSize: "0.6rem" }}>
                                Cancelar
                              </Button>
                            )}
                          </Box>
                        </Paper>
                      );
                    })()}

                    {ERAS.map((era) => (
                      <Box key={era.id}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1, pb: 0.5, borderBottom: `2px solid ${era.cor}` }}>
                          <Typography sx={{ fontSize: "1.2rem" }}>{era.icone}</Typography>
                          <Box sx={{ flex: 1 }}>
                            <Typography sx={{ color: era.cor, fontWeight: 900, fontFamily: "Georgia, serif", fontSize: "0.85rem", letterSpacing: 0.5 }}>
                              {era.nome}
                            </Typography>
                            <Typography variant="caption" sx={{ color: V3.ink, opacity: 0.6, fontSize: "0.55rem" }}>
                              {era.desc}
                            </Typography>
                          </Box>
                          <Chip
                            label={`${tecnologiasDaEra(era.id).filter((t) => pesquisadas.includes(t.id)).length}/${tecnologiasDaEra(era.id).length}`}
                            size="small"
                            sx={{ bgcolor: era.cor, color: "#fff", fontWeight: 900, fontSize: "0.55rem", height: 18 }}
                          />
                        </Box>
                        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1 }}>
                          {tecnologiasDaEra(era.id).map((tec) => {
                            const jaPesq = pesquisadas.includes(tec.id);
                            const emPesq = pesquisando === tec.id;
                            const disponivel = tecDisponivel(tec, pesquisadas);
                            const travado = !disponivel && !jaPesq;
                            const semCofre = cofre < tec.custo;

                            return (
                              <Paper
                                key={tec.id}
                                sx={{
                                  p: 1.2,
                                  bgcolor: jaPesq ? `${V3.green}15` : travado ? "#2a2520" : V3.paperDark,
                                  border: jaPesq ? `2px solid ${V3.green}` : emPesq ? `2px solid ${V3.gold}` : travado ? `1px dashed #666` : `1px solid ${era.cor}44`,
                                  opacity: travado ? 0.55 : 1,
                                  filter: travado ? "grayscale(0.6)" : "none",
                                  transition: "all 0.15s",
                                  borderRadius: 1,
                                }}
                              >
                                <Box sx={{ display: "flex", alignItems: "flex-start", gap: 0.8, mb: 0.6 }}>
                                  <Box
                                    sx={{
                                      width: 34, height: 34, borderRadius: "50%",
                                      display: "flex", alignItems: "center", justifyContent: "center",
                                      bgcolor: `${era.cor}33`, border: `2px solid ${era.cor}`,
                                      fontSize: "1.1rem", flexShrink: 0,
                                    }}
                                  >
                                    {tec.icone}
                                  </Box>
                                  <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <Typography variant="body2" sx={{ color: travado ? "#888" : V3.ink, fontWeight: 900, fontFamily: "Georgia, serif", fontSize: "0.75rem", lineHeight: 1.15 }}>
                                      {tec.nome}
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: travado ? "#666" : V3.ink, opacity: 0.6, fontSize: "0.55rem", display: "block", lineHeight: 1.2, mt: 0.2 }}>
                                      {tec.desc}
                                    </Typography>
                                  </Box>
                                  {jaPesq && <Chip label="✓" size="small" sx={{ bgcolor: V3.green, color: "#fff", fontWeight: 900, fontSize: "0.5rem", height: 16, minWidth: 18 }} />}
                                  {emPesq && <Chip label="🔬" size="small" sx={{ bgcolor: V3.gold, color: V3.ink, fontWeight: 900, fontSize: "0.5rem", height: 16, minWidth: 18 }} />}
                                </Box>

                                {tec.requer.length > 0 && (
                                  <Typography variant="caption" sx={{ color: V3.ink, opacity: 0.6, fontSize: "0.5rem", display: "block", mb: 0.5 }}>
                                    Requer: {tec.requer.map((r) => TECNOLOGIAS.find((t) => t.id === r)?.nome).join(", ")}
                                  </Typography>
                                )}

                                {!jaPesq && !emPesq && (
                                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                                    <Typography variant="caption" sx={{ color: semCofre ? V3.red : V3.green, fontSize: "0.6rem", fontWeight: 800, flex: 1 }}>
                                      💰 {tec.custo.toLocaleString("pt-BR")} • ⏱️ {tec.tempoHoras}h
                                    </Typography>
                                    <Button
                                      size="small"
                                      onClick={() => iniciarPesquisa(tec)}
                                      disabled={!podeNaAba("pesquisa") || !!pesquisando || (!isMaster && (travado || semCofre))}
                                      sx={{
                                        bgcolor: travado || semCofre ? "#444" : V3.gold,
                                        color: V3.ink,
                                        fontWeight: 900,
                                        fontSize: "0.55rem",
                                        fontFamily: "Georgia, serif",
                                        py: 0.2,
                                        px: 0.8,
                                        minWidth: 0,
                                        "&:hover": { bgcolor: V3.goldLight },
                                      }}
                                    >
                                      🔬 Pesquisar
                                    </Button>
                                  </Box>
                                )}
                              </Paper>
                            );
                          })}
                        </Box>
                      </Box>
                    ))}
                  </Box>
                );
              })()}

              {empresaAba === "cofre" && (() => {
                const sedesCofres = empLive.sedesCofres || {};
                const totalSedes = sedesArr.reduce((s, sed) => s + Number(sedesCofres[sed.id] || 0), 0);
                const totalGeral = Number(empLive.cofre || 0) + totalSedes;
                const categoriaTrib = empLive.categoria === "$$$" ? 5 : empLive.categoria === "$$" ? 3 : 1;
                return (
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                    <Paper sx={{ p: 1.5, bgcolor: V3.paperDark, border: `2px solid ${V3.green}66`, borderRadius: 1 }}>
                      <Typography variant="caption" sx={{ color: V3.green, fontWeight: 900, letterSpacing: 1, fontSize: "0.7rem", display: "block", mb: 0.5 }}>
                        💰 COFRE CENTRAL DA EMPRESA
                      </Typography>
                      <Typography variant="caption" sx={{ color: V3.ink, opacity: 0.6, fontSize: "0.55rem", display: "block", mb: 1, fontStyle: "italic" }}>
                        Cofre da empresa-mãe. Cada sede também tem cofre próprio (abaixo).
                      </Typography>
                      {podeNaAba("cofre") ? (
                        <MoedaInput
                          valor={Number(empLive.cofre || 0)}
                          onSalvar={(v) =>
                            setDoc(
                              doc(db, "sim_empresas", empLive.id),
                              { cofre: v, atualizadoEm: new Date().toISOString() },
                              { merge: true }
                            )
                          }
                          cor={Number(empLive.cofre || 0) < 0 ? V3.red : V3.ink}
                        />
                      ) : (
                        <Typography sx={{ color: Number(empLive.cofre || 0) < 0 ? V3.red : V3.ink, fontWeight: 900, fontFamily: "Georgia, serif", fontSize: "1.2rem" }}>
                          💰 {Number(empLive.cofre || 0).toLocaleString("pt-BR")}
                        </Typography>
                      )}
                      {Number(empLive.cofre || 0) < 0 && (() => {
                        const valor = Number(empLive.valor || 0);
                        const pct = valor > 0 ? Math.min(100, Math.abs(Number(empLive.cofre || 0)) / valor * 100) : 0;
                        return (
                          <Box sx={{ mt: 0.8 }}>
                            <Box sx={{ height: 8, bgcolor: "rgba(0,0,0,0.15)", borderRadius: 4, overflow: "hidden", border: `1px solid ${V3.red}66` }}>
                              <Box sx={{ height: "100%", width: `${pct}%`, bgcolor: V3.red, transition: "width 0.3s" }} />
                            </Box>
                            <Typography variant="caption" sx={{ color: V3.red, fontWeight: 800, fontSize: "0.55rem", display: "block", mt: 0.3 }}>
                              Dívida: {pct.toFixed(0)}% do valor · Falência em {valor.toLocaleString("pt-BR")}
                            </Typography>
                          </Box>
                        );
                      })()}
                    </Paper>

                    <Paper sx={{ p: 1.5, bgcolor: V3.paperDark, border: `1px solid ${V3.blue}66`, borderRadius: 1 }}>
                      <Typography variant="caption" sx={{ color: V3.blue, fontWeight: 900, letterSpacing: 1, fontSize: "0.7rem", display: "block", mb: 0.5 }}>
                        🏛️ COFRE POR SEDE ({sedesArr.length})
                      </Typography>
                      <Typography variant="caption" sx={{ color: V3.ink, opacity: 0.6, fontSize: "0.55rem", display: "block", mb: 1, fontStyle: "italic" }}>
                        Cada sede tem cofre próprio. Cada uma contribui pra central via tributo interno (implementação futura).
                      </Typography>
                      {sedesArr.length === 0 ? (
                        <Typography variant="caption" sx={{ color: V3.ink, opacity: 0.6, fontSize: "0.65rem" }}>
                          Nenhuma sede cadastrada. Edite a empresa pra adicionar.
                        </Typography>
                      ) : (
                        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.8 }}>
                          {sedesArr.map((s) => {
                            const cofreSede = Number(sedesCofres[s.id] || 0);
                            return (
                              <Box key={s.id} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                <Typography variant="caption" sx={{ color: V3.ink, fontWeight: 800, fontSize: "0.7rem", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                  🏙️ {s.nome}
                                </Typography>
                                {podeNaAba("cofre") ? (
                                  <MoedaInput
                                    valor={cofreSede}
                                    onSalvar={(v) => {
                                      const novos = { ...sedesCofres, [s.id]: v };
                                      setDoc(
                                        doc(db, "sim_empresas", empLive.id),
                                        { sedesCofres: novos, atualizadoEm: new Date().toISOString() },
                                        { merge: true }
                                      );
                                    }}
                                    cor={cofreSede < 0 ? V3.red : V3.ink}
                                    largura={140}
                                  />
                                ) : (
                                  <Typography sx={{ color: V3.green, fontWeight: 900, fontFamily: "Georgia, serif", fontSize: "0.85rem" }}>
                                    💰 {cofreSede.toLocaleString("pt-BR")}
                                  </Typography>
                                )}
                              </Box>
                            );
                          })}
                        </Box>
                      )}
                    </Paper>

                    <Paper sx={{ p: 1.2, bgcolor: V3.paperDark, border: `1px solid ${V3.gold}66`, borderRadius: 1 }}>
                      <Typography variant="caption" sx={{ color: V3.gold, fontWeight: 900, letterSpacing: 1, fontSize: "0.65rem", display: "block", mb: 0.5 }}>
                        📊 FATURAMENTO E EVOLUÇÃO
                      </Typography>
                      <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0.8 }}>
                        <Box>
                          <Typography variant="caption" sx={{ color: V3.ink, opacity: 0.7, fontSize: "0.55rem", display: "block" }}>Nível Atual</Typography>
                          <Typography sx={{ color: V3.ink, fontFamily: "Georgia, serif", fontWeight: 900, fontSize: "0.95rem" }}>
                            Nv {empLive.nivelEmpresa || 1}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" sx={{ color: V3.ink, opacity: 0.7, fontSize: "0.55rem", display: "block" }}>XP Acumulado</Typography>
                          <Typography sx={{ color: V3.ink, fontFamily: "Georgia, serif", fontWeight: 900, fontSize: "0.95rem" }}>
                            {Number(empLive.xpEmpresa || 0).toLocaleString("pt-BR")}
                          </Typography>
                        </Box>
                      </Box>
                      <Divider sx={{ my: 0.8, borderColor: `${V3.gold}22` }} />
                      <Typography variant="caption" sx={{ color: V3.ink, opacity: 0.65, fontSize: "0.55rem", display: "block", lineHeight: 1.5 }}>
                        XP é ganho a cada ciclo: <strong>faturamento bruto ÷ 1000</strong>. Cada nível exige <strong>Nv × 1000 XP</strong>.
                      </Typography>
                      {empLive.ultimaManutencaoPendente > 0 && (
                        <Typography variant="caption" sx={{ color: V3.red, fontWeight: 800, fontSize: "0.6rem", display: "block", mt: 0.6 }}>
                          ⚠️ Manutenção pendente: 💰 {Number(empLive.ultimaManutencaoPendente).toLocaleString("pt-BR")} (cofre da sede não cobriu)
                        </Typography>
                      )}
                    </Paper>

                    <Paper sx={{ p: 1.5, bgcolor: V3.paperDark, border: `1px solid ${V3.blue}66`, borderRadius: 1 }}>
                      <Typography variant="caption" sx={{ color: V3.blue, fontWeight: 900, letterSpacing: 1, fontSize: "0.7rem", display: "block", mb: 0.5 }}>
                        🔁 CONTRIBUIÇÃO DAS SEDES À CENTRAL
                      </Typography>
                      <Typography variant="caption" sx={{ color: V3.ink, opacity: 0.6, fontSize: "0.55rem", display: "block", mb: 1, fontStyle: "italic" }}>
                        Cada sede envia esta % do próprio cofre pra central a cada ciclo. 0% = desativado.
                      </Typography>
                      {podeNaAba("cofre") ? (
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <input
                            type="range" min="0" max="100" step="5"
                            value={Math.round((Number.isFinite(empLive.taxaContribuicaoSede) ? empLive.taxaContribuicaoSede : 0.20) * 100)}
                            onChange={(e) => {
                              const v = Number(e.target.value) / 100;
                              setDoc(doc(db, "sim_empresas", empLive.id), {
                                taxaContribuicaoSede: v,
                                atualizadoEm: new Date().toISOString(),
                              }, { merge: true });
                            }}
                            style={{ flex: 1, accentColor: V3.blue }}
                          />
                          <Typography sx={{ color: V3.blue, fontWeight: 900, fontFamily: "Georgia, serif", minWidth: 46, textAlign: "right" }}>
                            {Math.round((Number.isFinite(empLive.taxaContribuicaoSede) ? empLive.taxaContribuicaoSede : 0.20) * 100)}%
                          </Typography>
                        </Box>
                      ) : (
                        <Typography sx={{ color: V3.blue, fontWeight: 900, fontFamily: "Georgia, serif", fontSize: "1rem" }}>
                          {Math.round((Number.isFinite(empLive.taxaContribuicaoSede) ? empLive.taxaContribuicaoSede : 0.20) * 100)}%
                        </Typography>
                      )}
                      {empLive.ultimaContribuicaoSede > 0 && (
                        <Typography variant="caption" sx={{ color: V3.green, fontWeight: 800, fontSize: "0.6rem", display: "block", mt: 0.6 }}>
                          Último ciclo: 💰 {Number(empLive.ultimaContribuicaoSede).toLocaleString("pt-BR")} recebidos das sedes.
                        </Typography>
                      )}
                    </Paper>

                    <Paper sx={{ p: 1.2, bgcolor: `${V3.gold}15`, border: `1px dashed ${V3.gold}66`, borderRadius: 1 }}>
                      <Typography variant="caption" sx={{ color: V3.gold, fontWeight: 900, letterSpacing: 1, fontSize: "0.65rem", display: "block", mb: 0.5 }}>
                        💎 TOTAL CONSOLIDADO
                      </Typography>
                      <Typography sx={{ color: V3.ink, fontFamily: "Georgia, serif", fontWeight: 900, fontSize: "1rem" }}>
                        💰 {totalGeral.toLocaleString("pt-BR")}
                      </Typography>
                      <Typography variant="caption" sx={{ color: V3.ink, opacity: 0.65, fontSize: "0.55rem", display: "block", mt: 0.5 }}>
                        Central: 💰 {Number(empLive.cofre || 0).toLocaleString("pt-BR")} + Sedes: 💰 {totalSedes.toLocaleString("pt-BR")}
                      </Typography>
                    </Paper>

                    <Paper sx={{ p: 1.2, bgcolor: V3.paperDark, border: `1px solid ${V3.blue}44`, borderRadius: 1 }}>
                      <Typography variant="caption" sx={{ color: V3.blue, fontWeight: 900, letterSpacing: 1, fontSize: "0.65rem", display: "block", mb: 0.5 }}>
                        🌍 TRIBUTO À CIDADE-SEDE
                      </Typography>
                      <Typography variant="caption" sx={{ color: V3.ink, opacity: 0.7, fontSize: "0.6rem", display: "block", lineHeight: 1.5 }}>
                        Categoria <strong>{empLive.categoria || "$"}</strong> → <strong>{categoriaTrib}%</strong> sobre o faturamento por ciclo vai pra cidade-sede.<br />
                        <em style={{ opacity: 0.7 }}>Próximo (F2.B): cálculo automático no ciclo econômico.</em>
                      </Typography>
                    </Paper>
                  </Box>
                );
              })()}

              {empresaAba === "equipe" && (() => {
                const equipe = empLive.equipe || [];
                const cfgCargos = criarCfgCargosEmpresa(empLive);
                const disponiveis = cargosDisponiveisParaEmpresa(empLive);
                const podeGerir = podeNaAba("equipe");

                const contratar = async (cargoId, tipo, holderEmail, nomeLivre, salarioCustom) => {
                  if (!podeGerir) return;
                  const cargo = getCargoEmpresa(cargoId);
                  if (!cargo) return;
                  const salario = Math.max(0, Number(salarioCustom) || 0);
                  const novo = {
                    id: `eq_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
                    cargoId,
                    cargoNome: cargo.nome,
                    icone: cargo.icone,
                    tipo,
                    holderEmail: tipo === "pj" ? (holderEmail || "") : "",
                    nomeLivre: tipo === "npc" ? (nomeLivre || "NPC") : "",
                    nome: tipo === "pj"
                      ? (fichasDisponiveis?.[holderEmail]?.nome || holderEmail)
                      : (nomeLivre || "NPC"),
                    salario,
                    acessos: [...(cargo.acessos || [])],
                    contratadoEm: new Date().toISOString(),
                  };
                  await setDoc(doc(db, "sim_empresas", empLive.id), {
                    equipe: [...equipe, novo],
                    atualizadoEm: new Date().toISOString(),
                  }, { merge: true });
                };

                const demitir = async (membroId) => {
                  if (!podeGerir) return;
                  const m = equipe.find((x) => x.id === membroId);
                  if (!m) return;
                  const multa = calcularMultaRescisoria(m, empLive);
                  const sedesArr2 = Array.isArray(empLive.sedes) ? empLive.sedes : (empLive.sede ? [empLive.sede] : []);
                  const primeiraSede = sedesArr2[0];
                  const cofreAtual = primeiraSede ? Number((empLive.sedesCofres || {})[primeiraSede.id] || 0) : 0;
                  const multaMsg = multa > 0 ? `\n💸 Multa rescisória: 💰 ${multa.toLocaleString("pt-BR")}` : "";
                  const semCofreMsg = multa > cofreAtual ? `\n⚠️ Cofre da sede só tem 💰 ${cofreAtual.toLocaleString("pt-BR")} — ficará pendente.` : "";
                  if (!window.confirm(`Demitir "${m.nome}" (${m.cargoNome})?${multaMsg}${semCofreMsg}`)) return;
                  const novosCofres = { ...(empLive.sedesCofres || {}) };
                  if (primeiraSede && multa > 0) {
                    const pagoMulta = Math.min(multa, cofreAtual);
                    novosCofres[primeiraSede.id] = cofreAtual - pagoMulta;
                  }
                  await setDoc(doc(db, "sim_empresas", empLive.id), {
                    equipe: equipe.filter((x) => x.id !== membroId),
                    sedesCofres: novosCofres,
                    atualizadoEm: new Date().toISOString(),
                  }, { merge: true });
                };

                const trocarAcesso = async (membroId, aba) => {
                  if (!podeGerir) return;
                  const novas = equipe.map((m) => {
                    if (m.id !== membroId) return m;
                    const a = m.acessos || [];
                    return { ...m, acessos: a.includes(aba) ? a.filter((x) => x !== aba) : [...a, aba] };
                  });
                  await setDoc(doc(db, "sim_empresas", empLive.id), {
                    equipe: novas,
                    atualizadoEm: new Date().toISOString(),
                  }, { merge: true });
                };

                const folhaSalarial = equipe.reduce((s, m) => s + (m.salario || 0), 0);
                const cargosAtivos = disponiveis.filter((c) => cfgCargos[c.id]?.ativo);

                return (
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                    <Paper sx={{ p: 1.2, bgcolor: `${V3.blue}15`, border: `1px solid ${V3.blue}66`, borderRadius: 1 }}>
                      <Typography variant="caption" sx={{ color: V3.blue, fontWeight: 900, letterSpacing: 1, fontSize: "0.7rem", display: "block", mb: 0.5 }}>
                        👥 EQUIPE / FUNCIONÁRIOS ({equipe.length})
                      </Typography>
                      <Typography variant="caption" sx={{ color: V3.ink, opacity: 0.65, fontSize: "0.55rem", display: "block", fontStyle: "italic" }}>
                        Folha salarial: 💰 {folhaSalarial.toLocaleString("pt-BR")}/ciclo · sai do cofre da <strong>primeira sede</strong>.
                        {' '}Configure os cargos na aba <strong>⚙️ Config</strong>.
                      </Typography>
                    </Paper>

                    {!podeGerir && (
                      <Paper sx={{ p: 1.2, bgcolor: `${V3.red}15`, border: `1px dashed ${V3.red}66`, borderRadius: 1, textAlign: "center" }}>
                        <Typography variant="caption" sx={{ color: V3.red, fontWeight: 800, fontSize: "0.65rem" }}>
                          🔒 Só o dono, o Mestre e membros com acesso à Equipe podem gerenciar.
                        </Typography>
                      </Paper>
                    )}

                    {!isMaster && !ehDono && (() => {
                      const meu = equipe.find((m) => m.holderEmail === userEmail);
                      if (!meu) return null;
                      return (
                        <Paper sx={{ p: 1.2, bgcolor: `${V3.green}15`, border: `2px solid ${V3.green}66`, borderRadius: 1 }}>
                          <Typography variant="caption" sx={{ color: V3.green, fontWeight: 900, letterSpacing: 1, fontSize: "0.65rem", display: "block", mb: 0.5 }}>
                            SEU CARGO
                          </Typography>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.8 }}>
                            <Typography sx={{ fontSize: "1.2rem" }}>{meu.icone}</Typography>
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="body2" sx={{ color: V3.ink, fontWeight: 900, fontFamily: "Georgia, serif", fontSize: "0.8rem" }}>
                                {meu.cargoNome}
                              </Typography>
                              <Typography variant="caption" sx={{ color: V3.ink, opacity: 0.65, fontSize: "0.55rem" }}>
                                💰 {meu.salario}/ciclo • acessos: {(meu.acessos || []).map((a) => ACESSOS_LABEL[a] || a).join(", ")}
                              </Typography>
                            </Box>
                          </Box>
                        </Paper>
                      );
                    })()}

                    {cargosAtivos.length === 0 ? (
                      <Paper sx={{ p: 2, bgcolor: V3.paperDark, border: `1px dashed ${V3.gold}44`, borderRadius: 1, textAlign: "center" }}>
                        <Typography variant="caption" sx={{ color: V3.ink, opacity: 0.6, fontSize: "0.65rem" }}>
                          Nenhum cargo ativo. Ative cargos na aba ⚙️ Config.
                        </Typography>
                      </Paper>
                    ) : (
                      cargosAtivos.map((cargo) => {
                        const cfg = cfgCargos[cargo.id];
                        const membros = equipe.filter((m) => m.cargoId === cargo.id);
                        const cheio = membros.length >= cfg.quantidade;
                        return (
                          <Accordion
                            key={cargo.id}
                            defaultExpanded={membros.length > 0}
                            disableGutters
                            sx={{
                              bgcolor: V3.paperDark,
                              border: `1px solid ${cheio ? V3.red : V3.gold}66`,
                              "&:before": { display: "none" },
                              borderRadius: 1,
                              overflow: "hidden",
                            }}
                          >
                            <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: V3.ink }} />} sx={{ bgcolor: `${cheio ? V3.red : V3.gold}22`, minHeight: 44 }}>
                              <Box sx={{ display: "flex", alignItems: "center", gap: 0.8, width: "100%" }}>
                                <Typography sx={{ fontSize: "1.2rem" }}>{cfg.icone}</Typography>
                                <Typography sx={{ flex: 1, color: V3.ink, fontWeight: 900, fontFamily: "Georgia, serif", fontSize: "0.8rem" }}>
                                  {cfg.nome}
                                </Typography>
                                <Chip
                                  label={`${membros.length}/${cfg.quantidade}`}
                                  size="small"
                                  sx={{ bgcolor: cheio ? V3.red : V3.green, color: "#fff", fontWeight: 800, fontSize: "0.55rem", height: 18 }}
                                />
                                <Chip
                                  label={`💰 ${cfg.salario}/ciclo`}
                                  size="small"
                                  sx={{ bgcolor: V3.ink, color: V3.gold, fontWeight: 700, fontSize: "0.5rem", height: 16 }}
                                />
                              </Box>
                            </AccordionSummary>
                            <AccordionDetails sx={{ p: 1 }}>
                              {membros.length === 0 ? (
                                <Typography variant="caption" sx={{ color: V3.ink, opacity: 0.55, fontSize: "0.65rem", fontStyle: "italic", display: "block", mb: 0.8 }}>
                                  Nenhum contratado neste cargo.
                                </Typography>
                              ) : (
                                <Box sx={{ display: "flex", flexDirection: "column", gap: 0.6, mb: 1 }}>
                                  {membros.map((m) => (
                                    <Paper key={m.id} sx={{ p: 1, bgcolor: V3.paper, border: `1px solid ${m.tipo === "pj" ? V3.gold : V3.blue}66`, borderRadius: 1 }}>
                                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.8, mb: 0.4 }}>
                                        <Typography sx={{ fontSize: "1.1rem" }}>{m.icone}</Typography>
                                        <Box sx={{ flex: 1, minWidth: 0 }}>
                                          <Typography variant="body2" sx={{ color: V3.ink, fontWeight: 900, fontFamily: "Georgia, serif", fontSize: "0.75rem" }}>
                                            {m.nome}
                                          </Typography>
                                          <Typography variant="caption" sx={{ color: V3.ink, opacity: 0.7, fontSize: "0.55rem", display: "block" }}>
                                            💰 {m.salario}/ciclo
                                          </Typography>
                                        </Box>
                                        <Chip
                                          label={m.tipo === "pj" ? "🎮 PJ" : "🤖 NPC"}
                                          size="small"
                                          sx={{ bgcolor: m.tipo === "pj" ? V3.gold : V3.blue, color: m.tipo === "pj" ? V3.ink : V3.paper, fontWeight: 800, fontSize: "0.5rem", height: 16 }}
                                        />
                                        {podeGerir && (
                                          <Button
                                            size="small"
                                            onClick={() => demitir(m.id)}
                                            sx={{ minWidth: 0, p: 0.3, color: V3.red, fontSize: "0.6rem", fontWeight: 900 }}
                                            title="Demitir"
                                          >
                                            ✕
                                          </Button>
                                        )}
                                      </Box>
                                      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.3 }}>
                                        {Object.entries(ACESSOS_LABEL).map(([id, label]) => {
                                          const ativo = (m.acessos || []).includes(id);
                                          return (
                                            <Chip
                                              key={id}
                                              label={label}
                                              size="small"
                                              onClick={() => podeGerir && trocarAcesso(m.id, id)}
                                              sx={{
                                                bgcolor: ativo ? `${V3.green}44` : `${V3.ink}22`,
                                                color: ativo ? V3.ink : `${V3.ink}88`,
                                                border: `1px solid ${ativo ? V3.green : V3.ink}44`,
                                                fontWeight: ativo ? 900 : 600,
                                                fontSize: "0.5rem",
                                                height: 16,
                                                cursor: podeGerir ? "pointer" : "default",
                                              }}
                                            />
                                          );
                                        })}
                                      </Box>
                                    </Paper>
                                  ))}
                                </Box>
                              )}

                              {podeGerir && !cheio && (
                                <ContratarCargo
                                  cargo={{ ...cargo, ...cfg, acessos: cfg.acessos || cargo.acessos }}
                                  salarioBase={cfg.salario}
                                  fichasDisponiveis={fichasDisponiveis || fichasMap || {}}
                                  onContratar={(tipo, holderEmail, nomeLivre, salario) =>
                                    contratar(cargo.id, tipo, holderEmail, nomeLivre, salario)
                                  }
                                />
                              )}
                              {podeGerir && cheio && (
                                <Paper sx={{ p: 0.8, bgcolor: `${V3.red}15`, border: `1px dashed ${V3.red}66`, borderRadius: 1, textAlign: "center" }}>
                                  <Typography variant="caption" sx={{ color: V3.red, fontWeight: 800, fontSize: "0.6rem" }}>
                                    ⚠️ Cargo cheio ({membros.length}/{cfg.quantidade}). Aumente as vagas na aba ⚙️ Config.
                                  </Typography>
                                </Paper>
                              )}
                            </AccordionDetails>
                          </Accordion>
                        );
                      })
                    )}
                  </Box>
                );
              })()}

              {empresaAba === "config" && (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                  {!podeNaAba("config") ? (
                    <Paper sx={{ p: 2, bgcolor: `${V3.red}15`, border: `1px dashed ${V3.red}66`, borderRadius: 1, textAlign: "center" }}>
                      <Typography variant="caption" sx={{ color: V3.red, fontWeight: 800, fontSize: "0.7rem" }}>
                        🔒 Só o dono, o Mestre e membros com acesso à Config podem alterar.
                      </Typography>
                    </Paper>
                  ) : (
                    <>
                      <Paper sx={{ p: 1.5, bgcolor: V3.paperDark, border: `1px solid ${V3.blue}66`, borderRadius: 1 }}>
                        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, mb: 0.5, flexWrap: "wrap" }}>
                          <Typography variant="caption" sx={{ color: V3.blue, fontWeight: 900, letterSpacing: 1, fontSize: "0.7rem" }}>
                            👥 CONFIGURAÇÃO DE CARGOS
                          </Typography>
                          <Button
                            size="small"
                            onClick={() => {
                              const novo = criarCargoCustom();
                              const atuais = Array.isArray(empLive.cargosCustom) ? empLive.cargosCustom : [];
                              setDoc(doc(db, "sim_empresas", empLive.id), {
                                cargosCustom: [...atuais, novo],
                                atualizadoEm: new Date().toISOString(),
                              }, { merge: true });
                            }}
                            sx={{
                              bgcolor: V3.green,
                              color: "#fff",
                              fontWeight: 800,
                              fontSize: "0.6rem",
                              textTransform: "none",
                              py: 0.3,
                              px: 0.9,
                              "&:hover": { bgcolor: "#3a5a2a" },
                            }}
                          >
                            ➕ Adicionar Cargo
                          </Button>
                        </Box>
                        <Typography variant="caption" sx={{ color: V3.ink, opacity: 0.6, fontSize: "0.55rem", display: "block", mb: 1, fontStyle: "italic" }}>
                          Personalize nome, ícone, vagas, salário e permissões. Cargos <strong>CUSTOM</strong> podem ser excluídos (🗑️).
                        </Typography>

                        {(() => {
                          const cfg = criarCfgCargosEmpresa(empLive);
                          const disponiveis = cargosDisponiveisParaEmpresa(empLive);
                          const setCargo = (cargoId, patch) => {
                            const novo = { ...cfg, [cargoId]: { ...cfg[cargoId], ...patch } };
                            setDoc(doc(db, "sim_empresas", empLive.id), {
                              configCargos: novo,
                              atualizadoEm: new Date().toISOString(),
                            }, { merge: true });
                          };
                          const resetarCargo = (cargoId) => {
                            const novo = { ...cfg };
                            delete novo[cargoId];
                            setDoc(doc(db, "sim_empresas", empLive.id), {
                              configCargos: novo,
                              atualizadoEm: new Date().toISOString(),
                            }, { merge: true });
                          };

                          if (disponiveis.length === 0) {
                            return (
                              <Typography variant="caption" sx={{ color: V3.ink, opacity: 0.6, fontSize: "0.6rem" }}>
                                Nenhum cargo disponível para o tamanho/ramos desta empresa.
                              </Typography>
                            );
                          }

                          return (
                            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.6 }}>
                              {disponiveis.map((c) => {
                                const atual = cfg[c.id];
                                const ocupados = (empLive.equipe || []).filter((m) => m.cargoId === c.id).length;
                                const cheio = ocupados >= atual.quantidade;
                                return (
                                  <Accordion
                                    key={c.id}
                                    disableGutters
                                    sx={{
                                      bgcolor: V3.paper,
                                      border: `1px solid ${atual.ativo ? V3.gold : "#aaa"}44`,
                                      opacity: atual.ativo ? 1 : 0.6,
                                      "&:before": { display: "none" },
                                      borderRadius: 1,
                                      overflow: "hidden",
                                    }}
                                  >
                                    <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: V3.ink }} />} sx={{ minHeight: 40 }}>
                                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.8, width: "100%" }}>
                                        <Checkbox
                                          size="small"
                                          checked={atual.ativo}
                                          onChange={(e) => { e.stopPropagation(); setCargo(c.id, { ativo: e.target.checked }); }}
                                          onClick={(e) => e.stopPropagation()}
                                          sx={{ p: 0.3, color: V3.gold, "&.Mui-checked": { color: V3.gold } }}
                                        />
                                        <Typography sx={{ fontSize: "1.1rem" }}>{atual.icone}</Typography>
                                        <Typography sx={{ color: V3.ink, fontWeight: 900, fontFamily: "Georgia, serif", fontSize: "0.75rem", flex: 1 }}>
                                          {atual.nome}
                                        </Typography>
                                        {atual.custom && (
                                          <Chip
                                            label="CUSTOM"
                                            size="small"
                                            sx={{ bgcolor: V3.blue, color: "#fff", fontWeight: 900, fontSize: "0.4rem", height: 14, letterSpacing: 0.5 }}
                                          />
                                        )}
                                        <Chip
                                          label={`${ocupados}/${atual.quantidade}`}
                                          size="small"
                                          sx={{ bgcolor: cheio ? V3.red : V3.green, color: "#fff", fontWeight: 800, fontSize: "0.5rem", height: 16 }}
                                        />
                                        <Chip
                                          label={`💰 ${atual.salario}/c`}
                                          size="small"
                                          sx={{ bgcolor: V3.ink, color: V3.gold, fontWeight: 700, fontSize: "0.5rem", height: 16 }}
                                        />
                                        {atual.custom && (
                                          <Button
                                            size="small"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              e.preventDefault();
                                              const membros = (empLive.equipe || []).filter((m) => m.cargoId === c.id);
                                              if (membros.length > 0) {
                                                alert(`⚠️ Não é possível excluir "${atual.nome}".\n${membros.length} funcionário(s) ocupam este cargo. Demita-os primeiro.`);
                                                return;
                                              }
                                              if (!window.confirm(`Excluir o cargo "${atual.nome}"? Sem volta.`)) return;
                                              const customs = (empLive.cargosCustom || []).filter((x) => x.id !== c.id);
                                              const novoCfg = { ...(empLive.configCargos || {}) };
                                              delete novoCfg[c.id];
                                              setDoc(doc(db, "sim_empresas", empLive.id), {
                                                cargosCustom: customs,
                                                configCargos: novoCfg,
                                                atualizadoEm: new Date().toISOString(),
                                              }, { merge: true });
                                            }}
                                            sx={{
                                              minWidth: 0,
                                              p: 0.3,
                                              color: V3.red,
                                              fontSize: "0.7rem",
                                              fontWeight: 900,
                                              "&:hover": { bgcolor: `${V3.red}22` },
                                            }}
                                            title="Excluir cargo customizado"
                                          >
                                            🗑️
                                          </Button>
                                        )}
                                      </Box>
                                    </AccordionSummary>
                                    <AccordionDetails sx={{ p: 1, bgcolor: `${V3.gold}11` }}>
                                      <Box sx={{ display: "flex", gap: 0.8, alignItems: "center", mb: 0.8, flexWrap: "wrap" }}>
                                        <Typography variant="caption" sx={{ color: V3.ink, fontWeight: 700, fontSize: "0.6rem", minWidth: 50 }}>
                                          Ícone:
                                        </Typography>
                                        <TextField
                                          size="small"
                                          value={atual.icone}
                                          onChange={(e) => setCargo(c.id, { icone: e.target.value.slice(0, 3) })}
                                          sx={{ bgcolor: "#fff", width: 60 }}
                                          InputProps={{ sx: { color: V3.ink, fontSize: "0.9rem", textAlign: "center" } }}
                                        />
                                        <Typography variant="caption" sx={{ color: V3.ink, fontWeight: 700, fontSize: "0.6rem", ml: 1 }}>
                                          Nome:
                                        </Typography>
                                        <TextField
                                          size="small"
                                          value={atual.nome}
                                          onChange={(e) => setCargo(c.id, { nome: e.target.value })}
                                          sx={{ bgcolor: "#fff", flex: 1, minWidth: 140 }}
                                          InputProps={{ sx: { color: V3.ink, fontSize: "0.75rem" } }}
                                        />
                                      </Box>

                                      <Box sx={{ display: "flex", gap: 0.8, alignItems: "center", mb: 0.8, flexWrap: "wrap" }}>
                                        <Typography variant="caption" sx={{ color: V3.ink, fontWeight: 700, fontSize: "0.6rem", minWidth: 50 }}>
                                          Vagas:
                                        </Typography>
                                        <TextField
                                          type="number"
                                          size="small"
                                          value={atual.quantidade}
                                          onChange={(e) => setCargo(c.id, { quantidade: Math.max(0, Number(e.target.value) || 0) })}
                                          sx={{ bgcolor: "#fff", width: 80 }}
                                          InputProps={{ sx: { color: V3.ink, fontSize: "0.75rem" } }}
                                        />
                                        <Typography variant="caption" sx={{ color: V3.ink, fontWeight: 700, fontSize: "0.6rem", ml: 1 }}>
                                          Salário:
                                        </Typography>
                                        <TextField
                                          type="number"
                                          size="small"
                                          value={atual.salario}
                                          onChange={(e) => setCargo(c.id, { salario: Math.max(0, Number(e.target.value) || 0) })}
                                          sx={{ bgcolor: "#fff", width: 110 }}
                                          InputProps={{ sx: { color: V3.ink, fontSize: "0.75rem" } }}
                                        />
                                        <Typography variant="caption" sx={{ color: V3.ink, opacity: 0.5, fontSize: "0.55rem" }}>
                                          /ciclo
                                        </Typography>
                                      </Box>

                                      <Typography variant="caption" sx={{ color: V3.ink, fontWeight: 700, fontSize: "0.6rem", display: "block", mb: 0.4 }}>
                                        Descrição:
                                      </Typography>
                                      <TextField
                                        size="small"
                                        fullWidth
                                        value={atual.desc}
                                        onChange={(e) => setCargo(c.id, { desc: e.target.value })}
                                        sx={{ bgcolor: "#fff", mb: 0.8 }}
                                        InputProps={{ sx: { color: V3.ink, fontSize: "0.7rem" } }}
                                      />

                                      <Typography variant="caption" sx={{ color: V3.ink, fontWeight: 700, fontSize: "0.6rem", display: "block", mb: 0.4 }}>
                                        🔑 Permissões (acessos):
                                      </Typography>
                                      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.4, mb: 0.8 }}>
                                        {Object.entries(ACESSOS_LABEL).map(([id, label]) => {
                                          const ativo = (atual.acessos || []).includes(id);
                                          return (
                                            <Chip
                                              key={id}
                                              label={label}
                                              size="small"
                                              onClick={() => {
                                                const arr = atual.acessos || [];
                                                setCargo(c.id, {
                                                  acessos: ativo ? arr.filter((x) => x !== id) : [...arr, id],
                                                });
                                              }}
                                              sx={{
                                                bgcolor: ativo ? `${V3.green}55` : `${V3.ink}22`,
                                                color: ativo ? V3.ink : `${V3.ink}88`,
                                                border: `1px solid ${ativo ? V3.green : V3.ink}66`,
                                                fontWeight: ativo ? 900 : 600,
                                                fontSize: "0.6rem",
                                                height: 22,
                                                cursor: "pointer",
                                              }}
                                            />
                                          );
                                        })}
                                      </Box>

                                      <Button
                                        size="small"
                                        onClick={() => resetarCargo(c.id)}
                                        sx={{ color: V3.red, fontSize: "0.55rem", fontWeight: 800, textTransform: "none" }}
                                      >
                                        ↺ Restaurar padrão deste cargo
                                      </Button>
                                    </AccordionDetails>
                                  </Accordion>
                                );
                              })}

                              <Button
                                size="small"
                                onClick={() => {
                                  if (!window.confirm("Restaurar TODOS os cargos ao padrão? Nomes, salários, vagas e permissões voltam ao original.")) return;
                                  setDoc(doc(db, "sim_empresas", empLive.id), {
                                    configCargos: {},
                                    atualizadoEm: new Date().toISOString(),
                                  }, { merge: true });
                                }}
                                sx={{ alignSelf: "flex-start", color: V3.red, fontSize: "0.55rem", fontWeight: 800, textTransform: "none", mt: 0.5 }}
                              >
                                ↺ Restaurar TODOS os cargos padrão
                              </Button>
                            </Box>
                          );
                        })()}
                      </Paper>

                      <Paper sx={{ p: 1.5, bgcolor: V3.paperDark, border: `1px solid ${V3.blue}44`, borderRadius: 1 }}>
                        <Typography variant="caption" sx={{ color: V3.blue, fontWeight: 900, letterSpacing: 1, fontSize: "0.65rem", display: "block", mb: 0.5 }}>
                          ⚙️ CONFIGURAÇÕES GERAIS DE EQUIPE
                        </Typography>
                        <Typography variant="caption" sx={{ color: V3.ink, opacity: 0.6, fontSize: "0.55rem", display: "block", mb: 1, fontStyle: "italic" }}>
                          Ciclo anual, multa rescisória e bonificação.
                        </Typography>

                        {(() => {
                          const cfg = getCfgCargos(empLive);
                          const setCfg = (patch) =>
                            setDoc(doc(db, "sim_empresas", empLive.id), {
                              cfgCargos: { ...cfg, ...patch },
                              atualizadoEm: new Date().toISOString(),
                            }, { merge: true });

                          return (
                            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                              <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                                <Typography variant="caption" sx={{ color: V3.ink, fontWeight: 800, fontSize: "0.65rem", minWidth: 190 }}>⏱️ Ciclos por ano</Typography>
                                <TextField type="number" size="small" value={cfg.ciclosPorAno}
                                  onChange={(e) => setCfg({ ciclosPorAno: Math.max(1, Number(e.target.value) || 1) })}
                                  sx={{ bgcolor: V3.paper, width: 90 }}
                                  InputProps={{ sx: { color: V3.ink, fontSize: "0.75rem" } }} />
                              </Box>
                              <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                                <Typography variant="caption" sx={{ color: V3.ink, fontWeight: 800, fontSize: "0.65rem", minWidth: 190 }}>💸 Multa rescisória (ciclos de salário)</Typography>
                                <TextField type="number" size="small" value={cfg.multaRescisoriaCiclos}
                                  onChange={(e) => setCfg({ multaRescisoriaCiclos: Math.max(0, Number(e.target.value) || 0) })}
                                  sx={{ bgcolor: V3.paper, width: 90 }}
                                  InputProps={{ sx: { color: V3.ink, fontSize: "0.75rem" } }} />
                              </Box>
                              <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                                <Typography variant="caption" sx={{ color: V3.ink, fontWeight: 800, fontSize: "0.65rem", minWidth: 190 }}>🎁 Bonificação anual (% do salário anual)</Typography>
                                <TextField type="number" size="small" value={cfg.bonusAnualPct}
                                  onChange={(e) => setCfg({ bonusAnualPct: Math.max(0, Number(e.target.value) || 0) })}
                                  sx={{ bgcolor: V3.paper, width: 90 }}
                                  InputProps={{ sx: { color: V3.ink, fontSize: "0.75rem" } }} />
                              </Box>
                              <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                                <Typography variant="caption" sx={{ color: V3.ink, fontWeight: 800, fontSize: "0.65rem", minWidth: 190 }}>💰 Fator de salário (×)</Typography>
                                <TextField type="number" size="small" value={cfg.fatorSalario}
                                  onChange={(e) => setCfg({ fatorSalario: Math.max(0.1, Number(e.target.value) || 1) })}
                                  sx={{ bgcolor: V3.paper, width: 90 }}
                                  InputProps={{ sx: { color: V3.ink, fontSize: "0.75rem" } }} />
                              </Box>

                              <Box sx={{ display: "flex", gap: 0.6, flexWrap: "wrap" }}>
                                <Chip label={`Folha: ${(empLive.equipe || []).reduce((s, m) => s + calcularSalarioMembro(m, empLive), 0).toLocaleString("pt-BR")}/ciclo`} size="small" sx={{ bgcolor: V3.red, color: "#fff", fontSize: "0.55rem", fontWeight: 800, height: 18 }} />
                                <Chip label={`Bônus anual: ${(empLive.equipe || []).reduce((s, m) => s + calcularBonusAnual(m, empLive), 0).toLocaleString("pt-BR")} a cada ${cfg.ciclosPorAno}c`} size="small" sx={{ bgcolor: V3.gold, color: V3.ink, fontSize: "0.55rem", fontWeight: 800, height: 18 }} />
                              </Box>

                              <Button size="small"
                                onClick={() => {
                                  if (!window.confirm("Restaurar padrão? Ciclos=12, Multa=1, Bônus=5%, Fator=1.")) return;
                                  setCfg(CFG_CARGOS_DEFAULT);
                                }}
                                sx={{ alignSelf: "flex-start", color: V3.red, fontSize: "0.55rem", fontWeight: 800, textTransform: "none" }}>
                                ↺ Restaurar padrão
                              </Button>
                            </Box>
                          );
                        })()}
                      </Paper>

                      <Paper sx={{ p: 1.5, bgcolor: V3.paperDark, border: `1px solid ${V3.gold}44`, borderRadius: 1 }}>
                        <Typography variant="caption" sx={{ color: V3.gold, fontWeight: 900, letterSpacing: 1, fontSize: "0.65rem", display: "block", mb: 0.5 }}>
                          🏷️ RAMOS DA EMPRESA
                        </Typography>
                        <Typography variant="caption" sx={{ color: V3.ink, opacity: 0.6, fontSize: "0.55rem", display: "block", mb: 1, fontStyle: "italic" }}>
                          Cada ramo soma imposto extra. Ramos desbloqueiam pesquisas e edifícios específicos.
                        </Typography>
                        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mb: 1 }}>
                          {CATEGORIAS_EMPRESA.map((cat) => {
                            const ativo = (empLive.categorias || []).includes(cat.id);
                            return (
                              <Button
                                key={cat.id}
                                size="small"
                                onClick={async () => {
                                  const atual = empLive.categorias || [];
                                  const novas = ativo
                                    ? atual.filter((x) => x !== cat.id)
                                    : [...atual, cat.id];
                                  await setDoc(doc(db, "sim_empresas", empLive.id), {
                                    categorias: novas,
                                    atualizadoEm: new Date().toISOString(),
                                  }, { merge: true });
                                }}
                                sx={{
                                  bgcolor: ativo ? cat.cor : `${cat.cor}22`,
                                  color: ativo ? "#fff" : V3.ink,
                                  border: `1px solid ${cat.cor}`,
                                  fontWeight: 800,
                                  fontSize: "0.6rem",
                                  py: 0.3,
                                  px: 0.8,
                                  textTransform: "none",
                                  "&:hover": { bgcolor: `${cat.cor}44` },
                                }}
                              >
                                {cat.icone} {cat.nome}
                              </Button>
                            );
                          })}
                        </Box>
                        <Divider sx={{ my: 0.8, borderColor: `${V3.gold}22` }} />
                        <Typography variant="caption" sx={{ color: V3.red, fontWeight: 800, fontSize: "0.6rem", display: "block" }}>
                          💸 Imposto extra acumulado: +{(tributoExtraCategorias(empLive.categorias) * 100).toFixed(1)}%
                        </Typography>
                        <Typography variant="caption" sx={{ color: V3.ink, opacity: 0.6, fontSize: "0.5rem", display: "block", fontStyle: "italic" }}>
                          Soma ao tributo base da categoria $/$$/$$$ (abaixo).
                        </Typography>
                      </Paper>

                      <Paper sx={{ p: 1.5, bgcolor: V3.paperDark, border: `1px solid ${V3.gold}44`, borderRadius: 1 }}>
                        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 0.6 }}>
                          <Typography variant="caption" sx={{ color: V3.gold, fontWeight: 900, letterSpacing: 1, fontSize: "0.65rem" }}>
                            ⚙️ CATEGORIA DA EMPRESA
                          </Typography>
                          {(() => {
                            const modo = empLive.categoriaModo === "manual" ? "manual" : "auto";
                            return (
                              <Box sx={{ display: "flex", gap: 0.4 }}>
                                <Button
                                  size="small"
                                  onClick={() => setDoc(doc(db, "sim_empresas", empLive.id), { categoriaModo: "auto", atualizadoEm: new Date().toISOString() }, { merge: true })}
                                  sx={{
                                    bgcolor: modo === "auto" ? V3.green : `${V3.green}22`,
                                    color: modo === "auto" ? "#fff" : V3.ink,
                                    border: `1px solid ${V3.green}`,
                                    fontWeight: 800,
                                    fontSize: "0.55rem",
                                    py: 0.2,
                                    px: 0.8,
                                    textTransform: "none",
                                  }}
                                >
                                  🤖 AUTO
                                </Button>
                                <Button
                                  size="small"
                                  onClick={() => setDoc(doc(db, "sim_empresas", empLive.id), {
                                    categoriaModo: "manual",
                                    categoriaOverride: empLive.categoria || "$",
                                    atualizadoEm: new Date().toISOString(),
                                  }, { merge: true })}
                                  sx={{
                                    bgcolor: modo === "manual" ? V3.gold : `${V3.gold}22`,
                                    color: V3.ink,
                                    border: `1px solid ${V3.gold}`,
                                    fontWeight: 800,
                                    fontSize: "0.55rem",
                                    py: 0.2,
                                    px: 0.8,
                                    textTransform: "none",
                                  }}
                                >
                                  ✋ MANUAL
                                </Button>
                              </Box>
                            );
                          })()}
                        </Box>

                        {(() => {
                          const totalEdif = contarEdificiosEmpresa(empLive);
                          const pontos = calcularPontosEmpresa(empLive, totalEdif);
                          const auto = categoriaAutomaticaEmpresa(empLive, totalEdif);
                          const efetiva = categoriaEfetivaEmpresa(empLive, totalEdif);
                          const modo = empLive.categoriaModo === "manual" ? "manual" : "auto";

                          return (
                            <>
                              <Typography variant="caption" sx={{ color: V3.ink, opacity: 0.6, fontSize: "0.55rem", display: "block", mb: 1, fontStyle: "italic" }}>
                                {modo === "auto"
                                  ? "Categoria recalculada automaticamente todo ciclo. Vire para MANUAL pra fixar uma."
                                  : "Categoria fixada manualmente. Volte pra AUTO pra recalcular sozinha."}
                              </Typography>

                              <Paper sx={{ p: 0.8, mb: 1, bgcolor: `${V3.blue}15`, border: `1px dashed ${V3.blue}66`, borderRadius: 1 }}>
                                <Typography variant="caption" sx={{ color: V3.blue, fontWeight: 800, fontSize: "0.6rem", display: "block" }}>
                                  📊 Pontos: {pontos.toFixed(1)} · Auto: <strong>{auto}</strong> · Efetiva: <strong>{efetiva}</strong>
                                </Typography>
                                <Typography variant="caption" sx={{ color: V3.ink, opacity: 0.7, fontSize: "0.5rem", display: "block", mt: 0.3 }}>
                                  valor ÷ 10k + nível×2 + {totalEdif} edifícios + sedes×3 → corte em 20 ($$) e 200 ($$$)
                                </Typography>
                              </Paper>

                              <Box sx={{ display: "flex", gap: 0.5 }}>
                                {[
                                  { id: "$", label: "$ — Local", trib: "1%" },
                                  { id: "$$", label: "$$ — Regional", trib: "3%" },
                                  { id: "$$$", label: "$$$ — Megacorp", trib: "5%" },
                                ].map((cat) => {
                                  const ativo = efetiva === cat.id;
                                  const ehAuto = modo === "auto";
                                  return (
                                    <Button
                                      key={cat.id}
                                      size="small"
                                      disabled={ehAuto}
                                      onClick={() => {
                                        if (ehAuto) return;
                                        setDoc(doc(db, "sim_empresas", empLive.id), {
                                          categoriaOverride: cat.id,
                                          categoria: cat.id,
                                          atualizadoEm: new Date().toISOString(),
                                        }, { merge: true });
                                      }}
                                      sx={{
                                        flex: 1,
                                        bgcolor: ativo
                                          ? (cat.id === "$$$" ? "#fbbf24" : cat.id === "$$" ? "#c9a961" : "#b8945a")
                                          : "transparent",
                                        color: ativo ? "#000" : V3.ink,
                                        border: `1px solid ${V3.gold}`,
                                        fontWeight: 900,
                                        fontSize: "0.6rem",
                                        flexDirection: "column",
                                        py: 0.8,
                                        opacity: ehAuto ? 0.65 : 1,
                                        "&.Mui-disabled": { color: ativo ? "#000" : V3.ink, opacity: ehAuto ? 0.65 : 1, borderColor: V3.gold },
                                      }}
                                    >
                                      <span>{cat.label}</span>
                                      <span style={{ fontSize: "0.5rem", opacity: 0.75 }}>trib {cat.trib}</span>
                                    </Button>
                                  );
                                })}
                              </Box>
                            </>
                          );
                        })()}
                      </Paper>

                      <Button
                        fullWidth
                        onClick={() => {
                          setEmpresaAberta(null);
                          setEmpresaEditando(empLive);
                          setModalEmpresaOpen(true);
                        }}
                        sx={{ bgcolor: V3.blue, color: V3.paper, fontWeight: 900, fontFamily: "Georgia, serif", "&:hover": { bgcolor: "#3a4b5a" } }}
                      >
                        ✏️ Editar empresa (nome, imagem, sedes, subsidiárias)
                      </Button>

                      <Button
                        fullWidth
                        onClick={async () => {
                          if (!window.confirm(`Excluir "${empLive.nome}"? Sem volta.`)) return;
                          await deleteDoc(doc(db, "sim_empresas", empLive.id));
                          setEmpresaAberta(null);
                          alert("🗑️ Empresa excluída.");
                        }}
                        sx={{ color: V3.red, fontWeight: 800, border: `1px solid ${V3.red}` }}
                      >
                        🗑️ Excluir empresa
                      </Button>
                    </>
                  )}
                </Box>
              )}
            </Box>
          );
        })()}
      </FloatingDialog>

      <FloatingDialog
        open={!!cargosAbertos}
        onClose={() => setCargosAbertos(null)}
        id="sim_cargos"
        titulo={cargosAbertos ? `Cargos de ${paises[cargosAbertos.id]?.nome || cargosAbertos.nome}` : "Cargos"}
        subtitulo={cargosAbertos ? `${((paises[cargosAbertos.id] || cargosAbertos).cargos || []).filter((c) => c.holderEmail).length} ocupado(s) • ${((paises[cargosAbertos.id] || cargosAbertos).cargos || []).filter((c) => !c.holderEmail).length} vago(s)` : ""}
        cor={(paises[cargosAbertos?.id] || cargosAbertos)?.cor || V3.gold}
        larguraInicial={720}
        alturaInicial={560}
      >
        {cargosAbertos && (() => {
          const paisLive = paises[cargosAbertos.id] || cargosAbertos;
          const cargos = paisLive.cargos || [];
          const listaJogadores = Object.keys(fichasMap || {}).filter(
            (e) => e !== "mestre@reqviemrpg.com"
          );
          const atribuir = async (cargoId, novoEmail) => {
            if (!isMaster) return;
            const novosCargos = cargos.map((c) =>
              c.id === cargoId
                ? {
                    ...c,
                    holderEmail: novoEmail,
                    atribuidoPor: userEmail,
                    atribuidoEm: novoEmail ? new Date().toISOString() : "",
                  }
                : c
            );
            await setDoc(
              doc(db, "sim_paises", paisLive.id),
              { cargos: novosCargos },
              { merge: true }
            );
          };
          return cargos.length === 0 ? (
            <Typography sx={{ color: V3.ink, opacity: 0.7, textAlign: "center", py: 3 }}>
              Nenhum cargo cadastrado neste país.
            </Typography>
          ) : (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.6 }}>
              {cargos.map((c) => (
                <Paper key={c.id} sx={{ p: 1, bgcolor: V3.paperDark, border: `1px solid ${V3.gold}33`, display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                  <Box sx={{ flex: 1, minWidth: 180 }}>
                    <Typography variant="body2" sx={{ color: V3.ink, fontWeight: 900, fontFamily: "Georgia, serif" }}>
                      {c.nome}
                    </Typography>
                    <Typography variant="caption" sx={{ color: V3.ink, opacity: 0.7, fontSize: "0.6rem" }}>
                      escopo: {c.escopoNivel || c.escopo?.nivel || "pais"} • poderes: {(c.poderes || []).join(", ") || "—"}
                    </Typography>
                  </Box>
                  {isMaster ? (
                    <FormControl size="small" sx={{ minWidth: 200 }}>
                      <Select
                        value={c.holderEmail || ""}
                        onChange={(e) => atribuir(c.id, e.target.value)}
                        displayEmpty
                        sx={{
                          color: V3.ink,
                          bgcolor: V3.paper,
                          fontSize: "0.7rem",
                          "& .MuiOutlinedInput-notchedOutline": { borderColor: `${V3.gold}66` },
                        }}
                        MenuProps={{ PaperProps: { sx: { bgcolor: V3.paper } } }}
                      >
                        <MenuItem value="" sx={{ color: V3.red, fontWeight: 800 }}>
                          — VAGO —
                        </MenuItem>
                        {listaJogadores.map((email) => (
                          <MenuItem key={email} value={email} sx={{ fontSize: "0.75rem", color: V3.ink }}>
                            {fichasMap[email]?.nome || email}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  ) : (
                    <Chip
                      label={c.holderEmail ? (fichasMap[c.holderEmail]?.nome || c.holderEmail) : "VAGO"}
                      size="small"
                      sx={{
                        bgcolor: c.holderEmail ? V3.green : V3.red,
                        color: V3.paper,
                        fontWeight: 800,
                        fontSize: "0.6rem",
                      }}
                    />
                  )}
                </Paper>
              ))}
            </Box>
          );
        })()}
      </FloatingDialog>
      <FloatingDialog
        open={!!cidadeAberta}
        onClose={() => setCidadeAberta(null)}
        id="sim_cidade"
        titulo={cidadeAberta ? (cidades[cidadeAberta.id]?.nome || cidadeAberta.nome) : "Cidade"}
        subtitulo={cidadeAberta ? `${paises[cidadeAberta.paisId]?.nome || "—"} • ${cidades[cidadeAberta.id]?.tipo || cidadeAberta.tipo}` : ""}
        cor={cidadeAberta ? (paises[cidadeAberta.paisId]?.cor || V3.gold) : V3.gold}
        larguraInicial={800}
        alturaInicial={640}
      >
        {cidadeAberta && (() => {
          const cidadeLive = cidades[cidadeAberta.id] || cidadeAberta;
          const pais = paises[cidadeLive.paisId];
          const pops = cidadeLive.pops || {};
          const igsLocais = (cidadeLive.igsLocais || []).map((id) => igs[id]).filter(Boolean);
          const cargosLocais = cidadeLive.cargosLocais || [];
          const prod = cidadeLive.producao || {};
          const cons = cidadeLive.consumo || {};
          const inv = normalizarInvestimentos(cidadeLive.investimentos);

          return (
            <>
              <Box sx={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 1, mb: 2 }}>
                <Paper sx={{ p: 1, bgcolor: V3.paperDark, border: `1px solid ${V3.gold}44`, textAlign: "center" }}>
                  <Typography variant="caption" sx={{ color: V3.ink, opacity: 0.7, fontSize: "0.55rem", fontWeight: 800 }}>POPULAÇÃO</Typography>
                  <Typography sx={{ color: V3.ink, fontWeight: 900, fontFamily: "Georgia, serif" }}>{cidadeLive.pop?.toLocaleString("pt-BR")}</Typography>
                </Paper>
                <Paper sx={{ p: 1, bgcolor: V3.paperDark, border: `1px solid ${V3.green}44`, textAlign: "center" }}>
                  <Typography variant="caption" sx={{ color: V3.ink, opacity: 0.7, fontSize: "0.55rem", fontWeight: 800 }}>PROSPERIDADE</Typography>
                  <Typography sx={{ color: V3.green, fontWeight: 900, fontFamily: "Georgia, serif" }}>{Math.round(cidadeLive.prosperidade || 0)}</Typography>
                </Paper>
                <Paper sx={{ p: 1, bgcolor: V3.paperDark, border: `1px solid ${V3.red}44`, textAlign: "center" }}>
                  <Typography variant="caption" sx={{ color: V3.ink, opacity: 0.7, fontSize: "0.55rem", fontWeight: 800 }}>RADICALIZAÇÃO</Typography>
                  <Typography sx={{ color: V3.red, fontWeight: 900, fontFamily: "Georgia, serif" }}>{Math.round(cidadeLive.radicalizacao || 0)}</Typography>
                </Paper>
                <Paper sx={{ p: 1, bgcolor: V3.paperDark, border: `1px solid ${V3.blue}44`, textAlign: "center" }}>
                  <Typography variant="caption" sx={{ color: V3.ink, opacity: 0.7, fontSize: "0.55rem", fontWeight: 800 }}>CRIMINALIDADE</Typography>
                  <Typography sx={{ color: V3.blue, fontWeight: 900, fontFamily: "Georgia, serif" }}>{Math.round(cidadeLive.criminalidade || 0)}</Typography>
                </Paper>
              </Box>

              <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, mb: 2 }}>
                <Paper sx={{ p: 1, bgcolor: V3.paperDark, border: `1px solid ${V3.green}44`, textAlign: "center" }}>
                  <Typography variant="caption" sx={{ color: V3.ink, opacity: 0.7, fontSize: "0.55rem", fontWeight: 800 }}>💰 COFRE LOCAL</Typography>
                  <Typography sx={{ color: V3.green, fontWeight: 900, fontFamily: "Georgia, serif", fontSize: "0.9rem" }}>
                    {((cidadeLive.cofre || 0)).toLocaleString("pt-BR")}
                  </Typography>
                </Paper>
                <Paper sx={{ p: 1, bgcolor: V3.paperDark, border: `1px solid ${V3.blue}44`, textAlign: "center" }}>
                  <Typography variant="caption" sx={{ color: V3.ink, opacity: 0.7, fontSize: "0.55rem", fontWeight: 800 }}>🏛️ TAXA ENVIADA À PROVÍNCIA</Typography>
                  <Typography sx={{ color: V3.blue, fontWeight: 900, fontFamily: "Georgia, serif", fontSize: "0.9rem" }}>
                    {(provincias[cidadeLive.provinciaId]?.taxaCidades ?? 10)}%
                  </Typography>
                </Paper>
              </Box>

              <Paper sx={{ p: 1, mb: 2, bgcolor: V3.paperDark, border: `1px solid ${V3.gold}44` }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Typography variant="caption" sx={{ color: V3.ink, fontWeight: 900, fontSize: "0.65rem", letterSpacing: 1 }}>
                    📚 INSTRUÇÃO
                  </Typography>
                  <Typography sx={{ color: V3.gold, fontWeight: 900, fontFamily: "Georgia, serif", fontSize: "0.85rem" }}>
                    {Math.round((cidadeLive.instrucao || 0) * 10) / 10}%
                  </Typography>
                </Box>
                <Box sx={{ height: 8, bgcolor: "rgba(0,0,0,0.15)", borderRadius: 4, mt: 0.5, overflow: "hidden" }}>
                  <Box sx={{ height: "100%", width: `${cidadeLive.instrucao || 0}%`, bgcolor: V3.gold, transition: "width 0.3s" }} />
                </Box>
              </Paper>

              <Typography variant="caption" sx={{ color: V3.gold, fontWeight: 900, letterSpacing: 1, fontSize: "0.65rem", display: "block", mb: 1 }}>
                🏗️ INVESTIMENTOS ({Object.values(inv).reduce((s, v) => s + v, 0)} níveis)
              </Typography>
              <Paper sx={{ p: 1.5, bgcolor: V3.paperDark, border: `1px solid ${V3.gold}44`, mb: 2 }}>
                {INVESTIMENTOS_CATALOGO.map((invest) => {
                  const nivelAtual = inv[invest.id] || 0;
                  const podeSubir = nivelAtual < INVESTIMENTO_MAX;
                  const custoProximo = podeSubir ? custoUp(nivelAtual) : 0;
                  const cofrePais = pais?.cofre || 0;
                  const temDinheiro = cofrePais >= custoProximo;
                  const podeEditar = isMaster || temPoderNoEscopo(userEmail, "ajustarSliders", "cidade", cidadeLive.id);

                  const alterarNivel = async (novoNivel) => {
                    if (!podeEditar) return;
                    const atual = nivelAtual;
                    if (novoNivel === atual) return;

                    if (novoNivel > atual && !isMaster) {
                      let custoTotal = 0;
                      for (let i = atual; i < novoNivel; i++) custoTotal += custoUp(i);
                      if (cofrePais < custoTotal) {
                        alert(`💰 Cofre insuficiente! Necessário: ${custoTotal.toLocaleString("pt-BR")} — Disponível: ${cofrePais.toLocaleString("pt-BR")}`);
                        return;
                      }
                      await setDoc(doc(db, "sim_paises", pais.id), {
                        cofre: cofrePais - custoTotal,
                      }, { merge: true });
                    }

                    const novoInv = { ...inv, [invest.id]: novoNivel };
                    await setDoc(doc(db, "sim_cidades", cidadeLive.id), {
                      investimentos: novoInv,
                    }, { merge: true });
                  };

                  return (
                    <Box key={invest.id} sx={{ mb: 1.2 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.8, mb: 0.3 }}>
                        <Typography sx={{ fontSize: "1rem" }}>{invest.icone}</Typography>
                        <Typography variant="body2" sx={{ color: V3.ink, fontWeight: 900, fontFamily: "Georgia, serif", fontSize: "0.75rem", flex: 1 }}>
                          {invest.nome}
                        </Typography>
                        <Chip
                          label={`Nv ${nivelAtual}/${INVESTIMENTO_MAX}`}
                          size="small"
                          sx={{ bgcolor: invest.cor, color: "#fff", fontWeight: 800, fontSize: "0.6rem", height: 18 }}
                        />
                      </Box>
                      <Typography variant="caption" sx={{ color: V3.ink, opacity: 0.6, fontSize: "0.55rem", display: "block", mb: 0.4 }}>
                        {invest.desc}
                      </Typography>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Typography
                          variant="caption"
                          onClick={() => alterarNivel(Math.max(0, nivelAtual - 1))}
                          sx={{
                            color: podeEditar && nivelAtual > 0 ? V3.red : "#aaa",
                            fontWeight: 900,
                            cursor: podeEditar && nivelAtual > 0 ? "pointer" : "default",
                            fontSize: "1rem",
                            minWidth: 16,
                            textAlign: "center",
                            userSelect: "none",
                          }}
                        >
                          −
                        </Typography>
                        <Box
                          onClick={(e) => {
                            if (!podeEditar) return;
                            const rect = e.currentTarget.getBoundingClientRect();
                            const x = e.clientX - rect.left;
                            const pct = x / rect.width;
                            const novoNivel = Math.max(0, Math.min(INVESTIMENTO_MAX, Math.round(pct * INVESTIMENTO_MAX)));
                            alterarNivel(novoNivel);
                          }}
                          sx={{
                            flex: 1,
                            height: 10,
                            borderRadius: 5,
                            bgcolor: "rgba(0,0,0,0.15)",
                            position: "relative",
                            cursor: podeEditar ? "pointer" : "default",
                            overflow: "hidden",
                          }}
                        >
                          <Box sx={{
                            position: "absolute",
                            left: 0,
                            top: 0,
                            bottom: 0,
                            width: `${(nivelAtual / INVESTIMENTO_MAX) * 100}%`,
                            bgcolor: invest.cor,
                            transition: "width 0.2s",
                          }} />
                        </Box>
                        <Typography
                          variant="caption"
                          onClick={() => podeSubir && alterarNivel(nivelAtual + 1)}
                          sx={{
                            color: podeEditar && podeSubir && temDinheiro ? V3.green : "#aaa",
                            fontWeight: 900,
                            cursor: podeEditar && podeSubir && temDinheiro ? "pointer" : "default",
                            fontSize: "1rem",
                            minWidth: 16,
                            textAlign: "center",
                            userSelect: "none",
                          }}
                        >
                          +
                        </Typography>
                      </Box>
                      {podeSubir && (
                        <Typography
                          variant="caption"
                          sx={{
                            color: temDinheiro ? V3.green : V3.red,
                            fontSize: "0.55rem",
                            display: "block",
                            mt: 0.3,
                            fontWeight: 700,
                          }}
                        >
                          Próximo nível: 💰 {custoProximo.toLocaleString("pt-BR")} {!temDinheiro && "(cofre insuficiente)"}
                        </Typography>
                      )}
                    </Box>
                  );
                })}
              </Paper>

              {(() => {
                const podeEditarSliders = isMaster || temPoderNoEscopo(userEmail, "ajustarSliders", "cidade", cidadeLive.id);
                if (!podeEditarSliders) return null;
                const setCidadeCampo = async (campo, valor) => {
                  await setDoc(doc(db, "sim_cidades", cidadeLive.id), { [campo]: valor }, { merge: true });
                };
                return (
                  <Paper sx={{ p: 1.5, bgcolor: V3.paperDark, border: `1px dashed ${V3.gold}66`, mb: 2 }}>
                    <Typography variant="caption" sx={{ color: V3.ink, fontWeight: 900, letterSpacing: 1, fontSize: "0.65rem", display: "block", mb: 1 }}>
                      🎛️ AJUSTES DIRETOS (Mestre/cargo)
                    </Typography>
                    {[
                      { campo: "prosperidade", label: "Prosperidade" },
                      { campo: "radicalizacao", label: "Radicalização" },
                      { campo: "lealdade", label: "Lealdade" },
                      { campo: "criminalidade", label: "Criminalidade" },
                      { campo: "infraestrutura", label: "Infraestrutura" },
                    ].map((s) => (
                      <Box key={s.campo} sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                        <Typography variant="caption" sx={{ color: V3.ink, fontWeight: 800, minWidth: 110 }}>{s.label}</Typography>
                        <input
                          type="range" min="0" max="100"
                          value={cidadeLive[s.campo] || 0}
                          onChange={(e) => {
                            const v = Number(e.target.value);
                            setCidades((prev) => ({ ...prev, [cidadeLive.id]: { ...prev[cidadeLive.id], [s.campo]: v } }));
                          }}
                          onMouseUp={(e) => setCidadeCampo(s.campo, Number(e.target.value))}
                          onTouchEnd={(e) => setCidadeCampo(s.campo, Number(e.target.value))}
                          style={{ flex: 1, accentColor: V3.gold }}
                        />
                        <Typography sx={{ color: V3.ink, fontWeight: 900, fontFamily: "Georgia, serif", minWidth: 32, textAlign: "right" }}>
                          {Math.round(cidadeLive[s.campo] || 0)}
                        </Typography>
                      </Box>
                    ))}
                  </Paper>
                );
              })()}

              {(() => {
                const podeEditarImpostos = isMaster || temPoderNoEscopo(userEmail, "ajustarSliders", "cidade", cidadeLive.id);
                const impostos = cidadeLive.impostos || {
                  residencial: { pobre: 10, medio: 15, rico: 20 },
                  comercial: { pobre: 10, medio: 15, rico: 20 },
                  industrial: { pobre: 10, medio: 15, rico: 20 },
                };
                const setImpostoLocal = (cat, classe, valor) => {
                  setCidades((prev) => {
                    const atual = prev[cidadeLive.id]?.impostos || impostos;
                    return {
                      ...prev,
                      [cidadeLive.id]: {
                        ...prev[cidadeLive.id],
                        impostos: {
                          ...atual,
                          [cat]: { ...(atual[cat] || {}), [classe]: valor },
                        },
                      },
                    };
                  });
                };
                const persistirImposto = async (cat, classe, valor) => {
                  if (!podeEditarImpostos) return;
                  const atual = cidadeLive.impostos || impostos;
                  const novos = {
                    ...atual,
                    [cat]: { ...(atual[cat] || {}), [classe]: valor },
                  };
                  await setDoc(doc(db, "sim_cidades", cidadeLive.id), { impostos: novos }, { merge: true });
                };
                return (
                  <Paper sx={{ p: 1.5, bgcolor: V3.paperDark, border: `1px solid ${V3.gold}66`, mb: 2 }}>
                    <Typography variant="caption" sx={{ color: V3.ink, fontWeight: 900, letterSpacing: 1, fontSize: "0.7rem", display: "block", mb: 0.5 }}>
                      📊 IMPOSTOS (3 categorias × 3 classes)
                    </Typography>
                    <Typography variant="caption" sx={{ color: V3.ink, opacity: 0.55, fontSize: "0.55rem", display: "block", mb: 1.5, fontStyle: "italic" }}>
                      Quanto cada classe paga sobre cada setor. Base da arrecadação local.
                    </Typography>
                    {CATEGORIAS_IMPOSTO.map((cat) => {
                      const catImpostos = impostos[cat] || {};
                      const corCat = cat === "residencial" ? V3.gold : cat === "comercial" ? V3.blue : V3.green;
                      return (
                        <Box key={cat} sx={{ mb: 1.8 }}>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.6, mb: 0.8, pb: 0.4, borderBottom: `1px solid ${corCat}44` }}>
                            <Typography sx={{ fontSize: "0.9rem" }}>{CATEGORIAS_IMPOSTO_LABEL[cat].split(" ")[0]}</Typography>
                            <Typography variant="caption" sx={{ color: corCat, fontWeight: 900, letterSpacing: 1.2, fontSize: "0.6rem", fontFamily: "Georgia, serif" }}>
                              {CATEGORIAS_IMPOSTO_LABEL[cat].split(" ").slice(1).join(" ").toUpperCase()}
                            </Typography>
                          </Box>
                          {CLASSES_POP.map((classe) => {
                            const valor = Number(catImpostos[classe] ?? 0);
                            return (
                              <Box key={classe} sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                                <Typography variant="caption" sx={{ color: V3.ink, fontWeight: 800, fontSize: "0.6rem", minWidth: 100 }}>
                                  {CLASSES_LABEL[classe]}
                                </Typography>
                                <input
                                  type="range"
                                  min="0"
                                  max="50"
                                  value={valor}
                                  disabled={!podeEditarImpostos}
                                  onChange={(e) => setImpostoLocal(cat, classe, Number(e.target.value))}
                                  onMouseUp={(e) => persistirImposto(cat, classe, Number(e.target.value))}
                                  onTouchEnd={(e) => persistirImposto(cat, classe, Number(e.target.value))}
                                  style={{ flex: 1, accentColor: corCat }}
                                />
                                <Typography sx={{ color: corCat, fontWeight: 900, fontFamily: "Georgia, serif", minWidth: 38, textAlign: "right", fontSize: "0.8rem" }}>
                                  {valor}%
                                </Typography>
                              </Box>
                            );
                          })}
                        </Box>
                      );
                    })}
                    {!podeEditarImpostos && (
                      <Typography variant="caption" sx={{ color: V3.ink, opacity: 0.55, fontSize: "0.55rem", display: "block", mt: 0.5, fontStyle: "italic", textAlign: "center" }}>
                        Modo leitura. Só Mestre ou cargo com poder de ajustar pode editar.
                      </Typography>
                    )}
                  </Paper>
                );
              })()}

              <Typography variant="caption" sx={{ color: V3.ink, fontWeight: 900, letterSpacing: 1, fontSize: "0.65rem" }}>👥 POPS LOCAIS</Typography>
              <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 0.5, mt: 0.5, mb: 2 }}>
                {Object.entries(pops).map(([k, v]) => (
                  <Paper key={k} sx={{ p: 0.8, bgcolor: V3.paperDark, border: `1px solid ${V3.gold}22` }}>
                    <Typography variant="caption" sx={{ color: V3.ink, fontWeight: 800, fontSize: "0.6rem", textTransform: "capitalize" }}>{k}</Typography>
                    <Typography variant="caption" sx={{ display: "block", color: V3.ink, opacity: 0.7, fontSize: "0.55rem" }}>
                      {v.tamanho?.toLocaleString("pt-BR")} • L {Math.round(v.lealdade)} / R {Math.round(v.radicalizacao)}
                    </Typography>
                  </Paper>
                ))}
              </Box>

              {(() => {
                const edificios = cidadeLive.edificios || {};
                const edificiosDonos = cidadeLive.edificiosDonos || {};
                const cofrePais = pais?.cofre || 0;
                const podeEditar = isMaster || temPoderNoEscopo(userEmail, "ajustarSliders", "cidade", cidadeLive.id);

                const categoriasOrdem = ["basico", "luxo", "industria", "militar"];
                const porCategoria = {};
                for (const ed of EDIFICIOS_CATALOGO) {
                  if (!porCategoria[ed.categoria]) porCategoria[ed.categoria] = [];
                  porCategoria[ed.categoria].push(ed);
                }

                const construir = async (ed, delta, empresaAlvo = null) => {
                  if (!podeEditar || !pais) return;
                  const nivelAtual = edificios[ed.id] || 0;
                  const novoNivel = Math.max(0, Math.min(10, nivelAtual + delta));
                  if (novoNivel === nivelAtual) return;

                  const donoAtual = edificiosDonos[ed.id];
                  if (empresaAlvo && donoAtual?.empresaId && donoAtual.empresaId !== empresaAlvo.id) {
                    alert(`⚠️ Este edifício já pertence à empresa "${donoAtual.empresaNome}". Não pode ser transferido por aqui.`);
                    return;
                  }
                  if (!empresaAlvo && donoAtual?.tipo === "privado" && donoAtual.empresaId) {
                    alert(`⚠️ Este edifício pertence à empresa "${donoAtual.empresaNome}". Edite dentro da empresa.`);
                    return;
                  }

                  if (novoNivel > nivelAtual && !isMaster) {
                    const fatoresTecInd = getFatoresTecnologias(pais);
                    const multCustoInd = fatoresTecInd.custoEdificios || 1;
                    let custoTotal = 0;
                    for (let i = nivelAtual; i < novoNivel; i++) custoTotal += Math.round(custoEdificio(ed, i) * multCustoInd);
                    if (cofrePais < custoTotal) {
                      alert(`💰 Cofre insuficiente!\nNecessário: ${custoTotal.toLocaleString("pt-BR")}\nDisponível: ${cofrePais.toLocaleString("pt-BR")}`);
                      return;
                    }
                    await setDoc(doc(db, "sim_paises", pais.id), { cofre: cofrePais - custoTotal }, { merge: true });
                  }

                  const novosEdif = { ...edificios, [ed.id]: novoNivel };
                  const novosDonos = { ...edificiosDonos };

                  if (novoNivel === 0) {
                    delete novosEdif[ed.id];
                    delete novosDonos[ed.id];
                  } else if (empresaAlvo && (!novosDonos[ed.id] || !novosDonos[ed.id].empresaId)) {
                    novosDonos[ed.id] = {
                      tipo: "privado",
                      empresaId: empresaAlvo.id,
                      empresaNome: empresaAlvo.nome,
                      holderEmail: empresaAlvo.donoEmail || null,
                      holderNome: empresaAlvo.donoEmail
                        ? (fichasDisponiveis?.[empresaAlvo.donoEmail]?.nome || empresaAlvo.donoEmail)
                        : (empresaAlvo.donoNomeLivre || empresaAlvo.nome),
                    };
                  }

                  await setDoc(doc(db, "sim_cidades", cidadeLive.id), { edificios: novosEdif, edificiosDonos: novosDonos }, { merge: true });
                };

                const empresasAqui = Object.values(empresas).filter((emp) =>
                  Object.entries(edificios).some(([edId, nivel]) => {
                    const d = edificiosDonos[edId];
                    return nivel > 0 && d?.tipo === "privado" && d.empresaId === emp.id;
                  })
                );

                const semEmpresa = Object.values(cidades).length >= 0
                  ? Object.entries(edificios).filter(([edId, nivel]) => {
                      if (nivel <= 0) return false;
                      const d = edificiosDonos[edId];
                      return !d || d.tipo === "publico" || (d.tipo === "privado" && !d.empresaId);
                    }).length
                  : 0;

                return (
                  <>
                    {renderPainelEdificios("cidade", cidadeLive, cidadeLive.id)}

                    <Typography variant="caption" sx={{ color: V3.green, fontWeight: 900, letterSpacing: 1, fontSize: "0.7rem", display: "block", mb: 0.5, mt: 1 }}>
                      🏢 EMPRESAS DA CIDADE ({empresasAqui.length})
                    </Typography>
                    <Typography variant="caption" sx={{ color: V3.ink, opacity: 0.55, fontSize: "0.55rem", display: "block", mb: 1.5, fontStyle: "italic" }}>
                      Empresas com edifícios aqui. Clique para expandir e gerenciar os edifícios dela.
                    </Typography>

                    {empresasAqui.length === 0 ? (
                      <Paper sx={{ p: 1.5, bgcolor: V3.paperDark, border: `1px dashed ${V3.green}44`, borderRadius: 1, mb: 2, textAlign: "center" }}>
                        <Typography variant="caption" sx={{ color: V3.ink, opacity: 0.6, fontSize: "0.65rem", display: "block" }}>
                          Nenhuma empresa com edifícios aqui ainda.
                        </Typography>
                        <Typography variant="caption" sx={{ color: V3.ink, opacity: 0.5, fontSize: "0.55rem", fontStyle: "italic" }}>
                          Atribua um edifício a uma empresa pelo botão 👤 na seção abaixo, ou abra "Públicos / Sem Empresa" e use o + com uma empresa.
                        </Typography>
                      </Paper>
                    ) : (
                      empresasAqui.map((emp) => {
                        const edsDaEmpresa = Object.entries(edificios)
                          .filter(([edId, nivel]) => {
                            const d = edificiosDonos[edId];
                            return nivel > 0 && d?.tipo === "privado" && d.empresaId === emp.id;
                          })
                          .map(([edId, nivel]) => ({ ed: EDIFICIOS_CATALOGO.find((e) => e.id === edId), nivel }))
                          .filter((x) => x.ed);

                        return (
                          <Accordion
                            key={emp.id}
                            disableGutters
                            sx={{
                              bgcolor: V3.paperDark,
                              border: `1px solid ${V3.green}66`,
                              mb: 1,
                              "&:before": { display: "none" },
                              borderRadius: 1,
                              overflow: "hidden",
                            }}
                          >
                            <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: V3.ink }} />} sx={{ bgcolor: `${V3.green}22`, minHeight: 46 }}>
                              <Box sx={{ display: "flex", alignItems: "center", gap: 1, width: "100%" }}>
                                {emp.imagemUrl ? (
                                  <Box component="img" src={emp.imagemUrl} sx={{ width: 30, height: 30, borderRadius: 1, objectFit: "cover", border: `1px solid ${V3.green}66` }} />
                                ) : (
                                  <Typography sx={{ fontSize: "1.2rem" }}>🏢</Typography>
                                )}
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                  <Typography variant="body2" sx={{ color: V3.ink, fontWeight: 900, fontFamily: "Georgia, serif", fontSize: "0.82rem" }}>
                                    {emp.nome}
                                  </Typography>
                                  <Typography variant="caption" sx={{ color: V3.ink, opacity: 0.6, fontSize: "0.55rem" }}>
                                    {emp.tipo || "—"} {emp.origem?.nome ? `• 📍 ${emp.origem.nome}` : ""}
                                  </Typography>
                                </Box>
                                <Chip label={`${edsDaEmpresa.length} edif.`} size="small" sx={{ bgcolor: V3.green, color: V3.paper, fontSize: "0.55rem", height: 18 }} />
                                <Button
                                  size="small"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEmpresaAba("visao");
                                    setEmpresaAberta(emp);
                                  }}
                                  sx={{
                                    bgcolor: V3.green,
                                    color: V3.paper,
                                    fontWeight: 900,
                                    fontSize: "0.55rem",
                                    fontFamily: "Georgia, serif",
                                    letterSpacing: 1,
                                    py: 0.3,
                                    px: 0.8,
                                    minWidth: 0,
                                    "&:hover": { bgcolor: "#3a5a2a" },
                                  }}
                                >
                                  🏢 PAINEL
                                </Button>
                              </Box>
                            </AccordionSummary>
                            <AccordionDetails sx={{ p: 1 }}>
                              {edsDaEmpresa.length === 0 ? (
                                <Typography variant="caption" sx={{ color: V3.ink, opacity: 0.6, fontSize: "0.65rem" }}>
                                  Sem edifícios aqui.
                                </Typography>
                              ) : (
                                <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1 }}>
                                  {edsDaEmpresa.map(({ ed, nivel }) => {
                                    const cm = commodities[ed.commodityId];
                                    const prodAtual = producaoEdificio(ed, nivel);
                                    const prodProx = producaoEdificio(ed, nivel + 1);
                                    const custoProx = nivel < 10 ? custoEdificio(ed, nivel) : 0;
                                    const temGran = cofrePais >= custoProx;
                                    return (
                                      <Paper
                                        key={ed.id}
                                        sx={{
                                          p: 1.2,
                                          bgcolor: V3.paperDark,
                                          border: `2px solid ${ed.cor}`,
                                          borderRadius: 1.5,
                                        }}
                                      >
                                        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 0.8, mb: 0.6 }}>
                                          <Box
                                            sx={{
                                              width: 32, height: 32, borderRadius: "50%",
                                              display: "flex", alignItems: "center", justifyContent: "center",
                                              bgcolor: `${ed.cor}33`, border: `2px solid ${ed.cor}`, fontSize: "1rem", flexShrink: 0,
                                            }}
                                          >
                                            {ed.icone}
                                          </Box>
                                          <Box sx={{ flex: 1, minWidth: 0 }}>
                                            <Typography variant="body2" sx={{ color: V3.ink, fontWeight: 900, fontSize: "0.75rem", lineHeight: 1.15 }}>
                                              {ed.nome}
                                            </Typography>
                                            <Typography variant="caption" sx={{ color: ed.cor, fontSize: "0.55rem", fontWeight: 800 }}>
                                              Nv {nivel}/10
                                            </Typography>
                                          </Box>
                                        </Box>
                                        <Typography variant="caption" sx={{ color: V3.ink, opacity: 0.75, fontSize: "0.58rem", display: "block", mb: 0.5 }}>
                                          Produz {cm?.icone} <strong>{prodAtual}</strong> {cm?.nome || ed.commodityId}
                                        </Typography>
                                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                                          <Button
                                            size="small"
                                            onClick={() => construir(ed, -1, emp)}
                                            disabled={!podeEditar}
                                            sx={{ minWidth: 24, p: 0.2, color: V3.red, fontWeight: 900, fontSize: "0.9rem" }}
                                          >
                                            −
                                          </Button>
                                          <Box sx={{ flex: 1, height: 6, bgcolor: "rgba(0,0,0,0.2)", borderRadius: 3, overflow: "hidden" }}>
                                            <Box sx={{ height: "100%", width: `${(nivel / 10) * 100}%`, bgcolor: ed.cor }} />
                                          </Box>
                                          {nivel < 10 && (
                                            <Button
                                              size="small"
                                              onClick={() => construir(ed, +1, emp)}
                                              disabled={!podeEditar || !temGran}
                                              sx={{ minWidth: 24, p: 0.2, color: temGran ? V3.green : "#888", fontWeight: 900, fontSize: "0.9rem" }}
                                            >
                                              +
                                            </Button>
                                          )}
                                        </Box>
                                        {nivel < 10 && (
                                          <Box sx={{ display: "flex", justifyContent: "space-between", mt: 0.3 }}>
                                            <Typography variant="caption" sx={{ color: temGran ? V3.green : V3.red, fontSize: "0.55rem", fontWeight: 700 }}>
                                              💰 {custoProx.toLocaleString("pt-BR")}
                                            </Typography>
                                            <Typography variant="caption" sx={{ color: V3.ink, opacity: 0.6, fontSize: "0.55rem" }}>
                                              → {prodProx} {cm?.nome || ed.commodityId}
                                            </Typography>
                                          </Box>
                                        )}
                                      </Paper>
                                    );
                                  })}
                                </Box>
                              )}
                            </AccordionDetails>
                          </Accordion>
                        );
                      })
                    )}

                    <Accordion
                      disableGutters
                      sx={{
                        bgcolor: V3.paperDark,
                        border: `1px solid ${V3.gold}44`,
                        mt: 2,
                        "&:before": { display: "none" },
                        borderRadius: 1,
                        overflow: "hidden",
                      }}
                    >
                      <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: V3.ink }} />} sx={{ bgcolor: `${V3.gold}22`, minHeight: 46 }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, width: "100%" }}>
                          <Typography sx={{ fontSize: "1.2rem" }}>🏛️</Typography>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="body2" sx={{ color: V3.ink, fontWeight: 900, fontFamily: "Georgia, serif", fontSize: "0.82rem" }}>
                              Públicos / Sem Empresa
                            </Typography>
                            <Typography variant="caption" sx={{ color: V3.ink, opacity: 0.6, fontSize: "0.55rem" }}>
                              Edifícios do estado ou sem dono corporativo
                            </Typography>
                          </Box>
                          <Chip label={`${semEmpresa} edif.`} size="small" sx={{ bgcolor: V3.gold, color: V3.ink, fontSize: "0.55rem", height: 18 }} />
                        </Box>
                      </AccordionSummary>
                      <AccordionDetails sx={{ p: 1 }}>
                        {categoriasOrdem.map((catId) => {
                          const catInfo = CATEGORIAS_EDIFICIO[catId] || { nome: catId, icone: "📦", cor: V3.gold };
                          const lista = (porCategoria[catId] || []).filter((ed) => {
                            const nivel = edificios[ed.id] || 0;
                            if (nivel <= 0) return true;
                            const d = edificiosDonos[ed.id];
                            return !d || d.tipo === "publico" || (d.tipo === "privado" && !d.empresaId);
                          });
                          if (lista.length === 0) return null;
                          return (
                            <Box key={catId} sx={{ mb: 2 }}>
                              <Box sx={{ display: "flex", alignItems: "center", gap: 0.6, mb: 1, pb: 0.5, borderBottom: `1px solid ${catInfo.cor}44` }}>
                                <Typography sx={{ fontSize: "0.9rem" }}>{catInfo.icone}</Typography>
                                <Typography variant="caption" sx={{ color: catInfo.cor, fontWeight: 900, letterSpacing: 1.2, fontSize: "0.65rem", fontFamily: "Georgia, serif" }}>
                                  {catInfo.nome.toUpperCase()}
                                </Typography>
                              </Box>
                              <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1 }}>
                                {lista.map((ed) => {
                                  const nivel = edificios[ed.id] || 0;
                                  const bloq = edifBloqueado(ed, cidadeLive);
                                  const cm = commodities[ed.commodityId];
                                  const prodAtual = producaoEdificio(ed, nivel);
                                  const prodProx = producaoEdificio(ed, nivel + 1);
                                  const custoProx = nivel < 10 ? custoEdificio(ed, nivel) : 0;
                                  const temGran = isMaster || cofrePais >= custoProx;
                                  const travado = bloq.bloqueado && nivel === 0 && !isMaster;
                                  return (
                                    <Paper
                                      key={ed.id}
                                      sx={{
                                        p: 1.2,
                                        bgcolor: travado ? "#2a2520" : V3.paperDark,
                                        border: nivel > 0 ? `2px solid ${ed.cor}` : travado ? `1px dashed #666` : `1px solid ${V3.gold}44`,
                                        opacity: travado ? 0.55 : 1,
                                        filter: travado ? "grayscale(0.7)" : "none",
                                        transition: "all 0.15s",
                                        position: "relative",
                                      }}
                                    >
                                      <Box sx={{ display: "flex", alignItems: "flex-start", gap: 0.8, mb: 0.6 }}>
                                        <Box
                                          sx={{
                                            width: 34, height: 34, borderRadius: "50%",
                                            display: "flex", alignItems: "center", justifyContent: "center",
                                            bgcolor: `${ed.cor}33`, border: `1px solid ${ed.cor}`, fontSize: "1.1rem", flexShrink: 0,
                                          }}
                                        >
                                          {ed.icone}
                                        </Box>
                                        <Box sx={{ flex: 1, minWidth: 0 }}>
                                          <Typography variant="body2" sx={{ color: travado ? "#888" : V3.ink, fontWeight: 900, fontFamily: "Georgia, serif", fontSize: "0.78rem", lineHeight: 1.15 }}>
                                            {ed.nome}
                                          </Typography>
                                          <Typography variant="caption" sx={{ color: travado ? "#666" : V3.ink, opacity: 0.6, fontSize: "0.55rem", display: "block", lineHeight: 1.2, mt: 0.2 }}>
                                            {ed.desc}
                                          </Typography>
                                        </Box>
                                        {nivel > 0 && (
                                          <Chip label={`Nv ${nivel}/10`} size="small" sx={{ bgcolor: ed.cor, color: "#fff", fontWeight: 900, fontSize: "0.55rem", height: 18, flexShrink: 0 }} />
                                        )}
                                      </Box>

                                      {travado ? (
                                        <Paper sx={{ p: 0.8, bgcolor: "#1a1512", border: `1px dashed #666`, textAlign: "center" }}>
                                          <Typography variant="caption" sx={{ color: "#cc8080", fontWeight: 800, fontSize: "0.6rem", display: "block" }}>
                                            🔒 BLOQUEADO
                                          </Typography>
                                          <Typography variant="caption" sx={{ color: "#999", fontSize: "0.55rem" }}>
                                            {bloq.motivo}
                                          </Typography>
                                        </Paper>
                                      ) : (
                                        <>
                                          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.5 }}>
                                            <Typography variant="caption" sx={{ color: V3.ink, fontSize: "0.6rem" }}>
                                              Produz {cm?.icone} <strong>{prodAtual}</strong> {cm?.nome || ed.commodityId}
                                            </Typography>
                                          </Box>
                                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                                            {nivel > 0 && (
                                              <Button
                                                size="small"
                                                onClick={() => construir(ed, -1, null)}
                                                disabled={!podeNaAba("edificios")}
                                                sx={{ minWidth: 24, p: 0.2, color: V3.red, fontWeight: 900, fontSize: "0.9rem" }}
                                              >
                                                −
                                              </Button>
                                            )}
                                            <Box sx={{ flex: 1, height: 8, bgcolor: "rgba(0,0,0,0.2)", borderRadius: 4, overflow: "hidden" }}>
                                              <Box sx={{ height: "100%", width: `${(nivel / 10) * 100}%`, bgcolor: ed.cor }} />
                                            </Box>
                                            {nivel < 10 && (
                                              <Button
                                                size="small"
                                                onClick={() => construir(ed, +1, null)}
                                                disabled={!podeEditar || !temGran}
                                                sx={{ minWidth: 24, p: 0.2, color: temGran ? V3.green : "#888", fontWeight: 900, fontSize: "0.9rem" }}
                                              >
                                                +
                                              </Button>
                                            )}
                                          </Box>
                                          {nivel < 10 && (
                                            <Box sx={{ display: "flex", justifyContent: "space-between", mt: 0.4 }}>
                                              <Typography variant="caption" sx={{ color: temGran ? V3.green : V3.red, fontSize: "0.55rem", fontWeight: 700 }}>
                                                💰 {custoProx.toLocaleString("pt-BR")}
                                              </Typography>
                                              <Typography variant="caption" sx={{ color: V3.ink, opacity: 0.6, fontSize: "0.55rem" }}>
                                                → {prodProx} {cm?.nome || ed.commodityId}
                                              </Typography>
                                            </Box>
                                          )}
                                        </>
                                      )}
                                    </Paper>
                                  );
                                })}
                              </Box>
                            </Box>
                          );
                        })}
                      </AccordionDetails>
                    </Accordion>
                  </>
                );
              })()}

              <Typography variant="caption" sx={{ color: V3.ink, fontWeight: 900, letterSpacing: 1, fontSize: "0.65rem" }}>👥 GRUPOS DE INTERESSE LOCAIS</Typography>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.4, mt: 0.5, mb: 2 }}>
                {igsLocais.length === 0 ? (
                  <Typography variant="caption" sx={{ color: V3.ink, opacity: 0.6, fontSize: "0.65rem" }}>Nenhum IG local.</Typography>
                ) : (
                  igsLocais.map((ig) => (
                    <Paper key={ig.id} sx={{ p: 0.8, bgcolor: V3.paperDark, border: `1px solid ${ig.cor}66`, display: "flex", alignItems: "center", gap: 1 }}>
                      <Box sx={{ width: 24, height: 24, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", bgcolor: `${ig.cor}33`, border: `1px solid ${ig.cor}`, fontSize: "0.85rem" }}>{ig.icone}</Box>
                      <Typography variant="caption" sx={{ flex: 1, color: V3.ink, fontWeight: 800, fontSize: "0.7rem" }}>{ig.nome}</Typography>
                      <Chip label={`Poder ${ig.poder}`} size="small" sx={{ bgcolor: V3.red, color: V3.paper, fontSize: "0.55rem", height: 16 }} />
                      <Chip label={`Humor ${ig.humor}`} size="small" sx={{ bgcolor: V3.green, color: V3.paper, fontSize: "0.55rem", height: 16 }} />
                    </Paper>
                  ))
                )}
              </Box>

              {(() => {
                const estoque = cidadeLive.estoque || {};
                const idsValidos = new Set(COMMODITIES.map((c) => c.id));
                const listaEstoque = COMMODITIES
                  .map((cm) => ({ ...cm, qtd: Number(estoque[cm.id] || 0) }))
                  .filter((c) => c.qtd !== 0);
                const positivos = listaEstoque.filter((c) => c.qtd > 0);
                const negativos = listaEstoque.filter((c) => c.qtd < 0);

                return (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" sx={{ color: V3.ink, fontWeight: 900, letterSpacing: 1, fontSize: "0.65rem", display: "block", mb: 0.5 }}>
                      📦 ESTOQUE LOCAL ({listaEstoque.length}/38)
                    </Typography>
                    <Typography variant="caption" sx={{ color: V3.ink, opacity: 0.5, fontSize: "0.55rem", display: "block", mb: 1, fontStyle: "italic" }}>
                      Quantidades zeradas omitidas. Vermelho = déficit.
                    </Typography>
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.4 }}>
                      {positivos.map((c) => (
                        <Chip
                          key={c.id}
                          label={`${c.icone} ${c.nome} ${c.qtd.toFixed(0)}`}
                          size="small"
                          sx={{
                            bgcolor: "#2d4a1f",
                            color: "#fff",
                            fontSize: "0.55rem",
                            height: 18,
                            fontWeight: 700,
                            "& .MuiChip-label": { px: 0.8 },
                          }}
                        />
                      ))}
                      {negativos.map((c) => (
                        <Chip
                          key={c.id}
                          label={`${c.icone} ${c.nome} ${c.qtd.toFixed(0)}`}
                          size="small"
                          sx={{
                            bgcolor: "#6b1f1f",
                            color: "#fff",
                            fontSize: "0.55rem",
                            height: 18,
                            fontWeight: 700,
                            "& .MuiChip-label": { px: 0.8 },
                          }}
                        />
                      ))}
                      {listaEstoque.length === 0 && (
                        <Typography variant="caption" sx={{ color: V3.ink, opacity: 0.5, fontSize: "0.6rem" }}>
                          Nada em estoque.
                        </Typography>
                      )}
                    </Box>
                  </Box>
                );
              })()}

              <Typography variant="caption" sx={{ color: V3.ink, fontWeight: 900, letterSpacing: 1, fontSize: "0.65rem" }}>🏛️ CARGOS LOCAIS</Typography>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.4, mt: 0.5 }}>
                {cargosLocais.length === 0 ? (
                  <Typography variant="caption" sx={{ color: V3.ink, opacity: 0.6, fontSize: "0.65rem" }}>Nenhum cargo.</Typography>
                ) : (
                  cargosLocais.map((c) => (
                    <Paper key={c.id} sx={{ p: 0.8, bgcolor: V3.paperDark, border: `1px solid ${V3.gold}33`, display: "flex", alignItems: "center", gap: 1 }}>
                      <Typography variant="caption" sx={{ flex: 1, color: V3.ink, fontWeight: 800, fontSize: "0.7rem" }}>{c.nome}</Typography>
                      <Chip label={c.holderEmail ? c.holderEmail : "VAGO"} size="small" sx={{ bgcolor: c.holderEmail ? V3.green : V3.red, color: V3.paper, fontSize: "0.55rem", height: 16, maxWidth: 140, "& .MuiChip-label": { overflow: "hidden", textOverflow: "ellipsis" } }} />
                    </Paper>
                  ))
                )}
              </Box>

              <PainelLeis
                nivel="cidade"
                alvo={cidadeLive}
                pais={pais}
                provincia={provincias[cidadeLive.provinciaId] || null}
                cidade={cidadeLive}
                paises={paises}
                isMaster={isMaster}
                userEmail={userEmail}
                podeEditar={isMaster || temPoderNoEscopo(userEmail, "mudarLei", "cidade", cidadeLive.id)}
              />
            </>
          );
        })()}
      </FloatingDialog>
      <FloatingDialog
        open={!!provinciaAberta}
        onClose={() => setProvinciaAberta(null)}
        id="sim_provincia"
        titulo={provinciaAberta ? (provincias[provinciaAberta.id]?.nome || provinciaAberta.nome) : "Província"}
        subtitulo={provinciaAberta ? `${paises[provinciaAberta.paisId]?.nome || "—"} • ${((provincias[provinciaAberta.id] || provinciaAberta).cidadesIds || []).length} cidades` : ""}
        cor={provinciaAberta ? (paises[provinciaAberta.paisId]?.cor || V3.gold) : V3.gold}
        larguraInicial={720}
        alturaInicial={560}
      >
        {provinciaAberta && (() => {
          const provinciaLive = provincias[provinciaAberta.id] || provinciaAberta;
          const pais = paises[provinciaLive.paisId];
          const cids = (provinciaLive.cidadesIds || []).map((id) => cidades[id]).filter(Boolean);
          const popTotal = cids.reduce((s, c) => s + (c.pop || 0), 0);
          const prospMedia = cids.length > 0 ? cids.reduce((s, c) => s + (c.prosperidade || 0), 0) / cids.length : 0;
          const radMedia = cids.length > 0 ? cids.reduce((s, c) => s + (c.radicalizacao || 0), 0) / cids.length : 0;
          const lealMedia = cids.length > 0 ? cids.reduce((s, c) => s + (c.lealdade || 0), 0) / cids.length : 0;
          const inv = provinciaLive.investimentos || {};
          return (
            <>
              <Box sx={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 1, mb: 2 }}>
                <Paper sx={{ p: 1, bgcolor: V3.paperDark, border: `1px solid ${V3.gold}44`, textAlign: "center" }}>
                  <Typography variant="caption" sx={{ color: V3.ink, opacity: 0.7, fontSize: "0.55rem", fontWeight: 800 }}>POPULAÇÃO</Typography>
                  <Typography sx={{ color: V3.ink, fontWeight: 900, fontFamily: "Georgia, serif" }}>{(popTotal / 1000).toFixed(0)}k</Typography>
                </Paper>
                <Paper sx={{ p: 1, bgcolor: V3.paperDark, border: `1px solid ${V3.green}44`, textAlign: "center" }}>
                  <Typography variant="caption" sx={{ color: V3.ink, opacity: 0.7, fontSize: "0.55rem", fontWeight: 800 }}>PROSPERIDADE</Typography>
                  <Typography sx={{ color: V3.green, fontWeight: 900, fontFamily: "Georgia, serif" }}>{prospMedia.toFixed(1)}</Typography>
                </Paper>
                <Paper sx={{ p: 1, bgcolor: V3.paperDark, border: `1px solid ${V3.red}44`, textAlign: "center" }}>
                  <Typography variant="caption" sx={{ color: V3.ink, opacity: 0.7, fontSize: "0.55rem", fontWeight: 800 }}>RADICALIZAÇÃO</Typography>
                  <Typography sx={{ color: V3.red, fontWeight: 900, fontFamily: "Georgia, serif" }}>{radMedia.toFixed(1)}</Typography>
                </Paper>
                <Paper sx={{ p: 1, bgcolor: V3.paperDark, border: `1px solid ${V3.blue}44`, textAlign: "center" }}>
                  <Typography variant="caption" sx={{ color: V3.ink, opacity: 0.7, fontSize: "0.55rem", fontWeight: 800 }}>LEALDADE</Typography>
                  <Typography sx={{ color: V3.blue, fontWeight: 900, fontFamily: "Georgia, serif" }}>{lealMedia.toFixed(1)}</Typography>
                </Paper>
                <Paper sx={{ p: 1, bgcolor: V3.paperDark, border: `1px solid ${V3.gold}44`, textAlign: "center" }}>
                  <Typography variant="caption" sx={{ color: V3.ink, opacity: 0.7, fontSize: "0.55rem", fontWeight: 800 }}>INSTRUÇÃO</Typography>
                  <Typography sx={{ color: V3.gold, fontWeight: 900, fontFamily: "Georgia, serif" }}>{Math.round((provinciaLive.instrucao || 0) * 10) / 10}%</Typography>
                </Paper>
              </Box>

              <Typography variant="caption" sx={{ color: V3.ink, fontWeight: 900, letterSpacing: 1, fontSize: "0.65rem", display: "block", mb: 1 }}>🎛️ INVESTIMENTOS (média das cidades)</Typography>
              <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0.5, mb: 2 }}>
                {Object.entries(inv).map(([k, v]) => (
                  <Paper key={k} sx={{ p: 0.8, bgcolor: V3.paperDark, border: `1px solid ${V3.gold}33`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Typography variant="caption" sx={{ color: V3.ink, fontWeight: 800, fontSize: "0.65rem", textTransform: "capitalize" }}>{k}</Typography>
                    <Chip label={v} size="small" sx={{ bgcolor: V3.gold, color: V3.ink, fontSize: "0.6rem", height: 18 }} />
                  </Paper>
                ))}
              </Box>

              <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, mb: 2 }}>
                <Paper sx={{ p: 1, bgcolor: V3.paperDark, border: `1px solid ${V3.green}44`, textAlign: "center" }}>
                  <Typography variant="caption" sx={{ color: V3.ink, opacity: 0.7, fontSize: "0.55rem", fontWeight: 800 }}>💰 COFRE PROVINCIAL</Typography>
                  <Typography sx={{ color: V3.green, fontWeight: 900, fontFamily: "Georgia, serif", fontSize: "0.9rem" }}>
                    {(provinciaLive.cofre || 0).toLocaleString("pt-BR")}
                  </Typography>
                </Paper>
                <Paper sx={{ p: 1, bgcolor: V3.paperDark, border: `1px solid ${V3.blue}44`, textAlign: "center" }}>
                  <Typography variant="caption" sx={{ color: V3.ink, opacity: 0.7, fontSize: "0.55rem", fontWeight: 800 }}>🏛️ TAXA ENVIADA AO PAÍS</Typography>
                  <Typography sx={{ color: V3.blue, fontWeight: 900, fontFamily: "Georgia, serif", fontSize: "0.9rem" }}>
                    {(paises[provinciaLive.paisId]?.taxaProvincias ?? 10)}%
                  </Typography>
                </Paper>
              </Box>

              <Paper sx={{ p: 1.2, bgcolor: V3.paperDark, border: `1px solid ${V3.gold}66`, mb: 2 }}>
                <Typography variant="caption" sx={{ color: V3.ink, fontWeight: 900, fontSize: "0.65rem", letterSpacing: 1, display: "block", mb: 0.5 }}>
                  📊 TAXA DE CONTRIBUIÇÃO DAS CIDADES
                </Typography>
                <Typography variant="caption" sx={{ color: V3.ink, opacity: 0.6, fontSize: "0.55rem", display: "block", mb: 1, fontStyle: "italic" }}>
                  Quanto cada cidade desta província envia à província a cada estação.
                </Typography>
                {isMaster ? (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <input
                      type="range" min="0" max="50"
                      value={provinciaLive.taxaCidades ?? 10}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        setProvincias((prev) => ({ ...prev, [provinciaLive.id]: { ...prev[provinciaLive.id], taxaCidades: v } }));
                      }}
                      onMouseUp={(e) => setDoc(doc(db, "sim_provincias", provinciaLive.id), { taxaCidades: Number(e.target.value) }, { merge: true })}
                      onTouchEnd={(e) => setDoc(doc(db, "sim_provincias", provinciaLive.id), { taxaCidades: Number(e.target.value) }, { merge: true })}
                      style={{ flex: 1, accentColor: V3.gold }}
                    />
                    <Typography sx={{ color: V3.gold, fontWeight: 900, fontFamily: "Georgia, serif", minWidth: 42, textAlign: "right" }}>
                      {provinciaLive.taxaCidades ?? 10}%
                    </Typography>
                  </Box>
                ) : (
                  <Typography sx={{ color: V3.gold, fontWeight: 900, fontFamily: "Georgia, serif", fontSize: "1rem" }}>
                    {provinciaLive.taxaCidades ?? 10}%
                  </Typography>
                )}
              </Paper>

              {(() => {
                const estoque = provinciaLive.estoque || {};
                const listaEstoque = COMMODITIES
                  .map((cm) => ({ ...cm, qtd: Number(estoque[cm.id] || 0) }))
                  .filter((c) => c.qtd !== 0);
                const positivos = listaEstoque.filter((c) => c.qtd > 0);
                const negativos = listaEstoque.filter((c) => c.qtd < 0);

                return (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" sx={{ color: V3.ink, fontWeight: 900, letterSpacing: 1, fontSize: "0.65rem", display: "block", mb: 0.5 }}>
                      📦 ESTOQUE PROVINCIAL ({listaEstoque.length}/38)
                    </Typography>
                    <Typography variant="caption" sx={{ color: V3.ink, opacity: 0.5, fontSize: "0.55rem", display: "block", mb: 1, fontStyle: "italic" }}>
                      Soma dos estoques das cidades da província. Vermelho = déficit.
                    </Typography>
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.4 }}>
                      {positivos.map((c) => (
                        <Chip
                          key={c.id}
                          label={`${c.icone} ${c.nome} ${c.qtd.toFixed(0)}`}
                          size="small"
                          sx={{
                            bgcolor: "#2d4a1f",
                            color: "#fff",
                            fontSize: "0.55rem",
                            height: 18,
                            fontWeight: 700,
                            "& .MuiChip-label": { px: 0.8 },
                          }}
                        />
                      ))}
                      {negativos.map((c) => (
                        <Chip
                          key={c.id}
                          label={`${c.icone} ${c.nome} ${c.qtd.toFixed(0)}`}
                          size="small"
                          sx={{
                            bgcolor: "#6b1f1f",
                            color: "#fff",
                            fontSize: "0.55rem",
                            height: 18,
                            fontWeight: 700,
                            "& .MuiChip-label": { px: 0.8 },
                          }}
                        />
                      ))}
                      {listaEstoque.length === 0 && (
                        <Typography variant="caption" sx={{ color: V3.ink, opacity: 0.5, fontSize: "0.6rem" }}>
                          Nada em estoque.
                        </Typography>
                      )}
                    </Box>
                  </Box>
                );
              })()}

              <Typography variant="caption" sx={{ color: V3.ink, fontWeight: 900, letterSpacing: 1, fontSize: "0.65rem", display: "block", mb: 1 }}>🏙️ CIDADES</Typography>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.4 }}>
                {cids.map((c) => (
                  <Paper
                    key={c.id}
                    onClick={() => { setProvinciaAberta(null); setCidadeAberta(c); }}
                    sx={{ p: 0.8, bgcolor: V3.paperDark, border: `1px solid ${V3.gold}22`, display: "flex", alignItems: "center", gap: 0.8, cursor: "pointer", "&:hover": { borderColor: V3.gold } }}
                  >
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" sx={{ color: V3.ink, fontWeight: 900, fontFamily: "Georgia, serif", fontSize: "0.75rem" }}>{c.nome}</Typography>
                    </Box>
                    <Chip label={`👥 ${((c.pop || 0) / 1000).toFixed(0)}k`} size="small" sx={{ bgcolor: V3.ink, color: V3.gold, fontSize: "0.55rem", height: 16 }} />
                    <Chip label={`📈 ${c.prosperidade || 0}`} size="small" sx={{ bgcolor: V3.green, color: V3.paper, fontSize: "0.55rem", height: 16 }} />
                  </Paper>
                ))}
              </Box>

              {renderPainelEdificios("provincia", provinciaLive, provinciaLive.id)}

              <PainelLeis
                nivel="provincia"
                alvo={provinciaLive}
                pais={pais}
                provincia={provinciaLive}
                cidade={null}
                paises={paises}
                isMaster={isMaster}
                userEmail={userEmail}
                podeEditar={isMaster || temPoderNoEscopo(userEmail, "mudarLei", "provincia", provinciaLive.id)}
              />
            </>
          );
        })()}
      </FloatingDialog>
      <FloatingDialog
        open={!!paisAberto}
        onClose={() => { setPaisAberto(null); setLeisEditando(null); }}
        id="sim_pais"
        titulo={paisAberto ? (paises[paisAberto.id]?.nome || paisAberto.nome) : "País"}
        subtitulo={paisAberto ? (paises[paisAberto.id]?.formaGoverno || paisAberto.formaGoverno || "").replace(/_/g, " ") : ""}
        cor={paisAberto ? (paises[paisAberto.id]?.cor || V3.gold) : V3.gold}
        larguraInicial={760}
        alturaInicial={600}
      >
        {paisAberto && (() => {
          const paisLive = paises[paisAberto.id] || paisAberto;
          const podeEditarLeis = isMaster || temPoderNoEscopo(userEmail, "mudarLei", "pais", paisLive.id);
          const podeEditarCofre = isMaster || temPoderNoEscopo(userEmail, "editarOrcamento", "pais", paisLive.id);
          const cofreAtual = paisLive.cofre || 0;

          return (
            <>
              <Typography sx={{ color: V3.ink, mb: 1, fontFamily: "Georgia, serif" }}>{paisLive.descricao}</Typography>

              {(paisLive.ultimaManutencao !== undefined || paisLive.ultimaArrecadacao !== undefined) && (
                <Paper sx={{ p: 1.5, bgcolor: V3.paperDark, border: `1px solid ${V3.gold}44`, mb: 2 }}>
                  <Typography variant="caption" sx={{ color: V3.ink, fontWeight: 900, letterSpacing: 1, display: "block", mb: 1 }}>
                    📊 ÚLTIMO TICK
                  </Typography>
                  <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0.8 }}>
                    <Box>
                      <Typography variant="caption" sx={{ color: V3.ink, opacity: 0.7, fontSize: "0.6rem" }}>Arrecadação</Typography>
                      <Typography variant="body2" sx={{ color: V3.green, fontWeight: 900, fontFamily: "Georgia, serif" }}>
                        +{(paisLive.ultimaArrecadacao || 0).toLocaleString("pt-BR")}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ color: V3.ink, opacity: 0.7, fontSize: "0.6rem" }}>Manutenção</Typography>
                      <Typography variant="body2" sx={{ color: V3.red, fontWeight: 900, fontFamily: "Georgia, serif" }}>
                        −{(paisLive.ultimaManutencao || 0).toLocaleString("pt-BR")}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ color: V3.ink, opacity: 0.7, fontSize: "0.6rem" }}>Despesas Fixas</Typography>
                      <Typography variant="body2" sx={{ color: V3.red, fontWeight: 900, fontFamily: "Georgia, serif" }}>
                        −{(paisLive.ultimaDespesaFixa || 0).toLocaleString("pt-BR")}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ color: V3.ink, opacity: 0.7, fontSize: "0.6rem" }}>Custo de Leis</Typography>
                      <Typography variant="body2" sx={{ color: V3.red, fontWeight: 900, fontFamily: "Georgia, serif" }}>
                        −{(paisLive.ultimoCustoLeis || 0).toLocaleString("pt-BR")}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ color: V3.ink, opacity: 0.7, fontSize: "0.6rem" }}>Delta</Typography>
                      <Typography variant="body2" sx={{ color: (paisLive.ultimoDelta || 0) >= 0 ? V3.green : V3.red, fontWeight: 900, fontFamily: "Georgia, serif" }}>
                        {(paisLive.ultimoDelta || 0) >= 0 ? "+" : ""}{(paisLive.ultimoDelta || 0).toLocaleString("pt-BR")}
                      </Typography>
                    </Box>
                  </Box>
                  <Divider sx={{ my: 1, borderColor: `${V3.gold}22` }} />
                  <Typography variant="caption" sx={{ color: V3.ink, fontWeight: 900, letterSpacing: 1, display: "block", mb: 0.5 }}>
                    📦 BALANÇO DE RECURSOS
                  </Typography>
                  <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0.8 }}>
                    <Box>
                      <Typography variant="caption" sx={{ color: V3.ink, opacity: 0.7, fontSize: "0.6rem" }}>Excedente</Typography>
                      <Typography variant="body2" sx={{ color: V3.green, fontWeight: 900, fontFamily: "Georgia, serif" }}>
                        +{(paisLive.ultimaReceitaExcedente || 0).toLocaleString("pt-BR")}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ color: V3.ink, opacity: 0.7, fontSize: "0.6rem" }}>Déficit</Typography>
                      <Typography variant="body2" sx={{ color: V3.red, fontWeight: 900, fontFamily: "Georgia, serif" }}>
                        −{(paisLive.ultimoCustoDeficit || 0).toLocaleString("pt-BR")}
                      </Typography>
                    </Box>
                  </Box>
                  {paisLive.criseCofre && (
                    <Typography variant="caption" sx={{ color: V3.red, fontWeight: 800, fontSize: "0.65rem", display: "block", mt: 1 }}>
                      ⚠️ COFRE VAZIO — Tesouro sem fundos!
                    </Typography>
                  )}
                </Paper>
              )}

              <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", mb: 2 }}>
                <Chip label={`👥 ${paisLive.popTotal?.toLocaleString("pt-BR")}`} size="small" sx={{ bgcolor: V3.ink, color: V3.gold }} />
                <Chip label={`✨ ${(paisLive.aurana * 100).toFixed(0)}% Aurana`} size="small" sx={{ bgcolor: V3.blue, color: V3.paper }} />
                <Chip label={`💰 ${cofreAtual.toLocaleString("pt-BR")}`} size="small" sx={{ bgcolor: V3.green, color: V3.paper }} />
                <Chip label={`📚 Instrução ${Math.round((paisLive.instrucao || 0) * 10) / 10}%`} size="small" sx={{ bgcolor: V3.gold, color: V3.ink }} />
                <Chip label={paisLive.formaGoverno?.replace(/_/g, " ")} size="small" sx={{ bgcolor: V3.blue, color: V3.paper }} />
              </Box>

              <Divider sx={{ my: 1, borderColor: `${V3.ink}33` }} />

              <Button
                variant="outlined"
                onClick={() => setTechTreeOpen(true)}
                fullWidth
                sx={{
                  color: V3.gold,
                  borderColor: V3.gold,
                  fontWeight: 900,
                  fontFamily: "Georgia, serif",
                  mb: 2,
                  "&:hover": { bgcolor: `${V3.gold}22` },
                }}
              >
                🌳 ÁRVORE DE TECNOLOGIA
              </Button>

              <Paper sx={{ p: 1.2, bgcolor: V3.paperDark, border: `1px solid ${V3.gold}66`, mb: 2 }}>
                <Typography variant="caption" sx={{ color: V3.ink, fontWeight: 900, fontSize: "0.65rem", letterSpacing: 1, display: "block", mb: 0.5 }}>
                  📊 TAXA GLOBAL DAS PROVÍNCIAS
                </Typography>
                <Typography variant="caption" sx={{ color: V3.ink, opacity: 0.6, fontSize: "0.55rem", display: "block", mb: 1, fontStyle: "italic" }}>
                  Padrão aplicado a todas as províncias. Cada província pode ter taxa individual (abaixo).
                </Typography>
                {isMaster ? (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <input
                      type="range" min="0" max="50"
                      value={paisLive.taxaProvincias ?? 10}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        setPaises((prev) => ({ ...prev, [paisLive.id]: { ...prev[paisLive.id], taxaProvincias: v } }));
                      }}
                      onMouseUp={(e) => setDoc(doc(db, "sim_paises", paisLive.id), { taxaProvincias: Number(e.target.value) }, { merge: true })}
                      onTouchEnd={(e) => setDoc(doc(db, "sim_paises", paisLive.id), { taxaProvincias: Number(e.target.value) }, { merge: true })}
                      style={{ flex: 1, accentColor: V3.gold }}
                    />
                    <Typography sx={{ color: V3.gold, fontWeight: 900, fontFamily: "Georgia, serif", minWidth: 42, textAlign: "right" }}>
                      {paisLive.taxaProvincias ?? 10}%
                    </Typography>
                  </Box>
                ) : (
                  <Typography sx={{ color: V3.gold, fontWeight: 900, fontFamily: "Georgia, serif", fontSize: "1rem" }}>
                    {paisLive.taxaProvincias ?? 10}%
                  </Typography>
                )}
              </Paper>

              <Paper sx={{ p: 1.2, bgcolor: V3.paperDark, border: `1px solid ${V3.blue}66`, mb: 2 }}>
                <Typography variant="caption" sx={{ color: V3.ink, fontWeight: 900, fontSize: "0.65rem", letterSpacing: 1, display: "block", mb: 0.5 }}>
                  🎯 TAXA INDIVIDUAL POR PROVÍNCIA
                </Typography>
                <Typography variant="caption" sx={{ color: V3.ink, opacity: 0.6, fontSize: "0.55rem", display: "block", mb: 1, fontStyle: "italic" }}>
                  Sobrepõe a taxa global. Sem valor individual = usa global ({paisLive.taxaProvincias ?? 10}%).
                </Typography>
                {(() => {
                  const taxasInd = paisLive.taxaProvinciasIndividual || {};
                  const podeEditar = isMaster || temPoderNoEscopo(userEmail, "ajustarSliders", "pais", paisLive.id);
                  const provsDoPais = Object.values(provincias).filter((pv) => pv.paisId === paisLive.id);
                  return (
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                      {provsDoPais.length === 0 ? (
                        <Typography variant="caption" sx={{ color: V3.ink, opacity: 0.6, fontSize: "0.6rem" }}>Sem províncias.</Typography>
                      ) : (
                        provsDoPais.map((pv) => {
                          const valor = taxasInd[pv.id];
                          const usando = valor !== undefined && valor !== null;
                          const valorAtual = usando ? Number(valor) : (paisLive.taxaProvincias ?? 10);
                          return (
                            <Box key={pv.id} sx={{ display: "flex", alignItems: "center", gap: 1, py: 0.3 }}>
                              <Typography variant="caption" sx={{ color: V3.ink, fontWeight: 800, fontSize: "0.65rem", minWidth: 130, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {pv.nome}
                              </Typography>
                              <input
                                type="range" min="0" max="50"
                                value={valorAtual}
                                disabled={!podeEditar}
                                onChange={(e) => {
                                  const v = Number(e.target.value);
                                  setPaises((prev) => ({
                                    ...prev,
                                    [paisLive.id]: {
                                      ...prev[paisLive.id],
                                      taxaProvinciasIndividual: { ...(prev[paisLive.id]?.taxaProvinciasIndividual || {}), [pv.id]: v },
                                    },
                                  }));
                                }}
                                onMouseUp={(e) => {
                                  const v = Number(e.target.value);
                                  const novas = { ...(paisLive.taxaProvinciasIndividual || {}), [pv.id]: v };
                                  setDoc(doc(db, "sim_paises", paisLive.id), { taxaProvinciasIndividual: novas }, { merge: true });
                                }}
                                onTouchEnd={(e) => {
                                  const v = Number(e.target.value);
                                  const novas = { ...(paisLive.taxaProvinciasIndividual || {}), [pv.id]: v };
                                  setDoc(doc(db, "sim_paises", paisLive.id), { taxaProvinciasIndividual: novas }, { merge: true });
                                }}
                                style={{ flex: 1, accentColor: usando ? V3.blue : V3.gold }}
                              />
                              <Typography sx={{ color: usando ? V3.blue : V3.gold, fontWeight: 900, fontFamily: "Georgia, serif", minWidth: 42, textAlign: "right", fontSize: "0.75rem" }}>
                                {valorAtual}%
                              </Typography>
                              {usando && podeEditar && (
                                <Button
                                  size="small"
                                  onClick={() => {
                                    const novas = { ...(paisLive.taxaProvinciasIndividual || {}) };
                                    delete novas[pv.id];
                                    setDoc(doc(db, "sim_paises", paisLive.id), { taxaProvinciasIndividual: novas }, { merge: true });
                                  }}
                                  sx={{ minWidth: 0, p: 0.2, color: V3.red, fontSize: "0.6rem" }}
                                  title="Voltar ao valor global"
                                >
                                  ✕
                                </Button>
                              )}
                            </Box>
                          );
                        })
                      )}
                    </Box>
                  );
                })()}
              </Paper>

              <Paper sx={{ p: 1.2, bgcolor: V3.paperDark, border: `1px solid ${V3.red}66`, mb: 2 }}>
                <Typography variant="caption" sx={{ color: V3.ink, fontWeight: 900, fontSize: "0.65rem", letterSpacing: 1, display: "block", mb: 0.5 }}>
                  🌍 IMPOSTO INTERNACIONAL
                </Typography>
                <Typography variant="caption" sx={{ color: V3.ink, opacity: 0.6, fontSize: "0.55rem", display: "block", mb: 1, fontStyle: "italic" }}>
                  Taxa ADICIONAL cobrada sobre negociações que este país RECEBE de outros países. Soma-se ao imposto de importação das leis.
                </Typography>
                {(() => {
                  const podeEditar = isMaster || temPoderNoEscopo(userEmail, "ajustarSliders", "pais", paisLive.id);
                  return podeEditar ? (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <input
                        type="range" min="0" max="40"
                        value={paisLive.impostoInternacional ?? 10}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          setPaises((prev) => ({ ...prev, [paisLive.id]: { ...prev[paisLive.id], impostoInternacional: v } }));
                        }}
                        onMouseUp={(e) => setDoc(doc(db, "sim_paises", paisLive.id), { impostoInternacional: Number(e.target.value) }, { merge: true })}
                        onTouchEnd={(e) => setDoc(doc(db, "sim_paises", paisLive.id), { impostoInternacional: Number(e.target.value) }, { merge: true })}
                        style={{ flex: 1, accentColor: V3.red }}
                      />
                      <Typography sx={{ color: V3.red, fontWeight: 900, fontFamily: "Georgia, serif", minWidth: 42, textAlign: "right" }}>
                        {paisLive.impostoInternacional ?? 10}%
                      </Typography>
                    </Box>
                  ) : (
                    <Typography sx={{ color: V3.red, fontWeight: 900, fontFamily: "Georgia, serif", fontSize: "1rem" }}>
                      {paisLive.impostoInternacional ?? 10}%
                    </Typography>
                  );
                })()}
              </Paper>

              {(() => {
                const estoque = paisLive.estoque || {};
                const listaEstoque = COMMODITIES
                  .map((cm) => ({ ...cm, qtd: Number(estoque[cm.id] || 0) }))
                  .filter((c) => c.qtd !== 0);
                const positivos = listaEstoque.filter((c) => c.qtd > 0);
                const negativos = listaEstoque.filter((c) => c.qtd < 0);

                return (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" sx={{ color: V3.ink, fontWeight: 900, letterSpacing: 1, fontSize: "0.65rem", display: "block", mb: 0.5 }}>
                      📦 ESTOQUE NACIONAL ({listaEstoque.length}/38)
                    </Typography>
                    <Typography variant="caption" sx={{ color: V3.ink, opacity: 0.5, fontSize: "0.55rem", display: "block", mb: 1, fontStyle: "italic" }}>
                      Soma dos estoques de todas as cidades do país. Vermelho = déficit.
                    </Typography>
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.4 }}>
                      {positivos.map((c) => (
                        <Chip
                          key={c.id}
                          label={`${c.icone} ${c.nome} ${c.qtd.toFixed(0)}`}
                          size="small"
                          sx={{
                            bgcolor: "#2d4a1f",
                            color: "#fff",
                            fontSize: "0.55rem",
                            height: 18,
                            fontWeight: 700,
                            "& .MuiChip-label": { px: 0.8 },
                          }}
                        />
                      ))}
                      {negativos.map((c) => (
                        <Chip
                          key={c.id}
                          label={`${c.icone} ${c.nome} ${c.qtd.toFixed(0)}`}
                          size="small"
                          sx={{
                            bgcolor: "#6b1f1f",
                            color: "#fff",
                            fontSize: "0.55rem",
                            height: 18,
                            fontWeight: 700,
                            "& .MuiChip-label": { px: 0.8 },
                          }}
                        />
                      ))}
                      {listaEstoque.length === 0 && (
                        <Typography variant="caption" sx={{ color: V3.ink, opacity: 0.5, fontSize: "0.6rem" }}>
                          Nada em estoque.
                        </Typography>
                      )}
                    </Box>
                  </Box>
                );
              })()}

              <Typography variant="caption" sx={{ color: V3.ink, fontWeight: 900, letterSpacing: 1, display: "block", mb: 1 }}>💰 COFRE NACIONAL</Typography>
              {podeEditarCofre ? (
                <TextField
                  type="number" size="small" value={cofreAtual}
                  onChange={(e) => setDoc(doc(db, "sim_paises", paisLive.id), { cofre: Number(e.target.value) || 0 }, { merge: true })}
                  fullWidth
                  sx={{ bgcolor: V3.paperDark, mb: 2 }}
                  InputProps={{ sx: { color: V3.ink, fontFamily: "Georgia, serif", fontWeight: 800 } }}
                />
              ) : (
                <Typography sx={{ color: V3.ink, fontWeight: 800, fontFamily: "Georgia, serif", mb: 2 }}>
                  {cofreAtual.toLocaleString("pt-BR")}
                </Typography>
              )}

              {renderPainelEdificios("pais", paisLive, paisLive.id)}

              <PainelLeis
                nivel="pais"
                alvo={paisLive}
                pais={paisLive}
                provincia={null}
                cidade={null}
                paises={paises}
                isMaster={isMaster}
                userEmail={userEmail}
                podeEditar={podeEditarLeis}
              />
            </>
          );
        })()}
      </FloatingDialog>

      <FloatingDialog
        open={techTreeOpen}
        onClose={() => setTechTreeOpen(false)}
        id="sim_tech_tree"
        titulo="🌳 Árvore de Tecnologia"
        subtitulo={paisAberto ? `${paises[paisAberto.id]?.nome || paisAberto.nome}` : "Selecione um país"}
        cor={V3.gold}
        larguraInicial={900}
        alturaInicial={680}
      >
        {(() => {
          const paisTech = paisAberto ? (paises[paisAberto.id] || paisAberto) : null;
          if (!paisTech) {
            return (
              <Typography sx={{ color: V3.ink, fontFamily: "Georgia, serif", textAlign: "center", py: 4 }}>
                Abra um país primeiro para acessar a árvore.
              </Typography>
            );
          }
          const pesquisadas = [...pesquisadasSet(paisTech)];
          const pesquisando = paisTech.pesquisaAtual?.id || null;
          const progresso = paisTech.pesquisaAtual?.progresso || 0;
          const cofre = paisTech.cofre || 0;
          const podeEditar = isMaster || temPoderNoEscopo(userEmail, "editarOrcamento", "pais", paisTech.id);

          const iniciarPesquisa = async (tec) => {
            if (!podeEditar) return;
            if (pesquisadas.includes(tec.id)) return;
            if (pesquisando) {
              alert("Já existe uma pesquisa em andamento. Conclua-a primeiro.");
              return;
            }
            if (!isMaster && cofre < tec.custo) {
              alert(`💰 Cofre insuficiente.\nNecessário: ${tec.custo.toLocaleString("pt-BR")}\nDisponível: ${cofre.toLocaleString("pt-BR")}`);
              return;
            }
            const agora = Date.now();
            const concluiEm = new Date(agora + tec.tempoHoras * 60 * 60 * 1000).toISOString();
            await setDoc(doc(db, "sim_paises", paisTech.id), {
              cofre: isMaster ? cofre : cofre - tec.custo,
              pesquisaAtual: { id: tec.id, iniciadoEm: new Date(agora).toISOString(), concluiEm },
            }, { merge: true });
            alert(`🔬 Pesquisa iniciada: ${tec.nome}\nCusto: ${tec.custo.toLocaleString("pt-BR")}\nConclusão em ${tec.tempoHoras}h.`);
          };

          const cancelarPesquisa = async () => {
            if (!pesquisando) return;
            if (!window.confirm("Cancelar pesquisa em andamento? O custo não é devolvido.")) return;
            await setDoc(doc(db, "sim_paises", paisTech.id), { pesquisaAtual: null }, { merge: true });
          };

          return (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {pesquisando && (() => {
                const tec = TECNOLOGIAS.find((t) => t.id === pesquisando);
                const pesq = paisTech.pesquisaAtual;
                const restantes = horasRestantes(pesq);
                const total = tec?.tempoHoras || 1;
                const decorrido = total - restantes;
                const pct = Math.max(0, Math.min(100, (decorrido / total) * 100));
                return (
                  <Paper sx={{ p: 1.2, bgcolor: `${V3.gold}22`, border: `2px solid ${V3.gold}66` }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Typography sx={{ fontSize: "1.3rem" }}>{tec?.icone}</Typography>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="caption" sx={{ color: V3.ink, fontWeight: 900, fontSize: "0.7rem", display: "block" }}>
                          🔬 PESQUISANDO: {tec?.nome}
                        </Typography>
                        <Box sx={{ height: 8, bgcolor: "rgba(0,0,0,0.2)", borderRadius: 4, overflow: "hidden", mt: 0.5 }}>
                          <Box sx={{ height: "100%", width: `${pct}%`, bgcolor: V3.gold, transition: "width 0.3s" }} />
                        </Box>
                      </Box>
                      <Typography variant="caption" sx={{ color: V3.ink, fontWeight: 900, fontFamily: "Georgia, serif", minWidth: 70, textAlign: "right" }}>
                        ⏱️ {formatarTempoRestante(restantes)}
                      </Typography>
                      {podeEditar && (
                        <Button size="small" onClick={cancelarPesquisa} sx={{ color: V3.red, fontSize: "0.6rem" }}>
                          Cancelar
                        </Button>
                      )}
                    </Box>
                  </Paper>
                );
              })()}

              {ERAS.map((era) => (
                <Box key={era.id}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1, pb: 0.5, borderBottom: `2px solid ${era.cor}` }}>
                    <Typography sx={{ fontSize: "1.2rem" }}>{era.icone}</Typography>
                    <Box sx={{ flex: 1 }}>
                      <Typography sx={{ color: era.cor, fontWeight: 900, fontFamily: "Georgia, serif", fontSize: "0.9rem", letterSpacing: 0.5 }}>
                        {era.nome}
                      </Typography>
                      <Typography variant="caption" sx={{ color: V3.ink, opacity: 0.6, fontSize: "0.55rem" }}>
                        {era.desc}
                      </Typography>
                    </Box>
                    <Chip
                      label={`${tecnologiasDaEra(era.id).filter((t) => pesquisadas.includes(t.id)).length}/${tecnologiasDaEra(era.id).length}`}
                      size="small"
                      sx={{ bgcolor: era.cor, color: "#fff", fontWeight: 900, fontSize: "0.55rem", height: 18 }}
                    />
                  </Box>
                  <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1 }}>
                    {tecnologiasDaEra(era.id).map((tec) => {
                      const jaPesq = pesquisadas.includes(tec.id);
                      const emPesq = pesquisando === tec.id;
                      const disponivel = tecDisponivel(tec, pesquisadas);
                      const travado = !disponivel && !jaPesq && !isMaster;
                      const semCofre = !isMaster && cofre < tec.custo;

                      return (
                        <Paper
                          key={tec.id}
                          sx={{
                            p: 1.2,
                            bgcolor: jaPesq ? `${V3.green}15` : travado ? "#2a2520" : V3.paperDark,
                            border: jaPesq ? `2px solid ${V3.green}` : emPesq ? `2px solid ${V3.gold}` : travado ? `1px dashed #666` : `1px solid ${era.cor}44`,
                            opacity: travado ? 0.55 : 1,
                            filter: travado ? "grayscale(0.6)" : "none",
                            transition: "all 0.15s",
                          }}
                        >
                          <Box sx={{ display: "flex", alignItems: "flex-start", gap: 0.8, mb: 0.6 }}>
                            <Box
                              sx={{
                                width: 34, height: 34, borderRadius: "50%",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                bgcolor: `${era.cor}33`, border: `2px solid ${era.cor}`,
                                fontSize: "1.1rem", flexShrink: 0,
                              }}
                            >
                              {tec.icone}
                            </Box>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography variant="body2" sx={{ color: travado ? "#888" : V3.ink, fontWeight: 900, fontFamily: "Georgia, serif", fontSize: "0.75rem", lineHeight: 1.15 }}>
                                {tec.nome}
                              </Typography>
                              <Typography variant="caption" sx={{ color: travado ? "#666" : V3.ink, opacity: 0.6, fontSize: "0.55rem", display: "block", lineHeight: 1.2, mt: 0.2 }}>
                                {tec.desc}
                              </Typography>
                            </Box>
                            {jaPesq && <Chip label="✓" size="small" sx={{ bgcolor: V3.green, color: "#fff", fontWeight: 900, fontSize: "0.5rem", height: 16, minWidth: 18 }} />}
                            {emPesq && <Chip label="🔬" size="small" sx={{ bgcolor: V3.gold, color: V3.ink, fontWeight: 900, fontSize: "0.5rem", height: 16, minWidth: 18 }} />}
                          </Box>

                          {tec.requer.length > 0 && (
                            <Typography variant="caption" sx={{ color: V3.ink, opacity: 0.6, fontSize: "0.5rem", display: "block", mb: 0.5 }}>
                              Requer: {tec.requer.map((r) => TECNOLOGIAS.find((t) => t.id === r)?.nome).join(", ")}
                            </Typography>
                          )}

                          {Object.keys(tec.efeitos || {}).length > 0 && (
                            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.3, mb: 0.6 }}>
                              {Object.entries(tec.efeitos).map(([k, v]) => (
                                <Chip
                                  key={k}
                                  label={`${k.replace(/([A-Z])/g, " $1").trim()} ${v > 1 ? "▲" : "▼"}`}
                                  size="small"
                                  sx={{
                                    fontSize: "0.45rem", height: 13,
                                    bgcolor: v > 1 ? `${V3.green}33` : `${V3.red}33`,
                                    color: V3.ink, fontWeight: 700,
                                  }}
                                />
                              ))}
                            </Box>
                          )}

                          {!jaPesq && !emPesq && (
                            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                              <Typography variant="caption" sx={{ color: semCofre ? V3.red : V3.green, fontSize: "0.6rem", fontWeight: 800, flex: 1 }}>
                                💰 {tec.custo.toLocaleString("pt-BR")} • ⏱️ {tec.tempoHoras}h
                              </Typography>
                              <Button
                                size="small"
                                onClick={() => iniciarPesquisa(tec)}
                                disabled={!podeEditar || !!pesquisando || (!isMaster && (travado || semCofre))}
                                sx={{
                                  bgcolor: travado || semCofre ? "#444" : V3.gold,
                                  color: V3.ink,
                                  fontWeight: 900,
                                  fontSize: "0.55rem",
                                  fontFamily: "Georgia, serif",
                                  py: 0.2,
                                  px: 0.8,
                                  minWidth: 0,
                                  "&:hover": { bgcolor: V3.goldLight },
                                }}
                              >
                                🔬 Pesquisar
                              </Button>
                            </Box>
                          )}
                        </Paper>
                      );
                    })}
                  </Box>
                </Box>
              ))}
            </Box>
          );
        })()}
      </FloatingDialog>

      <FloatingDialog
        open={modalNegociacaoOpen}
        onClose={() => setModalNegociacaoOpen(false)}
        id="sim_nova_negociacao"
        titulo="🤝 Nova Proposta"
        subtitulo={TIPOS_NEGOCIACAO.find((t) => t.id === formNegociacao.tipo)?.nome || "Escolha um tipo"}
        cor={TIPOS_NEGOCIACAO.find((t) => t.id === formNegociacao.tipo)?.cor || V3.gold}
        larguraInicial={760}
        alturaInicial={680}
      >
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          <Box>
            <Typography variant="caption" sx={{ color: V3.ink, fontWeight: 900, letterSpacing: 1, fontSize: "0.65rem", display: "block", mb: 0.5 }}>
              TIPO DE NEGOCIAÇÃO
            </Typography>
            <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
              {TIPOS_NEGOCIACAO.map((t) => (
                <Button
                  key={t.id}
                  size="small"
                  onClick={() => setFormNegociacao((p) => ({ ...p, tipo: t.id }))}
                  sx={{
                    bgcolor: formNegociacao.tipo === t.id ? t.cor : `${t.cor}22`,
                    color: formNegociacao.tipo === t.id ? "#fff" : V3.ink,
                    border: `1px solid ${t.cor}`,
                    fontWeight: 800,
                    fontSize: "0.65rem",
                    "&:hover": { bgcolor: `${t.cor}44` },
                  }}
                >
                  {t.icone} {t.nome}
                </Button>
              ))}
            </Box>
            <Typography variant="caption" sx={{ color: V3.ink, opacity: 0.7, fontSize: "0.6rem", display: "block", mt: 0.5, fontStyle: "italic" }}>
              {TIPOS_NEGOCIACAO.find((t) => t.id === formNegociacao.tipo)?.desc}
            </Typography>
          </Box>

          <Box>
            <Typography variant="caption" sx={{ color: V3.ink, fontWeight: 900, letterSpacing: 1, fontSize: "0.65rem", display: "block", mb: 0.5 }}>
              DE (SEU CARGO)
            </Typography>
            {(() => {
              const cargos = meusCargos(userEmail).filter((c) => c.escopoNivel === "pais" || c.escopo?.nivel === "pais");
              if (cargos.length === 0) {
                return (
                  <Paper sx={{ p: 1, bgcolor: `${V3.red}15`, border: `1px dashed ${V3.red}66`, textAlign: "center" }}>
                    <Typography variant="caption" sx={{ color: V3.red, fontWeight: 800, fontSize: "0.7rem" }}>
                      ⚠️ Você não ocupa cargo nacional. Só quem governa pode negociar.
                    </Typography>
                  </Paper>
                );
              }
              if (cargos.length === 1) {
                const c = cargos[0];
                const p = paises[c.paisId];
                return (
                  <Paper sx={{ p: 1, bgcolor: V3.paper, border: `1px solid ${p?.cor || V3.gold}66`, display: "flex", alignItems: "center", gap: 1 }}>
                    <Box sx={{ width: 8, height: 24, bgcolor: p?.cor || V3.gold, borderRadius: 1 }} />
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" sx={{ color: V3.ink, fontWeight: 900, fontFamily: "Georgia, serif", fontSize: "0.75rem" }}>
                        {p?.nome || c.paisId}
                      </Typography>
                      <Typography variant="caption" sx={{ color: V3.ink, opacity: 0.65, fontSize: "0.55rem" }}>
                        Como {c.nome || c.id}
                      </Typography>
                    </Box>
                  </Paper>
                );
              }
              return (
                <FormControl size="small" fullWidth>
                  <Select
                    value={origemNeg.id || ""}
                    onChange={(e) => {
                      const c = cargos.find((x) => x.paisId === e.target.value);
                      setOrigemNeg({ nivel: "pais", id: e.target.value, nome: c?.paisNome, holderEmail: userEmail });
                    }}
                    sx={{ bgcolor: V3.paper, color: V3.ink, fontSize: "0.75rem" }}
                    MenuProps={{ PaperProps: { sx: { bgcolor: V3.paper } } }}
                  >
                    {cargos.map((c) => (
                      <MenuItem key={c.paisId + c.id} value={c.paisId} sx={{ fontSize: "0.75rem", color: V3.ink }}>
                        {c.paisNome} — como {c.nome}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              );
            })()}
          </Box>

          <Box>
            <Typography variant="caption" sx={{ color: V3.ink, fontWeight: 900, letterSpacing: 1, fontSize: "0.65rem", display: "block", mb: 0.5 }}>
              PARA (ALVO)
            </Typography>
            <Box sx={{ display: "flex", gap: 0.5, mb: 0.5 }}>
              {["pais", "provincia", "cidade"].map((nv) => (
                <Button
                  key={nv}
                  size="small"
                  onClick={() => setFormNegociacao((p) => ({ ...p, destinoNivel: nv, destinoId: "" }))}
                  sx={{
                    bgcolor: formNegociacao.destinoNivel === nv ? V3.gold : `${V3.gold}22`,
                    color: V3.ink,
                    border: `1px solid ${V3.gold}`,
                    fontWeight: 800,
                    fontSize: "0.6rem",
                    flex: 1,
                  }}
                >
                  {nv.toUpperCase()}
                </Button>
              ))}
            </Box>
            <FormControl size="small" fullWidth>
              <Select
                value={formNegociacao.destinoId || ""}
                onChange={(e) => setFormNegociacao((p) => ({ ...p, destinoId: e.target.value }))}
                displayEmpty
                sx={{ bgcolor: V3.paper, color: V3.ink, fontSize: "0.75rem" }}
                MenuProps={{ PaperProps: { sx: { bgcolor: V3.paper, maxHeight: 320 } } }}
              >
                <MenuItem value="" sx={{ fontSize: "0.75rem", color: V3.red }}>— Selecione —</MenuItem>
                {formNegociacao.destinoNivel === "pais" &&
                  Object.values(paises).map((p) => (
                    <MenuItem key={p.id} value={p.id} sx={{ fontSize: "0.75rem", color: V3.ink }}>{p.nome}</MenuItem>
                  ))}
                {formNegociacao.destinoNivel === "provincia" &&
                  Object.values(provincias).map((pv) => (
                    <MenuItem key={pv.id} value={pv.id} sx={{ fontSize: "0.75rem", color: V3.ink }}>
                      {pv.nome} ({paises[pv.paisId]?.nome || "?"})
                    </MenuItem>
                  ))}
                {formNegociacao.destinoNivel === "cidade" &&
                  Object.values(cidades).map((c) => (
                    <MenuItem key={c.id} value={c.id} sx={{ fontSize: "0.75rem", color: V3.ink }}>
                      {c.nome} — 💰 {((c.cofre || 0)).toLocaleString("pt-BR")} ({paises[c.paisId]?.nome || "?"})
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
          </Box>

          <TextField
            label="Título"
            size="small"
            fullWidth
            value={formNegociacao.titulo}
            onChange={(e) => setFormNegociacao((p) => ({ ...p, titulo: e.target.value }))}
            sx={{ bgcolor: V3.paper }}
            InputProps={{ sx: { color: V3.ink, fontSize: "0.75rem" } }}
            InputLabelProps={{ sx: { color: V3.ink, fontSize: "0.75rem" } }}
          />
          <TextField
            label="Descrição"
            size="small"
            fullWidth
            multiline
            rows={2}
            value={formNegociacao.descricao}
            onChange={(e) => setFormNegociacao((p) => ({ ...p, descricao: e.target.value }))}
            sx={{ bgcolor: V3.paper }}
            InputProps={{ sx: { color: V3.ink, fontSize: "0.75rem" } }}
            InputLabelProps={{ sx: { color: V3.ink, fontSize: "0.75rem" } }}
          />

          <Box sx={{ p: 1.2, bgcolor: V3.paperDark, border: `1px solid ${V3.green}66`, borderRadius: 1 }}>
            <Typography variant="caption" sx={{ color: V3.green, fontWeight: 900, letterSpacing: 1, fontSize: "0.7rem", display: "block", mb: 0.5 }}>
              📤 VOCÊ OFERECE
            </Typography>
            <TextField
              label="Dinheiro"
              type="number"
              size="small"
              fullWidth
              value={formNegociacao.ofertaDinheiro}
              onChange={(e) => setFormNegociacao((p) => ({ ...p, ofertaDinheiro: Number(e.target.value) || 0 }))}
              sx={{ bgcolor: V3.paper, mb: 0.8 }}
              InputProps={{ sx: { color: V3.ink, fontSize: "0.75rem" } }}
              InputLabelProps={{ sx: { color: V3.ink, fontSize: "0.75rem" } }}
            />
            <Box sx={{ display: "flex", gap: 0.5 }}>
              <FormControl size="small" sx={{ flex: 2 }}>
                <InputLabel sx={{ color: V3.ink, fontSize: "0.75rem" }}>Commodity</InputLabel>
                <Select
                  value={formNegociacao.ofertaCommodityId || ""}
                  onChange={(e) => setFormNegociacao((p) => ({ ...p, ofertaCommodityId: e.target.value }))}
                  label="Commodity"
                  sx={{ bgcolor: V3.paper, color: V3.ink, fontSize: "0.75rem" }}
                  MenuProps={{ PaperProps: { sx: { bgcolor: V3.paper } } }}
                >
                  <MenuItem value="" sx={{ fontSize: "0.75rem" }}>— Nenhuma —</MenuItem>
                  {Object.values(commodities).map((c) => (
                    <MenuItem key={c.id} value={c.id} sx={{ fontSize: "0.75rem", color: V3.ink }}>
                      {c.icone} {c.nome}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label="Qtd"
                type="number"
                size="small"
                value={formNegociacao.ofertaCommodityQtd}
                onChange={(e) => setFormNegociacao((p) => ({ ...p, ofertaCommodityQtd: Number(e.target.value) || 0 }))}
                sx={{ bgcolor: V3.paper, flex: 1 }}
                InputProps={{ sx: { color: V3.ink, fontSize: "0.75rem" } }}
                InputLabelProps={{ sx: { color: V3.ink, fontSize: "0.75rem" } }}
              />
            </Box>
            <Box sx={{ display: "flex", gap: 0.5, mt: 0.5 }}>
              <FormControl size="small" sx={{ flex: 2 }}>
                <InputLabel sx={{ color: V3.ink, fontSize: "0.75rem" }}>Grupos de Interesse</InputLabel>
                <Select
                  value={formNegociacao.ofertaPoderIGId || ""}
                  onChange={(e) => setFormNegociacao((p) => ({ ...p, ofertaPoderIGId: e.target.value }))}
                  label="Grupos de Interesse"
                  sx={{ bgcolor: V3.paper, color: V3.ink, fontSize: "0.75rem" }}
                  MenuProps={{ PaperProps: { sx: { bgcolor: V3.paper, maxHeight: 320 } } }}
                >
                  <MenuItem value="" sx={{ fontSize: "0.75rem" }}>— Nenhum —</MenuItem>
                  {Object.values(igs).map((ig) => (
                    <MenuItem key={ig.id} value={ig.id} sx={{ fontSize: "0.75rem", color: V3.ink }}>
                      {ig.icone} {ig.nome}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label="Valor"
                type="number"
                size="small"
                value={formNegociacao.ofertaPoderIGValor}
                onChange={(e) => setFormNegociacao((p) => ({ ...p, ofertaPoderIGValor: Number(e.target.value) || 0 }))}
                sx={{ bgcolor: V3.paper, flex: 1 }}
                InputProps={{ sx: { color: V3.ink, fontSize: "0.75rem" } }}
                InputLabelProps={{ sx: { color: V3.ink, fontSize: "0.75rem" } }}
              />
            </Box>
          </Box>

          <Box sx={{ p: 1.2, bgcolor: V3.paperDark, border: `1px solid ${V3.red}66`, borderRadius: 1 }}>
            <Typography variant="caption" sx={{ color: V3.red, fontWeight: 900, letterSpacing: 1, fontSize: "0.7rem", display: "block", mb: 0.5 }}>
              📥 VOCÊ PEDE
            </Typography>
            {(() => {
              const estoqueAlvo = (() => {
                if (!formNegociacao.destinoId) return {};
                const { destinoNivel, destinoId } = formNegociacao;
                let cidadesAlvo = [];
                if (destinoNivel === "cidade") {
                  cidadesAlvo = cidades[destinoId] ? [cidades[destinoId]] : [];
                } else if (destinoNivel === "provincia") {
                  const pv = provincias[destinoId];
                  if (pv) cidadesAlvo = (pv.cidadesIds || []).map((id) => cidades[id]).filter(Boolean);
                } else if (destinoNivel === "pais") {
                  cidadesAlvo = Object.values(cidades).filter((c) => c.paisId === destinoId);
                }
                const total = {};
                for (const c of cidadesAlvo) {
                  for (const [cid, qtd] of Object.entries(c.estoque || {})) {
                    total[cid] = (total[cid] || 0) + Number(qtd || 0);
                  }
                }
                return total;
              })();
              const cofreAlvo = (() => {
                if (formNegociacao.destinoNivel === "pais") return paises[formNegociacao.destinoId]?.cofre || 0;
                return 0;
              })();

              return (
                <>
                  <TextField
                    label={`Dinheiro (alvo tem ${cofreAlvo.toLocaleString("pt-BR")})`}
                    type="number"
                    size="small"
                    fullWidth
                    value={formNegociacao.pedidoDinheiro}
                    onChange={(e) => setFormNegociacao((p) => ({ ...p, pedidoDinheiro: Number(e.target.value) || 0 }))}
                    sx={{ bgcolor: V3.paper, mb: 0.8 }}
                    InputProps={{ sx: { color: V3.ink, fontSize: "0.75rem" } }}
                    InputLabelProps={{ sx: { color: V3.ink, fontSize: "0.75rem" } }}
                  />
                  <Box sx={{ display: "flex", gap: 0.5 }}>
                    <FormControl size="small" sx={{ flex: 2 }}>
                      <InputLabel sx={{ color: V3.ink, fontSize: "0.75rem" }}>Commodity</InputLabel>
                      <Select
                        value={formNegociacao.pedidoCommodityId || ""}
                        onChange={(e) => setFormNegociacao((p) => ({ ...p, pedidoCommodityId: e.target.value }))}
                        label="Commodity"
                        sx={{ bgcolor: V3.paper, color: V3.ink, fontSize: "0.75rem" }}
                        MenuProps={{ PaperProps: { sx: { bgcolor: V3.paper, maxHeight: 320 } } }}
                      >
                        <MenuItem value="" sx={{ fontSize: "0.75rem" }}>— Nenhuma —</MenuItem>
                        {Object.values(commodities).map((c) => {
                          const tem = Math.max(0, Math.round(estoqueAlvo[c.id] || 0));
                          return (
                            <MenuItem key={c.id} value={c.id} sx={{ fontSize: "0.75rem", color: tem > 0 ? V3.ink : "#888" }}>
                              {c.icone} {c.nome} — <strong style={{ color: tem > 0 ? V3.green : "#888" }}>{tem}</strong>
                            </MenuItem>
                          );
                        })}
                      </Select>
                    </FormControl>
                    <TextField
                      label="Qtd"
                      type="number"
                      size="small"
                      value={formNegociacao.pedidoCommodityQtd}
                      onChange={(e) => setFormNegociacao((p) => ({ ...p, pedidoCommodityQtd: Number(e.target.value) || 0 }))}
                      sx={{ bgcolor: V3.paper, flex: 1 }}
                      InputProps={{ sx: { color: V3.ink, fontSize: "0.75rem" } }}
                      InputLabelProps={{ sx: { color: V3.ink, fontSize: "0.75rem" } }}
                    />
                  </Box>
                  {formNegociacao.pedidoCommodityId && (() => {
                    const tem = Math.round(estoqueAlvo[formNegociacao.pedidoCommodityId] || 0);
                    const ped = formNegociacao.pedidoCommodityQtd || 0;
                    if (tem <= 0) {
                      return (
                        <Typography variant="caption" sx={{ color: V3.red, fontWeight: 800, fontSize: "0.6rem", display: "block", mt: 0.4 }}>
                          ⚠️ O alvo não tem estoque desta commodity.
                        </Typography>
                      );
                    }
                    if (ped > tem) {
                      return (
                        <Typography variant="caption" sx={{ color: V3.red, fontWeight: 800, fontSize: "0.6rem", display: "block", mt: 0.4 }}>
                          ⚠️ Pedindo {ped} — alvo só tem {tem}. Chance reduzida.
                        </Typography>
                      );
                    }
                    const pct = tem > 0 ? (ped / tem) : 0;
                    return (
                      <Typography variant="caption" sx={{ color: pct > 0.7 ? V3.red : pct > 0.4 ? V3.gold : V3.green, fontWeight: 700, fontSize: "0.6rem", display: "block", mt: 0.4 }}>
                        Alvo tem {tem} — pedindo {Math.round(pct * 100)}% do estoque.
                      </Typography>
                    );
                  })()}
                  <Box sx={{ display: "flex", gap: 0.5, mt: 0.8 }}>
                    <FormControl size="small" sx={{ flex: 2 }}>
                      <InputLabel sx={{ color: V3.ink, fontSize: "0.75rem" }}>Grupos de Interesse</InputLabel>
                      <Select
                        value={formNegociacao.pedidoPoderIGId || ""}
                        onChange={(e) => setFormNegociacao((p) => ({ ...p, pedidoPoderIGId: e.target.value }))}
                        label="Grupos de Interesse"
                        sx={{ bgcolor: V3.paper, color: V3.ink, fontSize: "0.75rem" }}
                        MenuProps={{ PaperProps: { sx: { bgcolor: V3.paper, maxHeight: 320 } } }}
                      >
                        <MenuItem value="" sx={{ fontSize: "0.75rem" }}>— Nenhum —</MenuItem>
                        {Object.values(igs).map((ig) => (
                          <MenuItem key={ig.id} value={ig.id} sx={{ fontSize: "0.75rem", color: V3.ink }}>
                            {ig.icone} {ig.nome} (poder {ig.poder})
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <TextField
                      label="Valor"
                      type="number"
                      size="small"
                      value={formNegociacao.pedidoPoderIGValor}
                      onChange={(e) => setFormNegociacao((p) => ({ ...p, pedidoPoderIGValor: Number(e.target.value) || 0 }))}
                      sx={{ bgcolor: V3.paper, flex: 1 }}
                      InputProps={{ sx: { color: V3.ink, fontSize: "0.75rem" } }}
                      InputLabelProps={{ sx: { color: V3.ink, fontSize: "0.75rem" } }}
                    />
                  </Box>
                </>
              );
            })()}
          </Box>

          {(() => {
            const oferta = {
              dinheiro: formNegociacao.ofertaDinheiro,
              commodity: formNegociacao.ofertaCommodityId ? { id: formNegociacao.ofertaCommodityId, quantidade: formNegociacao.ofertaCommodityQtd } : null,
              poderIG: formNegociacao.ofertaPoderIGId ? { id: formNegociacao.ofertaPoderIGId, valor: formNegociacao.ofertaPoderIGValor } : null,
            };
            const pedido = {
              dinheiro: formNegociacao.pedidoDinheiro,
              commodity: formNegociacao.pedidoCommodityId ? { id: formNegociacao.pedidoCommodityId, quantidade: formNegociacao.pedidoCommodityQtd } : null,
              poderIG: formNegociacao.pedidoPoderIGId ? { id: formNegociacao.pedidoPoderIGId, valor: formNegociacao.pedidoPoderIGValor } : null,
            };
            const estoqueAlvo = (() => {
              if (!formNegociacao.destinoId) return {};
              const { destinoNivel, destinoId } = formNegociacao;
              let cidadesAlvo = [];
              if (destinoNivel === "cidade") cidadesAlvo = cidades[destinoId] ? [cidades[destinoId]] : [];
              else if (destinoNivel === "provincia") {
                const pv = provincias[destinoId];
                if (pv) cidadesAlvo = (pv.cidadesIds || []).map((id) => cidades[id]).filter(Boolean);
              } else if (destinoNivel === "pais") {
                cidadesAlvo = Object.values(cidades).filter((c) => c.paisId === destinoId);
              }
              const total = {};
              for (const c of cidadesAlvo) {
                for (const [cid, qtd] of Object.entries(c.estoque || {})) {
                  total[cid] = (total[cid] || 0) + Number(qtd || 0);
                }
              }
              return total;
            })();

            const paisAlvo = formNegociacao.destinoNivel === "pais" ? paises[formNegociacao.destinoId] :
              formNegociacao.destinoNivel === "provincia" ? paises[provincias[formNegociacao.destinoId]?.paisId] :
              paises[cidades[formNegociacao.destinoId]?.paisId];
            const paisDe = origemNeg.id ? paises[origemNeg.id] : null;

            const impostoAlvo = paisAlvo ? getImpostoEfetivo(paisAlvo.leis || {}, formNegociacao.tipo) : 0;
            const impostoDe = paisDe ? getImpostoEfetivo(paisDe.leis || {}, formNegociacao.tipo) : 0;

            const calcBase = calcularChanceNegociacao({
              tipo: formNegociacao.tipo,
              oferta,
              pedido,
              commodities,
              impostoAlvo,
            });

            let penalidadeEstoque = 0;
            if (pedido.commodity && pedido.commodity.id && pedido.commodity.quantidade > 0) {
              const tem = Math.max(1, Number(estoqueAlvo[pedido.commodity.id]) || 0);
              const pct = Math.min(1, pedido.commodity.quantidade / tem);
              penalidadeEstoque = -Math.round(pct * 40);
            }

            const calc = { ...calcBase, chance: Math.max(5, Math.min(95, calcBase.chance + penalidadeEstoque)) };
            return (
              <Paper sx={{ p: 1.2, bgcolor: V3.bg2, border: `2px solid ${V3.gold}` }}>
                <Typography variant="caption" sx={{ color: V3.goldLight, fontWeight: 900, letterSpacing: 1, fontSize: "0.65rem", display: "block", textAlign: "center" }}>
                  🎲 CHANCE ESTIMADA
                </Typography>
                <Typography variant="h4" sx={{ color: V3.goldLight, fontWeight: 900, fontFamily: "Georgia, serif", textAlign: "center" }}>
                  {calc.chance}%
                </Typography>
                <Typography variant="caption" sx={{ color: V3.goldLight, opacity: 0.7, fontSize: "0.6rem", display: "block", textAlign: "center", mb: 0.8 }}>
                  Oferta: {calc.valorOferta.toLocaleString("pt-BR")} • Pedido: {calc.valorPedido.toLocaleString("pt-BR")}
                </Typography>
                <Divider sx={{ borderColor: `${V3.goldLight}33`, my: 0.5 }} />
                <Box sx={{ display: "flex", justifyContent: "space-between", mt: 0.5 }}>
                  <Typography variant="caption" sx={{ color: V3.goldLight, fontSize: "0.6rem" }}>
                    🛃 Imposto do alvo:
                  </Typography>
                  <Typography variant="caption" sx={{ color: impostoAlvo > 30 ? V3.red : impostoAlvo > 15 ? V3.gold : V3.green, fontWeight: 900, fontSize: "0.6rem" }}>
                    {impostoAlvo}% {calc.bonusImposto !== 0 && `(${calc.bonusImposto}%)`}
                  </Typography>
                </Box>
                {pedido.commodity && pedido.commodity.id && (
                  <Box sx={{ display: "flex", justifyContent: "space-between", mt: 0.3 }}>
                    <Typography variant="caption" sx={{ color: V3.goldLight, fontSize: "0.6rem" }}>
                      📦 Você receberá:
                    </Typography>
                    <Typography variant="caption" sx={{ color: V3.goldLight, fontWeight: 900, fontSize: "0.6rem" }}>
                      {Math.round(pedido.commodity.quantidade * (1 - impostoAlvo / 100))} (era {pedido.commodity.quantidade})
                    </Typography>
                  </Box>
                )}
                {penalidadeEstoque < 0 && (
                  <Box sx={{ display: "flex", justifyContent: "space-between", mt: 0.3 }}>
                    <Typography variant="caption" sx={{ color: V3.red, fontSize: "0.6rem" }}>
                      ⚠️ Estoque insuficiente:
                    </Typography>
                    <Typography variant="caption" sx={{ color: V3.red, fontWeight: 900, fontSize: "0.6rem" }}>
                      {penalidadeEstoque}%
                    </Typography>
                  </Box>
                )}
              </Paper>
            );
          })()}

          <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end", mt: 1 }}>
            <Button
              onClick={() => setModalNegociacaoOpen(false)}
              sx={{ color: V3.red, fontWeight: 800 }}
            >
              Cancelar
            </Button>
            <Button
              variant="contained"
              onClick={async () => {
                if (!origemNeg.id) return alert("Selecione o país de origem.");
                if (!formNegociacao.destinoId) return alert("Selecione o alvo.");
                if (!formNegociacao.titulo.trim()) return alert("Digite um título.");

                if (formNegociacao.destinoNivel !== "pais") {
                  const paisDoAlvo =
                    formNegociacao.destinoNivel === "provincia"
                      ? provincias[formNegociacao.destinoId]?.paisId
                      : cidades[formNegociacao.destinoId]?.paisId;
                  if (paisDoAlvo !== origemNeg.id) {
                    return alert("⚠️ Negociação internacional só pode ser feita entre PAÍSES.\nNegociações com províncias e cidades são apenas dentro do seu próprio país.");
                  }
                }

                const pDe = paises[origemNeg.id];
                const alvo =
                  formNegociacao.destinoNivel === "pais" ? paises[formNegociacao.destinoId] :
                  formNegociacao.destinoNivel === "provincia" ? provincias[formNegociacao.destinoId] :
                  cidades[formNegociacao.destinoId];
                if (!alvo) return alert("Alvo não encontrado.");

                const oferta = {
                  dinheiro: formNegociacao.ofertaDinheiro || 0,
                  commodity: formNegociacao.ofertaCommodityId ? { id: formNegociacao.ofertaCommodityId, quantidade: formNegociacao.ofertaCommodityQtd || 0 } : null,
                  poderIG: formNegociacao.ofertaPoderIGId ? { id: formNegociacao.ofertaPoderIGId, valor: formNegociacao.ofertaPoderIGValor || 0 } : null,
                };
                const pedido = {
                  dinheiro: formNegociacao.pedidoDinheiro || 0,
                  commodity: formNegociacao.pedidoCommodityId ? { id: formNegociacao.pedidoCommodityId, quantidade: formNegociacao.pedidoCommodityQtd || 0 } : null,
                  poderIG: formNegociacao.pedidoPoderIGId ? { id: formNegociacao.pedidoPoderIGId, valor: formNegociacao.pedidoPoderIGValor || 0 } : null,
                };

                const paisAlvo = formNegociacao.destinoNivel === "pais" ? paises[formNegociacao.destinoId] :
                  formNegociacao.destinoNivel === "provincia" ? paises[provincias[formNegociacao.destinoId]?.paisId] :
                  paises[cidades[formNegociacao.destinoId]?.paisId];
                const impostoAlvo = paisAlvo ? getImpostoEfetivo(paisAlvo.leis || {}, formNegociacao.tipo) : 0;

                const calc = calcularChanceNegociacao({
                  tipo: formNegociacao.tipo,
                  oferta,
                  pedido,
                  commodities,
                  impostoAlvo,
                });

                const id = gerarIdNegociacao();
                await setDoc(doc(db, "sim_negociacoes", id), {
                  id,
                  tipo: formNegociacao.tipo,
                  titulo: formNegociacao.titulo,
                  descricao: formNegociacao.descricao,
                  de: {
                    nivel: "pais",
                    id: origemNeg.id,
                    nome: pDe?.nome || origemNeg.id,
                    holderEmail: userEmail,
                  },
                  para: {
                    nivel: formNegociacao.destinoNivel,
                    id: formNegociacao.destinoId,
                    nome: alvo.nome || formNegociacao.destinoId,
                  },
                  oferta,
                  pedido,
                  impostoAlvo,
                  chanceSucesso: calc.chance,
                  status: "pendente",
                  criadoEm: new Date().toISOString(),
                }, { merge: true });

                alert("✅ Proposta enviada!");
                setModalNegociacaoOpen(false);
              }}
              sx={{ bgcolor: V3.gold, color: V3.ink, fontWeight: 900, fontFamily: "Georgia, serif", "&:hover": { bgcolor: V3.goldLight } }}
            >
              📤 Enviar Proposta
            </Button>
          </Box>
        </Box>
      </FloatingDialog>

      <FloatingDialog
        open={!!donoVisualizando}
        onClose={() => setDonoVisualizando(null)}
        id="sim_dono_visualizar"
        titulo={donoVisualizando ? `${donoVisualizando.edIcone} ${donoVisualizando.edNome}` : "Edifício"}
        subtitulo={donoVisualizando ? `${donoVisualizando.cidadeNome} · Nv ${donoVisualizando.nivel.toFixed(0)}/10` : ""}
        cor={donoVisualizando?.edCor || V3.gold}
        larguraInicial={620}
        alturaInicial={560}
      >
        {donoVisualizando && (() => {
          const cidade = cidades[donoVisualizando.cidadeId];
          if (!cidade) return null;

          const edifId = donoVisualizando.edId;
          const donoEdif = (cidade.edificiosDonos || {})[edifId] || null;

          // Varre todos os edifícios da cidade e agrupa por tipo de dono
          const edificios = cidade.edificios || {};
          const donos = cidade.edificiosDonos || {};
          let totalPublico = 0, niveisPublico = 0;
          const porEmpresa = {};
          const porPj = {};

          for (const [edId, nv] of Object.entries(edificios)) {
            if (!nv || nv <= 0) continue;
            const d = donos[edId];
            if (!d || d.tipo === "publico") {
              totalPublico++; niveisPublico += nv;
            } else if (d.tipo === "privado" && d.empresaId) {
              if (!porEmpresa[d.empresaId]) porEmpresa[d.empresaId] = { nome: d.empresaNome || "Empresa", edif: 0, niveis: 0, edifIds: [] };
              porEmpresa[d.empresaId].edif++;
              porEmpresa[d.empresaId].niveis += nv;
              porEmpresa[d.empresaId].edifIds.push(edId);
            } else if (d.tipo === "privado" && d.holderEmail) {
              if (!porPj[d.holderEmail]) porPj[d.holderEmail] = { nome: d.holderNome || d.holderEmail, email: d.holderEmail, edif: 0, niveis: 0, edifIds: [] };
              porPj[d.holderEmail].edif++;
              porPj[d.holderEmail].niveis += nv;
              porPj[d.holderEmail].edifIds.push(edId);
            }
          }
          const empresasArr = Object.entries(porEmpresa).sort((a, b) => b[1].niveis - a[1].niveis);
          const pjsArr = Object.entries(porPj).sort((a, b) => b[1].niveis - a[1].niveis);

          // Dono especificamente deste edifício
          const edifPublico = !donoEdif || donoEdif.tipo === "publico";
          const edifEmpresa = donoEdif?.tipo === "privado" && !!donoEdif.empresaId;
          const edifPJ = donoEdif?.tipo === "privado" && !donoEdif.empresaId;

          return (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.2 }}>
              <Paper sx={{ p: 1.2, bgcolor: `${donoVisualizando.edCor}15`, border: `2px solid ${donoVisualizando.edCor}66`, borderRadius: 1 }}>
                <Typography variant="caption" sx={{ color: V3.ink, fontWeight: 900, fontSize: "0.65rem", letterSpacing: 1, display: "block", mb: 0.4 }}>
                  DONO DESTE EDIFÍCIO
                </Typography>
                {edifPublico && (
                  <Typography sx={{ color: V3.gold, fontWeight: 900, fontFamily: "Georgia, serif", fontSize: "0.9rem" }}>
                    🏛️ Público (estado)
                  </Typography>
                )}
                {edifEmpresa && (
                  <Box>
                    <Typography sx={{ color: V3.green, fontWeight: 900, fontFamily: "Georgia, serif", fontSize: "0.9rem" }}>
                      🏢 {donoEdif.empresaNome || "Empresa"}
                    </Typography>
                    <Typography variant="caption" sx={{ color: V3.ink, opacity: 0.7, fontSize: "0.55rem", display: "block" }}>
                      Dono/operador: {donoEdif.holderNome || donoEdif.holderEmail || "—"}
                    </Typography>
                  </Box>
                )}
                {edifPJ && (
                  <Typography sx={{ color: V3.blue, fontWeight: 900, fontFamily: "Georgia, serif", fontSize: "0.9rem" }}>
                    👤 {donoEdif.holderNome || donoEdif.holderEmail}
                  </Typography>
                )}
              </Paper>

              <Divider sx={{ borderColor: `${V3.gold}44` }} />

              <Typography variant="caption" sx={{ color: V3.ink, fontWeight: 900, letterSpacing: 1, fontSize: "0.7rem", display: "block" }}>
                🏙️ QUEM OPERA NA CIDADE
              </Typography>

              <Paper sx={{ p: 1, bgcolor: V3.paperDark, border: `1px solid ${V3.gold}33`, borderRadius: 1 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.6 }}>
                  <Typography sx={{ fontSize: "1rem" }}>🏛️</Typography>
                  <Typography sx={{ color: V3.gold, fontWeight: 900, fontFamily: "Georgia, serif", fontSize: "0.75rem", flex: 1 }}>
                    Público (estado)
                  </Typography>
                  <Chip label={`${totalPublico} edif.`} size="small" sx={{ bgcolor: V3.gold, color: V3.ink, fontSize: "0.5rem", height: 16, fontWeight: 800 }} />
                  <Chip label={`${niveisPublico} nv`} size="small" sx={{ bgcolor: V3.ink, color: V3.gold, fontSize: "0.5rem", height: 16, fontWeight: 800 }} />
                </Box>
              </Paper>

              {empresasArr.length > 0 && (
                <Box>
                  <Typography variant="caption" sx={{ color: V3.green, fontWeight: 900, fontSize: "0.6rem", letterSpacing: 1, display: "block", mb: 0.4 }}>
                    🏢 EMPRESAS ({empresasArr.length})
                  </Typography>
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 0.4 }}>
                    {empresasArr.map(([empId, info]) => {
                      const empLive = empresas[empId];
                      const temEsteEdif = info.edifIds.includes(edifId);
                      return (
                        <Paper
                          key={empId}
                          sx={{
                            p: 0.8,
                            bgcolor: temEsteEdif ? `${V3.green}22` : V3.paperDark,
                            border: temEsteEdif ? `2px solid ${V3.green}` : `1px solid ${V3.green}44`,
                            borderRadius: 1,
                          }}
                        >
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.6 }}>
                            {empLive?.imagemUrl ? (
                              <Box component="img" src={empLive.imagemUrl} sx={{ width: 24, height: 24, borderRadius: 0.5, objectFit: "cover", border: `1px solid ${V3.green}66` }} />
                            ) : (
                              <Typography sx={{ fontSize: "1rem" }}>🏢</Typography>
                            )}
                            <Typography sx={{ flex: 1, color: V3.ink, fontWeight: 900, fontFamily: "Georgia, serif", fontSize: "0.75rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {info.nome}
                              {temEsteEdif && (
                                <Typography component="span" sx={{ ml: 0.5, color: V3.green, fontWeight: 800, fontSize: "0.55rem" }}>
                                  ← opera este aqui
                                </Typography>
                              )}
                            </Typography>
                            <Chip label={`${info.edif} edif.`} size="small" sx={{ bgcolor: V3.green, color: "#fff", fontSize: "0.5rem", height: 16, fontWeight: 800 }} />
                            <Chip label={`${info.niveis} nv`} size="small" sx={{ bgcolor: V3.ink, color: V3.gold, fontSize: "0.5rem", height: 16, fontWeight: 800 }} />
                            {empLive && (
                              <Button
                                size="small"
                                onClick={() => {
                                  setDonoVisualizando(null);
                                  setEmpresaAba("visao");
                                  setEmpresaAberta(empLive);
                                }}
                                sx={{ minWidth: 0, p: 0.2, color: V3.green, fontSize: "0.5rem", fontWeight: 900 }}
                                title="Abrir painel da empresa"
                              >
                                →
                              </Button>
                            )}
                          </Box>
                        </Paper>
                      );
                    })}
                  </Box>
                </Box>
              )}

              {pjsArr.length > 0 && (
                <Box>
                  <Typography variant="caption" sx={{ color: V3.blue, fontWeight: 900, fontSize: "0.6rem", letterSpacing: 1, display: "block", mb: 0.4 }}>
                    👤 PJs ({pjsArr.length})
                  </Typography>
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 0.4 }}>
                    {pjsArr.map(([email, info]) => (
                      <Paper key={email} sx={{ p: 0.8, bgcolor: V3.paperDark, border: `1px solid ${V3.blue}44`, borderRadius: 1 }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.6 }}>
                          <Typography sx={{ fontSize: "1rem" }}>👤</Typography>
                          <Typography sx={{ flex: 1, color: V3.ink, fontWeight: 900, fontFamily: "Georgia, serif", fontSize: "0.75rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {info.nome}
                          </Typography>
                          <Chip label={`${info.edif} edif.`} size="small" sx={{ bgcolor: V3.blue, color: "#fff", fontSize: "0.5rem", height: 16, fontWeight: 800 }} />
                          <Chip label={`${info.niveis} nv`} size="small" sx={{ bgcolor: V3.ink, color: V3.gold, fontSize: "0.5rem", height: 16, fontWeight: 800 }} />
                        </Box>
                      </Paper>
                    ))}
                  </Box>
                </Box>
              )}

              {empresasArr.length === 0 && pjsArr.length === 0 && (
                <Paper sx={{ p: 1.2, bgcolor: V3.paperDark, border: `1px dashed ${V3.ink}44`, borderRadius: 1, textAlign: "center" }}>
                  <Typography variant="caption" sx={{ color: V3.ink, opacity: 0.55, fontSize: "0.65rem", fontStyle: "italic" }}>
                    Nenhuma empresa ou PJ opera nesta cidade ainda.
                  </Typography>
                </Paper>
              )}
            </Box>
          );
        })()}
      </FloatingDialog>

      <FloatingDialog
        open={!!donoEditando}
        onClose={() => setDonoEditando(null)}
        id="sim_dono_edificio"
        titulo={`👤 Dono de ${donoEditando?.edNome || "edifício"}`}
        subtitulo={donoEditando?.cidadeNome || ""}
        cor={V3.blue}
        larguraInicial={520}
        alturaInicial={520}
      >
        {donoEditando && (() => {
          const cidade = cidades[donoEditando.cidadeId];
          const paisId = cidade?.paisId;
          const provId = cidade?.provinciaId;
          const empLive = empresas || {};
          const empresasDisp = Object.values(empLive).filter((e) => {
            const origId = e.origem?.id;
            const sedesArr = Array.isArray(e.sedes) ? e.sedes : (e.sede ? [e.sede] : []);
            const sedeIds = sedesArr.map((s) => s.id);
            if (origId === donoEditando.cidadeId || sedeIds.includes(donoEditando.cidadeId)) return true;
            if (provId && (origId === provId || sedeIds.includes(provId))) return true;
            if (paisId && (origId === paisId || sedeIds.includes(paisId))) return true;
            return false;
          });

          const donoAtual = donoEditando.donoAtual || {};
          const ehPublico = !donoAtual.tipo || donoAtual.tipo === "publico";
          const ehPJ = donoAtual.tipo === "privado" && !donoAtual.empresaId;
          const ehEmpresa = donoAtual.tipo === "privado" && !!donoAtual.empresaId;

          const gravar = async (novoDono) => {
            const donos = { ...((cidades[donoEditando.cidadeId]?.edificiosDonos) || {}) };
            donos[donoEditando.edId] = novoDono;
            await setDoc(doc(db, "sim_cidades", donoEditando.cidadeId), { edificiosDonos: donos }, { merge: true });
            setDonoEditando(null);
          };

          return (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.2 }}>
              <Typography variant="caption" sx={{ color: V3.ink, opacity: 0.7, fontSize: "0.7rem", fontStyle: "italic", display: "block" }}>
                Público = vai pro país. PJ = um jogador dono. Empresa = vinculado a uma corporação (privado corporativo).
              </Typography>

              <Button
                variant={ehPublico ? "contained" : "outlined"}
                onClick={() => gravar({ tipo: "publico" })}
                sx={{
                  bgcolor: ehPublico ? V3.gold : "transparent",
                  color: ehPublico ? V3.ink : V3.gold,
                  borderColor: V3.gold,
                  fontWeight: 900,
                  fontFamily: "Georgia, serif",
                  justifyContent: "flex-start",
                }}
              >
                🏛️ PÚBLICO (país)
              </Button>

              <Divider sx={{ borderColor: `${V3.gold}44` }}>OU</Divider>

              <FormControl size="small" fullWidth>
                <InputLabel sx={{ color: V3.ink, fontSize: "0.8rem" }}>👤 PJ — Atribuir a um jogador</InputLabel>
                <Select
                  value={ehPJ ? (donoAtual.holderEmail || "") : ""}
                  onChange={async (e) => {
                    const email = e.target.value;
                    if (!email) return;
                    const nome = fichasDisponiveis?.[email]?.nome || fichasMap?.[email]?.nome || email;
                    await gravar({ tipo: "privado", holderEmail: email, holderNome: nome });
                    alert(`✅ Edifício atribuído a ${nome}.`);
                  }}
                  label="👤 PJ — Atribuir a um jogador"
                  sx={{ bgcolor: V3.paper, color: V3.ink, fontSize: "0.8rem" }}
                  MenuProps={{ PaperProps: { sx: { bgcolor: V3.paper, maxHeight: 320 } } }}
                >
                  <MenuItem value="" sx={{ fontSize: "0.8rem", color: V3.red }}>— Nenhum —</MenuItem>
                  {Object.entries(fichasDisponiveis || fichasMap || {})
                    .filter(([email, f]) => email !== "mestre@reqviemrpg.com" && !f?.isConvidado)
                    .sort((a, b) => String(a[1]?.nome || a[0]).localeCompare(String(b[1]?.nome || b[0])))
                    .map(([email, f]) => (
                      <MenuItem key={email} value={email} sx={{ fontSize: "0.8rem", color: V3.ink }}>
                        {f?.nome || email}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>

              <Divider sx={{ borderColor: `${V3.green}44` }}>OU</Divider>

              <Typography variant="caption" sx={{ color: V3.green, fontWeight: 900, letterSpacing: 1, fontSize: "0.65rem" }}>
                🏢 EMPRESA — Corporação dona
              </Typography>
              {empresasDisp.length === 0 ? (
                <Paper sx={{ p: 1.2, bgcolor: `${V3.red}15`, border: `1px dashed ${V3.red}66`, borderRadius: 1 }}>
                  <Typography variant="caption" sx={{ color: V3.red, fontWeight: 700, fontSize: "0.65rem", display: "block" }}>
                    ⚠️ Nenhuma empresa com origem ou sede nesta cidade, província ou país.
                  </Typography>
                  <Typography variant="caption" sx={{ color: V3.ink, opacity: 0.6, fontSize: "0.55rem", fontStyle: "italic" }}>
                    Crie uma empresa na aba <strong>Empresas</strong>.
                  </Typography>
                </Paper>
              ) : (
                <FormControl size="small" fullWidth>
                  <Select
                    value={ehEmpresa ? (donoAtual.empresaId || "") : ""}
                    onChange={async (e) => {
                      const empId = e.target.value;
                      if (!empId) return;
                      const emp = empLive[empId];
                      if (!emp) return;
                      await gravar({
                        tipo: "privado",
                        empresaId: empId,
                        empresaNome: emp.nome,
                        holderEmail: emp.donoEmail || null,
                        holderNome: emp.donoEmail ? (fichasDisponiveis?.[emp.donoEmail]?.nome || emp.donoEmail) : (emp.donoNomeLivre || emp.nome),
                      });
                      alert(`✅ Edifício atribuído à empresa ${emp.nome}.`);
                    }}
                    displayEmpty
                    sx={{ bgcolor: V3.paper, color: V3.ink, fontSize: "0.8rem" }}
                    MenuProps={{ PaperProps: { sx: { bgcolor: V3.paper, maxHeight: 400 } } }}
                    renderValue={(val) => {
                      if (!val) return <Typography sx={{ fontSize: "0.8rem", color: V3.ink, opacity: 0.55, fontStyle: "italic" }}>Nenhuma empresa</Typography>;
                      const e = empLive[val];
                      return <Typography sx={{ fontSize: "0.8rem", color: V3.ink }}>🏢 {e?.nome || val}</Typography>;
                    }}
                  >
                    <MenuItem value="" sx={{ fontSize: "0.8rem", color: V3.ink, opacity: 0.6, fontStyle: "italic" }}>Nenhuma empresa</MenuItem>
                    <MenuItem disabled sx={{ fontSize: "0.6rem", color: V3.green, fontWeight: 900, letterSpacing: 1.5, opacity: 1, borderTop: `1px solid ${V3.green}44`, mt: 0.3 }}>
                      ── EMPRESAS DA LOCALIDADE ({empresasDisp.length}) ──
                    </MenuItem>
                    {empresasDisp.map((e) => {
                      const donoStr = e.donoEmail
                        ? (fichasDisponiveis?.[e.donoEmail]?.nome || e.donoEmail)
                        : (e.donoNomeLivre || "NPC");
                      return (
                        <MenuItem key={e.id} value={e.id} sx={{ pl: 3, fontSize: "0.8rem", color: V3.ink }}>
                          🏢 {e.nome} <Typography component="span" sx={{ ml: 0.5, fontSize: "0.6rem", opacity: 0.55 }}>({e.tipo || "—"} • {donoStr})</Typography>
                        </MenuItem>
                      );
                    })}
                  </Select>
                </FormControl>
              )}

              <Paper sx={{ p: 1, mt: 0.5, bgcolor: `${V3.gold}11`, border: `1px dashed ${V3.gold}66`, borderRadius: 1 }}>
                <Typography variant="caption" sx={{ color: V3.ink, fontSize: "0.55rem", display: "block", lineHeight: 1.4 }}>
                  💡 <strong>Público:</strong> produção e lucro vão pro cofre do país.<br />
                  💡 <strong>PJ:</strong> o jogador dono recebe <strong>5% do valor da produção</strong> por ciclo.<br />
                  💡 <strong>Empresa:</strong> o edifício pertence à corporação e o lucro é pago ao dono dela (ou fica pendente no cofre da cidade se for NPC).
                </Typography>
              </Paper>

              <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 1 }}>
                <Button onClick={() => setDonoEditando(null)} sx={{ color: V3.red, fontWeight: 800 }}>
                  Cancelar
                </Button>
              </Box>
            </Box>
          );
        })()}
      </FloatingDialog>
    </Paper>
    {lightboxSrc && (
      <Box
        onClick={() => setLightboxSrc(null)}
        sx={{
          position: "fixed",
          inset: 0,
          bgcolor: "rgba(0,0,0,0.92)",
          zIndex: 99999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "zoom-out",
        }}
      >
        <IconButton
          onClick={(e) => { e.stopPropagation(); setLightboxSrc(null); }}
          sx={{ position: "absolute", top: 16, right: 16, color: "#fff", bgcolor: "rgba(0,0,0,0.5)", "&:hover": { bgcolor: "rgba(0,0,0,0.8)" } }}
        >
          <CloseIcon />
        </IconButton>
        <Box
          component="img"
          src={lightboxSrc}
          onClick={(e) => e.stopPropagation()}
          sx={{
            maxWidth: "92vw",
            maxHeight: "92vh",
            objectFit: "contain",
            borderRadius: 2,
            boxShadow: "0 0 80px rgba(184,148,90,0.6)",
            border: `2px solid ${V3.gold}`,
          }}
        />
      </Box>
    )}
    </>,
    document.body
  );
}

function PainelLeis({ nivel, alvo, pais, provincia, cidade, paises, isMaster, podeEditar, userEmail }) {
  const [salvando, setSalvando] = useState(null);

  const leisDoNivel = leisAplicaveisEm(nivel);
  const categorias = {};
  for (const lei of leisDoNivel) {
    if (!categorias[lei.categoria]) categorias[lei.categoria] = [];
    categorias[lei.categoria].push(lei);
  }

  const trocarOpcao = async (leiId, opcaoId) => {
    if (!alvo?.id || !podeEditar) return;
    setSalvando(leiId);
    try {
      const colMap = { pais: "sim_paises", provincia: "sim_provincias", cidade: "sim_cidades" };
      const leisAtuais = { ...(alvo.leis || {}) };
      if (leisAtuais[leiId] === opcaoId) {
        delete leisAtuais[leiId];
      } else {
        leisAtuais[leiId] = opcaoId;
      }
      await setDoc(doc(db, colMap[nivel], alvo.id), { leis: leisAtuais }, { merge: true });
    } finally {
      setSalvando(null);
    }
  };

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="caption" sx={{ color: V3.gold, fontWeight: 900, letterSpacing: 1, fontSize: "0.7rem", display: "block", mb: 0.5 }}>
        📜 LEIS — {ESCALAS_LEI[nivel]?.nome?.toUpperCase() || nivel.toUpperCase()}
      </Typography>
      <Typography variant="caption" sx={{ color: V3.ink, opacity: 0.6, display: "block", mb: 1, fontSize: "0.55rem", fontStyle: "italic" }}>
        Cidade sobrescreve província, que sobrescreve país. Clique numa opção para adotar. Clique na opção já ativa pra herdar do nível superior.
      </Typography>

      {Object.entries(categorias).map(([cat, leis]) => {
        const catInfo = CATEGORIAS_LEI[cat] || { nome: cat, icone: "📋", cor: V3.gold };
        return (
          <Accordion key={cat} disableGutters defaultExpanded
            sx={{ bgcolor: V3.paperDark, border: `1px solid ${catInfo.cor}44`, mb: 0.6, "&:before": { display: "none" }, borderRadius: 1, overflow: "hidden" }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: V3.ink }} />} sx={{ minHeight: 34 }}>
              <Typography sx={{ color: V3.ink, fontWeight: 900, fontSize: "0.75rem", fontFamily: "Georgia, serif" }}>
                {catInfo.icone} {catInfo.nome}
              </Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ p: 0.8 }}>
              {leis.map((lei) => {
                const efetiva = resolverLeiEfetiva(lei.id, { pais, provincia, cidade });
                const propria = (alvo?.leis || {})[lei.id];
                return (
                  <Paper key={lei.id} sx={{ p: 0.8, mb: 0.8, bgcolor: V3.paper, border: `1px solid ${V3.gold}22` }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 0.3 }}>
                      <Typography sx={{ fontSize: "0.9rem" }}>{lei.icone}</Typography>
                      <Typography sx={{ color: V3.ink, fontWeight: 900, fontSize: "0.72rem", flex: 1, fontFamily: "Georgia, serif" }}>
                        {lei.nome}
                      </Typography>
                      {propria && (
                        <Chip label="próprio" size="small" sx={{ bgcolor: V3.green, color: "#fff", fontSize: "0.5rem", height: 14 }} />
                      )}
                      {efetiva.origem && efetiva.origem !== nivel && (
                        <Chip label={`herdado de ${ESCALAS_LEI[efetiva.origem]?.nome || efetiva.origem}`} size="small" sx={{ bgcolor: ESCALAS_LEI[efetiva.origem]?.cor || V3.gold, color: "#fff", fontSize: "0.5rem", height: 14 }} />
                      )}
                    </Box>
                    <Typography variant="caption" sx={{ color: V3.ink, opacity: 0.55, fontSize: "0.55rem", display: "block", mb: 0.6 }}>
                      {lei.desc}
                    </Typography>
                    <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0.5 }}>
                      {(lei.opcoes || []).map((op) => {
                        const ativa = propria === op.id;
                        const emVigor = efetiva.valor === op.id;
                        return (
                          <Paper
                            key={op.id}
                            onClick={() => podeEditar && trocarOpcao(lei.id, op.id)}
                            sx={{
                              p: 0.8,
                              bgcolor: ativa ? `${V3.green}22` : emVigor ? `${V3.gold}22` : V3.paperDark,
                              border: ativa ? `2px solid ${V3.green}` : emVigor ? `2px solid ${V3.gold}` : `1px solid ${V3.gold}33`,
                              cursor: podeEditar ? "pointer" : "default",
                              opacity: salvando === lei.id ? 0.5 : 1,
                              transition: "all 0.15s",
                              "&:hover": podeEditar ? { borderColor: V3.green, boxShadow: `0 0 8px ${V3.green}44` } : {},
                            }}
                          >
                            <Box sx={{ display: "flex", alignItems: "center", gap: 0.4, mb: 0.3 }}>
                              <Typography sx={{ fontSize: "0.65rem", fontWeight: 900, color: ativa ? V3.green : V3.ink, fontFamily: "Georgia, serif", flex: 1 }}>
                                {op.nome}
                              </Typography>
                              {ativa && <Chip label="✓" size="small" sx={{ bgcolor: V3.green, color: "#fff", fontSize: "0.5rem", height: 14, minWidth: 18 }} />}
                            </Box>
                            <Typography variant="caption" sx={{ color: V3.ink, opacity: 0.7, fontSize: "0.55rem", display: "block", lineHeight: 1.3, mb: 0.3 }}>
                              {op.desc}
                            </Typography>
                            {op.efeitos && Object.keys(op.efeitos).length > 0 && (
                              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.3 }}>
                                {Object.entries(op.efeitos).map(([k, v]) => (
                                  <Chip
                                    key={k}
                                    label={`${k.replace(/_/g, " ")} ${v > 1 ? "▲" : "▼"}`}
                                    size="small"
                                    sx={{
                                      fontSize: "0.45rem",
                                      height: 13,
                                      bgcolor: v > 1 ? `${V3.green}33` : `${V3.red}33`,
                                      color: V3.ink,
                                      fontWeight: 700,
                                    }}
                                  />
                                ))}
                              </Box>
                            )}
                          </Paper>
                        );
                      })}
                    </Box>
                  </Paper>
                );
              })}
            </AccordionDetails>
          </Accordion>
        );
      })}
    </Box>
  );
}
function MoedaInput({ valor, onSalvar, cor, largura, fullWidth = true }) {
  const [texto, setTexto] = React.useState(String(valor ?? 0));
  const [focado, setFocado] = React.useState(false);
  React.useEffect(() => {
    if (!focado) setTexto(String(valor ?? 0));
  }, [valor, focado]);
  const aplicar = () => {
    const n = Number(texto.replace(",", "."));
    if (Number.isFinite(n)) onSalvar(n);
    else setTexto(String(valor ?? 0));
  };
  return (
    <TextField
      size="small"
      fullWidth={fullWidth}
      value={texto}
      onChange={(e) => setTexto(e.target.value)}
      onFocus={() => setFocado(true)}
      onBlur={() => { setFocado(false); aplicar(); }}
      onKeyDown={(e) => { if (e.key === "Enter") { e.currentTarget.blur(); } }}
      sx={{ bgcolor: V3.paper, width: largura }}
      InputProps={{
        sx: { color: cor || V3.ink, fontFamily: "Georgia, serif", fontWeight: 800, fontSize: "0.9rem" },
        inputProps: { inputMode: "decimal" },
      }}
    />
  );
}

function ContratarCargo({ cargo, salarioBase, fichasDisponiveis, onContratar }) {
  const [tipo, setTipo] = React.useState("npc");
  const [nomeLivre, setNomeLivre] = React.useState("");
  const [holderEmail, setHolderEmail] = React.useState("");
  const [salario, setSalario] = React.useState(salarioBase || 0);

  React.useEffect(() => {
    setSalario(salarioBase || 0);
  }, [salarioBase]);

  const enviar = () => {
    if (tipo === "npc" && !nomeLivre.trim()) return alert("Digite um nome pro NPC.");
    if (tipo === "pj" && !holderEmail) return alert("Escolha um PJ.");
    onContratar(tipo, holderEmail, nomeLivre, salario);
    setNomeLivre("");
    setHolderEmail("");
  };

  const fichas = fichasDisponiveis || {};
  const entradas = Object.entries(fichas).filter(([email]) => email !== "mestre@reqviemrpg.com");
  const pjs = entradas
    .filter(([_, f]) => (f?.tipoFicha || "PJ") === "PJ")
    .sort((a, b) => String(a[1]?.nome || a[0]).localeCompare(String(b[1]?.nome || b[0])));
  const pms = entradas
    .filter(([_, f]) => f?.tipoFicha === "PM")
    .sort((a, b) => String(a[1]?.nome || a[0]).localeCompare(String(b[1]?.nome || b[0])));

  return (
    <Paper sx={{ p: 1.2, bgcolor: `${V3.green}11`, border: `1px dashed ${V3.green}66`, borderRadius: 1 }}>
      <Typography variant="caption" sx={{ color: V3.green, fontWeight: 900, fontSize: "0.65rem", display: "block", mb: 0.6 }}>
        ➕ CONTRATAR — {cargo.icone} {cargo.nome}
      </Typography>

      <Box sx={{ display: "flex", gap: 0.5, mb: 0.8 }}>
        <Button
          size="small"
          onClick={() => setTipo("npc")}
          sx={{
            flex: 1,
            bgcolor: tipo === "npc" ? V3.blue : `${V3.blue}22`,
            color: tipo === "npc" ? V3.paper : V3.ink,
            border: `1px solid ${V3.blue}`,
            fontWeight: 800, fontSize: "0.6rem",
          }}
        >
          🤖 NPC (IA)
        </Button>
        <Button
          size="small"
          onClick={() => setTipo("pj")}
          sx={{
            flex: 1,
            bgcolor: tipo === "pj" ? V3.gold : `${V3.gold}22`,
            color: V3.ink,
            border: `1px solid ${V3.gold}`,
            fontWeight: 800, fontSize: "0.6rem",
          }}
        >
          🎮 PJ / PM
        </Button>
      </Box>

      {tipo === "npc" ? (
        <TextField
          label="Nome do NPC"
          size="small"
          fullWidth
          value={nomeLivre}
          onChange={(e) => setNomeLivre(e.target.value)}
          placeholder="Ex: Dr. Vex, Sr. Hollow..."
          sx={{ bgcolor: "#fff", mb: 0.8 }}
          InputProps={{ sx: { color: V3.ink, fontSize: "0.75rem" } }}
          InputLabelProps={{ sx: { color: V3.ink, fontSize: "0.75rem" } }}
        />
      ) : (
        <FormControl size="small" fullWidth sx={{ mb: 0.8 }}>
          <InputLabel sx={{ color: V3.ink, fontSize: "0.8rem" }}>Jogador</InputLabel>
          <Select
            value={holderEmail}
            onChange={(e) => setHolderEmail(e.target.value)}
            label="Jogador"
            sx={{ bgcolor: "#fff", color: V3.ink, fontSize: "0.75rem" }}
            MenuProps={{ PaperProps: { sx: { bgcolor: "#fff", maxHeight: 360 } } }}
          >
            <MenuItem value="" sx={{ fontSize: "0.75rem", color: V3.red }}>— Escolher —</MenuItem>

            {pjs.length > 0 && (
              <MenuItem disabled sx={{ fontSize: "0.55rem", color: "#22c55e", fontWeight: 900, letterSpacing: 1.5, opacity: 1, borderTop: `1px solid #22c55e44`, mt: 0.3 }}>
                ── PJ (JOGADORES) ──
              </MenuItem>
            )}
            {pjs.map(([email, f]) => (
              <MenuItem key={`pj_${email}`} value={email} sx={{ pl: 3, fontSize: "0.75rem", color: V3.ink }}>
                🎮 {f?.nome || email}
              </MenuItem>
            ))}

            {pms.length > 0 && (
              <MenuItem disabled sx={{ fontSize: "0.55rem", color: "#fbbf24", fontWeight: 900, letterSpacing: 1.5, opacity: 1, borderTop: `1px solid #fbbf2444`, mt: 0.3 }}>
                ── PM (MESTRE) ──
              </MenuItem>
            )}
            {pms.map(([email, f]) => (
              <MenuItem key={`pm_${email}`} value={email} sx={{ pl: 3, fontSize: "0.75rem", color: V3.ink }}>
                👑 {f?.nome || email}
              </MenuItem>
            ))}

            {pjs.length === 0 && pms.length === 0 && (
              <MenuItem disabled sx={{ fontSize: "0.7rem", color: V3.ink, opacity: 0.5, fontStyle: "italic" }}>
                Nenhuma ficha encontrada
              </MenuItem>
            )}
          </Select>
        </FormControl>
      )}

      <Box sx={{ display: "flex", gap: 0.8, alignItems: "center", mb: 0.8, flexWrap: "wrap" }}>
        <Typography variant="caption" sx={{ color: V3.ink, fontWeight: 700, fontSize: "0.6rem" }}>
          💰 Salário:
        </Typography>
        <TextField
          type="number"
          size="small"
          value={salario}
          onChange={(e) => setSalario(Math.max(0, Number(e.target.value) || 0))}
          sx={{ bgcolor: "#fff", width: 110 }}
          InputProps={{ sx: { color: V3.ink, fontSize: "0.75rem" } }}
        />
        <Typography variant="caption" sx={{ color: V3.ink, opacity: 0.5, fontSize: "0.55rem" }}>
          /ciclo (padrão {salarioBase})
        </Typography>
      </Box>

      <Paper sx={{ p: 0.8, bgcolor: `${V3.gold}11`, border: `1px dashed ${V3.gold}66`, borderRadius: 1, mb: 0.8 }}>
        <Typography variant="caption" sx={{ color: V3.ink, fontSize: "0.55rem", display: "block", lineHeight: 1.5 }}>
          <strong>{cargo.icone} {cargo.nome}:</strong> {cargo.desc}<br />
          🔑 Acessos: {(cargo.acessos || []).map((a) => ACESSOS_LABEL[a] || a).join(", ")}
        </Typography>
      </Paper>

      <Button
        fullWidth
        onClick={enviar}
        sx={{
          bgcolor: V3.green, color: "#fff",
          fontWeight: 900, fontFamily: "Georgia, serif",
          fontSize: "0.7rem",
          "&:hover": { bgcolor: "#3a5a2a" },
        }}
      >
        ✅ Contratar
      </Button>
    </Paper>
  );
}

function BarraBuscaAba({ valor, onChange, placeholder }) {
  return (
    <TextField
      fullWidth
      size="small"
      placeholder={placeholder || "🔍 Buscar..."}
      value={valor}
      onChange={(e) => onChange(e.target.value)}
      sx={{
        mb: 1,
        "& .MuiInputBase-root": {
          color: V3.paper,
          bgcolor: `${V3.gold}15`,
          fontSize: "0.75rem",
          height: 36,
        },
        "& .MuiOutlinedInput-notchedOutline": { borderColor: `${V3.gold}44` },
        "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: V3.gold },
        "& .MuiInputBase-input::placeholder": { color: `${V3.paper}88` },
      }}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <SearchIcon sx={{ color: V3.gold, fontSize: 16 }} />
          </InputAdornment>
        ),
      }}
    />
  );
}

function gerarPopsPadrao(pais) {
  const total = pais.popTotal || 0;
  const aur = pais.aurana || 0;
  return {
    operarios: { tamanho: Math.round(total * 0.32), lealdade: 55, radicalizacao: 25, riqueza: 30, auranos: aur * 0.4, classe: "pobre" },
    camponeses: { tamanho: Math.round(total * 0.30), lealdade: 65, radicalizacao: 15, riqueza: 20, auranos: aur * 0.2, classe: "pobre" },
    mercadores: { tamanho: Math.round(total * 0.15), lealdade: 70, radicalizacao: 10, riqueza: 65, auranos: aur * 0.6, classe: "medio" },
    clero: { tamanho: Math.round(total * 0.08), lealdade: 75, radicalizacao: 5, riqueza: 45, auranos: aur * 0.3, classe: "medio" },
    militares: { tamanho: Math.round(total * 0.08), lealdade: 80, radicalizacao: 8, riqueza: 50, auranos: aur * 0.7, classe: "medio" },
    nobres: { tamanho: Math.round(total * 0.07), lealdade: 60, radicalizacao: 3, riqueza: 95, auranos: aur * 0.9, classe: "rico" },
  };
}

function gerarPopsCidade(cidade) {
  const t = cidade.pop || 0;
  const tipo = cidade.tipo;
  const perfil = {
    capital: { operarios: 0.3, mercadores: 0.25, nobres: 0.05, clero: 0.1, militares: 0.1, camponeses: 0.2 },
    industrial: { operarios: 0.5, camponeses: 0.15, mercadores: 0.15, clero: 0.05, militares: 0.08, nobres: 0.07 },
    agricola: { camponeses: 0.6, operarios: 0.1, mercadores: 0.15, clero: 0.08, militares: 0.03, nobres: 0.04 },
    porto: { operarios: 0.3, mercadores: 0.3, camponeses: 0.15, militares: 0.1, clero: 0.07, nobres: 0.08 },
    mineracao: { operarios: 0.55, camponeses: 0.15, mercadores: 0.1, militares: 0.1, clero: 0.05, nobres: 0.05 },
    militar: { militares: 0.4, operarios: 0.2, camponeses: 0.15, mercadores: 0.1, clero: 0.07, nobres: 0.08 },
    comercial: { mercadores: 0.35, operarios: 0.25, camponeses: 0.15, clero: 0.08, militares: 0.07, nobres: 0.1 },
    misto: { operarios: 0.3, camponeses: 0.3, mercadores: 0.15, clero: 0.1, militares: 0.08, nobres: 0.07 },
  }[tipo] || { operarios: 0.3, camponeses: 0.3, mercadores: 0.15, clero: 0.1, militares: 0.08, nobres: 0.07 };

  const CLASSE_POP = {
    operarios: "pobre",
    camponeses: "pobre",
    militares: "medio",
    clero: "medio",
    mercadores: "medio",
    nobres: "rico",
  };

  const result = {};
  for (const [k, v] of Object.entries(perfil)) {
    result[k] = {
      tamanho: Math.round(t * v),
      lealdade: 55 + Math.random() * 20,
      radicalizacao: tipo === "industrial" ? 30 + Math.random() * 20 : 10 + Math.random() * 20,
      riqueza: k === "nobres" ? 90 : k === "mercadores" ? 60 : k === "militares" ? 45 : 25,
      classe: CLASSE_POP[k] || "pobre",
    };
  }
  return result;
}

export default SimuladorMundo;
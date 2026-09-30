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
import { db } from "../firebaseConfig";
import {
  doc, onSnapshot, setDoc, collection, writeBatch, getDocs, deleteDoc, addDoc,
} from "firebase/firestore";
import { COMMODITIES, PAISES, CARGOS_TEMPLATE, gerarIgLocais, gerarCargosLocais, gerarProvinciasDePais, idsProvinciasECidades } from "../data/simSeed";
import { LEIS_CATALOGO, CATEGORIAS_LEI, ESCALAS_LEI, resolverLeiEfetiva, leisAplicaveisEm, LEIS_DEFAULT_PAIS } from "../data/leis";
import useSimulador from "../hooks/useSimulador";
import IASimulador from "./IASimulador";
import FloatingDialog from "./FloatingDialog";
import { INVESTIMENTOS_CATALOGO, INVESTIMENTO_MAX, custoUp, normalizarInvestimentos } from "../data/investimentos";
import { CRISES_ESPONTANEAS } from "../data/simCrises";
import { TIPOS_NEGOCIACAO, calcularChanceNegociacao, gerarIdNegociacao, calcularValorPacote } from "../data/negociacoes";
import { calcularFinanciamento, gerarIdFinanciamento, PARCELAS_FINANCIAMENTO, TAXA_JUROS_FINANCIAMENTO } from "../data/financiamentos";

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
  const [modalNegociacaoOpen, setModalNegociacaoOpen] = useState(false);
  const [negociacaoSelecionada, setNegociacaoSelecionada] = useState(null);
  const [techTreeOpen, setTechTreeOpen] = useState(false);
  const [origemNeg, setOrigemNeg] = useState({ nivel: "pais", id: "" });
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
            estoque: {},
            instrucao: 0,
            igsLocais: igsLocais.map((i) => i.id),
            cargosLocais,
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
      for (const col of ["sim_paises", "sim_provincias", "sim_cidades", "sim_commodities", "sim_igs"]) {
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

  const propagarInvestimento = async (nivelOrigem, alvoId, investId, novoNivel) => {
    if (!isMaster) return;
    const FATOR = 0.3;
    const todasProv = Object.values(provincias);
    const todasCid = Object.values(cidades);

    let provinciasAfetadas = [];
    if (nivelOrigem === "pais") {
      const doPais = todasProv.filter((pv) => pv.paisId === alvoId);
      const qtd = Math.max(1, Math.round(doPais.length * FATOR));
      provinciasAfetadas = [...doPais].sort(() => Math.random() - 0.5).slice(0, qtd);
      for (const pv of provinciasAfetadas) {
        const inv = { ...(pv.investimentos || {}), [investId]: novoNivel };
        await setDoc(doc(db, "sim_provincias", pv.id), { investimentos: inv }, { merge: true });
      }
    } else if (nivelOrigem === "provincia") {
      provinciasAfetadas = todasProv.filter((pv) => pv.id === alvoId);
    }

    for (const pv of provinciasAfetadas) {
      const cids = todasCid.filter((c) => c.provinciaId === pv.id);
      const qtd = Math.max(1, Math.round(cids.length * FATOR));
      const afetadas = [...cids].sort(() => Math.random() - 0.5).slice(0, qtd);
      for (const c of afetadas) {
        const inv = { ...(c.investimentos || {}), [investId]: novoNivel };
        await setDoc(doc(db, "sim_cidades", c.id), { investimentos: inv }, { merge: true });
      }
    }
  };

  return createPortal(
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
          <Tab label="VISÃO GERAL" />
          <Tab label="PAÍSES" />
          <Tab label="PROVÍNCIAS" />
          <Tab label="CIDADES" />
          <Tab label="COMMODITIES" />
          <Tab label="IGS" />
          <Tab label="CARGOS" />
          <Tab label="NARRADOR" />
          <Tab label="NEGOCIAÇÕES" />
          <Tab label="CONFIG" />
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
            <Box sx={{ display: "flex", gap: 1, mt: 1, flexWrap: "wrap" }}>
              <Button
                variant="outlined"
                onClick={() => setTechTreeOpen(true)}
                sx={{ color: V3.gold, borderColor: V3.gold, fontWeight: 900, fontFamily: "Georgia, serif" }}
              >
                🌳 Árvore de Tecnologia
              </Button>
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
            </Box>

            {!isMaster && (
              <Typography variant="caption" sx={{ color: V3.goldLight, display: "block", mt: 2, fontStyle: "italic" }}>
                Você está em modo leitura. Apenas o Mestre pode inicializar ou resetar o mundo.
              </Typography>
            )}
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
                                onClick={() => setProvinciaAberta(pv)}
                                sx={{
                                  p: 1,
                                  bgcolor: V3.paper,
                                  border: `1px solid ${V3.gold}33`,
                                  cursor: "pointer",
                                  transition: "all 0.15s",
                                  "&:hover": { borderColor: V3.gold, boxShadow: `0 0 12px ${V3.gold}44` },
                                }}
                              >
                                <Box sx={{ display: "flex", alignItems: "center", gap: 0.6 }}>
                                  <AccountTreeIcon sx={{ color: V3.gold, fontSize: 16 }} />
                                  <Typography variant="body2" sx={{ flex: 1, color: V3.ink, fontWeight: 900, fontFamily: "Georgia, serif", fontSize: "0.75rem" }}>
                                    {pv.nome}
                                  </Typography>
                                </Box>
                                <Typography variant="caption" sx={{ color: V3.ink, opacity: 0.7, fontSize: "0.55rem" }}>
                                  {pv.cidadesIds?.length || 0} cidades • 👥 {(pop / 1000).toFixed(0)}k
                                </Typography>
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
        {aba === 4 && (
          <Box>
            <BarraBuscaAba valor={buscasPorAba[4] || ""} onChange={(v) => setTermoAba(4, v)} placeholder="🔍 Buscar commodity..." />
            {Object.values(commodities).filter((c) => filtrar([c], ["nome", "id", "categoria"]).length > 0).length === 0 ? (
              <Typography sx={{ color: V3.paper, textAlign: "center", py: 4 }}>
                Nenhuma commodity.
              </Typography>
            ) : (
              <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 1 }}>
                {Object.values(commodities)
                  .filter((c) => filtrar([c], ["nome", "id", "categoria"]).length > 0)
                  .map((c) => {
                    const variacao = c.precoAtual && c.precoBase
                      ? ((c.precoAtual - c.precoBase) / c.precoBase) * 100
                      : 0;
                    return (
                      <Paper
                        key={c.id}
                        sx={{
                          p: 1,
                          bgcolor: V3.paperDark,
                          border: `1px solid ${V3.gold}44`,
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
            )}
          </Box>
        )}
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

                    if (novoNivel > atual) {
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

              <Typography variant="caption" sx={{ color: V3.ink, fontWeight: 900, letterSpacing: 1, fontSize: "0.65rem" }}>🏭 PRODUÇÃO</Typography>
              <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", mt: 0.5, mb: 2 }}>
                {Object.keys(prod).length === 0 ? (
                  <Typography variant="caption" sx={{ color: V3.ink, opacity: 0.6, fontSize: "0.65rem" }}>Nada</Typography>
                ) : (
                  Object.entries(prod).map(([id, qtd]) => {
                    const cm = commodities[id];
                    return <Chip key={id} label={`${cm?.icone || "📦"} ${cm?.nome || id} (${qtd})`} size="small" sx={{ bgcolor: V3.green, color: V3.paper, fontSize: "0.6rem", height: 20 }} />;
                  })
                )}
              </Box>

              <Typography variant="caption" sx={{ color: V3.ink, fontWeight: 900, letterSpacing: 1, fontSize: "0.65rem" }}>🛒 CONSUMO</Typography>
              <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", mt: 0.5, mb: 2 }}>
                {Object.keys(cons).length === 0 ? (
                  <Typography variant="caption" sx={{ color: V3.ink, opacity: 0.6, fontSize: "0.65rem" }}>Nada</Typography>
                ) : (
                  Object.entries(cons).map(([id, qtd]) => {
                    const cm = commodities[id];
                    return <Chip key={id} label={`${cm?.icone || "📦"} ${cm?.nome || id} (${qtd})`} size="small" sx={{ bgcolor: V3.red, color: V3.paper, fontSize: "0.6rem", height: 20 }} />;
                  })
                )}
              </Box>

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
        titulo="Árvore de Tecnologia"
        subtitulo="Placeholder — mecânica ainda não implementada"
        cor={V3.gold}
        larguraInicial={700}
        alturaInicial={520}
      >
        <Typography sx={{ color: V3.ink, fontFamily: "Georgia, serif", mb: 2, fontSize: "0.85rem" }}>
          Cada era desbloqueia novas tecnologias que afetam produção, leis disponíveis e poder dos IGs. Ainda não está ativa.
        </Typography>
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1.5 }}>
          {[
            { era: "Era I — Vapor", icone: "⚙️", cor: "#5a6b7a", items: ["Máquina a Vapor", "Ferrovia", "Telégrafo"] },
            { era: "Era II — Aço", icone: "🔩", cor: "#b8945a", items: ["Aço Bessemer", "Indústria Química", "Eletricidade"] },
            { era: "Era III — Aura", icone: "✨", cor: "#a855f7", items: ["Condutores de Aura", "Autômatos", "Comunicação Etérea"] },
          ].map((bloco) => (
            <Paper key={bloco.era} sx={{ p: 1.5, bgcolor: V3.paperDark, border: `1px solid ${bloco.cor}66`, borderRadius: 1 }}>
              <Typography sx={{ color: bloco.cor, fontWeight: 900, fontFamily: "Georgia, serif", fontSize: "0.85rem", mb: 1 }}>
                {bloco.icone} {bloco.era}
              </Typography>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                {bloco.items.map((it) => (
                  <Paper key={it} sx={{ p: 0.8, bgcolor: V3.paper, border: `1px dashed ${bloco.cor}55`, textAlign: "center" }}>
                    <Typography variant="caption" sx={{ color: V3.ink, fontWeight: 800, fontSize: "0.65rem" }}>
                      🔒 {it}
                    </Typography>
                  </Paper>
                ))}
              </Box>
            </Paper>
          ))}
        </Box>
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
              DE (VOCÊ REPRESENTA)
            </Typography>
            <FormControl size="small" fullWidth>
              <Select
                value={origemNeg.id || ""}
                onChange={(e) => setOrigemNeg({ nivel: "pais", id: e.target.value })}
                displayEmpty
                sx={{ bgcolor: V3.paper, color: V3.ink, fontSize: "0.75rem" }}
                MenuProps={{ PaperProps: { sx: { bgcolor: V3.paper } } }}
              >
                <MenuItem value="" sx={{ fontSize: "0.75rem", color: V3.red }}>— Selecione —</MenuItem>
                {Object.values(paises).map((p) => (
                  <MenuItem key={p.id} value={p.id} sx={{ fontSize: "0.75rem", color: V3.ink }}>
                    {p.nome}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
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
                      {c.nome} ({paises[c.paisId]?.nome || "?"})
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
                <InputLabel sx={{ color: V3.ink, fontSize: "0.75rem" }}>Poder de IG</InputLabel>
                <Select
                  value={formNegociacao.ofertaPoderIGId || ""}
                  onChange={(e) => setFormNegociacao((p) => ({ ...p, ofertaPoderIGId: e.target.value }))}
                  label="Poder de IG"
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
            <TextField
              label="Dinheiro"
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
                value={formNegociacao.pedidoCommodityQtd}
                onChange={(e) => setFormNegociacao((p) => ({ ...p, pedidoCommodityQtd: Number(e.target.value) || 0 }))}
                sx={{ bgcolor: V3.paper, flex: 1 }}
                InputProps={{ sx: { color: V3.ink, fontSize: "0.75rem" } }}
                InputLabelProps={{ sx: { color: V3.ink, fontSize: "0.75rem" } }}
              />
            </Box>
            <Box sx={{ display: "flex", gap: 0.5, mt: 0.5 }}>
              <FormControl size="small" sx={{ flex: 2 }}>
                <InputLabel sx={{ color: V3.ink, fontSize: "0.75rem" }}>Poder de IG</InputLabel>
                <Select
                  value={formNegociacao.pedidoPoderIGId || ""}
                  onChange={(e) => setFormNegociacao((p) => ({ ...p, pedidoPoderIGId: e.target.value }))}
                  label="Poder de IG"
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
                value={formNegociacao.pedidoPoderIGValor}
                onChange={(e) => setFormNegociacao((p) => ({ ...p, pedidoPoderIGValor: Number(e.target.value) || 0 }))}
                sx={{ bgcolor: V3.paper, flex: 1 }}
                InputProps={{ sx: { color: V3.ink, fontSize: "0.75rem" } }}
                InputLabelProps={{ sx: { color: V3.ink, fontSize: "0.75rem" } }}
              />
            </Box>
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
            const calc = calcularChanceNegociacao({
              tipo: formNegociacao.tipo,
              oferta,
              pedido,
              commodities,
            });
            return (
              <Paper sx={{ p: 1.2, bgcolor: V3.bg2, border: `2px solid ${V3.gold}`, textAlign: "center" }}>
                <Typography variant="caption" sx={{ color: V3.goldLight, fontWeight: 900, letterSpacing: 1, fontSize: "0.65rem" }}>
                  🎲 CHANCE ESTIMADA
                </Typography>
                <Typography variant="h4" sx={{ color: V3.goldLight, fontWeight: 900, fontFamily: "Georgia, serif" }}>
                  {calc.chance}%
                </Typography>
                <Typography variant="caption" sx={{ color: V3.goldLight, opacity: 0.7, fontSize: "0.6rem", display: "block" }}>
                  Oferta: {calc.valorOferta.toLocaleString("pt-BR")} • Pedido: {calc.valorPedido.toLocaleString("pt-BR")}
                </Typography>
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

                const calc = calcularChanceNegociacao({
                  tipo: formNegociacao.tipo,
                  oferta,
                  pedido,
                  commodities,
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
    </Paper>,
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
    operarios: { tamanho: Math.round(total * 0.32), lealdade: 55, radicalizacao: 25, riqueza: 30, auranos: aur * 0.4 },
    camponeses: { tamanho: Math.round(total * 0.30), lealdade: 65, radicalizacao: 15, riqueza: 20, auranos: aur * 0.2 },
    mercadores: { tamanho: Math.round(total * 0.15), lealdade: 70, radicalizacao: 10, riqueza: 65, auranos: aur * 0.6 },
    clero: { tamanho: Math.round(total * 0.08), lealdade: 75, radicalizacao: 5, riqueza: 45, auranos: aur * 0.3 },
    militares: { tamanho: Math.round(total * 0.08), lealdade: 80, radicalizacao: 8, riqueza: 50, auranos: aur * 0.7 },
    nobres: { tamanho: Math.round(total * 0.07), lealdade: 60, radicalizacao: 3, riqueza: 95, auranos: aur * 0.9 },
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

  const result = {};
  for (const [k, v] of Object.entries(perfil)) {
    result[k] = {
      tamanho: Math.round(t * v),
      lealdade: 55 + Math.random() * 20,
      radicalizacao: tipo === "industrial" ? 30 + Math.random() * 20 : 10 + Math.random() * 20,
      riqueza: k === "nobres" ? 90 : k === "mercadores" ? 60 : k === "militares" ? 45 : 25,
    };
  }
  return result;
}

function resolverPaisDeEntidade(nivel, id, { paises, cidades, provincias }) {
  if (nivel === "pais") return paises[id] || null;
  if (nivel === "provincia") {
    const pv = provincias[id];
    return pv ? (paises[pv.paisId] || null) : null;
  }
  if (nivel === "cidade") {
    const c = cidades[id];
    return c ? (paises[c.paisId] || null) : null;
  }
  return null;
}

async function aplicarEfeitosNegociacao(n, { paises, cidades, commodities, igs, provincias }) {
  const erros = [];
  const de = n.de || {};
  const para = n.para || {};
  const oferta = n.oferta || {};
  const pedido = n.pedido || {};

  const pDe = resolverPaisDeEntidade(de.nivel, de.id, { paises, cidades, provincias });
  const pPara = resolverPaisDeEntidade(para.nivel, para.id, { paises, cidades, provincias });

  if (!pDe || !pPara) {
    erros.push("Não foi possível resolver os países envolvidos.");
    return erros;
  }

  const transferirDinheiro = async (origem, destino, valor, motivo) => {
    if (!valor || valor <= 0) return;
    if ((origem.cofre || 0) < valor) {
      erros.push(`${motivo}: cofre de ${origem.nome} insuficiente (tem ${origem.cofre || 0}, precisa ${valor}).`);
      return;
    }
    await setDoc(doc(db, "sim_paises", origem.id), {
      cofre: (origem.cofre || 0) - valor,
    }, { merge: true });
    await setDoc(doc(db, "sim_paises", destino.id), {
      cofre: (destino.cofre || 0) + valor,
    }, { merge: true });
    origem.cofre = (origem.cofre || 0) - valor;
    destino.cofre = (destino.cofre || 0) + valor;
  };

  const transferirCommodity = async (origem, destino, pacote, motivo) => {
    if (!pacote || !pacote.id || !pacote.quantidade || pacote.quantidade <= 0) return;
    const estoqueOrig = { ...(origem.estoque || {}) };
    const disp = estoqueOrig[pacote.id] || 0;
    if (disp < pacote.quantidade) {
      erros.push(`${motivo}: ${origem.nome} não tem ${pacote.quantidade}x ${pacote.id} (tem ${disp}).`);
      return;
    }
    estoqueOrig[pacote.id] = disp - pacote.quantidade;
    const estoqueDest = { ...(destino.estoque || {}) };
    estoqueDest[pacote.id] = (estoqueDest[pacote.id] || 0) + pacote.quantidade;
    await setDoc(doc(db, "sim_paises", origem.id), { estoque: estoqueOrig }, { merge: true });
    await setDoc(doc(db, "sim_paises", destino.id), { estoque: estoqueDest }, { merge: true });
  };

  const reduzirPoderIG = async (pacote, motivo) => {
    if (!pacote || !pacote.id || !pacote.valor || pacote.valor <= 0) return;
    const ig = igs[pacote.id];
    if (!ig) {
      erros.push(`${motivo}: IG ${pacote.id} não encontrado.`);
      return;
    }
    const novoPoder = Math.max(0, Math.min(100, (ig.poder || 0) - pacote.valor));
    await setDoc(doc(db, "sim_igs", pacote.id), { poder: novoPoder }, { merge: true });
  };

  if (n.tipo === "financiamento") {
    const principal = Number(oferta.dinheiro) || 0;
    if (principal > 0) {
      if ((pDe.cofre || 0) < principal) {
        erros.push(`Financiamento: ${pDe.nome} não tem ${principal} no cofre.`);
      } else {
        const fin = calcularFinanciamento(principal, PARCELAS_FINANCIAMENTO, TAXA_JUROS_FINANCIAMENTO);
        const finId = gerarIdFinanciamento();

        await setDoc(doc(db, "sim_paises", pDe.id), {
          cofre: (pDe.cofre || 0) - principal,
        }, { merge: true });
        await setDoc(doc(db, "sim_paises", pPara.id), {
          cofre: (pPara.cofre || 0) + principal,
        }, { merge: true });

        await setDoc(doc(db, "sim_financiamentos", finId), {
          id: finId,
          negociacaoId: n.id,
          titulo: n.titulo || "Financiamento",
          devedorId: pPara.id,
          devedorNome: pPara.nome,
          credorId: pDe.id,
          credorNome: pDe.nome,
          valorPrincipal: principal,
          valorTotal: fin.total,
          valorParcela: fin.parcela,
          parcelasTotal: fin.parcelas,
          parcelasRestantes: fin.parcelas,
          atrasos: 0,
          proximaEm: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          status: "ativo",
          criadoEm: new Date().toISOString(),
        }, { merge: true });
      }
    }
  } else {
    await transferirDinheiro(pDe, pPara, Number(oferta.dinheiro) || 0, "Oferta de dinheiro");
    await transferirDinheiro(pPara, pDe, Number(pedido.dinheiro) || 0, "Pedido de dinheiro");
  }

  await transferirCommodity(pDe, pPara, oferta.commodity, "Oferta de commodity");
  await transferirCommodity(pPara, pDe, pedido.commodity, "Pedido de commodity");

  await reduzirPoderIG(oferta.poderIG, "Oferta de poderIG");
  await reduzirPoderIG(pedido.poderIG, "Pedido de poderIG");

  if (n.tipo === "corrupcao") {
    const repDe = Math.max(0, (pDe.reputacao ?? 50) - 10);
    const repPara = Math.max(0, (pPara.reputacao ?? 50) - 15);
    await setDoc(doc(db, "sim_paises", pDe.id), { reputacao: repDe }, { merge: true });
    await setDoc(doc(db, "sim_paises", pPara.id), { reputacao: repPara }, { merge: true });
  }

  await addDoc(collection(db, "sim_historico"), {
    tipo: "negociacao_aceita",
    negociacaoId: n.id,
    tipoNeg: n.tipo,
    titulo: n.titulo,
    de: n.de,
    para: n.para,
    erros: erros.length > 0 ? erros : null,
    criadoEm: new Date().toISOString(),
  });

  return erros;
}

export default SimuladorMundo;
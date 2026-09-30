import React, { useState, useEffect, useMemo } from "react";
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Divider,
  LinearProgress,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { db } from "../firebaseConfig";
import { doc, onSnapshot, setDoc } from "firebase/firestore";

const SEASONS_ORDER = ["Primavera", "Verão", "Outono", "Inverno"];

const LUX = {
  gold: "#eab308",
  goldLight: "#facc15",
  goldDark: "#a16207",
  bg: "#0a0700",
  bg2: "#141007",
  cardBg: "linear-gradient(135deg, rgba(38,28,10,0.92), rgba(15,10,0,0.94))",
  cardBorder: "1px solid rgba(234,179,8,0.35)",
  cardGlow: "0 0 24px rgba(234,179,8,0.12)",
  purple: "#a855f7",
  pink: "#f472b6",
  red: "#ef4444",
  green: "#22c55e",
};

const getDataRPG = () => {
  try {
    return localStorage.getItem("reqviem_world_date") || "Verão — 1/2/879";
  } catch {
    return "Verão — 1/2/879";
  }
};

const parseWorldDate = (str) => {
  try {
    if (!str) return null;
    const parts = String(str).split("—").map((s) => s.trim());
    if (parts.length < 2) return null;
    const season = parts[0];
    const nums = parts[1].split("/").map((n) => Number(n));
    if (nums.length < 3) return null;
    const day = nums[0] || 1;
    const stationNum = nums[1] || (SEASONS_ORDER.indexOf(season) + 1) || 1;
    const year = nums[2] || 879;
    return { season, day, stationNum, year };
  } catch {
    return null;
  }
};

const toTotalSeasons = (d) => (d ? d.year * 4 + (d.stationNum - 1) : 0);

const fromTotalSeasons = (t) => {
  const year = Math.floor(t / 4);
  const stationNum = (t % 4) + 1;
  return { season: SEASONS_ORDER[stationNum - 1], stationNum, year };
};

const formatarFim = (total) => {
  const f = fromTotalSeasons(total);
  return `${f.season} ${f.year} D.C.`;
};

const SERVICOS_PADRAO = [
  {
    id: "seg_privada",
    icone: "🛡️",
    titulo: "Segurança Privada de Elite",
    empresaNome: "Corporação Hollow",
    empresaId: "",
    descricao:
      "Proteção pessoal 24/7 com equipe de ex-Caçadores Auranos e armamento de ponta.",
    detalhes: "Discrição garantida • Análise de ameaças • Escolta armada",
    cor: "#3b82f6",
    precoBase: 3500,
    tiers: [
      { id: "base", nome: "Base", multiplicador: 1, descricao: "1 agente, proteção diurna" },
      { id: "premium", nome: "Premium", multiplicador: 2.5, descricao: "3 agentes, proteção 24/7" },
      { id: "elite", nome: "Elite", multiplicador: 5, descricao: "Esquadrão completo + veículos blindados" },
    ],
  },
  {
    id: "eventos_luxo",
    icone: "🎭",
    titulo: "Organização de Eventos de Luxo",
    empresaNome: "Casa Lothar Eventos",
    empresaId: "",
    descricao:
      "Festas exclusivas, galas, leilões privados e casamentos de elite com experiência impecável.",
    detalhes: "Localizações secretas • Catering gourmet • Convidados selecionados",
    cor: "#f472b6",
    precoBase: 5000,
    tiers: [
      { id: "base", nome: "Base", multiplicador: 1, descricao: "Salão médio, buffet padrão" },
      { id: "premium", nome: "Premium", multiplicador: 2.5, descricao: "Local exclusivo, chef estrelado" },
      { id: "elite", nome: "Elite", multiplicador: 5, descricao: "Evento sob sigilo total, convidados VIP" },
    ],
  },
  {
    id: "transporte_luxo",
    icone: "🚁",
    titulo: "Transporte de Luxo",
    empresaNome: "Zepelim Imperial",
    empresaId: "",
    descricao:
      "Frotas de veículos blindados, zepelins executivos, iates particulares e aeronaves.",
    detalhes: "Pilotos experientes • Rotas personalizadas • Discrição total",
    cor: "#fbbf24",
    precoBase: 2800,
    tiers: [
      { id: "base", nome: "Base", multiplicador: 1, descricao: "Carruagem blindada + motorista" },
      { id: "premium", nome: "Premium", multiplicador: 2.5, descricao: "Zepelim privativo + staff de bordo" },
      { id: "elite", nome: "Elite", multiplicador: 5, descricao: "Frota completa com escolta aérea" },
    ],
  },
  {
    id: "consultoria_politica",
    icone: "🏛️",
    titulo: "Consultoria Política Estratégica",
    empresaNome: "Casa Voss Assessoria",
    empresaId: "",
    descricao:
      "Assessoria para figuras públicas, lobby, relações governamentais e gestão de crises.",
    detalhes: "Ex-assessores senatoriais • Rede de contatos • Resultados garantidos",
    cor: "#a855f7",
    precoBase: 4200,
    tiers: [
      { id: "base", nome: "Base", multiplicador: 1, descricao: "Assessoria pontual, 1 consultor" },
      { id: "premium", nome: "Premium", multiplicador: 2.5, descricao: "Equipe dedicada + lobby" },
      { id: "elite", nome: "Elite", multiplicador: 5, descricao: "Acesso direto a senadores e a Imperador" },
    ],
  },
  {
    id: "inteligencia_comp",
    icone: "💼",
    titulo: "Inteligência Competitiva",
    empresaNome: "NexaVolt Analytics",
    empresaId: "",
    descricao:
      "Análise de mercado, due diligence, investigações corporativas e relatórios confidenciais.",
    detalhes: "Especialistas em dados • Análise aprofundada • Sigilo contratual",
    cor: "#10b981",
    precoBase: 3800,
    tiers: [
      { id: "base", nome: "Base", multiplicador: 1, descricao: "Relatório mensal" },
      { id: "premium", nome: "Premium", multiplicador: 2.5, descricao: "Relatório semanal + analista dedicado" },
      { id: "elite", nome: "Elite", multiplicador: 5, descricao: "Monitoramento 24/7 de alvos específicos" },
    ],
  },
  {
    id: "curadoria_arte",
    icone: "🎨",
    titulo: "Curadoria de Arte e Antiguidades",
    empresaNome: "Instituto Thalassa",
    empresaId: "",
    descricao:
      "Arte rara, antiguidades, coleções exclusivas, restauração, avaliação e aquisição.",
    detalhes: "Curadores especializados • Peças únicas • Autenticidade garantida",
    cor: "#f97316",
    precoBase: 3000,
    tiers: [
      { id: "base", nome: "Base", multiplicador: 1, descricao: "Avaliação e 1 peça por estação" },
      { id: "premium", nome: "Premium", multiplicador: 2.5, descricao: "Coleção curada + transporte seguro" },
      { id: "elite", nome: "Elite", multiplicador: 5, descricao: "Aquisição de peças pré-Reqviem únicas" },
    ],
  },
];

const CARD_OPCOES = [
  { valor: 1, label: "1" },
  { valor: 2, label: "2" },
  { valor: 3, label: "3" },
  { valor: 4, label: "4" },
];

const ANOS_OPCOES = [
  { valor: 1, label: "1" },
  { valor: 2, label: "2" },
  { valor: 3, label: "3" },
  { valor: 4, label: "4" },
  { valor: 5, label: "5" },
];

const CORES_DISPONIVEIS = [
  "#3b82f6",
  "#a855f7",
  "#f472b6",
  "#fbbf24",
  "#22c55e",
  "#f97316",
  "#eab308",
  "#ef4444",
];

function ServicosEspeciais({ userEmail, fichasMap = {}, isMaster = false }) {
  const { getProsperidade } = useSimulador();
  const [servicos, setServicos] = useState(SERVICOS_PADRAO);
  const [empresas, setEmpresas] = useState([]);
  const [aba, setAba] = useState("catalogo");
  const [alvoEmail, setAlvoEmail] = useState(userEmail);
  const [carteiras, setCarteiras] = useState({});
  const [servicosAtivos, setServicosAtivos] = useState([]);
  const [worldDate, setWorldDate] = useState(getDataRPG());

  const [compraOpen, setCompraOpen] = useState(false);
  const [servicoSel, setServicoSel] = useState(null);
  const [tierSel, setTierSel] = useState("base");
  const [durTipo, setDurTipo] = useState("estacoes");
  const [durValor, setDurValor] = useState(1);
  const [carteiraSel, setCarteiraSel] = useState("");

  const [editOpen, setEditOpen] = useState(false);
  const [servicoEdit, setServicoEdit] = useState(null);
  const [formServico, setFormServico] = useState({
    icone: "💎",
    titulo: "",
    empresaNome: "",
    empresaId: "",
    descricao: "",
    detalhes: "",
    cor: "#eab308",
    precoBase: 3000,
  });

  useEffect(() => {
    if (!userEmail) return;
    setAlvoEmail((prev) => (prev ? prev : userEmail));
  }, [userEmail]);

  useEffect(() => {
    const ref = doc(db, "rede_cyberpunk", "dados");
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        if (Array.isArray(d.servicos) && d.servicos.length > 0) {
          setServicos(d.servicos);
        } else {
          setServicos(SERVICOS_PADRAO);
        }
      } else {
        setServicos(SERVICOS_PADRAO);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const ref = doc(db, "bolsa_valores", "dados");
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists() && Array.isArray(snap.data().empresas)) {
        setEmpresas(snap.data().empresas);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!alvoEmail) return;
    const ref = doc(db, "fichas", alvoEmail);
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        const c = d.carteiras || {};
        const cObj = Array.isArray(c)
          ? c.reduce(
              (acc, item) => ({
                ...acc,
                [item.nome || "default"]: item.valor || 0,
              }),
              {}
            )
          : c;
        setCarteiras(cObj);
        setServicosAtivos(
          Array.isArray(d.servicos_ativos) ? d.servicos_ativos : []
        );
      } else {
        setCarteiras({});
        setServicosAtivos([]);
      }
    });
    return () => unsub();
  }, [alvoEmail]);

  useEffect(() => {
    const i = setInterval(() => {
      const d = getDataRPG();
      setWorldDate((prev) => (prev !== d ? d : prev));
    }, 10000);
    return () => clearInterval(i);
  }, []);

  const totalCarteira = useMemo(
    () =>
      Object.values(carteiras).reduce(
        (a, b) => a + (typeof b === "number" ? b : 0),
        0
      ),
    [carteiras]
  );

  const hojeTotal = useMemo(() => {
    const h = parseWorldDate(worldDate);
    return toTotalSeasons(h);
  }, [worldDate]);

  const salvarServicos = async (lista) => {
    await setDoc(
      doc(db, "rede_cyberpunk", "dados"),
      { servicos: lista },
      { merge: true }
    );
  };

  const abrirCompra = (servico) => {
    setServicoSel(servico);
    setTierSel(servico?.tiers?.[0]?.id || "base");
    setDurTipo("estacoes");
    setDurValor(1);
    setCarteiraSel("");
    setCompraOpen(true);
  };

  const tierAtual = useMemo(() => {
    if (!servicoSel) return null;
    return (
      servicoSel.tiers?.find((t) => t.id === tierSel) ||
      servicoSel.tiers?.[0] ||
      { id: "base", nome: "Base", multiplicador: 1 }
    );
  }, [servicoSel, tierSel]);

  const duracaoEmEstacoes = useMemo(
    () => (durTipo === "estacoes" ? durValor : durValor * 4),
    [durTipo, durValor]
  );

  const precoTotal = useMemo(() => {
    if (!servicoSel || !tierAtual) return 0;
    return Math.round(
      (servicoSel.precoBase || 0) *
        (tierAtual.multiplicador || 1) *
        duracaoEmEstacoes
    );
  }, [servicoSel, tierAtual, duracaoEmEstacoes]);

  const confirmarCompra = async () => {
    if (!servicoSel || !tierAtual) return;
    if (!carteiraSel) {
      alert("Selecione uma carteira!");
      return;
    }
    const saldo = carteiras[carteiraSel] || 0;
    if (saldo < precoTotal) {
      alert(
        `Saldo insuficiente! Necessário: ${precoTotal.toFixed(
          2
        )} 💰 — Disponível: ${saldo.toFixed(2)} 💰`
      );
      return;
    }

    const inicioTotal = hojeTotal;
    const fimTotal = inicioTotal + duracaoEmEstacoes;

    const inicioParse = parseWorldDate(worldDate) || {
      season: "Verão",
      stationNum: 2,
      year: 879,
    };
    const fimInfo = fromTotalSeasons(fimTotal);

    const contrato = {
      id: `c_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      servicoId: servicoSel.id,
      servicoTitulo: servicoSel.titulo,
      servicoIcone: servicoSel.icone || "💎",
      servicoCor: servicoSel.cor || LUX.gold,
      empresaNome: servicoSel.empresaNome || "",
      tierId: tierAtual.id,
      tierNome: tierAtual.nome,
      tierDescricao: tierAtual.descricao || "",
      preco: precoTotal,
      duracaoTipo: durTipo,
      duracaoValor: durValor,
      duracaoEmEstacoes,
      iniciadoEm: {
        season: inicioParse.season,
        stationNum: inicioParse.stationNum,
        year: inicioParse.year,
        totalSeasons: inicioTotal,
        label: `${inicioParse.season} ${inicioParse.year} D.C.`,
      },
      expiraEm: {
        season: fimInfo.season,
        stationNum: fimInfo.stationNum,
        year: fimInfo.year,
        totalSeasons: fimTotal,
        label: `${fimInfo.season} ${fimInfo.year} D.C.`,
      },
      compradoEm: new Date().toISOString(),
      compradoPor: userEmail,
    };

    const novasCarteiras = {
      ...carteiras,
      [carteiraSel]: saldo - precoTotal,
    };

    const novosAtivos = [...servicosAtivos, contrato];

    try {
      await setDoc(
        doc(db, "fichas", alvoEmail),
        {
          carteiras: novasCarteiras,
          servicos_ativos: novosAtivos,
        },
        { merge: true }
      );
      alert(
        `✅ Serviço contratado!\n\n${servicoSel.icone || "💎"} ${
          servicoSel.titulo
        } — ${tierAtual.nome}\nDuração: ${durValor} ${
          durTipo === "estacoes" ? "estação(ões)" : "ano(s)"
        }\nExpira em: ${fimInfo.season} ${fimInfo.year} D.C.\nValor: ${precoTotal.toFixed(
          2
        )} 💰`
      );
      setCompraOpen(false);
      setCarteiraSel("");
    } catch (e) {
      console.error(e);
      alert("Erro ao processar contrato.");
    }
  };

  const cancelarContrato = async (contratoId) => {
    if (!isMaster) return;
    if (!window.confirm("Cancelar este contrato? (sem reembolso)")) return;
    const novos = servicosAtivos.filter((c) => c.id !== contratoId);
    try {
      await setDoc(
        doc(db, "fichas", alvoEmail),
        { servicos_ativos: novos },
        { merge: true }
      );
    } catch (e) {
      alert("Erro ao cancelar.");
    }
  };

  const avaliarContrato = (contrato) => {
    const inicio = contrato?.iniciadoEm?.totalSeasons ?? 0;
    const fim = contrato?.expiraEm?.totalSeasons ?? 0;
    const total = Math.max(1, fim - inicio);
    const decorrido = Math.max(0, hojeTotal - inicio);
    const restante = fim - hojeTotal;
    const expirado = restante <= 0;
    const expirando = !expirado && restante <= Math.max(1, Math.ceil(total * 0.2));
    const progresso = Math.min(100, Math.max(0, (decorrido / total) * 100));

    let status = "ATIVO";
    let cor = LUX.green;
    if (expirado) {
      status = "EXPIRADO";
      cor = LUX.red;
    } else if (expirando) {
      status = "EXPIRANDO";
      cor = LUX.gold;
    }

    let textoRestante = "";
    if (expirado) {
      textoRestante = `Expirou há ${Math.abs(restante)} estação(ões)`;
    } else {
      textoRestante = `${restante} estação(ões) restante(s)`;
    }

    return { progresso, expirado, expirando, status, cor, textoRestante };
  };

  const abrirNovoServico = () => {
    setServicoEdit(null);
    setFormServico({
      icone: "💎",
      titulo: "",
      empresaNome: "",
      empresaId: "",
      descricao: "",
      detalhes: "",
      cor: "#eab308",
      precoBase: 3000,
    });
    setEditOpen(true);
  };

  const abrirEdicaoServico = (servico) => {
    setServicoEdit(servico);
    setFormServico({
      icone: servico.icone || "💎",
      titulo: servico.titulo || "",
      empresaNome: servico.empresaNome || "",
      empresaId: servico.empresaId || "",
      descricao: servico.descricao || "",
      detalhes: servico.detalhes || "",
      cor: servico.cor || "#eab308",
      precoBase: servico.precoBase || 3000,
    });
    setEditOpen(true);
  };

  const salvarServico = async () => {
    if (!formServico.titulo.trim()) {
      alert("Digite um título.");
      return;
    }
    let lista;
    if (servicoEdit) {
      lista = servicos.map((s) =>
        s.id === servicoEdit.id
          ? {
              ...s,
              ...formServico,
              precoBase: Number(formServico.precoBase) || 0,
            }
          : s
      );
    } else {
      const novoServico = {
        id: `s_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        ...formServico,
        precoBase: Number(formServico.precoBase) || 0,
        tiers: [
          { id: "base", nome: "Base", multiplicador: 1, descricao: "Cobertura essencial" },
          { id: "premium", nome: "Premium", multiplicador: 2.5, descricao: "Qualidade superior + extras" },
          { id: "elite", nome: "Elite", multiplicador: 5, descricao: "Experiência definitiva e exclusiva" },
        ],
      };
      lista = [...servicos, novoServico];
    }
    setServicos(lista);
    await salvarServicos(lista);
    setEditOpen(false);
  };

  const apagarServico = async (id) => {
    if (!window.confirm("Apagar este serviço do catálogo?")) return;
    const lista = servicos.filter((s) => s.id !== id);
    setServicos(lista);
    await salvarServicos(lista);
  };

  const restaurarPadrao = async () => {
    if (!window.confirm("Restaurar catálogo padrão? Isso substituirá os serviços atuais.")) return;
    setServicos(SERVICOS_PADRAO);
    await salvarServicos(SERVICOS_PADRAO);
  };

  const nomeEmpresaExibida = (servico) => {
    if (!servico) return "";
    if (servico.empresaId && empresas.length > 0) {
      const e = empresas.find((x) => x.id === servico.empresaId);
      if (e) return `${e.sigla || ""} ${e.nome || ""}`.trim();
    }
    return servico.empresaNome || "";
  };

  return (
    <Box
      sx={{
        p: 2,
        overflowY: "auto",
        flex: 1,
        background: `radial-gradient(ellipse at top, ${LUX.bg2} 0%, ${LUX.bg} 70%)`,
        fontFamily: "'Courier New', monospace",
      }}
    >
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
          flexWrap: "wrap",
          gap: 1,
        }}
      >
        <Box>
          <Typography
            variant="h6"
            sx={{
              color: LUX.gold,
              fontWeight: 900,
              letterSpacing: 1.5,
              textShadow: `0 0 12px ${LUX.gold}88`,
              fontFamily: "'Courier New', monospace",
            }}
          >
            💎 SERVIÇOS EXCLUSIVOS
          </Typography>
          <Typography
            variant="caption"
            sx={{ color: "#7c6c3a", letterSpacing: 1 }}
          >
            Elite & Luxo — apenas para clientes selecionados
          </Typography>
        </Box>
        <Chip
          label={`💰 ${totalCarteira.toFixed(2)}`}
          size="small"
          sx={{
            bgcolor: "rgba(234,179,8,0.15)",
            color: LUX.goldLight,
            fontWeight: 700,
            border: `1px solid ${LUX.gold}55`,
          }}
        />
      </Box>

      {isMaster && (
        <FormControl
          size="small"
          sx={{ mb: 2, minWidth: 260 }}
        >
          <InputLabel sx={{ color: "#a88b3a" }}>Serviços de:</InputLabel>
          <Select
            value={alvoEmail || ""}
            onChange={(e) => setAlvoEmail(e.target.value)}
            label="Serviços de:"
            sx={{
              color: "#fff",
              bgcolor: "rgba(0,0,0,0.4)",
              ".MuiOutlinedInput-notchedOutline": { borderColor: `${LUX.gold}44` },
              "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: `${LUX.gold}88` },
              "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: LUX.gold },
            }}
            MenuProps={{
              PaperProps: {
                sx: {
                  bgcolor: "#141007",
                  color: "#fff",
                  border: `1px solid ${LUX.gold}44`,
                },
              },
            }}
          >
            {userEmail && (
              <MenuItem value={userEmail}>
                Você mesmo ({fichasMap[userEmail]?.nome || userEmail})
              </MenuItem>
            )}
            {Object.keys(fichasMap)
              .filter((e) => e !== userEmail)
              .map((e) => (
                <MenuItem key={e} value={e}>
                  {fichasMap[e]?.nome || e}
                </MenuItem>
              ))}
          </Select>
        </FormControl>
      )}

      <Box
        sx={{
          display: "flex",
          gap: 0.5,
          mb: 2,
          borderBottom: `1px solid ${LUX.gold}33`,
          pb: 1,
          flexWrap: "wrap",
        }}
      >
        <Button
          size="small"
          onClick={() => setAba("catalogo")}
          sx={{
            color: aba === "catalogo" ? LUX.gold : "#7c6c3a",
            bgcolor:
              aba === "catalogo" ? "rgba(234,179,8,0.12)" : "transparent",
            fontFamily: "'Courier New', monospace",
            fontWeight: 700,
            border: `1px solid ${
              aba === "catalogo" ? LUX.gold + "66" : "transparent"
            }`,
            "&:hover": { bgcolor: "rgba(234,179,8,0.08)" },
          }}
        >
          💼 CATÁLOGO
        </Button>
        <Button
          size="small"
          onClick={() => setAba("ativos")}
          sx={{
            color: aba === "ativos" ? LUX.gold : "#7c6c3a",
            bgcolor: aba === "ativos" ? "rgba(234,179,8,0.12)" : "transparent",
            fontFamily: "'Courier New', monospace",
            fontWeight: 700,
            border: `1px solid ${
              aba === "ativos" ? LUX.gold + "66" : "transparent"
            }`,
            "&:hover": { bgcolor: "rgba(234,179,8,0.08)" },
          }}
        >
          ⏳ ATIVOS ({servicosAtivos.length})
        </Button>
        {isMaster && aba === "catalogo" && (
          <>
            <Button
              size="small"
              startIcon={<AddIcon />}
              onClick={abrirNovoServico}
              sx={{
                ml: "auto",
                color: "#000",
                bgcolor: LUX.gold,
                fontWeight: 800,
                "&:hover": { bgcolor: LUX.goldLight },
              }}
            >
              Novo Serviço
            </Button>
            <Button
              size="small"
              onClick={restaurarPadrao}
              sx={{ color: "#7c6c3a", fontSize: "0.65rem" }}
            >
              Restaurar
            </Button>
          </>
        )}
      </Box>

      {aba === "catalogo" && (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "1fr 1fr",
              md: "1fr 1fr",
            },
            gap: 1.5,
          }}
        >
          {servicos.map((s) => (
            <Paper
              key={s.id}
              elevation={0}
              sx={{
                p: 2,
                background: LUX.cardBg,
                border: LUX.cardBorder,
                borderRadius: 2,
                position: "relative",
                boxShadow: LUX.cardGlow,
                transition: "all 0.25s",
                "&:hover": {
                  borderColor: s.cor || LUX.gold,
                  boxShadow: `0 0 28px ${(s.cor || LUX.gold) + "44"}`,
                  transform: "translateY(-2px)",
                },
              }}
            >
              {isMaster && (
                <Box
                  sx={{
                    position: "absolute",
                    top: 6,
                    right: 6,
                    display: "flex",
                    gap: 0.5,
                    zIndex: 2,
                  }}
                >
                  <Tooltip title="Editar">
                    <IconButton
                      size="small"
                      onClick={() => abrirEdicaoServico(s)}
                      sx={{ color: LUX.gold, width: 24, height: 24 }}
                    >
                      <EditIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Apagar">
                    <IconButton
                      size="small"
                      onClick={() => apagarServico(s.id)}
                      sx={{ color: LUX.red, width: 24, height: 24 }}
                    >
                      <DeleteIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  </Tooltip>
                </Box>
              )}

              <Box sx={{ display: "flex", alignItems: "center", gap: 1.2, mb: 1 }}>
                <Box
                  sx={{
                    width: 46,
                    height: 46,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: `radial-gradient(circle, ${
                      (s.cor || LUX.gold) + "33"
                    }, transparent 70%)`,
                    border: `1px solid ${(s.cor || LUX.gold) + "66"}`,
                    fontSize: "1.6rem",
                  }}
                >
                  {s.icone || "💎"}
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography
                    variant="subtitle2"
                    sx={{
                      color: "#fff",
                      fontWeight: 800,
                      letterSpacing: 0.5,
                      fontFamily: "'Courier New', monospace",
                    }}
                  >
                    {s.titulo}
                  </Typography>
                  {nomeEmpresaExibida(s) && (
                    <Typography
                      variant="caption"
                      sx={{
                        color: s.cor || LUX.gold,
                        fontWeight: 700,
                        letterSpacing: 0.5,
                        fontSize: "0.65rem",
                      }}
                    >
                      ⚜ {nomeEmpresaExibida(s)}
                    </Typography>
                  )}
                </Box>
              </Box>

              <Typography
                variant="caption"
                sx={{
                  color: "#cbb277",
                  display: "block",
                  lineHeight: 1.5,
                  mb: 0.8,
                  fontSize: "0.72rem",
                }}
              >
                {s.descricao}
              </Typography>

              {s.detalhes && (
                <Typography
                  variant="caption"
                  sx={{
                    color: "#8a7b4d",
                    display: "block",
                    fontSize: "0.62rem",
                    fontStyle: "italic",
                    mb: 1,
                  }}
                >
                  {s.detalhes}
                </Typography>
              )}

              <Divider
                sx={{ my: 1, borderColor: "rgba(234,179,8,0.15)" }}
              />

              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 1,
                }}
              >
                <Box>
                  <Typography
                    variant="caption"
                    sx={{ color: "#7c6c3a", fontSize: "0.6rem" }}
                  >
                    A partir de
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color: LUX.goldLight,
                      fontWeight: 900,
                      fontFamily: "'Courier New', monospace",
                    }}
                  >
                    💰 {(s.precoBase || 0).toLocaleString("pt-BR")}
                    <Typography
                      component="span"
                      variant="caption"
                      sx={{ color: "#7c6c3a", ml: 0.5 }}
                    >
                      /estação
                    </Typography>
                  </Typography>
                </Box>
                <Button
                  size="small"
                  variant="contained"
                  onClick={() => abrirCompra(s)}
                  sx={{
                    bgcolor: s.cor || LUX.gold,
                    color: "#000",
                    fontWeight: 900,
                    fontSize: "0.7rem",
                    letterSpacing: 0.5,
                    px: 2,
                    "&:hover": { bgcolor: LUX.goldLight, color: "#000" },
                  }}
                >
                  CONTRATAR
                </Button>
              </Box>

              <Box sx={{ display: "flex", gap: 0.5, mt: 1, flexWrap: "wrap" }}>
                {(s.tiers || []).map((t) => (
                  <Chip
                    key={t.id}
                    label={`${t.nome} ×${t.multiplicador}`}
                    size="small"
                    sx={{
                      bgcolor:
                        t.id === "elite"
                          ? "rgba(168,85,247,0.15)"
                          : t.id === "premium"
                          ? "rgba(244,114,182,0.12)"
                          : "rgba(234,179,8,0.10)",
                      color:
                        t.id === "elite"
                          ? LUX.purple
                          : t.id === "premium"
                          ? LUX.pink
                          : LUX.goldLight,
                      fontSize: "0.55rem",
                      height: 18,
                      fontWeight: 700,
                    }}
                  />
                ))}
              </Box>
            </Paper>
          ))}
        </Box>
      )}

      {aba === "ativos" && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.2 }}>
          {servicosAtivos.length === 0 && (
            <Paper
              sx={{
                p: 3,
                textAlign: "center",
                bgcolor: "rgba(0,0,0,0.3)",
                border: `1px dashed ${LUX.gold}44`,
                borderRadius: 2,
              }}
            >
              <Typography sx={{ color: "#7c6c3a" }}>
                Nenhum serviço ativo. Contrate algo no catálogo. 💎
              </Typography>
            </Paper>
          )}
          {servicosAtivos.map((c) => {
            const info = avaliarContrato(c);
            return (
              <Paper
                key={c.id}
                elevation={0}
                sx={{
                  p: 2,
                  background: LUX.cardBg,
                  border: `1px solid ${info.cor}55`,
                  borderRadius: 2,
                  boxShadow: `0 0 18px ${info.cor}22`,
                  position: "relative",
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.2,
                    mb: 1,
                    flexWrap: "wrap",
                  }}
                >
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: `1px solid ${c.servicoCor || LUX.gold}66`,
                      background: `radial-gradient(circle, ${
                        (c.servicoCor || LUX.gold) + "33"
                      }, transparent 70%)`,
                      fontSize: "1.3rem",
                    }}
                  >
                    {c.servicoIcone || "💎"}
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 180 }}>
                    <Typography
                      variant="subtitle2"
                      sx={{
                        color: "#fff",
                        fontWeight: 800,
                        fontFamily: "'Courier New', monospace",
                      }}
                    >
                      {c.servicoTitulo}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{ color: "#a88b3a", fontSize: "0.65rem" }}
                    >
                      {c.tierNome} •{" "}
                      {c.empresaNome || "—"}
                    </Typography>
                  </Box>
                  <Chip
                    label={info.status}
                    size="small"
                    sx={{
                      bgcolor: info.cor + "22",
                      color: info.cor,
                      fontWeight: 900,
                      fontSize: "0.6rem",
                      height: 20,
                      border: `1px solid ${info.cor}66`,
                    }}
                  />
                  {isMaster && (
                    <IconButton
                      size="small"
                      onClick={() => cancelarContrato(c.id)}
                      sx={{ color: LUX.red }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  )}
                </Box>

                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    mb: 0.5,
                    flexWrap: "wrap",
                    gap: 1,
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{ color: "#cbb277", fontSize: "0.68rem" }}
                  >
                    📅 Início:{" "}
                    <strong style={{ color: "#fff" }}>
                      {c.iniciadoEm?.label || "—"}
                    </strong>
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{ color: "#cbb277", fontSize: "0.68rem" }}
                  >
                    ⌛ Expira:{" "}
                    <strong style={{ color: info.cor }}>
                      {c.expiraEm?.label || "—"}
                    </strong>
                  </Typography>
                </Box>

                <Box sx={{ position: "relative", mt: 1 }}>
                  <LinearProgress
                    variant="determinate"
                    value={info.progresso}
                    sx={{
                      height: 10,
                      borderRadius: 6,
                      bgcolor: "rgba(255,255,255,0.08)",
                      "& .MuiLinearProgress-bar": {
                        background: `linear-gradient(90deg, ${LUX.gold}, ${info.cor})`,
                        boxShadow: `0 0 12px ${info.cor}88`,
                      },
                    }}
                  />
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      mt: 0.5,
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{ color: "#7c6c3a", fontSize: "0.6rem" }}
                    >
                      {Math.round(info.progresso)}% concluído
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{ color: info.cor, fontSize: "0.6rem", fontWeight: 700 }}
                    >
                      {info.textoRestante}
                    </Typography>
                  </Box>
                </Box>
              </Paper>
            );
          })}
        </Box>
      )}

      <Dialog
        open={compraOpen}
        onClose={() => setCompraOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: "#141007",
            border: `2px solid ${LUX.gold}`,
            borderRadius: 2,
            background: LUX.cardBg,
            boxShadow: `0 0 40px ${LUX.gold}44`,
          },
        }}
      >
        <DialogTitle
          sx={{
            color: LUX.gold,
            fontWeight: 900,
            borderBottom: `1px solid ${LUX.gold}33`,
            fontFamily: "'Courier New', monospace",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>
            {servicoSel?.icone || "💎"} Contratar Serviço
          </span>
          <IconButton
            onClick={() => setCompraOpen(false)}
            sx={{ color: "#a88b3a" }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {servicoSel && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
              <Box>
                <Typography
                  variant="body1"
                  sx={{
                    color: "#fff",
                    fontWeight: 800,
                    fontFamily: "'Courier New', monospace",
                  }}
                >
                  {servicoSel.titulo}
                </Typography>
                {nomeEmpresaExibida(servicoSel) && (
                  <Typography
                    variant="caption"
                    sx={{ color: servicoSel.cor || LUX.gold, fontWeight: 700 }}
                  >
                    ⚜ {nomeEmpresaExibida(servicoSel)}
                  </Typography>
                )}
                <Typography
                  variant="caption"
                  sx={{ color: "#cbb277", display: "block", mt: 0.5 }}
                >
                  {servicoSel.descricao}
                </Typography>
              </Box>

              <Divider sx={{ borderColor: `${LUX.gold}22` }} />

              <Box>
                <Typography
                  variant="caption"
                  sx={{ color: LUX.gold, fontWeight: 800, letterSpacing: 1 }}
                >
                  VERSÃO DO SERVIÇO
                </Typography>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    gap: 1,
                    mt: 1,
                  }}
                >
                  {(servicoSel.tiers || []).map((t) => {
                    const ativo = tierSel === t.id;
                    const prosperidade = getProsperidade(servicoSel?.empresaNome || "Auraxia");
                    const bloqueado =
                      (t.id === "premium" && prosperidade < 40) ||
                      (t.id === "elite" && prosperidade < 70);
                    return (
                      <Paper
                        key={t.id}
                        onClick={() => !bloqueado && setTierSel(t.id)}
                        sx={{
                          p: 1.2,
                          textAlign: "center",
                          cursor: bloqueado ? "not-allowed" : "pointer",
                          opacity: bloqueado ? 0.4 : 1,
                          bgcolor: ativo
                            ? "rgba(234,179,8,0.12)"
                            : "rgba(0,0,0,0.4)",
                          border: `1px solid ${
                            ativo ? LUX.gold : "rgba(234,179,8,0.2)"
                          }`,
                          borderRadius: 2,
                          transition: "all 0.2s",
                          position: "relative",
                          "&:hover": bloqueado
                            ? {}
                            : {
                                borderColor: LUX.gold,
                                bgcolor: "rgba(234,179,8,0.08)",
                              },
                        }}
                      >
                        <Typography
                          variant="subtitle2"
                          sx={{
                            color: ativo ? LUX.goldLight : "#cbb277",
                            fontWeight: 900,
                            fontFamily: "'Courier New', monospace",
                          }}
                        >
                          {t.nome}
                        </Typography>
                        {bloqueado && (
                          <Typography
                            variant="caption"
                            sx={{
                              color: "#ef4444",
                              fontSize: "0.55rem",
                              display: "block",
                              fontWeight: 700,
                              mt: 0.3,
                            }}
                          >
                            🔒 Cidade pouco próspera
                          </Typography>
                        )}
                        <Typography
                          variant="caption"
                          sx={{
                            color: ativo ? LUX.gold : "#7c6c3a",
                            fontSize: "0.6rem",
                            display: "block",
                            fontWeight: 700,
                          }}
                        >
                          ×{t.multiplicador}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{
                            color: "#a88b3a",
                            fontSize: "0.6rem",
                            display: "block",
                            mt: 0.5,
                            lineHeight: 1.3,
                          }}
                        >
                          {t.descricao}
                        </Typography>
                      </Paper>
                    );
                  })}
                </Box>
              </Box>

              <Divider sx={{ borderColor: `${LUX.gold}22` }} />

              <Box>
                <Typography
                  variant="caption"
                  sx={{ color: LUX.gold, fontWeight: 800, letterSpacing: 1 }}
                >
                  DURAÇÃO DO CONTRATO
                </Typography>
                <Box sx={{ mt: 1 }}>
                  <ToggleButtonGroup
                    value={durTipo}
                    exclusive
                    onChange={(e, v) => {
                      if (!v) return;
                      setDurTipo(v);
                      setDurValor(1);
                    }}
                    size="small"
                    fullWidth
                    sx={{ mb: 1.5 }}
                  >
                    <ToggleButton
                      value="estacoes"
                      sx={{
                        color: durTipo === "estacoes" ? "#000" : "#cbb277",
                        bgcolor:
                          durTipo === "estacoes"
                            ? LUX.gold + " !important"
                            : "transparent",
                        borderColor: `${LUX.gold}44 !important`,
                        fontWeight: 800,
                        fontSize: "0.7rem",
                      }}
                    >
                      ESTAÇÕES (1-4)
                    </ToggleButton>
                    <ToggleButton
                      value="anos"
                      sx={{
                        color: durTipo === "anos" ? "#000" : "#cbb277",
                        bgcolor:
                          durTipo === "anos"
                            ? LUX.gold + " !important"
                            : "transparent",
                        borderColor: `${LUX.gold}44 !important`,
                        fontWeight: 800,
                        fontSize: "0.7rem",
                      }}
                    >
                      ANOS (1-5)
                    </ToggleButton>
                  </ToggleButtonGroup>

                  <ToggleButtonGroup
                    value={durValor}
                    exclusive
                    onChange={(e, v) => {
                      if (v !== null) setDurValor(v);
                    }}
                    size="small"
                    fullWidth
                  >
                    {(durTipo === "estacoes"
                      ? CARD_OPCOES
                      : ANOS_OPCOES
                    ).map((o) => (
                      <ToggleButton
                        key={o.valor}
                        value={o.valor}
                        sx={{
                          color: durValor === o.valor ? "#000" : "#cbb277",
                          bgcolor:
                            durValor === o.valor
                              ? LUX.gold + " !important"
                              : "transparent",
                          borderColor: `${LUX.gold}44 !important`,
                          fontWeight: 900,
                          fontFamily: "'Courier New', monospace",
                        }}
                      >
                        {o.label}
                      </ToggleButton>
                    ))}
                  </ToggleButtonGroup>

                  <Typography
                    variant="caption"
                    sx={{
                      color: "#7c6c3a",
                      display: "block",
                      mt: 1,
                      fontSize: "0.65rem",
                    }}
                  >
                    Equivalente a {duracaoEmEstacoes} estação(ões) —{" "}
                    {formatarFim(hojeTotal + duracaoEmEstacoes)}
                  </Typography>
                </Box>
              </Box>

              <Divider sx={{ borderColor: `${LUX.gold}22` }} />

              <FormControl fullWidth size="small">
                <InputLabel sx={{ color: "#a88b3a" }}>
                  Carteira para débito
                </InputLabel>
                <Select
                  value={carteiraSel}
                  onChange={(e) => setCarteiraSel(e.target.value)}
                  label="Carteira para débito"
                  sx={{
                    color: "#fff",
                    bgcolor: "rgba(0,0,0,0.4)",
                    ".MuiOutlinedInput-notchedOutline": {
                      borderColor: `${LUX.gold}44`,
                    },
                    "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                      borderColor: LUX.gold,
                    },
                  }}
                  MenuProps={{
                    PaperProps: {
                      sx: {
                        bgcolor: "#141007",
                        color: "#fff",
                        border: `1px solid ${LUX.gold}44`,
                      },
                    },
                  }}
                >
                  {Object.entries(carteiras).length === 0 && (
                    <MenuItem value="" disabled>
                      Nenhuma carteira disponível
                    </MenuItem>
                  )}
                  {Object.entries(carteiras).map(([nome, valor]) => (
                    <MenuItem key={nome} value={nome}>
                      {nome}: 💰{" "}
                      {typeof valor === "number" ? valor.toFixed(2) : "0.00"}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Paper
                sx={{
                  p: 1.5,
                  bgcolor: "rgba(234,179,8,0.06)",
                  border: `1px solid ${LUX.gold}44`,
                  borderRadius: 2,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    color: LUX.gold,
                    fontWeight: 800,
                    letterSpacing: 1,
                  }}
                >
                  VALOR TOTAL
                </Typography>
                <Typography
                  variant="h6"
                  sx={{
                    color: LUX.goldLight,
                    fontWeight: 900,
                    fontFamily: "'Courier New', monospace",
                  }}
                >
                  💰 {precoTotal.toLocaleString("pt-BR")}
                </Typography>
              </Paper>
            </Box>
          )}
        </DialogContent>
        <DialogActions
          sx={{ p: 2, borderTop: `1px solid ${LUX.gold}33` }}
        >
          <Button
            onClick={() => setCompraOpen(false)}
            sx={{ color: "#a88b3a" }}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={confirmarCompra}
            disabled={!carteiraSel || precoTotal <= 0}
            sx={{
              bgcolor: LUX.gold,
              color: "#000",
              fontWeight: 900,
              letterSpacing: 0.5,
              "&:hover": { bgcolor: LUX.goldLight },
            }}
          >
            CONFIRMAR CONTRATO
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: "#141007",
            border: `2px solid ${LUX.gold}`,
            borderRadius: 2,
            background: LUX.cardBg,
          },
        }}
      >
        <DialogTitle
          sx={{
            color: LUX.gold,
            fontWeight: 900,
            borderBottom: `1px solid ${LUX.gold}33`,
            fontFamily: "'Courier New', monospace",
          }}
        >
          {servicoEdit ? "✏️ Editar Serviço" : "💎 Novo Serviço"}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, mt: 2 }}>
            <Box sx={{ display: "flex", gap: 1 }}>
              <TextField
                size="small"
                label="Ícone"
                value={formServico.icone}
                onChange={(e) =>
                  setFormServico((p) => ({ ...p, icone: e.target.value }))
                }
                sx={{ width: 90 }}
                InputProps={{ sx: { color: "#fff" } }}
                InputLabelProps={{ sx: { color: "#a88b3a" } }}
              />
              <TextField
                size="small"
                fullWidth
                label="Título"
                value={formServico.titulo}
                onChange={(e) =>
                  setFormServico((p) => ({ ...p, titulo: e.target.value }))
                }
                InputProps={{ sx: { color: "#fff" } }}
                InputLabelProps={{ sx: { color: "#a88b3a" } }}
              />
            </Box>

            <FormControl fullWidth size="small">
              <InputLabel sx={{ color: "#a88b3a" }}>
                Empresa vinculada (opcional)
              </InputLabel>
              <Select
                value={formServico.empresaId}
                label="Empresa vinculada (opcional)"
                onChange={(e) => {
                  const id = e.target.value;
                  const emp = empresas.find((x) => x.id === id);
                  setFormServico((p) => ({
                    ...p,
                    empresaId: id,
                    empresaNome: emp
                      ? `${emp.sigla || ""} ${emp.nome || ""}`.trim()
                      : p.empresaNome,
                  }));
                }}
                sx={{ color: "#fff" }}
                MenuProps={{
                  PaperProps: {
                    sx: { bgcolor: "#141007", color: "#fff" },
                  },
                }}
              >
                <MenuItem value="">
                  <em>Nenhuma</em>
                </MenuItem>
                {empresas.map((emp) => (
                  <MenuItem key={emp.id} value={emp.id}>
                    {emp.sigla || ""} — {emp.nome}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              size="small"
              fullWidth
              label="Nome exibido da empresa"
              value={formServico.empresaNome}
              onChange={(e) =>
                setFormServico((p) => ({ ...p, empresaNome: e.target.value }))
              }
              InputProps={{ sx: { color: "#fff" } }}
              InputLabelProps={{ sx: { color: "#a88b3a" } }}
            />

            <TextField
              size="small"
              fullWidth
              multiline
              rows={2}
              label="Descrição curta"
              value={formServico.descricao}
              onChange={(e) =>
                setFormServico((p) => ({ ...p, descricao: e.target.value }))
              }
              InputProps={{ sx: { color: "#fff" } }}
              InputLabelProps={{ sx: { color: "#a88b3a" } }}
            />

            <TextField
              size="small"
              fullWidth
              label="Detalhes (separados por •)"
              value={formServico.detalhes}
              onChange={(e) =>
                setFormServico((p) => ({ ...p, detalhes: e.target.value }))
              }
              InputProps={{ sx: { color: "#fff" } }}
              InputLabelProps={{ sx: { color: "#a88b3a" } }}
            />

            <TextField
              size="small"
              fullWidth
              type="number"
              label="Preço base por estação (💰)"
              value={formServico.precoBase}
              onChange={(e) =>
                setFormServico((p) => ({
                  ...p,
                  precoBase: Number(e.target.value) || 0,
                }))
              }
              InputProps={{ sx: { color: LUX.goldLight } }}
              InputLabelProps={{ sx: { color: "#a88b3a" } }}
            />

            <Box>
              <Typography
                variant="caption"
                sx={{ color: "#a88b3a", fontWeight: 800 }}
              >
                COR DE DESTAQUE
              </Typography>
              <Box
                sx={{
                  display: "flex",
                  gap: 1,
                  mt: 1,
                  flexWrap: "wrap",
                }}
              >
                {CORES_DISPONIVEIS.map((c) => (
                  <Box
                    key={c}
                    onClick={() =>
                      setFormServico((p) => ({ ...p, cor: c }))
                    }
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      bgcolor: c,
                      cursor: "pointer",
                      border:
                        formServico.cor === c
                          ? "3px solid #fff"
                          : "2px solid rgba(255,255,255,0.2)",
                      boxShadow:
                        formServico.cor === c
                          ? `0 0 14px ${c}`
                          : "none",
                      transition: "all 0.2s",
                    }}
                  />
                ))}
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions
          sx={{ p: 2, borderTop: `1px solid ${LUX.gold}33` }}
        >
          <Button
            onClick={() => setEditOpen(false)}
            sx={{ color: "#a88b3a" }}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={salvarServico}
            sx={{
              bgcolor: LUX.gold,
              color: "#000",
              fontWeight: 900,
              "&:hover": { bgcolor: LUX.goldLight },
            }}
          >
            {servicoEdit ? "Salvar" : "Criar"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default ServicosEspeciais;
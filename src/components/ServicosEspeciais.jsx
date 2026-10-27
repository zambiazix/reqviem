import React, { useState, useEffect, useMemo } from "react";
import {
  Box, Paper, Typography, Button, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, FormControl, InputLabel,
  Select, MenuItem, Chip, Tabs, Tab, InputAdornment, Tooltip,
  Grid, Divider
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import SearchIcon from "@mui/icons-material/Search";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import AssignmentIndIcon from "@mui/icons-material/AssignmentInd";
import LocalAtmIcon from "@mui/icons-material/LocalAtm";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import { db } from "../firebaseConfig";
import {
  collection, doc, onSnapshot, setDoc, deleteDoc, getDoc, updateDoc
} from "firebase/firestore";

// 🟢 TEMA CYBERPUNK / FIXER REFINADO
const T = {
  bg: "#050508",
  bg2: "#0f0f15",
  card: "#12121c",
  border: "#2a2a3e",
  neon: "#00e5ff",
  neonDark: "#0088aa",
  pink: "#ff0055",
  gold: "#fbbf24",
  green: "#00ff88",
  text: "#e2e8f0",
  textDim: "#94a3b8",
};

const CORES_OPERADOR = ["#00e5ff", "#ff0055", "#fbbf24", "#00ff88", "#a855f7", "#ff9800", "#ef4444", "#3b82f6"];

const normalizarTexto = (texto) => {
  if (!texto) return "";
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
};

export default function ServicosEspeciais({ userEmail, fichasMap = {}, isMaster = false }) {
  const [aba, setAba] = useState(0);

  const [servicos, setServicos] = useState([]);
  const [operadores, setOperadores] = useState([]);
  const [contratosAtivos, setContratosAtivos] = useState([]);
  const [paises, setPaises] = useState([]);
  const [cidades, setCidades] = useState([]);

  const [busca, setBusca] = useState("");
  const [filtroOperador, setFiltroOperador] = useState("");

  const [modalAceitar, setModalAceitar] = useState(false);
  const [servicoSelecionado, setServicoSelecionado] = useState(null);
  const [modalServicoOpen, setModalServicoOpen] = useState(false);
  const [modalOperadorOpen, setModalOperadorOpen] = useState(false);

  // 🟢 NOVOS ESTADOS: Concluir + Pagar contrato
  const [modalConcluirOpen, setModalConcluirOpen] = useState(false);
  const [contratoSelecionado, setContratoSelecionado] = useState(null);
  const [valorFinal, setValorFinal] = useState(0);
  const [motivoAjuste, setMotivoAjuste] = useState("");
  const [ajusteTipo, setAjusteTipo] = useState("mesmo"); // "mesmo" | "bonus" | "penalidade" | "custom"

  // 🟢 REPUTAÇÃO / RANKING
  const [reputacoes, setReputacoes] = useState({});
  const [reputacaoCarregada, setReputacaoCarregada] = useState(false);
  const [minhaReputacao, setMinhaReputacao] = useState(null);
  const [modalNickOpen, setModalNickOpen] = useState(false);
  const [nickTemp, setNickTemp] = useState("");
  const [salvandoNick, setSalvandoNick] = useState(false);
  const [seedando, setSeedando] = useState(false);

  const [formServico, setFormServico] = useState({});
  const [formOperador, setFormOperador] = useState({});

  // 🟢 CARREGAR DADOS
  useEffect(() => {
    const unsubServicos = onSnapshot(collection(db, "comercio_servicos"), (snap) => {
      setServicos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => console.error("Erro serviços:", error));

    const unsubOperadores = onSnapshot(collection(db, "comercio_operadores"), (snap) => {
      setOperadores(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => console.error("Erro operadores:", error));

    const unsubContratos = onSnapshot(collection(db, "comercio_contratos_ativos"), (snap) => {
      setContratosAtivos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => console.error("Erro contratos:", error));

    const unsubPaises = onSnapshot(collection(db, "sim_paises"), (snap) => {
      setPaises(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => console.error("Erro países:", error));

    const unsubCidades = onSnapshot(collection(db, "sim_cidades"), (snap) => {
      setCidades(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => console.error("Erro cidades:", error));

    // 🟢 REPUTAÇÃO
    const unsubRep = onSnapshot(collection(db, "comercio_reputacao"), (snap) => {
      const map = {};
      snap.forEach((d) => {
        const data = d.data() || {};
        map[d.id] = {
          email: d.id,
          nick: data.nick || "",
          xp: Number(data.xp) || 0,
          contratosConcluidos: Number(data.contratosConcluidos) || 0,
          criadoEm: data.criadoEm || null,
        };
      });
      setReputacoes(map);
      setReputacaoCarregada(true);
    }, (error) => console.error("Erro reputação:", error));

    return () => {
      unsubServicos(); unsubOperadores(); unsubContratos(); unsubPaises(); unsubCidades(); unsubRep();
    };
  }, []);

  // 🟢 SINCRONIZA MINHA REPUTAÇÃO + ABRE MODAL SE NÃO TIVER NICK
  useEffect(() => {
    if (!reputacaoCarregada) return;
    if (!userEmail || isMaster) return;
    const rep = reputacoes[userEmail];
    setMinhaReputacao(rep || null);
    if (!rep?.nick) {
      setModalNickOpen(true);
    } else {
      setModalNickOpen(false);
    }
  }, [reputacoes, reputacaoCarregada, userEmail, isMaster]);

  // 🟢 BUSCA E FILTRO
  const servicosFiltrados = useMemo(() => {
    let result = servicos;
    const termo = normalizarTexto(busca);

    if (termo) {
      result = result.filter(s =>
        normalizarTexto(s.titulo).includes(termo) ||
        normalizarTexto(s.operadorNome).includes(termo) ||
        normalizarTexto(s.paisNome).includes(termo) ||
        normalizarTexto(s.cidadeNome).includes(termo) ||
        normalizarTexto(s.sinopse).includes(termo)
      );
    }

    if (filtroOperador) result = result.filter(s => s.operadorId === filtroOperador);

    const idsAceitos = contratosAtivos
      .filter(c => c.jogadorEmail === userEmail && c.status === "em_andamento")
      .map(c => c.servicoId);

    return result.filter(s => !idsAceitos.includes(s.id));
  }, [servicos, busca, filtroOperador, contratosAtivos, userEmail]);

  const contratosVisiveis = useMemo(() => {
    if (isMaster) return contratosAtivos;
    return contratosAtivos.filter(c => c.jogadorEmail === userEmail);
  }, [contratosAtivos, isMaster, userEmail]);

  // 🟢 SALVAR NICK
  const salvarNick = async () => {
    const nickLimpo = nickTemp.trim();
    if (nickLimpo.length < 3) return alert("O nick precisa ter pelo menos 3 caracteres.");
    if (nickLimpo.length > 20) return alert("O nick pode ter no máximo 20 caracteres.");
    const duplicado = Object.values(reputacoes).some(
      (r) => r.email !== userEmail && r.nick?.toLowerCase() === nickLimpo.toLowerCase()
    );
    if (duplicado) return alert("❌ Este nick já está em uso. Escolha outro.");
    setSalvandoNick(true);
    try {
      await setDoc(doc(db, "comercio_reputacao", userEmail), {
        nick: nickLimpo,
        xp: 0,
        contratosConcluidos: 0,
        criadoEm: new Date().toISOString(),
      }, { merge: true });
      alert(`✅ Nick "${nickLimpo}" registrado! Você está no ranking.`);
      setModalNickOpen(false);
      setNickTemp("");
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar nick: " + err.message);
    } finally {
      setSalvandoNick(false);
    }
  };

  // 🟢 ADICIONAR XP À REPUTAÇÃO
  const adicionarXPReputacao = async (emailJogador, xpGanho, contratosAdicionais = 1) => {
    if (!emailJogador) return;
    try {
      const ref = doc(db, "comercio_reputacao", emailJogador);
      const snap = await getDoc(ref);
      const atual = snap.exists() ? snap.data() : { xp: 0, contratosConcluidos: 0 };
      await setDoc(ref, {
        xp: (Number(atual.xp) || 0) + xpGanho,
        contratosConcluidos: (Number(atual.contratosConcluidos) || 0) + contratosAdicionais,
      }, { merge: true });
    } catch (err) {
      console.error("Erro XP reputação:", err);
    }
  };

  // 🟢 GERAR OPERADORES (1 POR CIDADE)
  const NOMES_OP_POOL = [
    "Vex", "Kaida", "Rook", "Sable", "Nyx", "Dax", "Jinx", "Lyra", "Onyx", "Vesper",
    "Kael", "Ryder", "Iris", "Vane", "Saskia", "Nero", "Halle", "Crow", "Wren", "Ashe",
    "Zane", "Mira", "Thorn", "Corvin", "Selene", "Dante", "Aria", "Kova", "Ember", "Flint",
    "Silas", "Nova", "Rainer", "Wynne", "Holt", "Astra", "Kaelen", "Lorne", "Saber", "Echo",
    "Rhea", "Cyrus", "Vale", "Ivo", "Azael", "Ryn", "Tess", "Odin", "Maeve", "Kai",
  ];
  const SOBRENOMES_OP_POOL = [
    "Hollow", "Vex", "Crimson", "Steel", "Mercer", "Kade", "Sable", "Vayne", "Locke", "Ashford",
    "Grey", "Blackwood", "Cross", "Kane", "Voss", "Riddle", "Korvus", "Haze", "Frost", "Slate",
    "Draven", "Sparrow", "Reyne", "Castellan", "Wolfe", "Reed", "Monroe", "Sloane", "Knox", "Marsh",
  ];
  const TITULOS_OP_POOL = [
    "O Fixer", "O Corretor", "A Sombra", "O Contato", "A Raposa", "O Olho", "A Mão", "O Gato",
    "O Fantasma", "O Arquivista", "A Voz", "O Guardião",
  ];

  const gerarOperadores = async () => {
    if (!isMaster) return;
    if (cidades.length === 0) return alert("Inicialize o Simulador do Mundo primeiro (precisa de cidades).");
    if (!window.confirm(`Gerar operadores para ${cidades.length} cidade(s)?\n\n1 operador por cidade. Operadores já existentes NÃO serão sobrescritos.`)) return;
    setSeedando(true);
    try {
      const existentesPorCidade = new Set(
        operadores.filter(o => o.cidadeOrigemId).map(o => o.cidadeOrigemId)
      );
      const cidadesFaltando = cidades.filter(c => !existentesPorCidade.has(c.id));
      if (cidadesFaltando.length === 0) {
        alert("✅ Todas as cidades já têm operador. Nada a fazer.");
        setSeedando(false);
        return;
      }
      const nomesUsados = new Set(operadores.map(o => o.nome));
      let criados = 0;
      for (let i = 0; i < cidadesFaltando.length; i++) {
        const cidade = cidadesFaltando[i];
        let tentativas = 0;
        let nomeGerado;
        do {
          const primeiro = NOMES_OP_POOL[Math.floor(Math.random() * NOMES_OP_POOL.length)];
          const ultimo = SOBRENOMES_OP_POOL[Math.floor(Math.random() * SOBRENOMES_OP_POOL.length)];
          const titulo = Math.random() > 0.6 ? `, ${TITULOS_OP_POOL[Math.floor(Math.random() * TITULOS_OP_POOL.length)]}` : "";
          nomeGerado = `${primeiro} ${ultimo}${titulo}`;
          tentativas++;
        } while (nomesUsados.has(nomeGerado) && tentativas < 30);
        if (nomesUsados.has(nomeGerado)) nomeGerado = `${nomeGerado} ${Math.floor(Math.random() * 99)}`;
        nomesUsados.add(nomeGerado);
        const id = `op_auto_${cidade.id}`;
        await setDoc(doc(db, "comercio_operadores", id), {
          id,
          nome: nomeGerado,
          descricao: `Operador de ${cidade.nome}. Especialista em contratos locais.`,
          cor: CORES_OPERADOR[Math.floor(Math.random() * CORES_OPERADOR.length)],
          cidadeOrigemId: cidade.id,
          cidadeOrigemNome: cidade.nome,
          paisOrigemId: cidade.paisId || "",
          criadoEm: new Date().toISOString(),
        });
        criados++;
      }
      alert(`✅ ${criados} operador(es) gerado(s)!`);
    } catch (err) {
      console.error(err);
      alert("Erro ao gerar operadores: " + err.message);
    } finally {
      setSeedando(false);
    }
  };

  // 🟢 AÇÕES
  const aceitarServico = async () => {
    if (!servicoSelecionado || !userEmail) return;
    // 🟢 Bloqueia se não tem nick (anonimato no ranking)
    if (!isMaster && !minhaReputacao?.nick) {
      setModalNickOpen(true);
      return alert("Você precisa registrar um nick antes de aceitar contratos.");
    }
    try {
      const contratoId = `${servicoSelecionado.id}_${userEmail}_${Date.now()}`;
      const prazoFinal = servicoSelecionado.prazoDias > 0
        ? new Date(Date.now() + servicoSelecionado.prazoDias * 24 * 60 * 60 * 1000).toISOString()
        : null;

      const nomeJogador = fichasMap[userEmail]?.nome || userEmail;

      await setDoc(doc(db, "comercio_contratos_ativos", contratoId), {
        id: contratoId,
        servicoId: servicoSelecionado.id,
        jogadorEmail: userEmail,
        jogadorNome: nomeJogador,
        status: "em_andamento",
        aceitoEm: new Date().toISOString(),
        prazoFinal: prazoFinal,
        detalhes: servicoSelecionado
      });

      alert("✅ Contrato aceito! Verifique a aba 'Ativos'.");
      setModalAceitar(false);
      setServicoSelecionado(null);
    } catch (err) {
      console.error(err);
      alert("Erro ao aceitar contrato.");
    }
  };

  // 🟢 ABRIR MODAL DE CONCLUSÃO (com ajuste de valor)
  const abrirConcluir = (contrato) => {
    setContratoSelecionado(contrato);
    setValorFinal(contrato.detalhes.valor || 0);
    setAjusteTipo("mesmo");
    setMotivoAjuste("");
    setModalConcluirOpen(true);
  };

  // 🟢 APLICAR AJUSTE RÁPIDO
  const aplicarAjuste = (tipo) => {
    if (!contratoSelecionado) return;
    const base = contratoSelecionado.detalhes.valor || 0;
    setAjusteTipo(tipo);
    if (tipo === "mesmo") {
      setValorFinal(base);
      setMotivoAjuste("");
    } else if (tipo === "bonus") {
      setValorFinal(Math.round(base * 1.25));
    } else if (tipo === "penalidade") {
      setValorFinal(Math.round(base * 0.75));
    } else {
      setValorFinal(base);
    }
  };

  // 🟢 CONCLUIR E PAGAR — credita na carteira "Bolso" do jogador
  const concluirEPagar = async () => {
    if (!contratoSelecionado) return;

    if (valorFinal < 0) {
      return alert("⚠️ O valor não pode ser negativo.");
    }

    if (!window.confirm(
      `Confirmar pagamento de 💰 ${valorFinal.toLocaleString("pt-BR")} ` +
      `para ${contratoSelecionado.jogadorNome}?\n\n` +
      `Valor original: 💰 ${(contratoSelecionado.detalhes.valor || 0).toLocaleString("pt-BR")}`
    )) return;

    try {
      // 1) Creditar na carteira do jogador
      const playerFichaRef = doc(db, "fichas", contratoSelecionado.jogadorEmail);
      const playerSnap = await getDoc(playerFichaRef);

      if (!playerSnap.exists()) {
        return alert("❌ Ficha do jogador não encontrada! O contrato NÃO foi concluído.");
      }

      const fichaData = playerSnap.data();
      const carteiras = Array.isArray(fichaData.carteiras) ? [...fichaData.carteiras] : [];
      const bolsoIdx = carteiras.findIndex(c => c.nome === "Bolso");

      if (bolsoIdx >= 0) {
        carteiras[bolsoIdx] = {
          ...carteiras[bolsoIdx],
          valor: (carteiras[bolsoIdx].valor || 0) + valorFinal
        };
      } else {
        carteiras.push({ nome: "Bolso", valor: valorFinal });
      }

      await updateDoc(playerFichaRef, { carteiras });

      // 2) Marcar contrato como concluído + registrar valores
      await setDoc(doc(db, "comercio_contratos_ativos", contratoSelecionado.id), {
        status: "concluido",
        valorPago: valorFinal,
        valorOriginal: contratoSelecionado.detalhes.valor || 0,
        motivoAjuste: motivoAjuste || "",
        ajusteTipo,
        concluidoEm: new Date().toISOString(),
        concluidoPor: userEmail || "mestre",
      }, { merge: true });

      // 🟢 XP DE REPUTAÇÃO (números fixos)
      const xpMap = { mesmo: 10, bonus: 15, penalidade: 5, custom: 10 };
      const xpGanho = xpMap[ajusteTipo] ?? 10;
      await adicionarXPReputacao(contratoSelecionado.jogadorEmail, xpGanho, 1);

      // 3) 🟢 EMPURRAR O DINHEIRO NO HUD EM TEMPO REAL (se o jogador estiver online)
      try {
        // Cria um "envelope" de transferência que o FloatingHUD/Ficha escuta
        const transfId = `pay_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        await setDoc(doc(db, "transferencias_pendentes", transfId), {
          tipo: "dinheiro",
          valor: valorFinal,
          carteiraDestino: "Bolso",
          de: userEmail || "mestre",
          deNome: "Contrato Concluído",
          para: contratoSelecionado.jogadorEmail,
          paraNome: contratoSelecionado.jogadorNome,
          aplicado: true, // já foi aplicado direto na ficha acima
          criadoEm: new Date().toISOString(),
          origem: "contrato_servico",
        });
      } catch (e) {
        console.warn("Aviso: não consegui criar envelope de notificação:", e);
      }

      alert(
        `✅ Contrato concluído!\n\n` +
        `💰 Pago: ${valorFinal.toLocaleString("pt-BR")}\n` +
        `👤 Para: ${contratoSelecionado.jogadorNome}\n` +
        `📁 Carteira: Bolso`
      );

      setModalConcluirOpen(false);
      setContratoSelecionado(null);
    } catch (err) {
      console.error("Erro ao concluir contrato:", err);
      alert("❌ Erro ao concluir: " + err.message);
    }
  };

  const salvarOperador = async () => {
    if (!formOperador.nome?.trim()) return alert("Nome do operador é obrigatório.");
    const id = formOperador.id || `op_${Date.now()}`;
    await setDoc(doc(db, "comercio_operadores", id), {
      id,
      nome: formOperador.nome.trim(),
      descricao: formOperador.descricao || "",
      cor: formOperador.cor || T.neon,
    }, { merge: true });
    setModalOperadorOpen(false);
  };

  const salvarServico = async () => {
    if (!formServico.titulo?.trim() || !formServico.operadorId) return alert("Preencha título e operador.");

    const op = operadores.find(o => o.id === formServico.operadorId);
    const pais = paises.find(p => p.id === formServico.paisId);
    const cidade = cidades.find(c => c.id === formServico.cidadeId);

    const id = formServico.id || `srv_${Date.now()}`;
    const valorNumerico = parseFloat(String(formServico.valor).replace(',', '.')) || 0;
    const prazoNumerico = parseInt(String(formServico.prazoDias).replace(',', '.'), 10) || 0;

    const payload = {
      id,
      titulo: formServico.titulo.trim(),
      sinopse: formServico.sinopse || "",
      descricaoCompleta: formServico.descricaoCompleta || "",
      valor: valorNumerico,
      prazoDias: prazoNumerico,
      paisId: formServico.paisId || "",
      paisNome: pais?.nome || formServico.paisNomeManual || "",
      cidadeId: formServico.cidadeId || "",
      cidadeNome: cidade?.nome || formServico.cidadeNomeManual || "",
      operadorId: formServico.operadorId,
      operadorNome: op?.nome || "Desconhecido",
      operadorCor: op?.cor || T.neon,
    };

    await setDoc(doc(db, "comercio_servicos", id), payload, { merge: true });
    setModalServicoOpen(false);
  };

  const deletarServico = async (id) => {
    if (!window.confirm("Apagar este serviço permanentemente?")) return;
    await deleteDoc(doc(db, "comercio_servicos", id));
  };

  const deletarOperador = async (id) => {
    if (!window.confirm("Apagar este operador?")) return;
    await deleteDoc(doc(db, "comercio_operadores", id));
  };

  // 🟢 GERADOR DE CONTRATOS COM I.A. (MASSIVO)
  const gerarServicosComIA = async () => {
    if (!isMaster) return;
    if (operadores.length === 0) return alert("⚠️ Cadastre pelo menos 1 Operador antes de gerar com I.A.");
    if (cidades.length === 0) return alert("⚠️ Inicialize o Simulador do Mundo primeiro (para ter cidades).");

    const qtdParaGerar = Math.min(cidades.length, 30);
    const promises = [];

    const prefixos = ["Protocolo:", "Operação:", "Fantasma em", "A Queda de", "O Segredo de", "Lágrimas de", "Sombras em", "Corrida Contra o Tempo em", "O Resgate de", "Roubo em"];
    const titulosBase = ["Neon", "Arasaka", "Mandálore", "Matrix", "Blade Runner", "Império", "Submundo", "Chip", "Implante", "Netrunner", "Exoesqueleto", "Duna", "Vingança", "Traição", "Blackwall"];
    const sinopsesBase = [
      "Um alvo corporativo precisa desaparecer antes do amanhecer. Sem testemunhas, sem rastros.",
      "Um pacote criptografado (e muito perigoso) foi roubado. O cliente quer de volta, a qualquer custo.",
      "Informações vitais estão guardadas em um servidor militar. Invasão furtiva necessária.",
      "Uma figura importante está sendo chantageada com um vídeo ilícito. Resolva o problema discretamente.",
      "Um carregamento de armas de alta tecnologia sumiu na fronteira. A máfia local está envolvida.",
      "Um experimento cibernético fugiu do laboratório. Ele está confuso e com os sistemas hackeados.",
      "Você precisa invadir uma festa de gala na elite da cidade para roubar um biochip dourado.",
      "Um trem maglev foi sequestrado por terroristas. Liberte os reféns sem acionar a segurança."
    ];
    const descricoesBase = [
      "Nossa fonte indica que o alvo estará em um evento corporativo no distrito alto. Você precisará se infiltrar usando um disfarce e acessar o terminal principal.\n\nPerigos: Segurança pesada, cães cibernéticos, possibilidade de confronto direto.",
      "O pacote está em um cofre blindado em um trem maglev. Você tem duas opções: hackear o sistema de trilhos para parar o trem, ou pular a bordo com equipamento de rapel.\n\nA recompensa é alta, mas as consequências de falhar são piores. Cuidado com os drones.",
      "A equipe do cliente já tentou uma abordagem frontal e falhou. Você é a última esperança. Infiltre-se como um trabalhador braçal, descubra o layout e extraia o alvo.\n\nA extração deve ser silenciosa.",
      "O alvo está paranoico e raramente sai de sua fortaleza. Você precisará usar a rede de contatos para atraí-lo para fora ou cortar o fornecimento de energia do prédio para entrar.\n\nVocê terá cerca de 5 minutos até o gerador de emergência ligar.",
      "O item em questão tem rastreadores de frequência. Você precisará de um bloqueador de sinal e um veículo rápido para a fuga. Cuidado com os drones de vigilância da polícia corporativa na área.",
      "A localização é uma zona de exclusão aérea. Você precisará entrar a pé, passar pelos postos de controle e garantir que a extração saia viva.\n\nSe der errado, o cliente negará qualquer envolvimento."
    ];

    const cidadesParaIA = [...cidades].sort(() => 0.5 - Math.random()).slice(0, qtdParaGerar);

    for (let i = 0; i < cidadesParaIA.length; i++) {
      const cidade = cidadesParaIA[i];
      const op = operadores[Math.floor(Math.random() * operadores.length)];
      const pais = paises.find(p => p.id === cidade.paisId) || { nome: "Desconhecido", id: "" };

      const p = prefixos[Math.floor(Math.random() * prefixos.length)];
      const t = titulosBase[Math.floor(Math.random() * titulosBase.length)];
      const l = locaisParaIA(cidade.nome);

      const titulo = `${p} ${t} (${l})`;
      const sinopse = sinopsesBase[Math.floor(Math.random() * sinopsesBase.length)];
      const descricaoCompleta = descricoesBase[Math.floor(Math.random() * descricoesBase.length)];

      const valor = Math.floor(Math.random() * 45 + 5) * 500;
      const prazoDias = Math.floor(Math.random() * 7) + 1;
      const id = `srv_ai_${Date.now()}_${i}`;

      const payload = {
        id, titulo, sinopse, descricaoCompleta, valor, prazoDias,
        paisId: pais.id, paisNome: pais.nome,
        cidadeId: cidade.id, cidadeNome: cidade.nome,
        operadorId: op.id, operadorNome: op.nome, operadorCor: op.cor || T.neon,
      };

      promises.push(setDoc(doc(db, "comercio_servicos", id), payload, { merge: true }));
    }

    try {
      window.alert(`⏳ A I.A. está gerando ${qtdParaGerar} contratos...\n\nClique OK e aguarde.`);
      await Promise.all(promises);
      alert(`✅ ${qtdParaGerar} novos contratos gerados com sucesso!`);
    } catch (error) {
      console.error(error);
      alert("❌ Erro ao gerar contratos com a I.A.");
    }
  };

  const locaisParaIA = (nomeCidade) => {
    const prefixos = ["Distrito de", "Setor de", "Zona Franca de", "Docas de", "Periferia de", "Submundo de"];
    return `${prefixos[Math.floor(Math.random() * prefixos.length)]} ${nomeCidade}`;
  };

  // ================= RENDERIZAÇÃO =================
  return (
    <Box
      sx={{
        p: 3,
        bgcolor: T.bg,
        fontFamily: "'Courier New', monospace",
        // 🟢 FIX DO SCROLL: ocupa 100% do pai e rola internamente
        height: "100%",
        maxHeight: "100%",
        overflowY: "auto",
        overflowX: "hidden",
      }}
    >
      {/* HEADER ESTILIZADO */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", mb: 3, flexWrap: "wrap", gap: 2, borderBottom: `2px solid ${T.neonDark}`, pb: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ color: T.neon, fontWeight: 900, letterSpacing: 2, textShadow: `0 0 10px ${T.neon}` }}>
            💼 QUADRO DE CONTRATOS
          </Typography>
          <Typography variant="caption" sx={{ color: T.textDim, letterSpacing: 2, textTransform: "uppercase" }}>
            Terminal de Negociação // Acesso Restrito
          </Typography>
        </Box>
        <Chip
          label={`📡 ${servicosFiltrados.length} CONTRATOS DISPONÍVEIS`}
          size="medium"
          sx={{ bgcolor: `${T.neon}15`, color: T.neon, fontWeight: 900, border: `1px solid ${T.neon}`, borderRadius: 1, px: 1 }}
        />
      </Box>

      {/* TABS CUSTOMIZADAS */}
      <Tabs
        value={aba}
        onChange={(_, v) => setAba(v)}
        sx={{
          mb: 3,
          "& .MuiTab-root": { color: T.textDim, fontWeight: 900, fontFamily: "'Courier New', monospace", fontSize: "1rem", transition: "0.3s" },
          "& .Mui-selected": { color: `${T.neon} !important`, textShadow: `0 0 8px ${T.neon}` },
          "& .MuiTabs-indicator": { bgcolor: T.neon, height: 3, boxShadow: `0 0 10px ${T.neon}` }
        }}
      >
        <Tab label="📋 Catálogo" />
        <Tab label={`⏳ Ativos (${contratosVisiveis.length})`} />
        <Tab label="🏆 Ranking" />
        {isMaster && <Tab label="⚙️ Gerenciar" />}
      </Tabs>

      {/* ABA 0: CATÁLOGO */}
      {aba === 0 && (
        <Box>
          {/* BARRA DE BUSCA */}
          <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
            <TextField
              size="small"
              placeholder="🔍 Buscar por título, operador, local..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              sx={{
                flex: 2, minWidth: 250, bgcolor: T.card,
                input: { color: T.neon, fontFamily: "'Courier New', monospace" },
                "& .MuiOutlinedInput-notchedOutline": { borderColor: T.neonDark },
                "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: T.neon },
                "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: T.neon, borderWidth: 2 }
              }}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: T.neon }} /></InputAdornment> }}
            />
            <FormControl size="small" sx={{ flex: 1, minWidth: 150, bgcolor: T.card }}>
              <InputLabel sx={{ color: T.textDim }}>Operador</InputLabel>
              <Select
                value={filtroOperador}
                onChange={(e) => setFiltroOperador(e.target.value)}
                label="Operador"
                sx={{
                  color: T.text, fontFamily: "'Courier New', monospace",
                  "& .MuiOutlinedInput-notchedOutline": { borderColor: T.neonDark },
                  "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: T.neon },
                  "& .MuiSvgIcon-root": { color: T.neon }
                }}
                MenuProps={{ PaperProps: { sx: { bgcolor: T.card, color: T.text } } }}
              >
                <MenuItem value="">Todos</MenuItem>
                {operadores.map(o => <MenuItem key={o.id} value={o.id}>{o.nome}</MenuItem>)}
              </Select>
            </FormControl>
          </Box>

          {/* GRID DE CARDS */}
          <Grid container spacing={3}>
            {servicosFiltrados.map(srv => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={srv.id}>
                <Paper
                  sx={{
                    p: 0, bgcolor: T.card, border: `1px solid ${T.border}`, borderRadius: 2,
                    height: "100%", display: "flex", flexDirection: "column", overflow: "hidden",
                    position: "relative",
                    transition: "all 0.3s ease",
                    "&:hover": {
                      borderColor: srv.operadorCor,
                      boxShadow: `0 0 20px ${srv.operadorCor}44`,
                      transform: "translateY(-5px)"
                    }
                  }}
                >
                  <Box sx={{ height: 4, width: "100%", bgcolor: srv.operadorCor, boxShadow: `0 0 10px ${srv.operadorCor}` }} />

                  <Box sx={{ p: 2, display: "flex", flexDirection: "column", flex: 1 }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                      <Chip
                        icon={<AssignmentIndIcon sx={{ color: `${srv.operadorCor} !important`, fontSize: '0.9rem' }} />}
                        label={srv.operadorNome}
                        size="small"
                        sx={{ bgcolor: `${srv.operadorCor}15`, color: srv.operadorCor, fontWeight: 900, fontSize: "0.65rem", border: `1px solid ${srv.operadorCor}44` }}
                      />
                      <Typography variant="caption" sx={{ color: T.textDim, display: "flex", alignItems: "center", gap: 0.5 }}>
                        <LocationOnIcon sx={{ fontSize: 14 }} /> {srv.cidadeNome || srv.paisNome || "Desconhecido"}
                      </Typography>
                    </Box>

                    <Typography sx={{ color: "#fff", fontWeight: 900, fontSize: "1.2rem", mb: 1, lineHeight: 1.2 }}>
                      {srv.titulo}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        color: T.textDim, fontSize: "0.8rem", mb: 2, flex: 1,
                        display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden",
                        fontFamily: "'Courier New', monospace"
                      }}
                    >
                      {srv.sinopse || "Nenhuma sinopse fornecida."}
                    </Typography>

                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", mt: "auto", pt: 2, borderTop: `1px dashed ${T.border}` }}>
                      <Box>
                        <Typography variant="caption" sx={{ color: T.textDim, textTransform: "uppercase", letterSpacing: 1 }}>Pagamento</Typography>
                        <Typography sx={{ color: T.gold, fontWeight: 900, fontSize: "1.2rem", display: "flex", alignItems: "center", gap: 0.5 }}>
                          <LocalAtmIcon /> {(srv.valor || 0).toLocaleString("pt-BR")}
                        </Typography>
                      </Box>
                      <Button
                        variant="contained"
                        size="small"
                        onClick={() => { setServicoSelecionado(srv); setModalAceitar(true); }}
                        sx={{
                          bgcolor: srv.operadorCor, color: "#000", fontWeight: 900, borderRadius: 1,
                          "&:hover": { bgcolor: srv.operadorCor, boxShadow: `0 0 15px ${srv.operadorCor}` }
                        }}
                      >
                        Acessar
                      </Button>
                    </Box>
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>
          {servicosFiltrados.length === 0 && (
            <Box sx={{ textAlign: "center", mt: 8, opacity: 0.5 }}>
              <SearchIcon sx={{ fontSize: 60, color: T.textDim, mb: 2 }} />
              <Typography sx={{ color: T.textDim, fontFamily: "'Courier New', monospace" }}>Nenhum contrato disponível no momento.</Typography>
            </Box>
          )}
        </Box>
      )}

      {/* ABA 1: ATIVOS */}
      {aba === 1 && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {contratosVisiveis.length === 0 && (
            <Paper sx={{ p: 6, textAlign: "center", bgcolor: T.card, border: `1px dashed ${T.border}`, borderRadius: 2 }}>
              <Typography sx={{ color: T.textDim, fontFamily: "'Courier New', monospace" }}>Nenhum contrato ativo.</Typography>
            </Paper>
          )}
          {contratosVisiveis.map(ctr => {
            const concluido = ctr.status === "concluido";
            const corStatus = concluido ? T.green : T.gold;
            return (
              <Paper
                key={ctr.id}
                sx={{
                  p: 3, bgcolor: T.card,
                  border: `1px solid ${concluido ? T.green + "66" : ctr.detalhes.operadorCor + "66"}`,
                  borderRadius: 2, position: "relative", overflow: "hidden"
                }}
              >
                <Box sx={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, bgcolor: concluido ? T.green : ctr.detalhes.operadorCor }} />

                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 2 }}>
                  <Box>
                    <Typography sx={{ color: ctr.detalhes.operadorCor, fontWeight: 900, fontSize: "0.9rem", letterSpacing: 1, textTransform: "uppercase", mb: 1 }}>
                      📡 Operador: {ctr.detalhes.operadorNome}
                    </Typography>
                    <Typography sx={{ color: "#fff", fontWeight: 900, fontSize: "1.4rem" }}>{ctr.detalhes.titulo}</Typography>
                    {isMaster && <Chip label={`Jogador: ${ctr.jogadorNome}`} size="small" sx={{ mt: 1, bgcolor: T.pink, color: "#fff", fontWeight: 900 }} />}
                  </Box>
                  <Chip
                    label={concluido ? "CONCLUÍDO" : "EM ANDAMENTO"}
                    size="small"
                    sx={{
                      bgcolor: `${corStatus}22`, color: corStatus,
                      fontWeight: 900, border: `1px solid ${corStatus}`
                    }}
                  />
                </Box>

                <Typography sx={{ color: T.text, fontSize: "0.9rem", mb: 2, whiteSpace: "pre-wrap", lineHeight: 1.6, fontFamily: "'Courier New', monospace" }}>
                  <strong style={{ color: T.neon }}>BRIEFING:</strong> {ctr.detalhes.descricaoCompleta || ctr.detalhes.sinopse}
                </Typography>

                {/* 🟢 SE CONCLUÍDO: mostra valor pago + motivo */}
                {concluido && (
                  <Paper sx={{ p: 1.5, mb: 2, bgcolor: `${T.green}10`, border: `1px solid ${T.green}44`, borderRadius: 1 }}>
                    <Typography sx={{ color: T.green, fontWeight: 900, fontSize: "0.85rem" }}>
                      ✅ Pago: 💰 {(ctr.valorPago || 0).toLocaleString("pt-BR")}
                      {ctr.valorOriginal !== ctr.valorPago && (
                        <span style={{ color: T.textDim, fontWeight: 400, fontSize: "0.75rem" }}>
                          {" "}(original: {(ctr.valorOriginal || 0).toLocaleString("pt-BR")})
                        </span>
                      )}
                    </Typography>
                    {ctr.motivoAjuste && (
                      <Typography sx={{ color: T.textDim, fontSize: "0.75rem", mt: 0.5, fontStyle: "italic" }}>
                        Motivo: {ctr.motivoAjuste}
                      </Typography>
                    )}
                  </Paper>
                )}

                <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", mt: 2, pt: 2, borderTop: `1px dashed ${T.border}` }}>
                  <Chip icon={<LocalAtmIcon />} label={`${(ctr.detalhes.valor || 0).toLocaleString("pt-BR")}`} size="small" sx={{ bgcolor: `${T.gold}15`, color: T.gold, fontWeight: 900, border: `1px solid ${T.gold}44` }} />
                  {ctr.detalhes.prazoDias > 0 ? (
                    <Chip icon={<AccessTimeIcon />} label={`Prazo: ${new Date(ctr.prazoFinal).toLocaleDateString()}`} size="small" sx={{ bgcolor: `${T.pink}15`, color: T.pink, fontWeight: 900, border: `1px solid ${T.pink}44` }} />
                  ) : (
                    <Chip icon={<AccessTimeIcon />} label="Sem prazo" size="small" sx={{ bgcolor: T.bg2, color: T.textDim, fontWeight: 900, border: `1px solid ${T.border}` }} />
                  )}
                  <Chip icon={<LocationOnIcon />} label={ctr.detalhes.cidadeNome || ctr.detalhes.paisNome} size="small" sx={{ bgcolor: T.bg2, color: T.textDim, border: `1px solid ${T.border}` }} />
                </Box>

                {/* 🟢 BOTÃO CONCLUIR (Mestre) */}
                {isMaster && !concluido && (
                  <Box sx={{ mt: 2, display: "flex", justifyContent: "flex-end", gap: 1 }}>
                    <Button
                      size="small"
                      variant="outlined"
                      color="success"
                      startIcon={<CheckCircleIcon />}
                      onClick={() => abrirConcluir(ctr)}
                      sx={{ fontWeight: 900, borderColor: T.green, color: T.green, "&:hover": { bgcolor: `${T.green}22` } }}
                    >
                      Concluir & Pagar
                    </Button>
                  </Box>
                )}
              </Paper>
            );
          })}
        </Box>
      )}

      {/* ABA 2: RANKING */}
      {aba === 2 && (() => {
        const reputacaoList = Object.values(reputacoes)
          .filter(r => r.nick)
          .sort((a, b) => b.xp - a.xp);
        const meuRank = reputacaoList.findIndex(r => r.email === userEmail) + 1;

        // 🟢 Ranking de operadores (por contratos concluídos)
        const xpPorOperador = {};
        contratosAtivos.forEach(ctr => {
          if (ctr.status !== "concluido") return;
          const opId = ctr.detalhes?.operadorId;
          if (!opId) return;
          const xpGanho = { mesmo: 10, bonus: 15, penalidade: 5, custom: 10 }[ctr.ajusteTipo] ?? 10;
          if (!xpPorOperador[opId]) {
            xpPorOperador[opId] = {
              operadorId: opId,
              xp: 0,
              contratos: 0,
              nome: ctr.detalhes?.operadorNome || "—",
              cor: ctr.detalhes?.operadorCor || T.neon,
            };
          }
          xpPorOperador[opId].xp += xpGanho;
          xpPorOperador[opId].contratos += 1;
        });
        const rankingOperadores = Object.values(xpPorOperador).sort((a, b) => b.xp - a.xp);

        const medalha = (pos) => pos === 1 ? "🥇" : pos === 2 ? "🥈" : pos === 3 ? "🥉" : `#${pos}`;

        return (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {/* RANKING DE JOGADORES */}
            <Box>
              <Typography variant="caption" sx={{ color: T.gold, fontWeight: 900, letterSpacing: 1.5, fontSize: "0.75rem", display: "block", mb: 1 }}>
                🏆 RANKING DE REPUTAÇÃO — CONTRATANTES
              </Typography>
              <Typography variant="caption" sx={{ color: T.textDim, fontSize: "0.65rem", display: "block", mb: 1.5, fontStyle: "italic" }}>
                {isMaster
                  ? "🔓 Modo Mestre: você vê o nick E o personagem real."
                  : "🎭 Anonimato ativo: você vê apenas os nicks."}
                {" "}XP: +10 (normal), +15 (bônus), +5 (penalidade).
              </Typography>

              {reputacaoList.length === 0 ? (
                <Paper sx={{ p: 4, textAlign: "center", bgcolor: T.card, border: `1px dashed ${T.border}`, borderRadius: 2 }}>
                  <Typography sx={{ color: T.textDim, fontFamily: "'Courier New', monospace" }}>
                    Ninguém no ranking ainda. Conclua contratos para aparecer aqui.
                  </Typography>
                </Paper>
              ) : (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  {reputacaoList.map((r, idx) => {
                    const pos = idx + 1;
                    const isMeu = r.email === userEmail;
                    const fichaNome = isMaster ? (fichasMap[r.email]?.nome || r.email) : null;
                    const corBorda = pos === 1 ? "#fbbf24" : pos === 2 ? "#c0c0c0" : pos === 3 ? "#cd7f32" : T.border;
                    return (
                      <Paper
                        key={r.email}
                        sx={{
                          p: 1.5, bgcolor: isMeu ? `${T.neon}11` : T.card,
                          border: `1px solid ${isMeu ? T.neon : corBorda}`,
                          borderRadius: 2,
                          display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap",
                          boxShadow: isMeu ? `0 0 12px ${T.neon}44` : pos <= 3 ? `0 0 8px ${corBorda}44` : "none",
                        }}
                      >
                        <Typography sx={{ fontSize: "1.3rem", minWidth: 40, textAlign: "center", fontWeight: 900, color: corBorda }}>
                          {medalha(pos)}
                        </Typography>
                        <Box sx={{ flex: 1, minWidth: 140 }}>
                          <Typography sx={{ color: "#fff", fontWeight: 900, fontSize: "0.95rem" }}>
                            {r.nick}
                            {isMeu && <Chip label="VOCÊ" size="small" sx={{ ml: 1, bgcolor: T.neon, color: "#000", fontWeight: 900, fontSize: "0.55rem", height: 16 }} />}
                          </Typography>
                          {isMaster && fichaNome && (
                            <Typography variant="caption" sx={{ color: T.textDim, fontSize: "0.65rem" }}>
                              🎭 Personagem: <strong style={{ color: T.pink }}>{fichaNome}</strong>
                            </Typography>
                          )}
                        </Box>
                        <Chip label={`${r.contratosConcluidos} contrato(s)`} size="small" sx={{ bgcolor: `${T.neon}22`, color: T.neon, fontWeight: 800, fontSize: "0.6rem" }} />
                        <Chip label={`⭐ ${r.xp} XP`} size="small" sx={{ bgcolor: `${T.gold}22`, color: T.gold, fontWeight: 900, fontSize: "0.65rem", border: `1px solid ${T.gold}66` }} />
                      </Paper>
                    );
                  })}
                </Box>
              )}

              {!isMaster && minhaReputacao?.nick && meuRank > 0 && (
                <Paper sx={{ p: 1.5, mt: 1.5, bgcolor: `${T.neon}15`, border: `1px solid ${T.neon}66`, borderRadius: 2 }}>
                  <Typography sx={{ color: T.neon, fontWeight: 900, fontSize: "0.8rem" }}>
                    🎯 Sua posição: #{meuRank} de {reputacaoList.length} · Nick: <strong>{minhaReputacao.nick}</strong> · ⭐ {minhaReputacao.xp} XP
                  </Typography>
                </Paper>
              )}
            </Box>

            {/* RANKING DE OPERADORES */}
            <Box>
              <Typography variant="caption" sx={{ color: T.pink, fontWeight: 900, letterSpacing: 1.5, fontSize: "0.75rem", display: "block", mb: 1 }}>
                📡 RANKING DE OPERADORES — MAIS CONFIÁVEIS
              </Typography>
              <Typography variant="caption" sx={{ color: T.textDim, fontSize: "0.65rem", display: "block", mb: 1.5, fontStyle: "italic" }}>
                Baseado em contratos concluídos com sucesso.
              </Typography>

              {rankingOperadores.length === 0 ? (
                <Paper sx={{ p: 4, textAlign: "center", bgcolor: T.card, border: `1px dashed ${T.border}`, borderRadius: 2 }}>
                  <Typography sx={{ color: T.textDim, fontFamily: "'Courier New', monospace" }}>
                    Nenhum operador com contratos concluídos ainda.
                  </Typography>
                </Paper>
              ) : (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  {rankingOperadores.map((op, idx) => {
                    const pos = idx + 1;
                    const opInfo = operadores.find(o => o.id === op.operadorId);
                    const cor = opInfo?.cor || op.cor || T.neon;
                    return (
                      <Paper
                        key={op.operadorId}
                        sx={{
                          p: 1.5, bgcolor: T.card,
                          border: `1px solid ${pos <= 3 ? cor : T.border}`,
                          borderLeft: `4px solid ${cor}`,
                          borderRadius: 2,
                          display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap",
                          boxShadow: pos <= 3 ? `0 0 8px ${cor}44` : "none",
                        }}
                      >
                        <Typography sx={{ fontSize: "1.3rem", minWidth: 40, textAlign: "center", fontWeight: 900, color: cor }}>
                          {medalha(pos)}
                        </Typography>
                        <Box sx={{ flex: 1, minWidth: 140 }}>
                          <Typography sx={{ color: cor, fontWeight: 900, fontSize: "0.95rem" }}>
                            📡 {op.nome}
                          </Typography>
                          {opInfo?.descricao && (
                            <Typography variant="caption" sx={{ color: T.textDim, fontSize: "0.6rem", display: "block" }}>
                              {opInfo.descricao.slice(0, 80)}
                            </Typography>
                          )}
                        </Box>
                        <Chip label={`${op.contratos} contrato(s)`} size="small" sx={{ bgcolor: `${cor}22`, color: cor, fontWeight: 800, fontSize: "0.6rem" }} />
                        <Chip label={`⭐ ${op.xp} XP`} size="small" sx={{ bgcolor: `${T.gold}22`, color: T.gold, fontWeight: 900, fontSize: "0.65rem", border: `1px solid ${T.gold}66` }} />
                      </Paper>
                    );
                  })}
                </Box>
              )}
            </Box>
          </Box>
        );
      })()}

      {/* ABA 3: GERENCIAR (MESTRE) */}
      {aba === 3 && isMaster && (
        <Box>
          <Box sx={{ display: "flex", gap: 2, mb: 4, flexWrap: "wrap" }}>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setFormServico({}); setModalServicoOpen(true); }} sx={{ bgcolor: T.neon, color: "#000", fontWeight: 900, boxShadow: `0 0 10px ${T.neon}44` }}>
              Novo Serviço
            </Button>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setFormOperador({}); setModalOperadorOpen(true); }} sx={{ bgcolor: T.pink, color: "#fff", fontWeight: 900, boxShadow: `0 0 10px ${T.pink}44` }}>
              Novo Operador
            </Button>
            <Button
              variant="contained"
              startIcon={<span>⚙️</span>}
              onClick={gerarOperadores}
              disabled={seedando}
              sx={{ bgcolor: '#a855f7', color: '#fff', fontWeight: 900, boxShadow: `0 0 10px #a855f744` }}
            >
              {seedando ? "Gerando..." : `Gerar Operadores (${cidades.length} cidades)`}
            </Button>
            <Button variant="contained" startIcon={<AutoAwesomeIcon />} onClick={gerarServicosComIA} sx={{ bgcolor: T.gold, color: "#000", fontWeight: 900, ml: "auto", boxShadow: `0 0 15px ${T.gold}66`, animation: "pulse 2s infinite" }}>
              Gerar com I.A. (Massa)
            </Button>
          </Box>

          <Typography variant="h5" sx={{ color: T.neon, mb: 2, borderBottom: `1px solid ${T.neonDark}`, pb: 1, display: "inline-block" }}>
            Serviços Cadastrados
          </Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, mb: 4 }}>
            {servicos.map(srv => (
              <Paper key={srv.id} sx={{ p: 2, bgcolor: T.card, display: "flex", justifyContent: "space-between", alignItems: "center", border: `1px solid ${T.border}`, "&:hover": { borderColor: T.neonDark } }}>
                <Box>
                  <Typography sx={{ color: "#fff", fontWeight: 900, fontSize: "1.1rem" }}>{srv.titulo}</Typography>
                  <Typography variant="caption" sx={{ color: T.textDim }}>📡 {srv.operadorNome} • 📍 {srv.cidadeNome || srv.paisNome}</Typography>
                </Box>
                <Box>
                  <Tooltip title="Editar"><IconButton onClick={() => { setFormServico(srv); setModalServicoOpen(true); }} sx={{ color: T.neon }}><EditIcon /></IconButton></Tooltip>
                  <Tooltip title="Excluir"><IconButton onClick={() => deletarServico(srv.id)} sx={{ color: T.pink }}><DeleteIcon /></IconButton></Tooltip>
                </Box>
              </Paper>
            ))}
          </Box>

          <Typography variant="h5" sx={{ color: T.pink, mt: 4, mb: 2, borderBottom: `1px solid ${T.pink}55`, pb: 1, display: "inline-block" }}>
            Operadores Cadastrados
          </Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            {operadores.map(op => (
              <Paper key={op.id} sx={{ p: 2, bgcolor: T.card, display: "flex", justifyContent: "space-between", alignItems: "center", borderLeft: `4px solid ${op.cor}`, borderTop: `1px solid ${T.border}`, borderRight: `1px solid ${T.border}`, borderBottom: `1px solid ${T.border}` }}>
                <Typography sx={{ color: op.cor, fontWeight: 900, fontSize: "1.1rem", textShadow: `0 0 5px ${op.cor}44` }}>📡 {op.nome}</Typography>
                <Box>
                  <Tooltip title="Editar"><IconButton onClick={() => { setFormOperador(op); setModalOperadorOpen(true); }} sx={{ color: T.neon }}><EditIcon /></IconButton></Tooltip>
                  <Tooltip title="Excluir"><IconButton onClick={() => deletarOperador(op.id)} sx={{ color: T.pink }}><DeleteIcon /></IconButton></Tooltip>
                </Box>
              </Paper>
            ))}
          </Box>
        </Box>
      )}

      {/* 🟢 MODAL ACEITAR SERVIÇO — maxWidth aumentado para md */}
      <Dialog
        open={modalAceitar}
        onClose={() => setModalAceitar(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: T.bg2,
            border: `2px solid ${T.neon}`,
            borderRadius: 2,
            boxShadow: `0 0 30px ${T.neon}44`,
          }
        }}
      >
        <DialogTitle sx={{ color: T.neon, borderBottom: `1px solid ${T.border}`, fontFamily: "'Courier New', monospace", fontWeight: 900 }}>
          📡 TRANSMISSÃO CRIPTOGRAFADA
        </DialogTitle>
        <DialogContent sx={{ pt: 3, minHeight: 360 }}>
          {servicoSelecionado && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 1 }}>
                <Typography sx={{ color: T.textDim, fontSize: "0.85rem" }}>
                  <strong>OPERADOR:</strong> <span style={{ color: servicoSelecionado.operadorCor }}>{servicoSelecionado.operadorNome}</span>
                </Typography>
                <Typography sx={{ color: T.textDim, fontSize: "0.85rem" }}>
                  <strong>LOCAL:</strong> {servicoSelecionado.cidadeNome || servicoSelecionado.paisNome || "Desconhecido"}
                </Typography>
              </Box>

              <Typography sx={{ color: "#fff", fontWeight: 900, fontSize: "1.5rem", fontFamily: "'Courier New', monospace" }}>
                {servicoSelecionado.titulo}
              </Typography>

              <Paper sx={{ p: 2, bgcolor: T.card, border: `1px dashed ${T.border}` }}>
                <Typography sx={{ color: T.text, fontSize: "0.9rem", whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
                  {servicoSelecionado.sinopse}
                </Typography>
              </Paper>

              <Box sx={{ p: 1.5, bgcolor: `${T.pink}15`, border: `1px solid ${T.pink}44`, borderRadius: 1 }}>
                <Typography sx={{ color: T.pink, fontSize: "0.8rem", textAlign: "center", fontWeight: 900 }}>
                  🔒 ALERTA: Os detalhes completos serão descriptografados após o aceite.
                </Typography>
              </Box>

              <Box sx={{ display: "flex", justifyContent: "space-between", mt: 1, alignItems: "center", flexWrap: "wrap", gap: 1 }}>
                <Typography sx={{ color: T.gold, fontWeight: 900, fontSize: "1.4rem", display: "flex", alignItems: "center", gap: 1 }}>
                  <LocalAtmIcon fontSize="large" /> {(servicoSelecionado.valor || 0).toLocaleString("pt-BR")}
                </Typography>
                <Typography sx={{ color: T.pink, fontWeight: 900, fontSize: "1rem", display: "flex", alignItems: "center", gap: 0.5 }}>
                  <AccessTimeIcon /> {servicoSelecionado.prazoDias > 0 ? `${servicoSelecionado.prazoDias} DIAS` : "SEM PRAZO"}
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ borderTop: `1px solid ${T.border}`, p: 2 }}>
          <Button onClick={() => setModalAceitar(false)} sx={{ color: T.textDim, fontWeight: 900 }}>RECUSAR</Button>
          <Button variant="contained" onClick={aceitarServico} sx={{ bgcolor: T.green, color: "#000", fontWeight: 900, "&:hover": { bgcolor: T.green, boxShadow: `0 0 15px ${T.green}` } }}>
            ACEITAR CONTRATO
          </Button>
        </DialogActions>
      </Dialog>

      {/* 🟢 NOVO MODAL: CONCLUIR & PAGAR */}
      <Dialog
        open={modalConcluirOpen}
        onClose={() => setModalConcluirOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: T.bg2,
            border: `2px solid ${T.green}`,
            borderRadius: 2,
            boxShadow: `0 0 30px ${T.green}44`,
          }
        }}
      >
        <DialogTitle sx={{ color: T.green, borderBottom: `1px solid ${T.border}`, fontFamily: "'Courier New', monospace", fontWeight: 900 }}>
          ✅ FINALIZAR & PAGAR CONTRATO
        </DialogTitle>
        <DialogContent sx={{ pt: 3, minHeight: 380 }}>
          {contratoSelecionado && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <Box>
                <Typography variant="caption" sx={{ color: T.textDim, textTransform: "uppercase", letterSpacing: 1 }}>
                  Contrato
                </Typography>
                <Typography sx={{ color: "#fff", fontWeight: 900, fontSize: "1.2rem" }}>
                  {contratoSelecionado.detalhes.titulo}
                </Typography>
                <Typography variant="caption" sx={{ color: T.textDim }}>
                  Jogador: <strong style={{ color: T.pink }}>{contratoSelecionado.jogadorNome}</strong>
                </Typography>
              </Box>

              <Divider sx={{ borderColor: T.border }} />

              <Box>
                <Typography variant="caption" sx={{ color: T.textDim, textTransform: "uppercase", letterSpacing: 1 }}>
                  Valor Original
                </Typography>
                <Typography sx={{ color: T.gold, fontWeight: 900, fontSize: "1.5rem", display: "flex", alignItems: "center", gap: 1 }}>
                  <LocalAtmIcon /> {(contratoSelecionado.detalhes.valor || 0).toLocaleString("pt-BR")}
                </Typography>
              </Box>

              {/* 🟢 Ajustes rápidos */}
              <Box>
                <Typography variant="caption" sx={{ color: T.textDim, textTransform: "uppercase", letterSpacing: 1, display: "block", mb: 1 }}>
                  Ajuste
                </Typography>
                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                  {[
                    { id: "mesmo", label: "Sem alteração", cor: T.neon },
                    { id: "bonus", label: "+25% Bônus", cor: T.green },
                    { id: "penalidade", label: "-25% Penalidade", cor: T.pink },
                    { id: "custom", label: "Personalizado", cor: T.gold },
                  ].map(opt => (
                    <Button
                      key={opt.id}
                      size="small"
                      variant={ajusteTipo === opt.id ? "contained" : "outlined"}
                      onClick={() => aplicarAjuste(opt.id)}
                      sx={{
                        fontWeight: 900,
                        borderColor: opt.cor,
                        color: ajusteTipo === opt.id ? "#000" : opt.cor,
                        bgcolor: ajusteTipo === opt.id ? opt.cor : "transparent",
                        "&:hover": { bgcolor: opt.cor, color: "#000" },
                      }}
                    >
                      {opt.label}
                    </Button>
                  ))}
                </Box>
              </Box>

              {/* 🟢 Valor final editável */}
              <TextField
                label="Valor Final a Pagar (💰)"
                type="number"
                fullWidth
                size="small"
                value={valorFinal}
                onChange={(e) => {
                  const v = Math.max(0, Number(e.target.value) || 0);
                  setValorFinal(v);
                  setAjusteTipo("custom");
                }}
                InputLabelProps={{ sx: { color: T.textDim } }}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><LocalAtmIcon sx={{ color: T.gold }} /></InputAdornment>,
                  sx: { color: T.gold, fontWeight: 900, fontSize: "1.2rem" }
                }}
              />

              {/* Motivo */}
              <TextField
                label="Motivo do Ajuste (opcional)"
                fullWidth
                size="small"
                multiline
                rows={2}
                placeholder="Ex: 'Excelente trabalho, bônus pela rapidez' ou 'Demorou muito, penalidade'"
                value={motivoAjuste}
                onChange={(e) => setMotivoAjuste(e.target.value)}
                InputLabelProps={{ sx: { color: T.textDim } }}
                InputProps={{ sx: { color: "#fff" } }}
              />

              {/* Preview */}
              <Paper sx={{ p: 1.5, bgcolor: `${T.green}10`, border: `1px solid ${T.green}44`, borderRadius: 1 }}>
                <Typography sx={{ color: T.green, fontWeight: 900, fontSize: "0.9rem" }}>
                  💰 Será creditado: <strong>{(valorFinal || 0).toLocaleString("pt-BR")}</strong> na carteira <strong>Bolso</strong> de {contratoSelecionado.jogadorNome}
                </Typography>
                {valorFinal !== (contratoSelecionado.detalhes.valor || 0) && (
                  <Typography sx={{ color: T.textDim, fontSize: "0.75rem", mt: 0.5 }}>
                    Ajuste: {valorFinal > (contratoSelecionado.detalhes.valor || 0) ? "+" : ""}
                    {(valorFinal - (contratoSelecionado.detalhes.valor || 0)).toLocaleString("pt-BR")}
                  </Typography>
                )}
              </Paper>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ borderTop: `1px solid ${T.border}`, p: 2 }}>
          <Button onClick={() => setModalConcluirOpen(false)} sx={{ color: T.textDim, fontWeight: 900 }}>
            CANCELAR
          </Button>
          <Button
            variant="contained"
            onClick={concluirEPagar}
            startIcon={<CheckCircleIcon />}
            sx={{ bgcolor: T.green, color: "#000", fontWeight: 900, "&:hover": { bgcolor: T.green, boxShadow: `0 0 15px ${T.green}` } }}
          >
            CONCLUIR & PAGAR
          </Button>
        </DialogActions>
      </Dialog>

      {/* MODAL GERENCIAR SERVIÇO */}
      <Dialog open={modalServicoOpen} onClose={() => setModalServicoOpen(false)} maxWidth="md" fullWidth PaperProps={{ sx: { bgcolor: T.bg2, border: `1px solid ${T.neonDark}`, minHeight: 520 } }}>
        <DialogTitle sx={{ color: T.neon, borderBottom: `1px solid ${T.border}`, fontWeight: 900 }}>⚙️ {formServico.id ? "EDITAR" : "NOVO"} SERVIÇO</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 3, pt: 3 }}>
          <TextField label="Título do Contrato" fullWidth size="small" value={formServico.titulo || ""} onChange={e => setFormServico({ ...formServico, titulo: e.target.value })} InputLabelProps={{ sx: { color: T.textDim } }} InputProps={{ sx: { color: T.neon, fontWeight: 900 } }} />

          <Grid container spacing={2}>
            <Grid size={{ xs: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel sx={{ color: T.textDim }}>Operador Responsável</InputLabel>
                <Select value={formServico.operadorId || ""} onChange={e => setFormServico({ ...formServico, operadorId: e.target.value })} label="Operador Responsável" sx={{ color: "#fff" }} MenuProps={{ PaperProps: { sx: { bgcolor: T.card } } }}>
                  {operadores.map(o => <MenuItem key={o.id} value={o.id}>{o.nome}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField label="Valor (💰)" type="number" fullWidth size="small" value={formServico.valor || 0} onChange={e => setFormServico({ ...formServico, valor: e.target.value })} InputLabelProps={{ sx: { color: T.textDim } }} InputProps={{ sx: { color: T.gold, fontWeight: 900 } }} />
            </Grid>
          </Grid>

          <Grid container spacing={2}>
            <Grid size={{ xs: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel sx={{ color: T.textDim }}>País (Filtro)</InputLabel>
                <Select value={formServico.paisId || ""} onChange={e => setFormServico({ ...formServico, paisId: e.target.value })} label="País (Filtro)" sx={{ color: "#fff" }} MenuProps={{ PaperProps: { sx: { bgcolor: T.card } } }}>
                  <MenuItem value="">Nenhum</MenuItem>
                  {paises.map(p => <MenuItem key={p.id} value={p.id}>{p.nome}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel sx={{ color: T.textDim }}>Cidade (Local)</InputLabel>
                <Select value={formServico.cidadeId || ""} onChange={e => setFormServico({ ...formServico, cidadeId: e.target.value })} label="Cidade (Local)" sx={{ color: "#fff" }} MenuProps={{ PaperProps: { sx: { bgcolor: T.card } } }}>
                  <MenuItem value="">Nenhum</MenuItem>
                  {cidades.filter(c => !formServico.paisId || c.paisId === formServico.paisId).map(c => <MenuItem key={c.id} value={c.id}>{c.nome}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          <TextField label="Prazo em Dias (0 = Sem prazo)" type="number" fullWidth size="small" value={formServico.prazoDias || 0} onChange={e => setFormServico({ ...formServico, prazoDias: e.target.value })} InputLabelProps={{ sx: { color: T.textDim } }} InputProps={{ sx: { color: T.pink, fontWeight: 900 } }} />

          <TextField label="Sinopse (Curta e Chamativa)" multiline rows={2} fullWidth size="small" value={formServico.sinopse || ""} onChange={e => setFormServico({ ...formServico, sinopse: e.target.value })} InputLabelProps={{ sx: { color: T.textDim } }} InputProps={{ sx: { color: "#fff" } }} />
          <TextField label="Descrição Completa (O Briefing Real)" multiline rows={5} fullWidth size="small" value={formServico.descricaoCompleta || ""} onChange={e => setFormServico({ ...formServico, descricaoCompleta: e.target.value })} InputLabelProps={{ sx: { color: T.textDim } }} InputProps={{ sx: { color: "#fff" } }} />
        </DialogContent>
        <DialogActions sx={{ borderTop: `1px solid ${T.border}`, p: 2 }}>
          <Button onClick={() => setModalServicoOpen(false)} sx={{ color: T.textDim, fontWeight: 900 }}>CANCELAR</Button>
          <Button variant="contained" onClick={salvarServico} sx={{ bgcolor: T.green, color: "#000", fontWeight: 900, "&:hover": { bgcolor: T.green, boxShadow: `0 0 15px ${T.green}` } }}>SALVAR SERVIÇO</Button>
        </DialogActions>
      </Dialog>

      {/* 🟢 MODAL NICK (OBRIGATÓRIO ANTES DE ACEITAR CONTRATOS) */}
      <Dialog
        open={modalNickOpen}
        onClose={() => {}}
        maxWidth="xs"
        fullWidth
        disableEscapeKeyDown
        PaperProps={{
          sx: {
            bgcolor: T.bg2,
            border: `2px solid ${T.neon}`,
            borderRadius: 2,
            boxShadow: `0 0 40px ${T.neon}66`,
          }
        }}
      >
        <DialogTitle sx={{ color: T.neon, borderBottom: `1px solid ${T.border}`, fontFamily: "'Courier New', monospace", fontWeight: 900 }}>
          🎭 ESCOLHA SEU NICK
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Typography sx={{ color: T.text, fontSize: "0.85rem", lineHeight: 1.6 }}>
              Para manter o <strong style={{ color: T.neon }}>anonimato no ranking</strong>, você precisa escolher um nick.
              Os outros jogadores verão <strong>apenas seu nick</strong>. Apenas o Mestre vê qual personagem está por trás.
            </Typography>

            <TextField
              label="Seu Nick de Ranking"
              fullWidth
              size="small"
              value={nickTemp}
              onChange={(e) => setNickTemp(e.target.value.slice(0, 20))}
              placeholder="Ex: Fantasma, Corvo, Lâmina..."
              helperText={`${nickTemp.length}/20 caracteres (mínimo 3)`}
              InputLabelProps={{ sx: { color: T.textDim } }}
              InputProps={{ sx: { color: T.neon, fontWeight: 900, fontSize: "1rem", letterSpacing: 1 } }}
              sx={{
                "& .MuiOutlinedInput-notchedOutline": { borderColor: T.neonDark },
                "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: T.neon },
                "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: T.neon, borderWidth: 2 },
              }}
            />

            <Paper sx={{ p: 1.5, bgcolor: `${T.gold}11`, border: `1px dashed ${T.gold}66`, borderRadius: 1 }}>
              <Typography variant="caption" sx={{ color: T.gold, fontSize: "0.65rem", display: "block", lineHeight: 1.6 }}>
                💡 O nick é <strong>permanente</strong>. Escolha com cuidado.
              </Typography>
            </Paper>

            <Paper sx={{ p: 1.5, bgcolor: `${T.neon}11`, border: `1px dashed ${T.neon}66`, borderRadius: 1 }}>
              <Typography variant="caption" sx={{ color: T.neon, fontSize: "0.65rem", display: "block", lineHeight: 1.6 }}>
                🏆 Cada contrato concluído rende XP de reputação. Maior XP = mais confiável.
              </Typography>
            </Paper>
          </Box>
        </DialogContent>
        <DialogActions sx={{ borderTop: `1px solid ${T.border}`, p: 2 }}>
          <Button
            variant="contained"
            fullWidth
            onClick={salvarNick}
            disabled={salvandoNick || nickTemp.trim().length < 3}
            sx={{
              bgcolor: T.neon, color: "#000", fontWeight: 900,
              "&:hover": { bgcolor: T.neon, boxShadow: `0 0 15px ${T.neon}` },
              "&.Mui-disabled": { bgcolor: "#334155", color: "#64748b" }
            }}
          >
            {salvandoNick ? "Salvando..." : "✅ Confirmar Nick"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* MODAL GERENCIAR OPERADOR */}
      <Dialog open={modalOperadorOpen} onClose={() => setModalOperadorOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { bgcolor: T.bg2, border: `1px solid ${T.pink}`, minHeight: 360 } }}>
        <DialogTitle sx={{ color: T.pink, borderBottom: `1px solid ${T.border}`, fontWeight: 900 }}>⚙️ {formOperador.id ? "EDITAR" : "NOVO"} OPERADOR</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 3, pt: 3 }}>
          <TextField label="Nome do Operador" fullWidth size="small" value={formOperador.nome || ""} onChange={e => setFormOperador({ ...formOperador, nome: e.target.value })} InputLabelProps={{ sx: { color: T.textDim } }} InputProps={{ sx: { color: T.pink, fontWeight: 900 } }} />
          <TextField label="Descrição / Facção" fullWidth size="small" value={formOperador.descricao || ""} onChange={e => setFormOperador({ ...formOperador, descricao: e.target.value })} InputLabelProps={{ sx: { color: T.textDim } }} InputProps={{ sx: { color: "#fff" } }} />

          <Box>
            <Typography variant="caption" sx={{ color: T.textDim, fontWeight: 900, mb: 1, display: "block" }}>COR DE DESTAQUE (NEON)</Typography>
            <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
              {CORES_OPERADOR.map(cor => (
                <Box
                  key={cor}
                  onClick={() => setFormOperador({ ...formOperador, cor })}
                  sx={{
                    width: 36, height: 36, borderRadius: "50%", bgcolor: cor, cursor: "pointer",
                    border: formOperador.cor === cor ? "3px solid #fff" : "3px solid transparent",
                    boxShadow: formOperador.cor === cor ? `0 0 15px ${cor}` : "none",
                    transition: "0.2s"
                  }}
                />
              ))}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ borderTop: `1px solid ${T.border}`, p: 2 }}>
          <Button onClick={() => setModalOperadorOpen(false)} sx={{ color: T.textDim, fontWeight: 900 }}>CANCELAR</Button>
          <Button variant="contained" onClick={salvarOperador} sx={{ bgcolor: T.pink, color: "#fff", fontWeight: 900, "&:hover": { bgcolor: T.pink, boxShadow: `0 0 15px ${T.pink}` } }}>SALVAR OPERADOR</Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
}
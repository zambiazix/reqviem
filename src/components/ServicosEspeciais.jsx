import React, { useState, useEffect, useMemo } from "react";
import {
  Box, Paper, Typography, Button, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, FormControl, InputLabel,
  Select, MenuItem, Chip, Tabs, Tab, InputAdornment, Tooltip,
  Grid, Divider, Checkbox, FormControlLabel
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
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import { db } from "../firebaseConfig";
import {
  collection, doc, onSnapshot, setDoc, deleteDoc, getDoc, updateDoc, getDocs, writeBatch
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
  
  // 🟢 CONTROLE DE NAVEGAÇÃO INTERNA (SUBSTITUI OS MODAIS EMPILHADOS)
  const [viewMode, setViewMode] = useState("list"); // "list" | "detail" | "form"
  const [servicoSelecionado, setServicoSelecionado] = useState(null);

  const [servicos, setServicos] = useState([]);
  const [operadores, setOperadores] = useState([]);
  const [contratosAtivos, setContratosAtivos] = useState([]);
  const [paises, setPaises] = useState([]);
  const [cidades, setCidades] = useState([]);
  const [todosItensLoja, setTodosItensLoja] = useState([]); // 🟢 ITENS DO COMÉRCIO

  const [busca, setBusca] = useState("");
  const [filtroOperador, setFiltroOperador] = useState("");

  const [modalOperadorOpen, setModalOperadorOpen] = useState(false);

  // 🟢 ESTADOS: Concluir + Pagar contrato
  const [modalConcluirOpen, setModalConcluirOpen] = useState(false);
  const [contratoSelecionado, setContratoSelecionado] = useState(null);
  const [valorFinal, setValorFinal] = useState(0);
  const [motivoAjuste, setMotivoAjuste] = useState("");
  const [ajusteTipo, setAjusteTipo] = useState("mesmo");

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
  
  // 🟢 RECOMPENSAS E MASSA
  const [itemBusca, setItemBusca] = useState("");
  
  // 🟢 NOVOS CAMPOS ADICIONADOS NA CONFIGURAÇÃO DE MASSA
  const [configMassa, setConfigMassa] = useState({ 
    gerarDinheiro: true, 
    gerarItens: false, 
    incluirLojasOcultas: false, 
    qtdMaxItens: 2,
    escopo: "global", // 🟢 NOVO: "global" | "pais" | "cidades"
    paisAlvoId: "",   // 🟢 NOVO
    cidadesAlvoIds: [] // 🟢 NOVO
  });

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

    // 🟢 CARREGAR ITENS DO COMÉRCIO PARA AS RECOMPENSAS
    const carregarItensCommerce = async () => {
      try {
        const itensArr = [];
        const paisesSnap = await getDocs(collection(db, "comercio_paises"));
        for (const p of paisesSnap.docs) {
          const cidadesSnap = await getDocs(collection(db, "comercio_paises", p.id, "cidades"));
          for (const c of cidadesSnap.docs) {
            const lojasSnap = await getDocs(collection(db, "comercio_paises", p.id, "cidades", c.id, "lojas"));
            for (const l of lojasSnap.docs) {
              const lojaData = l.data();
              const itensSnap = await getDocs(collection(db, "comercio_paises", p.id, "cidades", c.id, "lojas", l.id, "itens"));
              for (const it of itensSnap.docs) {
                itensArr.push({
                  ...it.data(),
                  id: it.id,
                  lojaNome: lojaData.nome,
                  lojaOculta: lojaData.oculta || false
                });
              }
            }
          }
        }
        setTodosItensLoja(itensArr);
      } catch (err) {
        console.warn("Erro ao carregar itens do comércio:", err);
      }
    };
    carregarItensCommerce();

    return () => {
      unsubServicos(); unsubOperadores(); unsubContratos(); unsubPaises(); unsubCidades(); unsubRep();
    };
  }, []);

  // 🟢 SINCRONIZA MINHA REPUTAÇÃO
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

  // 🟢 RESETS
  const resetarContratos = async () => {
    if (!window.confirm("⚠️ ATENÇÃO: Isso apagará TODOS os contratos ativos e concluídos. Continuar?")) return;
    try {
      const snap = await getDocs(collection(db, "comercio_contratos_ativos"));
      const batch = writeBatch(db);
      snap.forEach(d => batch.delete(d.ref));
      await batch.commit();
      alert("✅ Todos os contratos foram resetados.");
    } catch(e) { alert("Erro: " + e.message); }
  };

  const resetarOperadores = async () => {
    if (!window.confirm("⚠️ ATENÇÃO: Isso apagará TODOS os operadores cadastrados. Continuar?")) return;
    try {
      const snap = await getDocs(collection(db, "comercio_operadores"));
      const batch = writeBatch(db);
      snap.forEach(d => batch.delete(d.ref));
      await batch.commit();
      alert("✅ Todos os operadores foram resetados.");
    } catch(e) { alert("Erro: " + e.message); }
  };

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
      setViewMode("list");
      setServicoSelecionado(null);
    } catch (err) {
      console.error(err);
      alert("Erro ao aceitar contrato.");
    }
  };

  const abrirConcluir = (contrato) => {
    setContratoSelecionado(contrato);
    setValorFinal(contrato.detalhes.valor || 0);
    setAjusteTipo("mesmo");
    setMotivoAjuste("");
    setModalConcluirOpen(true);
  };

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

  // 🟢 CONCLUIR E PAGAR — credita dinheiro E itens na ficha
  const concluirEPagar = async () => {
    if (!contratoSelecionado) return;

    if (valorFinal < 0) {
      return alert("⚠️ O valor não pode ser negativo.");
    }

    if (!window.confirm(
      `Confirmar a entrega de recompensas para ${contratoSelecionado.jogadorNome}?\n\n` +
      `Valor: 💰 ${valorFinal.toLocaleString("pt-BR")}\n` +
      `Itens: ${(contratoSelecionado.detalhes.itensRecompensa || []).length}`
    )) return;

    try {
      const playerFichaRef = doc(db, "fichas", contratoSelecionado.jogadorEmail);
      const playerSnap = await getDoc(playerFichaRef);

      if (!playerSnap.exists()) {
        return alert("❌ Ficha do jogador não encontrada! O contrato NÃO foi concluído.");
      }

      const fichaData = playerSnap.data();
      let novasCarteiras = Array.isArray(fichaData.carteiras) ? [...fichaData.carteiras] : [];
      let categoriaDiversos = Array.isArray(fichaData.diversos) ? [...fichaData.diversos] : [];

      // 1. Dinheiro
      if (valorFinal > 0) {
        const bolsoIdx = novasCarteiras.findIndex(c => c.nome === "Bolso");
        if (bolsoIdx >= 0) {
          novasCarteiras[bolsoIdx] = { ...novasCarteiras[bolsoIdx], valor: (novasCarteiras[bolsoIdx].valor || 0) + valorFinal };
        } else {
          novasCarteiras.push({ nome: "Bolso", valor: valorFinal });
        }
      }

      // 2. Itens
      const itensRecompensa = contratoSelecionado.detalhes.itensRecompensa || [];
      itensRecompensa.forEach(item => {
        const idx = categoriaDiversos.findIndex(i => i.nome === item.nome);
        if (idx >= 0) {
          categoriaDiversos[idx] = { ...categoriaDiversos[idx], quantidade: (categoriaDiversos[idx].quantidade || 1) + item.quantidade };
        } else {
          categoriaDiversos.push({
            nome: item.nome,
            quantidade: item.quantidade,
            durabilidade: item.durabilidade || 100,
            dado: item.dado || 1,
            imagem: item.imagem || "",
            tipoDano: item.tipoDano || "Nenhum",
            consumivel: item.consumivel || "Nenhum",
            insumivel: item.insumivel || "Nenhum",
            travado: true,
            origem: "contrato"
          });
        }
      });

      await updateDoc(playerFichaRef, { carteiras: novasCarteiras, diversos: categoriaDiversos });

      await setDoc(doc(db, "comercio_contratos_ativos", contratoSelecionado.id), {
        status: "concluido",
        valorPago: valorFinal,
        valorOriginal: contratoSelecionado.detalhes.valor || 0,
        motivoAjuste: motivoAjuste || "",
        ajusteTipo,
        concluidoEm: new Date().toISOString(),
        concluidoPor: userEmail || "mestre",
      }, { merge: true });

      const xpMap = { mesmo: 10, bonus: 15, penalidade: 5, custom: 10 };
      const xpGanho = xpMap[ajusteTipo] ?? 10;
      await adicionarXPReputacao(contratoSelecionado.jogadorEmail, xpGanho, 1);

      alert(
        `✅ Contrato concluído!\n\n` +
        `💰 Pago: ${valorFinal.toLocaleString("pt-BR")}\n` +
        `📦 Itens entregues: ${itensRecompensa.length}\n` +
        `👤 Para: ${contratoSelecionado.jogadorNome}\n`
      );

      setModalConcluirOpen(false);
      setContratoSelecionado(null);
      setViewMode("list");
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
      itensRecompensa: formServico.itensRecompensa || []
    };

    await setDoc(doc(db, "comercio_servicos", id), payload, { merge: true });
    setViewMode("list");
  };

  const deletarServico = async (id) => {
    if (!window.confirm("Apagar este serviço permanentemente?")) return;
    await deleteDoc(doc(db, "comercio_servicos", id));
  };

  const deletarOperador = async (id) => {
    if (!window.confirm("Apagar este operador?")) return;
    await deleteDoc(doc(db, "comercio_operadores", id));
  };

  const gerarServicosComIA = async () => {
    if (!isMaster) return;
    if (operadores.length === 0) return alert("⚠️ Cadastre pelo menos 1 Operador antes de gerar com I.A.");
    if (cidades.length === 0) return alert("⚠️ Inicialize o Simulador do Mundo primeiro (para ter cidades).");

    // 🟢 FILTRO DE ESCOPO (GLOBAL, PAÍS OU CIDADES ESPECÍFICAS)
    let cidadesBase = [...cidades];

    if (configMassa.escopo === "pais" && configMassa.paisAlvoId) {
      cidadesBase = cidadesBase.filter(c => c.paisId === configMassa.paisAlvoId);
    } else if (configMassa.escopo === "cidades" && configMassa.cidadesAlvoIds.length > 0) {
      cidadesBase = cidadesBase.filter(c => configMassa.cidadesAlvoIds.includes(c.id));
    }

    if (cidadesBase.length === 0) {
      return alert("⚠️ Nenhuma cidade encontrada para o escopo selecionado.");
    }

    const qtdParaGerar = Math.min(cidadesBase.length, 30);
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

    // 🟢 USA A LISTA FILTRADA (cidadesBase) EM VEZ DA LISTA GLOBAL
    const cidadesParaIA = cidadesBase.sort(() => 0.5 - Math.random()).slice(0, qtdParaGerar);
    const itensDisponiveis = todosItensLoja.filter(i => configMassa.incluirLojasOcultas || !i.lojaOculta);

    for (let i = 0; i < cidadesParaIA.length; i++) {
      const cidade = cidadesParaIA[i];
      const op = operadores[Math.floor(Math.random() * operadores.length)];
      const pais = paises.find(p => p.id === cidade.paisId) || { nome: "Desconhecido", id: "" };

      const p = prefixos[Math.floor(Math.random() * prefixos.length)];
      const t = titulosBase[Math.floor(Math.random() * titulosBase.length)];
      const titulo = `${p} ${t}`;
      const sinopse = sinopsesBase[Math.floor(Math.random() * sinopsesBase.length)];
      const descricaoCompleta = descricoesBase[Math.floor(Math.random() * descricoesBase.length)];

      let valorDinheiro = configMassa.gerarDinheiro ? Math.floor(Math.random() * 45 + 5) * 500 : 0;
      let itensSorteados = [];
      if (configMassa.gerarItens && itensDisponiveis.length > 0) {
        const qtdItens = Math.floor(Math.random() * configMassa.qtdMaxItens) + 1;
        for (let k = 0; k < qtdItens; k++) {
          const it = itensDisponiveis[Math.floor(Math.random() * itensDisponiveis.length)];
          itensSorteados.push({ ...it, quantidade: Math.floor(Math.random() * 3) + 1 });
        }
      }

      const prazoDias = Math.floor(Math.random() * 7) + 1;
      const id = `srv_ai_${Date.now()}_${i}`;

      const payload = {
        id, titulo, sinopse, descricaoCompleta, valor: valorDinheiro, prazoDias,
        paisId: pais.id, paisNome: pais.nome,
        cidadeId: cidade.id, cidadeNome: cidade.nome,
        operadorId: op.id, operadorNome: op.nome, operadorCor: op.cor || T.neon,
        itensRecompensa: itensSorteados
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

  // ================= RENDERIZAÇÃO =================

  // 🟢 TELA DE DETALHES DO SERVIÇO
  if (viewMode === "detail" && servicoSelecionado) {
    return (
      <Box sx={{ p: 2, bgcolor: T.bg, height: "100%", overflowY: "auto", fontFamily: "'Courier New', monospace" }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => { setViewMode("list"); setServicoSelecionado(null); }} sx={{ color: T.neon, fontWeight: 900, mb: 2 }}>
          VOLTAR AO CATÁLOGO
        </Button>

        <Paper sx={{ p: 3, bgcolor: T.bg2, border: `2px solid ${T.neon}`, borderRadius: 2, boxShadow: `0 0 20px ${T.neon}22` }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 1, mb: 2 }}>
            <Typography sx={{ color: T.textDim, fontSize: "0.85rem" }}>
              <strong>OPERADOR:</strong> <span style={{ color: servicoSelecionado.operadorCor }}>{servicoSelecionado.operadorNome}</span>
            </Typography>
            <Typography sx={{ color: T.textDim, fontSize: "0.85rem" }}>
              <strong>LOCAL:</strong> {servicoSelecionado.cidadeNome || servicoSelecionado.paisNome || "Desconhecido"}
            </Typography>
          </Box>

          <Typography sx={{ color: "#fff", fontWeight: 900, fontSize: "1.8rem", fontFamily: "'Courier New', monospace", mb: 2 }}>
            {servicoSelecionado.titulo}
          </Typography>

          <Paper sx={{ p: 2, bgcolor: T.card, border: `1px dashed ${T.border}`, mb: 3 }}>
            <Typography sx={{ color: T.text, fontSize: "0.95rem", whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
              {servicoSelecionado.sinopse}
            </Typography>
          </Paper>

          <Box sx={{ p: 1.5, bgcolor: `${T.pink}15`, border: `1px solid ${T.pink}44`, borderRadius: 1, mb: 3 }}>
            <Typography sx={{ color: T.pink, fontSize: "0.8rem", textAlign: "center", fontWeight: 900 }}>
              🔒 ALERTA: Os detalhes completos serão descriptografados após o aceite.
            </Typography>
          </Box>

          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 2, mb: 3 }}>
            <Box>
              <Typography variant="caption" sx={{ color: T.textDim, textTransform: "uppercase", letterSpacing: 1 }}>Pagamento Base</Typography>
              <Typography sx={{ color: T.gold, fontWeight: 900, fontSize: "1.5rem", display: "flex", alignItems: "center", gap: 1 }}>
                <LocalAtmIcon /> {(servicoSelecionado.valor || 0).toLocaleString("pt-BR")}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: T.textDim, textTransform: "uppercase", letterSpacing: 1 }}>Prazo</Typography>
              <Typography sx={{ color: T.pink, fontWeight: 900, fontSize: "1.2rem", display: "flex", alignItems: "center", gap: 1 }}>
                <AccessTimeIcon /> {servicoSelecionado.prazoDias > 0 ? `${servicoSelecionado.prazoDias} DIAS` : "SEM PRAZO"}
              </Typography>
            </Box>
          </Box>

          {(servicoSelecionado.itensRecompensa || []).length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="caption" sx={{ color: T.textDim, textTransform: "uppercase", letterSpacing: 1 }}>Itens Inclusos</Typography>
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 1 }}>
                {servicoSelecionado.itensRecompensa.map((it, i) => (
                  <Chip key={i} label={`${it.quantidade}x ${it.nome}`} sx={{ bgcolor: T.card, color: T.neon, border: `1px solid ${T.neonDark}` }} />
                ))}
              </Box>
            </Box>
          )}

          <Button variant="contained" fullWidth onClick={aceitarServico} sx={{ bgcolor: T.green, color: "#000", fontWeight: 900, py: 1.5, fontSize: "1rem" }}>
            ACEITAR CONTRATO
          </Button>
        </Paper>
      </Box>
    );
  }

  // 🟢 TELA DE CRIAÇÃO/EDIÇÃO
  if (viewMode === "form") {
    const itensFiltrados = itemBusca ? todosItensLoja.filter(i => normalizarTexto(i.nome).includes(normalizarTexto(itemBusca))) : [];
    return (
      <Box sx={{ p: 2, bgcolor: T.bg, height: "100%", overflowY: "auto", fontFamily: "'Courier New', monospace" }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => setViewMode("list")} sx={{ color: T.neon, fontWeight: 900, mb: 2 }}>
          CANCELAR E VOLTAR
        </Button>

        <Paper sx={{ p: 3, bgcolor: T.bg2, border: `2px solid ${T.neon}`, borderRadius: 2 }}>
          <Typography variant="h5" sx={{ color: T.neon, borderBottom: `1px solid ${T.border}`, fontWeight: 900, pb: 2, mb: 3 }}>
            ⚙️ {formServico.id ? "EDITAR" : "NOVO"} SERVIÇO
          </Typography>

          {/* SEÇÃO 1: INFORMAÇÕES BÁSICAS */}
          <Typography sx={{ color: T.neonDark, fontWeight: 900, fontSize: "0.8rem", mb: 1, letterSpacing: 1 }}>INFORMAÇÕES BÁSICAS</Typography>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12}>
              <TextField label="Título do Contrato" fullWidth size="small" value={formServico.titulo || ""} onChange={e => setFormServico({ ...formServico, titulo: e.target.value })} InputLabelProps={{ sx: { color: T.textDim } }} InputProps={{ sx: { color: T.neon, fontWeight: 900 } }} />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth size="small">
                <InputLabel sx={{ color: T.textDim }}>Operador Responsável</InputLabel>
                <Select value={formServico.operadorId || ""} onChange={e => setFormServico({ ...formServico, operadorId: e.target.value })} label="Operador Responsável" sx={{ color: "#fff" }} MenuProps={{ PaperProps: { sx: { bgcolor: T.card } } }}>
                  {operadores.map(o => <MenuItem key={o.id} value={o.id}>{o.nome}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth size="small">
                <InputLabel sx={{ color: T.textDim }}>País (Filtro)</InputLabel>
                <Select value={formServico.paisId || ""} onChange={e => setFormServico({ ...formServico, paisId: e.target.value, cidadeId: "" })} label="País (Filtro)" sx={{ color: "#fff" }} MenuProps={{ PaperProps: { sx: { bgcolor: T.card } } }}>
                  <MenuItem value="">Nenhum</MenuItem>
                  {paises.map(p => <MenuItem key={p.id} value={p.id}>{p.nome}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth size="small">
                <InputLabel sx={{ color: T.textDim }}>Cidade (Local)</InputLabel>
                <Select value={formServico.cidadeId || ""} onChange={e => setFormServico({ ...formServico, cidadeId: e.target.value })} label="Cidade (Local)" sx={{ color: "#fff" }} MenuProps={{ PaperProps: { sx: { bgcolor: T.card } } }}>
                  <MenuItem value="">Nenhum</MenuItem>
                  {cidades.filter(c => !formServico.paisId || c.paisId === formServico.paisId).map(c => <MenuItem key={c.id} value={c.id}>{c.nome}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField label="Prazo em Dias (0 = Sem prazo)" type="number" fullWidth size="small" value={formServico.prazoDias || 0} onChange={e => setFormServico({ ...formServico, prazoDias: e.target.value })} InputLabelProps={{ sx: { color: T.textDim } }} InputProps={{ sx: { color: T.pink, fontWeight: 900 } }} />
            </Grid>
          </Grid>

          <Divider sx={{ my: 3, borderColor: T.border }} />

          {/* SEÇÃO 2: RECOMPENSAS */}
          <Typography sx={{ color: T.gold, fontWeight: 900, fontSize: "0.8rem", mb: 1, letterSpacing: 1 }}>RECOMPENSAS (DINHEIRO E ITENS)</Typography>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} md={4}>
              <TextField label="Valor em Dinheiro (0 para nenhum)" type="number" fullWidth size="small" value={formServico.valor || 0} onChange={e => setFormServico({ ...formServico, valor: e.target.value })} InputLabelProps={{ sx: { color: T.textDim } }} InputProps={{ sx: { color: T.gold, fontWeight: 900 } }} />
            </Grid>
            <Grid item xs={12} md={8}>
              <TextField label="🔍 Pesquisar item do comércio..." fullWidth size="small" value={itemBusca} onChange={e => setItemBusca(e.target.value)} InputLabelProps={{ sx: { color: T.textDim } }} InputProps={{ sx: { color: "#fff" }, startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: T.neon }}/></InputAdornment> }} />
            </Grid>
          </Grid>

          {itemBusca && (
            <Paper sx={{ maxHeight: 150, overflowY: "auto", bgcolor: T.card, border: `1px solid ${T.border}`, mb: 2 }}>
              {itensFiltrados.map(it => (
                <Box key={it.id} onClick={() => {
                  const atual = formServico.itensRecompensa || [];
                  setFormServico({ ...formServico, itensRecompensa: [...atual, { ...it, quantidade: 1 }] });
                  setItemBusca("");
                }} sx={{ p: 1.5, display: "flex", justifyContent: "space-between", "&:hover": { bgcolor: T.border }, cursor: "pointer" }}>
                  <Typography sx={{ color: "#fff" }}>{it.nome} <span style={{ color: T.textDim, fontSize: "0.8rem" }}>({it.lojaNome})</span></Typography>
                  <Typography sx={{ color: T.neon }}>+ Adicionar</Typography>
                </Box>
              ))}
              {itensFiltrados.length === 0 && <Typography sx={{ p: 2, color: T.textDim }}>Nenhum item encontrado.</Typography>}
            </Paper>
          )}

          {(formServico.itensRecompensa || []).map((it, idx) => (
            <Box key={idx} sx={{ display: "flex", gap: 1, alignItems: "center", mb: 1, p: 1, bgcolor: T.card, border: `1px solid ${T.border}`, borderRadius: 1 }}>
              <Typography sx={{ flex: 1, color: "#fff" }}>{it.nome}</Typography>
              <TextField size="small" type="number" label="Qtd" value={it.quantidade} onChange={e => {
                const arr = [...formServico.itensRecompensa];
                arr[idx].quantidade = Math.max(1, Number(e.target.value));
                setFormServico({ ...formServico, itensRecompensa: arr });
              }} InputLabelProps={{ sx: { color: T.textDim } }} InputProps={{ sx: { color: T.neon } }} sx={{ width: 80 }} />
              <IconButton onClick={() => setFormServico({ ...formServico, itensRecompensa: formServico.itensRecompensa.filter((_, i) => i !== idx) })} sx={{ color: T.pink }}>
                <DeleteIcon />
              </IconButton>
            </Box>
          ))}

          <Divider sx={{ my: 3, borderColor: T.border }} />

          {/* SEÇÃO 3: DETALHES */}
          <Typography sx={{ color: T.neon, fontWeight: 900, fontSize: "0.8rem", mb: 1, letterSpacing: 1 }}>DETALHES DO CONTRATO</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField label="Sinopse (Curta e Chamativa)" multiline rows={2} fullWidth size="small" value={formServico.sinopse || ""} onChange={e => setFormServico({ ...formServico, sinopse: e.target.value })} InputLabelProps={{ sx: { color: T.textDim } }} InputProps={{ sx: { color: "#fff" } }} />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Descrição Completa (O Briefing Real)" multiline rows={4} fullWidth size="small" value={formServico.descricaoCompleta || ""} onChange={e => setFormServico({ ...formServico, descricaoCompleta: e.target.value })} InputLabelProps={{ sx: { color: T.textDim } }} InputProps={{ sx: { color: "#fff" } }} />
            </Grid>
          </Grid>

          <Button variant="contained" onClick={salvarServico} sx={{ mt: 4, bgcolor: T.green, color: "#000", fontWeight: 900, "&:hover": { bgcolor: T.green, boxShadow: `0 0 15px ${T.green}` } }}>
            SALVAR SERVIÇO
          </Button>
        </Paper>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        p: 2,
        bgcolor: T.bg,
        fontFamily: "'Courier New', monospace",
        height: "100%",
        maxHeight: "100%",
        overflowY: "auto",
        overflowX: "hidden",
      }}
    >
      {/* HEADER ESTILIZADO */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", mb: 2, flexWrap: "wrap", gap: 2, borderBottom: `2px solid ${T.neonDark}`, pb: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ color: T.neon, fontWeight: 900, letterSpacing: 1, textShadow: `0 0 10px ${T.neon}` }}>
            💼 QUADRO DE CONTRATOS
          </Typography>
        </Box>
        <Chip
          label={`📡 ${servicosFiltrados.length} DISPONÍVEIS`}
          size="small"
          sx={{ bgcolor: `${T.neon}15`, color: T.neon, fontWeight: 900, border: `1px solid ${T.neon}`, borderRadius: 1 }}
        />
      </Box>

      {/* TABS CUSTOMIZADAS */}
      <Tabs
        value={aba}
        onChange={(_, v) => setAba(v)}
        sx={{
          mb: 2,
          minHeight: 36,
          "& .MuiTab-root": { minHeight: 36, color: T.textDim, fontWeight: 900, fontFamily: "'Courier New', monospace", fontSize: "0.85rem" },
          "& .Mui-selected": { color: `${T.neon} !important`, textShadow: `0 0 8px ${T.neon}` },
          "& .MuiTabs-indicator": { bgcolor: T.neon, height: 2 }
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
          <Box sx={{ display: "flex", gap: 2, mb: 2, flexWrap: "wrap" }}>
            <TextField
              size="small"
              placeholder="🔍 Buscar por título, operador..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              sx={{
                flex: 2, minWidth: 200, bgcolor: T.card,
                input: { color: T.neon, fontFamily: "'Courier New', monospace", fontSize: "0.85rem" },
                "& .MuiOutlinedInput-notchedOutline": { borderColor: T.neonDark },
              }}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: T.neon, fontSize: "1rem" }} /></InputAdornment> }}
            />
            <FormControl size="small" sx={{ flex: 1, minWidth: 150, bgcolor: T.card }}>
              <InputLabel sx={{ color: T.textDim, fontSize: "0.85rem" }}>Operador</InputLabel>
              <Select
                value={filtroOperador}
                onChange={(e) => setFiltroOperador(e.target.value)}
                label="Operador"
                sx={{ color: T.text, fontFamily: "'Courier New', monospace", fontSize: "0.85rem" }}
                MenuProps={{ PaperProps: { sx: { bgcolor: T.card, color: T.text } } }}
              >
                <MenuItem value="">Todos</MenuItem>
                {operadores.map(o => <MenuItem key={o.id} value={o.id}>{o.nome}</MenuItem>)}
              </Select>
            </FormControl>
          </Box>

          <Grid container spacing={2}>
            {servicosFiltrados.map(srv => (
              <Grid item xs={12} sm={6} md={4} key={srv.id} sx={{ display: "flex" }}>
                <Paper
                  onClick={() => { setServicoSelecionado(srv); setViewMode("detail"); }}
                  sx={{
                    p: 0, bgcolor: T.card, border: `1px solid ${T.border}`, borderRadius: 2,
                    height: "100%", width: "100%", display: "flex", flexDirection: "column", overflow: "hidden",
                    position: "relative", cursor: "pointer",
                    transition: "all 0.2s ease",
                    "&:hover": {
                      borderColor: srv.operadorCor,
                      boxShadow: `0 0 15px ${srv.operadorCor}44`,
                      transform: "translateY(-2px)"
                    }
                  }}
                >
                  <Box sx={{ height: 3, width: "100%", bgcolor: srv.operadorCor }} />
                  <Box sx={{ p: 1.5, display: "flex", flexDirection: "column", flex: 1 }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                      <Chip
                        label={srv.operadorNome}
                        size="small"
                        sx={{ bgcolor: `${srv.operadorCor}15`, color: srv.operadorCor, fontWeight: 900, fontSize: "0.6rem", height: 20 }}
                      />
                      <Typography variant="caption" sx={{ color: T.textDim, display: "flex", alignItems: "center", gap: 0.5, fontSize: "0.65rem" }}>
                        <LocationOnIcon sx={{ fontSize: 12 }} /> {srv.cidadeNome || srv.paisNome || "?"}
                      </Typography>
                    </Box>

                    <Typography sx={{ color: "#fff", fontWeight: 900, fontSize: "1rem", mb: 1, lineHeight: 1.2 }}>
                      {srv.titulo}
                    </Typography>

                    <Typography
                      variant="body2"
                      sx={{
                        color: T.textDim, fontSize: "0.75rem", mb: 2, flex: 1,
                        display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
                        fontFamily: "'Courier New', monospace"
                      }}
                    >
                      {srv.sinopse || "Nenhuma sinopse fornecida."}
                    </Typography>

                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", mt: "auto", pt: 1.5, borderTop: `1px dashed ${T.border}` }}>
                      <Box>
                        <Typography sx={{ color: T.gold, fontWeight: 900, fontSize: "1rem", display: "flex", alignItems: "center", gap: 0.5 }}>
                          <LocalAtmIcon sx={{ fontSize: "1rem" }}/> {(srv.valor || 0).toLocaleString("pt-BR")}
                        </Typography>
                        {(srv.itensRecompensa || []).length > 0 && (
                          <Typography sx={{ color: T.pink, fontWeight: 900, fontSize: "0.65rem", display: "flex", alignItems: "center", gap: 0.5, mt: 0.2 }}>
                            📦 +{srv.itensRecompensa.length} item(ns)
                          </Typography>
                        )}
                      </Box>
                      <Button
                        variant="outlined"
                        size="small"
                        sx={{
                          color: srv.operadorCor, borderColor: srv.operadorCor, fontWeight: 900, fontSize: "0.65rem", py: 0.2, minWidth: 60,
                          "&:hover": { bgcolor: `${srv.operadorCor}11` }
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
            <Box sx={{ textAlign: "center", mt: 6, opacity: 0.5 }}>
              <SearchIcon sx={{ fontSize: 50, color: T.textDim, mb: 1 }} />
              <Typography sx={{ color: T.textDim, fontFamily: "'Courier New', monospace", fontSize: "0.85rem" }}>Nenhum contrato disponível.</Typography>
            </Box>
          )}
        </Box>
      )}

      {/* ABA 1: ATIVOS */}
      {aba === 1 && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {contratosVisiveis.length === 0 && (
            <Paper sx={{ p: 4, textAlign: "center", bgcolor: T.card, border: `1px dashed ${T.border}`, borderRadius: 2 }}>
              <Typography sx={{ color: T.textDim, fontFamily: "'Courier New', monospace", fontSize: "0.85rem" }}>Nenhum contrato ativo.</Typography>
            </Paper>
          )}
          {contratosVisiveis.map(ctr => {
            const concluido = ctr.status === "concluido";
            const corStatus = concluido ? T.green : T.gold;
            return (
              <Paper
                key={ctr.id}
                sx={{
                  p: 2, bgcolor: T.card,
                  border: `1px solid ${concluido ? T.green + "66" : ctr.detalhes.operadorCor + "66"}`,
                  borderRadius: 2, position: "relative", overflow: "hidden"
                }}
              >
                <Box sx={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, bgcolor: concluido ? T.green : ctr.detalhes.operadorCor }} />

                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1 }}>
                  <Box>
                    <Typography sx={{ color: ctr.detalhes.operadorCor, fontWeight: 900, fontSize: "0.75rem", letterSpacing: 1, textTransform: "uppercase", mb: 0.5 }}>
                      📡 {ctr.detalhes.operadorNome}
                    </Typography>
                    <Typography sx={{ color: "#fff", fontWeight: 900, fontSize: "1.2rem" }}>{ctr.detalhes.titulo}</Typography>
                    {isMaster && <Chip label={`Jogador: ${ctr.jogadorNome}`} size="small" sx={{ mt: 0.5, bgcolor: T.pink, color: "#fff", fontWeight: 900, height: 18, fontSize: "0.6rem" }} />}
                  </Box>
                  <Chip
                    label={concluido ? "CONCLUÍDO" : "EM ANDAMENTO"}
                    size="small"
                    sx={{
                      bgcolor: `${corStatus}22`, color: corStatus,
                      fontWeight: 900, border: `1px solid ${corStatus}`, height: 20, fontSize: "0.65rem"
                    }}
                  />
                </Box>

                <Typography sx={{ color: T.text, fontSize: "0.8rem", mb: 2, whiteSpace: "pre-wrap", lineHeight: 1.4, fontFamily: "'Courier New', monospace" }}>
                  <strong style={{ color: T.neon }}>BRIEFING:</strong> {ctr.detalhes.descricaoCompleta || ctr.detalhes.sinopse}
                </Typography>

                {concluido && (
                  <Paper sx={{ p: 1, mb: 1.5, bgcolor: `${T.green}10`, border: `1px solid ${T.green}44`, borderRadius: 1 }}>
                    <Typography sx={{ color: T.green, fontWeight: 900, fontSize: "0.75rem" }}>
                      ✅ Pago: 💰 {(ctr.valorPago || 0).toLocaleString("pt-BR")}
                      {ctr.valorOriginal !== ctr.valorPago && (
                        <span style={{ color: T.textDim, fontWeight: 400, fontSize: "0.65rem" }}>
                          {" "}(orig: {(ctr.valorOriginal || 0).toLocaleString("pt-BR")})
                        </span>
                      )}
                    </Typography>
                    {ctr.motivoAjuste && (
                      <Typography sx={{ color: T.textDim, fontSize: "0.65rem", mt: 0.2, fontStyle: "italic" }}>
                        Motivo: {ctr.motivoAjuste}
                      </Typography>
                    )}
                  </Paper>
                )}

                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 1, pt: 1, borderTop: `1px dashed ${T.border}` }}>
                  <Chip icon={<LocalAtmIcon sx={{ fontSize: "0.8rem" }}/>} label={`${(ctr.detalhes.valor || 0).toLocaleString("pt-BR")}`} size="small" sx={{ bgcolor: `${T.gold}15`, color: T.gold, fontWeight: 900, border: `1px solid ${T.gold}44`, height: 20, fontSize: "0.65rem" }} />
                  {ctr.detalhes.prazoDias > 0 ? (
                    <Chip icon={<AccessTimeIcon sx={{ fontSize: "0.8rem" }}/>} label={`Prazo: ${new Date(ctr.prazoFinal).toLocaleDateString()}`} size="small" sx={{ bgcolor: `${T.pink}15`, color: T.pink, fontWeight: 900, border: `1px solid ${T.pink}44`, height: 20, fontSize: "0.65rem" }} />
                  ) : (
                    <Chip icon={<AccessTimeIcon sx={{ fontSize: "0.8rem" }}/>} label="Sem prazo" size="small" sx={{ bgcolor: T.bg2, color: T.textDim, fontWeight: 900, border: `1px solid ${T.border}`, height: 20, fontSize: "0.65rem" }} />
                  )}
                  <Chip icon={<LocationOnIcon sx={{ fontSize: "0.8rem" }}/>} label={ctr.detalhes.cidadeNome || ctr.detalhes.paisNome} size="small" sx={{ bgcolor: T.bg2, color: T.textDim, border: `1px solid ${T.border}`, height: 20, fontSize: "0.65rem" }} />
                </Box>

                {isMaster && !concluido && (
                  <Box sx={{ mt: 1.5, display: "flex", justifyContent: "flex-end" }}>
                    <Button
                      size="small"
                      variant="outlined"
                      color="success"
                      startIcon={<CheckCircleIcon />}
                      onClick={() => abrirConcluir(ctr)}
                      sx={{ fontWeight: 900, borderColor: T.green, color: T.green, fontSize: "0.7rem", "&:hover": { bgcolor: `${T.green}22` } }}
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

        const xpPorOperador = {};
        contratosAtivos.forEach(ctr => {
          if (ctr.status !== "concluido") return;
          const opId = ctr.detalhes?.operadorId;
          if (!opId) return;
          const xpGanho = { mesmo: 10, bonus: 15, penalidade: 5, custom: 10 }[ctr.ajusteTipo] ?? 10;
          if (!xpPorOperador[opId]) {
            xpPorOperador[opId] = {
              operadorId: opId, xp: 0, contratos: 0,
              nome: ctr.detalhes?.operadorNome || "—", cor: ctr.detalhes?.operadorCor || T.neon,
            };
          }
          xpPorOperador[opId].xp += xpGanho;
          xpPorOperador[opId].contratos += 1;
        });
        const rankingOperadores = Object.values(xpPorOperador).sort((a, b) => b.xp - a.xp);

        const medalha = (pos) => pos === 1 ? "🥇" : pos === 2 ? "🥈" : pos === 3 ? "🥉" : `#${pos}`;

        return (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <Box>
              <Typography variant="caption" sx={{ color: T.gold, fontWeight: 900, letterSpacing: 1.5, fontSize: "0.75rem", display: "block", mb: 1 }}>
                🏆 RANKING DE REPUTAÇÃO — CONTRATANTES
              </Typography>
              <Typography variant="caption" sx={{ color: T.textDim, fontSize: "0.65rem", display: "block", mb: 1.5, fontStyle: "italic" }}>
                {isMaster ? "🔓 Modo Mestre: você vê o nick E o personagem real." : "🎭 Anonimato ativo: você vê apenas os nicks."}
                {" "}XP: +10 (normal), +15 (bônus), +5 (penalidade).
              </Typography>

              {reputacaoList.length === 0 ? (
                <Paper sx={{ p: 3, textAlign: "center", bgcolor: T.card, border: `1px dashed ${T.border}`, borderRadius: 2 }}>
                  <Typography sx={{ color: T.textDim, fontFamily: "'Courier New', monospace", fontSize: "0.85rem" }}>Ninguém no ranking ainda.</Typography>
                </Paper>
              ) : (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  {reputacaoList.map((r, idx) => {
                    const pos = idx + 1;
                    const isMeu = r.email === userEmail;
                    const fichaNome = isMaster ? (fichasMap[r.email]?.nome || r.email) : null;
                    const corBorda = pos === 1 ? "#fbbf24" : pos === 2 ? "#c0c0c0" : pos === 3 ? "#cd7f32" : T.border;
                    return (
                      <Paper key={r.email} sx={{ p: 1.5, bgcolor: isMeu ? `${T.neon}11` : T.card, border: `1px solid ${isMeu ? T.neon : corBorda}`, borderRadius: 2, display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
                        <Typography sx={{ fontSize: "1.2rem", minWidth: 30, textAlign: "center", fontWeight: 900, color: corBorda }}>{medalha(pos)}</Typography>
                        <Box sx={{ flex: 1, minWidth: 120 }}>
                          <Typography sx={{ color: "#fff", fontWeight: 900, fontSize: "0.9rem" }}>
                            {r.nick} {isMeu && <Chip label="VOCÊ" size="small" sx={{ ml: 1, bgcolor: T.neon, color: "#000", fontWeight: 900, fontSize: "0.55rem", height: 16 }} />}
                          </Typography>
                          {isMaster && fichaNome && <Typography variant="caption" sx={{ color: T.textDim, fontSize: "0.65rem" }}>🎭 Personagem: <strong style={{ color: T.pink }}>{fichaNome}</strong></Typography>}
                        </Box>
                        <Chip label={`${r.contratosConcluidos} contrato(s)`} size="small" sx={{ bgcolor: `${T.neon}22`, color: T.neon, fontWeight: 800, fontSize: "0.6rem", height: 20 }} />
                        <Chip label={`⭐ ${r.xp} XP`} size="small" sx={{ bgcolor: `${T.gold}22`, color: T.gold, fontWeight: 900, fontSize: "0.65rem", border: `1px solid ${T.gold}66`, height: 20 }} />
                      </Paper>
                    );
                  })}
                </Box>
              )}
              {!isMaster && minhaReputacao?.nick && meuRank > 0 && (
                <Paper sx={{ p: 1.5, mt: 1.5, bgcolor: `${T.neon}15`, border: `1px solid ${T.neon}66`, borderRadius: 2 }}>
                  <Typography sx={{ color: T.neon, fontWeight: 900, fontSize: "0.75rem" }}>🎯 Sua posição: #{meuRank} de {reputacaoList.length} · Nick: <strong>{minhaReputacao.nick}</strong> · ⭐ {minhaReputacao.xp} XP</Typography>
                </Paper>
              )}
            </Box>

            <Box>
              <Typography variant="caption" sx={{ color: T.pink, fontWeight: 900, letterSpacing: 1.5, fontSize: "0.75rem", display: "block", mb: 1 }}>
                📡 RANKING DE OPERADORES — MAIS CONFIÁVEIS
              </Typography>
              {rankingOperadores.length === 0 ? (
                <Paper sx={{ p: 3, textAlign: "center", bgcolor: T.card, border: `1px dashed ${T.border}`, borderRadius: 2 }}>
                  <Typography sx={{ color: T.textDim, fontFamily: "'Courier New', monospace", fontSize: "0.85rem" }}>Nenhum operador com contratos concluídos ainda.</Typography>
                </Paper>
              ) : (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  {rankingOperadores.map((op, idx) => {
                    const pos = idx + 1;
                    const opInfo = operadores.find(o => o.id === op.operadorId);
                    const cor = opInfo?.cor || op.cor || T.neon;
                    return (
                      <Paper key={op.operadorId} sx={{ p: 1.5, bgcolor: T.card, border: `1px solid ${pos <= 3 ? cor : T.border}`, borderLeft: `3px solid ${cor}`, borderRadius: 2, display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
                        <Typography sx={{ fontSize: "1.2rem", minWidth: 30, textAlign: "center", fontWeight: 900, color: cor }}>{medalha(pos)}</Typography>
                        <Box sx={{ flex: 1, minWidth: 120 }}>
                          <Typography sx={{ color: cor, fontWeight: 900, fontSize: "0.9rem" }}>📡 {op.nome}</Typography>
                          {opInfo?.descricao && <Typography variant="caption" sx={{ color: T.textDim, fontSize: "0.6rem", display: "block" }}>{opInfo.descricao.slice(0, 60)}...</Typography>}
                        </Box>
                        <Chip label={`${op.contratos} contrato(s)`} size="small" sx={{ bgcolor: `${cor}22`, color: cor, fontWeight: 800, fontSize: "0.6rem", height: 20 }} />
                        <Chip label={`⭐ ${op.xp} XP`} size="small" sx={{ bgcolor: `${T.gold}22`, color: T.gold, fontWeight: 900, fontSize: "0.65rem", border: `1px solid ${T.gold}66`, height: 20 }} />
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
          <Box sx={{ display: "flex", gap: 1.5, mb: 2, flexWrap: "wrap" }}>
            <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={() => { setFormServico({}); setViewMode("form"); }} sx={{ bgcolor: T.neon, color: "#000", fontWeight: 900, fontSize: "0.75rem" }}>
              Novo Serviço
            </Button>
            <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={() => { setFormOperador({}); setModalOperadorOpen(true); }} sx={{ bgcolor: T.pink, color: "#fff", fontWeight: 900, fontSize: "0.75rem" }}>
              Novo Operador
            </Button>
            <Button variant="contained" size="small" startIcon={<span>⚙️</span>} onClick={gerarOperadores} disabled={seedando} sx={{ bgcolor: '#a855f7', color: '#fff', fontWeight: 900, fontSize: "0.75rem" }}>
              {seedando ? "Gerando..." : `Gerar Operadores (${cidades.length})`}
            </Button>
          </Box>

          {/* 🟢 GERAÇÃO EM MASSA COM FILTROS */}
          <Paper sx={{ p: 2, bgcolor: T.card, border: `1px solid ${T.gold}`, borderRadius: 2, mb: 3 }}>
            <Typography sx={{ color: T.gold, fontWeight: 900, mb: 1.5, fontSize: "0.85rem" }}>GERADOR EM MASSA (I.A.)</Typography>
            
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth size="small">
                  <InputLabel sx={{ color: T.textDim, fontSize: "0.8rem" }}>Escopo</InputLabel>
                  <Select
                    value={configMassa.escopo}
                    onChange={e => setConfigMassa({ ...configMassa, escopo: e.target.value, paisAlvoId: "", cidadesAlvoIds: [] })}
                    sx={{ color: "#fff", fontSize: "0.8rem" }}
                    MenuProps={{ PaperProps: { sx: { bgcolor: T.card, color: T.text } } }}
                    label="Escopo"
                  >
                    <MenuItem value="global" sx={{ fontSize: "0.8rem" }}>🌍 Global (Tudo)</MenuItem>
                    <MenuItem value="pais" sx={{ fontSize: "0.8rem" }}>🏳️ País Específico</MenuItem>
                    <MenuItem value="cidades" sx={{ fontSize: "0.8rem" }}>🏙️ Cidades Específicas</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {configMassa.escopo === "pais" && (
                <Grid item xs={12} md={8}>
                  <FormControl fullWidth size="small">
                    <InputLabel sx={{ color: T.textDim, fontSize: "0.8rem" }}>Selecione o País</InputLabel>
                    <Select
                      value={configMassa.paisAlvoId}
                      onChange={e => setConfigMassa({ ...configMassa, paisAlvoId: e.target.value })}
                      sx={{ color: "#fff", fontSize: "0.8rem" }}
                      MenuProps={{ PaperProps: { sx: { bgcolor: T.card, color: T.text } } }}
                      label="Selecione o País"
                    >
                      {paises.map(p => <MenuItem key={p.id} value={p.id} sx={{ fontSize: "0.8rem" }}>{p.nome}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>
              )}

              {configMassa.escopo === "cidades" && (
                <Grid item xs={12} md={8}>
                  <FormControl fullWidth size="small">
                    <InputLabel sx={{ color: T.textDim, fontSize: "0.8rem" }}>Selecione as Cidades</InputLabel>
                    <Select
                      multiple
                      value={configMassa.cidadesAlvoIds}
                      onChange={e => setConfigMassa({ ...configMassa, cidadesAlvoIds: typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value })}
                      renderValue={(selected) => selected.length === 0 ? "Nenhuma" : `${selected.length} cidade(s) selecionada(s)`}
                      sx={{ color: "#fff", fontSize: "0.8rem" }}
                      MenuProps={{ PaperProps: { sx: { bgcolor: T.card, color: T.text, maxHeight: 300 } } }}
                      label="Selecione as Cidades"
                    >
                      {cidades.map(c => (
                        <MenuItem key={c.id} value={c.id} sx={{ fontSize: "0.8rem", p: 0.5 }}>
                          <Checkbox size="small" checked={configMassa.cidadesAlvoIds.indexOf(c.id) > -1} sx={{ color: T.neon, '&.Mui-checked': { color: T.neon }, p: 0.5 }} />
                          {c.nome}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              )}
            </Grid>

            <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mb: 2 }}>
              <FormControlLabel control={<Checkbox size="small" checked={configMassa.gerarDinheiro} onChange={e => setConfigMassa({ ...configMassa, gerarDinheiro: e.target.checked })} sx={{ color: T.green, '&.Mui-checked': { color: T.green }, p: 0.5 }} />} label={<Typography sx={{ color: "#fff", fontSize: "0.8rem" }}>Incluir Dinheiro</Typography>} />
              <FormControlLabel control={<Checkbox size="small" checked={configMassa.gerarItens} onChange={e => setConfigMassa({ ...configMassa, gerarItens: e.target.checked })} sx={{ color: T.pink, '&.Mui-checked': { color: T.pink }, p: 0.5 }} />} label={<Typography sx={{ color: "#fff", fontSize: "0.8rem" }}>Incluir Itens</Typography>} />
            </Box>
            {configMassa.gerarItens && (
              <Box sx={{ pl: 1, mb: 2 }}>
                <FormControlLabel control={<Checkbox size="small" checked={configMassa.incluirLojasOcultas} onChange={e => setConfigMassa({ ...configMassa, incluirLojasOcultas: e.target.checked })} sx={{ color: T.neon, '&.Mui-checked': { color: T.neon }, p: 0.5 }} />} label={<Typography sx={{ color: "#fff", fontSize: "0.75rem" }}>Permitir lojas ocultas</Typography>} />
              </Box>
            )}
            <Button variant="contained" size="small" onClick={gerarServicosComIA} sx={{ bgcolor: T.gold, color: "#000", fontWeight: 900, fontSize: "0.75rem" }}>
              Gerar com I.A.
            </Button>
          </Paper>

          {/* GERENCIAMENTO DE RISCO (RESET) */}
          <Typography variant="h6" sx={{ color: T.pink, mb: 1, fontSize: "0.9rem" }}>GERENCIAMENTO DE RISCO</Typography>
          <Box sx={{ display: "flex", gap: 1.5, mb: 3 }}>
            <Button variant="outlined" size="small" color="error" startIcon={<RestartAltIcon />} onClick={resetarContratos} sx={{ flex: 1, fontSize: "0.7rem", fontWeight: 900 }}>Resetar Contratos</Button>
            <Button variant="outlined" size="small" color="error" startIcon={<RestartAltIcon />} onClick={resetarOperadores} sx={{ flex: 1, fontSize: "0.7rem", fontWeight: 900 }}>Resetar Operadores</Button>
          </Box>

          <Typography variant="h6" sx={{ color: T.neon, mb: 1, borderBottom: `1px solid ${T.neonDark}`, pb: 0.5, display: "inline-block", fontSize: "0.9rem" }}>
            Serviços
          </Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1, mb: 3 }}>
            {servicos.map(srv => (
              <Paper key={srv.id} sx={{ p: 1.5, bgcolor: T.card, display: "flex", justifyContent: "space-between", alignItems: "center", border: `1px solid ${T.border}` }}>
                <Box>
                  <Typography sx={{ color: "#fff", fontWeight: 900, fontSize: "0.85rem" }}>{srv.titulo}</Typography>
                  <Typography variant="caption" sx={{ color: T.textDim, fontSize: "0.65rem" }}>📡 {srv.operadorNome}</Typography>
                </Box>
                <Box>
                  <IconButton size="small" onClick={() => { setFormServico(srv); setViewMode("form"); }} sx={{ color: T.neon }}><EditIcon fontSize="small"/></IconButton>
                  <IconButton size="small" onClick={() => deletarServico(srv.id)} sx={{ color: T.pink }}><DeleteIcon fontSize="small"/></IconButton>
                </Box>
              </Paper>
            ))}
          </Box>

          <Typography variant="h6" sx={{ color: T.pink, mb: 1, borderBottom: `1px solid ${T.pink}55`, pb: 0.5, display: "inline-block", fontSize: "0.9rem" }}>
            Operadores
          </Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {operadores.map(op => (
              <Paper key={op.id} sx={{ p: 1.5, bgcolor: T.card, display: "flex", justifyContent: "space-between", alignItems: "center", borderLeft: `3px solid ${op.cor}`, borderTop: `1px solid ${T.border}`, borderRight: `1px solid ${T.border}`, borderBottom: `1px solid ${T.border}` }}>
                <Typography sx={{ color: op.cor, fontWeight: 900, fontSize: "0.85rem" }}>📡 {op.nome}</Typography>
                <Box>
                  <IconButton size="small" onClick={() => { setFormOperador(op); setModalOperadorOpen(true); }} sx={{ color: T.neon }}><EditIcon fontSize="small"/></IconButton>
                  <IconButton size="small" onClick={() => deletarOperador(op.id)} sx={{ color: T.pink }}><DeleteIcon fontSize="small"/></IconButton>
                </Box>
              </Paper>
            ))}
          </Box>
        </Box>
      )}

      {/* 🟢 MODAIS SECUNDÁRIOS (PAGAR, NICK, OPERADOR) */}
      <Dialog
        open={modalConcluirOpen}
        onClose={() => setModalConcluirOpen(false)}
        maxWidth="sm"
        fullWidth
        container={document.body}
        PaperProps={{ sx: { bgcolor: T.bg2, border: `2px solid ${T.green}`, borderRadius: 2, boxShadow: `0 0 30px ${T.green}44`, zIndex: 999999 } }}
      >
        <DialogTitle sx={{ color: T.green, borderBottom: `1px solid ${T.border}`, fontFamily: "'Courier New', monospace", fontWeight: 900 }}>
          ✅ FINALIZAR & PAGAR
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {contratoSelecionado && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <Box>
                <Typography sx={{ color: "#fff", fontWeight: 900, fontSize: "1.1rem" }}>{contratoSelecionado.detalhes.titulo}</Typography>
                <Typography variant="caption" sx={{ color: T.textDim }}>Jogador: <strong style={{ color: T.pink }}>{contratoSelecionado.jogadorNome}</strong></Typography>
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: T.textDim, textTransform: "uppercase" }}>Valor Original</Typography>
                <Typography sx={{ color: T.gold, fontWeight: 900, fontSize: "1.2rem", display: "flex", alignItems: "center", gap: 1 }}>
                  <LocalAtmIcon /> {(contratoSelecionado.detalhes.valor || 0).toLocaleString("pt-BR")}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: T.textDim, textTransform: "uppercase", display: "block", mb: 1 }}>Ajuste</Typography>
                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                  {[
                    { id: "mesmo", label: "Normal", cor: T.neon },
                    { id: "bonus", label: "+25%", cor: T.green },
                    { id: "penalidade", label: "-25%", cor: T.pink },
                    { id: "custom", label: "Custom", cor: T.gold },
                  ].map(opt => (
                    <Button key={opt.id} size="small" variant={ajusteTipo === opt.id ? "contained" : "outlined"} onClick={() => aplicarAjuste(opt.id)}
                      sx={{ fontWeight: 900, borderColor: opt.cor, color: ajusteTipo === opt.id ? "#000" : opt.cor, bgcolor: ajusteTipo === opt.id ? opt.cor : "transparent", "&:hover": { bgcolor: opt.cor, color: "#000" }, fontSize: "0.7rem" }}>
                      {opt.label}
                    </Button>
                  ))}
                </Box>
              </Box>
              <TextField label="Valor Final (💰)" type="number" fullWidth size="small" value={valorFinal} onChange={(e) => { const v = Math.max(0, Number(e.target.value) || 0); setValorFinal(v); setAjusteTipo("custom"); }} InputLabelProps={{ sx: { color: T.textDim } }} InputProps={{ startAdornment: <InputAdornment position="start"><LocalAtmIcon sx={{ color: T.gold }} /></InputAdornment>, sx: { color: T.gold, fontWeight: 900 } }} />
              <TextField label="Motivo do Ajuste" fullWidth size="small" multiline rows={2} value={motivoAjuste} onChange={(e) => setMotivoAjuste(e.target.value)} InputLabelProps={{ sx: { color: T.textDim } }} InputProps={{ sx: { color: "#fff" } }} />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ borderTop: `1px solid ${T.border}`, p: 2 }}>
          <Button onClick={() => setModalConcluirOpen(false)} sx={{ color: T.textDim, fontWeight: 900 }}>CANCELAR</Button>
          <Button variant="contained" onClick={concluirEPagar} startIcon={<CheckCircleIcon />} sx={{ bgcolor: T.green, color: "#000", fontWeight: 900 }}>
            CONCLUIR
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={modalNickOpen} container={document.body} disableEscapeKeyDown maxWidth="xs" fullWidth PaperProps={{ sx: { bgcolor: T.bg2, border: `2px solid ${T.neon}`, borderRadius: 2, zIndex: 999999 } }}>
        <DialogTitle sx={{ color: T.neon, borderBottom: `1px solid ${T.border}`, fontFamily: "'Courier New', monospace", fontWeight: 900 }}>🎭 ESCOLHA SEU NICK</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Typography sx={{ color: T.text, fontSize: "0.8rem", mb: 2 }}>Mantenha o anonimato no ranking escolhendo um codinome.</Typography>
          <TextField label="Nick" fullWidth size="small" value={nickTemp} onChange={(e) => setNickTemp(e.target.value.slice(0, 20))} InputLabelProps={{ sx: { color: T.textDim } }} InputProps={{ sx: { color: T.neon, fontWeight: 900 } }} />
        </DialogContent>
        <DialogActions sx={{ borderTop: `1px solid ${T.border}`, p: 2 }}>
          <Button variant="contained" fullWidth onClick={salvarNick} disabled={salvandoNick || nickTemp.trim().length < 3} sx={{ bgcolor: T.neon, color: "#000", fontWeight: 900, fontSize: "0.8rem" }}>
            CONFIRMAR
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={modalOperadorOpen} onClose={() => setModalOperadorOpen(false)} container={document.body} maxWidth="xs" fullWidth PaperProps={{ sx: { bgcolor: T.bg2, border: `1px solid ${T.pink}`, zIndex: 999999 } }}>
        <DialogTitle sx={{ color: T.pink, borderBottom: `1px solid ${T.border}`, fontWeight: 900 }}>OPERADOR</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 2 }}>
          <TextField label="Nome" fullWidth size="small" value={formOperador.nome || ""} onChange={e => setFormOperador({ ...formOperador, nome: e.target.value })} InputLabelProps={{ sx: { color: T.textDim } }} InputProps={{ sx: { color: T.pink, fontWeight: 900 } }} />
          <TextField label="Descrição" fullWidth size="small" value={formOperador.descricao || ""} onChange={e => setFormOperador({ ...formOperador, descricao: e.target.value })} InputLabelProps={{ sx: { color: T.textDim } }} InputProps={{ sx: { color: "#fff" } }} />
          <Box>
            <Typography variant="caption" sx={{ color: T.textDim, fontWeight: 900, mb: 1, display: "block" }}>COR</Typography>
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              {CORES_OPERADOR.map(cor => (
                <Box key={cor} onClick={() => setFormOperador({ ...formOperador, cor })} sx={{ width: 28, height: 28, borderRadius: "50%", bgcolor: cor, cursor: "pointer", border: formOperador.cor === cor ? "2px solid #fff" : "2px solid transparent" }} />
              ))}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ borderTop: `1px solid ${T.border}`, p: 2 }}>
          <Button onClick={() => setModalOperadorOpen(false)} sx={{ color: T.textDim, fontWeight: 900, fontSize: "0.8rem" }}>CANCELAR</Button>
          <Button variant="contained" onClick={salvarOperador} sx={{ bgcolor: T.pink, color: "#fff", fontWeight: 900, fontSize: "0.8rem" }}>SALVAR</Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
}
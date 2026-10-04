import { useEffect, useRef } from "react";
import { db } from "../firebaseConfig";
import {
  doc, setDoc, getDoc, getDocs, collection, writeBatch, runTransaction, deleteDoc, addDoc,
} from "firebase/firestore";
import { sortearCrise } from "../data/simCrises";
import { normalizarInvestimentos, custoManutencaoCidade, custoManutencaoProvincia, custoManutencaoPais } from "../data/investimentos";
import { calcularEstoqueFinal, calcularDeficitTotal, calcularExcedenteTotal } from "../data/economia";
import { getCustoLeis, getFatoresLeis, resolverLeiEfetiva } from "../data/leis";
import { COMMODITIES } from "../data/simSeed";
import { EDIFICIOS_CATALOGO, calcularProducaoCidade, calcularEfeitosCidade, estoqueUniversal, mediaEdificios } from "../data/edificios";
import { EMPRESA_EDIFICIOS_CATALOGO } from "../data/empresaEdificios";
import { calcularTributoEmpresa, categoriaAutomaticaEmpresa } from "../data/empresaCategorias";
import { executarIaNpc } from "../data/empresaIA";
import { calcularSalarioMembro, calcularBonusAnual, getCfgCargos } from "../data/empresaCargos";
import { aplicarEfeitosNegociacao } from "../data/negociacoesEfeitos";
import { tecConcluida, getFatoresTecnologias, TECNOLOGIAS } from "../data/tecnologias";

const TICK_MS_DEFAULT = 60 * 60 * 1000;
const PRESENCE_INTERVAL = 30 * 1000;
const CHECK_INTERVAL = 60 * 1000;
const VIVO_MS = 90 * 1000;
const LOCK_TIMEOUT_MS = 2 * 60 * 1000;
const TICKS_POR_MES = 4;

const INSTRUCAO_VELOCIDADE_BASE = 0.08;
const INSTRUCAO_TETO_BASE = 20;
const INSTRUCAO_TETO_POR_NIVEL = 8;

function SimuladorEngine({ userEmail, isMaster, isConvidado }) {
  const presenceRef = useRef(null);
  const engineRef = useRef(null);

  useEffect(() => {
    if (!userEmail || isConvidado) return;
    const emailId = userEmail.replace(/[.@]/g, "_");
    const presenceDoc = doc(db, "sim_presenca", emailId);
    presenceRef.current = presenceDoc;

    const gravar = async () => {
      try {
        const ref = doc(db, "sim_presenca", emailId);
        const snap = await getDoc(ref);
        const criadoEm = snap.exists() ? snap.data().criadoEm : new Date().toISOString();
        await setDoc(ref, {
          email: userEmail,
          isMaster: !!isMaster,
          criadoEm,
          lastSeen: new Date().toISOString(),
        }, { merge: true });
      } catch (e) { /* silencioso */ }
    };

    gravar();
    const iv = setInterval(gravar, PRESENCE_INTERVAL);

    const sair = () => {
      try { deleteDoc(presenceDoc); } catch (e) {}
    };
    window.addEventListener("beforeunload", sair);

    return () => {
      clearInterval(iv);
      window.removeEventListener("beforeunload", sair);
    };
  }, [userEmail, isMaster, isConvidado]);

  useEffect(() => {
    if (!userEmail || isConvidado) return;

    const checar = async () => {
      try {
        const configRef = doc(db, "sim_config", "mundo");
        const configSnap = await getDoc(configRef);
        if (!configSnap.exists()) return;
        const config = configSnap.data();
        if (!config.initialized) return;
        if (config.congelarTudo) return;

        const intervaloMin = config.tickIntervalo !== undefined ? Number(config.tickIntervalo) : 60;
        const forcar = config.forcarTick === true;
        if (intervaloMin <= 0 && !forcar) return;
        const tickMs = intervaloMin > 0 ? intervaloMin * 60 * 1000 : TICK_MS_DEFAULT;

        const agora = Date.now();
        const ultimo = config.ultimoTick ? new Date(config.ultimoTick).getTime() : 0;
        if (ultimo && agora - ultimo < tickMs - 30000 && !forcar) return;

        const emAndamento = config.tickEmAndamento === true
          && (agora - (config.tickIniciadoEm ? new Date(config.tickIniciadoEm).getTime() : 0) < LOCK_TIMEOUT_MS);
        if (emAndamento) return;

        const presenceSnap = await getDocs(collection(db, "sim_presenca"));
        const vivos = [];
        presenceSnap.forEach((d) => {
          const p = d.data();
          const ls = p.lastSeen ? new Date(p.lastSeen).getTime() : 0;
          if (agora - ls < VIVO_MS && p.email) vivos.push(p);
        });
        if (vivos.length === 0) return;

        vivos.sort((a, b) => {
          if (a.isMaster && !b.isMaster) return -1;
          if (!a.isMaster && b.isMaster) return 1;
          return new Date(a.criadoEm || 0) - new Date(b.criadoEm || 0);
        });
        const escolhido = vivos[0];

        const souEu = escolhido.email === userEmail;
        const souMestreEFaltaMestre = escolhido.isMaster && !isMaster;
        if (!souEu && !(souMestreEFaltaMestre === false && isMaster && escolhido.isMaster === false)) {
          if (!souEu) return;
        }
        if (escolhido.email !== userEmail) return;

        let lockOk = false;
        try {
          await runTransaction(db, async (trx) => {
            const snap = await trx.get(configRef);
            const d = snap.data() || {};
            const intervaloMinTx = d.tickIntervalo !== undefined ? Number(d.tickIntervalo) : 60;
            const forcarTx = d.forcarTick === true;
            if (intervaloMinTx <= 0 && !forcarTx) throw new Error("desativado");
            const tickMsTx = intervaloMinTx > 0 ? intervaloMinTx * 60 * 1000 : TICK_MS_DEFAULT;
            const u = d.ultimoTick ? new Date(d.ultimoTick).getTime() : 0;
            const now = Date.now();
            const travado = d.tickEmAndamento === true
              && (now - (d.tickIniciadoEm ? new Date(d.tickIniciadoEm).getTime() : 0) < LOCK_TIMEOUT_MS);
            if (travado) throw new Error("travado");
            if (u && now - u < tickMsTx - 30000 && !forcarTx) throw new Error("recente");
            trx.set(configRef, {
              tickEmAndamento: true,
              tickIniciadoEm: new Date().toISOString(),
              forcarTick: false,
            }, { merge: true });
          });
          lockOk = true;
        } catch (e) {
          lockOk = false;
        }
        if (!lockOk) return;

        await executarTick(config);
      } catch (e) {
        console.warn("[SimEngine] erro:", e.message);
      }
    };

    checar();
    const iv = setInterval(checar, CHECK_INTERVAL);
    engineRef.current = iv;
    return () => clearInterval(iv);
  }, [userEmail, isMaster, isConvidado]);

  return null;
}

function calcularProducaoComTech(cidade, fatoresTec) {
  const out = {};
  const edif = cidade.edificios || {};
  for (const [edId, nivel] of Object.entries(edif)) {
    if (!nivel || nivel <= 0) continue;
    const ed = EDIFICIOS_CATALOGO.find((e) => e.id === edId);
    if (!ed || ed.tipo !== "producao") continue;
    let prod = ed.baseProducao + ed.incremento * (nivel - 1);
    if (ed.categoria === "industria") prod *= fatoresTec.producaoIndustria;
    if (ed.commodityId === "aco") prod *= fatoresTec.producaoAco;
    if (ed.commodityId === "pyridium") prod *= fatoresTec.producaoPyridium;
    out[ed.commodityId] = (out[ed.commodityId] || 0) + prod;
  }
  return out;
}

function calcularArrecadacaoCidade(cidade) {
  const impostos = cidade.impostos || {
    residencial: { pobre: 10, medio: 15, rico: 20 },
    comercial: { pobre: 10, medio: 15, rico: 20 },
    industrial: { pobre: 10, medio: 15, rico: 20 },
  };
  const pops = cidade.pops || {};
  const prosperidade = Number(cidade.prosperidade) || 50;
  const instrucao = Number(cidade.instrucao) || 0;

  const ESCALA = 0.1;
  const RIQUEZA_CLASSE = { pobre: 1, medio: 3, rico: 8 };

  const popPorClasse = { pobre: 0, medio: 0, rico: 0 };
  for (const [tipo, pop] of Object.entries(pops)) {
    const classe = pop.classe || (tipo === "nobres" ? "rico" : (tipo === "operarios" || tipo === "camponeses") ? "pobre" : "medio");
    popPorClasse[classe] += Number(pop.tamanho) || 0;
  }

  let arrecRes = 0;
  for (const classe of ["pobre", "medio", "rico"]) {
    const taxa = Number(impostos.residencial?.[classe] || 0) / 100;
    arrecRes += popPorClasse[classe] * RIQUEZA_CLASSE[classe] * taxa * ESCALA;
  }

  const mercadores = Number(pops.mercadores?.tamanho || 0);
  const classeMerc = pops.mercadores?.classe || "medio";
  const taxaCom = Number(impostos.comercial?.[classeMerc] || 0) / 100;
  const arrecCom = mercadores * RIQUEZA_CLASSE[classeMerc] * taxaCom * ESCALA * 2;

  const operarios = Number(pops.operarios?.tamanho || 0);
  const classeOp = pops.operarios?.classe || "pobre";
  const taxaInd = Number(impostos.industrial?.[classeOp] || 0) / 100;
  const arrecInd = operarios * RIQUEZA_CLASSE[classeOp] * taxaInd * ESCALA * 1.5;

  const fatorProsperidade = 0.5 + (prosperidade / 100);
  const fatorInstrucao = 1 + (instrucao / 200);

  const residencial = Math.round(arrecRes * fatorProsperidade * fatorInstrucao);
  const comercial = Math.round(arrecCom * fatorProsperidade * fatorInstrucao);
  const industrial = Math.round(arrecInd * fatorProsperidade * fatorInstrucao);
  const total = residencial + comercial + industrial;

  return { residencial, comercial, industrial, total };
}

function calcularImpostosHeuristica(cidade) {
  const impostosAtuais = cidade.impostos || {
    residencial: { pobre: 10, medio: 15, rico: 20 },
    comercial: { pobre: 10, medio: 15, rico: 20 },
    industrial: { pobre: 10, medio: 15, rico: 20 },
  };
  const radicalizacao = Number(cidade.radicalizacao) || 20;
  const prosperidade = Number(cidade.prosperidade) || 50;
  const cofre = Number(cidade.cofre) || 0;

  let ajuste = 0;
  let motivo = "estável";

  if (radicalizacao > 65) {
    ajuste = -2;
    motivo = "radicalização alta — aliviar carga";
  } else if (radicalizacao > 50) {
    ajuste = -1;
    motivo = "radicalização moderada — aliviar";
  } else if (prosperidade > 75 && cofre > 50000) {
    ajuste = 1;
    motivo = "prosperidade alta e cofre cheio — arrecadar mais";
  } else if (cofre < 500) {
    ajuste = 2;
    motivo = "cofre baixo — apertar impostos";
  } else if (prosperidade > 60 && cofre < 5000) {
    ajuste = 1;
    motivo = "cofre apertado — arrecadar mais";
  } else if (cofre > 100000 && prosperidade < 50) {
    ajuste = -2;
    motivo = "cofre muito cheio e prosperidade baixa — investir no povo";
  }

  const clamp = (v) => Math.max(0, Math.min(50, v));
  const novos = {
    residencial: {
      pobre: clamp((impostosAtuais.residencial?.pobre ?? 10) + ajuste),
      medio: clamp((impostosAtuais.residencial?.medio ?? 15) + ajuste),
      rico: clamp((impostosAtuais.residencial?.rico ?? 20) + ajuste),
    },
    comercial: {
      pobre: clamp((impostosAtuais.comercial?.pobre ?? 10) + ajuste),
      medio: clamp((impostosAtuais.comercial?.medio ?? 15) + ajuste),
      rico: clamp((impostosAtuais.comercial?.rico ?? 20) + ajuste),
    },
    industrial: {
      pobre: clamp((impostosAtuais.industrial?.pobre ?? 10) + ajuste),
      medio: clamp((impostosAtuais.industrial?.medio ?? 15) + ajuste),
      rico: clamp((impostosAtuais.industrial?.rico ?? 20) + ajuste),
    },
  };

  return { novos, ajuste, motivo, fonte: "heuristica" };
}

async function processarImpostosIA(agoraISO) {
  try {
    const [cidadesSnap, paisesSnap] = await Promise.all([
      getDocs(collection(db, "sim_cidades")),
      getDocs(collection(db, "sim_paises")),
    ]);
    const cidades = {};
    cidadesSnap.forEach((d) => { cidades[d.id] = { id: d.id, ...d.data() }; });
    const paises = {};
    paisesSnap.forEach((d) => { paises[d.id] = { id: d.id, ...d.data() }; });

    let ajustadas = 0;

    for (const cidade of Object.values(cidades)) {
      const pais = paises[cidade.paisId];
      const temPJ = (cidade.cargosLocais || []).some((c) => c.holderEmail) ||
                    (pais?.cargos || []).some((c) => c.holderEmail);
      if (temPJ) continue;

      let resultado = null;

      try {
        const resp = await fetch("https://reqviem.onrender.com/api/ia-impostos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cidade: cidade.nome,
            pop: cidade.pop,
            pops: cidade.pops || {},
            prosperidade: cidade.prosperidade || 50,
            radicalizacao: cidade.radicalizacao || 20,
            lealdade: cidade.lealdade || 60,
            criminalidade: cidade.criminalidade || 20,
            cofre: cidade.cofre || 0,
            impostosAtuais: cidade.impostos || {},
          }),
        });
        if (resp.ok) {
          const json = await resp.json();
          if (json?.impostos?.residencial) {
            resultado = {
              novos: json.impostos,
              ajuste: json.ajuste || 0,
              motivo: json.justificativa || "IA",
              fonte: "ia",
            };
          }
        }
      } catch (e) {
        // silencioso — cai pro fallback
      }

      if (!resultado) {
        resultado = calcularImpostosHeuristica(cidade);
      }

      if (resultado.ajuste === 0) continue;

      await setDoc(doc(db, "sim_cidades", cidade.id), {
        impostos: resultado.novos,
        ultimaDecisaoImpostos: {
          em: agoraISO,
          fonte: resultado.fonte,
          ajuste: resultado.ajuste,
          motivo: resultado.motivo,
        },
      }, { merge: true });

      ajustadas++;
    }

    if (ajustadas > 0) console.log(`[SimEngine] IA impostos: ${ajustadas} cidade(s) ajustada(s).`);
  } catch (e) {
    console.warn("[SimEngine] Falha em processarImpostosIA:", e.message);
  }
}

async function executarTick(config) {
  const agoraISO = new Date().toISOString();

  const [cidadesSnap, commoditiesSnap, paisesSnap, igsSnap] = await Promise.all([
    getDocs(collection(db, "sim_cidades")),
    getDocs(collection(db, "sim_commodities")),
    getDocs(collection(db, "sim_paises")),
    getDocs(collection(db, "sim_igs")),
  ]);

  const cidades = {};
  cidadesSnap.forEach((d) => { cidades[d.id] = { id: d.id, ...d.data() }; });
  const commodities = {};
  commoditiesSnap.forEach((d) => { commodities[d.id] = { id: d.id, ...d.data() }; });
  const paises = {};
  paisesSnap.forEach((d) => { paises[d.id] = { id: d.id, ...d.data() }; });
  const igs = {};
  igsSnap.forEach((d) => { igs[d.id] = { id: d.id, ...d.data() }; });

  const mudancas = { commodities: {}, cidades: {}, paises: {}, igs: {} };
  const variacoesCommodity = [];

  // ---- COMMODITIES ----
  if (!config.congelamentos?.commodities) {
    const ofertaTotal = {};
    const demandaTotal = {};
    for (const c of Object.values(cidades)) {
      const fatorPros = c.prosperidade ? 0.5 + c.prosperidade / 100 : 1;
      const fatorPop = c.pop ? Math.max(0.3, c.pop / 200000) : 1;
      const fatoresTec = getFatoresTecnologias(paises[c.paisId]);
      const prodReal = calcularProducaoComTech(c, fatoresTec);
      for (const [id, qtd] of Object.entries(prodReal)) {
        ofertaTotal[id] = (ofertaTotal[id] || 0) + (Number(qtd) || 0) * fatorPros;
      }
      for (const [id, qtd] of Object.entries(c.consumo || {})) {
        demandaTotal[id] = (demandaTotal[id] || 0) + (Number(qtd) || 0) * fatorPop;
      }
    }

    for (const c of Object.values(commodities)) {
      const oferta = ofertaTotal[c.id] ?? c.oferta ?? 100;
      const demanda = demandaTotal[c.id] ?? c.demanda ?? 100;
      const razao = demanda / (oferta + 1);
      let alvo = (c.precoBase || 10) * Math.pow(razao, 0.6);
      alvo *= 1 + (Math.random() - 0.5) * 0.06;
      const precoAtual = c.precoAtual || c.precoBase || 10;
      let novoPreco = precoAtual + (alvo - precoAtual) * 0.15;
      novoPreco = Math.max((c.precoBase || 10) * 0.3, Math.min((c.precoBase || 10) * 2.5, novoPreco));
      novoPreco = Math.round(novoPreco * 100) / 100;
      const hist = [...(c.historico || []), novoPreco].slice(-30);
      const variacao = ((novoPreco - precoAtual) / (precoAtual || 1)) * 100;
      variacoesCommodity.push({ id: c.id, nome: c.nome, icone: c.icone, variacao });

      mudancas.commodities[c.id] = {
        ...c,
        precoAtual: novoPreco,
        oferta: Math.round(oferta),
        demanda: Math.round(demanda),
        historico: hist,
        atualizadoEm: agoraISO,
      };
    }
  }

  // ---- CIDADES ----
  if (!config.congelamentos?.cidades) {
    for (const cidade of Object.values(cidades)) {
      let valorProd = 0;
      let valorCons = 0;
      const prodReal = calcularProducaoCidade(cidade);
      for (const [id, qtd] of Object.entries(prodReal)) {
        const preco = mudancas.commodities[id]?.precoAtual
          || commodities[id]?.precoAtual
          || commodities[id]?.precoBase
          || 10;
        valorProd += (Number(qtd) || 0) * preco;
      }
      for (const [id, qtd] of Object.entries(cidade.consumo || {})) {
        const preco = mudancas.commodities[id]?.precoAtual
          || commodities[id]?.precoAtual
          || commodities[id]?.precoBase
          || 10;
        valorCons += (Number(qtd) || 0) * preco;
      }
      const fatoresTecC = getFatoresTecnologias(paises[cidade.paisId]);
      const efeitosEd = calcularEfeitosCidade(cidade);
      const saldo = valorProd - valorCons;
      const delta = (saldo / 2000)
        + ((cidade.infraestrutura || 50) / 100)
        - ((cidade.criminalidade || 20) / 100)
        - ((cidade.radicalizacao || 20) / 100)
        + (efeitosEd.prosperidade || 0) * 0.5
        + (fatoresTecC.prosperidadeBonus || 0);
      const novaPros = Math.max(0, Math.min(100, (cidade.prosperidade || 50) + delta * 1.5));
      const radDelta = (50 - novaPros) / 200 + (efeitosEd.radicalizacao || 0) * 0.3;
      const novaRad = Math.max(0, Math.min(100, (cidade.radicalizacao || 20) + radDelta));
      const novaLeal = Math.max(0, Math.min(100, (cidade.lealdade || 60) + delta * 0.5 + (efeitosEd.lealdade || 0) * 0.3));

      const arrecadacao = calcularArrecadacaoCidade(cidade);
      const cofreAtual = Number(cidade.cofre) || 0;
      const novoCofre = cofreAtual + arrecadacao.total;

      mudancas.cidades[cidade.id] = {
        ...cidade,
        prosperidade: Math.round(novaPros * 10) / 10,
        radicalizacao: Math.round(novaRad * 10) / 10,
        lealdade: Math.round(novaLeal * 10) / 10,
        cofre: novoCofre,
        ultimaArrecadacaoLocal: arrecadacao.total,
        arrecadacaoDetalhada: arrecadacao,
        atualizadoEm: agoraISO,
      };
    }
  }
  // ---- PROVÍNCIAS ----
  let provinciasMap = {};
  try {
    const provSnap = await getDocs(collection(db, "sim_provincias"));
    provSnap.forEach((d) => { provinciasMap[d.id] = { id: d.id, ...d.data() }; });
  } catch (e) {
    console.warn("[SimEngine] Falha ao ler provincias:", e.message);
  }

  // ---- AGREGAR PROVÍNCIAS ----
  if (!config.congelamentos?.cidades) {
    for (const prov of Object.values(provinciasMap)) {
      const cids = prov.cidadesIds || [];
      const cidsObj = cids
        .map((id) => mudancas.cidades[id] || cidades[id])
        .filter(Boolean);
      if (cidsObj.length === 0) continue;

      const campos = ["prosperidade", "radicalizacao", "lealdade", "criminalidade", "infraestrutura", "educacao", "saude", "seguranca", "cultura", "pesquisa", "militar"];
      const media = {};
      campos.forEach((k) => {
        const soma = cidsObj.reduce((s, c) => s + (Number(c[k]) || 0), 0);
        media[k] = Math.round((soma / cidsObj.length) * 10) / 10;
      });

      const instrucaoMedia = cidsObj.reduce((s, c) => {
        const atual = mudancas.cidades[c.id]?.instrucao ?? c.instrucao ?? 0;
        return s + atual;
      }, 0) / cidsObj.length;

      mudancas.paises["__prov_" + prov.id] = {
        ...prov,
        ...media,
        instrucao: Math.round(instrucaoMedia * 10) / 10,
        edificiosMedios: mediaEdificios(cidsObj),
        atualizadoEm: agoraISO,
      };
    }

    // ---- AGREGAR EDIFÍCIOS NOS PAÍSES ----
    for (const pais of Object.values(paises)) {
      const cidadesDoPais = Object.values(cidades).filter((c) => c.paisId === pais.id);
      if (!mudancas.paises[pais.id]) mudancas.paises[pais.id] = { ...pais };
      mudancas.paises[pais.id].edificiosMedios = mediaEdificios(cidadesDoPais);
    }
  }
  
  // ---- MANUTENÇÃO DE INVESTIMENTOS (soma por país) ----
  const manutencaoPorPais = {};
  for (const cid of Object.values(cidades)) {
    const inv = normalizarInvestimentos(cid.investimentos);
    const totalCidade = Object.values(inv).reduce((s, v) => s + custoManutencaoCidade(v), 0);
    manutencaoPorPais[cid.paisId] = (manutencaoPorPais[cid.paisId] || 0) + totalCidade;
  }
  for (const prov of Object.values(provinciasMap)) {
    const inv = normalizarInvestimentos(prov.investimentos);
    const totalProv = Object.values(inv).reduce((s, v) => s + custoManutencaoProvincia(v), 0);
    manutencaoPorPais[prov.paisId] = (manutencaoPorPais[prov.paisId] || 0) + totalProv;
  }
  for (const pais of Object.values(paises)) {
    const inv = normalizarInvestimentos(pais.investimentos);
    const totalPais = Object.values(inv).reduce((s, v) => s + custoManutencaoPais(v), 0);
    manutencaoPorPais[pais.id] = (manutencaoPorPais[pais.id] || 0) + totalPais;
  }
  // ---- ESTOQUE POR CIDADE ----
  const balancoPorPais = {};
  if (!config.congelamentos?.estoques) {
    for (const cidade of Object.values(cidades)) {
      const base = mudancas.cidades[cidade.id] || cidade;
      const cidadeEff = { ...cidade, producao: calcularProducaoCidade(cidade) };
      const estoqueBruto = calcularEstoqueFinal(cidadeEff, commodities);
      const estoqueFinal = estoqueUniversal(estoqueBruto, COMMODITIES);
      const deficit = calcularDeficitTotal(estoqueFinal);
      const excedente = calcularExcedenteTotal(estoqueFinal);

      const custoDeficit = deficit * 12;
      const receitaExcedente = excedente * 3;

      mudancas.cidades[cidade.id] = {
        ...base,
        estoque: estoqueFinal,
        ultimoDeficit: deficit,
        ultimoExcedente: excedente,
        atualizadoEm: agoraISO,
      };

      if (!balancoPorPais[cidade.paisId]) {
        balancoPorPais[cidade.paisId] = { deficit: 0, excedente: 0, custo: 0, receita: 0 };
      }
      balancoPorPais[cidade.paisId].deficit += deficit;
      balancoPorPais[cidade.paisId].excedente += excedente;
      balancoPorPais[cidade.paisId].custo += custoDeficit;
      balancoPorPais[cidade.paisId].receita += receitaExcedente;
    }
    // ---- AGREGAR ESTOQUE NAS PROVÍNCIAS ----
    for (const prov of Object.values(provinciasMap)) {
      const cids = prov.cidadesIds || [];
      const estoqueProv = {};
      for (const cid of cids) {
        const est = mudancas.cidades[cid]?.estoque || cidades[cid]?.estoque || {};
        for (const [id, qtd] of Object.entries(est)) {
          estoqueProv[id] = (estoqueProv[id] || 0) + Number(qtd || 0);
        }
      }
      const key = "__prov_" + prov.id;
      if (!mudancas.paises[key]) mudancas.paises[key] = { ...prov };
      mudancas.paises[key].estoque = estoqueProv;
    }

    // ---- AGREGAR ESTOQUE NOS PAÍSES ----
    for (const pais of Object.values(paises)) {
      const cidadesDoPais = Object.values(cidades).filter((c) => c.paisId === pais.id);
      const estoquePais = {};
      for (const c of cidadesDoPais) {
        const est = mudancas.cidades[c.id]?.estoque || c.estoque || {};
        for (const [id, qtd] of Object.entries(est)) {
          estoquePais[id] = (estoquePais[id] || 0) + Number(qtd || 0);
        }
      }
      if (!mudancas.paises[pais.id]) mudancas.paises[pais.id] = { ...pais };
      mudancas.paises[pais.id].estoque = estoquePais;
    }
  }

  // ---- COFRE ----
  if (!config.congelamentos?.cofre) {
    for (const pais of Object.values(paises)) {
      const leis = pais.leis || {};
      const popTotal = pais.popTotal || 0;
      const cidadesDoPais = Object.values(cidades).filter((c) => c.paisId === pais.id);
      const fatoresTecP = getFatoresTecnologias(pais);
      const producaoTotal = cidadesDoPais.reduce((s, c) => {
        const prod = calcularProducaoComTech(c, fatoresTecP);
        let valor = 0;
        for (const [cid, qtd] of Object.entries(prod)) {
          const preco = commodities[cid]?.precoAtual || commodities[cid]?.precoBase || 10;
          valor += (Number(qtd) || 0) * preco;
        }
        return s + valor;
      }, 0);

      const arrecadacaoBase =
        popTotal * 0.005 +
        producaoTotal * 0.02 +
        (leis.imposto_mineracao || 0) * popTotal * 0.0001;

      const despesasFixes =
        (leis.servico_militar ? popTotal * 0.003 : 0) +
        ((leis.subsidio_agricola || 0) / 100) * 500 +
        (leis.lei_marcial ? popTotal * 0.001 : 0);

      const provsDoPais = Object.values(provinciasMap).filter((pv) => pv.paisId === pais.id);
      const instrucaoNacional = provsDoPais.length > 0
        ? provsDoPais.reduce((s, pv) => s + (mudancas.paises["__prov_" + pv.id]?.instrucao ?? pv.instrucao ?? 0), 0) / provsDoPais.length
        : 0;

      const manutencao = manutencaoPorPais[pais.id] || 0;
      const balanco = balancoPorPais[pais.id] || { deficit: 0, excedente: 0, custo: 0, receita: 0 };
      const fatoresPais = getFatoresLeis(pais.leis || {});
      const fatorArrec = fatoresPais.arrecadacao || 1;
      const arrecadacaoFinal = arrecadacaoBase * fatorArrec;
      const custoLeis = getCustoLeis(pais.leis || {});
      const delta = arrecadacaoFinal - despesasFixes - manutencao - balanco.custo + balanco.receita - custoLeis;
      const cofreAnterior = pais.cofre || 0;
      const novoCofre = cofreAnterior + delta;

      const cofreFinal = Math.round(novoCofre);
      const criseCofre = cofreFinal < 0;

      if (!mudancas.paises[pais.id]) mudancas.paises[pais.id] = { ...pais };
      mudancas.paises[pais.id] = {
        ...mudancas.paises[pais.id],
        cofre: cofreFinal,
        ultimaManutencao: manutencao,
        ultimaArrecadacao: Math.round(arrecadacaoFinal),
        ultimaDespesaFixa: Math.round(despesasFixes),
        ultimoCustoLeis: Math.round(custoLeis),
        ultimoDelta: Math.round(delta),
        ultimoDeficit: Math.round(balanco.deficit),
        ultimoExcedente: Math.round(balanco.excedente),
        ultimoCustoDeficit: Math.round(balanco.custo),
        ultimaReceitaExcedente: Math.round(balanco.receita),
        criseCofre,
        instrucao: Math.round(instrucaoNacional * 10) / 10,
        atualizadoEm: agoraISO,
      };
    }
  }
  // ---- INSTRUÇÃO POR CIDADE ----
  if (!config.congelamentos?.instrucao) {
    for (const cidade of Object.values(cidades)) {
      const inv = normalizarInvestimentos(cidade.investimentos);
      const pais = paises[cidade.paisId];
      const prov = provinciasMap[cidade.provinciaId];
      const leisEfetivas = {};
      for (const leiId of ["educacao", "saude", "censura", "cultos_locais", "tolerancia_aurica", "politica_agricola"]) {
        const res = resolverLeiEfetiva(leiId, { pais, provincia: prov, cidade });
        if (res.valor !== undefined) leisEfetivas[leiId] = res.valor;
      }
      const fatores = getFatoresLeis(leisEfetivas);

      const fatoresTecI = getFatoresTecnologias(pais);
      const fatorInvest = 1 + inv.educacao * 0.15;
      const fatorLei = fatores.educacao || 1;
      const velocidade = INSTRUCAO_VELOCIDADE_BASE * fatorInvest * fatorLei * (1 + (fatoresTecI.instrucaoBonus || 0));
      const teto = Math.min(100, INSTRUCAO_TETO_BASE + inv.educacao * INSTRUCAO_TETO_POR_NIVEL);

      const base = mudancas.cidades[cidade.id] || cidade;
      const atual = Number(base.instrucao) || 0;
      const nova = Math.min(teto, atual + velocidade);

      mudancas.cidades[cidade.id] = {
        ...base,
        instrucao: Math.round(nova * 10) / 10,
        atualizadoEm: agoraISO,
      };
    }
  }

  // ---- INVESTIMENTOS: EFEITOS E ATUALIZAÇÃO ----
  if (!config.congelamentos?.investimentos) {
    for (const cidade of Object.values(cidades)) {
      const inv = normalizarInvestimentos(cidade.investimentos);
      const base = mudancas.cidades[cidade.id] || cidade;
      const reducaoSeg = inv.seguranca * 0.3;
      const reducaoEdu = inv.educacao * 0.1;
      const aumentoLealSaude = inv.saude * 0.1;
      const reducaoCult = inv.cultura * 0.08;
      const aumentoLealCult = inv.cultura * 0.05;

      const criminalidadeAtual = Number(base.criminalidade) || 20;
      const radicalizacaoAtual = Number(base.radicalizacao) || 20;
      const lealdadeAtual = Number(base.lealdade) || 60;
      const prosperidadeAtual = Number(base.prosperidade) || 50;

      mudancas.cidades[cidade.id] = {
        ...base,
        investimentos: inv,
        criminalidade: Math.max(0, criminalidadeAtual - reducaoSeg),
        radicalizacao: Math.max(0, radicalizacaoAtual - reducaoEdu - reducaoCult),
        lealdade: Math.min(100, lealdadeAtual + aumentoLealSaude + aumentoLealCult),
        prosperidade: Math.min(100, prosperidadeAtual + inv.infraestrutura * 0.05),
        atualizadoEm: agoraISO,
      };
    }
  }
  // ---- POPS ----
  if (!config.congelamentos?.pops) {
    for (const pais of Object.values(paises)) {
      const pops = { ...(pais.pops || {}) };
      const fatores = getFatoresLeis(pais.leis || {});

      const baseDeltaLeal = 0.05;
      const baseDeltaRad = 0.08;

      const fatoresTecPops = getFatoresTecnologias(pais);
      for (const [tipo, pop] of Object.entries(pops)) {
        let leal = pop.lealdade ?? 50;
        let rad = pop.radicalizacao ?? 20;

        const fatorLeal =
          (fatores[`lealdade_${tipo}`] || 1) *
          (fatores.lealdade_pops || 1);
        let fatorRad =
          (fatores[`radicalizacao_${tipo}`] || 1) *
          (fatores.radicalizacao_pops || 1);
        if (tipo === "operarios") fatorRad *= fatoresTecPops.radicalizacaoOperarios || 1;

        leal += baseDeltaLeal * fatorLeal;
        rad += baseDeltaRad * fatorRad;

        if (leal > rad + 20) rad -= 0.2;
        else if (rad > leal + 20) leal -= 0.2;

        pops[tipo] = {
          ...pop,
          lealdade: Math.round(Math.max(0, Math.min(100, leal)) * 10) / 10,
          radicalizacao: Math.round(Math.max(0, Math.min(100, rad)) * 10) / 10,
        };
      }
      mudancas.paises[pais.id] = {
        ...(mudancas.paises[pais.id] || pais),
        pops,
        atualizadoEm: agoraISO,
      };
    }
  }

  // ---- IGs ----
  if (!config.congelamentos?.igs) {
    for (const ig of Object.values(igs)) {
      const pais = paises[ig.paisOrigem];
      if (!pais) continue;
      let lealMedia = 50;
      if (ig.composicaoPops && pais.pops) {
        let soma = 0;
        let peso = 0;
        for (const [tipo, w] of Object.entries(ig.composicaoPops)) {
          if (pais.pops[tipo]) {
            soma += (pais.pops[tipo].lealdade || 50) * w;
            peso += w;
          }
        }
        if (peso > 0) lealMedia = soma / peso;
      }
      const fatoresTecIg = getFatoresTecnologias(pais);
      let novoHumor = (ig.humor || 60) + (lealMedia - (ig.humor || 60)) * 0.1;
      let novoPoder = ig.poder || 50;
      if (novoHumor > 60) novoPoder += 0.2;
      else if (novoHumor < 40) novoPoder -= 0.2;
      if (ig.tipo === "militar") novoPoder *= fatoresTecIg.poderMilitar || 1;

      mudancas.igs[ig.id] = {
        ...ig,
        humor: Math.round(Math.max(0, Math.min(100, novoHumor)) * 10) / 10,
        poder: Math.round(Math.max(0, Math.min(100, novoPoder)) * 10) / 10,
        atualizadoEm: agoraISO,
      };
    }
  }

  // ---- Batch ----
  let batch = writeBatch(db);
  let ops = 0;
  const commitSe = async () => {
    if (ops >= 400) { await batch.commit(); batch = writeBatch(db); ops = 0; }
  };

  for (const [id, c] of Object.entries(mudancas.commodities)) {
    batch.set(doc(db, "sim_commodities", id), c, { merge: true });
    ops++; await commitSe();
  }
  for (const [id, c] of Object.entries(mudancas.cidades)) {
    batch.set(doc(db, "sim_cidades", id), c, { merge: true });
    ops++; await commitSe();
  }
  for (const [id, p] of Object.entries(mudancas.paises)) {
    if (id.startsWith("__prov_")) {
      const realId = id.replace("__prov_", "");
      const { id: _, ...dados } = p;
      batch.set(doc(db, "sim_provincias", realId), dados, { merge: true });
    } else {
      batch.set(doc(db, "sim_paises", id), p, { merge: true });
    }
    ops++; await commitSe();
  }
  for (const [id, ig] of Object.entries(mudancas.igs)) {
    batch.set(doc(db, "sim_igs", ig ? id : id), ig, { merge: true });
    ops++; await commitSe();
  }
  if (ops > 0) await batch.commit();

  // ---- Crises espontâneas ----
  let criseDisparada = null;
  if (config.permitirCrises) {
    const chance = Math.random();
    if (chance < 0.02) {
      try {
        const crise = sortearCrise();
        const listaCidades = Object.values(cidades).filter((c) => c.pop > 0);
        if (listaCidades.length > 0) {
          const alvo = listaCidades[Math.floor(Math.random() * listaCidades.length)];
          const paisAlvo = paises[alvo.paisId];
          const efeitos = crise.aplicar(alvo, paisAlvo);

          if (efeitos.cidade) {
            const updCidade = {};
            Object.entries(efeitos.cidade).forEach(([k, v]) => {
              updCidade[k] = Math.max(0, Math.min(100, (alvo[k] || 0) + v));
            });
            mudancas.cidades[alvo.id] = { ...(mudancas.cidades[alvo.id] || alvo), ...updCidade };
          }
          if (efeitos.commodities) {
            for (const cmd of efeitos.commodities) {
              if (commodities[cmd.id]) {
                const atual = commodities[cmd.id];
                mudancas.commodities[cmd.id] = {
                  ...(mudancas.commodities[cmd.id] || atual),
                  oferta: Math.max(1, (atual.oferta || 100) + (cmd.oferta || 0)),
                  demanda: Math.max(1, (atual.demanda || 100) + (cmd.demanda || 0)),
                };
              }
            }
          }

          criseDisparada = {
            criseId: crise.id,
            nome: crise.nome,
            icone: crise.icone,
            cidade: alvo.nome,
            cidadeId: alvo.id,
            noticia: crise.noticia(alvo, paisAlvo),
          };
        }
      } catch (e) {
        console.warn("[SimEngine] Falha ao disparar crise:", e.message);
      }
    }
  }

  // ---- Relatório ----
  const topUp = [...variacoesCommodity].sort((a, b) => b.variacao - a.variacao).slice(0, 3);
  const topDown = [...variacoesCommodity].sort((a, b) => a.variacao - b.variacao).slice(0, 3);
  const cidadesAlerta = Object.values(mudancas.cidades)
    .filter((c) => c.radicalizacao >= 60)
    .sort((a, b) => b.radicalizacao - a.radicalizacao)
    .slice(0, 3)
    .map((c) => ({ nome: c.nome, radicalizacao: c.radicalizacao, prosperidade: c.prosperidade }));
  const igsMudanca = Object.values(mudancas.igs)
    .sort((a, b) => Math.abs((b.poder || 0) - 50) - Math.abs((a.poder || 0) - 50))
    .slice(0, 3)
    .map((i) => ({ nome: i.nome, poder: i.poder, humor: i.humor }));

  const relatorio = {
    data: agoraISO,
    topAlta: topUp,
    topBaixa: topDown,
    cidadesAlerta,
    igsMudanca,
    commoditiesAtivas: variacoesCommodity.length,
    cidadesAtivas: Object.keys(mudancas.cidades).length,
    paisesAtivos: Object.keys(mudancas.paises).length,
    igsAtivos: Object.keys(mudancas.igs).length,
  };

  if (criseDisparada) {
    relatorio.criseDisparada = criseDisparada;
    try {
      await addDoc(collection(db, "sim_historico"), {
        tipo: "crise_espontanea",
        ...criseDisparada,
        criadoEm: agoraISO,
      });

      const redeRef = doc(db, "rede_cyberpunk", "dados");
      const redeSnap = await getDoc(redeRef);
      const noticiasAtuais = redeSnap.exists() ? (redeSnap.data().noticias || []) : [];
      const novaNoticia = {
        id: `n_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
        titulo: `${criseDisparada.icone} ${criseDisparada.nome}`,
        subtitulo: criseDisparada.noticia,
        categoria: "⚠️ Emergência",
        dataRPG: "—",
        timestamp: Date.now(),
        empresasAfetadas: [],
        variacaoPercentual: 0,
        afetarImoveis: false,
        cidadeAlvo: "",
        variacaoImoveis: 0,
      };
      const listaFinal = [novaNoticia, ...noticiasAtuais].slice(0, 40);
      await setDoc(redeRef, { noticias: listaFinal }, { merge: true });
    } catch (e) {
      console.warn("[SimEngine] Falha ao publicar crise:", e.message);
    }
  }
  // ---- NEGOCIAÇÕES: IA para NPCs + EXPIRAR ----
  try {
    const negSnap = await getDocs(collection(db, "sim_negociacoes"));
    const agoraMs = Date.now();
    const LIMITE = 6 * 60 * 60 * 1000;
    const ESPERA_IA = 5 * 60 * 1000;

    const montarContexto = (ent) => {
      if (!ent) return {};
      const cidadesAlvo = ent.nivel === "pais"
        ? Object.values(cidades).filter((c) => c.paisId === ent.id)
        : ent.nivel === "provincia"
          ? Object.values(cidades).filter((c) => c.provinciaId === ent.id)
          : cidades[ent.id] ? [cidades[ent.id]] : [];
      const estoque = {};
      for (const c of cidadesAlvo) {
        for (const [cid, qtd] of Object.entries(c.estoque || {})) {
          estoque[cid] = (estoque[cid] || 0) + Number(qtd || 0);
        }
      }
      const pais = ent.nivel === "pais" ? paises[ent.id]
        : ent.nivel === "provincia" ? paises[provinciasMap[ent.id]?.paisId]
        : paises[cidades[ent.id]?.paisId];
      const igsDo = pais ? Object.values(igs).filter((i) => i.paisOrigem === pais.id) : [];
      return {
        nome: ent.nome || ent.id,
        nivel: ent.nivel,
        cofre: pais?.cofre || 0,
        popTotal: pais?.popTotal || 0,
        instrucao: pais?.instrucao || 0,
        reputacao: pais?.reputacao || 50,
        formaGoverno: pais?.formaGoverno,
        leisChave: {
          imposto_importacao: pais?.leis?.imposto_importacao,
          sistema_tributario: pais?.leis?.sistema_tributario,
          padrao_comercial: pais?.leis?.padrao_comercial,
          politica_externa: pais?.leis?.politica_externa,
        },
        igs: igsDo.slice(0, 8).map((i) => ({ nome: i.nome, poder: i.poder, humor: i.humor })),
        estoque,
      };
    };

    for (const d of negSnap.docs) {
      const n = d.data();
      if (n.status !== "pendente") continue;
      const t = n.criadoEm ? new Date(n.criadoEm).getTime() : 0;

      const temPJ = (() => {
        if (n.para?.nivel === "pais") return paises[n.para.id]?.cargos?.some((c) => c.holderEmail);
        if (n.para?.nivel === "provincia") return provinciasMap[n.para.id]?.cargos?.some((c) => c.holderEmail);
        if (n.para?.nivel === "cidade") return cidades[n.para.id]?.cargosLocais?.some((cg) => cg.holderEmail);
        return false;
      })();

      if (t && agoraMs - t > LIMITE) {
        await setDoc(doc(db, "sim_negociacoes", d.id), { status: "expirada", respondidoEm: agoraISO }, { merge: true });
        continue;
      }

      if (temPJ) continue;
      if (n.iaProcessada) continue;
      if (t && agoraMs - t < ESPERA_IA) continue;

      const contextoAlvo = montarContexto(n.para);
      const contextoProponente = montarContexto(n.de);

      try {
        const resp = await fetch("https://reqviem.onrender.com/api/ia-negociacao", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ negociacao: n, contextoAlvo, contextoProponente }),
        });
        const ia = await resp.json();

        if (ia.decisao === "aceita") {
          await aplicarEfeitosNegociacao({ ...n, respondidoPor: "IA" }, { paises, cidades, commodities, igs, provincias: provinciasMap });
          await setDoc(doc(db, "sim_negociacoes", d.id), {
            status: "aceita",
            respondidoEm: agoraISO,
            respondidoPor: "IA",
            iaProcessada: true,
            iaJustificativa: ia.justificativa || "",
          }, { merge: true });
        } else if (ia.decisao === "recusa") {
          await setDoc(doc(db, "sim_negociacoes", d.id), {
            status: "recusada",
            respondidoEm: agoraISO,
            respondidoPor: "IA",
            iaProcessada: true,
            iaJustificativa: ia.justificativa || "",
          }, { merge: true });
        } else if (ia.decisao === "contraproposta" && ia.contraproposta) {
          const novoId = `neg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
          await setDoc(doc(db, "sim_negociacoes", novoId), {
            id: novoId,
            tipo: n.tipo,
            titulo: ia.contraproposta.titulo || `Contraproposta de ${n.para.nome}`,
            descricao: ia.contraproposta.descricao || "",
            de: n.para,
            para: n.de,
            oferta: ia.contraproposta.oferta || n.pedido,
            pedido: ia.contraproposta.pedido || n.oferta,
            chanceSucesso: n.chanceSucesso,
            status: "pendente",
            criadoEm: agoraISO,
            contrapropostaDe: n.id,
          }, { merge: true });
          await setDoc(doc(db, "sim_negociacoes", d.id), {
            status: "recusada",
            respondidoEm: agoraISO,
            respondidoPor: "IA",
            iaProcessada: true,
            iaJustificativa: ia.justificativa || "",
            contrapropostaId: novoId,
          }, { merge: true });
        }
      } catch (err) {
        await setDoc(doc(db, "sim_negociacoes", d.id), {
          iaProcessada: true,
          iaErro: err.message,
        }, { merge: true });
      }
    }
  } catch (e) {
    console.warn("[SimEngine] Falha em negociações:", e.message);
  }

  await processarFinanciamentos(agoraISO);
  await processarEquilibrio(agoraISO, config);
  await processarPesquisas(agoraISO);
  await processarPesquisasEmpresas(agoraISO);
  await processarImpostosIA(agoraISO);

  const ticksDesdeCiclo = (config.ticksDesdeCiclo || 0) + 1;
  let novoTicksDesdeCiclo = ticksDesdeCiclo;
  let cicloRodou = false;
  if (ticksDesdeCiclo >= TICKS_POR_MES) {
    await executarCicloEconomico(agoraISO);
    novoTicksDesdeCiclo = 0;
    cicloRodou = true;
  }

  await setDoc(doc(db, "sim_config", "mundo"), {
    ultimoTick: agoraISO,
    tickEmAndamento: false,
    tickIniciadoEm: null,
    ultimoRelatorio: relatorio,
    ticksDesdeCiclo: novoTicksDesdeCiclo,
  }, { merge: true });

  if (cicloRodou) console.log("[SimEngine] Ciclo econômico mensal rodou.");

  console.log("[SimEngine] Tick executado:", relatorio);
  return relatorio;
}

async function processarFinanciamentos(agoraISO) {
  try {
    const finSnap = await getDocs(collection(db, "sim_financiamentos"));
    const agora = Date.now();
    const INTERVALO = 60 * 60 * 1000;

    for (const d of finSnap.docs) {
      const f = d.data();
      if (f.status !== "ativo") continue;
      const proxima = f.proximaEm ? new Date(f.proximaEm).getTime() : 0;
      if (proxima && agora < proxima) continue;

      const devedorRef = doc(db, "sim_paises", f.devedorId);
      const credorRef = doc(db, "sim_paises", f.credorId);
      const devedorSnap = await getDoc(devedorRef);
      const credorSnap = await getDoc(credorRef);
      if (!devedorSnap.exists() || !credorSnap.exists()) continue;

      const devedor = devedorSnap.data();
      const credor = credorSnap.data();
      const parcela = Number(f.valorParcela) || 0;

      if ((devedor.cofre || 0) < parcela) {
        const atrasos = (f.atrasos || 0) + 1;
        if (atrasos >= 3) {
          await setDoc(doc(db, "sim_financiamentos", d.id), {
            status: "inadimplente",
            atrasos,
            atualizadoEm: agoraISO,
          }, { merge: true });
        } else {
          await setDoc(doc(db, "sim_financiamentos", d.id), {
            atrasos,
            proximaEm: new Date(agora + INTERVALO).toISOString(),
            atualizadoEm: agoraISO,
          }, { merge: true });
        }
        continue;
      }

      const novasParcelas = Math.max(0, (f.parcelasRestantes || 0) - 1);
      const novoStatus = novasParcelas <= 0 ? "quitado" : "ativo";

      await setDoc(devedorRef, {
        cofre: (devedor.cofre || 0) - parcela,
      }, { merge: true });

      await setDoc(credorRef, {
        cofre: (credor.cofre || 0) + parcela,
      }, { merge: true });

      await setDoc(doc(db, "sim_financiamentos", d.id), {
        parcelasRestantes: novasParcelas,
        atrasos: 0,
        status: novoStatus,
        proximaEm: novoStatus === "ativo"
          ? new Date(agora + INTERVALO).toISOString()
          : null,
        ultimoPagamento: agoraISO,
        atualizadoEm: agoraISO,
      }, { merge: true });
    }
  } catch (e) {
    console.warn("[SimEngine] Falha ao processar financiamentos:", e.message);
  }
}

async function processarEquilibrio(agoraISO, config) {
  try {
    const [cidadesSnap, paisesSnap] = await Promise.all([
      getDocs(collection(db, "sim_cidades")),
      getDocs(collection(db, "sim_paises")),
    ]);
    const cidades = {};
    cidadesSnap.forEach((d) => { cidades[d.id] = { id: d.id, ...d.data() }; });
    const paises = {};
    paisesSnap.forEach((d) => { paises[d.id] = { id: d.id, ...d.data() }; });

    let alertasCriados = 0;

    for (const cidade of Object.values(cidades)) {
      const estoque = cidade.estoque || {};
      const deficits = Object.entries(estoque)
        .filter(([_, qtd]) => Number(qtd) < -5)
        .map(([cid, qtd]) => ({ commodityId: cid, saldo: Number(qtd) }));

      const alertaRef = doc(db, "sim_alertas", cidade.id);

      if (deficits.length === 0) {
        const snap = await getDoc(alertaRef);
        if (snap.exists()) {
          await deleteDoc(alertaRef);
        }
        continue;
      }

      const pais = paises[cidade.paisId];
      const temPJ = (cidade.cargosLocais || []).some((c) => c.holderEmail) ||
                    (pais?.cargos || []).some((c) => c.holderEmail);

      const alertaData = {
        entidadeId: cidade.id,
        entidadeNome: cidade.nome,
        nivel: "cidade",
        deficits,
        temPJ,
        atualizadoEm: agoraISO,
        cofre: pais?.cofre || 0,
      };

      if (temPJ) {
        await setDoc(alertaRef, alertaData, { merge: true });
        alertasCriados++;
        continue;
      }

      if (!pais || (pais.cofre || 0) < 500) {
        await setDoc(alertaRef, { ...alertaData, iaDecidiu: false, motivo: "Sem cofre suficiente" }, { merge: true });
        continue;
      }

      const edificiosDisponiveis = EDIFICIOS_CATALOGO
        .filter((e) => e.tipo === "producao" && deficits.some((d) => d.commodityId === e.commodityId))
        .map((e) => ({ id: e.id, nome: e.nome, baseCusto: e.baseCusto, commodityId: e.commodityId }));

      if (edificiosDisponiveis.length === 0) {
        await setDoc(alertaRef, { ...alertaData, iaDecidiu: false, motivo: "Sem edifício conhecido" }, { merge: true });
        continue;
      }

      try {
        const resp = await fetch("https://reqviem.onrender.com/api/ia-equilibrio", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            entidade: cidade.nome,
            nivel: "cidade",
            deficits,
            cofre: pais.cofre || 0,
            pops: cidade.pops || {},
            edificiosDisponiveis,
          }),
        });
        const data = await resp.json();

        const acoesAplicadas = [];
        for (const acao of (data.acoes || [])) {
          if (acao.tipo === "construir" && edificiosDisponiveis.some((e) => e.id === acao.edificioId)) {
            const ed = EDIFICIOS_CATALOGO.find((e) => e.id === acao.edificioId);
            const custo = ed.baseCusto;
            if ((pais.cofre || 0) >= custo) {
              const edifAtuais = { ...(cidade.edificios || {}) };
              edifAtuais[acao.edificioId] = (edifAtuais[acao.edificioId] || 0) + 1;
              await setDoc(doc(db, "sim_cidades", cidade.id), { edificios: edifAtuais }, { merge: true });
              await setDoc(doc(db, "sim_paises", pais.id), { cofre: (pais.cofre || 0) - custo }, { merge: true });
              pais.cofre = (pais.cofre || 0) - custo;
              acoesAplicadas.push(`Construiu ${ed.nome} (Nv ${edifAtuais[acao.edificioId]})`);
            }
          }
        }

        await setDoc(alertaRef, {
          ...alertaData,
          iaDecidiu: true,
          iaAcoes: acoesAplicadas,
          iaAviso: data.aviso || "",
          cofre: pais.cofre || 0,
        }, { merge: true });
        alertasCriados++;
      } catch (err) {
        console.warn("[SimEngine] IA Equilíbrio falhou:", err.message);
        await setDoc(alertaRef, { ...alertaData, iaDecidiu: false, motivo: "IA offline" }, { merge: true });
      }
    }

    try {
      const todosSnap = await getDocs(collection(db, "sim_alertas"));
      const todos = [];
      todosSnap.forEach((d) => todos.push({ id: d.id, ...d.data() }));
      if (todos.length > 50) {
        todos.sort((a, b) => {
          const ta = a.atualizadoEm ? new Date(a.atualizadoEm).getTime() : 0;
          const tb = b.atualizadoEm ? new Date(b.atualizadoEm).getTime() : 0;
          return tb - ta;
        });
        const paraDeletar = todos.slice(50);
        let batchDel = writeBatch(db);
        let opsDel = 0;
        for (const a of paraDeletar) {
          batchDel.delete(doc(db, "sim_alertas", a.id));
          opsDel++;
          if (opsDel >= 400) { await batchDel.commit(); batchDel = writeBatch(db); opsDel = 0; }
        }
        if (opsDel > 0) await batchDel.commit();
        console.log(`[SimEngine] Limpeza: ${paraDeletar.length} alertas antigos removidos.`);
      }
    } catch (e) {
      console.warn("[SimEngine] Falha na limpeza de alertas:", e.message);
    }

    console.log(`[SimEngine] ${alertasCriados} alertas de equilíbrio.`);
  } catch (e) {
    console.warn("[SimEngine] Falha em processarEquilibrio:", e.message);
  }
}
async function executarCicloEconomico(agoraISO) {
  try {
    const [cidadesSnap, provsSnap, paisesSnap, empresasSnap, commoditiesSnap, igsSnapExtra] = await Promise.all([
      getDocs(collection(db, "sim_cidades")),
      getDocs(collection(db, "sim_provincias")),
      getDocs(collection(db, "sim_paises")),
      getDocs(collection(db, "sim_empresas")),
      getDocs(collection(db, "sim_commodities")),
      getDocs(collection(db, "sim_igs")),
    ]);
    const cidades = {};
    cidadesSnap.forEach((d) => { cidades[d.id] = { id: d.id, ...d.data() }; });
    const provs = {};
    provsSnap.forEach((d) => { provs[d.id] = { id: d.id, ...d.data() }; });
    const paises = {};
    paisesSnap.forEach((d) => { paises[d.id] = { id: d.id, ...d.data() }; });
    const empresas = {};
    empresasSnap.forEach((d) => { empresas[d.id] = { id: d.id, ...d.data() }; });
    const comMap = {};
    commoditiesSnap.forEach((d) => { comMap[d.id] = { id: d.id, ...d.data() }; });
    const igsMap = {};
    igsSnapExtra.forEach((d) => { igsMap[d.id] = { id: d.id, ...d.data() }; });

    const bolsasCache = {};
    try {
      const bolsaSnap = await getDoc(doc(db, "bolsa_valores", "dados"));
      if (bolsaSnap.exists()) {
        const arr = bolsaSnap.data().empresas || [];
        for (const b of arr) bolsasCache[b.id] = b;
      }
    } catch (e) { /* silencioso */ }

    // ============ FASE -1.7: CATEGORIA AUTOMÁTICA ============
    for (const emp of Object.values(empresas)) {
      if (emp.categoriaModo === "manual") continue;
      const totalEdif = Object.values(emp.edificiosPorCidade || {}).reduce((s, eds) => {
        return s + Object.values(eds || {}).reduce((s2, nv) => s2 + (Number(nv) || 0), 0);
      }, 0);
      const novaCat = categoriaAutomaticaEmpresa(emp, totalEdif);
      if (novaCat !== emp.categoria) {
        const previa = mudancasEmpresas[emp.id] || {};
        mudancasEmpresas[emp.id] = {
          ...previa,
          categoria: novaCat,
          atualizadoEm: agoraISO,
        };
      }
    }

    // ============ FASE -1.5: CHEQUE DE FALÊNCIA ============
    for (const emp of Object.values(empresas)) {
      const valorEmp = (() => {
        const bolsaId = emp.bolsaEmpresaId;
        if (bolsaId) {
          const b = (bolsasCache?.[bolsaId]) || null;
          if (b) return Number(b.valorEmpresa ?? b.valor ?? 0);
        }
        return Number(emp.valor || 0);
      })();
      if (valorEmp <= 0) continue;

      const sedesArr = Array.isArray(emp.sedes) ? emp.sedes : (emp.sede ? [emp.sede] : []);
      const sedesCofresAtual = { ...(emp.sedesCofres || {}) };
      const totalSedes = sedesArr.reduce((s, sed) => s + Number(sedesCofresAtual[sed.id] || 0), 0);
      const consolidado = Number(emp.cofre || 0) + totalSedes;
      const limite = -valorEmp;

      if (consolidado <= limite && !emp.falida) {
        const previa = mudancasEmpresas[emp.id] || {};
        mudancasEmpresas[emp.id] = {
          ...previa,
          falida: true,
          falidaEm: agoraISO,
          atualizadoEm: agoraISO,
        };
        console.log(`[SimEngine] 💀 ${emp.nome} FALIU (consolidado ${consolidado} ≤ limite ${limite}).`);
      } else if (consolidado > limite && emp.falida) {
        const previa = mudancasEmpresas[emp.id] || {};
        mudancasEmpresas[emp.id] = {
          ...previa,
          falida: false,
          recuperadaEm: agoraISO,
          atualizadoEm: agoraISO,
        };
        console.log(`[SimEngine] 💚 ${emp.nome} RECUPERADA (consolidado ${consolidado}).`);
      }
    }

    // ============ FASE -1: TRIBUTO DAS EMPRESAS ÀS CIDADES-SEDE ============
    const mudancasEmpresas = {};
    const ganhosXpEmpresas = {};

    for (const emp of Object.values(empresas)) {
      if (emp.falida) continue;
      const sedesArr = Array.isArray(emp.sedes) ? emp.sedes : (emp.sede ? [emp.sede] : []);
      if (sedesArr.length === 0) continue;

      const categoriaTrib = calcularTributoEmpresa(emp);
      const sedesCofresAtual = { ...(emp.sedesCofres || {}) };
      let faturamentoTotalEmp = 0;
      let cofreCentralDelta = 0;

      for (const sede of sedesArr) {
        const cidade = cidades[sede.id];
        if (!cidade) continue;

        const edificiosDonos = cidade.edificiosDonos || {};
        const edificios = cidade.edificios || {};

        let faturamentoCidade = 0;
        for (const [edId, nivel] of Object.entries(edificios)) {
          if (!nivel || nivel <= 0) continue;
          const dono = edificiosDonos[edId];
          if (!dono || dono.tipo !== "privado" || dono.empresaId !== emp.id) continue;
          const ed = EDIFICIOS_CATALOGO.find((e) => e.id === edId);
          if (!ed || ed.tipo !== "producao") continue;
          const prod = ed.baseProducao + ed.incremento * (nivel - 1);
          const preco = comMap[ed.commodityId]?.precoAtual || comMap[ed.commodityId]?.precoBase || 10;
          faturamentoCidade += prod * preco;
        }

        if (faturamentoCidade <= 0) continue;
        faturamentoTotalEmp += faturamentoCidade;

        const tributo = Math.round(faturamentoCidade * categoriaTrib);
        if (tributo <= 0) continue;

        const cofreSedeAtual = Number(sedesCofresAtual[sede.id] || 0);
        sedesCofresAtual[sede.id] = cofreSedeAtual - tributo;
        cidade.cofre = (cidade.cofre || 0) + tributo;
        cofreCentralDelta -= tributo;
      }

      if (faturamentoTotalEmp > 0) {
        let xpBonus = 0;
        for (const edsSede of Object.values(emp.edificiosPorCidade || {})) {
          for (const [edId, nivel] of Object.entries(edsSede || {})) {
            if (!nivel || nivel <= 0) continue;
            const edCorp = EMPRESA_EDIFICIOS_CATALOGO.find((e) => e.id === edId);
            if (edCorp?.efeitos?.xpBonusPorCiclo) xpBonus += edCorp.efeitos.xpBonusPorCiclo * nivel;
          }
        }
        const xpGanho = Math.max(1, Math.round(faturamentoTotalEmp / 1000) + xpBonus);
        ganhosXpEmpresas[emp.id] = xpGanho;

        let novoXp = (emp.xpEmpresa || 0) + xpGanho;
        let novoNivel = emp.nivelEmpresa || 1;
        while (novoXp >= novoNivel * 1000) {
          novoXp -= novoNivel * 1000;
          novoNivel += 1;
        }

        mudancasEmpresas[emp.id] = {
          sedesCofres: sedesCofresAtual,
          xpEmpresa: novoXp,
          nivelEmpresa: novoNivel,
          atualizadoEm: agoraISO,
        };
      }
    }

    // ============ FASE -0.85: CONTRIBUIÇÃO DAS SEDES À CENTRAL ============
    for (const emp of Object.values(empresas)) {
      const sedesArr = Array.isArray(emp.sedes) ? emp.sedes : (emp.sede ? [emp.sede] : []);
      if (sedesArr.length === 0) continue;

      const taxa = Number.isFinite(emp.taxaContribuicaoSede) ? emp.taxaContribuicaoSede : 0.20;
      if (taxa <= 0) continue;

      const sedeCofres = { ...(emp.sedesCofres || {}) };
      let cofreCentral = Number(emp.cofre || 0);
      let contribuido = 0;

      for (const sede of sedesArr) {
        const atual = Number(sedeCofres[sede.id] || 0);
        const envio = Math.round(atual * taxa);
        sedeCofres[sede.id] = atual - envio;
        cofreCentral += envio;
        contribuido += envio;
      }

      if (contribuido > 0) {
        const previa = mudancasEmpresas[emp.id] || {};
        mudancasEmpresas[emp.id] = {
          ...previa,
          sedesCofres: sedeCofres,
          cofre: cofreCentral,
          ultimaContribuicaoSede: contribuido,
          atualizadoEm: agoraISO,
        };
      }
    }

    // ============ FASE -0.8: PAGAR SALÁRIOS DA EQUIPE ============
    for (const emp of Object.values(empresas)) {
      const equipe = Array.isArray(emp.equipe) ? emp.equipe : [];
      if (equipe.length === 0) continue;

      const sedesArr = Array.isArray(emp.sedes) ? emp.sedes : (emp.sede ? [emp.sede] : []);
      if (sedesArr.length === 0) continue;

      const primeiraSede = sedesArr[0];
      const sedeCofres = { ...((mudancasEmpresas[emp.id]?.sedesCofres) || emp.sedesCofres || {}) };
      const cfg = getCfgCargos(emp);

      const salarioTotal = equipe.reduce((s, m) => s + calcularSalarioMembro(m, emp), 0);
      if (salarioTotal <= 0) continue;

      const cofreSede = Number(sedeCofres[primeiraSede.id] || 0);
      const pago = salarioTotal;
      const pendente = 0;
      sedeCofres[primeiraSede.id] = cofreSede - pago;

      // Bonificação anual: a cada N ciclos paga bônus pra cada membro.
      const ticksDesdeCiclo = config?.ticksDesdeCiclo || 0;
      let bonusPago = 0;
      const cicloAnualAgora = (Date.now() / (1000 * 60 * 60)) % cfg.ciclosPorAno;
      const eAnoNovo = (emp.ultimoBonusEmCiclo || 0) + cfg.ciclosPorAno <= (emp.ciclosAcumulados || 0);
      if (eAnoNovo && cfg.bonusAnualPct > 0) {
        const totalBonus = equipe.reduce((s, m) => s + calcularBonusAnual(m, emp), 0);
        const cofreAposSalario = Number(sedeCofres[primeiraSede.id] || 0);
        const pagoBonus = Math.min(totalBonus, cofreAposSalario);
        sedeCofres[primeiraSede.id] = cofreAposSalario - pagoBonus;
        bonusPago = pagoBonus;
      }

      const previa = mudancasEmpresas[emp.id] || {};
      mudancasEmpresas[emp.id] = {
        ...previa,
        sedesCofres: sedeCofres,
        ultimaFolhaSalarial: salarioTotal,
        salarioPendente: pendente,
        ultimoBonusAnual: bonusPago,
        ciclosAcumulados: (emp.ciclosAcumulados || 0) + 1,
        ultimoBonusEmCiclo: eAnoNovo ? (emp.ciclosAcumulados || 0) + 1 : (emp.ultimoBonusEmCiclo || 0),
        atualizadoEm: agoraISO,
      };
    }

    // ============ FASE -0.6: SUBSIDIÁRIAS → EMPRESA-MÃE ============
    const empresasComSubs = Object.values(empresas).filter(
      (e) => Array.isArray(e.subsidiarias) && e.subsidiarias.length > 0
    );
    if (empresasComSubs.length > 0) {
      const idsQueSaoFilhas = new Set();
      for (const e of empresasComSubs) {
        for (const s of e.subsidiarias) idsQueSaoFilhas.add(s.id);
      }
      const folhas = Object.values(empresas).filter(
        (e) => idsQueSaoFilhas.has(e.id) && !(Array.isArray(e.subsidiarias) && e.subsidiarias.length > 0)
      );
      const raizes = Object.values(empresas).filter(
        (e) => idsQueSaoFilhas.has(e.id) && (Array.isArray(e.subsidiarias) && e.subsidiarias.length > 0)
      );

      const pagarParent = (sub) => {
        const taxa = Number.isFinite(sub.taxaSubsidiariaParent) ? sub.taxaSubsidiariaParent : 0.10;
        if (taxa <= 0) return;
        for (const pai of empresasComSubs) {
          if (pai.id === sub.id) continue;
          if (!pai.subsidiarias.some((s) => s.id === sub.id)) continue;

          const previaSub = mudancasEmpresas[sub.id] || {};
          const cofreSubAtual = Number.isFinite(previaSub.cofre) ? previaSub.cofre : Number(sub.cofre || 0);
          if (cofreSubAtual <= 0) continue;
          const envio = Math.round(cofreSubAtual * taxa);
          if (envio <= 0) continue;

          mudancasEmpresas[sub.id] = {
            ...previaSub,
            cofre: cofreSubAtual - envio,
            ultimoEnvioParent: envio,
            atualizadoEm: agoraISO,
          };

          const previaPai = mudancasEmpresas[pai.id] || {};
          const cofrePaiAtual = Number.isFinite(previaPai.cofre) ? previaPai.cofre : Number(pai.cofre || 0);
          mudancasEmpresas[pai.id] = {
            ...previaPai,
            cofre: cofrePaiAtual + envio,
            ultimaReceitaSubsidiarias: (previaPai.ultimaReceitaSubsidiarias || 0) + envio,
            atualizadoEm: agoraISO,
          };
        }
      };

      for (const sub of folhas) pagarParent(sub);
      for (const sub of raizes) pagarParent(sub);
    }

    // ============ FASE -0.4: IA DOS NPCs DE CARGO ============
    for (const emp of Object.values(empresas)) {
      if (emp.falida) continue;

      const previa = mudancasEmpresas[emp.id] || {};
      const sedeCofresLive = { ...(previa.sedesCofres || emp.sedesCofres || {}) };
      const edsPorCidadeLive = { ...(emp.edificiosPorCidade || {}) };
      const cofreCentralLive = Number.isFinite(previa.cofre) ? previa.cofre : Number(emp.cofre || 0);
      const pesquisaAtualLive = previa.pesquisaEmpresa?.pesquisaAtual ?? emp.pesquisaEmpresa?.pesquisaAtual ?? null;
      const tecnologiasLive = previa.pesquisaEmpresa?.tecnologias ?? emp.pesquisaEmpresa?.tecnologias ?? [];

      const ctx = {
        sedeCofres: sedeCofresLive,
        edsPorCidade: edsPorCidadeLive,
        cofreCentral: cofreCentralLive,
        pesquisaAtual: pesquisaAtualLive,
        tecnologias: tecnologiasLive,
        pesquisaIniciar: null,
      };

      let logs = [];
      try {
        logs = executarIaNpc(emp, ctx);
      } catch (e) {
        console.warn("[SimEngine] IA NPC falhou:", e.message);
      }

      if (!logs || logs.length === 0) continue;

      const novasAcoes = [...(emp.ultimasAcoesNpc || []), ...logs].slice(-10);

      mudancasEmpresas[emp.id] = {
        ...previa,
        sedesCofres: sedeCofresLive,
        edificiosPorCidade: edsPorCidadeLive,
        ultimasAcoesNpc: novasAcoes,
        ultimaAcaoNpc: logs[logs.length - 1],
        atualizadoEm: agoraISO,
      };

      if (ctx.pesquisaIniciar) {
        const tec = TECNOLOGIAS.find((t) => t.id === ctx.pesquisaIniciar);
        if (tec) {
          const agora = Date.now();
          const concluiEm = new Date(agora + tec.tempoHoras * 60 * 60 * 1000).toISOString();
          mudancasEmpresas[emp.id].pesquisaEmpresa = {
            tecnologias: tecnologiasLive,
            pesquisaAtual: { id: tec.id, iniciadoEm: new Date(agora).toISOString(), concluiEm },
          };
          mudancasEmpresas[emp.id].cofre = cofreCentralLive - Number(tec.custo || 0);
        }
      }

      for (const l of logs) console.log(`[SimEngine][IA] ${l}`);
    }

    // ============ FASE -0.5: PRODUÇÃO DOS EDIFÍCIOS CORPORATIVOS ============
    for (const emp of Object.values(empresas)) {
      const edsPorCidade = emp.edificiosPorCidade || {};
      const estoqueAtual = { ...(emp.estoqueEmpresa || {}) };
      const origemAtual = { ...(emp.estoqueOrigem || {}) };
      let produziu = false;

      for (const [sedeId, edsSede] of Object.entries(edsPorCidade)) {
        const cidade = cidades[sedeId];
        if (!cidade) continue;

        for (const [edId, nivel] of Object.entries(edsSede || {})) {
          if (!nivel || nivel <= 0) continue;
          const ed = EDIFICIOS_CATALOGO.find((e) => e.id === edId);
          if (!ed || ed.tipo !== "producao") continue;
          const prod = ed.baseProducao + ed.incremento * (nivel - 1);
          if (prod <= 0) continue;

          estoqueAtual[ed.commodityId] = (estoqueAtual[ed.commodityId] || 0) + prod;

          const o = origemAtual[ed.commodityId] || { producao: 0, compra: 0 };
          origemAtual[ed.commodityId] = { ...o, producao: o.producao + prod };

          produziu = true;
        }
      }

      if (produziu) {
        const previa = mudancasEmpresas[emp.id] || {};
        mudancasEmpresas[emp.id] = {
          ...previa,
          estoqueEmpresa: estoqueAtual,
          estoqueOrigem: origemAtual,
          atualizadoEm: agoraISO,
        };
      }
    }

    // ============ FASE -0.3: MANUTENÇÃO + VENDA DOS EDIFÍCIOS CORPORATIVOS ============
    for (const emp of Object.values(empresas)) {
      const edsPorCidade = emp.edificiosPorCidade || {};
      const estoqueEmpresa = { ...(emp.estoqueEmpresa || {}) };
      const estoqueOrigem = { ...(emp.estoqueOrigem || {}) };
      const sedesCofres = { ...(emp.sedesCofres || {}) };

      let mudouSede = false;

      for (const [sedeId, edsSede] of Object.entries(edsPorCidade)) {
        const cidade = cidades[sedeId];
        if (!cidade) continue;

        let cofreSede = Number(sedesCofres[sedeId] || 0);
        let manutencaoTotal = 0;

        for (const [edId, nivel] of Object.entries(edsSede || {})) {
          if (!nivel || nivel <= 0) continue;
          const ed = EDIFICIOS_CATALOGO.find((e) => e.id === edId);
          if (!ed) continue;
          manutencaoTotal += Math.round(ed.baseCusto * 0.02 * nivel);
        }

        if (manutencaoTotal > 0) {
          cofreSede -= manutencaoTotal;
          mudouSede = true;
        }

        let receitaVenda = 0;
        let vendeu = false;
        const novosEstoquesSede = { ...estoqueEmpresa };
        const abaterOrigem = (cmId, qtdVendida) => {
          const o = estoqueOrigem[cmId] || { producao: 0, compra: 0 };
          const totalAtual = (o.producao || 0) + (o.compra || 0);
          if (totalAtual <= 0) return;
          const fracProd = (o.producao || 0) / totalAtual;
          const fracComp = (o.compra || 0) / totalAtual;
          const novaProd = Math.max(0, (o.producao || 0) - qtdVendida * fracProd);
          const novaComp = Math.max(0, (o.compra || 0) - qtdVendida * fracComp);
          estoqueOrigem[cmId] = { producao: novaProd, compra: novaComp };
        };

        for (const [cmId, qtd] of Object.entries(estoqueEmpresa)) {
          if (!qtd || qtd <= 0) continue;

          const precoMerc = comMap[cmId]?.precoAtual || comMap[cmId]?.precoBase || 10;
          const precoVendaSede = precoMerc * 0.85;
          const valorTotal = Math.round(qtd * precoVendaSede);

          cidade.cofre = (cidade.cofre || 0) - valorTotal;
          cidade.estoque = {
            ...(cidade.estoque || {}),
            [cmId]: Number(cidade.estoque?.[cmId] || 0) + qtd,
          };
          receitaVenda += valorTotal;
          delete novosEstoquesSede[cmId];
          abaterOrigem(cmId, qtd);
          vendeu = true;
        }

        if (vendeu) {
          Object.assign(estoqueEmpresa, novosEstoquesSede);
          for (const k of Object.keys(estoqueEmpresa)) {
            if (!novosEstoquesSede[k]) delete estoqueEmpresa[k];
          }
          estoqueEmpresa = novosEstoquesSede;
        }

        if (receitaVenda > 0) {
          cofreSede += receitaVenda;
          mudouSede = true;
        }

        let receitaCorporativa = 0;
        for (const [edId, nivel] of Object.entries(edsSede || {})) {
          if (!nivel || nivel <= 0) continue;
          const edCorp = EMPRESA_EDIFICIOS_CATALOGO.find((e) => e.id === edId);
          if (!edCorp) continue;
          if (edCorp.efeitos?.receitaPassiva) {
            receitaCorporativa += Math.round(edCorp.baseCusto * edCorp.efeitos.receitaPassiva * nivel);
          }
        }
        if (receitaCorporativa > 0) {
          cofreSede += receitaCorporativa;
          mudouSede = true;
        }

        sedesCofres[sedeId] = cofreSede;
      }

      if (mudouSede) {
        const previa = mudancasEmpresas[emp.id] || {};
        mudancasEmpresas[emp.id] = {
          ...previa,
          sedesCofres,
          estoqueEmpresa,
          estoqueOrigem,
          atualizadoEm: agoraISO,
        };
      }
    }

    // ============ FASE 0: PAGAR LUCROS PRIVADOS ============
    const lucrosPorPais = {};

    for (const cidade of Object.values(cidades)) {
      const donos = cidade.edificiosDonos || {};
      const edif = cidade.edificios || {};
      const TAXA_LUCRO = 0.05;

      let lucroTotalCidade = 0;
      for (const [edId, nivel] of Object.entries(edif)) {
        if (!nivel || nivel <= 0) continue;
        const dono = donos[edId];
        if (!dono || dono.tipo !== "privado") continue;
        if (!dono.holderEmail && !dono.paisInvestidor) continue;

        const ed = EDIFICIOS_CATALOGO.find((e) => e.id === edId);
        if (!ed) continue;
        const prod = ed.baseProducao + ed.incremento * (nivel - 1);
        const preco = comMap[ed.commodityId]?.precoAtual || comMap[ed.commodityId]?.precoBase || 10;
        const valorProd = prod * preco;
        const lucro = Math.round(valorProd * TAXA_LUCRO);
        if (lucro <= 0) continue;
        lucroTotalCidade += lucro;

        const paisDono = (() => {
          if (dono.paisInvestidor) return dono.paisInvestidor;
          if (dono.holderEmail) {
            const c = Object.values(cidades).find((x) => x.cargosLocais?.some((cg) => cg.holderEmail === dono.holderEmail));
            if (c) return c.paisId;
            const p = Object.values(paises).find((pp) => pp.cargos?.some((c2) => c2.holderEmail === dono.holderEmail));
            if (p) return p.id;
          }
          return cidade.paisId;
        })();

        if (!lucrosPorPais[paisDono]) lucrosPorPais[paisDono] = 0;
        lucrosPorPais[paisDono] += lucro;
      }

      if (lucroTotalCidade > 0) {
        const pago = Math.min(lucroTotalCidade, cidade.cofre || 0);
        cidade.cofre = (cidade.cofre || 0) - pago;
      }
    }

    for (const [paisId, valor] of Object.entries(lucrosPorPais)) {
      const p = paises[paisId];
      if (p) p.cofre = (p.cofre || 0) + valor;
    }

    // ============ FASE 1: CIDADES → PROVÍNCIA (estoque + cofre) ============
    for (const cidade of Object.values(cidades)) {
      const prov = provs[cidade.provinciaId];
      if (!prov) continue;
      const taxaInd = prov.taxaCidadesIndividual?.[cidade.id];
      const taxaUsar = (taxaInd !== undefined && taxaInd !== null) ? Number(taxaInd) : Number(prov.taxaCidades ?? 10);
      const taxa = taxaUsar / 100;

      const estoqueCidade = { ...(cidade.estoque || {}) };
      const estoqueProv = { ...(prov.estoque || {}) };
      for (const [cid, qtd] of Object.entries(estoqueCidade)) {
        const v = Number(qtd) || 0;
        if (v > 10) {
          const env = Math.round(v * taxa);
          if (env > 0) {
            estoqueCidade[cid] = v - env;
            estoqueProv[cid] = (estoqueProv[cid] || 0) + env;
          }
        }
      }
      cidade.estoque = estoqueCidade;
      prov.estoque = estoqueProv;

      const envioCofre = Math.round((cidade.cofre || 0) * taxa);
      if (envioCofre > 0) {
        cidade.cofre = (cidade.cofre || 0) - envioCofre;
        prov.cofre = (prov.cofre || 0) + envioCofre;
      }
    }

    // ============ FASE 2: PROVÍNCIAS → PAÍS (estoque + cofre) ============
    for (const prov of Object.values(provs)) {
      const pais = paises[prov.paisId];
      if (!pais) continue;
      const taxaInd = pais.taxaProvinciasIndividual?.[prov.id];
      const taxaUsar = (taxaInd !== undefined && taxaInd !== null) ? Number(taxaInd) : Number(pais.taxaProvincias ?? 10);
      const taxa = taxaUsar / 100;

      const estoqueProv = { ...(prov.estoque || {}) };
      const estoquePais = { ...(pais.estoque || {}) };
      for (const [cid, qtd] of Object.entries(estoqueProv)) {
        const v = Number(qtd) || 0;
        if (v > 10) {
          const env = Math.round(v * taxa);
          if (env > 0) {
            estoqueProv[cid] = v - env;
            estoquePais[cid] = (estoquePais[cid] || 0) + env;
          }
        }
      }
      prov.estoque = estoqueProv;
      pais.estoque = estoquePais;

      const envioCofre = Math.round((prov.cofre || 0) * taxa);
      if (envioCofre > 0) {
        prov.cofre = (prov.cofre || 0) - envioCofre;
        pais.cofre = (pais.cofre || 0) + envioCofre;
      }
    }

    // ============ FASE 3: PAÍS DISTRIBUI ÀS PROVÍNCIAS DEFICITÁRIAS ============
    for (const pais of Object.values(paises)) {
      const provsDoPais = Object.values(provs).filter((p) => p.paisId === pais.id);
      if (provsDoPais.length < 2) continue;

      const comIds = new Set();
      for (const p of provsDoPais) for (const k of Object.keys(p.estoque || {})) comIds.add(k);
      for (const k of Object.keys(pais.estoque || {})) comIds.add(k);

      for (const commodityId of comIds) {
        const negativas = provsDoPais.filter((p) => (p.estoque?.[commodityId] || 0) < -5);
        if (negativas.length === 0) continue;

        const estoquePaisDisp = pais.estoque?.[commodityId] || 0;
        const positivas = provsDoPais.filter((p) => (p.estoque?.[commodityId] || 0) > 5);

        let disponivel = 0;
        const doacoes = {};
        if (estoquePaisDisp > 5) {
          const usado = Math.round(estoquePaisDisp * 0.5);
          disponivel += usado;
          pais.estoque = { ...pais.estoque, [commodityId]: estoquePaisDisp - usado };
        }
        for (const p of positivas) {
          const doar = Math.round((p.estoque[commodityId] || 0) * 0.3);
          if (doar > 0) { disponivel += doar; doacoes[p.id] = doar; }
        }
        if (disponivel <= 0) continue;

        const deficitTotal = negativas.reduce((s, p) => s + Math.abs(p.estoque[commodityId] || 0), 0);
        const fator = Math.min(1, disponivel / deficitTotal);

        for (const [id, qtd] of Object.entries(doacoes)) {
          const p = provs[id];
          p.estoque = { ...p.estoque, [commodityId]: (p.estoque[commodityId] || 0) - qtd };
        }
        for (const p of negativas) {
          const receber = Math.round(Math.abs(p.estoque[commodityId] || 0) * fator);
          if (receber <= 0) continue;
          p.estoque = { ...p.estoque, [commodityId]: (p.estoque[commodityId] || 0) + receber };

          const taxaCom = Number(p.taxaComercioProvincias ?? 5) / 100;
          if (taxaCom > 0) {
            const preco = comMap[commodityId]?.precoAtual || comMap[commodityId]?.precoBase || 10;
            const valorRecebido = receber * preco;
            const imposto = Math.round(valorRecebido * taxaCom);
            if (imposto > 0) {
              p.cofre = (p.cofre || 0) + imposto;
            }
          }
        }
      }
    }

    // ============ FASE 4: PROVÍNCIA DISTRIBUI ÀS CIDADES DEFICITÁRIAS ============
    for (const prov of Object.values(provs)) {
      const cids = prov.cidadesIds || [];
      const cidsObj = cids.map((id) => cidades[id]).filter(Boolean);
      if (cidsObj.length < 2) continue;

      const comIds = new Set();
      for (const c of cidsObj) for (const k of Object.keys(c.estoque || {})) comIds.add(k);
      for (const k of Object.keys(prov.estoque || {})) comIds.add(k);

      for (const commodityId of comIds) {
        const negativas = cidsObj.filter((c) => (c.estoque?.[commodityId] || 0) < -5);
        if (negativas.length === 0) continue;

        const estoqueProvDisp = prov.estoque?.[commodityId] || 0;
        const positivas = cidsObj.filter((c) => (c.estoque?.[commodityId] || 0) > 5);

        let disponivel = 0;
        const doacoes = {};
        if (estoqueProvDisp > 5) {
          const usado = Math.round(estoqueProvDisp * 0.5);
          disponivel += usado;
          prov.estoque = { ...prov.estoque, [commodityId]: estoqueProvDisp - usado };
        }
        for (const c of positivas) {
          const doar = Math.round((c.estoque[commodityId] || 0) * 0.3);
          if (doar > 0) { disponivel += doar; doacoes[c.id] = doar; }
        }
        if (disponivel <= 0) continue;

        const deficitTotal = negativas.reduce((s, c) => s + Math.abs(c.estoque[commodityId] || 0), 0);
        const fator = Math.min(1, disponivel / deficitTotal);

        for (const [id, qtd] of Object.entries(doacoes)) {
          const c = cidades[id];
          c.estoque = { ...c.estoque, [commodityId]: (c.estoque[commodityId] || 0) - qtd };
        }
        for (const c of negativas) {
          const receber = Math.round(Math.abs(c.estoque[commodityId] || 0) * fator);
          if (receber <= 0) continue;
          c.estoque = { ...c.estoque, [commodityId]: (c.estoque[commodityId] || 0) + receber };
        }
      }
    }

    // ============ BATCH: grava tudo ============
    let batch = writeBatch(db);
    let ops = 0;
    const commitSe = async () => {
      if (ops >= 400) { await batch.commit(); batch = writeBatch(db); ops = 0; }
    };

    for (const c of Object.values(cidades)) {
      batch.set(doc(db, "sim_cidades", c.id), { cofre: c.cofre || 0, estoque: c.estoque || {} }, { merge: true });
      ops++; await commitSe();
    }
    for (const p of Object.values(provs)) {
      batch.set(doc(db, "sim_provincias", p.id), { cofre: p.cofre || 0, estoque: p.estoque || {} }, { merge: true });
      ops++; await commitSe();
    }
    for (const p of Object.values(paises)) {
      batch.set(doc(db, "sim_paises", p.id), { cofre: p.cofre || 0, estoque: p.estoque || {} }, { merge: true });
      ops++; await commitSe();
    }
    for (const [empId, dados] of Object.entries(mudancasEmpresas)) {
      batch.set(doc(db, "sim_empresas", empId), dados, { merge: true });
      ops++; await commitSe();
    }
    if (ops > 0) await batch.commit();

    if (Object.keys(mudancasEmpresas).length > 0) {
      console.log(`[SimEngine] Ciclo: ${Object.keys(mudancasEmpresas).length} empresa(s) pagaram tributo.`);
    }
  } catch (e) {
    console.warn("[SimEngine] Falha no ciclo econômico:", e.message);
  }
}

async function processarPesquisasEmpresas(agoraISO) {
  try {
    const snap = await getDocs(collection(db, "sim_empresas"));
    let concluidas = 0;
    for (const d of snap.docs) {
      const emp = d.data();
      const pesq = emp.pesquisaEmpresa?.pesquisaAtual;
      if (!pesq || !pesq.id) continue;
      if (!tecConcluida(pesq)) continue;

      const tecnologias = [...(emp.pesquisaEmpresa?.tecnologias || [])];
      if (!tecnologias.includes(pesq.id)) tecnologias.push(pesq.id);

      let bonusTech = 0;
      for (const tId of tecnologias) {
        const tec = TECNOLOGIAS.find((t) => t.id === tId);
        if (!tec) continue;
        if (tec.efeitos?.instrucaoBonus) bonusTech += tec.efeitos.instrucaoBonus;
      }

      let bonusEdificios = 0;
      for (const edsSede of Object.values(emp.edificiosPorCidade || {})) {
        for (const [edId, nivel] of Object.entries(edsSede || {})) {
          if (!nivel || nivel <= 0) continue;
          const edCorp = EMPRESA_EDIFICIOS_CATALOGO.find((e) => e.id === edId);
          if (!edCorp) continue;
          if (edCorp.efeitos?.instrucaoBonus) bonusEdificios += edCorp.efeitos.instrucaoBonus * nivel;
        }
      }

      const bonusTotal = bonusTech + bonusEdificios;

      await setDoc(doc(db, "sim_empresas", d.id), {
        pesquisaEmpresa: {
          tecnologias,
          pesquisaAtual: null,
        },
        instrucaoBonusEmpresa: Math.round(bonusTotal * 100 * 10) / 10,
        atualizadoEm: agoraISO,
      }, { merge: true });

      concluidas++;
    }
    if (concluidas > 0) console.log(`[SimEngine] ${concluidas} pesquisa(s) de empresa concluída(s).`);
  } catch (e) {
    console.warn("[SimEngine] Falha em processarPesquisasEmpresas:", e.message);
  }
}

async function processarPesquisas(agoraISO) {
  try {
    const paisesSnap = await getDocs(collection(db, "sim_paises"));
    let concluidas = 0;

    for (const d of paisesSnap.docs) {
      const p = d.data();
      const pesq = p.pesquisaAtual;
      if (!pesq || !pesq.id) continue;
      if (!tecConcluida(pesq)) continue;

      const tecnologiasAtuais = [...(p.tecnologias || [])];
      if (!tecnologiasAtuais.includes(pesq.id)) {
        tecnologiasAtuais.push(pesq.id);
      }

      await setDoc(doc(db, "sim_paises", d.id), {
        tecnologias: tecnologiasAtuais,
        pesquisaAtual: null,
        ultimaPesquisaConcluida: { id: pesq.id, concluidoEm: agoraISO },
      }, { merge: true });

      await addDoc(collection(db, "sim_historico"), {
        tipo: "pesquisa_concluida",
        paisId: d.id,
        tecnologiaId: pesq.id,
        criadoEm: agoraISO,
      });

      concluidas++;
    }

    if (concluidas > 0) console.log(`[SimEngine] ${concluidas} pesquisa(s) concluída(s).`);
  } catch (e) {
    console.warn("[SimEngine] Falha em processarPesquisas:", e.message);
  }
}

export default SimuladorEngine;
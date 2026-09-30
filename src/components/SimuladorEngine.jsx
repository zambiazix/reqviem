import { useEffect, useRef } from "react";
import { db } from "../firebaseConfig";
import {
  doc, setDoc, getDoc, getDocs, collection, writeBatch, runTransaction, deleteDoc, addDoc,
} from "firebase/firestore";
import { sortearCrise } from "../data/simCrises";
import { normalizarInvestimentos, custoManutencaoCidade, custoManutencaoProvincia, custoManutencaoPais } from "../data/investimentos";
import { calcularEstoqueFinal, calcularDeficitTotal, calcularExcedenteTotal } from "../data/economia";
import { getCustoLeis, getFatoresLeis, resolverLeiEfetiva } from "../data/leis";

const TICK_MS_DEFAULT = 60 * 60 * 1000;
const PRESENCE_INTERVAL = 30 * 1000;
const CHECK_INTERVAL = 60 * 1000;
const VIVO_MS = 90 * 1000;
const LOCK_TIMEOUT_MS = 2 * 60 * 1000;

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
      for (const [id, qtd] of Object.entries(c.producao || {})) {
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
      for (const [id, qtd] of Object.entries(cidade.producao || {})) {
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
      const saldo = valorProd - valorCons;
      const delta = (saldo / 2000)
        + ((cidade.infraestrutura || 50) / 100)
        - ((cidade.criminalidade || 20) / 100)
        - ((cidade.radicalizacao || 20) / 100);
      const novaPros = Math.max(0, Math.min(100, (cidade.prosperidade || 50) + delta * 1.5));
      const radDelta = (50 - novaPros) / 200;
      const novaRad = Math.max(0, Math.min(100, (cidade.radicalizacao || 20) + radDelta));
      const novaLeal = Math.max(0, Math.min(100, (cidade.lealdade || 60) + delta * 0.5));

      mudancas.cidades[cidade.id] = {
        ...cidade,
        prosperidade: Math.round(novaPros * 10) / 10,
        radicalizacao: Math.round(novaRad * 10) / 10,
        lealdade: Math.round(novaLeal * 10) / 10,
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
        atualizadoEm: agoraISO,
      };
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
      const estoqueFinal = calcularEstoqueFinal(cidade, commodities);
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
  }

  // ---- COFRE ----
  if (!config.congelamentos?.cofre) {
    for (const pais of Object.values(paises)) {
      const leis = pais.leis || {};
      const popTotal = pais.popTotal || 0;
      const cidadesDoPais = Object.values(cidades).filter((c) => c.paisId === pais.id);
      const producaoTotal = cidadesDoPais.reduce((s, c) => {
        const prod = c.producao || {};
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

      let cofreFinal = Math.round(novoCofre);
      let criseCofre = false;
      if (cofreFinal < 0) {
        cofreFinal = 0;
        criseCofre = true;
      }

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

      const fatorInvest = 1 + inv.educacao * 0.15;
      const fatorLei = fatores.educacao || 1;
      const velocidade = INSTRUCAO_VELOCIDADE_BASE * fatorInvest * fatorLei;
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

      for (const [tipo, pop] of Object.entries(pops)) {
        let leal = pop.lealdade ?? 50;
        let rad = pop.radicalizacao ?? 20;

        const fatorLeal =
          (fatores[`lealdade_${tipo}`] || 1) *
          (fatores.lealdade_pops || 1);
        const fatorRad =
          (fatores[`radicalizacao_${tipo}`] || 1) *
          (fatores.radicalizacao_pops || 1);

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
      let novoHumor = (ig.humor || 60) + (lealMedia - (ig.humor || 60)) * 0.1;
      let novoPoder = ig.poder || 50;
      if (novoHumor > 60) novoPoder += 0.2;
      else if (novoHumor < 40) novoPoder -= 0.2;

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
  // ---- EXPIRAR NEGOCIAÇÕES ----
  try {
    const negSnap = await getDocs(collection(db, "sim_negociacoes"));
    const agoraMs = Date.now();
    const LIMITE = 6 * 60 * 60 * 1000;
    for (const d of negSnap.docs) {
      const n = d.data();
      if (n.status !== "pendente") continue;
      const t = n.criadoEm ? new Date(n.criadoEm).getTime() : 0;
      if (t && agoraMs - t > LIMITE) {
        await setDoc(doc(db, "sim_negociacoes", d.id), { status: "expirada", respondidoEm: agoraISO }, { merge: true });
      }
    }
  } catch (e) {
    console.warn("[SimEngine] Falha ao expirar negociações:", e.message);
  }

  await processarFinanciamentos(agoraISO);

  await setDoc(doc(db, "sim_config", "mundo"), {
    ultimoTick: agoraISO,
    tickEmAndamento: false,
    tickIniciadoEm: null,
    ultimoRelatorio: relatorio,
  }, { merge: true });

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

export default SimuladorEngine;
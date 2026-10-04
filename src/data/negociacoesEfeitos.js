import { db } from "../firebaseConfig";
import { doc, setDoc, addDoc, collection } from "firebase/firestore";
import { calcularFinanciamento, gerarIdFinanciamento, PARCELAS_FINANCIAMENTO, TAXA_JUROS_FINANCIAMENTO } from "./financiamentos";

export function resolverPaisDeEntidade(nivel, id, { paises, cidades, provincias }) {
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

export async function aplicarEfeitosNegociacao(n, { paises, cidades, commodities, igs, provincias }) {
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
    await setDoc(doc(db, "sim_paises", origem.id), { cofre: (origem.cofre || 0) - valor }, { merge: true });
    await setDoc(doc(db, "sim_paises", destino.id), { cofre: (destino.cofre || 0) + valor }, { merge: true });
    origem.cofre = (origem.cofre || 0) - valor;
    destino.cofre = (destino.cofre || 0) + valor;
  };

  const transferirCommodity = async (origem, destino, pacote, motivo) => {
    if (!pacote || !pacote.id || !pacote.quantidade || pacote.quantidade <= 0) return;
    const cid = pacote.id;
    const qtdTotal = Number(pacote.quantidade);

    const cidadesOrig = Object.values(cidades).filter((c) => c.paisId === origem.id);
    const cidadesDest = Object.values(cidades).filter((c) => c.paisId === destino.id);

    let disponivelTotal = 0;
    for (const c of cidadesOrig) disponivelTotal += Number(c.estoque?.[cid] || 0);

    if (disponivelTotal < qtdTotal) {
      erros.push(`${motivo}: ${origem.nome} não tem ${qtdTotal}x ${cid} (tem ${disponivelTotal}).`);
      return;
    }

    let restante = qtdTotal;
    for (const c of cidadesOrig) {
      if (restante <= 0) break;
      const est = { ...(c.estoque || {}) };
      const disp = Number(est[cid] || 0);
      const tirar = Math.min(disp, restante);
      if (tirar > 0) {
        est[cid] = disp - tirar;
        restante -= tirar;
        await setDoc(doc(db, "sim_cidades", c.id), { estoque: est }, { merge: true });
      }
    }

    if (cidadesDest.length > 0) {
      const porCidade = qtdTotal / cidadesDest.length;
      for (const c of cidadesDest) {
        const est = { ...(c.estoque || {}) };
        est[cid] = Number(est[cid] || 0) + porCidade;
        await setDoc(doc(db, "sim_cidades", c.id), { estoque: est }, { merge: true });
      }
    } else {
      const estoqueDest = { ...(destino.estoque || {}) };
      estoqueDest[cid] = Number(estoqueDest[cid] || 0) + qtdTotal;
      await setDoc(doc(db, "sim_paises", destino.id), { estoque: estoqueDest }, { merge: true });
    }
  };

  const reduzirPoderIG = async (pacote, motivo) => {
    if (!pacote || !pacote.id || !pacote.valor || pacote.valor <= 0) return;
    const ig = igs[pacote.id];
    if (!ig) {
      erros.push(`${motivo}: Grupo de Interesse ${pacote.id} não encontrado.`);
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
        await setDoc(doc(db, "sim_paises", pDe.id), { cofre: (pDe.cofre || 0) - principal }, { merge: true });
        await setDoc(doc(db, "sim_paises", pPara.id), { cofre: (pPara.cofre || 0) + principal }, { merge: true });
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

  const taxaIntl = Number(pPara.impostoInternacional ?? 10);
  const impostoPara = Math.min(80, (n.impostoAlvo || 0) + taxaIntl);
  const impostoDe = 0;

  const aplicarImposto = (pacote, taxa) => {
    if (!pacote || !pacote.quantidade) return pacote;
    const qtdEfetiva = Math.max(0, Math.round(pacote.quantidade * (1 - taxa / 100)));
    return { ...pacote, quantidade: qtdEfetiva, quantidadeOriginal: pacote.quantidade, impostoAplicado: taxa };
  };

  await transferirCommodity(pDe, pPara, aplicarImposto(oferta.commodity, impostoPara), "Oferta de commodity");
  await transferirCommodity(pPara, pDe, aplicarImposto(pedido.commodity, impostoDe), "Pedido de commodity");

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
    respondidoPor: n.respondidoPor || "PJ",
    erros: erros.length > 0 ? erros : null,
    criadoEm: new Date().toISOString(),
  });

  return erros;
}
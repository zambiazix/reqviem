export const TIPOS_NEGOCIACAO = [
  {
    id: "concessao",
    nome: "Concessão",
    icone: "🤝",
    cor: "#3b82f6",
    desc: "Cede produção, dinheiro ou item em troca de algo.",
    bonusChance: 5,
  },
  {
    id: "financiamento",
    nome: "Financiamento",
    icone: "💰",
    cor: "#fbbf24",
    desc: "Empréstimo que será pago em ticks futuros com juros.",
    bonusChance: 0,
  },
  {
    id: "corrupcao",
    nome: "Corrupção",
    icone: "🕶️",
    cor: "#a855f7",
    desc: "Suborno direto. Alta chance, mas mancha reputação.",
    bonusChance: 15,
  },
  {
    id: "cederPoder",
    nome: "Ceder Poder",
    icone: "🏛️",
    cor: "#ef4444",
    desc: "Promete reduzir poder de um IG em troca de algo.",
    bonusChance: 10,
  },
];

export const calcularChanceNegociacao = ({ tipo, oferta, pedido, commodities, impostoAlvo }) => {
  const t = TIPOS_NEGOCIACAO.find((x) => x.id === tipo);
  const base = 50;
  const bonusTipo = t?.bonusChance || 0;

  const valorOferta = calcularValorPacote(oferta, commodities);
  const valorPedido = calcularValorPacote(pedido, commodities);

  const total = valorOferta + valorPedido;
  let bonusValor = 0;
  if (total > 0) {
    bonusValor = ((valorOferta - valorPedido) / total) * 40;
  }

  let bonusImposto = 0;
  if (typeof impostoAlvo === "number" && impostoAlvo > 0 && (pedido?.dinheiro || pedido?.commodity)) {
    bonusImposto = -Math.round(impostoAlvo * 0.4);
  }

  const chance = Math.max(5, Math.min(95, base + bonusTipo + bonusValor + bonusImposto));
  return {
    chance: Math.round(chance),
    valorOferta,
    valorPedido,
    bonusTipo,
    bonusValor: Math.round(bonusValor),
    bonusImposto,
    impostoAlvo: impostoAlvo || 0,
  };
};

export const calcularValorPacote = (pacote, commodities) => {
  if (!pacote) return 0;
  let total = 0;
  if (pacote.dinheiro) total += Number(pacote.dinheiro) || 0;
  if (pacote.commodity) {
    const c = commodities[pacote.commodity.id];
    const preco = c?.precoAtual || c?.precoBase || 10;
    total += (Number(pacote.commodity.quantidade) || 0) * preco;
  }
  if (pacote.poderIG) {
    total += (Number(pacote.poderIG.valor) || 0) * 1000;
  }
  if (pacote.concessaoProducao) {
    total += (Number(pacote.concessaoProducao.percentual) || 0) * 50;
  }
  return Math.round(total);
};

export const gerarIdNegociacao = () =>
  `neg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

export const TICK_EXPIRACAO_NEGOCIACAO = 6 * 10 * 60 * 1000;
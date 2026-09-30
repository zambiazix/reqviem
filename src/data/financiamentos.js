export const TAXA_JUROS_FINANCIAMENTO = 0.10;
export const PARCELAS_FINANCIAMENTO = 5;
export const TICK_INTERVALO_MS = 60 * 60 * 1000;

export const calcularFinanciamento = (valorPrincipal, parcelas, taxaJuros) => {
  const n = parcelas || PARCELAS_FINANCIAMENTO;
  const taxa = typeof taxaJuros === "number" ? taxaJuros : TAXA_JUROS_FINANCIAMENTO;
  const total = Math.round((valorPrincipal || 0) * (1 + taxa));
  const parcela = Math.round(total / n);
  return {
    total,
    parcela,
    parcelas: n,
    juros: total - (valorPrincipal || 0),
  };
};

export const gerarIdFinanciamento = () =>
  `fin_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
export const calcularBalanco = (entidade, commodities) => {
  const prod = entidade.producao || {};
  const cons = entidade.consumo || {};
  const estoque = entidade.estoque || {};
  const resultado = {};

  const todosIds = new Set([
    ...Object.keys(prod),
    ...Object.keys(cons),
    ...Object.keys(estoque),
  ]);

  let valorProduzido = 0;
  let valorConsumido = 0;
  let valorEstoque = 0;

  for (const id of todosIds) {
    const preco = commodities[id]?.precoAtual || commodities[id]?.precoBase || 10;
    const p = Number(prod[id]) || 0;
    const c = Number(cons[id]) || 0;
    const e = Number(estoque[id]) || 0;
    const saldo = p - c;
    const estoqueFinal = e + saldo;

    resultado[id] = {
      produzido: p,
      consumido: c,
      saldo,
      estoque: estoqueFinal,
      preco,
      valorSaldo: saldo * preco,
    };

    valorProduzido += p * preco;
    valorConsumido += c * preco;
    valorEstoque += estoqueFinal * preco;
  }

  return {
    detalhes: resultado,
    valorProduzido: Math.round(valorProduzido),
    valorConsumido: Math.round(valorConsumido),
    valorEstoque: Math.round(valorEstoque),
    saldoValor: Math.round(valorProduzido - valorConsumido),
  };
};

export const calcularEstoqueFinal = (entidade, commodities) => {
  const prod = entidade.producao || {};
  const cons = entidade.consumo || {};
  const estoque = { ...(entidade.estoque || {}) };

  const todosIds = new Set([...Object.keys(prod), ...Object.keys(cons)]);

  for (const id of todosIds) {
    const saldo = (Number(prod[id]) || 0) - (Number(cons[id]) || 0);
    estoque[id] = (Number(estoque[id]) || 0) + saldo;
  }

  return estoque;
};

export const calcularDeficitTotal = (estoque) => {
  let total = 0;
  for (const qtd of Object.values(estoque || {})) {
    if (Number(qtd) < 0) total += Math.abs(Number(qtd));
  }
  return total;
};

export const calcularExcedenteTotal = (estoque) => {
  let total = 0;
  for (const qtd of Object.values(estoque || {})) {
    if (Number(qtd) > 0) total += Number(qtd);
  }
  return total;
};
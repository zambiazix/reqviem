export const INVESTIMENTO_MAX = 10;

export const INVESTIMENTOS_CATALOGO = [
  { id: "infraestrutura", nome: "Infraestrutura", icone: "🏗️", cor: "#5a6b7a", desc: "Estradas, pontes, transporte. Aumenta produção." },
  { id: "educacao",       nome: "Educação",       icone: "📚", cor: "#a855f7", desc: "Escolas e universidades. Reduz radicalização." },
  { id: "saude",          nome: "Saúde",          icone: "🏥", cor: "#4caf50", desc: "Hospitais e clínicas. Aumenta lealdade." },
  { id: "seguranca",      nome: "Segurança",      icone: "🛡️", cor: "#3b82f6", desc: "Guarda e policiamento. Reduz criminalidade." },
  { id: "cultura",        nome: "Cultura",        icone: "🎭", cor: "#f472b6", desc: "Teatros e festivais. Reduz radicalização e aumenta lealdade." },
  { id: "pesquisa",       nome: "Pesquisa",       icone: "🔬", cor: "#10b981", desc: "Laboratórios. Bônus passivo de produção." },
  { id: "militar",        nome: "Militar",        icone: "⚔️", cor: "#8b2f2f", desc: "Defesa e exército. Placeholder para guerras." },
];

export const INVESTIMENTOS_DEFAULT = {
  infraestrutura: 3,
  educacao: 3,
  saude: 3,
  seguranca: 3,
  cultura: 1,
  pesquisa: 1,
  militar: 1,
};

export const normalizarInvestimentos = (inv) => {
  const base = { ...INVESTIMENTOS_DEFAULT };
  if (!inv || typeof inv !== "object") return base;
  for (const id of Object.keys(base)) {
    base[id] = Math.max(0, Math.min(INVESTIMENTO_MAX, Number(inv[id]) || 0));
  }
  return base;
};

export const custoUp = (nivelAtual) => {
  if (nivelAtual >= INVESTIMENTO_MAX) return 0;
  return Math.round(Math.pow(5, nivelAtual) * 100);
};

export const custoManutencaoCidade = (nivel) => Math.round((Number(nivel) || 0) * 200);
export const custoManutencaoProvincia = (nivel) => Math.round((Number(nivel) || 0) * 400);
export const custoManutencaoPais = (nivel) => Math.round((Number(nivel) || 0) * 800);

export const totalManutencao = (investimentos, multiplicador = 1) => {
  if (!investimentos) return 0;
  return Object.values(investimentos).reduce((s, v) => s + (Number(v) || 0), 0) * 200 * multiplicador;
};

export const custoTotalInvestimentos = (investimentos) => {
  if (!investimentos) return 0;
  return Object.values(investimentos).reduce((s, v) => {
    const nivel = Number(v) || 0;
    let soma = 0;
    for (let i = 0; i < nivel; i++) soma += custoUp(i);
    return s + soma;
  }, 0);
};
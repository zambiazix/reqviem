export const CATEGORIAS_EMPRESA = [
  { id: "tecnologia",   nome: "Tecnologia",   icone: "🔬", cor: "#5a6b7a", impostoExtra: 0.005, desc: "Pesquisa, automação, ciborgues, telecom." },
  { id: "armamento",    nome: "Armamento",    icone: "⚔️", cor: "#8b2f2f", impostoExtra: 0.010, desc: "Armas, veículos militares, munição." },
  { id: "agricultura",  nome: "Agricultura",  icone: "🌾", cor: "#4a6b3a", impostoExtra: 0.003, desc: "Alimentos, grãos, pecuária, insumos rurais." },
  { id: "mineracao",    nome: "Mineração",    icone: "⛏️", cor: "#8b7355", impostoExtra: 0.006, desc: "Metais, carvão, pedras preciosas, pyridium bruto." },
  { id: "energia",      nome: "Energia",      icone: "⚡", cor: "#c9a961", impostoExtra: 0.007, desc: "Vapor, eletricidade, refinamento de pyridium." },
  { id: "transporte",   nome: "Transporte",   icone: "🚂", cor: "#b8945a", impostoExtra: 0.005, desc: "Ferrovias, navios, cargas, correios." },
  { id: "midia",        nome: "Mídia",        icone: "📰", cor: "#a855f7", impostoExtra: 0.004, desc: "Jornais, rádio, propaganda, propaganda política." },
  { id: "financeiro",   nome: "Financeiro",   icone: "💰", cor: "#fbbf24", impostoExtra: 0.008, desc: "Bancos, empréstimos, investimentos, seguros." },
  { id: "quimico",      nome: "Químico",      icone: "⚗️", cor: "#10b981", impostoExtra: 0.007, desc: "Ácidos, corantes, explosivos, solventes." },
  { id: "farmaceutico", nome: "Farmacêutico", icone: "💊", cor: "#22c55e", impostoExtra: 0.005, desc: "Medicamentos, remédios auricos, estimulantes." },
  { id: "luxo",         nome: "Luxo",         icone: "💎", cor: "#c9a961", impostoExtra: 0.009, desc: "Joias, roupas finas, perfumes, arte." },
  { id: "construcao",   nome: "Construção",   icone: "🏗️", cor: "#b8945a", impostoExtra: 0.003, desc: "Obras, engenharia, urbanização, imóveis." },
];

export const getCategoriaEmpresa = (id) =>
  CATEGORIAS_EMPRESA.find((c) => c.id === id) || null;

export const tributoExtraCategorias = (categorias) => {
  if (!Array.isArray(categorias)) return 0;
  return categorias.reduce((s, id) => {
    const cat = getCategoriaEmpresa(id);
    return s + (cat?.impostoExtra || 0);
  }, 0);
};

export const tributoBasePorTamanho = (categoria) =>
  categoria === "$$$" ? 0.05 : categoria === "$$" ? 0.03 : 0.01;

export const calcularTributoEmpresa = (emp) => {
  const base = tributoBasePorTamanho(emp?.categoria);
  const extra = tributoExtraCategorias(emp?.categorias);
  return base + extra;
};

export const calcularPontosEmpresa = (emp, totalEdificios = 0) => {
  const valor = Number(emp?.valor || 0);
  const nivel = Number(emp?.nivelEmpresa || 1);
  const edif = Number(totalEdificios || 0);
  const sedes = Array.isArray(emp?.sedes) ? emp.sedes.length : 0;
  return (valor / 10000) + (nivel * 2) + edif + (sedes * 3);
};

export const categoriaAutomaticaEmpresa = (emp, totalEdificios = 0) => {
  const p = calcularPontosEmpresa(emp, totalEdificios);
  if (p >= 200) return "$$$";
  if (p >= 20) return "$$";
  return "$";
};

export const categoriaEfetivaEmpresa = (emp, totalEdificios = 0) => {
  if (emp?.categoriaModo === "manual" && emp?.categoriaOverride) {
    return emp.categoriaOverride;
  }
  return categoriaAutomaticaEmpresa(emp, totalEdificios);
};

export const contarEdificiosEmpresa = (emp) => {
  let t = 0;
  for (const eds of Object.values(emp?.edificiosPorCidade || {})) {
    for (const [_, nivel] of Object.entries(eds || {})) {
      if (nivel > 0) t += Number(nivel) || 0;
    }
  }
  return t;
};
export const EMPRESA_EDIFICIOS_CATALOGO = [
  // ── UNIVERSAL (qualquer empresa) ──
  { id: "sede_corporativa",   nome: "Sede Corporativa",   icone: "🏢", cor: "#22c55e", desc: "Aumenta instrução efetiva e dá XP extra por ciclo.", ramo: null, requerTech: "telegrafo",          baseCusto: 15000, fatorCusto: 1.6, efeitos: { instrucaoBonus: 3, xpBonusPorCiclo: 200 } },
  { id: "banco_corporativo",  nome: "Banco Corporativo",  icone: "🏦", cor: "#fbbf24", desc: "Receita passiva por ciclo sobre o valor da empresa.", ramo: null, requerTech: "siderurgia_avancada", baseCusto: 20000, fatorCusto: 1.6, efeitos: { receitaPassiva: 0.05 } },
  { id: "centro_pd",          nome: "Centro de P&D",      icone: "🔬", cor: "#a855f7", desc: "Acelera pesquisas da empresa em até 80%.",            ramo: null, requerTech: "industria_quimica",    baseCusto: 25000, fatorCusto: 1.6, efeitos: { aceleracaoPesquisa: 0.10 } },

  // ── TECNOLOGIA ──
  { id: "lab_avancado",       nome: "Laboratório Avançado",      icone: "🧪", cor: "#5a6b7a", desc: "Acelera pesquisas da empresa.",         ramo: "tecnologia",   requerTech: "industria_quimica", baseCusto: 18000, fatorCusto: 1.6, efeitos: { aceleracaoPesquisa: 0.08, instrucaoBonus: 2 } },
  { id: "fabrica_automatos",  nome: "Fábrica de Autômatos",      icone: "🤖", cor: "#5a6b7a", desc: "Receita passiva alta por ciclo.",       ramo: "tecnologia",   requerTech: "automatos",          baseCusto: 28000, fatorCusto: 1.6, efeitos: { receitaPassiva: 0.10 } },

  // ── ARMAMENTO ──
  { id: "arsenal_corp",       nome: "Arsenal Corporativo",        icone: "🔫", cor: "#8b2f2f", desc: "Receita passiva por ciclo.",            ramo: "armamento",    requerTech: "siderurgia_avancada", baseCusto: 22000, fatorCusto: 1.6, efeitos: { receitaPassiva: 0.10 } },
  { id: "fabrica_veiculos",   nome: "Fábrica de Veículos de Guerra", icone: "🚜", cor: "#8b2f2f", desc: "Receita passiva alta.",              ramo: "armamento",    requerTech: "automatos",          baseCusto: 30000, fatorCusto: 1.6, efeitos: { receitaPassiva: 0.12 } },

  // ── AGRICULTURA ──
  { id: "fazenda_corp",       nome: "Fazenda Corporativa",        icone: "🌾", cor: "#4a6b3a", desc: "Receita passiva por ciclo.",            ramo: "agricultura",  requerTech: null,                 baseCusto: 8000,  fatorCusto: 1.6, efeitos: { receitaPassiva: 0.06 } },
  { id: "celeiro_corp",       nome: "Celeiro Industrial",         icone: "🏭", cor: "#4a6b3a", desc: "XP extra por ciclo.",                   ramo: "agricultura",  requerTech: null,                 baseCusto: 12000, fatorCusto: 1.6, efeitos: { receitaPassiva: 0.05, xpBonusPorCiclo: 100 } },

  // ── MINERAÇÃO ──
  { id: "mina_corp",          nome: "Mina Corporativa",           icone: "⛏️", cor: "#8b7355", desc: "Receita passiva por ciclo.",            ramo: "mineracao",    requerTech: "siderurgia_avancada", baseCusto: 18000, fatorCusto: 1.6, efeitos: { receitaPassiva: 0.10 } },
  { id: "refinaria_corp",     nome: "Refinaria de Metais",        icone: "🔥", cor: "#8b7355", desc: "Receita passiva alta.",                 ramo: "mineracao",    requerTech: "industria_quimica",    baseCusto: 24000, fatorCusto: 1.6, efeitos: { receitaPassiva: 0.12 } },

  // ── ENERGIA ──
  { id: "usina_vapor",        nome: "Usina a Vapor",              icone: "💨", cor: "#c9a961", desc: "Receita passiva por ciclo.",            ramo: "energia",      requerTech: null,                 baseCusto: 12000, fatorCusto: 1.6, efeitos: { receitaPassiva: 0.07 } },
  { id: "reator_pyridium",    nome: "Reator de Pyridium",         icone: "⚡", cor: "#c9a961", desc: "Receita passiva alta.",                 ramo: "energia",      requerTech: "eletricidade",       baseCusto: 32000, fatorCusto: 1.6, efeitos: { receitaPassiva: 0.15 } },

  // ── TRANSPORTE ──
  { id: "ferrovia_corp",      nome: "Ferrovia Corporativa",       icone: "🚂", cor: "#b8945a", desc: "Receita passiva por ciclo.",            ramo: "transporte",   requerTech: "ferrovia",           baseCusto: 22000, fatorCusto: 1.6, efeitos: { receitaPassiva: 0.10 } },
  { id: "porto_corp",         nome: "Porto Comercial",            icone: "⚓", cor: "#b8945a", desc: "Receita passiva por ciclo.",            ramo: "transporte",   requerTech: null,                 baseCusto: 18000, fatorCusto: 1.6, efeitos: { receitaPassiva: 0.08 } },

  // ── MÍDIA ──
  { id: "jornal_corp",        nome: "Jornal Corporativo",         icone: "📰", cor: "#a855f7", desc: "Receita passiva + instrução.",          ramo: "midia",        requerTech: "telegrafo",          baseCusto: 10000, fatorCusto: 1.6, efeitos: { receitaPassiva: 0.04, instrucaoBonus: 1 } },
  { id: "estudio_radio",      nome: "Estúdio de Rádio",           icone: "📻", cor: "#a855f7", desc: "Receita passiva + instrução alta.",     ramo: "midia",        requerTech: "eletricidade",       baseCusto: 20000, fatorCusto: 1.6, efeitos: { receitaPassiva: 0.06, instrucaoBonus: 2 } },

  // ── FINANCEIRO ──
  { id: "banco_invest",       nome: "Banco de Investimentos",     icone: "📈", cor: "#fbbf24", desc: "Receita passiva alta.",                 ramo: "financeiro",   requerTech: "siderurgia_avancada", baseCusto: 30000, fatorCusto: 1.6, efeitos: { receitaPassiva: 0.12 } },
  { id: "seguradora_corp",    nome: "Seguradora Corporativa",     icone: "🛡️", cor: "#fbbf24", desc: "Receita passiva por ciclo.",            ramo: "financeiro",   requerTech: null,                 baseCusto: 16000, fatorCusto: 1.6, efeitos: { receitaPassiva: 0.08 } },

  // ── QUÍMICO ──
  { id: "lab_quimico",        nome: "Laboratório Químico",        icone: "⚗️", cor: "#10b981", desc: "Receita passiva por ciclo.",            ramo: "quimico",      requerTech: "industria_quimica",    baseCusto: 16000, fatorCusto: 1.6, efeitos: { receitaPassiva: 0.08 } },
  { id: "fabrica_explosivos", nome: "Fábrica de Explosivos",      icone: "💥", cor: "#10b981", desc: "Receita passiva alta.",                 ramo: "quimico",      requerTech: "industria_quimica",    baseCusto: 24000, fatorCusto: 1.6, efeitos: { receitaPassiva: 0.10 } },

  // ── FARMACÊUTICO ──
  { id: "lab_farma",          nome: "Laboratório Farmacêutico",   icone: "💊", cor: "#22c55e", desc: "Receita passiva + instrução.",          ramo: "farmaceutico", requerTech: "industria_quimica",    baseCusto: 18000, fatorCusto: 1.6, efeitos: { receitaPassiva: 0.08, instrucaoBonus: 1 } },
  { id: "fabrica_estimulantes", nome: "Fábrica de Estimulantes",  icone: "🧬", cor: "#22c55e", desc: "Receita passiva alta.",                 ramo: "farmaceutico", requerTech: "industria_quimica",    baseCusto: 22000, fatorCusto: 1.6, efeitos: { receitaPassiva: 0.10 } },

  // ── LUXO ──
  { id: "atelier_luxo",       nome: "Ateliê de Luxo",             icone: "🎩", cor: "#c9a961", desc: "Receita passiva por ciclo.",            ramo: "luxo",         requerTech: null,                 baseCusto: 14000, fatorCusto: 1.6, efeitos: { receitaPassiva: 0.10 } },
  { id: "joalheria_corp",     nome: "Joalheria Corporativa",      icone: "💎", cor: "#c9a961", desc: "Receita passiva alta.",                 ramo: "luxo",         requerTech: null,                 baseCusto: 20000, fatorCusto: 1.6, efeitos: { receitaPassiva: 0.12 } },

  // ── CONSTRUÇÃO ──
  { id: "construtora_corp",   nome: "Construtora Corporativa",    icone: "🏗️", cor: "#b8945a", desc: "Receita passiva por ciclo.",            ramo: "construcao",   requerTech: "siderurgia_avancada", baseCusto: 16000, fatorCusto: 1.6, efeitos: { receitaPassiva: 0.08 } },
  { id: "incorporadora_corp", nome: "Incorporadora Corporativa",  icone: "🏙️", cor: "#b8945a", desc: "Receita passiva alta (imóveis).",       ramo: "construcao",   requerTech: null,                 baseCusto: 22000, fatorCusto: 1.6, efeitos: { receitaPassiva: 0.10 } },
];

export const CATEGORIA_CORPORATIVO = { nome: "Corporativo", icone: "🏢", cor: "#22c55e" };

export const custoEmpresaEdificio = (ed, nivelAtual) =>
  Math.round(ed.baseCusto * Math.pow(ed.fatorCusto || 1.6, Math.max(0, nivelAtual)));

export const edificiosDisponiveisParaEmpresa = (emp) => {
  const cats = emp?.categorias || [];
  return EMPRESA_EDIFICIOS_CATALOGO.filter((ed) => !ed.ramo || cats.includes(ed.ramo));
};
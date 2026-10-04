// Acessos possíveis: "visao" | "edificios" | "pesquisa" | "cofre" | "equipe" | "config"
export const ACESSOS_LABEL = {
  visao: "📊 Visão",
  edificios: "🏗️ Edifícios",
  pesquisa: "🔬 Pesquisa",
  cofre: "💰 Cofre",
  equipe: "👥 Equipe",
  config: "⚙️ Config",
};

export const CARGOS_EMPRESA = [
  // ── UNIVERSAL (toda empresa) ──
  { id: "ceo",       nome: "CEO",       icone: "👑", desc: "Diretor-executivo. Acesso total.",                   salarioBase: 800,  tamanhos: ["$", "$$", "$$$"], ramo: null, acessos: ["visao","edificios","pesquisa","cofre","equipe","config"] },
  { id: "cfo",       nome: "CFO",       icone: "💼", desc: "Diretor financeiro. Cuida do cofre.",                salarioBase: 600,  tamanhos: ["$", "$$", "$$$"], ramo: null, acessos: ["visao","cofre"] },
  { id: "gerente",   nome: "Gerente",   icone: "📋", desc: "Gerente operacional. Cuida dos edifícios.",          salarioBase: 400,  tamanhos: ["$", "$$", "$$$"], ramo: null, acessos: ["visao","edificios"] },

  // ── $$ E $$$ ──
  { id: "coo",       nome: "COO",       icone: "🏭", desc: "Diretor de operações. Supervisiona P&D.",            salarioBase: 1000, tamanhos: ["$$", "$$$"],      ramo: null, acessos: ["visao","edificios","pesquisa"] },
  { id: "cto",       nome: "CTO",       icone: "🧠", desc: "Diretor de tecnologia. Lidera a pesquisa.",         salarioBase: 1200, tamanhos: ["$$", "$$$"],      ramo: null, acessos: ["visao","pesquisa","edificios"] },

  // ── SÓ $$$ ──
  { id: "chairman",  nome: "Chairman",  icone: "🏛️", desc: "Presidente do conselho. Acesso total.",             salarioBase: 2500, tamanhos: ["$$$"],            ramo: null, acessos: ["visao","edificios","pesquisa","cofre","equipe","config"] },
  { id: "head_hr",   nome: "Head de RH", icone: "👥", desc: "Chefe de pessoal. Gerencia a equipe.",             salarioBase: 900,  tamanhos: ["$$$"],            ramo: null, acessos: ["visao","equipe"] },
  { id: "secretario",nome: "Secretário", icone: "🗂️", desc: "Secretário-executivo. Vê tudo, edita pouco.",      salarioBase: 500,  tamanhos: ["$$", "$$$"],      ramo: null, acessos: ["visao"] },

  // ── RAMO: TECNOLOGIA ──
  { id: "eng_chefe", nome: "Engenheiro-Chefe", icone: "⚙️", desc: "Lidera a engenharia. Acelera pesquisa.",       salarioBase: 700,  tamanhos: ["$", "$$", "$$$"], ramo: "tecnologia", acessos: ["visao","pesquisa","edificios"] },

  // ── RAMO: ARMAMENTO ──
  { id: "marechal",  nome: "Marechal Industrial", icone: "🎖️", desc: "Comanda a produção de guerra.",             salarioBase: 900,  tamanhos: ["$$", "$$$"],      ramo: "armamento",  acessos: ["visao","edificios"] },

  // ── RAMO: AGRICULTURA ──
  { id: "agronomo",  nome: "Agrônomo-Chefe",  icone: "🌾", desc: "Cuida das fazendas e celeiros.",                   salarioBase: 400,  tamanhos: ["$", "$$", "$$$"], ramo: "agricultura", acessos: ["visao","edificios"] },

  // ── RAMO: MINERAÇÃO ──
  { id: "mestre_mina", nome: "Mestre de Minas", icone: "⛏️", desc: "Comanda as minas e refinarias.",                 salarioBase: 500,  tamanhos: ["$", "$$", "$$$"], ramo: "mineracao",  acessos: ["visao","edificios"] },

  // ── RAMO: ENERGIA ──
  { id: "eng_energia", nome: "Engenheiro de Energia", icone: "⚡", desc: "Cuida das usinas e reatores.",               salarioBase: 600,  tamanhos: ["$$", "$$$"],      ramo: "energia",    acessos: ["visao","edificios"] },

  // ── RAMO: TRANSPORTE ──
  { id: "capitao_log", nome: "Capitão de Logística", icone: "🚂", desc: "Comanda ferrovias e portos.",                salarioBase: 600,  tamanhos: ["$", "$$", "$$$"], ramo: "transporte", acessos: ["visao","edificios"] },

  // ── RAMO: MÍDIA ──
  { id: "editor_chefe", nome: "Editor-Chefe",  icone: "📰", desc: "Controla a linha editorial.",                      salarioBase: 500,  tamanhos: ["$", "$$", "$$$"], ramo: "midia",      acessos: ["visao","pesquisa"] },

  // ── RAMO: FINANCEIRO ──
  { id: "banqueiro", nome: "Banqueiro-Chefe", icone: "📈", desc: "Gerencia bancos e investimentos.",                  salarioBase: 1000, tamanhos: ["$$", "$$$"],      ramo: "financeiro", acessos: ["visao","cofre"] },

  // ── RAMO: QUÍMICO ──
  { id: "quimico_chefe", nome: "Químico-Chefe", icone: "⚗️", desc: "Lidera laboratórios químicos.",                  salarioBase: 700,  tamanhos: ["$", "$$", "$$$"], ramo: "quimico",    acessos: ["visao","pesquisa","edificios"] },

  // ── RAMO: FARMACÊUTICO ──
  { id: "farmaceutico", nome: "Farmacêutico-Chefe", icone: "💊", desc: "Lidera a produção de remédios.",              salarioBase: 700,  tamanhos: ["$$", "$$$"],      ramo: "farmaceutico", acessos: ["visao","pesquisa","edificios"] },

  // ── RAMO: LUXO ──
  { id: "curador",   nome: "Curador de Luxo",  icone: "💎", desc: "Cuida das joalherias e ateliês.",                    salarioBase: 600,  tamanhos: ["$", "$$", "$$$"], ramo: "luxo",       acessos: ["visao","edificios"] },

  // ── RAMO: CONSTRUÇÃO ──
  { id: "eng_obras", nome: "Engenheiro de Obras", icone: "🏗️", desc: "Comanda construtoras e incorporadoras.",          salarioBase: 500,  tamanhos: ["$", "$$", "$$$"], ramo: "construcao", acessos: ["visao","edificios"] },
];

export const cargosDisponiveisParaEmpresa = (emp) => {
  const tam = emp?.categoria || "$";
  const cats = emp?.categorias || [];
  const catalogo = CARGOS_EMPRESA.filter((c) => {
    if (!c.tamanhos.includes(tam)) return false;
    if (c.ramo && !cats.includes(c.ramo)) return false;
    return true;
  });
  const customs = Array.isArray(emp?.cargosCustom)
    ? emp.cargosCustom.map((c) => ({ ...c, custom: true }))
    : [];
  return [...catalogo, ...customs];
};

export const getCargoEmpresa = (id) => CARGOS_EMPRESA.find((c) => c.id === id) || null;

export const salarioDoCargo = (cargo, tam) => {
  const fator = tam === "$$$" ? 3 : tam === "$$" ? 1.8 : 1;
  return Math.round((cargo?.salarioBase || 0) * fator);
};

export const temAcesso = (emp, userEmail, isMaster, aba) => {
  if (isMaster) return true;
  if (!userEmail) return false;
  if (emp?.donoEmail && emp.donoEmail === userEmail) return true;
  const equipe = emp?.equipe || [];
  const membro = equipe.find((m) => m.holderEmail === userEmail);
  if (!membro) return false;
  return (membro.acessos || []).includes(aba);
};

export const CFG_CARGOS_DEFAULT = {
  ciclosPorAno: 12,
  multaRescisoriaCiclos: 1,
  bonusAnualPct: 5,
  fatorSalario: 1,
};

export const getCfgCargos = (emp) => ({
  ...CFG_CARGOS_DEFAULT,
  ...(emp?.cfgCargos || {}),
});

export const calcularSalarioMembro = (membro, emp) => {
  const cfg = getCfgCargos(emp);
  const base = Number(membro?.salario || 0);
  return Math.round(base * cfg.fatorSalario);
};

export const calcularMultaRescisoria = (membro, emp) => {
  const cfg = getCfgCargos(emp);
  const salario = calcularSalarioMembro(membro, emp);
  return Math.round(salario * cfg.multaRescisoriaCiclos);
};

export const calcularBonusAnual = (membro, emp) => {
  const cfg = getCfgCargos(emp);
  const salario = calcularSalarioMembro(membro, emp);
  return Math.round(salario * (cfg.bonusAnualPct / 100) * cfg.ciclosPorAno);
};

export const criarCfgCargosEmpresa = (emp) => {
  const disponiveis = cargosDisponiveisParaEmpresa(emp);
  const existente = emp?.configCargos || {};
  const out = {};
  for (const c of disponiveis) {
    const ex = existente[c.id] || {};
    const salarioPadrao = salarioDoCargo(c, emp?.categoria || "$");
    out[c.id] = {
      cargoId: c.id,
      custom: !!c.custom,
      ativo: ex.ativo !== false,
      nome: (typeof ex.nome === "string" && ex.nome.trim()) ? ex.nome : c.nome,
      icone: (typeof ex.icone === "string" && ex.icone.trim()) ? ex.icone : c.icone,
      desc: (typeof ex.desc === "string" && ex.desc.trim()) ? ex.desc : c.desc,
      quantidade: Number.isFinite(ex.quantidade) ? Math.max(0, ex.quantidade) : 1,
      salario: Number.isFinite(ex.salario) && ex.salario > 0 ? ex.salario : salarioPadrao,
      acessos: Array.isArray(ex.acessos) ? ex.acessos : [...(c.acessos || [])],
    };
  }
  return out;
};

export const criarCargoCustom = () => {
  const id = `custom_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  return {
    id,
    nome: "Novo Cargo",
    icone: "⭐",
    desc: "Cargo customizado — edite os detalhes abaixo.",
    salarioBase: 500,
    tamanhos: ["$", "$$", "$$$"],
    ramo: null,
    acessos: ["visao"],
  };
};

export const resetarCargoParaPadrao = () => ({
  ativo: true,
  nome: undefined,
  icone: undefined,
  desc: undefined,
  quantidade: 1,
  salario: undefined,
  acessos: undefined,
});
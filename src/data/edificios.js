export const CATEGORIAS_EDIFICIO = {
  basico:    { nome: "Básico",   icone: "🍞", cor: "#b8945a" },
  luxo:      { nome: "Luxo",     icone: "💎", cor: "#c9a961" },
  industria: { nome: "Indústria",icone: "⚙️", cor: "#5a6b7a" },
  militar:   { nome: "Militar",  icone: "⚔️", cor: "#8b2f2f" },
};

export const EDIFICIOS_CATALOGO = [
  // ============ BÁSICO ============
  { id: "fazenda_grao",       nome: "Fazenda de Grãos",     icone: "🌾", cor: "#b8945a", tipo: "producao", commodityId: "grao",       categoria: "basico", requer: { popMin: 3000, classeMin: { camponeses: 300 } },            baseProducao: 12, incremento: 10, baseCusto: 500,   fatorCusto: 1.5, efeitos: { radicalizacao: -0.05, lealdade: 0.05, prosperidade: 0.10 }, desc: "Campos de grão que alimentam a cidade." },
  { id: "porto_pesca",        nome: "Porto de Pesca",       icone: "🐟", cor: "#3b6e8f", tipo: "producao", commodityId: "peixe",      categoria: "basico", requer: { popMin: 2000, classeMin: { operarios: 200 } },              baseProducao: 8,  incremento: 6,  baseCusto: 600,   fatorCusto: 1.5, efeitos: { lealdade: 0.04, prosperidade: 0.08 },                   desc: "Barcos que trazem o sustento do mar." },
  { id: "pasto_gado",         nome: "Pasto de Gado",        icone: "🥩", cor: "#8b3a3a", tipo: "producao", commodityId: "carne",      categoria: "basico", requer: { popMin: 3000, classeMin: { camponeses: 400 } },            baseProducao: 6,  incremento: 5,  baseCusto: 700,   fatorCusto: 1.5, efeitos: { lealdade: 0.05, prosperidade: 0.10 },                   desc: "Criação de gado para o consumo urbano." },
  { id: "serraria",           nome: "Serraria",             icone: "🪵", cor: "#6b4a2b", tipo: "producao", commodityId: "madeira",    categoria: "basico", requer: { popMin: 2000, classeMin: { operarios: 200 } },              baseProducao: 10, incremento: 8,  baseCusto: 500,   fatorCusto: 1.5, efeitos: { prosperidade: 0.08 },                              desc: "Corta e prepara madeira para construção." },
  { id: "tecelagem",          nome: "Tecelagem",            icone: "🧵", cor: "#9c6b8e", tipo: "producao", commodityId: "tecido",     categoria: "basico", requer: { popMin: 4000, classeMin: { operarios: 300 } },              baseProducao: 8,  incremento: 6,  baseCusto: 800,   fatorCusto: 1.55, efeitos: { prosperidade: 0.10 },                             desc: "Tece o pano que veste a população." },
  { id: "alfaiataria",        nome: "Alfaiataria",          icone: "👕", cor: "#c9856b", tipo: "producao", commodityId: "roupas",     categoria: "basico", requer: { popMin: 5000, classeMin: { operarios: 400 } },              baseProducao: 6,  incremento: 5,  baseCusto: 900,   fatorCusto: 1.55, efeitos: { prosperidade: 0.12 },                             desc: "Costura roupas para a plebe e a classe média." },
  { id: "marcenaria",         nome: "Marcenaria",           icone: "🪑", cor: "#8b5a2b", tipo: "producao", commodityId: "mobiliario", categoria: "basico", requer: { popMin: 5000, classeMin: { operarios: 300 } },              baseProducao: 5,  incremento: 4,  baseCusto: 900,   fatorCusto: 1.55, efeitos: { prosperidade: 0.12 },                             desc: "Móveis para as habitações da cidade." },
  { id: "servicos_urbanos",   nome: "Serviços Urbanos",     icone: "🛎️", cor: "#a87a4a", tipo: "producao", commodityId: "servicos",   categoria: "basico", requer: { popMin: 8000 },                                              baseProducao: 5,  incremento: 5,  baseCusto: 1000,  fatorCusto: 1.5, efeitos: { prosperidade: 0.15, radicalizacao: -0.05 },           desc: "Cocheiros, carregadores e artesãos do cotidiano." },

  // ============ LUXO ============
  { id: "vinicola",           nome: "Vinícola",             icone: "🍷", cor: "#8b2f4a", tipo: "producao", commodityId: "vinho",           categoria: "luxo", requer: { popMin: 6000, instrucaoMin: 15, classeMin: { camponeses: 200 } }, baseProducao: 4, incremento: 4, baseCusto: 1500, fatorCusto: 1.6, efeitos: { prosperidade: 0.20, lealdade: 0.08 },              desc: "Vinhedos e adegas finas para a elite." },
  { id: "plantacao_luxo",     nome: "Plantação de Chá e Café", icone: "☕", cor: "#6b4a2b", tipo: "producao", commodityId: "cha_cafe_tabaco", categoria: "luxo", requer: { popMin: 8000, instrucaoMin: 20, classeMin: { camponeses: 500 } }, baseProducao: 5, incremento: 5, baseCusto: 1800, fatorCusto: 1.6, efeitos: { prosperidade: 0.25 },                              desc: "Plantações de luxo que geram alto lucro comercial." },
  { id: "joalheria",          nome: "Joalheria",            icone: "💎", cor: "#f0e6d2", tipo: "producao", commodityId: "roupas_luxo",    categoria: "luxo", requer: { popMin: 10000, instrucaoMin: 30, classeMin: { mercadores: 300 } }, baseProducao: 3, incremento: 3, baseCusto: 2200, fatorCusto: 1.65, efeitos: { prosperidade: 0.30 },                            desc: "Corta gemas e adorna coroas e colares." },
  { id: "fabrica_cibernetica",nome: "Fábrica de Cibernética",icone: "🦾", cor: "#5a6b7a", tipo: "producao", commodityId: "cibernetica",   categoria: "luxo", requer: { popMin: 20000, instrucaoMin: 45, classeMin: { operarios: 500 } }, baseProducao: 4, incremento: 4, baseCusto: 3500, fatorCusto: 1.65, efeitos: { prosperidade: 0.35, radicalizacao: 0.10 },       desc: "Cirurgiões e artesãos da carne mecânica." },

  // ============ INDÚSTRIA ============
  { id: "mina_ferro",         nome: "Mina de Ferro",        icone: "⛏️", cor: "#8b6f47", tipo: "producao", commodityId: "ferro",       categoria: "industria", requer: { popMin: 3000, classeMin: { operarios: 400 } },            baseProducao: 15, incremento: 12, baseCusto: 700,   fatorCusto: 1.55, efeitos: { radicalizacao: 0.10, prosperidade: 0.15 },        desc: "Escava o metal bruto das entranhas da terra." },
  { id: "mina_carvao",        nome: "Mina de Carvão",       icone: "⬛", cor: "#3a3a3a", tipo: "producao", commodityId: "carvao",      categoria: "industria", requer: { popMin: 3000, classeMin: { operarios: 400 } },            baseProducao: 18, incremento: 15, baseCusto: 650,   fatorCusto: 1.55, efeitos: { radicalizacao: 0.12, prosperidade: 0.12 },        desc: "Extrai o combustível que move as forjas." },
  { id: "siderurgica",        nome: "Siderúrgica",          icone: "🔩", cor: "#5a6b7a", tipo: "producao", commodityId: "aco",         categoria: "industria", requer: { popMin: 8000, instrucaoMin: 15, classeMin: { operarios: 600 } }, baseProducao: 8, incremento: 7, baseCusto: 1600, fatorCusto: 1.6, efeitos: { radicalizacao: 0.15, prosperidade: 0.25 },       desc: "Transforma ferro em aço de qualidade." },
  { id: "ferraria",           nome: "Ferraria",             icone: "🔧", cor: "#8b6f47", tipo: "producao", commodityId: "ferramentas", categoria: "industria", requer: { popMin: 6000, instrucaoMin: 10, classeMin: { operarios: 400 } }, baseProducao: 6, incremento: 5, baseCusto: 1200, fatorCusto: 1.55, efeitos: { prosperidade: 0.18 },                            desc: "Fornece ferramentas para todas as indústrias." },
  { id: "mina_obsidiana",     nome: "Mina de Obsidiana",    icone: "🖤", cor: "#1a1a2e", tipo: "producao", commodityId: "obsidiana",   categoria: "industria", requer: { popMin: 5000, classeMin: { operarios: 300 } },            baseProducao: 6, incremento: 6, baseCusto: 2000, fatorCusto: 1.65, efeitos: { radicalizacao: 0.15, prosperidade: 0.20 },       desc: "Rocha negra ligada à Aura densa." },
  { id: "mina_aurita",        nome: "Mina de Aurita",       icone: "🤍", cor: "#e8e0d0", tipo: "producao", commodityId: "aurita",      categoria: "industria", requer: { popMin: 5000, instrucaoMin: 10, classeMin: { operarios: 300 } }, baseProducao: 4, incremento: 4, baseCusto: 2200, fatorCusto: 1.65, efeitos: { radicalizacao: 0.10, prosperidade: 0.22 },       desc: "Metal raro que anula Aura." },
  { id: "refinaria_pyridium", nome: "Refinaria de Pyridium",icone: "🟠", cor: "#ff8c00", tipo: "producao", commodityId: "pyridium",    categoria: "industria", requer: { popMin: 8000, instrucaoMin: 20, classeMin: { operarios: 400 } }, baseProducao: 5, incremento: 5, baseCusto: 2500, fatorCusto: 1.65, efeitos: { radicalizacao: 0.20, prosperidade: 0.25 },       desc: "Energia bruta que move as máquinas." },
  { id: "estaleiro",          nome: "Estaleiro",            icone: "🚢", cor: "#3b6e8f", tipo: "producao", commodityId: "navios",      categoria: "industria", requer: { popMin: 10000, instrucaoMin: 25, classeMin: { operarios: 500 } }, baseProducao: 2, incremento: 2, baseCusto: 3000, fatorCusto: 1.7, efeitos: { prosperidade: 0.30 },                            desc: "Constrói navios civis para comércio e transporte." },
  { id: "fiacao_seda",        nome: "Fiação de Seda",       icone: "🧶", cor: "#e8dcc0", tipo: "producao", commodityId: "seda",        categoria: "industria", requer: { popMin: 6000, instrucaoMin: 15, classeMin: { camponeses: 300 } }, baseProducao: 5, incremento: 4, baseCusto: 1500, fatorCusto: 1.55, efeitos: { prosperidade: 0.18 },                            desc: "Fia o tecido nobre para as cortes." },
  { id: "estacao_ferroviaria",nome: "Estação Ferroviária",  icone: "🚂", cor: "#5a6b7a", tipo: "producao", commodityId: "veiculos",    categoria: "industria", requer: { popMin: 10000, instrucaoMin: 20 },                                  requerTech: "ferrovia",   baseProducao: 4,  incremento: 4, baseCusto: 3000, fatorCusto: 1.65, efeitos: { comercioInterno: 0.05, prosperidade: 0.20, radicalizacao: -0.05 }, desc: "Conecta a cidade ao resto do país — habilita comércio interno." },
  { id: "fabrica_automatizada",nome: "Fábrica Automatizada",icone: "🤖", cor: "#a855f7", tipo: "producao", commodityId: "ferramentas", categoria: "industria", requer: { popMin: 20000, instrucaoMin: 40 },                                  requerTech: "automatos",  baseProducao: 10, incremento: 9, baseCusto: 4500, fatorCusto: 1.7,  efeitos: { producaoIndustria: 0.15, radicalizacao: 0.10 }, desc: "Autômatos movidos a Aura — produção industrial turbinada." },

  // ============ MILITAR ============
  { id: "armaria",            nome: "Armaria",              icone: "🔫", cor: "#8b2f2f", tipo: "producao", commodityId: "armas_portateis", categoria: "militar", requer: { popMin: 8000, instrucaoMin: 15, classeMin: { operarios: 400, militares: 100 } }, baseProducao: 5, incremento: 5, baseCusto: 2000, fatorCusto: 1.6, efeitos: { radicalizacao: 0.10, lealdade: 0.05 }, desc: "Forja rifles e pistolas para a infantaria." },
  { id: "fundicao_canhoes",   nome: "Fundição de Canhões",  icone: "💣", cor: "#8b2f2f", tipo: "producao", commodityId: "artilharia",      categoria: "militar", requer: { popMin: 15000, instrucaoMin: 25, classeMin: { operarios: 600 } }, baseProducao: 3, incremento: 3, baseCusto: 3500, fatorCusto: 1.65, efeitos: { radicalizacao: 0.20 },                              desc: "Fundem canhões de todos os portes." },
  { id: "fabrica_municao",    nome: "Fábrica de Munição",   icone: "🎯", cor: "#6b3a3a", tipo: "producao", commodityId: "municao",         categoria: "militar", requer: { popMin: 8000, instrucaoMin: 15, classeMin: { operarios: 500 } }, baseProducao: 8, incremento: 7, baseCusto: 2200, fatorCusto: 1.6, efeitos: { radicalizacao: 0.15 },                              desc: "Produz a munição que alimenta as guerras." },
  { id: "estaleiro_guerra",   nome: "Estaleiro de Guerra",  icone: "⚓", cor: "#3b3a6e", tipo: "producao", commodityId: "navios_guerra",   categoria: "militar", requer: { popMin: 20000, instrucaoMin: 35, classeMin: { operarios: 800, militares: 200 } }, baseProducao: 1, incremento: 1, baseCusto: 5000, fatorCusto: 1.75, efeitos: { radicalizacao: 0.25 }, desc: "Constrói os navios de guerra." },
  { id: "quartel_cibernetico",nome: "Quartel Cibernético",  icone: "🦿", cor: "#8b2f2f", tipo: "producao", commodityId: "cibernetica_militar", categoria: "militar", requer: { popMin: 30000, instrucaoMin: 50, classeMin: { militares: 400 } }, requerTech: "ciborgues_militares", baseProducao: 3, incremento: 3, baseCusto: 6000, fatorCusto: 1.75, efeitos: { poderMilitar: 0.20, radicalizacao: 0.15 }, desc: "Soldados fundidos com máquinas — infantaria de elite." },
];

export const custoEdificio = (ed, nivelAtual) =>
  Math.round(ed.baseCusto * Math.pow(ed.fatorCusto, Math.max(0, nivelAtual)));

export const producaoEdificio = (ed, nivel) => {
  if (nivel <= 0) return 0;
  return ed.baseProducao + ed.incremento * (nivel - 1);
};

export const efeitoEdificio = (ed, nivel) => {
  if (nivel <= 0) return {};
  const out = {};
  for (const [k, v] of Object.entries(ed.efeitos || {})) {
    out[k] = v * nivel;
  }
  return out;
};

export const edifBloqueado = (ed, cidade, tecnologias = null) => {
  if (ed.requerTech && tecnologias !== null) {
    const set = tecnologias instanceof Set ? tecnologias : new Set(tecnologias || []);
    if (!set.has(ed.requerTech)) {
      return { bloqueado: true, motivo: `Requer pesquisa: ${ed.requerTech}` };
    }
  }
  if (!ed.requer) return { bloqueado: false, motivo: "" };
  const { popMin, instrucaoMin, classeMin } = ed.requer;
  if (popMin && (cidade.pop || 0) < popMin) {
    return { bloqueado: true, motivo: `Requer ${popMin.toLocaleString("pt-BR")} hab.` };
  }
  if (instrucaoMin && (cidade.instrucao || 0) < instrucaoMin) {
    return { bloqueado: true, motivo: `Requer ${instrucaoMin}% instrução` };
  }
  if (classeMin) {
    for (const [classe, qtd] of Object.entries(classeMin)) {
      const popClasse = cidade.pops?.[classe]?.tamanho || 0;
      if (popClasse < qtd) {
        return { bloqueado: true, motivo: `Requer ${qtd.toLocaleString("pt-BR")} ${classe}` };
      }
    }
  }
  return { bloqueado: false, motivo: "" };
};

export function gerarEdificiosIniciais(prod, cons) {
  const edif = {};
  for (const commodityId of Object.keys(prod || {})) {
    const ed = EDIFICIOS_CATALOGO.find((e) => e.commodityId === commodityId && e.tipo === "producao");
    if (ed) {
      const qtd = Number(prod[commodityId]) || 0;
      const nivel = Math.max(1, Math.min(10, Math.ceil(qtd / ed.baseProducao)));
      edif[ed.id] = nivel;
    }
  }
  for (const commodityId of Object.keys(cons || {})) {
    const ed = EDIFICIOS_CATALOGO.find((e) => e.commodityId === commodityId && e.tipo === "consumo");
    if (ed) {
      const qtd = Number(cons[commodityId]) || 0;
      const nivel = Math.max(1, Math.min(10, Math.ceil(qtd / ed.baseProducao)));
      edif[ed.id] = nivel;
    }
  }
  return edif;
}
export const calcularProducaoCidade = (cidade) => {
  const out = {};
  const edif = cidade.edificios || {};
  for (const [edId, nivel] of Object.entries(edif)) {
    if (!nivel || nivel <= 0) continue;
    const ed = EDIFICIOS_CATALOGO.find((e) => e.id === edId);
    if (!ed || ed.tipo !== "producao") continue;
    const prod = producaoEdificio(ed, nivel);
    out[ed.commodityId] = (out[ed.commodityId] || 0) + prod;
  }
  return out;
};

export const calcularEfeitosCidade = (cidade) => {
  const out = {};
  const edif = cidade.edificios || {};
  for (const [edId, nivel] of Object.entries(edif)) {
    if (!nivel || nivel <= 0) continue;
    const ed = EDIFICIOS_CATALOGO.find((e) => e.id === edId);
    if (!ed) continue;
    for (const [k, v] of Object.entries(ed.efeitos || {})) {
      out[k] = (out[k] || 0) + v * nivel;
    }
  }
  return out;
};

export const estoqueUniversal = (estoque, commodities) => {
  const out = {};
  for (const c of commodities) {
    out[c.id] = Math.round((Number(estoque?.[c.id]) || 0) * 100) / 100;
  }
  return out;
};

export const mediaEdificios = (cidades) => {
  const soma = {};
  const contagem = {};
  for (const c of cidades) {
    const edif = c.edificios || {};
    for (const [edId, nivel] of Object.entries(edif)) {
      if (!nivel || nivel <= 0) continue;
      soma[edId] = (soma[edId] || 0) + nivel;
      contagem[edId] = (contagem[edId] || 0) + 1;
    }
  }
  const out = {};
  for (const id of Object.keys(soma)) {
    out[id] = Math.round((soma[id] / contagem[id]) * 10) / 10;
  }
  return out;
};
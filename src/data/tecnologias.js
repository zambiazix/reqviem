export const ERAS = [
  { id: "era1", nome: "Era I — Vapor", icone: "⚙️", cor: "#5a6b7a", desc: "Máquinas a vapor, ferrovias e a primeira indústria de massa." },
  { id: "era2", nome: "Era II — Aço", icone: "🔩", cor: "#b8945a", desc: "Aço Bessemer, química industrial e eletricidade." },
  { id: "era3", nome: "Era III — Aura", icone: "✨", cor: "#a855f7", desc: "Condutores de Aura, autômatos e comunicação etérea." },
];

export const TECNOLOGIAS = [
  // ============ ERA I — 24h a 48h ============
  { id: "maquina_vapor", era: "era1", nome: "Máquina a Vapor", icone: "⚙️", custo: 5000, tempoHoras: 24, requer: [], desc: "Motores a vapor movem as primeiras fábricas.", efeitos: { producaoIndustria: 1.10 } },
  { id: "telegrafo", era: "era1", nome: "Telégrafo", icone: "📡", custo: 6000, tempoHoras: 24, requer: ["maquina_vapor"], desc: "Comunicação instantânea entre capitais.", efeitos: { instrucaoBonus: 0.05 } },
  { id: "siderurgia_avancada", era: "era1", nome: "Siderurgia Avançada", icone: "🔨", custo: 7000, tempoHoras: 36, requer: [], desc: "Produção de aço em larga escala.", efeitos: { producaoAco: 1.20 } },
  { id: "ferrovia", era: "era1", nome: "Ferrovia", icone: "🚂", custo: 8000, tempoHoras: 48, requer: ["maquina_vapor"], desc: "Trilhos conectam cidades e províncias.", efeitos: { comercioInterno: 1.15 } },

  // ============ ERA II — 48h a 96h ============
  { id: "industria_quimica", era: "era2", nome: "Indústria Química", icone: "⚗️", custo: 18000, tempoHoras: 48, requer: ["maquina_vapor"], desc: "Corantes, fertilizantes e explosivos sintéticos.", efeitos: { producaoIndustria: 1.15 } },
  { id: "aco_bessemer", era: "era2", nome: "Aço Bessemer", icone: "🔩", custo: 15000, tempoHoras: 60, requer: ["siderurgia_avancada"], desc: "Aço barato e rápido para trilhos e armas.", efeitos: { producaoAco: 1.30, custoEdificios: 0.90 } },
  { id: "armas_repeticao", era: "era2", nome: "Armas de Repetição", icone: "🔫", custo: 20000, tempoHoras: 72, requer: ["aco_bessemer"], desc: "Rifles de repetição para a infantaria.", efeitos: { poderMilitar: 1.20 } },
  { id: "eletricidade", era: "era2", nome: "Eletricidade", icone: "💡", custo: 22000, tempoHoras: 96, requer: ["aco_bessemer"], desc: "Iluminação urbana e motores elétricos.", efeitos: { prosperidadeBonus: 0.05 } },

  // ============ ERA III — 96h a 168h ============
  { id: "condutores_aura", era: "era3", nome: "Condutores de Aura", icone: "✨", custo: 40000, tempoHoras: 96, requer: ["eletricidade"], desc: "Cristais que armazenam e conduzem Aura.", efeitos: { producaoPyridium: 1.25 } },
  { id: "comunicacao_eterea", era: "era3", nome: "Comunicação Etérea", icone: "🌐", custo: 38000, tempoHoras: 120, requer: ["telegrafo", "condutores_aura"], desc: "Mensagens via Aura cruzam continentes.", efeitos: { comercioInterno: 1.20, instrucaoBonus: 0.10 } },
  { id: "automatos", era: "era3", nome: "Autômatos", icone: "🤖", custo: 45000, tempoHoras: 144, requer: ["condutores_aura"], desc: "Máquinas movidas a Aura substituem operários.", efeitos: { producaoIndustria: 1.30, radicalizacaoOperarios: 1.15 } },
  { id: "ciborgues_militares", era: "era3", nome: "Ciborgues Militares", icone: "🦿", custo: 50000, tempoHoras: 168, requer: ["armas_repeticao", "automatos"], desc: "Soldados fundidos com máquinas.", efeitos: { poderMilitar: 1.40 } },
];

export const getTecnologiaPorId = (id) => TECNOLOGIAS.find((t) => t.id === id);

export const tecnologiasDaEra = (eraId) => TECNOLOGIAS.filter((t) => t.era === eraId);

export const tecDisponivel = (tec, pesquisadas) => {
  if (!tec.requer || tec.requer.length === 0) return true;
  return tec.requer.every((r) => pesquisadas.includes(r));
};

export const pesquisadasSet = (pais) => new Set(pais?.tecnologias || []);

export const getFatoresTecnologias = (pais) => {
  const pesquisadas = pesquisadasSet(pais);
  const fator = {
    producaoIndustria: 1,
    producaoAco: 1,
    producaoPyridium: 1,
    comercioInterno: 1,
    instrucaoBonus: 0,
    poderMilitar: 1,
    prosperidadeBonus: 0,
    radicalizacaoOperarios: 1,
    custoEdificios: 1,
  };
  for (const tec of TECNOLOGIAS) {
    if (!pesquisadas.has(tec.id)) continue;
    for (const [k, v] of Object.entries(tec.efeitos || {})) {
      if (k === "instrucaoBonus" || k === "prosperidadeBonus") {
        fator[k] += v;
      } else {
        fator[k] *= v;
      }
    }
  }
  return fator;
};

export const tecConcluida = (pesquisa) => {
  if (!pesquisa || !pesquisa.concluiEm) return false;
  return Date.now() >= new Date(pesquisa.concluiEm).getTime();
};

export const horasRestantes = (pesquisa) => {
  if (!pesquisa || !pesquisa.concluiEm) return 0;
  const ms = new Date(pesquisa.concluiEm).getTime() - Date.now();
  return Math.max(0, ms / (1000 * 60 * 60));
};

export const formatarTempoRestante = (horas) => {
  if (horas <= 0) return "Pronto";
  if (horas < 1) {
    const min = Math.ceil(horas * 60);
    return `${min} min`;
  }
  if (horas < 24) {
    const h = Math.floor(horas);
    const m = Math.round((horas - h) * 60);
    return `${h}h ${m}min`;
  }
  const d = Math.floor(horas / 24);
  const h = Math.round(horas - d * 24);
  return `${d}d ${h}h`;
};
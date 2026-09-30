export const CRISES_ESPONTANEAS = [
  {
    id: "crise_agricola",
    nome: "Crise Agrícola",
    icone: "🌾",
    peso: 20,
    descricao: "Seca ou praga atinge a produção de alimentos.",
    aplicar(cidade) {
      return {
        cidade: { prosperidade: -8, radicalizacao: +6, lealdade: -3 },
        commodities: [{ id: "grao", oferta: -200 }, { id: "frutas", oferta: -100 }],
      };
    },
    noticia: (cidade, pais) =>
      `Crise Agrícola atinge ${cidade.nome}. Produção de grãos cai drasticamente em ${pais?.nome || "—"}.`,
  },
  {
    id: "greve_geral",
    nome: "Greve Geral",
    icone: "🛠️",
    peso: 15,
    descricao: "Operários cruzam os braços, paralisando a indústria.",
    aplicar(cidade) {
      return {
        cidade: { prosperidade: -6, radicalizacao: +12, lealdade: -5 },
        commodities: [],
      };
    },
    noticia: (cidade) => `Greve Geral paralisa ${cidade.nome}. Operários exigem melhores salários.`,
  },
  {
    id: "colapso_commodity",
    nome: "Colapso de Mercado",
    icone: "📉",
    peso: 10,
    descricao: "Um produto tem seu preço desabando.",
    aplicar() {
      const alvo = Math.random() < 0.5 ? "aco" : "tecido";
      return {
        cidade: null,
        commodities: [{ id: alvo, oferta: +300 }],
      };
    },
    noticia: (cidade, pais) => `Mercado instável. Preços oscilam bruscamente em ${pais?.nome || "todo o mundo"}.`,
  },
  {
    id: "escandalo_politico",
    nome: "Escândalo Político",
    icone: "📰",
    peso: 12,
    descricao: "Um político é flagrado em corrupção.",
    aplicar() {
      return {
        cidade: null,
        commodities: [],
        igDesgaste: 5,
      };
    },
    noticia: (cidade, pais) => `Escândalo abala a política de ${pais?.nome || "—"}. Facções perdem credibilidade.`,
  },
  {
    id: "boom_economico",
    nome: "Boom Econômico",
    icone: "📈",
    peso: 8,
    descricao: "Uma região vive um surto de prosperidade.",
    aplicar(cidade) {
      return {
        cidade: { prosperidade: +12, radicalizacao: -5, lealdade: +8 },
        commodities: [],
      };
    },
    noticia: (cidade, pais) => `Boom Econômico em ${cidade.nome}. Investidores correm para ${pais?.nome || "a região"}.`,
  },
  {
    id: "ataque_criatura",
    nome: "Ataque de Criatura",
    icone: "🐉",
    peso: 5,
    descricao: "Uma criatura de Aura ataca a região.",
    aplicar(cidade) {
      return {
        cidade: { prosperidade: -10, radicalizacao: +8, criminalidade: +5 },
        commodities: [],
      };
    },
    noticia: (cidade) => `Criatura de Aura ataca ${cidade.nome}. População em pânico.`,
  },
  {
    id: "descoberta_mineral",
    nome: "Descoberta Mineral",
    icone: "💎",
    peso: 6,
    descricao: "Uma nova jazida é encontrada.",
    aplicar(cidade) {
      return {
        cidade: { prosperidade: +8 },
        commodities: [{ id: "obsidiana", oferta: +80 }],
      };
    },
    noticia: (cidade) => `Nova jazida descoberta em ${cidade.nome}. Mercado em polvorosa.`,
  },
  {
    id: "fome_regional",
    nome: "Fome Regional",
    icone: "🍽️",
    peso: 10,
    descricao: "Escassez severa de alimentos.",
    aplicar(cidade) {
      return {
        cidade: { prosperidade: -12, radicalizacao: +15, lealdade: -10 },
        commodities: [{ id: "grao", oferta: -300 }],
      };
    },
    noticia: (cidade, pais) => `Fome atinge ${cidade.nome}. População clama por ajuda em ${pais?.nome || "—"}.`,
  },
];

export function sortearCrise() {
  const total = CRISES_ESPONTANEAS.reduce((s, c) => s + c.peso, 0);
  let r = Math.random() * total;
  for (const c of CRISES_ESPONTANEAS) {
    r -= c.peso;
    if (r <= 0) return c;
  }
  return CRISES_ESPONTANEAS[0];
}
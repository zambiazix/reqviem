export const CATEGORIAS_LEI = {
  economica: { nome: "Econômica", icone: "💰", cor: "#b8945a" },
  militar: { nome: "Militar", icone: "⚔️", cor: "#8b2f2f" },
  social: { nome: "Social", icone: "👥", cor: "#4a6b3a" },
  religiosa: { nome: "Religiosa", icone: "✝️", cor: "#c9a961" },
  diplomatica: { nome: "Diplomática", icone: "🕊️", cor: "#5a6b7a" },
};

export const ESCALAS_LEI = {
  pais: { nome: "Nacional", cor: "#c9a961" },
  provincia: { nome: "Provincial", cor: "#b8945a" },
  cidade: { nome: "Municipal", cor: "#5a6b7a" },
};

export const LEIS_CATALOGO = [
  { id: "sistema_tributario", categoria: "economica", escalas: ["pais", "provincia"], nome: "Sistema Tributário", icone: "🪙", desc: "De onde vem o dinheiro do Estado.", opcoes: [
    { id: "consumo", nome: "Imposto sobre Consumo", desc: "Peso sobre o povo.", custo: 0, efeitos: { arrecadacao: 1.15, radicalizacao_operarios: 1.3, radicalizacao_camponeses: 1.2 } },
    { id: "terra", nome: "Imposto sobre Terra", desc: "Peso sobre camponeses e nobres rurais.", custo: 0, efeitos: { arrecadacao: 1.0, radicalizacao_camponeses: 1.4, lealdade_operarios: 1.1 } },
    { id: "renda", nome: "Imposto de Renda", desc: "Peso sobre a classe média.", custo: 0, efeitos: { arrecadacao: 1.10, radicalizacao_mercadores: 1.3, lealdade_operarios: 1.2 } },
    { id: "riqueza", nome: "Imposto sobre Riqueza", desc: "Peso sobre nobres e corporações.", custo: 0, efeitos: { arrecadacao: 1.25, radicalizacao_nobres: 1.5, lealdade_operarios: 1.4, lealdade_camponeses: 1.3 } },
  ] },
  { id: "politica_mineracao", categoria: "economica", escalas: ["pais", "provincia"], nome: "Política de Mineração", icone: "⛏️", desc: "Quem controla as minas.", opcoes: [
    { id: "estatal", nome: "Minas Estatais", desc: "Estado controla tudo.", custo: 500, efeitos: { arrecadacao: 1.05, producao_mineracao: 0.9, lealdade_operarios: 1.2 } },
    { id: "privada", nome: "Minas Privadas", desc: "Corporações lucram.", custo: 0, efeitos: { arrecadacao: 1.20, producao_mineracao: 1.15, radicalizacao_operarios: 1.4, radicalizacao_camponeses: 1.2 } },
    { id: "mista", nome: "Parceria Público-Privada", desc: "Meio termo.", custo: 200, efeitos: { arrecadacao: 1.10, producao_mineracao: 1.05 } },
  ] },
  { id: "politica_agricola", categoria: "economica", escalas: ["pais", "provincia", "cidade"], nome: "Política Agrícola", icone: "🌾", desc: "Como o Estado trata o campo.", opcoes: [
    { id: "livre", nome: "Mercado Livre", desc: "Sem subsídios.", custo: 0, efeitos: { arrecadacao: 1.05, radicalizacao_camponeses: 1.2 } },
    { id: "subsidio", nome: "Subsídio Agrícola", desc: "Estado banca o campo.", custo: 800, efeitos: { arrecadacao: 0.90, lealdade_camponeses: 1.4 } },
    { id: "coletivo", nome: "Coletivização", desc: "Terras coletivas.", custo: 400, efeitos: { arrecadacao: 0.95, lealdade_camponeses: 1.3, radicalizacao_nobres: 1.5 } },
  ] },
  { id: "imposto_importacao", categoria: "economica", escalas: ["pais"], nome: "Imposto de Importação", icone: "🛃", desc: "Taxa sobre bens recebidos de outros países.", opcoes: [
    { id: "isento",     nome: "Isento (0%)",           desc: "Sem taxação sobre importações.", custo: 0,    efeitos: {}, taxRate: 0 },
    { id: "baixo",      nome: "Baixo (5%)",            desc: "Taxa simbólica.", custo: 0,                efeitos: {}, taxRate: 5 },
    { id: "moderado",   nome: "Moderado (15%)",        desc: "Padrão mercantil.", custo: 0,              efeitos: {}, taxRate: 15 },
    { id: "alto",       nome: "Alto (30%)",            desc: "Protege a produção interna.", custo: 200,    efeitos: {}, taxRate: 30 },
    { id: "proibitivo", nome: "Proibitivo (50%)",      desc: "Desencoraja comércio externo.", custo: 0,    efeitos: {}, taxRate: 50 },
  ] },
  { id: "padrao_comercial", categoria: "economica", escalas: ["pais"], nome: "Padrão Comercial", icone: "🌐", desc: "Abertura ao comércio exterior.", opcoes: [
    { id: "autarquia", nome: "Autarquia", desc: "Fechado ao mundo.", custo: 0, efeitos: { producao_interna: 1.05, lealdade_nobres: 1.2 } },
    { id: "protecionista", nome: "Protecionismo", desc: "Tarifas altas.", custo: 0, efeitos: { producao_interna: 1.10, lealdade_operarios: 1.2 } },
    { id: "livre", nome: "Livre Comércio", desc: "Portas abertas.", custo: 0, efeitos: { producao_interna: 0.90, lealdade_mercadores: 1.3 } },
  ] },
  { id: "modelo_exercito", categoria: "militar", escalas: ["pais"], nome: "Modelo de Exército", icone: "⚔️", desc: "Como recruta e mantém as forças.", opcoes: [
    { id: "mercenario", nome: "Mercenários", desc: "Caros, sem custo político.", custo: 1500, efeitos: { despesa_militar: 1.30, poder_militares: 1.3 } },
    { id: "voluntario", nome: "Voluntários", desc: "Exército profissional.", custo: 800, efeitos: { despesa_militar: 1.10, poder_militares: 1.5 } },
    { id: "conscricao", nome: "Conscrição", desc: "Todo cidadão serve.", custo: 600, efeitos: { despesa_militar: 1.20, poder_militares: 1.7, lealdade_operarios: 0.8, lealdade_camponeses: 0.8 } },
  ] },
  { id: "postura_militar", categoria: "militar", escalas: ["pais"], nome: "Postura Militar", icone: "🎖️", desc: "Como o exército é usado.", opcoes: [
    { id: "defensiva", nome: "Defensiva", desc: "Foco em proteger fronteiras.", custo: 200, efeitos: { defesa: 1.30, despesa_militar: 0.85 } },
    { id: "dissuasao", nome: "Dissuasão", desc: "Poder para evitar guerras.", custo: 500, efeitos: { defesa: 1.15 } },
    { id: "ofensiva", nome: "Ofensiva", desc: "Preparada para invadir.", custo: 1000, efeitos: { ataque: 1.30, despesa_militar: 1.25, radicalizacao_pops: 1.3 } },
  ] },
  { id: "lei_marcial", categoria: "militar", escalas: ["pais", "provincia"], nome: "Lei Marcial", icone: "🔥", desc: "Uso do exército internamente.", opcoes: [
    { id: "desativada", nome: "Desativada", desc: "Nenhum poder militar interno.", custo: 0, efeitos: { radicalizacao_cidades: 1.2 } },
    { id: "regional", nome: "Regional", desc: "Só em zonas de conflito.", custo: 300, efeitos: { radicalizacao_cidades: 0.9, lealdade_pops: 0.9 } },
    { id: "total", nome: "Total", desc: "Estado de sítio permanente.", custo: 900, efeitos: { radicalizacao_cidades: 0.5, lealdade_pops: 0.5, poder_militares: 1.5 } },
  ] },
  { id: "doutrina_militar", categoria: "militar", escalas: ["pais"], nome: "Doutrina Militar", icone: "📜", desc: "Filosofia de guerra.", opcoes: [
    { id: "tradicional", nome: "Tradicional", desc: "Formações em bloco.", custo: 200, efeitos: { moral: 1.1, mobilidade: 0.9 } },
    { id: "moderna", nome: "Moderna", desc: "Aura e autômatos.", custo: 600, efeitos: { mobilidade: 1.2, poder_militares: 1.2 } },
    { id: "guerrilha", nome: "Guerrilha", desc: "Insurgência e emboscadas.", custo: 300, efeitos: { moral: 1.2, mobilidade: 1.1, poder_militares: 0.8 } },
  ] },
  { id: "tolerancia_aurica", categoria: "social", escalas: ["pais", "provincia", "cidade"], nome: "Tolerância Áurica", icone: "✨", desc: "Posição sobre a Aura.", opcoes: [
    { id: "proibida", nome: "Proibição", desc: "Aura banida.", custo: 0, efeitos: { poder_clero: 1.4, radicalizacao_auranos: 1.5 } },
    { id: "regulada", nome: "Regulação", desc: "Permitida sob licença.", custo: 200, efeitos: { poder_clero: 1.1, arrecadacao: 1.05 } },
    { id: "livre", nome: "Liberdade Áurica", desc: "Qualquer um pode praticar.", custo: 0, efeitos: { poder_clero: 0.7, radicalizacao_conservadores: 1.4 } },
  ] },
  { id: "educacao", categoria: "social", escalas: ["pais", "provincia", "cidade"], nome: "Sistema de Educação", icone: "📚", desc: "Quem ensina e o quê.", opcoes: [
    { id: "religiosa", nome: "Escolas Religiosas", desc: "Clero controla.", custo: 200, efeitos: { poder_clero: 1.3, educacao: 0.9 } },
    { id: "privada", nome: "Escolas Privadas", desc: "Quem paga, estuda.", custo: 0, efeitos: { educacao: 1.1, radicalizacao_operarios: 1.2, poder_mercadores: 1.3 } },
    { id: "publica", nome: "Escolas Públicas", desc: "Estado ensina todos.", custo: 1000, efeitos: { educacao: 1.3, radicalizacao_pops: 0.7, poder_clero: 0.7 } },
  ] },
  { id: "saude", categoria: "social", escalas: ["pais", "provincia", "cidade"], nome: "Sistema de Saúde", icone: "🏥", desc: "Quem cuida dos doentes.", opcoes: [
    { id: "nenhuma", nome: "Sem Sistema", desc: "Cada um por si.", custo: 0, efeitos: { radicalizacao_operarios: 1.3, radicalizacao_camponeses: 1.2 } },
    { id: "caridade", nome: "Caridade Religiosa", desc: "Clero e ordens cuidam.", custo: 100, efeitos: { poder_clero: 1.3, lealdade_camponeses: 1.2 } },
    { id: "publica", nome: "Saúde Pública", desc: "Estado garante atendimento.", custo: 900, efeitos: { lealdade_pops: 1.4, radicalizacao_pops: 0.8 } },
  ] },
  { id: "censura", categoria: "social", escalas: ["pais", "provincia"], nome: "Política de Informação", icone: "📰", desc: "Controle sobre o que se diz.", opcoes: [
    { id: "livre", nome: "Imprensa Livre", desc: "Tudo se publica.", custo: 0, efeitos: { radicalizacao_pops: 1.3, lealdade_mercadores: 1.3, poder_clero: 0.8 } },
    { id: "parcial", nome: "Regulação Parcial", desc: "Só ameaças ao Estado.", custo: 200, efeitos: { radicalizacao_pops: 1.1 } },
    { id: "total", nome: "Censura Total", desc: "Só a versão oficial.", custo: 400, efeitos: { radicalizacao_pops: 0.7, lealdade_pops: 0.7, poder_clero: 1.2 } },
  ] },
  { id: "religiao_estado", categoria: "religiosa", escalas: ["pais"], nome: "Relação Igreja-Estado", icone: "✝️", desc: "Como o Estado trata a fé.", opcoes: [
    { id: "laica", nome: "Estado Laico", desc: "Nenhuma fé oficial.", custo: 0, efeitos: { poder_clero: 0.5, radicalizacao_religiosos: 1.4, lealdade_mercadores: 1.2 } },
    { id: "tolerante", nome: "Tolerância Religiosa", desc: "Todas as fés permitidas.", custo: 100, efeitos: { lealdade_pops: 1.1 } },
    { id: "oficial", nome: "Religião Oficial", desc: "Uma fé acima das outras.", custo: 400, efeitos: { poder_clero: 1.5, lealdade_camponeses: 1.3, radicalizacao_minorias: 1.5 } },
    { id: "teocratica", nome: "Teocracia", desc: "O clero governa.", custo: 700, efeitos: { poder_clero: 1.9, lealdade_camponeses: 1.5, radicalizacao_mercadores: 1.5 } },
  ] },
  { id: "doutrina_aurica", categoria: "religiosa", escalas: ["pais", "provincia"], nome: "Doutrina Áurica", icone: "🌀", desc: "Posição teológica sobre a Aura.", opcoes: [
    { id: "heretica", nome: "Herética", desc: "Aura é profanação.", custo: 0, efeitos: { poder_clero: 1.3, radicalizacao_auranos: 1.6 } },
    { id: "tolerada", nome: "Tolerada", desc: "Questão de foro íntimo.", custo: 0, efeitos: {} },
    { id: "sagrada", nome: "Sagrada", desc: "Aura é dádiva divina.", custo: 200, efeitos: { poder_clero: 0.7, radicalizacao_conservadores: 1.5 } },
  ] },
  { id: "cultos_locais", categoria: "religiosa", escalas: ["pais", "provincia", "cidade"], nome: "Cultos Locais", icone: "🕯️", desc: "Tradições regionais.", opcoes: [
    { id: "proibidos", nome: "Proibidos", desc: "Só a fé oficial.", custo: 0, efeitos: { poder_clero: 1.4, radicalizacao_camponeses: 1.3 } },
    { id: "tolerados", nome: "Tolerados", desc: "Desde que discretos.", custo: 0, efeitos: {} },
    { id: "incentivados", nome: "Incentivados", desc: "Estado financia tradições.", custo: 300, efeitos: { poder_clero: 1.2, lealdade_camponeses: 1.3 } },
  ] },
  { id: "politica_externa", categoria: "diplomatica", escalas: ["pais"], nome: "Política Externa", icone: "🧭", desc: "Postura geral no mundo.", opcoes: [
    { id: "isolacionista", nome: "Isolacionismo", desc: "Fora dos assuntos do mundo.", custo: 0, efeitos: { comercio_exterior: 0.6, lealdade_nobres: 1.2 } },
    { id: "neutra", nome: "Neutralidade", desc: "Amigo de todos.", custo: 200, efeitos: {} },
    { id: "expansionista", nome: "Expansionismo", desc: "Interesses em toda parte.", custo: 1500, efeitos: { comercio_exterior: 1.2, despesa_militar: 1.15, radicalizacao_pops: 1.2, poder_militares: 1.3 } },
  ] },
  { id: "relacao_imperio", categoria: "diplomatica", escalas: ["pais"], nome: "Posição sobre a Pax Aurana", icone: "👑", desc: "Postura diante do Império.", opcoes: [
    { id: "vassalo", nome: "Vassalagem", desc: "Submetido ao Império.", custo: 0, efeitos: { arrecadacao: 1.15, lealdade_pops: 0.8, lealdade_imperio: 1.5 } },
    { id: "pragmatico", nome: "Pragmatismo", desc: "Colabora quando convém.", custo: 300, efeitos: { arrecadacao: 1.05, lealdade_imperio: 1.2 } },
    { id: "resistencia", nome: "Resistência", desc: "Contra o Império.", custo: 1200, efeitos: { arrecadacao: 0.9, radicalizacao_pops: 1.3, lealdade_imperio: 0.5 } },
  ] },
  { id: "tratados", categoria: "diplomatica", escalas: ["pais"], nome: "Postura sobre Tratados", icone: "📜", desc: "Como negocia com outras nações.", opcoes: [
    { id: "isolado", nome: "Isolado", desc: "Nenhum tratado.", custo: 0, efeitos: { comercio_exterior: 0.75 } },
    { id: "seletivo", nome: "Seletivo", desc: "Só com aliados próximos.", custo: 200, efeitos: { comercio_exterior: 1.0 } },
    { id: "aberto", nome: "Aberto", desc: "Tratados com qualquer um.", custo: 400, efeitos: { comercio_exterior: 1.2, lealdade_mercadores: 1.3 } },
  ] },
  { id: "espionagem", categoria: "diplomatica", escalas: ["pais"], nome: "Política de Espionagem", icone: "🕵️", desc: "Inteligência externa.", opcoes: [
    { id: "nenhuma", nome: "Nenhuma", desc: "Sem serviço secreto.", custo: 0, efeitos: {} },
    { id: "defensiva", nome: "Contrainteligência", desc: "Só defender.", custo: 300, efeitos: { espionagem_defesa: 1.4 } },
    { id: "ativa", nome: "Espionagem Ativa", desc: "Espiões em toda parte.", custo: 1500, efeitos: { espionagem_ofensiva: 1.5, espionagem_defesa: 1.2, radicalizacao_pops: 1.15 } },
  ] },
  { id: "iluminacao_publica", categoria: "social", escalas: ["cidade", "provincia", "pais"], nome: "Iluminação Pública", icone: "💡", desc: "Como as ruas são iluminadas à noite.", opcoes: [
    { id: "ausente", nome: "Sem Iluminação", desc: "Ruas mergulham no escuro.", custo: 0, efeitos: { radicalizacao_pops: 1.15 } },
    { id: "gas", nome: "Lâmpadas a Gás", desc: "Postes de gás nas ruas principais.", custo: 150, efeitos: { prosperidadeBonus: 0.03, radicalizacao_pops: 0.95 } },
    { id: "eletrica", nome: "Iluminação Elétrica", desc: "Luz elétrica em toda a cidade.", custo: 500, requerTech: "eletricidade", efeitos: { prosperidadeBonus: 0.08, radicalizacao_pops: 0.85, lealdade_pops: 1.05 } },
  ] },
];

export const LEIS_DEFAULT_PAIS = {
  sistema_tributario: "consumo",
  imposto_importacao: "moderado",
  politica_mineracao: "mista",
  politica_agricola: "livre",
  padrao_comercial: "protecionista",
  modelo_exercito: "voluntario",
  postura_militar: "dissuasao",
  lei_marcial: "desativada",
  doutrina_militar: "moderna",
  tolerancia_aurica: "regulada",
  educacao: "religiosa",
  saude: "caridade",
  censura: "parcial",
  religiao_estado: "tolerante",
  doutrina_aurica: "tolerada",
  cultos_locais: "tolerados",
  politica_externa: "neutra",
  relacao_imperio: "pragmatico",
  tratados: "seletivo",
  espionagem: "defensiva",
  iluminacao_publica: "ausente",
};

export const leisAplicaveisEm = (nivel) => {
  return LEIS_CATALOGO.filter((l) => (l.escalas || []).includes(nivel));
};

export const resolverLeiEfetiva = (leiId, { pais, provincia, cidade }) => {
  if (cidade?.leis && cidade.leis[leiId] !== undefined) {
    return { valor: cidade.leis[leiId], origem: "cidade" };
  }
  if (provincia?.leis && provincia.leis[leiId] !== undefined) {
    return { valor: provincia.leis[leiId], origem: "provincia" };
  }
  if (pais?.leis && pais.leis[leiId] !== undefined) {
    return { valor: pais.leis[leiId], origem: "pais" };
  }
  return { valor: undefined, origem: null };
};

export const getOpcaoAtual = (leiId, leis) => {
  const lei = LEIS_CATALOGO.find((l) => l.id === leiId);
  if (!lei) return null;
  const valorSalvo = leis?.[leiId];
  if (!valorSalvo) return null;
  return (lei.opcoes || []).find((o) => o.id === valorSalvo) || null;
};

export const getCustoLeis = (leis) => {
  let total = 0;
  for (const lei of LEIS_CATALOGO) {
    const opcao = getOpcaoAtual(lei.id, leis);
    if (opcao?.custo) total += opcao.custo;
  }
  return total;
};

export const getImpostoEfetivo = (leis, tipoNegociacao) => {
  const impostoImp = getOpcaoAtual("imposto_importacao", leis);
  const taxaBase = impostoImp?.taxRate !== undefined ? impostoImp.taxRate : 15;

  let modificador = 1;
  const sistemaTrib = getOpcaoAtual("sistema_tributario", leis);
  if (sistemaTrib?.id === "riqueza") modificador += 0.20;
  else if (sistemaTrib?.id === "renda") modificador += 0.10;
  else if (sistemaTrib?.id === "consumo") modificador += 0.05;

  const padrao = getOpcaoAtual("padrao_comercial", leis);
  if (padrao?.id === "livre") modificador -= 0.30;
  else if (padrao?.id === "autarquia") modificador += 0.25;

  const politica = getOpcaoAtual("politica_externa", leis);
  if (politica?.id === "isolacionista") modificador += 0.15;
  else if (politica?.id === "expansionista") modificador -= 0.10;

  if (tipoNegociacao === "corrupcao") modificador -= 0.5;
  if (tipoNegociacao === "concessao") modificador -= 0.2;

  const taxaFinal = Math.max(0, Math.min(80, taxaBase * modificador));
  return Math.round(taxaFinal);
};

export const getFatoresLeis = (leis) => {
  const fatores = {};
  for (const lei of LEIS_CATALOGO) {
    const opcao = getOpcaoAtual(lei.id, leis);
    if (!opcao?.efeitos) continue;
    for (const [k, v] of Object.entries(opcao.efeitos)) {
      if (typeof v !== "number") continue;
      fatores[k] = (fatores[k] || 1) * v;
    }
  }
  return fatores;
};

export const opcaoDesbloqueada = (opcao, pesquisadas) => {
  if (!opcao?.requerTech) return { desbloqueada: true, motivo: "" };
  const set = pesquisadas instanceof Set ? pesquisadas : new Set(pesquisadas || []);
  if (set.has(opcao.requerTech)) return { desbloqueada: true, motivo: "" };
  return { desbloqueada: false, motivo: `Requer pesquisa: ${opcao.requerTech}` };
};

export const leiDesbloqueada = (lei, pesquisadas) => {
  if (!lei?.requerTech) return { desbloqueada: true, motivo: "" };
  const set = pesquisadas instanceof Set ? pesquisadas : new Set(pesquisadas || []);
  if (set.has(lei.requerTech)) return { desbloqueada: true, motivo: "" };
  return { desbloqueada: false, motivo: `Requer pesquisa: ${lei.requerTech}` };
};
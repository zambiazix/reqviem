import { EMPRESA_EDIFICIOS_CATALOGO } from "./empresaEdificios";
import { EDIFICIOS_CATALOGO } from "./edificios";
import { TECNOLOGIAS } from "./tecnologias";
import { getCargoEmpresa } from "./empresaCargos";

const PRIORIDADE = ["chairman", "ceo", "coo", "cfo", "cto", "head_hr", "gerente"];

export const executarIaNpc = (emp, ctx) => {
  const { sedeCofres, edsPorCidade, cofreCentral, pesquisaAtual, tecnologias } = ctx;
  const logs = [];

  const equipe = Array.isArray(emp.equipe) ? emp.equipe : [];
  const npcs = equipe.filter((m) => m.tipo === "npc");
  if (npcs.length === 0) return logs;

  const sedesArr = Array.isArray(emp.sedes) ? emp.sedes : (emp.sede ? [emp.sede] : []);
  if (sedesArr.length === 0) return logs;

  if (Math.random() > 0.4) return logs;

  const ordenados = [...npcs].sort((a, b) => {
    const pa = PRIORIDADE.indexOf(a.cargoId);
    const pb = PRIORIDADE.indexOf(b.cargoId);
    return (pa === -1 ? 999 : pa) - (pb === -1 ? 999 : pb);
  });
  const npc = ordenados[0];
  if (!npc) return logs;

  const cargo = getCargoEmpresa(npc.cargoId);
  if (!cargo) return logs;
  const acessos = npc.acessos || cargo.acessos || [];

  const primeiraSede = sedesArr[0];
  const cofreSede = Number(sedeCofres[primeiraSede.id] || 0);

  // ─── CFO/Banqueiro → construir Banco Corporativo ───
  if (acessos.includes("cofre") && cofreSede > 50000) {
    const edsSede = { ...(edsPorCidade[primeiraSede.id] || {}) };
    const nivelBanco = edsSede["banco_corporativo"] || 0;
    if (nivelBanco < 5) {
      const edBanco = EMPRESA_EDIFICIOS_CATALOGO.find((e) => e.id === "banco_corporativo");
      if (edBanco) {
        const custo = Math.round(edBanco.baseCusto * Math.pow(edBanco.fatorCusto || 1.6, nivelBanco));
        if (cofreSede >= custo * 2) {
          edsSede["banco_corporativo"] = nivelBanco + 1;
          edsPorCidade[primeiraSede.id] = edsSede;
          sedeCofres[primeiraSede.id] = cofreSede - custo;
          logs.push(`🏦 ${npc.nome} (${cargo.nome}) construiu Banco Corporativo Nv ${nivelBanco + 1} em ${primeiraSede.nome}.`);
          return logs;
        }
      }
    }
  }

  // ─── CTO/Químico/Farmacêutico → iniciar pesquisa ───
  if (acessos.includes("pesquisa") && !pesquisaAtual) {
    const disponiveis = TECNOLOGIAS
      .filter((t) => !tecnologias.includes(t.id) && Number(t.custo || 0) <= cofreCentral * 0.4)
      .sort((a, b) => Number(a.custo || 0) - Number(b.custo || 0));
    if (disponiveis.length > 0) {
      ctx.pesquisaIniciar = disponiveis[0].id;
      logs.push(`🔬 ${npc.nome} (${cargo.nome}) iniciou pesquisa: ${disponiveis[0].nome}.`);
      return logs;
    }
  }

  // ─── Gerente/Engenheiro → subir 1 edifício existente ───
  if (acessos.includes("edificios") && cofreSede > 20000) {
    const edsSede = { ...(edsPorCidade[primeiraSede.id] || {}) };
    const candidatos = Object.entries(edsSede).filter(([_, nv]) => nv > 0 && nv < 10);
    if (candidatos.length > 0) {
      const [edId, nv] = candidatos[Math.floor(Math.random() * candidatos.length)];
      const ed = EMPRESA_EDIFICIOS_CATALOGO.find((e) => e.id === edId)
        || EDIFICIOS_CATALOGO.find((e) => e.id === edId);
      if (ed) {
        const custo = Math.round((ed.baseCusto * Math.pow(ed.fatorCusto || 1.6, nv)) * 0.5);
        if (cofreSede >= custo * 2) {
          edsSede[edId] = nv + 1;
          edsPorCidade[primeiraSede.id] = edsSede;
          sedeCofres[primeiraSede.id] = cofreSede - custo;
          logs.push(`🔧 ${npc.nome} (${cargo.nome}) subiu ${ed.nome} pra Nv ${nv + 1} em ${primeiraSede.nome}.`);
          return logs;
        }
      }
    }
  }

  return logs;
};
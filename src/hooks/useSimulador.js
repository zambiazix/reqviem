import { useEffect, useState, useMemo, useCallback } from "react";
import { db } from "../firebaseConfig";
import { collection, onSnapshot } from "firebase/firestore";

const MAPA_SETOR_COMMODITIES = {
  Tecnologia: ["implantes", "celulas", "obsidiana"],
  Energia: ["pyridium", "celulas"],
  Mineração: ["ferro", "carvao", "obsidiana"],
  Cibernética: ["implantes", "obsidiana", "celulas"],
  Farmacêutica: ["medicamentos"],
  Metalurgia: ["aco", "ferro"],
  Financeiro: ["ouro"],
  Agrícola: ["grao", "frutas", "legumes"],
};

const normalizar = (s) =>
  String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");

export default function useSimulador() {
  const [cidades, setCidades] = useState({});
  const [commodities, setCommodities] = useState({});
  const [paises, setPaises] = useState({});
  const [igs, setIgs] = useState({});
  const [provincias, setProvincias] = useState({});

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "sim_cidades"), (snap) => {
      const m = {};
      snap.forEach((d) => { m[d.id] = { id: d.id, ...d.data() }; });
      setCidades(m);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "sim_commodities"), (snap) => {
      const m = {};
      snap.forEach((d) => { m[d.id] = { id: d.id, ...d.data() }; });
      setCommodities(m);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "sim_paises"), (snap) => {
      const m = {};
      snap.forEach((d) => { m[d.id] = { id: d.id, ...d.data() }; });
      setPaises(m);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "sim_igs"), (snap) => {
      const m = {};
      snap.forEach((d) => { m[d.id] = { id: d.id, ...d.data() }; });
      setIgs(m);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "sim_provincias"), (snap) => {
      const m = {};
      snap.forEach((d) => { m[d.id] = { id: d.id, ...d.data() }; });
      setProvincias(m);
    });
    return () => unsub();
  }, []);

  const cidadesPorNome = useMemo(() => {
    const m = {};
    Object.values(cidades).forEach((c) => {
      m[normalizar(c.nome)] = c;
    });
    return m;
  }, [cidades]);

  const getProsperidade = (nomeCidade) => {
    const c = cidadesPorNome[normalizar(nomeCidade)];
    return c?.prosperidade ?? 50;
  };

  const getFatorImovel = (nomeCidade) => {
    const p = getProsperidade(nomeCidade);
    const base = 0.6 + (Math.min(100, Math.max(0, p)) / 100) * 0.8;
    return Math.round(base * 100) / 100;
  };

  const getPrecoCommodity = (id) => {
    const c = commodities[id];
    return c?.precoAtual || c?.precoBase || 0;
  };

  const getPrecoBaseCommodity = (id) => {
    const c = commodities[id];
    return c?.precoBase || 1;
  };

  const getFatorBolsa = (setor, nomeCidade) => {
    const lista = MAPA_SETOR_COMMODITIES[setor] || [];
    if (lista.length === 0) return 1;
    let soma = 0;
    let somaBase = 0;
    lista.forEach((id) => {
      soma += getPrecoCommodity(id);
      somaBase += getPrecoBaseCommodity(id);
    });
    const razao = somaBase > 0 ? soma / somaBase : 1;
    const prosperidade = getProsperidade(nomeCidade);
    const fatorCidade = 0.8 + (Math.min(100, Math.max(0, prosperidade)) / 200);
    const total = razao * fatorCidade;
    return Math.round(Math.max(0.4, Math.min(2.5, total)) * 100) / 100;
  };

  const getPrecoBolsaAjustado = (empresa) => {
    if (!empresa) return 0;
    const fator = getFatorBolsa(empresa.setor, empresa.sede);
    const base = empresa.preco || empresa.precoAtual || 0;
    return Math.round(base * fator * 100) / 100;
  };

  const getProsperidadeCidade = getProsperidade;

  const cidadesDaProvincia = useCallback(
    (provinciaId) => {
      return Object.values(cidades).filter((c) => c.provinciaId === provinciaId);
    },
    [cidades]
  );

  const provinciasDoPais = useCallback(
    (paisId) => {
      return Object.values(provincias).filter((p) => p.paisId === paisId);
    },
    [provincias]
  );

  const meusCargos = useCallback(
    (email) => {
      if (!email) return [];
      const lista = [];
      Object.values(paises).forEach((p) => {
        (p.cargos || []).forEach((c) => {
          if (c.holderEmail === email) {
            lista.push({ ...c, paisId: p.id, paisNome: p.nome, escopoNivel: c.escopoNivel || c.escopo?.nivel || "pais" });
          }
        });
      });
      Object.values(provincias).forEach((p) => {
        (p.cargos || []).forEach((c) => {
          if (c.holderEmail === email) {
            lista.push({
              ...c,
              paisId: p.paisId,
              provinciaId: p.id,
              provinciaNome: p.nome,
              escopo: c.escopo || { nivel: "provincia", alvoId: p.id },
              escopoNivel: "provincia",
            });
          }
        });
      });
      Object.values(cidades).forEach((c) => {
        (c.cargosLocais || []).forEach((cg) => {
          if (cg.holderEmail === email) {
            lista.push({
              ...cg,
              paisId: c.paisId,
              cidadeId: c.id,
              cidadeNome: c.nome,
              escopo: cg.escopo || { nivel: "cidade", alvoId: c.id },
              escopoNivel: "cidade",
            });
          }
        });
      });
      return lista;
    },
    [paises, provincias, cidades]
  );

  const temPoderNoEscopo = useCallback(
    (email, poder, escopoNivel, escopoAlvo) => {
      if (!email) return false;
      const cargos = meusCargos(email);
      return cargos.some((c) => {
        const poderes = c.poderes || [];
        if (!poderes.includes(poder)) return false;
        const nivel = c.escopo?.nivel || c.escopoNivel || "pais";
        const alvo = c.escopo?.alvoId || c.paisId;
        if (nivel === "pais") {
          if (escopoNivel === "pais") return alvo === escopoAlvo || c.paisId === escopoAlvo;
          if (escopoNivel === "provincia" || escopoNivel === "cidade") return c.paisId === escopoAlvo || alvo === escopoAlvo;
          return false;
        }
        if (nivel === "provincia") {
          if (escopoNivel === "provincia") return alvo === escopoAlvo;
          if (escopoNivel === "cidade") {
            const prov = provincias[alvo];
            if (!prov) return false;
            return (prov.cidadesIds || []).includes(escopoAlvo);
          }
          return false;
        }
        if (nivel === "cidade") {
          if (escopoNivel === "cidade") return alvo === escopoAlvo;
          return false;
        }
        return false;
      });
    },
    [meusCargos, provincias]
  );

  return {
    cidades,
    commodities,
    paises,
    igs,
    provincias,
    cidadesPorNome,
    getProsperidade,
    getFatorImovel,
    getFatorBolsa,
    getPrecoBolsaAjustado,
    getPrecoCommodity,
    getProsperidadeCidade,
    meusCargos,
    temPoderNoEscopo,
    cidadesDaProvincia,
    provinciasDoPais,
  };
}
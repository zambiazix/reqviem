import { useEffect } from "react";
import { db } from "../firebaseConfig";
import { doc, getDoc, setDoc } from "firebase/firestore";

export default function ConquistasWatcher({ userEmail }) {
  useEffect(() => {
    if (!userEmail) return;
    
    const verificar = async () => {
      try {
        const conquistasRef = doc(db, "conquistas", userEmail);
        const conquistasSnap = await getDoc(conquistasRef);
        const desbloqueadas = conquistasSnap.exists() ? (conquistasSnap.data().desbloqueadas || {}) : {};
        
        const fichaRef = doc(db, "fichas", userEmail);
        const fichaSnap = await getDoc(fichaRef);
        const ficha = fichaSnap.exists() ? fichaSnap.data() : {};
        
        const xpRef = doc(db, "game", "hud");
        const xpSnap = await getDoc(xpRef);
        const xpMap = xpSnap.exists() ? (xpSnap.data().xpMap || {}) : {};
        
        const novas = { ...desbloqueadas };
        let mudou = false;
        
        const desbloquear = (id) => {
          if (!novas[id]) {
            novas[id] = { data: Date.now() };
            mudou = true;
          }
        };
        
        // 🟢 Primeira vez no mundo
        if (!conquistasSnap.exists()) desbloquear('primeira_vez');
        
        // 🟢 Personagem criado
        if (ficha.nome?.trim()) desbloquear('criador_personagem');
        
        // 🟢 Níveis
        const nivel = xpMap[userEmail]?.level || 1;
        if (nivel >= 2) desbloquear('primeiro_nivel');
        if (nivel >= 5) desbloquear('nivel_5');
        if (nivel >= 10) desbloquear('nivel_10');
        if (nivel >= 20) desbloquear('nivel_20');
        
        // 🟢 Aura
        if (ficha.tipoAura) desbloquear('despertar_aura');
        if (ficha.pericias?.aura >= 5) desbloquear('dominio_aura');
        
        // 🟢 Habilidades
        if (ficha.habilidades?.length >= 1) desbloquear('primeira_habilidade');
        if (ficha.habilidades?.length >= 5) desbloquear('mestre_habilidades');
        if (ficha.habilidades?.some(h => (h.dado || 1) >= 10)) desbloquear('habilidade_maxima');
        
        // 🟢 Dinheiro
        const totalDinheiro = (ficha.carteiras || []).reduce((s, c) => s + (c.valor || 0), 0);
        if (totalDinheiro >= 1000) desbloquear('primeiro_dinheiro');
        if (totalDinheiro >= 100000) desbloquear('rico');
        if (totalDinheiro >= 1000000) desbloquear('milionario');
        
        // 🟢 Imóveis
        if (ficha.imoveis?.length > 0) desbloquear('primeiro_imovel');
        
        // 🟢 Ações
        if (ficha.acoes && Object.keys(ficha.acoes).length > 0) desbloquear('investidor');
        
        // 🟢 Colecionador e Completista
        const total = Object.keys(novas).length;
        if (total >= 20) desbloquear('colecionador');
        if (total >= 35) desbloquear('completista');
        
        if (mudou) {
          await setDoc(conquistasRef, { desbloqueadas: novas }, { merge: true });
        }
      } catch (err) {
        console.error("Erro ao verificar conquistas:", err);
      }
    };
    
    verificar();
    
    // Verificar a cada 15 segundos
    const interval = setInterval(verificar, 15000);
    return () => clearInterval(interval);
  }, [userEmail]);
  
  return null;
}
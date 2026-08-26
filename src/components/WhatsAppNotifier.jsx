import React, { useEffect } from "react";
import { db } from "../firebaseConfig";
import { collection, doc, onSnapshot, query, orderBy, getDoc } from "firebase/firestore";

function WhatsAppNotifier({ userEmail, fichasMap, setNotificacoes }) {
  useEffect(() => {
    if (!userEmail || !fichasMap || Object.keys(fichasMap).length === 0) return;
    
    const todosEmails = Object.keys(fichasMap).filter(email => email !== userEmail);
    const unsubs = [];
    
    todosEmails.forEach((email) => {
      const chatId = [userEmail, email].sort().join("_");
      const ref = collection(db, "whatsapp_chats", chatId, "mensagens");
      const q = query(ref, orderBy("timestamp", "desc"), orderBy("__name__", "desc"));
      
      const unsub = onSnapshot(q, async (snap) => {
        if (snap.docs.length === 0) return;
        
        const ultimaMsg = snap.docs[0];
        const ultimaData = ultimaMsg.data();
        
        // Só notifica se a mensagem é do OUTRO usuário
        if (ultimaData.de !== userEmail) {
          // Buscar última leitura
          const leituraRef = doc(db, "whatsapp_leituras", `${userEmail}_${email}`);
          const leituraSnap = await getDoc(leituraRef);
          const ultimaLida = leituraSnap.exists() ? leituraSnap.data().ultimaLida : null;
          
          // Só notifica se a mensagem é NOVA (não lida)
          if (!ultimaLida || ultimaMsg.id > ultimaLida) {
            setNotificacoes(prev => ({ ...prev, [email]: true }));
          }
        }
      });
      
      unsubs.push(unsub);
    });
    
    return () => unsubs.forEach(u => u());
  }, [userEmail, fichasMap]);
  
  return null;
}

export default React.memo(WhatsAppNotifier);
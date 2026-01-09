
import { GoogleGenAI } from "@google/genai";
import { Statistics } from "../types";

export const getExpertInsights = async (stats: Statistics): Promise<string> => {
  if (!process.env.API_KEY) return "Clé API non configurée. Impossible de générer des insights.";

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `
    En tant que MtSAV, Data Analyst Senior expert en tickets SAV Télécom, analyse les statistiques pour Taroudant.
    
    STATISTIQUES GLOBALES :
    - Total de tickets : ${stats.totalTickets}
    - Taux de respect SLA : ${stats.slaRate.toFixed(2)}% (Cible : 75%)
    - Délai moyen : ${stats.avgDelay.toFixed(2)} jours
    - Réouvertures (RECL) : ${stats.reopenedTickets} tickets (Taux : ${stats.reopenedRate.toFixed(2)}%)
    
    TOP PRODUITS :
    ${stats.ticketsPerProduct.map(p => `- ${p.name}: ${p.value} tickets`).join('\n')}
    
    Ta réponse doit être structurée en français :
    1. Analyse de la performance (SLA & Délais).
    2. Analyse critique des réouvertures (RECL) : Quel impact sur la satisfaction client et la charge de travail ?
    3. Focus RTC : réseau vieillissant et maintenance curative.
    4. Goulots d'étranglement et plan d'action immédiat.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
    });
    
    return response.text || "Désolé, je n'ai pas pu générer d'analyse pour le moment.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Une erreur est survenue lors de la génération des insights experts.";
  }
};

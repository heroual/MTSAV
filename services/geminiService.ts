
import { GoogleGenAI } from "@google/genai";
import { Statistics } from "../types";

// Initialisation de GoogleGenAI avec la clé API du process.env
export const getExpertInsights = async (stats: Statistics): Promise<string> => {
  if (!process.env.API_KEY) return "Clé API non configurée. Impossible de générer des insights.";

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `
    En tant que MtSAV, Data Analyst Senior expert en tickets SAV Télécom (ADSL, Fibre, VPN, VoIP, RTC), analyse les statistiques suivantes pour le secteur de Taroudant et fournis des recommandations stratégiques.
    
    CONTEXTE : 
    - L'objectif (Target) de respect du SLA est fixé à 75%.
    - Pour les tickets concernant le produit "RTC", il est établi que le réseau et le câblage sont vieillissants et nécessitent une maintenance curative et préventive accrue.
    
    STATISTIQUES GLOBALES :
    - Total de tickets : ${stats.totalTickets}
    - Taux de respect SLA actuel : ${stats.slaRate.toFixed(2)}% (Cible : 75%)
    - Délai moyen de traitement : ${stats.avgDelay.toFixed(2)} jours
    
    TOP PRODUITS :
    ${stats.ticketsPerProduct.map(p => `- ${p.name}: ${p.value} tickets`).join('\n')}
    
    TOP SECTEURS (VOLUME) :
    ${stats.ticketsPerSecteur.map(s => `- ${s.name}: ${s.total} tickets (Moyenne délai: ${s.delay.toFixed(2)}j)`).join('\n')}
    
    Ta réponse doit être structurée en français avec les sections suivantes :
    1. Analyse de la performance globale par rapport à l'objectif de 75%.
    2. Focus sur le produit RTC : souligner impérativement la problématique de vétusté du câblage et la nécessité de maintenance.
    3. Identification des goulots d'étranglement par zone technique.
    4. Plan d'action managérial et alertes prioritaires.
    
    Style professionnel, technique, direct et orienté décisionnel.
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

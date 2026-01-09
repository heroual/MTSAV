
import * as XLSX from 'xlsx';
import { Ticket, Statistics } from '../types';
import { format, parse, isValid } from 'date-fns';

const MOTIF_MAPPING: Record<string, string> = {
  'GRFD': 'Fibre optique en dérangement',
  'GBF': 'Fibre Mauvaise',
  'CPSW': 'Porté Signal Wiffi',
  'CICE': 'Client injoinable/contact erroné',
  'GBCA': 'Câble Optique Arraché',
  'CCM': 'Configuration matériel',
  'CAIN': 'Client Absent/Injoignable',
  'CAT': 'Assistance téléphonique',
  'CRDV': 'Client reporte rendez-Vous',
  'GECO': 'Changement ONT',
  'RLD': 'Ligne en dérangement',
  'RDLD': 'Débit limité par la distance',
  'CECC': 'Coupure secteur',
  'CCID': 'Câblage interne dégradé'
};

export const parseExcelFile = async (file: File): Promise<Ticket[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
        
        if (rows.length < 4) {
          throw new Error("Le fichier ne contient pas assez de données (attendu : en-têtes à la ligne 3, données à partir de la ligne 4).");
        }

        const headers = rows[2]; // Ligne 3 (index 2)
        const dataRows = rows.slice(3); // À partir de la ligne 4 (index 3)

        const getIdx = (name: string) => headers.findIndex(h => h && h.toString().toLowerCase().includes(name.toLowerCase()));
        
        const idxND = getIdx('ND');
        const idxProduit = getIdx('Produit');
        const idxSecteur = getIdx('Secteur');
        const idxZR = getIdx('ZR');
        const idxMotif = getIdx('Motif');
        const idxType = getIdx('Type');
        const idxTypeRecours = getIdx('Recours');
        const idxDateEnreg = getIdx('Enreg');
        const idxDateCloture = getIdx('clôture');
        const idxDelai = getIdx('Délai');
        const idxGroupe = getIdx('Groupe');

        const tickets: Ticket[] = dataRows
          .filter(row => row[idxND])
          .map((row, index) => {
            const dateEnreg = row[idxDateEnreg];
            const dateCloture = row[idxDateCloture];
            const delai = parseFloat(row[idxDelai]) || 0;
            const groupe = String(row[idxGroupe] || '').toUpperCase();
            let produitRaw = String(row[idxProduit] || 'Inconnu');

            if (groupe.includes('VOIP FTTH')) {
              produitRaw = 'VOIP';
            }

            if (produitRaw.toUpperCase() === 'VOIP FO') {
              produitRaw = 'VOIP';
            }
            
            const motifRaw = String(row[idxMotif] || 'Inconnu');
            const motif = MOTIF_MAPPING[motifRaw.toUpperCase()] || motifRaw;

            const validDateEnreg = dateEnreg instanceof Date ? dateEnreg : new Date(dateEnreg);
            const validDateCloture = dateCloture instanceof Date ? dateCloture : (dateCloture ? new Date(dateCloture) : null);

            return {
              id: `ticket-${index}`,
              nd: String(row[idxND] || ''),
              produit: produitRaw,
              secteur: String(row[idxSecteur] || 'Inconnu'),
              zr: String(row[idxZR] || 'Inconnu'),
              motif: motif,
              type: String(row[idxType] || 'Inconnu'),
              typeRecours: String(row[idxTypeRecours] || ''),
              dateEnreg: isValid(validDateEnreg) ? validDateEnreg : new Date(),
              dateCloture: validDateCloture && isValid(validDateCloture) ? validDateCloture : null,
              delai: delai,
              isSlaRespected: delai < 1,
              moisAnnee: isValid(validDateEnreg) ? format(validDateEnreg, 'yyyy-MM') : '0000-00'
            };
          });

        resolve(tickets);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
};

export const calculateStats = (tickets: Ticket[]): Statistics => {
  const total = tickets.length;
  if (total === 0) {
    return {
      totalTickets: 0, respectedSla: 0, exceededSla: 0, slaRate: 0, avgDelay: 0,
      reopenedTickets: 0, reopenedRate: 0,
      ticketsPerMonth: [], ticketsPerProduct: [], ticketsPerSecteur: [], ticketsPerZR: [],
      ticketsPerMotif: [], ticketsPerType: []
    };
  }

  const respected = tickets.filter(t => t.isSlaRespected).length;
  const avgDelay = tickets.reduce((acc, t) => acc + t.delai, 0) / total;
  
  // Analyse des réouvertures (RECL dans Type Recours)
  const reopened = tickets.filter(t => t.typeRecours.toUpperCase().includes('RECL')).length;
  const reopenedRate = (reopened / total) * 100;

  const monthMap: Record<string, { total: number; sla: number }> = {};
  tickets.forEach(t => {
    if (!monthMap[t.moisAnnee]) monthMap[t.moisAnnee] = { total: 0, sla: 0 };
    monthMap[t.moisAnnee].total++;
    if (t.isSlaRespected) monthMap[t.moisAnnee].sla++;
  });
  const ticketsPerMonth = Object.entries(monthMap)
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const prodMap: Record<string, number> = {};
  tickets.forEach(t => {
    prodMap[t.produit] = (prodMap[t.produit] || 0) + 1;
  });
  const ticketsPerProduct = Object.entries(prodMap).map(([name, value]) => ({ name, value }));

  const motifMap: Record<string, number> = {};
  tickets.forEach(t => {
    motifMap[t.motif] = (motifMap[t.motif] || 0) + 1;
  });
  const ticketsPerMotif = Object.entries(motifMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  const typeMap: Record<string, number> = {};
  tickets.forEach(t => {
    typeMap[t.type] = (typeMap[t.type] || 0) + 1;
  });
  const ticketsPerType = Object.entries(typeMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const sectMap: Record<string, { total: number; delay: number }> = {};
  tickets.forEach(t => {
    if (!sectMap[t.secteur]) sectMap[t.secteur] = { total: 0, delay: 0 };
    sectMap[t.secteur].total++;
    sectMap[t.secteur].delay += t.delai;
  });
  const ticketsPerSecteur = Object.entries(sectMap).map(([name, data]) => ({
    name,
    total: data.total,
    delay: data.delay / data.total
  })).sort((a, b) => b.total - a.total).slice(0, 10);

  const zrMap: Record<string, { total: number; delay: number }> = {};
  tickets.forEach(t => {
    if (!zrMap[t.zr]) zrMap[t.zr] = { total: 0, delay: 0 };
    zrMap[t.zr].total++;
    zrMap[t.zr].delay += t.delai;
  });
  const ticketsPerZR = Object.entries(zrMap).map(([name, data]) => ({
    name,
    total: data.total,
    delay: data.delay / data.total
  })).sort((a, b) => b.total - a.total).slice(0, 10);

  return {
    totalTickets: total,
    respectedSla: respected,
    exceededSla: total - respected,
    slaRate: (respected / total) * 100,
    avgDelay,
    reopenedTickets: reopened,
    reopenedRate,
    ticketsPerMonth,
    ticketsPerProduct,
    ticketsPerSecteur,
    ticketsPerZR,
    ticketsPerMotif,
    ticketsPerType
  };
};

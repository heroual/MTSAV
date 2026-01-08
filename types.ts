
export interface Ticket {
  id: string;
  nd: string;
  produit: string;
  secteur: string;
  zr: string;
  motif: string;
  type: string;
  dateEnreg: Date;
  dateCloture: Date | null;
  delai: number;
  isSlaRespected: boolean;
  moisAnnee: string; // Format YYYY-MM
}

export type SecteurMapping = Record<string, string>; // ZR -> Nom du Secteur

export interface FilterState {
  produit: string[];
  secteur: string[];
  zr: string[];
  motif: string[];
  type: string[];
  mois: string[];
  statusSla: 'all' | 'respected' | 'exceeded';
  searchQuery: string;
}

export interface Statistics {
  totalTickets: number;
  respectedSla: number;
  exceededSla: number;
  slaRate: number;
  avgDelay: number;
  ticketsPerMonth: { name: string; total: number; sla: number }[];
  ticketsPerProduct: { name: string; value: number }[];
  ticketsPerSecteur: { name: string; total: number; delay: number }[];
  ticketsPerZR: { name: string; total: number; delay: number }[];
  ticketsPerMotif: { name: string; value: number }[];
  ticketsPerType: { name: string; value: number }[];
}


import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { Statistics, Ticket, FilterState } from '../types';
import { format } from 'date-fns';

export const generatePDFReport = (stats: Statistics, tickets: Ticket[], filters: FilterState) => {
  const doc = new jsPDF() as any;
  const pageWidth = doc.internal.pageSize.getWidth();
  const today = format(new Date(), 'dd/MM/yyyy HH:mm');

  // --- Header ---
  doc.setFillColor(220, 38, 38); // Red 600
  doc.rect(0, 0, pageWidth, 45, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(26);
  doc.setFont('helvetica', 'bold');
  doc.text('RAPPORT EXÉCUTIF MtSAV-Taroudant', 15, 22);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('PLATEFORME ANALYTIQUE TÉLÉCOM DE PRÉCISION', 15, 32);
  doc.text(`DATE DE GÉNÉRATION : ${today}`, pageWidth - 15, 32, { align: 'right' });

  // --- Filter Summary ---
  doc.setTextColor(153, 27, 27); // Red 800
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  let filterText = `FILTRES ACTIFS : ${filters.statusSla === 'all' ? 'CONSOLIDÉ' : filters.statusSla === 'respected' ? 'CONFORME SLA' : 'CRITIQUE (HORS DÉLAI)'}`;
  if (filters.searchQuery) filterText += ` | RECHERCHE : "${filters.searchQuery.toUpperCase()}"`;
  doc.text(filterText, 15, 52);

  // --- KPI Cards ---
  const cardWidth = (pageWidth - 40) / 4;
  const cardY = 58;
  const cardHeight = 30;

  const drawCard = (x: number, label: string, value: string, isAlert: boolean = false) => {
    doc.setFillColor(254, 242, 242); // Red 50
    doc.roundedRect(x, cardY, cardWidth, cardHeight, 4, 4, 'F');
    doc.setDrawColor(252, 165, 165); // Red 300
    doc.roundedRect(x, cardY, cardWidth, cardHeight, 4, 4, 'S');
    
    doc.setTextColor(153, 27, 27);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text(label, x + 5, cardY + 10);
    
    doc.setTextColor(isAlert ? 220 : 31, isAlert ? 38 : 41, isAlert ? 38 : 55);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(value, x + 5, cardY + 22);
  };

  drawCard(15, 'VOLUME DES TICKETS', `${stats.totalTickets}`);
  drawCard(15 + cardWidth + 3, 'PERFORMANCE SLA', `${stats.slaRate.toFixed(1)}%`, stats.slaRate < 75);
  drawCard(15 + (cardWidth + 3) * 2, 'DÉLAI MOYEN (J)', `${stats.avgDelay.toFixed(2)}`, stats.avgDelay > 1.5);
  drawCard(15 + (cardWidth + 3) * 3, 'ALERTES CRITIQUES', `${stats.exceededSla}`, stats.exceededSla > 0);

  // --- Analysis Tables ---
  doc.setTextColor(31, 41, 55);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('SEGMENTATION OPÉRATIONNELLE', 15, 100);

  doc.autoTable({
    startY: 105,
    head: [['OFFRE PRODUIT', 'VOLUME', 'POURCENTAGE']],
    body: stats.ticketsPerProduct.map(p => [
      p.name.toUpperCase(), 
      p.value, 
      `${((p.value / stats.totalTickets) * 100).toFixed(1)}%`
    ]),
    theme: 'striped',
    headStyles: { fillColor: [220, 38, 38], fontStyle: 'bold' },
    margin: { left: 15, right: pageWidth / 2 + 5 },
    styles: { fontSize: 8, font: 'helvetica' }
  });

  doc.autoTable({
    startY: 105,
    head: [['TOP 10 MOTIFS CRITIQUES', 'TICKETS']],
    body: stats.ticketsPerMotif.map(m => [m.name.toUpperCase(), m.value]),
    theme: 'striped',
    headStyles: { fillColor: [31, 41, 55], fontStyle: 'bold' },
    margin: { left: pageWidth / 2 + 5, right: 15 },
    styles: { fontSize: 7, font: 'helvetica' }
  });

  doc.autoTable({
    startY: doc.lastAutoTable.finalY + 15,
    head: [['RÉGION / SECTEUR', 'VOLUME TICKETS', 'DÉLAI MOYEN (J)']],
    body: stats.ticketsPerSecteur.map(s => [s.name.toUpperCase(), s.total, s.delay.toFixed(2)]),
    theme: 'grid',
    headStyles: { fillColor: [220, 38, 38], fontStyle: 'bold' },
    margin: { left: 15, right: 15 },
    styles: { fontSize: 9, font: 'helvetica' }
  });

  // --- Detail Page ---
  doc.addPage();
  doc.setFillColor(31, 41, 55);
  doc.rect(0, 0, pageWidth, 18, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('EXTRACT OPÉRATIONNEL (ÉCHANTILLON 100)', 15, 12);

  doc.autoTable({
    startY: 25,
    head: [['ND / LOGIN', 'OFFRE', 'REGION', 'ZR', 'DÉLAI', 'STATUT']],
    body: tickets.slice(0, 100).map(t => [
      t.nd,
      t.produit.toUpperCase(),
      t.secteur.toUpperCase(),
      t.zr,
      t.delai.toFixed(2),
      t.isSlaRespected ? 'CONFORME' : 'CRITIQUE'
    ]),
    theme: 'striped',
    headStyles: { fillColor: [220, 38, 38], fontStyle: 'bold' },
    columnStyles: {
        4: { halign: 'center', fontStyle: 'bold' },
        5: { halign: 'center', fontStyle: 'bold' }
    },
    didParseCell: (data: any) => {
        if (data.section === 'body' && data.column.index === 5) {
            if (data.cell.raw === 'CRITIQUE') {
                data.cell.styles.textColor = [220, 38, 38];
                data.cell.styles.fontStyle = 'bold';
            } else {
                data.cell.styles.textColor = [5, 150, 105];
            }
        }
    },
    styles: { fontSize: 7, font: 'helvetica' }
  });

  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(156, 163, 175);
    doc.text(`MtSAV-Taroudant ANALYTIQUE - DOCUMENT CONFIDENTIEL - PAGE ${i} SUR ${totalPages}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
  }

  doc.save(`Rapport_Executif_MtSAV-Taroudant_${format(new Date(), 'yyyyMMdd')}.pdf`);
};

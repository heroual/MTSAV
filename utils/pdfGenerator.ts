
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { Statistics, Ticket, FilterState } from '../types';
import { format } from 'date-fns';

export const generatePDFReport = (stats: Statistics, tickets: Ticket[], filters: FilterState) => {
  const doc = new jsPDF() as any;
  const pageWidth = doc.internal.pageSize.getWidth();
  const today = format(new Date(), 'dd/MM/yyyy HH:mm');

  // PAGE 1: HEADER & KPI
  doc.setFillColor(220, 38, 38); 
  doc.rect(0, 0, pageWidth, 45, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(26);
  doc.setFont('helvetica', 'bold');
  doc.text('RAPPORT EXÉCUTIF MtSAV-Taroudant', 15, 22);
  
  doc.setFontSize(10);
  doc.text('PLATEFORME ANALYTIQUE TÉLÉCOM DE PRÉCISION', 15, 32);
  doc.text(`DATE : ${today}`, pageWidth - 15, 32, { align: 'right' });

  const cardWidth = (pageWidth - 50) / 5;
  const cardY = 58;
  const cardHeight = 30;

  const drawCard = (x: number, label: string, value: string, isAlert: boolean = false) => {
    doc.setFillColor(254, 242, 242);
    doc.roundedRect(x, cardY, cardWidth, cardHeight, 4, 4, 'F');
    doc.setTextColor(153, 27, 27);
    doc.setFontSize(6);
    doc.text(label, x + 5, cardY + 10);
    doc.setTextColor(isAlert ? 220 : 31, isAlert ? 38 : 41, isAlert ? 38 : 55);
    doc.setFontSize(12);
    doc.text(value, x + 5, cardY + 22);
  };

  drawCard(15, 'VOLUME TOTAL', `${stats.totalTickets}`);
  drawCard(15 + cardWidth + 3, 'PERF SLA', `${stats.slaRate.toFixed(1)}%`, stats.slaRate < 75);
  drawCard(15 + (cardWidth + 3) * 2, 'DÉLAI MOY (J)', `${stats.avgDelay.toFixed(2)}`);
  drawCard(15 + (cardWidth + 3) * 3, 'ALERTES', `${stats.exceededSla}`, stats.exceededSla > 0);
  drawCard(15 + (cardWidth + 3) * 4, 'RECL', `${stats.reopenedTickets}`, stats.reopenedRate > 5);

  doc.setTextColor(31, 41, 55);
  doc.setFontSize(14);
  doc.text('ANALYSE PAR PRODUIT & RÉOUVERTURES', 15, 100);

  doc.autoTable({
    startY: 105,
    head: [['OFFRE PRODUIT', 'VOLUME', 'RÉOUVERTURES (RECL)']],
    body: stats.ticketsPerProduct.map(p => {
        const prodTickets = tickets.filter(t => t.produit === p.name);
        const prodRecl = prodTickets.filter(t => t.typeRecours.toUpperCase().includes('RECL')).length;
        return [p.name.toUpperCase(), p.value, prodRecl];
    }),
    theme: 'striped',
    headStyles: { fillColor: [220, 38, 38] },
    margin: { left: 15, right: 15 },
    styles: { fontSize: 8 }
  });

  // PAGE 2: MOTIFS, TYPES & ZR
  doc.addPage();
  
  doc.setFillColor(31, 41, 55);
  doc.rect(0, 0, pageWidth, 20, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.text('SEGMENTATION OPÉRATIONNELLE DÉTAILLÉE', 15, 13);

  doc.setTextColor(31, 41, 55);
  doc.setFontSize(14);
  doc.text('PARETO DES MOTIFS DE CLÔTURE', 15, 35);
  
  doc.autoTable({
    startY: 40,
    head: [['MOTIF DE CLÔTURE', 'VOLUME']],
    body: stats.ticketsPerMotif.map(m => [m.name, m.value]),
    theme: 'striped',
    headStyles: { fillColor: [220, 38, 38] },
    margin: { left: 15, right: 15 },
    styles: { fontSize: 8 }
  });

  const nextY = (doc as any).lastAutoTable.finalY + 15;
  doc.text('TYPOLOGIE DES RÉCLAMATIONS', 15, nextY);

  doc.autoTable({
    startY: nextY + 5,
    head: [['TYPE DE RÉCLAMATION', 'VOLUME']],
    body: stats.ticketsPerType.map(t => [t.name, t.value]),
    theme: 'striped',
    headStyles: { fillColor: [30, 41, 59] },
    margin: { left: 15, right: 15 },
    styles: { fontSize: 8 }
  });

  const nextY2 = (doc as any).lastAutoTable.finalY + 15;
  doc.text('TOP 10 UNITÉS TECHNIQUES (ZR)', 15, nextY2);

  doc.autoTable({
    startY: nextY2 + 5,
    head: [['UNITÉ (ZR)', 'VOLUME', 'DÉLAI MOYEN (J)']],
    body: stats.ticketsPerZR.map(z => [z.name, z.total, z.delay.toFixed(2)]),
    theme: 'striped',
    headStyles: { fillColor: [220, 38, 38] },
    margin: { left: 15, right: 15 },
    styles: { fontSize: 8 }
  });

  // FOOTER
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(156, 163, 175);
    doc.text(`MtSAV-Taroudant ANALYTIQUE - PAGE ${i}/${totalPages}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
  }

  doc.save(`Rapport_Executif_MtSAV-Taroudant_${format(new Date(), 'yyyyMMdd')}.pdf`);
};

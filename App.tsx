
import React, { useState, useMemo, useEffect } from 'react';
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { 
  FileText, TrendingUp, AlertCircle, Clock, CheckCircle, 
  MapPin, Filter, Download, Zap, Loader2, Info, Settings, Search, Tag, ListFilter, FileDown, X, RotateCcw
} from 'lucide-react';
import { Ticket, FilterState, Statistics, SecteurMapping } from './types';
import { parseExcelFile, calculateStats } from './utils/dataProcessor';
import { getExpertInsights } from './services/geminiService';
import { generatePDFReport } from './utils/pdfGenerator';
import StatCard from './components/StatCard';
import Filters from './components/Filters';
import SecteurMapper from './components/SecteurMapper';

// Palette de couleurs pour les graphiques - Accentuation du rouge
const COLORS = ['#dc2626', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#64748b', '#ef4444'];

// Mappings par défaut pour le secteur Taroudant
const DEFAULT_MAPPINGS: SecteurMapping = {
  "AIG-IGH00": "Taroudant", "AIG-IGH31": "Taroudant", "AIZ-AIZ00": "Taroudant", "AIZ-AIZ01": "Taroudant",
  "ALZ-ALZ00": "Taroudant", "ALZ-ALZ01": "Taroudant", "ALZ-ALZ02": "Taroudant", "AOB-OBR00": "Taroudant",
  "AOB-OBR01": "Taroudant", "AOB-OBR02": "Taroudant", "AOB-OBR11": "Taroudant", "ATL-TAL00": "Taroudant",
  "ATL-TAL42": "Taroudant", "ATME-ATM00": "Taroudant", "ATR-TAR00": "Taroudant", "ATR-TAR01": "Taroudant",
  "ATR-TAR02": "Taroudant", "ATR-TAR03": "Taroudant", "ATR-TAR04": "Taroudant", "ATR-TAR05": "Taroudant",
  "ATR-TAR06": "Taroudant", "ATR-TAR07": "Taroudant", "ATR-TAR08": "Taroudant", "ATR-TAR09": "Taroudant",
  "ATR-TAR11": "Taroudant", "ATR-TAR12": "Taroudant", "ATR-TAR13": "Taroudant", "ATR-TAR14": "Taroudant",
  "ATR-TAR15": "Taroudant", "ATR-TAR17": "Taroudant", "ATR-TAR18": "Taroudant", "ATR-TAR33": "Taroudant",
  "ATR-TAR45": "Taroudant", "ATR-TAR56": "Taroudant", "OAIG-ZO": "Taroudant", "OAIZ-ZO": "Taroudant",
  "OAMTR01-ZO": "Taroudant", "OAMTR02-ZO": "Taroudant", "OAMTR04-ZO": "Taroudant", "OAMTR05-ZO": "Taroudant",
  "OAMTR08-ZO": "Taroudant", "OAMTR10-ZO": "Taroudant", "OAMTR11-ZO": "Taroudant", "OAMTR14-ZO": "Taroudant",
  "OAMTR15-ZO": "Taroudant", "OAOB-ZO": "Taroudant", "OAOB37-ZO": "Taroudant", "OATIG-ZO": "Taroudant",
  "OATL-ZO": "Taroudant", "OATL42-ZO": "Taroudant", "OATNO-ZO": "Taroudant", "OATR-ZO": "Taroudant",
  "OATR35-ZO": "Taroudant", "OATR42-ZO": "Taroudant", "OATR59-ZO": "Taroudant"
};

const App: React.FC = () => {
  const [rawTickets, setRawTickets] = useState<Ticket[]>([]);
  const [mappings, setMappings] = useState<SecteurMapping>(DEFAULT_MAPPINGS);
  const [showMapper, setShowMapper] = useState(false);
  
  const [filters, setFilters] = useState<FilterState>({
    produit: [],
    secteur: [],
    zr: [],
    motif: [],
    type: [],
    mois: [],
    statusSla: 'all',
    statusReouverture: 'all',
    searchQuery: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState<string>('');
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mappedTickets = useMemo(() => {
    return rawTickets.map(ticket => {
      const customSecteur = mappings[ticket.zr];
      if (customSecteur) {
        return { ...ticket, secteur: customSecteur };
      }
      return ticket;
    });
  }, [rawTickets, mappings]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    try {
      const parsed = await parseExcelFile(file);
      setRawTickets(parsed);
      setInsights(''); 
    } catch (err: any) {
      setError(err.message || "Erreur lors de la lecture du fichier Excel.");
    } finally {
      setLoading(false);
    }
  };

  const filteredTickets = useMemo(() => {
    const query = filters.searchQuery.toLowerCase();
    return mappedTickets.filter(t => {
      const matchProd = filters.produit.length === 0 || filters.produit.includes(t.produit);
      const matchSecteur = filters.secteur.length === 0 || filters.secteur.includes(t.secteur);
      const matchZR = filters.zr.length === 0 || filters.zr.includes(t.zr);
      const matchMotif = filters.motif.length === 0 || filters.motif.includes(t.motif);
      const matchType = filters.type.length === 0 || filters.type.includes(t.type);
      const matchMonth = filters.mois.length === 0 || filters.mois.includes(t.moisAnnee);
      const matchSla = 
        filters.statusSla === 'all' || 
        (filters.statusSla === 'respected' && t.isSlaRespected) || 
        (filters.statusSla === 'exceeded' && !t.isSlaRespected);
      
      const matchReouverture = 
        filters.statusReouverture === 'all' ||
        (filters.statusReouverture === 'reopened' && t.typeRecours.toUpperCase().includes('RECL')) ||
        (filters.statusReouverture === 'normal' && !t.typeRecours.toUpperCase().includes('RECL'));

      const matchSearch = query === '' || 
        t.nd.toLowerCase().includes(query) || 
        t.zr.toLowerCase().includes(query) || 
        t.motif.toLowerCase().includes(query) ||
        t.type.toLowerCase().includes(query) ||
        t.secteur.toLowerCase().includes(query);
      
      return matchProd && matchSecteur && matchZR && matchMotif && matchType && matchMonth && matchSla && matchReouverture && matchSearch;
    });
  }, [mappedTickets, filters]);

  const stats = useMemo(() => calculateStats(filteredTickets), [filteredTickets]);
  const allZrs = useMemo(() => Array.from(new Set(rawTickets.map(t => t.zr))).sort(), [rawTickets]);

  const generateInsights = async () => {
    if (filteredTickets.length === 0) return;
    setLoadingInsights(true);
    try {
      const text = await getExpertInsights(stats);
      setInsights(text);
    } catch (err) {
      setInsights("Impossible de générer des analyses pour le moment.");
    } finally {
      setLoadingInsights(false);
    }
  };

  const handleExportPDF = () => {
    if (filteredTickets.length === 0) return;
    setExportingPDF(true);
    try {
      generatePDFReport(stats, filteredTickets, filters);
    } catch (err) {
      console.error("Erreur export PDF:", err);
      setError("Impossible de générer le rapport PDF.");
    } finally {
      setExportingPDF(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col selection:bg-red-100 selection:text-red-900">
      {/* Mapper Modal */}
      {showMapper && (
        <SecteurMapper 
          allZrs={allZrs}
          mappings={mappings}
          onSave={setMappings}
          onClose={() => setShowMapper(false)}
        />
      )}

      {/* Header */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-30 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center space-x-3 shrink-0">
            <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-red-100">
              <Zap size={24} />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-xl font-black text-slate-900 leading-tight tracking-tight italic">MtSAV-Taroudant</h1>
              <p className="text-[10px] text-red-600 font-bold uppercase tracking-[0.2em]">Excellence Data</p>
            </div>
          </div>

          {/* Global Search Bar */}
          <div className="flex-1 max-w-xl relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search size={18} />
            </div>
            <input 
              type="text" 
              placeholder="ND, ZR, motif ou secteur..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-transparent rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-red-600/10 focus:border-red-600 transition-all outline-none border"
              value={filters.searchQuery}
              onChange={(e) => setFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
            />
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            {rawTickets.length > 0 && (
              <>
                <button 
                  onClick={handleExportPDF}
                  disabled={exportingPDF}
                  className="flex items-center space-x-2 bg-slate-50 hover:bg-red-50 text-slate-700 hover:text-red-600 px-3 py-2.5 rounded-xl transition-all border border-slate-100 hover:border-red-100 text-sm font-bold disabled:opacity-50 group"
                  title="Exporter le rapport PDF"
                >
                  {exportingPDF ? <Loader2 className="animate-spin" size={18} /> : <FileDown size={18} />}
                  <span className="hidden lg:inline">Rapport PDF</span>
                </button>
                <button 
                  onClick={() => setShowMapper(true)}
                  className="hidden md:flex items-center space-x-2 bg-slate-50 hover:bg-slate-100 text-slate-700 px-3 py-2.5 rounded-xl transition-all border border-slate-100 text-sm font-bold"
                >
                  <Settings size={18} />
                  <span className="hidden lg:inline">Secteurs</span>
                </button>
              </>
            )}
            <label className="cursor-pointer flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-red-100 text-sm font-bold">
              <Download size={18} />
              <span className="hidden sm:inline">Import Excel</span>
              <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleFileUpload} />
            </label>
            {rawTickets.length > 0 && (
              <button 
                onClick={generateInsights}
                disabled={loadingInsights}
                className="hidden sm:flex items-center space-x-2 bg-slate-900 hover:bg-black text-white px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-slate-200 text-sm font-bold disabled:opacity-50"
              >
                {loadingInsights ? <Loader2 className="animate-spin" size={18} /> : <TrendingUp size={18} />}
                <span>Analyses IA</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-[1600px] mx-auto w-full p-4 lg:p-6 flex flex-col lg:flex-row gap-8">
        
        {/* Sidebar Filters */}
        {rawTickets.length > 0 && (
          <aside className="w-full lg:w-72 shrink-0 lg:sticky lg:top-24 h-[calc(100vh-8rem)]">
            <Filters tickets={mappedTickets} filters={filters} setFilters={setFilters} />
          </aside>
        )}

        {/* Dashboard Area */}
        <div className="flex-1 space-y-8 overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-[60vh] text-slate-400">
              <Loader2 className="animate-spin mb-4 text-red-600" size={48} />
              <p className="text-lg font-bold text-slate-900 tracking-tight">Intelligence Opérationnelle en cours...</p>
            </div>
          ) : rawTickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[70vh] bg-slate-50/50 rounded-[2rem] border-2 border-dashed border-slate-200">
              <div className="bg-white p-8 rounded-3xl shadow-xl shadow-slate-100 mb-8">
                <FileText size={56} className="text-red-600" />
              </div>
              <h2 className="text-3xl font-black text-slate-900 mb-3 tracking-tight">Analytique SAV de Précision</h2>
              <p className="text-slate-500 max-w-md text-center mb-10 font-medium">
                Importez vos données de signalements pour générer un tableau de bord haute performance et des analyses stratégiques.
              </p>
              <label className="cursor-pointer bg-red-600 hover:bg-red-700 text-white px-10 py-4 rounded-2xl transition-all shadow-2xl shadow-red-200 font-black flex items-center space-x-4 group">
                <Download size={24} className="group-hover:translate-y-0.5 transition-transform" />
                <span>DÉMARRER L'ANALYSE</span>
                <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleFileUpload} />
              </label>
            </div>
          ) : (
            <>
              {error && (
                <div className="bg-red-50 border border-red-100 text-red-700 p-5 rounded-2xl flex items-center space-x-4 animate-in fade-in slide-in-from-top-2">
                  <AlertCircle size={24} />
                  <p className="font-bold">{error}</p>
                </div>
              )}

              {/* Top Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <StatCard 
                  label="VOLUME TOTAL" 
                  value={stats.totalTickets} 
                  icon={<FileText size={24} />} 
                  color="slate"
                  subValue="Tickets filtrés"
                />
                <StatCard 
                  label="PERFORMANCE SLA" 
                  value={`${stats.slaRate.toFixed(1)}%`} 
                  icon={<CheckCircle size={24} />} 
                  color={stats.slaRate >= 75 ? "green" : stats.slaRate > 60 ? "amber" : "red"}
                  subValue="Cible : 75%"
                />
                <StatCard 
                  label="DÉLAI MOYEN" 
                  value={`${stats.avgDelay.toFixed(2)}j`} 
                  icon={<Clock size={24} />} 
                  color={stats.avgDelay < 1.5 ? "green" : "red"}
                  subValue="Traitement"
                />
                <StatCard 
                  label="ALERTE RETARD" 
                  value={stats.exceededSla} 
                  icon={<AlertCircle size={24} />} 
                  color="red"
                  subValue="Priorité haute"
                />
                <StatCard 
                  label="RÉOUVERTURES" 
                  value={stats.reopenedTickets} 
                  icon={<RotateCcw size={24} />} 
                  color={stats.reopenedRate < 5 ? "green" : "red"}
                  subValue={`Taux: ${stats.reopenedRate.toFixed(1)}%`}
                />
              </div>

              {/* Gemini Insights Section */}
              {insights && (
                <div className="bg-slate-900 text-white p-10 rounded-[2.5rem] shadow-2xl relative overflow-hidden group animate-in zoom-in-95 duration-500">
                  <button 
                    onClick={() => setInsights('')}
                    className="absolute top-8 right-8 p-2 text-slate-400 hover:text-white transition-colors z-20 bg-slate-800/50 rounded-full"
                    title="Fermer l'analyse"
                  >
                    <X size={20} />
                  </button>
                  
                  <div className="absolute top-0 right-0 w-96 h-96 bg-red-600/20 rounded-full -mr-32 -mt-32 blur-3xl pointer-events-none group-hover:bg-red-600/30 transition-colors duration-1000"></div>
                  <div className="relative z-10">
                    <div className="flex items-center space-x-4 mb-8">
                      <div className="p-3 bg-red-600 rounded-xl shadow-lg shadow-red-900/50">
                        <Zap size={24} />
                      </div>
                      <h2 className="text-2xl font-black tracking-tight italic uppercase">ANALYSE STRATÉGIQUE MtSAV-Taroudant</h2>
                    </div>
                    <div className="prose prose-invert max-w-none">
                      {insights.split('\n').map((line, i) => (
                        <p key={i} className="mb-3 text-slate-300 leading-relaxed text-sm lg:text-base font-medium">
                          {line}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Charts Grid */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 pb-12">
                
                {/* Evolution Temporelle */}
                <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                  <h3 className="text-lg font-black text-slate-900 mb-8 flex items-center justify-between uppercase tracking-tighter italic">
                    <span>Évolution Temporelle</span>
                    <TrendingUp size={20} className="text-red-600" />
                  </h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={stats.ticketsPerMonth}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} fontWeight="700" tickLine={false} axisLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={12} fontWeight="700" tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }} />
                        <Legend verticalAlign="top" align="right" iconType="circle" />
                        <Line type="monotone" dataKey="total" name="Total" stroke="#dc2626" strokeWidth={4} dot={{ r: 5, fill: '#dc2626', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 7 }} />
                        <Line type="monotone" dataKey="sla" name="SLA OK" stroke="#10b981" strokeWidth={4} dot={{ r: 5, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Mix par Produit */}
                <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                  <h3 className="text-lg font-black text-slate-900 mb-8 flex items-center justify-between uppercase tracking-tighter italic">
                    <span>Mix par Produit (%)</span>
                    <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></div>
                  </h3>
                  <div className="h-80 flex items-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={stats.ticketsPerProduct}
                          cx="50%" cy="50%" innerRadius={80} outerRadius={110} paddingAngle={8} dataKey="value"
                        >
                          {stats.ticketsPerProduct.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle" />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Pareto des Motifs */}
                <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                  <h3 className="text-lg font-black text-slate-900 mb-8 flex items-center justify-between uppercase tracking-tighter italic">
                    <span>Top Motifs de Clôture</span>
                    <Tag size={20} className="text-red-600" />
                  </h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.ticketsPerMotif} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" width={140} fontSize={10} fontWeight="700" tickLine={false} axisLine={false} />
                        <Tooltip cursor={{fill: '#fff1f1'}} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                        <Bar dataKey="value" name="Tickets" fill="#dc2626" radius={[0, 8, 8, 0]} barSize={20} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Typologie */}
                <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                  <h3 className="text-lg font-black text-slate-900 mb-8 flex items-center justify-between uppercase tracking-tighter italic">
                    <span>Typologie de Réclamation</span>
                    <ListFilter size={20} className="text-slate-900" />
                  </h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.ticketsPerType}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} fontWeight="700" tickLine={false} axisLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={12} fontWeight="700" tickLine={false} axisLine={false} />
                        <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                        <Bar dataKey="value" name="Volume" fill="#1e293b" radius={[8, 8, 0, 0]} barSize={40} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Top ZR (Zone de Recherche) */}
                <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm xl:col-span-2">
                  <h3 className="text-lg font-black text-slate-900 mb-8 flex items-center justify-between uppercase tracking-tighter italic">
                    <span>Top 10 Unités Techniques (ZR) par Charge</span>
                    <MapPin size={20} className="text-red-600" />
                  </h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.ticketsPerZR}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} fontWeight="700" tickLine={false} axisLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={12} fontWeight="700" tickLine={false} axisLine={false} />
                        <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                        <Bar dataKey="total" name="Nb Tickets" fill="#dc2626" radius={[8, 8, 0, 0]} barSize={50} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

              </div>

              {/* Data Table */}
              <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-100 overflow-hidden mb-20">
                <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-white">
                  <h3 className="text-xl font-black text-slate-900 italic tracking-tighter uppercase">Registre Opérationnel</h3>
                  <span className="text-xs font-black px-4 py-1.5 bg-red-600 text-white rounded-full uppercase tracking-widest">
                    {filteredTickets.length} Lignes
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50/50">
                      <tr>
                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">ND / Login</th>
                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Produit</th>
                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Recours</th>
                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Secteur / ZR</th>
                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Délai (j)</th>
                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">SLA</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {filteredTickets.slice(0, 100).map(ticket => (
                        <tr key={ticket.id} className="hover:bg-red-50/20 transition-colors group">
                          <td className="px-8 py-5">
                            <span className="text-sm font-bold text-slate-900 group-hover:text-red-600 transition-colors tracking-tight">{ticket.nd}</span>
                          </td>
                          <td className="px-8 py-5">
                            <span className="text-[10px] font-black px-3 py-1 bg-white border border-slate-100 text-slate-600 rounded-lg shadow-sm uppercase">{ticket.produit}</span>
                          </td>
                          <td className="px-8 py-5">
                            {ticket.typeRecours.toUpperCase().includes('RECL') ? (
                              <span className="text-[9px] font-black px-2 py-0.5 bg-red-100 text-red-600 rounded-md uppercase animate-pulse">Réouverture</span>
                            ) : (
                              <span className="text-[9px] font-medium text-slate-300">-</span>
                            )}
                          </td>
                          <td className="px-8 py-5">
                            <div className="flex flex-col">
                              <span className="text-sm text-slate-900 font-bold">{ticket.secteur}</span>
                              <span className="text-[9px] text-red-600 font-black uppercase tracking-widest">{ticket.zr}</span>
                            </div>
                          </td>
                          <td className="px-8 py-5 text-center">
                            <span className={`text-sm font-black ${ticket.delai >= 1 ? 'text-red-600' : 'text-slate-900'}`}>
                              {ticket.delai.toFixed(2)}
                            </span>
                          </td>
                          <td className="px-8 py-5 text-center">
                            {ticket.isSlaRespected ? (
                              <CheckCircle size={18} className="text-emerald-500 mx-auto" />
                            ) : (
                              <AlertCircle size={18} className="text-red-500 mx-auto" />
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </main>

      <footer className="bg-white border-t border-slate-100 py-10">
        <div className="max-w-[1600px] mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center space-x-2">
            <Zap size={20} className="text-red-600" />
            <span className="text-sm font-black text-slate-900 uppercase tracking-tighter italic">MtSAV-Taroudant PLATFORM</span>
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">
            © {new Date().getFullYear()} Plateforme de Pilotage SAV. Confidentiel.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;

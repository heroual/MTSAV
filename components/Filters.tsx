
import React, { useState, useRef } from 'react';
import { FilterState, Ticket } from '../types';
import { Search, MapPin, Tag, ListFilter, SlidersHorizontal, CalendarDays, CheckSquare, ChevronUp, ChevronDown } from 'lucide-react';

interface FiltersProps {
  tickets: Ticket[];
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
}

const Filters: React.FC<FiltersProps> = ({ tickets, filters, setFilters }) => {
  const [zrSearch, setZrSearch] = useState('');
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  const uniqueProducts: string[] = Array.from(new Set<string>(tickets.map(t => t.produit))).sort();
  const uniqueSecteurs: string[] = Array.from(new Set<string>(tickets.map(t => t.secteur))).sort();
  const uniqueMonths: string[] = Array.from(new Set<string>(tickets.map(t => t.moisAnnee))).sort();
  const uniqueZrs: string[] = Array.from(new Set<string>(tickets.map(t => t.zr))).sort();

  const filteredZrs = uniqueZrs.filter(zr => zr.toLowerCase().includes(zrSearch.toLowerCase()));

  const toggleFilter = (key: keyof FilterState, value: string) => {
    setFilters(prev => {
      const current = prev[key] as string[];
      if (current.includes(value)) {
        return { ...prev, [key]: current.filter(v => v !== value) };
      } else {
        return { ...prev, [key]: [...current, value] };
      }
    });
  };

  const scrollTo = (direction: 'top' | 'bottom') => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      container.scrollTo({
        top: direction === 'top' ? 0 : container.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="relative h-full flex flex-col group/filters">
      {/* Scroll Navigation Controls - "The Bar to Up and Down" */}
      <div className="absolute -right-4 top-1/2 -translate-y-1/2 flex flex-col space-y-3 z-20 transition-opacity opacity-0 group-hover/filters:opacity-100 lg:opacity-100">
        <button 
          onClick={() => scrollTo('top')}
          className="p-3 bg-red-600 text-white rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all flex items-center justify-center border-2 border-white"
          title="Remonter"
        >
          <ChevronUp size={18} strokeWidth={3} />
        </button>
        <div className="w-1.5 h-12 bg-slate-100 mx-auto rounded-full overflow-hidden">
            <div className="w-full h-1/2 bg-red-600/20"></div>
        </div>
        <button 
          onClick={() => scrollTo('bottom')}
          className="p-3 bg-red-600 text-white rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all flex items-center justify-center border-2 border-white"
          title="Descendre"
        >
          <ChevronDown size={18} strokeWidth={3} />
        </button>
      </div>

      <div 
        ref={scrollContainerRef}
        className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-50 h-full overflow-y-auto space-y-10 scroll-smooth relative no-scrollbar"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <div className="flex items-center justify-between border-b border-slate-50 pb-6 sticky top-0 bg-white z-10 -mt-2 pt-2">
          <h2 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter flex items-center">
            <SlidersHorizontal size={20} className="mr-2 text-red-600" />
            Filtres
          </h2>
          {Object.values(filters).some(v => Array.isArray(v) ? v.length > 0 : v !== 'all' && v !== '') && (
              <button 
                  onClick={() => setFilters({ produit: [], secteur: [], zr: [], motif: [], type: [], mois: [], statusSla: 'all', searchQuery: '' })}
                  className="text-[10px] font-black text-red-600 uppercase tracking-widest hover:underline"
              >
                  Vider
              </button>
          )}
        </div>

        {/* Produits */}
        <section>
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center">
            <Tag size={14} className="mr-2 text-red-600" />
            Offres & Produits
          </h3>
          <div className="space-y-3">
            {uniqueProducts.map(prod => (
              <label key={prod} className="flex items-center space-x-3 cursor-pointer group">
                <div className="relative flex items-center justify-center">
                  <input 
                      type="checkbox" 
                      className="peer appearance-none w-5 h-5 rounded-lg border-2 border-slate-200 checked:bg-red-600 checked:border-red-600 transition-all outline-none"
                      checked={filters.produit.includes(prod)}
                      onChange={() => toggleFilter('produit', prod)}
                  />
                  <CheckSquare size={12} className="absolute text-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" />
                </div>
                <span className="text-sm font-bold text-slate-600 group-hover:text-red-600 transition-colors uppercase tracking-tight">{prod}</span>
              </label>
            ))}
          </div>
        </section>

        {/* Secteurs */}
        <section>
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center">
            <MapPin size={14} className="mr-2 text-red-600" />
            Secteurs Régionaux
          </h3>
          <select 
            className="w-full rounded-xl border-2 border-slate-50 bg-slate-50 p-3 text-sm font-bold text-slate-700 focus:bg-white focus:border-red-600 transition-all outline-none"
            multiple
            size={4}
            value={filters.secteur}
            onChange={(e) => {
               const selected = Array.from(e.target.selectedOptions, (option: HTMLOptionElement) => option.value);
               setFilters(prev => ({ ...prev, secteur: selected }));
            }}
          >
            {uniqueSecteurs.map(s => (
              <option key={s} value={s} className="p-2 rounded-lg m-1 checked:bg-red-600 checked:text-white">{s}</option>
            ))}
          </select>
        </section>

        {/* Zones de Recherche (ZR) */}
        <section>
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center">
            <Search size={14} className="mr-2 text-red-600" />
            Unités Techniques (ZR)
          </h3>
          <div className="relative mb-4">
            <Search size={16} className="absolute left-3 top-3 text-slate-300" />
            <input 
              type="text" 
              placeholder="Chercher une ZR..."
              className="w-full pl-10 pr-4 py-2.5 text-xs font-bold border-2 border-slate-50 bg-slate-50 rounded-xl focus:bg-white focus:border-red-600 transition-all outline-none"
              value={zrSearch}
              onChange={(e) => setZrSearch(e.target.value)}
            />
          </div>
          <div className="max-h-48 overflow-y-auto space-y-2 pr-2 no-scrollbar">
            {filteredZrs.map(zr => (
              <label key={zr} className="flex items-center space-x-3 cursor-pointer group">
                <input 
                  type="checkbox" 
                  className="peer appearance-none w-4 h-4 rounded-md border-2 border-slate-100 checked:bg-red-600 checked:border-red-600 transition-all outline-none"
                  checked={filters.zr.includes(zr)}
                  onChange={() => toggleFilter('zr', zr)}
                />
                <span className="text-[11px] font-black text-slate-500 group-hover:text-red-600 transition-colors uppercase tracking-widest">{zr}</span>
              </label>
            ))}
          </div>
        </section>

        {/* Période */}
        <section>
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center">
            <CalendarDays size={14} className="mr-2 text-red-600" />
            Fenêtre Temporelle
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {uniqueMonths.map(m => (
              <button
                key={m}
                onClick={() => toggleFilter('mois', m)}
                className={`text-[10px] font-black py-2 px-3 rounded-xl border-2 transition-all uppercase tracking-widest ${
                  filters.mois.includes(m) 
                    ? 'bg-red-600 border-red-600 text-white shadow-lg shadow-red-100' 
                    : 'bg-white border-slate-50 text-slate-500 hover:border-red-600/20'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </section>

        {/* SLA */}
        <section className="pb-8">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center">
            <CheckSquare size={14} className="mr-2 text-red-600" />
            Statut de Performance
          </h3>
          <div className="space-y-4">
            {[
              { id: 'all', label: 'Consolidé' },
              { id: 'respected', label: 'Conforme (SLA)' },
              { id: 'exceeded', label: 'Hors Délai' }
            ].map((status) => (
              <label key={status.id} className="flex items-center space-x-3 cursor-pointer group">
                <input 
                  type="radio" 
                  name="slaStatus"
                  className="w-5 h-5 border-2 border-slate-100 text-red-600 focus:ring-red-600"
                  checked={filters.statusSla === status.id}
                  onChange={() => setFilters(prev => ({ ...prev, statusSla: status.id as any }))}
                />
                <span className="text-xs font-bold text-slate-600 group-hover:text-red-600 transition-colors uppercase tracking-tighter">
                  {status.label}
                </span>
              </label>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Filters;

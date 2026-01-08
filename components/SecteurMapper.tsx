
import React, { useState, useMemo } from 'react';
import { X, Plus, Trash2, Save, CheckCircle2, ChevronRight, Hash, Layers, Info } from 'lucide-react';
import { SecteurMapping } from '../types';

interface SecteurMapperProps {
  allZrs: string[];
  mappings: SecteurMapping;
  onSave: (newMappings: SecteurMapping) => void;
  onClose: () => void;
}

const SecteurMapper: React.FC<SecteurMapperProps> = ({ allZrs, mappings, onSave, onClose }) => {
  const [tempMappings, setTempMappings] = useState<SecteurMapping>({ ...mappings });
  const [newSecteurName, setNewSecteurName] = useState('');
  const [secteursList, setSecteursList] = useState<string[]>(() => {
    const existing = Array.from(new Set<string>(Object.values(mappings)));
    return existing.length > 0 ? existing.sort() : [];
  });
  
  const [selectedZrs, setSelectedZrs] = useState<Set<string>>(new Set());

  const unmappedZrs = useMemo(() => 
    allZrs.filter(zr => !tempMappings[zr]).sort(), 
    [allZrs, tempMappings]
  );

  const toggleZrSelection = (zr: string) => {
    const next = new Set(selectedZrs);
    if (next.has(zr)) next.delete(zr);
    else next.add(zr);
    setSelectedZrs(next);
  };

  const selectAllUnmapped = () => {
    setSelectedZrs(new Set(unmappedZrs));
  };

  const deselectAll = () => {
    setSelectedZrs(new Set());
  };

  const handleAssignSelected = (secteur: string) => {
    if (selectedZrs.size === 0) return;
    
    setTempMappings(prev => {
      const next = { ...prev };
      selectedZrs.forEach(zr => {
        next[zr] = secteur;
      });
      return next;
    });
    setSelectedZrs(new Set());
  };

  const handleRemoveMapping = (zr: string) => {
    const next = { ...tempMappings };
    delete next[zr];
    setTempMappings(next);
  };

  const createSecteur = (e?: React.FormEvent) => {
    e?.preventDefault();
    const name = newSecteurName.trim();
    if (name && !secteursList.includes(name)) {
      setSecteursList(prev => [...prev, name].sort());
      setNewSecteurName('');
    }
  };

  const deleteSecteur = (secteur: string) => {
    setSecteursList(prev => prev.filter(s => s !== secteur));
    setTempMappings(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(zr => {
        if (next[zr] === secteur) delete next[zr];
      });
      return next;
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-xl z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-6xl h-[90vh] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden border border-slate-100">
        
        {/* Header */}
        <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-white">
          <div className="flex items-center space-x-6">
            <div className="p-4 bg-red-600 rounded-2xl text-white shadow-2xl shadow-red-200">
              <Layers size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight italic uppercase">Configuration des Secteurs</h2>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-[0.2em] mt-1">{allZrs.length} Unités techniques identifiées</p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-red-50 rounded-full transition-colors text-slate-400 hover:text-red-600">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          
          {/* PANNEAU GAUCHE */}
          <div className="w-80 border-r border-slate-50 flex flex-col bg-slate-50/30">
            <div className="p-6 border-b border-slate-100 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
                  ZR Non Assignées
                </h3>
                <span className="bg-red-600 text-white px-3 py-0.5 rounded-full text-[10px] font-black">
                  {unmappedZrs.length}
                </span>
              </div>
              <div className="flex space-x-4">
                <button onClick={selectAllUnmapped} className="text-[10px] font-black text-red-600 uppercase tracking-widest hover:underline">Tout choisir</button>
                <button onClick={deselectAll} className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:underline">Vider</button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-3 no-scrollbar">
              {unmappedZrs.map(zr => (
                <button 
                  key={zr} 
                  onClick={() => toggleZrSelection(zr)}
                  className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all text-xs font-bold uppercase tracking-widest ${
                    selectedZrs.has(zr) 
                      ? 'bg-red-600 border-red-600 text-white shadow-xl shadow-red-100' 
                      : 'bg-white border-white text-slate-500 hover:border-red-600/20'
                  }`}
                >
                  <span>{zr}</span>
                  {selectedZrs.has(zr) && <CheckCircle2 size={16} />}
                </button>
              ))}
              {unmappedZrs.length === 0 && (
                <div className="flex flex-col items-center justify-center py-24 text-center px-4">
                  <div className="p-4 bg-white rounded-full text-emerald-500 shadow-sm mb-4">
                    <CheckCircle2 size={32} />
                  </div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tout est assigné</p>
                </div>
              )}
            </div>
          </div>

          {/* PANNEAU CENTRAL */}
          <div className="flex-1 flex flex-col p-10 overflow-y-auto bg-white no-scrollbar">
            
            <form onSubmit={createSecteur} className="flex items-center space-x-4 mb-12 bg-slate-50 p-3 rounded-2xl border-2 border-transparent focus-within:border-red-600 transition-all">
              <input 
                type="text" 
                placeholder="NOM DU NOUVEAU SECTEUR..." 
                className="flex-1 border-none bg-transparent text-slate-900 font-black uppercase tracking-widest text-xs placeholder:text-slate-300 focus:ring-0"
                value={newSecteurName}
                onChange={(e) => setNewSecteurName(e.target.value)}
              />
              <button 
                type="submit"
                disabled={!newSecteurName.trim()}
                className="bg-red-600 text-white px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-red-100 hover:bg-red-700 transition-all disabled:opacity-50"
              >
                Ajouter
              </button>
            </form>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-10">
              {secteursList.map(secteur => {
                const mappedToThis = Object.entries(tempMappings).filter(([_, s]) => s === secteur);
                return (
                  <div key={secteur} className="bg-white rounded-3xl border-2 border-slate-50 hover:border-red-600/30 shadow-sm overflow-hidden flex flex-col h-fit transition-all">
                    <div className="p-5 bg-slate-50/50 flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-600"></div>
                        <h4 className="font-black text-slate-900 uppercase tracking-widest text-[11px] italic">{secteur}</h4>
                      </div>
                      <button onClick={() => deleteSecteur(secteur)} className="text-slate-300 hover:text-red-600 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                    
                    <div className="p-6 min-h-[100px]">
                      {selectedZrs.size > 0 && (
                        <button 
                          onClick={() => handleAssignSelected(secteur)}
                          className="w-full mb-6 flex items-center justify-center space-x-2 bg-red-600 text-white p-4 rounded-2xl transition-all shadow-lg shadow-red-100 font-black text-[10px] uppercase tracking-[0.2em]"
                        >
                          <Plus size={16} />
                          <span>Assigner {selectedZrs.size} Zones</span>
                        </button>
                      )}

                      <div className="flex flex-wrap gap-2">
                        {mappedToThis.map(([zr]) => (
                          <div key={zr} className="flex items-center bg-slate-900 text-white pl-4 pr-1.5 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest group">
                            <span>{zr}</span>
                            <button 
                              onClick={() => handleRemoveMapping(zr)} 
                              className="ml-3 p-1 text-slate-500 hover:text-red-600 transition-all"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-8 border-t border-slate-50 bg-white flex items-center justify-between">
          <div className="flex items-center text-[10px] text-slate-400 font-black uppercase tracking-widest">
            <Info size={16} className="mr-3 text-red-600" />
            Consolidation structurelle par hub technique régional.
          </div>
          <div className="flex items-center space-x-6">
            <button onClick={onClose} className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-colors">
              Annuler
            </button>
            <button 
              onClick={() => { onSave(tempMappings); onClose(); }}
              className="bg-slate-900 text-white px-12 py-4 rounded-2xl text-[11px] font-black uppercase tracking-[0.3em] shadow-2xl shadow-slate-200 hover:bg-black transition-all flex items-center space-x-4 group"
            >
              <Save size={18} className="group-hover:translate-y-0.5 transition-transform" />
              <span>Valider la Structure</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecteurMapper;


import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Inbox, Pencil, Trash2, Plus, Tag, Target, Calendar, Globe, User, Hash, ChevronDown, ChevronUp, PieChart } from 'lucide-react';
import { Asset, AssetClass } from '../types.ts';

interface AtivosProps {
  assets: Asset[];
  classes: AssetClass[];
  onEdit: (asset: Asset) => void;
  onDelete: (id: string) => void;
  onAddClick: () => void;
  onAddClass: (name: string) => void;
  onDeleteClass: (id: string) => void;
  onUpdateClassTarget: (id: string, target: number) => void;
}

const Ativos: React.FC<AtivosProps> = ({ assets, classes, onEdit, onDelete, onAddClick, onAddClass, onDeleteClass, onUpdateClassTarget }) => {
  const navigate = useNavigate();
  const [newClassName, setNewClassName] = useState('');
  const [expandedClasses, setExpandedClasses] = useState<Record<string, boolean>>(
    classes.reduce((acc, c) => ({ ...acc, [c.id]: true }), {})
  );

  const formatBRL = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  };

  const toggleClass = (id: string) => {
    setExpandedClasses(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const totalPortfolio = assets.reduce((acc, a) => acc + (a.quantity * a.currentPrice), 0);

  return (
    <div className="space-y-8 md:space-y-10 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/')} className="p-3 bg-zinc-900 border border-zinc-800 rounded-2xl hover:text-yellow-500 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tighter">Minha <span className="text-yellow-500">Carteira</span></h1>
            <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest leading-tight">Patrimônio Consolidado por Classe</p>
          </div>
        </div>
        <button 
          onClick={() => navigate('/lancamentos')}
          className="gold-gradient text-zinc-950 px-6 md:px-8 py-3 md:py-4 rounded-xl md:rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-yellow-600/10"
        >
          <Plus size={18} /> Novo Ativo
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 md:gap-8">
        <div className="xl:col-span-3 space-y-8 md:space-y-10">
          {assets.length === 0 ? (
            <div className="dark-card rounded-[2rem] md:rounded-[3rem] p-20 md:p-32 text-center flex flex-col items-center gap-6 opacity-20 border-dashed border-2 border-zinc-800">
               {/* Fixed invalid responsive size prop for Lucide icon */}
               <Inbox size={60} />
               <p className="font-black uppercase tracking-widest text-xs">Sua carteira está vazia</p>
            </div>
          ) : (
            classes.map(cls => {
              const classAssets = assets.filter(a => a.classId === cls.id);
              if (classAssets.length === 0) return null;

              const classTotal = classAssets.reduce((acc, a) => acc + (a.quantity * a.currentPrice), 0);
              const classWeight = totalPortfolio > 0 ? (classTotal / totalPortfolio) * 100 : 0;
              const isExpanded = expandedClasses[cls.id];

              return (
                <div key={cls.id} className="dark-card rounded-[1.5rem] md:rounded-[2.5rem] overflow-hidden shadow-2xl bg-zinc-900/20">
                  <button 
                    onClick={() => toggleClass(cls.id)}
                    className="w-full p-6 md:p-8 border-b border-zinc-800 bg-zinc-900/40 flex flex-col md:flex-row md:items-center justify-between gap-4 group"
                  >
                    <div className="flex items-center gap-3 md:gap-4">
                      <div className="p-2 md:p-3 bg-zinc-950 rounded-xl text-yellow-500 border border-zinc-800 group-hover:bg-yellow-500 group-hover:text-zinc-950 transition-all">
                        {/* Fixed invalid responsive size prop for Lucide icon */}
                        <Tag size={20} />
                      </div>
                      <div className="text-left">
                        <h2 className="font-black text-lg md:text-xl uppercase tracking-tight text-white">{cls.name}</h2>
                        <span className="text-[8px] md:text-[10px] text-zinc-500 font-black uppercase tracking-widest">{classAssets.length} Ativos • {classWeight.toFixed(1)}%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between md:justify-end gap-6 w-full md:w-auto">
                      <div className="text-left md:text-right">
                        <p className="text-[8px] md:text-[10px] font-black text-zinc-600 uppercase tracking-widest">Subtotal</p>
                        <p className="text-base md:text-xl font-black text-white">{formatBRL(classTotal)}</p>
                      </div>
                      {/* Fixed invalid responsive size props for Lucide icons */}
                      {isExpanded ? <ChevronUp className="text-zinc-600" size={20} /> : <ChevronDown className="text-zinc-600" size={20} />}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left min-w-[600px] md:min-w-full">
                        <thead className="bg-zinc-950/50 text-[8px] md:text-[10px] text-zinc-600 uppercase font-black tracking-widest border-b border-zinc-800">
                          <tr>
                            <th className="px-4 md:px-8 py-4 md:py-5">Ativo</th>
                            <th className="px-4 md:px-8 py-4 md:py-5 text-center">Posição</th>
                            <th className="px-4 md:px-8 py-4 md:py-5 text-right">P. Médio</th>
                            <th className="px-4 md:px-8 py-4 md:py-5 text-right">Cotação</th>
                            <th className="px-4 md:px-8 py-4 md:py-5 text-right">Patrimônio</th>
                            <th className="px-4 md:px-8 py-4 md:py-5 text-right">Rend.</th>
                            <th className="px-4 md:px-8 py-4 md:py-5 text-center">Ações</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/50">
                          {classAssets.map(a => {
                            const invested = a.quantity * a.purchasePrice;
                            const current = a.quantity * a.currentPrice;
                            const profitPct = invested > 0 ? ((current - invested) / invested) * 100 : 0;

                            return (
                              <tr key={a.id} className="hover:bg-zinc-900/40 transition-colors group">
                                <td className="px-4 md:px-8 py-4 md:py-6">
                                  <div className="flex flex-col">
                                    <span className="font-black text-yellow-500 text-base md:text-lg uppercase">{a.ticker || a.name}</span>
                                    <span className="text-[7px] md:text-[9px] text-zinc-600 font-bold uppercase tracking-widest leading-none">Comprou em {formatDate(a.purchaseDate)}</span>
                                  </div>
                                </td>
                                <td className="px-4 md:px-8 py-4 md:py-6 text-center">
                                  <div className="flex flex-col items-center">
                                    <span className="font-black text-white text-xs md:text-base">{a.quantity.toLocaleString('pt-BR')}</span>
                                    <span className="text-[7px] md:text-[9px] text-zinc-700 font-black uppercase">UNID.</span>
                                  </div>
                                </td>
                                <td className="px-4 md:px-8 py-4 md:py-6 text-right font-bold text-zinc-500 text-xs md:text-base">{formatBRL(a.purchasePrice)}</td>
                                <td className="px-4 md:px-8 py-4 md:py-6 text-right">
                                   <div className="flex flex-col items-end">
                                      <span className="font-black text-white text-xs md:text-base">{formatBRL(a.currentPrice)}</span>
                                      <span className="text-[7px] md:text-[8px] font-black text-zinc-700 uppercase leading-none">{a.isManualPrice ? 'MANUAL' : 'AUTO'}</span>
                                   </div>
                                </td>
                                <td className="px-4 md:px-8 py-4 md:py-6 text-right font-black text-white text-xs md:text-base">{formatBRL(current)}</td>
                                <td className={`px-4 md:px-8 py-4 md:py-6 text-right font-black text-xs md:text-base ${profitPct >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                  {profitPct >= 0 ? '+' : ''}{profitPct.toFixed(1)}%
                                </td>
                                <td className="px-4 md:px-8 py-4 md:py-6 text-center">
                                  <div className="flex justify-center gap-1">
                                    {/* Fixed invalid responsive size props for Lucide icons */}
                                    <button onClick={() => onEdit(a)} className="p-1.5 md:p-2.5 text-zinc-600 hover:text-yellow-500 hover:bg-yellow-500/10 rounded-xl transition-all"><Pencil size={16} /></button>
                                    <button onClick={() => onDelete(a.id)} className="p-1.5 md:p-2.5 text-zinc-600 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"><Trash2 size={16} /></button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="space-y-6">
          <div className="dark-card rounded-[1.5rem] md:rounded-[2rem] p-6 md:p-8 shadow-xl bg-zinc-900/40 border border-zinc-800">
            {/* Fixed invalid responsive size prop for Lucide icon */}
            <div className="flex items-center gap-3 mb-6 md:mb-8 text-yellow-500 font-black uppercase text-[9px] md:text-[10px] tracking-widest">
              <PieChart size={16} /> Alvos
            </div>
            
            <div className="space-y-5 md:space-y-6">
              {classes.map(c => (
                <div key={c.id} className="space-y-2">
                  <div className="flex justify-between items-end">
                    <span className="text-[10px] md:text-xs font-black text-zinc-400 uppercase tracking-tight">{c.name}</span>
                    <div className="flex items-center gap-1">
                       <input 
                        type="number"
                        value={c.targetPercent}
                        onChange={(e) => onUpdateClassTarget(c.id, Number(e.target.value))}
                        className="w-10 md:w-12 bg-zinc-950 border border-zinc-800 rounded-lg p-1 md:p-1.5 text-right text-[9px] md:text-[10px] font-black text-yellow-500 outline-none focus:border-yellow-500/50"
                      />
                      <span className="text-zinc-600 text-[8px] md:text-[9px] font-black">%</span>
                    </div>
                  </div>
                  <div className="h-1 md:h-1.5 bg-zinc-950 rounded-full overflow-hidden border border-zinc-900">
                     <div className="h-full gold-gradient" style={{ width: `${c.targetPercent}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Ativos;

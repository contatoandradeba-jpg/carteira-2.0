
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  TrendingUp, 
  Wallet, 
  HandCoins, 
  Coins, 
  LayoutGrid, 
  CheckCircle2, 
  ChevronRight, 
  Search, 
  Sparkles, 
  PlusCircle, 
  X, 
  History, 
  Calendar, 
  ArrowUpRight, 
  Trash2,
  Inbox
} from 'lucide-react';
import { AssetClass, Asset, AssetType, Contribution } from '../types.ts';
import AddAssetForm from './AddAssetForm.tsx';

interface LancamentosProps {
  contributions: Contribution[];
  classes: AssetClass[];
  onAddAsset: (asset: Asset, reinvestedAmount: number) => void;
  onDeleteContribution: (id: string) => void;
}

const Lancamentos: React.FC<LancamentosProps> = ({ contributions, classes, onAddAsset, onDeleteContribution }) => {
  const navigate = useNavigate();
  const [selectedClass, setSelectedClass] = useState<AssetClass | null>(null);
  const [view, setView] = useState<'history' | 'new'>('history');

  const categories = [
    { name: 'Ações Brasil', icon: <TrendingUp size={32} />, classId: '1', type: AssetType.STOCK },
    { name: 'FIIs / Imobiliário', icon: <Wallet size={32} />, classId: '3', type: AssetType.FII },
    { name: 'Ações Exterior', icon: <LayoutGrid size={32} />, classId: '2', type: AssetType.STOCK },
    { name: 'Renda Fixa / Tesouro', icon: <Coins size={32} />, classId: '4', type: AssetType.FIXED },
    { name: 'Criptoativos', icon: <HandCoins size={32} />, classId: '5', type: AssetType.CRYPTO },
  ];

  const handleLaunch = (asset: Asset, reinvested: number) => {
    onAddAsset(asset, reinvested);
    setSelectedClass(null);
    navigate('/ativos');
  };

  const formatBRL = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-24">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/')} className="p-3 bg-zinc-900 border border-zinc-800 rounded-2xl hover:text-yellow-500 transition-colors shadow-lg active:scale-90">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tighter">Central de <span className="text-yellow-500">Lançamentos</span></h1>
            <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Auditoria e Registro de Patrimônio</p>
          </div>
        </div>

        <div className="flex bg-zinc-900 p-1.5 rounded-2xl border border-zinc-800 shadow-inner">
           <button 
            onClick={() => { setView('history'); setSelectedClass(null); }} 
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === 'history' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
           >
             <History size={14} /> Histórico
           </button>
           <button 
            onClick={() => setView('new')} 
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === 'new' ? 'bg-yellow-500 text-zinc-950 shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
           >
             <PlusCircle size={14} /> Novo Registro
           </button>
        </div>
      </div>

      {view === 'history' && (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
          {contributions.length === 0 ? (
            <div className="dark-card rounded-[3rem] p-32 text-center flex flex-col items-center gap-6 opacity-20 border-dashed border-2 border-zinc-800">
               <Inbox size={60} />
               <p className="font-black uppercase tracking-widest text-sm">Nenhum lançamento registrado</p>
               <button onClick={() => setView('new')} className="text-xs font-black text-yellow-500 hover:underline">Começar meu primeiro aporte</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {contributions.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((c) => (
                <div key={c.id} className="dark-card p-8 rounded-[2.5rem] bg-zinc-900/40 border border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:bg-zinc-900/60 transition-all group relative overflow-hidden">
                   <div className="flex items-center gap-6">
                      <div className="p-4 bg-zinc-950 rounded-2xl border border-zinc-800 text-yellow-500 shadow-inner group-hover:scale-110 transition-transform">
                        <ArrowUpRight size={24} />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                           <span className="text-xs font-black text-zinc-500 uppercase tracking-widest flex items-center gap-1"><Calendar size={12} /> {formatDate(c.date)}</span>
                           {c.reinvestedAmount > 0 && <span className="px-2 py-0.5 bg-green-500/10 text-green-500 text-[8px] font-black uppercase rounded-full border border-green-500/20">Reinvestimento Orgânico</span>}
                        </div>
                        <h3 className="text-2xl font-black text-white tabular-nums">{formatBRL(c.totalAmount)}</h3>
                        <div className="flex items-center gap-3">
                          <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Bolso: <span className="text-white">{formatBRL(c.outOfPocketAmount)}</span></p>
                          {c.reinvestedAmount > 0 && (
                            <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Reinvestido: <span className="text-yellow-500">{formatBRL(c.reinvestedAmount)}</span></p>
                          )}
                        </div>
                      </div>
                   </div>

                   <div className="flex items-center gap-4">
                      <div className="flex -space-x-3">
                        {c.details.slice(0, 3).map((d, i) => (
                          <div key={i} className="w-10 h-10 rounded-xl bg-zinc-950 border-2 border-zinc-900 flex items-center justify-center text-[10px] font-black text-yellow-500 shadow-lg">
                            {d.ticker.substring(0, 2)}
                          </div>
                        ))}
                      </div>
                      <button 
                        onClick={() => { if(confirm("Deseja remover este registro do histórico?")) onDeleteContribution(c.id); }} 
                        className="p-3 text-zinc-700 hover:text-red-500 hover:bg-red-500/10 rounded-2xl transition-all"
                      >
                        <Trash2 size={20} />
                      </button>
                   </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {view === 'new' && (
        <div className="animate-in slide-in-from-bottom-4 duration-500">
          {!selectedClass ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {categories.map((cat, i) => (
                <button 
                  key={i} 
                  onClick={() => setSelectedClass(classes.find(c => c.id === cat.classId) || classes[0])}
                  className="group dark-card p-8 rounded-[3rem] bg-zinc-900/40 border border-zinc-800 flex flex-col items-start gap-6 relative overflow-hidden transition-all hover:scale-[1.02] active:scale-95 text-left shadow-2xl"
                >
                  <div className="p-5 bg-zinc-950 rounded-2xl border border-zinc-800 text-yellow-500 group-hover:bg-yellow-500 group-hover:text-zinc-950 transition-all duration-500">
                    {cat.icon}
                  </div>
                  <div className="space-y-1">
                    <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Nova Operação</p>
                    <h3 className="text-xl font-black text-white tracking-tight uppercase">{cat.name}</h3>
                  </div>
                  <ChevronRight className="absolute bottom-8 right-8 text-zinc-800 group-hover:text-yellow-500 transition-all" />
                </button>
              ))}
            </div>
          ) : (
            <div className="flex justify-center">
               <div className="bg-zinc-900 border border-zinc-800 rounded-[3.5rem] w-full max-w-xl shadow-2xl overflow-hidden border-yellow-500/20">
                  <div className="p-8 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-yellow-500/10 rounded-xl text-yellow-500"><PlusCircle size={20} /></div>
                      <h2 className="text-xl font-black uppercase tracking-tight text-white">{selectedClass.name}</h2>
                    </div>
                    <button onClick={() => setSelectedClass(null)} className="text-zinc-500 hover:text-white p-2 hover:bg-zinc-800 rounded-full transition-colors"><X size={24} /></button>
                  </div>
                  <AddAssetForm 
                    onAdd={handleLaunch} 
                    onCancel={() => setSelectedClass(null)} 
                    classes={classes}
                    initialData={{
                      id: '',
                      name: '',
                      type: categories.find(c => c.classId === selectedClass.id)?.type || AssetType.STOCK,
                      classId: selectedClass.id,
                      quantity: 0,
                      purchaseDate: new Date().toISOString().split('T')[0],
                      purchasePrice: 0,
                      currentPrice: 0,
                      isManualPrice: false,
                      targetPercent: 0
                    }}
                  />
               </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Lancamentos;

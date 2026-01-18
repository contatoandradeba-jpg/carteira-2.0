
import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calculator, Info, AlertTriangle, ChevronRight, PieChart, TrendingUp, Target, HandCoins, Wallet, CheckCircle2, Globe, Sparkles } from 'lucide-react';
import { Asset, AssetClass, Contribution } from '../types.ts';

interface AportesProps {
  assets: Asset[];
  classes: AssetClass[];
  onApplyAporte: (contribution: Contribution) => void;
}

const Aportes: React.FC<AportesProps> = ({ assets, classes, onApplyAporte }) => {
  const navigate = useNavigate();
  
  // States sincronizados
  const [totalAporte, setTotalAporte] = useState<string>('');
  const [outOfPocket, setOutOfPocket] = useState<string>('');
  const [reinvested, setReinvested] = useState<string>('');
  const [isManualSync, setIsManualSync] = useState(false);
  
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Parse utilitário
  const parseVal = (s: string) => {
    const clean = s.replace(/\./g, '').replace(',', '.');
    return isNaN(parseFloat(clean)) ? 0 : parseFloat(clean);
  };
  
  const formatBRL = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  // Sincronização lógica inteligente
  const updateByTotal = (val: string) => {
    setTotalAporte(val);
    if (!isManualSync) {
      setOutOfPocket(val);
      setReinvested('0');
    }
  };

  const handleSubfieldChange = (val: string, type: 'bolso' | 'reinvest') => {
    setIsManualSync(true);
    if (type === 'bolso') setOutOfPocket(val);
    else setReinvested(val);
    
    const vBolso = type === 'bolso' ? parseVal(val) : parseVal(outOfPocket);
    const vReinvest = type === 'reinvest' ? parseVal(val) : parseVal(reinvested);
    const newTotal = vBolso + vReinvest;
    setTotalAporte(newTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 }));
  };

  const totalPatrimony = useMemo(() => assets.reduce((acc, a) => acc + (a.quantity * a.currentPrice), 0), [assets]);

  const results = useMemo(() => {
    const amount = parseVal(totalAporte);
    if (amount <= 0 || assets.length === 0) return null;

    const classTotalWeight = classes.reduce((acc, c) => acc + c.targetPercent, 0);

    const classDistribution = classes.map(c => {
      const classAssets = assets.filter(a => a.classId === c.id);
      const currentClassValue = classAssets.reduce((acc, a) => acc + (a.quantity * a.currentPrice), 0);
      const targetPercent = c.targetPercent / (classTotalWeight || 100);
      
      const idealClassValue = (totalPatrimony + amount) * targetPercent;
      const neededInClass = Math.max(0, idealClassValue - currentClassValue);
      return { class: c, needed: neededInClass };
    });

    const totalNeeded = classDistribution.reduce((acc, d) => acc + d.needed, 0);
    const classAportes = classDistribution.map(d => ({
      class: d.class,
      value: totalNeeded > 0 ? (d.needed / totalNeeded) * amount : (d.class.targetPercent / (classTotalWeight || 100)) * amount
    }));

    const assetDistribution = assets.map(a => {
      const parentClass = classes.find(c => c.id === a.classId);
      if (!parentClass) return { asset: a, value: 0 };
      const assetsInClass = assets.filter(asset => asset.classId === a.classId);
      const classValueForAporte = classAportes.find(d => d.class.id === a.classId)?.value || 0;
      const totalAssetWeightInClass = assetsInClass.reduce((acc, asset) => acc + asset.targetPercent, 0);
      const weightFactor = totalAssetWeightInClass > 0 ? a.targetPercent / totalAssetWeightInClass : 0;
      return { asset: a, value: classValueForAporte * weightFactor };
    }).filter(d => d.value > 0.01);

    return { classDistribution: classAportes.filter(c => c.value > 0.01), assetDistribution: assetDistribution.sort((a,b) => b.value - a.value) };
  }, [totalAporte, assets, classes, totalPatrimony]);

  const handleConfirmAporte = () => {
    if (!results) return;
    onApplyAporte({
      id: `cont-${Math.random().toString(36).substr(2, 9)}`,
      date: new Date().toISOString(),
      totalAmount: parseVal(totalAporte),
      outOfPocketAmount: parseVal(outOfPocket) || parseVal(totalAporte),
      reinvestedAmount: parseVal(reinvested),
      details: results.assetDistribution.map(d => ({ assetId: d.asset.id, ticker: d.asset.ticker || '', quantity: d.value / d.asset.currentPrice, price: d.asset.currentPrice }))
    });
    setShowConfirmation(false);
    setTotalAporte(''); setOutOfPocket(''); setReinvested(''); setIsManualSync(false);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-5xl mx-auto pb-20">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/')} className="p-3 bg-zinc-900 border border-zinc-800 rounded-2xl hover:text-yellow-500 transition-colors"><ArrowLeft size={20} /></button>
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter">Smart Aporte <span className="text-yellow-500">Misto</span></h1>
          <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Distribuição por Bolso e Proventos</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-1 space-y-6">
          <div className="dark-card p-10 rounded-[2.5rem] bg-gradient-to-b from-zinc-900 to-zinc-950 border-t-[10px] border-yellow-500 shadow-2xl space-y-8">
             <div className="flex items-center gap-3 text-yellow-500"><Calculator size={24} /><h2 className="font-black text-xl uppercase tracking-tight text-white">Configuração</h2></div>
             <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2"><TrendingUp size={12} className="text-yellow-500" /> Aporte Total Desejado</label>
                  <input type="text" placeholder="R$ 0,00" value={totalAporte} onChange={(e) => updateByTotal(e.target.value)} className="w-full bg-zinc-950 border-2 border-zinc-900 rounded-3xl p-6 text-3xl font-black text-white focus:border-yellow-500 outline-none transition-all" />
                </div>
                <div className="space-y-4 pt-4 border-t border-zinc-900">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest flex items-center gap-2"><Wallet size={12} /> Valor do Bolso (Capital Novo)</label>
                    <input type="text" placeholder="R$ 0,00" value={outOfPocket} onChange={(e) => handleSubfieldChange(e.target.value, 'bolso')} className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 text-xl font-black text-zinc-300 focus:border-yellow-500 outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest flex items-center gap-2"><HandCoins size={12} /> Proventos Reaportados (Orgânico)</label>
                    <input type="text" placeholder="R$ 0,00" value={reinvested} onChange={(e) => handleSubfieldChange(e.target.value, 'reinvest')} className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 text-xl font-black text-zinc-300 focus:border-yellow-500 outline-none" />
                  </div>
                </div>
             </div>
             <div className="p-6 bg-yellow-500/5 rounded-3xl border border-yellow-500/10 space-y-4">
                <div className="flex items-center gap-2 text-yellow-500"><Sparkles size={16} /><span className="text-[10px] font-black uppercase tracking-widest">Inteligência Real</span></div>
                <p className="text-[11px] text-zinc-500 leading-relaxed">Separar a origem ajuda a plataforma a calcular seu <span className="text-white font-bold">Yield on Cost Real</span>, eliminando distorções de rentabilidade.</p>
             </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-8">
          {results ? (
            <div className="space-y-8 animate-in slide-in-from-bottom-10 duration-700">
              <div className="dark-card p-8 rounded-[2.5rem] bg-zinc-900/30 flex flex-col md:flex-row gap-6">
                 <div className="flex-1 space-y-4">
                    <h3 className="text-xs font-black text-zinc-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2"><PieChart size={14} className="text-yellow-500" /> Alvo por Classe</h3>
                    <div className="space-y-3">
                      {results.classDistribution.map((d, i) => (
                        <div key={i} className="flex items-center justify-between p-4 bg-zinc-950/50 border border-zinc-800 rounded-2xl">
                          <span className="text-[11px] font-black text-white uppercase">{d.class.name}</span>
                          <span className="text-sm font-black text-yellow-500">{formatBRL(d.value)}</span>
                        </div>
                      ))}
                    </div>
                 </div>
                 <div className="w-px bg-zinc-800 hidden md:block"></div>
                 <div className="flex-1 space-y-6">
                    <h3 className="text-xs font-black text-zinc-500 uppercase tracking-[0.2em] flex items-center gap-2"><Globe size={14} className="text-blue-500" /> Fontes de Recurso</h3>
                    <div className="space-y-4">
                       <div className="flex justify-between items-center text-xs">
                         <span className="text-zinc-600 font-bold">Esforço Próprio (Bolso):</span>
                         <span className="text-white font-black">{formatBRL(parseVal(outOfPocket) || parseVal(totalAporte))}</span>
                       </div>
                       <div className="flex justify-between items-center text-xs">
                         <span className="text-zinc-600 font-bold">Lucro Reinvestido:</span>
                         <span className="text-yellow-500 font-black">{formatBRL(parseVal(reinvested))}</span>
                       </div>
                       <div className="h-px bg-zinc-800"></div>
                       <div className="flex justify-between items-center"><span className="text-[10px] font-black uppercase text-zinc-400">Total Integrado:</span><span className="text-2xl font-black text-white">{formatBRL(parseVal(totalAporte))}</span></div>
                    </div>
                    <button onClick={() => setShowConfirmation(true)} className="w-full gold-gradient text-zinc-950 font-black py-4 rounded-2xl shadow-xl hover:scale-[1.02] transition-all uppercase tracking-widest text-[10px]">Efetivar Aporte Híbrido</button>
                 </div>
              </div>
              <div className="dark-card rounded-[2.5rem] overflow-hidden shadow-2xl">
                <div className="p-8 border-b border-zinc-800 bg-zinc-900/40 flex justify-between items-center"><h3 className="text-xs font-black text-zinc-500 uppercase tracking-[0.2em] flex items-center gap-2"><TrendingUp size={14} className="text-yellow-500" /> Sugestão de Execução</h3></div>
                <div className="p-4 space-y-4">
                  {results.assetDistribution.map((d, i) => (
                    <div key={i} className="flex items-center justify-between p-5 bg-zinc-900/50 rounded-3xl border border-zinc-800/50 group hover:border-yellow-500/20 transition-all">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-zinc-950 rounded-2xl flex items-center justify-center font-black text-yellow-500 border border-zinc-800 text-lg group-hover:scale-105 transition-transform">{d.asset.ticker?.substring(0, 4)}</div>
                        <div>
                          <p className="text-base font-black text-white">{d.asset.ticker}</p>
                          <p className="text-[9px] font-black text-zinc-600 uppercase">{classes.find(c => c.id === d.asset.classId)?.name} • Alvo {d.asset.targetPercent}%</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-black text-yellow-500">{formatBRL(d.value)}</p>
                        <p className="text-[9px] font-black text-zinc-700 uppercase">~{Math.floor(d.value / d.asset.currentPrice)} cotas</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="dark-card rounded-[2.5rem] p-24 border-dashed border-2 border-zinc-900 flex flex-col items-center justify-center text-center gap-6 opacity-40">
               <div className="p-8 bg-zinc-900 rounded-full"><Calculator className="text-zinc-800" size={80} /></div>
               <div className="space-y-2"><h3 className="text-xl font-black text-zinc-600 uppercase tracking-tight">Simulador Misto</h3><p className="text-sm text-zinc-700 font-bold max-w-xs">Configure os valores para ver como o rebalanceamento agirá sobre seu capital novo e proventos.</p></div>
            </div>
          )}
        </div>
      </div>

      {showConfirmation && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
           <div className="bg-zinc-900 border border-zinc-800 rounded-[3rem] w-full max-w-md p-10 space-y-8 animate-in zoom-in-95">
              <div className="flex flex-col items-center text-center gap-4">
                 <div className="p-6 bg-yellow-500/10 rounded-full text-yellow-500"><CheckCircle2 size={48} /></div>
                 <h2 className="text-2xl font-black uppercase tracking-tight">Efetuar Aporte?</h2>
                 <p className="text-sm text-zinc-500 font-medium">Este aporte será distribuído conforme os pesos alvos, rebalanceando sua carteira instantaneamente.</p>
              </div>
              <div className="bg-zinc-950 p-6 rounded-3xl border border-zinc-800 space-y-3">
                 <div className="flex justify-between text-xs font-bold uppercase text-zinc-500"><span>Novo Patrimônio Est.:</span><span className="text-white">{formatBRL(totalPatrimony + parseVal(totalAporte))}</span></div>
                 <div className="flex justify-between text-xs font-bold uppercase text-zinc-500"><span>Bolso / Proventos:</span><span className="text-yellow-500">{formatBRL(parseVal(outOfPocket) || parseVal(totalAporte))} / {formatBRL(parseVal(reinvested))}</span></div>
              </div>
              <div className="flex flex-col gap-3">
                 <button onClick={handleConfirmAporte} className="w-full gold-gradient text-zinc-950 font-black py-5 rounded-2xl shadow-xl hover:scale-[1.02] transition-all uppercase tracking-widest text-xs">Confirmar Operação</button>
                 <button onClick={() => setShowConfirmation(false)} className="w-full bg-zinc-800 text-zinc-400 font-black py-4 rounded-2xl hover:text-white transition-all uppercase tracking-widest text-[10px]">Voltar</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Aportes;

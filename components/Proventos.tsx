
import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, HandCoins, Plus, Trash2, X, RefreshCcw, 
  Sparkles, TrendingUp, BarChart3, CheckCircle2, Search, 
  Loader2, AlertCircle, Clock, Zap, BrainCircuit, 
  ExternalLink, Calendar, ChevronRight, LayoutGrid, LineChart as LineChartIcon, Globe, ShieldCheck
} from 'lucide-react';
import { Earning, Asset } from '../types.ts';
import { CurrencyMode, SourceList } from '../App.tsx';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Cell, AreaChart, Area, ComposedChart 
} from 'recharts';
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

interface ProventosProps {
  earnings: Earning[];
  assets: Asset[];
  usdRate: number;
  currencyMode: CurrencyMode;
  onAddEarning: (earning: Earning | Earning[]) => void;
  onDeleteEarning: (id: string) => void;
}

type ChartView = 'mensal' | 'anual' | 'acumulado';

const Proventos: React.FC<ProventosProps> = ({ 
  earnings, 
  assets, 
  usdRate, 
  currencyMode, 
  onAddEarning, 
  onDeleteEarning
}) => {
  const navigate = useNavigate();
  const [view, setView] = useState<ChartView>('mensal');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [ticker, setTicker] = useState('');
  const [unitAmount, setUnitAmount] = useState('');
  const [receivedAmount, setReceivedAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [type, setType] = useState<'Dividendo' | 'JCP' | 'Rendimento' | 'Outro'>('Dividendo');
  const [isManualTotal, setIsManualTotal] = useState(false);
  
  const [isDeepScanning, setIsDeepScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState<string | null>(null);
  const [currentSources, setCurrentSources] = useState<any[]>([]);

  const formatBRL = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const stats = useMemo(() => {
    const total = earnings.reduce((acc, e) => acc + (e.receivedAmount || 0), 0);
    const currentYear = new Date().getFullYear();
    const totalYear = earnings.filter(e => new Date(e.date).getFullYear() === currentYear).reduce((acc, e) => acc + (e.receivedAmount || 0), 0);
    const monthlyMap: Record<string, number> = {};
    earnings.forEach(e => { const d = new Date(e.date); const key = `${d.getMonth()}/${d.getFullYear()}`; monthlyMap[key] = (monthlyMap[key] || 0) + e.receivedAmount; });
    const months = Object.values(monthlyMap);
    return { total, totalYear, average: months.length > 0 ? total / months.length : 0 };
  }, [earnings]);

  const chartData = useMemo(() => {
    if (earnings.length === 0) return [];
    const sorted = [...earnings].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    if (view === 'anual') {
      const map: Record<string, number> = {};
      sorted.forEach(e => { const y = new Date(e.date).getFullYear().toString(); map[y] = (map[y] || 0) + e.receivedAmount; });
      return Object.entries(map).map(([name, total]) => ({ name, total }));
    }
    if (view === 'acumulado') {
      let running = 0; const map: Record<string, number> = {};
      sorted.forEach(e => { const d = new Date(e.date); const k = `${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`; map[k] = (map[k] || 0) + e.receivedAmount; });
      return Object.entries(map).map(([name, mVal]) => { running += mVal; return { name, total: running }; });
    }
    const map: Record<string, number> = {};
    sorted.forEach(e => { const d = new Date(e.date); const k = `${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear().toString().substring(2)}`; map[k] = (map[k] || 0) + e.receivedAmount; });
    return Object.entries(map).map(([name, total]) => ({ name, total }));
  }, [earnings, view]);

  const getQuantityAtDate = useCallback((tTicker: string, tDate: string) => {
    if (!tTicker || !tDate) return 0;
    const dateLimit = new Date(tDate);
    return assets.filter(a => a.ticker === tTicker).reduce((acc, curr) => new Date(curr.purchaseDate) <= dateLimit ? acc + (Number(curr.quantity) || 0) : acc, 0);
  }, [assets]);

  const startDeepScan = async () => {
    if (assets.length === 0 || isDeepScanning) return;
    setIsDeepScanning(true);
    const uniqueTickers = Array.from(new Set(assets.map(a => a.ticker).filter((t): t is string => !!t)));
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    for (const t of uniqueTickers) {
      setScanStatus(`Pesquisando fontes oficiais para ${t}...`);
      const oldestDate = assets.filter(a => a.ticker === t).map(a => a.purchaseDate).sort()[0] || '2020-01-01';
      
      try {
        const prompt = `Utilize o Google Search para encontrar TODOS os dividendos, JCP e rendimentos do ativo ${t} desde ${oldestDate} até hoje. Retorne um JSON estrito no formato: {"suggestions": [{"value": number, "date": "YYYY-MM-DD", "type": "Dividendo|JCP|Rendimento"}]}`;
        const response: GenerateContentResponse = await ai.models.generateContent({ 
          model: 'gemini-3-flash-preview', 
          contents: prompt,
          config: { tools: [{ googleSearch: {} }] }
        });

        setCurrentSources(response.candidates?.[0]?.groundingMetadata?.groundingChunks || []);
        const cleanJson = response.text?.match(/\{[\s\S]*\}/)?.[0] || '{"suggestions":[]}';
        const data = JSON.parse(cleanJson);
        
        if (data.suggestions) {
          const valid = data.suggestions.map((s: any) => {
            const qty = getQuantityAtDate(t, s.date);
            if (qty <= 0) return null;
            return {
              id: `ia-${t}-${s.date}-${Math.random().toString(36).substr(2,4)}`,
              assetTicker: t, date: s.date, type: s.type || 'Dividendo',
              receivedAmount: s.value * qty, reinvestedAmount: 0, withdrawnAmount: s.value * qty,
              unitAmount: s.value, quantityAtDate: qty, isAutoGenerated: true
            };
          }).filter((n: any) => n && !earnings.some(e => e.assetTicker === t && e.date === n.date));
          if (valid.length > 0) onAddEarning(valid);
        }
      } catch (err) { console.error("Erro no scan IA:", err); }
    }
    setIsDeepScanning(false);
    setScanStatus(null);
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-24">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/')} className="p-3 bg-zinc-900 border border-zinc-800 rounded-2xl hover:text-yellow-500 shadow-lg active:scale-90"><ArrowLeft size={20} /></button>
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tighter">Fluxo de <span className="text-yellow-500">Caixa</span></h1>
            <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Auditoria Inteligente de Renda Passiva</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
           {scanStatus && <div className="flex items-center gap-2 bg-yellow-500/10 px-3 py-1.5 rounded-full border border-yellow-500/20"><BrainCircuit size={12} className="text-yellow-500 animate-pulse"/><span className="text-[9px] font-black text-yellow-500 uppercase tracking-widest">{scanStatus}</span></div>}
           <div className="flex flex-wrap gap-3">
            <button onClick={startDeepScan} disabled={isDeepScanning} className={`flex items-center gap-3 px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all border ${isDeepScanning ? 'bg-yellow-500/10 border-yellow-500/50 text-yellow-500' : 'bg-zinc-950 border-zinc-800 text-zinc-400'}`}>
              {isDeepScanning ? <Loader2 size={16} className="animate-spin" /> : <Globe size={16} />}
              Scan IA Verificado
            </button>
            <button onClick={() => setIsModalOpen(true)} className="gold-gradient text-zinc-950 px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:scale-[1.02] shadow-xl">
              <Plus size={18} /> Lançar Manual
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="dark-card p-8 rounded-[2.5rem] bg-zinc-900/40 border-l-[10px] border-yellow-500 shadow-xl">
            {/* Added missing ShieldCheck icon below */}
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1 flex items-center gap-2">Acumulado Histórico <ShieldCheck size={12} className="text-yellow-500"/></p>
            <h3 className="text-4xl font-black text-white">{formatBRL(stats.total)}</h3>
         </div>
         <div className="dark-card p-8 rounded-[2.5rem] bg-zinc-900/40 border-l-[10px] border-emerald-500 shadow-xl">
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Total no Ano</p>
            <h3 className="text-4xl font-black text-white">{formatBRL(stats.totalYear)}</h3>
         </div>
         <div className="dark-card p-8 rounded-[2.5rem] bg-zinc-900/40 border-l-[10px] border-blue-500 shadow-xl">
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Média Mensal</p>
            <h3 className="text-4xl font-black text-white">{formatBRL(stats.average)}</h3>
         </div>
      </div>

      <div className="dark-card p-10 rounded-[3rem] bg-zinc-900/20 border border-zinc-800 shadow-2xl space-y-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-1">
             <div className="flex items-center gap-3 text-yellow-500 font-black uppercase text-[10px] tracking-widest"><BarChart3 size={16} /> Evolução de Rendimentos</div>
             <SourceList chunks={currentSources} />
          </div>
          <div className="flex bg-zinc-950 p-1.5 rounded-2xl border border-zinc-800 shadow-inner">
             {(['mensal', 'anual', 'acumulado'] as const).map(t => (
               <button key={t} onClick={() => setView(t)} className={`px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${view === t ? 'bg-yellow-500 text-zinc-950 shadow-lg' : 'text-zinc-500 hover:text-white'}`}>{t}</button>
             ))}
          </div>
        </div>

        <div className="h-[400px] w-full bg-zinc-950/20 p-4 rounded-3xl border border-zinc-800/30">
           {chartData.length > 0 ? (
             <ResponsiveContainer width="100%" height="100%">
               {view === 'acumulado' ? (
                 <AreaChart data={chartData}>
                   <defs><linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#fbbf24" stopOpacity={0.3}/><stop offset="95%" stopColor="#fbbf24" stopOpacity={0}/></linearGradient></defs>
                   <CartesianGrid strokeDasharray="3 3" stroke="#1c1c1f" vertical={false} />
                   <XAxis dataKey="name" stroke="#3f3f46" fontSize={10} axisLine={false} tickLine={false} tickMargin={10} />
                   <YAxis stroke="#3f3f46" fontSize={10} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${v}`} />
                   <Tooltip contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '16px' }} formatter={(v: any) => [formatBRL(v), 'Acumulado']} />
                   <Area type="monotone" dataKey="total" stroke="#fbbf24" strokeWidth={5} fillOpacity={1} fill="url(#colorTotal)" />
                 </AreaChart>
               ) : (
                 <BarChart data={chartData}>
                   <CartesianGrid strokeDasharray="3 3" stroke="#1c1c1f" vertical={false} />
                   <XAxis dataKey="name" stroke="#3f3f46" fontSize={10} axisLine={false} tickLine={false} tickMargin={10} />
                   <YAxis stroke="#3f3f46" fontSize={10} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${v}`} />
                   <Tooltip cursor={{fill: '#27272a', opacity: 0.4}} contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '16px' }} formatter={(v: any) => [formatBRL(v), 'Recebido']} />
                   <Bar dataKey="total" radius={[8, 8, 0, 0]}>
                     {chartData.map((entry, index) => (
                       <Cell key={`cell-${index}`} fill={index === chartData.length - 1 ? '#fbbf24' : '#d97706'} fillOpacity={0.8} />
                     ))}
                   </Bar>
                 </BarChart>
               )}
             </ResponsiveContainer>
           ) : <div className="h-full flex flex-col items-center justify-center opacity-20 gap-4"><HandCoins size={48} /><p className="text-[10px] font-black uppercase tracking-widest">Nenhum dado auditado</p></div>}
        </div>
      </div>

      <div className="dark-card rounded-[3rem] overflow-hidden shadow-2xl bg-zinc-900/20 border border-zinc-800">
        <div className="p-8 border-b border-zinc-800 bg-zinc-900/40 flex justify-between items-center"><h2 className="font-black text-xl uppercase tracking-tight">Histórico de Auditoria</h2><div className="flex items-center gap-2 text-[8px] font-black uppercase text-zinc-600"><div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"/> Scan IA Ativo</div></div>
        <div className="overflow-x-auto">
          {earnings.length === 0 ? <div className="p-32 text-center opacity-20 flex flex-col items-center gap-4"><HandCoins size={60} /><p className="font-black uppercase tracking-widest text-xs">Sem lançamentos</p></div> : (
            <table className="w-full text-left">
              <thead className="bg-zinc-900 text-[10px] text-zinc-600 uppercase font-black tracking-widest border-b border-zinc-800">
                <tr><th className="px-10 py-6">Data</th><th className="px-10 py-6">Ativo</th><th className="px-10 py-6">Tipo</th><th className="px-10 py-6 text-right">Valor</th><th className="px-10 py-6 text-center">Ações</th></tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {earnings.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(e => (
                  <tr key={e.id} className="hover:bg-zinc-900/30 transition-all group">
                    <td className="px-10 py-6 font-black text-zinc-400 text-sm">{new Date(e.date).toLocaleDateString('pt-BR')}</td>
                    <td className="px-10 py-6 font-black text-white">{e.assetTicker}</td>
                    <td className="px-10 py-6"><span className={`text-[9px] font-black uppercase px-3 py-1 rounded-full border ${e.isAutoGenerated ? 'border-yellow-500/30 text-yellow-500 bg-yellow-500/5' : 'border-zinc-800 text-zinc-500'}`}>{e.type}</span></td>
                    <td className="px-10 py-6 text-right font-black text-white">{formatBRL(e.receivedAmount)}</td>
                    <td className="px-10 py-6 text-center"><button onClick={() => onDeleteEarning(e.id)} className="p-2 text-zinc-700 hover:text-red-500 transition-colors"><Trash2 size={16} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="bg-zinc-900 border border-zinc-800 rounded-[3rem] w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-8 border-b border-zinc-800 bg-zinc-900/50 flex justify-between items-center"><h2 className="text-xl font-black uppercase tracking-tight">Lançar Provento</h2><button onClick={() => setIsModalOpen(false)} className="text-zinc-500 hover:text-white"><X size={24} /></button></div>
            <form onSubmit={(e) => { e.preventDefault(); const qty = getQuantityAtDate(ticker, date); const val = isManualTotal ? parseFloat(receivedAmount) : (parseFloat(unitAmount) * (qty || 1)); onAddEarning({ id: `man-${Date.now()}`, assetTicker: ticker, date, type, receivedAmount: val, reinvestedAmount: 0, withdrawnAmount: val, unitAmount: isManualTotal ? undefined : parseFloat(unitAmount), quantityAtDate: qty, isAutoGenerated: false }); setIsModalOpen(false); }} className="p-10 space-y-6">
              <div className="space-y-2"><label className="text-[10px] font-black text-zinc-500 uppercase">Ticker</label><select required value={ticker} onChange={e => setTicker(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-white font-black"><option value="">Selecione...</option>{Array.from(new Set(assets.map(a => a.ticker))).filter(t => t).map(t => <option key={t} value={t}>{t}</option>)}</select></div>
              <div className="flex gap-2 p-1 bg-zinc-950 rounded-2xl"><button type="button" onClick={() => setIsManualTotal(false)} className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase ${!isManualTotal ? 'bg-yellow-500 text-zinc-950' : 'text-zinc-600'}`}>Unitário</button><button type="button" onClick={() => setIsManualTotal(true)} className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase ${isManualTotal ? 'bg-yellow-500 text-zinc-950' : 'text-zinc-600'}`}>Total</button></div>
              <input required type="number" step="any" placeholder="0,00" value={isManualTotal ? receivedAmount : unitAmount} onChange={e => isManualTotal ? setReceivedAmount(e.target.value) : setUnitAmount(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-5 text-2xl font-black text-white" />
              <div className="grid grid-cols-2 gap-4"><input required type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-white text-xs font-black" /><select value={type} onChange={e => setType(e.target.value as any)} className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-white text-xs font-black"><option value="Dividendo">Dividendo</option><option value="JCP">JCP</option><option value="Rendimento">Rendimento</option></select></div>
              <button type="submit" className="w-full gold-gradient text-zinc-950 font-black py-5 rounded-2xl shadow-xl hover:scale-105 transition-all uppercase tracking-widest text-xs">Confirmar Registro</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Proventos;

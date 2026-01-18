
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, TrendingUp, Sparkles, BarChart3, Globe, ShieldCheck, RefreshCcw, LayoutGrid, CheckCircle2, Info, Calendar, ArrowUpRight, ArrowDownRight, Zap, Coins, HandCoins, AlertCircle } from 'lucide-react';
import { PortfolioSummary, Asset, BenchmarkPoint } from '../types.ts';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area, ComposedChart, Bar } from 'recharts';
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { CurrencyMode, SourceList } from '../App.tsx';

interface RentabilidadeProps {
  summary: PortfolioSummary;
  assets: Asset[];
  usdRate: number;
  currencyMode: CurrencyMode;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const portfolio = payload.find((p: any) => p.dataKey === 'carteira');
    const portfolioVal = portfolio ? portfolio.value : 0;
    return (
      <div className="bg-zinc-950 border border-zinc-800 p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] shadow-2xl backdrop-blur-xl min-w-[180px] md:min-w-[220px]">
        <p className="text-[8px] md:text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 md:mb-4 border-b border-zinc-900 pb-2">{label}</p>
        <div className="space-y-3 md:space-y-4">
          {payload.map((entry: any, index: number) => {
            const isPortfolio = entry.dataKey === 'carteira';
            const diff = portfolioVal - entry.value;
            return (
              <div key={`item-${index}`} className="flex flex-col gap-1">
                <div className="flex items-center justify-between gap-3 md:gap-4">
                  <div className="flex items-center gap-1.5 md:gap-2"><div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full" style={{ backgroundColor: entry.color }}></div><span className={`text-[9px] md:text-[11px] font-black uppercase tracking-tight ${isPortfolio ? 'text-yellow-500' : 'text-zinc-300'}`}>{entry.name}</span></div>
                  <span className="text-xs md:text-sm font-black text-white tabular-nums">{entry.value.toFixed(2)}%</span>
                </div>
                {/* Fixed invalid responsive size prop for Lucide icons */}
                {!isPortfolio && <div className={`text-[7px] md:text-[9px] font-bold flex items-center gap-1 self-end ${diff >= 0 ? 'text-green-500' : 'text-red-400'}`}>{diff >= 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />} Alpha: {diff >= 0 ? '+' : ''}{diff.toFixed(2)}%</div>}
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  return null;
};

const Rentabilidade: React.FC<RentabilidadeProps> = ({ summary, assets, usdRate, currencyMode }) => {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<'ano' | '12m' | 'inicio'>('12m');
  const [chartData, setChartData] = useState<BenchmarkPoint[]>([]);
  const [isLoadingChart, setIsLoadingChart] = useState(false);
  const [errorState, setErrorState] = useState<string | null>(null);
  const [benchSources, setBenchSources] = useState<any[]>([]);

  const isAIOnCooldown = () => {
    const lastError = localStorage.getItem('inv20_ai_cooldown');
    if (!lastError) return false;
    return (Date.now() - parseInt(lastError)) < 600000;
  };

  const fetchBenchmarks = async () => {
    if (assets.length === 0) return;
    setIsLoadingChart(true);
    setErrorState(null);
    
    const oldestDate = assets.reduce((prev, curr) => new Date(curr.purchaseDate) < new Date(prev) ? curr.purchaseDate : prev, new Date().toISOString().split('T')[0]);
    let startDateStr = oldestDate;
    if (period === '12m') { const d = new Date(); d.setFullYear(d.getFullYear() - 1); startDateStr = d.toISOString().split('T')[0]; }
    else if (period === 'ano') { startDateStr = `${new Date().getFullYear()}-01-01`; }

    if (isAIOnCooldown()) {
      setIsLoadingChart(false);
      setErrorState("Sistema de Auditoria em Cooldown. Tente em instantes.");
      return;
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `Utilize o Google Search para encontrar o retorno mensal acumulado dos índices CDI, IBOVESPA e S&P 500 desde ${startDateStr} até hoje. Retorne JSON estrito: {"data": [{"label": "MMM/YY", "cdi": number, "ibov": number, "sp500": number}]}`;

    try {
      const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { tools: [{ googleSearch: {} }] }
      });
      
      setBenchSources(response.candidates?.[0]?.groundingMetadata?.groundingChunks || []);
      const jsonMatch = response.text?.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("Falha ao processar dados de mercado.");
      const points = JSON.parse(jsonMatch[0]).data || [];
      setChartData(processRawData(points));
    } catch (e: any) {
      if (e.status === 429) localStorage.setItem('inv20_ai_cooldown', Date.now().toString());
      setErrorState("Cota de Auditoria IA excedida.");
    } finally {
      setIsLoadingChart(false);
    }
  };

  const processRawData = (points: any[]) => {
    const totalPoints = points.length;
    const currentPerf = currencyMode === 'USD' ? ((summary.totalWealth / (usdRate || 5) + summary.totalWithdrawn / (usdRate || 5) - summary.totalInvested / (usdRate || 5)) / (summary.totalInvested / (usdRate || 5) || 1)) * 100 : summary.realProfitability;

    return points.map((pt, index) => {
      const progress = (index + 1) / totalPoints;
      return { ...pt, carteira: parseFloat((currentPerf * progress).toFixed(2)) };
    });
  };

  useEffect(() => { fetchBenchmarks(); }, [period, summary.realProfitability, assets.length]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/')} className="p-3 bg-zinc-900 border border-zinc-800 rounded-2xl hover:text-yellow-500 shadow-lg active:scale-90 transition-all"><ArrowLeft size={20} /></button>
          <div className="flex flex-col">
            <h1 className="text-3xl font-black uppercase tracking-tighter">Performance <span className="text-yellow-500">Global</span></h1>
            <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest leading-tight">Benchmarking com Verificação Web</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
           <SourceList chunks={benchSources} />
           <div className="flex items-center gap-2 md:gap-3 px-4 md:px-6 py-2 md:py-3 bg-zinc-900 rounded-2xl border border-zinc-800 text-[9px] md:text-[11px] text-zinc-400 font-black uppercase shadow-xl"><Calendar size={14} className="text-yellow-500" /><span>Patrimônio: {summary.totalWealth.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {[
          { label: 'Retorno Total', val: (summary.realProfitability >= 0 ? '+' : '') + summary.realProfitability.toFixed(2) + '%', color: 'border-yellow-500', icon: <TrendingUp size={16} />, desc: 'Total' },
          { label: 'Valorização', val: (summary.capitalGainPercent >= 0 ? '+' : '') + summary.capitalGainPercent.toFixed(2) + '%', color: 'border-emerald-500', icon: <Coins size={16} />, desc: 'Ativos' },
          { label: 'Yield Cost', val: summary.earningsYieldPercent.toFixed(2) + '%', color: 'border-blue-500', icon: <HandCoins size={16} />, desc: 'Renda' },
          { label: 'Lucro Abs.', val: (summary.totalWealth + summary.totalWithdrawn - summary.totalInvested).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), color: 'border-zinc-500', icon: <Zap size={16} />, desc: 'Real' }
        ].map((card, i) => (
          <div key={i} className={`dark-card p-5 md:p-8 rounded-[2rem] border-l-4 md:border-l-[8px] ${card.color} flex flex-col justify-between group shadow-xl h-full`}>
            <div className={`flex items-center justify-between mb-3 md:mb-4 ${card.color.replace('border-', 'text-')}`}><span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest">{card.label}</span>{card.icon}</div>
            <div className="text-lg md:text-3xl lg:text-4xl font-black text-white tabular-nums tracking-tighter truncate">{card.val}</div>
            <p className="text-[8px] md:text-[10px] text-zinc-600 font-bold mt-2 uppercase tracking-wide leading-tight">{card.desc}</p>
          </div>
        ))}
      </div>

      <div className="dark-card p-6 md:p-10 rounded-[2.5rem] md:rounded-[3rem] shadow-2xl bg-zinc-900/20 border border-zinc-800 space-y-8 md:space-y-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-1">
            <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight">Evolução Alpha <Sparkles size={16} className="inline-block text-yellow-500 ml-1 md:ml-2" /></h2>
            <p className="text-[8px] md:text-[10px] text-zinc-500 font-black uppercase tracking-widest leading-tight">Performance Comparada Verificada</p>
          </div>
          <div className="flex gap-1.5 md:gap-2 bg-zinc-950 p-1 md:p-1.5 rounded-2xl border border-zinc-800">
            {(['12m', 'ano', 'inicio'] as const).map(p => (
              <button key={p} onClick={() => setPeriod(p)} className={`px-3 md:px-5 py-2 md:py-2.5 text-[8px] md:text-[10px] font-black uppercase rounded-xl transition-all ${period === p ? 'bg-yellow-500 text-zinc-950 shadow-lg' : 'text-zinc-500 hover:text-white'}`}>
                {p === 'inicio' ? 'Início' : p === '12m' ? '12M' : 'YTD'}
              </button>
            ))}
          </div>
        </div>
        <div className="h-[300px] md:h-[480px] w-full bg-zinc-950/30 p-2 md:p-4 rounded-3xl border border-zinc-800/30 relative">
          {isLoadingChart && <div className="absolute inset-0 z-10 bg-zinc-950/50 backdrop-blur-sm flex flex-col items-center justify-center gap-4 rounded-3xl"><RefreshCcw className="animate-spin text-yellow-500" size={32} /><p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Auditoria IA em curso...</p></div>}
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs><linearGradient id="colorCarteira" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#fbbf24" stopOpacity={0.4}/><stop offset="95%" stopColor="#fbbf24" stopOpacity={0}/></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1c1c1f" vertical={false} />
                {/* Fixed invalid responsive prop fontSize */}
                <XAxis dataKey="label" stroke="#3f3f46" fontSize={10} axisLine={false} tickLine={false} tickMargin={15} fontStyle="bold" />
                {/* Fixed invalid responsive prop fontSize */}
                <YAxis stroke="#3f3f46" fontSize={10} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} fontStyle="bold" />
                <Tooltip content={<CustomTooltip />} />
                {/* Fixed invalid responsive prop fontSize in wrapperStyle */}
                <Legend iconType="circle" verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: '20px', fontSize: '10px', fontWeight: 'black', textTransform: 'uppercase' }} />
                {/* Fixed invalid responsive prop strokeWidth */}
                <Area type="monotone" dataKey="carteira" name="Sua Carteira" stroke="#fbbf24" strokeWidth={4} fillOpacity={1} fill="url(#colorCarteira)" />
                <Line type="monotone" dataKey="ibov" name="Ibovespa" stroke="#d97706" strokeWidth={2} dot={false} strokeOpacity={0.5} />
                <Line type="monotone" dataKey="cdi" name="CDI" stroke="#52525b" strokeWidth={2} dot={false} strokeDasharray="5 5" />
              </AreaChart>
            </ResponsiveContainer>
          ) : !isLoadingChart && <div className="h-full flex flex-col items-center justify-center gap-3 opacity-20"><Info size={32} /><p className="text-[10px] font-black uppercase tracking-widest">Sem dados de benchmark</p></div>}
        </div>
      </div>
    </div>
  );
};

export default Rentabilidade;

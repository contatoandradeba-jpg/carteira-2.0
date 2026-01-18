
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wallet, TrendingUp, HandCoins, Calculator, ChevronRight, Sparkles, RefreshCcw, ArrowUpRight, ArrowDownRight, PlusCircle, PieChart, ShieldCheck, Loader2, Clock, Plus, BrainCircuit, Target, Coins, Zap } from 'lucide-react';
import { PortfolioSummary, Asset, Earning } from '../types.ts';
import { CurrencyMode } from '../App.tsx';

interface DashboardProps {
  summary: PortfolioSummary;
  assets: Asset[];
  usdRate: number;
  currencyMode: CurrencyMode;
  onRefresh: () => void;
  onAddClick: () => void;
  userName?: string;
  earnings?: Earning[];
}

const Dashboard: React.FC<DashboardProps> = ({ summary, assets, usdRate, currencyMode, onRefresh, onAddClick, userName = "CARTEIRA 2.0", earnings = [] }) => {
  const navigate = useNavigate();
  
  const formatBRL = (val: number) => (val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const formatUSD = (val: number) => (val / usdRate || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  const formatPercent = (val: number) => ((val || 0) >= 0 ? '+' : '') + (val || 0).toFixed(2) + '%';

  const capitalGainValue = summary.totalWealth - summary.totalInvested;
  const totalReturnAbsolute = summary.totalWealth + summary.totalWithdrawn - summary.totalInvested;

  return (
    <div className="space-y-6 md:space-y-10 animate-in fade-in duration-700 relative pb-10">
      <div className="relative overflow-hidden bg-zinc-900/40 p-6 md:p-10 lg:p-14 rounded-[2.5rem] md:rounded-[3.5rem] border border-zinc-800 shadow-2xl">
        <div className="absolute top-0 right-0 p-12 opacity-[0.03] rotate-12 pointer-events-none"><ShieldCheck size={250} /></div>
        
        <div className="relative z-10 space-y-8 md:space-y-12">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-yellow-500 font-black uppercase text-[10px] tracking-widest mb-1"><BrainCircuit size={14} /> Inteligência de Performance</div>
              <h2 className="text-3xl md:text-4xl font-black text-white tracking-tighter">Carteira de {userName}</h2>
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-600">Patrimônio Consolidado INVESTIDOR 2.0</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
            <div className="space-y-3">
              <p className="text-[10px] font-black uppercase tracking-[0.5em] text-zinc-500 ml-1">Patrimônio Líquido</p>
              <div className="text-4xl md:text-5xl lg:text-8xl font-black text-white tracking-tighter flex flex-wrap items-baseline gap-2 md:gap-3">
                {currencyMode === 'USD' ? formatUSD(summary.totalWealth) : formatBRL(summary.totalWealth)}
                {currencyMode === 'BOTH' && <span className="text-[10px] md:text-xs text-zinc-600 font-bold">{formatUSD(summary.totalWealth)}</span>}
              </div>
            </div>
            
            <div className="space-y-3">
              <p className="text-[10px] font-black uppercase tracking-[0.5em] text-zinc-500 ml-1">Retorno Real Total</p>
              <div className="flex flex-wrap items-center gap-3 md:gap-5">
                <div className={`text-3xl md:text-4xl lg:text-6xl font-black tracking-tighter ${totalReturnAbsolute >= 0 ? 'text-yellow-500' : 'text-red-400'}`}>
                  {formatBRL(totalReturnAbsolute)}
                </div>
                <div className={`p-2 md:p-2.5 rounded-2xl flex items-center gap-1.5 ${totalReturnAbsolute >= 0 ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-400'}`}>
                  {totalReturnAbsolute >= 0 ? <ArrowUpRight size={20} className="md:w-6 md:h-6" /> : <ArrowDownRight size={20} className="md:w-6 md:h-6" />}
                  <div className="flex flex-col items-start leading-none">
                     <span className="text-base md:text-lg font-black">{formatPercent(summary.realProfitability)}</span>
                     <span className="text-[8px] font-black uppercase opacity-60">YoC: {summary.earningsYieldPercent.toFixed(2)}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
         <div className="dark-card p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] bg-zinc-900/20 border border-zinc-800 space-y-6">
            <div className="flex items-center justify-between">
               <span className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Performance</span>
               <TrendingUp size={16} className="text-yellow-500" />
            </div>
            <div className="space-y-4">
               <div className="flex justify-between items-center gap-2">
                  <span className="text-xs md:text-sm font-bold text-zinc-400">Ganho Capital:</span>
                  <span className={`font-black text-xs md:text-base ${summary.capitalGainPercent >= 0 ? 'text-white' : 'text-red-400'}`}>{formatPercent(summary.capitalGainPercent)}</span>
               </div>
               <div className="flex justify-between items-center gap-2">
                  <span className="text-xs md:text-sm font-bold text-zinc-400">Yield Total:</span>
                  <span className="font-black text-xs md:text-base text-yellow-500">{formatPercent(summary.earningsYieldPercent)}</span>
               </div>
               <div className="h-px bg-zinc-800"></div>
               <div className="flex justify-between items-center pt-2 gap-2">
                  <span className="text-[8px] md:text-xs font-black uppercase text-zinc-600">Retorno Total:</span>
                  <span className="text-base md:text-lg font-black text-white">{formatPercent(summary.realProfitability)}</span>
               </div>
            </div>
         </div>

         <div className="dark-card p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] bg-zinc-900/20 border border-zinc-800 space-y-6">
            <div className="flex items-center justify-between">
               <span className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Caixa</span>
               <HandCoins size={16} className="text-emerald-500" />
            </div>
            <div className="space-y-4">
               <div className="flex justify-between items-center gap-2">
                  <span className="text-xs md:text-sm font-bold text-zinc-400">Proventos:</span>
                  <span className="font-black text-xs md:text-base text-white">{formatBRL(summary.totalEarnings)}</span>
               </div>
               <div className="flex justify-between items-center gap-2">
                  <span className="text-xs md:text-sm font-bold text-zinc-400">Reinvestido:</span>
                  <span className="font-black text-xs md:text-base text-emerald-500">{formatBRL(summary.totalReinvested)}</span>
               </div>
               <div className="flex justify-between items-center gap-2">
                  <span className="text-xs md:text-sm font-bold text-zinc-400">Sacado:</span>
                  <span className="font-black text-xs md:text-base text-zinc-500">{formatBRL(summary.totalWithdrawn)}</span>
               </div>
            </div>
         </div>

         <div className="dark-card p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] bg-zinc-900/20 border border-zinc-800 space-y-6">
            <div className="flex items-center justify-between">
               <span className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Aportes</span>
               <Target size={16} className="text-blue-500" />
            </div>
            <div className="space-y-4">
               <div className="flex justify-between items-center gap-2">
                  <span className="text-xs md:text-sm font-bold text-zinc-400">Capital Bolso:</span>
                  <span className="font-black text-xs md:text-base text-white">{formatBRL(summary.totalInvested)}</span>
               </div>
               <div className="flex justify-between items-center gap-2">
                  <span className="text-xs md:text-sm font-bold text-zinc-400">Lucro Capital:</span>
                  <span className={`font-black text-xs md:text-base ${capitalGainValue >= 0 ? 'text-green-500' : 'text-red-400'}`}>{formatBRL(capitalGainValue)}</span>
               </div>
               <div className="h-px bg-zinc-800"></div>
               <div className="flex justify-between items-center pt-2 gap-2">
                  <span className="text-[8px] md:text-xs font-black uppercase text-zinc-600">Posição:</span>
                  <span className="text-base md:text-lg font-black text-white">{formatBRL(summary.totalWealth)}</span>
               </div>
            </div>
         </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {[
          { title: 'Ativos', label: `${assets.length} títulos`, icon: <Wallet size={20} />, path: '/ativos' },
          { title: 'Proventos', label: formatBRL(summary.totalEarnings), icon: <HandCoins size={20} />, path: '/proventos' },
          { title: 'Performance', label: formatPercent(summary.realProfitability), icon: <TrendingUp size={20} />, path: '/rentabilidade' },
          { title: 'Smart Aporte', label: 'Engine 2.0', icon: <Calculator size={20} />, path: '/aportes' }
        ].map((card, i) => (
          <button key={i} onClick={() => navigate(card.path)} className="group dark-card p-5 md:p-8 rounded-[2rem] md:rounded-[2.5rem] flex flex-col items-start gap-4 transition-all hover:scale-[1.02] text-left relative overflow-hidden">
            <div className="p-2 md:p-3 bg-zinc-900 border border-zinc-800 rounded-xl group-hover:bg-yellow-500 group-hover:text-zinc-950 transition-all text-yellow-500">{card.icon}</div>
            <div className="space-y-1">
              <p className="text-zinc-500 text-[8px] md:text-[10px] font-black uppercase tracking-widest leading-tight">{card.title}</p>
              <div className="text-sm md:text-lg font-black text-white truncate max-w-full">{card.label}</div>
            </div>
            {/* Fixed invalid responsive size prop for Lucide icon */}
            <ChevronRight className="absolute bottom-5 right-5 md:bottom-8 md:right-8 text-zinc-800 group-hover:text-yellow-500 group-hover:translate-x-1 transition-all" size={20} />
          </button>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;

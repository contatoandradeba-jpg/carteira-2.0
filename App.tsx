
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { HashRouter, Routes, Route, Link, Navigate } from 'react-router-dom';
import { PlusCircle, X, Calculator, HandCoins, RefreshCcw, Coins, TrendingUp, Settings, Menu, Wallet, PieChart, Download, Upload, Trash2, ShieldCheck, CheckCircle2, LayoutGrid, Sparkles, ExternalLink, Loader2, Plus, BrainCircuit, Globe } from 'lucide-react';
import Dashboard from './components/Dashboard.tsx';
import Ativos from './components/Ativos.tsx';
import Proventos from './components/Proventos.tsx';
import Rentabilidade from './components/Rentabilidade.tsx';
import Alocacao from './components/Alocacao.tsx';
import Aportes from './components/Aportes.tsx';
import Lancamentos from './components/Lancamentos.tsx';
import AddAssetForm from './components/AddAssetForm.tsx';
import Logo from './components/Logo.tsx';
import { Asset, Earning, PortfolioSummary, AssetClass, Contribution } from './types.ts';
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

const DEFAULT_CLASSES: AssetClass[] = [
  { id: '1', name: 'Renda Variável Brasil', targetPercent: 30 },
  { id: '2', name: 'Renda Variável Exterior', targetPercent: 20 },
  { id: '3', name: 'FIIs', targetPercent: 20 },
  { id: '4', name: 'Renda Fixa', targetPercent: 20 },
  { id: '5', name: 'Criptomoedas', targetPercent: 10 },
];

export type CurrencyMode = 'BRL' | 'USD' | 'BOTH';

const COOLDOWN_TIME = 10 * 60 * 1000;

export const SourceList: React.FC<{ chunks?: any[] }> = ({ chunks }) => {
  if (!chunks || chunks.length === 0) return null;
  const links = chunks.filter(c => c.web?.uri || c.maps?.uri).map(c => ({ uri: c.web?.uri || c.maps?.uri, title: c.web?.title || c.maps?.title || 'Fonte Web' }));
  if (links.length === 0) return null;
  return (
    <div className="mt-2 space-y-1">
      <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest flex items-center gap-1"><Globe size={8}/> Fontes verificadas:</p>
      <div className="flex flex-wrap gap-2">
        {links.slice(0, 3).map((link, i) => (
          <a key={i} href={link.uri} target="_blank" rel="noopener noreferrer" className="text-[9px] text-yellow-500/70 hover:text-yellow-500 flex items-center gap-1 bg-yellow-500/5 px-2 py-0.5 rounded-full border border-yellow-500/10">
            {link.title.substring(0, 20)}... <ExternalLink size={8}/>
          </a>
        ))}
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [showSettings, setShowSettings] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [logoVersion, setLogoVersion] = useState(0);

  const [assets, setAssets] = useState<Asset[]>([]);
  const [classes, setClasses] = useState<AssetClass[]>(DEFAULT_CLASSES);
  const [earnings, setEarnings] = useState<Earning[]>([]);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [usdRate, setUsdRate] = useState<number>(5.0);
  const [currencyMode, setCurrencyMode] = useState<CurrencyMode>('BOTH');
  const [dataLoaded, setDataLoaded] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [lastGrounding, setLastGrounding] = useState<any[]>([]);

  const syncInterval = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const setAICooldown = () => localStorage.setItem('inv20_ai_cooldown', Date.now().toString());
  const isAIOnCooldown = () => {
    const lastError = localStorage.getItem('inv20_ai_cooldown');
    if (!lastError) return false;
    return (Date.now() - parseInt(lastError)) < COOLDOWN_TIME;
  };

  const loadFromStorage = useCallback(<T,>(key: string, defaultValue: T): T => {
    const storageKey = `inv20_${key}`;
    const saved = localStorage.getItem(storageKey);
    return saved ? JSON.parse(saved) : defaultValue;
  }, []);

  const saveToStorage = useCallback((key: string, data: any) => {
    if (!dataLoaded) return;
    localStorage.setItem(`inv20_${key}`, JSON.stringify(data));
  }, [dataLoaded]);

  const resetAllData = () => {
    if (confirm("Deseja realmente excluir todos os dados? Esta ação é irreversível.")) {
      localStorage.clear();
      setAssets([]);
      setEarnings([]);
      setClasses(DEFAULT_CLASSES);
      setContributions([]);
      setUsdRate(5.0);
      setCurrencyMode('BOTH');
      window.location.reload();
    }
  };

  const exportData = useCallback(() => {
    const backup = {
      assets,
      earnings,
      contributions,
      classes,
      settings: { currencyMode, usdRate },
      version: "2.5",
      timestamp: Date.now()
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `investidor20_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [assets, earnings, contributions, classes, currencyMode, usdRate]);

  const importData = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const raw = event.target?.result as string;
        const data = JSON.parse(raw);
        
        if (data.assets) setAssets(data.assets);
        if (data.earnings) setEarnings(data.earnings);
        if (data.contributions) setContributions(data.contributions);
        if (data.classes) setClasses(data.classes);
        if (data.settings) {
          if (data.settings.currencyMode) setCurrencyMode(data.settings.currencyMode);
          if (data.settings.usdRate) setUsdRate(data.settings.usdRate);
        }
        
        localStorage.removeItem('inv20_sync_idx');
        alert("Backup restaurado com sucesso!");
        setShowSettings(false);
      } catch (err) {
        alert("Falha ao importar: o arquivo selecionado não é um backup válido.");
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }, []);

  useEffect(() => {
    setAssets(loadFromStorage('assets', []));
    setClasses(loadFromStorage('classes', DEFAULT_CLASSES));
    setEarnings(loadFromStorage('earnings', []));
    setContributions(loadFromStorage('contributions', []));
    setUsdRate(loadFromStorage('usd_rate', 5.0));
    setCurrencyMode(loadFromStorage('currency_mode', 'BOTH'));
    setDataLoaded(true);
  }, [loadFromStorage]);

  useEffect(() => { if(dataLoaded) saveToStorage('assets', assets); }, [assets, saveToStorage, dataLoaded]);
  useEffect(() => { if(dataLoaded) saveToStorage('earnings', earnings); }, [earnings, saveToStorage, dataLoaded]);
  useEffect(() => { if(dataLoaded) saveToStorage('classes', classes); }, [classes, saveToStorage, dataLoaded]);
  useEffect(() => { if(dataLoaded) saveToStorage('contributions', contributions); }, [contributions, saveToStorage, dataLoaded]);
  useEffect(() => { if(dataLoaded) saveToStorage('currency_mode', currencyMode); }, [currencyMode, saveToStorage, dataLoaded]);
  useEffect(() => { if(dataLoaded) saveToStorage('usd_rate', usdRate); }, [usdRate, saveToStorage, dataLoaded]);

  const autoUpdateLogic = useCallback(async (isManual = false) => {
    if (isSyncing || !dataLoaded || assets.length === 0) return;
    if (!isManual && isAIOnCooldown()) return;
    setIsSyncing(true);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const tickers = Array.from(new Set(assets.map(a => a.ticker).filter((t): t is string => !!t)));
    
    setSyncStatus("Navegando pela Web...");
    try {
      const pricePrompt = `Busque os preços de mercado mais recentes para: Dólar Comercial (USD/BRL) e os ativos: ${tickers.join(', ')}. Retorne um JSON estrito: {"prices": {"USD": number, "TICKER": number}}`;
      const priceRes: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: pricePrompt,
        config: { tools: [{ googleSearch: {} }] }
      });
      
      setLastGrounding(priceRes.candidates?.[0]?.groundingMetadata?.groundingChunks || []);
      const cleanJson = priceRes.text?.match(/\{[\s\S]*\}/)?.[0] || '{}';
      const priceData = JSON.parse(cleanJson);
      
      if (priceData.prices) {
        if (priceData.prices.USD) setUsdRate(priceData.prices.USD);
        setAssets(prev => prev.map(a => {
          const p = priceData.prices[a.ticker || ''];
          return p ? { ...a, currentPrice: p, lastUpdate: Date.now() } : a;
        }));
      }
    } catch (e: any) { 
      if (e.status === 429 || e.message?.includes('429')) setAICooldown();
    }

    const lastIdx = parseInt(localStorage.getItem('inv20_sync_idx') || '0');
    const currentIdx = lastIdx >= tickers.length ? 0 : lastIdx;
    const tickerToDeepScan = tickers[currentIdx];
    
    if (tickerToDeepScan) {
      setSyncStatus(`Auditando ${tickerToDeepScan}...`);
      try {
        const oldestPurchase = assets.filter(a => a.ticker === tickerToDeepScan).map(a => a.purchaseDate).sort()[0];
        const provPrompt = `Pesquise no Google todos os dividendos, JCP e rendimentos de ${tickerToDeepScan} desde ${oldestPurchase}. Retorne JSON: {"proventos": [{"data": "YYYY-MM-DD", "valor": number, "tipo": "Dividendo"}]}`;
        const provRes: GenerateContentResponse = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: provPrompt,
          config: { tools: [{ googleSearch: {} }] }
        });

        const cleanProvJson = provRes.text?.match(/\{[\s\S]*\}/)?.[0] || '{}';
        const provData = JSON.parse(cleanProvJson);
        if (provData.proventos) {
          const newEarns: Earning[] = [];
          provData.proventos.forEach((p: any) => {
            const isDupe = earnings.some(e => e.assetTicker === tickerToDeepScan && e.date === p.data && Math.abs((e.unitAmount || 0) - p.valor) < 0.0001);
            if (!isDupe) {
              const qtyAtDate = assets.filter(a => a.ticker === tickerToDeepScan && new Date(a.purchaseDate) <= new Date(p.data)).reduce((acc, curr) => acc + curr.quantity, 0);
              if (qtyAtDate > 0) {
                newEarns.push({
                  id: `auto-${tickerToDeepScan}-${Date.now()}-${Math.random().toString(36).substr(2,4)}`,
                  assetTicker: tickerToDeepScan, date: p.data, type: p.tipo || 'Dividendo',
                  receivedAmount: p.valor * qtyAtDate, reinvestedAmount: 0, withdrawnAmount: p.valor * qtyAtDate,
                  unitAmount: p.valor, quantityAtDate: qtyAtDate, isAutoGenerated: true
                });
              }
            }
          });
          if (newEarns.length > 0) setEarnings(prev => [...prev, ...newEarns]);
        }
        localStorage.setItem('inv20_sync_idx', (currentIdx + 1).toString());
      } catch (e: any) { if (e.status === 429 || e.message?.includes('429')) setAICooldown(); }
    }
    setSyncStatus(null);
    setIsSyncing(false);
  }, [assets, earnings, dataLoaded, isSyncing]);

  useEffect(() => {
    if (dataLoaded) {
      syncInterval.current = setInterval(() => autoUpdateLogic(false), 300000);
      autoUpdateLogic(true);
    }
    return () => clearInterval(syncInterval.current);
  }, [dataLoaded, autoUpdateLogic]);

  const summary = useMemo<PortfolioSummary>(() => {
    let currentWealth = 0, totalCostBasis = 0;
    assets.forEach(a => {
      currentWealth += (a.quantity * (a.currentPrice || 0));
      totalCostBasis += (a.quantity * (a.purchasePrice || 0));
    });
    const totalEarnings = earnings.reduce((acc, e) => acc + (e.receivedAmount || 0), 0);
    const totalReinvested = contributions.reduce((acc, c) => acc + (c.reinvestedAmount || 0), 0);
    const totalOutOfPocket = contributions.reduce((acc, c) => acc + (c.outOfPocketAmount || 0), 0);
    const withdrawnEarnings = totalEarnings - totalReinvested;
    const realProfitValue = (currentWealth + withdrawnEarnings) - totalOutOfPocket;
    const realProfitPct = totalOutOfPocket > 0 ? (realProfitValue / totalOutOfPocket) * 100 : 0;

    return { 
      totalWealth: currentWealth, totalInvested: totalOutOfPocket, totalReinvested, realProfitability: realProfitPct, 
      capitalGainPercent: totalCostBasis > 0 ? ((currentWealth - totalCostBasis) / totalCostBasis) * 100 : 0,
      earningsYieldPercent: totalCostBasis > 0 ? (totalEarnings / totalCostBasis) * 100 : 0,
      totalEarnings, reinvestedEarnings: totalReinvested, totalWithdrawn: withdrawnEarnings, notifications: []
    };
  }, [assets, earnings, contributions]);

  const handleAddAsset = (newA: Asset, reinvestedAmount: number = 0) => {
    setAssets(prev => {
      const u = [...prev];
      const idx = u.findIndex(a => a.ticker === newA.ticker);
      if (idx >= 0) {
        const existing = u[idx];
        const totalQty = existing.quantity + newA.quantity;
        const totalCost = (existing.quantity * existing.purchasePrice) + (newA.quantity * newA.purchasePrice);
        u[idx] = { ...existing, quantity: totalQty, purchasePrice: totalCost / totalQty, currentPrice: newA.currentPrice || existing.currentPrice };
        return u;
      }
      return [...prev, newA];
    });
    const totalAmount = newA.quantity * newA.purchasePrice;
    setContributions(prev => [...prev, {
      id: `cont-${Date.now()}`, date: new Date().toISOString(), totalAmount, outOfPocketAmount: Math.max(0, totalAmount - reinvestedAmount), reinvestedAmount,
      details: [{ assetId: newA.id, ticker: newA.ticker || '', quantity: newA.quantity, price: newA.purchasePrice }]
    }]);
  };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | undefined>(undefined);

  return (
    <HashRouter>
      <div className="min-h-screen bg-zinc-950 flex flex-col text-zinc-100">
        <header className="fixed top-0 left-0 right-0 h-16 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-800 flex items-center px-4 md:px-8 z-[100]">
          <button onClick={() => setIsMenuOpen(true)} className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl hover:text-yellow-500 mr-4 transition-all active:scale-90"><Menu size={24} /></button>
          <Link to="/" className="flex items-center gap-1.5"><Logo version={logoVersion} size={32} /><div className="flex items-center"><span className="text-xl font-black text-yellow-500 uppercase">INVESTIDOR</span><span className="text-xl font-light text-white ml-1">2.0</span></div></Link>
          <div className="ml-auto flex flex-col items-end gap-1">
             {syncStatus && <div className="flex items-center gap-2 px-3 py-1 bg-yellow-500/10 border border-yellow-500/20 rounded-full animate-pulse"><BrainCircuit size={10} className="text-yellow-500"/><span className="text-[8px] font-black text-yellow-500 uppercase tracking-widest">{syncStatus}</span></div>}
             <div className="flex items-center gap-2">
               <button onClick={() => setShowSettings(true)} className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl hover:text-yellow-500"><Settings size={20} /></button>
               <button onClick={() => { setEditingAsset(undefined); setIsModalOpen(true); }} className="p-2.5 bg-yellow-500 text-zinc-950 rounded-xl hover:scale-105 transition-all"><Plus size={20} /></button>
               <button onClick={() => autoUpdateLogic(true)} disabled={isSyncing} className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl hover:text-white transition-all"><RefreshCcw size={20} className={isSyncing ? 'animate-spin' : ''} /></button>
             </div>
          </div>
        </header>

        {isMenuOpen && (
          <div className="fixed inset-0 z-[200] flex justify-start">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setIsMenuOpen(false)} />
            <div className="relative w-80 bg-zinc-950 border-r border-zinc-800 h-full p-8 flex flex-col animate-in slide-in-from-left duration-300">
              <div className="flex items-center justify-between mb-10"><h2 className="text-xs font-black uppercase text-zinc-500 tracking-widest">Navegação Premium</h2><button onClick={() => setIsMenuOpen(false)} className="text-zinc-600 hover:text-white"><X size={24} /></button></div>
              <div className="flex flex-col gap-2">
                {[{ path: '/', label: 'Dashboard', icon: <PieChart size={20} /> }, { path: '/ativos', label: 'Gestão Ativos', icon: <Wallet size={20} /> }, { path: '/proventos', label: 'Proventos Web', icon: <HandCoins size={20} /> }, { path: '/rentabilidade', label: 'Performance', icon: <TrendingUp size={20} /> }, { path: '/aportes', label: 'Smart Aporte', icon: <Calculator size={20} /> }, { path: '/lancamentos', label: 'Lançamentos', icon: <LayoutGrid size={20} /> }].map(item => (
                  <Link key={item.path} to={item.path} onClick={() => setIsMenuOpen(false)} className="flex items-center gap-4 p-4 rounded-2xl bg-zinc-900/50 hover:bg-zinc-900 font-bold text-zinc-400 hover:text-white transition-all"><span className="text-yellow-500">{item.icon}</span> {item.label}</Link>
                ))}
              </div>
            </div>
          </div>
        )}

        <main className="flex-1 mt-16 p-4 md:p-8 max-w-7xl mx-auto w-full">
          <Routes>
            <Route path="/" element={<Dashboard summary={summary} assets={assets} usdRate={usdRate} currencyMode={currencyMode} onRefresh={() => autoUpdateLogic(true)} onAddClick={() => setIsModalOpen(true)} earnings={earnings} />} />
            <Route path="/ativos" element={<Ativos assets={assets} classes={classes} onEdit={(a) => { setEditingAsset(a); setIsModalOpen(true); }} onDelete={(id) => setAssets(prev => prev.filter(a => a.id !== id))} onAddClick={() => setIsModalOpen(true)} onAddClass={(n) => setClasses(prev => [...prev, { id: Math.random().toString(36).substr(2, 9), name: n, targetPercent: 0 }])} onDeleteClass={(id) => setClasses(prev => prev.filter(c => c.id !== id))} onUpdateClassTarget={(id, t) => setClasses(prev => prev.map(c => c.id === id ? { ...c, targetPercent: t } : c))} />} />
            <Route path="/proventos" element={<Proventos earnings={earnings} assets={assets} usdRate={usdRate} currencyMode={currencyMode} onAddEarning={(e) => setEarnings(prev => Array.isArray(e) ? [...prev, ...e] : [...prev, e])} onDeleteEarning={(id) => setEarnings(prev => prev.filter(e => e.id !== id))} />} />
            <Route path="/rentabilidade" element={<Rentabilidade summary={summary} assets={assets} usdRate={usdRate} currencyMode={currencyMode} />} />
            <Route path="/aportes" element={<Aportes assets={assets} classes={classes} onApplyAporte={(c) => { 
              setContributions(prev => [...prev, c]);
              setAssets(prev => prev.map(asset => {
                const detail = c.details.find(d => d.assetId === asset.id);
                if (detail) {
                  const q = asset.quantity + detail.quantity;
                  const cost = (asset.quantity * asset.purchasePrice) + (detail.quantity * detail.price);
                  return { ...asset, quantity: q, purchasePrice: cost / q, lastUpdate: Date.now() };
                }
                return asset;
              }));
            }} />} />
            <Route path="/lancamentos" element={<Lancamentos contributions={contributions} classes={classes} onAddAsset={handleAddAsset} onDeleteContribution={(id) => setContributions(prev => prev.filter(c => c.id !== id))} />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
          <div className="fixed bottom-4 left-4"><SourceList chunks={lastGrounding} /></div>
        </main>

        {showSettings && (
          <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl">
              <div className="p-8 border-b border-zinc-800 flex justify-between items-center"><h2 className="text-xl font-black uppercase text-white">Configurações</h2><button onClick={() => setShowSettings(false)} className="text-zinc-500 hover:text-white transition-colors"><X size={24} /></button></div>
              <div className="p-10 space-y-8">
                <button onClick={() => { setLogoVersion(v => v+1); setShowSettings(false); }} className="w-full bg-zinc-950 p-5 rounded-2xl border border-zinc-800 text-[10px] font-black uppercase tracking-widest hover:border-yellow-500 transition-all">Regerar Logo (IA)</button>
                <div className="grid grid-cols-2 gap-4">
                  <button onClick={exportData} className="bg-zinc-950 p-5 rounded-2xl border border-zinc-800 text-[10px] font-black uppercase tracking-widest hover:border-emerald-500 transition-all flex items-center justify-center gap-2"><Download size={14} /> Exportar .json</button>
                  <button onClick={() => fileInputRef.current?.click()} className="bg-zinc-950 p-5 rounded-2xl border border-zinc-800 text-[10px] font-black uppercase tracking-widest hover:border-blue-500 transition-all flex items-center justify-center gap-2"><Upload size={14} /> Importar .json</button>
                  <input type="file" ref={fileInputRef} onChange={importData} accept=".json" className="hidden" />
                </div>
                <button onClick={resetAllData} className="w-full bg-red-900/10 border border-red-500/20 text-red-500 font-black py-4 rounded-2xl uppercase tracking-widest text-[10px] hover:bg-red-500/20 transition-all">Excluir Base de Dados</button>
              </div>
            </div>
          </div>
        )}

        {isModalOpen && (
          <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md">
            <div className="bg-zinc-900 border border-zinc-800 rounded-[3rem] w-full max-w-md overflow-hidden border-yellow-500/20 shadow-2xl">
              <div className="p-8 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50"><h2 className="text-xl font-black uppercase text-white tracking-tight">{editingAsset ? 'Editar Ativo' : 'Novo Lançamento'}</h2><button onClick={() => { setIsModalOpen(false); setEditingAsset(undefined); }} className="text-zinc-500 hover:text-white transition-colors"><X size={24} /></button></div>
              <AddAssetForm onAdd={(newA, reinvested) => { handleAddAsset(newA, reinvested); setIsModalOpen(false); setEditingAsset(undefined); }} onCancel={() => { setIsModalOpen(false); setEditingAsset(undefined); }} classes={classes} initialData={editingAsset} />
            </div>
          </div>
        )}
      </div>
    </HashRouter>
  );
};

export default App;

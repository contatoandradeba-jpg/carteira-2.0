
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Asset, AssetType, AssetClass } from '../types.ts';
import { Sparkles, Edit2, RefreshCcw, Search, Check, ChevronDown, Coins, Calendar, Wallet, ShoppingCart, CheckCircle2, TrendingUp, AlertTriangle, Info, ExternalLink, Target, HandCoins } from 'lucide-react';
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

interface AddAssetFormProps {
  onAdd: (asset: Asset, reinvestedAmount: number) => void;
  onCancel: () => void;
  classes: AssetClass[];
  initialData?: Asset;
}

const SEARCH_CACHE_KEY = 'inv20_ticker_search_cache';

export default function AddAssetForm({ onAdd, onCancel, classes, initialData }: AddAssetFormProps) {
  const [name, setName] = useState(initialData?.name || '');
  const [ticker, setTicker] = useState(initialData?.ticker || '');
  const [type, setType] = useState<AssetType>(initialData?.type || AssetType.STOCK);
  const [classId, setClassId] = useState(initialData?.classId || (classes[0]?.id || ''));
  const [quantity, setQuantity] = useState(initialData?.quantity?.toString() || '');
  const [purchaseDate, setPurchaseDate] = useState(initialData?.purchaseDate || new Date().toISOString().split('T')[0]);
  const [purchasePrice, setPurchasePrice] = useState(initialData?.purchasePrice?.toString() || '');
  const [currentPrice, setCurrentPrice] = useState(initialData?.currentPrice?.toString() || '');
  const [isManualPrice, setIsManualPrice] = useState(initialData?.isManualPrice || false);
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [targetPercent, setTargetPercent] = useState(initialData?.targetPercent?.toString() || '0');
  const [reinvestedAmount, setReinvestedAmount] = useState('0');
  const [showReinvestInput, setShowReinvestInput] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [suggestion, setSuggestion] = useState<any | null>(null);
  const searchTimeout = useRef<any>(null);

  const getTickerCache = () => {
    try { return JSON.parse(localStorage.getItem(SEARCH_CACHE_KEY) || '{}'); } catch { return {}; }
  };

  const saveToTickerCache = (t: string, data: any) => {
    const cache = getTickerCache();
    cache[t] = { data, timestamp: Date.now() };
    localStorage.setItem(SEARCH_CACHE_KEY, JSON.stringify(cache));
  };

  const isAIOnCooldown = () => {
    const lastError = localStorage.getItem('inv20_ai_cooldown');
    if (!lastError) return false;
    return (Date.now() - parseInt(lastError)) < 600000;
  };

  const searchTickerInfo = async (query: string, retries = 1) => {
    if (query.length < 2) return;
    const cleanQuery = query.toUpperCase();
    
    const cache = getTickerCache();
    if (cache[cleanQuery] && (Date.now() - cache[cleanQuery].timestamp < 86400000)) {
      setSuggestion(cache[cleanQuery].data);
      return;
    }

    if (isAIOnCooldown()) return;

    setIsSearching(true);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
      const prompt = `Ativo "${cleanQuery}". Retorne JSON: {"nome": "string", "tipo": "string", "preco": number}`;
      const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { temperature: 0.1 }
      });
      const cleanJson = response.text?.match(/\{[\s\S]*\}/)?.[0] || '{}';
      const data = JSON.parse(cleanJson);
      if (data.nome || data.preco) {
        const sugg = { name: data.nome || cleanQuery, type: data.tipo || 'Ações', price: data.preco || null };
        setSuggestion(sugg);
        saveToTickerCache(cleanQuery, sugg);
      }
    } catch (e: any) { 
      if (e.status === 429 || e.message?.includes('429')) localStorage.setItem('inv20_ai_cooldown', Date.now().toString());
      setIsManualPrice(true);
    } finally { setIsSearching(false); }
  };

  const handleTickerChange = (val: string) => {
    const clean = val.toUpperCase().trim();
    setTicker(clean);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (clean.length >= 2) searchTimeout.current = setTimeout(() => searchTickerInfo(clean), 2000);
    else setSuggestion(null);
  };

  const applySuggestion = () => {
    if (suggestion) {
      setName(suggestion.name);
      const typeMap: any = { 'Ações': AssetType.STOCK, 'Fundos Imobiliários': AssetType.FII, 'ETFs': AssetType.ETF, 'Renda Fixa': AssetType.FIXED, 'Criptomoedas': AssetType.CRYPTO };
      setType(typeMap[suggestion.type] || AssetType.OTHERS);
      if (suggestion.price) { setCurrentPrice(suggestion.price.toString()); setIsManualPrice(false); }
      const matchingClass = classes.find(c => c.name.toLowerCase().includes(suggestion.type.toLowerCase()));
      if (matchingClass) setClassId(matchingClass.id);
      setSuggestion(null);
    }
  };

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      onAdd({ id: initialData?.id || Math.random().toString(36).substr(2, 9), name: name.trim() || ticker, ticker, type, classId, quantity: parseFloat(quantity) || 0, purchaseDate, purchasePrice: parseFloat(purchasePrice) || 0, currentPrice: parseFloat(currentPrice) || parseFloat(purchasePrice), isManualPrice, lastUpdate: Date.now(), notes, targetPercent: parseFloat(targetPercent) || 0 }, parseFloat(reinvestedAmount) || 0);
    }} className="p-10 space-y-8 max-h-[85vh] overflow-y-auto custom-scrollbar bg-zinc-950">
      <div className="space-y-4">
        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2"><Search size={12} className="text-yellow-500" /> Ativo</label>
        <div className="relative">
          <input required placeholder="TICKER..." className="w-full bg-zinc-900 border-2 border-zinc-800 rounded-3xl p-6 text-3xl font-black uppercase text-white outline-none focus:border-yellow-500/50 transition-all" value={ticker} onChange={e => handleTickerChange(e.target.value)} />
          {isSearching && <div className="absolute right-6 top-1/2 -translate-y-1/2"><RefreshCcw size={28} className="animate-spin text-yellow-500" /></div>}
        </div>
        {suggestion && <button type="button" onClick={applySuggestion} className="w-full p-6 bg-zinc-900 border-2 border-yellow-500/30 rounded-[2rem] flex items-center justify-between group hover:border-yellow-500 transition-all"><div className="flex flex-col items-start gap-1"><span className="text-[9px] font-black text-yellow-500 uppercase tracking-widest">Sugestão Detectada</span><span className="text-sm font-bold text-white leading-tight">{suggestion.name} {suggestion.price ? `(R$ ${suggestion.price})` : ''}</span></div><div className="p-2 bg-yellow-500 rounded-full text-zinc-950 shadow-lg"><Check size={18} strokeWidth={3} /></div></button>}
      </div>
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-2"><label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2"><ShoppingCart size={12} /> Quantidade</label><input required type="number" step="any" className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-5 text-white font-black text-xl outline-none" value={quantity} onChange={e => setQuantity(e.target.value)} /></div>
        <div className="space-y-2"><label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2"><Coins size={12} /> Preço Unit.</label><input required type="number" step="any" className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-5 text-white font-black text-xl outline-none" value={purchasePrice} onChange={e => setPurchasePrice(e.target.value)} /></div>
      </div>
      <div className="p-6 bg-zinc-900/50 border border-zinc-800 rounded-[2rem] space-y-6">
        <div className="flex items-center justify-between"><div className="flex items-center gap-2 text-yellow-500"><HandCoins size={18} /><h3 className="text-[10px] font-black uppercase tracking-widest">Origem</h3></div><button type="button" onClick={() => setShowReinvestInput(!showReinvestInput)} className={`px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest transition-all ${showReinvestInput ? 'bg-yellow-500 text-zinc-950' : 'bg-zinc-800 text-zinc-500'}`}>{showReinvestInput ? 'Usando Proventos' : 'Usar Proventos?'}</button></div>
        {showReinvestInput && <div className="space-y-4 animate-in fade-in"><div className="space-y-2"><label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Valor do Reinvestimento</label><input type="number" step="any" className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-white font-black text-lg outline-none" value={reinvestedAmount} onChange={e => setReinvestedAmount(e.target.value)} /></div></div>}
      </div>
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-2"><label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Data</label><input required type="date" className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-5 text-white font-black outline-none" value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)} /></div>
        <div className="space-y-2"><label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Alvo (%)</label><input type="number" step="any" className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-5 text-white font-black text-xl outline-none" value={targetPercent} onChange={e => setTargetPercent(e.target.value)} /></div>
      </div>
      <button type="submit" className="w-full gold-gradient text-zinc-950 font-black py-6 rounded-[2rem] shadow-2xl hover:scale-[1.02] active:scale-95 transition-all uppercase tracking-widest text-sm flex items-center justify-center gap-3 border-b-4 border-yellow-700"><CheckCircle2 size={24} /> Confirmar Lançamento</button>
      <button type="button" onClick={onCancel} className="w-full py-2 text-zinc-700 hover:text-white font-black transition-all text-[11px] uppercase tracking-widest">Cancelar</button>
    </form>
  );
}

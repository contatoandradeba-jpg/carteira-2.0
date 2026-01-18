
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, PieChart as PieChartIcon } from 'lucide-react';
import { Asset } from '../types.ts';

interface AlocacaoProps {
  assets: Asset[];
}

const Alocacao: React.FC<AlocacaoProps> = ({ assets }) => {
  const navigate = useNavigate();
  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(val);
  };
  const total = assets.reduce((acc, a) => acc + (a.quantity * a.currentPrice), 0);
  const byType = assets.reduce((acc, a) => {
    acc[a.type] = (acc[a.type] || 0) + (a.quantity * a.currentPrice);
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/')} className="p-2 hover:bg-zinc-900 rounded-full transition-colors">
          <ArrowLeft />
        </button>
        <h1 className="text-2xl font-bold">Alocação da Carteira</h1>
      </div>
      {assets.length === 0 ? (
        <div className="dark-card rounded-2xl p-24 text-center space-y-4">
          <PieChartIcon size={64} className="text-zinc-800 mx-auto" />
          <p className="text-zinc-400">Nenhum dado de alocação disponível.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="dark-card p-8 rounded-3xl space-y-6">
            <h2 className="font-bold text-xl">Por Tipo de Ativo</h2>
            <div className="space-y-6">
              {(Object.entries(byType) as [string, number][]).sort((a, b) => b[1] - a[1]).map(([type, value]) => {
                const weight = total > 0 ? (value / total) * 100 : 0;
                return (
                  <div key={type} className="space-y-2">
                    <div className="flex justify-between items-end">
                      <span className="font-bold text-white">{type}</span>
                      <span className="text-yellow-500 font-bold">{weight.toFixed(1)}%</span>
                    </div>
                    <div className="w-full h-3 bg-zinc-900 rounded-full overflow-hidden">
                      <div className="h-full gold-gradient rounded-full" style={{ width: `${weight}%` }}></div>
                    </div>
                    <div className="text-right">
                      <span className="text-zinc-600 text-xs">{formatBRL(value)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="dark-card p-8 rounded-3xl space-y-6">
            <h2 className="font-bold text-xl">Top 5 Ativos</h2>
            <div className="space-y-6">
              {[...assets].sort((a, b) => (b.quantity * b.currentPrice) - (a.quantity * a.currentPrice)).slice(0, 5).map(a => {
                const weight = total > 0 ? (a.quantity * a.currentPrice / total) * 100 : 0;
                return (
                  <div key={a.id} className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-zinc-900 rounded-xl flex items-center justify-center font-bold text-yellow-500">
                      {a.ticker?.substring(0, 2) || 'AT'}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex justify-between">
                        <span className="font-bold">{a.ticker}</span>
                        <span className="text-sm font-medium">{weight.toFixed(1)}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                        <div className="h-full bg-zinc-700" style={{ width: `${weight}%` }}></div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Alocacao;

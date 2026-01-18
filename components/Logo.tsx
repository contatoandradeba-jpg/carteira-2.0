import React from 'react';
import { BrainCircuit } from 'lucide-react';

const Logo: React.FC = () => {
  return (
    <div className="flex flex-col items-start gap-1">
      {/* Ícone e texto pequeno */}
      <div className="flex items-center gap-2 text-yellow-500 font-black uppercase text-[10px] tracking-widest mb-1">
        <BrainCircuit size={16} /> Inteligência de Performance
      </div>

      {/* Título fixo do app */}
      <h1 className="text-3xl md:text-4xl font-black text-white tracking-tighter">
        CARTEIRA 2.0
      </h1>

      {/* Subtítulo fixo */}
      <p className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-600">
        Patrimônio Consolidado CARTEIRA 2.0
      </p>
    </div>
  );
};

export default Logo;

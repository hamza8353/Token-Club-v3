import React from 'react';
import { Zap } from 'lucide-react';

interface PrimaryButtonProps {
  text: string;
  cost?: string;
  color?: "red" | "teal" | "blue";
  onClick?: () => void;
  disabled?: boolean;
}

export const PrimaryButton = React.memo(({ text, cost, color = "teal", onClick, disabled }: PrimaryButtonProps) => {
  const styles = { 
    red: 'bg-red-500 hover:shadow-[0_0_30px_rgba(239,68,68,0.4)]', 
    teal: 'bg-teal-500 hover:shadow-[0_0_30px_rgba(20,184,166,0.4)]', 
    blue: 'bg-blue-600 hover:shadow-[0_0_30px_rgba(37,99,235,0.4)]' 
  };
  const bg = styles[color] || styles.teal;
  return (
    <button 
      onClick={onClick}
      disabled={disabled}
      className={`w-full py-4 rounded-xl text-black font-bold text-base tracking-wide ${bg} hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 shadow-lg relative overflow-hidden border border-white/10 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100`}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] animate-[shimmer_2s_infinite]" />
      <Zap className="w-5 h-5 fill-current relative z-10" /><span className="relative z-10">{text}</span>{cost && <span className="opacity-80 text-xs ml-1 border-l border-black/20 pl-2 font-mono relative z-10">({cost})</span>}
    </button>
  );
});
PrimaryButton.displayName = 'PrimaryButton';


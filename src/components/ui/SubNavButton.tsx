import React from 'react';
import { LucideIcon } from 'lucide-react';

export const SubNavButton = React.memo(({ active, onClick, icon: Icon, title, desc }: { active: boolean, onClick: () => void, icon: LucideIcon, title: string, desc: string }) => (
  <button onClick={onClick} className={`w-full text-left p-3 rounded-xl border transition-all flex items-center gap-3 group ${active ? 'bg-blue-500/10 border-blue-500/40' : 'bg-[#121212] border-white/5 hover:bg-white/5 hover:border-white/10'}`}>
    <div className={`p-2 rounded-lg ${active ? 'bg-blue-500/20 text-blue-400' : 'bg-white/5 text-gray-500'}`}>
      <Icon className="w-5 h-5" />
    </div>
    <div>
      <div className={`text-sm font-bold ${active ? 'text-blue-400' : 'text-gray-300 group-hover:text-white'}`}>{title}</div>
      <div className="text-[10px] text-gray-600">{desc}</div>
    </div>
  </button>
));
SubNavButton.displayName = 'SubNavButton';


import React from 'react';
import { LucideIcon } from 'lucide-react';

type TabId = 'create' | 'swap' | 'liquidity' | 'management' | 'remove' | 'portfolio' | 'more';

interface NavItemProps {
  id: TabId;
  icon: LucideIcon;
  label: string;
  active: TabId;
  set: (id: TabId) => void;
}

export const NavItem: React.FC<NavItemProps> = React.memo(({ id, icon: Icon, label, active, set }) => {
  const isActive = active === id;
  return (
    <button onClick={() => set(id)} className={`w-full h-12 flex items-center gap-4 px-4 rounded-xl transition-colors duration-300 group ${isActive ? 'bg-teal-500/10 border border-teal-500/20' : 'border border-transparent hover:bg-white/5'}`}>
      <Icon className={`w-5 h-5 ${isActive ? 'text-teal-400' : 'text-gray-500 group-hover:text-white'}`} />
      <span className={`text-sm font-bold tracking-wide ${isActive ? 'text-white' : 'text-gray-500 group-hover:text-white'}`}>{label}</span>
      {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-teal-400 shadow-[0_0_8px_#2dd4bf]" />}
    </button>
  );
});
NavItem.displayName = 'NavItem';


import React from 'react';
import { 
  Rocket, 
  Droplets, 
  Flame, 
  Wallet, 
  ArrowLeftRight,
  LayoutGrid,
} from 'lucide-react';

type TabId = 'create' | 'swap' | 'liquidity' | 'management' | 'remove' | 'portfolio' | 'more';

interface MobileBottomNavProps {
  activeTab: TabId;
  setActiveTab: (id: TabId) => void;
}

const navItems = [
  { id: 'create' as TabId, icon: Rocket, label: 'Create' },
  { id: 'swap' as TabId, icon: ArrowLeftRight, label: 'Swap' },
  { id: 'liquidity' as TabId, icon: Droplets, label: 'Liquidity' },
  { id: 'management' as TabId, icon: Flame, label: 'Security' },
  { id: 'portfolio' as TabId, icon: Wallet, label: 'Portfolio' },
  { id: 'more' as TabId, icon: LayoutGrid, label: 'More' },
];

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ activeTab, setActiveTab }) => {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0A0C0E]/95 backdrop-blur-2xl border-t border-white/10 shadow-[0_-4px_20px_rgba(0,0,0,0.5)] safe-area-inset-bottom">
      <div className="flex items-center justify-around px-1 py-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`
                flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl
                transition-all duration-200 relative min-w-[60px]
                ${isActive 
                  ? 'text-teal-400' 
                  : 'text-gray-500 active:text-teal-400'
                }
              `}
            >
              {isActive && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-teal-400 rounded-b-full shadow-[0_0_8px_#2dd4bf]" />
              )}
              <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110' : ''}`} />
              <span className={`text-[10px] font-bold uppercase tracking-wider ${isActive ? 'text-teal-400' : 'text-gray-500'}`}>
                {item.label}
              </span>
              {isActive && (
                <div className="absolute inset-0 bg-teal-500/5 rounded-xl border border-teal-500/20 pointer-events-none" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};


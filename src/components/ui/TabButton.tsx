import React from 'react';

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  label: string;
  shortLabel?: string;
  danger?: boolean;
}

export const TabButton = React.memo(({ active, onClick, label, shortLabel, danger }: TabButtonProps) => (
  <button 
    onClick={onClick} 
    className={`
      flex-1 md:flex-none min-w-0 px-2.5 sm:px-3 md:px-6 py-2 rounded-lg text-[10px] sm:text-xs md:text-sm font-bold transition-all whitespace-nowrap
      ${active 
        ? danger 
          ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' 
          : 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' 
        : danger 
          ? 'text-red-400 hover:bg-red-500/10 border border-red-500/20' 
          : 'text-gray-400 hover:text-white'
      }
    `}
  >
    <span className="hidden sm:inline">{label}</span>
    <span className="sm:hidden">{shortLabel || label}</span>
  </button>
));
TabButton.displayName = 'TabButton';


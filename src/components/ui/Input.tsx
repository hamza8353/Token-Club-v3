import React from 'react';
import { LucideIcon } from 'lucide-react';

interface InputProps {
  label?: string;
  placeholder: string;
  type?: string;
  icon?: LucideIcon;
  defaultValue?: string | number;
  value?: string | number;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const Input: React.FC<InputProps> = React.memo(({ label, placeholder, type = "text", icon: Icon, defaultValue, value, onChange }) => {
  return (
    <div className="space-y-1.5 relative group">
      {label && (
        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider ml-1 group-focus-within:text-blue-400 transition-colors">{label}</label>
      )}
      <div className="relative">
        <input 
          type={type} 
          defaultValue={defaultValue}
          value={value}
          onChange={onChange}
          className="w-full bg-[#121212] border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white placeholder-gray-700 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all shadow-inner" 
          placeholder={placeholder} 
        />
        {Icon && <Icon className="absolute right-4 top-3.5 w-4 h-4 text-gray-600 group-focus-within:text-blue-500 transition-colors" />}
      </div>
    </div>
  );
});
Input.displayName = 'Input';


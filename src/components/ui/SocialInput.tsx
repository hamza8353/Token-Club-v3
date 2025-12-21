import React from 'react';
import { LucideIcon } from 'lucide-react';

interface SocialInputProps {
  icon: LucideIcon;
  placeholder: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const SocialInput: React.FC<SocialInputProps> = React.memo(({ icon: Icon, placeholder, value, onChange }) => (
  <div className="relative group">
    <div className="absolute left-3 top-3 text-gray-600 group-focus-within:text-blue-500 transition-colors">
      <Icon className="w-4 h-4" />
    </div>
    <input 
      className="w-full bg-[#121212] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-700 focus:outline-none focus:border-blue-500/50 transition-all shadow-inner" 
      placeholder={placeholder}
      value={value}
      onChange={onChange}
    />
  </div>
));
SocialInput.displayName = 'SocialInput';


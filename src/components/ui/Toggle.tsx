import React, { useState } from 'react';

interface ToggleProps {
  title: string;
  desc: string;
  value?: boolean;
  onChange?: (value: boolean) => void;
}

export const Toggle = React.memo(({ title, desc, value, onChange }: ToggleProps) => {
  const [isOn, setIsOn] = useState(value || false);

  React.useEffect(() => {
    if (value !== undefined) {
      setIsOn(value);
    }
  }, [value]);

  const handleClick = () => {
    const newValue = !isOn;
    setIsOn(newValue);
    onChange?.(newValue);
  };

  return (
    <div 
      onClick={handleClick} 
      className={`cursor-pointer p-4 rounded-xl border transition-all duration-300 flex items-center justify-between group ${isOn ? 'bg-teal-500/10 border-teal-500/40' : 'bg-[#121212] border-white/10 hover:border-white/20'}`}
    >
      <div>
        <div className={`text-sm font-bold transition-colors ${isOn ? 'text-teal-400' : 'text-gray-300'}`}>{title}</div>
        <div className="text-[10px] text-gray-600 mt-0.5">{desc}</div>
      </div>
      <div className={`w-10 h-5 rounded-full relative transition-colors duration-300 ${isOn ? 'bg-teal-500' : 'bg-white/10'}`}>
        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-300 ${isOn ? 'left-[22px]' : 'left-0.5'}`} />
      </div>
    </div>
  );
});
Toggle.displayName = 'Toggle';


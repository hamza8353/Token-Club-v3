import React, { useState } from 'react';

interface SliderProps {
  label: string;
  danger?: boolean;
  value?: number;
  onChange?: (value: number) => void;
}

export const Slider = React.memo(({ label, danger, value, onChange }: SliderProps) => {
  const [val, setVal] = useState(value || 50);

  React.useEffect(() => {
    if (value !== undefined) {
      setVal(value);
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = Number(e.target.value);
    setVal(newVal);
    onChange?.(newVal);
  };

  const colorClass = danger ? 'accent-red-500' : 'accent-blue-500';
  const textClass = danger ? 'text-red-400' : 'text-blue-400';
  return (
    <div className="space-y-3">
      <div className="flex justify-between">
        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{label}</label>
        <span className={`text-xs font-mono font-bold ${textClass}`}>{val}%</span>
      </div>
      <input 
        type="range" 
        min="0" 
        max="100" 
        value={val} 
        onChange={handleChange} 
        className={`w-full h-2 bg-white/5 rounded-lg appearance-none cursor-pointer ${colorClass}`} 
      />
    </div>
  );
});
Slider.displayName = 'Slider';


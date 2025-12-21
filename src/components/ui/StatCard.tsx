import React from 'react';

export const StatCard = React.memo(({ label, value }: { label: string, value: string }) => (
  <div className="bg-[#0f0f0f]/60 border border-white/10 p-6 rounded-2xl spotlight-card">
    <div className="text-xs text-gray-500 uppercase tracking-widest mb-1">{label}</div>
    <div className="text-2xl font-bold text-white">{value}</div>
  </div>
));
StatCard.displayName = 'StatCard';


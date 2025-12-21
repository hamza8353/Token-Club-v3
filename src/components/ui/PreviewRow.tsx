import React from 'react';

export const PreviewRow = React.memo(({ label, value, active }: { label: string, value: string, active?: boolean }) => (
  <div className="flex justify-between items-center text-sm border-b border-white/5 pb-2 last:border-0 last:pb-0">
    <span className="text-gray-500">{label}</span>
    <span className={`font-mono ${active ? 'text-teal-400 font-bold' : 'text-white'}`}>{value}</span>
  </div>
));
PreviewRow.displayName = 'PreviewRow';


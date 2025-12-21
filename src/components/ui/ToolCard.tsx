import React from 'react';
import { ArrowRight } from 'lucide-react';

export const ToolCard = React.memo(({ title, desc }: { title: string, desc: string }) => (
  <div className="bg-[#0f0f0f]/60 border border-white/10 p-6 rounded-2xl hover:border-blue-500/30 transition-all cursor-pointer group spotlight-card">
    <div className="flex items-center justify-between mb-2">
      <h4 className="font-bold text-white group-hover:text-blue-400 transition-colors">{title}</h4>
      <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-blue-400 -rotate-45 transition-transform" />
    </div>
    <p className="text-sm text-gray-500">{desc}</p>
  </div>
));
ToolCard.displayName = 'ToolCard';


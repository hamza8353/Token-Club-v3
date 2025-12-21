import React from 'react';

export const Section = React.memo(({ title, desc }: { title: string, desc: string }) => (
  <div className="mb-4">
    <h3 className="text-lg font-bold text-white flex items-center gap-2">
      {title}
      <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
    </h3>
    <p className="text-xs text-gray-500">{desc}</p>
  </div>
));
Section.displayName = 'Section';


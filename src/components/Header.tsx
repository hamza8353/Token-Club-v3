import React from 'react';

type TabId = 'create' | 'swap' | 'liquidity' | 'management' | 'remove' | 'portfolio' | 'more';

export const Header = React.memo(({ activeTab }: { activeTab: TabId }) => {
  const content: Record<TabId, { h1: string; p: string }> = {
    create: { h1: "Solana Token Creator", p: "Mint fully compliant SPL tokens on Solana with zero coding." },
    swap: { h1: "TokenClub Swap", p: "Best price routing across all Solana DEXs." },
    liquidity: { h1: "Liquidity Manager", p: "Initialize markets, add depth, or withdraw assets." },
    management: { h1: "Security & Burn", p: "Manage asset supply, lock liquidity, and ensure project safety." },
    remove: { h1: "Remove Liquidity", p: "Withdraw your assets from liquidity pools securely." },
    portfolio: { h1: "My Portfolio", p: "Track your created tokens and LP positions." },
    more: { h1: "Advanced Tools", p: "Multisender, Snapshots, and Metadata updates." },
  };
  const { h1, p } = content[activeTab];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h1 className="text-2xl md:text-4xl lg:text-5xl font-bold text-white tracking-tight mb-2">{h1}</h1>
      <p className="text-blue-200/60 text-sm md:text-lg">{p}</p>
      {activeTab === 'liquidity' && (
        <p className="text-gray-400/60 text-xs md:text-sm mt-2">POWERED BY METEORA</p>
      )}
    </div>
  );
});
Header.displayName = 'Header';


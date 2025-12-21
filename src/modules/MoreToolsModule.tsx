import React from 'react';
import { BarChart3, Megaphone, Sparkles } from 'lucide-react';
import { PrimaryButton } from '../components/ui/PrimaryButton';

const toolBlocks = [
  {
    key: 'volume-engine',
    title: 'Volume Engine',
    description: 'Automated volume orchestration to keep liquidity active and routes healthy.',
    icon: BarChart3,
    status: 'live',
    actionLabel: 'Open Volume Engine',
    href: 'https://bot.tokenclub.fun',
    highlights: ['Live routing monitor', 'Automated upkeep']
  },
  {
    key: 'promotion-suite',
    title: 'Promotion Suite',
    description: 'Promote your meme coin on CoinFace with partner pushes, influencer drops, and ad packs tuned for Solana launches.',
    icon: Megaphone,
    status: 'live',
    actionLabel: 'Launch Promo Hub',
    href: 'https://coinface.fun',
    highlights: ['Partner roster', 'Performance snapshots']
  },
  {
    key: 'pumpfeed',
    title: 'Pumpfeed',
    description: 'Stay updated with the latest token launches and market insights.',
    icon: Sparkles,
    status: 'soon',
    highlights: ['Real-time updates', 'Market analytics']
  }
];

const MoreToolsModule = React.memo(() => {
  return (
    <div className="max-w-6xl animate-in slide-in-from-right-8 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {toolBlocks.map((tool) => {
          const Icon = tool.icon || Sparkles;
          const isSoon = tool.status === 'soon';
          
          return (
            <div
              key={tool.key}
              className="relative flex min-h-[280px] flex-col rounded-[28px] border border-white/10 bg-gradient-to-br from-[#060e18] via-[#050912] to-[#04070d] p-6 shadow-[0_20px_60px_rgba(1,6,18,0.7)] hover:border-blue-500/30 transition-all"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/5 text-white">
                    <Icon className="h-5 w-5" />
                  </div>
                  {tool.status === 'live' && (
                    <span className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-300/80">
                      LIVE
                    </span>
                  )}
                </div>
                {isSoon && (
                  <span className="rounded-full border border-yellow-400/40 bg-yellow-500/10 px-3 py-1 text-xs font-semibold text-yellow-200">
                    Coming soon
                  </span>
                )}
              </div>

              <div className="flex-1 space-y-3">
                <h3 className="text-xl font-semibold text-white">{tool.title}</h3>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {tool.description}
                </p>
                <ul className="mt-3 space-y-2 text-sm text-slate-400">
                  {tool.highlights?.map((highlight) => (
                    <li key={highlight} className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                      {highlight}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-6">
                {isSoon ? (
                  <div className="flex h-11 items-center justify-center rounded-2xl border border-white/10 text-sm text-gray-500 bg-white/5">
                    <Sparkles className="mr-2 h-4 w-4 text-yellow-200" />
                    In development
                  </div>
                ) : (
                  <PrimaryButton
                    text={tool.actionLabel || 'Open'}
                    onClick={() => {
                      if (tool.href) {
                        window.open(tool.href, '_blank', 'noopener,noreferrer');
                      }
                    }}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

MoreToolsModule.displayName = 'MoreToolsModule';

export default MoreToolsModule;

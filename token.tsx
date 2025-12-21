import React, { useState, useRef, useEffect } from 'react';
import { 
  Rocket, 
  Droplets, 
  Flame, 
  Trash2, 
  Lock, 
  Wallet, 
  Plus, 
  Globe, 
  Twitter, 
  Send,
  Search,
  Zap,
  CheckCircle2,
  UploadCloud,
  ArrowRight,
  X,
  ChevronRight,
  ShieldCheck,
  RefreshCw,
  Coins,
  AlertTriangle,
  Menu,
  ArrowLeftRight,
  Settings,
  ChevronDown,
  ArrowDown,
  LayoutGrid,
  PieChart,
  LucideIcon
} from 'lucide-react';

type TabId = 'create' | 'swap' | 'liquidity' | 'management' | 'remove' | 'portfolio' | 'more';

const TokenclubComplete: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('create');
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  
  // --- CURSOR SPOTLIGHT LOGIC ---
  const containerRef = useRef<HTMLDivElement>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setMousePosition({ x, y });
    
    containerRef.current.style.setProperty('--mouse-x', `${x}px`);
    containerRef.current.style.setProperty('--mouse-y', `${y}px`);
  };

  return (
    <div 
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="min-h-screen w-full bg-[#030406] text-white font-sans selection:bg-cyan-500/30 overflow-hidden relative flex flex-col md:flex-row group/app"
    >
      
      {/* --- 1. AMBIENT ENVIRONMENT (Teal + Blue Glows) --- */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        
        {/* LEFT: Deep Teal Glow */}
        <div className="absolute top-[-10%] left-[-10%] w-[60vw] h-[60vh] bg-teal-600/10 blur-[150px] rounded-full mix-blend-screen opacity-60" />
        
        {/* RIGHT: "Club" Blue Glow (Behind Content) */}
        <div className="absolute top-[20%] right-[10%] w-[50vw] h-[70vh] bg-blue-600/15 blur-[120px] rounded-full mix-blend-screen opacity-80" />
        
        {/* BOTTOM: Deep Indigo Base */}
        <div className="absolute bottom-[-20%] left-[20%] w-[60vw] h-[50vh] bg-indigo-900/20 blur-[150px] rounded-full mix-blend-screen" />

        {/* Noise Texture */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.04]" />
        
        {/* Interactive Grid */}
        <div 
          className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:60px_60px]"
          style={{
            maskImage: `radial-gradient(600px circle at ${mousePosition.x}px ${mousePosition.y}px, black, transparent)`,
            WebkitMaskImage: `radial-gradient(600px circle at ${mousePosition.x}px ${mousePosition.y}px, black, transparent)`,
          }}
        />
      </div>

      {/* --- 2. SIDEBAR DOCK (Rigid Layout) --- */}
      <aside className="hidden md:flex flex-col w-72 h-screen p-6 relative z-20">
        <div className="
          flex-1 flex flex-col bg-[#0A0C0E]/60 backdrop-blur-2xl 
          border border-white/5 rounded-[32px] shadow-2xl overflow-hidden
          relative
        ">
          {/* Sidebar Hover Glow */}
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-white/5 to-transparent opacity-0 group-hover:opacity-10 transition-opacity pointer-events-none" />

          {/* Branding Area */}
          <div className="p-8 pb-4 relative z-10">
            <Logo />
            <div className="mt-4 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 w-fit">
                <div className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse shadow-[0_0_8px_#2dd4bf]"></div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Mainnet Beta</span>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 px-4 space-y-1 overflow-y-auto custom-scrollbar py-4 relative z-10">
            <NavItem id="create" icon={Rocket} label="Token Creator" active={activeTab} set={setActiveTab} />
            <NavItem id="swap" icon={ArrowLeftRight} label="Swap Tokens" active={activeTab} set={setActiveTab} />
            <NavItem id="liquidity" icon={Droplets} label="Liquidity Manager" active={activeTab} set={setActiveTab} />
            <NavItem id="management" icon={Flame} label="Security & Burn" active={activeTab} set={setActiveTab} />
            <NavItem id="portfolio" icon={Wallet} label="My Portfolio" active={activeTab} set={setActiveTab} />
            <NavItem id="more" icon={LayoutGrid} label="More Tools" active={activeTab} set={setActiveTab} />
          </nav>

          {/* Bottom Wallet Area */}
          <div className="p-6 border-t border-white/5 relative z-10">
            <button className="
              w-full py-3.5 rounded-xl bg-gradient-to-r from-teal-500/10 to-blue-500/10 
              border border-teal-500/20 text-teal-400 font-bold text-sm
              hover:bg-gradient-to-r hover:from-teal-500/20 hover:to-blue-500/20 
              hover:border-teal-500/40 hover:shadow-[0_0_20px_rgba(45,212,191,0.2)]
              transition-all flex items-center justify-center gap-2 group
            ">
              <Wallet className="w-4 h-4 transition-transform group-hover:-rotate-12" />
              Connect Wallet
            </button>
          </div>
        </div>
      </aside>

      {/* --- MOBILE HEADER --- */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-20 bg-[#030406]/90 backdrop-blur-xl border-b border-white/10 z-50 flex items-center justify-between px-6">
         <Logo />
         <button onClick={() => setIsMobileNavOpen(!isMobileNavOpen)} className="p-2 text-gray-400">
            <Menu className="w-6 h-6" />
         </button>
      </div>

      {/* --- 3. MAIN COMMAND CENTER --- */}
      <main className="flex-1 h-screen p-0 md:p-6 relative z-10 pt-24 md:pt-6 overflow-hidden">
        
        {/* The Glass Container */}
        <div className="w-full h-full bg-[#0A0C0E]/40 backdrop-blur-xl border border-white/5 md:rounded-[32px] shadow-2xl flex flex-col relative overflow-hidden">
            
            {/* Back Glow (Dynamic) */}
            <div 
              className="absolute pointer-events-none transition-opacity duration-300"
              style={{
                background: `radial-gradient(800px circle at var(--mouse-x) var(--mouse-y), rgba(34, 211, 238, 0.06), transparent 40%)`,
                inset: 0,
                zIndex: 0
              }}
            />

            {/* Top Blue Light Bar */}
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-blue-400/50 to-transparent opacity-50 z-10" />

            {/* Content Scroll Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-10 lg:p-12 relative z-10">
                <div className="max-w-6xl mx-auto">
                    <Header activeTab={activeTab} />
                    
                    <div className="mt-10">
                        {activeTab === 'create' && <CreatorModule />}
                        {activeTab === 'swap' && <SwapModule />}
                        {activeTab === 'liquidity' && <LiquidityModule />}
                        {activeTab === 'management' && <SecurityModule />}
                        {activeTab === 'remove' && <RemoveModule />}
                        {activeTab === 'portfolio' && <PortfolioModule />}
                        {activeTab === 'more' && <MoreToolsModule />}
                    </div>
                </div>
            </div>

            {/* Status Footer */}
            <div className="h-12 border-t border-white/5 flex items-center justify-between px-8 text-[10px] text-gray-500 uppercase tracking-widest bg-[#0A0C0E]/80 relative z-10">
                <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-teal-500 shadow-[0_0_5px_#2dd4bf]"></span> Systems Operational</span>
                    <span className="hidden md:inline">v3.5 (Teal Final)</span>
                </div>
                <div className="flex items-center gap-4">
                    <span>Gas: <span className="text-white">0.00002 SOL</span></span>
                    <span>TPS: <span className="text-blue-400 font-bold">3,102</span></span>
                </div>
            </div>

        </div>
      </main>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255,255,255,0.02); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(6,182,212,0.3); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(6,182,212,0.6); }
        
        .spotlight-card:hover::before { opacity: 1; }
        .spotlight-card::before {
          content: "";
          position: absolute;
          inset: 0px;
          border-radius: inherit;
          padding: 1px;
          background: radial-gradient(
            800px circle at var(--mouse-x) var(--mouse-y), 
            rgba(34, 211, 238, 0.4), 
            transparent 40%
          );
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.5s;
        }
      `}</style>
    </div>
  );
};

// --- 4. LOGO ---
const Logo = () => (
    <div className="flex flex-col leading-none select-none">
        <span className="text-3xl font-black tracking-tighter text-teal-400 drop-shadow-[0_0_15px_rgba(45,212,191,0.4)]">
            token
        </span>
        <span className="text-3xl font-black tracking-tighter text-blue-400 ml-0.5 drop-shadow-[0_0_15px_rgba(96,165,250,0.5)]">
            club<span className="text-white">.</span>
        </span>
    </div>
);

// --- 5. HEADER ---
const Header = ({ activeTab }: { activeTab: TabId }) => {
    const content: Record<TabId, { h1: string; p: string }> = {
        create: { h1: "Token Creator", p: "Mint fully compliant SPL tokens on Solana with zero coding." },
        swap: { h1: "Jupiter Swap", p: "Best price routing across all Solana DEXs." },
        liquidity: { h1: "Liquidity Manager", p: "Initialize markets, add depth, or withdraw assets." },
        management: { h1: "Security & Burn", p: "Manage asset supply, lock liquidity, and ensure project safety." },
        remove: { h1: "Remove Liquidity", p: "Withdraw your assets from liquidity pools securely." },
        portfolio: { h1: "My Portfolio", p: "Track your created tokens and LP positions." },
        more: { h1: "Advanced Tools", p: "Multisender, Snapshots, and Metadata updates." },
    };
    const { h1, p } = content[activeTab];

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight mb-2">{h1}</h1>
            <p className="text-blue-200/60 text-lg">{p}</p>
        </div>
    );
};

// ============================================================================
// MODULE: SWAP (JUPITER STYLE)
// ============================================================================
const SwapModule = () => (
    <div className="max-w-md mx-auto animate-in slide-in-from-right-8 duration-500">
        <div className="bg-[#0f0f0f]/80 backdrop-blur-md border border-white/10 rounded-3xl p-4 shadow-2xl spotlight-card relative overflow-hidden">
            {/* Inner Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-blue-500/5 blur-[60px] rounded-full pointer-events-none" />

            {/* Header */}
            <div className="flex items-center justify-between px-4 mb-4 relative z-10">
                <div className="flex items-center gap-2 text-xs font-bold text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20">
                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
                    Jupiter Route
                </div>
                <div className="flex items-center gap-2">
                    <button className="p-2 hover:bg-white/5 rounded-full text-gray-400 hover:text-white transition-colors"><RefreshCw className="w-4 h-4" /></button>
                    <button className="p-2 hover:bg-white/5 rounded-full text-gray-400 hover:text-white transition-colors"><Settings className="w-4 h-4" /></button>
                </div>
            </div>

            {/* From */}
            <div className="bg-[#1a1a1a] rounded-2xl p-4 border border-white/5 relative z-10 group hover:border-blue-500/20 transition-colors">
                <div className="flex justify-between text-xs text-gray-500 mb-2"><span>You Pay</span><span className="flex items-center gap-1">Balance: <span className="text-blue-400 font-mono">24.50</span> SOL</span></div>
                <div className="flex items-center justify-between gap-4">
                    <input type="number" placeholder="0.00" className="bg-transparent text-3xl font-bold text-white placeholder-gray-600 focus:outline-none w-full"/>
                    <button className="flex items-center gap-2 bg-[#2a2a2a] hover:bg-[#333] text-white px-3 py-1.5 rounded-full font-bold border border-white/10 transition-all flex-shrink-0">
                        <div className="w-5 h-5 rounded-full bg-black border border-white/10"></div>SOL<ChevronDown className="w-4 h-4 opacity-70" />
                    </button>
                </div>
                <div className="text-xs text-gray-600 mt-2 font-mono">≈ $0.00</div>
            </div>

            {/* Switch */}
            <div className="relative h-2 z-20">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                    <button className="p-2 bg-[#0f0f0f] border border-white/10 rounded-xl text-gray-400 hover:text-blue-400 hover:border-blue-500/30 transition-all shadow-xl"><ArrowDown className="w-5 h-5" /></button>
                </div>
            </div>

            {/* To */}
            <div className="bg-[#1a1a1a] rounded-2xl p-4 border border-white/5 relative z-10 group hover:border-blue-500/20 transition-colors mt-[-10px]">
                <div className="flex justify-between text-xs text-gray-500 mb-2"><span>You Receive</span><span className="flex items-center gap-1">Balance: <span className="text-gray-400 font-mono">0.00</span> USDC</span></div>
                <div className="flex items-center justify-between gap-4">
                    <input type="number" placeholder="0.00" className="bg-transparent text-3xl font-bold text-white placeholder-gray-600 focus:outline-none w-full" readOnly/>
                    <button className="flex items-center gap-2 bg-[#2a2a2a] hover:bg-[#333] text-white px-3 py-1.5 rounded-full font-bold border border-white/10 transition-all flex-shrink-0">
                        <div className="w-5 h-5 rounded-full bg-blue-500/20 border border-blue-500/50"></div>USDC<ChevronDown className="w-4 h-4 opacity-70" />
                    </button>
                </div>
                <div className="text-xs text-gray-600 mt-2 font-mono">≈ $0.00</div>
            </div>

            {/* Info */}
            <div className="mt-4 p-3 rounded-xl bg-white/5 border border-white/5 text-xs space-y-2 relative z-10">
                <div className="flex justify-between text-gray-400"><span>Rate</span><span className="text-white font-mono">1 SOL ≈ 142.50 USDC</span></div>
                <div className="flex justify-between text-gray-400"><span>Price Impact</span><span className="text-emerald-400 font-mono">&lt; 0.1%</span></div>
            </div>

            <div className="mt-4 relative z-10"><PrimaryButton text="Connect Wallet" cost="" color="blue" /></div>
        </div>
    </div>
);

// ============================================================================
// MODULE 1: CREATOR
// ============================================================================
const CreatorModule = () => (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-12 animate-in slide-in-from-right-8 duration-500">
        <div className="xl:col-span-7 space-y-8 relative">
            <Section title="Token Identity" desc="Basic information visible on-chain." />
            <div className="grid grid-cols-2 gap-6 relative z-10"><Input label="Token Name" placeholder="e.g. Solana Gem" /><Input label="Symbol" placeholder="e.g. GEM" /></div>
            <div className="relative group z-10">
                <textarea className="w-full h-32 bg-[#121212] border border-white/10 rounded-2xl px-5 py-4 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all resize-none shadow-inner" placeholder="Project description..." />
                <label className="absolute left-4 -top-2.5 bg-[#0A0C0E] px-2 text-[10px] font-bold text-blue-400 uppercase tracking-wider">Description</label>
            </div>
            <Section title="Economics" desc="Define your supply and precision." />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10"><Input label="Total Supply" placeholder="1,000,000,000" type="number" /><Input label="Decimals" placeholder="9" type="number" defaultValue="9" /></div>
            <Section title="Metadata Extensions" desc="Social links for DexScreener." />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10"><SocialInput icon={Globe} placeholder="Website" /><SocialInput icon={Twitter} placeholder="Twitter / X" /><SocialInput icon={Send} placeholder="Telegram" /></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 relative z-10"><Toggle title="Revoke Mint" desc="Fixed Supply (Immutable)" /><Toggle title="Revoke Freeze" desc="Required for Liquidity Pools" /></div>
            <div className="pt-6 relative z-10"><PrimaryButton text="Launch Token" cost="0.2 SOL" color="teal" /></div>
        </div>
        
        {/* Preview Card */}
        <div className="xl:col-span-5 hidden xl:flex flex-col items-center justify-start pt-10">
            <div className="sticky top-10 perspective-1000">
                <div className="w-[380px] aspect-[3/4.5] rounded-[40px] bg-gradient-to-b from-[#1c1c1c]/80 to-[#0c0c0c]/80 backdrop-blur-md border border-white/10 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.9)] flex flex-col items-center p-8 text-center relative overflow-hidden transform transition-transform hover:rotate-y-2 hover:scale-[1.01] duration-500 spotlight-card ring-1 ring-white/5">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1/2 bg-blue-500/10 blur-[80px] rounded-full pointer-events-none" />
                    <div className="relative z-10 group cursor-pointer mb-8">
                        <div className="w-32 h-32 rounded-full border-2 border-dashed border-blue-500/30 flex items-center justify-center group-hover:bg-blue-500/10 group-hover:border-blue-500/60 transition-all shadow-[0_0_30px_rgba(59,130,246,0.1)]">
                            <UploadCloud className="w-10 h-10 text-blue-500/50 group-hover:text-blue-400" />
                        </div>
                        <div className="absolute bottom-0 right-0 bg-blue-500 text-black p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0"><Plus className="w-4 h-4" /></div>
                    </div>
                    <div className="relative z-10 w-full space-y-2">
                        <h3 className="text-3xl font-black text-white tracking-tight drop-shadow-md">Solana Moon</h3>
                        <span className="inline-block px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs font-mono text-blue-400">MOON</span>
                    </div>
                    <div className="relative z-10 mt-auto w-full bg-[#050505]/60 rounded-2xl p-5 border border-white/5 space-y-3 backdrop-blur-sm shadow-inner">
                        <PreviewRow label="Supply" value="1,000,000,000" /><PreviewRow label="Authority" value="Revoked" active /><PreviewRow label="Program" value="Token-2022" />
                    </div>
                </div>
            </div>
        </div>
    </div>
);

// ============================================================================
// MODULE 2: LIQUIDITY
// ============================================================================
const LiquidityModule = () => {
    const [mode, setMode] = useState<'init' | 'add' | 'remove'>('init');
    return (
        <div className="max-w-3xl animate-in slide-in-from-right-8 duration-500">
            <div className="flex gap-2 mb-8 p-1 bg-white/5 rounded-xl w-fit border border-white/5">
                <TabButton active={mode === 'init'} onClick={() => setMode('init')} label="Initialize Pool" />
                <TabButton active={mode === 'add'} onClick={() => setMode('add')} label="Add Liquidity" />
                <TabButton active={mode === 'remove'} onClick={() => setMode('remove')} label="Remove Liquidity" danger />
            </div>
            <div className="bg-[#0f0f0f]/60 border border-white/10 rounded-3xl p-8 space-y-8 relative overflow-hidden spotlight-card">
                {mode === 'init' ? (
                    <>
                        <Section title="Create Raydium Market" desc="Set up a new OpenBook market ID." />
                        <Input label="Base Token Mint" placeholder="Paste your token address" icon={Search} />
                        <div className="p-4 rounded-xl bg-blue-900/10 border border-blue-500/20 text-xs text-blue-200 flex gap-3">
                            <ShieldCheck className="w-5 h-5 flex-shrink-0 text-blue-400" />
                            <div><strong className="text-blue-400">Cost Optimization:</strong> Market creation fee is ~0.4 SOL to ~3 SOL.</div>
                        </div>
                        <div className="grid grid-cols-2 gap-6"><Input label="Base Amount" placeholder="0.00" type="number" /><Input label="SOL Quote" placeholder="0.00" type="number" /></div>
                        <PrimaryButton text="Initialize Pool" cost="Gas + Rent" color="blue" />
                    </>
                ) : mode === 'add' ? (
                    <>
                        <Section title="Deposit Liquidity" desc="Add assets to an existing AMM pool." />
                        <Input label="Pool ID / Pair Address" placeholder="Enter Raydium AMM ID" icon={Search} />
                        <div className="grid grid-cols-2 gap-6"><Input label="Token Amount" placeholder="0.00" type="number" /><Input label="SOL Amount" placeholder="0.00" type="number" /></div>
                        <PrimaryButton text="Confirm Deposit" cost="Gas Only" color="blue" />
                    </>
                ) : (
                    <>
                        <div className="flex gap-4 items-start mb-2">
                            <div className="p-3 rounded-lg bg-red-500/10 text-red-500 border border-red-500/20"><AlertTriangle className="w-6 h-6" /></div>
                            <div><h3 className="text-xl font-bold text-white">Withdraw Liquidity</h3><p className="text-gray-500 text-sm mt-1">Removing liquidity from an active pool can cause high price impact. Proceed with caution.</p></div>
                        </div>
                        <Input label="Raydium Pool ID" placeholder="Enter AMM ID" />
                        <Slider label="Withdrawal Percentage" danger />
                        <PrimaryButton text="Confirm Withdrawal" cost="Gas Only" color="red" />
                    </>
                )}
            </div>
        </div>
    );
};

// ============================================================================
// MODULE 3: SECURITY
// ============================================================================
const SecurityModule = () => {
    const [sub, setSub] = useState('burnlp');
    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in slide-in-from-right-8 duration-500">
            <div className="lg:col-span-4 space-y-2">
                <SubNavButton active={sub === 'burnlp'} onClick={() => setSub('burnlp')} icon={Flame} title="Burn LP" desc="Destroy liquidity tokens" />
                <SubNavButton active={sub === 'burntoken'} onClick={() => setSub('burntoken')} icon={Trash2} title="Burn Supply" desc="Reduce token circulation" />
                <SubNavButton active={sub === 'lock'} onClick={() => setSub('lock')} icon={Lock} title="Lock Liquidity" desc="Time-lock assets" />
                <SubNavButton active={sub === 'clean'} onClick={() => setSub('clean')} icon={RefreshCw} title="Account Cleanup" desc="Recover rent SOL" />
            </div>
            <div className="lg:col-span-8">
                <div className="bg-[#0f0f0f]/60 border border-white/10 rounded-3xl p-8 min-h-[400px] spotlight-card relative">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-blue-500/5 blur-[100px] rounded-full pointer-events-none" />
                    {sub === 'burnlp' && (
                        <div className="space-y-6 relative z-10">
                            <Section title="Burn LP Tokens" desc="Permanently remove liquidity access." />
                            <Input label="LP Token Account" placeholder="Paste Address" />
                            <Slider label="Amount to Burn" danger />
                            <PrimaryButton text="Burn LP Forever" cost="Gas Only" color="red" />
                        </div>
                    )}
                    {sub === 'burntoken' && (<div className="space-y-6 relative z-10"><Section title="Burn Token Supply" desc="Deflationary action." /><Input label="Token Mint Address" placeholder="Paste Address" /><Input label="Amount" placeholder="0.00" type="number" /><PrimaryButton text="Burn Tokens" cost="Gas Only" color="red" /></div>)}
                    {sub === 'lock' && (<div className="space-y-6 relative z-10"><Section title="Lock Liquidity" desc="Secure assets for a specific duration." /><Input label="LP Token Address" placeholder="Paste Address" /><div className="grid grid-cols-2 gap-6"><Input label="Amount" placeholder="100%" /><Input label="Unlock Date" type="date" /></div><PrimaryButton text="Lock Assets" cost="0.1 SOL" color="teal" /></div>)}
                    {sub === 'clean' && (<div className="space-y-6 flex flex-col items-center justify-center h-full text-center relative z-10"><div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(16,185,129,0.2)]"><Coins className="w-8 h-8 text-emerald-400" /></div><h3 className="text-xl font-bold text-white">Rent Recovery</h3><p className="text-gray-500 max-w-md">Scan your wallet for empty token accounts and close them to recover ~0.002 SOL per account.</p><button className="px-8 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors font-bold text-sm">Scan Wallet</button></div>)}
                </div>
            </div>
        </div>
    );
};

const RemoveModule = () => (<div className="max-w-2xl animate-in slide-in-from-right-8 duration-500"><div className="bg-[#050508]/80 border border-white/10 rounded-3xl p-8 space-y-8 border-t-4 border-t-red-500 spotlight-card"><Section title="Withdraw Liquidity" desc="Remove SOL and Token from AMM." /><Input label="Pool ID" placeholder="Enter AMM ID" /><Slider label="Withdrawal %" danger /><PrimaryButton text="Confirm Withdrawal" cost="Gas Only" color="red" /></div></div>);
const PortfolioModule = () => (<div className="animate-in slide-in-from-right-8 duration-500 space-y-6"><div className="grid grid-cols-1 md:grid-cols-3 gap-6"><StatCard label="Net Worth" value="$0.00" /><StatCard label="SOL Balance" value="0.00 SOL" /><StatCard label="Tokens Created" value="0" /></div><div className="bg-[#0f0f0f]/60 border border-white/10 rounded-3xl p-12 text-center spotlight-card"><div className="inline-flex p-4 rounded-full bg-white/5 mb-4 shadow-inner"><Wallet className="w-8 h-8 text-gray-500" /></div><h3 className="text-lg font-bold text-white">Wallet Not Connected</h3></div></div>);
const MoreToolsModule = () => (<div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-right-8 duration-500"><ToolCard title="Multisender" desc="Batch send tokens." /><ToolCard title="Snapshot Tool" desc="Export holder lists." /><ToolCard title="Metadata Update" desc="Change logo/name." /><ToolCard title="OpenBook Manager" desc="Advanced market configuration." /></div>);

// ============================================================================
// UI COMPONENTS
// ============================================================================

interface NavItemProps {
    id: TabId;
    icon: LucideIcon;
    label: string;
    active: TabId;
    set: (id: TabId) => void;
}

const NavItem: React.FC<NavItemProps> = ({ id, icon: Icon, label, active, set }) => {
    const isActive = active === id;
    return (
        <button onClick={() => set(id)} className={`w-full h-12 flex items-center gap-4 px-4 rounded-xl transition-colors duration-300 group ${isActive ? 'bg-teal-500/10 border border-teal-500/20' : 'border border-transparent hover:bg-white/5'}`}>
            <Icon className={`w-5 h-5 ${isActive ? 'text-teal-400' : 'text-gray-500 group-hover:text-white'}`} />
            <span className={`text-sm font-bold tracking-wide ${isActive ? 'text-white' : 'text-gray-500 group-hover:text-white'}`}>{label}</span>
            {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-teal-400 shadow-[0_0_8px_#2dd4bf]" />}
        </button>
    );
}

interface InputProps {
    label: string;
    placeholder: string;
    type?: string;
    icon?: LucideIcon;
    defaultValue?: string | number;
}

const Input: React.FC<InputProps> = ({ label, placeholder, type = "text", icon: Icon, defaultValue }) => (
    <div className="space-y-1.5 relative group">
        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider ml-1 group-focus-within:text-blue-400 transition-colors">{label}</label>
        <div className="relative">
            <input type={type} defaultValue={defaultValue} className="w-full bg-[#121212] border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white placeholder-gray-700 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all shadow-inner" placeholder={placeholder} />
            {Icon && <Icon className="absolute right-4 top-3.5 w-4 h-4 text-gray-600 group-focus-within:text-blue-500 transition-colors" />}
        </div>
    </div>
);

const Slider = ({ label, danger }: { label: string, danger?: boolean }) => {
    const [val, setVal] = useState(50);
    const colorClass = danger ? 'accent-red-500' : 'accent-blue-500';
    const textClass = danger ? 'text-red-400' : 'text-blue-400';
    return (
        <div className="space-y-3">
            <div className="flex justify-between"><label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{label}</label><span className={`text-xs font-mono font-bold ${textClass}`}>{val}%</span></div>
            <input type="range" min="0" max="100" value={val} onChange={(e) => setVal(Number(e.target.value))} className={`w-full h-2 bg-white/5 rounded-lg appearance-none cursor-pointer ${colorClass}`} />
        </div>
    );
};

interface SocialInputProps {
    icon: LucideIcon;
    placeholder: string;
}

const SocialInput: React.FC<SocialInputProps> = ({ icon: Icon, placeholder }) => (
    <div className="relative group">
        <div className="absolute left-3 top-3 text-gray-600 group-focus-within:text-blue-500 transition-colors"><Icon className="w-4 h-4" /></div>
        <input className="w-full bg-[#121212] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-700 focus:outline-none focus:border-blue-500/50 transition-all shadow-inner" placeholder={placeholder} />
    </div>
);

const Toggle = ({ title, desc }: { title: string, desc: string }) => {
    const [isOn, setIsOn] = useState(false);
    return (
        <div onClick={() => setIsOn(!isOn)} className={`cursor-pointer p-4 rounded-xl border transition-all duration-300 flex items-center justify-between group ${isOn ? 'bg-teal-500/10 border-teal-500/40' : 'bg-[#121212] border-white/10 hover:border-white/20'}`}>
            <div><div className={`text-sm font-bold transition-colors ${isOn ? 'text-teal-400' : 'text-gray-300'}`}>{title}</div><div className="text-[10px] text-gray-600 mt-0.5">{desc}</div></div>
            <div className={`w-10 h-5 rounded-full relative transition-colors duration-300 ${isOn ? 'bg-teal-500' : 'bg-white/10'}`}><div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-300 ${isOn ? 'left-5.5' : 'left-0.5'}`} /></div>
        </div>
    );
};

const PrimaryButton = ({ text, cost, color = "teal" }: { text: string, cost?: string, color?: "red" | "teal" | "blue" }) => {
    const styles = { red: 'bg-red-500 hover:shadow-[0_0_30px_rgba(239,68,68,0.4)]', teal: 'bg-teal-500 hover:shadow-[0_0_30px_rgba(20,184,166,0.4)]', blue: 'bg-blue-600 hover:shadow-[0_0_30px_rgba(37,99,235,0.4)]' };
    const bg = styles[color] || styles.teal;
    return (
        <button className={`w-full py-4 rounded-xl text-black font-bold text-base tracking-wide ${bg} hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 shadow-lg relative overflow-hidden border border-white/10`}>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] animate-[shimmer_2s_infinite]" />
            <Zap className="w-5 h-5 fill-current relative z-10" /><span className="relative z-10">{text}</span>{cost && <span className="opacity-80 text-xs ml-1 border-l border-black/20 pl-2 font-mono relative z-10">({cost})</span>}
        </button>
    );
};

const Section = ({ title, desc }: { title: string, desc: string }) => (<div className="mb-4"><h3 className="text-lg font-bold text-white flex items-center gap-2">{title}<div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" /></h3><p className="text-xs text-gray-500">{desc}</p></div>);
const TabButton = ({ active, onClick, label, danger }: { active: boolean, onClick: () => void, label: string, danger?: boolean }) => (<button onClick={onClick} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${active ? danger ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : danger ? 'text-red-400 hover:bg-red-500/10 border border-red-500/20' : 'text-gray-400 hover:text-white'}`}>{label}</button>);
const SubNavButton = ({ active, onClick, icon: Icon, title, desc }: { active: boolean, onClick: () => void, icon: LucideIcon, title: string, desc: string }) => (<button onClick={onClick} className={`w-full text-left p-3 rounded-xl border transition-all flex items-center gap-3 group ${active ? 'bg-blue-500/10 border-blue-500/40' : 'bg-[#121212] border-white/5 hover:bg-white/5 hover:border-white/10'}`}><div className={`p-2 rounded-lg ${active ? 'bg-blue-500/20 text-blue-400' : 'bg-white/5 text-gray-500'}`}><Icon className="w-5 h-5" /></div><div><div className={`text-sm font-bold ${active ? 'text-blue-400' : 'text-gray-300 group-hover:text-white'}`}>{title}</div><div className="text-[10px] text-gray-600">{desc}</div></div></button>);
const StatCard = ({ label, value }: { label: string, value: string }) => (<div className="bg-[#0f0f0f]/60 border border-white/10 p-6 rounded-2xl spotlight-card"><div className="text-xs text-gray-500 uppercase tracking-widest mb-1">{label}</div><div className="text-2xl font-bold text-white">{value}</div></div>);
const ToolCard = ({ title, desc }: { title: string, desc: string }) => (<div className="bg-[#0f0f0f]/60 border border-white/10 p-6 rounded-2xl hover:border-blue-500/30 transition-all cursor-pointer group spotlight-card"><div className="flex items-center justify-between mb-2"><h4 className="font-bold text-white group-hover:text-blue-400 transition-colors">{title}</h4><ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-blue-400 -rotate-45 transition-transform" /></div><p className="text-sm text-gray-500">{desc}</p></div>);
const PreviewRow = ({ label, value, active }: { label: string, value: string, active?: boolean }) => (<div className="flex justify-between items-center text-sm border-b border-white/5 pb-2 last:border-0 last:pb-0"><span className="text-gray-500">{label}</span><span className={`font-mono ${active ? 'text-teal-400 font-bold' : 'text-white'}`}>{value}</span></div>);

export default TokenclubComplete;
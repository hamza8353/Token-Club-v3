import React, { useState, useRef, useCallback, useEffect, Suspense, lazy } from 'react';
import { 
  Rocket, 
  Droplets, 
  Flame, 
  Wallet, 
  ArrowLeftRight,
  LayoutGrid,
  MessageCircle,
  Github,
  FileText,
} from 'lucide-react';
// Menu is imported but not used - keeping for potential future use
import { Logo } from './components/Logo';
import { Header } from './components/Header';
import { NavItem } from './components/NavItem';
import { WalletButton } from './components/WalletButton';
import { MobileBottomNav } from './components/MobileBottomNav';
import { Schema } from './components/Schema';
import { SeoHead } from './components/SeoHead';
import { ComparisonPage } from './components/ComparisonPage';
import { BlogPost } from './components/BlogPost';
import { useNetwork } from './contexts/NetworkContext';
import { getBlogPost } from './content/blog';
import { trackTabChange, trackPageView } from './lib/analytics';
import { clearAllClientMemory } from './lib/admin-utils';

type TabId = 'create' | 'swap' | 'liquidity' | 'management' | 'remove' | 'portfolio' | 'more';

// Lazy load modules for code splitting
const CreatorModule = lazy(() => import('./modules/CreatorModule'));
const SwapModule = lazy(() => import('./modules/SwapModule'));
const LiquidityModule = lazy(() => import('./modules/LiquidityModule'));
const SecurityModule = lazy(() => import('./modules/SecurityModule'));
const RemoveModule = lazy(() => import('./modules/RemoveModule'));
const PortfolioModule = lazy(() => import('./modules/PortfolioModule'));
const MoreToolsModule = lazy(() => import('./modules/MoreToolsModule'));

// Loading fallback component
const ModuleLoader = () => (
  <div className="flex items-center justify-center min-h-[400px]">
    <div className="animate-pulse text-blue-400">Loading...</div>
  </div>
);

// Throttle function for mouse move optimization
function throttle<T extends (...args: any[]) => void>(func: T, limit: number): T {
  let inThrottle: boolean;
  return ((...args: any[]) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  }) as T;
}

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('create');
  const [showComparison, setShowComparison] = useState(false);
  const [showBlog, setShowBlog] = useState(false);
  const [blogSlug, setBlogSlug] = useState<string>('how-to-create-solana-meme-coin');
  const { isDevnet, toggleNetwork } = useNetwork();

  const tabToPath: Record<TabId, string> = {
    create: '/',
    swap: '/swap',
    liquidity: '/liquidity',
    management: '/security',
    remove: '/remove',
    portfolio: '/portfolio',
    more: '/more',
  };

  const syncRouteFromLocation = useCallback(() => {
    // Use hash-based routing for client-side navigation
    const hash = window.location.hash.replace('#', '') || '/';
    const pathname = hash.startsWith('/') ? hash : '/' + hash;

    if (pathname === '/comparison') {
      setShowBlog(false);
      setShowComparison(true);
      trackPageView('/comparison', 'Comparison - TokenClub vs Competitors');
      return;
    }

    if (pathname.startsWith('/blog/')) {
      const slug = pathname.replace('/blog/', '').split('?')[0].split('#')[0] || 'how-to-create-solana-meme-coin';
      setShowComparison(false);
      setShowBlog(true);
      setBlogSlug(slug);
      trackPageView(`/blog/${slug}`, `Blog - ${slug}`);
      return;
    }

    const tab = (Object.keys(tabToPath) as TabId[]).find((t) => tabToPath[t] === pathname);
    setShowComparison(false);
    setShowBlog(false);
    if (tab) {
      setActiveTab(tab);
      const tabNames: Record<TabId, string> = {
        create: 'Token Creator',
        swap: 'Swap',
        liquidity: 'Liquidity Manager',
        management: 'Security',
        remove: 'Remove Liquidity',
        portfolio: 'Portfolio',
        more: 'More Tools',
      };
      trackTabChange(tabNames[tab]);
      trackPageView(pathname, tabNames[tab]);
    }
  }, []);

  const navigate = useCallback(
    (path: string) => {
      // Use hash-based routing for Next.js compatibility
      if (window.location.hash !== `#${path}`) {
        window.location.hash = path;
      }
      syncRouteFromLocation();
      window.scrollTo({ top: 0, behavior: 'instant' });
    },
    [syncRouteFromLocation]
  );
  
  // Scroll to top on page changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [activeTab, showComparison, showBlog]);

  // Admin shortcut: Ctrl+Shift+C to clear all client-side memory
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'C') {
        e.preventDefault();
        if (confirm('⚠️ Admin Action: Clear all TokenClub client-side memory?\n\nThis will remove:\n- Token memory\n- Pool memory\n- Cache data\n\nThis action cannot be undone. Continue?')) {
          clearAllClientMemory();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Sync initial URL + back/forward navigation
  useEffect(() => {
    syncRouteFromLocation();
    const onHashChange = () => syncRouteFromLocation();
    const onPopState = () => syncRouteFromLocation();
    window.addEventListener('hashchange', onHashChange);
    window.addEventListener('popstate', onPopState);
    return () => {
      window.removeEventListener('hashchange', onHashChange);
      window.removeEventListener('popstate', onPopState);
    };
  }, [syncRouteFromLocation]);
  
  // --- CURSOR SPOTLIGHT LOGIC (Optimized with throttling) ---
  const containerRef = useRef<HTMLDivElement>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  const handleMouseMove = useCallback(
    throttle((e: React.MouseEvent<HTMLDivElement>) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setMousePosition({ x, y });
      
      containerRef.current.style.setProperty('--mouse-x', `${x}px`);
      containerRef.current.style.setProperty('--mouse-y', `${y}px`);
    }, 16), // ~60fps
    []
  );

  // Handle navigation to liquidity with token address
  const handleNavigateToLiquidity = useCallback((_tokenMint: string) => {
    navigate('/liquidity');
    // Token address is stored in localStorage, LiquidityModule will pick it up
  }, [navigate]);

  // Render active module
  const renderActiveModule = () => {
    switch (activeTab) {
      case 'create':
        return <CreatorModule />;
      case 'swap':
        return <SwapModule />;
      case 'liquidity':
        return <LiquidityModule />;
      case 'management':
        return <SecurityModule />;
      case 'remove':
        return <RemoveModule />;
      case 'portfolio':
        return <PortfolioModule onNavigateToLiquidity={handleNavigateToLiquidity} />;
      case 'more':
        return <MoreToolsModule />;
      default:
        return <CreatorModule />;
    }
  };

  // Show blog page if active
  if (showBlog) {
    const post = getBlogPost(blogSlug);
    const seoRoute = { kind: 'blog' as const, slug: blogSlug, post };
    return (
      <>
        <SeoHead route={seoRoute} />
        <Schema route={seoRoute} />
        <BlogPost slug={blogSlug} onBack={() => {
          navigate('/');
        }} />
      </>
    );
  }

  // Show comparison page if active
  if (showComparison) {
    const seoRoute = { kind: 'comparison' as const };
    return (
      <>
        <SeoHead route={seoRoute} />
        <Schema route={seoRoute} />
        <ComparisonPage onBack={() => {
          navigate('/');
        }} />
      </>
    );
  }

  return (
    <>
      <SeoHead route={{ kind: 'app' as const, tab: activeTab }} />
      <Schema route={{ kind: 'app' as const, tab: activeTab }} />
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
            <Logo isNetworkSwitched={isDevnet} />
            <button 
              onClick={toggleNetwork}
              className="mt-4 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 w-fit hover:bg-white/10 transition-colors cursor-pointer"
              title="Click to switch network (or press Ctrl+Shift+E)"
            >
                <div className={`w-1.5 h-1.5 rounded-full animate-pulse shadow-[0_0_8px] ${
                  isDevnet 
                    ? 'bg-white shadow-white' 
                    : 'bg-teal-400 shadow-[0_0_8px_#2dd4bf]'
                }`}></div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  Mainnet
                </span>
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 px-4 space-y-1 overflow-y-auto custom-scrollbar py-4 relative z-10">
            <NavItem id="create" icon={Rocket} label="Token Creator" active={activeTab} set={(id) => navigate(tabToPath[id])} />
            <NavItem id="swap" icon={ArrowLeftRight} label="Swap Tokens" active={activeTab} set={(id) => navigate(tabToPath[id])} />
            <NavItem id="liquidity" icon={Droplets} label="Liquidity Manager" active={activeTab} set={(id) => navigate(tabToPath[id])} />
            <NavItem id="management" icon={Flame} label="Security & Burn" active={activeTab} set={(id) => navigate(tabToPath[id])} />
            <NavItem id="portfolio" icon={Wallet} label="My Portfolio" active={activeTab} set={(id) => navigate(tabToPath[id])} />
            <NavItem id="more" icon={LayoutGrid} label="More Tools" active={activeTab} set={(id) => navigate(tabToPath[id])} />
          </nav>

          {/* Bottom Wallet Area */}
          <div className="p-6 border-t border-white/5 relative z-10">
            <WalletButton />
          </div>
        </div>
      </aside>

      {/* --- MOBILE HEADER --- */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-[#030406]/95 backdrop-blur-xl border-b border-white/10 z-50 flex items-center justify-between px-4 safe-area-inset-top">
         <div className="flex items-center gap-3">
           <Logo />
           <div className={`w-1.5 h-1.5 rounded-full animate-pulse shadow-[0_0_5px] ${
             isDevnet 
               ? 'bg-gray-400 shadow-gray-400' 
               : 'bg-teal-400 shadow-[0_0_5px_#2dd4bf]'
           }`}></div>
         </div>
         <div className="flex-shrink-0">
           <WalletButton />
         </div>
      </div>

      {/* --- 3. MAIN COMMAND CENTER --- */}
      <main className="flex-1 h-screen p-0 md:p-6 relative z-10 pt-16 md:pt-6 pb-20 md:pb-0 overflow-hidden">
        
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
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-10 lg:p-12 relative z-10">
                <div className="max-w-6xl mx-auto">
                    <Header activeTab={activeTab} />
                    
                    <div className="mt-6 md:mt-10">
                        <Suspense fallback={<ModuleLoader />}>
                            {renderActiveModule()}
                        </Suspense>
                    </div>
                </div>
            </div>

            {/* Status Footer - Hidden on mobile */}
            <div className="hidden md:flex h-12 border-t border-white/5 items-center justify-between px-8 text-[10px] text-gray-500 uppercase tracking-widest bg-[#0A0C0E]/80 relative z-10">
                <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full shadow-[0_0_5px] ${
                        isDevnet 
                          ? 'bg-gray-400 shadow-gray-400' 
                          : 'bg-teal-500 shadow-[0_0_5px_#2dd4bf]'
                      }`}></span>
                      Systems Operational
                    </span>
                    <button
                      onClick={() => {
                        navigate('/comparison');
                      }}
                      className="hidden md:inline hover:text-teal-400 transition-colors cursor-pointer"
                    >
                      Comparison
                    </button>
                    <button
                      onClick={() => {
                        setBlogSlug('how-to-create-solana-meme-coin');
                        navigate('/blog/how-to-create-solana-meme-coin');
                      }}
                      className="hidden md:inline hover:text-teal-400 transition-colors cursor-pointer"
                    >
                      Blog
                    </button>
                </div>
                <div className="flex items-center gap-4">
                    <a
                      href="/sitemap.xml"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-[10px] font-semibold uppercase tracking-widest text-white hover:text-teal-400"
                      title="Sitemap"
                    >
                      <FileText className="w-3 h-3" />
                      Sitemap
                    </a>
                    <a
                      href="https://github.com/coinlaunch033/TokenClub-V3/blob/main/README.md"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-[10px] font-semibold uppercase tracking-widest text-white hover:text-teal-400"
                      title="GitHub Repository"
                    >
                      <Github className="w-3 h-3" />
                      GitHub
                    </a>
                    <a
                      href="https://t.me/tokenlab00"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-[10px] font-semibold uppercase tracking-widest text-white hover:text-teal-400"
                      title="Contact Us on Telegram"
                    >
                      <MessageCircle className="w-3 h-3" />
                      Contact Us
                    </a>
                    <span>Gas: <span className="text-white">0.00002 SOL</span></span>
                    <span>TPS: <span className="text-blue-400 font-bold">3,102</span></span>
                </div>
            </div>

        </div>
      </main>

      {/* --- MOBILE BOTTOM NAVIGATION --- */}
      <MobileBottomNav activeTab={activeTab} setActiveTab={(id) => navigate(tabToPath[id])} />

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
    </>
  );
};

export default App;

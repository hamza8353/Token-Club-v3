import React, { useState, useMemo, useEffect } from 'react';
import { Search, ChevronDown, X, Copy } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { jupiterClient } from '../../lib/jupiter';
import { getTokenData, getTokenMemory } from '../../lib/token-memory';
import { PublicKey } from '@solana/web3.js';

export interface Token {
  mint: string;
  symbol?: string;
  name?: string;
  decimals?: number;
  logoURI?: string;
  balance?: number;
}

interface TokenSelectorProps {
  selectedToken: Token | null;
  onTokenSelect: (token: Token) => void;
  label?: string;
  excludeToken?: Token | null;
  showBalance?: boolean;
  disabled?: boolean;
}

const SOL_TOKEN: Token = {
  mint: 'So11111111111111111111111111111111111111112',
  symbol: 'SOL',
  name: 'Solana',
  decimals: 9,
  logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
};

const getTokenInitial = (token: Token): string => {
  return (token?.symbol || token?.name || token?.mint || '?')
    .toString()
    .charAt(0)
    .toUpperCase();
};

const TokenAvatar: React.FC<{ token: Token; size?: 'compact' | 'default' | 'list' }> = ({ token, size = 'default' }) => {
  const [imgError, setImgError] = useState(false);
  const showImage = token?.logoURI && !imgError;
  const sizeClass = size === 'compact' ? 'w-10 h-10' : size === 'list' ? 'w-10 h-10' : 'w-12 h-12';

  return (
    <div
      className={`${sizeClass} rounded-full bg-gradient-to-br from-[#1ef3ff] via-[#7c69ff] to-[#ff6cd7] text-white flex items-center justify-center text-sm font-semibold relative overflow-hidden`}
    >
      {showImage ? (
        <img
          src={token.logoURI}
          alt={`${token?.symbol || 'token'} logo`}
          className="absolute inset-0 w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <span>{getTokenInitial(token)}</span>
      )}
    </div>
  );
};

const TokenSelector: React.FC<TokenSelectorProps> = ({
  selectedToken,
  onTokenSelect,
  label = 'Select Token',
  excludeToken = null,
  showBalance = true,
  disabled = false,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [jupiterTokens, setJupiterTokens] = useState<Token[]>([]);
  const [isLoadingTokens, setIsLoadingTokens] = useState(false);

  // Cache key for localStorage
  const TOKEN_LIST_CACHE_KEY = 'jupiter_token_list_cache';
  const TOKEN_LIST_CACHE_EXPIRY = 1000 * 60 * 60; // 1 hour

  // Load tokens immediately on mount, not when modal opens
  useEffect(() => {
    const loadTokens = async () => {
      // First, add SOL and localStorage tokens immediately for fast initial render
      const quickTokens: Token[] = [SOL_TOKEN];
      
      // Add tokens from localStorage (user-created tokens) immediately
      const tokenMemory = getTokenMemory();
      Object.values(tokenMemory).forEach((tokenData) => {
        if (!quickTokens.find(t => t.mint === tokenData.mintAddress)) {
          quickTokens.push({
            mint: tokenData.mintAddress,
            symbol: tokenData.symbol || 'TOKEN',
            name: tokenData.name || 'Token',
            logoURI: tokenData.image,
            decimals: 9, // Default decimals
          });
        }
      });

      setJupiterTokens(quickTokens);
      setIsLoadingTokens(true);

      try {
        // Check cache first
        const cached = localStorage.getItem(TOKEN_LIST_CACHE_KEY);
        if (cached) {
          try {
            const { tokens: cachedTokens, timestamp } = JSON.parse(cached);
            const now = Date.now();
            if (timestamp && (now - timestamp) < TOKEN_LIST_CACHE_EXPIRY) {
              // Use cached tokens
              const allTokens = [...quickTokens];
              cachedTokens.forEach((token: any) => {
                if (!allTokens.find(t => t.mint === token.mint)) {
                  allTokens.push(token);
                }
              });
              setJupiterTokens(allTokens);
              setIsLoadingTokens(false);
              return;
            }
          } catch (e) {
            // Cache invalid, continue to fetch
          }
        }

        // Fetch from Jupiter API in background
        const jupiterList = await jupiterClient.getTokenList();
        const tokens: Token[] = [...quickTokens];

        // Add Jupiter tokens
        if (Array.isArray(jupiterList)) {
          const jupiterTokensList: Token[] = [];
          jupiterList.forEach((token: any) => {
            if (token.address && token.address !== SOL_TOKEN.mint) {
              jupiterTokensList.push({
                mint: token.address,
                symbol: token.symbol,
                name: token.name,
                decimals: token.decimals,
                logoURI: token.logoURI,
              });
            }
          });
          
          // Add Jupiter tokens to list
          jupiterTokensList.forEach((token) => {
            if (!tokens.find(t => t.mint === token.mint)) {
              tokens.push(token);
            }
          });

          // Cache the Jupiter tokens
          try {
            localStorage.setItem(TOKEN_LIST_CACHE_KEY, JSON.stringify({
              tokens: jupiterTokensList,
              timestamp: Date.now(),
            }));
          } catch (e) {
            // Failed to cache token list (not logged for security)
          }
        }

        setJupiterTokens(tokens);
      } catch (error) {
        console.error('Error loading tokens:', error);
        // Keep the quick tokens even if Jupiter fails
      } finally {
        setIsLoadingTokens(false);
      }
    };

    // Load tokens when component mounts, not when modal opens
    loadTokens();
  }, []); // Empty dependency array - load once on mount

  // Filter tokens based on search and exclusions
  const filteredTokens = useMemo(() => {
    let filtered = jupiterTokens.filter(token => {
      if (excludeToken && token.mint === excludeToken.mint) return false;
      const query = searchQuery.toLowerCase();
      const symbol = (token.symbol || '').toLowerCase();
      const name = (token.name || '').toLowerCase();
      const mint = (token.mint || '').toLowerCase();

      return (
        symbol.includes(query) ||
        name.includes(query) ||
        mint.includes(query)
      );
    });

    // Sort: SOL first, then by symbol
    filtered.sort((a, b) => {
      if (a.mint === SOL_TOKEN.mint) return -1;
      if (b.mint === SOL_TOKEN.mint) return 1;
      return (a.symbol || '').localeCompare(b.symbol || '');
    });

    return filtered;
  }, [jupiterTokens, searchQuery, excludeToken]);

  const quickSelectTokens = filteredTokens.slice(0, 6);
  const remainingTokens = filteredTokens.slice(6);

  const handleTokenSelect = (token: Token) => {
    onTokenSelect(token);
    setIsModalOpen(false);
    setSearchQuery('');
  };

  const shortMint = (mint: string): string => {
    if (!mint) return '—';
    return `${mint.slice(0, 4)}...${mint.slice(-4)}`;
  };

  return (
    <>
      <div className="space-y-2">
        {label && (
          <label className="block text-sm font-medium text-gray-400">{label}</label>
        )}

        <motion.button
          type="button"
          onClick={() => !disabled && setIsModalOpen(true)}
          disabled={disabled}
          className={`w-full rounded-2xl border border-white/10 bg-white/5 text-left transition-all duration-200 px-4 py-4 ${
            disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-[#66f0ff] hover:bg-white/10'
          }`}
          whileHover={disabled ? {} : { scale: 1.01 }}
          whileTap={disabled ? {} : { scale: 0.99 }}
        >
          <div className="flex items-center justify-between gap-3">
            {selectedToken ? (
              <div className="flex items-center gap-3 min-w-0">
                <TokenAvatar token={selectedToken} />
                <div className="min-w-0">
                  <div className="font-semibold text-white leading-tight">
                    {selectedToken.symbol || 'Token'}
                  </div>
                  <div className="text-xs font-mono text-gray-400">
                    {shortMint(selectedToken.mint)}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-white/10" />
                <span className="text-gray-500 text-sm">Select a token</span>
              </div>
            )}
            <ChevronDown className="w-5 h-5 text-gray-300 flex-shrink-0" />
          </div>
        </motion.button>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-gradient-to-b from-[#0b1430] to-[#101c3f] rounded-3xl border border-white/10 shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col"
          >
            <div className="p-5 border-b border-white/10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-[#7fe8ff]">Select a token</p>
                  <h3 className="text-2xl font-semibold text-white mt-1">Choose a token</h3>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="w-9 h-9 rounded-full bg-white/10 text-white hover:bg-white/20 border border-white/20 transition"
                >
                  <X className="w-5 h-5 mx-auto" />
                </button>
              </div>

              <div className="mt-4 bg-white/5 rounded-2xl border border-white/10 p-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search name or mint address"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-transparent pl-10 pr-10 py-2 text-white placeholder-gray-500 focus:outline-none"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {isLoadingTokens ? (
                <div className="text-center py-8 text-gray-400">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto mb-3" />
                  <p>Loading tokens...</p>
                </div>
              ) : (
                <>
                  {quickSelectTokens.length > 0 && (
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-gray-500 mb-2">Popular tokens</p>
                      <div className="flex flex-wrap gap-3">
                        {quickSelectTokens.map((token) => (
                          <button
                            key={`chip-${token.mint}`}
                            onClick={() => handleTokenSelect(token)}
                            className="px-4 py-2 rounded-2xl border border-white/15 text-sm text-white bg-white/5 hover:border-[#66f0ff]/80 hover:bg-white/10 transition flex items-center gap-2"
                          >
                            <TokenAvatar token={token} size="compact" />
                            <span>{token.symbol || token.name || shortMint(token.mint)}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-gray-500 px-2">
                      <span>Token</span>
                      <span>Address</span>
                    </div>
                    <div className="max-h-[360px] overflow-y-auto space-y-2 pr-1">
                      <AnimatePresence>
                        {remainingTokens.map((token) => (
                          <motion.button
                            key={token.mint}
                            onClick={() => handleTokenSelect(token)}
                            className="w-full rounded-2xl border border-white/10 bg-white/[0.04] hover:border-[#66f0ff]/80 hover:bg-white/[0.08] transition-all duration-200 text-left p-3"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                          >
                            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                              <div className="flex items-center gap-3 min-w-0">
                                <TokenAvatar token={token} size="list" />
                                <div className="min-w-0">
                                  <div className="font-medium text-white truncate">
                                    {token.symbol || token.name || 'Token'}
                                  </div>
                                  <div className="text-xs text-gray-400 truncate">
                                    {token.name || shortMint(token.mint)}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-xs text-[#7fe8ff] font-mono flex items-center gap-1 justify-end">
                                  {shortMint(token.mint)}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigator.clipboard.writeText(token.mint).catch(() => {});
                                    }}
                                    className="p-1 rounded-full bg-white/10 hover:bg-white/20 text-white"
                                    title="Copy mint"
                                  >
                                    <Copy className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </motion.button>
                        ))}
                      </AnimatePresence>

                      {filteredTokens.length === 0 && !isLoadingTokens && (
                        <div className="text-center py-8 text-gray-400">
                          <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
                          <p>No tokens found</p>
                          <p className="text-sm">Try adjusting your search</p>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
};

export default TokenSelector;


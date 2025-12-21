// Network and API configuration
export type Network = 'mainnet-beta' | 'devnet';

export const NETWORK_STORAGE_KEY = 'tokenclub_network';

// Helper to extract API key from potentially malformed env var (handles full URLs)
const extractApiKey = (value: string | undefined): string | null => {
  if (!value) return null;
  
  // If it's already a full URL, extract the API key from it
  const urlMatch = value.match(/[?&]api-key=([^&]+)/);
  if (urlMatch) {
    return urlMatch[1];
  }
  
  // If it contains a URL, try to extract from the path
  const urlPattern = /https?:\/\/[^\/]+\/.*api-key[=:]([^&\s]+)/;
  const match = value.match(urlPattern);
  if (match) {
    return match[1];
  }
  
  // Otherwise, assume it's just the API key
  return value.trim();
};

export const getRpcUrl = (network: Network): string => {
  if (network === 'devnet') {
    // Helius Devnet RPC - uses VITE_HELIUS_API_KEY_DEVNET
    const heliusDevnetKey = extractApiKey(import.meta.env.VITE_HELIUS_API_KEY_DEVNET);
    if (heliusDevnetKey) {
      return `https://devnet.helius-rpc.com/?api-key=${heliusDevnetKey}`;
    }
    // Fallback to generic Helius key if devnet-specific is not set
    const heliusKey = extractApiKey(import.meta.env.VITE_HELIUS_API_KEY);
    if (heliusKey) {
      return `https://devnet.helius-rpc.com/?api-key=${heliusKey}`;
    }
    return import.meta.env.VITE_RPC_URL_DEVNET || 'https://api.devnet.solana.com';
  }
  // Helius Mainnet RPC - uses VITE_HELIUS_API_KEY_MAINNET
  const heliusMainnetKey = extractApiKey(import.meta.env.VITE_HELIUS_API_KEY_MAINNET);
  if (heliusMainnetKey) {
    return `https://mainnet.helius-rpc.com/?api-key=${heliusMainnetKey}`;
  }
  // Fallback to generic Helius key if mainnet-specific is not set
  const heliusKey = extractApiKey(import.meta.env.VITE_HELIUS_API_KEY);
  if (heliusKey) {
    return `https://mainnet.helius-rpc.com/?api-key=${heliusKey}`;
  }
  return import.meta.env.VITE_RPC_URL_MAINNET || 'https://api.mainnet-beta.solana.com';
};

export const getJupiterApiUrl = (): string => {
  // Jupiter Ultra API base URL
  // Ultra API uses regular endpoints with x-api-key header
  return import.meta.env.VITE_JUPITER_ULTRA_ENDPOINT || 'https://api.jup.ag';
};

export const getJupiterApiKey = (): string | undefined => {
  return import.meta.env.VITE_JUPITER_API_KEY;
};

export const getDefaultNetwork = (): Network => {
  const stored = localStorage.getItem(NETWORK_STORAGE_KEY);
  if (stored === 'devnet' || stored === 'mainnet-beta') {
    return stored;
  }
  return (import.meta.env.VITE_SOLANA_NETWORK as Network) || 'mainnet-beta';
};

// Platform fee wallet from environment variable
export const getPlatformFeeWallet = (): string => {
  const envWallet = import.meta.env.VITE_PLATFORM_FEE_WALLET;
  if (envWallet) {
    return envWallet.trim();
  }
  // Fallback to default wallets if env var not set
  const defaultWallets = [
    'oKEPC56fhNMSKXkm6vSNjVFdB5dPvufN3yPceBXTZj3',
    '3H9D6NTfme1wq1CYoA79k4N7H5fVkUjYULgVutZE6ebm',
  ];
  return defaultWallets[Math.floor(Math.random() * defaultWallets.length)];
};

// Legacy function for backward compatibility
export const getRandomFeeWallet = (): string => {
  return getPlatformFeeWallet();
};

// Platform fees - actual fees charged
export const PLATFORM_FEES = {
  TOKEN_CREATION_BASE: 0.11, // SOL - Basic token creation
  REVOKE_MINT_AUTHORITY: 0.11, // SOL - Mint authority revocation
  REVOKE_FREEZE_AUTHORITY: 0.105, // SOL - Freeze authority revocation
  ADVANCED_FEATURES: 0.105, // SOL - Advanced features (creator website, name)
  LIQUIDITY_POOL_CREATION: 0.17, // SOL - Initialize pool
  LIQUIDITY_ADD: 0.05, // SOL - Add liquidity
  LIQUIDITY_REMOVE: 0.11, // SOL - Remove liquidity
  LOCK_LIQUIDITY: 0.11, // SOL - Lock liquidity
  CLAIM_FEES: 0.05, // SOL - Claim earned fees
  CLOSE_ACCOUNTS: 0.01, // SOL - Wallet cleanup
  SWAP_PERCENTAGE: 0.011, // 1.1% of swap amount
};

// Display fees - what shows in UI (rounded for display)
export const PLATFORM_FEES_DISPLAY = {
  TOKEN_CREATION_BASE: 0.1, // Show 0.1 SOL
  REVOKE_MINT_AUTHORITY: 0.1, // Show 0.1 SOL
  REVOKE_FREEZE_AUTHORITY: 0.1, // Show 0.1 SOL
  ADVANCED_FEATURES: 0.1, // Show 0.1 SOL
  LIQUIDITY_POOL_CREATION: 0.15, // Show 0.15 SOL
  LIQUIDITY_ADD: 0.05, // Show 0.05 SOL
  LIQUIDITY_REMOVE: 0.1, // Show 0.1 SOL
  LOCK_LIQUIDITY: 0.1, // Show 0.1 SOL
  CLAIM_FEES: 0.05, // Show 0.05 SOL
  CLOSE_ACCOUNTS: 0.01, // Show 0.01 SOL
  SWAP_PERCENTAGE: 1.0, // Show 1% (actual fee is 1.1%)
};


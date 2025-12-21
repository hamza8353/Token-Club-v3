// Google Analytics (gtag.js) Event Tracking
// Comprehensive event measurement for TokenClub platform

declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}

// Google Analytics Measurement ID
const GA_MEASUREMENT_ID = 'G-YQPF87DGYM';

/**
 * Initialize Google Analytics
 */
export const initAnalytics = (): void => {
  // Check if already initialized
  if (window.gtag) {
    return;
  }

  // Initialize dataLayer
  window.dataLayer = window.dataLayer || [];
  window.gtag = function(...args: any[]) {
    window.dataLayer.push(args);
  };

  // Set initial timestamp
  window.gtag('js', new Date());

  // Configure GA
  window.gtag('config', GA_MEASUREMENT_ID, {
    page_path: window.location.pathname,
    page_title: document.title,
  });
};

/**
 * Track page view
 */
export const trackPageView = (path: string, title?: string): void => {
  if (!window.gtag) return;

  window.gtag('config', GA_MEASUREMENT_ID, {
    page_path: path,
    page_title: title || document.title,
  });
};

/**
 * Track custom events
 */
export const trackEvent = (
  eventName: string,
  eventParams?: {
    event_category?: string;
    event_label?: string;
    value?: number;
    [key: string]: any;
  }
): void => {
  if (!window.gtag) return;

  window.gtag('event', eventName, {
    ...eventParams,
  });
};

// ============================================
// Token Creation Events
// ============================================

export const trackTokenCreationStart = (): void => {
  trackEvent('token_creation_start', {
    event_category: 'Token Creation',
    event_label: 'User started token creation',
  });
};

export const trackTokenCreationComplete = (params: {
  tokenMint: string;
  tokenSymbol?: string;
  tokenName?: string;
  hasRevokeMint: boolean;
  hasRevokeFreeze: boolean;
  hasAdvancedFeatures: boolean;
  totalCost: number;
}): void => {
  trackEvent('token_creation_complete', {
    event_category: 'Token Creation',
    event_label: 'Token created successfully',
    token_mint: params.tokenMint,
    token_symbol: params.tokenSymbol,
    token_name: params.tokenName,
    revoke_mint: params.hasRevokeMint,
    revoke_freeze: params.hasRevokeFreeze,
    advanced_features: params.hasAdvancedFeatures,
    value: params.totalCost,
    currency: 'SOL',
  });
};

export const trackTokenCreationError = (error: string): void => {
  trackEvent('token_creation_error', {
    event_category: 'Token Creation',
    event_label: 'Token creation failed',
    error_message: error,
  });
};

// ============================================
// Liquidity Pool Events
// ============================================

export const trackLiquidityPoolInitialize = (params: {
  poolAddress: string;
  baseTokenMint: string;
  baseAmount: number;
  solAmount: number;
}): void => {
  trackEvent('liquidity_pool_initialize', {
    event_category: 'Liquidity',
    event_label: 'Pool initialized',
    pool_address: params.poolAddress,
    base_token_mint: params.baseTokenMint,
    base_amount: params.baseAmount,
    sol_amount: params.solAmount,
  });
};

export const trackLiquidityAdd = (params: {
  poolAddress: string;
  tokenAmount: number;
  solAmount: number;
}): void => {
  trackEvent('liquidity_add', {
    event_category: 'Liquidity',
    event_label: 'Liquidity added',
    pool_address: params.poolAddress,
    token_amount: params.tokenAmount,
    sol_amount: params.solAmount,
  });
};

export const trackLiquidityRemove = (params: {
  poolAddress: string;
  percentage: number;
}): void => {
  trackEvent('liquidity_remove', {
    event_category: 'Liquidity',
    event_label: 'Liquidity removed',
    pool_address: params.poolAddress,
    percentage: params.percentage,
  });
};

export const trackLiquidityLock = (params: {
  poolAddress: string;
  percentage: number;
  permanent: boolean;
}): void => {
  trackEvent('liquidity_lock', {
    event_category: 'Liquidity',
    event_label: 'Liquidity locked',
    pool_address: params.poolAddress,
    percentage: params.percentage,
    permanent: params.permanent,
  });
};

export const trackLiquidityClaim = (params: {
  poolAddress: string;
  feesClaimed: number;
}): void => {
  trackEvent('liquidity_claim', {
    event_category: 'Liquidity',
    event_label: 'Fees claimed',
    pool_address: params.poolAddress,
    fees_claimed: params.feesClaimed,
  });
};

// ============================================
// Swap Events
// ============================================

export const trackSwapStart = (params: {
  fromToken: string;
  toToken: string;
  fromAmount: number;
}): void => {
  trackEvent('swap_start', {
    event_category: 'Swap',
    event_label: 'Swap initiated',
    from_token: params.fromToken,
    to_token: params.toToken,
    from_amount: params.fromAmount,
  });
};

export const trackSwapComplete = (params: {
  fromToken: string;
  toToken: string;
  fromAmount: number;
  toAmount: number;
  transactionSignature: string;
}): void => {
  trackEvent('swap_complete', {
    event_category: 'Swap',
    event_label: 'Swap completed',
    from_token: params.fromToken,
    to_token: params.toToken,
    from_amount: params.fromAmount,
    to_amount: params.toAmount,
    transaction_signature: params.transactionSignature,
  });
};

export const trackSwapError = (error: string): void => {
  trackEvent('swap_error', {
    event_category: 'Swap',
    event_label: 'Swap failed',
    error_message: error,
  });
};

// ============================================
// Security & Cleanup Events
// ============================================

export const trackWalletScan = (params: {
  accountsFound: number;
}): void => {
  trackEvent('wallet_scan', {
    event_category: 'Security',
    event_label: 'Wallet scanned',
    accounts_found: params.accountsFound,
  });
};

export const trackAccountCleanup = (params: {
  accountsClosed: number;
  rentRecovered: number;
}): void => {
  trackEvent('account_cleanup', {
    event_category: 'Security',
    event_label: 'Accounts cleaned up',
    accounts_closed: params.accountsClosed,
    rent_recovered: params.rentRecovered,
    value: params.rentRecovered,
    currency: 'SOL',
  });
};

// ============================================
// Wallet Events
// ============================================

export const trackWalletConnect = (): void => {
  trackEvent('wallet_connect', {
    event_category: 'Wallet',
    event_label: 'Wallet connected',
  });
};

export const trackWalletDisconnect = (): void => {
  trackEvent('wallet_disconnect', {
    event_category: 'Wallet',
    event_label: 'Wallet disconnected',
  });
};

// ============================================
// Navigation Events
// ============================================

export const trackTabChange = (tabName: string): void => {
  trackEvent('tab_change', {
    event_category: 'Navigation',
    event_label: `Switched to ${tabName} tab`,
    tab_name: tabName,
  });
};

export const trackButtonClick = (buttonName: string, location?: string): void => {
  trackEvent('button_click', {
    event_category: 'Engagement',
    event_label: `Clicked ${buttonName}`,
    button_name: buttonName,
    location: location || 'unknown',
  });
};

// ============================================
// Error Tracking
// ============================================

export const trackError = (error: Error, context?: string): void => {
  trackEvent('exception', {
    event_category: 'Error',
    event_label: error.message,
    error_message: error.message,
    error_stack: error.stack,
    context: context || 'unknown',
    fatal: false,
  });
};


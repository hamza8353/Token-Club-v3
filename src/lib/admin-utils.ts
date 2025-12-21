// Admin utilities for TokenClub
// Admin functions for clearing client-side memory

/**
 * Clear all TokenClub-related localStorage data
 * This is an admin function triggered by Ctrl+Shift+C
 */
export const clearAllClientMemory = (): void => {
  try {
    // Token memory
    localStorage.removeItem('tokenclub_token_memory');
    localStorage.removeItem('tokenclub_last_created_mint');
    
    // Pool memory
    localStorage.removeItem('tokenclub_pool_memory');
    localStorage.removeItem('tokenclub_last_created_pool');
    
    // Network preference (optional - you might want to keep this)
    // localStorage.removeItem('tokenclub_network');
    
    // Temporary manage token
    localStorage.removeItem('tokenclub_manage_token');
    
    // Created tokens list
    localStorage.removeItem('tokenclub_created_tokens');
    
    // Jupiter token list cache (from TokenSelector)
    const TOKEN_LIST_CACHE_KEY = 'jupiter_token_list_cache';
    localStorage.removeItem(TOKEN_LIST_CACHE_KEY);
    
    // Show confirmation
    console.log('✅ All TokenClub client-side memory cleared');
    alert('All TokenClub client-side memory has been cleared successfully!');
  } catch (error) {
    console.error('Error clearing client memory:', error);
    alert('Error clearing memory: ' + (error instanceof Error ? error.message : 'Unknown error'));
  }
};

/**
 * Get all TokenClub localStorage keys (for debugging)
 */
export const getAllTokenClubKeys = (): string[] => {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('tokenclub_')) {
      keys.push(key);
    }
  }
  // Also check for jupiter cache
  if (localStorage.getItem('jupiter_token_list_cache')) {
    keys.push('jupiter_token_list_cache');
  }
  return keys;
};


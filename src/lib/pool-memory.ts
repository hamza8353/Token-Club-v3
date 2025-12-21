// Client-side pool memory system using localStorage
// Stores pool data (pool address, position NFT, token mints) for auto-fetching

export interface PoolData {
  poolAddress: string;
  positionNftMint?: string;
  baseTokenMint: string;
  quoteTokenMint: string;
  createdAt: number;
}

const POOL_MEMORY_KEY = 'tokenclub_pool_memory';
const LAST_CREATED_POOL_KEY = 'tokenclub_last_created_pool';

/**
 * Save pool data to localStorage
 */
export const savePoolData = (data: PoolData): void => {
  try {
    const existing = getPoolMemory();
    const updated = {
      ...existing,
      [data.poolAddress]: {
        ...data,
        createdAt: data.createdAt || Date.now(),
      },
    };
    localStorage.setItem(POOL_MEMORY_KEY, JSON.stringify(updated));
    
    // Also save as last created pool for quick access
    localStorage.setItem(LAST_CREATED_POOL_KEY, data.poolAddress);
  } catch (error) {
    console.error('Error saving pool data to localStorage:', error);
  }
};

/**
 * Get pool data by pool address
 */
export const getPoolData = (poolAddress: string): PoolData | null => {
  try {
    const memory = getPoolMemory();
    return memory[poolAddress] || null;
  } catch (error) {
    console.error('Error getting pool data from localStorage:', error);
    return null;
  }
};

/**
 * Get all pool data
 */
export const getPoolMemory = (): Record<string, PoolData> => {
  try {
    const stored = localStorage.getItem(POOL_MEMORY_KEY);
    if (!stored) return {};
    return JSON.parse(stored);
  } catch (error) {
    console.error('Error reading pool memory from localStorage:', error);
    return {};
  }
};

/**
 * Get the last created pool address
 */
export const getLastCreatedPool = (): string | null => {
  try {
    return localStorage.getItem(LAST_CREATED_POOL_KEY);
  } catch (error) {
    console.error('Error getting last created pool:', error);
    return null;
  }
};

/**
 * Get pools by base token mint
 */
export const getPoolsByBaseToken = (baseTokenMint: string): PoolData[] => {
  try {
    const memory = getPoolMemory();
    return Object.values(memory).filter(
      (pool) => pool.baseTokenMint === baseTokenMint
    );
  } catch (error) {
    console.error('Error getting pools by base token:', error);
    return [];
  }
};

/**
 * Update pool data
 */
export const updatePoolData = (poolAddress: string, updates: Partial<PoolData>): void => {
  try {
    const existing = getPoolData(poolAddress);
    if (existing) {
      savePoolData({
        ...existing,
        ...updates,
        poolAddress, // Ensure poolAddress is preserved
      });
    }
  } catch (error) {
    console.error('Error updating pool data:', error);
  }
};

/**
 * Clear all pool memory
 */
export const clearPoolMemory = (): void => {
  try {
    localStorage.removeItem(POOL_MEMORY_KEY);
    localStorage.removeItem(LAST_CREATED_POOL_KEY);
  } catch (error) {
    console.error('Error clearing pool memory:', error);
  }
};

/**
 * Remove specific pool from memory
 */
export const removePoolData = (poolAddress: string): void => {
  try {
    const memory = getPoolMemory();
    delete memory[poolAddress];
    localStorage.setItem(POOL_MEMORY_KEY, JSON.stringify(memory));
    
    // If this was the last created pool, clear it
    if (getLastCreatedPool() === poolAddress) {
      localStorage.removeItem(LAST_CREATED_POOL_KEY);
    }
  } catch (error) {
    console.error('Error removing pool data:', error);
  }
};


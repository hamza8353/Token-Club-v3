// Utility to fetch Meteora pools from wallet's position NFTs
import { Connection, PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { CpAmm, derivePositionAddress } from '@meteora-ag/cp-amm-sdk';

export interface WalletPool {
  poolAddress: string;
  positionNftMint: string;
  tokenAMint: string;
  tokenBMint: string;
  unlockedLiquidity?: string;
}

const METEORA_DEFAULT_CONFIG = new PublicKey('2QdhepnKRTLjjSqPL1PtKNwqrUkoLee5Gqs8bvZhRdMv');

/**
 * Fetch all Meteora pools owned by a wallet
 */
export async function fetchWalletPools(
  connection: Connection,
  walletAddress: PublicKey
): Promise<WalletPool[]> {
  try {
    // Fetching pools for wallet (address not logged for security)
    
    // Get all token accounts owned by the wallet
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
      walletAddress,
      {
        programId: TOKEN_PROGRAM_ID,
      }
    );

    // Found token accounts (count only, no sensitive data logged)

    const pools: WalletPool[] = [];
    const cpAmm = new CpAmm(connection);

    // Process each token account to find position NFTs
    // Position NFTs are NFTs, so they typically have a balance of 1
    for (const account of tokenAccounts.value) {
      try {
        const parsedInfo = account.account.data.parsed.info;
        const uiAmount = parsedInfo.tokenAmount.uiAmount;
        const amount = parsedInfo.tokenAmount.amount;
        
        // Position NFTs are NFTs, so they have balance of 1
        // Check for balance = 1 or very small amounts (NFTs)
        if (uiAmount === 0 || (uiAmount > 1 && amount !== '1')) {
          continue;
        }

        const mintAddress = parsedInfo.mint;
        const mintPubkey = new PublicKey(mintAddress);

        // Try to derive position PDA from this mint
        // If it's a position NFT, this will give us a valid position address
        try {
          const positionPda = derivePositionAddress(mintPubkey);
          
          // Try to fetch position state - if it succeeds, this is a valid position NFT
          const positionState = await cpAmm.fetchPositionState(positionPda);
          
          // Get pool state to get token mints
          const poolState = await cpAmm.fetchPoolState(positionState.pool);

          // Found Meteora pool (addresses not logged for security)

          pools.push({
            poolAddress: positionState.pool.toBase58(),
            positionNftMint: mintAddress,
            tokenAMint: poolState.tokenAMint.toBase58(),
            tokenBMint: poolState.tokenBMint.toBase58(),
            unlockedLiquidity: positionState.unlockedLiquidity?.toString(),
          });
        } catch (err: any) {
          // Not a position NFT, skip silently
          continue;
        }
      } catch (err) {
        // Skip invalid accounts
        continue;
      }
    }
    
    // Also check saved pools from localStorage
    try {
      const { getPoolMemory } = await import('./pool-memory');
      const savedPools = getPoolMemory();
      for (const [poolAddress, poolData] of Object.entries(savedPools)) {
        // Only add if not already in pools
        if (!pools.find(p => p.poolAddress === poolAddress)) {
          // Verify the pool still exists on-chain
          try {
            const poolState = await cpAmm.fetchPoolState(new PublicKey(poolAddress));
            pools.push({
              poolAddress: poolData.poolAddress,
              positionNftMint: poolData.positionNftMint || '',
              tokenAMint: poolState.tokenAMint.toBase58(),
              tokenBMint: poolState.tokenBMint.toBase58(),
            });
            // Found saved pool (address not logged for security)
          } catch {
            // Pool no longer exists, skip
          }
        }
      }
    } catch (err) {
      // Error loading saved pools (not logged for security)
    }

    // Found Meteora pools (count only, no sensitive data logged)
    return pools;
  } catch (error) {
    console.error('Error fetching wallet pools:', error);
    return [];
  }
}

/**
 * Fetch a single pool by position NFT mint
 */
export async function fetchPoolByPositionNft(
  connection: Connection,
  positionNftMint: string
): Promise<WalletPool | null> {
  try {
    const cpAmm = new CpAmm(connection);
    const positionMintPubkey = new PublicKey(positionNftMint);
    const positionPda = derivePositionAddress(positionMintPubkey);
    
    const positionState = await cpAmm.fetchPositionState(positionPda);
    const poolState = await cpAmm.fetchPoolState(positionState.pool);

    return {
      poolAddress: positionState.pool.toBase58(),
      positionNftMint,
      tokenAMint: poolState.tokenAMint.toBase58(),
      tokenBMint: poolState.tokenBMint.toBase58(),
      unlockedLiquidity: positionState.unlockedLiquidity?.toString(),
    };
  } catch (error) {
    console.error('Error fetching pool by position NFT:', error);
    return null;
  }
}


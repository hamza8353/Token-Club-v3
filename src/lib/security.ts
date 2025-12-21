import {
  Connection,
  PublicKey,
  TransactionInstruction,
  SystemProgram,
} from '@solana/web3.js';
import {
  getAssociatedTokenAddressSync,
  createBurnInstruction,
  createCloseAccountInstruction,
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  getAccount,
} from '@solana/spl-token';
import { createBatchedTransaction } from './transactions';

export class SecurityManager {
  private connection: Connection;

  constructor(connection: Connection) {
    this.connection = connection;
  }

  /**
   * Burn tokens from a token account
   */
  async burnTokens(
    mintAddress: string,
    owner: PublicKey,
    amount: number,
    decimals: number
  ): Promise<TransactionInstruction[]> {
    const instructions: TransactionInstruction[] = [];
    const mint = new PublicKey(mintAddress);
    
    const tokenAccount = getAssociatedTokenAddressSync(
      mint,
      owner,
      false,
      TOKEN_PROGRAM_ID
    );

    const burnAmount = BigInt(Math.floor(amount * Math.pow(10, decimals)));
    const burnIx = createBurnInstruction(
      tokenAccount,
      mint,
      owner,
      burnAmount,
      [],
      TOKEN_PROGRAM_ID
    );

    instructions.push(burnIx);
    return instructions;
  }

  /**
   * Burn LP tokens (transfer to dead address)
   */
  async burnLPTokens(
    lpTokenAccount: string,
    owner: PublicKey,
    amount: number
  ): Promise<TransactionInstruction[]> {
    const instructions: TransactionInstruction[] = [];
    const lpAccount = new PublicKey(lpTokenAccount);
    
    // Get account info to find mint
    const accountInfo = await this.connection.getAccountInfo(lpAccount);
    if (!accountInfo) {
      throw new Error('LP token account not found');
    }

    // Parse token account to get mint
    // This is simplified - actual implementation needs proper parsing
    // For now, we'll use a burn instruction
    const deadAddress = new PublicKey('11111111111111111111111111111111');
    
    // Transfer to dead address (effectively burning)
    // Note: This is a simplified approach. Actual LP token burning may require
    // interacting with the liquidity pool program
    const transferIx = SystemProgram.transfer({
      fromPubkey: owner,
      toPubkey: deadAddress,
      lamports: 0, // This won't work for tokens, need proper token transfer
    });

    // For now, return empty - needs proper LP token handling
    return instructions;
  }

  /**
   * Get all token accounts (both empty and non-empty) for scanning
   * Checks both TOKEN_PROGRAM_ID and TOKEN_2022_PROGRAM_ID
   */
  async getAllTokenAccounts(owner: PublicKey): Promise<Array<{
    account: PublicKey;
    mint: string;
    balance: string;
    decimals: number;
    isEmpty: boolean;
    programId: typeof TOKEN_PROGRAM_ID | typeof TOKEN_2022_PROGRAM_ID;
  }>> {
    const allAccounts: Array<{
      account: PublicKey;
      mint: string;
      balance: string;
      decimals: number;
      isEmpty: boolean;
      programId: typeof TOKEN_PROGRAM_ID | typeof TOKEN_2022_PROGRAM_ID;
    }> = [];

    try {
      // Check TOKEN_PROGRAM_ID accounts
      try {
        const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(owner, {
          programId: TOKEN_PROGRAM_ID,
        });

        for (const accountInfo of tokenAccounts.value) {
          const parsedInfo = accountInfo.account.data.parsed.info;
          const balance = parsedInfo.tokenAmount.amount;
          const uiAmount = parsedInfo.tokenAmount.uiAmount;
          const decimals = parsedInfo.tokenAmount.decimals || 0;
          
          // Check if account is empty - handle different balance formats
          let balanceNum: bigint;
          try {
            // Handle string, number, or BigInt formats
            if (typeof balance === 'string') {
              balanceNum = BigInt(balance);
            } else if (typeof balance === 'number') {
              balanceNum = BigInt(Math.floor(balance));
            } else {
              balanceNum = BigInt(balance.toString());
            }
          } catch {
            balanceNum = BigInt(0);
          }
          
          // Account is empty if balance is 0
          // Also check uiAmount as a fallback (can be 0, null, or undefined for empty accounts)
          const isEmpty = balanceNum === BigInt(0) || uiAmount === 0 || uiAmount === null || uiAmount === undefined;

          allAccounts.push({
            account: new PublicKey(accountInfo.pubkey),
            mint: parsedInfo.mint,
            balance: balance.toString(),
            decimals,
            isEmpty,
            programId: TOKEN_PROGRAM_ID,
          });
        }
      } catch (error) {
        console.error('Error fetching TOKEN_PROGRAM_ID accounts:', error);
      }

      // Check TOKEN_2022_PROGRAM_ID accounts
      try {
        const token2022Accounts = await this.connection.getParsedTokenAccountsByOwner(owner, {
          programId: TOKEN_2022_PROGRAM_ID,
        });

        for (const accountInfo of token2022Accounts.value) {
          const parsedInfo = accountInfo.account.data.parsed.info;
          const balance = parsedInfo.tokenAmount.amount;
          const uiAmount = parsedInfo.tokenAmount.uiAmount;
          const decimals = parsedInfo.tokenAmount.decimals || 0;
          
          // Check if account is empty - handle different balance formats
          let balanceNum: bigint;
          try {
            // Handle string, number, or BigInt formats
            if (typeof balance === 'string') {
              balanceNum = BigInt(balance);
            } else if (typeof balance === 'number') {
              balanceNum = BigInt(Math.floor(balance));
            } else {
              balanceNum = BigInt(balance.toString());
            }
          } catch {
            balanceNum = BigInt(0);
          }
          
          // Account is empty if balance is 0
          // Also check uiAmount as a fallback (can be 0, null, or undefined for empty accounts)
          const isEmpty = balanceNum === BigInt(0) || uiAmount === 0 || uiAmount === null || uiAmount === undefined;

          allAccounts.push({
            account: new PublicKey(accountInfo.pubkey),
            mint: parsedInfo.mint,
            balance: balance.toString(),
            decimals,
            isEmpty,
            programId: TOKEN_2022_PROGRAM_ID,
          });
        }
      } catch (error) {
        console.error('Error fetching TOKEN_2022_PROGRAM_ID accounts:', error);
      }

      return allAccounts;
    } catch (error) {
      console.error('Error fetching token accounts:', error);
      return allAccounts; // Return what we found so far
    }
  }

  /**
   * Close empty token accounts to recover rent
   * Checks both TOKEN_PROGRAM_ID and TOKEN_2022_PROGRAM_ID
   * Returns accounts that appear empty from parsed data
   * Final verification happens in createCloseAccountInstructions
   */
  async getEmptyTokenAccounts(owner: PublicKey): Promise<PublicKey[]> {
    const allAccounts = await this.getAllTokenAccounts(owner);
    
    // Filter accounts that appear empty from parsed data
    // We trust the parsed data - createCloseAccountInstructions will verify before closing
    const emptyAccounts = allAccounts
      .filter(acc => {
        try {
          const balanceNum = BigInt(acc.balance);
          return balanceNum === BigInt(0);
        } catch {
          return acc.isEmpty;
        }
      })
      .map(acc => acc.account);
    
    return emptyAccounts;
  }

  /**
   * Create instructions to close empty token accounts
   * Handles both TOKEN_PROGRAM_ID and TOKEN_2022_PROGRAM_ID accounts
   */
  async createCloseAccountInstructions(
    owner: PublicKey,
    tokenAccounts: PublicKey[]
  ): Promise<TransactionInstruction[]> {
    const instructions: TransactionInstruction[] = [];

    for (const tokenAccount of tokenAccounts) {
      try {
        // Try TOKEN_PROGRAM_ID first
        try {
          const account = await getAccount(this.connection, tokenAccount, 'confirmed', TOKEN_PROGRAM_ID);
          
          // Verify account is empty before closing
          if (account.amount === BigInt(0)) {
            const closeIx = createCloseAccountInstruction(
              tokenAccount,
              owner,
              owner,
              [],
              TOKEN_PROGRAM_ID
            );
            instructions.push(closeIx);
          }
        } catch (tokenError) {
          // If TOKEN_PROGRAM_ID fails, try TOKEN_2022_PROGRAM_ID
          try {
            const account = await getAccount(this.connection, tokenAccount, 'confirmed', TOKEN_2022_PROGRAM_ID);
            
            // Verify account is empty before closing
            if (account.amount === BigInt(0)) {
              const closeIx = createCloseAccountInstruction(
                tokenAccount,
                owner,
                owner,
                [],
                TOKEN_2022_PROGRAM_ID
              );
              instructions.push(closeIx);
            }
          } catch (token2022Error) {
            // Account might not exist or be a different type, skip it
            console.error(`Error creating close instruction for ${tokenAccount.toBase58()}:`, token2022Error);
          }
        }
      } catch (error) {
        console.error(`Error processing account ${tokenAccount.toBase58()}:`, error);
      }
    }

    return instructions;
  }
}


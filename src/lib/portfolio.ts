import { Connection, PublicKey } from '@solana/web3.js';
import { getAccount, getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';

export interface TokenBalance {
  mint: string;
  balance: number;
  decimals: number;
  uiAmount: number;
}

export class PortfolioManager {
  private connection: Connection;

  constructor(connection: Connection) {
    this.connection = connection;
  }

  /**
   * Get SOL balance
   */
  async getSolBalance(address: PublicKey): Promise<number> {
    try {
      const balance = await this.connection.getBalance(address);
      return balance / LAMPORTS_PER_SOL;
    } catch (error) {
      console.error('Error fetching SOL balance:', error);
      return 0;
    }
  }

  /**
   * Get all token accounts for a wallet
   */
  async getTokenAccounts(address: PublicKey): Promise<TokenBalance[]> {
    try {
      const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(address, {
        programId: TOKEN_PROGRAM_ID,
      });

      const balances: TokenBalance[] = [];

      for (const accountInfo of tokenAccounts.value) {
        const parsedInfo = accountInfo.account.data.parsed.info;
        const mint = parsedInfo.mint;
        const balance = parsedInfo.tokenAmount.amount;
        const decimals = parsedInfo.tokenAmount.decimals;
        const uiAmount = parsedInfo.tokenAmount.uiAmount;

        if (uiAmount > 0) {
          balances.push({
            mint,
            balance: Number(balance),
            decimals,
            uiAmount,
          });
        }
      }

      return balances;
    } catch (error) {
      console.error('Error fetching token accounts:', error);
      return [];
    }
  }

  /**
   * Get token balance for a specific mint
   */
  async getTokenBalance(address: PublicKey, mint: PublicKey): Promise<TokenBalance | null> {
    try {
      const tokenAccount = getAssociatedTokenAddressSync(
        mint,
        address,
        false,
        TOKEN_PROGRAM_ID
      );

      try {
        const account = await getAccount(this.connection, tokenAccount);
        // Get mint info to get decimals
        const mintInfo = await this.connection.getParsedAccountInfo(mint);
        const decimals = (mintInfo.value?.data as any)?.parsed?.info?.decimals || 9;

        return {
          mint: mint.toBase58(),
          balance: Number(account.amount),
          decimals,
          uiAmount: Number(account.amount) / Math.pow(10, decimals),
        };
      } catch {
        // Account doesn't exist
        return null;
      }
    } catch (error) {
      console.error('Error fetching token balance:', error);
      return null;
    }
  }
}


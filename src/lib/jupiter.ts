import { Connection, PublicKey, VersionedTransaction, TransactionMessage, SystemProgram, AddressLookupTableAccount } from '@solana/web3.js';
import { getJupiterApiUrl, getJupiterApiKey, getPlatformFeeWallet, PLATFORM_FEES } from './config';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';

export interface JupiterQuoteResponse {
  inputMint: string;
  inAmount: string;
  outputMint: string;
  outAmount: string;
  otherAmountThreshold: string;
  swapMode: string;
  slippageBps: number;
  platformFee?: {
    amount: string;
    feeBps: number;
  };
  priceImpactPct: string;
  routePlan: any[];
  contextSlot: number;
  timeTaken: number;
}

export interface JupiterSwapResponse {
  swapTransaction: string; // base64 encoded transaction
}

export class JupiterClient {
  private baseUrl: string;
  private apiKey?: string;

  constructor() {
    this.baseUrl = getJupiterApiUrl();
    this.apiKey = getJupiterApiKey();
    
    // API key status check (no logging to prevent exposure)
    // API key is configured and ready to use
  }

  private getHeaders(requireAuth: boolean = false, useXApiKey: boolean = false): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (this.apiKey) {
      // Jupiter Ultra API uses x-api-key header (per documentation)
      if (useXApiKey) {
        headers['x-api-key'] = this.apiKey;
      } else {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }
    }
    return headers;
  }

  private async addPlatformFeeToTransaction(
    transaction: VersionedTransaction,
    userPublicKey: string,
    swapAmountInSol: number,
    connection: Connection
  ): Promise<VersionedTransaction> {
    // Resolve address lookup tables first
    const lookupTables: AddressLookupTableAccount[] = [];
    if (transaction.message.addressTableLookups && transaction.message.addressTableLookups.length > 0) {
      for (const lookup of transaction.message.addressTableLookups) {
        try {
          const table = await connection.getAddressLookupTable(lookup.accountKey);
          if (table.value) {
            lookupTables.push(table.value);
          }
        } catch (error) {
          // Failed to fetch address lookup table (not logged for security)
        }
      }
    }
    
    // Now we can decompile the transaction with resolved lookup tables
    const message = TransactionMessage.decompile(transaction.message, lookupTables);
    
    // Add platform fee transfer instruction at the beginning
    // Fee is 1.1% of the swap amount in SOL
    const feeWallet = new PublicKey(getPlatformFeeWallet());
    const feePercentage = PLATFORM_FEES.SWAP_PERCENTAGE; // 1.1%
    const feeAmountInSol = swapAmountInSol * feePercentage;
    const feeAmount = Math.floor(feeAmountInSol * LAMPORTS_PER_SOL);
    const feeInstruction = SystemProgram.transfer({
      fromPubkey: new PublicKey(userPublicKey),
      toPubkey: feeWallet,
      lamports: feeAmount,
    });
    
    // Insert fee instruction at the beginning (after compute budget if present)
    // Find compute budget instructions and insert after them
    const COMPUTE_BUDGET_PROGRAM_ID = new PublicKey('ComputeBudget111111111111111111111111111111');
    let insertIndex = 0;
    for (let i = 0; i < message.instructions.length; i++) {
      const ix = message.instructions[i];
      // Check if it's a compute budget instruction
      if (ix.programId.equals(COMPUTE_BUDGET_PROGRAM_ID)) {
        insertIndex = i + 1;
      }
    }
    
    message.instructions.splice(insertIndex, 0, feeInstruction);
    
    // Rebuild the transaction with the same address lookup tables
    const modifiedMessage = new TransactionMessage({
      payerKey: new PublicKey(userPublicKey),
      recentBlockhash: message.recentBlockhash,
      instructions: message.instructions,
    }).compileToV0Message(lookupTables);
    
    const modifiedTransaction = new VersionedTransaction(modifiedMessage);
    
    // Jupiter already includes Address Lookup Tables in the transaction
    // The transaction is already optimized with ALTs
    return modifiedTransaction;
  }

  private async handleResponse(response: Response): Promise<any> {
    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `Jupiter API error: ${response.status} ${response.statusText}`;
      
      if (response.status === 401) {
        if (!this.apiKey) {
          errorMessage = 'Jupiter API key is missing. Please set VITE_JUPITER_API_KEY in your .env file. Get your API key from: https://portal.jup.ag';
        } else {
          errorMessage = 'Jupiter API key is invalid or expired. Please verify your API key at https://portal.jup.ag and update VITE_JUPITER_API_KEY in your .env file.';
        }
      } else if (response.status === 404) {
        errorMessage = `Jupiter API endpoint not found. This might be a temporary issue or the endpoint structure has changed.`;
      }
      
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.message) {
          errorMessage = errorJson.message;
        }
      } catch {
        // If error text is not JSON, use the text as message
        if (errorText) {
          errorMessage = errorText;
        }
      }
      
      throw new Error(errorMessage);
    }
    
    return await response.json();
  }

  async getQuote(
    inputMint: string,
    outputMint: string,
    amount: number,
    slippageBps: number = 50
  ): Promise<JupiterQuoteResponse | null> {
    try {
      // Jupiter Ultra API: GET /swap/v1/quote
      // Uses x-api-key header for authentication
      const quoteUrl = `${this.baseUrl}/swap/v1/quote`;
      
      const params = new URLSearchParams({
        inputMint,
        outputMint,
        amount: amount.toString(),
        slippageBps: slippageBps.toString(),
        onlyDirectRoutes: 'false',
        asLegacyTransaction: 'false',
      });

      const response = await fetch(`${quoteUrl}?${params}`, {
        method: 'GET',
        headers: this.getHeaders(true, true), // Ultra API uses x-api-key header
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('Jupiter quote error:', error);
      return null;
    }
  }


  async getSwapTransaction(
    quote: JupiterQuoteResponse,
    userPublicKey: string,
    swapAmountInSol: number, // Amount being swapped in SOL (for fee calculation)
    connection: Connection,
    wrapAndUnwrapSol: boolean = true,
    dynamicComputeUnitLimit: boolean = true,
    prioritizationFeeLamports?: number
  ): Promise<VersionedTransaction | null> {
    try {
      // Jupiter Ultra API: POST /swap/v1/swap
      // Uses x-api-key header for authentication
      const swapUrl = `${this.baseUrl}/swap/v1/swap`;
      
      const payload: any = {
        quoteResponse: quote,
        userPublicKey,
        wrapUnwrapSOL: wrapAndUnwrapSol,
        dynamicComputeUnitLimit,
      };

      if (prioritizationFeeLamports) {
        payload.prioritizationFeeLamports = prioritizationFeeLamports;
      } else {
        payload.prioritizationFeeLamports = 'auto';
      }

      const response = await fetch(swapUrl, {
        method: 'POST',
        headers: this.getHeaders(true, true), // Ultra API uses x-api-key header
        body: JSON.stringify(payload),
      });

      const data: JupiterSwapResponse = await this.handleResponse(response);
      const swapTransactionBuf = Buffer.from(data.swapTransaction, 'base64');
      const transaction = VersionedTransaction.deserialize(swapTransactionBuf);
      
      // Add platform fee to the transaction (requires connection to resolve lookup tables)
      return await this.addPlatformFeeToTransaction(transaction, userPublicKey, swapAmountInSol, connection);
    } catch (error) {
      console.error('Jupiter swap transaction error:', error);
      return null;
    }
  }

  async getPrice(mintAddress: string): Promise<number | null> {
    try {
      // Price endpoint: GET /price/v3/price
      const priceUrl = `${this.baseUrl}/price/v3/price?ids=${mintAddress}`;
      
      const response = await fetch(priceUrl, {
        headers: this.getHeaders(true, true), // Use x-api-key for Ultra API
      });

      if (!response.ok) {
        // Price API failures are non-critical, return null
        return null;
      }

      const data = await response.json();
      return data.data?.[mintAddress]?.price || null;
    } catch (error) {
      console.error('Jupiter price error:', error);
      return null;
    }
  }

  async getTokenList(): Promise<any[]> {
    try {
      // Token list endpoint: GET /tokens/v2
      const tokenListUrl = `${this.baseUrl}/tokens/v2`;
      
      const response = await fetch(tokenListUrl, {
        headers: this.getHeaders(true, true), // Use x-api-key for Ultra API
      });

      if (!response.ok) {
        // Token list API failures are non-critical, return empty array
        return [];
      }

      const data = await response.json();
      return data || [];
    } catch (error) {
      console.error('Jupiter token list error:', error);
      return [];
    }
  }
}

export const jupiterClient = new JupiterClient();


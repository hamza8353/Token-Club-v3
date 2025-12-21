import {
  Connection,
  PublicKey,
  Transaction,
  VersionedTransaction,
  AddressLookupTableAccount,
  TransactionMessage,
  TransactionInstruction,
} from '@solana/web3.js';

/**
 * Address Lookup Table (ALT) utilities for transaction batching
 */

export class TransactionBatcher {
  private connection: Connection;
  private lookupTables: Map<string, AddressLookupTableAccount> = new Map();

  constructor(connection: Connection) {
    this.connection = connection;
  }

  /**
   * Fetch and cache an Address Lookup Table
   */
  async fetchLookupTable(address: PublicKey): Promise<AddressLookupTableAccount | null> {
    const addressStr = address.toBase58();
    
    if (this.lookupTables.has(addressStr)) {
      return this.lookupTables.get(addressStr)!;
    }

    try {
      const lookupTableAccount = await this.connection.getAddressLookupTable(address);
      
      if (lookupTableAccount.value) {
        this.lookupTables.set(addressStr, lookupTableAccount.value);
        return lookupTableAccount.value;
      }
    } catch (error) {
      console.error('Error fetching lookup table:', error);
    }

    return null;
  }

  /**
   * Create a versioned transaction with Address Lookup Tables
   * This allows batching multiple instructions into a single transaction
   */
  async createVersionedTransaction(
    instructions: TransactionInstruction[],
    payer: PublicKey,
    lookupTableAddresses?: PublicKey[]
  ): Promise<VersionedTransaction> {
    const lookupTables: AddressLookupTableAccount[] = [];

    if (lookupTableAddresses) {
      for (const address of lookupTableAddresses) {
        const table = await this.fetchLookupTable(address);
        if (table) {
          lookupTables.push(table);
        }
      }
    }

    const messageV0 = new TransactionMessage({
      payerKey: payer,
      recentBlockhash: (await this.connection.getLatestBlockhash()).blockhash,
      instructions,
    }).compileToV0Message(lookupTables);

    return new VersionedTransaction(messageV0);
  }

  /**
   * Batch multiple transactions into a single versioned transaction
   * This is useful for operations that need multiple instructions
   * (e.g., token creation + metadata + fee payment in one transaction)
   */
  async batchInstructions(
    instructions: TransactionInstruction[],
    payer: PublicKey,
    lookupTableAddresses?: PublicKey[]
  ): Promise<VersionedTransaction> {
    return this.createVersionedTransaction(instructions, payer, lookupTableAddresses);
  }

  /**
   * Get or create a common lookup table for the network
   * Many Solana programs use shared lookup tables
   */
  async getCommonLookupTables(network: 'mainnet-beta' | 'devnet' = 'mainnet-beta'): Promise<PublicKey[]> {
    const commonTables: PublicKey[] = [];

    try {
      // Common Address Lookup Tables for Solana programs
      // These are well-known lookup tables that reduce transaction size
      
      if (network === 'mainnet-beta') {
        // Mainnet lookup tables
        // Token Program lookup table (if available)
        // Metaplex Token Metadata lookup table
        // Jupiter common lookup tables (fetched from Jupiter API if needed)
        
        // Note: These addresses should be fetched dynamically or from a registry
        // For now, we'll try to fetch from known sources or use empty array
        // Jupiter provides lookup tables in their swap response, which we already use
        
        // Metaplex Token Metadata program doesn't have a standard public lookup table
        // But we can still use ALTs for token operations if available
      } else {
        // Devnet lookup tables (if any)
        // Devnet typically has fewer public lookup tables
      }
    } catch (error) {
      console.error('Error fetching common lookup tables:', error);
    }

    return commonTables;
  }
}

/**
 * Helper to create a single transaction with multiple instructions
 * Uses Address Lookup Tables when available for better efficiency
 * Automatically fetches common lookup tables if not provided
 */
export async function createBatchedTransaction(
  connection: Connection,
  instructions: TransactionInstruction[],
  payer: PublicKey,
  lookupTableAddresses?: PublicKey[],
  network?: 'mainnet-beta' | 'devnet'
): Promise<VersionedTransaction> {
  const batcher = new TransactionBatcher(connection);
  
  // If no lookup tables provided, try to get common ones
  let tables = lookupTableAddresses;
  if (!tables || tables.length === 0) {
    tables = await batcher.getCommonLookupTables(network || 'mainnet-beta');
  }
  
  return batcher.batchInstructions(instructions, payer, tables);
}


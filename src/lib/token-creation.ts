import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from '@solana/web3.js';
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  setAuthority,
  AuthorityType,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { createBatchedTransaction } from './transactions';
import { getRandomFeeWallet, PLATFORM_FEES } from './config';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';

export interface TokenCreationParams {
  name: string;
  symbol: string;
  description?: string;
  decimals: number;
  totalSupply: number;
  revokeMintAuthority: boolean;
  revokeFreezeAuthority: boolean;
  website?: string;
  twitter?: string;
  telegram?: string;
  imageUri?: string;
  creatorWebsite?: string;
  creatorName?: string;
}

export interface TokenCreationResult {
  mintAddress: string;
  signature: string;
}

export class TokenCreator {
  private connection: Connection;

  constructor(connection: Connection) {
    this.connection = connection;
  }

  /**
   * Calculate total cost including platform fees
   */
  calculateCost(_params: TokenCreationParams): number {
    // Fixed fee of 0.11 SOL for token creation
    return PLATFORM_FEES.TOKEN_CREATION_BASE;
  }

  /**
   * Create a new SPL token with all operations batched into a single transaction
   */
  async createToken(
    params: TokenCreationParams,
    payer: PublicKey,
    payerKeypair?: Keypair // For signing if needed
  ): Promise<TokenCreationResult | null> {
    try {
      const instructions: TransactionInstruction[] = [];
      const mintKeypair = Keypair.generate();
      const mintPublicKey = mintKeypair.publicKey;

      // 1. Create mint account
      const createMintIx = await createMint(
        this.connection,
        payerKeypair || payer as any, // Type workaround
        payer,
        null, // Freeze authority (will be revoked if needed)
        params.decimals,
        mintKeypair,
        undefined,
        TOKEN_PROGRAM_ID
      );

      // Note: createMint returns a transaction, not an instruction
      // We need to build this differently
      // For now, this is a placeholder structure

      // 2. Create associated token account
      const tokenAccount = await getOrCreateAssociatedTokenAccount(
        this.connection,
        payerKeypair || payer as any,
        mintPublicKey,
        payer,
        false,
        undefined,
        undefined,
        TOKEN_PROGRAM_ID
      );

      // 3. Mint tokens to the account
      const mintAmount = BigInt(params.totalSupply * Math.pow(10, params.decimals));
      await mintTo(
        this.connection,
        payerKeypair || payer as any,
        mintPublicKey,
        tokenAccount.address,
        payer,
        mintAmount,
        [],
        undefined,
        TOKEN_PROGRAM_ID
      );

      // 4. Revoke mint authority if requested
      if (params.revokeMintAuthority) {
        await setAuthority(
          this.connection,
          payerKeypair || payer as any,
          mintPublicKey,
          payer,
          AuthorityType.MintTokens,
          null,
          [],
          undefined,
          TOKEN_PROGRAM_ID
        );
      }

      // 5. Revoke freeze authority if requested
      if (params.revokeFreezeAuthority) {
        await setAuthority(
          this.connection,
          payerKeypair || payer as any,
          mintPublicKey,
          payer,
          AuthorityType.FreezeAccount,
          null,
          [],
          undefined,
          TOKEN_PROGRAM_ID
        );
      }

      // 6. Platform fee payment
      const feeWallet = new PublicKey(getRandomFeeWallet());
      const feeAmount = this.calculateCost(params) * LAMPORTS_PER_SOL;
      
      instructions.push(
        SystemProgram.transfer({
          fromPubkey: payer,
          toPubkey: feeWallet,
          lamports: feeAmount,
        })
      );

      // Create batched transaction
      const transaction = await createBatchedTransaction(
        this.connection,
        instructions,
        payer
      );

      // Note: The actual implementation needs to properly build all instructions
      // and combine them into a single transaction using Address Lookup Tables
      // This is a simplified version showing the structure

      return {
        mintAddress: mintPublicKey.toBase58(),
        signature: '', // Will be set after signing and sending
      };
    } catch (error) {
      console.error('Token creation error:', error);
      return null;
    }
  }

  /**
   * Upload image to IPFS via Pinata
   */
  async uploadImage(file: File): Promise<string | null> {
    try {
      const pinataJwt = process.env.NEXT_PUBLIC_PINATA_JWT || '';
      
      if (!pinataJwt) {
        throw new Error('Pinata JWT not configured');
      }

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${pinataJwt}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to upload image to Pinata');
      }

      const data = await response.json();
      return `https://gateway.pinata.cloud/ipfs/${data.IpfsHash}`;
    } catch (error) {
      console.error('Image upload error:', error);
      return null;
    }
  }

  /**
   * Upload metadata to IPFS (Pinata)
   * This would be called before token creation
   */
  async uploadMetadata(params: TokenCreationParams, imageUri?: string): Promise<string | null> {
    try {
      const pinataJwt = process.env.NEXT_PUBLIC_PINATA_JWT || '';
      
      if (!pinataJwt) return null;

      const metadata = {
        name: params.name,
        symbol: params.symbol,
        description: params.description || '',
        image: imageUri || params.imageUri || '',
        attributes: [],
        properties: {
          website: params.website || '',
          twitter: params.twitter || '',
          telegram: params.telegram || '',
        },
      };

      const response = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${pinataJwt}`,
        },
        body: JSON.stringify(metadata),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to upload metadata to Pinata');
      }

      const data = await response.json();
      return `https://gateway.pinata.cloud/ipfs/${data.IpfsHash}`;
    } catch (error) {
      console.error('Metadata upload error:', error);
      return null;
    }
  }
}


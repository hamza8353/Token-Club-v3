import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
  ComputeBudgetProgram,
} from '@solana/web3.js';
import {
  createInitializeMint2Instruction,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
  createSetAuthorityInstruction,
  TOKEN_PROGRAM_ID,
  MINT_SIZE,
  getMinimumBalanceForRentExemptMint,
  AuthorityType,
  getAccount,
  TokenAccountNotFoundError,
} from '@solana/spl-token';
import { PublicKey } from '@solana/web3.js';

// Metaplex Token Metadata Program ID
// Address: metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s
const TOKEN_METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');

// TokenStandard enum values (from @metaplex-foundation/mpl-token-metadata)
// Since the package uses CommonJS exports that Vite can't resolve, we define the value directly
const TokenStandard = {
  NonFungible: 0,
  FungibleAsset: 1,
  Fungible: 2,
  NonFungibleEdition: 3,
  ProgrammableNonFungible: 4,
  ProgrammableNonFungibleEdition: 5,
} as const;

// Dynamic import for createCreateMetadataAccountV3Instruction
// Cache the function once loaded
let cachedCreateMetadataInstruction: any = null;

const getCreateMetadataInstruction = async () => {
  if (cachedCreateMetadataInstruction) {
    return cachedCreateMetadataInstruction;
  }
  // Use dynamic import from the main package - it should export everything
  try {
    const module = await import('@metaplex-foundation/mpl-token-metadata');
    cachedCreateMetadataInstruction = (module as any).createCreateMetadataAccountV3Instruction;
    if (!cachedCreateMetadataInstruction) {
      // Fallback: try the generated path
      const generatedModule = await import('@metaplex-foundation/mpl-token-metadata/dist/src/generated/instructions/CreateMetadataAccountV3');
      cachedCreateMetadataInstruction = (generatedModule as any).createCreateMetadataAccountV3Instruction || (generatedModule as any).default?.createCreateMetadataAccountV3Instruction;
    }
    if (!cachedCreateMetadataInstruction) {
      throw new Error('Failed to load createCreateMetadataAccountV3Instruction from Metaplex package');
    }
  } catch (error) {
    console.error('Error loading Metaplex instruction:', error);
    throw new Error(`Failed to load createCreateMetadataAccountV3Instruction: ${error}`);
  }
  return cachedCreateMetadataInstruction;
};

import { getRandomFeeWallet, PLATFORM_FEES } from './config';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { TokenCreationParams } from './token-creation';
import { Buffer } from 'buffer';

export class FullTokenCreator {
  private connection: Connection;

  constructor(connection: Connection) {
    this.connection = connection;
  }

  calculateCost(params: TokenCreationParams): number {
    // Base fee of 0.11 SOL for token creation
    let fee = PLATFORM_FEES.TOKEN_CREATION_BASE;
    
    // Add fees for authority revocations
    if (params.revokeMintAuthority) {
      fee += PLATFORM_FEES.REVOKE_MINT_AUTHORITY;
    }
    if (params.revokeFreezeAuthority) {
      fee += PLATFORM_FEES.REVOKE_FREEZE_AUTHORITY;
    }
    
    // Add 0.105 SOL if any advanced feature is used (only if different from defaults)
    // Defaults are 'tokenclub.fun' and 'tokenclub', so only charge if different
    const hasAdvancedFeatures = (params.creatorWebsite && params.creatorWebsite !== 'tokenclub.fun') || 
                                 (params.creatorName && params.creatorName !== 'tokenclub');
    if (hasAdvancedFeatures) {
      fee += PLATFORM_FEES.ADVANCED_FEATURES;
    }
    
    return fee;
  }

  /**
   * Create a new SPL token with metadata - full implementation
   */
  async createTokenWithMetadata(
    params: TokenCreationParams,
    payer: PublicKey,
    metadataUri: string
  ): Promise<{ instructions: TransactionInstruction[]; mintKeypair: Keypair } | null> {
    try {
      const instructions: TransactionInstruction[] = [];
      const mintKeypair = Keypair.generate();
      const mintPublicKey = mintKeypair.publicKey;

      // Add compute budget instructions for priority fees (like their implementation)
      instructions.push(
        ComputeBudgetProgram.setComputeUnitLimit({ units: 800000 }),
        ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 10000 })
      );

      // Get rent for mint account
      const mintRent = await getMinimumBalanceForRentExemptMint(this.connection);

      // 1. Create mint account instruction
      const createMintAccountIx = SystemProgram.createAccount({
        fromPubkey: payer,
        newAccountPubkey: mintPublicKey,
        space: MINT_SIZE,
        lamports: mintRent,
        programId: TOKEN_PROGRAM_ID,
      });
      instructions.push(createMintAccountIx);

      // 2. Initialize mint instruction
      // If we want to revoke freeze authority, we need to set it to payer first, then revoke it later
      // If we don't want to revoke it, we can set it to null (no freeze authority) or payer (keep it)
      // For simplicity, if revokeFreezeAuthority is true, set it to payer so we can revoke it
      // If false or undefined, set it to null (no freeze authority by default)
      const freezeAuthority = params.revokeFreezeAuthority ? payer : null;
      const initMintIx = createInitializeMint2Instruction(
        mintPublicKey,
        params.decimals,
        payer, // mint authority
        freezeAuthority, // freeze authority - set to payer if we'll revoke it, otherwise null
        TOKEN_PROGRAM_ID
      );
      instructions.push(initMintIx);

      // 3. Create associated token account (check if exists first)
      const tokenAccount = getAssociatedTokenAddressSync(
        mintPublicKey,
        payer,
        false,
        TOKEN_PROGRAM_ID
      );

      // Check if ATA already exists
      try {
        await getAccount(this.connection, tokenAccount, 'confirmed', TOKEN_PROGRAM_ID);
      } catch (ataErr: any) {
        if (ataErr instanceof TokenAccountNotFoundError || 
            (ataErr?.message && ataErr.message.includes('could not find'))) {
          // ATA doesn't exist, create it
          const createATAIx = createAssociatedTokenAccountInstruction(
            payer,
            tokenAccount,
            payer,
            mintPublicKey,
            TOKEN_PROGRAM_ID
          );
          instructions.push(createATAIx);
        } else {
          throw ataErr;
        }
      }

      // 4. Mint tokens
      const mintAmount = BigInt(Math.floor(params.totalSupply * Math.pow(10, params.decimals)));
      const mintToIx = createMintToInstruction(
        mintPublicKey,
        tokenAccount,
        payer,
        mintAmount,
        [],
        TOKEN_PROGRAM_ID
      );
      instructions.push(mintToIx);

      // 5. Create metadata account
      // Validate string lengths (Metaplex requirements)
      const nameBytes = Buffer.from(params.name);
      const symbolBytes = Buffer.from(params.symbol);
      const uriBytes = Buffer.from(metadataUri);

      if (nameBytes.length > 32) {
        throw new Error(`Token name must be 32 bytes or less. Current length: ${nameBytes.length} bytes.`);
      }
      if (symbolBytes.length > 10) {
        throw new Error(`Token symbol must be 10 bytes or less. Current length: ${symbolBytes.length} bytes.`);
      }
      if (uriBytes.length > 200) {
        throw new Error(`Metadata URI must be 200 bytes or less. Current length: ${uriBytes.length} bytes.`);
      }

      const [metadataPDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('metadata'),
          TOKEN_METADATA_PROGRAM_ID.toBuffer(),
          mintPublicKey.toBuffer(),
        ],
        TOKEN_METADATA_PROGRAM_ID
      );

      const createMetadataInstructionFn = await getCreateMetadataInstruction();
      const createMetadataIx = createMetadataInstructionFn(
        {
          metadata: metadataPDA,
          mint: mintPublicKey,
          mintAuthority: payer,
          payer,
          updateAuthority: payer,
        },
        {
          createMetadataAccountArgsV3: {
            data: {
              name: params.name,
              symbol: params.symbol,
              uri: metadataUri,
              sellerFeeBasisPoints: 0,
              creators: null,
              collection: null,
              uses: null,
            },
            isMutable: true,
            collectionDetails: null,
            tokenStandard: TokenStandard.Fungible,
            programmableConfig: null,
          },
        }
      );
      instructions.push(createMetadataIx);

      // 6. Revoke mint authority if requested
      if (params.revokeMintAuthority) {
        const revokeMintIx = createSetAuthorityInstruction(
          mintPublicKey,
          payer,
          AuthorityType.MintAccount,
          null,
          [],
          TOKEN_PROGRAM_ID
        );
        instructions.push(revokeMintIx);
      }

      // 7. Revoke freeze authority if requested
      if (params.revokeFreezeAuthority) {
        const revokeFreezeIx = createSetAuthorityInstruction(
          mintPublicKey,
          payer,
          AuthorityType.FreezeAccount,
          null,
          [],
          TOKEN_PROGRAM_ID
        );
        instructions.push(revokeFreezeIx);
      }

      // 8. Platform fee payment
      const feeWallet = new PublicKey(getRandomFeeWallet());
      const feeAmount = this.calculateCost(params) * LAMPORTS_PER_SOL;
      instructions.push(
        SystemProgram.transfer({
          fromPubkey: payer,
          toPubkey: feeWallet,
          lamports: feeAmount,
        })
      );

      return { instructions, mintKeypair };
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
      const pinataJwt = import.meta.env.VITE_PINATA_JWT;
      
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
        const error = await response.json().catch(() => ({ error: 'Failed to upload image' }));
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
   */
  async uploadMetadata(params: TokenCreationParams, imageUri?: string): Promise<string | null> {
    try {
      const pinataJwt = import.meta.env.VITE_PINATA_JWT;
      
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
        const error = await response.json().catch(() => ({ error: 'Failed to upload metadata' }));
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

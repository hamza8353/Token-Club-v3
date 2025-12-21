import BN from 'bn.js';
import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
  ComputeBudgetProgram,
  Keypair,
} from '@solana/web3.js';
import {
  getMint,
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  getAccount,
  TokenInvalidAccountOwnerError,
  createTransferInstruction,
} from '@solana/spl-token';
import {
  CpAmm,
  getOrCreateATAInstruction,
  getSqrtPriceFromPrice,
  derivePoolAddress,
  derivePositionAddress,
  derivePositionNftAccount,
  getCurrentPoint,
} from '@meteora-ag/cp-amm-sdk';
import { getPlatformFeeWallet, PLATFORM_FEES } from './config';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';

const ZERO = new BN(0);
const DEFAULT_COMMITMENT = 'confirmed';

// Meteora DAMM v2 Program ID
export const METEORA_DAMM_V2_PROGRAM_ID = new PublicKey(
  'LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo'
);

// Default Meteora config (public config)
const METEORA_DEFAULT_CONFIG = new PublicKey('2QdhepnKRTLjjSqPL1PtKNwqrUkoLee5Gqs8bvZhRdMv');

interface TokenMetadata {
  mint: PublicKey;
  programId: PublicKey;
  decimals: number;
  mintInfo: any;
  symbol?: string;
  name?: string;
}

export class MeteoraLiquidityManager {
  private connection: Connection;
  private cpAmm: CpAmm;

  constructor(connection: Connection) {
    this.connection = connection;
    this.cpAmm = new CpAmm(connection);
  }

  private async fetchMintInfo(mint: PublicKey): Promise<TokenMetadata> {
    try {
      const info = await getMint(this.connection, mint, DEFAULT_COMMITMENT, TOKEN_PROGRAM_ID);
      return {
        mint,
        mintInfo: info,
        decimals: info.decimals,
        programId: TOKEN_PROGRAM_ID,
      };
    } catch (error) {
      if (error instanceof TokenInvalidAccountOwnerError) {
        try {
          const token2022Info = await getMint(
            this.connection,
            mint,
            DEFAULT_COMMITMENT,
            TOKEN_2022_PROGRAM_ID
          );
          return {
            mint,
            mintInfo: token2022Info,
            decimals: token2022Info.decimals,
            programId: TOKEN_2022_PROGRAM_ID,
          };
        } catch (token2022Error) {
          throw new Error(`Mint ${mint.toBase58()} does not exist or uses unsupported token program`);
        }
      }
      throw error;
    }
  }

  private uiAmountToBN(amount: number | string, decimals: number): BN {
    const value = typeof amount === 'number' ? amount.toString() : amount;
    const [integer, fraction = ''] = value.split('.');
    const fractionPadded = (fraction + '0'.repeat(decimals)).slice(0, decimals);
    const normalized = `${integer.replace(/[^0-9]/g, '') || '0'}${fractionPadded}`.replace(/^0+/, '') || '0';
    return new BN(normalized);
  }

  private bnToUiAmount(amount: BN, decimals: number): string {
    const divisor = new BN(10).pow(new BN(decimals));
    const quotient = amount.div(divisor);
    const remainder = amount.mod(divisor);
    if (remainder.isZero()) {
      return quotient.toString();
    }
    const remainderStr = remainder.toString().padStart(decimals, '0');
    const trimmed = remainderStr.replace(/0+$/, '');
    return `${quotient.toString()}.${trimmed}`;
  }

  private buildComputeBudgetIxs(units: number = 350000, priorityFee: number = 10000): TransactionInstruction[] {
    const instructions: TransactionInstruction[] = [];
    if (units > 0) {
      instructions.push(
        ComputeBudgetProgram.setComputeUnitLimit({ units })
      );
    }
    if (priorityFee > 0) {
      instructions.push(
        ComputeBudgetProgram.setComputeUnitPrice({ microLamports: priorityFee })
      );
    }
    return instructions;
  }

  /**
   * Create a new Meteora DAMM v2 liquidity pool
   */
  async createPool(
    baseTokenMint: string,
    quoteTokenMint: string,
    baseAmount: number,
    quoteAmount: number,
    payer: PublicKey,
    lockLiquidity: boolean = false
  ): Promise<{ instructions: TransactionInstruction[]; signers: Keypair[]; poolAddress: string; positionNft: Keypair }> {
    const instructions: TransactionInstruction[] = [];
    const signers: Keypair[] = [];

    // Fetch token metadata
    const [baseMeta, quoteMeta] = await Promise.all([
      this.fetchMintInfo(new PublicKey(baseTokenMint)),
      this.fetchMintInfo(new PublicKey(quoteTokenMint)),
    ]);

    const baseAmountLamports = this.uiAmountToBN(baseAmount, baseMeta.decimals);
    const quoteAmountLamports = this.uiAmountToBN(quoteAmount, quoteMeta.decimals);

    if (baseAmountLamports.lte(ZERO) || quoteAmountLamports.lte(ZERO)) {
      throw new Error('Token amounts must be greater than zero');
    }

    // Calculate initial price
    const initPrice = quoteAmount / baseAmount;
    const initSqrtPrice = getSqrtPriceFromPrice(
      initPrice.toString(),
      baseMeta.decimals,
      quoteMeta.decimals
    );

    // Get config
    const configs = await this.cpAmm.getAllConfigs();
    const config = configs?.find((cfg) => 
      cfg?.account?.poolCreatorAuthority?.equals?.(new PublicKey('11111111111111111111111111111111'))
    ) || configs?.[0];

    if (!config) {
      throw new Error('Unable to resolve Meteora config');
    }

    const configPk = config.publicKey;
    const configState = await this.cpAmm.fetchConfigState(configPk);

    // Derive pool address using SDK
    const poolAddress = derivePoolAddress(
      configPk,
      baseMeta.mint,
      quoteMeta.mint
    );

    // Check if pool already exists
    const existingPool = await this.connection.getAccountInfo(poolAddress);
    if (existingPool) {
      throw new Error('A Meteora pool already exists for this token pair. Please add liquidity instead.');
    }

    // Get deposit quote
    const depositQuote = this.cpAmm.getDepositQuote({
      inAmount: baseAmountLamports,
      isTokenA: true,
      minSqrtPrice: configState.sqrtMinPrice,
      maxSqrtPrice: configState.sqrtMaxPrice,
      sqrtPrice: initSqrtPrice,
      inputTokenInfo: { mint: baseMeta.mintInfo, currentEpoch: 0 },
      outputTokenInfo: { mint: quoteMeta.mintInfo, currentEpoch: 0 },
    });

    const { consumedInputAmount, outputAmount, liquidityDelta } = depositQuote;

    if (consumedInputAmount.gt(baseAmountLamports)) {
      throw new Error('Insufficient base token amount for desired price');
    }

    if (outputAmount.gt(quoteAmountLamports)) {
      throw new Error('Insufficient quote token amount for desired price');
    }

    // Get or create ATAs - only add instruction if account doesn't exist
    // Check if accounts exist first to avoid no-op transactions
    const [payerTokenA, payerTokenB] = await Promise.all([
      getOrCreateATAInstruction(
        this.connection,
        baseMeta.mint,
        payer,
        payer,
        false,
        baseMeta.programId
      ),
      getOrCreateATAInstruction(
        this.connection,
        quoteMeta.mint,
        payer,
        payer,
        false,
        quoteMeta.programId
      ),
    ]);

    // Only add ATA creation instructions if they're actually needed
    // Check if accounts exist to avoid no-op transactions
    try {
      await getAccount(this.connection, payerTokenA.ataPubkey);
      // Account exists, don't add creation instruction
    } catch (err) {
      // Account doesn't exist, add creation instruction
      if (payerTokenA.ix) {
        instructions.push(payerTokenA.ix);
      }
    }

    try {
      await getAccount(this.connection, payerTokenB.ataPubkey);
      // Account exists, don't add creation instruction
    } catch (err) {
      // Account doesn't exist, add creation instruction
      if (payerTokenB.ix) {
        instructions.push(payerTokenB.ix);
      }
    }

    // Generate position NFT
    const positionNft = Keypair.generate();
    signers.push(positionNft);

    // Build create pool transaction
    const builderTx = await this.cpAmm.createPool({
      creator: payer,
      payer,
      config: configPk,
      positionNft: positionNft.publicKey,
      tokenAMint: baseMeta.mint,
      tokenBMint: quoteMeta.mint,
      initSqrtPrice,
      liquidityDelta,
      tokenAAmount: consumedInputAmount,
      tokenBAmount: outputAmount,
      activationPoint: null,
      tokenAProgram: baseMeta.programId,
      tokenBProgram: quoteMeta.programId,
    });

    // Add compute budget instructions
    instructions.push(...this.buildComputeBudgetIxs());

    // Add builder instructions
    instructions.push(...builderTx.instructions);

    // Add platform fee payment
    const feeWallet = new PublicKey(getPlatformFeeWallet());
    const feeAmount = PLATFORM_FEES.LIQUIDITY_POOL_CREATION * LAMPORTS_PER_SOL;
    instructions.push(
      SystemProgram.transfer({
        fromPubkey: payer,
        toPubkey: feeWallet,
        lamports: feeAmount,
      })
    );

    return {
      instructions,
      signers,
      poolAddress: poolAddress.toBase58(),
      positionNft,
    };
  }

  /**
   * Add liquidity to an existing pool
   */
  async addLiquidity(
    poolAddress: string,
    positionMint: string,
    tokenAAmount: number | undefined,
    tokenBAmount: number | undefined,
    slippagePercent: number = 0.5,
    payer: PublicKey
  ): Promise<TransactionInstruction[]> {
    const instructions: TransactionInstruction[] = [];

    const poolPk = new PublicKey(poolAddress);
    const positionMintPk = new PublicKey(positionMint);

    // Derive position PDA using SDK
    const positionPk = derivePositionAddress(positionMintPk);

    // Fetch pool and position state
    const [poolState, positionState] = await Promise.all([
      this.cpAmm.fetchPoolState(poolPk),
      this.cpAmm.fetchPositionState(positionPk),
    ]);

    // Fetch token metadata
    const [tokenAInfo, tokenBInfo] = await Promise.all([
      this.fetchMintInfo(poolState.tokenAMint),
      this.fetchMintInfo(poolState.tokenBMint),
    ]);

    const desiredTokenA = tokenAAmount !== undefined
      ? this.uiAmountToBN(tokenAAmount, tokenAInfo.decimals)
      : ZERO;
    const desiredTokenB = tokenBAmount !== undefined
      ? this.uiAmountToBN(tokenBAmount, tokenBInfo.decimals)
      : ZERO;

    if (desiredTokenA.isZero() && desiredTokenB.isZero()) {
      throw new Error('Specify at least one token amount to add liquidity');
    }

    // Determine which token to use as input and get quote
    // If both amounts provided, use the one that results in amounts that don't exceed user's balance
    let isTokenAInput: boolean;
    let inputAmount: BN;
    let depositQuote: any;
    
    if (!desiredTokenA.isZero() && !desiredTokenB.isZero()) {
      // Both amounts provided - get quotes for both to determine which is safer
      const quoteA = this.cpAmm.getDepositQuote({
        inAmount: desiredTokenA,
        isTokenA: true,
        minSqrtPrice: poolState.sqrtMinPrice,
        maxSqrtPrice: poolState.sqrtMaxPrice,
        sqrtPrice: poolState.sqrtPrice,
        inputTokenInfo: { mint: tokenAInfo.mintInfo, currentEpoch: 0 },
        outputTokenInfo: { mint: tokenBInfo.mintInfo, currentEpoch: 0 },
      });
      
      const quoteB = this.cpAmm.getDepositQuote({
        inAmount: desiredTokenB,
        isTokenA: false,
        minSqrtPrice: poolState.sqrtMinPrice,
        maxSqrtPrice: poolState.sqrtMaxPrice,
        sqrtPrice: poolState.sqrtPrice,
        inputTokenInfo: { mint: tokenBInfo.mintInfo, currentEpoch: 0 },
        outputTokenInfo: { mint: tokenAInfo.mintInfo, currentEpoch: 0 },
      });
      
      // Use the quote that doesn't exceed user's amounts
      const quoteAValid = quoteA.outputAmount.lte(desiredTokenB);
      const quoteBValid = quoteB.outputAmount.lte(desiredTokenA);
      
      if (quoteAValid) {
        isTokenAInput = true;
        inputAmount = desiredTokenA;
        depositQuote = quoteA;
      } else if (quoteBValid) {
        isTokenAInput = false;
        inputAmount = desiredTokenB;
        depositQuote = quoteB;
      } else {
        // Neither is valid - use the one that's closer (less excess)
        const excessA = quoteA.outputAmount.sub(desiredTokenB);
        const excessB = quoteB.outputAmount.sub(desiredTokenA);
        if (excessA.lt(excessB)) {
          isTokenAInput = true;
          inputAmount = desiredTokenA;
          depositQuote = quoteA;
        } else {
          isTokenAInput = false;
          inputAmount = desiredTokenB;
          depositQuote = quoteB;
        }
      }
    } else {
      // Only one amount provided - use that as input
      isTokenAInput = desiredTokenA.gt(ZERO) || desiredTokenB.isZero();
      inputAmount = isTokenAInput ? desiredTokenA : desiredTokenB;
      
      if (inputAmount.isZero()) {
        throw new Error('Input amount must be greater than zero');
      }

      // Get deposit quote
      depositQuote = this.cpAmm.getDepositQuote({
        inAmount: inputAmount,
        isTokenA: isTokenAInput,
        minSqrtPrice: poolState.sqrtMinPrice,
        maxSqrtPrice: poolState.sqrtMaxPrice,
        sqrtPrice: poolState.sqrtPrice,
        inputTokenInfo: { 
          mint: (isTokenAInput ? tokenAInfo : tokenBInfo).mintInfo, 
          currentEpoch: 0 
        },
        outputTokenInfo: { 
          mint: (isTokenAInput ? tokenBInfo : tokenAInfo).mintInfo, 
          currentEpoch: 0 
        },
      });
    }

    // Extract contributions from quote - always use quote amounts to ensure correct ratio
    // This matches temp_repo behavior exactly
    const tokenAContribution = isTokenAInput
      ? depositQuote.consumedInputAmount
      : depositQuote.outputAmount;
    const tokenBContribution = isTokenAInput
      ? depositQuote.outputAmount
      : depositQuote.consumedInputAmount;

    // Validate that user's desired amounts are sufficient (match temp_repo validation)
    if (!desiredTokenA.isZero() && tokenAContribution.gt(desiredTokenA)) {
      throw new Error(`Pool requires ${this.bnToUiAmount(tokenAContribution, tokenAInfo.decimals)} token A, but you provided ${tokenAAmount}`);
    }
    if (!desiredTokenB.isZero() && tokenBContribution.gt(desiredTokenB)) {
      throw new Error(`Pool requires ${this.bnToUiAmount(tokenBContribution, tokenBInfo.decimals)} token B, but you provided ${tokenBAmount}`);
    }

    // Apply slippage (increase for add liquidity - we're willing to pay more)
    // Slippage is applied as a percentage increase to allow for price movement
    const slippageBps = Math.round(slippagePercent * 100);
    const slippageDeltaA = tokenAContribution.mul(new BN(slippageBps)).div(new BN(10000));
    const slippageDeltaB = tokenBContribution.mul(new BN(slippageBps)).div(new BN(10000));
    const maxTokenA = tokenAContribution.add(slippageDeltaA);
    const maxTokenB = tokenBContribution.add(slippageDeltaB);

    // Ensure ATAs exist
    const [tokenAAtaInfo, tokenBAtaInfo] = await Promise.all([
      getOrCreateATAInstruction(
        this.connection,
        poolState.tokenAMint,
        payer,
        payer,
        false,
        tokenAInfo.programId
      ),
      getOrCreateATAInstruction(
        this.connection,
        poolState.tokenBMint,
        payer,
        payer,
        false,
        tokenBInfo.programId
      ),
    ]);

    if (tokenAAtaInfo.ix) {
      instructions.push(tokenAAtaInfo.ix);
    }
    if (tokenBAtaInfo.ix) {
      instructions.push(tokenBAtaInfo.ix);
    }

    // Derive position NFT account using SDK
    const positionNftAccount = derivePositionNftAccount(positionMintPk);

    // Build add liquidity transaction
    const builderTx = await this.cpAmm.addLiquidity({
      owner: payer,
      position: positionPk,
      pool: poolPk,
      positionNftAccount,
      liquidityDelta: depositQuote.liquidityDelta,
      maxAmountTokenA: maxTokenA,
      maxAmountTokenB: maxTokenB,
      tokenAAmountThreshold: maxTokenA,
      tokenBAmountThreshold: maxTokenB,
      tokenAMint: poolState.tokenAMint,
      tokenBMint: poolState.tokenBMint,
      tokenAVault: poolState.tokenAVault,
      tokenBVault: poolState.tokenBVault,
      tokenAProgram: tokenAInfo.programId,
      tokenBProgram: tokenBInfo.programId,
    });

    // Add compute budget instructions
    instructions.push(...this.buildComputeBudgetIxs());

    // Add builder instructions
    instructions.push(...builderTx.instructions);

    // Add platform fee payment
    const feeWallet = new PublicKey(getPlatformFeeWallet());
    const feeAmount = PLATFORM_FEES.LIQUIDITY_ADD * LAMPORTS_PER_SOL;
    instructions.push(
      SystemProgram.transfer({
        fromPubkey: payer,
        toPubkey: feeWallet,
        lamports: feeAmount,
      })
    );

    return instructions;
  }

  /**
   * Remove liquidity from a pool
   */
  async removeLiquidity(
    poolAddress: string,
    positionMint: string,
    percentage: number,
    slippagePercent: number = 0.5,
    payer: PublicKey
  ): Promise<TransactionInstruction[]> {
    const instructions: TransactionInstruction[] = [];

    const poolPk = new PublicKey(poolAddress);
    const positionMintPk = new PublicKey(positionMint);

    // Derive position PDA using SDK
    const positionPk = derivePositionAddress(positionMintPk);

    // Fetch pool and position state
    const [poolState, positionState] = await Promise.all([
      this.cpAmm.fetchPoolState(poolPk),
      this.cpAmm.fetchPositionState(positionPk),
    ]);

    // Calculate liquidity to remove
    // percentage is 0-1 (e.g., 0.5 for 50%, 1.0 for 100%)
    // Convert to basis points (0-10000) for calculation
    const percentageBps = Math.min(Math.max(percentage, 0), 1); // Clamp between 0 and 1
    const scale = new BN(10000);
    const percentageBN = new BN(Math.round(percentageBps * 10000));
    const liquidityToRemove = positionState.unlockedLiquidity.mul(percentageBN).div(scale);

    if (liquidityToRemove.lte(ZERO)) {
      throw new Error('Nothing to remove from this position');
    }

    // Fetch token metadata
    const [tokenAInfo, tokenBInfo] = await Promise.all([
      this.fetchMintInfo(poolState.tokenAMint),
      this.fetchMintInfo(poolState.tokenBMint),
    ]);

    // Get withdraw quote
    const withdrawQuote = this.cpAmm.getWithdrawQuote({
      liquidityDelta: liquidityToRemove,
      minSqrtPrice: poolState.sqrtMinPrice,
      maxSqrtPrice: poolState.sqrtMaxPrice,
      sqrtPrice: poolState.sqrtPrice,
      tokenATokenInfo: { mint: tokenAInfo.mintInfo, currentEpoch: 0 },
      tokenBTokenInfo: { mint: tokenBInfo.mintInfo, currentEpoch: 0 },
    });

    if (!withdrawQuote || !withdrawQuote.outAmountA || !withdrawQuote.outAmountB) {
      throw new Error('Failed to get withdraw quote');
    }

    // Apply slippage
    const slippageBps = Math.round(slippagePercent * 100);
    const slippageDeltaA = withdrawQuote.outAmountA.mul(new BN(slippageBps)).div(new BN(10000));
    const slippageDeltaB = withdrawQuote.outAmountB.mul(new BN(slippageBps)).div(new BN(10000));
    const minTokenA = withdrawQuote.outAmountA.sub(slippageDeltaA);
    const minTokenB = withdrawQuote.outAmountB.sub(slippageDeltaB);

    // Ensure ATAs exist
    const [tokenAAtaInfo, tokenBAtaInfo] = await Promise.all([
      getOrCreateATAInstruction(
        this.connection,
        poolState.tokenAMint,
        payer,
        payer,
        false,
        tokenAInfo.programId
      ),
      getOrCreateATAInstruction(
        this.connection,
        poolState.tokenBMint,
        payer,
        payer,
        false,
        tokenBInfo.programId
      ),
    ]);

    if (tokenAAtaInfo.ix) {
      instructions.push(tokenAAtaInfo.ix);
    }
    if (tokenBAtaInfo.ix) {
      instructions.push(tokenBAtaInfo.ix);
    }

    // Derive position NFT account using SDK
    const positionNftAccount = derivePositionNftAccount(positionMintPk);

    // Get vestings for the position - SDK expects an array, not undefined
    let vestingAccounts: any[] = [];
    try {
      const vestings = await this.cpAmm.getAllVestingsByPosition(positionPk);
      if (vestings && Array.isArray(vestings)) {
        vestingAccounts = vestings.map(({ publicKey, account }) => ({
          account: publicKey,
          vestingState: account,
        }));
      }
    } catch (err) {
      // No vestings or error fetching, use empty array
      // Could not fetch vestings (not logged for security)
    }

    // Get current point for the pool - required by SDK
    const currentPoint = await getCurrentPoint(this.connection, poolState.activationType);

    // Build remove liquidity transaction - always pass vestings as array (even if empty)
    const builderTx = await this.cpAmm.removeLiquidity({
      owner: payer,
      position: positionPk,
      pool: poolPk,
      positionNftAccount,
      liquidityDelta: liquidityToRemove,
      tokenAAmountThreshold: minTokenA,
      tokenBAmountThreshold: minTokenB,
      tokenAMint: poolState.tokenAMint,
      tokenBMint: poolState.tokenBMint,
      tokenAVault: poolState.tokenAVault,
      tokenBVault: poolState.tokenBVault,
      tokenAProgram: tokenAInfo.programId,
      tokenBProgram: tokenBInfo.programId,
      vestings: vestingAccounts, // Always pass as array, even if empty
      currentPoint, // Always required
    });

    // Add compute budget instructions
    instructions.push(...this.buildComputeBudgetIxs());

    // Add builder instructions
    instructions.push(...builderTx.instructions);

    // Add platform fee payment
    const feeWallet = new PublicKey(getPlatformFeeWallet());
    const feeAmount = PLATFORM_FEES.LIQUIDITY_REMOVE * LAMPORTS_PER_SOL;
    instructions.push(
      SystemProgram.transfer({
        fromPubkey: payer,
        toPubkey: feeWallet,
        lamports: feeAmount,
      })
    );

    return instructions;
  }

  /**
   * Lock liquidity in a position (permanent or timed)
   * According to Meteora DAMM v2: https://github.com/MeteoraAg/damm-v2
   * We lock the position NFT, not token supply. The position NFT represents the LP position.
   */
  async lockLiquidity(
    poolAddress: string,
    positionMint: string,
    lockPercentage: number,
    permanent: boolean,
    payer: PublicKey
  ): Promise<TransactionInstruction[]> {
    const instructions: TransactionInstruction[] = [];

    const poolPk = new PublicKey(poolAddress);
    const positionMintPk = new PublicKey(positionMint);
    const positionPk = derivePositionAddress(positionMintPk);
    const positionNftAccount = derivePositionNftAccount(positionMintPk);

    // Locking position NFT (addresses not logged for security)

    // Fetch position state to verify the position exists and get unlocked liquidity
    const positionState = await this.cpAmm.fetchPositionState(positionPk);
    
    // Verify the position belongs to the correct pool
    if (!positionState.pool.equals(poolPk)) {
      throw new Error(`Position belongs to different pool. Expected ${poolAddress}, got ${positionState.pool.toBase58()}`);
    }

    // Get unlocked liquidity
    const unlockedLiquidityValue: BN | string | number | undefined = positionState.unlockedLiquidity;
    const unlockedLiquidity = unlockedLiquidityValue instanceof BN
      ? unlockedLiquidityValue
      : new BN(String(unlockedLiquidityValue || '0'));

    // Get permanent locked and vested liquidity for better error messages
    const permanentLockedValue: BN | string | number | undefined = positionState.permanentLockedLiquidity;
    const permanentLocked = permanentLockedValue instanceof BN
      ? permanentLockedValue
      : new BN(String(permanentLockedValue || '0'));
    
    const vestedLiquidityValue: BN | string | number | undefined = positionState.vestedLiquidity;
    const vestedLiquidity = vestedLiquidityValue instanceof BN
      ? vestedLiquidityValue
      : new BN(String(vestedLiquidityValue || '0'));

    // Position state (details not logged for security)

    if (unlockedLiquidity.lte(ZERO)) {
      // Check if position is already permanently locked
      if (permanentLocked.gt(ZERO)) {
        throw new Error('This position is already permanently locked. You can claim fees but cannot lock more liquidity.');
      }
      
      // Check if there's vested liquidity
      if (vestedLiquidity.gt(ZERO)) {
        throw new Error('This position has vested (timed) locked liquidity. Only unlocked liquidity can be permanently locked. Wait for the vesting period to complete or use a different position.');
      }
      
      throw new Error('Nothing to lock. This LP position has no unlocked liquidity. Add liquidity first or use a position with unlocked liquidity.');
    }

    if (permanent) {
      // Permanent lock - lock ALL unlocked liquidity (100%)
      // According to Meteora DAMM v2 docs: https://github.com/MeteoraAg/damm-v2
      // For permanent locks, we always lock ALL unlocked liquidity in the position
      // The position NFT represents the position, and permanent lock locks all liquidity
      // The lockPercentage parameter is ignored for permanent locks
      const liquidityToLock = unlockedLiquidity; // Always lock 100% for permanent locks
      
      // Permanent lock selected (details not logged for security)

      // Use .accountsPartial() to let SDK derive remaining accounts (event_authority, program)
      // This matches the Meteora test code pattern
      const builder = (this.cpAmm as any)._program.methods
        .permanentLockPosition(liquidityToLock)
        .accountsPartial({
          position: positionPk,
          positionNftAccount,
          pool: poolPk,
          owner: payer,
        });

      // Build transaction and extract instructions (same as temp_repo)
      // The SDK should auto-derive event_authority and program PDAs
      try {
        const builtTx = await builder.transaction();
        
        if (!builtTx) {
          throw new Error('Builder returned null transaction');
        }
        
        if (!builtTx.instructions || builtTx.instructions.length === 0) {
          console.error('[lockLiquidity] Transaction has no instructions. Transaction:', builtTx);
          console.error('[lockLiquidity] Position:', positionPk.toBase58());
          console.error('[lockLiquidity] Position NFT Account:', positionNftAccount.toBase58());
          console.error('[lockLiquidity] Pool:', poolPk.toBase58());
          console.error('[lockLiquidity] Owner:', payer.toBase58());
          console.error('[lockLiquidity] Liquidity to lock:', liquidityToLock.toString());
          
          // Try using .instruction() as fallback
          try {
            const instruction = await builder.instruction();
            if (instruction) {
              // Using .instruction() fallback (not logged for security)
              instructions.push(instruction);
            } else {
              throw new Error('Both .transaction() and .instruction() returned empty');
            }
          } catch (instructionErr: any) {
            throw new Error(`Failed to build lock instruction: ${instructionErr.message}`);
          }
        } else {
          // Built transaction (not logged for security)
          // Add lock instructions first
          instructions.push(...builtTx.instructions);
        }
      } catch (err: any) {
        console.error('[lockLiquidity] Error building transaction:', err);
        throw new Error(`Failed to build lock liquidity transaction: ${err.message}`);
      }
    } else {
      // Timed lock - for now, we'll use permanent lock as timed locks require vesting accounts
      // This can be extended later if needed
      throw new Error('Timed locks are not yet implemented. Use permanent lock for now.');
    }

    // Add compute budget instructions FIRST (must be at beginning of transaction)
    // This matches the temp_repo pattern exactly
    const computeIxs = this.buildComputeBudgetIxs(350000, 10000);
    
    // Add platform fee AFTER compute budget but before lock instruction
    // This ensures everything is in one transaction
    const feeWallet = new PublicKey(getPlatformFeeWallet());
    const feeAmount = Math.floor(PLATFORM_FEES.LOCK_LIQUIDITY * LAMPORTS_PER_SOL);
    
    // Build final instruction array: compute budget -> fee -> lock instruction
    const finalInstructions: TransactionInstruction[] = [];
    finalInstructions.push(...computeIxs);
    finalInstructions.push(
      SystemProgram.transfer({
        fromPubkey: payer,
        toPubkey: feeWallet,
        lamports: feeAmount,
      })
    );
    finalInstructions.push(...instructions);
    
    // Lock liquidity instructions assembled (not logged for security)

    return finalInstructions;
  }

  /**
   * Claim position fees from a locked position
   * According to Meteora DAMM v2: https://github.com/MeteoraAg/damm-v2
   * Permanently locked positions can still claim transfer fees
   */
  async claimPositionFee(
    poolAddress: string,
    positionMint: string,
    payer: PublicKey
  ): Promise<TransactionInstruction[]> {
    const instructions: TransactionInstruction[] = [];

    const poolPk = new PublicKey(poolAddress);
    const positionMintPk = new PublicKey(positionMint);
    const positionPk = derivePositionAddress(positionMintPk);
    const positionNftAccount = derivePositionNftAccount(positionMintPk);

    // Claiming fees for position NFT (addresses not logged for security)

    // Fetch position and pool state
    const [positionState, poolState] = await Promise.all([
      this.cpAmm.fetchPositionState(positionPk),
      this.cpAmm.fetchPoolState(poolPk),
    ]);

    // Verify the position belongs to the correct pool
    if (!positionState.pool.equals(poolPk)) {
      throw new Error(`Position belongs to different pool. Expected ${poolAddress}, got ${positionState.pool.toBase58()}`);
    }

    // Get token mints and programs
    const tokenAMint = poolState.tokenAMint;
    const tokenBMint = poolState.tokenBMint;
    // Meteora pool state doesn't expose tokenAProgram/tokenBProgram directly
    // Default to TOKEN_PROGRAM_ID (most pools use standard token program)
    const tokenAProgram = TOKEN_PROGRAM_ID;
    const tokenBProgram = TOKEN_PROGRAM_ID;

    // Get or create user's token accounts (ATAs)
    const [userTokenAAccount, userTokenBAccount] = await Promise.all([
      getOrCreateATAInstruction(
        this.connection,
        tokenAMint,
        payer,
        payer,
        false,
        tokenAProgram
      ),
      getOrCreateATAInstruction(
        this.connection,
        tokenBMint,
        payer,
        payer,
        false,
        tokenBProgram
      ),
    ]);

    // Add ATA creation instructions if needed
    if (userTokenAAccount.ix) {
      instructions.push(userTokenAAccount.ix);
    }
    if (userTokenBAccount.ix) {
      instructions.push(userTokenBAccount.ix);
    }

    // Pool authority (fixed address from Meteora DAMM v2)
    const POOL_AUTHORITY = new PublicKey('HLnpSz9h2S4hiLQ43rnSD9XkcUThA7B8hQMKmDaiTLcC');

    // Build compute budget instructions
    const computeIxs = this.buildComputeBudgetIxs(350000, 10000);
    instructions.push(...computeIxs);

    // Build claim position fee instruction
    // The SDK validates accounts strictly - use .accounts() to provide all accounts explicitly
    // The SDK converts IDL snake_case to camelCase: token_a_account -> tokenAAccount
    const builder = (this.cpAmm as any)._program.methods
      .claimPositionFee()
      .accounts({
        poolAuthority: POOL_AUTHORITY,
        pool: poolPk,
        position: positionPk,
        tokenAAccount: userTokenAAccount.ataPubkey,
        tokenBAccount: userTokenBAccount.ataPubkey,
        tokenAVault: poolState.tokenAVault,
        tokenBVault: poolState.tokenBVault,
        tokenAMint,
        tokenBMint,
        positionNftAccount,
        owner: payer,
        tokenAProgram,
        tokenBProgram,
      });

    try {
      const builtTx = await builder.transaction();
      
      if (!builtTx) {
        throw new Error('Builder returned null transaction');
      }
      
      if (!builtTx.instructions || builtTx.instructions.length === 0) {
        throw new Error('Transaction has no instructions');
      }
      
      // Claim fees built transaction (not logged for security)
      instructions.push(...builtTx.instructions);
    } catch (err: any) {
      console.error('[claimPositionFee] Error with .accounts(), trying .accountsPartial()...', err.message);
      
      // If .accounts() fails, try .accountsPartial() which lets SDK derive remaining accounts
      try {
        const builderPartial = (this.cpAmm as any)._program.methods
          .claimPositionFee()
          .accountsPartial({
            pool: poolPk,
            position: positionPk,
            tokenAAccount: userTokenAAccount.ataPubkey,
            tokenBAccount: userTokenBAccount.ataPubkey,
            owner: payer,
          });
        
        const builtTxPartial = await builderPartial.transaction();
        
        if (!builtTxPartial || !builtTxPartial.instructions || builtTxPartial.instructions.length === 0) {
          throw new Error('Partial accounts also failed');
        }
        
        // Claim fees success with .accountsPartial() (not logged for security)
        instructions.push(...builtTxPartial.instructions);
      } catch (partialErr: any) {
        console.error('[claimPositionFee] Both .accounts() and .accountsPartial() failed');
        console.error('[claimPositionFee] Account details:', {
          tokenAAccount: userTokenAAccount.ataPubkey.toBase58(),
          tokenBAccount: userTokenBAccount.ataPubkey.toBase58(),
          tokenAVault: poolState.tokenAVault.toBase58(),
          tokenBVault: poolState.tokenBVault.toBase58(),
          positionNftAccount: positionNftAccount.toBase58(),
        });
        throw new Error(`Failed to build claim position fee transaction: ${err.message}`);
      }
    }

    // Add platform fee
    const feeWallet = new PublicKey(getPlatformFeeWallet());
    const feeAmount = Math.floor(PLATFORM_FEES.CLAIM_FEES * LAMPORTS_PER_SOL);
    instructions.push(
      SystemProgram.transfer({
        fromPubkey: payer,
        toPubkey: feeWallet,
        lamports: feeAmount,
      })
    );
    
    // Claim fees instructions assembled (not logged for security)

    return instructions;
  }

  /**
   * Burn liquidity by transferring position NFT to dead address (incinerate)
   * This permanently removes the liquidity position
   */
  async burnLiquidity(
    poolAddress: string,
    positionMint: string,
    payer: PublicKey
  ): Promise<TransactionInstruction[]> {
    const instructions: TransactionInstruction[] = [];

    const poolPk = new PublicKey(poolAddress);
    const positionMintPk = new PublicKey(positionMint);
    const positionPk = derivePositionAddress(positionMintPk);

    // Verify position exists and belongs to the pool
    const positionState = await this.cpAmm.fetchPositionState(positionPk);
    if (!positionState.pool.equals(poolPk)) {
      throw new Error(`Position belongs to different pool. Expected ${poolAddress}, got ${positionState.pool.toBase58()}`);
    }

    // Dead address for burning NFTs
    const DEAD_ADDRESS = new PublicKey('11111111111111111111111111111111');

    // Get position NFT accounts
    const positionNftAccount = getAssociatedTokenAddressSync(
      positionMintPk,
      payer,
      false,
      TOKEN_PROGRAM_ID
    );

    const deadNftAccount = getAssociatedTokenAddressSync(
      positionMintPk,
      DEAD_ADDRESS,
      false,
      TOKEN_PROGRAM_ID
    );

    // Create transfer instruction to send NFT to dead address
    const transferIx = createTransferInstruction(
      positionNftAccount,
      deadNftAccount,
      payer,
      1, // Transfer 1 NFT
      [],
      TOKEN_PROGRAM_ID
    );

    instructions.push(transferIx);

    // Add compute budget instructions
    instructions.push(...this.buildComputeBudgetIxs());

    // Add platform fee payment
    const feeWallet = new PublicKey(getPlatformFeeWallet());
    const feeAmount = PLATFORM_FEES.LIQUIDITY_BURN * LAMPORTS_PER_SOL;
    instructions.push(
      SystemProgram.transfer({
        fromPubkey: payer,
        toPubkey: feeWallet,
        lamports: feeAmount,
      })
    );

    return instructions;
  }

  /**
   * Get user positions by pool address
   * This is a helper method to fetch all positions for a user in a specific pool
   * Note: This requires iterating through user's token accounts, which is expensive
   * It's better to use fetchWalletPools from fetch-wallet-pools.ts instead
   */
  async getUserPositionByPool(
    poolAddress: string,
    userPublicKey: PublicKey
  ): Promise<Array<{ position: PublicKey; account: any }>> {
    const poolPk = new PublicKey(poolAddress);

    // Note: The Meteora SDK doesn't have a direct getUserPositionByPool method
    // We need to fetch positions differently. For now, this is a placeholder
    // that would need to be implemented by iterating through user's token accounts
    // and checking which are position NFTs for this pool
    
    // This is a simplified version - in production, you'd want to:
    // 1. Get all token accounts for the user
    // 2. Filter for NFTs (balance = 1)
    // 3. Derive position PDA for each
    // 4. Check if position belongs to this pool
    
    // For now, return empty array - the UI should provide positionMint directly
    // Use fetchWalletPools from fetch-wallet-pools.ts instead
    // getUserPositionByPool is not fully implemented (not logged for security)
    return [];
  }
}


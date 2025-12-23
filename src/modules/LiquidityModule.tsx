import React, { useState, useEffect } from 'react';
import { Search, ShieldCheck, AlertTriangle, Lock, Coins } from 'lucide-react';
import { Input } from '../components/ui/Input';
import { Section } from '../components/ui/Section';
import { PrimaryButton } from '../components/ui/PrimaryButton';
import { Slider } from '../components/ui/Slider';
import { TabButton } from '../components/ui/TabButton';
import { useWallet } from '../contexts/WalletContext';
import { MeteoraLiquidityManager } from '../lib/meteora-full';
import { PublicKey } from '@solana/web3.js';
import { createBatchedTransaction } from '../lib/transactions';
import { useNetwork } from '../contexts/NetworkContext';
import { getLastCreatedMint } from '../lib/token-memory';
import { getMint, TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID, getAssociatedTokenAddressSync, getAccount } from '@solana/spl-token';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { savePoolData, getLastCreatedPool, getPoolsByBaseToken, getPoolData } from '../lib/pool-memory';
import SuccessModal, { SuccessModalResult } from '../components/ui/SuccessModal';
import { fetchWalletPools, WalletPool } from '../lib/fetch-wallet-pools';
import { formatNumberWithoutTrailingZeros, formatNumberWithCommas } from '../lib/number-format';
import { PLATFORM_FEES_DISPLAY } from '../lib/config';
import { getTokenMemory, TokenData } from '../lib/token-memory';
import { 
  trackLiquidityPoolInitialize, 
  trackLiquidityAdd, 
  trackLiquidityRemove, 
  trackLiquidityLock, 
  trackLiquidityClaim 
} from '../lib/analytics';

const LiquidityModule = React.memo(() => {
  const { connection, address, isConnected, signAndSendTransaction } = useWallet();
  const [mode, setMode] = useState<'init' | 'add' | 'remove' | 'lock'>('init');
  const [isProcessing, setIsProcessing] = useState(false);

  // Initialize pool state
  const [baseTokenMint, setBaseTokenMint] = useState('');
  const [baseAmount, setBaseAmount] = useState('');
  const [solAmount, setSolAmount] = useState('');
  const [tokenSupply, setTokenSupply] = useState<number | null>(null);
  const [tokenDecimals, setTokenDecimals] = useState<number>(9);
  const [isLoadingSupply, setIsLoadingSupply] = useState(false);
  const [solBalanceInit, setSolBalanceInit] = useState<number>(0);
  const [tokenBalanceInit, setTokenBalanceInit] = useState<number>(0);

  // Add liquidity state
  const [poolId, setPoolId] = useState('');
  const [tokenAmount, setTokenAmount] = useState('');
  const [solAmountAdd, setSolAmountAdd] = useState('');
  const [tokenBalance, setTokenBalance] = useState<number>(0);
  const [solBalance, setSolBalance] = useState<number>(0);
  const [isLoadingBalances, setIsLoadingBalances] = useState(false);

  // Remove liquidity state
  const [poolIdRemove, setPoolIdRemove] = useState('');
  const [removePercentage, setRemovePercentage] = useState(50);

  // Lock and Earn state
  const [poolIdLock, setPoolIdLock] = useState('');
  const [lockPercentage, setLockPercentage] = useState(100);
  const [permanentLock, setPermanentLock] = useState(false);
  const [poolIdClaim, setPoolIdClaim] = useState('');

  // Wallet pools state
  const [walletPools, setWalletPools] = useState<WalletPool[]>([]);
  const [isLoadingPools, setIsLoadingPools] = useState(false);

  // TokenClub-created tokens state (for Initialize Pool)
  const [tokenclubTokens, setTokenclubTokens] = useState<TokenData[]>([]);
  const [isLoadingTokens, setIsLoadingTokens] = useState(false);

  // Success modal state
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [modalStatus, setModalStatus] = useState<'progress' | 'success' | 'error'>('progress');
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalResult, setModalResult] = useState<SuccessModalResult | null>(null);
  const [currentStep, setCurrentStep] = useState(1);

  const { network } = useNetwork();
  const liquidityManager = new MeteoraLiquidityManager(connection);
  
  // Auto-fill base token mint from last created token or manage token
  useEffect(() => {
    if (!baseTokenMint) {
      // First check if there's a token to manage from Portfolio
      const manageToken = localStorage.getItem('tokenclub_manage_token');
      if (manageToken) {
        setBaseTokenMint(manageToken);
        // Clear it after using it
        localStorage.removeItem('tokenclub_manage_token');
        return;
      }
      
      // Fallback to last created token
      const lastMint = getLastCreatedMint();
      if (lastMint) {
        setBaseTokenMint(lastMint);
      }
    }
  }, [baseTokenMint]);

  // Also check for manage token when switching to init mode
  useEffect(() => {
    if (mode === 'init') {
      const manageToken = localStorage.getItem('tokenclub_manage_token');
      if (manageToken && manageToken !== baseTokenMint) {
        setBaseTokenMint(manageToken);
        localStorage.removeItem('tokenclub_manage_token');
      }
    }
  }, [mode, baseTokenMint]);

  // Load TokenClub-created tokens from localStorage (for Initialize Pool)
  useEffect(() => {
    if (mode !== 'init') {
      setTokenclubTokens([]);
      return;
    }

    setIsLoadingTokens(true);
    try {
      const tokenMemory = getTokenMemory();
      const tokens = Object.values(tokenMemory);
      setTokenclubTokens(tokens);
    } catch (error) {
      console.error('Error loading TokenClub tokens:', error);
      setTokenclubTokens([]);
    } finally {
      setIsLoadingTokens(false);
    }
  }, [mode]);

  // Fetch pools from wallet
  useEffect(() => {
    const loadWalletPools = async () => {
      if (!isConnected || !address || !connection) {
        setWalletPools([]);
        return;
      }

      setIsLoadingPools(true);
      try {
        // Loading wallet pools (address not logged for security)
        const pools = await fetchWalletPools(connection, new PublicKey(address));
        // Loaded pools (count only, no sensitive data logged)
        setWalletPools(pools);

        // Auto-fill pool address if available
        if (pools.length > 0) {
          // Prefer last created pool, otherwise use first available
          const lastPool = getLastCreatedPool();
          const selectedPool = lastPool 
            ? pools.find(p => p.poolAddress === lastPool) || pools[0]
            : pools[0];

          if (mode === 'add' && !poolId) {
            setPoolId(selectedPool.poolAddress);
          }
          if (mode === 'remove' && !poolIdRemove) {
            setPoolIdRemove(selectedPool.poolAddress);
          }
          if (mode === 'lock' && !poolIdLock) {
            setPoolIdLock(selectedPool.poolAddress);
          }
          if (mode === 'lock' && !poolIdClaim) {
            setPoolIdClaim(selectedPool.poolAddress);
          }
        } else {
          // Fallback to last created pool from memory
          if (mode === 'add' && !poolId) {
            const lastPool = getLastCreatedPool();
            if (lastPool) {
              setPoolId(lastPool);
            }
          }
          if (mode === 'remove' && !poolIdRemove) {
            const lastPool = getLastCreatedPool();
            if (lastPool) {
              setPoolIdRemove(lastPool);
            }
          }
          if (mode === 'lock' && !poolIdLock) {
            const lastPool = getLastCreatedPool();
            if (lastPool) {
              setPoolIdLock(lastPool);
            }
          }
          if (mode === 'lock' && !poolIdClaim) {
            const lastPool = getLastCreatedPool();
            if (lastPool) {
              setPoolIdClaim(lastPool);
            }
          }
        }
      } catch (error) {
        console.error('Error loading wallet pools:', error);
        setWalletPools([]);
      } finally {
        setIsLoadingPools(false);
      }
    };

    loadWalletPools();
  }, [isConnected, address, connection, mode]);

  // Fetch token supply when mint address changes (works on both devnet and mainnet)
  useEffect(() => {
    const fetchTokenSupply = async () => {
      if (!baseTokenMint || !connection) {
        setTokenSupply(null);
        return;
      }

      // Validate mint address format
      try {
        new PublicKey(baseTokenMint);
      } catch {
        setTokenSupply(null);
        return;
      }

      try {
        setIsLoadingSupply(true);
        const mintPubkey = new PublicKey(baseTokenMint);
        
        // Try TOKEN_PROGRAM_ID first (works on both devnet and mainnet)
        let mintInfo;
        try {
          mintInfo = await getMint(connection, mintPubkey, undefined, TOKEN_PROGRAM_ID);
        } catch {
          // Try TOKEN_2022_PROGRAM_ID (works on both devnet and mainnet)
          try {
            mintInfo = await getMint(connection, mintPubkey, undefined, TOKEN_2022_PROGRAM_ID);
          } catch (err) {
            // Token might not exist or invalid address
            setTokenSupply(null);
            setIsLoadingSupply(false);
            return;
          }
        }

        const supply = Number(mintInfo.supply);
        const decimals = mintInfo.decimals;
        const uiSupply = supply / Math.pow(10, decimals);
        
        setTokenSupply(uiSupply);
        setTokenDecimals(decimals);
      } catch (error) {
        console.error('Error fetching token supply:', error);
        setTokenSupply(null);
      } finally {
        setIsLoadingSupply(false);
      }
    };

    fetchTokenSupply();
  }, [baseTokenMint, connection]);

  // Fetch SOL balance for Initialize Pool
  useEffect(() => {
    const fetchSolBalance = async () => {
      if (!isConnected || !address || !connection || mode !== 'init') {
        setSolBalanceInit(0);
        return;
      }

      try {
        const publicKey = new PublicKey(address);
        const solBal = await connection.getBalance(publicKey);
        setSolBalanceInit(solBal / LAMPORTS_PER_SOL);
      } catch (error) {
        setSolBalanceInit(0);
      }
    };

    fetchSolBalance();
  }, [isConnected, address, connection, mode]);

  // Fetch token balance for Initialize Pool (works on both mainnet and devnet)
  useEffect(() => {
    const fetchTokenBalance = async () => {
      if (!isConnected || !address || !connection || mode !== 'init' || !baseTokenMint) {
        setTokenBalanceInit(0);
        return;
      }

      // Validate mint address format
      try {
        new PublicKey(baseTokenMint);
      } catch {
        setTokenBalanceInit(0);
        return;
      }

      try {
        const publicKey = new PublicKey(address);
        const mintPubkey = new PublicKey(baseTokenMint);
        
        // Try TOKEN_PROGRAM_ID first (works on both devnet and mainnet)
        let tokenAccount;
        try {
          tokenAccount = getAssociatedTokenAddressSync(mintPubkey, publicKey, false, TOKEN_PROGRAM_ID);
          const accountInfo = await getAccount(connection, tokenAccount);
          const mintInfo = await getMint(connection, mintPubkey, undefined, TOKEN_PROGRAM_ID);
          const tokenBal = Number(accountInfo.amount) / Math.pow(10, mintInfo.decimals);
          setTokenBalanceInit(tokenBal);
        } catch {
          // Try TOKEN_2022_PROGRAM_ID (works on both devnet and mainnet)
          try {
            tokenAccount = getAssociatedTokenAddressSync(mintPubkey, publicKey, false, TOKEN_2022_PROGRAM_ID);
            const accountInfo = await getAccount(connection, tokenAccount, undefined, TOKEN_2022_PROGRAM_ID);
            const mintInfo = await getMint(connection, mintPubkey, undefined, TOKEN_2022_PROGRAM_ID);
            const tokenBal = Number(accountInfo.amount) / Math.pow(10, mintInfo.decimals);
            setTokenBalanceInit(tokenBal);
          } catch (err) {
            // Token account doesn't exist or user doesn't have balance
            setTokenBalanceInit(0);
          }
        }
      } catch (error) {
        console.error('Error fetching token balance:', error);
        setTokenBalanceInit(0);
      }
    };

    fetchTokenBalance();
  }, [isConnected, address, connection, mode, baseTokenMint]);

  // Fetch balances for Add Liquidity
  useEffect(() => {
    const fetchBalances = async () => {
      if (!isConnected || !address || !connection || mode !== 'add') {
        setTokenBalance(0);
        setSolBalance(0);
        return;
      }

      setIsLoadingBalances(true);
      try {
        const publicKey = new PublicKey(address);
        
        // Fetch SOL balance
        const solBal = await connection.getBalance(publicKey);
        setSolBalance(solBal / LAMPORTS_PER_SOL);

        // Get token mint from selected pool or baseTokenMint
        let tokenMintToCheck = baseTokenMint;
        if (!tokenMintToCheck && poolId) {
          // Try to get from wallet pools
          const selectedPool = walletPools.find(p => p.poolAddress === poolId);
          if (selectedPool) {
            // Use tokenA (assuming it's the non-SOL token)
            const solMint = 'So11111111111111111111111111111111111111112';
            tokenMintToCheck = selectedPool.tokenAMint === solMint 
              ? selectedPool.tokenBMint 
              : selectedPool.tokenAMint;
          }
        }

        // Fetch token balance if we have a token mint
        if (tokenMintToCheck) {
          try {
            const mintPubkey = new PublicKey(tokenMintToCheck);
            const tokenAccount = getAssociatedTokenAddressSync(mintPubkey, publicKey);
            const accountInfo = await getAccount(connection, tokenAccount);
            const mintInfo = await getMint(connection, mintPubkey);
            const tokenBal = Number(accountInfo.amount) / Math.pow(10, mintInfo.decimals);
            setTokenBalance(tokenBal);
            setTokenDecimals(mintInfo.decimals);
          } catch (err) {
            // Token account doesn't exist or error
            setTokenBalance(0);
          }
        } else {
          setTokenBalance(0);
        }
      } catch (error) {
        console.error('Error fetching balances:', error);
        setTokenBalance(0);
        setSolBalance(0);
      } finally {
        setIsLoadingBalances(false);
      }
    };

    fetchBalances();
  }, [isConnected, address, connection, mode, baseTokenMint, poolId, walletPools]);

  // Handle percentage selection (works on both devnet and mainnet)
  const handleSupplyPercentage = (percentage: number) => {
    if (!tokenSupply || tokenSupply === 0) {
      alert('Please enter a valid token mint address and wait for supply to load');
      return;
    }
    
    if (!tokenDecimals || tokenDecimals < 0) {
      alert('Token decimals not available. Please wait for token info to load.');
      return;
    }
    
    const amount = (tokenSupply * percentage) / 100;
    // Show full precision in input field, but format for display
    setBaseAmount(amount.toFixed(tokenDecimals));
  };

  const handleInitializePool = async () => {
    if (!isConnected || !address || !baseTokenMint || !baseAmount || !solAmount) {
      alert('Please fill in all fields and connect your wallet');
      return;
    }

    setIsProcessing(true);
    setShowSuccessModal(true);
    setModalStatus('progress');
    setCurrentStep(1);
    setModalError(null);
    setModalResult(null);

    try {
      const payer = new PublicKey(address);
      const baseAmt = parseFloat(baseAmount);
      const solAmt = parseFloat(solAmount);

      setCurrentStep(2);
      // Create pool using Meteora SDK
      const result = await liquidityManager.createPool(
        baseTokenMint,
        'So11111111111111111111111111111111111111112', // SOL mint
        baseAmt,
        solAmt,
        payer,
        false // lockLiquidity
      );

      setCurrentStep(3);
      // Create batched transaction
      const transaction = await createBatchedTransaction(
        connection,
        result.instructions,
        payer,
        undefined,
        network
      );

      // Sign position NFT keypair
      transaction.sign(result.signers);

      if (!signAndSendTransaction) {
        throw new Error('Wallet not connected');
      }

      setCurrentStep(4);
      const signature = await signAndSendTransaction(transaction);
      
      if (signature) {
        // Save pool data to localStorage
        savePoolData({
          poolAddress: result.poolAddress,
          positionNftMint: result.positionNft.publicKey.toBase58(),
          baseTokenMint,
          quoteTokenMint: 'So11111111111111111111111111111111111111112',
          createdAt: Date.now(),
        });

        // Get explorer URL
        const explorerUrl = network === 'devnet'
          ? `https://solscan.io/tx/${signature}?cluster=devnet`
          : `https://solscan.io/tx/${signature}`;

        // Track pool initialization
        trackLiquidityPoolInitialize({
          poolAddress: result.poolAddress,
          baseTokenMint: baseTokenMint,
          baseAmount: baseAmt,
          solAmount: solAmt,
        });

        setModalStatus('success');
        setModalResult({
          title: 'Pool Initialized',
          subtitle: 'Your liquidity pool has been created successfully!',
          items: [
            {
              label: 'Pool Address',
              value: result.poolAddress,
              copyValue: result.poolAddress,
              explorerUrl: `https://solscan.io/account/${result.poolAddress}${network === 'devnet' ? '?cluster=devnet' : ''}`,
            },
            {
              label: 'Position Address',
              value: result.positionNft.publicKey.toBase58(),
              copyValue: result.positionNft.publicKey.toBase58(),
              explorerUrl: `https://solscan.io/account/${result.positionNft.publicKey.toBase58()}${network === 'devnet' ? '?cluster=devnet' : ''}`,
            },
            {
              label: 'Transaction Signature',
              value: signature,
              copyValue: signature,
              explorerUrl,
            },
          ],
          footer: 'Pool address has been saved and will auto-fill in future operations.',
        });

        // Reset form
        setBaseTokenMint('');
        setBaseAmount('');
        setSolAmount('');
      }
    } catch (error: any) {
      console.error('Initialize pool error:', error);
      setModalStatus('error');
      setModalError(error.message || 'Failed to initialize pool');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddLiquidity = async () => {
    if (!isConnected || !address || !poolId || (!tokenAmount && !solAmountAdd)) {
      alert('Please fill in pool ID and at least one token amount');
      return;
    }

    setIsProcessing(true);
    setShowSuccessModal(true);
    setModalStatus('progress');
    setCurrentStep(1);
    setModalError(null);
    setModalResult(null);

    try {
      const payer = new PublicKey(address);
      const tokenAmt = tokenAmount ? parseFloat(tokenAmount) : undefined;
      const solAmt = solAmountAdd ? parseFloat(solAmountAdd) : undefined;

      // Get position mint from wallet pools or saved pool data
      let positionMint: string | undefined;
      
      // First, try to get from wallet pools
      const walletPool = walletPools.find(p => p.poolAddress === poolId);
      if (walletPool) {
        positionMint = walletPool.positionNftMint;
      }
      
      // Fallback to saved pool data
      if (!positionMint) {
        const poolData = getPoolsByBaseToken(baseTokenMint || '');
        const poolMatch = poolData.find(p => p.poolAddress === poolId);
        positionMint = poolMatch?.positionNftMint;
      }
      
      if (!positionMint) {
        const poolInfo = getPoolData(poolId);
        positionMint = poolInfo?.positionNftMint;
      }
      
      if (!positionMint) {
        const input = prompt('Enter your position NFT mint address:');
        if (!input) {
          setIsProcessing(false);
          setShowSuccessModal(false);
          return;
        }
        positionMint = input;
      }
      
      if (!positionMint) {
        setIsProcessing(false);
        setShowSuccessModal(false);
        return;
      }

      setCurrentStep(2);
      
      // Fetch pool state to determine which token is SOL
      const poolPk = new PublicKey(poolId);
      const poolState = await liquidityManager['cpAmm'].fetchPoolState(poolPk);
      const SOL_MINT = 'So11111111111111111111111111111111111111112';
      
      // Determine which token is SOL and map amounts accordingly
      const isTokenASOL = poolState.tokenAMint.toBase58() === SOL_MINT;
      const isTokenBSOL = poolState.tokenBMint.toBase58() === SOL_MINT;
      
      let tokenAAmount: number | undefined;
      let tokenBAmount: number | undefined;
      
      if (isTokenASOL) {
        // Token A is SOL, Token B is the other token
        tokenAAmount = solAmt;
        tokenBAmount = tokenAmt;
      } else if (isTokenBSOL) {
        // Token B is SOL, Token A is the other token
        tokenAAmount = tokenAmt;
        tokenBAmount = solAmt;
      } else {
        // Neither is SOL (shouldn't happen in our case, but handle it)
        // Assume tokenAmount is tokenA and solAmount is tokenB
        tokenAAmount = tokenAmt;
        tokenBAmount = solAmt;
      }
      
      // Add liquidity using Meteora SDK
      const instructions = await liquidityManager.addLiquidity(
        poolId,
        positionMint,
        tokenAAmount,
        tokenBAmount,
        0.5, // slippage percent
        payer
      );

      setCurrentStep(3);
      // Create batched transaction
      const transaction = await createBatchedTransaction(
        connection,
        instructions,
        payer,
        undefined,
        network
      );

      if (!signAndSendTransaction) {
        throw new Error('Wallet not connected');
      }

      setCurrentStep(4);
      const signature = await signAndSendTransaction(transaction);
      
      if (signature) {
        const explorerUrl = network === 'devnet'
          ? `https://solscan.io/tx/${signature}?cluster=devnet`
          : `https://solscan.io/tx/${signature}`;

        // Track liquidity add
        trackLiquidityAdd({
          poolAddress: poolId,
          tokenAmount: tokenAmt || 0,
          solAmount: solAmt || 0,
        });

        setModalStatus('success');
        setModalResult({
          title: 'Liquidity Added',
          subtitle: `Successfully added ${tokenAmount ? `${tokenAmount} tokens` : ''}${tokenAmount && solAmountAdd ? ' and ' : ''}${solAmountAdd ? `${solAmountAdd} SOL` : ''} to the pool!`,
          items: poolId ? [
            {
              label: 'Pool Address',
              value: poolId,
              copyValue: poolId,
              explorerUrl: `https://solscan.io/account/${poolId}${network === 'devnet' ? '?cluster=devnet' : ''}`,
            },
            {
              label: 'Transaction Signature',
              value: signature,
              copyValue: signature,
              explorerUrl,
            },
          ] : [
            {
              label: 'Transaction Signature',
              value: signature,
              copyValue: signature,
              explorerUrl,
            },
          ],
          footer: 'Balances will update shortly.',
        });

        // Reset form
        setTokenAmount('');
        setSolAmountAdd('');
      }
    } catch (error: any) {
      console.error('Add liquidity error:', error);
      setModalStatus('error');
      setModalError(error.message || 'Failed to add liquidity');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemoveLiquidity = async () => {
    if (!isConnected || !address || !poolIdRemove) {
      alert('Please fill in pool ID');
      return;
    }

    setIsProcessing(true);
    setShowSuccessModal(true);
    setModalStatus('progress');
    setCurrentStep(1);
    setModalError(null);
    setModalResult(null);

    try {
      const payer = new PublicKey(address);
      const percentage = removePercentage / 100;

      // Get position mint from wallet pools or saved pool data
      let positionMint: string | undefined;
      
      // First, try to get from wallet pools
      const walletPool = walletPools.find(p => p.poolAddress === poolIdRemove);
      if (walletPool) {
        positionMint = walletPool.positionNftMint;
      }
      
      // Fallback to saved pool data
      if (!positionMint) {
        const poolData = getPoolsByBaseToken(baseTokenMint || '');
        const poolMatch = poolData.find(p => p.poolAddress === poolIdRemove);
        positionMint = poolMatch?.positionNftMint;
      }
      
      if (!positionMint) {
        const poolInfo = getPoolData(poolIdRemove);
        positionMint = poolInfo?.positionNftMint;
      }
      
      if (!positionMint) {
        const input = prompt('Enter your position NFT mint address:');
        if (!input) {
          setIsProcessing(false);
          setShowSuccessModal(false);
          return;
        }
        positionMint = input;
      }

      setCurrentStep(2);
      // Remove liquidity using Meteora SDK
      const instructions = await liquidityManager.removeLiquidity(
        poolIdRemove,
        positionMint,
        percentage,
        0.5, // slippage percent
        payer
      );

      setCurrentStep(3);
      // Create batched transaction
      const transaction = await createBatchedTransaction(
        connection,
        instructions,
        payer,
        undefined,
        network
      );

      if (!signAndSendTransaction) {
        throw new Error('Wallet not connected');
      }

      setCurrentStep(4);
      const signature = await signAndSendTransaction(transaction);
      
      if (signature) {
        const explorerUrl = network === 'devnet'
          ? `https://solscan.io/tx/${signature}?cluster=devnet`
          : `https://solscan.io/tx/${signature}`;

        // Track liquidity remove
        trackLiquidityRemove({
          poolAddress: poolIdRemove,
          percentage: removePercentage,
        });

        setModalStatus('success');
        setModalResult({
          title: 'Liquidity Removed',
          subtitle: `Successfully removed ${removePercentage}% of liquidity from the pool!`,
          items: poolIdRemove ? [
            {
              label: 'Pool Address',
              value: poolIdRemove,
              copyValue: poolIdRemove,
              explorerUrl: `https://solscan.io/account/${poolIdRemove}${network === 'devnet' ? '?cluster=devnet' : ''}`,
            },
            {
              label: 'Transaction Signature',
              value: signature,
              copyValue: signature,
              explorerUrl,
            },
          ] : [
            {
              label: 'Transaction Signature',
              value: signature,
              copyValue: signature,
              explorerUrl,
            },
          ],
          footer: 'Tokens will appear in your wallet shortly.',
        });

        // Reset form
        setRemovePercentage(50);
      }
    } catch (error: any) {
      console.error('Remove liquidity error:', error);
      setModalStatus('error');
      setModalError(error.message || 'Failed to remove liquidity');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLockLiquidity = async () => {
    if (!isConnected || !address || !poolIdLock) {
      alert('Please connect wallet and select a pool');
      return;
    }

    setIsProcessing(true);
    setShowSuccessModal(true);
    setModalStatus('progress');
    setCurrentStep(1);
    setModalError(null);
    setModalResult(null);

    try {
      const payer = new PublicKey(address);
      const percentage = lockPercentage / 100;

      // Get position mint from wallet pools or saved pool data
      let positionMint: string | undefined;
      
      const walletPool = walletPools.find(p => p.poolAddress === poolIdLock);
      if (walletPool) {
        positionMint = walletPool.positionNftMint;
      }
      
      if (!positionMint) {
        const poolInfo = getPoolData(poolIdLock);
        positionMint = poolInfo?.positionNftMint;
      }
      
      if (!positionMint) {
        const input = prompt('Enter your position NFT mint address:');
        if (!input) {
          setIsProcessing(false);
          setShowSuccessModal(false);
          return;
        }
        positionMint = input;
      }

      setCurrentStep(2);
      
      // Lock liquidity using Meteora SDK
      const instructions = await liquidityManager.lockLiquidity(
        poolIdLock,
        positionMint,
        lockPercentage,
        permanentLock,
        payer
      );

      setCurrentStep(3);
      const transaction = await createBatchedTransaction(
        connection,
        instructions,
        payer,
        undefined,
        network
      );

      if (!signAndSendTransaction) {
        throw new Error('Wallet not connected');
      }

      setCurrentStep(4);
      const signature = await signAndSendTransaction(transaction);
      
      if (signature) {
        const explorerUrl = network === 'devnet'
          ? `https://solscan.io/tx/${signature}?cluster=devnet`
          : `https://solscan.io/tx/${signature}`;

        // Track liquidity lock
        trackLiquidityLock({
          poolAddress: poolIdLock,
          percentage: lockPercentage,
          permanent: permanentLock,
        });

        setModalStatus('success');
        setModalResult({
          title: 'Position Locked',
          subtitle: permanentLock 
            ? 'Your liquidity position has been permanently locked!'
            : `You've locked ${lockPercentage}% of your liquidity.`,
          items: poolIdLock ? [
            {
              label: 'Pool Address',
              value: poolIdLock,
              copyValue: poolIdLock,
              explorerUrl: `https://solscan.io/account/${poolIdLock}${network === 'devnet' ? '?cluster=devnet' : ''}`,
            },
            {
              label: 'Transaction Signature',
              value: signature,
              copyValue: signature,
              explorerUrl,
            },
          ] : [
            {
              label: 'Transaction Signature',
              value: signature,
              copyValue: signature,
              explorerUrl,
            },
          ],
          footer: permanentLock 
            ? 'Your position is now permanently locked. You can still claim fees forever!'
            : 'Liquidity will remain locked until the unlock date.',
        });
      }
    } catch (error: any) {
      console.error('Lock liquidity error:', error);
      setModalStatus('error');
      setModalError(error.message || 'Failed to lock liquidity');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClaimFees = async () => {
    if (!isConnected || !address || !poolIdClaim) {
      alert('Please connect wallet and select a pool');
      return;
    }

    setIsProcessing(true);
    setShowSuccessModal(true);
    setModalStatus('progress');
    setCurrentStep(1);
    setModalError(null);
    setModalResult(null);

    try {
      const payer = new PublicKey(address);

      // Get position mint from wallet pools or saved pool data
      let positionMint: string | undefined;
      
      const walletPool = walletPools.find(p => p.poolAddress === poolIdClaim);
      if (walletPool) {
        positionMint = walletPool.positionNftMint;
      }
      
      if (!positionMint) {
        const poolInfo = getPoolData(poolIdClaim);
        positionMint = poolInfo?.positionNftMint;
      }
      
      if (!positionMint) {
        throw new Error('Position NFT not found. Please ensure you have a locked position in this pool.');
      }

      setCurrentStep(2);
      
      // Claim position fees using Meteora SDK
      const instructions = await liquidityManager.claimPositionFee(
        poolIdClaim,
        positionMint,
        payer
      );

      setCurrentStep(3);
      const transaction = await createBatchedTransaction(
        connection,
        instructions,
        payer,
        undefined,
        network
      );

      if (!signAndSendTransaction) {
        throw new Error('Wallet not connected');
      }

      setCurrentStep(4);
      const signature = await signAndSendTransaction(transaction);
      
      if (signature) {
        const explorerUrl = network === 'devnet'
          ? `https://solscan.io/tx/${signature}?cluster=devnet`
          : `https://solscan.io/tx/${signature}`;

        // Track fees claimed (estimate based on transaction)
        trackLiquidityClaim({
          poolAddress: poolIdClaim,
          feesClaimed: 0, // Could be calculated from position state if available
        });

        setModalStatus('success');
        setModalResult({
          title: 'Fees Claimed',
          subtitle: 'Successfully claimed accumulated fees from your locked position!',
          items: poolIdClaim ? [
            {
              label: 'Pool Address',
              value: poolIdClaim,
              copyValue: poolIdClaim,
              explorerUrl: `https://solscan.io/account/${poolIdClaim}${network === 'devnet' ? '?cluster=devnet' : ''}`,
            },
            {
              label: 'Transaction Signature',
              value: signature,
              copyValue: signature,
              explorerUrl,
            },
          ] : [
            {
              label: 'Transaction Signature',
              value: signature,
              copyValue: signature,
              explorerUrl,
            },
          ],
          footer: 'Fees have been claimed and sent to your wallet.',
        });
      }
    } catch (error: any) {
      console.error('Claim fees error:', error);
      setModalStatus('error');
      setModalError(error.message || 'Failed to claim fees');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-3xl animate-in slide-in-from-right-8 duration-500">
      <div className="flex flex-nowrap md:flex-nowrap gap-1.5 md:gap-2 mb-6 md:mb-8 p-1 bg-white/5 rounded-xl w-full md:w-fit border border-white/5 overflow-x-auto scrollbar-hide">
        <TabButton active={mode === 'init'} onClick={() => setMode('init')} label="Initialize Pool" shortLabel="Init" />
        <TabButton active={mode === 'add'} onClick={() => setMode('add')} label="Add Liquidity" shortLabel="Add" />
        <TabButton active={mode === 'remove'} onClick={() => setMode('remove')} label="Remove Liquidity" shortLabel="Remove" danger />
        <TabButton active={mode === 'lock'} onClick={() => setMode('lock')} label="Lock & Earn" shortLabel="Lock" />
      </div>
      <div className="bg-[#0f0f0f]/60 border border-white/10 rounded-3xl p-8 space-y-8 relative overflow-hidden spotlight-card">
        {mode === 'init' ? (
          <>
            <Section title="Create Tokenclub Liquidity Pool" desc="Set up a new liquidity pool." />
            <div className="space-y-1.5 relative group">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider ml-1 group-focus-within:text-blue-400 transition-colors">
                Base Token Mint
              </label>
              {isLoadingTokens ? (
                <div className="w-full bg-[#121212] border border-white/10 rounded-xl px-4 py-3.5 text-sm text-gray-500">
                  Loading tokens...
                </div>
              ) : tokenclubTokens.length > 0 ? (
                <>
                  <select
                    value={baseTokenMint}
                    onChange={(e) => setBaseTokenMint(e.target.value)}
                    className="w-full bg-[#121212] border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all shadow-inner mb-2"
                  >
                    <option value="">Select a TokenClub token...</option>
                    {tokenclubTokens.map((token, idx) => (
                      <option key={idx} value={token.mintAddress}>
                        {token.symbol || 'TOKEN'} - {token.mintAddress.slice(0, 8)}...{token.mintAddress.slice(-8)}
                      </option>
                    ))}
                  </select>
                  <Input 
                    label="" 
                    placeholder="Or paste token address manually" 
                    icon={Search}
                    value={baseTokenMint}
                    onChange={(e) => setBaseTokenMint(e.target.value)}
                  />
                </>
              ) : (
                <Input 
                  label="" 
                  placeholder="Paste your token address" 
                  icon={Search}
                  value={baseTokenMint}
                  onChange={(e) => setBaseTokenMint(e.target.value)}
                />
              )}
              {!isLoadingTokens && (
                <p className="text-xs text-gray-500 mt-1">
                  {tokenclubTokens.length > 0 
                    ? `${tokenclubTokens.length} TokenClub token${tokenclubTokens.length !== 1 ? 's' : ''} available`
                    : 'No TokenClub tokens found. Paste a token address manually.'}
                </p>
              )}
            </div>
            <div className="p-4 rounded-xl bg-blue-900/10 border border-blue-500/20 text-xs text-blue-200 flex gap-3">
              <ShieldCheck className="w-5 h-5 flex-shrink-0 text-blue-400" />
              <div>
                <strong className="text-blue-400">Note:</strong> Single Sided Pool Supported (Can be created with 0.0001 SOL). 
                Platform fees collected by Tokenclub are stored on-chain within the pool state for transparency and verification.
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  BASE AMOUNT
                </label>
                <Input 
                  placeholder="0.00" 
                  type="number"
                  value={baseAmount}
                  onChange={(e) => setBaseAmount(e.target.value)}
                />
                <div className="flex gap-2 mt-2 flex-wrap items-center">
                  {isLoadingSupply ? (
                    <span className="text-xs text-gray-500">Loading supply...</span>
                  ) : tokenSupply !== null && tokenSupply > 0 ? (
                    <>
                      <span className="text-xs text-gray-500">
                        Supply: {tokenSupply.toLocaleString('en-US', { maximumFractionDigits: 0, useGrouping: true })}
                      </span>
                    </>
                  ) : baseTokenMint ? (
                    <span className="text-xs text-gray-500">Enter a valid token mint address to see supply</span>
                  ) : null}
                  {(isConnected && tokenSupply && tokenSupply > 0) || (isConnected && tokenBalanceInit > 0) ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          if (tokenSupply !== null && tokenSupply > 0) {
                            // Use total supply for percentage calculation
                            const amount = (tokenSupply * 50) / 100;
                            // Format as string directly to preserve precision
                            const amountStr = amount.toString();
                            const cleaned = amountStr.replace(/\.?0+$/, '');
                            setBaseAmount(cleaned);
                          } else if (tokenBalanceInit > 0) {
                            // Fallback to balance if supply not available
                            const amount = (tokenBalanceInit * 50) / 100;
                            const formatted = amount.toFixed(tokenDecimals || 9);
                            setBaseAmount(formatNumberWithoutTrailingZeros(formatted));
                          }
                        }}
                        disabled={tokenSupply === null || tokenSupply === 0}
                        className="px-3 py-1.5 text-xs font-medium bg-blue-500/20 hover:bg-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed text-blue-400 border border-blue-500/30 rounded-lg transition-colors"
                      >
                        50%
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          // Debug logging
                          console.log('[100% Button] State:', {
                            tokenSupply,
                            tokenBalanceInit,
                            tokenDecimals,
                            hasSupply: tokenSupply !== null && tokenSupply > 0
                          });
                          
                          // CRITICAL: Always prefer tokenSupply if available
                          if (tokenSupply !== null && tokenSupply > 0) {
                            // Use total supply for 100% calculation
                            // Convert to string directly to preserve full precision
                            const amount = tokenSupply;
                            // Format with decimals, then remove trailing zeros
                            const formatted = amount.toFixed(tokenDecimals || 9);
                            // Remove trailing zeros but keep the number intact
                            const cleaned = formatted.replace(/\.?0+$/, '');
                            console.log('[100% Button] Using supply:', { 
                              tokenSupply, 
                              amount, 
                              formatted, 
                              cleaned,
                              tokenDecimals 
                            });
                            setBaseAmount(cleaned);
                          } else {
                            console.warn('[100% Button] Supply not available');
                            alert('Token supply not loaded yet. Please wait for supply to load before clicking 100%.');
                          }
                        }}
                        disabled={tokenSupply === null || tokenSupply === 0}
                        className="px-3 py-1.5 text-xs font-medium bg-blue-500/20 hover:bg-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed text-blue-400 border border-blue-500/30 rounded-lg transition-colors"
                      >
                        100%
                      </button>
                      {tokenSupply !== null && tokenSupply > 0 ? (
                        <span className="text-xs text-gray-500">
                          Supply: {formatNumberWithCommas(tokenSupply)}
                        </span>
                      ) : tokenBalanceInit > 0 ? (
                        <span className="text-xs text-gray-500">
                          Balance: {formatNumberWithoutTrailingZeros(tokenBalanceInit.toFixed(tokenDecimals || 9))}
                        </span>
                      ) : null}
                    </>
                  ) : null}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  SOL QUOTE
                </label>
                <Input 
                  placeholder="0.00" 
                  type="number"
                  value={solAmount}
                  onChange={(e) => setSolAmount(e.target.value)}
                />
                {isConnected && (
                  <div className="flex gap-2 mt-2 flex-wrap items-center">
                    <button
                      type="button"
                      onClick={() => {
                        if (solBalanceInit > 0) {
                          const amount = (solBalanceInit * 50) / 100;
                          setSolAmount(formatNumberWithoutTrailingZeros(amount.toFixed(9)));
                        }
                      }}
                      disabled={solBalanceInit === 0}
                      className="px-3 py-1.5 text-xs font-medium bg-blue-500/20 hover:bg-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed text-blue-400 border border-blue-500/30 rounded-lg transition-colors"
                    >
                      50%
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (solBalanceInit > 0) {
                          const amount = (solBalanceInit * 100) / 100;
                          setSolAmount(formatNumberWithoutTrailingZeros(amount.toFixed(9)));
                        }
                      }}
                      disabled={solBalanceInit === 0}
                      className="px-3 py-1.5 text-xs font-medium bg-blue-500/20 hover:bg-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed text-blue-400 border border-blue-500/30 rounded-lg transition-colors"
                    >
                      100%
                    </button>
                    {isConnected && solBalanceInit > 0 && (
                      <span className="text-xs text-gray-500">
                        Balance: {formatNumberWithoutTrailingZeros(solBalanceInit.toFixed(9))} SOL
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
            <PrimaryButton 
              text={isProcessing ? 'Initializing...' : 'Initialize Pool'} 
              cost={`${PLATFORM_FEES_DISPLAY.LIQUIDITY_POOL_CREATION} SOL`}
              color="blue"
              onClick={handleInitializePool}
              disabled={!isConnected || isProcessing || !baseTokenMint || !baseAmount || !solAmount}
            />
          </>
        ) : mode === 'add' ? (
          <>
            <Section title="Deposit Liquidity" desc="Add assets to an existing Tokenclub liquidity pool." />
            <div className="space-y-1.5 relative group">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider ml-1 group-focus-within:text-blue-400 transition-colors">
                Pool ID / Pair Address
              </label>
              {isLoadingPools ? (
                <div className="w-full bg-[#121212] border border-white/10 rounded-xl px-4 py-3.5 text-sm text-gray-500">
                  Loading pools from wallet...
                </div>
              ) : walletPools.length > 0 ? (
                <select
                  value={poolId}
                  onChange={(e) => {
                    setPoolId(e.target.value);
                    // Auto-fill position NFT mint from selected pool
                    const selectedPool = walletPools.find(p => p.poolAddress === e.target.value);
                    if (selectedPool) {
                      // Save to pool memory for future use
                      savePoolData({
                        poolAddress: selectedPool.poolAddress,
                        positionNftMint: selectedPool.positionNftMint,
                        baseTokenMint: selectedPool.tokenAMint,
                        quoteTokenMint: selectedPool.tokenBMint,
                        createdAt: Date.now(),
                      });
                    }
                  }}
                  className="w-full bg-[#121212] border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all shadow-inner"
                >
                  <option value="">Select a pool...</option>
                  {walletPools.map((pool, idx) => (
                    <option key={idx} value={pool.poolAddress}>
                      {pool.poolAddress.slice(0, 8)}...{pool.poolAddress.slice(-8)} ({pool.tokenAMint.slice(0, 4)}.../{pool.tokenBMint.slice(0, 4)}...)
                    </option>
                  ))}
                </select>
              ) : (
                <Input 
                  label="" 
                  placeholder="Enter Pool ID" 
                  icon={Search}
                  value={poolId}
                  onChange={(e) => setPoolId(e.target.value)}
                />
              )}
              {!isLoadingPools && (
                <p className="text-xs text-gray-500 mt-1">
                  {walletPools.length > 0 
                    ? `${walletPools.length} pool${walletPools.length !== 1 ? 's' : ''} found in your wallet`
                    : 'No pools found. Create a pool first or paste a pool address manually.'}
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider ml-1">
                  Token Amount
                </label>
                <div className="relative">
                  <Input 
                    label="" 
                    placeholder="0.00" 
                    type="number"
                    value={tokenAmount}
                    onChange={(e) => setTokenAmount(e.target.value)}
                  />
                  <div className="flex gap-2 mt-2 flex-wrap items-center">
                    <button
                      type="button"
                      onClick={() => {
                        if (tokenBalance > 0) {
                          const amount = (tokenBalance * 50) / 100;
                          setTokenAmount(amount.toFixed(tokenDecimals || 9));
                        }
                      }}
                      disabled={tokenBalance === 0}
                      className="px-3 py-1.5 text-xs font-medium bg-blue-500/20 hover:bg-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed text-blue-400 border border-blue-500/30 rounded-lg transition-colors"
                    >
                      50%
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (tokenBalance > 0) {
                          const amount = tokenBalance;
                          setTokenAmount(amount.toFixed(tokenDecimals || 9));
                        }
                      }}
                      disabled={tokenBalance === 0}
                      className="px-3 py-1.5 text-xs font-medium bg-blue-500/20 hover:bg-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed text-blue-400 border border-blue-500/30 rounded-lg transition-colors"
                    >
                      100%
                    </button>
                    {isLoadingBalances ? (
                      <span className="text-xs text-gray-500">Loading balance...</span>
                    ) : (
                      <span className="text-xs text-gray-500">
                        Balance: {tokenBalance > 0 ? tokenBalance.toLocaleString(undefined, { maximumFractionDigits: tokenDecimals || 9 }) : '0'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider ml-1">
                  SOL Amount
                </label>
                <div className="relative">
                  <Input 
                    label="" 
                    placeholder="0.00" 
                    type="number"
                    value={solAmountAdd}
                    onChange={(e) => setSolAmountAdd(e.target.value)}
                  />
                  <div className="flex gap-2 mt-2 flex-wrap items-center">
                    <button
                      type="button"
                      onClick={() => {
                        if (solBalance > 0) {
                          const amount = (solBalance * 50) / 100;
                          setSolAmountAdd(formatNumberWithoutTrailingZeros(amount.toFixed(9)));
                        }
                      }}
                      disabled={solBalance === 0}
                      className="px-3 py-1.5 text-xs font-medium bg-blue-500/20 hover:bg-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed text-blue-400 border border-blue-500/30 rounded-lg transition-colors"
                    >
                      50%
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (solBalance > 0) {
                          const amount = solBalance;
                          setSolAmountAdd(formatNumberWithoutTrailingZeros(amount.toFixed(9)));
                        }
                      }}
                      disabled={solBalance === 0}
                      className="px-3 py-1.5 text-xs font-medium bg-blue-500/20 hover:bg-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed text-blue-400 border border-blue-500/30 rounded-lg transition-colors"
                    >
                      100%
                    </button>
                    {isLoadingBalances ? (
                      <span className="text-xs text-gray-500">Loading balance...</span>
                    ) : (
                      <span className="text-xs text-gray-500">
                        Balance: {solBalance > 0 ? solBalance.toFixed(4) : '0.0000'} SOL
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <PrimaryButton 
              text={isProcessing ? 'Processing...' : 'Confirm Deposit'} 
              cost={`${PLATFORM_FEES_DISPLAY.LIQUIDITY_ADD} SOL`}
              color="blue"
              onClick={handleAddLiquidity}
              disabled={!isConnected || isProcessing || !poolId || !tokenAmount || !solAmountAdd}
            />
          </>
        ) : mode === 'remove' ? (
          <>
            <div className="flex gap-4 items-start mb-2">
              <div className="p-3 rounded-lg bg-red-500/10 text-red-500 border border-red-500/20">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Withdraw Liquidity</h3>
                <p className="text-gray-500 text-sm mt-1">
                  Removing liquidity from an active pool can cause high price impact. Proceed with caution.
                </p>
              </div>
            </div>
            <div className="space-y-1.5 relative group">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider ml-1 group-focus-within:text-blue-400 transition-colors">
                Pool ID
              </label>
              {isLoadingPools ? (
                <div className="w-full bg-[#121212] border border-white/10 rounded-xl px-4 py-3.5 text-sm text-gray-500">
                  Loading pools from wallet...
                </div>
              ) : walletPools.length > 0 ? (
                <select
                  value={poolIdRemove}
                  onChange={(e) => {
                    setPoolIdRemove(e.target.value);
                    // Auto-fill position NFT mint from selected pool
                    const selectedPool = walletPools.find(p => p.poolAddress === e.target.value);
                    if (selectedPool) {
                      // Save to pool memory for future use
                      savePoolData({
                        poolAddress: selectedPool.poolAddress,
                        positionNftMint: selectedPool.positionNftMint,
                        baseTokenMint: selectedPool.tokenAMint,
                        quoteTokenMint: selectedPool.tokenBMint,
                        createdAt: Date.now(),
                      });
                    }
                  }}
                  className="w-full bg-[#121212] border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all shadow-inner"
                >
                  <option value="">Select a pool...</option>
                  {walletPools.map((pool, idx) => (
                    <option key={idx} value={pool.poolAddress}>
                      {pool.poolAddress.slice(0, 8)}...{pool.poolAddress.slice(-8)} ({pool.tokenAMint.slice(0, 4)}.../{pool.tokenBMint.slice(0, 4)}...)
                    </option>
                  ))}
                </select>
              ) : (
                <Input 
                  label="" 
                  placeholder="Enter Pool ID" 
                  value={poolIdRemove}
                  onChange={(e) => setPoolIdRemove(e.target.value)}
                />
              )}
              {!isLoadingPools && (
                <p className="text-xs text-gray-500 mt-1">
                  {walletPools.length > 0 
                    ? `${walletPools.length} pool${walletPools.length !== 1 ? 's' : ''} found in your wallet`
                    : 'No pools found. Create a pool first or paste a pool address manually.'}
                </p>
              )}
            </div>
            <Slider 
              label="Withdrawal Percentage" 
              danger 
              value={removePercentage}
              onChange={setRemovePercentage}
            />
            <PrimaryButton 
              text={isProcessing ? 'Processing...' : 'Confirm Withdrawal'} 
              cost={`${PLATFORM_FEES_DISPLAY.LIQUIDITY_REMOVE} SOL`}
              color="red"
              onClick={handleRemoveLiquidity}
              disabled={!isConnected || isProcessing || !poolIdRemove}
            />
          </>
        ) : mode === 'lock' ? (
          <>
            <Section title="Lock & Earn" desc="Permanently lock liquidity and earn transfer fees." />
            <div className="space-y-4">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider ml-1">
                Pool Address
              </label>
              {walletPools.length > 0 ? (
                <select
                  value={poolIdLock}
                  onChange={(e) => {
                    setPoolIdLock(e.target.value);
                    const selectedPool = walletPools.find(p => p.poolAddress === e.target.value);
                    if (selectedPool) {
                      savePoolData({
                        poolAddress: selectedPool.poolAddress,
                        positionNftMint: selectedPool.positionNftMint,
                        baseTokenMint: selectedPool.tokenAMint,
                        quoteTokenMint: selectedPool.tokenBMint,
                        createdAt: Date.now(),
                      });
                    }
                  }}
                  className="w-full bg-[#121212] border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all shadow-inner"
                >
                  <option value="">Select a pool...</option>
                  {walletPools.map((pool, idx) => (
                    <option key={idx} value={pool.poolAddress}>
                      {pool.poolAddress.slice(0, 8)}...{pool.poolAddress.slice(-8)} ({pool.tokenAMint.slice(0, 4)}.../{pool.tokenBMint.slice(0, 4)}...)
                    </option>
                  ))}
                </select>
              ) : (
                <Input 
                  label="" 
                  placeholder="Enter Pool ID" 
                  value={poolIdLock}
                  onChange={(e) => setPoolIdLock(e.target.value)}
                />
              )}
              {!isLoadingPools && (
                <p className="text-xs text-gray-500 mt-1">
                  {walletPools.length > 0 
                    ? `${walletPools.length} pool${walletPools.length !== 1 ? 's' : ''} found in your wallet`
                    : 'No pools found. Create a pool first or paste a pool address manually.'}
                </p>
              )}
            </div>
            <Slider 
              label="Lock Percentage" 
              value={lockPercentage}
              onChange={setLockPercentage}
            />
            <div className="flex items-center gap-3 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
              <input
                type="checkbox"
                id="permanentLock"
                checked={permanentLock}
                onChange={(e) => setPermanentLock(e.target.checked)}
                className="w-5 h-5 rounded border-white/20 bg-[#121212] text-blue-500 focus:ring-2 focus:ring-blue-500/50"
              />
              <label htmlFor="permanentLock" className="text-sm text-white cursor-pointer flex-1">
                <span className="font-bold">Permanent Lock</span>
                <p className="text-xs text-gray-400 mt-1">
                  Lock liquidity permanently to earn transfer fees. This action cannot be undone.
                </p>
              </label>
            </div>
            {permanentLock && (
              <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20 text-xs text-orange-200">
                <AlertTriangle className="w-4 h-4 inline mr-2" />
                Warning: Permanent locks cannot be reversed. You will earn transfer fees but cannot withdraw liquidity.
              </div>
            )}
            <PrimaryButton 
              text={isProcessing ? 'Processing...' : permanentLock ? 'Lock Permanently' : 'Lock Liquidity'} 
              cost={`${PLATFORM_FEES_DISPLAY.LOCK_LIQUIDITY} SOL`}
              color={permanentLock ? "red" : "blue"}
              onClick={handleLockLiquidity}
              disabled={!isConnected || isProcessing || !poolIdLock}
            />

            {/* Claim Fees Section */}
            <div className="mt-8 pt-8 border-t border-white/10">
              <Section title="Claim Transfer Fees" desc="Claim accumulated transfer fees from your locked positions." />
              <div className="space-y-4 mt-4">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider ml-1">
                  Pool Address (with locked position)
                </label>
                {walletPools.length > 0 ? (
                  <select
                    value={poolIdClaim}
                    onChange={(e) => setPoolIdClaim(e.target.value)}
                    className="w-full bg-[#121212] border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all shadow-inner"
                  >
                    <option value="">Select a pool...</option>
                    {walletPools.map((pool, idx) => (
                      <option key={idx} value={pool.poolAddress}>
                        {pool.poolAddress.slice(0, 8)}...{pool.poolAddress.slice(-8)} ({pool.tokenAMint.slice(0, 4)}.../{pool.tokenBMint.slice(0, 4)}...)
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input 
                    label="" 
                    placeholder="Enter Pool ID" 
                    value={poolIdClaim}
                    onChange={(e) => setPoolIdClaim(e.target.value)}
                  />
                )}
                <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
                  <div className="flex items-start gap-3">
                    <Coins className="w-5 h-5 text-green-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-white font-semibold mb-1">Earn Transfer Fees</p>
                      <p className="text-xs text-gray-400">
                        When you permanently lock liquidity, you earn transfer fees from every swap in the pool. 
                        Claim your accumulated fees anytime.
                      </p>
                    </div>
                  </div>
                </div>
                <PrimaryButton 
                  text={isProcessing ? 'Claiming...' : 'Claim Fees'} 
                  cost={`${PLATFORM_FEES_DISPLAY.CLAIM_FEES} SOL`}
                  color="teal"
                  onClick={handleClaimFees}
                  disabled={!isConnected || isProcessing || !poolIdClaim}
                />
              </div>
            </div>
          </>
        ) : null}
      </div>

      {/* Success Modal */}
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => {
          setShowSuccessModal(false);
          setModalStatus('progress');
          setModalError(null);
          setModalResult(null);
          setCurrentStep(1);
        }}
        title={mode === 'init' ? 'Creating Liquidity Pool' : mode === 'add' ? 'Adding Liquidity' : mode === 'remove' ? 'Removing Liquidity' : mode === 'lock' ? 'Locking Liquidity' : 'Claiming Fees'}
        errorTitle={mode === 'init' ? 'Pool Creation Failed' : mode === 'add' ? 'Add Liquidity Failed' : mode === 'remove' ? 'Remove Liquidity Failed' : mode === 'lock' ? 'Lock Liquidity Failed' : 'Claim Fees Failed'}
        successTitle={mode === 'init' ? 'Pool created successfully! 🎉' : mode === 'add' ? 'Liquidity added successfully! 🎉' : mode === 'remove' ? 'Liquidity removed successfully! 🎉' : mode === 'lock' ? 'Liquidity locked successfully! 🔒' : 'Fees claimed successfully! 💰'}
        error={modalError}
        status={modalStatus}
        result={modalResult}
        variant="steps"
        currentStep={currentStep}
        steps={[
          { title: 'Preparing configuration', description: 'Fetching balances and pool parameters...' },
          { title: 'Building transaction', description: 'Constructing pool instructions...' },
          { title: 'Awaiting signature', description: 'Approve the transaction in your wallet...' },
          { title: 'Finalizing on-chain', description: 'Waiting for confirmation...' },
        ]}
      />
    </div>
  );
});
LiquidityModule.displayName = 'LiquidityModule';

export default LiquidityModule;

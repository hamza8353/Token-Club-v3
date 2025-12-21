import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, ArrowDown } from 'lucide-react';
import { PrimaryButton } from '../components/ui/PrimaryButton';
import { SuccessModal, SuccessModalResult } from '../components/ui/SuccessModal';
import TokenSelector, { Token } from '../components/ui/TokenSelector';
import { useWallet } from '../contexts/WalletContext';
import { useNetwork } from '../contexts/NetworkContext';
import { jupiterClient, JupiterQuoteResponse } from '../lib/jupiter';
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getAssociatedTokenAddressSync, getAccount, getMint, TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';
import { getTokenData } from '../lib/token-memory';
import { getLastCreatedMint } from '../lib/token-memory';
import { formatNumberWithoutTrailingZeros } from '../lib/number-format';
import { PLATFORM_FEES_DISPLAY } from '../lib/config';
import { trackSwapStart, trackSwapComplete, trackSwapError } from '../lib/analytics';

// Common token addresses
const SOL_MINT = 'So11111111111111111111111111111111111111112';
// Network-specific USDC addresses
const USDC_MAINNET = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const USDC_DEVNET = '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU';

const SOL_TOKEN: Token = {
  mint: SOL_MINT,
  symbol: 'SOL',
  name: 'Solana',
  decimals: 9,
  logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
};

const SwapModule = React.memo(() => {
  const { connection, address, isConnected, signAndSendTransaction } = useWallet();
  const { network, isDevnet } = useNetwork();
  const [fromAmount, setFromAmount] = useState<string>('');
  const [toAmount, setToAmount] = useState<string>('');
  const [fromToken, setFromToken] = useState<Token | null>(SOL_TOKEN);
  const [toToken, setToToken] = useState<Token | null>(null);
  const [isEditingFrom, setIsEditingFrom] = useState<boolean>(true); // Track which side is being edited
  const [fromBalance, setFromBalance] = useState<number>(0);
  const [toBalance, setToBalance] = useState<number>(0);
  const [rate, setRate] = useState<string>('');
  const [priceImpact, setPriceImpact] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSwapping, setIsSwapping] = useState(false);
  const [slippage, setSlippage] = useState<number>(50); // 0.5% default
  
  // Success modal state
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [modalStatus, setModalStatus] = useState<'progress' | 'success' | 'error'>('progress');
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalResult, setModalResult] = useState<SuccessModalResult | null>(null);
  const [currentStep, setCurrentStep] = useState(1);

  // Initialize toToken with USDC based on network
  useEffect(() => {
    const defaultUSDC = isDevnet ? USDC_DEVNET : USDC_MAINNET;
    if (!toToken || (toToken.mint === USDC_MAINNET || toToken.mint === USDC_DEVNET)) {
      // Try to get USDC from Jupiter token list
      jupiterClient.getTokenList().then(tokens => {
        const usdcToken = tokens.find((t: any) => t.address === defaultUSDC);
        if (usdcToken) {
          setToToken({
            mint: usdcToken.address,
            symbol: usdcToken.symbol,
            name: usdcToken.name,
            decimals: usdcToken.decimals,
            logoURI: usdcToken.logoURI,
          });
        } else {
          setToToken({
            mint: defaultUSDC,
            symbol: 'USDC',
            name: 'USD Coin',
            decimals: 6,
          });
        }
      });
    }
  }, [network, isDevnet]);

  // Auto-fill fromToken with last created token
  useEffect(() => {
    const lastMint = getLastCreatedMint();
    if (lastMint && !fromToken) {
      const tokenData = getTokenData(lastMint);
      if (tokenData) {
        setFromToken({
          mint: tokenData.mintAddress,
          symbol: tokenData.symbol || 'TOKEN',
          name: tokenData.name || 'Token',
          decimals: 9,
          logoURI: tokenData.image,
        });
      }
    }
  }, []);

  // Fetch token decimals
  const fetchTokenDecimals = useCallback(async (mint: string): Promise<number> => {
    if (mint === SOL_MINT) return 9;
    
    try {
      const mintPubkey = new PublicKey(mint);
      let mintInfo;
      try {
        mintInfo = await getMint(connection, mintPubkey, undefined, TOKEN_PROGRAM_ID);
      } catch {
        mintInfo = await getMint(connection, mintPubkey, undefined, TOKEN_2022_PROGRAM_ID);
      }
      return mintInfo.decimals;
    } catch (error) {
      console.error('Error fetching token decimals:', error);
      return 9; // Default to 9 decimals
    }
  }, [connection]);

  // Fetch balances
  const fetchBalances = useCallback(async () => {
    if (!isConnected || !address) return;

    try {
      const publicKey = new PublicKey(address);
      
      // Fetch SOL balance
      if (fromToken?.mint === SOL_MINT || toToken?.mint === SOL_MINT) {
        const solBalance = await connection.getBalance(publicKey);
        const solAmount = solBalance / LAMPORTS_PER_SOL;
        if (fromToken?.mint === SOL_MINT) {
          setFromBalance(solAmount);
        }
        if (toToken?.mint === SOL_MINT) {
          setToBalance(solAmount);
        }
      }

      // Fetch SPL token balances
      if (fromToken && fromToken.mint !== SOL_MINT) {
        try {
          const decimals = fromToken.decimals || await fetchTokenDecimals(fromToken.mint);
          const tokenAccount = getAssociatedTokenAddressSync(
            new PublicKey(fromToken.mint),
            publicKey,
            false,
            TOKEN_PROGRAM_ID
          );
          const accountInfo = await getAccount(connection, tokenAccount);
          const balance = Number(accountInfo.amount) / Math.pow(10, decimals);
          setFromBalance(balance);
        } catch (error) {
          // Token account doesn't exist
          setFromBalance(0);
        }
      }

      if (toToken && toToken.mint !== SOL_MINT) {
        try {
          const decimals = toToken.decimals || await fetchTokenDecimals(toToken.mint);
          const tokenAccount = getAssociatedTokenAddressSync(
            new PublicKey(toToken.mint),
            publicKey,
            false,
            TOKEN_PROGRAM_ID
          );
          const accountInfo = await getAccount(connection, tokenAccount);
          const balance = Number(accountInfo.amount) / Math.pow(10, decimals);
          setToBalance(balance);
        } catch (error) {
          // Token account doesn't exist
          setToBalance(0);
        }
      }
    } catch (error) {
      console.error('Error fetching balances:', error);
    }
  }, [isConnected, address, connection, fromToken, toToken, fetchTokenDecimals]);

  // Fetch quote when amount changes (bidirectional)
  const fetchQuote = useCallback(async () => {
    if (!isConnected || !fromToken || !toToken) {
      setToAmount('');
      setRate('');
      setPriceImpact('');
      return;
    }

    // Determine which amount to use based on which side is being edited
    const activeAmount = isEditingFrom ? fromAmount : toAmount;
    if (!activeAmount || parseFloat(activeAmount) <= 0) {
      setToAmount('');
      setFromAmount('');
      setRate('');
      setPriceImpact('');
      return;
    }

    setIsLoading(true);
    try {
      let quote: JupiterQuoteResponse | null = null;
      
      if (isEditingFrom) {
        // User is editing "from" amount - calculate "to" amount
        const amount = parseFloat(fromAmount);
        const fromDecimals = fromToken.decimals || await fetchTokenDecimals(fromToken.mint);
        const amountInSmallestUnit = Math.floor(amount * Math.pow(10, fromDecimals));

        quote = await jupiterClient.getQuote(
          fromToken.mint,
          toToken.mint,
          amountInSmallestUnit,
          slippage
        );

        if (quote) {
          const toDecimals = toToken.decimals || await fetchTokenDecimals(toToken.mint);
          const outAmount = parseFloat(quote.outAmount) / Math.pow(10, toDecimals);
          setToAmount(formatNumberWithoutTrailingZeros(outAmount.toFixed(6)));
          
          // Calculate rate
          const rateValue = outAmount / amount;
          setRate(`1 ${fromToken.symbol || 'Token'} ≈ ${rateValue.toFixed(4)} ${toToken.symbol || 'Token'}`);
        }
      } else {
        // User is editing "to" amount - calculate "from" amount
        const amount = parseFloat(toAmount);
        const toDecimals = toToken.decimals || await fetchTokenDecimals(toToken.mint);
        const amountInSmallestUnit = Math.floor(amount * Math.pow(10, toDecimals));

        // Reverse the quote (swap input/output)
        quote = await jupiterClient.getQuote(
          toToken.mint,
          fromToken.mint,
          amountInSmallestUnit,
          slippage
        );

        if (quote) {
          const fromDecimals = fromToken.decimals || await fetchTokenDecimals(fromToken.mint);
          const inAmount = parseFloat(quote.outAmount) / Math.pow(10, fromDecimals);
          setFromAmount(formatNumberWithoutTrailingZeros(inAmount.toFixed(6)));
          
          // Calculate rate (inverse)
          const rateValue = amount / inAmount;
          setRate(`1 ${fromToken.symbol || 'Token'} ≈ ${rateValue.toFixed(4)} ${toToken.symbol || 'Token'}`);
        }
      }

      if (quote) {
        setPriceImpact(quote.priceImpactPct || '0');
      } else {
        if (isEditingFrom) {
          setToAmount('');
        } else {
          setFromAmount('');
        }
        setRate('');
        setPriceImpact('');
      }
    } catch (error) {
      console.error('Error fetching quote:', error);
      if (isEditingFrom) {
        setToAmount('');
      } else {
        setFromAmount('');
      }
      setRate('');
      setPriceImpact('');
    } finally {
      setIsLoading(false);
    }
  }, [fromAmount, toAmount, isEditingFrom, fromToken, toToken, slippage, isConnected, fetchTokenDecimals]);

  useEffect(() => {
    fetchBalances();
  }, [fetchBalances]);

  useEffect(() => {
    // Trigger quote fetch when amounts or tokens change
    if (!fromToken || !toToken) {
      setToAmount('');
      setFromAmount('');
      setRate('');
      setPriceImpact('');
      return;
    }

    const timeoutId = setTimeout(() => {
      fetchQuote();
    }, 500); // Debounce

    return () => clearTimeout(timeoutId);
  }, [fromAmount, toAmount, isEditingFrom, fromToken, toToken, slippage, isConnected, fetchQuote]);

  const handleSwap = async () => {
    if (!isConnected || !address || !fromAmount || parseFloat(fromAmount) <= 0 || !fromToken || !toToken) {
      return;
    }

    setIsSwapping(true);
    setShowSuccessModal(true);
    setModalStatus('progress');
    setCurrentStep(1);
    setModalError(null);
    setModalResult(null);

    // Track swap start
    trackSwapStart({
      fromToken: fromToken.mint,
      toToken: toToken.mint,
      fromAmount: parseFloat(fromAmount),
    });

    try {
      setCurrentStep(2);
      const amount = parseFloat(fromAmount);
      
      // Check balance before proceeding
      const publicKey = new PublicKey(address);
      let availableBalance = 0;
      
      if (fromToken.mint === SOL_MINT) {
        // Check SOL balance
        const solBalance = await connection.getBalance(publicKey);
        availableBalance = solBalance / LAMPORTS_PER_SOL;
        
        // Reserve some SOL for transaction fees (0.01 SOL)
        const requiredAmount = amount + 0.01;
        if (availableBalance < requiredAmount) {
          throw new Error(`Insufficient SOL balance. You have ${availableBalance.toFixed(4)} SOL, but need ${requiredAmount.toFixed(4)} SOL (including transaction fees)`);
        }
      } else {
        // Check token balance
        const fromDecimals = fromToken.decimals || await fetchTokenDecimals(fromToken.mint);
        const tokenAccount = getAssociatedTokenAddressSync(new PublicKey(fromToken.mint), publicKey);
        try {
          const accountInfo = await getAccount(connection, tokenAccount);
          availableBalance = Number(accountInfo.amount) / Math.pow(10, fromDecimals);
        } catch (error) {
          throw new Error(`Token account not found or has zero balance`);
        }
        
        if (availableBalance < amount) {
          throw new Error(`Insufficient ${fromToken.symbol || 'token'} balance. You have ${availableBalance.toFixed(4)}, but need ${amount.toFixed(4)}`);
        }
        
        // Also check SOL balance for transaction fees
        const solBalance = await connection.getBalance(publicKey);
        const solBalanceInSol = solBalance / LAMPORTS_PER_SOL;
        if (solBalanceInSol < 0.01) {
          throw new Error(`Insufficient SOL for transaction fees. You need at least 0.01 SOL for fees, but have ${solBalanceInSol.toFixed(4)} SOL`);
        }
      }
      
      const fromDecimals = fromToken.decimals || await fetchTokenDecimals(fromToken.mint);
      const amountInSmallestUnit = Math.floor(amount * Math.pow(10, fromDecimals));

      // Get quote
      setCurrentStep(3);
      const quote = await jupiterClient.getQuote(
        fromToken.mint,
        toToken.mint,
        amountInSmallestUnit,
        slippage
      );

      if (!quote) {
        throw new Error('Failed to get swap quote');
      }

      // Get swap transaction (includes platform fee)
      // Calculate swap amount in SOL for fee calculation (1% of transaction)
      // If swapping from SOL, use the input amount
      // If swapping to SOL, use the output amount
      // If swapping token to token, estimate based on input amount
      let swapAmountInSol = 0;
      if (fromToken.mint === SOL_MINT) {
        // Swapping SOL -> Token: fee is 1% of SOL input
        swapAmountInSol = amount;
      } else if (toToken.mint === SOL_MINT) {
        // Swapping Token -> SOL: fee is 1% of SOL output
        swapAmountInSol = parseFloat(toAmount);
      } else {
        // Token -> Token: estimate SOL value from quote
        // Use the output amount if we can get SOL price, otherwise use a conservative estimate
        // For now, we'll estimate based on the input amount (user pays fee in SOL)
        swapAmountInSol = amount; // Conservative estimate - fee will be in SOL
      }
      
      setCurrentStep(4);
      const transaction = await jupiterClient.getSwapTransaction(
        quote,
        address,
        swapAmountInSol,
        connection
      );

      if (!transaction) {
        throw new Error('Failed to create swap transaction');
      }

      // Sign and send
      setCurrentStep(5);
      if (!signAndSendTransaction) {
        throw new Error('Wallet not connected');
      }
      const signature = await signAndSendTransaction(transaction);
      
      if (signature) {
        setCurrentStep(6);
        // Wait for confirmation
        await connection.confirmTransaction(signature, 'confirmed');
        
        // Track swap complete
        trackSwapComplete({
          fromToken: fromToken.mint,
          toToken: toToken.mint,
          fromAmount: parseFloat(fromAmount),
          toAmount: parseFloat(toAmount),
          transactionSignature: signature,
        });
        
        setModalStatus('success');
        setModalResult({
          title: 'Swap Executed Successfully',
          subtitle: `Swapped ${fromAmount} ${fromToken.symbol || 'Token'} for ${toAmount} ${toToken.symbol || 'Token'}`,
          items: [
            {
              label: 'Transaction Signature',
              value: signature,
              copyValue: signature,
              explorerUrl: network === 'devnet' 
                ? `https://solscan.io/tx/${signature}?cluster=devnet`
                : `https://solscan.io/tx/${signature}`,
            },
            {
              label: 'Amount In',
              value: `${fromAmount} ${fromToken.symbol || 'Token'}`,
              copyValue: false,
            },
            {
              label: 'Amount Out',
              value: `${toAmount} ${toToken.symbol || 'Token'}`,
              copyValue: false,
            },
          ],
          footer: 'Your tokens have been swapped successfully.',
        });
        
        // Reset and refresh
        setFromAmount('');
        setToAmount('');
        fetchBalances();
      }
    } catch (error: any) {
      console.error('Swap error:', error);
      trackSwapError(error.message || 'Unknown error');
      setModalStatus('error');
      setModalError(error.message || 'Swap failed');
    } finally {
      setIsSwapping(false);
    }
  };

  const handleSwitchTokens = () => {
    const tempToken = fromToken;
    const tempAmount = fromAmount;
    const tempBalance = fromBalance;
    
    setFromToken(toToken);
    setToToken(tempToken);
    setFromAmount(toAmount);
    setToAmount(tempAmount);
    setFromBalance(toBalance);
    setToBalance(tempBalance);
  };

  const handleMax = () => {
    if (fromBalance > 0) {
      // Leave some SOL for fees
      const maxAmount = fromToken?.mint === SOL_MINT 
        ? Math.max(0, fromBalance - 0.01) // Leave 0.01 SOL for fees
        : fromBalance;
      setFromAmount(maxAmount.toString());
    }
  };

  return (
    <>
      <div className="max-w-md mx-auto animate-in slide-in-from-right-8 duration-500">
        <div className="bg-[#0f0f0f]/80 backdrop-blur-md border border-white/10 rounded-3xl p-4 shadow-2xl spotlight-card relative overflow-hidden">
          {/* Inner Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-blue-500/5 blur-[60px] rounded-full pointer-events-none" />

          {/* Header */}
          <div className="flex items-center justify-between px-4 mb-4 relative z-10">
            <div className="flex items-center gap-2 text-xs font-bold text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20">
              <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
              TokenClub Swap
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={fetchQuote}
                disabled={isLoading}
                className="p-2 hover:bg-white/5 rounded-full text-gray-400 hover:text-white transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* From */}
          <div className="bg-[#1a1a1a] rounded-2xl p-4 border border-white/5 relative z-10 group hover:border-blue-500/20 transition-colors">
            <div className="flex justify-between text-xs text-gray-500 mb-2">
              <span>You Pay</span>
              <span className="flex items-center gap-1">
                Balance: <span className="text-blue-400 font-mono">{formatNumberWithoutTrailingZeros(fromBalance.toFixed(4))}</span>
                {fromBalance > 0 && (
                  <button 
                    onClick={handleMax}
                    className="text-blue-400 hover:text-blue-300 ml-1 underline"
                  >
                    MAX
                  </button>
                )}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4 mb-2">
            <input
              type="number"
              placeholder="0.00"
              value={fromAmount}
              onChange={(e) => {
                setFromAmount(e.target.value);
                setIsEditingFrom(true);
              }}
              onFocus={() => setIsEditingFrom(true)}
              className="bg-transparent text-3xl font-bold text-white placeholder-gray-600 focus:outline-none w-full"
            />
            </div>
            <TokenSelector
              selectedToken={fromToken}
              onTokenSelect={setFromToken}
              excludeToken={toToken}
              showBalance={false}
            />
          </div>

          {/* Switch */}
          <div className="relative h-2 z-20">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
              <button
                onClick={handleSwitchTokens}
                className="p-2 bg-[#0f0f0f] border border-white/10 rounded-xl text-gray-400 hover:text-blue-400 hover:border-blue-500/30 transition-all shadow-xl"
              >
                <ArrowDown className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* To */}
          <div className="bg-[#1a1a1a] rounded-2xl p-4 border border-white/5 relative z-10 group hover:border-blue-500/20 transition-colors mt-[-10px]">
            <div className="flex justify-between text-xs text-gray-500 mb-2">
              <span>You Receive</span>
              <span className="flex items-center gap-1">
                Balance: <span className="text-gray-400 font-mono">{formatNumberWithoutTrailingZeros(toBalance.toFixed(4))}</span>
              </span>
            </div>
            <div className="flex items-center justify-between gap-4 mb-2">
            <input
              type="number"
              placeholder="0.00"
              value={toAmount}
              onChange={(e) => {
                setToAmount(e.target.value);
                setIsEditingFrom(false);
              }}
              onFocus={() => setIsEditingFrom(false)}
              className="bg-transparent text-3xl font-bold text-white placeholder-gray-600 focus:outline-none w-full"
            />
            </div>
            <TokenSelector
              selectedToken={toToken}
              onTokenSelect={setToToken}
              excludeToken={fromToken}
              showBalance={false}
            />
          </div>

          {/* Info */}
          {rate && (
            <div className="mt-4 p-3 rounded-xl bg-white/5 border border-white/5 text-xs space-y-2 relative z-10">
              <div className="flex justify-between text-gray-400">
                <span>Rate</span>
                <span className="text-white font-mono">{rate}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Platform Fee</span>
                <span className="text-white font-mono">{PLATFORM_FEES_DISPLAY.SWAP_PERCENTAGE}%</span>
              </div>
              {priceImpact && (
                <div className="flex justify-between text-gray-400">
                  <span>Price Impact</span>
                  <span className={`font-mono ${
                    parseFloat(priceImpact) < 1 ? 'text-emerald-400' : 
                    parseFloat(priceImpact) < 3 ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {parseFloat(priceImpact).toFixed(2)}%
                  </span>
                </div>
              )}
            </div>
          )}

          <div className="mt-4 relative z-10">
            {!isConnected ? (
              <PrimaryButton text="Connect Wallet" cost="" color="blue" />
            ) : (
              <PrimaryButton
                text={isSwapping ? 'Swapping...' : 'Swap'}
                cost=""
                color="blue"
                onClick={handleSwap}
                disabled={!fromAmount || parseFloat(fromAmount) <= 0 || isSwapping || isLoading || !fromToken || !toToken}
              />
            )}
          </div>
        </div>
      </div>

      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => {
          setShowSuccessModal(false);
          setModalStatus('progress');
          setModalError(null);
          setModalResult(null);
          setCurrentStep(1);
        }}
        status={modalStatus}
        error={modalError}
        result={modalResult}
        currentStep={currentStep}
        steps={[
          { title: 'Preparing swap', description: 'Validating inputs and fetching quote' },
          { title: 'Getting quote', description: 'Finding best route via Jupiter' },
          { title: 'Building transaction', description: 'Creating swap transaction' },
          { title: 'Adding platform fee', description: 'Including fee in transaction' },
          { title: 'Sign & submit', description: 'Approve the transaction in your wallet' },
          { title: 'Confirming', description: 'Waiting for on-chain confirmation' },
        ]}
        actionType="SWAP"
      />
    </>
  );
});
SwapModule.displayName = 'SwapModule';

export default SwapModule;

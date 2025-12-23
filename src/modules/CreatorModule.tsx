import React, { useState, useRef } from 'react';
import { Globe, Twitter, Send, UploadCloud, X, ChevronRight, ChevronLeft, ChevronDown, ChevronUp } from 'lucide-react';
import { Input } from '../components/ui/Input';
import { Section } from '../components/ui/Section';
import { PrimaryButton } from '../components/ui/PrimaryButton';
import { SocialInput } from '../components/ui/SocialInput';
import { Toggle } from '../components/ui/Toggle';
import { PreviewRow } from '../components/ui/PreviewRow';
import { useWallet } from '../contexts/WalletContext';
import { useNetwork } from '../contexts/NetworkContext';
import { FullTokenCreator } from '../lib/token-creation-full';
import { createBatchedTransaction } from '../lib/transactions';
import { PublicKey } from '@solana/web3.js';
import { PLATFORM_FEES_DISPLAY } from '../lib/config';
import SuccessModal, { SuccessModalResult } from '../components/ui/SuccessModal';
import { trackTokenCreationStart, trackTokenCreationComplete, trackTokenCreationError } from '../lib/analytics';

const CreatorModule = React.memo(() => {
  const { connection, address, isConnected, signAndSendTransaction } = useWallet();
  const { network } = useNetwork();
  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [description, setDescription] = useState('');
  const [totalSupply, setTotalSupply] = useState('1,000,000,000');
  const [decimals, setDecimals] = useState('9');
  const [website, setWebsite] = useState('');
  const [twitter, setTwitter] = useState('');
  const [telegram, setTelegram] = useState('');
  const [revokeMint, setRevokeMint] = useState(false);
  const [revokeFreeze, setRevokeFreeze] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [isCreating, setIsCreating] = useState(false);
  
  // Success modal state
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [modalStatus, setModalStatus] = useState<'progress' | 'success' | 'error'>('progress');
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalResult, setModalResult] = useState<SuccessModalResult | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [enableAdvancedFeatures, setEnableAdvancedFeatures] = useState(false);
  const [creatorWebsite, setCreatorWebsite] = useState('');
  const [creatorName, setCreatorName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateToken = async () => {
    if (!isConnected || !address || !name || !symbol || !totalSupply) {
      alert('Please fill in all required fields and connect your wallet');
      return;
    }

    // Validation (matching their implementation)
    if (name.length > 32) {
      alert('Token name must be 32 characters or less');
      return;
    }

    if (symbol.length > 10) {
      alert('Token symbol must be 10 characters or less');
      return;
    }

    const decimalsNum = parseInt(decimals) || 9;
    if (decimalsNum < 0 || decimalsNum > 15) {
      alert('Decimals must be between 0 and 15');
      return;
    }

    const supplyNum = parseFloat(totalSupply.replace(/,/g, '')) || 0;
    if (supplyNum <= 0) {
      alert('Supply must be greater than 0');
      return;
    }

    setIsCreating(true);
    setShowSuccessModal(true);
    setModalStatus('progress');
    setCurrentStep(1);
    setModalError(null);
    setModalResult(null);
    
    // Track token creation start
    trackTokenCreationStart();
    
    try {
      const creator = new FullTokenCreator(connection);
      const payer = new PublicKey(address);

      // 0. Check balance before uploads (prevents wasted uploads)
      const balance = await connection.getBalance(payer);
      
      // Advanced features: ONLY pass params if toggle is explicitly ON
      // If toggle is OFF, pass undefined to ensure no charge
      const requiredBalance = creator.calculateCost({
        name,
        symbol,
        description,
        decimals: parseInt(decimals) || 9,
        totalSupply: parseFloat(totalSupply.replace(/,/g, '')) || 0,
        revokeMintAuthority: revokeMint,
        revokeFreezeAuthority: revokeFreeze,
        website,
        twitter,
        telegram,
        creatorWebsite: enableAdvancedFeatures === true && creatorWebsite?.trim() ? creatorWebsite.trim() : undefined,
        creatorName: enableAdvancedFeatures === true && creatorName?.trim() ? creatorName.trim() : undefined,
      }) * 1e9; // Convert SOL to lamports, add buffer for transaction fees
      const estimatedTxFee = 0.01 * 1e9; // ~0.01 SOL for transaction fees
      const totalRequired = requiredBalance + estimatedTxFee + 0.1 * 1e9; // Add 0.1 SOL buffer

      if (balance < totalRequired) {
        const requiredSol = (totalRequired / 1e9).toFixed(3);
        const currentSol = (balance / 1e9).toFixed(3);
        throw new Error(`Insufficient balance. Required: ${requiredSol} SOL, Current: ${currentSol} SOL`);
      }

      // 1. Upload image if provided
      setCurrentStep(2);
      let imageUri = '';
      if (imageFile) {
        const uploadedUri = await creator.uploadImage(imageFile);
        imageUri = uploadedUri || '';
        if (!imageUri) {
          throw new Error('Failed to upload image');
        }
      }

      // 2. Upload metadata
      setCurrentStep(3);
      const metadataUri = await creator.uploadMetadata(
        {
          name,
          symbol,
          description,
          decimals: parseInt(decimals) || 9,
          totalSupply: parseFloat(totalSupply.replace(/,/g, '')) || 0,
          revokeMintAuthority: revokeMint,
          revokeFreezeAuthority: revokeFreeze,
          website,
          twitter,
          telegram,
          imageUri,
        },
        imageUri
      );

      if (!metadataUri) {
        throw new Error('Failed to upload metadata');
      }

      // 3. Create token with metadata
      setCurrentStep(4);
      const result = await creator.createTokenWithMetadata(
        {
          name,
          symbol,
          description,
          decimals: parseInt(decimals) || 9,
          totalSupply: parseFloat(totalSupply.replace(/,/g, '')) || 0,
          revokeMintAuthority: revokeMint,
          revokeFreezeAuthority: revokeFreeze,
          website,
          twitter,
          telegram,
          imageUri,
          creatorWebsite: enableAdvancedFeatures ? (creatorWebsite?.trim() || undefined) : undefined,
          creatorName: enableAdvancedFeatures ? (creatorName?.trim() || undefined) : undefined,
        },
        payer,
        metadataUri
      );

      if (!result) {
        throw new Error('Failed to create token instructions');
      }

      // 4. Create and send batched transaction with Address Lookup Tables
      setCurrentStep(5);
      // All instructions (mint creation, metadata, authority revocation, fee payment) 
      // are batched into a single VersionedTransaction with ALTs
      const transaction = await createBatchedTransaction(
        connection,
        result.instructions,
        payer,
        undefined, // Will auto-fetch common lookup tables
        network
      );

      // Sign the mint keypair
      transaction.sign([result.mintKeypair]);

      if (!signAndSendTransaction) {
        throw new Error('Wallet not connected');
      }

      setCurrentStep(6);
      const signature = await signAndSendTransaction(transaction);
      
      if (signature) {
        setCurrentStep(7);
        
        // Save token data to localStorage for auto-fetching
        const { saveTokenData } = await import('../lib/token-memory');
        const mintAddress = result.mintKeypair.publicKey.toBase58();
        saveTokenData({
          mintAddress,
          image: imageUri || undefined,
          name,
          symbol,
          description,
          createdAt: Date.now(),
        });

        // Improved confirmation strategy (matching their implementation)
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
        const confirmationStrategy = {
          signature,
          blockhash,
          lastValidBlockHeight,
        };

        try {
          await connection.confirmTransaction(confirmationStrategy, 'processed');
        } catch (processedError) {
          // Processed confirmation failed (not logged for security)
          await connection.confirmTransaction(confirmationStrategy, 'confirmed');
        }

        // Don't wait for finalized, but start it in background
        connection.confirmTransaction(confirmationStrategy, 'finalized')
          .catch(() => {
            // Finalized confirmation still pending (not logged for security)
          });

        // Get explorer URL
        const explorerUrl = network === 'devnet'
          ? `https://solscan.io/tx/${signature}?cluster=devnet`
          : `https://solscan.io/tx/${signature}`;

        // Track token creation complete
        const totalCost = creator.calculateCost({
          name,
          symbol,
          decimals: parseInt(decimals) || 9,
          totalSupply: parseFloat(totalSupply.replace(/,/g, '')) || 0,
          revokeMintAuthority: revokeMint,
          revokeFreezeAuthority: revokeFreeze,
          creatorWebsite: enableAdvancedFeatures ? (creatorWebsite?.trim() || undefined) : undefined,
          creatorName: enableAdvancedFeatures ? (creatorName?.trim() || undefined) : undefined,
        });
        
        trackTokenCreationComplete({
          tokenMint: mintAddress,
          tokenSymbol: symbol,
          tokenName: name,
          hasRevokeMint: revokeMint,
          hasRevokeFreeze: revokeFreeze,
          hasAdvancedFeatures: Boolean(enableAdvancedFeatures),
          totalCost,
        });

        // Set success state - modal will automatically show success view
        setModalStatus('success');
        setModalResult({
          title: 'Token Created',
          subtitle: 'Your token has been successfully deployed to Solana Network!',
          items: [
            {
              label: 'Mint Address',
              value: mintAddress,
              copyValue: mintAddress,
              explorerUrl: `https://solscan.io/token/${mintAddress}${network === 'devnet' ? '?cluster=devnet' : ''}`,
            },
            {
              label: 'Transaction Signature',
              value: signature,
              copyValue: signature,
              explorerUrl,
            },
          ],
          footer: 'Mint address has been saved and will auto-fill in future operations.',
        });

        // Reset form
        setName('');
        setSymbol('');
        setDescription('');
        setTotalSupply('');
        setWebsite('');
        setTwitter('');
        setTelegram('');
        setImageFile(null);
        setImagePreview('');
      }
    } catch (error: any) {
      console.error('Token creation error:', error);
      trackTokenCreationError(error.message || 'Unknown error');
      setModalStatus('error');
      setModalError(error.message || 'Failed to create token');
    } finally {
      setIsCreating(false);
    }
  };

  const formatSupply = (value: string) => {
    return value.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  const handleSupplyUp = () => {
    const numValue = parseFloat(totalSupply.replace(/,/g, '')) || 1000000000;
    const newValue = numValue * 10;
    setTotalSupply(formatSupply(newValue.toString()));
  };

  const handleSupplyDown = () => {
    const numValue = parseFloat(totalSupply.replace(/,/g, '')) || 1000000000;
    const newValue = Math.max(1000000, numValue / 10); // Minimum 1 million
    setTotalSupply(formatSupply(newValue.toString()));
  };

  const cost = (() => {
    let base = PLATFORM_FEES_DISPLAY.TOKEN_CREATION_BASE;
    if (revokeMint) base += PLATFORM_FEES_DISPLAY.REVOKE_MINT_AUTHORITY;
    if (revokeFreeze) base += PLATFORM_FEES_DISPLAY.REVOKE_FREEZE_AUTHORITY;
    // Add advanced features fee ONLY if toggle is explicitly ON
    if (enableAdvancedFeatures === true) {
      base += PLATFORM_FEES_DISPLAY.ADVANCED_FEATURES;
    }
    return base.toFixed(2);
  })();

  const handleNext = () => {
    if (!name || !symbol) {
      alert('Please fill in token name and symbol');
      return;
    }
    setCurrentStep(2);
  };

  const handleBack = () => {
    setCurrentStep(1);
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 md:gap-12 animate-in slide-in-from-right-8 duration-500">
      <div className="xl:col-span-7 space-y-6 md:space-y-8 relative">
        {/* Step Indicator */}
        <div className="flex items-center gap-2 md:gap-4 mb-4 md:mb-6">
          <div className={`flex items-center gap-2 ${currentStep >= 1 ? 'text-blue-400' : 'text-gray-600'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${currentStep >= 1 ? 'border-blue-400 bg-blue-500/20' : 'border-gray-600'}`}>
              {currentStep > 1 ? <X className="w-4 h-4 rotate-45" /> : '1'}
            </div>
            <span className="text-sm font-semibold">Basic Info</span>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-600" />
          <div className={`flex items-center gap-2 ${currentStep >= 2 ? 'text-blue-400' : 'text-gray-600'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${currentStep >= 2 ? 'border-blue-400 bg-blue-500/20' : 'border-gray-600'}`}>
              2
            </div>
            <span className="text-sm font-semibold">Configuration</span>
          </div>
        </div>

        {/* Step 1: Basic Information */}
        {currentStep === 1 && (
          <>
            <Section title="Token Identity" desc="Basic information visible on-chain." />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 relative z-10">
              <Input 
                label="Token Name" 
                placeholder="e.g. Solana Gem" 
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <Input 
                label="Symbol" 
                placeholder="e.g. GEM" 
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              />
            </div>
            <div className="relative z-10">
              <label className="block text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-2">Token Image</label>
              <div className="relative group">
                {imagePreview ? (
                  <div className="relative w-full h-48 rounded-2xl overflow-hidden border-2 border-blue-500/30 bg-[#121212]">
                    <img src={imagePreview} alt="Token" className="w-full h-full object-cover" />
                    <button
                      onClick={() => {
                        setImageFile(null);
                        setImagePreview('');
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="absolute top-2 right-2 bg-red-500/80 hover:bg-red-500 text-white p-1.5 rounded-full transition-all"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-48 rounded-2xl border-2 border-dashed border-blue-500/30 bg-[#121212] flex flex-col items-center justify-center cursor-pointer group-hover:bg-blue-500/10 group-hover:border-blue-500/60 transition-all"
                  >
                    <UploadCloud className="w-12 h-12 text-blue-500/50 group-hover:text-blue-400 mb-2" />
                    <span className="text-sm text-gray-400 group-hover:text-blue-400">Click to upload image</span>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />
              </div>
            </div>
            <div className="relative group z-10">
              <textarea 
                className="w-full h-32 bg-[#121212] border border-white/10 rounded-2xl px-5 py-4 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all resize-none shadow-inner" 
                placeholder="Project description..." 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              <label className="absolute left-4 -top-2.5 bg-[#0A0C0E] px-2 text-[10px] font-bold text-blue-400 uppercase tracking-wider">Description</label>
            </div>
            <Section title="Metadata Extensions" desc="Social links for DexScreener." />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
              <SocialInput 
                icon={Globe} 
                placeholder="Website" 
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
              />
              <SocialInput 
                icon={Twitter} 
                placeholder="Twitter / X" 
                value={twitter}
                onChange={(e) => setTwitter(e.target.value)}
              />
              <SocialInput 
                icon={Send} 
                placeholder="Telegram" 
                value={telegram}
                onChange={(e) => setTelegram(e.target.value)}
              />
            </div>
            <div className="pt-6 relative z-10">
              <button
                onClick={handleNext}
                disabled={!name || !symbol}
                className="w-full bg-gradient-to-r from-blue-500 to-teal-500 hover:from-blue-600 hover:to-teal-600 text-white font-bold py-3.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </>
        )}

        {/* Step 2: Configuration */}
        {currentStep === 2 && (
          <>
            <Section title="Economics" desc="Define your supply and precision." />
            <div className="grid grid-cols-2 gap-6 relative z-10">
              <div className="relative">
                <div className="space-y-1.5 relative group">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider ml-1 group-focus-within:text-blue-400 transition-colors">Total Supply</label>
                  <div className="relative flex items-center gap-2">
                    <input 
                      type="text"
                      value={totalSupply}
                      onChange={(e) => setTotalSupply(formatSupply(e.target.value))}
                      className="flex-1 bg-[#121212] border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white placeholder-gray-700 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all shadow-inner" 
                      placeholder="1,000,000,000"
                    />
                    <div className="flex flex-col gap-1.5">
                      <button
                        onClick={handleSupplyUp}
                        className="w-9 h-9 flex items-center justify-center bg-gradient-to-br from-blue-500/20 to-teal-500/20 hover:from-blue-500/30 hover:to-teal-500/30 border border-blue-500/30 rounded-lg text-blue-400 hover:text-blue-300 transition-all shadow-sm hover:shadow-blue-500/20"
                        type="button"
                        title="Multiply by 10"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <button
                        onClick={handleSupplyDown}
                        className="w-9 h-9 flex items-center justify-center bg-gradient-to-br from-blue-500/20 to-teal-500/20 hover:from-blue-500/30 hover:to-teal-500/30 border border-blue-500/30 rounded-lg text-blue-400 hover:text-blue-300 transition-all shadow-sm hover:shadow-blue-500/20"
                        type="button"
                        title="Divide by 10"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="relative">
                <div className="space-y-1.5 relative group">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider ml-1 group-focus-within:text-blue-400 transition-colors">Decimals</label>
                  <div className="relative flex items-center gap-2">
                    <input 
                      type="number"
                      value={decimals}
                      onChange={(e) => setDecimals(e.target.value)}
                      className="flex-1 bg-[#121212] border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white placeholder-gray-700 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all shadow-inner" 
                      placeholder="9"
                    />
                    <div className="flex flex-col gap-1.5">
                      <button
                        onClick={() => setDecimals(Math.min(15, parseInt(decimals) + 1).toString())}
                        className="w-9 h-9 flex items-center justify-center bg-gradient-to-br from-blue-500/20 to-teal-500/20 hover:from-blue-500/30 hover:to-teal-500/30 border border-blue-500/30 rounded-lg text-blue-400 hover:text-blue-300 transition-all shadow-sm hover:shadow-blue-500/20"
                        type="button"
                        title="Increase decimals"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDecimals(Math.max(0, parseInt(decimals) - 1).toString())}
                        className="w-9 h-9 flex items-center justify-center bg-gradient-to-br from-blue-500/20 to-teal-500/20 hover:from-blue-500/30 hover:to-teal-500/30 border border-blue-500/30 rounded-lg text-blue-400 hover:text-blue-300 transition-all shadow-sm hover:shadow-blue-500/20"
                        type="button"
                        title="Decrease decimals"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <Section title="Authorities" desc="Control token minting and freezing." />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
              <Toggle 
                title="Revoke Mint" 
                desc={`Fixed Supply (Immutable) - ${PLATFORM_FEES_DISPLAY.REVOKE_MINT_AUTHORITY} SOL`}
                value={revokeMint}
                onChange={setRevokeMint}
              />
              <Toggle 
                title="Revoke Freeze" 
                desc={`Required for Liquidity Pools - ${PLATFORM_FEES_DISPLAY.REVOKE_FREEZE_AUTHORITY} SOL`}
                value={revokeFreeze}
                onChange={setRevokeFreeze}
              />
            </div>
            
            {/* Advanced Features - Toggle */}
            <div className="relative z-10 mt-4">
              <Toggle
                title="Advanced Features"
                desc={`Add custom creator information (+${PLATFORM_FEES_DISPLAY.ADVANCED_FEATURES} SOL)`}
                value={enableAdvancedFeatures}
                onChange={(value) => {
                  setEnableAdvancedFeatures(value);
                  // Reset fields when toggle is turned off
                  if (!value) {
                    setCreatorWebsite('');
                    setCreatorName('');
                  }
                }}
              />
              
              {enableAdvancedFeatures && (
                <div className="mt-4 space-y-4 p-4 bg-[#0A0C0E] border border-white/5 rounded-xl">
                  <Input 
                    label="Creator Website (Optional)" 
                    placeholder="https://your-website.com" 
                    value={creatorWebsite}
                    onChange={(e) => setCreatorWebsite(e.target.value)}
                  />
                  
                  <Input 
                    label="Creator Name (Optional)" 
                    placeholder="Your name or organization" 
                    value={creatorName}
                    onChange={(e) => setCreatorName(e.target.value)}
                  />
                  
                  <p className="text-xs text-gray-500 mt-2">
                    Note: Advanced features fee ({PLATFORM_FEES_DISPLAY.ADVANCED_FEATURES} SOL) will be charged when toggle is ON.
                  </p>
                </div>
              )}
            </div>

            <div className="pt-6 relative z-10 flex gap-4">
              <button
                onClick={handleBack}
                className="flex-1 bg-[#121212] border border-white/10 hover:border-blue-500/30 text-white font-bold py-3.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <ChevronLeft className="w-5 h-5" />
                Back
              </button>
              <div className="flex-1">
                <PrimaryButton 
                  text={isCreating ? 'Creating Token...' : 'Launch Token'} 
                  cost={`${cost} SOL`} 
                  color="teal"
                  onClick={handleCreateToken}
                  disabled={!isConnected || isCreating || !name || !symbol || !totalSupply}
                />
              </div>
            </div>
          </>
        )}
      </div>
      
      {/* Preview Card - Sticky */}
      <div className="xl:col-span-5 xl:sticky xl:top-0 order-last xl:order-last">
        <div className="sticky top-0 w-full">
          <div className="w-full max-w-[380px] mx-auto aspect-[3/4.5] rounded-[40px] bg-gradient-to-b from-[#1c1c1c]/80 to-[#0c0c0c]/80 backdrop-blur-md border border-white/10 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.9)] flex flex-col items-center p-8 text-center relative overflow-hidden transform transition-transform hover:scale-[1.01] duration-500 spotlight-card ring-1 ring-white/5">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1/2 bg-blue-500/10 blur-[80px] rounded-full pointer-events-none" />
            <div className="relative z-10 mb-8">
              {imagePreview ? (
                <div className="w-32 h-32 rounded-full overflow-hidden border-2 border-blue-500/30 mx-auto">
                  <img src={imagePreview} alt="Token" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-32 h-32 rounded-full border-2 border-dashed border-blue-500/30 flex items-center justify-center mx-auto bg-blue-500/5">
                  <UploadCloud className="w-10 h-10 text-blue-500/30" />
                </div>
              )}
            </div>
            <div className="relative z-10 w-full space-y-2">
              <h3 className="text-3xl font-black text-white tracking-tight drop-shadow-md">
                {name || 'Token Name'}
              </h3>
              <span className="inline-block px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs font-mono text-blue-400">
                {symbol || 'SYMBOL'}
              </span>
            </div>
            <div className="relative z-10 mt-auto w-full bg-[#050505]/60 rounded-2xl p-5 border border-white/5 space-y-3 backdrop-blur-sm shadow-inner">
              <PreviewRow label="Supply" value={totalSupply || '0'} />
              <PreviewRow 
                label="Authority" 
                value={revokeMint ? 'Revoked' : 'Active'} 
                active={revokeMint} 
              />
              <PreviewRow label="Program" value="Token-2022" />
            </div>
          </div>
        </div>
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
        title="Creating Token"
        errorTitle="Token Creation Failed"
        successTitle="Token Created"
        error={modalError}
        status={modalStatus}
        result={modalResult}
        variant="steps"
        loadingTitle="Deploying your token to Solana…"
        loadingSubtitle="Hang tight while we upload metadata and confirm your mint."
        loadingDetails={[
          'Uploading metadata to IPFS',
          'Creating Token mint',
          'Waiting for Solana confirmation'
        ]}
        currentStep={currentStep}
        totalSteps={7}
        steps={[
          { title: 'Validating inputs', description: 'Checking token parameters...' },
          { title: 'Uploading image', description: 'Storing image on IPFS...' },
          { title: 'Uploading metadata', description: 'Storing metadata on IPFS...' },
          { title: 'Building transaction', description: 'Creating mint and metadata instructions...' },
          { title: 'Preparing transaction', description: 'Batching instructions with ALTs...' },
          { title: 'Awaiting signature', description: 'Approve the transaction in your wallet...' },
          { title: 'Finalizing on-chain', description: 'Waiting for confirmation...' },
        ]}
        actionType="CREATE"
      />
    </div>
  );
});
CreatorModule.displayName = 'CreatorModule';

export default CreatorModule;

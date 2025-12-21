import React, { useState } from 'react';
import { RefreshCw, Coins } from 'lucide-react';
import { useWallet } from '../contexts/WalletContext';
import { useNetwork } from '../contexts/NetworkContext';
import { SecurityManager } from '../lib/security';
import { createBatchedTransaction } from '../lib/transactions';
import { PublicKey } from '@solana/web3.js';
import { SuccessModal, SuccessModalResult } from '../components/ui/SuccessModal';
import { PLATFORM_FEES_DISPLAY, PLATFORM_FEES, getPlatformFeeWallet } from '../lib/config';
import { SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { trackWalletScan, trackAccountCleanup } from '../lib/analytics';

const SecurityModule = React.memo(() => {
  const { connection, address, isConnected, signAndSendTransaction } = useWallet();
  const { network } = useNetwork();
  
  // Cleanup state
  const [emptyAccounts, setEmptyAccounts] = useState<PublicKey[]>([]);
  const [allAccounts, setAllAccounts] = useState<Array<{
    account: PublicKey;
    mint: string;
    balance: string;
    decimals: number;
    isEmpty: boolean;
  }>>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [modalStatus, setModalStatus] = useState<'progress' | 'success' | 'error'>('progress');
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalResult, setModalResult] = useState<SuccessModalResult | null>(null);
  const [currentStep, setCurrentStep] = useState(1);

  const securityManager = new SecurityManager(connection);

  const handleScanWallet = async () => {
    if (!isConnected || !address) {
      alert('Please connect wallet');
      return;
    }

    setIsScanning(true);
    try {
      const owner = new PublicKey(address);
      // Get all accounts first to show user what's in their wallet
      const all = await securityManager.getAllTokenAccounts(owner);
      setAllAccounts(all);
      
      // Get verified empty accounts (this does proper verification for mainnet)
      const empty = await securityManager.getEmptyTokenAccounts(owner);
      setEmptyAccounts(empty);
      
      // Track wallet scan
      trackWalletScan({
        accountsFound: all.length,
      });
    } catch (error: any) {
      console.error('Scan error:', error);
      alert(error.message || 'Failed to scan wallet');
    } finally {
      setIsScanning(false);
    }
  };

  const handleCloseAccounts = async () => {
    if (!isConnected || !address || emptyAccounts.length === 0) {
      return;
    }

    setIsProcessing(true);
    setShowSuccessModal(true);
    setModalStatus('progress');
    setCurrentStep(1);
    setModalError(null);
    setModalResult(null);

    try {
      const owner = new PublicKey(address);
      
      setCurrentStep(2);
      const instructions = await securityManager.createCloseAccountInstructions(
        owner,
        emptyAccounts
      );

      if (instructions.length === 0) {
        setShowSuccessModal(false);
        setIsProcessing(false);
        alert('No accounts to close');
        return;
      }

      setCurrentStep(3);
      
      // Add platform fee instruction
      const feeWallet = new PublicKey(getPlatformFeeWallet());
      const feeAmount = Math.floor(PLATFORM_FEES.CLOSE_ACCOUNTS * LAMPORTS_PER_SOL);
      const feeInstruction = SystemProgram.transfer({
        fromPubkey: owner,
        toPubkey: feeWallet,
        lamports: feeAmount,
      });
      
      // Add fee instruction at the beginning
      const allInstructions = [feeInstruction, ...instructions];
      
      // Batch all instructions into single VersionedTransaction with ALTs
      const transaction = await createBatchedTransaction(
        connection,
        allInstructions,
        owner,
        undefined,
        network
      );

      if (!signAndSendTransaction) {
        throw new Error('Wallet not connected');
      }

      setCurrentStep(4);
      const signature = await signAndSendTransaction(transaction);
      
      if (signature) {
        setCurrentStep(5);
        await connection.confirmTransaction(signature, 'confirmed');
        
        const explorerUrl = network === 'devnet'
          ? `https://solscan.io/tx/${signature}?cluster=devnet`
          : `https://solscan.io/tx/${signature}`;

        const estimatedRecovery = instructions.length * 0.002;

        // Track account cleanup
        trackAccountCleanup({
          accountsClosed: instructions.length,
          rentRecovered: estimatedRecovery,
        });

        setModalStatus('success');
        setModalResult({
          title: 'Account Cleanup Complete',
          subtitle: `Successfully closed ${instructions.length} empty account(s) and recovered ~${estimatedRecovery.toFixed(4)} SOL!`,
          items: [
            {
              label: 'Accounts Closed',
              value: `${instructions.length} account(s)`,
              copyValue: false,
            },
            {
              label: 'Rent Recovered',
              value: `~${estimatedRecovery.toFixed(4)} SOL`,
              copyValue: false,
            },
            {
              label: 'Transaction Signature',
              value: signature,
              copyValue: signature,
              explorerUrl,
            },
          ],
          footer: 'Rent has been recovered and sent to your wallet.',
        });

        setEmptyAccounts([]);
      }
    } catch (error: any) {
      console.error('Close accounts error:', error);
      setModalStatus('error');
      setModalError(error.message || 'Failed to close accounts');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto animate-in slide-in-from-right-8 duration-500">
      <div className="bg-[#0f0f0f]/60 border border-white/10 rounded-3xl p-8 min-h-[400px] spotlight-card relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-blue-500/5 blur-[100px] rounded-full pointer-events-none" />
        <div className="space-y-6 flex flex-col items-center justify-center min-h-[400px] text-center relative z-10">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
            <Coins className="w-8 h-8 text-emerald-400" />
          </div>
          <h3 className="text-xl font-bold text-white">Account Cleanup</h3>
          <p className="text-gray-500 max-w-md">
            Scan your wallet for empty token accounts and close them to recover ~0.002 SOL per account. Platform fee: {PLATFORM_FEES_DISPLAY.CLOSE_ACCOUNTS} SOL.
          </p>
          {allAccounts.length > 0 && (
            <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl w-full max-w-md">
              <p className="text-blue-400 font-bold mb-2">
                Found {allAccounts.length} token account(s) total
              </p>
              <p className="text-xs text-gray-400 mb-2">
                {allAccounts.filter(a => !a.isEmpty).length} with balance, {emptyAccounts.length} empty (can be closed)
              </p>
              {emptyAccounts.length > 0 && (
                <p className="text-xs text-emerald-400 font-semibold">
                  Estimated recovery: ~{(emptyAccounts.length * 0.002).toFixed(4)} SOL
                </p>
              )}
            </div>
          )}
          <div className="flex gap-3 mt-4">
            <button
              onClick={handleScanWallet}
              disabled={isScanning || !isConnected}
              className="px-8 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors font-bold text-sm disabled:opacity-50"
            >
              {isScanning ? 'Scanning...' : 'Scan Wallet'}
            </button>
            {emptyAccounts.length > 0 && (
              <button
                onClick={handleCloseAccounts}
                disabled={isProcessing || !isConnected}
                className="px-8 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors font-bold text-sm text-emerald-400 disabled:opacity-50"
              >
                {isProcessing ? 'Processing...' : `Close ${emptyAccounts.length} Account(s)`}
              </button>
            )}
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
        title="Cleaning Up Accounts"
        errorTitle="Account Cleanup Failed"
        successTitle="Account Cleanup Complete"
        error={modalError}
        status={modalStatus}
        result={modalResult}
        variant="steps"
        currentStep={currentStep}
        steps={[
          { title: 'Scanning wallet', description: 'Identifying empty token accounts...' },
          { title: 'Building instructions', description: 'Preparing close account instructions...' },
          { title: 'Batching transaction', description: 'Combining instructions into single transaction...' },
          { title: 'Awaiting signature', description: 'Approve the transaction in your wallet...' },
          { title: 'Finalizing on-chain', description: 'Waiting for confirmation...' },
        ]}
        actionType="CLEANUP"
      />
    </div>
  );
});
SecurityModule.displayName = 'SecurityModule';

export default SecurityModule;

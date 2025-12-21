import React, { useState, useEffect } from 'react';
import { Check, Copy, ExternalLink, X, Loader, Rocket, Droplet, Upload, Lock, Coins, Flame } from 'lucide-react';
import { useNetwork } from '../../contexts/NetworkContext';

export type ActionType = 'CREATE' | 'INITIALIZE' | 'ADD' | 'REMOVE' | 'LOCK' | 'CLAIM' | 'CLEANUP' | 'SWAP';

export interface SuccessModalItem {
  label: string;
  value: string;
  copyValue?: string | false;
  explorerUrl?: string;
}

export interface SuccessModalResult {
  title?: string;
  subtitle?: string;
  items?: SuccessModalItem[];
  footer?: string;
  primaryAction?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
}

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  errorTitle?: string;
  successTitle?: string;
  error?: string | null;
  status?: 'progress' | 'success' | 'error';
  result?: SuccessModalResult | null;
  variant?: 'steps' | 'loading';
  loadingTitle?: string;
  loadingSubtitle?: string;
  loadingDetails?: string[];
  currentStep?: number;
  steps?: Array<{ title: string; description?: string; signature?: string }>;
  actionType?: ActionType;
  stepDescriptions?: string[];
  totalSteps?: number;
}

const SuccessModal: React.FC<SuccessModalProps> = ({
  isOpen,
  onClose,
  title = 'Processing...',
  errorTitle = 'Operation Failed',
  successTitle = 'Action completed successfully! 🎉',
  error,
  status = 'progress',
  result,
  variant = 'steps',
  loadingTitle = 'Working on it…',
  loadingSubtitle = 'Please keep this window open while we finish up.',
  loadingDetails = [
    'Signing transactions',
    'Writing data to Solana',
    'Confirming on-chain status'
  ],
  currentStep = 1,
  steps = [],
  actionType,
  stepDescriptions = [],
  totalSteps = 0,
}) => {
  const { network } = useNetwork();
  const [copiedLabel, setCopiedLabel] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [isOpen]);

  const computedStatus = error ? 'error' : status;

  // Get action-based styling
  const getActionColor = () => {
    switch (actionType) {
      case 'CREATE': return 'border-teal-500';
      case 'INITIALIZE': return 'border-teal-500';
      case 'ADD': return 'border-blue-500';
      case 'REMOVE': return 'border-yellow-500';
      case 'LOCK': return 'border-purple-500';
      case 'CLAIM': return 'border-purple-400';
      case 'CLEANUP': return 'border-emerald-500';
      case 'SWAP': return 'border-cyan-500';
      default: return 'border-teal-500';
    }
  };

  const getActionIcon = () => {
    switch (actionType) {
      case 'CREATE': return Rocket;
      case 'INITIALIZE': return Rocket;
      case 'ADD': return Droplet;
      case 'REMOVE': return Upload;
      case 'LOCK': return Lock;
      case 'CLAIM': return Coins;
      case 'CLEANUP': return Coins;
      case 'SWAP': return Droplet;
      default: return Check;
    }
  };

  const getActionButtonColor = () => {
    switch (actionType) {
      case 'CREATE': return 'bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600';
      case 'INITIALIZE': return 'bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600';
      case 'ADD': return 'bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600';
      case 'REMOVE': return 'bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600';
      case 'LOCK': return 'bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700';
      case 'CLAIM': return 'bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700';
      case 'CLEANUP': return 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600';
      case 'SWAP': return 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600';
      default: return 'bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600';
    }
  };

  const handleCopy = async (value: string, label: string) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopiedLabel(label);
      setTimeout(() => setCopiedLabel(null), 2500);
    } catch (copyError) {
      // Clipboard copy failed (not logged for security)
    }
  };

  const getExplorerUrl = (signature: string): string => {
    const baseUrl = network === 'devnet' 
      ? 'https://solscan.io/tx' 
      : 'https://solscan.io/tx';
    return `${baseUrl}/${signature}?cluster=${network === 'devnet' ? 'devnet' : 'mainnet-beta'}`;
  };

  const truncateAddress = (address: string, maxLength: number = 20): string => {
    if (address.length <= maxLength) return address;
    return `${address.substring(0, 10)}...${address.substring(address.length - 10)}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-[#0f0f0f]/95 border border-white/10 rounded-3xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-[0_25px_80px_rgba(5,9,20,0.65)] mt-10 mb-10">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white">
            {computedStatus === 'error'
              ? errorTitle
              : computedStatus === 'success'
              ? successTitle
              : title}
          </h3>

          {computedStatus !== 'progress' && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-xl border border-white/10 transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          )}
        </div>

        {computedStatus === 'error' ? (
          <div className="text-center py-4">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <X className="w-8 h-8 text-red-400" />
            </div>
            <p className="text-red-400 mb-4 font-medium">{error}</p>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl border border-white/15 transition-colors"
            >
              Close
            </button>
          </div>
        ) : computedStatus === 'success' && result ? (
          <div className="space-y-5">
            <div className="text-center space-y-3">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto border-2 ${getActionColor()}`} style={{
                background: actionType === 'LOCK' || actionType === 'CLAIM' 
                  ? 'rgba(168, 85, 247, 0.1)' 
                  : actionType === 'CLEANUP'
                  ? 'rgba(16, 185, 129, 0.1)'
                  : actionType === 'SWAP'
                  ? 'rgba(6, 182, 212, 0.1)'
                  : 'rgba(20, 184, 166, 0.1)'
              }}>
                {React.createElement(getActionIcon(), { 
                  className: `w-8 h-8 ${
                    actionType === 'LOCK' || actionType === 'CLAIM' 
                      ? 'text-purple-400' 
                      : actionType === 'CLEANUP'
                      ? 'text-emerald-400'
                      : actionType === 'SWAP'
                      ? 'text-cyan-400'
                      : 'text-teal-400'
                  }` 
                })}
              </div>
              <div>
                <p className="text-lg font-semibold text-white">
                  {result.title || successTitle}
                </p>
                {result.subtitle && (
                  <p className="text-sm text-gray-400 mt-1">{result.subtitle}</p>
                )}
              </div>
            </div>

            {Array.isArray(result.items) && result.items.length > 0 && (
              <div className="space-y-3">
                {result.items.map((item, idx) => (
                  <div
                    key={`${item.label}-${idx}`}
                    className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/5 p-4"
                  >
                    <div className="flex flex-col">
                      <span className="text-xs uppercase tracking-[0.2em] text-gray-400">
                        {item.label}
                      </span>
                      <span className="text-sm text-white font-mono break-all mt-1" style={{ maxWidth: '200px' }}>
                        {truncateAddress(item.value)}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {item.explorerUrl && (
                        <a
                          href={item.explorerUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-full bg-white/10 border border-white/15 text-white hover:bg-white/20 transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          View
                        </a>
                      )}
                      {item.copyValue !== false && (
                        <button
                          onClick={() => handleCopy(item.copyValue || item.value, item.label)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-full bg-white/10 border border-white/15 text-white hover:bg-white/20 transition-colors"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          {copiedLabel === item.label ? 'Copied' : 'Copy'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {result.footer && (
              <p className="text-xs text-gray-400 text-center">{result.footer}</p>
            )}

            <div className="flex flex-col gap-3 pt-2">
              {result.primaryAction && (
                <a
                  href={result.primaryAction.href}
                  target={result.primaryAction.href ? '_blank' : undefined}
                  rel={result.primaryAction.href ? 'noopener noreferrer' : undefined}
                  onClick={!result.primaryAction.href ? result.primaryAction.onClick : undefined}
                  className={`w-full text-center px-4 py-2.5 rounded-xl font-semibold text-white hover:opacity-90 transition-opacity ${getActionButtonColor()}`}
                >
                  {result.primaryAction.label}
                </a>
              )}
              <button
                onClick={onClose}
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white font-medium hover:bg-white/10 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        ) : variant === 'loading' ? (
          <div className="flex flex-col items-center text-center space-y-5 py-4">
            <div className="relative w-28 h-28 rounded-full bg-gradient-to-br from-cyan-400/30 to-indigo-500/30 border border-white/10 flex items-center justify-center animate-spin">
              <div className="absolute inset-3 rounded-full bg-[#05070d] border border-white/5 flex items-center justify-center">
                <Loader className="w-8 h-8 text-cyan-300 animate-spin" />
              </div>
            </div>
            <div>
              <p className="text-lg font-semibold text-white">{loadingTitle}</p>
              <p className="text-sm text-gray-400 mt-2">{loadingSubtitle}</p>
            </div>
            <div className="w-full bg-white/5 rounded-2xl p-4 border border-white/10 space-y-2">
              {loadingDetails.map((detail, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm text-gray-300">
                  <span>{detail}</span>
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {((stepDescriptions && stepDescriptions.length > 0) 
              ? stepDescriptions.map((desc, idx) => ({ title: desc, description: undefined, signature: undefined }))
              : steps || []).map((step, index) => {
              const stepNumber = index + 1;
              const isCompleted = stepNumber < currentStep;
              const isCurrent = stepNumber === currentStep;

              return (
                <div
                  key={index}
                  className={`flex items-center space-x-4 p-3 rounded-2xl transition-all ${
                    isCompleted
                      ? 'bg-green-500/10 border border-green-400/30'
                      : isCurrent
                      ? 'bg-[#6aa8ff]/10 border border-[#6aa8ff]/40'
                      : 'bg-[#0f1115]/80 border border-white/10'
                  }`}
                >
                  <div
                    className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                      isCompleted
                        ? 'bg-green-500 text-white'
                        : isCurrent
                        ? 'bg-[#6aa8ff] text-white'
                        : 'bg-white/15 text-gray-400'
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="w-4 h-4" />
                    ) : isCurrent ? (
                      <Loader className="w-4 h-4 animate-spin" />
                    ) : (
                      stepNumber
                    )}
                  </div>

                  <div className="flex-1">
                    <p
                      className={`font-medium ${
                        isCompleted
                          ? 'text-[#19d36b]'
                          : isCurrent
                          ? 'text-[#19d5f5]'
                          : 'text-gray-400'
                      }`}
                    >
                      {step.title}
                    </p>
                    {step.description && (
                      <p className="text-sm text-gray-500 mt-1">{step.description}</p>
                    )}
                    {step.signature && isCompleted && (
                      <p className="text-xs text-gray-400 mt-1 font-mono break-all">
                        Tx: {step.signature.slice(0, 8)}...{step.signature.slice(-8)}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!error && computedStatus === 'progress' && steps?.length > 0 && currentStep === steps.length + 1 && (
          <div className="mt-6 text-center">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-400" />
            </div>
            <p className="text-green-400 font-medium mb-4">{successTitle}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SuccessModal;
export { SuccessModal };


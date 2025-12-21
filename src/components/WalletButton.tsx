import React from 'react';
import { Wallet } from 'lucide-react';
import { useWallet } from '../contexts/WalletContext';

export const WalletButton: React.FC = () => {
  const { isConnected, address, connect, disconnect } = useWallet();

  const handleClick = async () => {
    try {
      if (isConnected) {
        await disconnect();
      } else {
        await connect();
      }
    } catch (error) {
      console.error('Wallet action error:', error);
    }
  };

  const displayAddress = address
    ? `${address.slice(0, 4)}...${address.slice(-4)}`
    : 'Connect Wallet';
  
  return (
    <button
      onClick={handleClick}
      className="
        w-auto md:w-full py-2 md:py-3.5 px-3 md:px-4 rounded-xl bg-gradient-to-r from-teal-500/10 to-blue-500/10 
        border border-teal-500/20 text-teal-400 font-bold text-xs md:text-sm
        hover:bg-gradient-to-r hover:from-teal-500/20 hover:to-blue-500/20 
        hover:border-teal-500/40 hover:shadow-[0_0_20px_rgba(45,212,191,0.2)]
        transition-all flex items-center justify-center gap-1.5 md:gap-2 group
      "
    >
      <Wallet className="w-3.5 h-3.5 md:w-4 md:h-4 transition-transform group-hover:-rotate-12" />
      <span className="hidden sm:inline">{displayAddress}</span>
      <span className="sm:hidden">{isConnected ? address?.slice(0, 4) + '...' : 'Connect'}</span>
    </button>
  );
};


import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Network, getDefaultNetwork, NETWORK_STORAGE_KEY } from '../lib/config';

interface NetworkContextType {
  network: Network;
  toggleNetwork: () => void;
  isDevnet: boolean;
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

export const NetworkProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [network, setNetwork] = useState<Network>(getDefaultNetwork());

  const toggleNetwork = useCallback(() => {
    setNetwork((prev) => {
      const newNetwork = prev === 'mainnet-beta' ? 'devnet' : 'mainnet-beta';
      localStorage.setItem(NETWORK_STORAGE_KEY, newNetwork);
      return newNetwork;
    });
  }, []);

  // Admin toggle: Ctrl+Shift+E
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'E') {
        e.preventDefault();
        toggleNetwork();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleNetwork]);

  return (
    <NetworkContext.Provider value={{ network, toggleNetwork, isDevnet: network === 'devnet' }}>
      {children}
    </NetworkContext.Provider>
  );
};

export const useNetwork = (): NetworkContextType => {
  const context = useContext(NetworkContext);
  if (!context) {
    throw new Error('useNetwork must be used within NetworkProvider');
  }
  return context;
};


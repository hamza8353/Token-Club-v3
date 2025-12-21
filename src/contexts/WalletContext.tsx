import React, { createContext, useContext, useMemo, useEffect, useRef } from 'react';
import { AppKitProvider, useAppKitAccount, useAppKit } from '@reown/appkit/react';
import { useDisconnect, useAppKitProvider } from '@reown/appkit-controllers/react';
import { SolanaAdapter } from '@reown/appkit-adapter-solana';
import { solana, solanaDevnet } from '@reown/appkit/networks';
import { useNetwork } from './NetworkContext';
import { Connection, VersionedTransaction } from '@solana/web3.js';
import { getRpcUrl } from '../lib/config';
import { trackWalletConnect, trackWalletDisconnect } from '../lib/analytics';

interface WalletContextType {
  connection: Connection;
  address: string | null;
  isConnected: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  signAndSendTransaction?: (transaction: any) => Promise<string | undefined>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

// Initialize Reown AppKit config
const projectId = import.meta.env.VITE_REOWN_PROJECT_ID || '';

// Note: do not log env/config status in console (security requirement)

// Helper to create network configs with custom RPC URLs
const createNetworkConfig = () => {
  const mainnetNetwork = {
    ...solana,
    rpcUrls: {
      default: {
        http: [getRpcUrl('mainnet-beta')] as [string, ...string[]],
      },
    },
  };

  const devnetNetwork = {
    ...solanaDevnet,
    rpcUrls: {
      default: {
        http: [getRpcUrl('devnet')] as [string, ...string[]],
      },
    },
  };

  return {
    adapters: [
      new SolanaAdapter({
        connectionSettings: {
          commitment: 'confirmed',
        },
      }),
    ],
    networks: [mainnetNetwork, devnetNetwork] as any,
    defaultNetwork: mainnetNetwork,
    projectId,
    metadata: {
      name: 'TokenClub',
      description: 'Create, swap, and manage tokens on Solana',
      url: window.location.origin,
      icons: [`${window.location.origin}/favicon.ico`],
    },
  };
};

const appKitConfig = createNetworkConfig();

// Inner provider that uses AppKit hooks
const WalletContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { network } = useNetwork();
  const { address, isConnected } = useAppKitAccount({ namespace: 'solana' });
  const { open } = useAppKit();
  const { disconnect: disconnectWallet } = useDisconnect();
  const { walletProvider } = useAppKitProvider<any>('solana');

  const connection = useMemo(() => {
    return new Connection(getRpcUrl(network), 'confirmed');
  }, [network]);

  // Track wallet connection/disconnection
  const prevConnectedRef = useRef(false);
  useEffect(() => {
    if (isConnected && address && !prevConnectedRef.current) {
      trackWalletConnect();
      prevConnectedRef.current = true;
    } else if (!isConnected && prevConnectedRef.current) {
      trackWalletDisconnect();
      prevConnectedRef.current = false;
    }
  }, [isConnected, address]);

  const connect = async () => {
    try {
      // Open the connect modal with Solana namespace
      const result = await open({ 
        view: 'Connect',
        namespace: 'solana'
      });
      // Modal opened (result not logged for security)
      // Note: Wallet connection tracking happens via useEffect when isConnected changes
    } catch (error: any) {
      console.error('Error opening wallet connection:', error);
      // Show user-friendly error
      alert(`Failed to open wallet connection: ${error?.message || 'Unknown error'}`);
    }
  };

  const disconnect = async () => {
    trackWalletDisconnect();
    await disconnectWallet();
  };

  const signAndSendTransaction = async (transaction: VersionedTransaction): Promise<string | undefined> => {
    if (!isConnected || !address) {
      throw new Error('Wallet not connected');
    }

    if (!walletProvider) {
      throw new Error('Wallet provider not available');
    }

    try {
      // Sign the transaction with the wallet provider
      const signedTransaction = await walletProvider.signTransaction(transaction);
      
      // Send the signed transaction
      const signature = await connection.sendRawTransaction(signedTransaction.serialize(), {
        skipPreflight: false,
        maxRetries: 3,
      });

      return signature;
    } catch (error: any) {
      console.error('Transaction signing error:', error);
      throw error;
    }
  };

  const value = useMemo(
    () => ({
      connection,
      address: address || null,
      isConnected: isConnected || false,
      connect,
      disconnect,
      signAndSendTransaction,
    }),
    [connection, address, isConnected, open, disconnectWallet]
  );

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
};

// Outer provider that wraps with AppKitProvider
export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <AppKitProvider {...appKitConfig}>
      <WalletContextProvider>{children}</WalletContextProvider>
    </AppKitProvider>
  );
};

export const useWallet = (): WalletContextType => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within WalletProvider');
  }
  return context;
};


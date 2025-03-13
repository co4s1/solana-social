// src/components/WalletProvider.js - With debugging and explicit initialization
import { useMemo, useState, useEffect } from 'react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';

// Default styles that can be overridden
import '@solana/wallet-adapter-react-ui/styles.css';
import { SOLANA_RPC_HOST } from '../utils/constants';

export default function WalletConnectionProvider({ children }) {
  // Track if we're on client-side
  const [mounted, setMounted] = useState(false);
  const [walletError, setWalletError] = useState(null);
  
  // Set up network - devnet for development
  const network = WalletAdapterNetwork.Devnet;
  
  // Use custom RPC endpoint if provided
  const endpoint = useMemo(() => {
    const defaultEndpoint = SOLANA_RPC_HOST || clusterApiUrl(network);
    console.log(`Using Solana RPC endpoint: ${defaultEndpoint}`);
    return defaultEndpoint;
  }, [network]);
  
  // Set up wallet adapters with detailed logging
  const wallets = useMemo(() => {
    try {
      console.log("Initializing wallet adapters");
      
      const phantomWallet = new PhantomWalletAdapter();
      console.log("Phantom wallet initialized:", {
        name: phantomWallet.name,
        ready: phantomWallet.ready
      });
      
      const solflareWallet = new SolflareWalletAdapter({ network });
      console.log("Solflare wallet initialized:", {
        name: solflareWallet.name,
        ready: solflareWallet.ready
      });
      
      return [phantomWallet, solflareWallet];
    } catch (error) {
      console.error("Error initializing wallet adapters:", error);
      setWalletError(`Wallet initialization error: ${error.message}`);
      return [];
    }
  }, [network]);
  
  // Handle client-side rendering
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Until we're mounted, don't render anything to avoid hydration issues
  if (!mounted) {
    return null;
  }
  
  // Handle wallet errors
  const handleWalletError = (error) => {
    console.error("Wallet error:", error);
    setWalletError(`Wallet error: ${error.message}`);
    
    // Auto-clear after 5 seconds
    setTimeout(() => setWalletError(null), 5000);
  };

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider 
        wallets={wallets} 
        autoConnect={true}
        onError={handleWalletError}
      >
        <WalletModalProvider>
          {walletError && (
            <div className="fixed top-0 left-0 right-0 bg-red-600 text-white py-2 px-4 text-center z-50">
              {walletError}
              <button 
                className="ml-4 bg-white text-red-600 px-2 rounded text-sm"
                onClick={() => setWalletError(null)}
              >
                Dismiss
              </button>
            </div>
          )}
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
// src/components/WalletWrapper.js - with enhanced connection handling

import { useState, useEffect, createContext, useContext } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';

// Create context for the enhanced wallet info
const WalletWrapperContext = createContext({
  ready: false,
  isConnected: false,
  publicKeyString: null,
  walletName: null,
  ensureWalletConnected: async () => false,
});

export const useWalletWrapper = () => useContext(WalletWrapperContext);

export default function WalletWrapper({ children }) {
  const { connected, connecting, disconnecting, publicKey, wallet, connect, disconnect } = useWallet();
  const [ready, setReady] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [publicKeyString, setPublicKeyString] = useState(null);
  const [walletName, setWalletName] = useState(null);
  const [mounted, setMounted] = useState(false);
  const [connectionAttempt, setConnectionAttempt] = useState(0);

  // Handle client-side only rendering
  useEffect(() => {
    setMounted(true);
  }, []);

  // Actively try to connect the wallet when needed
  const ensureWalletConnected = async () => {
    if (!wallet) {
      console.log("No wallet adapter selected");
      return false;
    }
    
    try {
      // Check if already properly connected
      if (connected && wallet.adapter && wallet.adapter.publicKey && 
          publicKey && wallet.adapter.publicKey.toString() === publicKey.toString()) {
        return true;
      }
      
      // Try to connect if not already connected
      if (!connected || !wallet.adapter.connected) {
        console.log("Attempting to connect wallet");
        await connect();
        
        // Wait for connection to take effect
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Check if connection succeeded
        if (wallet.adapter && wallet.adapter.connected && wallet.adapter.publicKey) {
          console.log("Wallet connected successfully");
          return true;
        } else {
          console.log("Wallet connection failed");
          return false;
        }
      }
      
      return false;
    } catch (error) {
      console.error("Error ensuring wallet connection:", error);
      return false;
    }
  };

  // Handle wallet state changes
  useEffect(() => {
    if (!mounted) return;
    
    const checkWalletState = () => {
      // Check if wallet is properly initialized
      const adapterInitialized = wallet && 
                                wallet.adapter && 
                                wallet.adapter.publicKey && 
                                publicKey;
      
      setReady(adapterInitialized);
      setIsConnected(connected && adapterInitialized);
      setPublicKeyString(publicKey ? publicKey.toString() : null);
      setWalletName(wallet?.adapter?.name || null);
      
      console.log("Wallet state:", {
        connected,
        connecting,
        disconnecting,
        adapterInitialized,
        publicKey: publicKey?.toString(),
        walletName: wallet?.adapter?.name,
      });
    };
    
    checkWalletState();
    
    // If we're in a connecting or disconnecting state, poll for changes
    if (connecting || disconnecting) {
      const interval = setInterval(checkWalletState, 500);
      return () => clearInterval(interval);
    }
  }, [connected, connecting, disconnecting, publicKey, wallet, mounted]);
  
  // Try to auto-connect the wallet periodically until success
  useEffect(() => {
    if (!mounted || isConnected || connecting || !wallet || connectionAttempt > 3) return;
    
    const timer = setTimeout(async () => {
      try {
        console.log(`Connection attempt ${connectionAttempt + 1}`);
        await connect();
        setConnectionAttempt(prev => prev + 1);
      } catch (error) {
        console.error("Auto-connect attempt failed:", error);
        setConnectionAttempt(prev => prev + 1);
      }
    }, 1000 * (connectionAttempt + 1)); // Increasing delay between attempts
    
    return () => clearTimeout(timer);
  }, [mounted, isConnected, connecting, connect, wallet, connectionAttempt]);

  return (
    <WalletWrapperContext.Provider 
      value={{
        ready,
        isConnected,
        publicKeyString,
        walletName,
        ensureWalletConnected,
      }}
    >
      {children}
    </WalletWrapperContext.Provider>
  );
}
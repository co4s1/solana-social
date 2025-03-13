// src/components/WalletWrapper.js
/**
 * This component adds an extra layer of safety around wallet initialization
 * to prevent errors when wallet is connected but adapter not fully initialized
 */
import { useState, useEffect, createContext, useContext } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';

// Create context for the enhanced wallet info
const WalletWrapperContext = createContext({
  ready: false,
  isConnected: false,
  publicKeyString: null,
  walletName: null,
});

export const useWalletWrapper = () => useContext(WalletWrapperContext);

export default function WalletWrapper({ children }) {
  const { connected, connecting, disconnecting, publicKey, wallet } = useWallet();
  const [ready, setReady] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [publicKeyString, setPublicKeyString] = useState(null);
  const [walletName, setWalletName] = useState(null);
  const [mounted, setMounted] = useState(false);

  // Handle client-side only rendering
  useEffect(() => {
    setMounted(true);
  }, []);

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

  return (
    <WalletWrapperContext.Provider 
      value={{
        ready,
        isConnected,
        publicKeyString,
        walletName,
      }}
    >
      {children}
    </WalletWrapperContext.Provider>
  );
}
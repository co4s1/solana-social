// src/components/WalletWrapper.js - Simplified wallet wrapper that avoids complex state management
import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';

export default function WalletWrapper({ children }) {
  const wallet = useWallet();
  const [mounted, setMounted] = useState(false);
  
  // Handle client-side only rendering
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Provide clear error messages if wallet connection fails
  useEffect(() => {
    if (!mounted) return;
    
    // Handle initial connection
    if (wallet.connecting) {
      console.log("Wallet is connecting...");
    }
    
    // Log wallet connection changes
    if (wallet.connected) {
      console.log("Wallet connected:", wallet.publicKey?.toString());
    }
    
    // Handle disconnection
    if (!wallet.connected && !wallet.connecting && mounted) {
      console.log("Wallet disconnected or not connected");
    }
    
    // Handle wallet errors
    if (wallet.error) {
      console.error("Wallet error:", wallet.error);
    }
  }, [wallet.connected, wallet.connecting, wallet.error, wallet.publicKey, mounted]);
  
  // Render nothing during SSR to prevent hydration issues
  if (!mounted) return null;
  
  return (
    <>
      {/* Optionally add any wallet status indicators here */}
      {wallet.error && (
        <div className="fixed top-0 right-0 m-4 p-4 bg-red-100 text-red-800 rounded shadow-md max-w-xs z-50">
          <p className="font-bold">Wallet Error</p>
          <p className="text-sm">{wallet.error.message}</p>
        </div>
      )}
      
      {children}
    </>
  );
}
// src/utils/wallet-helper.js

/**
 * Ensures that the wallet is properly connected and initialized
 * @param {Object} wallet - The wallet adapter from useWallet()
 * @returns {Promise<boolean>} - Returns true if wallet is ready, false otherwise
 */
export const ensureWalletConnected = async (wallet) => {
    if (!wallet) return false;
    
    // Check basic connection
    if (!wallet.connected || !wallet.publicKey) {
      console.log("Wallet not connected or missing public key");
      return false;
    }
    
    // Check adapter initialization
    if (!wallet.adapter || !wallet.adapter.publicKey) {
      console.log("Wallet adapter not fully initialized");
      
      // Try to wait a bit for initialization to complete
      let attempts = 0;
      const maxAttempts = 5;
      
      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 500));
        
        if (wallet.adapter && wallet.adapter.publicKey) {
          console.log("Wallet adapter initialized after waiting");
          return true;
        }
        
        attempts++;
      }
      
      return false;
    }
    
    return true;
  };
// src/utils/wallet-helper.js
/**
 * Helper functions to ensure wallet initialization
 */

/**
 * Ensures the wallet is fully connected and initialized
 * @param {Object} wallet - The wallet object from useWallet()
 * @returns {Promise<boolean>} - true if wallet is initialized
 */
export const ensureWalletConnected = async (wallet) => {
    if (!wallet) {
      console.error("No wallet provided");
      return false;
    }
    
    // If already properly connected, return true
    if (wallet.connected && 
        wallet.publicKey && 
        wallet.adapter && 
        wallet.adapter.publicKey &&
        wallet.adapter.publicKey.equals(wallet.publicKey)) {
      return true;
    }
    
    // If disconnected, try to connect
    if (!wallet.connected) {
      try {
        console.log("Attempting to connect wallet...");
        await wallet.connect();
        
        // Wait for connection to complete
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        if (wallet.connected && wallet.publicKey) {
          console.log("Wallet connected successfully");
          return true;
        } else {
          console.error("Failed to connect wallet");
          return false;
        }
      } catch (error) {
        console.error("Error connecting wallet:", error);
        return false;
      }
    }
    
    // If connected but adapter not initialized, wait a bit
    if (wallet.connected && (!wallet.adapter || !wallet.adapter.publicKey)) {
      console.log("Wallet connected but adapter not initialized, waiting...");
      
      // Wait for adapter to initialize
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Check again
      if (wallet.adapter && wallet.adapter.publicKey) {
        console.log("Wallet adapter initialized");
        return true;
      } else {
        console.error("Wallet adapter failed to initialize");
        return false;
      }
    }
    
    return false;
  };
  
  /**
   * Waits for the wallet to be ready before executing a function
   * @param {Object} wallet - The wallet object from useWallet()
   * @param {Function} fn - The function to execute once wallet is ready
   * @param {Array} args - Arguments to pass to the function
   */
  export const withWalletReady = async (wallet, fn, ...args) => {
    const isReady = await ensureWalletConnected(wallet);
    
    if (!isReady) {
      throw new Error("Wallet is not ready. Please try reconnecting your wallet.");
    }
    
    return fn(...args);
  };
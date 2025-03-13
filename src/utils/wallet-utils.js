// src/utils/wallet-utils.js - Helper functions for wallet management

/**
 * Checks if a wallet is properly initialized and ready for transactions
 * @param {Object} wallet - The wallet adapter from useWallet()
 * @returns {boolean} - Whether the wallet is ready
 */
export const isWalletReady = (wallet) => {
    if (!wallet) return false;
    
    return Boolean(
      wallet.connected && 
      wallet.publicKey && 
      wallet.adapter && 
      wallet.adapter.publicKey && 
      wallet.adapter.connected
    );
  };
  
  /**
   * Attempts to initialize a wallet connection with retries
   * @param {Function} connect - The connect function from useWallet()
   * @param {Function} disconnect - The disconnect function from useWallet()
   * @param {Object} wallet - The wallet adapter from useWallet()
   * @param {Object} options - Options object
   * @param {number} [options.maxAttempts=3] - Maximum number of connection attempts
   * @param {number} [options.delayMs=1000] - Delay between attempts in milliseconds
   * @returns {Promise<boolean>} - Whether the connection was successful
   */
  export const initializeWalletConnection = async (
    connect, 
    disconnect, 
    wallet, 
    { maxAttempts = 3, delayMs = 1000 } = {}
  ) => {
    if (!connect || !disconnect || !wallet) {
      console.error("Missing required parameters for wallet initialization");
      return false;
    }
    
    // Try to disconnect first to start fresh
    if (wallet.connected) {
      try {
        console.log("Disconnecting wallet before reconnection");
        await disconnect();
        await new Promise(resolve => setTimeout(resolve, delayMs));
      } catch (e) {
        console.error("Error disconnecting wallet:", e);
        // Continue anyway
      }
    }
    
    // Attempt to connect with retries
    let attempts = 0;
    while (attempts < maxAttempts) {
      try {
        console.log(`Connection attempt ${attempts + 1} of ${maxAttempts}`);
        await connect();
        
        // Wait for connection to complete
        await new Promise(resolve => setTimeout(resolve, delayMs));
        
        // Check if wallet is properly initialized
        if (isWalletReady(wallet)) {
          console.log("Wallet successfully initialized");
          return true;
        }
        
        console.log("Wallet not ready after connection attempt, will retry");
      } catch (error) {
        console.error(`Connection attempt ${attempts + 1} failed:`, error);
      }
      
      attempts++;
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
    
    console.error(`Failed to initialize wallet after ${maxAttempts} attempts`);
    return false;
  };
  
  /**
   * Checks if the wallet is ready, and if not, tries to initialize it
   * @param {Object} walletContext - The wallet context from useWallet()
   * @returns {Promise<boolean>} - Whether the wallet is ready
   */
  export const ensureWalletReady = async (walletContext) => {
    const { connect, disconnect, wallet } = walletContext;
    
    if (isWalletReady(wallet)) {
      return true;
    }
    
    return await initializeWalletConnection(connect, disconnect, wallet);
  };
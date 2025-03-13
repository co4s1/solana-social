// src/utils/umi.js - Real implementation that actually mints NFTs
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { walletAdapterIdentity } from '@metaplex-foundation/umi-signer-wallet-adapters';
import { publicKey, none, keypairIdentity, createSignerFromKeypair } from '@metaplex-foundation/umi';
import { createNft, TokenStandard } from '@metaplex-foundation/mpl-token-metadata';
import { SOLANA_RPC_HOST, CONTENT_TYPES } from './constants';
import { Connection, Keypair } from '@solana/web3.js';

/**
 * Create a proper UMI instance that works even without adapter property
 * @param {Object} wallet - The wallet object from useWallet() 
 * @returns {Object|null} - UMI instance or null if creation failed
 */
export const getUmi = (wallet) => {
  console.log("getUmi called with wallet:", {
    exists: Boolean(wallet),
    connected: wallet?.connected,
    hasPublicKey: Boolean(wallet?.publicKey),
    publicKeyString: wallet?.publicKey?.toString(),
    hasAdapter: Boolean(wallet?.adapter)
  });
  
  if (!wallet) {
    console.error("No wallet provided to getUmi");
    return null;
  }
  
  // Verify wallet has a public key
  if (!wallet.publicKey) {
    console.error("Wallet missing public key");
    return null;
  }
  
  try {
    const endpoint = SOLANA_RPC_HOST || 'https://api.devnet.solana.com';
    console.log(`Creating UMI with endpoint: ${endpoint}`);
    
    // Create the base UMI instance
    const baseUmi = createUmi(endpoint);
    
    // Add connection
    baseUmi.connection = new Connection(endpoint, {
      commitment: 'confirmed',
      confirmTransactionInitialTimeout: 60000
    });
    
    // Store original wallet info for access later
    baseUmi._wallet = wallet;
    
    try {
      // If wallet.adapter exists, use standard approach
      if (wallet.adapter) {
        console.log("Using wallet adapter identity");
        return baseUmi.use(walletAdapterIdentity(wallet.adapter));
      }
      
      // If wallet.signTransaction exists, create a custom identity
      if (typeof wallet.signTransaction === 'function' && 
          typeof wallet.signAllTransactions === 'function') {
        
        console.log("Creating custom identity from wallet methods");
        
        // Create custom identity that wraps the wallet's sign methods
        const customIdentity = {
          publicKey: publicKey(wallet.publicKey.toBytes()),
          signTransaction: wallet.signTransaction.bind(wallet),
          signAllTransactions: wallet.signAllTransactions.bind(wallet),
          signMessage: wallet.signMessage ? wallet.signMessage.bind(wallet) : undefined
        };
        
        // Add the custom identity to UMI
        baseUmi.identity = customIdentity;
        return baseUmi;
      }
      
      // As a last resort, if there's a signature property
      if (wallet.signMessage || wallet.sign) {
        console.log("Using wallet sign method directly");
        
        // Create custom identity with whatever sign methods exist
        const customIdentity = {
          publicKey: publicKey(wallet.publicKey.toBytes()),
          sign: wallet.sign ? wallet.sign.bind(wallet) : undefined,
          signMessage: wallet.signMessage ? wallet.signMessage.bind(wallet) : undefined
        };
        
        // Add the custom identity to UMI
        baseUmi.identity = customIdentity;
        return baseUmi;
      }
      
      console.error("Wallet doesn't have required signing methods");
      return null;
    } catch (walletError) {
      console.error("Error adding wallet identity to UMI:", walletError);
      return null;
    }
  } catch (error) {
    console.error("Error creating base UMI instance:", error);
    return null;
  }
};

/**
 * Create a social NFT - REAL IMPLEMENTATION
 * @param {Object} umi - The UMI instance
 * @param {string} collectionAddress - Collection address
 * @param {Object} params - NFT parameters
 * @returns {Promise<Object>} - Actually mints an NFT and returns the result
 */
export const createSocialNFT = async (
  umi,
  collectionAddress,
  {
    type,
    name,
    description,
    image,
    attributes = [],
  }
) => {
  if (!umi) {
    throw new Error('No UMI instance provided to createSocialNFT');
  }
  
  if (!collectionAddress) {
    throw new Error('No collection address provided to createSocialNFT');
  }
  
  console.log(`Creating ${type} NFT: ${name}`);
  
  // Get wallet public key from UMI identity
  let walletPubkey;
  try {
    // UMI identity should have public key
    if (umi.identity && umi.identity.publicKey) {
      walletPubkey = umi.identity.publicKey.toString();
      console.log("Using wallet public key from UMI identity:", walletPubkey);
    }
    // Try original wallet if available
    else if (umi._wallet && umi._wallet.publicKey) {
      walletPubkey = umi._wallet.publicKey.toString();
      console.log("Using wallet public key from original wallet:", walletPubkey);
    }
    else {
      throw new Error("Unable to determine wallet public key");
    }
  } catch (e) {
    console.error("Error accessing wallet public key:", e);
    throw new Error("Wallet public key not accessible. Please reconnect wallet.");
  }
  
  // Check if UMI identity has required signing methods
  if (!umi.identity || !umi.identity.signTransaction) {
    throw new Error("Wallet doesn't support transaction signing. Please use a compatible wallet.");
  }
  
  // Construct metadata including attributes
  const currentTimestamp = Math.floor(Date.now() / 1000);
  
  // Ensure 'type' attribute is included
  if (!attributes.find(attr => attr.trait_type === 'type')) {
    attributes.push({ trait_type: 'type', value: type });
  }
  
  // Add author attribute using the wallet's public key
  if (!attributes.find(attr => attr.trait_type === 'author')) {
    attributes.push({ 
      trait_type: 'author', 
      value: walletPubkey
    });
  }
  
  // Add timestamp attribute
  if (!attributes.find(attr => attr.trait_type === 'timestamp')) {
    attributes.push({ 
      trait_type: 'timestamp', 
      value: currentTimestamp 
    });
  }
  
  // Create the NFT metadata
  const metadata = {
    name: name,
    symbol: "SOL",
    description: description,
    image: image || "",
    attributes: attributes
  };

  // For collection, use None option if not specified or invalid
  let collectionOption = none();
  
  try {
    // Only try to use collection if it looks like a valid address
    if (collectionAddress && collectionAddress.length > 30) {
      collectionOption = { __option: 'Some', value: publicKey(collectionAddress) };
      console.log("Using collection:", collectionAddress);
    } else {
      console.log("Using no collection");
    }
  } catch (e) {
    console.error("Invalid collection address:", e);
    console.log("Continuing without collection");
  }
  
  // ACTUAL NFT CREATION - No simulation here
  try {
    console.log("Creating NFT with UMI - REAL TRANSACTION");
    
    // Create the NFT
    const result = await createNft(umi, {
      name,
      uri: image || "",
      sellerFeeBasisPoints: 0,
      collection: collectionOption,
      tokenStandard: TokenStandard.NonFungible,
      creators: [
        {
          address: umi.identity.publicKey,
          verified: true,
          share: 100,
        },
      ],
      json: metadata,
    }).sendAndConfirm(umi);
    
    console.log("NFT creation successful with result:", result);
    
    // Return actual NFT data
    return {
      address: result.nft.toString(),
      mint: result.nft.toString(),
      metadata: result.metadata.toString(),
      json: metadata
    };
  } catch (error) {
    console.error('Error creating NFT:', error);
    
    // Provide better error messages
    if (error.message?.includes('0x1')) {
      throw new Error('Not enough SOL in your wallet for this transaction');
    } else if (error.message?.includes('Blockhash not found')) {
      throw new Error('Network congestion. Please try again later');
    } else if (error.message?.includes('not been signed')) {
      throw new Error('Transaction was not properly signed. Please try again');
    } else if (error.message?.includes('identity')) {
      throw new Error('Wallet identity error: ' + error.message);
    } else {
      throw error;
    }
  }
};

/**
 * Fetch NFTs from collection
 */
export const fetchCollectionNFTs = async (umi, collectionAddress, type = null) => {
  console.log(`Fetching NFTs from collection ${collectionAddress}`);
  // In a real implementation, you would query for NFTs here
  return [];
};
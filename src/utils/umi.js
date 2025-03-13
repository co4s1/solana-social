// src/utils/umi.js - fixed PublicKey handling

import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { walletAdapterIdentity } from '@metaplex-foundation/umi-signer-wallet-adapters';
import { publicKey, none } from '@metaplex-foundation/umi';
import { createNft, TokenStandard } from '@metaplex-foundation/mpl-token-metadata';
import { SOLANA_RPC_HOST, CONTENT_TYPES } from './constants';
import { Connection, PublicKey } from '@solana/web3.js';

// Get a Umi instance with wallet adapter
export const getUmi = (wallet) => {
  if (!wallet) {
    console.error("No wallet provided to getUmi");
    return null;
  }
  
  try {
    // Create a UMI instance with the provided endpoint and wallet
    const endpoint = SOLANA_RPC_HOST || 'https://api.devnet.solana.com';
    const umi = createUmi(endpoint)
      .use(walletAdapterIdentity(wallet));
    
    // Add the connection to the umi object for easier access
    umi.connection = new Connection(endpoint);
    
    return umi;
  } catch (error) {
    console.error("Error creating UMI instance:", error);
    return null;
  }
};

/**
 * Create and mint a new Social NFT (Profile, Post, or Reply)
 * @param {Object} umi - The Umi instance
 * @param {string} collectionAddress - The collection address
 * @param {Object} params - NFT parameters
 * @returns {Promise<Object>} - The created NFT
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
  
  // Get wallet public key as string for attributes
  // Safely access walletPubkey or provide a dummy value for testing
  let walletPubkey;
  try {
    walletPubkey = umi.identity.publicKey.toString();
    console.log("Using wallet public key:", walletPubkey);
  } catch (e) {
    console.error("Could not access wallet public key:", e);
    throw new Error("Wallet not properly initialized");
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
    image: image || "https://arweave.net/placeholder",
    attributes: attributes
  };

  // For collection, use None option if not specified
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
    // Keep using none() option
  }
  
  try {
    // Make sure we have a valid creator address from the umi identity
    if (!umi.identity || !umi.identity.publicKey) {
      throw new Error("UMI identity not initialized properly");
    }
    
    console.log("Creating NFT with:", {
      name,
      imageUrl: image || "https://arweave.net/placeholder",
      sellerFeeBasisPoints: 0,
      collection: collectionOption.__option,
      creatorAddress: umi.identity.publicKey.toString()
    });
    
    // Create the NFT
    const { nft: mintAddress, metadata: metadataAddress } = await createNft(umi, {
      name,
      uri: image || "https://arweave.net/placeholder",
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
    
    console.log(`Created NFT with mint address: ${mintAddress}`);
    
    // Return information about the created NFT
    return {
      address: mintAddress.toString(),
      mint: mintAddress.toString(),
      metadata: metadataAddress.toString(),
      json: metadata
    };
  } catch (error) {
    console.error('Error creating social NFT:', error);
    
    // Enhanced error reporting
    let errorMessage = `Failed to create ${type}: ${error.message}`;
    
    // Check for common Solana errors and provide better messages
    if (error.message?.includes('0x1770')) {
      errorMessage = 'Not enough SOL to pay for transaction. Please fund your wallet.';
    } else if (error.message?.includes('Blockhash not found')) {
      errorMessage = 'Network appears congested. Please try again later.';
    } else if (error.message?.includes('not been signed')) {
      errorMessage = 'Transaction was not approved. Please approve the transaction in your wallet.';
    } else if (error.message?.includes('User rejected')) {
      errorMessage = 'Transaction was rejected. Please approve the transaction in your wallet.';
    }
    
    throw new Error(errorMessage);
  }
};

/**
 * Fetch NFTs from a collection with type filtering
 * @param {Object} umi - The Umi instance
 * @param {string} collectionAddress - The collection address
 * @param {string} type - The type of NFT to filter for
 * @returns {Promise<Array>} - Array of NFTs
 */
export const fetchCollectionNFTs = async (umi, collectionAddress, type = null) => {
  if (!umi) {
    console.error("No UMI instance provided to fetchCollectionNFTs");
    return [];
  }
  
  if (!collectionAddress) {
    console.error("No collection address provided to fetchCollectionNFTs");
    return [];
  }
  
  try {
    console.log(`Fetching NFTs from collection ${collectionAddress}`);
    
    // Use web3.js connection directly for better compatibility
    const connection = umi.connection;
    const creator = new PublicKey(collectionAddress);
    
    // Get metadata accounts by creator
    const metadataAccounts = await connection.getProgramAccounts(
      new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'), // Metadata program ID
      {
        filters: [
          {
            memcmp: {
              offset: 326, // Creator offset in metadata account data
              bytes: creator.toBase58(),
            },
          },
        ],
      }
    );
    
    console.log(`Found ${metadataAccounts.length} NFTs in collection`);
    
    // Basic placeholder - just return the account addresses if we found any
    return metadataAccounts.map(account => ({
      address: account.pubkey.toString(),
      json: {
        attributes: [
          { trait_type: 'type', value: type || 'unknown' }
        ]
      }
    }));
  } catch (error) {
    console.error('Error fetching collection NFTs:', error);
    return [];
  }
};
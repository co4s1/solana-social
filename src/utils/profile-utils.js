// src/utils/profile-utils.js - Enhanced with better initialization handling

import { getUmi, fetchCollectionNFTs, createSocialNFT } from './umi';
import { CONTENT_TYPES } from './constants';

// Local cache for profile data to improve performance
const profileCache = new Map();

/**
 * Fetch a profile by wallet address (without using hooks)
 * @param {string} walletAddress - The wallet address to fetch profile for 
 * @param {Object} wallet - The wallet adapter from useWallet
 * @param {string} collectionAddress - The NFT collection address
 * @returns {Promise<Object|null>} - The profile or null if not found
 */
export const fetchProfileByWallet = async (walletAddress, wallet, collectionAddress) => {
  console.log("fetchProfileByWallet called for", walletAddress);
  
  // Check cache first
  if (profileCache.has(walletAddress)) {
    console.log("Using cached profile for", walletAddress);
    return profileCache.get(walletAddress);
  }
  
  if (!collectionAddress) {
    console.error("No collection address provided to fetchProfileByWallet");
    return null;
  }
  
  // Get UMI instance with force create
  const umi = getUmi(wallet, true);
  if (!umi) {
    console.error("Could not create UMI instance for profile fetch");
    return null;
  }

  try {
    console.log(`Fetching profiles from collection ${collectionAddress}`);
    
    // Set up timeout handling
    let fetchCompleted = false;
    let timeoutOccurred = false;
    let timeoutId;
    
    timeoutId = setTimeout(() => {
      if (!fetchCompleted) {
        console.log("Profile fetch timed out");
        timeoutOccurred = true;
      }
    }, 10000); // 10 second timeout
    
    // Fetch profiles
    const profiles = await fetchCollectionNFTs(umi, collectionAddress, CONTENT_TYPES.PROFILE);
    
    // Mark fetch as completed
    fetchCompleted = true;
    clearTimeout(timeoutId);
    
    // If timeout occurred, return null
    if (timeoutOccurred) {
      console.log("Profile fetch completed but timeout already occurred");
      return null;
    }
    
    console.log(`Found ${profiles.length} profiles in collection`);
    
    // Find profile where author matches the wallet address
    const profile = profiles.find(nft => {
      if (!nft.json || !nft.json.attributes) return false;
      
      const attributes = nft.json.attributes;
      const authorAttr = attributes.find(attr => attr.trait_type === 'author');
      return authorAttr?.value === walletAddress;
    });

    if (!profile) {
      console.log(`No profile found for wallet: ${walletAddress}`);
      return null;
    }

    console.log(`Found profile for wallet: ${walletAddress}`);
    
    // Extract username from attributes
    const attributes = profile.json?.attributes || [];
    const usernameAttr = attributes.find(attr => attr.trait_type === 'username');
    
    const profileData = {
      address: profile.address.toString(),
      name: profile.json?.name || '',
      description: profile.json?.description || '',
      image: profile.json?.image || '',
      username: usernameAttr?.value || '',
      authorAddress: walletAddress,
    };
    
    // Update cache
    profileCache.set(walletAddress, profileData);
    
    return profileData;
  } catch (error) {
    console.error('Error fetching profile by wallet:', error);
    return null;
  }
};

/**
 * Verify wallet readiness for NFT operations
 * @param {Object} wallet - The wallet adapter 
 * @returns {boolean} - Whether wallet is ready for use
 */
export const isWalletReadyForNFT = (wallet) => {
  if (!wallet) return false;
  
  // Check adapter properties needed for UMI
  const adapterReady = Boolean(
    wallet.adapter && 
    wallet.adapter.connected && 
    wallet.adapter.publicKey
  );
  
  return adapterReady;
};

/**
 * Create a new profile (without using hooks)
 * @param {Object} params - Profile creation parameters
 * @param {string} params.username - The username for the profile
 * @param {string} params.bio - User bio/description
 * @param {string} params.imageUrl - URL to profile image
 * @param {Object} wallet - The wallet adapter from useWallet
 * @param {Object} publicKey - User's wallet public key
 * @param {string} collectionAddress - The NFT collection address
 * @returns {Promise<Object>} - The created profile NFT
 */
export const createProfile = async (
  { username, bio, imageUrl },
  wallet,
  publicKey,
  collectionAddress
) => {
  if (!collectionAddress) {
    throw new Error('Collection address not configured');
  }
  
  if (!wallet || !publicKey) {
    throw new Error('Wallet not connected');
  }
  
  // Verify wallet is properly initialized
  if (!isWalletReadyForNFT(wallet)) {
    throw new Error('Wallet not fully initialized. Please reconnect your wallet and try again.');
  }

  // Log wallet state for debugging
  console.log("Wallet state before profile creation:", {
    connected: wallet.connected,
    hasPublicKey: Boolean(wallet.publicKey),
    adapterConnected: Boolean(wallet.adapter?.connected),
    adapterPublicKey: Boolean(wallet.adapter?.publicKey)
  });

  // Get UMI instance with force create
  const umi = getUmi(wallet, true);
  if (!umi) {
    throw new Error('Failed to initialize UMI with wallet');
  }

  const attributes = [
    {
      trait_type: 'username',
      value: username,
    },
  ];

  try {
    // Create the profile NFT - add wallet and publicKey to context
    // This allows createSocialNFT to use them as fallback if needed
    umi.wallet = wallet;
    umi.walletPublicKey = publicKey;
    
    const nft = await createSocialNFT(umi, collectionAddress, {
      type: CONTENT_TYPES.PROFILE,
      name: `Profile #${username}`,
      description: bio || '',
      image: imageUrl || '',
      attributes,
    });
    
    // Create profile data to add to cache immediately
    const profileData = {
      address: nft.address,
      name: `Profile #${username}`,
      description: bio || '',
      image: imageUrl || '',
      username: username,
      authorAddress: publicKey.toString(),
    };
    
    // Update cache immediately for better UX
    profileCache.set(publicKey.toString(), profileData);
    
    return nft;
  } catch (error) {
    console.error("Profile creation failed:", error);
    throw error;
  }
};

// Clear the profile cache
export const clearProfileCache = () => {
  profileCache.clear();
};
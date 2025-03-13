// src/hooks/useProfile.js - with better wallet handling

import { useCallback, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getUmi, fetchCollectionNFTs, createSocialNFT } from '../utils/umi';
import { COLLECTION_ADDRESS, CONTENT_TYPES } from '../utils/constants';
import { usePinata } from './usePinata';
import { useWalletWrapper } from '../components/WalletWrapper';

// Local cache for profile data to improve performance
const profileCache = new Map();

export const useProfile = () => {
  const { publicKey: walletPublicKey, wallet, connected } = useWallet();
  const { ensureWalletConnected } = useWalletWrapper();
  const umi = walletPublicKey ? getUmi(wallet) : null;
  const queryClient = useQueryClient();
  const { uploadImage } = usePinata();
  const [lastError, setLastError] = useState(null);
  const [transactionStatus, setTransactionStatus] = useState({
    status: 'idle', // 'idle', 'uploading', 'creating', 'confirming', 'success', 'error'
    message: '',
    error: null,
    txId: null,
  });

  const fetchProfileByWallet = useCallback(
    async (walletAddress) => {
      console.log("fetchProfileByWallet called for", walletAddress);
      
      // Check cache first
      if (profileCache.has(walletAddress)) {
        console.log("Using cached profile for", walletAddress);
        return profileCache.get(walletAddress);
      }
      
      if (!umi) {
        console.error("No UMI instance available for fetchProfileByWallet");
        return null;
      }
      
      if (!COLLECTION_ADDRESS) {
        console.error("COLLECTION_ADDRESS not configured for fetchProfileByWallet");
        setLastError("Collection address not configured. Please check your environment variables.");
        return null;
      }

      let fetchCompleted = false;
      let timeoutOccurred = false;
      let timeoutId;

      try {
        console.log(`Fetching profiles from collection ${COLLECTION_ADDRESS}`);
        
        // Set up timeout with a flag instead of Promise.race
        timeoutId = setTimeout(() => {
          if (!fetchCompleted) {
            console.log("Profile fetch timed out");
            timeoutOccurred = true;
            setLastError("Profile fetch timed out, but you can still use the app");
          }
        }, 12000); // 12 second timeout
        
        // Fetch profiles
        const profiles = await fetchCollectionNFTs(umi, COLLECTION_ADDRESS, CONTENT_TYPES.PROFILE);
        
        // Mark fetch as completed
        fetchCompleted = true;
        clearTimeout(timeoutId);
        
        // If timeout occurred, return null but don't throw an error
        if (timeoutOccurred) {
          console.log("Fetch completed but timeout already occurred");
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
        // Mark fetch as completed (with error)
        fetchCompleted = true;
        if (timeoutId) clearTimeout(timeoutId);
        
        console.error('Error fetching profile by wallet:', error);
        setLastError(error.message || "Error fetching profile");
        
        // Return null instead of throwing
        return null;
      }
    },
    [umi]
  );

  // Optimized query with better error handling
  const { 
    data: profile, 
    isLoading: isLoadingProfile,
    error: profileError,
    refetch: refetchProfile
  } = useQuery({
    queryKey: ['profile', walletPublicKey?.toString()],
    queryFn: () => {
      if (!walletPublicKey) {
        console.log("No wallet public key available for profile query");
        return null;
      }
      return fetchProfileByWallet(walletPublicKey.toString());
    },
    enabled: !!walletPublicKey && !!connected,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 2,
    retryDelay: 1000,
    onError: (error) => {
      console.error("Profile query error:", error);
      setLastError(error.message || "Error loading profile");
    }
  });

  const createProfile = useMutation({
    mutationFn: async ({ username, bio, imageFile }) => {
      if (!COLLECTION_ADDRESS) {
        throw new Error('Collection address not configured');
      }
      
      if (!connected || !walletPublicKey) {
        throw new Error('Wallet not connected');
      }

      // Try to ensure wallet is connected first
      await ensureWalletConnected();
      
      // Get fresh UMI instance to ensure it has latest wallet state
      const freshUmi = getUmi(wallet);
      if (!freshUmi) {
        throw new Error('Failed to initialize UMI with wallet');
      }

      // Reset transaction status
      setTransactionStatus({
        status: 'uploading',
        message: 'Uploading profile image...',
        error: null,
        txId: null,
      });

      let imageUrl = ''; // Default empty URL
      
      // Upload image to Pinata if provided
      if (imageFile) {
        try {
          imageUrl = await uploadImage(imageFile);
          console.log("Image uploaded to:", imageUrl);
        } catch (imageError) {
          console.error("Image upload failed:", imageError);
          setTransactionStatus({
            status: 'error',
            message: 'Failed to upload image',
            error: imageError.message,
            txId: null,
          });
          // Continue without image rather than failing completely
        }
      }

      // Update status
      setTransactionStatus({
        status: 'creating',
        message: 'Creating your profile NFT...',
        error: null,
        txId: null,
      });

      const attributes = [
        {
          trait_type: 'username',
          value: username,
        },
      ];

      try {
        // Create the profile NFT
        const nft = await createSocialNFT(freshUmi, COLLECTION_ADDRESS, {
          type: CONTENT_TYPES.PROFILE,
          name: `Profile #${username}`,
          description: bio || '',
          image: imageUrl,
          attributes,
        });
        
        // Update status to success
        setTransactionStatus({
          status: 'success',
          message: 'Profile created successfully!',
          error: null,
          txId: nft.address, // Use the NFT address as the transaction ID
        });
        
        // Create profile data to add to cache immediately
        const profileData = {
          address: nft.address,
          name: `Profile #${username}`,
          description: bio || '',
          image: imageUrl,
          username: username,
          authorAddress: walletPublicKey.toString(),
        };
        
        // Update cache immediately for better UX
        profileCache.set(walletPublicKey.toString(), profileData);
        
        return nft;
      } catch (error) {
        console.error("Profile creation failed:", error);
        
        setTransactionStatus({
          status: 'error',
          message: 'Failed to create profile',
          error: error.message,
          txId: null,
        });
        
        throw error;
      }
    },
    onSuccess: () => {
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['profile', walletPublicKey?.toString()] });
    },
    onError: (error) => {
      console.error("Profile creation error:", error);
      setLastError(error.message || "Failed to create profile");
    }
  });

  const fetchProfileByAddress = useCallback(
    async (profileAddress) => {
      if (!umi) return null;

      try {
        // This function would need to be reimplemented with Umi
        // Placeholder for now
        console.log("fetchProfileByAddress not yet implemented with Umi");
        return null;
      } catch (error) {
        console.error('Error fetching profile by address:', error);
        return null;
      }
    },
    [umi]
  );

  // Manually clear profile cache
  const clearProfileCache = () => {
    profileCache.clear();
    queryClient.invalidateQueries({ queryKey: ['profile'] });
  };

  return {
    profile,
    isLoadingProfile,
    error: profileError || lastError,
    createProfile,
    fetchProfileByWallet,
    fetchProfileByAddress,
    clearProfileCache,
    transactionStatus,
    refetchProfile
  };
};
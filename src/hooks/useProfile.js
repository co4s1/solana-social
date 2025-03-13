// src/hooks/useProfile.js
import { useCallback, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getUmi, fetchCollectionNFTs, createSocialNFT } from '../utils/umi';
import { COLLECTION_ADDRESS, CONTENT_TYPES } from '../utils/constants';
import { usePinata } from './usePinata';
import { publicKey } from '@metaplex-foundation/umi';

// Local cache for profile data to improve performance
const profileCache = new Map();

export const useProfile = () => {
  const { publicKey: walletPublicKey, wallet } = useWallet();
  const umi = walletPublicKey ? getUmi(wallet) : null;
  const queryClient = useQueryClient();
  const { uploadImage } = usePinata();
  const [lastError, setLastError] = useState(null);

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
    error: profileError 
  } = useQuery({
    queryKey: ['profile', walletPublicKey?.toString()],
    queryFn: () => fetchProfileByWallet(walletPublicKey.toString()),
    enabled: !!walletPublicKey && !!umi && !!COLLECTION_ADDRESS,
    staleTime: 1000 * 60 * 5, // 5 minutes
    // Add error handling and retry logic
    retry: 2,
    retryDelay: 1000,
    onError: (error) => {
      console.error("Profile query error:", error);
      setLastError(error.message || "Error loading profile");
    }
  });

  const createProfile = useMutation({
    mutationFn: async ({ username, bio, imageFile }) => {
      if (!umi || !COLLECTION_ADDRESS || !walletPublicKey) {
        throw new Error('Wallet not connected or collection not configured');
      }

      let imageUrl = ''; // Default empty URL
      
      // Upload image to Pinata if provided
      if (imageFile) {
        try {
          imageUrl = await uploadImage(imageFile);
        } catch (imageError) {
          console.error("Image upload failed:", imageError);
          // Continue without image rather than failing completely
        }
      }

      const attributes = [
        {
          trait_type: 'username',
          value: username,
        },
      ];

      // Create the profile NFT
      const nft = await createSocialNFT(umi, COLLECTION_ADDRESS, {
        type: CONTENT_TYPES.PROFILE,
        name: `Profile #${username}`,
        description: bio || '',
        image: imageUrl,
        attributes,
      });
      
      // Create profile data to add to cache immediately
      const profileData = {
        address: nft.address.toString(),
        name: `Profile #${username}`,
        description: bio || '',
        image: imageUrl,
        username: username,
        authorAddress: walletPublicKey.toString(),
      };
      
      // Update cache immediately for better UX
      profileCache.set(walletPublicKey.toString(), profileData);
      
      return nft;
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
    clearProfileCache
  };
};
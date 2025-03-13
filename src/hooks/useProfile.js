// src/hooks/useProfile.js
import { useCallback, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PublicKey } from '@solana/web3.js';
import { getMetaplex, fetchCollectionNFTs, createSocialNFT } from '../utils/metaplex';
import { COLLECTION_ADDRESS, CONTENT_TYPES } from '../utils/constants';
import { usePinata } from './usePinata';

// Local cache for profile data to improve performance
const profileCache = new Map();

export const useProfile = () => {
  const { publicKey, wallet } = useWallet();
  const metaplex = publicKey ? getMetaplex(wallet) : null;
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
      
      if (!metaplex) {
        console.error("No metaplex instance available for fetchProfileByWallet");
        return null;
      }
      
      if (!COLLECTION_ADDRESS) {
        console.error("COLLECTION_ADDRESS not configured for fetchProfileByWallet");
        setLastError("Collection address not configured. Please check your environment variables.");
        return null;
      }

      try {
        console.log(`Fetching profiles from collection ${COLLECTION_ADDRESS}`);
        
        // Use Promise.race to implement timeout
        const fetchPromise = async () => {
          try {
            // Fetch collection NFTs 
            const profiles = await fetchCollectionNFTs(metaplex, COLLECTION_ADDRESS, CONTENT_TYPES.PROFILE);
            
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
            console.error("Error in fetch promise:", error);
            throw error;
          }
        };
        
        // Set a 8-second timeout
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Profile fetch timed out")), 8000)
        );
        
        // Race between fetch and timeout
        return await Promise.race([fetchPromise(), timeoutPromise]);
      } catch (error) {
        console.error('Error fetching profile by wallet:', error);
        setLastError(error.message || "Error fetching profile");
        return null;
      }
    },
    [metaplex]
  );

  // Optimized query with better error handling
  const { 
    data: profile, 
    isLoading: isLoadingProfile,
    error: profileError 
  } = useQuery({
    queryKey: ['profile', publicKey?.toString()],
    queryFn: () => fetchProfileByWallet(publicKey.toString()),
    enabled: !!publicKey && !!metaplex && !!COLLECTION_ADDRESS,
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
      if (!metaplex || !COLLECTION_ADDRESS || !publicKey) {
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
      const nft = await createSocialNFT(metaplex, COLLECTION_ADDRESS, {
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
        authorAddress: publicKey.toString(),
      };
      
      // Update cache immediately for better UX
      profileCache.set(publicKey.toString(), profileData);
      
      return nft;
    },
    onSuccess: () => {
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['profile', publicKey?.toString()] });
    },
    onError: (error) => {
      console.error("Profile creation error:", error);
      setLastError(error.message || "Failed to create profile");
    }
  });

  const fetchProfileByAddress = useCallback(
    async (profileAddress) => {
      if (!metaplex) return null;

      try {
        const nft = await metaplex.nfts().findByMetadata({ metadata: new PublicKey(profileAddress) });
        
        if (!nft || !nft.json) return null;

        // Verify it's a profile type
        const attributes = nft.json?.attributes || [];
        const typeAttr = attributes.find(attr => attr.trait_type === 'type');
        if (typeAttr?.value !== CONTENT_TYPES.PROFILE) return null;

        // Extract username
        const usernameAttr = attributes.find(attr => attr.trait_type === 'username');
        const authorAttr = attributes.find(attr => attr.trait_type === 'author');
        
        const authorAddress = authorAttr?.value || '';
        
        // Create profile data
        const profileData = {
          address: nft.address.toString(),
          name: nft.json?.name || '',
          description: nft.json?.description || '',
          image: nft.json?.image || '',
          username: usernameAttr?.value || '',
          authorAddress: authorAddress,
        };
        
        // Update cache if we have author address
        if (authorAddress) {
          profileCache.set(authorAddress, profileData);
        }
        
        return profileData;
      } catch (error) {
        console.error('Error fetching profile by address:', error);
        return null;
      }
    },
    [metaplex]
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
// src/hooks/useProfile.js
import { useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PublicKey } from '@solana/web3.js';
import { getMetaplex, fetchCollectionNFTs, createSocialNFT } from '../utils/metaplex';
import { COLLECTION_ADDRESS, CONTENT_TYPES } from '../utils/constants';
import { usePinata } from './usePinata';

export const useProfile = () => {
  const { publicKey, wallet } = useWallet();
  const metaplex = publicKey ? getMetaplex(wallet) : null;
  const queryClient = useQueryClient();
  const { uploadImage } = usePinata();

  const fetchProfileByWallet = useCallback(
    async (walletAddress) => {
      console.log("fetchProfileByWallet called for", walletAddress);
      
      if (!metaplex) {
        console.error("No metaplex instance available for fetchProfileByWallet");
        return null;
      }
      
      if (!COLLECTION_ADDRESS) {
        console.error("COLLECTION_ADDRESS not configured for fetchProfileByWallet");
        return null;
      }

      try {
        console.log(`Fetching profiles from collection ${COLLECTION_ADDRESS}`);
        
        // Manual timeout handling
        let hasTimedOut = false;
        const timeoutId = setTimeout(() => {
          console.error("Profile fetch operation timed out");
          hasTimedOut = true;
        }, 8000);
        
        // Fetch collection NFTs (this is what's likely timing out)
        const profiles = await fetchCollectionNFTs(metaplex, COLLECTION_ADDRESS, CONTENT_TYPES.PROFILE);
        
        // Clear timeout
        clearTimeout(timeoutId);
        
        // If timeout occurred during the fetchCollectionNFTs call
        if (hasTimedOut) {
          console.error("Fetch completed after timeout - ignoring results");
          return null;
        }
        
        console.log(`Found ${profiles.length} profiles in collection`);
        
        // Find profile where author matches the wallet address
        const profile = profiles.find(nft => {
          const attributes = nft.json?.attributes || [];
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
        
        return {
          address: profile.address.toString(),
          name: profile.json?.name || '',
          description: profile.json?.description || '',
          image: profile.json?.image || '',
          username: usernameAttr?.value || '',
          authorAddress: walletAddress,
        };
      } catch (error) {
        console.error('Error fetching profile by wallet:', error);
        return null;
      }
    },
    [metaplex]
  );

  // Rest of the code remains unchanged...
  const { data: profile, isLoading: isLoadingProfile } = useQuery({
    queryKey: ['profile', publicKey?.toString()],
    queryFn: () => fetchProfileByWallet(publicKey.toString()),
    enabled: !!publicKey && !!metaplex && !!COLLECTION_ADDRESS,
    staleTime: 1000 * 60 * 5, // 5 minutes
    // Add error handling and retry logic
    retry: 1,
    retryDelay: 1000,
    onError: (error) => console.error("Profile query error:", error)
  });

  const createProfile = useMutation({
    mutationFn: async ({ username, bio, imageFile }) => {
      if (!metaplex || !COLLECTION_ADDRESS || !publicKey) {
        throw new Error('Wallet not connected or collection not configured');
      }

      let imageUrl = 'https://gateway.pinata.cloud/ipfs/QmDefaultAvatarHash'; // Update with your default avatar IPFS hash
      
      // Upload image to Pinata if provided
      if (imageFile) {
        imageUrl = await uploadImage(imageFile);
      }

      const attributes = [
        {
          trait_type: 'username',
          value: username,
        },
      ];

      return createSocialNFT(metaplex, COLLECTION_ADDRESS, {
        type: CONTENT_TYPES.PROFILE,
        name: `Profile #${username}`,
        description: bio,
        image: imageUrl,
        attributes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', publicKey?.toString()] });
    },
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
        
        return {
          address: nft.address.toString(),
          name: nft.json?.name || '',
          description: nft.json?.description || '',
          image: nft.json?.image || '',
          username: usernameAttr?.value || '',
          authorAddress: authorAttr?.value || '',
        };
      } catch (error) {
        console.error('Error fetching profile by address:', error);
        return null;
      }
    },
    [metaplex]
  );

  return {
    profile,
    isLoadingProfile,
    createProfile,
    fetchProfileByWallet,
    fetchProfileByAddress,
  };
};
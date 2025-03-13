// src/hooks/useProfile.js
import { useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PublicKey } from '@solana/web3.js';
import { getMetaplex, fetchCollectionNFTs, createSocialNFT } from '../utils/metaplex';
import { COLLECTION_ADDRESS, CONTENT_TYPES } from '../utils/constants';
import { useArweave } from './useArweave';

export const useProfile = () => {
  const { publicKey, wallet } = useWallet();
  const metaplex = publicKey ? getMetaplex(wallet) : null;
  const queryClient = useQueryClient();
  const { uploadImage } = useArweave();

  const fetchProfileByWallet = useCallback(
    async (walletAddress) => {
      if (!metaplex || !COLLECTION_ADDRESS) return null;

      try {
        const profiles = await fetchCollectionNFTs(metaplex, COLLECTION_ADDRESS, CONTENT_TYPES.PROFILE);
        
        // Find profile where author matches the wallet address
        const profile = profiles.find(nft => {
          const attributes = nft.json?.attributes || [];
          const authorAttr = attributes.find(attr => attr.trait_type === 'author');
          return authorAttr?.value === walletAddress;
        });

        if (!profile) return null;

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

  const { data: profile, isLoading: isLoadingProfile } = useQuery({
    queryKey: ['profile', publicKey?.toString()],
    queryFn: () => fetchProfileByWallet(publicKey.toString()),
    enabled: !!publicKey && !!metaplex && !!COLLECTION_ADDRESS,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const createProfile = useMutation({
    mutationFn: async ({ username, bio, imageFile }) => {
      if (!metaplex || !COLLECTION_ADDRESS || !publicKey) {
        throw new Error('Wallet not connected or collection not configured');
      }

      let imageUrl = 'https://arweave.net/placeholder-default-avatar';
      
      // Upload image to Arweave if provided
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
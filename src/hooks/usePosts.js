// src/hooks/usePosts.js
import { useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PublicKey } from '@solana/web3.js';
import { getMetaplex, fetchCollectionNFTs, createSocialNFT } from '../utils/metaplex';
import { COLLECTION_ADDRESS, CONTENT_TYPES } from '../utils/constants';
import { useArweave } from './useArweave';

export const usePosts = () => {
  const { publicKey, wallet } = useWallet();
  const metaplex = publicKey ? getMetaplex(wallet) : null;
  const queryClient = useQueryClient();
  const { uploadImage } = useArweave();

  // Fetch all posts
  const fetchPosts = useCallback(async () => {
    if (!metaplex || !COLLECTION_ADDRESS) return [];

    try {
      const posts = await fetchCollectionNFTs(metaplex, COLLECTION_ADDRESS, CONTENT_TYPES.POST);
      
      return posts.map(nft => {
        const attributes = nft.json?.attributes || [];
        const authorAttr = attributes.find(attr => attr.trait_type === 'author');
        const timestampAttr = attributes.find(attr => attr.trait_type === 'timestamp');
        
        return {
          address: nft.address.toString(),
          content: nft.json?.description || '',
          image: nft.json?.image || '',
          author: authorAttr?.value || '',
          timestamp: timestampAttr?.value ? new Date(timestampAttr.value * 1000) : new Date(),
        };
      }).sort((a, b) => b.timestamp - a.timestamp); // Sort by newest first
    } catch (error) {
      console.error('Error fetching posts:', error);
      return [];
    }
  }, [metaplex]);

  // Fetch posts by user
  const fetchPostsByUser = useCallback(async (userAddress) => {
    if (!metaplex || !COLLECTION_ADDRESS) return [];

    try {
      const posts = await fetchCollectionNFTs(metaplex, COLLECTION_ADDRESS, CONTENT_TYPES.POST);
      
      return posts
        .filter(nft => {
          const attributes = nft.json?.attributes || [];
          const authorAttr = attributes.find(attr => attr.trait_type === 'author');
          return authorAttr?.value === userAddress;
        })
        .map(nft => {
          const attributes = nft.json?.attributes || [];
          const timestampAttr = attributes.find(attr => attr.trait_type === 'timestamp');
          
          return {
            address: nft.address.toString(),
            content: nft.json?.description || '',
            image: nft.json?.image || '',
            author: userAddress,
            timestamp: timestampAttr?.value ? new Date(timestampAttr.value * 1000) : new Date(),
          };
        })
        .sort((a, b) => b.timestamp - a.timestamp); // Sort by newest first
    } catch (error) {
      console.error('Error fetching posts by user:', error);
      return [];
    }
  }, [metaplex]);

  // Fetch a single post
  const fetchPost = useCallback(async (postAddress) => {
    if (!metaplex) return null;

    try {
      const nft = await metaplex.nfts().findByMetadata({ metadata: new PublicKey(postAddress) });
      
      if (!nft || !nft.json) return null;

      // Verify it's a post type
      const attributes = nft.json?.attributes || [];
      const typeAttr = attributes.find(attr => attr.trait_type === 'type');
      if (typeAttr?.value !== CONTENT_TYPES.POST) return null;

      const authorAttr = attributes.find(attr => attr.trait_type === 'author');
      const timestampAttr = attributes.find(attr => attr.trait_type === 'timestamp');
      
      return {
        address: nft.address.toString(),
        content: nft.json?.description || '',
        image: nft.json?.image || '',
        author: authorAttr?.value || '',
        timestamp: timestampAttr?.value ? new Date(timestampAttr.value * 1000) : new Date(),
      };
    } catch (error) {
      console.error('Error fetching post:', error);
      return null;
    }
  }, [metaplex]);

  // Create a new post
  const createPost = useMutation({
    mutationFn: async ({ content, imageFile }) => {
      if (!metaplex || !COLLECTION_ADDRESS || !publicKey) {
        throw new Error('Wallet not connected or collection not configured');
      }

      let imageUrl = '';
      
      // Upload image to Arweave if provided
      if (imageFile) {
        imageUrl = await uploadImage(imageFile);
      }

      return createSocialNFT(metaplex, COLLECTION_ADDRESS, {
        type: CONTENT_TYPES.POST,
        name: `Post #${Math.floor(Math.random() * 1000000)}`,
        description: content,
        image: imageUrl,
        attributes: [],
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: 'posts' });
      queryClient.invalidateQueries({ queryKey: ['posts', publicKey?.toString()] });
    },
  });

  // Create a reply to a post
  const createReply = useMutation({
    mutationFn: async ({ content, parentPost }) => {
      if (!metaplex || !COLLECTION_ADDRESS || !publicKey) {
        throw new Error('Wallet not connected or collection not configured');
      }

      const attributes = [
        {
          trait_type: 'parent_post',
          value: parentPost,
        },
      ];

      return createSocialNFT(metaplex, COLLECTION_ADDRESS, {
        type: CONTENT_TYPES.REPLY,
        name: `Reply #${Math.floor(Math.random() * 1000000)}`,
        description: content,
        image: '',
        attributes,
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['replies', variables.parentPost] });
    },
  });

  // Fetch replies to a post
  const fetchReplies = useCallback(async (postAddress) => {
    if (!metaplex || !COLLECTION_ADDRESS) return [];

    try {
      const replies = await fetchCollectionNFTs(metaplex, COLLECTION_ADDRESS, CONTENT_TYPES.REPLY);
      
      return replies
        .filter(nft => {
          const attributes = nft.json?.attributes || [];
          const parentPostAttr = attributes.find(attr => attr.trait_type === 'parent_post');
          return parentPostAttr?.value === postAddress;
        })
        .map(nft => {
          const attributes = nft.json?.attributes || [];
          const authorAttr = attributes.find(attr => attr.trait_type === 'author');
          const timestampAttr = attributes.find(attr => attr.trait_type === 'timestamp');
          
          return {
            address: nft.address.toString(),
            content: nft.json?.description || '',
            author: authorAttr?.value || '',
            timestamp: timestampAttr?.value ? new Date(timestampAttr.value * 1000) : new Date(),
            parentPost: postAddress,
          };
        })
        .sort((a, b) => a.timestamp - b.timestamp); // Sort by oldest first for replies
    } catch (error) {
      console.error('Error fetching replies:', error);
      return [];
    }
  }, [metaplex]);

  // Use react-query to fetch and cache posts
  const { data: posts, isLoading: isLoadingPosts } = useQuery({
    queryKey: 'posts',
    queryFn: fetchPosts,
    enabled: !!metaplex && !!COLLECTION_ADDRESS,
    staleTime: 1000 * 60 * 1, // 1 minute
  });

  return {
    posts,
    isLoadingPosts,
    createPost,
    fetchPostsByUser,
    fetchPost,
    createReply,
    fetchReplies,
  };
};
// src/hooks/usePosts.js
import { useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { publicKey } from '@metaplex-foundation/umi';
import { getUmi, fetchCollectionNFTs, createSocialNFT } from '../utils/umi';
import { COLLECTION_ADDRESS, CONTENT_TYPES } from '../utils/constants';
import { usePinata } from './usePinata';

export const usePosts = () => {
  const { publicKey: walletPublicKey, wallet } = useWallet();
  const umi = walletPublicKey ? getUmi(wallet) : null;
  const queryClient = useQueryClient();
  const { uploadImage } = usePinata();

  // Fetch all posts with error handling
  const fetchPosts = useCallback(async () => {
    if (!umi || !COLLECTION_ADDRESS) {
      console.log("Umi or collection address not available for fetchPosts");
      return [];
    }

    try {
      console.log("Fetching all posts");
      let fetchCompleted = false;
      let timeoutOccurred = false;
      
      // Set up timeout
      const timeoutId = setTimeout(() => {
        if (!fetchCompleted) {
          console.log("Posts fetch timed out");
          timeoutOccurred = true;
        }
      }, 12000); // 12 second timeout
      
      try {
        const posts = await fetchCollectionNFTs(umi, COLLECTION_ADDRESS, CONTENT_TYPES.POST);
        
        // Mark fetch as completed
        fetchCompleted = true;
        clearTimeout(timeoutId);
        
        // If timeout occurred, return empty array
        if (timeoutOccurred) {
          console.log("Posts fetch completed but timeout already occurred");
          return [];
        }
        
        console.log(`Mapping ${posts.length} posts`);
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
      } catch (fetchError) {
        // Mark fetch as completed (with error)
        fetchCompleted = true;
        clearTimeout(timeoutId);
        
        console.error("Error during posts fetch:", fetchError);
        throw fetchError;
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
      return [];
    }
  }, [umi]);

  // Fetch posts by user
  const fetchPostsByUser = useCallback(async (userAddress) => {
    if (!umi || !COLLECTION_ADDRESS) return [];

    try {
      let fetchCompleted = false;
      let timeoutOccurred = false;
      
      // Set up timeout
      const timeoutId = setTimeout(() => {
        if (!fetchCompleted) {
          console.log("User posts fetch timed out");
          timeoutOccurred = true;
        }
      }, 12000); // 12 second timeout
      
      try {
        const posts = await fetchCollectionNFTs(umi, COLLECTION_ADDRESS, CONTENT_TYPES.POST);
        
        // Mark fetch as completed
        fetchCompleted = true;
        clearTimeout(timeoutId);
        
        // If timeout occurred, return empty array
        if (timeoutOccurred) {
          console.log("User posts fetch completed but timeout already occurred");
          return [];
        }
        
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
      } catch (fetchError) {
        // Mark fetch as completed (with error)
        fetchCompleted = true;
        clearTimeout(timeoutId);
        
        console.error("Error during user posts fetch:", fetchError);
        throw fetchError;
      }
    } catch (error) {
      console.error('Error fetching posts by user:', error);
      return [];
    }
  }, [umi]);

  // Fetch a single post
  const fetchPost = useCallback(async (postAddress) => {
    if (!umi) return null;

    try {
      console.log(`Fetching post: ${postAddress}`);
      
      // This implementation would need to be updated for Umi
      // Placeholder for now - in real implementation you'd fetch the digital asset directly
      console.log("Note: fetchPost needs to be reimplemented with Umi");
      
      // As a fallback, we'll try to find it in all posts (not efficient but works as temporary solution)
      const posts = await fetchCollectionNFTs(umi, COLLECTION_ADDRESS, CONTENT_TYPES.POST);
      
      const post = posts.find(nft => nft.address.toString() === postAddress);
      
      if (!post) return null;
      
      // Verify it's a post type
      const attributes = post.json?.attributes || [];
      const typeAttr = attributes.find(attr => attr.trait_type === 'type');
      if (typeAttr?.value !== CONTENT_TYPES.POST) return null;

      const authorAttr = attributes.find(attr => attr.trait_type === 'author');
      const timestampAttr = attributes.find(attr => attr.trait_type === 'timestamp');
      
      return {
        address: post.address.toString(),
        content: post.json?.description || '',
        image: post.json?.image || '',
        author: authorAttr?.value || '',
        timestamp: timestampAttr?.value ? new Date(timestampAttr.value * 1000) : new Date(),
      };
    } catch (error) {
      console.error('Error fetching post:', error);
      return null;
    }
  }, [umi]);

  // Create a new post
  const createPost = useMutation({
    mutationFn: async ({ content, imageFile }) => {
      if (!umi || !COLLECTION_ADDRESS || !walletPublicKey) {
        throw new Error('Wallet not connected or collection not configured');
      }

      let imageUrl = '';
      
      // Upload image to Pinata if provided
      if (imageFile) {
        imageUrl = await uploadImage(imageFile);
      }

      return createSocialNFT(umi, COLLECTION_ADDRESS, {
        type: CONTENT_TYPES.POST,
        name: `Post #${Math.floor(Math.random() * 1000000)}`,
        description: content,
        image: imageUrl,
        attributes: [],
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: 'posts' });
      queryClient.invalidateQueries({ queryKey: ['posts', walletPublicKey?.toString()] });
    },
  });

  // Create a reply to a post
  const createReply = useMutation({
    mutationFn: async ({ content, parentPost }) => {
      if (!umi || !COLLECTION_ADDRESS || !walletPublicKey) {
        throw new Error('Wallet not connected or collection not configured');
      }

      const attributes = [
        {
          trait_type: 'parent_post',
          value: parentPost,
        },
      ];

      return createSocialNFT(umi, COLLECTION_ADDRESS, {
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
    if (!umi || !COLLECTION_ADDRESS) return [];

    try {
      let fetchCompleted = false;
      let timeoutOccurred = false;
      
      // Set up timeout
      const timeoutId = setTimeout(() => {
        if (!fetchCompleted) {
          console.log("Replies fetch timed out");
          timeoutOccurred = true;
        }
      }, 10000); // 10 second timeout
      
      try {
        const replies = await fetchCollectionNFTs(umi, COLLECTION_ADDRESS, CONTENT_TYPES.REPLY);
        
        // Mark fetch as completed
        fetchCompleted = true;
        clearTimeout(timeoutId);
        
        // If timeout occurred, return empty array
        if (timeoutOccurred) {
          console.log("Replies fetch completed but timeout already occurred");
          return [];
        }
        
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
      } catch (fetchError) {
        // Mark fetch as completed (with error)
        fetchCompleted = true;
        clearTimeout(timeoutId);
        
        console.error("Error during replies fetch:", fetchError);
        throw fetchError;
      }
    } catch (error) {
      console.error('Error fetching replies:', error);
      return [];
    }
  }, [umi]);

  // Use react-query to fetch and cache posts
  const { data: posts, isLoading: isLoadingPosts } = useQuery({
    queryKey: 'posts',
    queryFn: fetchPosts,
    enabled: !!umi && !!COLLECTION_ADDRESS,
    staleTime: 1000 * 60 * 1, // 1 minute
    retry: 1,
    retryDelay: 1000,
    onError: (error) => {
      console.error("Posts query error:", error);
    }
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
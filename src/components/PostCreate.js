// src/components/PostCreate.js - Direct NFT minting implementation

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import ImageUpload from './ImageUpload';
import { MAX_CHAR_COUNT, COLLECTION_ADDRESS, CONTENT_TYPES } from '../utils/constants';
import { getUmi, createSocialNFT } from '../utils/umi';
import { usePinata } from '../hooks/usePinata';

export default function PostCreate() {
  const [content, setContent] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [transactionStatus, setTransactionStatus] = useState({
    status: 'idle',
    message: '',
    error: null,
    txId: null
  });
  
  const { connected, publicKey, wallet, connect } = useWallet();
  const { uploadImage } = usePinata();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!content) {
      setError('Content is required');
      return;
    }
    
    if (!connected || !publicKey || !wallet) {
      setError('Please connect your wallet first');
      return;
    }

    try {
      setError(null);
      setIsSubmitting(true);
      
      // Try connecting the wallet directly
      if (!wallet.adapter.connected) {
        try {
          console.log("Connecting wallet before post creation");
          await connect();
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          throw new Error(`Failed to connect wallet: ${error.message}`);
        }
      }
      
      const umi = getUmi(wallet, true);
      if (!umi) {
        throw new Error("Failed to initialize UMI. Please try again.");
      }
      
      // Start with image upload if provided
      if (imageFile) {
        setTransactionStatus({
          status: 'uploading',
          message: 'Uploading post image...',
          error: null,
          txId: null
        });
        
        try {
          const imageUrl = await uploadImage(imageFile);
          console.log("Image uploaded to:", imageUrl);
          
          // Update status to creating
          setTransactionStatus({
            status: 'creating',
            message: 'Creating your post NFT. Please approve the transaction in your wallet...',
            error: null,
            txId: null
          });
          
          // Create NFT with image
          const nft = await createSocialNFT(umi, COLLECTION_ADDRESS, {
            type: CONTENT_TYPES.POST,
            name: `Post by ${publicKey.toString().substring(0, 8)}`,
            description: content,
            image: imageUrl,
            attributes: []
          });
          
          // Success!
          setTransactionStatus({
            status: 'success',
            message: 'Post created successfully!',
            error: null,
            txId: nft.signature
          });
          
          // Reset form
          setContent('');
          setImageFile(null);
          
          // Reset status after a delay
          setTimeout(() => {
            setTransactionStatus({
              status: 'idle',
              message: '',
              error: null,
              txId: null
            });
          }, 5000);
          
        } catch (error) {
          throw error;
        }
      } else {
        // No image, just create the post
        setTransactionStatus({
          status: 'creating',
          message: 'Creating your post NFT. Please approve the transaction in your wallet...',
          error: null,
          txId: null
        });
        
        // Create NFT without image
        const nft = await createSocialNFT(umi, COLLECTION_ADDRESS, {
          type: CONTENT_TYPES.POST,
          name: `Post by ${publicKey.toString().substring(0, 8)}`,
          description: content,
          image: '',
          attributes: []
        });
        
        // Success!
        setTransactionStatus({
          status: 'success',
          message: 'Post created successfully!',
          error: null,
          txId: nft.signature
        });
        
        // Reset form
        setContent('');
        setImageFile(null);
        
        // Reset status after a delay
        setTimeout(() => {
          setTransactionStatus({
            status: 'idle',
            message: '',
            error: null,
            txId: null
          });
        }, 5000);
      }
    } catch (error) {
      console.error('Error creating post:', error);
      
      // Handle specific errors
      if (error.message?.includes('wallet')) {
        setError(`Wallet error: ${error.message}`);
      } else if (error.message?.includes('SOL')) {
        setError('Not enough SOL in your wallet. Please fund your wallet and try again.');
      } else if (error.message?.includes('rejected')) {
        setError('Transaction was rejected. Please approve the transaction when prompted.');
      } else {
        setError(error.message || 'Failed to create post. Please try again.');
      }
      
      setTransactionStatus({
        status: 'error',
        message: 'Failed to create post',
        error: error.message,
        txId: null
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderTransactionStatus = () => {
    switch (transactionStatus.status) {
      case 'uploading':
        return (
          <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 mb-4">
            <p className="font-bold">Uploading Image</p>
            <p>{transactionStatus.message}</p>
            <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
              <div className="bg-blue-600 h-2.5 rounded-full w-1/3"></div>
            </div>
          </div>
        );
      case 'creating':
        return (
          <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 mb-4">
            <p className="font-bold">Creating Post NFT</p>
            <p>{transactionStatus.message}</p>
            <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
              <div className="bg-blue-600 h-2.5 rounded-full w-2/3"></div>
            </div>
          </div>
        );
      case 'success':
        return (
          <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-4">
            <p className="font-bold">Success!</p>
            <p>{transactionStatus.message}</p>
            {transactionStatus.txId && (
              <p className="text-sm mt-2">Transaction ID: {transactionStatus.txId}</p>
            )}
          </div>
        );
      case 'error':
        return (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4">
            <p className="font-bold">Error</p>
            <p>{transactionStatus.message}</p>
            {transactionStatus.error && <p className="text-sm mt-1">{transactionStatus.error}</p>}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-6 mb-6">
      <h2 className="text-xl font-semibold mb-4">Create Post</h2>
      
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4">
          <p className="font-bold">Error</p>
          <p>{error}</p>
        </div>
      )}
      
      {renderTransactionStatus()}
      
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full px-3 py-2 border rounded-md"
            rows={3}
            placeholder="What's on your mind?"
            maxLength={MAX_CHAR_COUNT}
            disabled={!connected || isSubmitting || transactionStatus.status !== 'idle'}
          />
          <p className="text-gray-500 text-sm mt-1">
            {content.length}/{MAX_CHAR_COUNT}
          </p>
        </div>
        
        <div className="mb-4">
          <ImageUpload 
            onImageSelected={setImageFile}
            disabled={!connected || isSubmitting || transactionStatus.status !== 'idle'}
          />
        </div>
        
        <button
          type="submit"
          className="bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
          disabled={
            !connected || 
            isSubmitting || 
            !content ||
            transactionStatus.status !== 'idle'
          }
        >
          {isSubmitting ? 'Creating NFT...' : 'Post'}
        </button>
        
        <p className="text-xs text-gray-500 mt-2">
          This will create an NFT on Solana. Transaction fees apply.
        </p>
      </form>
    </div>
  );
}
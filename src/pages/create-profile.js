// src/pages/create-profile.js - simplified version for direct NFT creation

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useWallet } from '@solana/wallet-adapter-react';
import ImageUpload from '../components/ImageUpload';
import { MAX_CHAR_COUNT } from '../utils/constants';
import { getUmi, createSocialNFT } from '../utils/umi';
import { COLLECTION_ADDRESS, CONTENT_TYPES } from '../utils/constants';
import { usePinata } from '../hooks/usePinata';

export default function ProfileCreate() {
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [transactionStatus, setTransactionStatus] = useState({ 
    status: 'idle',
    message: '',
    error: null,
    txId: null
  });
  
  const router = useRouter();
  const { connected, publicKey, wallet, connect, disconnect } = useWallet();
  const { uploadImage } = usePinata();
  const [mounted, setMounted] = useState(false);

  // Handle client-side only rendering
  useEffect(() => {
    setMounted(true);
  }, []);

  const reconnectWallet = async () => {
    try {
      setError("Reconnecting wallet...");
      
      // Disconnect first
      await disconnect();
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Then reconnect
      await connect();
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setError("Wallet reconnected. Please try again.");
    } catch (e) {
      console.error("Error reconnecting wallet:", e);
      setError("Failed to reconnect wallet: " + e.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!username) {
      setError('Username is required');
      return;
    }
    
    if (!connected || !publicKey) {
      setError("Please connect your wallet first");
      return;
    }
    
    if (!wallet || !wallet.adapter) {
      setError("Wallet adapter not available. Please refresh the page and try again.");
      return;
    }

    try {
      setError(null);
      setIsSubmitting(true);
      
      // Get UMI instance
      const umi = getUmi(wallet);
      if (!umi) {
        throw new Error("Failed to initialize UMI. Please try again.");
      }
      
      // Start with image upload
      setTransactionStatus({
        status: 'uploading',
        message: 'Uploading profile image...',
        error: null,
        txId: null
      });
      
      let imageUrl = '';
      if (imageFile) {
        try {
          imageUrl = await uploadImage(imageFile);
          console.log("Image uploaded to:", imageUrl);
        } catch (error) {
          console.error("Image upload error:", error);
          setError("Failed to upload image, but continuing with profile creation");
          // Continue without image
        }
      }
      
      // Update status to creating
      setTransactionStatus({
        status: 'creating',
        message: 'Creating your profile NFT. Please approve the transaction in your wallet...',
        error: null,
        txId: null
      });
      
      // Create profile NFT
      console.log("Creating profile NFT with:", {
        type: CONTENT_TYPES.PROFILE,
        name: `Profile #${username}`,
        description: bio || '',
        image: imageUrl,
        username
      });
      
      const nft = await createSocialNFT(umi, COLLECTION_ADDRESS, {
        type: CONTENT_TYPES.PROFILE,
        name: `Profile #${username}`,
        description: bio || '',
        image: imageUrl,
        attributes: [
          { trait_type: 'username', value: username }
        ]
      });
      
      // Success!
      setTransactionStatus({
        status: 'success',
        message: 'Profile created successfully!',
        error: null,
        txId: nft.address
      });
      
      // Clear form
      setUsername('');
      setBio('');
      setImageFile(null);
      
      // Wait a moment before redirecting
      setTimeout(() => {
        router.push('/');
      }, 3000);
      
    } catch (error) {
      console.error('Error creating profile:', error);
      
      // Handle specific error types
      if (error.message?.includes('wallet')) {
        setError(`Wallet error: ${error.message}`);
      } else if (error.message?.includes('SOL')) {
        setError('Not enough SOL in your wallet. Please fund your wallet and try again.');
      } else if (error.message?.includes('rejected')) {
        setError('Transaction was rejected. Please approve the transaction when prompted.');
      } else {
        setError(error.message || 'Failed to create profile. Please try again.');
      }
      
      setTransactionStatus({
        status: 'error',
        message: 'Failed to create profile',
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
            <p className="font-bold">Creating Profile NFT</p>
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
              <p className="text-sm mt-2">NFT Address: {transactionStatus.txId}</p>
            )}
            <p className="text-sm mt-2">Redirecting to home page...</p>
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

  if (!mounted) {
    return (
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-md p-6">
        <h2 className="text-2xl font-bold mb-4">Create Your Profile</h2>
        <div className="flex justify-center items-center p-6">
          <p>Loading wallet...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-white rounded-xl shadow-md p-6">
      <h2 className="text-2xl font-bold mb-4">Create Your Profile</h2>
      
      {!connected && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4">
          <p className="font-bold">Wallet Not Connected</p>
          <p>Please connect your wallet using the button in the top-right corner.</p>
        </div>
      )}
      
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4">
          <p className="font-bold">Error</p>
          <p>{error}</p>
          {error.includes('wallet') && (
            <button 
              onClick={reconnectWallet}
              className="mt-2 bg-red-500 text-white py-1 px-3 rounded-md hover:bg-red-600 text-sm"
            >
              Reconnect Wallet
            </button>
          )}
        </div>
      )}
      
      {renderTransactionStatus()}
      
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-gray-700 mb-2">Profile Picture</label>
          <ImageUpload 
            onImageSelected={setImageFile} 
            disabled={!connected || isSubmitting || transactionStatus.status !== 'idle'}
          />
        </div>
        
        <div className="mb-4">
          <label htmlFor="username" className="block text-gray-700 mb-2">
            Username
          </label>
          <input
            type="text"
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-3 py-2 border rounded-md"
            required
            maxLength={50}
            disabled={!connected || isSubmitting || transactionStatus.status !== 'idle'}
          />
        </div>
        
        <div className="mb-4">
          <label htmlFor="bio" className="block text-gray-700 mb-2">
            Bio
          </label>
          <textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="w-full px-3 py-2 border rounded-md"
            rows={3}
            maxLength={MAX_CHAR_COUNT}
            disabled={!connected || isSubmitting || transactionStatus.status !== 'idle'}
          />
          <p className="text-gray-500 text-sm mt-1">
            {bio.length}/{MAX_CHAR_COUNT}
          </p>
        </div>
        
        <button
          type="submit"
          className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
          disabled={
            !connected || 
            isSubmitting || 
            !username ||
            transactionStatus.status !== 'idle'
          }
        >
          {isSubmitting ? 'Creating NFT...' : 'Create Profile NFT'}
        </button>
        
        {connected && (
          <p className="text-xs text-gray-500 mt-2 text-center">
            This will create an NFT on Solana. Please make sure you have enough SOL for the transaction.
          </p>
        )}
      </form>
    </div>
  );
}
// src/components/ProfileCreate.js - Production implementation with proper wallet handling
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useWallet } from '@solana/wallet-adapter-react';
import ImageUpload from './ImageUpload';
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
  const [walletReady, setWalletReady] = useState(false);
  const [transactionStatus, setTransactionStatus] = useState({ 
    status: 'idle',
    message: '',
    error: null,
    txId: null
  });
  
  const router = useRouter();
  const { connected, publicKey, wallet, connect, disconnect, connecting } = useWallet();
  const { uploadImage } = usePinata();
  const [mounted, setMounted] = useState(false);

  // Handle client-side only rendering
  useEffect(() => {
    setMounted(true);
  }, []);

  // Check wallet readiness without accessing properties that might not be initialized
  useEffect(() => {
    if (!mounted) return;
    
    const checkWalletReady = () => {
      // Verify wallet is connected and has all required properties
      const isReady = Boolean(
        connected && 
        publicKey && 
        wallet && 
        wallet.adapter && 
        wallet.adapter.connected && 
        !connecting
      );
      
      // Only log changes to reduce noise
      if (isReady !== walletReady) {
        console.log("Wallet ready state changed:", isReady);
        console.log("Wallet state:", {
          connected,
          hasPublicKey: Boolean(publicKey),
          hasWallet: Boolean(wallet),
          hasAdapter: Boolean(wallet?.adapter),
          connecting,
          adapterConnected: Boolean(wallet?.adapter?.connected)
        });
      }
      
      setWalletReady(isReady);
      return isReady;
    };
    
    // Initial check
    checkWalletReady();
    
    // Poll for wallet readiness if connected but not ready yet
    if (connected && !walletReady && !connecting) {
      const interval = setInterval(() => {
        if (checkWalletReady()) {
          clearInterval(interval);
        }
      }, 500);
      
      return () => clearInterval(interval);
    }
  }, [connected, publicKey, wallet, connecting, mounted, walletReady]);

  // Initialize wallet connection - with improved error handling
  const initializeWallet = useCallback(async () => {
    try {
      setError("Initializing wallet connection...");
      
      // First disconnect to reset state
      if (wallet && wallet.adapter && wallet.adapter.connected) {
        console.log("Disconnecting wallet to reset connection");
        await disconnect();
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // Then connect
      console.log("Connecting wallet");
      await connect();
      
      // Wait for connection to establish
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (connected && publicKey) {
        console.log("Wallet connected successfully");
        setError(null);
      } else {
        throw new Error("Wallet connection failed");
      }
    } catch (error) {
      console.error("Wallet initialization error:", error);
      setError(`Wallet initialization failed: ${error.message}`);
    }
  }, [wallet, connect, disconnect, connected, publicKey]);

  // Submit profile creation
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
    
    if (!walletReady) {
      setError("Wallet is not fully initialized. Please wait a moment or try reconnecting.");
      return;
    }

    try {
      setError(null);
      setIsSubmitting(true);
      
      // Get UMI instance - with force create to handle any remaining initialization issues
      const umi = getUmi(wallet, true);
      if (!umi) {
        throw new Error("Failed to initialize UMI instance. Please try again.");
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
          // Continue without image rather than failing the whole process
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
        setError(`Wallet error: ${error.message}. Try reconnecting your wallet.`);
      } else if (error.message?.includes('SOL')) {
        setError('Not enough SOL in your wallet. Please fund your wallet and try again.');
      } else if (error.message?.includes('rejected') || error.message?.includes('User rejected')) {
        setError('Transaction was rejected. Please approve the transaction when prompted.');
      } else {
        setError(`Failed to create profile: ${error.message}. Please try again.`);
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
      
      {connected && !walletReady && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4">
          <p className="font-bold">Wallet Initializing</p>
          <p>Please wait while your wallet connection completes...</p>
          <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
            <div className="bg-yellow-400 h-2.5 rounded-full w-1/2 animate-pulse"></div>
          </div>
        </div>
      )}
      
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4">
          <p className="font-bold">Error</p>
          <p>{error}</p>
          {error.includes('wallet') && (
            <button 
              onClick={initializeWallet}
              className="mt-2 bg-red-500 text-white py-1 px-3 rounded-md hover:bg-red-600 text-sm"
            >
              Reconnect Wallet
            </button>
          )}
        </div>
      )}
      
      {renderTransactionStatus()}
      
      <div className={`mb-4 p-2 ${walletReady ? 'bg-green-100' : 'bg-yellow-100'} rounded`}>
        <p>
          {!connected ? '⚠️ Wallet not connected' : 
           connecting ? '⏳ Connecting wallet...' :
           walletReady ? "✅ Wallet connected and ready" : 
           "⚠️ Waiting for wallet to be ready..."}
        </p>
      </div>
      
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-gray-700 mb-2">Profile Picture</label>
          <ImageUpload 
            onImageSelected={setImageFile} 
            disabled={!connected || !walletReady || isSubmitting || transactionStatus.status !== 'idle'}
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
            disabled={!connected || !walletReady || isSubmitting || transactionStatus.status !== 'idle'}
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
            disabled={!connected || !walletReady || isSubmitting || transactionStatus.status !== 'idle'}
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
            !walletReady || 
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
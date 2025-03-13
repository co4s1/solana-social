// src/components/ProfileCreate.js - updated with transaction status and wallet signing

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useWallet } from '@solana/wallet-adapter-react';
import { useProfile } from '../hooks/useProfile';
import ImageUpload from './ImageUpload';
import { MAX_CHAR_COUNT } from '../utils/constants';

export default function ProfileCreate() {
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [error, setError] = useState(null);
  const [walletReady, setWalletReady] = useState(false);
  const { createProfile, transactionStatus } = useProfile();
  const router = useRouter();
  const { connected, publicKey, wallet, connecting } = useWallet();

  // Check wallet readiness
  useEffect(() => {
    // Clear error when wallet changes
    setError(null);
    
    // Check if wallet is ready
    const checkWalletReady = () => {
      if (!connected || !publicKey) {
        console.log("Wallet not connected");
        setWalletReady(false);
        return false;
      }
      
      if (!wallet || !wallet.adapter) {
        console.log("Wallet adapter not initialized");
        setWalletReady(false);
        return false;
      }
      
      if (connecting) {
        console.log("Wallet still connecting");
        setWalletReady(false);
        return false;
      }
      
      // Extra check: see if adapter publicKey matches wallet publicKey
      if (wallet.adapter.publicKey && !wallet.adapter.publicKey.equals(publicKey)) {
        console.log("Wallet public keys don't match");
        setWalletReady(false);
        return false;
      }
      
      console.log("Wallet is ready");
      setWalletReady(true);
      return true;
    };
    
    // Initial check
    checkWalletReady();
    
    // Set up polling to check wallet readiness every second
    const intervalId = setInterval(() => {
      checkWalletReady();
    }, 1000);
    
    // Clean up interval
    return () => clearInterval(intervalId);
  }, [connected, publicKey, wallet, connecting]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!username) {
      setError('Username is required');
      return;
    }
    
    if (!walletReady) {
      setError("Wallet is not ready. Please wait a moment or try reconnecting your wallet.");
      return;
    }

    try {
      setError(null);
      
      // Final wallet readiness check before submitting
      if (!connected || !publicKey || !wallet || !wallet.adapter) {
        setError("Wallet is not ready. Please try reconnecting your wallet and try again.");
        return;
      }

      // Delay slightly to ensure wallet is fully ready
      await new Promise(resolve => setTimeout(resolve, 500));
      
      await createProfile.mutateAsync({ username, bio, imageFile });
      
      // No need to navigate away immediately anymore - we'll wait for success
      if (transactionStatus.status === 'success') {
        router.push('/');
      }
    } catch (error) {
      console.error('Error creating profile:', error);
      
      // More detailed error messages
      if (error.message && error.message.includes("wallet")) {
        setError("Wallet error: " + error.message);
      } else if (error.message && error.message.includes("timeout")) {
        setError("Request timed out. The Solana network might be congested.");
      } else {
        setError(error.message || 'Failed to create profile. Please try again.');
      }
    }
  };

  // Navigate away on success
  useEffect(() => {
    if (transactionStatus.status === 'success') {
      // Wait a moment to show success message before redirecting
      const timer = setTimeout(() => {
        router.push('/');
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [transactionStatus.status, router]);

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
            <p className="text-sm mt-2">Please approve the transaction in your wallet</p>
            <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
              <div className="bg-blue-600 h-2.5 rounded-full w-2/3"></div>
            </div>
          </div>
        );
      case 'confirming':
        return (
          <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 mb-4">
            <p className="font-bold">Confirming Transaction</p>
            <p>{transactionStatus.message}</p>
            <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
              <div className="bg-blue-600 h-2.5 rounded-full w-4/5"></div>
            </div>
          </div>
        );
      case 'success':
        return (
          <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-4">
            <p className="font-bold">Success!</p>
            <p>{transactionStatus.message}</p>
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

  return (
    <div className="max-w-md mx-auto bg-white rounded-xl shadow-md p-6">
      <h2 className="text-2xl font-bold mb-4">Create Your Profile</h2>
      
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4">
          <p className="font-bold">Error</p>
          <p>{error}</p>
          {error.includes('wallet') && (
            <button 
              onClick={async () => {
                try {
                  console.log("Attempting to reconnect wallet");
                  setError("Reconnecting wallet...");
                  
                  // First disconnect
                  if (wallet.adapter && wallet.adapter.connected) {
                    await wallet.disconnect();
                  }
                  
                  // Wait a moment
                  await new Promise(resolve => setTimeout(resolve, 1000));
                  
                  // Then reconnect
                  await wallet.connect();
                  
                  setError("Wallet reconnected. Please try again.");
                } catch (e) {
                  console.error("Error reconnecting wallet:", e);
                  setError("Failed to reconnect wallet: " + e.message);
                }
              }}
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
          {walletReady 
            ? "✅ Wallet connected and ready" 
            : "⚠️ Waiting for wallet to be ready..."}
        </p>
      </div>
      
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-gray-700 mb-2">Profile Picture</label>
          <ImageUpload onImageSelected={setImageFile} />
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
            disabled={transactionStatus.status !== 'idle' && transactionStatus.status !== 'error'}
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
            disabled={transactionStatus.status !== 'idle' && transactionStatus.status !== 'error'}
          />
          <p className="text-gray-500 text-sm mt-1">
            {bio.length}/{MAX_CHAR_COUNT}
          </p>
        </div>
        
        <button
          type="submit"
          className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
          disabled={
            createProfile.isLoading || 
            !walletReady || 
            (transactionStatus.status !== 'idle' && transactionStatus.status !== 'error')
          }
        >
          {createProfile.isLoading ? 'Creating...' : 'Create Profile NFT'}
        </button>
      </form>
    </div>
  );
}
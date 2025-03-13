// src/pages/create-profile.js - Real implementation that actually mints NFTs
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useWallet } from '@solana/wallet-adapter-react';
import ImageUpload from '../components/ImageUpload';
import { MAX_CHAR_COUNT } from '../utils/constants';
import { COLLECTION_ADDRESS } from '../utils/constants';
import { usePinata } from '../hooks/usePinata';
import { getUmi, createSocialNFT } from '../utils/umi';
import { CONTENT_TYPES } from '../utils/constants';

export default function CreateProfile() {
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [debugInfo, setDebugInfo] = useState(null);
  
  const router = useRouter();
  const wallet = useWallet();
  const { uploadImage } = usePinata();
  
  // Check if we're in browser environment
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  
  // Log wallet state for debugging
  useEffect(() => {
    if (!mounted) return;
    
    const walletInfo = {
      connected: wallet.connected,
      hasPublicKey: Boolean(wallet.publicKey),
      publicKeyString: wallet.publicKey?.toString(),
      hasAdapter: Boolean(wallet.adapter),
      connecting: wallet.connecting,
      hasSignTransaction: typeof wallet.signTransaction === 'function',
      hasSignAllTransactions: typeof wallet.signAllTransactions === 'function',
      hasSignMessage: typeof wallet.signMessage === 'function'
    };
    
    console.log("Wallet state:", walletInfo);
    setDebugInfo(walletInfo);
  }, [wallet, mounted]);
  
  // Verify wallet is properly connected
  const isWalletReady = wallet.connected && wallet.publicKey && !wallet.connecting;
  
  const updateStatus = (newStatus, message = '') => {
    setStatus(newStatus);
    setStatusMessage(message);
  };
  
  // Form submission handler - REAL IMPLEMENTATION
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form inputs
    if (!username) {
      setError('Username is required');
      return;
    }
    
    if (!wallet.connected || !wallet.publicKey) {
      setError('Please connect your wallet first');
      return;
    }
    
    // Check that wallet has required sign methods
    if (typeof wallet.signTransaction !== 'function' || 
        typeof wallet.signAllTransactions !== 'function') {
      setError('Your wallet does not support the required transaction signing methods. Please use a compatible wallet.');
      return;
    }
    
    // Start submission process
    try {
      setError(null);
      setIsSubmitting(true);
      
      // Step 1: Upload image if provided
      updateStatus('uploading', 'Uploading profile image...');
      let imageUrl = '';
      
      if (imageFile) {
        try {
          imageUrl = await uploadImage(imageFile);
          console.log(`Image uploaded: ${imageUrl}`);
        } catch (imageError) {
          console.error('Image upload failed:', imageError);
          setError('Image upload failed, but continuing with profile creation');
        }
      }
      
      // Step 2: Try to create UMI instance
      updateStatus('initializing', 'Initializing blockchain connection...');
      
      // Pass the entire wallet object
      const umi = getUmi(wallet);
      console.log("UMI instance created:", Boolean(umi));
      
      if (!umi) {
        throw new Error('Failed to create blockchain connection. Please check that your wallet is properly connected.');
      }
      
      // Step 3: Create NFT profile - ACTUAL MINTING
      updateStatus('creating', 'Creating your profile NFT. Please approve the transaction in your wallet...');
      
      // Attempt to mint the actual NFT
      const nft = await createSocialNFT(
        umi,
        COLLECTION_ADDRESS,
        {
          type: CONTENT_TYPES.PROFILE,
          name: `Profile: ${username}`,
          description: bio || '',
          image: imageUrl,
          attributes: [
            { trait_type: 'username', value: username }
          ]
        }
      );
      
      // Only show success if we got a real result with address
      if (nft && nft.address) {
        // Success!
        updateStatus('success', 'Profile NFT created successfully!');
        setTransactionId(nft.address);
        console.log('Created profile NFT with address:', nft.address);
        
        // Clear form
        setUsername('');
        setBio('');
        setImageFile(null);
        
        // Redirect after short delay
        setTimeout(() => {
          router.push('/');
        }, 5000);
      } else {
        throw new Error("NFT creation failed - no transaction ID returned");
      }
    } catch (error) {
      console.error('Profile creation failed:', error);
      updateStatus('error', `Failed to create profile: ${error.message}`);
      setError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Render loading state during SSR
  if (!mounted) {
    return <div>Loading...</div>;
  }
  
  return (
    <div className="max-w-md mx-auto bg-white rounded-xl shadow-md p-6">
      <h2 className="text-2xl font-bold mb-4">Create Your Profile</h2>
      
      {/* Wallet connection status */}
      {!wallet.connected && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4">
          <p className="font-bold">Wallet Not Connected</p>
          <p>Please connect your wallet using the button in the top-right corner.</p>
        </div>
      )}
      
      {/* Error message */}
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4">
          <p className="font-bold">Error</p>
          <p>{error}</p>
          {error.includes('wallet') && (
            <button
              onClick={async () => {
                try {
                  if (wallet.connected) {
                    await wallet.disconnect();
                    await new Promise(resolve => setTimeout(resolve, 1000));
                  }
                  await wallet.connect();
                  setError(null);
                } catch (e) {
                  setError(`Reconnection failed: ${e.message}`);
                }
              }}
              className="mt-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded text-sm"
            >
              Reconnect Wallet
            </button>
          )}
        </div>
      )}
      
      {/* Status messages */}
      {status === 'initializing' && (
        <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 mb-4">
          <p className="font-bold">Initializing</p>
          <p>{statusMessage}</p>
        </div>
      )}
      
      {status === 'uploading' && (
        <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 mb-4">
          <p className="font-bold">Uploading Image</p>
          <p>{statusMessage}</p>
        </div>
      )}
      
      {status === 'creating' && (
        <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 mb-4">
          <p className="font-bold">Creating Profile NFT</p>
          <p>{statusMessage}</p>
        </div>
      )}
      
      {status === 'success' && (
        <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-4">
          <p className="font-bold">Success!</p>
          <p>{statusMessage}</p>
          {transactionId && (
            <p className="text-sm mt-2">
              NFT address: <span className="font-mono">{transactionId}</span>
            </p>
          )}
          <p className="text-sm mt-2">Redirecting to home page in a few seconds...</p>
        </div>
      )}
      
      {/* Debug information */}
      {debugInfo && (
        <div className="mb-4 p-2 bg-gray-100 rounded text-xs">
          <p className="font-bold mb-1">Wallet Debug Info:</p>
          <pre className="overflow-auto max-h-32">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </div>
      )}
      
      {/* Profile creation form */}
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-gray-700 mb-2">Profile Picture</label>
          <ImageUpload 
            onImageSelected={setImageFile} 
            disabled={!isWalletReady || isSubmitting}
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
            disabled={!isWalletReady || isSubmitting}
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
            disabled={!isWalletReady || isSubmitting}
          />
          <p className="text-gray-500 text-sm mt-1">
            {bio.length}/{MAX_CHAR_COUNT}
          </p>
        </div>
        
        <button
          type="submit"
          className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
          disabled={!isWalletReady || isSubmitting || !username}
        >
          {isSubmitting ? 'Creating NFT...' : 'Create Profile NFT'}
        </button>
        
        <p className="text-xs text-gray-500 mt-2 text-center">
          This will create an actual NFT on Solana.
          Make sure you have enough SOL for transaction fees.
        </p>
      </form>
    </div>
  );
}
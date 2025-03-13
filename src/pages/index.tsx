// src/pages/index.js
import { useWallet } from '@solana/wallet-adapter-react';
import { useAuth } from '../components/AuthProvider';
import Feed from '../components/Feed';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';

export default function Home() {
  const { connected } = useWallet();
  const { isAuthenticated, loading, error } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  
  // Handle client-side only rendering
  useEffect(() => {
    setMounted(true);
  }, []);

  // Don't render anything complex server-side or before mounting
  if (!mounted) {
    return (
      <div>
        <h1 className="text-3xl font-bold mb-8">Decentralized Social on Solana</h1>
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Decentralized Social on Solana</h1>
      
      {error && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4">
          <p className="font-bold">Warning</p>
          <p>{error}</p>
          {connected && (
            <p className="mt-2">
              You can still try to create a profile if you haven't already.
            </p>
          )}
        </div>
      )}
      
      {!connected ? (
        <div className="bg-white rounded-xl shadow-md p-6 text-center">
          <h2 className="text-xl font-semibold mb-4">Welcome to SolSocial</h2>
          <p className="mb-4">Connect your wallet to get started</p>
        </div>
      ) : loading ? (
        <div className="text-center py-8">
          <p>Loading user profile...</p>
          <p className="text-sm text-gray-500 mt-2">This may take a few moments...</p>
        </div>
      ) : !isAuthenticated ? (
        <div className="bg-white rounded-xl shadow-md p-6 text-center">
          <h2 className="text-xl font-semibold mb-4">Create Your Profile</h2>
          <p className="mb-4">You need to create a profile to start posting</p>
          <button
            onClick={() => router.push('/create-profile')}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md"
          >
            Create Profile
          </button>
        </div>
      ) : (
        <Feed />
      )}
    </div>
  );
}
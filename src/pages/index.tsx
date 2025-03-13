// src/pages/index.js
import { useWallet } from '@solana/wallet-adapter-react';
import { useAuth } from '../components/AuthProvider';
import Feed from '../components/Feed';

export default function Home() {
  const { connected } = useWallet();
  const { isAuthenticated, loading } = useAuth();

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Decentralized Social on Solana</h1>
      
      {!connected ? (
        <div className="bg-white rounded-xl shadow-md p-6 text-center">
          <h2 className="text-xl font-semibold mb-4">Welcome to SolSocial</h2>
          <p className="mb-4">Connect your wallet to get started</p>
        </div>
      ) : loading ? (
        <div className="text-center py-8">Loading...</div>
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
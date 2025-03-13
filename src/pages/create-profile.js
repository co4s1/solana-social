// src/pages/create-profile.js
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useWallet } from '@solana/wallet-adapter-react';
import { useAuth } from '../components/AuthProvider';
import ProfileCreate from '../components/ProfileCreate';

export default function CreateProfilePage() {
  const { connected } = useWallet();
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !connected) {
      router.push('/');
    }
    
    if (!loading && isAuthenticated) {
      router.push('/');
    }
  }, [connected, isAuthenticated, loading, router]);

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  if (!connected) {
    return null; // Will redirect in useEffect
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Create Your Profile</h1>
      <ProfileCreate />
    </div>
  );
}
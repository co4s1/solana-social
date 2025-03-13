// src/pages/create-profile.js
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useWallet } from '@solana/wallet-adapter-react';
import { useAuth } from '../components/AuthProvider';
import ProfileCreate from '../components/ProfileCreate';
import LoadingIndicator from '../components/LoadingIndicator';
import { ensureWalletConnected } from '../utils/wallet-helper';

export default function CreateProfilePage() {
  const { connected, connecting } = useWallet();
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [preparingWallet, setPreparingWallet] = useState(false);
  const wallet = useWallet();

  // Ensure client-side only rendering
  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle navigation based on auth state
  useEffect(() => {
    if (!mounted) return;
    
    if (!loading && !connected && !connecting) {
      router.push('/');
    }
    
    if (!loading && isAuthenticated) {
      router.push('/');
    }
  }, [connected, isAuthenticated, loading, router, mounted, connecting]);

  // Prepare wallet when page loads
  useEffect(() => {
    const prepareWallet = async () => {
      if (!mounted || !connected) return;
      
      try {
        setPreparingWallet(true);
        await ensureWalletConnected(wallet);
      } catch (error) {
        console.error("Error preparing wallet:", error);
      } finally {
        setPreparingWallet(false);
      }
    };
    
    prepareWallet();
  }, [mounted, connected, wallet]);

  if (!mounted) {
    return <LoadingIndicator message="Initializing" />;
  }

  if (loading || preparingWallet) {
    return <LoadingIndicator message="Preparing profile creation" />;
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
// src/components/AuthProvider.js
import { createContext, useContext, useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useRouter } from 'next/router';
import { CONTENT_TYPES } from '../utils/constants';
import { useProfile } from '../hooks/useProfile';

const AuthContext = createContext({
  isAuthenticated: false,
  userProfile: null,
  loading: true,
});

export const useAuth = () => useContext(AuthContext);

export default function AuthProvider({ children }) {
  const { connected, publicKey } = useWallet();
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null);
  const router = useRouter();
  const { fetchProfileByWallet } = useProfile();
  const [mounted, setMounted] = useState(false);

  // Handle client-side only rendering
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Only run on client-side and when wallet is connected
    if (!mounted || !connected || !publicKey) {
      setLoading(false);
      setUserProfile(null);
      return;
    }

    const checkProfile = async () => {
      try {
        setLoading(true);
        const profile = await fetchProfileByWallet(publicKey.toString());
        setUserProfile(profile);
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };

    checkProfile();
  }, [connected, publicKey, fetchProfileByWallet, mounted]);

  const value = {
    isAuthenticated: connected && !!userProfile,
    userProfile,
    loading: !mounted || loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
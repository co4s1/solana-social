// src/components/AuthProvider.js
import { createContext, useContext, useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useRouter } from 'next/router';
import { COLLECTION_ADDRESS } from '../utils/constants';
import { useProfile } from '../hooks/useProfile';

const AuthContext = createContext({
  isAuthenticated: false,
  userProfile: null,
  loading: true,
  error: null,
});

export const useAuth = () => useContext(AuthContext);

export default function AuthProvider({ children }) {
  const { connected, publicKey, wallet, connecting } = useWallet();
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null);
  const [error, setError] = useState(null);
  const { fetchProfileByWallet } = useProfile();
  const [mounted, setMounted] = useState(false);

  // Handle client-side only rendering
  useEffect(() => {
    setMounted(true);
    console.log("AuthProvider mounted");
  }, []);

  useEffect(() => {
    // Only run on client-side
    if (!mounted) {
      console.log("AuthProvider waiting for mount");
      return;
    }
    
    // Skip if still connecting
    if (connecting) {
      console.log("Wallet is still connecting...");
      return;
    }

    // Clear existing profile when wallet disconnects
    if (!connected || !publicKey) {
      console.log("Wallet disconnected or no public key");
      setLoading(false);
      setUserProfile(null);
      setError(null);
      return;
    }
    
    // Check if wallet adapter is initialized
    if (!wallet || !wallet.adapter) {
      console.log("Wallet adapter not fully initialized yet");
      setLoading(true);
      return;
    }

    // IMPORTANT: Immediately set loading to false to prevent getting stuck
    // This will show the "Create Profile" button immediately
    setLoading(false);
    
    // Then check for profile in the background
    console.log("Checking profile for wallet:", publicKey.toString());
    
    // Try to fetch profile in the background
    if (COLLECTION_ADDRESS) {
      fetchProfileByWallet(publicKey.toString())
        .then(profile => {
          if (profile) {
            console.log("Profile found:", profile);
            setUserProfile(profile);
          } else {
            console.log("No profile found");
          }
        })
        .catch(error => {
          console.error("Error fetching profile:", error);
          // Don't update error state, let the user create a profile
        });
    } else {
      console.error("COLLECTION_ADDRESS is not configured");
      setError("Collection address not configured");
    }
    
    // Return cleanup function
    return () => {
      console.log("AuthProvider cleanup");
    };
  }, [connected, publicKey, fetchProfileByWallet, mounted, connecting, wallet]);

  const value = {
    isAuthenticated: connected && !!userProfile,
    userProfile,
    loading: !mounted || loading || connecting,
    error,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
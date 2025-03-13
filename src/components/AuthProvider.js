// src/components/AuthProvider.js
import { createContext, useContext, useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useRouter } from 'next/router';
import { COLLECTION_ADDRESS, CONTENT_TYPES } from '../utils/constants';
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
  const router = useRouter();
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
    if (!wallet || !wallet.adapter || !wallet.adapter.publicKey) {
      console.log("Wallet adapter not fully initialized yet");
      setLoading(true);
      return;
    }

    const checkProfile = async () => {
      try {
        console.log("Checking profile for wallet:", publicKey.toString());
        setLoading(true);
        setError(null);
        
        // Check if collection address is configured
        if (!COLLECTION_ADDRESS) {
          console.error("COLLECTION_ADDRESS is not configured");
          setError("Collection address not configured");
          setLoading(false);
          return;
        }
        
        // Use a safer approach with a separate timeout
        let timeoutId = setTimeout(() => {
          console.log("Profile fetch timed out");
          setLoading(false);
          setError("Profile fetch timed out, but you can still use the app");
        }, 10000);
        
        // Fetch profile (without the race)
        try {
          const profile = await fetchProfileByWallet(publicKey.toString());
          
          // Clear the timeout since we got a response
          clearTimeout(timeoutId);
          
          console.log("Profile loaded:", profile);
          setUserProfile(profile);
          setLoading(false);
        } catch (profileError) {
          // Clear the timeout since we got a response (even if it's an error)
          clearTimeout(timeoutId);
          
          console.error("Error during profile fetch:", profileError);
          setError(profileError.message);
          setLoading(false);
        }
      } catch (error) {
        console.error('Error in checkProfile:', error);
        setError(error.message);
        setUserProfile(null);
        setLoading(false);
      }
    };

    // Check profile immediately (instead of using a delay)
    checkProfile();
    
    // Return cleanup function to cancel any pending operations
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
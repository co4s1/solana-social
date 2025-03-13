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
  const [timeoutOccurred, setTimeoutOccurred] = useState(false);

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

    const checkProfile = async () => {
      try {
        console.log("Checking profile for wallet:", publicKey.toString());
        setLoading(true);
        setError(null);
        setTimeoutOccurred(false);
        
        // Check if collection address is configured
        if (!COLLECTION_ADDRESS) {
          console.error("COLLECTION_ADDRESS is not configured");
          setError("Collection address not configured");
          setLoading(false);
          return;
        }
        
        // Modified timeout handling
        let fetchCompleted = false;
        
        // Set up timeout
        const timeoutId = setTimeout(() => {
          if (!fetchCompleted) {
            console.log("Profile fetch timed out");
            setTimeoutOccurred(true);
            setLoading(false);
            setError("Profile fetch timed out, but you can still use the app");
          }
        }, 8000);
        
        // Fetch profile
        try {
          const profile = await fetchProfileByWallet(publicKey.toString());
          fetchCompleted = true;
          
          // Only update state if timeout hasn't occurred
          if (!timeoutOccurred) {
            console.log("Profile loaded:", profile);
            setUserProfile(profile);
            setLoading(false);
            
            // Clear the timeout
            clearTimeout(timeoutId);
          }
        } catch (profileError) {
          fetchCompleted = true;
          
          // Only update state if timeout hasn't occurred
          if (!timeoutOccurred) {
            console.error("Error during profile fetch:", profileError);
            setError(profileError.message);
            setLoading(false);
            
            // Clear the timeout
            clearTimeout(timeoutId);
          }
        }
      } catch (error) {
        console.error('Error in checkProfile:', error);
        setError(error.message);
        setUserProfile(null);
        setLoading(false);
      }
    };

    // Check profile immediately
    checkProfile();
    
    // Return cleanup function
    return () => {
      console.log("AuthProvider cleanup");
    };
  }, [connected, publicKey, fetchProfileByWallet, mounted, connecting, wallet, timeoutOccurred]);

  const value = {
    isAuthenticated: connected && !!userProfile,
    userProfile,
    loading: !mounted || loading || connecting,
    error,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
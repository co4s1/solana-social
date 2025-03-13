// src/components/AuthProvider.js - Updated to use direct wallet approach
import { createContext, useContext, useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { COLLECTION_ADDRESS } from '../utils/constants';
import { getUmi, fetchCollectionNFTs } from '../utils/umi';
import { CONTENT_TYPES } from '../utils/constants';

// Create context for authentication state
const AuthContext = createContext({
  isAuthenticated: false,
  userProfile: null,
  loading: true,
  error: null,
});

export const useAuth = () => useContext(AuthContext);

export default function AuthProvider({ children }) {
  const wallet = useWallet();
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null);
  const [error, setError] = useState(null);
  const [mounted, setMounted] = useState(false);
  
  // Handle client-side only rendering
  useEffect(() => {
    setMounted(true);
    console.log("AuthProvider mounted");
  }, []);

  // Handle profile fetching when wallet connection changes
  useEffect(() => {
    // Only run on client-side
    if (!mounted) return;
    
    // Handle case when wallet is disconnected
    if (!wallet.connected || !wallet.publicKey) {
      console.log("Wallet not connected");
      setUserProfile(null);
      setLoading(false);
      setError(null);
      return;
    }
    
    // Skip if wallet is still connecting
    if (wallet.connecting) {
      console.log("Wallet is still connecting...");
      return;
    }
    
    // Set loading to false immediately to prevent UI getting stuck
    setLoading(false);
    
    // Fetch profile in the background
    const fetchProfile = async () => {
      try {
        console.log("Checking for profile with address:", wallet.publicKey.toString());
        
        if (!COLLECTION_ADDRESS) {
          console.error("Collection address not configured");
          setError("Collection address not configured");
          return;
        }
        
        // Use getUmi with the whole wallet object instead of just the adapter
        const umi = getUmi(wallet);
        
        if (!umi) {
          console.log("UMI instance creation failed - will use profile without authentication");
          // Don't set error - we'll still show the app but without profile functionality
          return;
        }
        
        // For development purposes, simulate a profile
        console.log("Profile system ready - user can create profile");
        
        // Note: In a real implementation, you would fetch actual profiles like this:
        // const nfts = await fetchCollectionNFTs(umi, COLLECTION_ADDRESS, CONTENT_TYPES.PROFILE);
        
        // For now, assume no profile exists yet
        setUserProfile(null);
      } catch (error) {
        console.error("Error in profile check:", error);
        // Don't set error state here to allow profile creation
      }
    };
    
    // Run fetch in background
    fetchProfile();
  }, [wallet.connected, wallet.publicKey, wallet.connecting, mounted]);

  // Prepare context value
  const value = {
    isAuthenticated: wallet.connected && !!userProfile,
    userProfile,
    loading: !mounted || (wallet.connecting && loading),
    error,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
// src/components/AuthProvider.js
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
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
  const [loadingStartTime, setLoadingStartTime] = useState(null);
  const router = useRouter();
  const { fetchProfileByWallet } = useProfile();
  const [mounted, setMounted] = useState(false);
  
  // Prevent flickering by enforcing a minimum loading time
  const MIN_LOADING_TIME = 1500; // 1.5 seconds minimum loading time
  
  // Use debounce to prevent too many profile check attempts
  const [checkProfileTimeout, setCheckProfileTimeout] = useState(null);

  // Handle client-side only rendering
  useEffect(() => {
    setMounted(true);
    console.log("AuthProvider mounted");
  }, []);

  // Reset profile when wallet disconnects
  useEffect(() => {
    if (mounted && !connected && !connecting) {
      setUserProfile(null);
      setError(null);
      setLoading(false);
    }
  }, [connected, connecting, mounted]);

  // Function to check profile with debouncing
  const checkProfileDebounced = useCallback(async () => {
    // Cancel any existing timeout
    if (checkProfileTimeout) {
      clearTimeout(checkProfileTimeout);
    }
    
    if (!publicKey) return;
    
    // Start a new timeout
    const timeoutId = setTimeout(async () => {
      if (!COLLECTION_ADDRESS) {
        console.error("COLLECTION_ADDRESS is not configured");
        setError("Collection address not configured");
        setLoading(false);
        return;
      }
      
      // Record when loading started
      if (!loadingStartTime) {
        setLoadingStartTime(Date.now());
      }
      
      try {
        console.log("Checking profile for wallet:", publicKey.toString());
        setLoading(true);
        setError(null);
        
        // Use a safety timeout for the profile fetch
        const fetchTimeoutId = setTimeout(() => {
          console.log("Profile fetch timed out");
          setLoading(false);
          setError("Profile fetch timed out, but you can still use the app");
        }, 20000); // 20 second timeout
        
        // Fetch profile
        try {
          const profile = await fetchProfileByWallet(publicKey.toString());
          clearTimeout(fetchTimeoutId);
          
          console.log("Profile loaded:", profile);
          setUserProfile(profile);
          
          // Enforce minimum loading time to avoid flickering
          const elapsedTime = Date.now() - loadingStartTime;
          if (elapsedTime < MIN_LOADING_TIME) {
            await new Promise(resolve => setTimeout(resolve, MIN_LOADING_TIME - elapsedTime));
          }
          
          setLoading(false);
        } catch (profileError) {
          clearTimeout(fetchTimeoutId);
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
    }, 300); // 300ms debounce
    
    setCheckProfileTimeout(timeoutId);
  }, [fetchProfileByWallet, publicKey, loadingStartTime, checkProfileTimeout]);

  // Check profile when wallet is connected
  useEffect(() => {
    if (!mounted) return;
    
    if (connecting) {
      setLoading(true);
      return;
    }
    
    if (connected && publicKey) {
      checkProfileDebounced();
    }
  }, [connected, publicKey, mounted, connecting, checkProfileDebounced]);

  // Value object for context
  const value = {
    isAuthenticated: connected && !!userProfile,
    userProfile,
    loading: !mounted || loading,
    error,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
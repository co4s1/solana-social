// src/components/DebugInfo.js
import { useWallet } from '@solana/wallet-adapter-react';
import { useState, useEffect } from 'react';
import { useAuth } from './AuthProvider';

export default function DebugInfo() {
  const { connected, publicKey, wallet } = useWallet();
  const { isAuthenticated, userProfile, loading } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setMounted(true);

    // Check for common rendering errors
    try {
      // Verify wallet connection
      console.log("Wallet connection status:", connected);
      if (publicKey) console.log("Public key:", publicKey.toString());
      
      // Check auth state
      console.log("Auth loading:", loading);
      console.log("IsAuthenticated:", isAuthenticated);
      console.log("User profile:", userProfile);
    } catch (err) {
      console.error("Debug error:", err);
      setError(err.message);
    }
  }, [connected, publicKey, isAuthenticated, userProfile, loading]);

  // Simple styling to make the debug info stand out
  const debugStyle = {
    position: 'fixed',
    bottom: '10px',
    right: '10px',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    color: 'white',
    padding: '10px',
    borderRadius: '5px',
    maxWidth: '400px',
    maxHeight: '300px',
    overflow: 'auto',
    zIndex: 9999,
    fontSize: '12px',
  };

  if (!mounted) return null;

  return (
    <div style={debugStyle}>
      <h3 style={{ marginTop: 0 }}>Debug Info:</h3>
      {error && (
        <div style={{ color: 'red' }}>
          <strong>Error:</strong> {error}
        </div>
      )}
      <div>
        <strong>Client Mounted:</strong> {mounted ? 'Yes' : 'No'}
      </div>
      <div>
        <strong>Wallet Connected:</strong> {connected ? 'Yes' : 'No'}
      </div>
      {publicKey && (
        <div>
          <strong>Public Key:</strong> {publicKey.toString()}
        </div>
      )}
      <div>
        <strong>Auth Loading:</strong> {loading ? 'Yes' : 'No'}
      </div>
      <div>
        <strong>Authenticated:</strong> {isAuthenticated ? 'Yes' : 'No'}
      </div>
      {userProfile && (
        <div>
          <strong>Profile:</strong> {JSON.stringify(userProfile, null, 2)}
        </div>
      )}
      <div>
        <strong>Wallet Provider:</strong> {wallet ? wallet.adapter.name : 'None'}
      </div>
    </div>
  );
}
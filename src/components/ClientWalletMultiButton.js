'use client';
// src/components/ClientWalletMultiButton.js
import { useEffect, useState } from 'react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

export default function ClientWalletMultiButton() {
  // To prevent hydration errors, only render the button on the client side
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="wallet-adapter-button">Connect Wallet</div>;
  }

  return <WalletMultiButton />;
}
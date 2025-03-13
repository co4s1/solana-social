// src/components/Layout.js
import { useWallet } from '@solana/wallet-adapter-react';
import Link from 'next/link';
import { useAuth } from './AuthProvider';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';

// Dynamically import the client wallet button with SSR disabled
const ClientWalletMultiButton = dynamic(
  () => import('./ClientWalletMultiButton'),
  { ssr: false }
);

export default function Layout({ children }) {
  const { connected } = useWallet();
  const { isAuthenticated, userProfile, loading } = useAuth();
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/">
                <span className="text-xl font-bold cursor-pointer">SolSocial</span>
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              {connected && isAuthenticated && (
                <>
                  <Link href={`/profile/${userProfile.authorAddress}`}>
                    <span className="cursor-pointer">
                      My Profile
                    </span>
                  </Link>
                </>
              )}
              <ClientWalletMultiButton />
              {connected && !isAuthenticated && !loading && (
                <button
                  onClick={() => router.push('/create-profile')}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md"
                >
                  Create Profile
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
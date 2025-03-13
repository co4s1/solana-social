// src/pages/_app.js
import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import '../styles/globals.css';
import Head from 'next/head';

// Dynamically import components that rely on browser APIs with SSR disabled
const WalletConnectionProvider = dynamic(
  () => import('../components/WalletProvider'),
  { ssr: false }
);

const WalletWrapper = dynamic(
  () => import('../components/WalletWrapper'),
  { ssr: false }
);

const AuthProvider = dynamic(
  () => import('../components/AuthProvider'),
  { ssr: false }
);

const Layout = dynamic(
  () => import('../components/Layout'),
  { ssr: false }
);

function MyApp({ Component, pageProps }) {
  // Create a client for React Query with improved error handling
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        retry: 1,
        retryDelay: 1000,
        onError: (error) => console.error('Query error:', error),
      },
      mutations: {
        onError: (error) => console.error('Mutation error:', error),
      },
    },
  }));

  return (
    <>
      <Head>
        <title>SolSocial - Decentralized Social on Solana</title>
        <meta name="description" content="A decentralized social platform built on Solana" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      
      <QueryClientProvider client={queryClient}>
        <WalletConnectionProvider>
          <WalletWrapper>
            <AuthProvider>
              <Layout>
                <Component {...pageProps} />
              </Layout>
            </AuthProvider>
          </WalletWrapper>
        </WalletConnectionProvider>
      </QueryClientProvider>
    </>
  );
}

export default MyApp;
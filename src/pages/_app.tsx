// src/pages/_app.js
import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import '../styles/globals.css';

// Dynamically import components that rely on browser APIs with SSR disabled
const WalletConnectionProvider = dynamic(
  () => import('../components/WalletProvider'),
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
  // Create a client for React Query
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        retry: false,
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <WalletConnectionProvider>
        <AuthProvider>
          <Layout>
            <Component {...pageProps} />
          </Layout>
        </AuthProvider>
      </WalletConnectionProvider>
    </QueryClientProvider>
  );
}

export default MyApp;
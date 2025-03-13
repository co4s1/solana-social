// src/pages/_app.js - With improved error handling and initialization
import { useState, useEffect } from 'react';
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

// Error boundary component
function ErrorBoundary({ children }) {
  const [hasError, setHasError] = useState(false);
  const [errorInfo, setErrorInfo] = useState(null);
  
  // Handle global errors
  useEffect(() => {
    // Function to handle errors
    const handleError = (event) => {
      console.error("Global error caught:", event.error);
      
      // Only capture wallet-related errors
      if (event.error?.message?.includes('wallet') || 
          event.error?.message?.includes('UMI') ||
          event.error?.message?.includes('adapter')) {
        
        setHasError(true);
        setErrorInfo({
          message: event.error.message,
          stack: event.error.stack
        });
        
        // Prevent default to avoid browser's error overlay
        event.preventDefault();
      }
    };
    
    // Add event listener
    window.addEventListener('error', handleError);
    
    // Cleanup
    return () => {
      window.removeEventListener('error', handleError);
    };
  }, []);
  
  // Render error UI if there's an error
  if (hasError) {
    return (
      <div className="p-4 bg-red-100 text-red-800 rounded m-4">
        <h2 className="text-xl font-bold mb-2">Wallet Connection Error</h2>
        <p className="mb-2">{errorInfo?.message || "An error occurred with the wallet connection"}</p>
        <button 
          onClick={() => {
            setHasError(false);
            setErrorInfo(null);
            window.location.reload();
          }}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Refresh Page
        </button>
      </div>
    );
  }
  
  // No error, render children
  return children;
}

function MyApp({ Component, pageProps }) {
  // Create a client for React Query
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        retry: 1,
        onError: (error) => console.error('Query error:', error),
      },
      mutations: {
        onError: (error) => console.error('Mutation error:', error),
      },
    },
  }));
  
  // State to track if we're in browser environment
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
    
    // Suppress console errors in production
    const originalConsoleError = console.error;
    console.error = (...args) => {
      // Filter out wallet/UMI errors that we're handling
      if (args[0] && typeof args[0] === 'string' && 
         (args[0].includes('wallet') || 
          args[0].includes('adapter') || 
          args[0].includes('UMI'))) {
        // Still log but mark as handled
        originalConsoleError('[Handled]', ...args);
        return;
      }
      
      // Pass through other errors
      originalConsoleError(...args);
    };
    
    return () => {
      // Restore original console.error
      console.error = originalConsoleError;
    };
  }, []);

  return (
    <>
      <Head>
        <title>SolSocial - Decentralized Social on Solana</title>
        <meta name="description" content="A decentralized social platform built on Solana" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      
      <QueryClientProvider client={queryClient}>
        <ErrorBoundary>
          <WalletConnectionProvider>
            <WalletWrapper>
              <AuthProvider>
                <Layout>
                  <Component {...pageProps} />
                </Layout>
              </AuthProvider>
            </WalletWrapper>
          </WalletConnectionProvider>
        </ErrorBoundary>
      </QueryClientProvider>
    </>
  );
}

export default MyApp;
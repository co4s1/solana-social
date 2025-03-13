// src/pages/debug.js
import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { getConnection } from '../utils/solana';
import { getMetaplex } from '../utils/metaplex';
import { COLLECTION_ADDRESS, CONTENT_TYPES } from '../utils/constants';
import { PublicKey } from '@solana/web3.js';

export default function DebugPage() {
  const { connected, publicKey, wallet } = useWallet();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState({});
  const [error, setError] = useState(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const checkConnection = async () => {
    try {
      setLoading(true);
      setError(null);
      const results = {};
      
      // Check if we have the environment variables
      results.hasCollectionAddress = !!COLLECTION_ADDRESS;
      results.collectionAddress = COLLECTION_ADDRESS || 'Not set';
      
      // Check if we can connect to Solana
      const connection = getConnection();
      const version = await connection.getVersion();
      results.solanaConnection = true;
      results.solanaVersion = version["solana-core"];
      
      // If wallet is connected, check if we can create Metaplex
      if (connected && wallet) {
        const metaplex = getMetaplex(wallet);
        results.metaplexInitialized = !!metaplex;
        
        // Check if collection exists
        if (metaplex && COLLECTION_ADDRESS) {
          try {
            // Try to fetch the collection
            const collectionKey = new PublicKey(COLLECTION_ADDRESS);
            const nft = await metaplex.nfts().findByMint({ mintAddress: collectionKey });
            results.collectionExists = !!nft;
            results.collectionData = nft ? {
              name: nft.name,
              address: nft.address.toString(),
              mintAddress: nft.mintAddress.toString(),
              updateAuthorityAddress: nft.updateAuthorityAddress.toString(),
            } : null;
          } catch (collectionError) {
            console.error("Error checking collection:", collectionError);
            results.collectionError = collectionError.message;
            
            // Try a different approach - check if there are any NFTs with this creator
            try {
              const creatorKey = new PublicKey(COLLECTION_ADDRESS);
              const nfts = await metaplex.nfts().findAllByCreator({ creator: creatorKey });
              results.nftsWithCreator = nfts.length;
              
              // Check for the different content types
              const profiles = nfts.filter(nft => {
                const attributes = nft.json?.attributes || [];
                const typeAttribute = attributes.find(attr => attr.trait_type === 'type');
                return typeAttribute?.value === CONTENT_TYPES.PROFILE;
              });
              
              const posts = nfts.filter(nft => {
                const attributes = nft.json?.attributes || [];
                const typeAttribute = attributes.find(attr => attr.trait_type === 'type');
                return typeAttribute?.value === CONTENT_TYPES.POST;
              });
              
              results.profiles = profiles.length;
              results.posts = posts.length;
            } catch (nftsError) {
              results.nftsError = nftsError.message;
            }
          }
        }
      }
      
      setResults(results);
    } catch (err) {
      console.error("Debug error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) {
    return <div>Loading...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">SolSocial Debug Page</h1>
      
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Wallet Connection</h2>
        <div className="flex items-center gap-4 mb-4">
          <WalletMultiButton />
          <span>
            {connected ? (
              <span className="text-green-500">Connected: {publicKey.toString()}</span>
            ) : (
              <span className="text-red-500">Not connected</span>
            )}
          </span>
        </div>
      </div>
      
      <div className="mb-6">
        <button
          onClick={checkConnection}
          disabled={loading}
          className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded disabled:opacity-50"
        >
          {loading ? 'Checking...' : 'Check Connections'}
        </button>
      </div>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          <strong>Error:</strong> {error}
        </div>
      )}
      
      {Object.keys(results).length > 0 && (
        <div className="bg-white shadow-md rounded p-6">
          <h2 className="text-xl font-semibold mb-4">Debug Results</h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="font-medium">Environment</h3>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div className="text-gray-600">Collection Address:</div>
                <div className={results.hasCollectionAddress ? 'text-green-600' : 'text-red-600'}>
                  {results.collectionAddress}
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="font-medium">Solana Connection</h3>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div className="text-gray-600">Connection Status:</div>
                <div className={results.solanaConnection ? 'text-green-600' : 'text-red-600'}>
                  {results.solanaConnection ? 'Connected' : 'Failed'}
                </div>
                
                {results.solanaVersion && (
                  <>
                    <div className="text-gray-600">Solana Version:</div>
                    <div>{results.solanaVersion}</div>
                  </>
                )}
              </div>
            </div>
            
            {connected && (
              <div>
                <h3 className="font-medium">Metaplex</h3>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div className="text-gray-600">Metaplex Initialized:</div>
                  <div className={results.metaplexInitialized ? 'text-green-600' : 'text-red-600'}>
                    {results.metaplexInitialized ? 'Yes' : 'No'}
                  </div>
                </div>
              </div>
            )}
            
            {results.hasCollectionAddress && results.metaplexInitialized && (
              <div>
                <h3 className="font-medium">Collection</h3>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {results.collectionError ? (
                    <>
                      <div className="text-gray-600">Collection Error:</div>
                      <div className="text-red-600">{results.collectionError}</div>
                    </>
                  ) : results.collectionExists ? (
                    <>
                      <div className="text-gray-600">Collection Exists:</div>
                      <div className="text-green-600">Yes</div>
                      
                      <div className="text-gray-600">Collection Name:</div>
                      <div>{results.collectionData?.name}</div>
                      
                      <div className="text-gray-600">Collection Address:</div>
                      <div>{results.collectionData?.address}</div>
                      
                      <div className="text-gray-600">Mint Address:</div>
                      <div>{results.collectionData?.mintAddress}</div>
                      
                      <div className="text-gray-600">Update Authority:</div>
                      <div>{results.collectionData?.updateAuthorityAddress}</div>
                    </>
                  ) : (
                    <>
                      <div className="text-gray-600">Collection Exists:</div>
                      <div className="text-red-600">No</div>
                    </>
                  )}
                  
                  {results.nftsWithCreator !== undefined && (
                    <>
                      <div className="text-gray-600">NFTs with this Creator:</div>
                      <div className={results.nftsWithCreator > 0 ? 'text-green-600' : 'text-red-600'}>
                        {results.nftsWithCreator}
                      </div>
                      
                      {results.profiles !== undefined && (
                        <>
                          <div className="text-gray-600">Profiles:</div>
                          <div>{results.profiles}</div>
                        </>
                      )}
                      
                      {results.posts !== undefined && (
                        <>
                          <div className="text-gray-600">Posts:</div>
                          <div>{results.posts}</div>
                        </>
                      )}
                    </>
                  )}
                  
                  {results.nftsError && (
                    <>
                      <div className="text-gray-600">NFTs Error:</div>
                      <div className="text-red-600">{results.nftsError}</div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
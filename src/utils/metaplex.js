// src/utils/metaplex.js
import { Metaplex, walletAdapterIdentity, irysStorage } from '@metaplex-foundation/js';
import { PublicKey } from '@solana/web3.js';
import { getConnection } from './solana';

// Create a new Metaplex instance with better error handling
export const getMetaplex = (wallet) => {
  if (!wallet) {
    console.error("No wallet provided to getMetaplex");
    return null;
  }
  
  try {
    const connection = getConnection();
    
    // Create a new instance with more conservative settings
    return Metaplex.make(connection, {
      cluster: 'devnet',
      // Lower timeout parameters to fail faster
      sendTransactionTimeout: 30000,
    })
      .use(walletAdapterIdentity(wallet))
      .use(irysStorage());
  } catch (error) {
    console.error("Error creating Metaplex instance:", error);
    return null;
  }
};

// Improved NFT collection fetching with better error handling and caching
let cachedCollectionNFTs = {};
let lastCacheTime = 0;
const CACHE_DURATION = 60000; // 1 minute cache

export const fetchCollectionNFTs = async (metaplex, collectionAddress, type = null) => {
  if (!metaplex) {
    console.error("No metaplex instance provided to fetchCollectionNFTs");
    return [];
  }
  
  if (!collectionAddress) {
    console.error("No collection address provided to fetchCollectionNFTs");
    return [];
  }
  
  const cacheKey = `${collectionAddress}-${type || 'all'}`;
  const now = Date.now();
  
  // Check cache first if it's still valid
  if (cachedCollectionNFTs[cacheKey] && (now - lastCacheTime < CACHE_DURATION)) {
    console.log(`Using cached NFTs for ${cacheKey}`);
    return cachedCollectionNFTs[cacheKey];
  }
  
  try {
    console.log(`Fetching NFTs from collection ${collectionAddress} with type ${type}`);
    
    // Implement timeout with Promise.race
    const fetchPromise = (async () => {
      try {
        const collection = new PublicKey(collectionAddress);
        
        // Use a lower limit to avoid rate limiting
        const nfts = await metaplex.nfts().findAllByCreator({ 
          creator: collection, 
          limit: 50 
        });
        
        console.log(`Found ${nfts.length} NFTs in collection`);
        
        // Filter by type if specified
        if (type) {
          const filteredNfts = nfts.filter(nft => {
            if (!nft.json || !nft.json.attributes) return false;
            
            const attributes = nft.json.attributes;
            const typeAttribute = attributes.find(attr => attr.trait_type === 'type');
            return typeAttribute?.value === type;
          });
          
          console.log(`Found ${filteredNfts.length} NFTs of type ${type}`);
          
          // Cache the results
          cachedCollectionNFTs[cacheKey] = filteredNfts;
          lastCacheTime = now;
          
          return filteredNfts;
        }
        
        // Cache all NFTs
        cachedCollectionNFTs[cacheKey] = nfts;
        lastCacheTime = now;
        
        return nfts;
      } catch (fetchError) {
        console.error("Error during NFT fetch:", fetchError);
        
        // If rate limited, try to use cache even if expired
        if (fetchError.message && fetchError.message.includes('429') && cachedCollectionNFTs[cacheKey]) {
          console.log("Rate limited, using expired cache");
          return cachedCollectionNFTs[cacheKey];
        }
        
        throw fetchError;
      }
    })();
    
    // Set a timeout of 10 seconds
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("Collection fetch timed out")), 10000)
    );
    
    // Race between fetch and timeout
    return await Promise.race([fetchPromise, timeoutPromise]);
  } catch (error) {
    console.error('Error fetching collection NFTs:', error);
    
    // Return empty array on error
    return [];
  }
};

export const createSocialNFT = async (
  metaplex,
  collectionAddress,
  {
    type,
    name,
    description,
    image, // URL
    attributes = [],
  }
) => {
  if (!metaplex) {
    throw new Error('No metaplex instance provided to createSocialNFT');
  }
  
  if (!collectionAddress) {
    throw new Error('No collection address provided to createSocialNFT');
  }
  
  if (!type || !name) {
    throw new Error('Missing required parameters for createSocialNFT');
  }
  
  try {
    console.log(`Creating ${type} NFT: ${name}`);
    
    const { nft } = await metaplex.nfts().create({
      uri: '', // Will be updated after upload
      name,
      symbol: 'SOCIAL',
      sellerFeeBasisPoints: 0,
      collection: new PublicKey(collectionAddress),
      collectionAuthority: metaplex.identity(),
    });

    console.log(`NFT created with address: ${nft.address.toString()}`);

    // Prepare metadata
    const metadata = {
      name,
      symbol: 'SOCIAL',
      description,
      image,
      attributes: [
        {
          trait_type: 'type',
          value: type,
        },
        {
          trait_type: 'author',
          value: metaplex.identity().publicKey.toBase58(),
        },
        {
          trait_type: 'timestamp',
          value: Math.floor(Date.now() / 1000),
        },
        ...attributes,
      ],
    };

    // Upload metadata
    console.log("Uploading NFT metadata");
    const { uri } = await metaplex.nfts().uploadMetadata(metadata);
    console.log(`Metadata uploaded with URI: ${uri}`);

    // Update NFT with metadata URI
    console.log("Updating NFT with metadata URI");
    await metaplex.nfts().update({
      nftOrSft: nft,
      uri,
    });

    // After successful creation, invalidate cache
    cachedCollectionNFTs = {};

    console.log("NFT creation complete");
    return nft;
  } catch (error) {
    console.error('Error creating social NFT:', error);
    throw error;
  }
};
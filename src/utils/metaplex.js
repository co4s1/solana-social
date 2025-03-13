// src/utils/metaplex.js
import { Metaplex, walletAdapterIdentity, irysStorage } from '@metaplex-foundation/js';
import { PublicKey } from '@solana/web3.js';
import { getConnection } from './solana';

// IMPORTANT: Create a new Metaplex instance each time to avoid initialization issues
export const getMetaplex = (wallet) => {
  if (!wallet) {
    console.error("No wallet provided to getMetaplex");
    return null;
  }
  
  try {
    // No longer checking for adapter initialization or caching the instance
    // This avoids the initialization error completely
    const connection = getConnection();
    
    // Always create a new instance
    return Metaplex.make(connection)
      .use(walletAdapterIdentity(wallet))
      .use(irysStorage());
  } catch (error) {
    console.error("Error creating Metaplex instance:", error);
    return null;
  }
};

export const fetchCollectionNFTs = async (metaplex, collectionAddress, type = null) => {
  if (!metaplex) {
    console.error("No metaplex instance provided to fetchCollectionNFTs");
    return [];
  }
  
  if (!collectionAddress) {
    console.error("No collection address provided to fetchCollectionNFTs");
    return [];
  }
  
  try {
    console.log(`Fetching NFTs from collection ${collectionAddress} with type ${type}`);
    
    // Safer timeout approach
    let hasTimedOut = false;
    const timeoutId = setTimeout(() => {
      console.log("Collection fetch operation timed out");
      hasTimedOut = true;
    }, 15000);
    
    const collection = new PublicKey(collectionAddress);
    
    // Try to fetch the NFTs
    let nfts = [];
    try {
      // Use a lower limit to avoid rate limiting
      nfts = await metaplex.nfts().findAllByCreator({ creator: collection, limit: 50 });
    } catch (fetchError) {
      console.error("Error during NFT fetch:", fetchError);
      clearTimeout(timeoutId);
      
      // If rate limited, return empty array to avoid crashing the app
      if (fetchError.message && fetchError.message.includes('429')) {
        console.log("Rate limited while fetching NFTs, returning empty array");
        return [];
      }
      
      return [];
    }
    
    // Clear the timeout since we got a response
    clearTimeout(timeoutId);
    
    // If timeout occurred during the fetch
    if (hasTimedOut) {
      console.log("Fetch completed after timeout - using results anyway");
      // We'll still use the results if we got them even after timeout
    }
    
    console.log(`Found ${nfts.length} NFTs in collection`);
    
    // Filter by type if specified
    if (type) {
      const filteredNfts = nfts.filter(nft => {
        const attributes = nft.json?.attributes || [];
        const typeAttribute = attributes.find(attr => attr.trait_type === 'type');
        return typeAttribute?.value === type;
      });
      
      console.log(`Found ${filteredNfts.length} NFTs of type ${type}`);
      return filteredNfts;
    }
    
    return nfts;
  } catch (error) {
    console.error('Error fetching collection NFTs:', error);
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

    console.log("NFT creation complete");
    return nft;
  } catch (error) {
    console.error('Error creating social NFT:', error);
    throw error;
  }
};
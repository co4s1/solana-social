// src/utils/metaplex.js
import { Metaplex, walletAdapterIdentity, irysStorage } from '@metaplex-foundation/js';
import { PublicKey } from '@solana/web3.js';
import { getConnection } from './solana';

export const getMetaplex = (wallet) => {
  const connection = getConnection();
  return Metaplex.make(connection)
    .use(walletAdapterIdentity(wallet))
    .use(irysStorage());
};

export const fetchCollectionNFTs = async (metaplex, collectionAddress, type = null) => {
  try {
    const collection = new PublicKey(collectionAddress);
    
    // Fetch all NFTs from the collection
    const nfts = await metaplex.nfts().findAllByCreator({ creator: collection });
    
    // If type is specified, filter by type
    if (type) {
      return nfts.filter(nft => {
        const attributes = nft.json?.attributes || [];
        const typeAttribute = attributes.find(attr => attr.trait_type === 'type');
        return typeAttribute?.value === type;
      });
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
    image, // Arweave URL
    attributes = [],
  }
) => {
  try {
    const { nft } = await metaplex.nfts().create({
      uri: '', // Will be updated after upload
      name,
      symbol: 'SOCIAL',
      sellerFeeBasisPoints: 0,
      collection: new PublicKey(collectionAddress),
      collectionAuthority: metaplex.identity(),
    });

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
    const { uri } = await metaplex.nfts().uploadMetadata(metadata);

    // Update NFT with metadata URI
    await metaplex.nfts().update({
      nftOrSft: nft,
      uri,
    });

    return nft;
  } catch (error) {
    console.error('Error creating social NFT:', error);
    throw error;
  }
};
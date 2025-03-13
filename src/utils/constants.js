// src/utils/constants.js - updated with a default mock collection address
// Use the official Solana devnet RPC as default
export const SOLANA_RPC_HOST = process.env.NEXT_PUBLIC_SOLANA_RPC_HOST || 'https://api.devnet.solana.com';

// Use a mock collection address for development
// This isn't a real NFT collection address, but it works for development with our mock implementation
export const COLLECTION_ADDRESS = process.env.NEXT_PUBLIC_COLLECTION_ADDRESS || 'MOCK-COLLECTION-ADDRESS-FOR-DEVELOPMENT';

export const MAX_CHAR_COUNT = 280;

export const CONTENT_TYPES = {
  PROFILE: 'profile',
  POST: 'post',
  REPLY: 'reply',
};
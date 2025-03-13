// src/utils/constants.js
// Use the official Solana devnet RPC as default
export const SOLANA_RPC_HOST = process.env.NEXT_PUBLIC_SOLANA_RPC_HOST || 'https://api.devnet.solana.com';
export const COLLECTION_ADDRESS = process.env.NEXT_PUBLIC_COLLECTION_ADDRESS;
export const MAX_CHAR_COUNT = 280;
export const CONTENT_TYPES = {
  PROFILE: 'profile',
  POST: 'post',
  REPLY: 'reply',
};
// src/utils/solana.js
import { Connection, clusterApiUrl, PublicKey } from '@solana/web3.js';
import { SOLANA_RPC_HOST } from './constants';

export const getConnection = () => {
  return new Connection(SOLANA_RPC_HOST || clusterApiUrl('devnet'));
};

export const isValidPublicKey = (address) => {
  try {
    new PublicKey(address);
    return true;
  } catch (error) {
    return false;
  }
};
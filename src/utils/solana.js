// src/utils/solana.js
import { Connection, clusterApiUrl, PublicKey } from '@solana/web3.js';
import { SOLANA_RPC_HOST } from './constants';

let connection = null;
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 50; // 50ms between requests (max 20 requests per second)

// Queue for pending requests
const requestQueue = [];
let processingQueue = false;

// Process the queue with rate limiting
const processQueue = async () => {
  if (processingQueue || requestQueue.length === 0) return;
  
  processingQueue = true;
  
  while (requestQueue.length > 0) {
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;
    
    if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
      // Wait before making the next request
      await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest));
    }
    
    const nextRequest = requestQueue.shift();
    try {
      lastRequestTime = Date.now();
      const result = await nextRequest.method(...nextRequest.args);
      nextRequest.resolve(result);
    } catch (error) {
      console.error('Error in queued request:', error);
      nextRequest.reject(error);
      
      // If this is a rate limit error, pause for a longer time
      if (error.message && error.message.includes('429')) {
        console.log('Rate limit hit, pausing requests for 2 seconds');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }
  
  processingQueue = false;
};

// Create a rate-limited connection that queues requests
const createRateLimitedConnection = (endpoint) => {
  console.log(`Creating rate-limited Solana connection to: ${endpoint}`);
  
  const rawConnection = new Connection(endpoint, {
    commitment: 'confirmed',
    confirmTransactionInitialTimeout: 60000,
    disableRetryOnRateLimit: false, // Let the connection retry automatically
  });
  
  // Create a proxy to intercept and queue method calls
  return new Proxy(rawConnection, {
    get(target, prop) {
      // Only proxy method calls, not properties
      if (typeof target[prop] !== 'function') {
        return target[prop];
      }
      
      // Return a function that queues the actual method call
      return (...args) => {
        // Don't queue certain methods that are called frequently and don't hit the RPC
        if (['_wsOnOpen', '_wsOnError', '_wsOnClose', '_wsOnAccountNotification'].includes(prop)) {
          return target[prop](...args);
        }
        
        return new Promise((resolve, reject) => {
          requestQueue.push({
            method: target[prop].bind(target),
            args,
            resolve,
            reject,
          });
          
          processQueue(); // Try to process the queue
        });
      };
    },
  });
};

export const getConnection = () => {
  // Only create a new connection if one doesn't exist
  if (!connection) {
    // Try using a more reliable endpoint
    const endpoint = SOLANA_RPC_HOST || 'https://api.devnet.solana.com';
    connection = createRateLimitedConnection(endpoint);
  }
  
  return connection;
};

export const isValidPublicKey = (address) => {
  if (!address) return false;
  
  try {
    new PublicKey(address);
    return true;
  } catch (error) {
    return false;
  }
};
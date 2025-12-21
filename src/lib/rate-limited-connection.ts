import { Connection, ConnectionConfig } from '@solana/web3.js';

interface RateLimitConfig {
  maxRequestsPerSecond: number;
  maxConcurrentRequests: number;
  retryDelay: number;
  maxRetries: number;
}

class RateLimitedFetch {
  private requestQueue: Array<() => Promise<any>> = [];
  private activeRequests = 0;
  private requestTimestamps: number[] = [];
  private readonly config: RateLimitConfig;

  constructor(config?: RateLimitConfig) {
    // Default: 8 requests per second, max 3 concurrent, exponential backoff
    this.config = config || {
      maxRequestsPerSecond: 8,
      maxConcurrentRequests: 3,
      retryDelay: 500,
      maxRetries: 5,
    };
  }

  private async throttleRequest<T>(requestFn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push(async () => {
        try {
          const result = await requestFn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      this.processQueue();
    });
  }

  private async processQueue() {
    // Don't process if we're at max concurrent requests
    if (this.activeRequests >= this.config.maxConcurrentRequests) {
      return;
    }

    // Clean old timestamps (older than 1 second)
    const now = Date.now();
    this.requestTimestamps = this.requestTimestamps.filter(
      (timestamp) => now - timestamp < 1000
    );

    // Check rate limit
    if (this.requestTimestamps.length >= this.config.maxRequestsPerSecond) {
      // Wait until we can make another request
      const oldestTimestamp = this.requestTimestamps[0];
      const waitTime = 1000 - (now - oldestTimestamp) + 50; // Add 50ms buffer
      if (waitTime > 0) {
        setTimeout(() => this.processQueue(), waitTime);
        return;
      }
    }

    // Process next request in queue
    const nextRequest = this.requestQueue.shift();
    if (!nextRequest) {
      return;
    }

    this.activeRequests++;
    this.requestTimestamps.push(Date.now());

    try {
      await nextRequest();
    } finally {
      this.activeRequests--;
      // Process next request
      setTimeout(() => this.processQueue(), 0);
    }
  }

  async fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    let retries = 0;
    
    while (retries <= this.config.maxRetries) {
      try {
        const response = await this.throttleRequest(() => 
          fetch(input, init)
        );

        // Check if it's a 429 error
        if (response.status === 429 && retries < this.config.maxRetries) {
          retries++;
          const delay = this.config.retryDelay * Math.pow(2, retries - 1); // Exponential backoff
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
        
        return response;
      } catch (error: any) {
        // Check if it's a 429 error in the error message
        const isRateLimit = 
          error?.message?.includes('429') ||
          error?.code === 429 ||
          error?.status === 429;

        if (isRateLimit && retries < this.config.maxRetries) {
          retries++;
          const delay = this.config.retryDelay * Math.pow(2, retries - 1);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
        
        throw error;
      }
    }
    
    throw new Error('Max retries exceeded for rate-limited request');
  }
}

/**
 * Create a rate-limited Solana Connection
 * This wraps the Connection with rate limiting to prevent 429 errors
 */
export function createRateLimitedConnection(
  endpoint: string,
  commitment: 'confirmed' | 'finalized' | 'processed' = 'confirmed',
  config?: RateLimitConfig
): Connection {
  // Create a new rate-limited fetch for this connection
  const fetchWrapper = new RateLimitedFetch(config);
  
  // Create connection with custom fetch function
  // The Connection class accepts fetch in the config object
  const connectionConfig: ConnectionConfig = {
    commitment,
    fetch: fetchWrapper.fetch.bind(fetchWrapper),
  };
  
  return new Connection(endpoint, connectionConfig);
}


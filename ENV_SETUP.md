# Environment Variables Setup

## Required Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Reown Project ID (Required for wallet connection)
# Get from: https://cloud.reown.com
VITE_REOWN_PROJECT_ID=your-reown-project-id

# Helius RPC API Keys (Recommended for better performance)
# Get from: https://www.helius.dev
# You can use separate keys for mainnet and devnet, or use the generic key for both
VITE_HELIUS_API_KEY_MAINNET=your-helius-mainnet-api-key
VITE_HELIUS_API_KEY_DEVNET=your-helius-devnet-api-key

# Generic Helius API Key (Optional - used as fallback if network-specific keys are not set)
VITE_HELIUS_API_KEY=your-helius-api-key

# Jupiter API Key (Required for swaps)
# Get from: https://station.jup.ag
VITE_JUPITER_API_KEY=your-jupiter-api-key

# Jupiter Ultra API Endpoint (Optional - defaults to https://api.jup.ag)
VITE_JUPITER_ULTRA_ENDPOINT=https://api.jup.ag

# Pinata JWT Token (Required for token metadata uploads)
# Get from: https://app.pinata.cloud
VITE_PINATA_JWT=your-pinata-jwt-token

# Platform Fee Wallet (Required - receives 0.05 SOL fee per transaction)
# Your Solana wallet address to receive platform fees
VITE_PLATFORM_FEE_WALLET=your-solana-wallet-address

# Upload Provider (Optional - defaults to pinata)
VITE_UPLOAD_PROVIDER=pinata

# Default Network (Optional - defaults to mainnet-beta)
VITE_SOLANA_NETWORK=mainnet-beta
```

## RPC Configuration

The app automatically uses Helius RPCs when Helius API keys are provided:

**Priority Order:**
1. Network-specific keys (recommended):
   - **Mainnet**: Uses `VITE_HELIUS_API_KEY_MAINNET` → `https://mainnet.helius-rpc.com/?api-key={key}`
   - **Devnet**: Uses `VITE_HELIUS_API_KEY_DEVNET` → `https://devnet.helius-rpc.com/?api-key={key}`

2. Generic key (fallback):
   - If network-specific keys are not set, uses `VITE_HELIUS_API_KEY` for both networks

3. Custom RPC URLs (fallback):
   - If no Helius keys are provided, uses `VITE_RPC_URL_MAINNET` and `VITE_RPC_URL_DEVNET`

4. Public RPCs (final fallback):
   - **Mainnet**: `https://api.mainnet-beta.solana.com`
   - **Devnet**: `https://api.devnet.solana.com`

## How to Get API Keys

### 1. Reown Project ID
1. Go to https://cloud.reown.com
2. Create a new project
3. Copy the Project ID

### 2. Helius API Key
1. Go to https://www.helius.dev
2. Sign up for an account
3. Create a new API key
4. Copy the API key

### 3. Jupiter API Key
1. Go to https://station.jup.ag
2. Sign up for an account
3. Get your API key from the dashboard
4. Copy the API key

### 4. Pinata JWT
1. Go to https://app.pinata.cloud
2. Sign up for an account
3. Go to API Keys section
4. Create a new JWT token
5. Copy the JWT token

## Network Switching

Use **Ctrl+Shift+E** to toggle between mainnet-beta and devnet (admin feature).

The network preference is saved in localStorage and persists across sessions.


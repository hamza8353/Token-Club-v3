# CyberLaunch - Working State Documentation

**Last Updated:** December 2025  
**Status:** ✅ Production Ready - All Features Fully Functional

---

## 🎯 Core Features

### ✅ Volume Bot (Production Ready)

**Location:** `lib/VolumeBot.ts`, `server/index.ts`

**Features:**
- ✅ **Dual Network Support**
  - Devnet: Mock swaps (0 SOL self-transfers) - perfect for testing
  - Mainnet: Real Jupiter V6 swaps with Jito bundles
- ✅ **Package Types**
  - Soft Shell: 0.5 SOL package (2 burner wallets, 150 total transactions)
  - Hard Pump: 4.5 SOL package (6 burner wallets, 500 total transactions)
- ✅ **Service Fee Collection**
  - Platform collects 75% of payment as service fee
  - Remaining 25% allocated to trading (worker + burner wallets)
- ✅ **Dynamic Jito Tips**
  - Hard Pump: 0.002 SOL per transaction (God Mode Priority)
  - Soft Shell: 0.001 SOL per transaction (High Priority)
- ✅ **Jupiter Swap Integration**
  - Jupiter V6 API with Ultra API authentication
  - Dynamic slippage: 50 bps (0.5%) for buys, 300 bps (3%) for sells
  - Handles Meteora DAMM V2 pool fees
- ✅ **Jito Bundle Support**
  - Base58 encoded transactions (Jito requirement)
  - Official Jito tip accounts (8 accounts, random selection)
  - Automatic fallback to direct transactions if Jito fails
- ✅ **Smart Trading Logic**
  - Buy swaps: 10% of SOL balance per transaction
  - Sell swaps: 20-30% of token balance (randomized)
  - Rebalancing: Sells up to 60% of tokens if SOL is low for buys
  - Automatic SOL acquisition when needed
- ✅ **Token Risk Checking**
  - Validates transfer fees (< 1%)
  - Checks token mint authority
- ✅ **Wallet Management**
  - Automatic burner wallet generation and funding
  - Parallel execution (multiple burners trading simultaneously)
  - Automatic draining (sells all tokens, sweeps SOL to admin)
- ✅ **Database Integration**
  - SQLite database for job tracking
  - Transaction history
  - Status updates
  - Job persistence across restarts
- ✅ **API Endpoints**
  - `POST /api/volume-bot/start` - Start bot job
  - `GET /api/volume-bot/status/:jobId` - Get job status
  - `GET /api/volume-bot/jobs` - List all jobs
  - `GET /health` - Health check

**Configuration:**
- Worker wallet private key (base58 or JSON array)
- Admin wallet (receives service fees)
- Jupiter API key (required for swaps)
- RPC URL (mainnet/devnet)
- Jito RPC URL (optional, for bundles)

**Deployment:**
- ✅ Railway deployment ready
- ✅ Environment variables configured
- ✅ Custom domain: `api.cyberlaunch.fun`
- ✅ Auto-deploy enabled
- ✅ Database persistence (SQLite)

---

### ✅ Token Creation (Mint)

**Location:** `lib/solana/creator.ts`, `components/CreateTokenForm.tsx`

**Features:**
- ✅ SPL Token creation with Metaplex metadata
- ✅ IPFS image and metadata upload (Pinata)
- ✅ Dynamic platform fees (base 0.1 SOL + feature fees)
- ✅ Balance check before uploads (prevents wasted uploads)
- ✅ Authority revocation (mint/freeze)
- ✅ Custom creators, collections, uses support
- ✅ VersionedTransaction support

---

### ✅ Swap Terminal

**Location:** `components/CyberSwapTerminal.tsx`

**Features:**
- ✅ Custom CyberSwapTerminal component (fully functional)
- ✅ Jupiter Swap API integration (via Ultra API base URL)
- ✅ Real-time quote fetching
- ✅ Token search and selection
- ✅ Price fetching and display
- ✅ Transaction execution and confirmation
- ✅ Error handling and user feedback
- ✅ VersionedTransaction support

---

### ✅ Token Pages

**Location:** `pages/TokenPage.tsx`, `lib/token/onchain.ts`, `lib/token/metadata.ts`

**Features:**
- ✅ Standalone token pages (`/c/:symbol/:mint`)
- ✅ **Cross-browser compatible** - Works from any browser/device (no localStorage dependency)
- ✅ **On-chain metadata fetching** - Robust parser handles DataV1/DataV2 formats
- ✅ **Pinata IPFS integration** - Fetches full metadata JSON (image, description, socials)
- ✅ **Dual data source** - On-chain (name, symbol, URI) + IPFS (image, description, promoted status)
- ✅ **Smart fallback system** - Falls back gracefully if IPFS unavailable
- ✅ On-chain data fetching (supply, decimals, mint authority status)
- ✅ SEO optimized URLs with symbol slug
- ✅ Social sharing (Twitter, Telegram, Reddit, copy URL)
- ✅ Pool address detection (Meteora DAMM V2)
- ✅ Promoted status display

---

### ✅ Liquidity Management (Meteora DAMM V2)

**Location:** `lib/meteora/launcher.ts`, `components/LiquidityModal.tsx`

**Features:**
- ✅ Pool initialization with single-sided liquidity
- ✅ Add liquidity to existing pools
- ✅ Remove liquidity from pools
- ✅ Burn liquidity (transfer position NFT to dead address - Token-2022 compatible)
- ✅ **Liquidity Status Tracking** - Modal shows "BURNED" or "REMOVED" state after actions
- ✅ **Disabled Management** - No further liquidity operations allowed after burn/remove
- ✅ Fee tier persistence (0.25% default)
- ✅ Dynamic pricing based on pool fees
- ✅ Platform fees on all liquidity operations
- ✅ Random wallet rotation for fee collection

---

### ✅ Network Management

**Location:** `lib/config.ts`, `contexts/NetworkContext.tsx`

**Features:**
- ✅ Mainnet by default
- ✅ Admin network toggle (Ctrl+Shift+E)
- ✅ Devnet mode for testing/recordings
- ✅ Network state persistence (localStorage)
- ✅ Subtle visual indicator (green/orange dot)
- ✅ Dynamic RPC URL switching
- ✅ Environment variable support (VITE_ and NEXT_PUBLIC_ prefixes)

---

## 🔧 Configuration

### Network Configuration
- **Default Network:** `mainnet-beta`
- **Admin Toggle:** `Ctrl+Shift+E` (switches between mainnet/devnet)
- **Storage Key:** `cyberlaunch_network` (localStorage)

### Jupiter API Configuration
- **Base URL:** `https://api.jup.ag`
- **API Key:** Required (set in `VITE_JUPITER_API_KEY`)
- **Endpoints:**
  - Swap Quote: `https://api.jup.ag/swap/v1/quote`
  - Swap Execute: `https://api.jup.ag/swap/v1/swap`
  - Price API: `https://api.jup.ag/price/v3/price`
  - Token API: `https://api.jup.ag/tokens/v2`

### Volume Bot Configuration
- **Worker Wallet:** Private key (base58 or JSON array)
- **Admin Wallet:** Receives service fees (75% of payment)
- **Jito RPC:** `https://mainnet.block-engine.jito.wtf` (optional)
- **Package Types:**
  - Soft Shell: 0.5 SOL (2 burners, 150 tx total)
  - Hard Pump: 4.5 SOL (6 burners, 500 tx total)

### Platform Fees

#### Token Creation
- **Base Fee:** 0.1 SOL
- **Feature Fees:** +0.05 SOL each
  - Revoke Mint Authority
  - Revoke Freeze Authority
  - Custom Creators
  - Collection
  - Uses

#### Liquidity Operations
- **Pool Creation:** 0.15 SOL
- **Add Liquidity:** 0.1 SOL
- **Remove Liquidity:** 0.1 SOL
- **Burn Liquidity:** 0.1 SOL

#### Volume Bot
- **Service Fee:** 75% of payment (collected to admin wallet)
- **Trading Amount:** 25% of payment (allocated to worker + burners)

#### Fee Collection
- **Method:** Random wallet rotation
- **Wallets:**
  - `oKEPC56fhNMSKXkm6vSNjVFdB5dPvufN3yPceBXTZj3`
  - `3H9D6NTfme1wq1CYoA79k4N7H5fVkUjYULgVutZE6ebm`

---

## 📁 Key Files & Structure

### Core Configuration
- `lib/config.ts` - Network, RPC, Jupiter API configuration
- `lib/constants.ts` - Platform wallets, fee constants

### Volume Bot
- `lib/VolumeBot.ts` - Core bot engine (Jupiter swaps, Jito bundles, wallet management)
- `server/index.ts` - Express API server (bot endpoints, database)
- `server/database.ts` - SQLite database setup
- `utils/pricing.ts` - Dynamic pricing engine
- `utils/poolFee.ts` - Pool fee fetching (Meteora DAMM V2)

### Token Creation
- `lib/solana/creator.ts` - SPL token creation logic
- `components/CreateTokenForm.tsx` - Token creation UI
- `services/storage.ts` - IPFS upload (Pinata)

### Swap Terminal
- `components/CyberSwapTerminal.tsx` - Main swap interface
- `components/TokenSelector.tsx` - Token search/selection
- `lib/jupiter/token-utils.ts` - Token metadata & price fetching

### Network Management
- `contexts/NetworkContext.tsx` - Network state management
- `contexts/SolanaProvider.tsx` - Solana connection (reactive to network changes)

### Token Pages
- `pages/TokenPage.tsx` - Main token page component (fully functional, cross-browser compatible)
- `lib/token/onchain.ts` - Robust on-chain metadata parser (handles DataV1/DataV2 formats with fallbacks)
- `lib/token/metadata.ts` - IPFS metadata fetching (Pinata gateway fallbacks)
- `lib/token/persistence.ts` - localStorage token persistence (optional, for faster loading in creator's browser)
- `lib/token/url.ts` - Token URL utilities (symbol slug generation)

### Liquidity
- `lib/meteora/launcher.ts` - Meteora DAMM V2 integration
- `components/LiquidityModal.tsx` - Liquidity management UI

---

## 🔄 API Flows

### Volume Bot Flow
1. User sends payment to worker wallet
2. Bot validates payment (checks amount, package type, pool fees)
3. Bot collects service fee (75% to admin wallet)
4. Bot allocates remaining 25% to trading
5. Bot generates and funds burner wallets
6. Bot starts trading loop:
   - Alternates between buy and sell swaps
   - Uses Jupiter API for quotes and swap transactions
   - Sends via Jito bundles (with fallback to direct)
   - Rebalances if SOL is low (sells tokens to get SOL)
7. Bot drains burner wallets (sells all tokens, sweeps SOL)
8. Bot completes and updates database

### Swap Flow
1. User enters amount → `fetchQuote()` called
2. Quote fetched from `https://api.jup.ag/swap/v1/quote`
3. Output amount calculated and displayed
4. User clicks "INITIATE SWAP" → `executeSwap()` called
5. Swap transaction fetched from `https://api.jup.ag/swap/v1/swap`
6. Transaction signed by wallet
7. Transaction sent and confirmed

### Token Price Flow
1. `fetchTokenPrice()` called with mint address
2. Attempts `https://api.jup.ag/price/v3/price?ids={mint}`
3. If fails, falls back to quote-based price calculation
4. Returns price or null if unavailable

### Token Metadata Flow (Swap Terminal)
1. `fetchTokenMetadata()` called with mint address
2. Checks localStorage (user-created tokens)
3. Attempts `https://api.jup.ag/tokens/v2/all` (finds token in list)
4. If fails, falls back to on-chain metadata fetching

### Token Page Data Flow (Cross-Browser Compatible)
1. User accesses token page URL (`/c/:symbol/:mint`)
2. **Step 1:** Check localStorage (fast, but only in creator's browser)
3. **Step 2:** If not in localStorage, fetch from on-chain:
   - Uses `fetchOnChainMetadata()` - robust parser with fallbacks
   - Parses Metaplex metadata account (DataV1/DataV2 formats)
   - Extracts: name, symbol, URI (points to IPFS)
4. **Step 3:** Fetch metadata JSON from Pinata IPFS using URI:
   - Uses `fetchTokenMetadata()` with multiple gateway fallbacks
   - Extracts: image, description, socials, promoted status
5. **Step 4:** Fetch on-chain token info:
   - Supply, decimals, mint authority status
   - Pool address (Meteora DAMM V2)
6. **Result:** Complete token page with all details displayed
7. **Key Feature:** Works from ANY browser/device - no localStorage dependency for shared links

---

## 🎨 UI Features

### Swap Terminal
- **Design:** Cyberpunk aesthetic (deep black, neon borders)
- **Input Fields:** Both clickable to open token selector
- **Token Selector:** Search, paste address, popular tokens
- **Real-time Quotes:** Updates as user types
- **Price Impact:** Displayed with color coding
- **Loading States:** "SCANNING NETWORK..." animation

### Network Indicator
- **Mainnet:** Green dot (subtle)
- **Devnet:** Orange dot (subtle)
- **Location:** Header status indicator

---

## 🛠️ Environment Variables

### Required
```env
VITE_JUPITER_API_KEY=your-api-key-here
VITE_VOLUMEBOT_PRIVATE_KEY=your-worker-wallet-private-key
VITE_VOLUMEBOT_ADMIN_WALLET=your-admin-wallet-address
```

### Optional
```env
VITE_JUPITER_ULTRA_ENDPOINT=https://api.jup.ag
VITE_RPC_URL_MAINNET=https://mainnet.helius-rpc.com/?api-key=...
VITE_RPC_URL_DEVNET=https://api.devnet.solana.com
VITE_SOLANA_NETWORK=mainnet-beta
VITE_JITO_RPC_URL=https://mainnet.block-engine.jito.wtf
```

### Pinata IPFS Configuration (Required for Token Creation)
```env
VITE_PINATA_JWT=your_pinata_jwt_token_here
VITE_UPLOAD_PROVIDER=pinata
```

---

## ✅ Working Features Checklist

- [x] Token creation with metadata
- [x] Balance check before uploads
- [x] Swap terminal with real-time quotes
- [x] Token search and selection
- [x] Price fetching (with fallbacks)
- [x] Transaction execution
- [x] Network toggle (Ctrl+Shift+E)
- [x] Platform fee collection
- [x] Random wallet rotation
- [x] Liquidity pool management
- [x] Token pages with on-chain data (fully functional, cross-browser compatible)
- [x] Error handling and user feedback
- [x] **Volume Bot** - Full production deployment
  - [x] Devnet testing (mock swaps)
  - [x] Mainnet production (real swaps)
  - [x] Service fee collection (75%)
  - [x] Dynamic Jito tips
  - [x] Jupiter swap integration
  - [x] Jito bundle support
  - [x] Smart trading logic
  - [x] Token rebalancing
  - [x] Wallet management
  - [x] Database persistence
  - [x] API endpoints
  - [x] Railway deployment
  - [x] Custom domain (api.cyberlaunch.fun)

---

## 🐛 Known Limitations

1. **Jupiter API Availability**
   - Some endpoints may be unavailable in certain regions
   - Fallbacks implemented for graceful degradation
   - Browser network errors (`ERR_NAME_NOT_RESOLVED`) cannot be suppressed (browser-level)

2. **Price Display**
   - Prices depend on Jupiter Price API availability
   - Falls back to quote-based calculation if API unavailable
   - May show "Price unavailable" for some tokens

3. **Token Metadata**
   - **Token Pages:** Uses robust on-chain parser (`fetchOnChainMetadata`) + Pinata IPFS for complete metadata
     - Handles DataV1/DataV2 formats with intelligent fallbacks
     - Cross-browser compatible (no localStorage dependency for shared links)
     - Fetches from on-chain (name, symbol, URI) + IPFS (image, description, socials)
   - **Swap Terminal:** Relies on Jupiter token list for metadata
   - Falls back to on-chain data if API unavailable
   - Some tokens may not have complete metadata

4. **Volume Bot**
   - Requires sufficient worker wallet balance for service fee collection
   - Jito bundles may fail and fallback to direct transactions
   - Slippage on Meteora pools may cause some sell swaps to fail (handled gracefully)

---

## 📝 Notes

- **Swap API vs Ultra API:** Currently using Swap API endpoints (`/swap/v1/quote`, `/swap/v1/swap`) which work with Ultra API base URL and authentication
- **RPC-less:** Ultra API is RPC-less, but current implementation still uses RPC for transaction confirmation
- **VersionedTransaction:** All transactions use VersionedTransaction for modern wallet compatibility
- **Volume Bot:** Fully production-ready with Railway deployment, custom domain, and database persistence

---

## 🚀 Deployment Status

### Frontend (Vercel)
- ✅ Deployed and live
- ✅ Custom domain configured
- ✅ Auto-deploy enabled
- ✅ Environment variables configured

### Backend/API (Railway)
- ✅ Deployed and live
- ✅ Custom domain: `api.cyberlaunch.fun`
- ✅ Auto-deploy enabled
- ✅ Environment variables configured
- ✅ Database persistence (SQLite)
- ✅ Health endpoint working

---

**Status:** ✅ Ready for Production  
**Last Verified:** December 2025
- All features fully functional
- Volume Bot production-ready
- Frontend and backend deployed
- Custom domains configured

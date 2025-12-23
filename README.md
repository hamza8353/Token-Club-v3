# TokenClub - Solana Token Platform

A comprehensive platform for creating, managing, and trading Solana tokens.

## Features

- **Token Creation**: Create fully compliant SPL tokens on Solana
- **Token Swapping**: Best price routing across all Solana DEXs
- **Liquidity Management**: Initialize pools, add/remove liquidity
- **Security Tools**: Wallet cleanup and account management
- **Portfolio Tracking**: Monitor your tokens and LP positions

## Tech Stack

- **Framework**: Next.js 14
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Blockchain**: Solana Web3.js
- **Wallet**: Reown (WalletConnect) AppKit
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 20.11.0 or higher
- npm or yarn

### Installation

```bash
npm install
```

### Environment Variables

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_REOWN_PROJECT_ID=your_project_id
NEXT_PUBLIC_HELIUS_API_KEY=your_helius_key
NEXT_PUBLIC_HELIUS_API_KEY_MAINNET=your_mainnet_key
NEXT_PUBLIC_HELIUS_API_KEY_DEVNET=your_devnet_key
NEXT_PUBLIC_JUPITER_API_KEY=your_jupiter_key
NEXT_PUBLIC_PINATA_JWT=your_pinata_jwt
NEXT_PUBLIC_PLATFORM_FEE_WALLET=your_fee_wallet
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build

```bash
npm run build
```

### Production

```bash
npm start
```

## Deployment

This project is configured for Vercel deployment. Simply connect your GitHub repository to Vercel and deploy.

### Vercel Configuration

The `vercel.json` file is already configured with:
- Next.js framework detection
- Proper caching headers
- Security headers
- Static asset optimization

## Project Structure

```
├── public/              # Static assets
├── src/
│   ├── components/      # React components
│   ├── contexts/        # React contexts (Wallet, Network)
│   ├── lib/             # Utility functions and services
│   ├── modules/         # Feature modules
│   ├── pages/           # Next.js pages
│   └── ...
├── next.config.js       # Next.js configuration
├── tailwind.config.js   # Tailwind CSS configuration
└── vercel.json          # Vercel deployment configuration
```

## Network Switching

The platform supports both Mainnet and Devnet. Use `Ctrl+Shift+E` to toggle between networks (admin feature).

## License

MIT

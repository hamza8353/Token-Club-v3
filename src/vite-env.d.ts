/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_REOWN_PROJECT_ID?: string;
  readonly VITE_HELIUS_API_KEY?: string;
  readonly VITE_HELIUS_API_KEY_MAINNET?: string;
  readonly VITE_HELIUS_API_KEY_DEVNET?: string;
  readonly VITE_JUPITER_API_KEY?: string;
  readonly VITE_JUPITER_ULTRA_ENDPOINT?: string;
  readonly VITE_PINATA_JWT?: string;
  readonly VITE_SOLANA_NETWORK?: string;
  readonly VITE_RPC_URL_MAINNET?: string;
  readonly VITE_RPC_URL_DEVNET?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}


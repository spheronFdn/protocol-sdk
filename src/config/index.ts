import { contractAddresses } from '@contracts/addresses';

// Testnet Default RPC URLs
export const SPHERON_TESTNET_HTTP_URL = 'https://base-sepolia-rpc.publicnode.com';
export const SPHERON_TESTNET_WSS_URL = 'wss://base-sepolia-rpc.publicnode.com';
export const SPHERON_TESTNET_EXPLORER_URL = 'https://sepolia.basescan.org';

// Mainnet Default RPC URLs
export const SPHERON_MAINNET_HTTP_URL = 'https://mainnet.base.org';
export const SPHERON_MAINNET_WSS_URL = 'wss://base-rpc.publicnode.com';
export const SPHERON_MAINNET_EXPLORER_URL = 'https://basescan.org';

export const SPHERON_RPC_MAP = {
  testnet: {
    http: SPHERON_TESTNET_HTTP_URL,
    wss: SPHERON_TESTNET_WSS_URL,
    explorer: SPHERON_TESTNET_EXPLORER_URL,
  },
  mainnet: {
    http: SPHERON_MAINNET_HTTP_URL,
    wss: SPHERON_MAINNET_WSS_URL,
    explorer: SPHERON_MAINNET_EXPLORER_URL,
  },
};

export interface RpcProvider {
  HTTP_URL: string;
  WSS_URL: string;
}

export interface IToken {
  id: number;
  name: string;
  symbol: string;
  decimal: number;
  address: string;
  // logo: any;
}

export interface INetwork {
  chainId: number;
  chainName: string;
  rpcUrls: string[];
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  blockExplorerUrls: string[];
}

export type NetworkType = 'mainnet' | 'testnet';

export const networkMap: Record<NetworkType, INetwork> = {
  testnet: {
    chainId: 84532,
    chainName: 'Base Sepolia',
    rpcUrls: [SPHERON_TESTNET_HTTP_URL],
    nativeCurrency: {
      name: 'Sepolia Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    blockExplorerUrls: [SPHERON_TESTNET_EXPLORER_URL],
  },
  mainnet: {
    chainId: 8453,
    chainName: 'Base Mainnet',
    rpcUrls: [SPHERON_MAINNET_HTTP_URL],
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18,
    },
    blockExplorerUrls: [SPHERON_MAINNET_EXPLORER_URL],
  },
};

export const tokenMap: Record<NetworkType, IToken[]> = {
  testnet: [
    {
      id: 1,
      name: 'Tether USD Test Token',
      symbol: 'USDT',
      decimal: 6,
      address: contractAddresses.testnet.USDT,
    },
    {
      id: 2,
      name: 'DAI Test Token',
      symbol: 'DAI',
      decimal: 18,
      address: contractAddresses.testnet.DAI,
    },
    {
      id: 3,
      name: 'Test Token USD Coin',
      symbol: 'USDC',
      decimal: 6,
      address: contractAddresses.testnet.USDC,
    },
    {
      id: 4,
      name: 'Wrapped ETH Test Token',
      symbol: 'WETH',
      decimal: 18,
      address: contractAddresses.testnet.WETH,
    },
    {
      id: 5,
      name: 'uSPON Test Token',
      symbol: 'uSPON',
      decimal: 6,
      address: contractAddresses.testnet.uSPON,
    },
  ],
  mainnet: [
    {
      id: 3,
      name: 'uSPON',
      symbol: 'uSPON',
      decimal: 6,
      address: contractAddresses.mainnet.uSPON,
    },
  ],
};

export const networkType = (process.env.NEXT_PUBLIC_NETWORK_TYPE as string) || 'mainnet';

export const DEFAULT_PAGE_SIZE = 10;

export const GSEQ = '1';

export const OSEQ = '1';

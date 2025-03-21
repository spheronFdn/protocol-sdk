import {
  DAIDev as DAI,
  USDCDev as USDC,
  USDTDev as USDT,
  WETHDev as WETH,
  USDTMainnet,
} from '@contracts/addresses';

// Testnet URLs
export const SPHERON_TESTNET_RPC_URL =
  'https://base-sepolia.g.alchemy.com/v2/MYm8w99-g3L5Vbxe-Z3RRcDy7P2BH_0n';
export const SPHERON_TESTNET_WSS_URL =
  'wss://base-sepolia.g.alchemy.com/v2/MYm8w99-g3L5Vbxe-Z3RRcDy7P2BH_0n';
export const SPHERON_TESTNET_EXPLORER_URL = 'https://sepolia.basescan.org/';

export const SPHERON_MAINNET_RPC_URL =
  'https://base-mainnet.g.alchemy.com/v2/-lNWgmawEUixMe7EKIzZOCpQFpdeVRjD';
export const SPHERON_MAINNET_WSS_URL =
  'wss://base-mainnet.g.alchemy.com/v2/-lNWgmawEUixMe7EKIzZOCpQFpdeVRjD';
export const SPHERON_MAINNET_EXPLORER_URL = 'https://base.blockscout.com/';

export const SPHERON_RPC_MAP = {
  testnet: {
    rpc: SPHERON_TESTNET_RPC_URL,
    wss: SPHERON_TESTNET_WSS_URL,
    explorer: SPHERON_TESTNET_EXPLORER_URL,
  },
  mainnet: {
    rpc: SPHERON_MAINNET_RPC_URL,
    wss: SPHERON_MAINNET_WSS_URL,
    explorer: SPHERON_MAINNET_EXPLORER_URL,
  },
};

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

export type NetworkType = 'testnet' | 'mainnet';

export const networkMap: Record<NetworkType, INetwork> = {
  testnet: {
    chainId: 421614,
    chainName: 'Arbitrum Sepolia',
    rpcUrls: ['https://sepolia-rollup.arbitrum.io/rpc'],
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18,
    },
    blockExplorerUrls: ['https://sepolia.arbiscan.io/'],
  },
  // TODO: NEED TO UPDATE WHEN MAINNET RELEASE
  mainnet: {
    chainId: 8453,
    chainName: 'Base Mainnet',
    rpcUrls: [SPHERON_MAINNET_RPC_URL],
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
      address: USDT,
      // logo: USDTIcon,
    },
    {
      id: 2,
      name: 'DAI Test Token',
      symbol: 'DAI',
      decimal: 18,
      address: DAI,
      // logo: DaiIcon,
    },
    {
      id: 3,
      name: 'Test Token USD Coin',
      symbol: 'USDC',
      decimal: 6,
      address: USDC,
      // logo: USDCIcon,
    },
    {
      id: 4,
      name: 'Wrapped ETH Test Token',
      symbol: 'WETH',
      decimal: 18,
      address: WETH,
      // logo: WethIcon,
    },
  ],
  mainnet: [
    {
      id: 1,
      name: 'Tether USD Token',
      symbol: 'USDT',
      decimal: 6,
      address: USDTMainnet,
    },
  ],
};

export const networkType = (process.env.NEXT_PUBLIC_NETWORK_TYPE as string) || 'testnet';

export const DEFAULT_PAGE_SIZE = 10;

export const GSEQ = '1';

export const OSEQ = '1';

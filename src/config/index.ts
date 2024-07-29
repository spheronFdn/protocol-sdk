import { DAI, USDC, USDT, WETH } from '@contracts/addresses';

// Testnet URLs
export const SPHERON_TESTNET_RPC_URL = 'https://sepolia-rollup.arbitrum.io/rpc';
export const SPHERON_TESTNET_EXPLORER_URL = 'https://sepolia.arbiscan.io/';

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
  mainnet: [],
};

export const networkType = (process.env.NEXT_PUBLIC_NETWORK_TYPE as string) || 'testnet';

export const DEFAULT_PAGE_SIZE = 10;

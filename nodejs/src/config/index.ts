import { contractAddresses } from '@contracts/addresses';

// Testnet URLs
export const SPHERON_TESTNET_HTTP_URL =
  'https://base-sepolia.g.alchemy.com/v2/MYm8w99-g3L5Vbxe-Z3RRcDy7P2BH_0n';
export const SPHERON_TESTNET_WSS_URL =
  'wss://base-sepolia.g.alchemy.com/v2/MYm8w99-g3L5Vbxe-Z3RRcDy7P2BH_0n';
export const SPHERON_TESTNET_EXPLORER_URL = 'https://sepolia.basescan.org';

export const SPHERON_MAINNET_HTTP_URL =
  'https://base-mainnet.g.alchemy.com/v2/-lNWgmawEUixMe7EKIzZOCpQFpdeVRjD';
export const SPHERON_MAINNET_WSS_URL =
  'wss://base-mainnet.g.alchemy.com/v2/-lNWgmawEUixMe7EKIzZOCpQFpdeVRjD';
export const SPHERON_MAINNET_EXPLORER_URL = 'https://base.blockscout.com/';

export const rpcUrls = {
  testnet: {
    HTTP_URL: SPHERON_TESTNET_HTTP_URL,
    WSS_URL: SPHERON_TESTNET_WSS_URL,
    EXPORER_URL: SPHERON_TESTNET_EXPLORER_URL,
  },
  mainnet: {
    HTTP_URL: SPHERON_TESTNET_HTTP_URL,
    WSS_URL: SPHERON_TESTNET_WSS_URL,
    EXPORER_URL: SPHERON_TESTNET_EXPLORER_URL,
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

export interface RpcProvider {
  HTTP_URL: string;
  WSS_URL: string;
}

export type NetworkType = 'testnet' | 'mainnet';

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
    blockExplorerUrls: ['https://sepolia.basescan.org/'],
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
      address: contractAddresses.testnet.USDT,
      // logo: USDTIcon,
    },
    {
      id: 2,
      name: 'DAI Test Token',
      symbol: 'DAI',
      decimal: 18,
      address: contractAddresses.testnet.DAI,
      // logo: DaiIcon,
    },
    {
      id: 3,
      name: 'Test Token USD Coin',
      symbol: 'USDC',
      decimal: 6,
      address: contractAddresses.testnet.USDC,
      // logo: USDCIcon,
    },
    {
      id: 4,
      name: 'Wrapped ETH Test Token',
      symbol: 'WETH',
      decimal: 18,
      address: contractAddresses.testnet.WETH,
      // logo: WethIcon,
    },
    {
      id: 5,
      name: 'CST',
      symbol: 'CST',
      decimal: 6,
      address: contractAddresses.testnet.CST,
      // logo: cstIcon,
    },
  ],
  mainnet: [],
};

export const networkType = (process.env.NETWORK_TYPE as NetworkType) || 'testnet';

export const DEFAULT_PAGE_SIZE = 10;

export const GSEQ = '1';

export const OSEQ = '1';

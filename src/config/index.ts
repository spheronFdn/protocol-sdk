import { contractAddresses } from '@contracts/addresses';

// Testnet URLs
// export const SPHERON_DEVNET_HTTP_URL = 'https://spheron-devnet-eth.rpc.caldera.xyz/http';
export const SPHERON_DEVNET_HTTP_URL = 'https://spheron-devnet-eth.rpc.caldera.xyz/infra-partner-http';
export const SPHERON_DEVNET_WSS_URL = 'wss://spheron-devnet-eth.rpc.caldera.xyz/ws';
export const SPHERON_DEVNET_EXPLORER_URL = 'https://spheron-devnet-eth.explorer.caldera.xyz';

export const rpcUrls = {
  testnet: {
    HTTP_URL: SPHERON_DEVNET_HTTP_URL,
    WSS_URL: SPHERON_DEVNET_WSS_URL,
    EXPORER_URL: SPHERON_DEVNET_EXPLORER_URL,
  },
  mainnet: {
    HTTP_URL: SPHERON_DEVNET_HTTP_URL,
    WSS_URL: SPHERON_DEVNET_WSS_URL,
    EXPORER_URL: SPHERON_DEVNET_EXPLORER_URL,
  },
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

export type NetworkType = 'testnet' | 'mainnet';

export const networkMap: Record<NetworkType, INetwork> = {
  testnet: {
    chainId: 89138,
    chainName: "Spheron Devnet",
    rpcUrls: ["https://spheron-devnet-eth.rpc.caldera.xyz/http"],
    nativeCurrency: {
      name: "Ethereum",
      symbol: "ETH",
      decimals: 18,
    },
    blockExplorerUrls: ["https://spheron-devnet-eth.explorer.caldera.xyz/"],
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
  ],
  mainnet: [],
};

export const networkType = (process.env.NETWORK_TYPE as NetworkType) || 'testnet';

export const DEFAULT_PAGE_SIZE = 10;

export const GSEQ = '1';

export const OSEQ = '1';

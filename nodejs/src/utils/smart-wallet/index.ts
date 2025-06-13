import { NexusClient } from '@biconomy/abstractjs';
import { BundlerClient } from 'viem/_types/account-abstraction';
import { gaslessOptions, NetworkType, RpcUrls } from '@config/index';
import { initCoinbaseBundlerClient } from './coinbase';
import { initNexusClient } from './biconomy';

export const initSmartWalletBundlerClient = async ({
  networkType,
  privateKey,
  gaslessOptions,
  rpcUrls,
}: {
  networkType: NetworkType;
  privateKey: string;
  gaslessOptions: gaslessOptions;
  rpcUrls: RpcUrls;
}): Promise<NexusClient | BundlerClient> => {
  const clientParams = {
    networkType,
    privateKey,
    gaslessOptions,
    rpcUrls,
  };
  switch (gaslessOptions.type) {
    default:
    case 'coinbase':
      return await initCoinbaseBundlerClient(clientParams);
    case 'biconomy':
      return await initNexusClient(clientParams);
  }
};

export type SmartWalletBundlerClient = BundlerClient | NexusClient;

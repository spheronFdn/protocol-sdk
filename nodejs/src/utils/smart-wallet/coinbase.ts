import { createPublicClient, http } from 'viem';
import { base, baseSepolia } from 'viem/chains';
import {
  BundlerClient,
  createPaymasterClient,
  toCoinbaseSmartAccount,
} from 'viem/account-abstraction';
import { privateKeyToAccount } from 'viem/accounts';
import { createBundlerClient } from 'viem/account-abstraction';
import { NetworkType, RpcUrls, gaslessOptions } from '@config/index';

export const initCoinbaseBundlerClient = async ({
  networkType,
  privateKey,
  gaslessOptions,
  rpcUrls,
}: {
  networkType: NetworkType;
  privateKey: string;
  gaslessOptions: gaslessOptions;
  rpcUrls: RpcUrls;
}): Promise<BundlerClient> => {
  const chain = networkType === 'mainnet' ? base : baseSepolia;
  const cleanPrivateKey = privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey;
  const owner = privateKeyToAccount(`0x${cleanPrivateKey}`);
  const client = createPublicClient({
    chain,
    transport: http(rpcUrls.http),
  });

  const account = await toCoinbaseSmartAccount({
    client,
    owners: [owner],
  });

  const paymasterClient = createPaymasterClient({
    transport: http(gaslessOptions.paymasterUrl),
  });

  const bundlerClient = createBundlerClient({
    account,
    client,
    paymaster: paymasterClient,
    transport: http(gaslessOptions.bundlerUrl),
    chain,
  });
  return bundlerClient;
};

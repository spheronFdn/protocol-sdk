import {
  createBicoPaymasterClient,
  createSmartAccountClient,
  NexusClient,
  toNexusAccount,
} from '@biconomy/abstractjs';
import { NetworkType, gaslessOptions } from '@config/index';
import { http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base, baseSepolia } from 'viem/chains';

export const initNexusClient = async ({
  networkType,
  privateKey,
  gaslessOptions,
}: {
  networkType: NetworkType;
  privateKey: string;
  gaslessOptions: gaslessOptions;
}): Promise<NexusClient> => {
  const chain = networkType === 'mainnet' ? base : baseSepolia;
  const cleanPrivateKey = privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey;
  const account = privateKeyToAccount(`0x${cleanPrivateKey}`);

  const nexusClient = createSmartAccountClient({
    account: await toNexusAccount({
      signer: account,
      chain,
      transport: http(),
    }),
    transport: http(gaslessOptions.bundlerUrl),
    paymaster: createBicoPaymasterClient({
      paymasterUrl: gaslessOptions.paymasterUrl,
    }),
  });

  return nexusClient;
};

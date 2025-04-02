import type {
  NexusClient
} from '@biconomy/abstractjs';
import {
  toNexusAccount,
} from '@biconomy/abstractjs/dist/_esm/account/toNexusAccount.js';
import {
  createBicoPaymasterClient,
} from '@biconomy/abstractjs/dist/_esm/clients/createBicoPaymasterClient.js';
import {
  createSmartAccountClient,
} from '@biconomy/abstractjs/dist/_esm/clients/createBicoBundlerClient.js';
import { encodeFunctionData, parseAbi, http } from 'viem';
import { baseSepolia } from 'viem/_esm/chains/definitions/baseSepolia.js';
import { privateKeyToAccount } from 'viem/_esm/accounts/privateKeyToAccount.js';
import type { WaitForUserOperationReceiptReturnType } from 'viem/_types/account-abstraction';

export class BiconomyService {
  private nexusClient!: NexusClient;

  constructor(
    private privateKey: string,
    private bundlerUrl: string,
    private paymasterUrl: string
  ) {
    this.initializeClient();
  }

  private async initializeClient() {
    try {
      const cleanPrivateKey = this.privateKey.startsWith('0x')
        ? this.privateKey.slice(2)
        : this.privateKey;
      const account = privateKeyToAccount(`0x${cleanPrivateKey}`);

      if (!this.bundlerUrl || !this.paymasterUrl) {
        throw new Error('Missing bundler or paymaster URL');
      }

      this.nexusClient = createSmartAccountClient({
        account: await toNexusAccount({
          signer: account,
          chain: baseSepolia,
          transport: http(),
        }),
        transport: http(this.bundlerUrl),
        paymaster: createBicoPaymasterClient({ paymasterUrl: this.paymasterUrl }),
      });

      console.log('Biconomy client initialized successfully');
    } catch (error) {
      console.error(`Failed to initialize Biconomy client: ${error}`);
      throw error;
    }
  }

  encodeFunction(params: { abi: any[]; functionName: string; args: any[] }): `0x${string}` {
    return encodeFunctionData({
      abi: parseAbi(params.abi),
      functionName: params.functionName,
      args: params.args,
    });
  }

  async sendTransaction(params: { to: string; data: `0x${string}` }) {
    try {
      if (!this.nexusClient) {
        throw new Error('Biconomy client not initialized');
      }

      const txHash = await this.nexusClient.sendTransaction({
        to: params.to as `0x${string}`,
        data: params.data,
        chain: baseSepolia,
      });

      console.log(`Transaction sent via Biconomy: ${txHash}`);
      return txHash;
    } catch (error) {
      console.error(`Failed to send transaction via Biconomy: ${error}`);
      throw error;
    }
  }

  async waitForTransaction(hash: string): Promise<WaitForUserOperationReceiptReturnType> {
    try {
      const receipt = await this.nexusClient.waitForUserOperationReceipt({
        hash: hash as `0x${string}`,
      });
      return receipt;
    } catch (error) {
      console.error(`Failed to wait for transaction: ${error}`);
      throw error;
    }
  }
}

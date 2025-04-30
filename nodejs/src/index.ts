import { ethers } from 'ethers';
import { LeaseModule } from '@modules/lease';
import { OrderModule } from '@modules/order';
import { EscrowModule } from '@modules/escrow';
import { DeploymentModule } from '@modules/deployment';
import { ProviderModule } from '@modules/provider';
import { FizzModule } from '@modules/fizz';
import { publicRpcUrls } from '@config/index';
import type { NetworkType, RpcUrls, gaslessOptions } from '@config/index';
import { initSmartWalletBundlerClient, type SmartWalletBundlerClient } from '@utils/smart-wallet';

export class SpheronSDK {
  public leases: LeaseModule;
  public orders: OrderModule;
  public escrow: EscrowModule;
  public provider: ProviderModule;
  public fizz: FizzModule;
  public deployment: DeploymentModule;
  private smartWalletBundlerClientPromise?: Promise<SmartWalletBundlerClient>;

  constructor({
    networkType = 'mainnet',
    privateKey,
    rpcUrls = {
      http: publicRpcUrls[networkType].http,
      websocket: publicRpcUrls[networkType].websocket,
    },
    gaslessOptions,
  }: {
    networkType: NetworkType;
    privateKey?: string;
    rpcUrls?: RpcUrls;
    gaslessOptions?: gaslessOptions;
  }) {
    const provider = new ethers.JsonRpcProvider(rpcUrls.http);
    const websocketProvider = new ethers.WebSocketProvider(rpcUrls.websocket);
    const wallet = privateKey ? new ethers.Wallet(privateKey, provider) : undefined;

    if (privateKey && gaslessOptions) {
      this.smartWalletBundlerClientPromise = initSmartWalletBundlerClient({
        networkType,
        privateKey,
        gaslessOptions,
      });
    }

    this.leases = new LeaseModule(
      provider,
      websocketProvider,
      wallet,
      networkType,
      this.smartWalletBundlerClientPromise
    );
    this.orders = new OrderModule(
      provider,
      websocketProvider,
      wallet,
      networkType,
      this.smartWalletBundlerClientPromise
    );
    this.escrow = new EscrowModule(
      provider,
      wallet,
      networkType,
      this.smartWalletBundlerClientPromise
    );
    this.provider = new ProviderModule(provider, networkType);
    this.fizz = new FizzModule(provider, websocketProvider, wallet, networkType);
    this.deployment = new DeploymentModule(
      provider,
      websocketProvider,
      wallet,
      networkType,
      this.smartWalletBundlerClientPromise
    );
  }
}

export * from '@modules/provider/types';
export * from '@modules/lease/types';
export * from '@modules/order/types';
export * from '@modules/escrow/types';
export * from '@modules/fizz/types';

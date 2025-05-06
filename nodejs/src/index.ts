import type { NetworkType, RpcUrls, gaslessOptions } from '@config/index';
import { publicRpcUrls } from '@config/index';
import { DeploymentModule } from '@modules/deployment';
import { EscrowModule } from '@modules/escrow';
import { FizzModule } from '@modules/fizz';
import { InventoryModule } from '@modules/inventory';
import { LeaseModule } from '@modules/lease';
import { OrderModule } from '@modules/order';
import { ProviderModule } from '@modules/provider';
import { initSmartWalletBundlerClient, type SmartWalletBundlerClient } from '@utils/smart-wallet';
import { ethers } from 'ethers';

export class SpheronSDK {
  public leases: LeaseModule;
  public orders: OrderModule;
  public escrow: EscrowModule;
  public provider: ProviderModule;
  public fizz: FizzModule;
  public deployment: DeploymentModule;
  private smartWalletBundlerClientPromise?: Promise<SmartWalletBundlerClient>;
  public inventory: InventoryModule;

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
    this.inventory = new InventoryModule(provider, websocketProvider, wallet, networkType);
  }
}

export * from '@modules/escrow/types';
export * from '@modules/fizz/types';
export * from '@modules/lease/types';
export * from '@modules/order/types';
export * from '@modules/provider/types';

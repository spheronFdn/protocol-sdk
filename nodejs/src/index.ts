import { ethers } from 'ethers';
import { LeaseModule } from '@modules/lease';
import { OrderModule } from '@modules/order';
import { EscrowModule } from '@modules/escrow';
import { DeploymentModule } from '@modules/deployment';
import { ProviderModule } from '@modules/provider';
import { FizzModule } from '@modules/fizz';
import { rpcUrls } from '@config/index';
import type { NetworkType, RpcProvider } from '@config/index';

export class SpheronSDK {
  public leases: LeaseModule;
  public orders: OrderModule;
  public escrow: EscrowModule;
  public provider: ProviderModule;
  public fizz: FizzModule;
  public deployment: DeploymentModule;

  constructor(
    networkType: NetworkType,
    privateKey?: string,
    rpcProvider: RpcProvider = {
      HTTP_URL: rpcUrls[networkType].HTTP_URL,
      WSS_URL: rpcUrls[networkType].WSS_URL,
    }
  ) {
    if (networkType !== 'testnet') {
      throw new Error(
        "Please use 'testnet' as network type as Spheron Protocol's mainnet is not launched yet."
      );
    }

    const provider = new ethers.JsonRpcProvider(rpcProvider.HTTP_URL);
    const websocketProvider = new ethers.WebSocketProvider(rpcProvider.WSS_URL);
    const wallet = privateKey ? new ethers.Wallet(privateKey, provider) : undefined;

    this.leases = new LeaseModule(provider, websocketProvider, wallet);
    this.orders = new OrderModule(provider, websocketProvider, wallet);
    this.escrow = new EscrowModule(provider, wallet);
    this.provider = new ProviderModule(provider);
    this.fizz = new FizzModule(provider, websocketProvider, wallet);
    this.deployment = new DeploymentModule(provider, websocketProvider, wallet);
  }
}

export * from '@modules/provider/types';
export * from '@modules/lease/types';
export * from '@modules/order/types';
export * from '@modules/escrow/types';
export * from '@modules/fizz/types';

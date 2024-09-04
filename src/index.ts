import { ethers } from 'ethers';
import { LeaseModule } from '@modules/lease';
import { OrderModule } from '@modules/order';
import { EscrowModule } from '@modules/escrow';
// import { SpheronProviderModule } from '@modules/spheron-provider';
import { ProviderModule } from '@modules/provider';
import { FizzModule } from '@modules/fizz';
import { rpcUrls } from '@config/index';
import type { NetworkType } from '@config/index';

export class SpheronSDK {
  public leases: LeaseModule;
  public orders: OrderModule;
  public escrow: EscrowModule;
  public provider: ProviderModule;
  // public spheronProvider: SpheronProviderModule;
  public fizz: FizzModule;

  constructor(networkType: NetworkType, privateKey?: string) {
    const provider = new ethers.JsonRpcProvider(rpcUrls[networkType].HTTP_URL);
    const websocketProvider = new ethers.WebSocketProvider(rpcUrls[networkType].WSS_URL);
    const wallet = privateKey ? new ethers.Wallet(privateKey, provider) : undefined;

    this.leases = new LeaseModule(provider, websocketProvider);
    this.orders = new OrderModule(provider, websocketProvider);
    this.escrow = new EscrowModule(provider, wallet);
    this.provider = new ProviderModule(provider);
    this.fizz = new FizzModule(provider, websocketProvider);
    // this.spheronProvider = new SpheronProviderModule(providerUrl, proxyUrl);
  }
}

export * from '@modules/provider/types';
export * from '@modules/lease/types';
export * from '@modules/order/types';
export * from '@modules/escrow/types';
export * from '@modules/fizz/types';

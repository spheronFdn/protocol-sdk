import { ethers } from 'ethers';
import { LeaseModule } from '@modules/lease';
import { OrderModule } from '@modules/order';
import { EscrowModule } from '@modules/escrow';
import { SpheronProviderModule } from '@modules/spheron-provider';
import { SPHERON_TESTNET_RPC_URL, SPHERON_TESTNET_WSS_URL } from '@config/index';

export class SpheronSDK {
  public leases: LeaseModule;
  public orders: OrderModule;
  public escrow: EscrowModule;
  public spheronProvider: SpheronProviderModule;

  constructor(providerUrl: string = '') {
    const provider = new ethers.JsonRpcProvider(SPHERON_TESTNET_RPC_URL);
    const websocketProvider = new ethers.WebSocketProvider(SPHERON_TESTNET_WSS_URL);
    this.leases = new LeaseModule(provider);
    this.orders = new OrderModule(provider, websocketProvider);
    this.escrow = new EscrowModule(provider);
    this.spheronProvider = new SpheronProviderModule(providerUrl);
  }
}

export * from '@modules/lease/types';
export * from '@modules/order/types';
export * from '@modules/escrow/types';

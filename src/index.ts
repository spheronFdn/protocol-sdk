import { ethers } from 'ethers';
import { LeaseModule } from '@modules/lease';
import { OrderModule } from '@modules/order';
import { EscrowModule } from '@modules/escrow';
import { SpheronProviderModule } from '@modules/spheron-provider';
import {
  NetworkType,
  RpcProvider,
  SPHERON_RPC_MAP,
} from '@config/index';
import { ProviderModule } from '@modules/provider';
import { FizzModule } from '@modules/fizz';

export class SpheronSDK {
  public leases: LeaseModule;
  public orders: OrderModule;
  public escrow: EscrowModule;
  public provider: ProviderModule;
  public spheronProvider: SpheronProviderModule;
  public fizz: FizzModule;
  public networkType: NetworkType;

  constructor(
    providerUrl = '',
    proxyUrl = '',
    networkType: NetworkType = 'testnet',
    rpcProvider: RpcProvider = {
      HTTP_URL: SPHERON_RPC_MAP[networkType].http,
      WSS_URL: SPHERON_RPC_MAP[networkType].wss,
    }
  ) {
    this.networkType = networkType;
    const provider = new ethers.JsonRpcProvider(rpcProvider.HTTP_URL);
    const websocketProvider = new ethers.WebSocketProvider(rpcProvider.WSS_URL);
    this.leases = new LeaseModule(provider, websocketProvider, networkType);
    this.orders = new OrderModule(provider, websocketProvider, networkType);
    this.escrow = new EscrowModule(provider, networkType);
    this.provider = new ProviderModule(provider, networkType);
    this.fizz = new FizzModule(provider, websocketProvider, networkType);
    this.spheronProvider = new SpheronProviderModule(providerUrl, proxyUrl);
  }
}

export * from '@modules/provider/types';
export * from '@modules/lease/types';
export * from '@modules/order/types';
export * from '@modules/escrow/types';
export * from '@modules/fizz/types';

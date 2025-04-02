import { ethers } from 'ethers';
import { LeaseModule } from '@modules/lease';
import { OrderModule } from '@modules/order';
import { EscrowModule } from '@modules/escrow';
import { DeploymentModule } from '@modules/deployment';
import { ProviderModule } from '@modules/provider';
import { FizzModule } from '@modules/fizz';
import { rpcUrls } from '@config/index';
import type { NetworkType, RpcProvider, Paymaster } from '@config/index';
import { BiconomyService } from '@utils/biconomy';

export class SpheronSDK {
  public leases: LeaseModule;
  public orders: OrderModule;
  public escrow: EscrowModule;
  public provider: ProviderModule;
  public fizz: FizzModule;
  public deployment: DeploymentModule;
  public paymaster?: BiconomyService;

  constructor(
    networkType: NetworkType,
    privateKey?: string,
    rpcProvider: RpcProvider = {
      HTTP_URL: rpcUrls[networkType].HTTP_URL,
      WSS_URL: rpcUrls[networkType].WSS_URL,
    },
    paymaster?: Paymaster
  ) {
    const provider = new ethers.JsonRpcProvider(rpcProvider.HTTP_URL);
    const websocketProvider = new ethers.WebSocketProvider(rpcProvider.WSS_URL);
    const wallet = privateKey ? new ethers.Wallet(privateKey, provider) : undefined;

    switch (paymaster?.type) {
      case 'biconomy':
        this.paymaster = new BiconomyService(
          privateKey!,
          paymaster.bundlerUrl,
          paymaster.paymasterUrl
        );
        break;
      case 'coinbase':
        break;
    }

    this.leases = new LeaseModule(provider, websocketProvider, wallet, networkType, this.paymaster);
    this.orders = new OrderModule(provider, websocketProvider, wallet, networkType, this.paymaster);
    this.escrow = new EscrowModule(provider, wallet, networkType);
    this.provider = new ProviderModule(provider, networkType);
    this.fizz = new FizzModule(provider, websocketProvider, wallet, networkType);
    this.deployment = new DeploymentModule(provider, websocketProvider, wallet, networkType, this.paymaster);
  }
}

export * from '@modules/provider/types';
export * from '@modules/lease/types';
export * from '@modules/order/types';
export * from '@modules/escrow/types';
export * from '@modules/fizz/types';

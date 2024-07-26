import { LeaseModule } from '@modules/lease';
import { OrderModule } from '@modules/order';
import { ethers } from 'ethers';
// import { EscrowModule } from '@modules/escrow';
import { SPHERON_TESTNET_RPC_URL } from './config';

export class SpheronSDK {
  public leases: LeaseModule;
  public orders: OrderModule;
  // public escrow: EscrowModule;

  constructor(providerUrl: string) {
    const provider = new ethers.JsonRpcProvider(SPHERON_TESTNET_RPC_URL);
    this.leases = new LeaseModule(provider);
    this.orders = new OrderModule(provider);
    // this.escrow = new EscrowModule(provider);
  }
}

export * from '@modules/lease/types';
export * from '@modules/order/types';
// export * from '@modules/escrow/types';

// const sdk = new SpheronSDK(SPHERON_TESTNET_RPC_URL);
// sdk.leases.getLeasesByState('0x2c11a76298a111b8ca8db82205dc8f0a2688e6e8', {
//   state: LeaseState.ACTIVE,
//   page: 1,
//   pageSize: 10,
// });

import ComputeLeaseAbi from '@contracts/abis/devnet/ComputeLease.json';
import { ComputeLeaseDev as ComputeLease } from '@contracts/addresses';
import { OrderModule } from '@modules/order';
import { getTokenDetails, initializeSigner } from '@utils/index';
import { ethers } from 'ethers';
import { Lease, LeaseState, LeaseWithOrderDetails } from './types';
import { getLeaseStateAsString } from '@utils/lease';
import { DEFAULT_PAGE_SIZE } from '@config/index';
import { FizzModule } from '@modules/fizz';

export class LeaseModule {
  private provider: ethers.Provider;
  private orderModule: OrderModule;
  private fizzModule: FizzModule;
  private websocketProvider?: ethers.WebSocketProvider;
  private leaseCloseTimeoutId: NodeJS.Timeout | null;
  private wallet: ethers.Wallet | undefined;

  constructor(
    provider: ethers.Provider,
    websocketProvider?: ethers.WebSocketProvider,
    wallet?: ethers.Wallet
  ) {
    this.provider = provider;
    this.websocketProvider = websocketProvider;
    this.getLeaseDetails = this.getLeaseDetails.bind(this);
    this.orderModule = new OrderModule(provider);
    this.fizzModule = new FizzModule(provider, websocketProvider);
    this.leaseCloseTimeoutId = null;
    this.wallet = wallet;
  }

  async getLeaseDetails(leaseId: string) {
    const contractAbi = ComputeLeaseAbi;
    const contractAddress = ComputeLease;

    const contract = new ethers.Contract(contractAddress, contractAbi, this.provider);
    const response = await contract.leases(leaseId);

    const resourceAttribute = {
      cpuUnits: Number(response.resourceAttribute[0]),
      cpuAttributes: response.resourceAttribute[1],
      ramUnits: Number(response.resourceAttribute[2]),
      ramAttributes: response.resourceAttribute[3],
      gpuUnits: Number(response.resourceAttribute[4]),
      gpuAttributes: response.resourceAttribute[5],
      endpointsKind: Number(response.resourceAttribute[6]),
      endpointsSequenceNumber: Number(response.resourceAttribute[7]),
    };

    const lease: Lease = {
      leaseId: response.leaseId.toString(),
      fizzId: response.fizzId.toString(),
      requestId: response.requestId.toString(),
      resourceAttribute,
      acceptedPrice: Number(response.acceptedPrice),
      providerAddress: response.providerAddress.toString(),
      tenantAddress: response.tenantAddress.toString(),
      startBlock: response.startBlock.toString(),
      startTime: Number(response.startTime),
      endTime: Number(response.endTime),
      state: getLeaseStateAsString(response.state.toString()) as LeaseState,
    };

    return lease;
  }

  async getLeaseIds(address: string) {
    const contractAbi = ComputeLeaseAbi;
    const contractAddress = ComputeLease;

    const contract = new ethers.Contract(contractAddress, contractAbi, this.provider);
    const response = await contract.getTenantLeases(address);

    const activeLeaseIds = response[0].map((id: bigint) => id.toString()) as string[];
    const allLeaseIds = response[1].map((id: bigint) => id.toString()) as string[];

    const terminatedLeaseIds = allLeaseIds.filter((lId) => {
      return !activeLeaseIds.includes(lId);
    });

    return {
      activeLeaseIds,
      allLeaseIds,
      terminatedLeaseIds,
    };
  }

  async getLeasesByState(
    address: string,
    options?: { state?: LeaseState; page?: number; pageSize?: number }
  ) {
    const { activeLeaseIds, terminatedLeaseIds, allLeaseIds } = await this.getLeaseIds(address);

    let leaseIds = allLeaseIds;
    const totalCount = allLeaseIds.length;
    const terminatedCount = terminatedLeaseIds.length;
    const activeCount = activeLeaseIds.length;

    if (options?.state) {
      switch (options.state) {
        case LeaseState.ACTIVE:
          leaseIds = activeLeaseIds;
          break;
        case LeaseState.TERMINATED:
          leaseIds = terminatedLeaseIds;
          break;
      }
    }

    leaseIds.sort((a, b) => Number(b) - Number(a));

    if (options?.page) {
      const pageSize = options.pageSize || DEFAULT_PAGE_SIZE;
      leaseIds = leaseIds.slice((options.page - 1) * pageSize, options.page * pageSize);
    }

    const filteredLeases = await Promise.all(leaseIds.map((lId) => this.getLeaseDetails(lId)));
    const orderDetails = await Promise.all(
      leaseIds.map((lId) => this.orderModule.getOrderDetails(lId))
    );

    const leaseWithToken: LeaseWithOrderDetails[] = await Promise.all(
      filteredLeases.map(async (lease, index) => {
        const order = orderDetails[index];
        let tokenDetails;
        if (order.token?.address) tokenDetails = getTokenDetails(order.token.address, 'testnet');

        let region;
        if (lease.fizzId.toString() !== '0') {
          const fizz: any = await this.fizzModule.getFizzById(BigInt(lease.fizzId));
          region = fizz?.region;
        } else {
          const provider: any = await this.fizzModule.getProviderByAddress(lease.providerAddress);
          region = provider?.region;
        }

        return {
          ...lease,
          name: order.name,
          tier: order.specs.tier,
          region: region,
          token: {
            symbol: tokenDetails?.symbol,
            decimal: tokenDetails?.decimal,
          },
        };
      })
    );

    console.log('leases -> ', leaseWithToken);

    return {
      leases: leaseWithToken,
      activeCount,
      terminatedCount,
      totalCount,
    };
  }

  async closeLease(leaseId: string) {
    const contractAbi = ComputeLeaseAbi;
    const contractAddress = ComputeLease;
    try {
      const { signer } = await initializeSigner({ wallet: this.wallet });
      const contract = new ethers.Contract(contractAddress, contractAbi, signer);
      const tx = await contract.closeLease(leaseId);
      const receipt = await tx.wait();
      return receipt;
    } catch (error) {
      console.log('Error in close lease ->', error);
      throw error;
    }
  }

  async listenToLeaseClosedEvent(
    onSuccessCallback: ({
      orderId,
      providerAddress,
      tenantAddress,
    }: {
      orderId: string;
      providerAddress: string;
      tenantAddress: string;
    }) => void,
    onFailureCallback: () => void,
    timeout = 60000
  ) {
    if (!this.websocketProvider) {
      console.log('Please pass websocket provider in constructor');
      return;
    }
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    const contractAbi = ComputeLeaseAbi;
    const contractAddress = ComputeLease;

    const contract = new ethers.Contract(contractAddress, contractAbi, this.websocketProvider);

    return new Promise((resolve, reject) => {
      this.leaseCloseTimeoutId = setTimeout(() => {
        contract.off('LeaseClosed');
        onFailureCallback();
        reject({ error: true, msg: 'Order Updation Failed' });
      }, timeout);

      contract.on(
        'LeaseClosed',
        (orderId: string, providerAddress: string, tenantAddress: string) => {
          if (
            providerAddress.toString().toLowerCase() === accounts[0].toString().toLowerCase() ||
            tenantAddress.toString().toLowerCase() === accounts[0].toString().toLowerCase()
          ) {
            onSuccessCallback({ orderId, providerAddress, tenantAddress });
            this.websocketProvider?.destroy();
            contract.off('LeaseClosed');
            clearTimeout(this.leaseCloseTimeoutId as NodeJS.Timeout);
            resolve({ orderId, providerAddress, tenantAddress });
          }
        }
      );
    });
  }
}

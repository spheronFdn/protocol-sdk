import ComputeLeaseAbi from '@contracts/abis/ComputeLease.json';
import { ComputeLease } from '@contracts/addresses';
import { OrderModule } from '@modules/order';
import { getTokenDetails } from '@utils/index';
import { ethers } from 'ethers';
import { Lease, LeaseState, LeaseWithOrderDetails } from './types';
import { getLeaseStateAsString } from '@utils/lease';
import { DEFAULT_PAGE_SIZE } from '@config/index';

export class LeaseModule {
  private provider: ethers.Provider;
  private orderModule: OrderModule;
  private websocketProvider?: ethers.Provider;
  private leaseCloseTimeoutId: NodeJS.Timeout | null;

  constructor(provider: ethers.Provider, websocketProvider?: ethers.Provider) {
    this.provider = provider;
    this.websocketProvider = websocketProvider;
    this.getLeaseDetails = this.getLeaseDetails.bind(this);
    this.orderModule = new OrderModule(provider);
    this.leaseCloseTimeoutId = null;
  }

  async getLeaseDetails(leaseId: string) {
    const contractAbi = ComputeLeaseAbi;
    const contractAddress = ComputeLease;

    const contract = new ethers.Contract(contractAddress, contractAbi, this.provider);
    const response = await contract.leases(leaseId);

    const resourceAttribute = {
      cpuUnits: Number(response[2][0]),
      cpuAttributes: response[2][1],
      ramUnits: Number(response[2][2]),
      ramAttributes: response[2][3],
      gpuUnits: Number(response[2][4]),
      gpuAttributes: response[2][5],
      endpointsKind: Number(response[2][6]),
      endpointsSequenceNumber: Number(response[2][7]),
    };

    const lease: Lease = {
      leaseId: response[0].toString(),
      requestId: response[1].toString(),
      resourceAttribute,
      acceptedPrice: Number(response[3]),
      providerAddress: response[4].toString(),
      tenantAddress: response[5].toString(),
      startBlock: response[6].toString(),
      startTime: Number(response[7]),
      endTime: Number(response[8]),
      state: getLeaseStateAsString(response[9].toString()) as LeaseState,
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

    let filteredLeases: Lease[] = [];
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

    filteredLeases = await Promise.all(leaseIds.map((lId) => this.getLeaseDetails(lId)));
    const orderDetails = await Promise.all(
      leaseIds.map((lId) => this.orderModule.getOrderDetails(lId))
    );

    const leaseWithToken: LeaseWithOrderDetails[] = filteredLeases.map((lease, index) => {
      const order = orderDetails[index];
      let tokenDetails;
      if (order.token?.address) tokenDetails = getTokenDetails(order.token.address, 'testnet');

      return {
        ...lease,
        name: order.name,
        tier: order.specs.tier,
        region: order.region,
        token: {
          symbol: tokenDetails?.symbol,
          decimal: tokenDetails?.decimal,
        },
      };
    });

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
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
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

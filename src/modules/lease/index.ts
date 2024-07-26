import ComputeLeaseAbi from '@contracts/abis/ComputeLease.json';
import { ComputeLease } from '@contracts/addresses';
import { OrderModule } from '@modules/order';
import { getTokenDetails } from '@utils/index';
import { ethers } from 'ethers';
import { Lease, LeaseState, LeaseWithOrderDetails } from './types';

export class LeaseModule {
  private provider: ethers.Provider;
  private orderModule: OrderModule;

  constructor(provider: ethers.Provider) {
    this.provider = provider;
    this.getLeaseDetails = this.getLeaseDetails.bind(this);
    this.orderModule = new OrderModule(provider);
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
      state: Number(response[9]),
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
    let totalCount = allLeaseIds.length;

    if (options?.state !== undefined) {
      switch (options.state) {
        case LeaseState.ACTIVE:
          leaseIds = activeLeaseIds;
          totalCount = activeLeaseIds.length;
          break;
        case LeaseState.TERMINATED:
          leaseIds = terminatedLeaseIds;
          totalCount = terminatedLeaseIds.length;
          break;
      }
    }

    if (options?.page) {
      const pageSize = options.pageSize || 10;
      leaseIds = leaseIds.slice((options.page - 1) * pageSize, options.page * pageSize);
    }

    filteredLeases = await Promise.all(leaseIds.map((lId) => this.getLeaseDetails(lId)));
    const orderDetails = await Promise.all(
      leaseIds.map((lId) => this.orderModule.getOrderDetails(lId))
    );

    const leaseWithToken: LeaseWithOrderDetails[] = filteredLeases.map((lease, index) => {
      const order = orderDetails[index];
      const tokenDetails = getTokenDetails(order.token, 'testnet');
      return {
        ...lease,
        name: order.name,
        tier: order.specs.tier,
        region: order.region,
        token: {
          symbol: tokenDetails?.symbol,
          decimal: tokenDetails?.decimal,
          address: order.token,
        },
      };
    });

    return {
      leases: leaseWithToken,
      totalCount,
    };
  }
}

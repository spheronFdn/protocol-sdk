import ComputeLeaseAbi from '@contracts/abis/ComputeLease.json';
import { ComputeLease } from '@contracts/addresses';
import { ethers } from 'ethers';
import { Lease } from './types';

export class LeaseModule {
  private provider: ethers.Provider;

  constructor(provider: ethers.Provider) {
    this.provider = provider;
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

  async getTenantLeases(providerAddress: string) {
    const contractAbi = ComputeLeaseAbi;
    const contractAddress = ComputeLease;

    const contract = new ethers.Contract(contractAddress, contractAbi, this.provider);
    const response = await contract.getTenantLeases(providerAddress);

    return {
      activeLeases: response[0],
      allLeases: response[1],
    };
  }
}

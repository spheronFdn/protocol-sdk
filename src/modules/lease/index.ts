import { ethers } from 'ethers';
import { Lease } from './types';

export class LeaseModule {
  private provider: ethers.Provider;

  constructor(provider: ethers.Provider) {
    this.provider = provider;
  }

  // async getLeases(): Promise<Lease[]> {
  // }

  async getLeaseDetails(leaseId: string) {
    // const contractAbi = ComputeLeaseAbi;
    // const contractAddress = ComputeLease;
    // const contract = new ethers.Contract(contractAddress, contractAbi, this.provider);
    // const response = await contract.leases(leaseId);
    // return response;
  }

  // Other lease-related methods
}

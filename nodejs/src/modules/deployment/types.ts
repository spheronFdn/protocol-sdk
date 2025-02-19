import { ethers } from 'ethers';

export interface CreateDeploymentResponse {
  leaseId: string;
  transaction: ethers.ContractTransactionReceipt | null;
}

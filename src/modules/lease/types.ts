import { Tier } from '@modules/order/types';

interface ResourceAttributes {
  cpuUnits: number;
  cpuAttributes: string[];
  ramUnits: number;
  ramAttributes: string[];
  gpuUnits: number;
  gpuAttributes: string[];
  endpointsKind: number;
  endpointsSequenceNumber: number;
}

export enum LeaseState {
  ACTIVE = 'active',
  TERMINATED = 'terminated',
}

export interface Lease {
  leaseId: string;
  fizzId: string;
  requestId: string;
  // resourceAttribute: ResourceAttributes;
  acceptedPrice: number;
  providerAddress: string;
  tenantAddress: string;
  startBlock: string;
  startTime: number;
  endTime: number;
  state: LeaseState;
}

export interface LeaseWithOrderDetails extends Lease {
  name: string;
  region: string;
  tier: Tier[];
  token: {
    symbol?: string;
    decimal?: number;
  };
  specs: Record<string, any>;
  numOfBlocks: number;
}

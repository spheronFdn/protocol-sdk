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
  ACTIVE,
  TERMINATED,
}

export interface Lease {
  leaseId: string;
  requestId: string;
  resourceAttribute: ResourceAttributes;
  acceptedPrice: number;
  providerAddress: string;
  tenantAddress: string;
  startBlock: string;
  startTime: number;
  endTime: number;
  state: LeaseState;
}

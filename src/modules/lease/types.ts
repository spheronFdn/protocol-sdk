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

enum State {
  ACTIVE,
  TERMINATED,
}

export interface Lease {
  leaseId: number;
  requestId: number;
  resourceAttribute: ResourceAttributes;
  acceptedPrice: number;
  providerAddress: string;
  tenantAddress: string;
  startBlock: number;
  startTime: number;
  endTime: number;
  state: State;
}

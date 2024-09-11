export interface FizzParams {
  providerId: bigint;
  spec: string;
  walletAddress: string;
  paymentsAccepted: string[];
  rewardWallet: string;
}

export interface FizzNode {
  fizzId: bigint;
  providerId: bigint;
  spec: string;
  walletAddress: string;
  paymentsAccepted: string[];
  status: number;
  joinTimestamp: bigint;
  rewardWallet: string;
}

export interface ResourceCategory {
  name: string;
  registry: string;
  baseReward: bigint;
}

export interface Attribute {
  id: bigint;
  units: bigint;
}

export interface Resource {
  name: string;
  tier: string;
  multiplier: bigint;
}

export interface ResourceAttributes {
  cpuUnits: bigint;
  cpuAttributes: string[];
  ramUnits: bigint;
  ramAttributes: string[];
  gpuUnits: bigint;
  gpuAttributes: string[];
  endpointsKind: number;
  endpointsSequenceNumber: number;
}

export interface FizzLease {
  leaseId: bigint;
  fizzId: bigint;
  requestId: bigint;
  resourceAttribute: ResourceAttributes;
  acceptedPrice: bigint;
  providerAddress: string;
  tenantAddress: string;
  startBlock: bigint;
  startTime: bigint;
  endTime: bigint;
  state: string;
}

export enum FizzProviderStatus {
  Unregistered,
  Registered,
  Active,
  Maintenance,
  Suspended,
  Deactivated,
}

export enum FizzProviderTrustTier {
  One,
  Two,
  Three,
  Four,
  Five,
  Six,
  Seven,
}

export interface FizzProvider {
  providerId: bigint;
  name: string;
  region: string;
  walletAddress: string;
  paymentsAccepted: string[];
  attributes: string;
  hostUri: string;
  certificate: string;
  status: FizzProviderStatus;
  tier: FizzProviderTrustTier;
  joinTimestamp: bigint;
  rewardWallet: string;
}

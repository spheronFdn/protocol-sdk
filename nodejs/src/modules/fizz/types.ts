export interface FizzParams {
  providerId: bigint;
  spec: string;
  walletAddress: string;
  paymentsAccepted: string[];
  rewardWallet: string;
}

export type RawFizzNode = [
  bigint, // fizzId
  bigint, // providerId
  string, // spec
  string, // walletAddress
  string[], // paymentsAccepted
  bigint, // status
  bigint, // joinTimestamp
  string // rewardWallet
];

export interface FizzNode {
  fizzId: bigint;
  providerId: bigint;
  region: string;
  spec: string;
  walletAddress: string;
  paymentsAccepted: string[];
  status: number;
  joinTimestamp: bigint;
  rewardWallet: string;
}

export interface FizzDetails {
  region: string;
  providerId: bigint;
  spec: string;
  walletAddress: string;
  paymentsAccepted: string[];
  status: bigint;
  joinTimestamp: bigint;
  rewardWallet: string;
}

export interface ResourceCategory {
  name: string;
  registry: string;
  baseReward: bigint;
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
  spec: string;
  hostUri: string;
  certificate: string;
  status: FizzProviderStatus;
  tier: FizzProviderTrustTier;
  joinTimestamp: bigint;
  rewardWallet: string;
}

export interface FizzAttribute {
  id: bigint | string;
  units: bigint | string;
}

export type RawFizzAttribute = [id: string, units: string];

export interface FizzStatusResponse {
  name: string;
  allocatable: {
    cpu: number;
    gpu: number;
    gpu_infos:
      | null
      | {
          vendor: string;
          name: string;
          model_id: string;
          interface: string;
          memory_size: string;
          vram_available_percentage: number;
        }[];
    memory: number;
    storage_ephemeral: number;
  };
  available: {
    cpu: number;
    gpu: number;
    gpu_infos: null;
    memory: number;
    storage_ephemeral: number;
  };
  bandwidth: `${string};${string}`;
  version: `${string};${string}`;
  os: string;
  arch: string;
  cuda_version: string;
  nvidia_driver_version: string;
}

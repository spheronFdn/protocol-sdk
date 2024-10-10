export interface IProvider {
  spec: string;
  hostUri: string;
  certificate: string;
  paymentsAccepted: any;
  status: string;
  trust: number;
  timestamp: number;
}

export interface Attribute {
  id: bigint;
  units: bigint;
}

export enum ProviderStatus {
  Unregistered,
  Registered,
  Active,
  Maintenance,
  Suspended,
  Deactivated,
}

export enum ProviderTrustTier {
  One,
  Two,
  Three,
  Four,
  Five,
  Six,
  Seven,
}

export interface Provider {
  providerId: bigint;
  name: string;
  region: string;
  walletAddress: string;
  paymentsAccepted: string[];
  attributes: string;
  hostUri: string;
  certificate: string;
  status: ProviderStatus;
  tier: ProviderTrustTier;
  joinTimestamp: bigint;
  rewardWallet: string;
}

export type Category = 'CPU' | 'GPU';

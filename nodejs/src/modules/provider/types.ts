export interface IProvider {
  spec: string;
  hostUri: string;
  certificate: string;
  paymentsAccepted: string[];
  status: string;
  trust: number;
  timestamp: number;
}

export interface Attribute {
  id: bigint | string;
  units: bigint | string;
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
  providerId?: bigint;
  name: string;
  region: string;
  spec?: string;
  walletAddress: string;
  paymentsAccepted: string[];
  hostUri: string;
  certificate: string;
  status: ProviderStatus;
  tier: ProviderTrustTier;
  joinTimestamp: bigint;
  rewardWallet: string;
}

export type Category = 'CPU' | 'GPU';

export type RawProviderAttribute = [id: string, units: string];

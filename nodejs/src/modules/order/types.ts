export enum Tier {
  One,
  Two,
  Three,
  Four,
  Five,
  Six,
  Seven,
}

export enum Mode {
  Fizz,
  Provider,
}

export interface OrderDetails {
  maxPrice: bigint;
  numOfBlocks: bigint;
  token: string;
  spec: string;
  version: number | bigint;
  mode: Mode;
  tier: Tier[];
}

export enum OrderState {
  OPEN = 'open',
  PROVISIONED = 'provisioned',
  CLOSED = 'closed',
  MATCHED = 'matched',
}

interface OrderSpecs {
  specs: string;
  version: string;
  mode: string;
  tier: Tier[];
}

export interface InitialOrder {
  id: number;
  name: string;
  region: string;
  maxPrice: number;
  numOfBlocks: number;
  token?: {
    symbol?: string;
    decimal?: number;
    address: string;
  };
  creator: string;
  state: OrderState;
  specs: OrderSpecs;
}

export interface OrderMatchedEvent {
  leaseId: string;
  providerAddress: string;
  providerId: string | number | bigint;
  acceptedPrice: string | number | bigint;
  creatorAddress: string;
}

export interface OrderUpdatedEvent {
  leaseId: string;
  providerAddress: string;
  tenantAddress: string;
  acceptedPrice: string | number | bigint;
}

export interface OrderUpdateAcceptedEvent {
  leaseId: string;
  providerAddress: string;
}

export enum Tier {
  One,
  Two,
  Three,
  Four,
  Five,
  Six,
  Seven,
}

export interface OrderDetails {
  name: string;
  region: string;
  uptime: number;
  reputation: number;
  slashes: number;
  maxPrice: number;
  numOfBlocks: number;
  token: string;
  spec: string;
  version: string;
  mode: string;
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
  uptime: number;
  reputation: number;
  slashes: number;
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

enum Tier {
  One,
  Two,
  Three,
  Four,
  Five,
  Six,
  Seven
}

export interface OrderDetails {
  name: string;
  region: string;
  uptime: number;
  reputation: number; 
  slashes: number;
  maxPrice: number
  numOfBlocks: number
  token: string;
  spec: string;
  version: string;
  mode: string;
  tier: Tier[];
}

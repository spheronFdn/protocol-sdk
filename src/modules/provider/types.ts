export interface IProvider {
  name: string;
  region: string;
  attributes: any;
  hostUri: string;
  certificate: string;
  paymentsAccepted: any;
  status: string;
  trust: number;
  timestamp: number;
}

export type Category = 'CPU' | 'GPU';

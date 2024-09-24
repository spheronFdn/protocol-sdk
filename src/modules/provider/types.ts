export interface IProvider {
  spec: string;
  hostUri: string;
  certificate: string;
  paymentsAccepted: any;
  status: string;
  trust: number;
  timestamp: number;
}

export type Category = 'CPU' | 'GPU';

export interface ProviderDetails {
  name: string;
  region: string;
  attributes: string;
  hostUri: string;
  certificate: string;
  paymentsAccepted: string[];
  status: string;
  trust: number;
  timestamp: number;
}

export enum TransactionStatus {
  SUCCESS = 'success',
  FAILURE = 'failure',
}

export interface TransactionData {
  rewardWallet: string;
  tokenAddress: string;
  amount: number;
  decimals: number;
  onSuccessCallback?: (data: unknown) => void;
  onFailureCallback?: (data: unknown) => void;
}

export interface DepositData {
  token: string;
  amount: number;
  onSuccessCallback?: (data: unknown) => void;
  onFailureCallback?: (data: unknown) => void;
}

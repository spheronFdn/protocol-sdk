import { BrowserProvider } from 'ethers';

declare global {
  interface Window {
    ethereum?: any;
  }
}

declare module '@biconomy/abstractjs/dist/_esm/index.js' {
  export * from '@biconomy/abstractjs';
}
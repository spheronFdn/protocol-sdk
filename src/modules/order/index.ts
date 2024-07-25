import { OrderRequest } from '@contracts/addresses';
import * as OrderRequestAbi from '@contracts/abis/OrderRequest.json';
import { ethers } from 'ethers';
import { OrderDetails } from './types';

export class OrderModule {
  private provider: ethers.Provider;

  constructor(provider: ethers.Provider) {
    this.provider = provider;
  }

  async createOrder(orderDetails: OrderDetails) {
    if (typeof window?.ethereum === 'undefined') {
      console.log('Please install MetaMask');
      return;
    }
  
    try {
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
  
      const contract = new ethers.Contract(OrderRequest, OrderRequestAbi, signer);
  
      const tx = await contract.createOrder(orderDetails);
      const receipt = await tx.wait();
      console.log('Order created successfully -> ', receipt);
    } catch (error) {
      console.error('Error creating order -> ', error);
      throw error;
    }
  }
};

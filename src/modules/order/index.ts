import { OrderRequest } from '@contracts/addresses';
import OrderRequestAbi from '@contracts/abis/OrderRequest.json';
import { ethers } from 'ethers';
import { InitialOrder, OrderDetails, OrderState, Tier } from './types';

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

  async getOrderDetails(leaseId: string) {
    const contractAbi = OrderRequestAbi;
    const contractAddress = OrderRequest;

    const contract = new ethers.Contract(contractAddress, contractAbi, this.provider);
    const response = await contract.getOrderById(leaseId);

    const specs = {
      specs: response[11][0],
      version: response[11][1],
      mode: response[11][2],
      tier: response[11][3].map((t: bigint) => Number(t)) as Tier[],
    };

    return {
      id: response[0].toString(),
      name: response[1],
      region: response[2],
      uptime: Number(response[3]),
      reputation: Number(response[4]),
      slashes: Number(response[5]),
      maxPrice: Number(response[6]),
      numOfBlocks: Number(response[7]),
      token: response[8],
      creator: response[9],
      state: Number(response[10]) as OrderState,
      specs,
    } as InitialOrder;
  }
}

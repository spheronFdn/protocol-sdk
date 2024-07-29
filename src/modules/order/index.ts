import { OrderRequest } from '@contracts/addresses';
import OrderRequestAbi from '@contracts/abis/OrderRequest.json';
import { ethers } from 'ethers';
import { InitialOrder, OrderDetails, Tier } from './types';
import { getTokenDetails } from '@utils/index';
import { getOrderStateAsString } from '@utils/order';

export class OrderModule {
  private provider: ethers.Provider;
  private websocketProvider?: ethers.WebSocketProvider;
  private createTimeoutId: NodeJS.Timeout | null;
  private updateTimeoutId: NodeJS.Timeout | null;

  constructor(provider: ethers.Provider, websocketProvider?: ethers.WebSocketProvider) {
    this.provider = provider;
    this.websocketProvider = websocketProvider;
    this.createTimeoutId = null;
    this.updateTimeoutId = null;
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

    const tokenDetails = getTokenDetails(response[8], 'testnet');
    const token = {
      symbol: tokenDetails?.symbol,
      decimal: tokenDetails?.decimal,
      address: tokenDetails?.address,
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
      token,
      creator: response[9],
      state: getOrderStateAsString(response[10]),
      specs,
    } as InitialOrder;
  }

  async listenToOrderCreated(
    onSuccessCallback: (newOrderId: string) => void,
    onFailureCallback: () => void
  ) {
    if (!this.websocketProvider) {
      console.log('Please pass websocket provider in constructor');
      return;
    }
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    const contractAbi = OrderRequestAbi;
    const contractAddress = OrderRequest;

    const contract = new ethers.Contract(contractAddress, contractAbi, this.websocketProvider);

    this.createTimeoutId = setTimeout(() => {
      contract.off('OrderCreated');
      onFailureCallback();
      return { error: true, msg: 'Order creation Failed' };
    }, 60000);

    contract.on('OrderCreated', (orderId: string, senderAddress: string) => {
      if (senderAddress.toString().toLowerCase() === accounts[0].toString().toLowerCase()) {
        onSuccessCallback(orderId);
        this.websocketProvider?.destroy();
        contract.off('OrderCreated');
        clearTimeout(this.createTimeoutId as NodeJS.Timeout);
        return;
      }
    });
  }

  async listenToOrderUpdated(
    onSuccessCallback: (orderId: string) => void,
    onFailureCallback: () => void
  ) {
    if (typeof window?.ethereum === 'undefined') {
      console.log('Please install MetaMask');
      return;
    }

    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    const contractAbi = OrderRequestAbi;
    const contractAddress = OrderRequest;

    const contract = new ethers.Contract(contractAddress, contractAbi, this.websocketProvider);

    this.updateTimeoutId = setTimeout(() => {
      contract.off('OrderUpdateRequested');
      onFailureCallback();
      return { error: true, msg: 'Order updation Failed' };
    }, 60000);

    contract.on('OrderUpdateRequested', (orderId, senderAddress) => {
      if (senderAddress.toString().toLowerCase() === accounts[0].toString().toLowerCase()) {
        onSuccessCallback(orderId);
        this.websocketProvider?.destroy();
        contract.off('OrderUpdateRequested');
        clearTimeout(this.updateTimeoutId as NodeJS.Timeout);
        return;
      }
    });
  }
}

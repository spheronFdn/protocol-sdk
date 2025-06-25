import {
  OrderRequestDev as OrderRequest,
  BidDev as Bid,
  contractAddresses,
} from '@contracts/addresses';
import OrderRequestAbi from '@contracts/abis/testnet/OrderRequest.json';
import BidAbi from '@contracts/abis/testnet/Bid.json';
import { ethers } from 'ethers';
import { InitialOrder, OrderDetails, Tier } from './types';
import { getTokenDetails } from '@utils/index';
import { getOrderStateAsString } from '@utils/order';
import { NetworkType, RpcProvider } from '@config/index';

export class OrderModule {
  private provider: ethers.Provider;
  private createTimeoutId: NodeJS.Timeout | null;
  private updateTimeoutId: NodeJS.Timeout | null;
  private networkType: NetworkType;
  private rpcProvider: RpcProvider;

  constructor(
    provider: ethers.Provider,
    networkType: NetworkType = 'testnet',
    rpcProvider: RpcProvider
  ) {
    this.networkType = networkType;
    this.provider = provider;
    this.rpcProvider = rpcProvider;
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

      const contract = new ethers.Contract(
        contractAddresses[this.networkType].orderRequest,
        OrderRequestAbi,
        signer
      );

      const tx = await contract.createOrder(orderDetails);
      const receipt = await tx.wait();
      console.log('Order created successfully -> ', receipt);
      return receipt;
    } catch (error) {
      console.error('Error creating order -> ', error);
      throw error;
    }
  }

  async updateOrder(orderId: string, orderDetails: OrderDetails) {
    if (typeof window?.ethereum === 'undefined') {
      console.log('Please install metamask');
      return;
    }

    try {
      await window.ethereum.request({ method: 'eth_requestAccounts' });

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const contract = new ethers.Contract(
        contractAddresses[this.networkType].orderRequest,
        OrderRequestAbi,
        signer
      );

      const tx = await contract.updateInitialOrder(orderId, orderDetails);

      const receipt = await tx.wait();

      console.log('Order Update Request Sent');
      return receipt;
    } catch (error) {
      console.error('Error in updating order -> ', error);
      throw error;
    }
  }

  async getOrderDetails(leaseId: string) {
    const contractAbi = OrderRequestAbi;
    const contractAddress = contractAddresses[this.networkType].orderRequest;

    const contract = new ethers.Contract(contractAddress, contractAbi, this.provider);
    const response = await contract.getOrderById(leaseId);

    const specs = {
      specs: response.specs.specs,
      version: response.specs.version,
      mode: response.specs.mode,
      tier: response.specs.tier.map((t: bigint) => Number(t)) as Tier[],
    };

    const tokenDetails = getTokenDetails(response.token, this.networkType);
    const token = {
      symbol: tokenDetails?.symbol,
      decimal: tokenDetails?.decimal,
      address: tokenDetails?.address,
    };

    return {
      id: response.id.toString(),
      maxPrice: Number(response.maxPrice),
      numOfBlocks: Number(response.numOfBlocks),
      token,
      creator: response.creator,
      state: getOrderStateAsString(response.state),
      specs,
    } as InitialOrder;
  }

  async listenToOrderCreated(
    timeoutTime = 60000,
    onSuccessCallback: (
      orderId: string,
      providerAddress: string,
      providerId: string | number | bigint,
      acceptedPrice: string | number | bigint,
      creatorAddress: string
    ) => void,
    onFailureCallback: () => void
  ) {
    const webSocketProvider = new ethers.WebSocketProvider(this.rpcProvider.WSS_URL);
    if (!webSocketProvider) {
      console.log('Please pass websocket provider in constructor');
      return;
    }
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    const contractAbi = BidAbi;
    const contractAddress = contractAddresses[this.networkType].bid;

    const contract = new ethers.Contract(contractAddress, contractAbi, webSocketProvider);

    return new Promise((resolve, reject) => {
      this.createTimeoutId = setTimeout(() => {
        contract.off('OrderMatched');
        webSocketProvider?.destroy();
        onFailureCallback();
        reject({ error: true, msg: 'Order creation Failed' });
      }, timeoutTime);

      contract.on(
        'OrderMatched',
        (
          orderId: string,
          providerAddress: string,
          providerId: string | number | bigint,
          acceptedPrice: string | number | bigint,
          creatorAddress: string
        ) => {
          if (creatorAddress.toString().toLowerCase() === accounts[0].toString().toLowerCase()) {
            onSuccessCallback(orderId, providerAddress, providerId, acceptedPrice, creatorAddress);
            webSocketProvider?.destroy();
            contract.off('OrderMatched');
            clearTimeout(this.createTimeoutId as NodeJS.Timeout);
            resolve({ orderId, providerAddress, providerId, acceptedPrice, creatorAddress });
          }
        }
      );
    });
  }

  async listenToOrderUpdated(
    timeoutTime = 60000,
    onSuccessCallback: (
      orderId: string,
      providerAddress: string,
      tenantAddress?: string,
      acceptedPrice?: string
    ) => void,
    onFailureCallback: () => void
  ) {
    if (typeof window?.ethereum === 'undefined') {
      console.log('Please install MetaMask');
      return;
    }

    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    const contractAbi = BidAbi;
    const contractAddress = contractAddresses[this.networkType].bid;

    const webSocketProvider = new ethers.WebSocketProvider(this.rpcProvider.WSS_URL);
    const contract = new ethers.Contract(contractAddress, contractAbi, webSocketProvider);

    return new Promise((resolve, reject) => {
      this.updateTimeoutId = setTimeout(() => {
        contract.off('LeaseUpdated');
        webSocketProvider?.destroy();
        onFailureCallback();
        reject({ error: true, msg: 'Order updation Failed' });
      }, timeoutTime);

      contract.on('LeaseUpdated', (orderId, providerAddress, tenantAddress, acceptedPrice) => {
        if (tenantAddress.toString().toLowerCase() === accounts[0].toString().toLowerCase()) {
          onSuccessCallback(orderId, providerAddress, tenantAddress, acceptedPrice?.toString());
          webSocketProvider?.destroy();
          contract.off('LeaseUpdated');
          clearTimeout(this.updateTimeoutId as NodeJS.Timeout);
          resolve(orderId);
        }
      });
    });
  }

  async listenToOrderUpdateAccepted(
    timeoutTime = 60000,
    onSuccessCallback: (orderId: string, providerAddress: string) => void,
    onFailureCallback: () => void
  ) {
    if (typeof window?.ethereum === 'undefined') {
      console.log('Please install MetaMask');
      return;
    }

    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    const contractAbi = BidAbi;
    const contractAddress = contractAddresses[this.networkType].bid;

    const webSocketProvider = new ethers.WebSocketProvider(this.rpcProvider.WSS_URL);
    const contract = new ethers.Contract(contractAddress, contractAbi, webSocketProvider);

    return new Promise((resolve, reject) => {
      this.updateTimeoutId = setTimeout(() => {
        contract.off('UpdateRequestAccepted');
        webSocketProvider?.destroy();
        onFailureCallback();
        reject({ error: true, msg: 'Order updation Failed' });
      }, timeoutTime);

      contract.on('UpdateRequestAccepted', (orderId, providerAddress, tenantAddress) => {
        if (tenantAddress.toString().toLowerCase() === accounts[0].toString().toLowerCase()) {
          onSuccessCallback(orderId, providerAddress);
          webSocketProvider?.destroy();
          contract.off('UpdateRequestAccepted');
          clearTimeout(this.updateTimeoutId as NodeJS.Timeout);
          resolve(orderId);
        }
      });
    });
  }
}

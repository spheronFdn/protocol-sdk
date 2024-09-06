import { OrderRequestDev as OrderRequest, BidDev as Bid } from '@contracts/addresses';
import OrderRequestAbi from '@contracts/abis/devnet/OrderRequest.json';
import BidAbi from '@contracts/abis/devnet/Bid.json';
import { ethers } from 'ethers';
import { InitialOrder, OrderDetails, Tier } from './types';
import { getTokenDetails, initializeSigner } from '@utils/index';
import { getOrderStateAsString } from '@utils/order';
import { handleContractError } from '@utils/errors';

export class OrderModule {
  private provider: ethers.Provider;
  private websocketProvider?: ethers.WebSocketProvider;
  private createTimeoutId: NodeJS.Timeout | null;
  private updateTimeoutId: NodeJS.Timeout | null;
  private wallet: ethers.Wallet | undefined;

  constructor(
    provider: ethers.Provider,
    websocketProvider?: ethers.WebSocketProvider,
    wallet?: ethers.Wallet
  ) {
    this.provider = provider;
    this.websocketProvider = websocketProvider;
    this.createTimeoutId = null;
    this.updateTimeoutId = null;
    this.wallet = wallet;
  }

  async createOrder(orderDetails: OrderDetails) {
    try {
      const { signer } = await initializeSigner({ wallet: this.wallet });

      const contract = new ethers.Contract(OrderRequest, OrderRequestAbi, signer);

      const tx = await contract.createOrder(orderDetails);
      const receipt = await tx.wait();
      console.log('Order created successfully -> ', receipt);
      return receipt;
    } catch (error) {
      console.error('Error creating order -> ', error);
      const errorMessage = handleContractError(error, OrderRequestAbi);
      throw errorMessage;
    }
  }

  async updateOrder(orderId: string, orderDetails: OrderDetails) {
    if (typeof window?.ethereum === 'undefined') {
      console.log('Please install metamask');
      return;
    }

    try {
      const { signer } = await initializeSigner({ wallet: this.wallet });

      const contract = new ethers.Contract(OrderRequest, OrderRequestAbi, signer);

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
    const contractAddress = OrderRequest;

    const contract = new ethers.Contract(contractAddress, contractAbi, this.provider);
    const response = await contract.getOrderById(leaseId);

    const specs = {
      specs: response.specs.specs,
      version: response.specs.version,
      mode: response.specs.mode,
      tier: response.specs.tier.map((t: bigint) => Number(t)) as Tier[],
    };

    const tokenDetails = getTokenDetails(response.token, 'testnet');
    const token = {
      symbol: tokenDetails?.symbol,
      decimal: tokenDetails?.decimal,
      address: tokenDetails?.address,
    };

    return {
      id: response.id.toString(),
      uptime: Number(response.metrics[0]),
      reputation: Number(response.metrics[1]),
      slashes: Number(response.metrics[2]),
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
    if (!this.websocketProvider) {
      console.log('Please pass websocket provider in constructor');
      return;
    }
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    const contractAbi = BidAbi;
    const contractAddress = Bid;

    const contract = new ethers.Contract(contractAddress, contractAbi, this.websocketProvider);

    return new Promise((resolve, reject) => {
      this.createTimeoutId = setTimeout(() => {
        contract.off('OrderMatched');
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
            this.websocketProvider?.destroy();
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
    onSuccessCallback: (orderId: string, providerAddress: string) => void,
    onFailureCallback: () => void
  ) {
    if (typeof window?.ethereum === 'undefined') {
      console.log('Please install MetaMask');
      return;
    }

    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    const contractAbi = BidAbi;
    const contractAddress = Bid;

    const contract = new ethers.Contract(contractAddress, contractAbi, this.websocketProvider);

    return new Promise((resolve, reject) => {
      this.updateTimeoutId = setTimeout(() => {
        contract.off('leaseUpdated');
        onFailureCallback();
        reject({ error: true, msg: 'Order updation Failed' });
      }, timeoutTime);

      contract.on('leaseUpdated', (orderId, providerAddress, tenantAddress) => {
        if (tenantAddress.toString().toLowerCase() === accounts[0].toString().toLowerCase()) {
          onSuccessCallback(orderId, providerAddress);
          this.websocketProvider?.destroy();
          contract.off('leaseUpdated');
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
    const contractAddress = Bid;

    const contract = new ethers.Contract(contractAddress, contractAbi, this.websocketProvider);

    return new Promise((resolve, reject) => {
      this.updateTimeoutId = setTimeout(() => {
        contract.off('UpdateRequestAccepted');
        onFailureCallback();
        reject({ error: true, msg: 'Order updation Failed' });
      }, timeoutTime);

      contract.on('UpdateRequestAccepted', (orderId, providerAddress, tenantAddress) => {
        if (tenantAddress.toString().toLowerCase() === accounts[0].toString().toLowerCase()) {
          onSuccessCallback(orderId, providerAddress);
          this.websocketProvider?.destroy();
          contract.off('UpdateRequestAccepted');
          clearTimeout(this.updateTimeoutId as NodeJS.Timeout);
          resolve(orderId);
        }
      });
    });
  }
}

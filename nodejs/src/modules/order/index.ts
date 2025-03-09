import { OrderRequestTestnet as OrderRequest, BidTestnet as Bid } from '@contracts/addresses';
import OrderRequestAbi from '@contracts/abis/testnet/OrderRequest.json';
import BidAbi from '@contracts/abis/testnet/Bid.json';
import { ethers } from 'ethers';
import {
  InitialOrder,
  OrderDetails,
  OrderMatchedEvent,
  Tier,
  OrderUpdateAcceptedEvent,
  OrderUpdatedEvent,
} from './types';
import { getTokenDetails, initializeSigner } from '@utils/index';
import { getOrderStateAsString } from '@utils/order';
import { handleContractError } from '@utils/errors';
import { BiconomyService } from '@utils/biconomy';
import type { Paymaster } from '@config/index';

export class OrderModule {
  private provider: ethers.Provider;
  private websocketProvider?: ethers.WebSocketProvider;
  private createTimeoutId: NodeJS.Timeout | null;
  private updateTimeoutId: NodeJS.Timeout | null;
  private wallet: ethers.Wallet | undefined;
  private biconomy?: BiconomyService;


  constructor(
    provider: ethers.Provider,
    websocketProvider?: ethers.WebSocketProvider,
    wallet?: ethers.Wallet,
    paymaster?: Paymaster
  ) {
    this.provider = provider;
    this.websocketProvider = websocketProvider;
    this.createTimeoutId = null;
    this.updateTimeoutId = null;
    this.wallet = wallet;

    switch (paymaster?.type) {
      case 'biconomy':
        this.biconomy = new BiconomyService(wallet!.privateKey, paymaster.bundlerUrl, paymaster.paymasterUrl);
        break;
      case 'coinbase':
        break;
    }
  }

  async createOrder(orderDetails: OrderDetails): Promise<ethers.ContractTransactionReceipt | null> {
    try {
      const { signer } = await initializeSigner({ wallet: this.wallet });

      const contract = new ethers.Contract(OrderRequest, OrderRequestAbi, signer);

      const tx: ethers.ContractTransactionResponse = await contract.createOrder(orderDetails);
      const receipt: ethers.ContractTransactionReceipt | null = await tx.wait();
      return receipt;
    } catch (error) {
      const errorMessage = handleContractError(error, OrderRequestAbi);
      throw errorMessage;
    }
  }

  async createOrderWithPaymaster(orderDetails: OrderDetails): Promise<string> {
    if (this.biconomy) {
      // Encode vote function call    
      const encodedData = this.biconomy.encodeFunction({
        abi: ['function createOrder(OrderDetails memory details) external returns (void)'],
        functionName: 'createOrder',
        args: [orderDetails]
      });

      const txHash = await this.biconomy.sendTransaction({
        to: OrderRequest,
        data: encodedData
      });
      await this.biconomy.waitForTransaction(txHash);
      return txHash;
    } else {
      throw new Error('Not known paymaster type');
    }
  }

  async updateOrder(
    orderId: string,
    orderDetails: OrderDetails
  ): Promise<ethers.ContractTransactionReceipt | null> {
    try {
      const { signer } = await initializeSigner({ wallet: this.wallet });

      const contract = new ethers.Contract(OrderRequest, OrderRequestAbi, signer);

      const tx: ethers.ContractTransactionResponse = await contract.updateInitialOrder(
        orderId,
        orderDetails
      );
      const receipt: ethers.ContractTransactionReceipt | null = await tx.wait();
      return receipt;
    } catch (error) {
      const errorMessage = handleContractError(error, OrderRequestAbi);
      throw errorMessage;
    }
  }

  async updateOrderWithPaymaster(orderId: string, orderDetails: OrderDetails): Promise<string> {
    if (this.biconomy) {
      const encodedData = this.biconomy.encodeFunction({
        abi: ['function updateInitialOrder(uint64 _orderId, OrderDetails memory details) external (void)'],
        functionName: 'updateInitialOrder',
        args: [orderId, orderDetails]
      });

      const txHash = await this.biconomy.sendTransaction({
        to: OrderRequest,
        data: encodedData
      });
      await this.biconomy.waitForTransaction(txHash);
      return txHash;
    } else {
      throw new Error('Not known paymaster type');
    }
  }

  async getOrderDetails(leaseId: string): Promise<InitialOrder> {
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
  ): Promise<OrderMatchedEvent> {
    if (!this.websocketProvider) {
      throw new Error('Please pass websocket provider in constructor');
    }
    const { signer } = await initializeSigner({ wallet: this.wallet });
    const account = await signer.getAddress();

    const contractAbi = BidAbi;
    const contractAddress = Bid;

    const contract = new ethers.Contract(contractAddress, contractAbi, this.websocketProvider);

    return new Promise((resolve, reject) => {
      this.createTimeoutId = setTimeout(() => {
        contract.off('OrderMatched');
        onFailureCallback();
        reject({ error: true, msg: 'Order creation failed' });
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
          if (creatorAddress.toString().toLowerCase() === account.toString().toLowerCase()) {
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
    onSuccessCallback: (
      orderId: string,
      providerAddress: string,
      tenantAddress?: string,
      acceptedPrice?: string
    ) => void,
    onFailureCallback: () => void
  ): Promise<OrderUpdatedEvent> {
    if (!this.websocketProvider) {
      throw new Error('Please pass websocket provider in constructor');
    }

    const { signer } = await initializeSigner({ wallet: this.wallet });
    const account = await signer.getAddress();

    const contractAbi = BidAbi;
    const contractAddress = Bid;

    const contract = new ethers.Contract(contractAddress, contractAbi, this.websocketProvider);

    return new Promise((resolve, reject) => {
      this.updateTimeoutId = setTimeout(() => {
        contract.off('LeaseUpdated');
        onFailureCallback();
        reject({ error: true, msg: 'Order updation Failed' });
      }, timeoutTime);

      contract.on('LeaseUpdated', (orderId, providerAddress, tenantAddress, acceptedPrice) => {
        if (tenantAddress.toString().toLowerCase() === account.toString().toLowerCase()) {
          onSuccessCallback(orderId, providerAddress, tenantAddress, acceptedPrice?.toString());
          this.websocketProvider?.destroy();
          contract.off('LeaseUpdated');
          clearTimeout(this.updateTimeoutId as NodeJS.Timeout);
          resolve({ orderId, providerAddress, tenantAddress, acceptedPrice });
        }
      });
    });
  }

  async listenToOrderUpdateAccepted(
    timeoutTime = 60000,
    onSuccessCallback: (orderId: string, providerAddress: string) => void,
    onFailureCallback: () => void
  ): Promise<OrderUpdateAcceptedEvent> {
    if (!this.websocketProvider) {
      throw new Error('Please pass websocket provider in constructor');
    }

    const { signer } = await initializeSigner({ wallet: this.wallet });
    const account = await signer.getAddress();

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
        if (tenantAddress.toString().toLowerCase() === account.toString().toLowerCase()) {
          onSuccessCallback(orderId, providerAddress);
          this.websocketProvider?.destroy();
          contract.off('UpdateRequestAccepted');
          clearTimeout(this.updateTimeoutId as NodeJS.Timeout);
          resolve({ orderId, providerAddress });
        }
      });
    });
  }
}

import { contractAddresses } from '@contracts/addresses';
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
import { WaitForUserOperationReceiptReturnType } from 'viem/_types/account-abstraction';
import { NetworkType } from '@config/index';
import { abiMap } from '@contracts/abi-map';
import { TransactionReceipt } from 'viem';

export class OrderModule {
  private provider: ethers.Provider;
  private websocketProvider: ethers.WebSocketProvider | undefined;
  private createTimeoutId: NodeJS.Timeout | null;
  private updateTimeoutId: NodeJS.Timeout | null;
  private wallet: ethers.Wallet | undefined;
  private networkType: NetworkType | undefined;

  constructor(
    provider: ethers.Provider,
    websocketProvider?: ethers.WebSocketProvider,
    wallet?: ethers.Wallet,
    networkType?: NetworkType,
    private paymaster?: BiconomyService
  ) {
    this.provider = provider;
    this.websocketProvider = websocketProvider;
    this.createTimeoutId = null;
    this.updateTimeoutId = null;
    this.wallet = wallet;
    this.networkType = networkType;
  }

  async createOrder(orderDetails: OrderDetails): Promise<string | null> {
    const contractAbi = abiMap[this.networkType as NetworkType].orderRequest;
    try {
      if (this.paymaster) {
        return await this.createOrderWithPaymaster(orderDetails);
      }

      const { signer } = await initializeSigner({ wallet: this.wallet });

      const contractAddress = contractAddresses[this.networkType as NetworkType].orderRequest;
      const contractAbi = abiMap[this.networkType as NetworkType].orderRequest;

      const contract = new ethers.Contract(contractAddress, contractAbi, signer);

      const tx: ethers.ContractTransactionResponse = await contract.createOrder(orderDetails);
      const receipt: ethers.ContractTransactionReceipt | null = await tx.wait();
      return receipt?.hash || null;
    } catch (error) {
      const errorMessage = handleContractError(error, contractAbi);
      throw errorMessage;
    }
  }

  async createOrderWithPaymaster(orderDetails: OrderDetails): Promise<string | null> {
    const network = await this.provider.getNetwork();
    const chainId = network.chainId;
    const { signer } = await initializeSigner({ wallet: this.wallet });
    const claimedSigner = signer.address;

    const contractAddress = contractAddresses[this.networkType as NetworkType].orderRequest;
    const contractAbi = abiMap[this.networkType as NetworkType].orderRequest;

    const contract = new ethers.Contract(contractAddress, contractAbi, signer);
    const nonce = await contract.nonces(claimedSigner);

    const domain = {
      name: 'Spheron',
      version: '1',
      chainId,
      verifyingContract: contractAddress,
    };

    const types = {
      CreateOrder: [
        { name: 'maxPrice', type: 'uint256' },
        { name: 'numOfBlocks', type: 'uint64' },
        { name: 'token', type: 'address' },
        { name: 'nonce', type: 'uint256' },
      ],
    };

    const value = {
      maxPrice: orderDetails.maxPrice,
      numOfBlocks: orderDetails.numOfBlocks,
      token: orderDetails.token,
      nonce,
    };

    // Sign the typed data using EIP-712
    const signature = await signer.signTypedData(domain, types, value);

    const encodedData = this.paymaster?.encodeFunction({
      abi: contractAbi,
      functionName: 'createOrderWithSignature',
      args: [orderDetails, claimedSigner, nonce, signature],
    });

    const txHash = await this.paymaster?.sendTransaction({
      to: contractAddress,
      data: encodedData!,
    });
    const txReceipt = await this.paymaster?.waitForTransaction(txHash!);
    return txReceipt?.receipt.transactionHash || null;
  }

  async updateOrder(
    orderId: string,
    orderDetails: OrderDetails
  ): Promise<string | null> {
    const contractAbi = abiMap[this.networkType as NetworkType].orderRequest;
    try {
      if (this.paymaster) {
        return await this.updateOrderWithPaymaster(orderId, orderDetails);
      }

      const { signer } = await initializeSigner({ wallet: this.wallet });

      const contractAddress = contractAddresses[this.networkType as NetworkType].orderRequest;

      const contract = new ethers.Contract(contractAddress, contractAbi, signer);

      const tx: ethers.ContractTransactionResponse = await contract.updateInitialOrder(
        orderId,
        orderDetails
      );
      const receipt: ethers.ContractTransactionReceipt | null = await tx.wait();
      return receipt?.hash || null;
    } catch (error) {
      const errorMessage = handleContractError(error, contractAbi);
      throw errorMessage;
    }
  }

  async updateOrderWithPaymaster(
    orderId: string,
    orderDetails: OrderDetails
  ): Promise<string | null> {
    const encodedData = this.paymaster?.encodeFunction({
      abi: [
        'function updateInitialOrder(uint64 _orderId, OrderDetails memory details) external (void)',
      ],
      functionName: 'updateInitialOrder',
      args: [orderId, orderDetails],
    });
    const contractAddress = contractAddresses[this.networkType as NetworkType].orderRequest;

    const txHash = await this.paymaster?.sendTransaction({
      to: contractAddress,
      data: encodedData!,
    });
    const txReceipt = await this.paymaster?.waitForTransaction(txHash!);
    return txReceipt?.receipt.transactionHash || null;
  }

  async getOrderDetails(leaseId: string): Promise<InitialOrder> {
    const contractAbi = abiMap[this.networkType as NetworkType].orderRequest;
    const contractAddress = contractAddresses[this.networkType as NetworkType].orderRequest;

    const contract = new ethers.Contract(contractAddress, contractAbi, this.provider);
    const response = await contract.getOrderById(leaseId);

    const specs = {
      specs: response.specs.specs,
      version: response.specs.version,
      mode: response.specs.mode,
      tier: response.specs.tier.map((t: bigint) => Number(t)) as Tier[],
    };

    const tokenDetails = getTokenDetails(response.token, this.networkType as NetworkType);
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

    const contractAbi = abiMap[this.networkType as NetworkType].bid;
    const contractAddress = contractAddresses[this.networkType as NetworkType].bid;

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

    const contractAbi = abiMap[this.networkType as NetworkType].bid;
    const contractAddress = contractAddresses[this.networkType as NetworkType].bid;

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

    const contractAbi = abiMap[this.networkType as NetworkType].bid;
    const contractAddress = contractAddresses[this.networkType as NetworkType].bid;

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

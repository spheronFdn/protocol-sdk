import { contractAddresses } from '@contracts/addresses';
import { ethers, WebSocketProvider } from 'ethers';
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
import { NetworkType, RpcUrls, SIGNATURE_DEADLINE } from '@config/index';
import { abiMap } from '@contracts/abi-map';
import { SmartWalletBundlerClient } from '@utils/smart-wallet';

export class OrderModule {
  private provider: ethers.Provider;
  private createTimeoutId: NodeJS.Timeout | null;
  private updateTimeoutId: NodeJS.Timeout | null;
  private wallet: ethers.Wallet | undefined;
  private networkType: NetworkType | undefined;
  private rpcUrls: RpcUrls | undefined;

  constructor(
    provider: ethers.Provider,
    wallet?: ethers.Wallet,
    networkType?: NetworkType,
    private smartWalletBundlerClientPromise?: Promise<SmartWalletBundlerClient>,
    rpcUrls?: RpcUrls
  ) {
    this.provider = provider;
    this.createTimeoutId = null;
    this.updateTimeoutId = null;
    this.wallet = wallet;
    this.networkType = networkType;
    this.smartWalletBundlerClientPromise = smartWalletBundlerClientPromise;
    this.rpcUrls = rpcUrls;
  }

  async createOrder(orderDetails: OrderDetails): Promise<string | null> {
    const contractAbi = abiMap[this.networkType as NetworkType].orderRequest;
    try {
      if (this.smartWalletBundlerClientPromise) {
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
      if (this.smartWalletBundlerClientPromise) {
        throw error;
      }
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
    const deadline = Math.floor(Date.now() / 1000 + SIGNATURE_DEADLINE);

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
        { name: 'deadline', type: 'uint256' },
      ],
    };

    const value = {
      maxPrice: orderDetails.maxPrice,
      numOfBlocks: orderDetails.numOfBlocks,
      token: orderDetails.token,
      nonce,
      deadline,
    };

    // Sign the typed data using EIP-712
    const signature = await signer.signTypedData(domain, types, value);

    const smartWalletBundlerClient = await this.smartWalletBundlerClientPromise;

    try {
      const txHash = await smartWalletBundlerClient?.sendUserOperation({
        calls: [
          {
            abi: contractAbi,
            functionName: 'createOrderWithSignature',
            to: contractAddress as `0x${string}`,
            args: [orderDetails, claimedSigner, signature, nonce, deadline],
          },
        ],
      });
      const txReceipt = await smartWalletBundlerClient?.waitForUserOperationReceipt({
        hash: txHash!,
      });
      return txReceipt?.receipt.transactionHash || null;
    } catch (error) {
      throw error;
    }
  }

  async updateOrder(orderId: string, orderDetails: OrderDetails): Promise<string | null> {
    const contractAbi = abiMap[this.networkType as NetworkType].orderRequest;
    try {
      if (this.smartWalletBundlerClientPromise) {
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
      if (this.smartWalletBundlerClientPromise) {
        throw error;
      }
      const errorMessage = handleContractError(error, contractAbi);
      throw errorMessage;
    }
  }

  async updateOrderWithPaymaster(
    orderId: string,
    orderDetails: OrderDetails
  ): Promise<string | null> {
    const network = await this.provider.getNetwork();
    const chainId = network.chainId;
    const { signer } = await initializeSigner({ wallet: this.wallet });
    const claimedSigner = signer.address;

    const contractAddress = contractAddresses[this.networkType as NetworkType].orderRequest;
    const contractAbi = abiMap[this.networkType as NetworkType].orderRequest;

    const contract = new ethers.Contract(contractAddress, contractAbi, signer);
    const nonce = await contract.nonces(claimedSigner);
    const deadline = Math.floor(Date.now() / 1000 + SIGNATURE_DEADLINE);

    const domain = {
      name: 'Spheron',
      version: '1',
      chainId,
      verifyingContract: contractAddress,
    };

    const types = {
      UpdateInitialOrder: [
        { name: 'orderId', type: 'uint64' },
        { name: 'maxPrice', type: 'uint256' },
        { name: 'numOfBlocks', type: 'uint64' },
        { name: 'token', type: 'address' },
        { name: 'nonce', type: 'uint256' },
        { name: 'deadline', type: 'uint256' },
      ],
    };

    const value = {
      orderId: orderId,
      maxPrice: orderDetails.maxPrice,
      numOfBlocks: orderDetails.numOfBlocks,
      token: orderDetails.token,
      nonce,
      deadline,
    };

    // Sign the typed data using EIP-712
    const signature = await signer.signTypedData(domain, types, value);

    const smartWalletBundlerClient = await this.smartWalletBundlerClientPromise;
    try {
      const txHash = await smartWalletBundlerClient?.sendUserOperation({
        calls: [
          {
            abi: contractAbi,
            functionName: 'updateInitialOrderWithSignature',
            to: contractAddress as `0x${string}`,
            args: [orderId, orderDetails, claimedSigner, signature, nonce, deadline],
          },
        ],
      });
      const txReceipt = await smartWalletBundlerClient?.waitForUserOperationReceipt({
        hash: txHash!,
      });
      return txReceipt?.receipt.transactionHash || null;
    } catch (error) {
      throw error;
    }
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
      leaseId: string,
      providerAddress: string,
      fizzId: string | number | bigint,
      providerId: string | number | bigint,
      acceptedPrice: string | number | bigint,
      creatorAddress: string
    ) => void,
    onFailureCallback: () => void
  ): Promise<OrderMatchedEvent> {
    let orderWssProvider: WebSocketProvider | null = null;
    if (this.rpcUrls?.websocket) {
      orderWssProvider = new ethers.WebSocketProvider(this.rpcUrls?.websocket);
    }
    if (!orderWssProvider) {
      throw new Error('Order WSS provider not created');
    }
    const { signer } = await initializeSigner({ wallet: this.wallet });
    const account = await signer.getAddress();

    const contractAbi = abiMap[this.networkType as NetworkType].bid;
    const contractAddress = contractAddresses[this.networkType as NetworkType].bid;

    const contract = new ethers.Contract(contractAddress, contractAbi, orderWssProvider);

    return new Promise((resolve, reject) => {
      this.createTimeoutId = setTimeout(() => {
        contract.off('OrderMatched');
        orderWssProvider.destroy();
        onFailureCallback();
        reject({ error: true, msg: 'Order not matched within timeout' });
      }, timeoutTime);

      contract.on(
        'OrderMatched',
        (
          leaseId: string,
          providerAddress: string,
          fizzId: string | number | bigint,
          providerId: string | number | bigint,
          acceptedPrice: string | number | bigint,
          creatorAddress: string
        ) => {
          if (creatorAddress.toString().toLowerCase() === account.toString().toLowerCase()) {
            onSuccessCallback(
              leaseId,
              providerAddress,
              fizzId,
              providerId,
              acceptedPrice,
              creatorAddress
            );
            contract.off('OrderMatched');
            orderWssProvider.destroy();
            clearTimeout(this.createTimeoutId as NodeJS.Timeout);
            resolve({
              leaseId,
              providerAddress,
              fizzId,
              providerId,
              acceptedPrice,
              creatorAddress,
            });
          }
        }
      );
    });
  }

  async listenToOrderUpdated(
    timeoutTime = 60000,
    onSuccessCallback: (
      leaseId: string,
      providerAddress: string,
      tenantAddress?: string,
      acceptedPrice?: string
    ) => void,
    onFailureCallback: () => void
  ): Promise<OrderUpdatedEvent> {
    let orderWssProvider: WebSocketProvider | null = null;
    if (this.rpcUrls?.websocket) {
      orderWssProvider = new ethers.WebSocketProvider(this.rpcUrls?.websocket);
    }
    if (!orderWssProvider) {
      throw new Error('Order WSS provider not created');
    }

    const { signer } = await initializeSigner({ wallet: this.wallet });
    const account = await signer.getAddress();

    const contractAbi = abiMap[this.networkType as NetworkType].bid;
    const contractAddress = contractAddresses[this.networkType as NetworkType].bid;

    const contract = new ethers.Contract(contractAddress, contractAbi, orderWssProvider);

    return new Promise((resolve, reject) => {
      this.updateTimeoutId = setTimeout(() => {
        contract.off('LeaseUpdated');
        orderWssProvider.destroy();
        onFailureCallback();
        reject({ error: true, msg: 'Order update failed' });
      }, timeoutTime);

      contract.on('LeaseUpdated', (leaseId, providerAddress, tenantAddress, acceptedPrice) => {
        if (tenantAddress.toString().toLowerCase() === account.toString().toLowerCase()) {
          onSuccessCallback(leaseId, providerAddress, tenantAddress, acceptedPrice?.toString());
          contract.off('LeaseUpdated');
          orderWssProvider.destroy();
          clearTimeout(this.updateTimeoutId as NodeJS.Timeout);
          resolve({ leaseId, providerAddress, tenantAddress, acceptedPrice });
        }
      });
    });
  }

  async listenToOrderUpdateAccepted(
    timeoutTime = 60000,
    onSuccessCallback: (leaseId: string, providerAddress: string) => void,
    onFailureCallback: () => void
  ): Promise<OrderUpdateAcceptedEvent> {
    let orderWssProvider: WebSocketProvider | null = null;
    if (this.rpcUrls?.websocket) {
      orderWssProvider = new ethers.WebSocketProvider(this.rpcUrls?.websocket);
    }
    if (!orderWssProvider) {
      throw new Error('Order WSS provider not created');
    }

    const { signer } = await initializeSigner({ wallet: this.wallet });
    const account = await signer.getAddress();

    const contractAbi = abiMap[this.networkType as NetworkType].bid;
    const contractAddress = contractAddresses[this.networkType as NetworkType].bid;

    const contract = new ethers.Contract(contractAddress, contractAbi, orderWssProvider);

    return new Promise((resolve, reject) => {
      this.updateTimeoutId = setTimeout(() => {
        contract.off('UpdateRequestAccepted');
        orderWssProvider.destroy();
        onFailureCallback();
        reject({ error: true, msg: 'Order not accepted within timeout' });
      }, timeoutTime);

      contract.on('UpdateRequestAccepted', async (leaseId, providerAddress, tenantAddress) => {
        if (tenantAddress.toString().toLowerCase() === account.toString().toLowerCase()) {
          await onSuccessCallback(leaseId, providerAddress);
          contract.off('UpdateRequestAccepted');
          orderWssProvider.destroy();
          clearTimeout(this.updateTimeoutId as NodeJS.Timeout);
          resolve({ leaseId, providerAddress });
        }
      });
    });
  }
}

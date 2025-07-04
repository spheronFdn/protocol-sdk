import { contractAddresses } from '@contracts/addresses';
import { OrderModule } from '@modules/order';
import { getTokenDetails, initializeSigner } from '@utils/index';
import { ethers, WebSocketProvider } from 'ethers';
import { Lease, LeaseState, LeaseWithOrderDetails } from './types';
import { getLeaseStateAsString } from '@utils/lease';
import { DEFAULT_PAGE_SIZE, NetworkType, RpcUrls, SIGNATURE_DEADLINE } from '@config/index';
import { FizzModule } from '@modules/fizz';
import { ProviderModule } from '@modules/provider';
import { handleContractError } from '@utils/errors';
import { FizzDetails } from '@modules/fizz/types';
import { Provider } from '@modules/provider/types';
import { abiMap } from '@contracts/abi-map';
import { type SmartWalletBundlerClient } from '@utils/smart-wallet';

export class LeaseModule {
  private provider: ethers.Provider;
  private orderModule: OrderModule;
  private fizzModule: FizzModule;
  private providerModule: ProviderModule;
  private leaseCloseTimeoutId: NodeJS.Timeout | null;
  private wallet: ethers.Wallet | undefined;
  private networkType: NetworkType | undefined;
  private rpcUrls: RpcUrls | undefined;

  constructor(
    provider: ethers.Provider,
    wallet?: ethers.Wallet,
    networkType?: NetworkType,
    private smartWalletBundlerClientPromise?: Promise<SmartWalletBundlerClient>,
    rpcUrls?: RpcUrls,
  ) {
    this.provider = provider;
    this.getLeaseDetails = this.getLeaseDetails.bind(this);
    this.orderModule = new OrderModule(
      provider,
      wallet,
      networkType,
      smartWalletBundlerClientPromise,
      rpcUrls
    );
    this.fizzModule = new FizzModule(provider, wallet, networkType, rpcUrls);
    this.providerModule = new ProviderModule(provider, networkType);
    this.leaseCloseTimeoutId = null;
    this.wallet = wallet;
    this.networkType = networkType;
    this.smartWalletBundlerClientPromise = smartWalletBundlerClientPromise;
  }

  async getLeaseDetails(leaseId: string): Promise<Lease> {
    const contractAbi = abiMap[this.networkType as NetworkType].computeLease;
    const contractAddress = contractAddresses[this.networkType as NetworkType].computeLease;

    const contract = new ethers.Contract(contractAddress, contractAbi, this.provider);
    const response = await contract.leases(leaseId);
    const leaseHourlyCost = (Number(response.acceptedPrice) * 1800) / 10 ** 18;

    const lease: Lease = {
      leaseId: response.leaseId.toString(),
      fizzId: response.fizzId.toString(),
      requestId: response.requestId.toString(),
      acceptedPrice: Number(response.acceptedPrice),
      leaseHourlyCost,
      providerAddress: response.providerAddress.toString(),
      tenantAddress: response.tenantAddress.toString(),
      startBlock: response.startBlock.toString(),
      startTime: Number(response.startTime),
      endTime: Number(response.endTime),
      state: getLeaseStateAsString(response.state.toString()) as LeaseState,
    };

    return lease;
  }

  async getLeaseIds(address: string) {
    const contractAbi = abiMap[this.networkType as NetworkType].computeLease;
    const contractAddress = contractAddresses[this.networkType as NetworkType].computeLease;

    const contract = new ethers.Contract(contractAddress, contractAbi, this.provider);
    const response = await contract.getTenantLeases(address);

    const activeLeaseIds = response[0].map((id: bigint) => id.toString()) as string[];
    const allLeaseIds = response[1].map((id: bigint) => id.toString()) as string[];

    const terminatedLeaseIds = allLeaseIds.filter((lId) => {
      return !activeLeaseIds.includes(lId);
    });

    return {
      activeLeaseIds,
      allLeaseIds,
      terminatedLeaseIds,
    };
  }

  async getLeasesByState(
    address: string,
    options?: { state?: LeaseState; page?: number; pageSize?: number }
  ) {
    const { activeLeaseIds, terminatedLeaseIds, allLeaseIds } = await this.getLeaseIds(address);

    let leaseIds = allLeaseIds;
    const totalCount = allLeaseIds.length;
    const terminatedCount = terminatedLeaseIds.length;
    const activeCount = activeLeaseIds.length;

    if (options?.state) {
      switch (options.state) {
        case LeaseState.ACTIVE:
          leaseIds = activeLeaseIds;
          break;
        case LeaseState.TERMINATED:
          leaseIds = terminatedLeaseIds;
          break;
      }
    }

    leaseIds.sort((a, b) => Number(b) - Number(a));

    if (options?.page) {
      const pageSize = options.pageSize || DEFAULT_PAGE_SIZE;
      leaseIds = leaseIds.slice((options.page - 1) * pageSize, options.page * pageSize);
    }

    const filteredLeases = await Promise.all(leaseIds.map((lId) => this.getLeaseDetails(lId)));
    const orderDetails = await Promise.all(
      leaseIds.map((lId) => this.orderModule.getOrderDetails(lId))
    );

    const leaseWithToken: LeaseWithOrderDetails[] = await Promise.all(
      filteredLeases.map(async (lease, index) => {
        const order = orderDetails[index];
        let tokenDetails;
        if (order.token?.address)
          tokenDetails = getTokenDetails(order.token.address, this.networkType as NetworkType);

        let region;
        if (lease.fizzId.toString() !== '0') {
          const fizz: FizzDetails = await this.fizzModule.getFizzById(BigInt(lease.fizzId));
          region = fizz?.region;
        } else {
          const provider: Provider = await this.providerModule.getProviderByAddress(
            lease.providerAddress
          );
          region = provider?.region;
        }

        return {
          ...lease,
          name: order.name,
          tier: order.specs.tier,
          region: region,
          token: {
            symbol: tokenDetails?.symbol,
            decimal: tokenDetails?.decimal,
          },
        };
      })
    );

    return {
      leases: leaseWithToken,
      activeCount,
      terminatedCount,
      totalCount,
    };
  }

  async closeLease(leaseId: string): Promise<string | null> {
    if (this.smartWalletBundlerClientPromise) {
      return await this.closeLeaseWithPaymaster(leaseId);
    }
    const contractAbi = abiMap[this.networkType as NetworkType].computeLease;
    const contractAddress = contractAddresses[this.networkType as NetworkType].computeLease;
    try {
      const { signer } = await initializeSigner({ wallet: this.wallet });
      const contract = new ethers.Contract(contractAddress, contractAbi, signer);
      const tx = await contract.closeLease(leaseId);
      const receipt = await tx.wait();
      return receipt?.hash || null;
    } catch (error) {
      const errorMessage = handleContractError(error, contractAbi);
      throw errorMessage;
    }
  }

  async closeLeaseWithPaymaster(leaseId: string): Promise<string | null> {
    const contractAddress = contractAddresses[this.networkType as NetworkType].computeLease;
    const contractAbi = abiMap[this.networkType as NetworkType].computeLease;

    const network = await this.provider.getNetwork();
    const chainId = network.chainId;

    const bundlerClient = await this.smartWalletBundlerClientPromise;

    const { signer } = await initializeSigner({ wallet: this.wallet });
    const claimedSigner = signer.address;

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
        { name: 'leaseId', type: 'uint256' },
        { name: 'nonce', type: 'uint256' },
        { name: 'deadline', type: 'uint256' },
      ],
    };

    const value = {
      leaseId,
      nonce,
      deadline,
    };

    // Sign the typed data using EIP-712
    const signature = await signer.signTypedData(domain, types, value);

    try {
      const txHash = await bundlerClient?.sendUserOperation({
        calls: [
          {
            abi: contractAbi,
            functionName: 'closeLeaseWithSignature',
            to: contractAddress as `0x${string}`,
            args: [leaseId, claimedSigner, signature, nonce, deadline],
          },
        ],
      });
      const txReceipt = await bundlerClient?.waitForUserOperationReceipt({ hash: txHash! });
      return txReceipt?.receipt.transactionHash || null;
    } catch (error) {
      throw error;
    }
  }

  async listenToLeaseClosedEvent(
    onSuccessCallback: ({
      leaseId,
      providerAddress,
      tenantAddress,
    }: {
      leaseId: string;
      providerAddress: string;
      tenantAddress: string;
    }) => void,
    onFailureCallback: () => void,
    timeout = 60000
  ) {
    let leaseWssProvider: WebSocketProvider | null = null;
    if (this.rpcUrls?.websocket) {
      leaseWssProvider = new ethers.WebSocketProvider(this.rpcUrls?.websocket);
    }
    if (!leaseWssProvider) {
      throw new Error('Lease WSS provider not created');
    }

    const { signer } = await initializeSigner({ wallet: this.wallet });
    const account = await signer.getAddress();
    const contractAbi = abiMap[this.networkType as NetworkType].computeLease;
    const contractAddress = contractAddresses[this.networkType as NetworkType].computeLease;

    const contract = new ethers.Contract(contractAddress, contractAbi, leaseWssProvider);

    return new Promise((resolve, reject) => {
      this.leaseCloseTimeoutId = setTimeout(() => {
        contract.off('LeaseClosed');
        onFailureCallback();
        reject({ error: true, msg: 'Lease Close Failed' });
      }, timeout);

      contract.on(
        'LeaseClosed',
        (orderId: string, providerAddress: string, tenantAddress: string) => {
          if (
            providerAddress.toString().toLowerCase() === account.toString().toLowerCase() ||
            tenantAddress.toString().toLowerCase() === account.toString().toLowerCase()
          ) {
            onSuccessCallback({ leaseId: orderId, providerAddress, tenantAddress });
            contract.off('LeaseClosed');
            clearTimeout(this.leaseCloseTimeoutId as NodeJS.Timeout);
            resolve({ leaseId: orderId, providerAddress, tenantAddress });
          }
        }
      );
    });
  }
}

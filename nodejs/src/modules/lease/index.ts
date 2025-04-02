import ComputeLeaseAbi from '@contracts/abis/testnet/ComputeLease.json';
import { ComputeLeaseTestnet as ComputeLease } from '@contracts/addresses';
import { OrderModule } from '@modules/order';
import { getTokenDetails, initializeSigner } from '@utils/index';
import { ethers } from 'ethers';
import { Lease, LeaseState, LeaseWithOrderDetails } from './types';
import { getLeaseStateAsString } from '@utils/lease';
import { DEFAULT_PAGE_SIZE, Paymaster } from '@config/index';
import { FizzModule } from '@modules/fizz';
import { ProviderModule } from '@modules/provider';
import { handleContractError } from '@utils/errors';
import { FizzDetails } from '@modules/fizz/types';
import { Provider } from '@modules/provider/types';
import { BiconomyService } from '@utils/biconomy';

export class LeaseModule {
  private orderModule: OrderModule;
  private fizzModule: FizzModule;
  private providerModule: ProviderModule;
  private leaseCloseTimeoutId: NodeJS.Timeout | null;

  constructor(
    private provider: ethers.Provider,
    private websocketProvider?: ethers.WebSocketProvider,
    private wallet?: ethers.Wallet,
    private paymaster?: BiconomyService
  ) {
    this.getLeaseDetails = this.getLeaseDetails.bind(this);
    this.orderModule = new OrderModule(provider, websocketProvider, wallet, paymaster);
    this.fizzModule = new FizzModule(provider, websocketProvider, wallet);
    this.providerModule = new ProviderModule(provider);
    this.leaseCloseTimeoutId = null;
  }

  async getLeaseDetails(leaseId: string) {
    const contractAbi = ComputeLeaseAbi;
    const contractAddress = ComputeLease;

    const contract = new ethers.Contract(contractAddress, contractAbi, this.provider);
    const response = await contract.leases(leaseId);

    const lease: Lease = {
      leaseId: response.leaseId.toString(),
      fizzId: response.fizzId.toString(),
      requestId: response.requestId.toString(),
      acceptedPrice: Number(response.acceptedPrice),
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
    const contractAbi = ComputeLeaseAbi;
    const contractAddress = ComputeLease;

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
        if (order.token?.address) tokenDetails = getTokenDetails(order.token.address, 'testnet');

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
    if (this.paymaster) {
      return await this.closeLeaseWithPaymaster(leaseId);
    }

    const contractAbi = ComputeLeaseAbi;
    const contractAddress = ComputeLease;
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
    const encodedData = this.paymaster?.encodeFunction({
      abi: ['function closeLease(uint256 _leaseId) external nonReentrant (void)'],
      functionName: 'closeLease',
      args: [leaseId],
    });

    const txHash = await this.paymaster?.sendTransaction({
      to: ComputeLease,
      data: encodedData!,
    });
    const txReceipt = await this.paymaster?.waitForTransaction(txHash!);
    return txReceipt?.receipt.transactionHash || null;
  }

  async listenToLeaseClosedEvent(
    onSuccessCallback: ({
      orderId,
      providerAddress,
      tenantAddress,
    }: {
      orderId: string;
      providerAddress: string;
      tenantAddress: string;
    }) => void,
    onFailureCallback: () => void,
    timeout = 60000
  ) {
    if (!this.websocketProvider) {
      throw new Error('Please pass websocket provider in constructor');
    }
    const { signer } = await initializeSigner({ wallet: this.wallet });
    const account = await signer.getAddress();
    const contractAbi = ComputeLeaseAbi;
    const contractAddress = ComputeLease;

    const contract = new ethers.Contract(contractAddress, contractAbi, this.websocketProvider);

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
            onSuccessCallback({ orderId, providerAddress, tenantAddress });
            this.websocketProvider?.destroy();
            contract.off('LeaseClosed');
            clearTimeout(this.leaseCloseTimeoutId as NodeJS.Timeout);
            resolve({ orderId, providerAddress, tenantAddress });
          }
        }
      );
    });
  }
}

import FizzRegistryAbi from '@contracts/abis/testnet/FizzRegistry.json';
import FizzAttributeRegistryAbi from '@contracts/abis/testnet/FizzAttributeRegistry.json';
import ResourceRegistryAbi from '@contracts/abis/testnet/ResourceRegistry.json';
import ComputeLeaseAbi from '@contracts/abis/testnet/ComputeLease.json';
import { contractAddresses } from '@contracts/addresses';
import { ethers } from 'ethers';
import {
  FizzNode,
  FizzParams,
  FizzLease,
  Resource,
  FizzAttribute,
  FizzDetails,
  RawFizzNode,
  RawFizzAttribute,
  FizzStatusResponse,
  // FizzProviderTrustTier,
} from './types';
import { initializeSigner, requestPipeline } from '@utils/index';
import { handleContractError } from '@utils/errors';
import { ProviderModule } from '@modules/provider';
import { NetworkType } from '@config/index';
import { abiMap } from '@contracts/abi-map';
import { subgraphGetProviders } from '@utils/subgraph';
import { Provider, ProviderStatus } from '@modules/provider/types';
import { createAuthorizationToken } from '@utils/provider-auth';

export class FizzModule {
  private provider: ethers.Provider;
  private webSocketProvider: ethers.WebSocketProvider | undefined;
  private timeoutId: NodeJS.Timeout | undefined;
  private wallet: ethers.Wallet | undefined;
  private providerModule: ProviderModule;
  private networkType: NetworkType | undefined;

  constructor(
    provider: ethers.Provider,
    webSocketProvider?: ethers.WebSocketProvider,
    wallet?: ethers.Wallet,
    networkType?: NetworkType
  ) {
    this.provider = provider;
    this.webSocketProvider = webSocketProvider;
    this.wallet = wallet;
    this.providerModule = new ProviderModule(provider, networkType);
    this.networkType = networkType;
  }

  async addFizzNode(fizzParams: FizzParams): Promise<unknown> {
    try {
      const { signer } = await initializeSigner({ wallet: this.wallet });

      const contractAddress = contractAddresses[this.networkType as NetworkType].fizzRegistry;
      const abi = abiMap[this.networkType as NetworkType].fizzRegistry;
      const contract = new ethers.Contract(contractAddress, abi, signer);

      const tx = await contract.addFizzNode(fizzParams);
      const receipt = await tx.wait();

      return { tx, receipt };
    } catch (error) {
      const errorMessage = handleContractError(error, FizzRegistryAbi);
      throw errorMessage;
    }
  }

  async updateFizzName(newName: string): Promise<unknown> {
    try {
      const { signer } = await initializeSigner({ wallet: this.wallet });

      // Contract address (hardcoded or retrieved from an environment variable)
      const contractAddress = contractAddresses[this.networkType as NetworkType].fizzRegistry;
      const abi = abiMap[this.networkType as NetworkType].fizzRegistry;
      const contract = new ethers.Contract(contractAddress, abi, signer);

      const tx = await contract.updateFizzName(newName);

      const receipt = await tx.wait();

      return { tx, receipt };
    } catch (error) {
      const errorMessage = handleContractError(error, FizzRegistryAbi);
      throw errorMessage;
    }
  }

  async getFizzById(fizzId: bigint): Promise<FizzDetails> {
    try {
      const contractAddress = contractAddresses[this.networkType as NetworkType].fizzRegistry;
      const contractAbi = abiMap[this.networkType as NetworkType].fizzRegistry;

      const contract = new ethers.Contract(contractAddress, contractAbi, this.provider);

      const fizzDetails = await contract.getFizz(fizzId);

      const {
        providerId,
        spec,
        paymentsAccepted,
        status,
        joinTimestamp,
        walletAddress,
        rewardWallet,
      } = fizzDetails;

      return {
        region: spec?.split(',')?.[7] ?? '',
        providerId,
        spec,
        paymentsAccepted,
        status,
        joinTimestamp,
        walletAddress,
        rewardWallet,
      };
    } catch (error) {
      const errorMessage = handleContractError(error, FizzRegistryAbi);
      throw errorMessage;
    }
  }

  async getFizzNodeByAddress(walletAddress: string) {
    try {
      const contractAddress = contractAddresses[this.networkType as NetworkType].fizzRegistry;
      const contractAbi = abiMap[this.networkType as NetworkType].fizzRegistry;

      const contract = new ethers.Contract(contractAddress, contractAbi, this.provider);

      const fizzId = await contract.addressToFizzId(walletAddress);
      const fizzNode: FizzDetails = await this.getFizzById(fizzId);

      const result: FizzNode = {
        region: fizzNode.spec?.split(',')?.[7] ?? '',
        fizzId,
        providerId: fizzNode.providerId,
        spec: fizzNode.spec,
        walletAddress: fizzNode.walletAddress,
        paymentsAccepted: fizzNode.paymentsAccepted,
        status: Number(fizzNode.status.toString()),
        joinTimestamp: fizzNode.joinTimestamp,
        rewardWallet: fizzNode.rewardWallet,
      };

      return result;
    } catch (error) {
      const errorMessage = handleContractError(error, FizzRegistryAbi);
      throw errorMessage;
    }
  }

  async getTotalFizzNodes(): Promise<bigint> {
    try {
      const contractAddress = contractAddresses[this.networkType as NetworkType].fizzRegistry;
      const contractAbi = abiMap[this.networkType as NetworkType].fizzRegistry;

      const contract = new ethers.Contract(contractAddress, contractAbi, this.provider);
      const fizzCounter = await contract.nextFizzId();
      return fizzCounter;
    } catch (error) {
      const errorMessage = handleContractError(error, FizzRegistryAbi);
      throw errorMessage;
    }
  }

  async getAllFizzNodes(): Promise<FizzNode[]> {
    try {
      const contractAddress = contractAddresses[this.networkType as NetworkType].fizzRegistry;
      const contractAbi = abiMap[this.networkType as NetworkType].fizzRegistry;

      const contract = new ethers.Contract(contractAddress, contractAbi, this.provider);

      const allFizzNodes = await contract.getAllFizzNodes();

      const fizzNodes: FizzNode[] = allFizzNodes.map((fizzNode: RawFizzNode) => ({
        fizzId: fizzNode[0],
        providerId: fizzNode[1],
        spec: fizzNode[2],
        walletAddress: fizzNode[3],
        paymentsAccepted: fizzNode[4],
        status: fizzNode[5],
        joinTimestamp: fizzNode[6],
        rewardWallet: fizzNode[7],
      }));

      return fizzNodes;
    } catch (error) {
      const errorMessage = handleContractError(error, FizzRegistryAbi);
      throw errorMessage;
    }
  }

  async getActiveFizzNodes(providerProxyUrl: string): Promise<FizzStatusResponse[]> {
    if (!this.wallet) throw new Error('Wallet not found');
    try {
      let providers: Awaited<ReturnType<typeof subgraphGetProviders>> | null | Provider[] = null;
      if (this.networkType) {
        providers = await subgraphGetProviders(this.networkType);
      } else {
        providers = await this.providerModule.getAllProviders();
      }

      const authToken = createAuthorizationToken(this.wallet);

      const fizzNodes = (
        await Promise.allSettled(
          providers
            .filter(
              (p) =>
                p.hostUri !== 'localhost' &&
                (p.status === 'Active' || p.status === ProviderStatus.Active) &&
                p.region !== 'dev-spheron'
            )
            .map(async (p) => {
              const reqBody = {
                certificate: p.certificate,
                authToken,
                method: 'GET',
                url: `https://${p.hostUri}:8543/status`,
              };

              const url = `${providerProxyUrl}`;
              try {
                const response = await requestPipeline({
                  url,
                  method: 'POST',
                  body: JSON.stringify(reqBody),
                  options: {
                    signal: AbortSignal.timeout(2000),
                  },
                });
                return response;
              } catch (error) {
                return { cluster: { inventory: { available: { nodes: [] } } } };
              }
            })
        )
      )
        .map((result) => {
          if (result.status === 'fulfilled') {
            return result.value.cluster.inventory.available;
          } else {
            console.error(`Failed to get fizz nodes for provider: ${result.reason}`);
            return { nodes: [] };
          }
        })
        .map((i) => i.nodes)
        .flat();

      return fizzNodes;
    } catch (error) {
      const errorMessage = handleContractError(error, FizzRegistryAbi);
      throw errorMessage;
    }
  }

  async getAttributes(providerAddress: string, category: string): Promise<FizzAttribute[]> {
    try {
      const contractAddress =
        contractAddresses[this.networkType as NetworkType].fizzAttributeRegistry;
      const contractAbi = abiMap[this.networkType as NetworkType].fizzAttributeRegistry;

      const contract = new ethers.Contract(contractAddress, contractAbi, this.provider);

      const attributes: RawFizzAttribute[] = await contract.getAttributes(
        providerAddress,
        category
      );

      const decoratedAttributes = attributes.map((attr: RawFizzAttribute) => ({
        id: attr[0],
        units: attr[1],
      }));
      return decoratedAttributes;
    } catch (error) {
      const errorMessage = handleContractError(error, FizzAttributeRegistryAbi);
      throw errorMessage;
    }
  }

  async getPendingAttributes(providerAddress: string, category: string): Promise<FizzAttribute[]> {
    try {
      const contractAddress =
        contractAddresses[this.networkType as NetworkType].fizzAttributeRegistry;
      const contractAbi = abiMap[this.networkType as NetworkType].fizzAttributeRegistry;

      const contract = new ethers.Contract(contractAddress, contractAbi, this.provider);

      const attributes: RawFizzAttribute[] = await contract.getPendingAttributes(
        providerAddress,
        category
      );

      const decoratedAttributes = attributes.map((attr: RawFizzAttribute) => ({
        id: attr[0],
        units: attr[1],
      }));
      return decoratedAttributes;
    } catch (error) {
      const errorMessage = handleContractError(error, FizzAttributeRegistryAbi);
      throw errorMessage;
    }
  }

  async getResource(resourceID: bigint, category: string): Promise<Resource> {
    try {
      const contractAbi = abiMap[this.networkType as NetworkType].resourceRegistry;
      const contractAddress =
        category === 'CPU'
          ? contractAddresses[this.networkType as NetworkType].fizzResourceRegistryCPU
          : contractAddresses[this.networkType as NetworkType].fizzResourceRegistryGPU;

      const contract = new ethers.Contract(contractAddress, contractAbi, this.provider);

      const [name, tier, multiplier]: [string, string, bigint] = await contract.getResource(
        resourceID
      );

      const resource: Resource = { name, tier, multiplier };

      return resource;
    } catch (error) {
      const errorMessage = handleContractError(error, ResourceRegistryAbi);
      throw errorMessage;
    }
  }

  async getFizzLeases(
    fizzId: bigint,
    providerId: bigint,
    state?: string
  ): Promise<FizzLease[] | unknown> {
    try {
      const providerData = await this.providerModule.getProvider(providerId);
      const walletAddress = providerData.walletAddress;

      const leaseContractAddress = contractAddresses[this.networkType as NetworkType].computeLease;
      const leaseContractAbi = abiMap[this.networkType as NetworkType].computeLease;
      const leaseContract = new ethers.Contract(
        leaseContractAddress,
        leaseContractAbi,
        this.provider
      );
      const [activeLeases, allLeases] = await leaseContract.getProviderLeases(walletAddress);

      const selectedLeases = state === 'ACTIVE' ? activeLeases : allLeases;
      const leases: FizzLease[] = [];

      for (const leaseId of selectedLeases) {
        const leaseData = await leaseContract.leases(leaseId);

        // Filter by fizzId
        if (leaseData.fizzId === fizzId) {
          const lease: FizzLease = {
            leaseId: leaseData.leaseId,
            fizzId: leaseData.fizzId,
            requestId: leaseData.requestId,
            resourceAttribute: leaseData.resourceAttributes,
            acceptedPrice: leaseData.acceptedPrice,
            providerAddress: leaseData.providerAddress,
            tenantAddress: leaseData.tenantAddress,
            startBlock: leaseData.startBlock,
            startTime: leaseData.startTime,
            endTime: leaseData.endTime,
            state: leaseData.state,
          };

          leases.push(lease);
        }
      }

      return leases;
    } catch (error) {
      const errorMessage = handleContractError(error, ComputeLeaseAbi);
      throw errorMessage;
    }
  }

  async listenToFizzCreated(
    onSuccessCallback: (fizzId: bigint, walletAddress: string) => void,
    onFailureCallback: () => void,
    timeoutTime = 60000
  ) {
    const contractAddress = contractAddresses[this.networkType as NetworkType].fizzRegistry;
    const contractAbi = abiMap[this.networkType as NetworkType].fizzRegistry;

    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const contract = new ethers.Contract(contractAddress, contractAbi, this.webSocketProvider);

      return new Promise((resolve, reject) => {
        this.timeoutId = setTimeout(() => {
          contract.off('FizzNodeAdded');
          onFailureCallback();
          reject({ error: true, msg: 'Fizz creation failed' });
        }, timeoutTime);

        contract.on('FizzNodeAdded', (fizzId: bigint, walletAddress: string) => {
          if (walletAddress.toString().toLowerCase() === accounts[0].toString().toLowerCase()) {
            onSuccessCallback(fizzId, walletAddress);
            this.webSocketProvider?.destroy();
            contract.off('FizzNodeAdded');
            clearTimeout(this.timeoutId as NodeJS.Timeout);
            resolve({ fizzId, walletAddress });
          }
        });
      });
    } catch (error) {
      const errorMessage = handleContractError(error, FizzRegistryAbi);
      throw errorMessage;
    }
  }

  async updateFizzSpecs(specs: string) {
    try {
      const { signer } = await initializeSigner({ wallet: this.wallet });

      const contractAddress = contractAddresses[this.networkType as NetworkType].fizzRegistry;
      const contractAbi = abiMap[this.networkType as NetworkType].fizzRegistry;

      const contract = new ethers.Contract(contractAddress, contractAbi, signer);

      const tx = await contract.updateFizzSpec(specs);

      const receipt = await tx.wait();

      return receipt;
    } catch (error) {
      const errorMessage = handleContractError(error, FizzRegistryAbi);
      throw errorMessage;
    }
  }

  async listenSpecUpdated(
    onSuccessCallback: (fizzId: bigint, specs: string, walletAddress: string) => void,
    onFailureCallback: () => void,
    timeoutTime = 60000
  ) {
    const contractAddress = contractAddresses[this.networkType as NetworkType].fizzRegistry;
    const contractAbi = abiMap[this.networkType as NetworkType].fizzRegistry;

    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const contract = new ethers.Contract(contractAddress, contractAbi, this.webSocketProvider);

      let timeoutId: NodeJS.Timeout | undefined;

      return new Promise((resolve, reject) => {
        timeoutId = setTimeout(() => {
          contract.off('FizzNodeSpecUpdated');
          onFailureCallback();
          reject({ error: true, msg: 'Fizz update failed' });
        }, timeoutTime);

        contract.on('FizzNodeSpecUpdated', async (fizzId: bigint, specs: string) => {
          const fizz: FizzDetails = await this.getFizzById(fizzId);
          if (
            fizz.walletAddress.toString().toLowerCase() === accounts[0].toString().toLowerCase()
          ) {
            onSuccessCallback(fizzId, specs, fizz.walletAddress);
            this.webSocketProvider?.destroy();
            contract.off('FizzNodeSpecUpdated');
            clearTimeout(timeoutId as NodeJS.Timeout);
            resolve({ fizzId, specs, walletAddress: fizz.walletAddress });
          }
        });
      });
    } catch (error) {
      const errorMessage = handleContractError(error, FizzRegistryAbi);
      throw errorMessage;
    }
  }

  async updateFizzRegion(region: string) {
    try {
      const { signer } = await initializeSigner({ wallet: this.wallet });

      const contractAddress = contractAddresses[this.networkType as NetworkType].fizzRegistry;
      const contractAbi = abiMap[this.networkType as NetworkType].fizzRegistry;

      const contract = new ethers.Contract(contractAddress, contractAbi, signer);

      const tx = await contract.updateFizzRegion(region);

      const receipt = await tx.wait();

      return receipt;
    } catch (error) {
      const errorMessage = handleContractError(error, FizzRegistryAbi);
      throw errorMessage;
    }
  }

  async listenRegionUpdated(
    onSuccessCallback: (fizzId: bigint, region: string, walletAddress: string) => void,
    onFailureCallback: () => void,
    timeoutTime = 60000
  ) {
    const contractAddress = contractAddresses[this.networkType as NetworkType].fizzRegistry;
    const contractAbi = abiMap[this.networkType as NetworkType].fizzRegistry;

    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const contract = new ethers.Contract(contractAddress, contractAbi, this.webSocketProvider);

      let timeoutId: NodeJS.Timeout | undefined;

      return new Promise((resolve, reject) => {
        timeoutId = setTimeout(() => {
          contract.off('FizzNodeRegionUpdated');
          onFailureCallback();
          reject({ error: true, msg: 'Fizz update failed' });
        }, timeoutTime);

        contract.on('FizzNodeRegionUpdated', async (fizzId: bigint, region: string) => {
          const fizz: FizzDetails = await this.getFizzById(fizzId);
          if (
            fizz.walletAddress.toString().toLowerCase() === accounts[0].toString().toLowerCase()
          ) {
            onSuccessCallback(fizzId, region, fizz.walletAddress);
            this.webSocketProvider?.destroy();
            contract.off('FizzNodeRegionUpdated');
            clearTimeout(timeoutId as NodeJS.Timeout);
            resolve({ fizzId, region, walletAddress: fizz.walletAddress });
          }
        });
      });
    } catch (error) {
      const errorMessage = handleContractError(error, FizzRegistryAbi);
      throw errorMessage;
    }
  }

  async updateFizzProvider(providerId: bigint) {
    try {
      const { signer } = await initializeSigner({ wallet: this.wallet });

      const contractAddress = contractAddresses[this.networkType as NetworkType].fizzRegistry;
      const contractAbi = abiMap[this.networkType as NetworkType].fizzRegistry;

      const contract = new ethers.Contract(contractAddress, contractAbi, signer);

      const tx = await contract.updateFizzProviderId(providerId);

      const receipt = await tx.wait();

      return receipt;
    } catch (error) {
      const errorMessage = handleContractError(error, FizzRegistryAbi);
      throw errorMessage;
    }
  }

  async listenProviderUpdated(
    onSuccessCallback: (fizzId: bigint, providerId: bigint, walletAddress: string) => void,
    onFailureCallback: () => void,
    timeoutTime = 60000
  ) {
    const contractAddress = contractAddresses[this.networkType as NetworkType].fizzRegistry;
    const contractAbi = abiMap[this.networkType as NetworkType].fizzRegistry;

    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const contract = new ethers.Contract(contractAddress, contractAbi, this.webSocketProvider);

      let timeoutId: NodeJS.Timeout | undefined;

      return new Promise((resolve, reject) => {
        timeoutId = setTimeout(() => {
          contract.off('FizzNodeProviderIdUpdated');
          onFailureCallback();
          reject({ error: true, msg: 'Fizz update failed' });
        }, timeoutTime);

        contract.on('FizzNodeProviderIdUpdated', async (fizzId: bigint, providerId: bigint) => {
          const fizz: FizzDetails = await this.getFizzById(fizzId);
          if (
            fizz.walletAddress.toString().toLowerCase() === accounts[0].toString().toLowerCase()
          ) {
            onSuccessCallback(fizzId, providerId, fizz.walletAddress);
            this.webSocketProvider?.destroy();
            contract.off('FizzNodeProviderIdUpdated');
            clearTimeout(timeoutId as NodeJS.Timeout);
            resolve({ fizzId, providerId, walletAddress: fizz.walletAddress });
          }
        });
      });
    } catch (error) {
      const errorMessage = handleContractError(error, FizzRegistryAbi);
      throw errorMessage;
    }
  }

  async addAcceptedPayment(tokenAddress: string) {
    try {
      const { signer } = await initializeSigner({ wallet: this.wallet });

      const contractAddress = contractAddresses[this.networkType as NetworkType].fizzRegistry;
      const contractAbi = abiMap[this.networkType as NetworkType].fizzRegistry;

      const contract = new ethers.Contract(contractAddress, contractAbi, signer);

      const tx = await contract.addAcceptedPayment(tokenAddress);

      const receipt = await tx.wait();

      return receipt;
    } catch (error) {
      const errorMessage = handleContractError(error, FizzRegistryAbi);
      throw errorMessage;
    }
  }

  async listenToAddAcceptedPayment(
    onSuccessCallback: (fizzId: bigint, tokenAddress: string, walletAddress: string) => void,
    onFailureCallback: () => void,
    timeoutTime = 60000
  ) {
    const contractAddress = contractAddresses[this.networkType as NetworkType].fizzRegistry;
    const contractAbi = abiMap[this.networkType as NetworkType].fizzRegistry;

    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const contract = new ethers.Contract(contractAddress, contractAbi, this.webSocketProvider);

      let timeoutId: NodeJS.Timeout | undefined;

      return new Promise((resolve, reject) => {
        timeoutId = setTimeout(() => {
          contract.off('PaymentAdded');
          onFailureCallback();
          reject({ error: true, msg: 'Fizz update failed' });
        }, timeoutTime);

        contract.on('PaymentAdded', async (fizzId: bigint, tokenAddress: string) => {
          const fizz: FizzDetails = await this.getFizzById(fizzId);
          if (
            fizz.walletAddress.toString().toLowerCase() === accounts[0].toString().toLowerCase()
          ) {
            onSuccessCallback(fizzId, tokenAddress, fizz.walletAddress);
            this.webSocketProvider?.destroy();
            contract.off('PaymentAdded');
            clearTimeout(timeoutId as NodeJS.Timeout);
            resolve({ fizzId, tokenAddress, walletAddress: fizz.walletAddress });
          }
        });
      });
    } catch (error) {
      const errorMessage = handleContractError(error, FizzRegistryAbi);
      throw errorMessage;
    }
  }

  async removeAcceptedPayment(tokenAddress: string) {
    try {
      const { signer } = await initializeSigner({ wallet: this.wallet });

      const contractAddress = contractAddresses[this.networkType as NetworkType].fizzRegistry;
      const contractAbi = abiMap[this.networkType as NetworkType].fizzRegistry;

      const contract = new ethers.Contract(contractAddress, contractAbi, signer);

      const tx = await contract.removeAcceptedPayment(tokenAddress);

      const receipt = await tx.wait();

      return receipt;
    } catch (error) {
      const errorMessage = handleContractError(error, FizzRegistryAbi);
      throw errorMessage;
    }
  }

  async listenToRemoveAcceptedPayment(
    onSuccessCallback: (fizzId: bigint, tokenAddress: string, walletAddress: string) => void,
    onFailureCallback: () => void,
    timeoutTime = 60000
  ) {
    const contractAddress = contractAddresses[this.networkType as NetworkType].fizzRegistry;
    const contractAbi = abiMap[this.networkType as NetworkType].fizzRegistry;

    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const contract = new ethers.Contract(contractAddress, contractAbi, this.webSocketProvider);

      let timeoutId: NodeJS.Timeout | undefined;

      return new Promise((resolve, reject) => {
        timeoutId = setTimeout(() => {
          contract.off('PaymentRemoved');
          onFailureCallback();
          reject({ error: true, msg: 'Fizz update failed' });
        }, timeoutTime);

        contract.on('PaymentRemoved', async (fizzId: bigint, tokenAddress: string) => {
          const fizz: FizzDetails = await this.getFizzById(fizzId);
          if (
            fizz.walletAddress.toString().toLowerCase() === accounts[0].toString().toLowerCase()
          ) {
            onSuccessCallback(fizzId, tokenAddress, fizz.walletAddress);
            this.webSocketProvider?.destroy();
            contract.off('PaymentRemoved');
            clearTimeout(timeoutId as NodeJS.Timeout);
            resolve({ fizzId, tokenAddress, walletAddress: fizz.walletAddress });
          }
        });
      });
    } catch (error) {
      const errorMessage = handleContractError(error, FizzRegistryAbi);
      throw errorMessage;
    }
  }
}

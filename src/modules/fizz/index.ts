/* eslint-disable @typescript-eslint/no-explicit-any */
import FizzRegistryAbi from '@contracts/abis/devnet/FizzRegistry.json';
import ResourceRegistryAbi from '@contracts/abis/devnet/ResourceRegistry.json';
import ComputeLeaseAbi from '@contracts/abis/devnet/ComputeLease.json';
import {
  FizzRegistryDev,
  ResourceRegistryCPUDev,
  ResourceRegistryGPUDev,
  ComputeLeaseDev,
} from '@contracts/addresses';
import { ethers } from 'ethers';
import {
  FizzNode,
  FizzParams,
  FizzLease,
  Resource,
  // FizzProviderTrustTier,
} from './types';
import { initializeSigner } from '@utils/index';
import { ProviderModule } from '@modules/provider';

export class FizzModule {
  private provider: ethers.Provider;
  private webSocketProvider: ethers.WebSocketProvider | undefined;
  private timeoutId: NodeJS.Timeout | undefined;
  private wallet: ethers.Wallet | undefined;
  private providerModule: ProviderModule;

  constructor(
    provider: ethers.Provider,
    webSocketProvider?: ethers.WebSocketProvider,
    wallet?: ethers.Wallet
  ) {
    this.provider = provider;
    this.webSocketProvider = webSocketProvider;
    this.wallet = wallet;
    this.providerModule = new ProviderModule(provider);
  }

  async addFizzNode(fizzParams: FizzParams, regFee: bigint): Promise<unknown> {
    try {
      const { signer } = await initializeSigner({ wallet: this.wallet });

      const contractAddress = FizzRegistryDev;
      const abi = FizzRegistryAbi;
      const contract = new ethers.Contract(contractAddress, abi, signer);

      const tx = await contract.addFizzNode(fizzParams, {
        value: regFee,
      });
      const receipt = await tx.wait();

      console.log('Fizz registration successful: ', receipt);
      return tx;
    } catch (error) {
      console.error('Fizz registration failed: ', error);
      throw error;
    }
  }

  async updateFizzName(newName: string): Promise<unknown> {
    try {
      const { signer } = await initializeSigner({ wallet: this.wallet });

      // Contract address (hardcoded or retrieved from an environment variable)
      const contractAddress = FizzRegistryDev;
      const abi = FizzRegistryAbi;
      const contract = new ethers.Contract(contractAddress, abi, signer);

      const tx = await contract.updateFizzName(newName);

      const receipt = await tx.wait();

      console.log('Update Fizz Name successful: ', receipt);
      return tx;
    } catch (error) {
      console.error('Update Fizz Name failed: ', error);
      throw error;
    }
  }

  async getFizzById(fizzId: bigint): Promise<unknown> {
    try {
      const contractAddress = FizzRegistryDev;
      const contractAbi = FizzRegistryAbi;

      const contract = new ethers.Contract(contractAddress, contractAbi, this.provider);

      const fizzDetails = await contract.getFizz(fizzId);

      const {
        providerId,
        name,
        region,
        spec,
        paymentsAccepted,
        status,
        joinTimestamp,
        walletAddress,
        rewardWallet,
      } = fizzDetails;

      return {
        providerId,
        name,
        region,
        spec,
        paymentsAccepted,
        status,
        joinTimestamp,
        walletAddress,
        rewardWallet,
      };
    } catch (error) {
      console.error('Failed to retrieve Fizz details: ', error);
      throw error;
    }
  }

  async getFizzNodeByAddress(walletAddress: string): Promise<FizzNode | unknown> {
    try {
      const contractAddress = FizzRegistryDev;
      const contractAbi = FizzRegistryAbi;

      const contract = new ethers.Contract(contractAddress, contractAbi, this.provider);

      const fizzId = await contract.addressToFizzId(walletAddress);
      const fizzNode: any = await this.getFizzById(fizzId);

      const result: FizzNode = {
        fizzId,
        providerId: fizzNode.providerId,
        name: fizzNode.name,
        region: fizzNode.region,
        spec: fizzNode.spec,
        walletAddress: fizzNode.walletAddress,
        paymentsAccepted: fizzNode.paymentsAccepted,
        status: Number(fizzNode.status.toString()),
        joinTimestamp: fizzNode.joinTimestamp,
        rewardWallet: fizzNode.rewardWallet,
      };

      console.log('Fizz Node details: ', result);
      return result;
    } catch (error) {
      console.error('Failed to fetch Fizz Node details: ', error);
      throw error;
    }
  }

  async getAllFizzNodes(): Promise<FizzNode[] | unknown> {
    try {
      const contractAddress = FizzRegistryDev;
      const contractAbi = FizzRegistryAbi;

      const contract = new ethers.Contract(contractAddress, contractAbi, this.provider);

      const allFizzNodes = await contract.getAllFizzNodes();

      const fizzNodes: FizzNode[] = allFizzNodes.map((fizzNode: any) => ({
        fizzId: fizzNode[0],
        providerId: fizzNode[1],
        name: fizzNode[2],
        region: fizzNode[3],
        spec: fizzNode[4],
        walletAddress: fizzNode[5],
        paymentsAccepted: fizzNode[6],
        status: fizzNode[7],
        joinTimestamp: fizzNode[8],
        rewardWallet: fizzNode[9],
      }));

      console.log('All Fizz Nodes: ', fizzNodes);
      return fizzNodes;
    } catch (error) {
      console.error('Failed to fetch all Fizz Nodes: ', error);
      throw error;
    }
  }

  async getResource(resourceID: bigint, category: string): Promise<Resource> {
    try {
      const contractAbi = ResourceRegistryAbi;
      const contractAddress = category === 'CPU' ? ResourceRegistryCPUDev : ResourceRegistryGPUDev;

      const contract = new ethers.Contract(contractAddress, contractAbi, this.provider);

      const [name, tier, multiplier]: [string, string, bigint] = await contract.getResource(
        resourceID
      );

      const resource: Resource = { name, tier, multiplier };

      console.log(`Resource with ID ${resourceID} retrieved successfully:`, resource);

      return resource;
    } catch (error) {
      console.error('Failed to retrieve resource: ', error);
      throw error;
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

      const leaseContractAddress = ComputeLeaseDev;
      const leaseContractAbi = ComputeLeaseAbi;
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
      console.error('Failed to retrieve fizz leases: ', error);
      throw error;
    }
  }

  async listenToFizzCreated(
    onSuccessCallback: (fizzId: bigint, walletAddress: string) => void,
    onFailureCallback: () => void,
    timeoutTime = 60000
  ) {
    const contractAddress = FizzRegistryDev;
    const contractAbi = FizzRegistryAbi;

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
      console.log('Error in listenToFizzCreated -> ', error);
      throw error;
    }
  }

  async updateFizzSpecs(specs: string) {
    try {
      const { signer } = await initializeSigner({ wallet: this.wallet });

      const contractAddress = FizzRegistryDev;
      const contractAbi = FizzRegistryAbi;

      const contract = new ethers.Contract(contractAddress, contractAbi, signer);

      const tx = await contract.updateFizzSpec(specs);

      const receipt = await tx.wait();

      return receipt;
    } catch (error) {
      console.log('Error in updateFizzSpecs -> ', error);
      throw error;
    }
  }

  async listenSpecUpdated(
    onSuccessCallback: (fizzId: bigint, specs: string, walletAddress: string) => void,
    onFailureCallback: () => void,
    timeoutTime = 60000
  ) {
    const contractAddress = FizzRegistryDev;
    const contractAbi = FizzRegistryAbi;

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

        contract.on('FizzNodeSpecUpdated', (fizzId: bigint, specs: string) => {
          const fizz: any = this.getFizzById(fizzId);
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
      console.log('Error in listenToFizzNodeUpdated -> ', error);
      throw error;
    }
  }

  async updateFizzRegion(region: string) {
    try {
      const { signer } = await initializeSigner({ wallet: this.wallet });

      const contractAddress = FizzRegistryDev;
      const contractAbi = FizzRegistryAbi;

      const contract = new ethers.Contract(contractAddress, contractAbi, signer);

      const tx = await contract.updateFizzRegion(region);

      const receipt = await tx.wait();

      return receipt;
    } catch (error) {
      console.log('Error in updateFizzRegion -> ', error);
      throw error;
    }
  }

  async listenRegionUpdated(
    onSuccessCallback: (fizzId: bigint, region: string, walletAddress: string) => void,
    onFailureCallback: () => void,
    timeoutTime = 60000
  ) {
    const contractAddress = FizzRegistryDev;
    const contractAbi = FizzRegistryAbi;

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

        contract.on('FizzNodeRegionUpdated', (fizzId: bigint, region: string) => {
          const fizz: any = this.getFizzById(fizzId);
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
      console.log('Error in listenToFizzNodeUpdated -> ', error);
      throw error;
    }
  }

  async updateFizzProvider(providerId: bigint) {
    try {
      const { signer } = await initializeSigner({ wallet: this.wallet });

      const contractAddress = FizzRegistryDev;
      const contractAbi = FizzRegistryAbi;

      const contract = new ethers.Contract(contractAddress, contractAbi, signer);

      const tx = await contract.updateFizzProviderId(providerId);

      const receipt = await tx.wait();

      return receipt;
    } catch (error) {
      console.log('Error in updateFizzProvider -> ', error);
      throw error;
    }
  }

  async listenProviderUpdated(
    onSuccessCallback: (fizzId: bigint, providerId: bigint, walletAddress: string) => void,
    onFailureCallback: () => void,
    timeoutTime = 60000
  ) {
    const contractAddress = FizzRegistryDev;
    const contractAbi = FizzRegistryAbi;

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

        contract.on('FizzNodeProviderIdUpdated', (fizzId: bigint, providerId: bigint) => {
          const fizz: any = this.getFizzById(fizzId);
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
      console.log('Error in listenToFizzNodeUpdated -> ', error);
      throw error;
    }
  }

  async addAcceptedPayment(tokenAddress: string) {
    try {
      const { signer } = await initializeSigner({ wallet: this.wallet });

      const contractAddress = FizzRegistryDev;
      const contractAbi = FizzRegistryAbi;

      const contract = new ethers.Contract(contractAddress, contractAbi, signer);

      const tx = await contract.addAcceptedPayment(tokenAddress);

      const receipt = await tx.wait();

      return receipt;
    } catch (error) {
      console.log('Error in addAcceptedPayment -> ', error);
      throw error;
    }
  }

  async listenToAddAcceptedPayment(
    onSuccessCallback: (fizzId: bigint, tokenAddress: string, walletAddress: string) => void,
    onFailureCallback: () => void,
    timeoutTime = 60000
  ) {
    const contractAddress = FizzRegistryDev;
    const contractAbi = FizzRegistryAbi;

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

        contract.on('PaymentAdded', (fizzId: bigint, tokenAddress: string) => {
          const fizz: any = this.getFizzById(fizzId);
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
      console.log('Error in listenToAddAcceptedPayment -> ', error);
      throw error;
    }
  }

  async removeAcceptedPayment(tokenAddress: string) {
    try {
      const { signer } = await initializeSigner({ wallet: this.wallet });

      const contractAddress = FizzRegistryDev;
      const contractAbi = FizzRegistryAbi;

      const contract = new ethers.Contract(contractAddress, contractAbi, signer);

      const tx = await contract.removeAcceptedPayment(tokenAddress);

      const receipt = await tx.wait();

      return receipt;
    } catch (error) {
      console.log('Error in removeAcceptedPayment -> ', error);
      throw error;
    }
  }

  async listenToRemoveAcceptedPayment(
    onSuccessCallback: (fizzId: bigint, tokenAddress: string, walletAddress: string) => void,
    onFailureCallback: () => void,
    timeoutTime = 60000
  ) {
    const contractAddress = FizzRegistryDev;
    const contractAbi = FizzRegistryAbi;

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

        contract.on('PaymentRemoved', (fizzId: bigint, tokenAddress: string) => {
          const fizz: any = this.getFizzById(fizzId);
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
      console.log('Error in listenToRemoveAcceptedPayment -> ', error);
      throw error;
    }
  }
}

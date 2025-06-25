/* eslint-disable @typescript-eslint/no-explicit-any */
import EscrowProtocolAbi from '@contracts/abis/testnet/EscrowProtocol.json';
import EscrowAbi from '@contracts/abis/testnet/EscrowUser.json';
import FizzRegistryAbi from '@contracts/abis/testnet/FizzRegistry.json';
import ProviderRegistryAbi from '@contracts/abis/testnet/ProviderRegistry.json';
import FizzAttributeRegistryAbi from '@contracts/abis/testnet/FizzAttributeRegistry.json';
import ResourceRegistryAbi from '@contracts/abis/testnet/ResourceRegistry.json';
import ComputeLeaseAbi from '@contracts/abis/testnet/ComputeLease.json';
import { contractAddresses } from '@contracts/addresses';
import { ethers } from 'ethers';
import {
  Attribute,
  FizzNode,
  FizzParams,
  FizzLease,
  Resource,
  FizzProvider,
  FizzProviderStatus,
  // FizzProviderTrustTier,
} from './types';
import { TransactionData } from '@modules/escrow/types';
import { decompressProviderSpec } from '@utils/spec';
import { NetworkType, RpcProvider } from '@config/index';
export class FizzModule {
  private provider: ethers.Provider;
  private timeoutId: NodeJS.Timeout | undefined;
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
  }

  async getFizzEarnings(fizzAddress: string, tokenAddress: string) {
    try {
      const contractAbi = EscrowProtocolAbi;
      const contractAddress = contractAddresses[this.networkType].escrowProtocol;
      const contract = new ethers.Contract(contractAddress, contractAbi, this.provider);

      const response = await contract.getFizzNodeEarnings(fizzAddress, tokenAddress);

      const fizzEarnings: { earned: string; withdrawn: string; balance: string } = {
        earned: response[0].toString(),
        withdrawn: response[1].toString(),
        balance: response[2].toString(),
      };

      console.log('fizz earnings -> ', fizzEarnings);

      return fizzEarnings;
    } catch (error) {
      console.error('Error in getFizzEarnings:', error);
      throw error;
    }
  }

  async addFizzNode(fizzParams: FizzParams): Promise<unknown> {
    try {
      if (typeof window?.ethereum === 'undefined') {
        console.log('Please install MetaMask');
        return 'MetaMask not installed';
      }

      await window.ethereum.request({ method: 'eth_requestAccounts' });

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const contractAddress = contractAddresses[this.networkType].fizzRegistry;
      const abi = FizzRegistryAbi;
      const contract = new ethers.Contract(contractAddress, abi, signer);

      const tx = await contract.addFizzNode(fizzParams);
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
      if (typeof window?.ethereum === 'undefined') {
        console.log('Please install MetaMask');
        return 'MetaMask not installed';
      }

      await window.ethereum.request({ method: 'eth_requestAccounts' });
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      // Contract address (hardcoded or retrieved from an environment variable)
      const contractAddress = contractAddresses[this.networkType].fizzRegistry;
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
      const contractAddress = contractAddresses[this.networkType].fizzRegistry;
      const contractAbi = FizzRegistryAbi;

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
      console.error('Failed to retrieve Fizz details: ', error);
      throw error;
    }
  }

  async getFizzNodeByAddress(walletAddress: string) {
    try {
      const contractAddress = contractAddresses[this.networkType].fizzRegistry;
      const contractAbi = FizzRegistryAbi;

      const contract = new ethers.Contract(contractAddress, contractAbi, this.provider);

      const fizzId = await contract.addressToFizzId(walletAddress);
      const fizzNode: any = await this.getFizzById(fizzId);

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

      console.log('Fizz Node details: ', result);
      return result;
    } catch (error) {
      console.error('Failed to fetch Fizz Node details: ', error);
      throw error;
    }
  }

  async getAllFizzNodes(): Promise<FizzNode[]> {
    try {
      const contractAddress = contractAddresses[this.networkType].fizzRegistry;
      const contractAbi = FizzRegistryAbi;

      const contract = new ethers.Contract(contractAddress, contractAbi, this.provider);

      const allFizzNodes = await contract.getAllFizzNodes();

      const fizzNodes: FizzNode[] = allFizzNodes.map((fizzNode: any) => ({
        fizzId: fizzNode[0],
        providerId: fizzNode[1],
        spec: fizzNode[2],
        walletAddress: fizzNode[3],
        paymentsAccepted: fizzNode[4],
        status: fizzNode[5],
        joinTimestamp: fizzNode[6],
        rewardWallet: fizzNode[7],
      }));

      console.log('All Fizz Nodes: ', fizzNodes);
      return fizzNodes;
    } catch (error) {
      console.error('Failed to fetch all Fizz Nodes: ', error);
      throw error;
    }
  }

  async submitAttributes(category: string, ids: bigint[], units: bigint[]): Promise<void> {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);

      await provider.send('eth_requestAccounts', []);

      const signer = await provider.getSigner();

      const contractAddress = contractAddresses[this.networkType].fizzAttributeRegistry;
      const contractAbi = FizzAttributeRegistryAbi;

      const contract = new ethers.Contract(contractAddress, contractAbi, signer);

      const tx = await contract.submitAttributes(category, ids, units);
      const result = await tx.wait();

      console.log('Attributes submitted successfully.');

      return result;
    } catch (error) {
      console.error('Failed to submit attributes: ', error);
    }
  }

  async getAttributes(fizzAddress: string, category: string): Promise<Attribute[]> {
    try {
      const contractAddress = contractAddresses[this.networkType].fizzAttributeRegistry;
      const contractAbi = FizzAttributeRegistryAbi;

      const contract = new ethers.Contract(contractAddress, contractAbi, this.provider);

      const attributes: Attribute[] = await contract.getAttributes(fizzAddress, category);

      console.log('attributes raw -> ', attributes);

      const decoratedAttributes = attributes.map((attr: any) => ({
        id: attr[0],
        units: attr[1],
      }));
      console.log(
        `Attributes for ${fizzAddress} in category ${category} retrieved successfully:`,
        decoratedAttributes
      );
      return decoratedAttributes;
    } catch (error) {
      console.error('Failed to retrieve attributes: ', error);
      throw error;
    }
  }

  async getPendingAttributes(fizzAddress: string, category: string): Promise<Attribute[]> {
    try {
      const contractAddress = contractAddresses[this.networkType].fizzAttributeRegistry;
      const contractAbi = FizzAttributeRegistryAbi;

      const contract = new ethers.Contract(contractAddress, contractAbi, this.provider);

      const attributes: Attribute[] = await contract.getPendingAttributes(fizzAddress, category);

      const decoratedAttributes = attributes.map((attr: any) => ({
        id: attr[0],
        units: attr[1],
      }));
      console.log(
        `Pending Attributes for ${fizzAddress} in category ${category} retrieved successfully:`,
        decoratedAttributes
      );
      return decoratedAttributes;
    } catch (error) {
      console.error('Failed to retrieve pending attributes: ', error);
      throw error;
    }
  }

  async getResource(resourceID: bigint, category: string): Promise<Resource> {
    try {
      const contractAbi = ResourceRegistryAbi;
      const contractAddress =
        category === 'CPU'
          ? contractAddresses[this.networkType].fizzResourceRegistryCPU
          : contractAddresses[this.networkType].fizzResourceRegistryGPU;

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

  async getProvider(providerId: bigint): Promise<any> {
    try {
      const contractAddress = contractAddresses[this.networkType].providerRegistry;
      const contractAbi = ProviderRegistryAbi;

      const contract = new ethers.Contract(contractAddress, contractAbi, this.provider);
      const providerData = await contract.getProvider(providerId);

      let name, region;
      try {
        const { Name, Region } = JSON.parse(providerData.spec);
        name = Name;
        region = Region;
      } catch {
        try {
          const { Name, Region } = decompressProviderSpec(providerData.spec) as any;
          name = Name;
          region = Region;
        } catch {
          name = '';
          region = '';
        }
      }

      return {
        name,
        region,
        spec: providerData.spec,
        hostUri: providerData.hostUri,
        certificate: providerData.certificate,
        paymentsAccepted: providerData.paymentsAccepted,
        status: providerData.status,
        tier: providerData.tier,
        joinTimestamp: providerData.joinTimestamp,
        walletAddress: providerData.walletAddress,
        rewardWallet: providerData.rewardWallet,
      };
    } catch (error) {
      console.error('Failed to retrieve provider details: ', error);
      throw error;
    }
  }

  async getProviderByAddress(walletAddress: string): Promise<any> {
    try {
      const contractAddress = contractAddresses[this.networkType].providerRegistry;
      const contractAbi = ProviderRegistryAbi;

      const contract = new ethers.Contract(contractAddress, contractAbi, this.provider);

      const providerData = await contract.getProviderByAddress(walletAddress);

      let name, region;
      try {
        const { Name, Region } = JSON.parse(providerData.spec);
        name = Name;
        region = Region;
      } catch {
        try {
          const { Name, Region } = decompressProviderSpec(providerData.spec) as any;
          name = Name;
          region = Region;
        } catch {
          name = '';
          region = '';
        }
      }

      return {
        name,
        region,
        spec: providerData.spec,
        hostUri: providerData.hostUri,
        certificate: providerData.certificate,
        paymentsAccepted: providerData.paymentsAccepted,
        status: providerData.status,
        tier: providerData.tier,
        joinTimestamp: providerData.joinTimestamp,
        rewardWallet: providerData.rewardWallet,
      };
    } catch (error) {
      console.error('Failed to retrieve provider details by address: ', error);
      throw error;
    }
  }

  async getAllProviders(): Promise<FizzProvider[]> {
    try {
      const contractAddress = contractAddresses[this.networkType].providerRegistry;
      const contractAbi = ProviderRegistryAbi;

      const contract = new ethers.Contract(contractAddress, contractAbi, this.provider);
      const providersData = await contract.getAllProviders();

      const providers: FizzProvider[] = providersData.map((provider: any) => {
        let name, region;
        try {
          const { Name, Region } = JSON.parse(provider.spec);
          name = Name;
          region = Region;
        } catch {
          try {
            const { Name, Region } = decompressProviderSpec(provider.spec) as any;
            name = Name;
            region = Region;
          } catch {
            name = '';
            region = '';
          }
        }
        return {
          providerId: provider.providerId.toString(),
          name,
          region,
          walletAddress: provider.walletAddress,
          paymentsAccepted: provider.paymentsAccepted,
          spec: provider.spec,
          hostUri: provider.hostUri,
          certificate: provider.certificate,
          status: FizzProviderStatus[provider.status],
          // tier: FizzProviderTrustTier[provider.tier],
          tier: Number(provider.tier.toString()),
          joinTimestamp: Number(provider.joinTimestamp.toString()),
          rewardWallet: provider.rewardWallet,
        };
      });

      return providers;
    } catch (error) {
      console.error('Failed to retrieve all providers: ', error);
      throw error;
    }
  }

  async getFizzLeases(
    fizzId: bigint,
    providerId: bigint,
    state?: string
  ): Promise<FizzLease[] | unknown> {
    try {
      const providerData = await this.getProvider(providerId);
      const walletAddress = providerData.walletAddress;

      const leaseContractAddress = contractAddresses[this.networkType].computeLease;
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
    const contractAddress = contractAddresses[this.networkType].fizzRegistry;
    const contractAbi = FizzRegistryAbi;

    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const webSocketProvider = new ethers.WebSocketProvider(this.rpcProvider.WSS_URL);
      const contract = new ethers.Contract(contractAddress, contractAbi, webSocketProvider);

      return new Promise((resolve, reject) => {
        this.timeoutId = setTimeout(() => {
          contract.off('FizzNodeAdded');
          webSocketProvider?.destroy();
          onFailureCallback();
          reject({ error: true, msg: 'Fizz creation failed' });
        }, timeoutTime);

        contract.on('FizzNodeAdded', (fizzId: bigint, walletAddress: string) => {
          if (walletAddress.toString().toLowerCase() === accounts[0].toString().toLowerCase()) {
            onSuccessCallback(fizzId, walletAddress);
            webSocketProvider?.destroy();
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
      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send('eth_requestAccounts', []);
      const signer = await provider.getSigner();

      const contractAddress = contractAddresses[this.networkType].fizzRegistry;
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
    const contractAddress = contractAddresses[this.networkType].fizzRegistry;
    const contractAbi = FizzRegistryAbi;

    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const webSocketProvider = new ethers.WebSocketProvider(this.rpcProvider.WSS_URL);
      const contract = new ethers.Contract(contractAddress, contractAbi, webSocketProvider);

      let timeoutId: NodeJS.Timeout | undefined;

      return new Promise((resolve, reject) => {
        timeoutId = setTimeout(() => {
          contract.off('FizzNodeSpecUpdated');
          webSocketProvider?.destroy();
          onFailureCallback();
          reject({ error: true, msg: 'Fizz update failed' });
        }, timeoutTime);

        contract.on('FizzNodeSpecUpdated', (fizzId: bigint, specs: string) => {
          const fizz: any = this.getFizzById(fizzId);
          if (
            fizz.walletAddress.toString().toLowerCase() === accounts[0].toString().toLowerCase()
          ) {
            onSuccessCallback(fizzId, specs, fizz.walletAddress);
            webSocketProvider?.destroy();
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
      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send('eth_requestAccounts', []);
      const signer = await provider.getSigner();

      const contractAddress = contractAddresses[this.networkType].fizzRegistry;
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
    const contractAddress = contractAddresses[this.networkType].fizzRegistry;
    const contractAbi = FizzRegistryAbi;

    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const webSocketProvider = new ethers.WebSocketProvider(this.rpcProvider.WSS_URL);
      const contract = new ethers.Contract(contractAddress, contractAbi, webSocketProvider);

      let timeoutId: NodeJS.Timeout | undefined;

      return new Promise((resolve, reject) => {
        timeoutId = setTimeout(() => {
          contract.off('FizzNodeRegionUpdated');
          webSocketProvider?.destroy();
          onFailureCallback();
          reject({ error: true, msg: 'Fizz update failed' });
        }, timeoutTime);

        contract.on('FizzNodeRegionUpdated', (fizzId: bigint, region: string) => {
          const fizz: any = this.getFizzById(fizzId);
          if (
            fizz.walletAddress.toString().toLowerCase() === accounts[0].toString().toLowerCase()
          ) {
            onSuccessCallback(fizzId, region, fizz.walletAddress);
            webSocketProvider?.destroy();
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
      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send('eth_requestAccounts', []);
      const signer = await provider.getSigner();

      const contractAddress = contractAddresses[this.networkType].fizzRegistry;
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
    const contractAddress = contractAddresses[this.networkType].fizzRegistry;
    const contractAbi = FizzRegistryAbi;

    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const webSocketProvider = new ethers.WebSocketProvider(this.rpcProvider.WSS_URL);
      const contract = new ethers.Contract(contractAddress, contractAbi, webSocketProvider);

      let timeoutId: NodeJS.Timeout | undefined;

      return new Promise((resolve, reject) => {
        timeoutId = setTimeout(() => {
          contract.off('FizzNodeProviderIdUpdated');
          webSocketProvider?.destroy();
          onFailureCallback();
          reject({ error: true, msg: 'Fizz update failed' });
        }, timeoutTime);

        contract.on('FizzNodeProviderIdUpdated', (fizzId: bigint, providerId: bigint) => {
          const fizz: any = this.getFizzById(fizzId);
          if (
            fizz.walletAddress.toString().toLowerCase() === accounts[0].toString().toLowerCase()
          ) {
            onSuccessCallback(fizzId, providerId, fizz.walletAddress);
            webSocketProvider?.destroy();
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
      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send('eth_requestAccounts', []);
      const signer = await provider.getSigner();

      const contractAddress = contractAddresses[this.networkType].fizzRegistry;
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
    const contractAddress = contractAddresses[this.networkType].fizzRegistry;
    const contractAbi = FizzRegistryAbi;

    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const webSocketProvider = new ethers.WebSocketProvider(this.rpcProvider.WSS_URL);
      const contract = new ethers.Contract(contractAddress, contractAbi, webSocketProvider);

      let timeoutId: NodeJS.Timeout | undefined;

      return new Promise((resolve, reject) => {
        timeoutId = setTimeout(() => {
          contract.off('PaymentAdded');
          webSocketProvider?.destroy();
          onFailureCallback();
          reject({ error: true, msg: 'Fizz update failed' });
        }, timeoutTime);

        contract.on('PaymentAdded', (fizzId: bigint, tokenAddress: string) => {
          const fizz: any = this.getFizzById(fizzId);
          if (
            fizz.walletAddress.toString().toLowerCase() === accounts[0].toString().toLowerCase()
          ) {
            onSuccessCallback(fizzId, tokenAddress, fizz.walletAddress);
            webSocketProvider?.destroy();
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
      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send('eth_requestAccounts', []);
      const signer = await provider.getSigner();

      const contractAddress = contractAddresses[this.networkType].fizzRegistry;
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
    const contractAddress = contractAddresses[this.networkType].fizzRegistry;
    const contractAbi = FizzRegistryAbi;

    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const webSocketProvider = new ethers.WebSocketProvider(this.rpcProvider.WSS_URL);
      const contract = new ethers.Contract(contractAddress, contractAbi, webSocketProvider);

      let timeoutId: NodeJS.Timeout | undefined;

      return new Promise((resolve, reject) => {
        timeoutId = setTimeout(() => {
          contract.off('PaymentRemoved');
          webSocketProvider?.destroy();
          onFailureCallback();
          reject({ error: true, msg: 'Fizz update failed' });
        }, timeoutTime);

        contract.on('PaymentRemoved', (fizzId: bigint, tokenAddress: string) => {
          const fizz: any = this.getFizzById(fizzId);
          if (
            fizz.walletAddress.toString().toLowerCase() === accounts[0].toString().toLowerCase()
          ) {
            onSuccessCallback(fizzId, tokenAddress, fizz.walletAddress);
            webSocketProvider?.destroy();
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

  async removeFizzAttribute(category: string) {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send('eth_requestAccounts', []);
      const signer = await provider.getSigner();

      const contractAddress = contractAddresses[this.networkType].fizzAttributeRegistry;
      const contractAbi = FizzAttributeRegistryAbi;

      const contract = new ethers.Contract(contractAddress, contractAbi, signer);

      const tx = await contract.removeAttributes(category);

      const receipt = await tx.wait();

      return receipt;
    } catch (error) {
      console.log('Error in removeFizzAttribute -> ', error);
      throw error;
    }
  }
}

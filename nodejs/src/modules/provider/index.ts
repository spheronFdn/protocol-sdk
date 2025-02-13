import ProviderRegistryAbi from '@contracts/abis/testnet/ProviderRegistry.json';
import ProviderAttributeRegistryAbi from '@contracts/abis/testnet/ProviderAttributeRegistry.json';

import {
  ProviderRegistryTestnet as ProviderRegistry,
  ProviderAttributeRegistryTestnet as ProviderAttributeRegistry,
} from '@contracts/addresses';
import { ethers } from 'ethers';
import { Attribute, Category, IProvider, Provider, ProviderStatus } from './types';
import { isValidEthereumAddress } from '@utils/index';
import { handleContractError } from '@utils/errors';
import { decompressProviderSpec } from '@utils/spec';

export class ProviderModule {
  private provider: ethers.Provider;

  constructor(provider: ethers.Provider) {
    this.provider = provider;
  }

  async getProviderDetails(providerAddress: string) {
    if (!providerAddress) {
      throw new Error('Pass Provider Address');
    }

    if (!isValidEthereumAddress(providerAddress)) {
      throw new Error('Pass Valid Address');
    }
    try {
      const contractAbi = ProviderRegistryAbi;
      const contractAddress = ProviderRegistry;

      const contract = new ethers.Contract(contractAddress, contractAbi, this.provider);
      const response = await contract.getProviderByAddress(providerAddress);

      const providerDetailsData: IProvider = {
        spec: response[0],
        hostUri: response[1],
        certificate: response[2],
        paymentsAccepted: response[3],
        status: response[4].toString(),
        trust: Number(response[5].toString()) + 1,
        timestamp: Number(response[6].toString()),
      };

      return providerDetailsData;
    } catch (error) {
      const errorMessage = handleContractError(error, ProviderRegistryAbi);
      throw errorMessage;
    }
  }

  async getProviderPendingAttributes(providerAddress: string, category: Category) {
    if (!providerAddress) {
      throw new Error('Pass Provider Address');
    }

    if (!isValidEthereumAddress(providerAddress)) {
      throw new Error('Pass Valid Address');
    }

    if (!category) {
      throw new Error('Please pass a category');
    }
    try {
      const contractAbi = ProviderAttributeRegistryAbi;
      const contractAddress = ProviderAttributeRegistry;

      const contract = new ethers.Contract(contractAddress, contractAbi, this.provider);
      const response = await contract.getProviderPendingAttributes(providerAddress, category);

      return response;
    } catch (error) {
      const errorMessage = handleContractError(error, ProviderAttributeRegistryAbi);
      throw errorMessage;
    }
  }

  async getProviderAttributes(providerAddress: string, category: Category) {
    if (!providerAddress) {
      throw new Error('Pass Provider Address');
    }

    if (!isValidEthereumAddress(providerAddress)) {
      throw new Error('Pass Valid Address');
    }

    if (!category) {
      throw new Error('Please pass a category');
    }
    try {
      const contractAbi = ProviderAttributeRegistryAbi;
      const contractAddress = ProviderAttributeRegistry;

      const contract = new ethers.Contract(contractAddress, contractAbi, this.provider);
      const response = await contract.getProviderAttributes(providerAddress, category);

      return response;
    } catch (error) {
      const errorMessage = handleContractError(error, ProviderAttributeRegistryAbi);
      throw errorMessage;
    }
  }

  async getProvider(providerId: bigint): Promise<any> {
    try {
      const contractAddress = ProviderRegistry;
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
      const errorMessage = handleContractError(error, ProviderRegistryAbi);
      throw errorMessage;
    }
  }

  async getProviderByAddress(walletAddress: string): Promise<any> {
    try {
      const contractAddress = ProviderRegistry;
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
      const errorMessage = handleContractError(error, ProviderRegistryAbi);
      throw errorMessage;
    }
  }

  async getAllProviders(): Promise<Provider[]> {
    try {
      const contractAddress = ProviderRegistry;
      const contractAbi = ProviderRegistryAbi;

      const contract = new ethers.Contract(contractAddress, contractAbi, this.provider);
      const providersData = await contract.getAllProviders();

      const providers: Provider[] = providersData.map((provider: any) => {
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
          name,
          region,
          providerId: provider.providerId.toString(),
          walletAddress: provider.walletAddress,
          paymentsAccepted: provider.paymentsAccepted,
          spec: provider.spec,
          hostUri: provider.hostUri,
          certificate: provider.certificate,
          status: ProviderStatus[provider.status],
          tier: Number(provider.tier.toString()),
          // tier: ProviderTrustTier[provider.tier],
          joinTimestamp: Number(provider.joinTimestamp.toString()),
          rewardWallet: provider.rewardWallet,
        };
      });

      return providers;
    } catch (error) {
      const errorMessage = handleContractError(error, ProviderRegistryAbi);
      throw errorMessage;
    }
  }

  async getAttributes(providerAddress: string, category: string): Promise<Attribute[]> {
    try {
      const contractAddress = ProviderAttributeRegistry;
      const contractAbi = ProviderAttributeRegistryAbi;

      const contract = new ethers.Contract(contractAddress, contractAbi, this.provider);

      const attributes: Attribute[] = await contract.getAttributes(providerAddress, category);

      const decoratedAttributes = attributes.map((attr: any) => ({
        id: attr[0],
        units: attr[1],
      }));
      return decoratedAttributes;
    } catch (error) {
      const errorMessage = handleContractError(error, ProviderRegistryAbi);
      throw errorMessage;
    }
  }

  async getPendingAttributes(providerAddress: string, category: string): Promise<Attribute[]> {
    try {
      const contractAddress = ProviderAttributeRegistry;
      const contractAbi = ProviderAttributeRegistryAbi;

      const contract = new ethers.Contract(contractAddress, contractAbi, this.provider);

      const attributes: Attribute[] = await contract.getPendingAttributes(
        providerAddress,
        category
      );

      const decoratedAttributes = attributes.map((attr: any) => ({
        id: attr[0],
        units: attr[1],
      }));
      return decoratedAttributes;
    } catch (error) {
      const errorMessage = handleContractError(error, ProviderRegistryAbi);
      throw errorMessage;
    }
  }
}

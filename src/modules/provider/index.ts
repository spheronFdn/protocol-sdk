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

export class ProviderModule {
  private provider: ethers.Provider;

  constructor(provider: ethers.Provider) {
    this.provider = provider;
  }

  async getProviderDetails(providerAddress: string) {
    if (!providerAddress) {
      console.log('Pass Provider Address');
      return;
    }

    if (!isValidEthereumAddress(providerAddress)) {
      console.log('Pass Valid Address');
      return;
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
      console.log('Error in get Provider Details ->', error);
      const errorMessage = handleContractError(error, ProviderRegistryAbi);
      throw errorMessage;
    }
  }

  async getProviderPendingAttributes(providerAddress: string, category: Category) {
    if (!providerAddress) {
      console.log('Pass Provider Address');
      return;
    }

    if (!isValidEthereumAddress(providerAddress)) {
      console.log('Pass Valid Address');
      return;
    }

    if (!category) {
      console.log('Please pass a category');
      return;
    }
    try {
      const contractAbi = ProviderAttributeRegistryAbi;
      const contractAddress = ProviderAttributeRegistry;

      const contract = new ethers.Contract(contractAddress, contractAbi, this.provider);
      const response = await contract.getProviderPendingAttributes(providerAddress, category);

      return response;
    } catch (error) {
      console.log('Error in get Provider Pending Attrs ->', error);
      const errorMessage = handleContractError(error, ProviderAttributeRegistryAbi);
      throw errorMessage;
    }
  }

  async getProviderAttributes(providerAddress: string, category: Category) {
    if (!providerAddress) {
      console.log('Pass Provider Address');
      return;
    }

    if (!isValidEthereumAddress(providerAddress)) {
      console.log('Pass Valid Address');
      return;
    }

    if (!category) {
      console.log('Please pass a category');
      return;
    }
    try {
      const contractAbi = ProviderAttributeRegistryAbi;
      const contractAddress = ProviderAttributeRegistry;

      const contract = new ethers.Contract(contractAddress, contractAbi, this.provider);
      const response = await contract.getProviderAttributes(providerAddress, category);

      return response;
    } catch (error) {
      console.log('Error in get Provider Attrs ->', error);
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

      return {
        name: providerData[0],
        region: providerData[1],
        attributes: providerData[2],
        hostUri: providerData[3],
        certificate: providerData[4],
        paymentsAccepted: providerData[5],
        status: providerData[6],
        tier: providerData[7],
        joinTimestamp: providerData[8],
        walletAddress: providerData[9],
        rewardWallet: providerData[10],
      };
    } catch (error) {
      console.error('Failed to retrieve provider details: ', error);
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

      return {
        name: providerData[0],
        region: providerData[1],
        attributes: providerData[2],
        hostUri: providerData[3],
        certificate: providerData[4],
        paymentsAccepted: providerData[5],
        status: providerData[6],
        tier: providerData[7],
        joinTimestamp: providerData[8],
        rewardWallet: providerData[9],
      };
    } catch (error) {
      console.error('Failed to retrieve provider details by address: ', error);
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

      const providers: Provider[] = providersData.map((provider: any) => ({
        providerId: provider.providerId.toString(),
        name: provider.name,
        region: provider.region,
        walletAddress: provider.walletAddress,
        paymentsAccepted: provider.paymentsAccepted,
        attributes: provider.attributes,
        hostUri: provider.hostUri,
        certificate: provider.certificate,
        status: ProviderStatus[provider.status],
        // tier: ProviderTrustTier[provider.tier],
        tier: Number(provider.tier.toString()),
        joinTimestamp: Number(provider.joinTimestamp.toString()),
        rewardWallet: provider.rewardWallet,
      }));

      return providers;
    } catch (error) {
      console.error('Failed to retrieve all providers: ', error);
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

      console.log('attributes raw -> ', attributes);

      const decoratedAttributes = attributes.map((attr: any) => ({
        id: attr[0],
        units: attr[1],
      }));
      console.log(
        `Attributes for ${providerAddress} in category ${category} retrieved successfully:`,
        decoratedAttributes
      );
      return decoratedAttributes;
    } catch (error) {
      console.error('Failed to retrieve attributes: ', error);
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
      console.log(
        `Pending Attributes for ${providerAddress} in category ${category} retrieved successfully:`,
        decoratedAttributes
      );
      return decoratedAttributes;
    } catch (error) {
      console.error('Failed to retrieve pending attributes: ', error);
      const errorMessage = handleContractError(error, ProviderRegistryAbi);
      throw errorMessage;
    }
  }
}

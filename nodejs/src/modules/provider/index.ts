import ProviderRegistryAbi from '@contracts/abis/testnet/ProviderRegistry.json';
import ProviderAttributeRegistryAbi from '@contracts/abis/testnet/ProviderAttributeRegistry.json';

import {
  ProviderRegistryTestnet as ProviderRegistry,
  ProviderAttributeRegistryTestnet as ProviderAttributeRegistry,
  contractAddresses,
} from '@contracts/addresses';
import { ethers } from 'ethers';
import {
  Attribute,
  Category,
  IProvider,
  Provider,
  ProviderStatus,
  RawProviderAttribute,
} from './types';
import { isValidEthereumAddress } from '@utils/index';
import { handleContractError } from '@utils/errors';
import { decompressProviderSpec } from '@utils/spec';
import { NetworkType } from '@config/index';
import { abiMap } from '@contracts/abi-map';

export class ProviderModule {
  private provider: ethers.Provider;
  private networkType: NetworkType | undefined;

  constructor(provider: ethers.Provider, networkType?: NetworkType) {
    this.provider = provider;
    this.networkType = networkType;
  }

  async getProviderDetails(providerAddress: string): Promise<IProvider> {
    if (!providerAddress) {
      throw new Error('Pass Provider Address');
    }

    if (!isValidEthereumAddress(providerAddress)) {
      throw new Error('Pass Valid Address');
    }
    try {
      const contractAbi = abiMap[this.networkType as NetworkType].providerRegistry;
      const contractAddress = contractAddresses[this.networkType as NetworkType].providerRegistry;

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
      const contractAbi = abiMap[this.networkType as NetworkType].providerAttributeRegistry;
      const contractAddress =
        contractAddresses[this.networkType as NetworkType].providerAttributeRegistry;

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
      const contractAbi = abiMap[this.networkType as NetworkType].providerAttributeRegistry;
      const contractAddress =
        contractAddresses[this.networkType as NetworkType].providerAttributeRegistry;

      const contract = new ethers.Contract(contractAddress, contractAbi, this.provider);
      const response = await contract.getProviderAttributes(providerAddress, category);

      return response;
    } catch (error) {
      const errorMessage = handleContractError(error, ProviderAttributeRegistryAbi);
      throw errorMessage;
    }
  }

  async getProvider(providerId: bigint): Promise<Provider> {
    try {
      const contractAddress = contractAddresses[this.networkType as NetworkType].providerRegistry;
      const contractAbi = abiMap[this.networkType as NetworkType].providerRegistry;

      const contract = new ethers.Contract(contractAddress, contractAbi, this.provider);
      const providerData = await contract.getProvider(providerId);

      let name, region;
      try {
        const { Name, Region } = JSON.parse(providerData.spec);
        name = Name;
        region = Region;
      } catch {
        try {
          const { Name, Region } = decompressProviderSpec(providerData.spec) as {
            Name: string;
            Region: string;
          };
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

  async getProviderByAddress(walletAddress: string): Promise<Provider> {
    try {
      const contractAddress = contractAddresses[this.networkType as NetworkType].providerRegistry;
      const contractAbi = abiMap[this.networkType as NetworkType].providerRegistry;

      const contract = new ethers.Contract(contractAddress, contractAbi, this.provider);

      const providerData = await contract.getProviderByAddress(walletAddress);

      let name, region;
      try {
        const { Name, Region } = JSON.parse(providerData.spec);
        name = Name;
        region = Region;
      } catch {
        try {
          const { Name, Region } = decompressProviderSpec(providerData.spec) as {
            Name: string;
            Region: string;
          };
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
        walletAddress,
        rewardWallet: providerData.rewardWallet,
      };
    } catch (error) {
      const errorMessage = handleContractError(error, ProviderRegistryAbi);
      throw errorMessage;
    }
  }

  async getAllProviders(): Promise<Provider[]> {
    try {
      const contractAddress = contractAddresses[this.networkType as NetworkType].providerRegistry;
      const contractAbi = abiMap[this.networkType as NetworkType].providerRegistry;

      const contract = new ethers.Contract(contractAddress, contractAbi, this.provider);
      const providersData = await contract.getAllProviders();

      const providers: Provider[] = providersData.map((provider: Provider) => {
        let name, region;
        try {
          const { Name, Region } = JSON.parse(provider.spec as string);
          name = Name;
          region = Region;
        } catch {
          try {
            const { Name, Region } = decompressProviderSpec(provider.spec as string) as {
              Name: string;
              Region: string;
            };
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
          providerId: (provider.providerId as bigint).toString(),
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
      const contractAddress =
        contractAddresses[this.networkType as NetworkType].providerAttributeRegistry;
      const contractAbi = abiMap[this.networkType as NetworkType].providerAttributeRegistry;

      const contract = new ethers.Contract(contractAddress, contractAbi, this.provider);

      const attributes: RawProviderAttribute[] = await contract.getAttributes(
        providerAddress,
        category
      );

      const decoratedAttributes = attributes.map((attr: RawProviderAttribute) => ({
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
      const contractAddress =
        contractAddresses[this.networkType as NetworkType].providerAttributeRegistry;
      const contractAbi = abiMap[this.networkType as NetworkType].providerAttributeRegistry;

      const contract = new ethers.Contract(contractAddress, contractAbi, this.provider);

      const attributes: RawProviderAttribute[] = await contract.getPendingAttributes(
        providerAddress,
        category
      );

      const decoratedAttributes = attributes.map((attr: RawProviderAttribute) => ({
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

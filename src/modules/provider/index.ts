import ProviderRegistryAbi from '@contracts/abis/ProviderRegistry.json';
import { ProviderRegistry } from '@contracts/addresses';
import { ethers } from 'ethers';
import { Category, IProvider } from './types';

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
    const contractAbi = ProviderRegistryAbi;
    const contractAddress = ProviderRegistry;

    const contract = new ethers.Contract(contractAddress, contractAbi, this.provider);
    const response = await contract.getProviderByAddress(providerAddress);

    const providerDetailsData: IProvider = {
      name: response[0],
      region: response[1],
      attributes: response[2],
      hostUri: response[3],
      certificate: response[4],
      paymentsAccepted: response[5],
      status: response[6].toString(),
      trust: Number(response[7].toString()) + 1,
      timestamp: Number(response[8].toString()),
    };

    return providerDetailsData;
  }

  async getProviderPendingAttributes(providerAddress: string, category: Category) {
    if (!providerAddress) {
      console.log('Pass Provider Address');
      return;
    }

    if (!category) {
      console.log('Please pass a category');
      return;
    }
    const contractAbi = ProviderRegistryAbi;
    const contractAddress = ProviderRegistry;

    const contract = new ethers.Contract(contractAddress, contractAbi, this.provider);
    const response = await contract.getProviderPendingAttributes(providerAddress, category);

    return response;
  }

  async getProviderAttributes(providerAddress: string, category: Category) {
    if (!providerAddress) {
      console.log('Pass Provider Address');
      return;
    }

    if (!category) {
      console.log('Please pass a category');
      return;
    }
    const contractAbi = ProviderRegistryAbi;
    const contractAddress = ProviderRegistry;

    const contract = new ethers.Contract(contractAddress, contractAbi, this.provider);
    const response = await contract.getProviderAttributes(providerAddress, category);

    return response;
  }
}

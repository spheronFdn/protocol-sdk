import ProviderRegistryAbi from '@contracts/abis/testnet/ProviderRegistry.json';
import { contractAddresses } from '@contracts/addresses';
import { ethers } from 'ethers';
import { Category, IProvider } from './types';
import { isValidEthereumAddress } from '@utils/index';
import { NetworkType } from '@config/index';

export class ProviderModule {
  private provider: ethers.Provider;
  private networkType: NetworkType;

  constructor(provider: ethers.Provider, networkType: NetworkType = 'mainnet') {
    this.provider = provider;
    this.networkType = networkType;
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
      const contractAddress = contractAddresses[this.networkType].providerRegistry;

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
      return error;
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
      const contractAbi = ProviderRegistryAbi;
      const contractAddress = contractAddresses[this.networkType].providerRegistry;

      const contract = new ethers.Contract(contractAddress, contractAbi, this.provider);
      const response = await contract.getProviderPendingAttributes(providerAddress, category);

      return response;
    } catch (error) {
      console.log('Error in get Provider Pending Attrs ->', error);
      return error;
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
      const contractAbi = ProviderRegistryAbi;
      const contractAddress = contractAddresses[this.networkType].providerRegistry;

      const contract = new ethers.Contract(contractAddress, contractAbi, this.provider);
      const response = await contract.getProviderAttributes(providerAddress, category);

      return response;
    } catch (error) {
      console.log('Error in get Provider Attrs ->', error);
      return error;
    }
  }
}

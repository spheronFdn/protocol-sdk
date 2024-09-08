import ProviderRegistryAbi from '@contracts/abis/devnet/ProviderRegistry.json';
import { ProviderRegistryDev as ProviderRegistry } from '@contracts/addresses';
import { ethers } from 'ethers';
import { Category, IProvider } from './types';
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
      const contractAbi = ProviderRegistryAbi;
      const contractAddress = ProviderRegistry;

      const contract = new ethers.Contract(contractAddress, contractAbi, this.provider);
      const response = await contract.getProviderPendingAttributes(providerAddress, category);

      return response;
    } catch (error) {
      console.log('Error in get Provider Pending Attrs ->', error);
      const errorMessage = handleContractError(error, ProviderRegistryAbi);
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
      const contractAbi = ProviderRegistryAbi;
      const contractAddress = ProviderRegistry;

      const contract = new ethers.Contract(contractAddress, contractAbi, this.provider);
      const response = await contract.getProviderAttributes(providerAddress, category);

      return response;
    } catch (error) {
      console.log('Error in get Provider Attrs ->', error);
      const errorMessage = handleContractError(error, ProviderRegistryAbi);
      throw errorMessage;
    }
  }
}

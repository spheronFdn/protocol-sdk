import ProviderRegistryAbi from '@contracts/abis/devnet/ProviderRegistry.json';
import { ProviderRegistryDev as ProviderRegistry } from '@contracts/addresses';
import { ethers } from 'ethers';
import { Category, IProvider } from './types';
import { isValidEthereumAddress } from '@utils/index';

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
      const contractAddress = ProviderRegistry;

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
      const contractAddress = ProviderRegistry;

      const contract = new ethers.Contract(contractAddress, contractAbi, this.provider);
      const response = await contract.getProviderAttributes(providerAddress, category);

      return response;
    } catch (error) {
      console.log('Error in get Provider Attrs ->', error);
      return error;
    }
  }

  async getAllProviders() {
    try {
      const contractAbi = ProviderRegistryAbi;
      const contractAddress = ProviderRegistry;

      const contract = new ethers.Contract(contractAddress, contractAbi, this.provider);
      const responses: any[] = await contract.getAllProviders();

      const filteredResponses = responses.filter(
        (response) => response[6] !== 'localhost' && response[1] && response[1].trim() !== ''
      );

      const allProviderDetails = await Promise.all(
        filteredResponses.map(async (response) => {
          let specs: StatusResponse = {
            totalCPUs: 0,
            totalMemory: 0,
            totalStorage: 0,
            gpuInfos: [],
          };
          let version = '-';
          if (response.status.toString() === '2') {
            specs = await getProviderStatus(response[6]);
            version = await getProviderVersion(response[6]);
          }
          const isRegistered = Number(response.status) === 1;
          const perEraRewardData = await getProviderRewardsPerEra(
            response.walletAddress,
            isRegistered,
            TrustTierMultiplier[Number(response[9].toString()) + 1]
          );
          const totalRewardsData = await getTotalRewards(
            response.walletAddress,
            isRegistered,
            perEraRewardData
          );
          return {
            id: response[0].toString(),
            name: response[1],
            region: response[2],
            address: response[3],
            hostUri: response[6],
            status: response[8].toString(),
            trust: Number(response[9].toString()) + 1,
            specs,
            perEraRewardData,
            totalRewardsData,
            timestamp: Number(response.joinTimestamp.toString()),
            version,
          };
        })
      );

      // Sort providers by total rewards (assuming totalRewardsData is a number)
      const sortedProviders = allProviderDetails.sort(
        (a, b) => Number(b.totalRewardsData.toString()) - Number(a.totalRewardsData.toString())
      );

      const sortedProvidersWithRank = sortedProviders.map((item, index) => ({
        ...item,
        rank: index + 1,
      }));

      const totalFilteredCount = sortedProviders.length;
      return {
        providers: sortedProvidersWithRank,
        totalCount: totalFilteredCount,
      };
    } catch (error) {
      console.log('Error in getting provider details -> ', error);
    }
  }
}

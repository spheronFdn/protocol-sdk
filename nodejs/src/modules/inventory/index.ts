import { NetworkType, RpcUrls } from '@config/index';
import FizzRegistryAbi from '@contracts/abis/testnet/FizzRegistry.json';
import { FizzModule } from '@modules/fizz';
import { ProviderModule } from '@modules/provider';
import { Provider, ProviderStatus } from '@modules/provider/types';
import { handleContractError } from '@utils/errors';
import GpuConfig from '@utils/gpu-config';
import { requestPipeline } from '@utils/index';
import { createAuthorizationToken } from '@utils/provider-auth';
import { subgraphGetProviders } from '@utils/subgraph';
import { ethers } from 'ethers';

export class InventoryModule {
  private wallet: ethers.Wallet | undefined;
  private providerModule: ProviderModule;
  private fizzModule: FizzModule;
  private networkType: NetworkType;
  private rpcUrls: RpcUrls | undefined;

  constructor(
    provider: ethers.Provider,
    wallet?: ethers.Wallet,
    networkType: NetworkType = 'mainnet',
    rpcUrls?: RpcUrls | undefined
  ) {
    this.wallet = wallet;
    this.rpcUrls = rpcUrls;
    this.providerModule = new ProviderModule(provider, networkType);
    this.fizzModule = new FizzModule(provider, wallet, networkType, this.rpcUrls);
    this.networkType = networkType;
  }

  async getFizzInventory(
    providerProxyUrl: string,
    options?: { groupBy?: 'fizzAddress' | 'gpu'; timeout?: number }
  ) {
    try {
      const activeFizzNodes = await this.fizzModule.getActiveFizzNodes(
        providerProxyUrl,
        options?.timeout || 2000
      );

      if (!options) options = { groupBy: 'gpu' };
      if (!options.groupBy) options.groupBy = 'gpu';

      if (options.groupBy === 'fizzAddress') {
        const fizzInventory = activeFizzNodes.reduce((acc, fizzNode) => {
          const allocatableGpuCount = fizzNode.allocatable.gpu;
          const availableGpuCount = fizzNode.available.gpu;

          if (availableGpuCount <= 0 || allocatableGpuCount <= 0) return acc;

          const gpuInfos = fizzNode.allocatable.gpu_infos;

          if (!gpuInfos || gpuInfos.length === 0) return acc;

          const availableGPUPerType = availableGpuCount / gpuInfos.length;
          const foundGpu = gpuInfos.find((info) => !!info.name);

          if (!foundGpu) return acc;

          const fizzGpuCountMap: Record<
            string,
            { available: number; allocatable: number; gpuShortName: string; gpuVendor: string }
          > = {};
          const key = `${foundGpu?.vendor || 'nvidia'}|${foundGpu.name}`;

          gpuInfos.forEach(() => {
            const gpuCount = fizzGpuCountMap[key] ?? { available: 0, allocatable: 0 };
            fizzGpuCountMap[key] = {
              available: gpuCount.available + availableGPUPerType,
              allocatable: gpuCount.allocatable + 1,
              gpuShortName: foundGpu.name,
              gpuVendor: foundGpu.vendor,
            };
          });

          const fizzAddress = (
            fizzNode.name.startsWith('0x') ? fizzNode.name : `0x${fizzNode.name}`
          ).toLowerCase();

          acc[fizzAddress] = Object.values(fizzGpuCountMap);
          return acc;
        }, {} as Record<string, { available: number; allocatable: number; gpuShortName: string; gpuVendor: string }[]>);

        return { fizzInventory };
      } else if (options.groupBy === 'gpu') {
        const fizzGpuCountMap = new Map<string, { available: number; allocatable: number }>();

        activeFizzNodes.forEach((fizzNode) => {
          const allocatableGpuCount = fizzNode.allocatable.gpu;
          const availableGpuCount = fizzNode.available.gpu;

          if (availableGpuCount <= 0 || allocatableGpuCount <= 0) return;

          const gpuInfos = fizzNode.allocatable.gpu_infos;

          if (!gpuInfos || gpuInfos.length === 0) return;

          const availableGPUPerType = availableGpuCount / gpuInfos.length;
          const foundGpu = gpuInfos.find((info) => !!info.name);

          if (!foundGpu) return;

          const key = `${foundGpu?.vendor || 'nvidia'}|${foundGpu.name}`;
          gpuInfos.forEach(() => {
            const gpuCount = fizzGpuCountMap.get(key) ?? { available: 0, allocatable: 0 };
            fizzGpuCountMap.set(key, {
              available: gpuCount.available + availableGPUPerType,
              allocatable: gpuCount.allocatable + 1,
            });
          });
        });

        const fizzInventory = Array.from(fizzGpuCountMap.keys()).reduce((acc, key) => {
          const [vendor, gpuShortName] = key.split('|');
          if (!vendor || !gpuShortName) return acc;

          const gpuConfig = GpuConfig.find(
            (gpu) => gpu.shortName === gpuShortName && gpu.vendor === vendor
          );
          if (!gpuConfig) return acc;

          const gpuCount = fizzGpuCountMap.get(key)!;

          const { gpuPricePerHour, gpuPricePerMonth } = gpuConfig;

          acc[gpuShortName] = {
            available: gpuCount.available,
            allocatable: gpuCount.allocatable,
            pricePerHr: gpuPricePerHour,
            pricePerMonth: gpuPricePerMonth,
          };

          return acc;
        }, {} as Record<string, { allocatable: number; available: number; pricePerHr: number; pricePerMonth: number }>);

        return { fizzInventory };
      }
    } catch (error) {
      throw error;
    }
  }

  async getProviderInventory(
    providerProxyUrl?: string,
    options?: { groupBy?: 'providerAddress' | 'gpu'; timeout?: number }
  ) {
    try {
      if (!this.wallet) throw new Error('Wallet is required');
      let providers: Awaited<ReturnType<typeof subgraphGetProviders>> | null | Provider[] = null;
      if (this.networkType) {
        providers = await subgraphGetProviders(this.networkType);
      } else {
        providers = await this.providerModule.getAllProviders();
      }

      if (!options) options = { groupBy: 'gpu' };
      if (!options.groupBy) options.groupBy = 'gpu';

      const activeProviders = providers.filter(
        (p) =>
          (p.status === 'Active' || p.status === ProviderStatus.Active) &&
          p.region !== 'dev-spheron' &&
          p.hostUri !== 'localhost'
      );

      const authToken = createAuthorizationToken(this.wallet);

      const activeProviderDetails = (
        await Promise.allSettled(
          activeProviders.map(async (provider) => {
            const reqBody = {
              certificate: provider.certificate,
              authToken,
              method: 'GET',
              url: `https://${provider.hostUri}:8443/status`,
            };

            const url = `${providerProxyUrl}`;
            try {
              const response = await requestPipeline({
                url,
                method: 'POST',
                body: JSON.stringify(reqBody),
                options: {
                  signal: AbortSignal.timeout(options?.timeout || 2000),
                },
              });
              return { walletAddress: provider.walletAddress, response };
            } catch (error) {
              return {
                walletAddress: provider.walletAddress,
                response: { cluster: { inventory: { available: { nodes: [] } } } },
              };
            }
          })
        )
      )
        .map((result) => {
          if (result.status === 'fulfilled')
            return {
              ...result.value.response.cluster.inventory.available,
              walletAddress: result.value.walletAddress.toLowerCase(),
            };
          return null;
        })
        .filter(Boolean);

      if (options.groupBy === 'providerAddress') {
        const providerInventory = activeProviderDetails.reduce((acc, provider) => {
          const fizzGpuCountMap: Record<
            string,
            { available: number; allocatable: number; gpuShortName: string; gpuVendor: string }
          > = {};

          provider.nodes?.forEach((node: any) => {
            const allocatableGpuCount = node.allocatable?.gpu ?? 0;
            const availableGpuCount = node.available?.gpu ?? 0;

            if (availableGpuCount <= 0 || allocatableGpuCount <= 0) return acc;

            const gpuInfos = node.allocatable.gpu_infos;

            if (!gpuInfos || gpuInfos.length === 0) return acc;

            const availableGPUPerType = availableGpuCount / gpuInfos.length;
            const foundGpu = gpuInfos.find((info: { name?: string }) => !!info.name);

            if (!foundGpu) return acc;

            const key = `${foundGpu?.vendor || 'nvidia'}|${foundGpu.name}`;

            gpuInfos.forEach(() => {
              const gpuCount = fizzGpuCountMap[key] ?? { available: 0, allocatable: 0 };
              fizzGpuCountMap[key] = {
                available: gpuCount.available + availableGPUPerType,
                allocatable: gpuCount.allocatable + 1,
                gpuShortName: foundGpu.name,
                gpuVendor: foundGpu.vendor,
              };
            });
          });

          const fizzAddress = (
            provider.walletAddress.startsWith('0x')
              ? provider.walletAddress
              : `0x${provider.walletAddress}`
          ).toLowerCase();

          acc[fizzAddress] = Object.values(fizzGpuCountMap);
          return acc;
        }, {} as Record<string, { available: number; allocatable: number; gpuShortName: string; gpuVendor: string }[]>);

        const filteredProviders = Object.keys(providerInventory).reduce((acc, providerAddress) => {
          if (providerInventory[providerAddress] && providerInventory[providerAddress].length > 0)
            acc[providerAddress] = providerInventory[providerAddress];
          return acc;
        }, {} as typeof providerInventory);

        return { providerInventory: filteredProviders };
      } else if (options.groupBy === 'gpu') {
        const fizzGpuCountMap = new Map<string, { available: number; allocatable: number }>();

        activeProviderDetails.forEach((provider) => {
          provider.nodes?.forEach((node: any) => {
            const allocatableGpuCount = node.allocatable?.gpu ?? 0;
            const availableGpuCount = node.available?.gpu ?? 0;

            if (availableGpuCount <= 0 || allocatableGpuCount <= 0) return;

            const gpuInfos = node.allocatable.gpu_infos;

            if (!gpuInfos || gpuInfos.length === 0) return;

            const availableGPUPerType = availableGpuCount / gpuInfos.length;
            const foundGpu = gpuInfos.find((info: { name?: string }) => !!info.name);

            if (!foundGpu) return;

            const key = `${foundGpu?.vendor || 'nvidia'}|${foundGpu.name}`;
            gpuInfos.forEach(() => {
              const gpuCount = fizzGpuCountMap.get(key) ?? { available: 0, allocatable: 0 };
              fizzGpuCountMap.set(key, {
                available: gpuCount.available + availableGPUPerType,
                allocatable: gpuCount.allocatable + 1,
              });
            });
          });
        });

        const providerInventory = Array.from(fizzGpuCountMap.keys()).reduce(
          (acc, key) => {
            const [vendor, gpuShortName] = key.split('|');
            if (!vendor || !gpuShortName) return acc;

            const gpuConfig = GpuConfig.find(
              (gpu) => gpu.shortName === gpuShortName && gpu.vendor === vendor
            );
            if (!gpuConfig) return acc;

            const gpuCount = fizzGpuCountMap.get(key)!;

            // const { gpuPricePerHour, gpuPricePerMonth } = gpuConfig;

            acc[gpuShortName] = {
              available: gpuCount.available,
              allocatable: gpuCount.allocatable,
              // pricePerHr: gpuPricePerHour,
              // pricePerMonth: gpuPricePerMonth,
            };

            return acc;
          },
          {} as Record<
            string,
            {
              allocatable: number;
              available: number;
              // pricePerHr: number; pricePerMonth: number
            }
          >
        );

        return { providerInventory };
      }
    } catch (error) {
      throw error;
    }
  }
}

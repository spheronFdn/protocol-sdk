import { EscrowModule } from '@modules/escrow';
import { LeaseModule } from '@modules/lease';
import { OrderModule } from '@modules/order';
import {
  OrderMatchedEvent,
  OrderUpdateAcceptedEvent,
  OrderUpdatedEvent,
} from '@modules/order/types';
import { ProviderModule } from '@modules/provider';
import { IProvider } from '@modules/provider/types';
import { SpheronProviderModule } from '@modules/spheron-provider';
import { getManifestIcl, yamlToOrderDetails } from '@utils/deployment';
import { getTokenDetails } from '@utils/index';
import { createAuthorizationToken } from '@utils/provider-auth';
import { NetworkType, RpcUrls } from '@config/index';
import { ethers } from 'ethers';
import {
  CreateDeploymentResponse,
  DeploymentResponse,
  LeaseStatusResponse,
  UpdateDeploymentResponse,
} from './types';
import { SmartWalletBundlerClient } from '@utils/smart-wallet';
import { getSecureProxyUrl } from '@utils/proxy-url';

export class DeploymentModule {
  private wallet: ethers.Wallet | undefined;
  private escrowModule: EscrowModule;
  private orderModule: OrderModule;
  private leaseModule: LeaseModule;
  private providerModule: ProviderModule;
  private networkType: NetworkType;

  constructor(
    provider: ethers.Provider,
    wallet?: ethers.Wallet,
    networkType: NetworkType = 'mainnet',
    smartWalletBundlerClientPromise?: Promise<SmartWalletBundlerClient>,
    rpcUrls?: RpcUrls
  ) {
    this.wallet = wallet;
    this.escrowModule = new EscrowModule(provider, wallet, networkType);
    this.orderModule = new OrderModule(
      provider,
      wallet,
      networkType,
      smartWalletBundlerClientPromise,
      rpcUrls
    );
    this.leaseModule = new LeaseModule(
      provider,
      wallet,
      networkType,
      smartWalletBundlerClientPromise
    );
    this.providerModule = new ProviderModule(provider, networkType);
    this.networkType = networkType;
  }

  async createDeployment(
    iclYaml: string,
    providerProxyUrl: string,
    createOrderMatchedCallback?: (transactionHash: string) => void,
    createOrderFailedCallback?: (transactionHash: string) => void,
    isOperator: boolean = false
  ): Promise<CreateDeploymentResponse> {
    try {
      const { error, orderDetails: details } = yamlToOrderDetails(iclYaml, this.networkType);
      if (error || typeof details === 'undefined') {
        throw new Error('Please verify YAML format');
      }
      const sdlManifest = getManifestIcl(iclYaml);
      const { token, maxPrice, numOfBlocks } = details;
      const tokenDetails = getTokenDetails(token, this.networkType as NetworkType);
      const decimal = 18;
      const totalCost = (Number(maxPrice.toString()) / 10 ** decimal) * Number(numOfBlocks);
      if (!this.wallet) {
        throw new Error('Unable to access wallet');
      }
      const account = await this.wallet.getAddress();

      const tokenBalance = await this.escrowModule.getUserBalance(
        tokenDetails?.symbol || '',
        account,
        isOperator
      );
      if (Number(tokenBalance.unlockedBalance) / 10 ** (tokenDetails?.decimal || 0) < totalCost) {
        throw new Error('Insufficient Balance');
      }
      try {
        const transactionHash = await this.orderModule.createOrder(details);
        const newOrderEvent: Promise<OrderMatchedEvent> = this.orderModule.listenToOrderCreated(
          60_000,
          () => {
            createOrderMatchedCallback?.(transactionHash || '');
          },
          () => {
            createOrderFailedCallback?.(transactionHash || '');
          }
        );
        const { leaseId, providerAddress } = await newOrderEvent;

        const providerDetails: IProvider = await this.providerModule.getProviderDetails(
          providerAddress
        );
        const { certificate, hostUri } = providerDetails;
        const authToken = await createAuthorizationToken(this.wallet);
        const port = details.mode === 0 ? 8543 : 8443;
        const spheronProvider = new SpheronProviderModule(
          `https://${hostUri}:${port}`,
          providerProxyUrl
        );
        try {
          await spheronProvider.submitManfiest(
            certificate,
            authToken,
            leaseId.toString(),
            sdlManifest
          );
          return { leaseId, transactionHash };
        } catch (error) {
          throw new Error('Error occurred in sending manifest');
        }
      } catch (error) {
        throw error;
      }
    } catch (error) {
      throw error;
    }
  }

  async updateDeployment(
    leaseId: string,
    iclYaml: string,
    providerProxyUrl: string,
    updatedOrderLeaseCallback?: (leaseId: string, providerAddress: string) => void,
    updatedOrderLeaseFailedCallback?: () => void,
    updateOrderAcceptedCallback?: (leaseId: string) => void,
    updateOrderFailedCallback?: () => void,
    isOperator: boolean = false
  ): Promise<UpdateDeploymentResponse> {
    try {
      const { error, orderDetails: details } = yamlToOrderDetails(iclYaml, this.networkType);
      if (error || typeof details === 'undefined') {
        throw new Error('Please verify YAML format');
      }
      const sdlManifest = getManifestIcl(iclYaml);
      const { token, maxPrice, numOfBlocks } = details;
      const tokenDetails = getTokenDetails(token, this.networkType as NetworkType);
      const decimal = 18;
      const totalCost =
        Number(Number(maxPrice.toString()) / 10 ** (decimal || 0)) * Number(numOfBlocks);

      if (!this.wallet) {
        throw new Error('Unable to access wallet');
      }
      const account = await this.wallet.getAddress();

      const tokenBalance = await this.escrowModule.getUserBalance(
        tokenDetails?.symbol || '',
        account,
        isOperator
      );
      if (Number(tokenBalance.unlockedBalance) / 10 ** (tokenDetails?.decimal || 0) < totalCost) {
        throw new Error('Insufficient Balance');
      }

      const transactionHash = await this.orderModule.updateOrder(leaseId, details);
      let updateLeaseResponse: OrderUpdatedEvent | undefined;

      const updatedOrderLease: Promise<OrderUpdatedEvent> = this.orderModule.listenToOrderUpdated(
        120_000,
        (leaseId, providerAddress) => {
          updatedOrderLeaseCallback?.(leaseId, providerAddress);
        },
        () => {
          updatedOrderLeaseFailedCallback?.();
        }
      );
      const updateOrderAcceptance: Promise<OrderUpdateAcceptedEvent> =
        this.orderModule.listenToOrderUpdateAccepted(
          60_000,
          async (leaseId: string, providerAddress: string) => {
            updateOrderAcceptedCallback?.(leaseId);

            const providerDetails: IProvider = await this.providerModule.getProviderDetails(
              providerAddress
            );
            const { certificate, hostUri } = providerDetails;
            const port = details.mode === 0 ? 8543 : 8443;
            const spheronProvider = new SpheronProviderModule(
              `https://${hostUri}:${port}`,
              providerProxyUrl
            );
            const authToken = await createAuthorizationToken(this.wallet!);
            await spheronProvider.submitManfiest(
              certificate,
              authToken,
              leaseId as string,
              sdlManifest
            );
            const updateOrderLeaseResponse: OrderUpdatedEvent = await updatedOrderLease;
            updateLeaseResponse = { ...updateOrderLeaseResponse };
          },
          () => {
            updateOrderFailedCallback?.();
          }
        );
      await updateOrderAcceptance;
      return {
        transactionHash,
        leaseId,
        providerAddress: updateLeaseResponse?.providerAddress || '',
      };
    } catch (error) {
      throw error;
    }
  }

  async getDeployment(leaseId: string, providerProxyUrl: string): Promise<DeploymentResponse> {
    try {
      if (!this.wallet) {
        throw new Error('Unable to access wallet');
      }

      if (!leaseId) {
        throw new Error('Provider Lease Id');
      }
      const { providerAddress, fizzId } = await this.leaseModule.getLeaseDetails(leaseId);
      const port = fizzId?.toString() !== '0' ? 8543 : 8443;
      const providerDetails: IProvider = await this.providerModule.getProviderDetails(
        providerAddress
      );
      const { certificate, hostUri } = providerDetails;

      const spheronProvider = new SpheronProviderModule(
        `https://${hostUri}:${port}`,
        providerProxyUrl
      );
      const authToken = await createAuthorizationToken(this.wallet);
      const leaseInfo: LeaseStatusResponse = await spheronProvider.getLeaseStatus(
        certificate,
        authToken,
        leaseId
      );
      const forwardedPorts = leaseInfo?.forwarded_ports || {};
      const serviceKeys = Object.keys(forwardedPorts);
      const secureUrls: Record<string, string[]> = {};
      if (serviceKeys.length > 0) {
        serviceKeys.forEach((serviceName: string) => {
          if (forwardedPorts?.[serviceName]?.length > 0) {
            leaseInfo.forwarded_ports?.[serviceName].forEach((forwardedPort) => {
              const secureUrl = getSecureProxyUrl(
                forwardedPort.externalPort,
                providerDetails.providerId
              );
              if (secureUrls[serviceName]?.length > 0) {
                secureUrls[serviceName].push(secureUrl);
              } else {
                secureUrls[serviceName] = [secureUrl];
              }
            });
          }
        });
      }
      const leaseWithSecureUrls = {
        ...leaseInfo,
        secureUrls,
      };
      return leaseWithSecureUrls;
    } catch (error) {
      throw error;
    }
  }

  async getDeploymentLogs(
    leaseId: string,
    providerProxyUrl: string,
    logsOptions?: { service?: string; tail?: number; startup?: boolean }
  ): Promise<string[]> {
    try {
      if (!this.wallet) {
        throw new Error('Unable to access wallet');
      }

      if (!leaseId) {
        throw new Error('Provider Lease Id');
      }
      const { providerAddress, fizzId } = await this.leaseModule.getLeaseDetails(leaseId);
      const port = fizzId?.toString() !== '0' ? 8543 : 8443;
      const providerDetails: IProvider = await this.providerModule.getProviderDetails(
        providerAddress
      );
      const { certificate, hostUri } = providerDetails;

      const spheronProvider = new SpheronProviderModule(
        `https://${hostUri}:${port}`,
        `${providerProxyUrl}/ws-data`
      );
      const authToken = await createAuthorizationToken(this.wallet);
      const leaseLogs = await spheronProvider.getLeaseLogs(
        certificate,
        authToken,
        leaseId,
        logsOptions?.service,
        logsOptions?.tail,
        logsOptions?.startup
      );
      return leaseLogs;
    } catch (error) {
      throw error;
    }
  }

  async closeDeployment(leaseId: string): Promise<{ transactionHash: string | null }> {
    try {
      if (!this.wallet) {
        throw new Error('Unable to access wallet');
      }

      if (!leaseId) {
        throw new Error('Provider Lease Id');
      }

      const closeLeaseResponse = await this.leaseModule.closeLease(leaseId);

      return { transactionHash: closeLeaseResponse };
    } catch (error) {
      throw error;
    }
  }
}

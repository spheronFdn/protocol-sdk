import { NetworkType, networkType } from '@config/index';
import { EscrowModule } from '@modules/escrow';
import { LeaseModule } from '@modules/lease';
import { OrderModule } from '@modules/order';
import { ProviderModule } from '@modules/provider';
import { SpheronProviderModule } from '@modules/spheron-provider';
import { getManifestIcl, yamlToOrderDetails } from '@utils/deployment';
import { getTokenDetails } from '@utils/index';
import { createAuthorizationToken } from '@utils/provider-auth';
import { ethers } from 'ethers';

export class DeploymentModule {
  private wallet: ethers.Wallet | undefined;
  private escrowModule: EscrowModule;
  private orderModule: OrderModule;
  private leaseModule: LeaseModule;
  private providerModule: ProviderModule;

  constructor(
    provider: ethers.Provider,
    websocketProvider: ethers.WebSocketProvider,
    wallet?: ethers.Wallet
  ) {
    this.wallet = wallet;
    this.escrowModule = new EscrowModule(provider);
    this.orderModule = new OrderModule(provider, websocketProvider, wallet);
    this.leaseModule = new LeaseModule(provider, websocketProvider, wallet);
    this.providerModule = new ProviderModule(provider);
  }

  async createDeployment(iclYaml: string, providerProxyUrl: string) {
    try {
      const { error, orderDetails: details } = yamlToOrderDetails(iclYaml);
      if (error) {
        throw new Error('Please verify YAML format');
      }
      const sdlManifest = getManifestIcl(iclYaml);
      const { token, maxPrice } = details;
      const tokenDetails = getTokenDetails(token, networkType as NetworkType);
      const decimal =
        tokenDetails?.symbol === 'USDT' || tokenDetails?.symbol === 'USDC'
          ? 18
          : tokenDetails?.decimal;
      const totalCost = Number(maxPrice.toString() / 10 ** (decimal || 0)) * 14400;

      if (!this.wallet) {
        throw new Error('Unable to access wallet');
      }
      const account = await this.wallet.getAddress();

      const tokenBalance = await this.escrowModule.getUserBalance(
        tokenDetails?.symbol || '',
        account
      );
      if (Number(tokenBalance.unlockedBalance) / 10 ** (tokenDetails?.decimal || 0) < totalCost) {
        throw new Error('Insufficient Balance');
      }
      try {
        const transaction = await this.orderModule.createOrder(details);
        const newOrderEvent: any = this.orderModule.listenToOrderCreated(
          60_000,
          () => {
            console.log(`Order Created. Txn Hash: ${transaction.hash}`);
          },
          () => {
            console.log(`Could not find Lease. Txn Hash: ${transaction.hash}`);
          }
        );
        const { orderId, providerAddress } = await newOrderEvent;

        const { certificate, hostUri }: { certificate: string; hostUri: string } =
          (await this.providerModule.getProviderDetails(providerAddress)) as any;
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
            orderId.toString(),
            sdlManifest
          );
          console.log('Deployment Created Successfully');
        } catch (error) {
          throw new Error('Error occured in sending manifest');
        }
      } catch (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error creating deployment: ', error);
      throw error;
    }
  }

  async updateDeployment(iclYaml: string, providerProxyUrl: string) {
    try {
      const { error, orderDetails: details } = yamlToOrderDetails(iclYaml);
      if (error) {
        throw new Error('Please verify YAML format');
      }
      delete details.creator;
      delete details.id;
      const sdlManifest = getManifestIcl(iclYaml);
      const { token, maxPrice } = details;
      const tokenDetails = getTokenDetails(token, networkType as NetworkType);
      const decimal =
        tokenDetails?.symbol === 'USDT' || tokenDetails?.symbol === 'USDC'
          ? 18
          : tokenDetails?.decimal;
      const totalCost = Number(maxPrice.toString() / 10 ** (decimal || 0)) * 14400;

      if (!this.wallet) {
        throw new Error('Unable to access wallet');
      }
      const account = await this.wallet.getAddress();

      const tokenBalance = await this.escrowModule.getUserBalance(
        tokenDetails?.symbol || '',
        account
      );
      if (Number(tokenBalance.unlockedBalance) / 10 ** (tokenDetails?.decimal || 0) < totalCost) {
        throw new Error('Insufficient Balance');
      }

      const updatedOrderLease: any = this.orderModule.listenToOrderUpdated(
        60_000,
        (orderId, providerAddress) => {
          console.log('Order Updated', orderId, providerAddress);
        },
        () => {
          console.log('Order Updation Failed');
        }
      );
      const updateOrderAcceptance: any = this.orderModule.listenToOrderUpdateAccepted(
        60_000,
        (orderId, providerAddress) => {
          console.log('Order Update Accepted', orderId, providerAddress);
        },
        () => {
          console.log('Order Update did not get accepted');
        }
      );
      const updateOrderAcceptanceResponse = await updateOrderAcceptance;
      const { orderId, providerAddress } = updateOrderAcceptanceResponse;
      const { certificate, hostUri }: { certificate: string; hostUri: string } =
        (await this.providerModule.getProviderDetails(providerAddress)) as any;
      const port = details.mode === 0 ? 8543 : 8443;
      const spheronProvider = new SpheronProviderModule(
        `https://${hostUri}:${port}`,
        providerProxyUrl
      );
      const authToken = await createAuthorizationToken(this.wallet);
      const updateOrder = await spheronProvider.submitManfiest(
        certificate,
        authToken,
        orderId as string,
        sdlManifest
      );
      const updateOrderLeaseResponse = await updatedOrderLease;
      console.log('Lease Updated ->', updateOrder, updateOrderLeaseResponse);
    } catch (error) {
      console.error('Error in updating deployment: ', error);
      throw error;
    }
  }

  async getDeployment(leaseId: string, providerProxyUrl: string) {
    try {
      if (!this.wallet) {
        throw new Error('Unable to access wallet');
      }

      if (!leaseId) {
        throw new Error('Provider Lease Id');
      }
      const { providerAddress, fizzId } = await this.leaseModule.getLeaseDetails(leaseId);
      const port = fizzId?.toString() !== '0' ? 8543 : 8443;
      const { certificate, hostUri }: { certificate: string; hostUri: string } =
        (await this.providerModule.getProviderDetails(providerAddress)) as any;

      const spheronProvider = new SpheronProviderModule(
        `https://${hostUri}:${port}`,
        providerProxyUrl
      );
      const authToken = await createAuthorizationToken(this.wallet);
      const leaseInfo = await spheronProvider.getLeaseStatus(certificate, authToken, leaseId);
      return leaseInfo;
    } catch (error) {
      console.log('Error in getting lease Info', error);
      throw error;
    }
  }
}

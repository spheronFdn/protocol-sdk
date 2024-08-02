import { LeaseModule } from '@modules/lease';
import { requestPipeline } from '@utils/index';
import { ethers } from 'ethers';

export class SpheronProviderModule {
  private providerHostUrl: string;
  private proxyUrl: string;

  constructor(providerHostUrl: string, proxyUrl: string) {
    this.providerHostUrl = providerHostUrl;
    this.proxyUrl = proxyUrl;
  }

  async closeDeployment(certificate: string) {
    const url = `${this.proxyUrl}/deployment/close`;
    try {
      const response = await requestPipeline({
        url,
        method: 'POST',
        body: JSON.stringify({ providerHostUrl: this.providerHostUrl, certificate }),
      });
      return response;
    } catch (error) {
      console.log('Error in close deployment ->', error);
      throw error;
    }
  }

  async version() {
    const url = `${this.proxyUrl}/version`;
    try {
      const response = await requestPipeline({
        url,
        method: 'POST',
        body: JSON.stringify({ providerHostUrl: this.providerHostUrl }),
      });
      return response;
    } catch (error) {
      console.log('Error in getting deployment version ->', error);
      throw error;
    }
  }

  async submitManfiest(certificate: string, sdlManifest: any) {
    if (!certificate) {
      console.log('Certificate not found');
      return;
    }

    const url = `${this.proxyUrl}/deployment/manifest`;
    try {
      const response = await requestPipeline({
        url,
        method: 'POST',
        body: JSON.stringify({
          certificate,
          sdlManifest,
          providerHostUrl: this.providerHostUrl,
        }),
      });
      return response;
    } catch (error) {
      console.log('Error in submit manifest  ->', error);
      throw error;
    }
  }

  async getLeaseStatus(leaseId: string) {
    if (!leaseId) {
      console.log('Lease ID not found');
      return;
    }

    const url = `${this.proxyUrl}/lease/${leaseId}/status`;
    try {
      const response = await requestPipeline({
        url,
        method: 'POST',
        body: JSON.stringify({ providerHostUrl: this.providerHostUrl }),
      });
      return response;
    } catch (error) {
      console.log('Error in get lease status ->', error);
      throw error;
    }
  }

  async getKubeEvents(leaseId: string) {
    if (!leaseId) {
      console.log('Lease ID not found');
      return;
    }

    const url = `${this.proxyUrl}/lease/${leaseId}/kubeevents`;
    try {
      const response = await requestPipeline({
        url,
        method: 'POST',
        body: JSON.stringify({ providerHostUrl: this.providerHostUrl }),
      });
      return response;
    } catch (error) {
      console.log('Error in get kube events ->', error);
      throw error;
    }
  }

  async getLeaseLogs(leaseId: string) {
    if (!leaseId) {
      console.log('Lease ID not found');
      return;
    }

    const url = `${this.proxyUrl}/lease/${leaseId}/logs`;
    try {
      const response = await requestPipeline({
        url,
        method: 'POST',
        body: JSON.stringify({ providerHostUrl: this.providerHostUrl }),
      });
      return response;
    } catch (error) {
      console.log('Error in get lease logs ->', error);
      throw error;
    }
  }

  async getLeaseServiceStatus(leaseId: string, serviceName: string) {
    if (!leaseId) {
      console.log('Lease ID not found');
      return;
    }

    if (!serviceName) {
      console.log('Service name not found');
      return;
    }
    const url = `${this.proxyUrl}/lease/${leaseId}/service/${serviceName}/status`;
    try {
      const response = await requestPipeline({
        url,
        method: 'POST',
        body: JSON.stringify({ providerHostUrl: this.providerHostUrl }),
      });
      return response;
    } catch (error) {
      console.log('Error in get lease service status ->', error);
      throw error;
    }
  }

  async leaseShell(leaseId: string, certificate: string) {
    if (!leaseId) {
      console.log('Lease ID not found');
      return;
    }

    const url = `${this.proxyUrl}/lease/${leaseId}/shell`;
    try {
      const response = await requestPipeline({
        url,
        method: 'POST',
        body: JSON.stringify({ providerHostUrl: this.providerHostUrl, certificate }),
      });
      return response;
    } catch (error) {
      console.log('Error in leaseShell ->', error);
      throw error;
    }
  }

  async closeDeploymentAndLease(provider: ethers.Provider, leaseId: string, certificate: string) {
    try {
      const lease = new LeaseModule(provider);
      const leaseResponse = await lease.closeLease(leaseId);
      const closeDeployment = await this.closeDeployment(certificate);
      return { lease: leaseResponse, closeDeployment };
    } catch (error) {
      console.log('Error in close deployment and Lease ->', error);
      throw error;
    }
  }
}

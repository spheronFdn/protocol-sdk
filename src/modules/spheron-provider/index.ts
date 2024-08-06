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

  async closeDeployment(certificate: string, authToken: string) {
    const url = `${this.proxyUrl}`;
    try {
      const response = await requestPipeline({
        url,
        method: 'POST',
        body: JSON.stringify({
          certificate,
          authToken,
          url: `${this.providerHostUrl}/deployment/close`,
          method: 'POST',
        }),
      });
      return response;
    } catch (error) {
      console.log('Error in close deployment ->', error);
      throw error;
    }
  }

  async version() {
    const url = `${this.proxyUrl}`;
    try {
      const response = await requestPipeline({
        url,
        method: 'POST',
        body: JSON.stringify({
          url: `${this.providerHostUrl}/version`,
        }),
      });
      return response;
    } catch (error) {
      console.log('Error in getting deployment version ->', error);
      throw error;
    }
  }

  async submitManfiest(certificate: string, authToken: string, sdlManifest: any) {
    if (!certificate) {
      console.log('Certificate not found');
      return;
    }

    const url = `${this.proxyUrl}`;
    try {
      const reqBody = {
        certificate,
        authToken,
        method: 'PUT',
        url: `${this.providerHostUrl}/deployment/manifest`,
        body: JSON.stringify(sdlManifest),
      };
      const response = await requestPipeline({
        url,
        method: 'POST',
        body: JSON.stringify(reqBody),
      });
      return response;
    } catch (error) {
      console.log('Error in submit manifest  ->', error);
      throw error;
    }
  }

  async getLeaseStatus(certificate: string, authToken: string, leaseId: string) {
    if (!leaseId) {
      console.log('Lease ID not found');
      return;
    }

    const reqBody = {
      certificate,
      authToken,
      method: 'GET',
      url: `${this.providerHostUrl}/lease/${leaseId}/status`,
    };

    const url = `${this.proxyUrl}`;
    try {
      const response = await requestPipeline({
        url,
        method: 'POST',
        body: JSON.stringify(reqBody),
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

  async closeDeploymentAndLease(
    provider: ethers.Provider,
    leaseId: string,
    certificate: string,
    authToken: string
  ) {
    try {
      const lease = new LeaseModule(provider);
      const leaseResponse = await lease.closeLease(leaseId);
      const closeDeployment = await this.closeDeployment(certificate, authToken);
      return { lease: leaseResponse, closeDeployment };
    } catch (error) {
      console.log('Error in close deployment and Lease ->', error);
      throw error;
    }
  }
}

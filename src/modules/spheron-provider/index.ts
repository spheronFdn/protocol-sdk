import { requestPipeline } from '@utils/index';

export class SpheronProviderModule {
  private providerHostUrl: string;
  private proxyUrl: string;

  constructor(providerHostUrl: string, proxyUrl: string) {
    this.providerHostUrl = providerHostUrl;
    this.proxyUrl = proxyUrl;
  }

  async closeDeployment(certificate: string) {
    const url = `${this.proxyUrl}/deployment/close`;
    const response = await requestPipeline({
      url,
      method: 'POST',
      body: JSON.stringify({ providerHostUrl: this.providerHostUrl, certificate }),
    });
    return response;
  }

  async version() {
    const url = `${this.proxyUrl}/version`;
    const response = await requestPipeline({
      url,
      method: 'POST',
      body: JSON.stringify({ providerHostUrl: this.providerHostUrl }),
    });
    return response;
  }

  async submitManfiest(certificate: string) {
    if (!certificate) {
      console.log('Certificate not found');
      return;
    }

    const url = `${this.proxyUrl}/deployment/manifest`;
    const response = await requestPipeline({
      url,
      method: 'POST',
      body: JSON.stringify({
        certificate,
        providerHostUrl: this.providerHostUrl,
      }),
    });
    return response;
  }

  async getLeaseStatus(leaseId: string) {
    if (!leaseId) {
      console.log('Lease ID not found');
      return;
    }

    const url = `${this.proxyUrl}/lease/${leaseId}/status`;
    const response = await requestPipeline({
      url,
      method: 'POST',
      body: JSON.stringify({ providerHostUrl: this.providerHostUrl }),
    });
    return response;
  }

  async getKubeEvents(leaseId: string) {
    if (!leaseId) {
      console.log('Lease ID not found');
      return;
    }

    const url = `${this.proxyUrl}/lease/${leaseId}/kubeevents`;
    const response = await requestPipeline({
      url,
      method: 'POST',
      body: JSON.stringify({ providerHostUrl: this.providerHostUrl }),
    });
    return response;
  }

  async getLeaseLogs(leaseId: string) {
    if (!leaseId) {
      console.log('Lease ID not found');
      return;
    }

    const url = `${this.proxyUrl}/lease/${leaseId}/logs`;
    const response = await requestPipeline({
      url,
      method: 'POST',
      body: JSON.stringify({ providerHostUrl: this.providerHostUrl }),
    });
    return response;
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
    const response = await requestPipeline({
      url,
      method: 'POST',
      body: JSON.stringify({ providerHostUrl: this.providerHostUrl }),
    });
    return response;
  }

  async leaseShell(leaseId: string, certificate: string) {
    if (!leaseId) {
      console.log('Lease ID not found');
      return;
    }

    const url = `${this.proxyUrl}/lease/${leaseId}/shell`;
    const response = await requestPipeline({
      url,
      method: 'POST',
      body: JSON.stringify({ providerHostUrl: this.providerHostUrl, certificate }),
    });
    return response;
  }
}

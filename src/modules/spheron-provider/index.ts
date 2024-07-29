import { requestPipeline } from '@utils/index';

export class SpheronProviderModule {
  private providerUrl: string;
  private certificate: string;
  private leaseId: string;
  private serviceName: string;

  constructor(
    providerUrl: string,
    certificate: string = '',
    leaseId: string = '',
    serviceName: string = ''
  ) {
    this.certificate = certificate;
    this.providerUrl = providerUrl;
    this.leaseId = leaseId;
    this.serviceName = serviceName;
  }

  async version(providerUrl: string) {
    const url = `${providerUrl}/version`;
    const response = await requestPipeline({ url, method: 'GET' });
    return response;
  }

  async submitManfiest(providerUrl: string, certificate: string) {
    if (!certificate) {
      console.log('Certificate not found');
      return;
    }

    const url = `${providerUrl}/deployment/manifest`;
    const response = await requestPipeline({
      url,
      method: 'PUT',
      body: JSON.stringify({
        certificate,
      }),
    });
    return response;
  }

  async getLeaseStatus(providerUrl: string, leaseId: string) {
    if (!leaseId) {
      console.log('Lease ID not found');
      return;
    }

    const url = `${providerUrl}/lease/${leaseId}/status`;
    const response = await requestPipeline({ url, method: 'GET' });
    return response;
  }

  async getKubeEvents(providerUrl: string, leaseId: string) {
    if (!leaseId) {
      console.log('Lease ID not found');
      return;
    }

    const url = `${providerUrl}/lease/${leaseId}/kubeevents`;
    const response = await requestPipeline({ url, method: 'GET' });
    return response;
  }

  async getLeaseLogs(providerUrl: string, leaseId: string) {
    if (!leaseId) {
      console.log('Lease ID not found');
      return;
    }

    const url = `${providerUrl}/lease/${leaseId}/logs`;
    const response = await requestPipeline({ url, method: 'GET' });
    return response;
  }

  async getLeaseServiceStatus(providerUrl: string, leaseId: string, serviceName: string) {
    if (!leaseId) {
      console.log('Lease ID not found');
      return;
    }

    if (!serviceName) {
      console.log('Service name not found');
      return;
    }
    const url = `${providerUrl}/lease/${leaseId}/service/${serviceName}/status`;
    const response = await requestPipeline({ url, method: 'GET' });
    return response;
  }

  async leaseShell(providerUrl: string, leaseId: string) {
    if (!leaseId) {
      console.log('Lease ID not found');
      return;
    }

    const url = `${providerUrl}/lease/${leaseId}/shell`;
    const response = await requestPipeline({ url, method: 'POST' });
    return response;
  }
}

import { GSEQ, OSEQ } from '@config/index';
import { LeaseModule } from '@modules/lease';
import { requestPipeline } from '@utils/index';
import { ServiceManifest } from '@utils/manifest-utils';
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
          url: `${this.providerHostUrl}/spheron/deployment/close`,
          method: 'PUT',
        }),
      });
      return response;
    } catch (error) {
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
      throw error;
    }
  }

  async submitManfiest(
    certificate: string,
    authToken: string,
    leaseId: string,
    sdlManifest: { name: string; services: ServiceManifest[] }[]
  ) {
    // if (!certificate) {
    //   console.log('Certificate not found');
    //   return;
    // }

    const url = `${this.proxyUrl}`;
    try {
      const reqBody = {
        certificate,
        authToken,
        method: 'PUT',
        url: `${this.providerHostUrl}/deployment/${leaseId}/manifest`,
        body: JSON.stringify(sdlManifest),
      };
      const response = await requestPipeline({
        url,
        method: 'POST',
        body: JSON.stringify(reqBody),
      });
      return response;
    } catch (error) {
      throw error;
    }
  }

  async getLeaseStatus(certificate: string, authToken: string, leaseId: string) {
    if (!leaseId) {
      throw new Error('Lease ID not found');
    }

    const reqBody = {
      certificate,
      authToken,
      method: 'GET',
      url: `${this.providerHostUrl}/lease/${leaseId}/${GSEQ}/${OSEQ}/status`,
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
      return { services: null, forwarded_ports: null };
    }
  }

  async getKubeEvents(
    certificate: string,
    authToken: string,
    leaseId: string,
    service = '',
    tail = 100000
  ) {
    if (!leaseId) {
      throw new Error('Lease ID not found');
    }

    const reqBody = {
      // eslint-disable-next-line prettier/prettier
      url: `${
        this.providerHostUrl
      }/lease/${leaseId}/${GSEQ}/${OSEQ}/kubeevents?follow=false&tail=${tail}${
        service ? `&service=${service}` : ''
      }`,
      method: 'GET',
      authToken,
      certificate,
    };

    const url = `${this.proxyUrl}`;
    try {
      const response = await requestPipeline({
        method: 'POST',
        body: JSON.stringify(reqBody),
        url,
      });
      return response;
    } catch (error) {
      throw error;
    }
  }

  async getLeaseLogs(
    certificate: string,
    authToken: string,
    leaseId: string,
    service = '',
    tail = 100000,
    startup = false
  ) {
    if (!leaseId) {
      throw new Error('Lease ID not found');
    }
    const reqBody = {
      // eslint-disable-next-line prettier/prettier
      url: `${
        this.providerHostUrl
      }/lease/${leaseId}/${GSEQ}/${OSEQ}/logs?follow=false&tail=${tail}&startup=${startup}${
        service ? `&service=${service}` : ''
      }`,
      method: 'GET',
      authToken,
      certificate,
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
      return [];
    }
  }

  async getLeaseServiceStatus(
    certificate: string,
    authToken: string,
    leaseId: string,
    serviceName: string
  ) {
    if (!leaseId) {
      throw new Error('Lease ID not found');
    }

    if (!serviceName) {
      throw new Error('Service name not found');
    }

    const reqBody = {
      url: `${this.providerHostUrl}/lease/${leaseId}/${GSEQ}/${OSEQ}/service/${serviceName}/status`,
      method: 'GET',
      authToken,
      certificate,
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
      throw error;
    }
  }

  async leaseShell(certificate: string, authToken: string, leaseId: string) {
    if (!leaseId) {
      throw new Error('Lease ID not found');
    }

    const reqBody = {
      url: `${this.providerHostUrl}/lease/${leaseId}/${GSEQ}/${OSEQ}/shell`,
      method: 'POST',
      certificate,
      authToken,
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
      throw error;
    }
  }

  async closeDeploymentAndLease(
    certificate: string,
    authToken: string,
    provider: ethers.Provider,
    leaseId: string
  ) {
    try {
      const lease = new LeaseModule(provider);
      const leaseResponse = await lease.closeLease(leaseId);
      const closeDeployment = await this.closeDeployment(certificate, authToken);
      return { lease: leaseResponse, closeDeployment };
    } catch (error) {
      throw error;
    }
  }
}

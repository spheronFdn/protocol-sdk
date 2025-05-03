import { ethers } from 'ethers';

export interface CreateDeploymentResponse {
  leaseId: string;
  transactionHash: string | null;
}

export interface UpdateDeploymentResponse {
  leaseId: string;
  providerAddress: string;
  transactionHash: string | null;
}

export interface DeploymentResponse {
  services: Record<string, ServiceDetails> | null;
  forwarded_ports: Record<string, ForwardedPort[]> | null;
  ips: string[] | null;
}

interface ServiceDetails {
  name: string;
  available: number;
  total: number;
  uris: string[] | null;
  observed_generation: number;
  replicas: number;
  updated_replicas: number;
  ready_replicas: number;
  available_replicas: number;
  container_statuses: ContainerStatus[];
  creationTimestamp: string;
}

interface ContainerStatus {
  name: string;
  state: ContainerState;
  lastState: Record<string, unknown>;
  ready: boolean;
  restartCount: number;
  image: string;
  imageID: string;
  containerID: string;
  started: boolean;
}

interface ContainerState {
  running?: { startedAt: string };
  terminated?: { exitCode: number; reason: string; finishedAt: string };
  waiting?: { reason: string; message: string };
}

interface ForwardedPort {
  host: string;
  port: number;
  externalPort: number;
  proto: string;
  name: string;
}

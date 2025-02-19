export type ServiceExposeHttpOptions = {
  maxBodySize: number;
  readTimeout: number;
  sendTimeout: number;
  nextTries: number;
  nextTimeout: number;
  nextCases: string[];
};

export type Hosts = string[] | null;

export type ServiceExpose = {
  port: number;
  portRange: string | number;
  portRangeAs: string | number;
  usePublicPort: boolean;
  externalPort: number;
  proto: string;
  service: string;
  global: boolean;
  hosts: Hosts;
  httpOptions: ServiceExposeHttpOptions;
  ip: string;
  endpointSequenceNumber: number;
};

export type ExposeTo = {
  service?: string;
  global?: boolean;
  http_options: HTTPOptions;
  ip: string;
};

export type HTTPOptions = {
  max_body_size: number;
  read_timeout: number;
  send_timeout: number;
  next_tries: number;
  next_timeout: number;
  next_cases: string[];
};

export type Accept = string[] | null;

export type Expose = {
  port: number;
  as: number;
  port_range: number | string;
  port_range_as: number | string;
  use_public_port: boolean;
  proto?: string;
  to?: ExposeTo[];
  accept: Accept;
  http_options: HTTPOptions;
};

export type Dependency = {
  service: string;
};

export type ServiceStorageParams = {
  name: string;
  mount: string;
  readOnly: boolean;
};

export type ServiceParams = {
  storage?: Record<string, ServiceStorageParams>;
};

export type ServiceImageCredentials = {
  host: string;
  email?: string;
  username: string;
  password: string;
};

export interface Service {
  image: string;
  pull_policy?: string;
  command: string[] | null;
  args: string[] | null;
  env: string[] | null;
  expose: Expose[];
  dependencies?: Dependency[];
  params?: ServiceParams | null;
  credentials?: ServiceImageCredentials;
}

export type ICL = {
  services: Record<string, Service>;
};

export interface GPUAttributesManifest {
  key: string;
  value: string;
}
export interface ServiceManifest extends Omit<Service, 'expose'> {
  name: string;
  resources: {
    cpu: { units: { val: string } };
    memory: { size: { val: string } };
    storage: { size: { val: string } } | { size: { val: string } }[];
    gpu?: { units: { val: string }; attributes: GPUAttributesManifest[] };
  };
  count: number | undefined;
  expose: ServiceExpose[];
}

function computeEndpointSequenceNumbers(icl: ICL): Record<string, number> {
  return Object.fromEntries(
    Object.values(icl.services).flatMap(
      (service) =>
        service.expose?.flatMap((expose) =>
          expose.to
            ? expose.to
                .filter((to) => to.global && to.ip?.length > 0)
                .map((to) => to.ip)
                .sort()
                .map((ip, index) => [ip, index + 1])
            : []
        ) || []
    )
  );
}

function parseServiceProto(proto?: string): string {
  const raw = proto?.toUpperCase();
  switch (raw) {
    case 'TCP':
    case '':
    case undefined:
      return 'TCP';
    case 'UDP':
      return 'UDP';
    default:
      throw new Error('ErrUnsupportedServiceProtocol');
  }
}

function manifestExposeService(to: ExposeTo): string {
  return to.service || '';
}

function manifestExposeGlobal(to: ExposeTo): boolean {
  return to.global || false;
}

function manifestExposeHosts(expose: Expose): Hosts {
  return expose.accept || null;
}

export function manifestExpose(service: Service, icl: ICL): ServiceExpose[] {
  const endpointSequenceNumbers = computeEndpointSequenceNumbers(icl);
  return service.expose?.flatMap((expose) =>
    expose.to
      ? expose.to.map((to) => ({
          port: expose.port,
          portRange: expose.port_range,
          portRangeAs: expose.port_range_as,
          usePublicPort: expose.use_public_port,
          externalPort: expose.as || 0,
          proto: parseServiceProto(expose.proto),
          service: manifestExposeService(to),
          global: manifestExposeGlobal(to),
          hosts: manifestExposeHosts(expose),
          httpOptions: {
            maxBodySize: 1048576,
            readTimeout: 60000,
            sendTimeout: 60000,
            nextTries: 3,
            nextTimeout: 0,
            nextCases: ['error', 'timeout'],
          },
          ip: to.ip || '',
          endpointSequenceNumber: endpointSequenceNumbers[to.ip] || 0,
        }))
      : []
  );
  // .sort((a, b) => {
  //   if (a.service != b.service) return a.service.localeCompare(b.service);
  //   if (a.port != b.port) return a.port - b.port;
  //   if (a.proto != b.proto) return a.proto.localeCompare(b.proto);
  //   if (a.global != b.global) return a.global ? -1 : 1;

  //   return 0;
  // });
}

function exposeShouldBeIngress(expose: {
  proto: string;
  global: boolean;
  externalPort: number;
  port: number;
}): boolean {
  const externalPort = expose.externalPort === 0 ? expose.port : expose.externalPort;
  return expose.global && expose.proto === 'TCP' && externalPort === 80;
}

export function serviceResourceEndpoints(service: Service, icl: ICL) {
  const endpointSequenceNumbers = computeEndpointSequenceNumbers(icl);
  const endpoints = service.expose?.flatMap((expose) =>
    expose.to
      ? expose.to
          .filter((to) => to.global)
          .flatMap((to) => {
            const exposeSpec = {
              port: expose.port,
              externalPort: expose.as || 0,
              proto: parseServiceProto(expose.proto),
              global: !!to.global,
            };
            const kind = exposeShouldBeIngress(exposeSpec) ? 0 : 1;
            const defaultEp = { kind, sequence_number: 0 };
            const leasedEp =
              to.ip?.length > 0
                ? { kind: 2, sequence_number: endpointSequenceNumbers[to.ip] || 0 }
                : undefined;
            return leasedEp ? [defaultEp, leasedEp] : [defaultEp];
          })
      : []
  );

  return endpoints;
}

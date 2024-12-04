export type ServiceExposeHttpOptions = {
  maxBodySize: number;
  readTimeout: number;
  sendTimeout: number;
  nextTries: number;
  nextTimeout: number;
  nextCases: string[];
};

export type ServiceExpose = {
  port: number;
  externalPort: number;
  proto: string;
  service: any;
  global: boolean;
  hosts: any;
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

export type Accept = {
  items?: string[];
};

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

export type Service = {
  image: string;
  command: string[] | null;
  args: string[] | null;
  env: string[] | null;
  expose: Expose[];
  dependencies?: Dependency[];
  params?: ServiceParams;
  credentials?: ServiceImageCredentials;
};

function computeEndpointSequenceNumbers(sdl: any) {
  return Object.fromEntries(
    Object.values(sdl.services).flatMap(
      (service: any) =>
        service.expose?.flatMap((expose: any) =>
          expose.to
            ? expose.to
                .filter((to: any) => to.global && to.ip?.length > 0)
                .map((to: any) => to.ip)
                .sort()
                .map((ip: any, index: number) => [ip, index + 1])
            : []
        ) || []
    )
  );
}

function parseServiceProto(proto?: string) {
  const raw = proto?.toUpperCase();
  let result = 'TCP';

  switch (raw) {
    case 'TCP':
    case '':
    case undefined:
      result = 'TCP';
      break;
    case 'UDP':
      result = 'UDP';
      break;
    default:
      throw new Error('ErrUnsupportedServiceProtocol');
  }

  return result;
}

function manifestExposeService(to: ExposeTo) {
  return to.service || '';
}

function manifestExposeGlobal(to: ExposeTo) {
  return to.global || false;
}

function manifestExposeHosts(expose: Expose) {
  return expose.accept || null;
}

export function manifestExpose(service: Service, sdl: any): ServiceExpose[] {
  const endpointSequenceNumbers = computeEndpointSequenceNumbers(sdl);
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
}) {
  const externalPort = expose.externalPort === 0 ? expose.port : expose.externalPort;

  return expose.global && expose.proto === 'TCP' && externalPort === 80;
}

export function serviceResourceEndpoints(service: Service, sdl: any) {
  const endpointSequenceNumbers = computeEndpointSequenceNumbers(sdl);
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

            const defaultEp =
              kind !== 0 ? { kind: kind, sequence_number: 0 } : { kind: 0, sequence_number: 0 };

            const leasedEp =
              to.ip?.length > 0
                ? {
                    kind: 2,
                    sequence_number: endpointSequenceNumbers[to.ip] || 0,
                  }
                : undefined;

            return leasedEp ? [defaultEp, leasedEp] : [defaultEp];
          })
      : []
  );

  return endpoints;
}

import * as yaml from 'js-yaml';
import { getTokenDetails } from '@utils/index';
import { NetworkType } from '@config/index';
import {
  AttributesManifest,
  getServiceParams,
  ICL,
  manifestExpose,
  Service,
  ServiceManifest,
  serviceResourceEndpoints,
} from './manifest-utils';
import { compressOrderSpec } from './spec';
import { CSTTestnet } from '@contracts/addresses';
import { OrderDetails } from '@modules/order/types';

enum Tier {
  One,
  Two,
  Three,
  Four,
  Five,
  Six,
  Seven,
}

const validTiers: { [x: string]: Tier[] } = {
  secured1: [Tier.One],
  secured2: [Tier.Two],
  secured3: [Tier.Three],
  community1: [Tier.Four],
  community2: [Tier.Five],
  community3: [Tier.Six],
  community4: [Tier.Seven],
  secured: [Tier.One, Tier.Two, Tier.Three],
  community: [Tier.Four, Tier.Five, Tier.Six, Tier.Seven],
  'community-default': [Tier.One, Tier.Two, Tier.Three, Tier.Four, Tier.Five, Tier.Six, Tier.Seven],
};

const getTierKey = (inputTiers: number[]): string | undefined => {
  for (const key in validTiers) {
    const tiers = validTiers[key];
    if (
      tiers.length === inputTiers.length &&
      tiers.every((tier, index) => tier === inputTiers[index])
    ) {
      return key;
    } else {
      return 'community';
    }
  }
  return undefined;
};

const convertTimeToNumber = (timeStr: string): number => {
  // Retrieve the number and the unit from the timeStr
  const numStr = timeStr.replace(/[^\d]/g, '');
  const unit = timeStr.replace(/\d/g, '');

  // Convert number string to an integer
  const num = parseInt(numStr, 10);
  if (isNaN(num)) {
    console.error('Error converting number');
    return 0;
  }

  // Calculate the total units based on the time unit
  switch (unit) {
    case 'min':
      return num * 60 * 0.5;
    case 'h':
      return num * 60 * 60 * 0.5;
    case 'd':
      return num * 24 * 60 * 60 * 0.5;
    case 'mon':
      // Assuming a month as 30 days
      return num * 30 * 24 * 60 * 60 * 0.5;
    case 'y':
      // Assuming a year as 365 days
      return num * 365 * 24 * 60 * 60 * 0.5;
    default:
      console.error('Unsupported time unit:', unit);
      return 0;
  }
};

const getTimeInMaxUnits = (timeInSeconds: number): string => {
  if (timeInSeconds <= 0) return '0s';

  const units = [
    { unit: 'd', value: 86400 },
    { unit: 'h', value: 3600 },
    { unit: 'min', value: 60 },
    { unit: 's', value: 1 },
  ];

  for (const { unit, value } of units) {
    if (timeInSeconds >= value) {
      return `${Math.floor(timeInSeconds / value)}${unit}`;
    }
  }

  return '0s';
};

const convertSize = (storage: string): number => {
  const value = Number(storage.substring(0, storage.length - 2));
  const unit = storage.substring(storage.length - 2, storage.length);

  switch (unit) {
    case 'Mi':
      return value * 1024 * 1024;
    case 'Gi':
      return value * 1024 * 1024 * 1024;
    case 'Ti':
      return value * 1024 * 1024 * 1024 * 1024;
    default:
      return value;
  }
};

const convertToMaxPricePerBlock = (token: string, tokenPrice: number) => {
  // Define the number of blocks per day (0.5 blocks per second)
  const blocksPerDay = 1800;
  tokenPrice *= 10 ** 18;
  const maxPricePerBlock = Math.round(tokenPrice / blocksPerDay);
  return maxPricePerBlock;
};

interface GPUModel {
  model: string;
}

interface GPUAttributes {
  vendor: {
    [key: string]: GPUModel[];
  };
  req_vram?: string;
}

interface GPUInput {
  attributes: GPUAttributes;
  units: number;
}

interface ConvertedAttribute {
  Key: string;
  Value: string;
}

interface ConvertedGPU {
  Attributes: ConvertedAttribute[];
  Units: number;
}

const convertGpuAttributes = (gpu: GPUInput): ConvertedGPU => {
  const attributes: ConvertedAttribute[] = [];

  for (const vendor in gpu.attributes.vendor) {
    gpu.attributes.vendor[vendor].forEach((item) => {
      const model = item.model;
      const key = `vendor/${vendor}/model/${model}`;
      attributes.push({
        Key: key,
        Value: 'true',
      });
    });
  }

  if (gpu.attributes?.req_vram) {
    attributes.push({
      Key: 'req_vram',
      Value: gpu.attributes.req_vram,
    });
  }

  return {
    Attributes: attributes,
    Units: gpu.units,
  };
};

const convertStorageAttributes = (
  storageAttributes: Record<string, any>
): ConvertedAttribute[] | undefined => {
  if (!storageAttributes) return undefined;

  const pairs = Object.keys(storageAttributes).map((key) => ({
    Key: key,
    Value: storageAttributes[key].toString(),
  }));

  if (storageAttributes.class === 'ram' && !('persistent' in storageAttributes)) {
    pairs.push({ Key: 'persistent', Value: 'false' });
  }

  pairs.sort((a, b) => a.Key.localeCompare(b.Key));

  return pairs;
};

interface Pricing {
  amount: number;
  token?: string;
  denom?: string;
}

interface Placement {
  pricing: Record<string, Pricing>;
  attributes?: {
    region?: string;
    region_exclude?: string;
    desired_fizz?: string;
    desired_provider?: string;
    cpu_model?: string;
    bandwidth?: string;
    provider_exclude?: string;
    fizz_exclude?: string;
    req_vram?: string;
  };
}

interface ComputeProfile {
  resources: {
    cpu: { units: number };
    memory: { size: string };
    storage:
      | { size: string; attributes?: Record<string, any> }
      | { size: string; attributes?: Record<string, any> }[];
    gpu?: GPUInput;
  };
}

interface Profile {
  placement: Record<string, Placement>;
  compute: Record<string, ComputeProfile>;
  duration: string;
  mode?: string;
  tier?: string;
}

interface IclYaml {
  profiles: Profile;
  services: Record<string, Service>;
  deployment: Record<string, Record<string, { count?: number }>>;
  version: string;
}

export const yamlToOrderDetails = (
  yamlString: string,
  networkType: NetworkType
): { error: boolean; orderDetails?: OrderDetails; message?: string } => {
  try {
    const icl = yaml.load(yamlString) as IclYaml;

    let maxPrice = 0;
    let denom: string = '';
    const profiles = icl.profiles || {};
    const services = icl.services || {};
    const placements = profiles.placement || {};
    const firstPlacementKey = Object.keys(placements)[0];
    const firstPlacement = placements[firstPlacementKey];

    if (firstPlacement?.pricing && Object.keys(firstPlacement.pricing).length > 0) {
      if (
        Object.keys(firstPlacement.pricing).some((key) => {
          const amount = firstPlacement.pricing?.[key]?.amount;
          return amount === undefined || isNaN(amount);
        })
      ) {
        throw new Error('Please set a valid amount');
      }
      maxPrice = Object.keys(firstPlacement.pricing).reduce((acc, curr) => {
        denom =
          denom ||
          firstPlacement.pricing?.[curr]?.token ||
          firstPlacement.pricing?.[curr]?.denom ||
          '';
        const maxPricePerHours = convertToMaxPricePerBlock(
          denom,
          Number(firstPlacement.pricing?.[curr].amount)
        );
        return acc + (maxPricePerHours as number);
      }, 0);
    }

    const parsedResource = Object.keys(profiles.compute || {}).map((computeProfile, index) => {
      const obj = profiles.compute?.[computeProfile];
      if (!obj) return null;

      let replicaCount = 1;

      for (const key of Object.keys(firstPlacement || {})) {
        const count = icl.deployment?.[computeProfile]?.[key]?.count;
        if (count !== undefined) {
          replicaCount = count;
          break;
        }
      }

      return {
        Name: computeProfile,
        Resources: {
          ID: index + 1,
          CPU: {
            Units: obj.resources?.cpu ? Math.round(obj.resources.cpu.units * 1000) : 0,
            Attributes: [],
          },
          Memory: {
            Units: obj.resources?.memory ? convertSize(obj.resources.memory.size) : 0,
            Attributes: [],
          },
          Storage: Array.isArray(obj.resources?.storage)
            ? obj.resources.storage.map((storage) => ({
                Name: 'default',
                Attributes: storage.attributes ? convertStorageAttributes(storage.attributes) : [],
                Units: convertSize(storage.size),
              }))
            : obj.resources?.storage
            ? [
                {
                  Name: 'default',
                  Attributes: obj.resources.storage.attributes
                    ? convertStorageAttributes(obj.resources.storage.attributes)
                    : [],
                  Units: convertSize(obj.resources.storage.size),
                },
              ]
            : [],
          GPU:
            obj.resources?.gpu && Object.keys(obj.resources.gpu).length > 0
              ? convertGpuAttributes(obj.resources.gpu)
              : {
                  Units: 0,
                  Attributes: [],
                },
          Endpoints:
            serviceResourceEndpoints(services[computeProfile], icl as ICL)?.map((item) => ({
              Kind: item.kind,
              SequenceNumber: item.sequence_number,
            })) || [],
        },
        ReplicaCount: replicaCount,
      };
    });

    const attributes = [
      {
        Key: 'cpu_model',
        Value: firstPlacement?.attributes?.cpu_model || 'any',
      },
      {
        Key: 'bandwidth',
        Value: firstPlacement?.attributes?.bandwidth || 'any',
      },
    ];

    if (firstPlacement?.attributes?.region) {
      attributes.push({
        Key: 'region',
        Value: firstPlacement.attributes.region,
      });
    }

    if (firstPlacement?.attributes?.region_exclude) {
      attributes.push({
        Key: 'region_exclude',
        Value: firstPlacement.attributes.region_exclude,
      });
    }

    if (firstPlacement?.attributes?.desired_fizz) {
      attributes.push({
        Key: 'desired_fizz',
        Value: firstPlacement.attributes.desired_fizz,
      });
    }

    if (firstPlacement?.attributes?.desired_provider) {
      attributes.push({
        Key: 'desired_provider',
        Value: firstPlacement.attributes.desired_provider,
      });
    }

    if (firstPlacement?.attributes?.provider_exclude) {
      attributes.push({
        Key: 'provider_exclude',
        Value: firstPlacement.attributes.provider_exclude,
      });
    }

    if (firstPlacement?.attributes?.fizz_exclude) {
      attributes.push({
        Key: 'fizz_exclude',
        Value: firstPlacement.attributes.fizz_exclude,
      });
    }

    const placementsRequirement = attributes.length > 0 ? { Attributes: attributes } : {};

    const specNew = {
      Name: firstPlacementKey,
      PlacementsRequirement: placementsRequirement,
      Services: parsedResource,
    };
    const compressedSpec = compressOrderSpec(specNew);

    const orderDetails = {
      maxPrice: typeof maxPrice === 'number' ? BigInt(maxPrice) : BigInt(0),
      numOfBlocks: BigInt(convertTimeToNumber(profiles.duration || '1h')), // > 24 hours = 4 * 86400
      token: getTokenDetails(denom, networkType as NetworkType)?.address || CSTTestnet,
      spec: compressedSpec,
      version: BigInt(Number(icl.version)),
      mode: profiles.mode === 'fizz' ? 0 : 1, // Make util function for mode
      tier: validTiers[profiles.tier || 'community'] || [
        ...validTiers['secured'],
        ...validTiers['community'],
      ],
    };

    return { error: false, orderDetails };
  } catch (error) {
    return {
      error: true,
      message: (error as Error)?.message || 'Error parsing YAML',
    };
  }
};

export const getKeysByTierValues = (tierValues: Tier[]): string[] => {
  const resultKeys: string[] = [];

  for (const [key, tiers] of Object.entries(validTiers)) {
    if (tierValues.every((tier) => tiers.includes(tier))) {
      resultKeys.push(key);
    }
  }

  return resultKeys;
};

export const getKeysForTiersString = (tiersString: string): string[] => {
  const tiersArray = tiersString.split(',').map((tier) => {
    switch (tier.trim()) {
      case '0':
        return Tier.One;
      case '1':
        return Tier.Two;
      case '2':
        return Tier.Three;
      case '3':
        return Tier.Four;
      case '4':
        return Tier.Five;
      case '5':
        return Tier.Six;
      case '6':
        return Tier.Seven;
      default:
        throw new Error(`Invalid tier value: ${tier}`);
    }
  });

  return getKeysByTierValues(tiersArray);
};

interface Model {
  model: string;
}

interface Input {
  vendor: Record<string, Model[]>;
}

const convertGpuAttributesIcl = (input: Input): AttributesManifest[] => {
  const output: AttributesManifest[] = [];

  for (const vendor in input.vendor) {
    if (input.vendor.hasOwnProperty(vendor)) {
      input.vendor[vendor].forEach((item) => {
        output.push({
          key: `vendor/${vendor}/model/${item.model}`,
          value: 'true',
        });
      });
    }
  }

  return output;
};

const convertStorageAttrbutesIcl = (
  storageAttributes: Record<string, any>
): AttributesManifest[] => {
  const pairs = Object.keys(storageAttributes).map((key) => ({
    key,
    value: storageAttributes[key].toString(),
  }));

  if (storageAttributes.class === 'ram' && !('persistent' in storageAttributes)) {
    pairs.push({ key: 'persistent', value: 'false' });
  }

  pairs.sort((a, b) => a.key.localeCompare(b.key));

  return pairs;
};

const getStorageAttributesIcl = (
  storage:
    | { size: string; attributes?: Record<string, any> }
    | { size: string; attributes?: Record<string, any> }[]
): AttributesManifest[] | undefined => {
  if (Array.isArray(storage)) {
    return convertStorageAttrbutesIcl(storage[0].attributes || {});
  }
  return storage.attributes ? convertStorageAttrbutesIcl(storage.attributes) : undefined;
};

export const getManifestIcl = (
  yamlInput: string
): { name: string; services: ServiceManifest[] }[] => {
  const input = yaml.load(yamlInput) as IclYaml;

  const placements = input.profiles?.placement;
  const placement = Object.keys(placements)[0];

  return [
    {
      name: placement,
      services: Object.entries(input.services).map(([serviceName, serviceData], index) => {
        const { image, env, command, args, credentials, pull_policy, params } =
          serviceData as Service;
        const { cpu, memory, storage, gpu } = input.profiles.compute[serviceName].resources;
        const count = input.deployment[serviceName][placement].count;

        return {
          name: serviceName,
          image: image,
          command: command,
          args: args,
          env: env,
          credentials,
          pull_policy,
          resources: {
            id: index + 1,
            cpu: {
              units: {
                val: (cpu.units * 1000).toString(), // Convert 0.1 to 100
              },
            },
            memory: {
              size: {
                val: convertSize(memory.size).toString(),
              },
            },
            storage: [
              {
                name: 'default',
                size: {
                  val: Array.isArray(storage)
                    ? convertSize(storage[0].size).toString()
                    : convertSize(storage.size).toString(),
                },
                attributes: getStorageAttributesIcl(storage),
              },
            ],
            gpu: {
              units: {
                val: gpu?.units.toString() || '0',
              },
              attributes: gpu?.attributes ? convertGpuAttributesIcl(gpu?.attributes) : [],
            },
            endpoints: serviceResourceEndpoints(serviceData, input),
          },
          count,
          expose: manifestExpose(serviceData, input),
          params: params ? getServiceParams(params) : null,
        };
      }),
    },
  ];
};

import * as yaml from 'js-yaml';
import { getTokenDetails } from '@utils/index';
import { networkType, NetworkType } from '@config/index';
import { manifestExpose, serviceResourceEndpoints } from './manifest-utils';
import { compressOrderSpec } from './spec';

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
      return num * 60 * 4;
    case 'h':
      return num * 60 * 60 * 4;
    case 'd':
      return num * 24 * 60 * 60 * 4;
    case 'mon':
      // Assuming a month as 30 days
      return num * 30 * 24 * 60 * 60 * 4;
    case 'y':
      // Assuming a year as 365 days
      return num * 365 * 24 * 60 * 60 * 4;
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
  // Define the number of blocks per day (4 blocks per second)
  const blocksPerDay = 14400;
  // Adjust for USDT precision
  // if (token === "USDT" || token === "USDC") {
  //   // Convert USDT price from 6 decimals to 18 decimals by adding 12 zeroes
  //   tokenPrice *= 10 ** 12;
  // }
  tokenPrice *= 10 ** 18;
  // Calculate maxPricePerBlock
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

  return {
    Attributes: attributes,
    Units: gpu.units,
  };
};

export const yamlToOrderDetails = (yamlString: string): any => {
  try {
    const sdl = yaml.load(yamlString) as any;

    let maxPrice = 0;
    let denom: string = '';
    const profiles = sdl.profiles || {};
    const services = sdl.services || {};
    const placements = profiles.placement || {};
    const firstPlacement = Object.keys(placements)[0];

    if (Object.keys(placements[firstPlacement].pricing).length > 0) {
      if (
        Object.keys(placements[firstPlacement].pricing).some((key) => {
          return (
            placements[firstPlacement].pricing?.[key].amount.toString() === '' ||
            isNaN(placements[firstPlacement].pricing?.[key].amount)
          );
        })
      ) {
        throw new Error('Please set a valid amount');
      }
      maxPrice = Object.keys(placements[firstPlacement].pricing).reduce((acc, curr) => {
        denom = !denom
          ? placements[firstPlacement].pricing?.[curr]?.token ||
            placements[firstPlacement].pricing?.[curr]?.denom
          : denom;
        const maxPricePerHours = convertToMaxPricePerBlock(
          denom,
          placements[firstPlacement].pricing?.[curr].amount.toString()
        );
        return acc + (maxPricePerHours as number);
      }, 0);
    }

    let parsedResource = Object.keys(profiles.compute).map((computeProfile, index) => {
      const obj = profiles.compute[`${computeProfile}`];

      const placementKeys = Object.keys(firstPlacement);
      let replicaCount = 1;

      for (const key of placementKeys) {
        const count = sdl.deployment[computeProfile]?.[key]?.count;
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
            Units: parseInt((obj.resources?.cpu?.units * 1000).toString()),
            Attributes: [],
          },
          Memory: {
            Units: convertSize(obj.resources?.memory?.size),
            Attributes: [],
          },
          Storage: Array.isArray(obj?.resources?.storage)
            ? obj?.resources?.storage?.map((storage: { size: string }) => {
                return {
                  Name: 'default',
                  Attributes: [],
                  Units: convertSize(storage.size),
                };
              })
            : [
                {
                  Name: 'default',
                  Attributes: [],
                  Units: convertSize(obj?.resources?.storage.size),
                },
              ],
          GPU:
            Object.keys(obj?.resources?.gpu || {}).length > 0
              ? convertGpuAttributes(obj.resources.gpu)
              : {
                  Units: 0,
                  Attributes: [],
                },
          Endpoints:
            serviceResourceEndpoints(services[computeProfile], sdl)?.map((item) => ({
              Kind: item.kind,
              SequenceNumber: item.sequence_number,
            })) || [],
        },
        ReplicaCount: replicaCount,
      };
    });

    const spec = {
      Name: firstPlacement,
      PlacementsRequirement: {
        ProviderWallets: null,
        Attributes: [
          {
            Key: 'region',
            Value: placements[firstPlacement].attributes?.region || 'us-central',
          },
        ],
      },
      Services: parsedResource,
    };

    const specNew = {
      Name: firstPlacement,
      PlacementsRequirement: {
        Attributes: [
          {
            Key: "region",
            Value:
              placements[firstPlacement].attributes?.region || "us-central",
          },
        ],
      },
      Services: parsedResource,
    };
    const compressedSpec = compressOrderSpec(specNew);

    const orderDetails = {
      // name: profiles.name || name || "",
      // region: placements[firstPlacement].attributes?.region || "",
      // metrics: [BigInt(0), BigInt(0), BigInt(0)],
      // uptime: 0,
      // reputation: 0,
      // slashes: 0,
      maxPrice: typeof maxPrice === 'number' ? BigInt(maxPrice) : BigInt(0),
      numOfBlocks: BigInt(convertTimeToNumber(profiles.duration)), // > 24 hours = 4 * 86400
      token: getTokenDetails(denom, networkType as NetworkType)?.address,
      // spec: JSON.stringify(spec),
      spec: compressedSpec,
      version: BigInt(Number(sdl.version)),
      mode: profiles.mode === 'fizz' ? 0 : 1, // Make util function for mode
      tier: validTiers[profiles.tier] || [...validTiers['secured'], ...validTiers['community']],
    };

    return { error: false, orderDetails };
  } catch (error) {
    console.error('Error parsing YAML:', error);
    return {
      error: true,
      message: (error as any)?.message || 'Error parsing YAML',
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

export const exportToYaml = (obj: any, orderServices: any) => {
  const services = {} as any;
  const compute = {} as any;
  const pricing = {} as any;
  const deployment = {} as any;
  JSON.parse(obj.specs.specs).Resources.forEach((resource: any, index: any) => {
    const serviceName = Object.keys(orderServices.services)[index];
    const images = orderServices.services[serviceName]
      ? `${
          orderServices.services[serviceName]?.container_statuses[0]?.image?.split('/')[1] || ''
        }/${orderServices.services[serviceName]?.container_statuses[0]?.image.split('/')[2]}`
      : '';

    services[serviceName] = {
      image: images,
      expose: orderServices.forwarded_ports[serviceName]
        ? [
            {
              port: orderServices.forwarded_ports[serviceName][0]?.port,
              as: orderServices.forwarded_ports[serviceName][0].externalPort,
              to: [{ global: true }],
            },
          ]
        : [],
      env: [],
    };

    compute[serviceName] = {
      resources: {
        cpu: { units: resource.Resources.CPU.Units / 1000 },
        memory: {
          size: `${resource.Resources.Memory.Units / (1024 * 1024 * 1024)}Gi`,
        },
        storage: [
          {
            size: `${resource.Resources.Storage[0].Units / (1024 * 1024 * 1024)}Gi`,
          },
        ],

        ...(resource.Resources.GPU.Units > 0 && {
          gpu: {
            units: resource.Resources.GPU.Units,
            attributes:
              resource.Resources.GPU.Attributes.length > 0
                ? {
                    vendor: {
                      [`${resource.Resources.GPU.Attributes[0].Key.split('/')[1]}`]: [
                        {
                          model: resource.Resources.GPU.Attributes[0].Key.split('/')[3],
                        },
                      ],
                    },
                  }
                : [],
          },
        }),
      },
    };

    pricing[serviceName] = {
      token: obj.token.symbol,
      amount: '',
    };

    deployment[serviceName] = {
      [`${JSON.parse(obj.specs.specs).Name}`]: {
        profile: serviceName,
        count: resource.ReplicaCount,
      },
    };
  });

  const yamlObject = {
    version: '1.0',

    services,

    profiles: {
      duration: getTimeInMaxUnits(Number(obj.numOfBlocks) / 4),
      mode: JSON.parse(obj.specs.specs)?.mode?.toString() === '0' ? 'fizz' : 'provider',
      tier: [getTierKey(obj.specs.tier)],
      compute,
      placement: {
        [`${JSON.parse(obj.specs.specs).Name}`]: {
          attributes: {
            region: getRegion(JSON.parse(obj.specs.specs)),
          },
          pricing,
        },
      },
    },

    deployment,
  };

  const updateYaml = yaml.dump(yamlObject);

  return updateYaml;
};

interface Model {
  model: string;
}

interface Input {
  vendor: Record<string, Model[]>;
}

interface Output {
  key: string;
  value: string;
}

function convertGpuAttributesSdl(input: Input): Output[] {
  const output: Output[] = [];

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
}

export const getManifestIcl = (yamlInput: any): any => {
  const input = yaml.load(yamlInput) as any;

  const placements = input.profiles.placement;
  const placement = Object.keys(placements)[0];

  return [
    {
      name: placement,
      services: Object.entries(input.services).map(([serviceName, serviceData], index) => {
        const { image, expose, env, command, args } = serviceData as any;
        const { cpu, memory, storage, gpu } = input.profiles.compute[serviceName].resources;
        const count = input.deployment[serviceName][placement].count;

        return {
          name: serviceName,
          image: image,
          command: command,
          args: args,
          env: env,
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
              },
            ],
            gpu: {
              units: {
                val: gpu?.units.toString() || '0',
              },
              attributes: gpu?.attributes ? convertGpuAttributesSdl(gpu?.attributes) : [],
            },
            endpoints: serviceResourceEndpoints(serviceData as any, input),
          },
          count: count,
          expose: manifestExpose(serviceData as any, input),
          params: null,
        };
      }),
    },
  ];
};

export const sampleIcl = `# Welcome to the Spheron Network! 🚀☁
# This file is called a Infrastructure Composition Language (ICL)
# ICL is a human friendly data standard for declaring deployment attributes.
# The ICL file is a "form" to request resources from the Network.
# ICL is compatible with the YAML standard and similar to Docker Compose files.

---
version: "1.0"
services:
  gpu-test:
    image: ghcr.io/open-webui/open-webui:ollama
    expose:
      - port: 8888
        as: 80
        to:
          - global: true
    env:
      - TEST=test
profiles:
  name: hello-world
  duration: 2min
  tier:
    - community
  compute:
    gpu-test:
      resources:
        cpu:
          units: 1
        memory:
          size: 20Gi
        storage:
          - size: 100Gi
        gpu:
          units: 1
          attributes:
            vendor:
              nvidia:
                - model: a40
                - model: a10
                - model: rtx4090
                - model: rtx3090Ti
                - model: rtx4080
                - model: rtx3090
                - model: h100
                - model: a100
                - model: v100
                - model: rtx3060
                - model: p100
                - model: rtx4000
                - model: rtxa4000
                - model: rtx2070
                - model: gtx1080
                - model: 1080Ti
  placement:
    westcoast:
      attributes:
        region: us-central
      pricing:
        gpu-test:
          denom: USDT
          amount: 50000000
deployment:
  gpu-test:
    westcoast:
      profile: gpu-test
      count: 1
`;

export const getRegion = (specs: any): string | undefined => {
  const regionAttribute = specs.PlacementsRequirement.Attributes.find(
    (attribute: any) => attribute.Key === 'region'
  );
  return regionAttribute?.Value;
};

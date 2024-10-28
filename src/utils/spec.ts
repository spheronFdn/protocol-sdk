export const decompressProviderSpec = (input: string): object => {
  // Replace keys with the proper JSON key names
  let formattedString = input
    .replace(/n:/g, '"Name":')
    .replace(/r:/g, '"Region":')
    .replace(/a:/g, '"Attributes":')
    .replace(/k:/g, '"Key":')
    .replace(/v:/g, '"Value":');

  // Add quotes around string values (excluding numbers and already quoted values)
  formattedString = formattedString.replace(/:(\w+([./-]\w+)*)([},\]])/g, ':"$1"$3');

  // Parse the formatted string into JSON
  try {
    console.log({ input, formattedString });
    return JSON.parse(formattedString);
  } catch (error) {
    console.error('Error parsing JSON:', error);
    throw error;
  }
};

const decompressOrderSpecData = (compressed: string): object => {
  const mapping: { [key: string]: string } = {
    n: 'Name',
    pr: 'PlacementsRequirement',
    pw: 'ProviderWallets',
    a: 'Attributes',
    k: 'Key',
    v: 'Value',
    // s: "Services", // Top level only
    r: 'Resources',
    i: 'ID',
    c: 'CPU',
    m: 'Memory',
    s: 'Storage',
    g: 'GPU',
    e: 'Endpoints',
    u: 'Units',
    t: 'Type',
  };

  const parseAttributes = (arr: any[]): any[] => {
    return arr.map((attr) => ({
      Key: attr.k,
      Value: attr.v,
    }));
  };

  const parseEndpoints = (arr: any[]): any[] => {
    return arr.map((endpoint) => ({
      Kind: endpoint.k,
      SequenceNumber: endpoint.s,
    }));
  };

  const transform = (obj: any, isTopLevel = false): any => {
    if (Array.isArray(obj)) {
      return obj.map((item) => transform(item));
    } else if (typeof obj === 'object' && obj !== null) {
      const transformed: any = {};
      for (const key in obj) {
        // Replace "s" with "Services" only at the top level, otherwise use "Resources"
        const mappedKey = isTopLevel && key === 's' ? mapping.s : mapping[key] || key;

        if (mappedKey === 'Attributes' && Array.isArray(obj[key])) {
          transformed[mappedKey] = parseAttributes(obj[key]);
        } else if (mappedKey === 'Endpoints' && Array.isArray(obj[key])) {
          transformed[mappedKey] = parseEndpoints(obj[key]);
        } else {
          transformed[mappedKey] = transform(obj[key]);
        }
      }
      return transformed;
    }
    return obj;
  };

  // Preprocess the compressed string to make it JSON-compliant
  const preprocess = (str: string): string => {
    return str
      .replace(/([{,])(\w+):/g, '$1"$2":') // Add quotes around keys
      .replace(/:([\w-/]+)/g, ':"$1"') // Add quotes around simple values, including paths like "vendor/nvidia/model"
      .replace(/:"(\d+|true|false|null)"/g, ':$1') // Remove quotes from numbers, booleans, and null
      .replace(/},\s*}/g, '}}') // Remove trailing commas before closing braces
      .replace(/],\s*}/g, ']}'); // Remove trailing commas in arrays
  };

  // Preprocess and parse the input string
  const preprocessedString = preprocess(compressed);
  const parsed = JSON.parse(preprocessedString);
  return transform(parsed, true);
};

const renameFields = (data: any) => {
  if (data.Storage) {
    // Rename the top-level "Storage" key to "Services"
    data.Services = data.Storage;
    delete data.Storage;

    // Iterate over each service in the Services array
    data.Services.forEach((service: any) => {
      if (service.CPU) {
        // Rename "CPU" to "ReplicaCount"
        service.ReplicaCount = service.CPU;
        delete service.CPU;
      }
    });
  }
  return data;
};

export const decompressOrderSpec = (compressedString: string) => {
  return renameFields(decompressOrderSpecData(compressedString));
};

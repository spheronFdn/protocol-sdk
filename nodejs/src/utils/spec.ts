export const decompressProviderSpec = (input: string): object => {
  // Replace keys with the proper JSON key names
  let formattedString = input
    .replace(/n:/g, '"Name":')
    .replace(/r:/g, '"Region":')
    .replace(/a:/g, '"Attributes":')
    .replace(/k:/g, '"Key":')
    .replace(/v:/g, '"Value":');
  
  // Add quotes around values (excluding numbers, booleans, and already quoted values)
  formattedString = formattedString.replace(/:([\w\s./-]+)([},\]])/g, (match, p1, p2) => {
    // If the value is not already quoted and is not a number/boolean, add quotes
    if (!/^".*"$/.test(p1) && isNaN(Number(p1)) && p1 !== "true" && p1 !== "false") {
      return `:"${p1.trim()}"${p2}`;
    }
    return match;
  });

  // Parse the formatted string into JSON
  try {
    return JSON.parse(formattedString);
  } catch (error) {
    throw error;
  }
}

type Compressed = string;
type Original = Record<string, any>;

const keyMap: Record<string, string> = {
  Name: "n",
  PlacementsRequirement: "pr",
  ProviderWallets: "pw",
  Attributes: "a",
  Key: "k",
  Value: "v",
  Services: "s", // Top level only
  Resources: "r",
  ID: "i",
  CPU: "c",
  Units: "u",
  Memory: "m",
  Storage: "s",
  GPU: "g",
  Endpoints: "e",
  Kind: "k",
  SequenceNumber: "s",
  ReplicaCount: "c",
};

export const compressOrderSpec = (input: Original): Compressed => {
  const compressObject = (obj: any, isTopLevel = false): string => {
    if (Array.isArray(obj)) {
      return `[${obj.map((item) => compressObject(item)).join(",")}]`;
    } else if (typeof obj === "object" && obj !== null) {
      return `{${Object.entries(obj)
        .map(([key, value]) => {
          // Replace "Services" only at the top level, otherwise replace with "Resources"
          const newKey =
            isTopLevel && key === "Services" ? keyMap.Services : keyMap[key] || key;
          return `${newKey}:${compressObject(value, false)}`;
        })
        .join(",")}}`;
    }
    return `${obj}`;
  };

  // Assume the top level object starts as true
  return compressObject(input, true);
}

// Decompress string to JSON
const decompressOrderSpecData = (compressed: string): object => {
  const mapping: { [key: string]: string } = {
    n: "Name",
    pr: "PlacementsRequirement",
    pw: "ProviderWallets",
    a: "Attributes",
    k: "Key",
    v: "Value",
    // s: "Services", // Top level only
    r: "Resources",
    i: "ID",
    c: "CPU",
    m: "Memory",
    s: "Storage",
    g: "GPU",
    e: "Endpoints",
    u: "Units",
    t: "Type",
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
    } else if (typeof obj === "object" && obj !== null) {
      const transformed: any = {};
      for (const key in obj) {
        // Replace "s" with "Services" only at the top level, otherwise use "Resources"
        const mappedKey =
          isTopLevel && key === "s" ? mapping.s : mapping[key] || key;

        if (mappedKey === "Attributes" && Array.isArray(obj[key])) {
          transformed[mappedKey] = parseAttributes(obj[key]);
        } else if (mappedKey === "Endpoints" && Array.isArray(obj[key])) {
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
      .replace(/:"(\d+|true|false|null)"/g, ":$1") // Remove quotes from numbers, booleans, and null
      .replace(/},\s*}/g, "}}") // Remove trailing commas before closing braces
      .replace(/],\s*}/g, "]}"); // Remove trailing commas in arrays
  };

  // Preprocess and parse the input string
  const preprocessedString = preprocess(compressed);
  const parsed = JSON.parse(preprocessedString);
  return transform(parsed, true);
}

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
}

export const decompressOrderSpec = (compressedString: string) => {
  return renameFields(decompressOrderSpecData(compressedString));
};

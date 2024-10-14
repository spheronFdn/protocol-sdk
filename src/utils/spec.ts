export const decompressSpec = (compressed: string): object => {
  const mapping: { [key: string]: string } = {
    n: "Name",
    a: "Attributes",
    k: "Key",
    v: "Value",
    r: "Region",
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
  console.log("Preprocessed String:", preprocessedString); // Debugging line to check the output
  const parsed = JSON.parse(preprocessedString);
  return transform(parsed, true);
}
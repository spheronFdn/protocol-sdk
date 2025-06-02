import { NetworkType } from '@config/index';

const SUBGRAPH_URL =
  'https://api.goldsky.com/api/public/project_cm16apa2e540c01wz70x34xzf/subgraphs/sph-base-sepolia-new/1.0.0/gn';

const SUBGRAPH_MAINNET_URL =
  'https://api.goldsky.com/api/public/project_cm16apa2e540c01wz70x34xzf/subgraphs/sph-base-mainnet/1.0.2/gn';

const SUBGRAPH_MAP = {
  testnet: SUBGRAPH_URL,
  mainnet: SUBGRAPH_MAINNET_URL,
};

export const fetchSubgraphData = async (
  query: string,
  variables: Record<string, any> = {},
  networkType: NetworkType
) => {
  const response = await fetch(SUBGRAPH_MAP[networkType], {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  const data = await response.json();
  if (data.errors) {
    throw new Error(JSON.stringify(data.errors));
  }
  return data.data;
};

export const getAllFizzNodesQuery = `
query ($first: Int!, $gt: BigInt!) {
  fizzNodes(
    first: $first
    where: {fizzId_gt: $gt}
    orderBy: fizzId
    orderDirection: asc
  ) {
    fizzId
    walletAddress
    attributes {
      id
      category
      units
    }
    providerId
    status
    joinTimestamp
    rewardWallet
    isDenied
    paymentsAccepted {
        id
    }
    spec
    attributes {
      category
      attributeId
      units
    }
    rewardPerEra
    pendingRewards
    lastClaimedEra
    totalLeases
    activeLeases
    earnings {
      earned
      balance
      token {
        name
      }
    }
    slashedAmount
    slashedEras
    region{
      id
    }
  }
}
`;
const getProvidersQuery = `
  query getProviders($first: Int, $skip: Int) {
    providers(first: $first, skip: $skip, orderBy: providerId, orderDirection: asc) {
      id
      providerId
      walletAddress
      hostUri
      status
      certificate
      region {
        id
      }
    }
  }
`;

export const subgraphGetProviders = async (networkType: NetworkType) => {
  const batchSize = 100;
  let skip = 0;
  const providers: Array<{
    id: string;
    providerId: string;
    walletAddress: string;
    hostUri: string;
    status: string;
    region: string;
    certificate: string;
  }> = [];

  while (true) {
    const variables = { first: batchSize, skip };
    const { providers: fetchedProviders } = await fetchSubgraphData(
      getProvidersQuery,
      variables,
      networkType
    );

    if (fetchedProviders.length === 0) break;

    providers.push(...fetchedProviders.map((p: any) => ({ ...p, region: p.region.id })));
    skip += batchSize;
  }

  return providers;
};

const totalFizzNodesQuery = `
  query {
    globalAttribute(id: "GLOBAL") {
      totalFizzNodes
    }
  }
`;

const getFizzNodeIdsQuery = `
query getFizzNodes($first: Int, $skip: Int) {
  fizzNodes(first: $first, skip: $skip, orderBy: fizzId, orderDirection: asc) {
    fizzId
    walletAddress
  }
}`;

export const subgraphGetFizzNodeIds = async (networkType: NetworkType) => {
  const batchSize = 1000;
  const { globalAttribute } = await fetchSubgraphData(totalFizzNodesQuery, undefined, networkType);
  const totalFizzNodes = parseInt(globalAttribute.totalFizzNodes, 10);

  const numBatches = Math.ceil(totalFizzNodes / batchSize);

  const requests: Array<() => Promise<any>> = [];
  for (let i = 0; i < numBatches; i++) {
    const skip = i * batchSize;
    const variables = { first: batchSize, skip };
    requests.push(
      () =>
        fetchSubgraphData(getFizzNodeIdsQuery, variables, networkType) as Promise<{
          fizzNodes: Array<{
            fizzId: string;
          }>;
        }>
    );
  }

  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const chunkSize = 200;
  const results: any[] = [];
  for (let i = 0; i < requests.length; i += chunkSize) {
    const chunk = requests.slice(i, i + chunkSize).map((req) => req());
    results.push(...(await Promise.all(chunk))); // Process each chunk in parallel
    if (i + chunkSize < requests.length) {
      await delay(100); // Add a 1-second delay between chunks
    }
  }

  const allFizzNodes = results.flatMap((result) => result.fizzNodes);
  // Step 4: Process fetched data and aggregate region counts
  return allFizzNodes;
};

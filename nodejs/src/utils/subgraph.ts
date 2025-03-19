import { NetworkType } from '@config/index';

const SUBGRAPH_URL =
  'https://gateway.thegraph.com/api/2b6ae639b99052f02452fe8e65007ee3/subgraphs/id/8XPmGxKD883S8hGW3QqrZs872FJYMM5VFx6akwVY6Nmo';

const SUBGRAPH_MAINNET_URL =
  'https://api.studio.thegraph.com/query/10660/spheron-network/version/latest';

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

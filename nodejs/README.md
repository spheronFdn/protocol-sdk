# Spheron Protocol SDK for Node.js

## Table of Contents

1. [Introduction](#introduction)
2. [Installation](#installation)
3. [Usage](#usage)
   - [Initializing the SDK](#initializing-the-sdk)
   - [Modules Overview](#modules-overview)
4. [Modules](#modules)
   - [Escrow Module](#escrow-module)
   - [Deployment Module](#deployment-module)
   - [Lease Module](#lease-module)
5. [Examples](#examples)
6. [Error Handling](#error-handling)
7. [Contributing](#contributing)
8. [License](#license)

## Introduction

The **Spheron Protocol SDK for Node.js** provides a comprehensive set of modules to interact with the Spheron decentralized infrastructure. This includes modules for lease management, deployment operations, and escrow functionality.

## Prerequisites

- Node.js: Version 14 or higher.
- npm: Version 6 or higher.
- Docker: If you plan to run the Provider Proxy Server using Docker.
- Git: For cloning the repository if running the Provider Proxy Server from source.

## Installation

Install the Spheron SDK for Node.js using npm:

```bash
npm install @spheron/protocol-sdk
```

Or using yarn:

```bash
yarn add @spheron/protocol-sdk
```

## Usage

### Initializing the SDK

To use the Spheron SDK, import it and initialize it with the desired configuration:

```javascript
const { SpheronSDK } = require('@spheron/protocol-sdk');

// Basic initialization
const sdk = new SpheronSDK({
  networkType: 'mainnet' // 'mainnet' (default) or 'testnet'
});

// Initialization with private key for write operations
const sdk = new SpheronSDK({
  networkType: 'mainnet',
  privateKey: 'your-private-key'
});

// Initialization with custom RPC URLs and gasless options
const sdk = new SpheronSDK({
  networkType: 'mainnet',
  privateKey: 'your-private-key',
  rpcUrls: {
    http: 'your-http-rpc-url',
    websocket: 'your-websocket-rpc-url'
  },
  gaslessOptions: {
    type: 'coinbase', // or 'biconomy'
    bundlerUrl: 'your-bundler-url',
    paymasterUrl: 'your-paymaster-url'
  }
});
```

**Note:** Never hardcode your private key; use environment variables or secure key management systems.

#### Constructor Parameters:

- `networkType` (optional): Specifies the environment. Possible values are `'mainnet'` (default) or `'testnet'`.
- `privateKey` (optional): Private key for signing transactions.
- `rpcUrls` (optional): Custom RPC URLs for the network:
  - `http`: HTTP RPC endpoint
  - `websocket`: WebSocket RPC endpoint
- `gaslessOptions` (optional): Configuration for gasless transactions:
  - `type`: Type of gasless service ('coinbase' or 'biconomy')
  - `bundlerUrl`: URL for the bundler service
  - `paymasterUrl`: URL for the paymaster service

##### Using Gasless Transactions

If you're using gasless transactions (`gaslessOptions`), you need to:

1. Get your smart wallet details first:
```javascript
const smartWalletDetails = await sdk.escrow.getSmartWalletDetails();
console.log('Smart Wallet Address:', smartWalletDetails.address);
console.log('Smart Wallet Balance:', smartWalletDetails.balance);
```

2. Deposit funds into your smart wallet before making any deposits using `depositBalance`.

### Modules Overview

The SDK provides several modules for different functionalities:

- **Escrow Module**: Handles escrow-related operations, such as user balance management, deposits, withdrawals, and earnings management.
- **Deployment Module**: Facilitates the creation, updating, and closing of deployments.
- **Lease Module**: Manages compute leases, including retrieving lease details and managing active leases.

## Modules

### Escrow Module

The Escrow Module handles operations related to the escrow system, allowing users to manage their token balances within the Spheron ecosystem.

#### 1. `getUserBalance`

Fetches the user's balance from the escrow contract for a given token and wallet address.

```javascript
const balance = await sdk.escrow.getUserBalance('uSPON', '0xYourWalletAddress');
console.log('Your uSPON balance in escrow is:', balance);
```

##### Parameters:

- `token` (string): The token symbol. Supported tokens are `uSPON`, `USDC`.
- `walletAddress` (string, optional): The wallet address to query. If not provided, the wallet associated with the provided private key will be used.

##### Returns:

- `Promise<object>`: An object containing the user's balance information:
  - `lockedBalance` (string): The locked balance of the specified token in the escrow.
  - `unlockedBalance` (string): The unlocked balance of the specified token in the escrow.
  - `token` (object): Details about the token:
    - `name` (string): The name of the token.
    - `symbol` (string): The symbol of the token.
    - `decimal` (number): The number of decimal places for the token.

#### 2. `depositBalance`

Deposits a specified amount of tokens into the escrow contract.

**Note:** If you're using gasless transactions (`gaslessOptions`), you must first ensure your smart wallet has sufficient funds:

1. Get your smart wallet details:
```javascript
const smartWalletDetails = await sdk.escrow.getSmartWalletDetails();
console.log('Smart Wallet Address:', smartWalletDetails.address);
console.log('Smart Wallet Balance:', smartWalletDetails.balance);
```

2. Fund your smart wallet with native tokens (e.g., ETH on Base network) before making deposits.

Once your smart wallet is funded, you can make deposits:

```javascript
const depositReceipt = await sdk.escrow.depositBalance({
  token: 'USDC',
  amount: 100,
});
console.log('Deposit transaction receipt:', depositReceipt);
```

##### Parameters:

- `token` (string): The token symbol to deposit (`uSPON`, `USDC`).
- `amount` (number): The amount to deposit.

##### Returns:

- `Promise<object>`: The transaction receipt of the deposit operation.

#### 3. `withdrawBalance`

Withdraws a specified amount of tokens from the escrow contract.

```javascript
const withdrawReceipt = await sdk.escrow.withdrawBalance({
  token: 'uSPON',
  amount: 50,
});
console.log('Withdrawal transaction receipt:', withdrawReceipt);
```

##### Parameters:

- `token` (string): The token symbol to withdraw (`uSPON`, `USDC`).
- `amount` (number): The amount to withdraw.

##### Returns:

- `Promise<object>`: The transaction receipt of the withdrawal operation.

#### 4. `getProviderEarnings`

Retrieves the earnings information for a provider.

```javascript
const providerAddress = '0xProviderAddress';
const tokenAddress = '0xTokenAddress';

const earnings = await sdk.escrow.getProviderEarnings(providerAddress, tokenAddress);
console.log('Provider earnings:', earnings);
```

##### Parameters:

- `providerAddress` (string): The address of the provider.
- `tokenAddress` (string): The address of the token.

##### Returns:

- `Promise<object>`: An object containing the provider's earnings information:
  - `earned` (string): The total amount earned.
  - `withdrawn` (string): The amount withdrawn.
  - `balance` (string): The current balance.

#### 5. `getFizzEarnings`

Retrieves the earnings information for a Fizz node.

```javascript
const fizzAddress = '0xFizzNodeAddress';
const tokenAddress = '0xTokenAddress';

const earnings = await sdk.escrow.getFizzEarnings(fizzAddress, tokenAddress);
console.log('Fizz node earnings:', earnings);
```

##### Parameters:

- `fizzAddress` (string): The address of the Fizz node.
- `tokenAddress` (string): The address of the token.

##### Returns:

- `Promise<object>`: An object containing the Fizz node's earnings information:
  - `earned` (string): The total amount earned.
  - `withdrawn` (string): The amount withdrawn.
  - `balance` (string): The current balance.

#### 6. `withdrawProviderEarnings`

Withdraws earnings for a provider.

```javascript
const withdrawalData = {
  rewardWallet: '0xRewardWalletAddress',
  tokenAddress: '0xTokenAddress',
  amount: 100,
  decimals: 18,
};

const withdrawalReceipt = await sdk.escrow.withdrawProviderEarnings(withdrawalData);
console.log('Provider earnings withdrawal receipt:', withdrawalReceipt);
```

##### Parameters:

- `rewardWallet` (string): The address of the reward wallet.
- `tokenAddress` (string): The address of the token to withdraw.
- `amount` (number): The amount to withdraw.
- `decimals` (number): The number of decimals for the token.
- `onSuccessCallback` (function, optional): Callback function for successful withdrawal.
- `onFailureCallback` (function, optional): Callback function for failed withdrawal.

##### Returns:

- `Promise<object>`: The transaction receipt of the withdrawal operation.

#### 7. `withdrawFizzEarnings`

Withdraws earnings for a Fizz node.

```javascript
const withdrawalData = {
  rewardWallet: '0xRewardWalletAddress',
  tokenAddress: '0xTokenAddress',
  amount: 100,
  decimals: 18,
};

const withdrawalReceipt = await sdk.escrow.withdrawFizzEarnings(withdrawalData);
console.log('Fizz node earnings withdrawal receipt:', withdrawalReceipt);
```

##### Parameters:

- `rewardWallet` (string): The address of the reward wallet.
- `tokenAddress` (string): The address of the token to withdraw.
- `amount` (number): The amount to withdraw.
- `decimals` (number): The number of decimals for the token.
- `onSuccessCallback` (function, optional): Callback function for successful withdrawal.
- `onFailureCallback` (function, optional): Callback function for failed withdrawal.

##### Returns:

- `Promise<object>`: The transaction receipt of the withdrawal operation.

### Deployment Module

The Deployment Module streamlines the process of creating, updating, retrieving, and closing deployments on the Spheron network.

#### 1. `createDeployment`

Creates a new deployment using the [ICL (Infrastructure Configuration Language) YAML](https://docs.spheron.network/user-guide/icl) configuration.

```javascript
const iclYaml = `
version: "1.0"

services:
  py-cuda:
    image: quay.io/jupyter/pytorch-notebook:cuda12-pytorch-2.4.1
    expose:
      - port: 8888
        as: 8888
        to:
          - global: true
    env:
      - JUPYTER_TOKEN=sentient
profiles:
  name: py-cuda
  duration: 2h
  mode: provider
  tier:
    - community
  compute:
    py-cuda:
      resources:
        cpu:
          units: 8
        memory:
          size: 16Gi
        storage:
          - size: 200Gi
        gpu:
          units: 1
          attributes:
            vendor:
              nvidia:
                - model: rtx4090
  placement:
    westcoast:
      attributes:
        region: us-central
      pricing:
        py-cuda:
          token: uSPON
          amount: 10

deployment:
  py-cuda:
    westcoast:
      profile: py-cuda
      count: 1
`;

const providerProxyUrl = 'http://your-provider-proxy-url'; // run the provider proxy server using the code from the provider proxy server repo and the readme instructions in the repo

const deploymentResult = await sdk.deployment.createDeployment(iclYaml, providerProxyUrl);
console.log('Deployment result:', deploymentResult);
```

##### Parameters:

- `iclYaml` (string): The deployment configuration in YAML format.
- `providerProxyUrl` (string): URL of the provider proxy server.

##### Returns:

- `Promise<object>`: An object containing:
  - `leaseId` (string): The ID of the newly created lease.
  - `transaction` (object): The transaction details of the deployment creation.

#### 2. `updateDeployment`

Updates an existing deployment using the Lease ID and ICL YAML configuration.

```javascript
const updatedIclYaml = `
version: "1.0"

services:
  py-cuda:
    image: quay.io/jupyter/pytorch-notebook:cuda12-pytorch-2.4.1
    expose:
      - port: 8888
        as: 8888
        to:
          - global: true
    env:
      - JUPYTER_TOKEN=sentient
profiles:
  name: py-cuda
  duration: 2h
  mode: provider
  tier:
    - community
  compute:
    py-cuda:
      resources:
        cpu:
          units: 4
        memory:
          size: 8Gi
        storage:
          - size: 100Gi
        gpu:
          units: 1
          attributes:
            vendor:
              nvidia:
                - model: rtx4090
  placement:
    westcoast:
      attributes:
        region: us-central
      pricing:
        py-cuda:
          token: uSPON
          amount: 10

deployment:
  py-cuda:
    westcoast:
      profile: py-cuda
      count: 1
`;

const leaseId = 'your-lease-id';

const updateResult = await sdk.deployment.updateDeployment(
  leaseId,
  updatedIclYaml,
  providerProxyUrl
);
console.log('Update result:', updateResult);
```

##### Parameters:

- `leaseId` (string): Lease ID of the deployment to update.
- `iclYaml` (string): The updated deployment configuration in YAML format.
- `providerProxyUrl` (string): URL of the provider proxy server.

##### Returns:

- `Promise<object>`: An object containing:
  - `orderId` (string): The ID of the updated order.
  - `providerAddress` (string): The address of the provider handling the deployment.

#### 3. `getDeployment`

Retrieves the details of an existing deployment based on the provided Lease ID.

```javascript
const leaseId = 'your-lease-id';

const deploymentDetails = await sdk.deployment.getDeployment(leaseId, providerProxyUrl);
console.log('Deployment details:', deploymentDetails);
```

##### Parameters:

- `leaseId` (string): Lease ID of the deployment.
- `providerProxyUrl` (string): URL of the provider proxy server.

##### Returns:

- `Promise<object>`: An object containing the deployment details, including:
  - `services` (object): Information about the deployed services, where each key is the service name:
    - `name` (string): The name of the service.
    - `available` (number): The number of available instances.
    - `total` (number): The total number of instances.
    - `observed_generation` (number): The observed generation of the service.
    - `replicas` (number): The number of replicas.
    - `updated_replicas` (number): The number of updated replicas.
    - `ready_replicas` (number): The number of ready replicas.
    - `available_replicas` (number): The number of available replicas.
    - `container_statuses` (array): Status information for the containers.
    - `creationTimestamp` (string): The timestamp when the service was created.
  - `forwarded_ports` (object): Information about forwarded ports for each service:
    - `[service_name]` (array): An array of port forwarding objects:
      - `host` (string): The hostname for accessing the service.
      - `port` (number): The original port of the service.
      - `externalPort` (number): The external port mapped to the service.
      - `proto` (string): The protocol used (e.g., 'TCP').
      - `name` (string): The name of the service.
  - `ips` (null | object): IP information (if available).

#### 4. `closeDeployment`

Closes an existing deployment using the Lease ID.

```javascript
const leaseId = 'your-lease-id';

const closeDeploymentResult = await sdk.deployment.closeDeployment(leaseId);
console.log('Deployment closed:', closeDeploymentResult);
```

##### Parameters:

- `leaseId` (string): Lease ID of the deployment to close.

##### Returns:

- `Promise<object>`: The transaction receipt of the close operation, including:
  - `hash` (string): The hash of the transaction.
  - `blockNumber` (number): The block number in which the transaction was included.
  - `gasUsed` (BigNumber): The amount of gas used for the transaction.
  - Other standard Ethereum transaction receipt fields.

**Note:** To submit manifests to a provider, a proxy server needs to be set up by the SDK consumer. You can find the proxy server code and instructions [here](https://github.com/spheronFdn/provider-proxy-server).

### Lease Module

The Lease Module provides functionality for managing and interacting with compute leases.

#### 1. `getLeaseDetails`

Retrieves detailed information about a specific lease.

```javascript
const leaseId = 'your-lease-id';

const leaseDetails = await sdk.leases.getLeaseDetails(leaseId);
console.log('Lease details:', leaseDetails);
```

##### Parameters:

- `leaseId` (string): Lease ID to retrieve details for.

##### Returns:

- `Promise<object>`: An object containing the details of the lease:
  - `leaseId` (string): The ID of the lease.
  - `fizzId` (string): The ID of the associated Fizz node.
  - `requestId` (string): The ID of the request associated with this lease.
  - `resourceAttribute` (object): Details about the resources allocated:
    - `cpuUnits` (number): Number of CPU units.
    - `cpuAttributes` (array): Additional CPU attributes.
    - `ramUnits` (number): Amount of RAM allocated.
    - `ramAttributes` (array): Additional RAM attributes.
    - `gpuUnits` (number): Number of GPU units.
    - `gpuAttributes` (array): Additional GPU attributes.
    - `endpointsKind` (number): Type of endpoints.
    - `endpointsSequenceNumber` (number): Sequence number for endpoints.
  - `acceptedPrice` (string): The accepted price for the lease.
  - `providerAddress` (string): The address of the provider.
  - `tenantAddress` (string): The address of the tenant.
  - `startBlock` (string): The block number when the lease started.
  - `startTime` (number): The timestamp when the lease started.
  - `endTime` (number): The timestamp when the lease ended (0 if still active).
  - `state` (string): The current state of the lease (e.g., 'active').

#### 2. `getLeaseIds`

Retrieves active, terminated, and all lease IDs for a given address.

```javascript
const walletAddress = '0xYourWalletAddress';

const { activeLeaseIds, terminatedLeaseIds, allLeaseIds } = await sdk.leases.getLeaseIds(
  walletAddress
);

console.log('Active Leases:', activeLeaseIds);
console.log('Terminated Leases:', terminatedLeaseIds);
console.log('All Leases:', allLeaseIds);
```

##### Parameters:

- `walletAddress` (string): Address to retrieve lease IDs for.

##### Returns:

- `Promise<object>`: An object containing arrays of lease IDs:
  - `activeLeaseIds` (string[]): Active lease IDs.
  - `terminatedLeaseIds` (string[]): Terminated lease IDs.
  - `allLeaseIds` (string[]): All lease IDs.

#### 3. `getLeasesByState`

Retrieves leases filtered by state (`ACTIVE` or `TERMINATED`) with pagination support.

```javascript
const walletAddress = '0xYourWalletAddress';
const options = {
  state: 'ACTIVE',
  page: 1,
  pageSize: 10,
};

const leases = await sdk.leases.getLeasesByState(walletAddress, options);
console.log('Leases:', leases);
```

##### Parameters:

- `walletAddress` (string): Address to retrieve leases for.
- `options` (object, optional):
  - `state` (string): State of the leases to retrieve (`ACTIVE` or `TERMINATED`).
  - `page` (number): Page number for pagination.
  - `pageSize` (number): Number of items per page.

##### Returns:

- `Promise<object>`: An object containing:
  - `leases` (LeaseWithOrderDetails[]): An array of lease objects with additional order details:
    - All properties from the lease object
    - `name` (string): The name of the order
    - `tier (string): The tier of the order
    - `region` (string | undefined): The region of the provider or Fizz node
    - `token` (object): Token details
      - `symbol` (string | undefined): The symbol of the token
      - `decimal` (number | undefined): The number of decimal places for the token
  - `activeCount` (number): The number of active leases
  - `terminatedCount` (number): The number of terminated leases
  - `totalCount` (number): The total number of leases

#### 4. `closeLease`

Closes an active lease. You can do it using closeDeployment method of deployment module as well. Both of them are idempotent.

```javascript
const leaseId = 'your-lease-id';

const closeLeaseReceipt = await sdk.leases.closeLease(leaseId);
console.log('Lease closed:', closeLeaseReceipt);
```

##### Parameters:

- `leaseId` (string): Lease ID to close.

##### Returns:

- `Promise<object>`: Transaction receipt of the close operation.

#### 5. `listenToLeaseClosedEvent`

Sets up a listener for the `LeaseClosed` event.

```javascript
sdk.leases.listenToLeaseClosedEvent(
  ({ orderId, providerAddress, tenantAddress }) => {
    console.log('Lease closed:', orderId);
  },
  () => {
    console.error('Listening failed or timed out');
  },
  60000 // Timeout in milliseconds
);
```

##### Parameters:

- `onSuccessCallback` (function): Function called when a `LeaseClosed` event is detected.
- `onFailureCallback` (function): Function called if listening fails or times out.
- `timeout` (number, optional): Time in milliseconds before the listener times out.

## Examples

For detailed examples of how to use each module, please refer to the [Examples Directory](https://github.com/spheronFdn/protocol-sdk/tree/main/examples).

## Error Handling

It's recommended to wrap your SDK calls in `try-catch` blocks to handle any potential errors:

```javascript
try {
  const result = await sdk.someModule.someMethod();
  // Handle successful result
} catch (error) {
  console.error('An error occurred:', error);
  // Handle error
}
```

## Contributing

Feel free to contribute by submitting pull requests or issues. Ensure you follow the coding standards set in the repository.

## License

This project is licensed under the [Apache License 2.0](LICENSE).

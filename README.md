# Spheron Protocol SDK

Table of Contents
-----------------

1.  [Introduction](#introduction)
2.  [Installation](#installation)
3.  [Usage](#usage)
    *   [Initializing the SDK](#initializing-the-sdk)
    *   [Modules](#modules)
        *   [Escrow Module](#escrow-module)
        *   [Deployment Module](#deployment-module)
        *   [Lease Module](#lease-module)
4.  [Examples](#examples)
5.  [Error Handling](#error-handling)
6.  [Contributing](#contributing)
7.  [License](#license)

Introduction
------------

The **Spheron Protocol SDK** provides a comprehensive set of modules to interact with the Spheron decentralized infrastructure. This includes modules for lease management, orders management, and escrow operations.

Installation
------------

To install the Spheron SDK, use npm:

```
npm install @spheron/protocol-sdk
```

Or using yarn:

```
yarn add @spheron/protocol-sdk
```

Usage
-----

### Initializing the SDK

To use the Spheron SDK, first import it and initialize it with the desired network type:


```typescript
import { SpheronSDK } from 'spheron-sdk';
const sdk = new SpheronSDK('testnet');
```

If you want to perform write operations, you'll need to provide a private key:

```typescript
const sdk = new SpheronSDK('testnet', 'your-private-key');
```

#### Constructor Parameters:

*   `networkType`: Specifies the environment (e.g., 'testnet', 'mainnet').
*   `privateKey`: Private key for signing transactions.


## Modules

The SDK provides several modules for different functionalities:

Escrow Module
-------------

The Escrow Module handles escrow-related operations, including user deposits, withdrawals and balance management.


1. **getUserBalance**: This function fetches the user's balance from the escrow contract for a given token and wallet address.

    ```typescript
    const balance = await sdk.escrow.getUserBalance('0x1234...', 'USDT');
    ```
    
    #### Parameters:

    *   `token`: The token symbol (e.g., USDT, USDC, WETH & DAI).
    *   `walletAddress`: (optional) Wallet address to query. If not provided, the wallet used during the initialization (for which the private key was given) will be used.

2. **depositBalance**: This function deposits a specified amount of tokens into the escrow contract.

    ```typescript
    await sdk.escrow.depositBalance({
      token: 'USDT',
      amount: 10,
      onSuccessCallback: (receipt) => {
        console.log('Successfully deposited ', receipt);
      },
      onFailureCallback: (error) => {
        console.error('Deposit failed ', error);
      },
    });
    ```
    #### Parameters:
    *   `token`: The token symbol (e.g., USDT, USDC, WETH & DAI).
    *   `amount`: The amount to deposit.
    *   `onSuccessCallback`: Function to be called upon a successful deposit.
    *   `onFailureCallback`: Function to be called in case of failure.

3. **withdrawBalance**: This function withdraws a specified amount of tokens from the escrow contract.


    ```typescript
    await sdk.escrow.escrow.withdrawBalance({
      token: 'USDT',
      amount: 10,
      onSuccessCallback: (receipt) => {
        console.log('Successfully withdrawn ', receipt)
      },
      onFailureCallback: (error) => {
        console.error('Withdraw failed ', error)
      },
    });
    ```

    #### Parameters:
    *   `token`: The token symbol (e.g., USDT, USDC, WETH & DAI).
    *   `amount`: The amount to withdraw.
    *   `onSuccessCallback`: Function to be called upon a successful deposit.
    *   `onFailureCallback`: Function to be called in case of failure.

Deployment Module
-----------------

The **Deployment Module** within the Spheron SDK is designed to streamline the process of creating, updating, and fetching deployment details.

1. **createDeployment**: This function allows you to create a new deployment using the [ICL (Infrastructure Configuration Language) YAML](https://docs.spheron.network/user-guide/icl). It validates the YAML format, checks token balance, creates an order, and submits the manifest to the Spheron provider.

    ```typescript
    const deploymentTxn = await sdk.deploymentModule.createDeployment(iclYaml, providerProxyUrl);
    ```
    #### Parameters:

    *   `iclYaml`: The deployment configuration in YAML format.
    *   `providerProxyUrl`: URL of the provider proxy server

2. **updateDeployment**: This function updates an existing deployment using the Lease ID and ICL YAML configuration.

    ```typescript
    const deploymentTxn = await sdk.deploymentModule.updateDeployment(leaseId, iclYaml, providerProxyUrl);
    ```
    #### Parameters:

    *   `leaseId`: Lease ID for the deployment.
    *   `iclYaml`: The deployment configuration in YAML format.
    *   `providerProxyUrl`: URL of the provider proxy server

3. **getDeployment**: This function updates an existing deployment using the Lease ID and ICL YAML configuration.

    ```typescript
    const deploymentTxn = await sdk.deploymentModule.updateDeployment(leaseId, iclYaml, providerProxyUrl);
    ```
    #### Parameters:

    *   `leaseId`: Lease ID for the deployment.
    *   `providerProxyUrl`: URL of the provider proxy server

### Provider Proxy Setup

To submit manifests to a provider, a proxy server needs to be set up by the SDK consumer. You can find the proxy server code here: [Provider Proxy Guide](./src/utils/provider-proxy-server/README.md).

Lease Module
------------

The Lease Module provides functionality for managing and interacting with compute leases. It allows you to retrieve lease details, get lease IDs, filter leases by state, close leases, and listen for lease-related events.

1.  **Get Lease Details**: Retrieve detailed information about a specific lease.

    ```typescript    
    const leaseDetails = await sdk.leases.getLeaseDetails(leaseId);
    ```
    
2.  **Get Lease IDs**: Retrieve active, terminated, and all lease IDs for a given address.
    
    ```typescript
    const { activeLeaseIds, terminatedLeaseIds, allLeaseIds } = await sdk.leases.getLeaseIds(address);
    ```
    
3.  **Get Leases by State**: Retrieve leases filtered by state (ACTIVE or TERMINATED) with pagination support.
    
    ```typescript
    const options = { state: LeaseState.ACTIVE, page: 1, pageSize: 10 }; const leases = await sdk.leases.getLeasesByState(address, options);
    ```
    
4.  **Close Lease**: Close an active lease.
    
    ```typescript
    const receipt = await sdk.leases.closeLease(leaseId);
    ```
    
5.  **Listen to Lease Closed Event**: Set up a listener for the LeaseClosed event.
    
    ```typescript
    sdk.leases.listenToLeaseClosedEvent(
      ({ orderId, providerAddress, tenantAddress }) => {
        console.log('Lease closed:', orderId);
      },
      () => console.log('Listening failed or timed out'),
      60000
    );
    ```
    

The Lease Module interacts with the ComputeLease smart contract and uses the Order Module and Fizz Module for additional functionality.


API Reference
-------------

### Lease Module

*   `getLeaseDetails(leaseId: string): Promise<Lease>`
*   `getLeaseIds(address: string): Promise<{ activeLeaseIds: string[], terminatedLeaseIds: string[], allLeaseIds: string[] }>`
*   `getLeasesByState(address: string, options?: { state?: LeaseState, page?: number, pageSize?: number }): Promise<{ leases: LeaseWithOrderDetails[], activeCount: number, terminatedCount: number, totalCount: number }>`
*   `closeLease(leaseId: string): Promise<TransactionReceipt>`
*   `listenToLeaseClosedEvent(onSuccessCallback: Function, onFailureCallback: Function, timeout?: number): Promise<void>`


Error Handling
--------------

The SDK uses try-catch blocks for error handling. Most methods will throw an error if something goes wrong. It's recommended to wrap your SDK calls in try-catch blocks:


```typescript
try {
  const result = await sdk.someModule.someMethod();  // Handle successful result
} catch (error) {
  console.error('An error occurred:', error);  // Handle error
}
```

Contributing
------------

Feel free to contribute by submitting pull requests or issues. Ensure you follow the coding standards set in the repository.

License
-------
This project is licensed under the [Apache License 2.0](LICENSE) - see the LICENSE file for details.

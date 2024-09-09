# Spheron Protocol SDK

Table of Contents
-----------------

1.  [Introduction](#introduction)
2.  [Installation](#installation)
3.  [Usage](#usage)
    *   [Initializing the SDK](#initializing-the-sdk)
    *   [Modules](#modules)
        *   [Lease Module](#lease-module)
        *   [Order Module](#order-module)
        *   [Escrow Module](#escrow-module)
        <!-- *   [Fizz Module](#fizz-module) -->
        <!-- *   [Provider Module](#provider-module) -->
4.  [Examples](#examples)
5.  [API Reference](#api-reference)
6.  [Error Handling](#error-handling)
<!-- 7.  [Contributing](#contributing)
8.  [License](#license) -->

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
*   `privateKey` (optional): Private key for signing transactions.


### Modules

The SDK provides several modules for different functionalities:

Lease Module
------------

The Lease Module provides functionality for managing and interacting with compute leases. It allows you to retrieve lease details, get lease IDs, filter leases by state, close leases, and listen for lease-related events.

Key features:

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

Order Module
------------

The Order Module provides functionality for creating, updating, and managing orders within the Spheron ecosystem. It allows you to create new orders, update existing ones, retrieve order details, and listen for various order-related events.

Key features:

1.  **Create Order**: Create a new order with specified details.
    
    ```typescript
    const receipt = await sdk.orders.createOrder(orderDetails);
    ```
    
2.  **Update Order**: Update an existing order with new details.
    
    ```typescript
    const receipt = await sdk.orders.updateOrder(orderId, newOrderDetails);
    ```
    
3.  **Get Order Details**: Retrieve detailed information about a specific order.
    
    ```typescript
    const orderDetails = await sdk.orders.getOrderDetails(leaseId);
    ```
    
4.  **Listen to Order Created Event**: Set up a listener for the OrderMatched event, which is triggered when an order is successfully created and matched.
    
    ```typescript
    sdk.orders.listenToOrderCreated(
      60000, // timeout in milliseconds
      (orderId, providerAddress, providerId, acceptedPrice, creatorAddress) => {
        console.log('Order created:', orderId);
      },
      () => console.log('Order creation failed or timed out')
    );
    ```
    
5.  **Listen to Order Updated Event**: Set up a listener for the leaseUpdated event, which is triggered when an order is updated.
    
    ```typescript
    sdk.orders.listenToOrderUpdated(
      60000, // timeout in milliseconds
      (orderId, providerAddress) => {
        console.log('Order updated:', orderId);
      },
      () => console.log('Order update failed or timed out')
    );
    ```
    
6.  **Listen to Order Update Accepted Event**: Set up a listener for the UpdateRequestAccepted event, which is triggered when an order update request is accepted.
    
    ```typescript
    sdk.orders.listenToOrderUpdateAccepted(
      60000, // timeout in milliseconds
      (orderId, providerAddress) => {
        console.log('Order update accepted:', orderId);
      },
      () => console.log('Order update acceptance failed or timed out')
    );
    ```
    

The Order Module interacts with the OrderRequest and Bid smart contracts. It uses ethers.js for blockchain interactions and supports both browser-based (with MetaMask) and private key-based authentication.


API Reference
-------------

### Order Module

*   `createOrder(orderDetails: OrderDetails): Promise<TransactionReceipt>`
*   `updateOrder(orderId: string, orderDetails: OrderDetails): Promise<TransactionReceipt>`
*   `getOrderDetails(leaseId: string): Promise<InitialOrder>`
*   `listenToOrderCreated(timeoutTime: number, onSuccessCallback: Function, onFailureCallback: Function): Promise<void>`
*   `listenToOrderUpdated(timeoutTime: number, onSuccessCallback: Function, onFailureCallback: Function): Promise<void>`
*   `listenToOrderUpdateAccepted(timeoutTime: number, onSuccessCallback: Function, onFailureCallback: Function): Promise<void>`

Escrow Module
-------------

The Escrow Module handles escrow-related operations, including user deposits and balance management.

Examples:

**Get User Balance**

```typescript
const balance = await sdk.escrow.getUserBalance('0x1234...', 'USDT');
```

**Deposit Balance**

```typescript
await sdk.escrow.depositBalance({
  token: 'USDT',
  amount: 10,
  onSuccessCallback: (receipt) => {
    console.log('success deposit ', receipt);
  },
  onFailureCallback: (error) => {
    console.error('failure deposit ', error);
  },
});
```

**Withdraw Balance**

```typescript
await sdk.escrow.escrow.withdrawBalance({
  token: 'USDT',
  amount: 10,
  onSuccessCallback: (receipt) => {
    console.log('success withdraw ', receipt)
  },
  onFailureCallback: (error) => {
    console.error('failure withdraw ', error)
  },
});
```

<!-- Provider Module
---------------

The Provider Module offers functionality related to spheron providers.

Example:

typescript

Copy

`const providerInfo = await sdk.provider.getProvider(providerAddress);` -->

<!-- Fizz Module
-----------

The Fizz Module provides utility functions for Fizz Node.

Example:


```typescript
const fizzData = await sdk.fizz.getFizzById('<fizzId>');
``` -->

API Reference
-------------

For detailed information about each module's methods and parameters, please refer to the type definitions exported from each module:

<!-- *   `@modules/provider/types` -->
*   `@modules/lease/types`
*   `@modules/order/types`
*   `@modules/escrow/types`
<!-- *   `@modules/fizz/types` -->

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

# Spheron Protocol SDK

## Table of Contents

1. [Introduction](#introduction)
2. [How It Works](#how-it-works)
3. [Components](#components)
   - [Node.js SDK](#nodejs-sdk)
   - [Provider Proxy Server](#provider-proxy-server)
4. [Installation and Setup](#installation-and-setup)
   - [Installing the SDK](#installing-the-sdk)
   - [Setting Up the Provider Proxy Server](#setting-up-the-provider-proxy-server)
5. [Usage](#usage)
   - [Initializing the SDK](#initializing-the-sdk)
   - [Examples](#examples)
6. [Contributing](#contributing)
7. [License](#license)

## Introduction

The **Spheron Protocol SDK** provides developers with tools to interact with the Spheron decentralized infrastructure. It includes modules for managing compute leases, deployments, escrow operations, and more.

## How It Works

The Spheron Protocol SDK comprises two main components that work together to provide a seamless experience for interacting with the Spheron decentralized infrastructure:

### Protocol SDK

The Protocol SDK handles all deployment and escrow-specific operations, including:

- Creating Deployment Orders: Initiate new deployments on the network.
- Updating Deployments: Modify existing deployments with new configurations.
- Closing Deployments: Terminate deployments when they are no longer needed.
- Managing Escrow Balances: Track and manage your account balance within the network’s escrow system.
- Financial Transactions: Deposit and withdraw funds securely.

This component manages the blockchain transactions and smart contract interactions required for these operations.

### Provider Proxy Server

The Provider Proxy Server is essential for interacting with provider-specific functions, such as:

- Fetching Deployment Details: Retrieve information about your deployments.
- Retrieving Exposed Ports: Get details about network ports exposed by your services.
- Getting Service Details: Access information about running services.
- Checking Service Statuses: Monitor the status of your deployed applications.

The Provider Proxy Server acts as an intermediary between your application and the Spheron provider, handling both HTTP and WebSocket requests.

### Working Together

These components work hand in hand, allowing you to interact with the Spheron infrastructure without needing to build additional components:

1. Run the Provider Proxy Server: This server communicates with the Spheron provider on your behalf.
2. Pass the Provider Proxy Server URL to the Protocol SDK: This allows the SDK to route requests appropriately.
3. Use the SDK Functions: Manage deployments and interact with the Spheron infrastructure through the SDK’s API.

By following the guide below and referring to the [Node.js SDK README](./nodejs/README.md), you'll be able to perform all necessary interactions for deployments on Spheron.

## Components

### Node.js SDK

The [Node.js SDK](./nodejs/README.md) offers a comprehensive set of functionalities to interact with the Spheron Protocol via Node.js applications.

Key features include:

- **Escrow Module**: Manage user balances, deposits, and withdrawals.
- **Deployment Module**: Create, update, retrieve, and close deployments.
- **Lease Module**: Manage compute leases, including retrieving lease details and managing active leases.

### Provider Proxy Server

The [Provider Proxy Server](./provider-proxy-server/README.md) acts as an intermediary for fetching data related to deployments from the Spheron Provider. It handles both HTTP and WebSocket requests to communicate with the Spheron provider.

## Installation and Setup

### Installing the SDK

To install the Spheron SDK in your Node.js project, use npm or yarn:

```bash
npm install @spheron/protocol-sdk
```

Or with yarn:

```bash
yarn add @spheron/protocol-sdk
```

### Setting Up the Provider Proxy Server

To submit manifests to a provider, you need to set up a proxy server. You can run the provider proxy server using Docker or from source code.

Refer to the [Provider Proxy Server README](./provider-proxy-server/README.md) for detailed instructions.

#### Option 1: Use the Docker Image

Pull and run the Docker image:

```bash
docker pull spheronnetwork/provider-proxy-server:latest
docker run -p 3040:3040 spheronnetwork/provider-proxy-server:latest
```

#### Option 2: Run from Source Code

Clone the repository and run the server:

```bash
git clone https://github.com/spheronFdn/protocol-sdk.git
cd protocol-sdk/provider-proxy-server
npm install
npm run start
```

Make sure to set any necessary environment variables as described in the [Provider Proxy Server README](./provider-proxy-server/README.md).

## Usage

### Initializing the SDK

Import and initialize the SDK in your Node.js application:

```javascript
const { SpheronSDK } = require("@spheron/protocol-sdk");

const sdk = new SpheronSDK("testnet");
```

If performing write operations, provide a private key:

```javascript
const sdk = new SpheronSDK("testnet", "your-private-key");
```

**Note:** Never hardcode your private key; use environment variables or secure key management systems.

### Examples

Refer to the [Examples Directory](./example) for sample code demonstrating how to use various modules of the SDK.

**Example: Creating a Deployment**

```javascript
const { SpheronSDK } = require("@spheron/protocol-sdk");

const sdk = new SpheronSDK("testnet", "your-private-key");

const iclYaml = `
// Your YAML file here
`;

const providerProxyUrl = "http://localhost:3040";

(async () => {
  try {
    const deploymentTxn = await sdk.deployment.createDeployment(
      iclYaml,
      providerProxyUrl
    );
    console.log("Deployment created:", deploymentTxn);
  } catch (error) {
    console.error("Error creating deployment:", error);
  }
})();
```

## Security Best Practices

- Private Key Management: Store your private key securely using environment variables or secret management services like AWS Secrets Manager, Azure Key Vault, etc.
- Avoid Hardcoding Sensitive Data: Never commit sensitive information like private keys or API keys to version control.

## Contributing

1. Fork the Repository: Click the “Fork” button at the top of the repository page.
2. Create a Feature Branch: Use a descriptive name, e.g., feature/add-new-module.
3. Make Changes: Commit your changes with clear and concise commit messages.
4. Run Tests: Ensure all tests pass by running npm test.
5. Submit a Pull Request: Open a pull request against the main branch with a detailed description of your changes.

## Coding Standards

- **Code Style:** Follow the established coding style in the project.
- **Linting:** Run `npm run lint` to check for linting errors.
- **Testing:** Include unit tests for new features and ensure existing tests pass.

## License

This project is licensed under the [Apache License 2.0](./LICENSE) - see the LICENSE file for details.

## Contact

For any questions or inquiries, please contact us in our [Discord](https://sphn.wiki/discord).

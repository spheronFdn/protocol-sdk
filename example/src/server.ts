import { SpheronSDK } from "@spheron/protocol-sdk";
import dotenv from "dotenv";
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config();

const PRIVATE_KEY = process.env.PRIVATE_KEY;
const WALLET_ADDRESS = process.env.WALLET_ADDRESS || "";
const PROVIDER_PROXY_URL = process.env.PROVIDER_PROXY_URL || "http://localhost:3040";

if (!PRIVATE_KEY) {
    throw new Error("PRIVATE_KEY is not set in the environment variables");
}

if (!PROVIDER_PROXY_URL) {
    throw new Error("PROVIDER_PROXY_URL is not set in the environment variables");
}

// Example 1: Basic initialization (minimal configuration)
const basicSdk = new SpheronSDK({
    networkType: 'mainnet', // or 'testnet', defaults to 'mainnet'
    privateKey: PRIVATE_KEY
});

// Example 2: Full initialization with all options
const fullSdk = new SpheronSDK({
    networkType: 'mainnet',
    privateKey: PRIVATE_KEY,
    rpcUrls: {
        http: 'https://base-mainnet.g.alchemy.com/v2/your-api-key',
        websocket: 'wss://base-mainnet.g.alchemy.com/v2/your-api-key'
    },
    gaslessOptions: {
        type: 'coinbase',
        bundlerUrl: 'https://api.developer.coinbase.com/rpc/v1/base/your-api-key',
        paymasterUrl: 'https://api.developer.coinbase.com/rpc/v1/base/your-api-key'
    }
});

// Choose which SDK instance to use (using full configuration for this example)
const sdk = fullSdk;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
    try {
        // Get wallet address and smart wallet details
        console.log("Wallet address:", WALLET_ADDRESS);

        // If using gasless transactions, get smart wallet details first
        const smartWalletDetails = await sdk.escrow.getSmartWalletDetails();
        console.log("Smart Wallet Details:", smartWalletDetails);

        // Check if smart wallet needs funding (for gasless transactions)
        if (smartWalletDetails && Number(smartWalletDetails.balance) === 0) {
            console.log("Warning: Smart wallet needs funding for gasless transactions");
        }
        
        // Check balances
        const currentBalance = await sdk.escrow.getUserBalance("uSPON", WALLET_ADDRESS);
        console.log("Current uSPON balance:", currentBalance);

        // Example deployment
        const yamlPath = join(__dirname, 'utils', 'spheron.yaml');
        const iclYaml = fs.readFileSync(yamlPath, 'utf8');

        // Create deployment
        const deploymentTxn = await sdk.deployment.createDeployment(iclYaml, PROVIDER_PROXY_URL);
        console.log("Deployment created:", deploymentTxn);

        if (deploymentTxn.leaseId) {
            // Get deployment details
            const deploymentDetails = await sdk.deployment.getDeployment(
                deploymentTxn.leaseId, 
                PROVIDER_PROXY_URL
            );
            console.log("Deployment details:", deploymentDetails);

            // Get lease details
            const leaseDetails = await sdk.leases.getLeaseDetails(deploymentTxn.leaseId);
            console.log("Lease details:", leaseDetails);

            // Wait for deployment to stabilize
            console.log("Waiting for deployment to stabilize...");
            await new Promise(resolve => setTimeout(resolve, 10000));

            // Close deployment
            const closeDeploymentDetails = await sdk.deployment.closeDeployment(deploymentTxn.leaseId);
            console.log("Deployment closed:", closeDeploymentDetails);
        }
    } catch (error) {
        console.error("An error occurred:", error);
        if (error instanceof Error) {
            console.error("Error message:", error.message);
            console.error("Error stack:", error.stack);
        }
    }
}

main();


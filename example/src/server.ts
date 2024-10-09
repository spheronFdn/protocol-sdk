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

const sdk = new SpheronSDK("testnet", PRIVATE_KEY);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
    try {
        // Get wallet address
        console.log("Wallet address:", WALLET_ADDRESS);

        // Check current balance
        const currentBalance = await sdk.escrow.getUserBalance("USDT", WALLET_ADDRESS);
        console.log("Current USDT balance:", currentBalance);

        const requiredBalance = 100 * 1e6; // Required balance in USDT (100 USDT in smallest units)
        const depositAmount = requiredBalance - (parseInt(currentBalance.unlockedBalance, 10) || 0);

        if (depositAmount > 0) {
            console.log(`Depositing ${depositAmount} USDT to reach the required balance...`);
            await sdk.escrow.depositBalance({
                token: "USDT",
                amount: depositAmount,
                onSuccessCallback: (receipt) => {
                    console.log("Successfully deposited:", receipt);
                },
                onFailureCallback: (error) => {
                    console.error("Deposit failed:", error);
                },
            });
        } else {
            console.log("Current balance is sufficient. No deposit needed.");
        }

        // Update the YAML file path
        const yamlPath = join(__dirname, 'utils', 'spheron.yaml');
        console.log("YAML file path:", yamlPath); // Add this line for debugging
        const iclYaml = fs.readFileSync(yamlPath, 'utf8');

        const deploymentTxn = await sdk.deployment.createDeployment(iclYaml, PROVIDER_PROXY_URL);
        console.log("Deployment created:", deploymentTxn);

        // Fetch deployment logs
        if (deploymentTxn.leaseId) {
            console.log("Fetching deployment details...");
            const deploymentDetails = await sdk.deployment.getDeployment(deploymentTxn.leaseId, PROVIDER_PROXY_URL);
            console.log("Deployment details:", deploymentDetails, deploymentDetails.forwarded_ports);

            console.log("Fetching lease details...");
            const leaseDetails = await sdk.leases.getLeaseDetails(deploymentTxn.leaseId);
            console.log("Lease details:", leaseDetails);

            console.log("Sleeping for 10 seconds...");
            await new Promise(resolve => setTimeout(resolve, 10000));

            console.log("Closing deployment...");
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


import { ethers } from "ethers";
import * as base64 from "base64-js";

interface AuthJson {
  timestamp: number;
  pub_key: string;
  signed_timestamp: string;
}

interface ISignature {
  signature: string;
  adjustedSignature: string;
}

async function signMessage(msg: string, wallet: ethers.Wallet): Promise<ISignature> {
  // if (!window.ethereum) {
  //   throw new Error("MetaMask is not installed");
  // }
  // Request MetaMask to sign the message
  // const provider = new ethers.BrowserProvider(window.ethereum);
  // const signer = await provider.getSigner();
  
  // Request to sign the message
  const signer = wallet;
  const signature = await signer.signMessage(msg);
  
  // Adjust the 'v' value to match the Go implementation
  const signatureBytes = ethers.getBytes(signature);
  
  if (signatureBytes[64] >= 27) {
    signatureBytes[64] -= 27;
  }
  
  // Convert the adjusted signature back to a hex string
  const adjustedSignature = ethers.hexlify(signatureBytes);

  return { signature, adjustedSignature };
}

export async function createAuthorizationToken(wallet: ethers.Wallet): Promise<string> {
  // if (!window.ethereum) {
  //   throw new Error("MetaMask is not installed");
  // }

  // if (
  //   localStorage.getItem("authToken") &&
  //   localStorage.getItem("authTokenExpiry") &&
  //   Number(localStorage.getItem("authTokenExpiry")) > Date.now()
  // ) {
  //   return localStorage.getItem("authToken") as string;
  // }
  // Calculate the current timestamp in seconds
  const ts = Math.floor(Date.now() / 1000);

  const message = `Sending Request to Provider at: ${ts.toString()}`;
  // const message = ethers.keccak256(ethers.toUtf8Bytes(ts.toString()));

  // Sign the timestamp using MetaMask
  const { signature, adjustedSignature: signedTimestamp } = await signMessage(
    message,
    wallet,
  );

  const sig = ethers.Signature.from(signature);
  const publicKey = ethers.SigningKey.recoverPublicKey(
    ethers.hashMessage(message),
    sig
  );

  const body: AuthJson = {
    pub_key: publicKey.substring(2),
    timestamp: ts,
    signed_timestamp: signedTimestamp,
  };

  // Convert the JSON object to a string
  const jsonString = JSON.stringify(body);

  // Encode the JSON string to a Uint8Array using TextEncoder
  const encoder = new TextEncoder();
  const authTokenBytes = encoder.encode(jsonString);

  // Convert authTokenBytes to a base64-encoded string
  const res = base64.fromByteArray(authTokenBytes);

  // localStorage.setItem("authToken", res);
  // localStorage.setItem(
  //   "authTokenExpiry",
  //   (Date.now() + TOKEN_EXPIRY_TIME).toString()
  // );
  return res;
}

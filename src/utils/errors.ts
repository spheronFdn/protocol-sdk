import { ethers } from "ethers";

const errorMessages: Record<string, string> = {

  // Order Contract Error Messages
  OrderNotFound: "The order you are looking for was not found.",
  OrderNotActive: "The order is not active.",
  InvalidAmount: "The provided amount is invalid.",
  InvalidBlockNumber: "The provider duration is invalid.",
  InsufficientBalance: "You do not have sufficient balance in escrow.",
  UnAuthorized: "You are not authorized to perform this action",

  // Lease Contract Error Messages
  LeaseAlreadyTerminated: "The lease is already terminated.",
  OnlyTenantOrProvider: "Only Tenant or Provider can close the lease."
}

export const handleContractError = (error: any, abi: any[]) => {
  if (error.data) {
    try {
      const iface = new ethers.Interface(abi);
      const decodedError: any = iface.parseError(error.data);
      const errorMessage = errorMessages[decodedError.name];
      if (errorMessage) {
        console.error(errorMessage);
        return errorMessage;
      } else {
        console.error("Unhandled error:", decodedError.name);
        return `Unhandled error: ${decodedError.name}`;
      }
    } catch (decodeError) {
      console.error("Failed to decode the error:", decodeError);
      return "Failed to decode the error.";
    }
  } else {
    console.error("Transaction failed without revert data:", error);
    return "Transaction failed without revert data.";
  }
};

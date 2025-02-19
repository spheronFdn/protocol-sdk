import { ethers } from 'ethers';

const errorMessages: Record<string, string> = {
  // Escrow Contract Error Messages
  TokenAlreadyRegistered: 'This token has already been registered.',
  InvalidTokenAddress: 'The token address provided seems to be invalid.',
  InvalidOwnerAddress: 'The owner address provided is incorrect or malformed.',
  TokenNotRegistered:
    'The token you are trying to access is not yet registered in the system. Please register it first.',

  // Order Contract Error Messages
  OrderNotFound: 'The order you are looking for was not found.',
  OrderNotActive: 'The order is not active.',
  InvalidAmount: 'The provided amount is invalid.',
  InvalidBlockNumber: 'The provider duration is invalid.',
  InsufficientBalance: 'You do not have sufficient balance in escrow.',
  UnAuthorized: 'You are not authorized to perform this action',

  // Lease Contract Error Messages
  LeaseAlreadyTerminated: 'The lease is already terminated.',
  OnlyTenantOrProvider: 'Only Tenant or Provider can close the lease.',

  // Fizz Contract Error Messages
  FizzAlreadyRegistered: 'This fizz node is already registered.',
  StatusUnchanged: 'No changes detected in the fizz status.',
  InactiveFizzNode: 'This fizz node is currently inactive.',
  InvalidAddress: 'The address provided seems incorrect. Please verify it.',
  TokenAlreadyAccepted: 'This token has already been accepted.',
  RegistrationFeeNotPaid: 'The fizz registration fee is unpaid.',
  UnregisteredToken: 'The token is unregistered.',
  FizzNodeNotFound: 'We could not find the fizz node. Double-check the details and try again.',
  TokenNotFound: 'The token was not found. Please verify and try again.',
  InvalidUnit: 'The specified unit is invalid. Please correct it.',

  // Provider Contract Error Messages
  ProviderNotFound: 'Unable to locate the provider. Please check the details.',
  ProviderNotActive: 'The provider is currently inactive.',
  ProviderAlreadyRegistered: 'The provider is already registered.',
  InactiveProvider: 'The provider is inactive.',
  NotAuthorized: 'You are not authorized to perform this action.',
  InvalidAttributes: 'The provided attributes are not valid.',
  EmptyArray: 'No data was provided. The array is empty.',
  ArrayMismatch: 'The arrays provided do not match.',
};

export const handleContractError = (error: unknown, abi: ethers.InterfaceAbi): string => {
  if (
    typeof error === 'object' &&
    error !== null &&
    'data' in error &&
    typeof error.data === 'string'
  ) {
    try {
      const iface = new ethers.Interface(abi);
      const decodedError: ethers.ErrorDescription | null = iface.parseError(error.data);
      const errorMessage = decodedError ? errorMessages[decodedError.name] : '';
      return errorMessage || 'An error occurred while processing your transaction.';
    } catch (decodeError) {
      return 'Failed to decode the error.';
    }
  } else {
    return 'Transaction failed without revert data.';
  }
};

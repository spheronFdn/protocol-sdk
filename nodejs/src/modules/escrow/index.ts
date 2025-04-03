import { contractAddresses } from '@contracts/addresses';
import { ethers } from 'ethers';
import {
  DepositData,
  DepositForOperatorData,
  UserBalance,
  WithdrawData,
  WithdrawEarningsData,
} from './types';
import { NetworkType, tokenMap } from '@config/index';
import { initializeSigner } from '@utils/index';
import { handleContractError } from '@utils/errors';
import { abiMap } from '@contracts/abi-map';
import { SmartWalletBundlerClient } from '@utils/smart-wallet';

export class EscrowModule {
  private provider: ethers.Provider;
  private wallet: ethers.Wallet | undefined;
  private networkType: NetworkType;

  constructor(
    provider: ethers.Provider,
    wallet?: ethers.Wallet,
    networkType?: NetworkType,
    private smartWalletBundlerClientPromise?: Promise<SmartWalletBundlerClient>
  ) {
    this.provider = provider;
    this.wallet = wallet;
    this.networkType = networkType ?? 'testnet';
    this.smartWalletBundlerClientPromise = smartWalletBundlerClientPromise;
  }

  async getUserBalance(token: string, walletAddress?: string, isOperator: boolean = false) {
    const contractAbi = abiMap[this.networkType].escrow;
    try {
      const contractAddress = contractAddresses[this.networkType].escrow;
      const contract = new ethers.Contract(contractAddress, contractAbi, this.provider);

      const tokenDetails = tokenMap[this.networkType].find(
        (eachToken) => eachToken.symbol.toLowerCase() === token.toLowerCase()
      );
      if (!tokenDetails) {
        throw new Error('Provided token symbol is invalid.');
      }
      const tokenAddress: string = tokenDetails?.address || ethers.ZeroAddress;

      let userWalletAddress;
      if (walletAddress) {
        userWalletAddress = walletAddress;
      } else {
        if (this.wallet) {
          userWalletAddress = await this.wallet.getAddress();
        } else {
          throw new Error('No wallet address provided');
        }
      }

      const response = await contract.getUserData(userWalletAddress, tokenAddress, isOperator);

      const userData: UserBalance = {
        lockedBalance: response[0].toString(),
        unlockedBalance: response[1].toString(),
        token: {
          name: tokenDetails?.name,
          symbol: tokenDetails?.symbol,
          decimal: tokenDetails?.decimal,
        },
      };

      return userData;
    } catch (error) {
      const errorMessage = handleContractError(error, contractAbi);
      throw errorMessage;
    }
  }

  async depositBalance({ token, amount, onSuccessCallback, onFailureCallback }: DepositData) {
    const contractABI = abiMap[this.networkType].escrow;
    try {
      if (this.smartWalletBundlerClientPromise) {
        return await this.depositBalanceGasless({
          token,
          amount,
          onSuccessCallback,
          onFailureCallback,
        });
      }
      const { signer } = await initializeSigner({ wallet: this.wallet });

      const contractAddress = contractAddresses[this.networkType].escrow;
      const tokenABI = abiMap[this.networkType].testToken;

      const tokenDetails = tokenMap[this.networkType].find(
        (eachToken) => eachToken.symbol.toLowerCase() === token.toLowerCase()
      );
      if (!tokenDetails) {
        throw new Error('Provided token symbol is invalid.');
      }
      const decimals = tokenDetails?.decimal ?? 18;
      const tokenAddress: string = tokenDetails?.address;

      const contract = new ethers.Contract(contractAddress, contractABI, signer);
      const tokenContract = new ethers.Contract(tokenAddress, tokenABI, signer);

      const finalAmount = Number(amount.toString());
      const depositAmount = ethers.parseUnits(finalAmount.toFixed(decimals), decimals);

      const approvalTxn = await tokenContract.approve(contractAddress, depositAmount);
      await approvalTxn.wait();

      const result = await contract.deposit(tokenAddress, depositAmount);
      const receipt = await result.wait();
      if (onSuccessCallback) onSuccessCallback(receipt);
      return receipt;
    } catch (error) {
      if (onFailureCallback) onFailureCallback(error);
      const errorMessage = handleContractError(error, contractABI);
      throw errorMessage;
    }
  }

  private async depositBalanceGasless({
    token,
    amount,
    onSuccessCallback,
    onFailureCallback,
  }: DepositData) {
    const contractABI = abiMap[this.networkType].escrow;
    try {
      const contractAddress = contractAddresses[this.networkType].escrow;

      const network = await this.provider.getNetwork();
      const chainId = network.chainId;
      const { signer } = await initializeSigner({ wallet: this.wallet });
      const signerAddress = signer.address;

      // Get the current nonce for the signer
      const contract = new ethers.Contract(contractAddress, contractABI, signer);
      const nonce = await contract.nonces(signerAddress);

      const tokenDetails = tokenMap[this.networkType].find(
        (eachToken) => eachToken.symbol.toLowerCase() === token.toLowerCase()
      );
      if (!tokenDetails) {
        throw new Error('Provided token symbol is invalid.');
      }
      const decimals = tokenDetails?.decimal ?? 18;
      const tokenAddress: string = tokenDetails?.address;

      const finalAmount = Number(amount.toString());
      const depositAmount = ethers.parseUnits(finalAmount.toFixed(decimals), decimals);

      const domain = {
        name: 'Spheron',
        version: '1',
        chainId,
        verifyingContract: contractAddress,
      };

      const types = {
        Deposit: [
          { name: 'token', type: 'address' },
          { name: 'amount', type: 'uint256' },
          { name: 'nonce', type: 'uint256' },
        ],
      };

      const value = {
        token: tokenAddress,
        amount: depositAmount,
        nonce,
      };

      // Sign the typed data using EIP-712
      const signature = await signer.signTypedData(domain, types, value);

      const smartWalletBundlerClient = await this.smartWalletBundlerClientPromise;

      const tokenABI = abiMap[this.networkType].testToken;
      const approveTxnHash = await smartWalletBundlerClient?.sendUserOperation({
        calls: [
          {
            abi: tokenABI,
            functionName: 'approve',
            to: tokenAddress as `0x${string}`,
            args: [contractAddress, depositAmount],
          },
        ],
        paymaster: true,
      });
      await smartWalletBundlerClient?.waitForUserOperationReceipt({
        hash: approveTxnHash!,
      });

      const txHash = await smartWalletBundlerClient?.sendUserOperation({
        calls: [
          {
            abi: contractABI,
            functionName: 'depositWithSignature',
            to: contractAddress as `0x${string}`,
            args: [tokenAddress, depositAmount, signerAddress, nonce, signature],
          },
        ],
        paymaster: true,
      });
      const txReceipt = await smartWalletBundlerClient?.waitForUserOperationReceipt({
        hash: txHash!,
      });

      if (onSuccessCallback) onSuccessCallback(txReceipt?.receipt);
      return txReceipt?.receipt;
    } catch (error) {
      if (onFailureCallback) onFailureCallback(error);
      const errorMessage = handleContractError(error, contractABI);
      throw errorMessage;
    }
  }

  async withdrawBalance({
    token,
    amount,
    operator = ethers.ZeroAddress,
    onSuccessCallback,
    onFailureCallback,
  }: WithdrawData) {
    const contractABI = abiMap[this.networkType].escrow;
    try {
      if (this.smartWalletBundlerClientPromise) {
        return await this.withdrawBalanceGasless({
          token,
          amount,
          operator,
          onSuccessCallback,
          onFailureCallback,
        });
      }
      const { signer } = await initializeSigner({ wallet: this.wallet });

      const contractAddress = contractAddresses[this.networkType].escrow;

      const tokenDetails = tokenMap[this.networkType].find(
        (eachToken) => eachToken.symbol.toLowerCase() === token.toLowerCase()
      );
      if (!tokenDetails) {
        throw new Error('Provided token symbol is invalid.');
      }
      const decimals = tokenDetails?.decimal ?? 18;
      const tokenAddress: string = tokenDetails?.address;

      const contract = new ethers.Contract(contractAddress, contractABI, signer);

      const finalAmount = Number(amount.toString());
      const withdrawAmount = ethers.parseUnits(finalAmount.toFixed(decimals), decimals);

      const result = await contract.withdraw(tokenAddress, withdrawAmount, operator);
      const receipt = await result.wait();
      if (onSuccessCallback) onSuccessCallback(receipt);
      return receipt;
    } catch (error) {
      if (onFailureCallback) onFailureCallback(error);
      const errorMessage = handleContractError(error, contractABI);
      throw errorMessage;
    }
  }

  private async withdrawBalanceGasless({
    token,
    amount,
    operator = ethers.ZeroAddress,
    onSuccessCallback,
    onFailureCallback,
  }: WithdrawData) {
    const contractABI = abiMap[this.networkType].escrow;
    try {
      const network = await this.provider.getNetwork();
      const chainId = network.chainId;
      const { signer } = await initializeSigner({ wallet: this.wallet });
      const signerAddress = signer.address;

      const tokenDetails = tokenMap[this.networkType].find(
        (eachToken) => eachToken.symbol.toLowerCase() === token.toLowerCase()
      );
      if (!tokenDetails) {
        throw new Error('Provided token symbol is invalid.');
      }
      const decimals = tokenDetails?.decimal ?? 18;
      const tokenAddress: string = tokenDetails?.address;

      const finalAmount = Number(amount.toString());
      const withdrawAmount = ethers.parseUnits(finalAmount.toFixed(decimals), decimals);

      const contractAddress = contractAddresses[this.networkType].escrow;
      const contract = new ethers.Contract(contractAddress, contractABI, signer);

      // Get the current nonce for the signer
      const nonce = await contract.nonces(signerAddress);

      const domain = {
        name: 'Spheron',
        version: '1',
        chainId,
        verifyingContract: contractAddress,
      };

      const types = {
        Withdraw: [
          { name: 'token', type: 'address' },
          { name: 'amount', type: 'uint256' },
          { name: 'operator', type: 'address' },
          { name: 'nonce', type: 'uint256' },
        ],
      };

      const value = {
        token: tokenAddress,
        amount: withdrawAmount,
        operator,
        nonce,
      };

      // Sign the typed data using EIP-712
      const signature = await signer.signTypedData(domain, types, value);

      const smartWalletBundlerClient = await this.smartWalletBundlerClientPromise;

      const txHash = await smartWalletBundlerClient?.sendUserOperation({
        calls: [
          {
            abi: contractABI,
            functionName: 'withdrawWithSignature',
            to: contractAddress as `0x${string}`,
            args: [tokenAddress, withdrawAmount, operator, signerAddress, nonce, signature],
          },
        ],
        paymaster: true,
      });
      const txReceipt = await smartWalletBundlerClient?.waitForUserOperationReceipt({
        hash: txHash!,
      });

      if (onSuccessCallback) onSuccessCallback(txReceipt?.receipt);
      return txReceipt?.receipt;
    } catch (error) {
      if (onFailureCallback) onFailureCallback(error);
      const errorMessage = handleContractError(error, contractABI);
      throw errorMessage;
    }
  }

  async getProviderEarnings(providerAddress: string, tokenAddress: string) {
    const contractABI = abiMap[this.networkType].escrowProtocol;
    try {
      const contractAddress = contractAddresses[this.networkType].escrowProtocol;
      const contract = new ethers.Contract(contractAddress, contractABI, this.provider);

      const response = await contract.getProviderEarnings(providerAddress, tokenAddress);

      const providerEarnings: { earned: string; withdrawn: string; balance: string } = {
        earned: response[0].toString(),
        withdrawn: response[1].toString(),
        balance: response[2].toString(),
      };

      return providerEarnings;
    } catch (error) {
      const errorMessage = handleContractError(error, contractABI);
      throw errorMessage;
    }
  }

  async getFizzEarnings(fizzAddress: string, tokenAddress: string) {
    const contractABI = abiMap[this.networkType].escrowProtocol;
    try {
      const contractAddress = contractAddresses[this.networkType].escrowProtocol;
      const contract = new ethers.Contract(contractAddress, contractABI, this.provider);

      const response = await contract.getFizzNodeEarnings(fizzAddress, tokenAddress);

      const fizzEarnings: { earned: string; withdrawn: string; balance: string } = {
        earned: response[0].toString(),
        withdrawn: response[1].toString(),
        balance: response[2].toString(),
      };

      return fizzEarnings;
    } catch (error) {
      const errorMessage = handleContractError(error, contractABI);
      throw errorMessage;
    }
  }

  async withdrawEarnings({
    providerAddress,
    fizzId = '0',
    token,
    amount,
    isFizz = false,
  }: WithdrawEarningsData) {
    const contractABI = abiMap[this.networkType].escrowProtocol;
    try {
      const { signer } = await initializeSigner({ wallet: this.wallet });

      const contractAddress = contractAddresses[this.networkType].escrowProtocol;

      const tokenDetails = tokenMap[this.networkType].find(
        (eachToken) => eachToken.symbol.toLowerCase() === token.toLowerCase()
      );

      if (!tokenDetails) {
        throw new Error('Provided token Symbol is invalid.');
      }

      const tokenAddress: string = tokenDetails?.address;

      const contract = new ethers.Contract(contractAddress, contractABI, signer);

      const result = await contract.withdrawEarnings(
        providerAddress,
        fizzId,
        tokenAddress,
        amount,
        isFizz
      );
      const receipt = await result.wait();
      return receipt;
    } catch (error) {
      const errorMessage = handleContractError(error, contractABI);
      throw errorMessage;
    }
  }

  async depositForOperators({ token, amount, operatorAddresses }: DepositForOperatorData) {
    const contractABI = abiMap[this.networkType].escrow;

    try {
      if (this.smartWalletBundlerClientPromise) {
        return await this.depositForOperatorsGasless({ token, amount, operatorAddresses });
      }
      const { signer } = await initializeSigner({ wallet: this.wallet });
      const contractAddress = contractAddresses[this.networkType].escrow;
      const contract = new ethers.Contract(contractAddress, contractABI, signer);
      const tokenABI = abiMap[this.networkType].testToken;

      const tokenDetails = tokenMap[this.networkType].find(
        (eachToken) => eachToken.symbol.toLowerCase() === token.toLowerCase()
      );

      if (!tokenDetails) {
        throw new Error('Provided token Symbol is invalid.');
      }
      const decimals = tokenDetails?.decimal ?? 18;

      const tokenAddress: string = tokenDetails?.address;

      const tokenContract = new ethers.Contract(tokenAddress, tokenABI, signer);

      const finalAmount = Number(amount.toString());
      const depositAmount = ethers.parseUnits(finalAmount.toFixed(decimals), decimals);

      const approvalTxn = await tokenContract.approve(contractAddress, depositAmount);
      await approvalTxn.wait();

      const result = await contract.depositForOperators(tokenAddress, amount, operatorAddresses);
      const receipt = await result.wait();
      return receipt;
    } catch (error) {
      const errorMessage = handleContractError(error, contractABI);
      throw errorMessage;
    }
  }

  private async depositForOperatorsGasless({
    token,
    amount,
    operatorAddresses,
    onFailureCallback,
    onSuccessCallback,
  }: DepositForOperatorData) {
    const contractAbi = abiMap[this.networkType].escrow;
    try {
      const contractAddress = contractAddresses[this.networkType].escrow;
      const network = await this.provider.getNetwork();
      const chainId = network.chainId;
      const { signer } = await initializeSigner({ wallet: this.wallet });
      const signerAddress = signer.address;
      const tokenABI = abiMap[this.networkType].testToken;

      const contract = new ethers.Contract(contractAddress, contractAbi, signer);
      const nonce = await contract.nonces(signerAddress);

      const tokenDetails = tokenMap[this.networkType].find(
        (eachToken) => eachToken.symbol.toLowerCase() === token.toLowerCase()
      );

      if (!tokenDetails) {
        throw new Error('Provided token Symbol is invalid.');
      }
      const decimals = tokenDetails?.decimal ?? 18;
      const tokenAddress: string = tokenDetails?.address;

      const finalAmount = Number(amount.toString());
      const depositAmount = ethers.parseUnits(finalAmount.toFixed(decimals), decimals);

      const smartWalletBundlerClient = await this.smartWalletBundlerClientPromise;

      const approvetTxnHash = await smartWalletBundlerClient?.sendUserOperation({
        calls: [
          {
            abi: tokenABI,
            functionName: 'approve',
            to: tokenAddress as `0x${string}`,
            args: [contractAddress, depositAmount],
          },
        ],
        paymaster: true,
      });
      await smartWalletBundlerClient?.waitForUserOperationReceipt({
        hash: approvetTxnHash!,
      });

      const domain = {
        name: 'Spheron',
        version: '1',
        chainId,
        verifyingContract: contractAddress,
      };

      const types = {
        Deposit: [
          { name: 'token', type: 'address' },
          { name: 'amount', type: 'uint256' },
          { name: 'nonce', type: 'uint256' },
        ],
      };

      const value = {
        token: tokenAddress,
        amount: depositAmount,
        nonce,
      };

      const signature = await signer.signTypedData(domain, types, value);

      const txHash = await smartWalletBundlerClient?.sendUserOperation({
        calls: [
          {
            abi: contractAbi,
            functionName: 'depositForOperatorsWithSignature',
            to: contractAddress as `0x${string}`,
            args: [tokenAddress, amount, operatorAddresses, signerAddress, nonce, signature],
          },
        ],
        paymaster: true,
      });
      const txReceipt = await smartWalletBundlerClient?.waitForUserOperationReceipt({
        hash: txHash!,
      });

      if (onSuccessCallback) onSuccessCallback(txReceipt?.receipt);
      return txReceipt?.receipt;
    } catch (error) {
      if (onFailureCallback) onFailureCallback(error);
      const errorMessage = handleContractError(error, contractAbi);
      throw errorMessage;
    }
  }
}

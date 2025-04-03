import { contractAddresses } from '@contracts/addresses';
import { ethers } from 'ethers';
import { DepositData, DepositForOperatorData, UserBalance, WithdrawEarningsData } from './types';
import { NetworkType, tokenMap } from '@config/index';
import { initializeSigner } from '@utils/index';
import { handleContractError } from '@utils/errors';
import { abiMap } from '@contracts/abi-map';

export class EscrowModule {
  private provider: ethers.Provider;
  private wallet: ethers.Wallet | undefined;
  private networkType: NetworkType;

  constructor(provider: ethers.Provider, wallet?: ethers.Wallet, networkType?: NetworkType) {
    this.provider = provider;
    this.wallet = wallet;
    this.networkType = networkType ?? 'testnet';
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
      const tokenAddress: string =
        tokenDetails?.address || '0x0000000000000000000000000000000000000000';

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

  // write operations
  async depositBalance({ token, amount, onSuccessCallback, onFailureCallback }: DepositData) {
    const contractABI = abiMap[this.networkType].escrow;
    try {
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

  async withdrawBalance({ token, amount, onSuccessCallback, onFailureCallback }: DepositData) {
    const contractABI = abiMap[this.networkType].escrow;
    try {
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

      const finalAmount = (Number(amount.toString()) * 10 ** decimals - 1) / 10 ** decimals;
      const withdrawAmount = ethers.parseUnits(finalAmount.toFixed(decimals), decimals);

      const result = await contract.withdraw(tokenAddress, withdrawAmount);
      const receipt = await result.wait();
      if (onSuccessCallback) onSuccessCallback(receipt);
      return receipt;
    } catch (error) {
      if (onFailureCallback) onFailureCallback(error);
      const errorMessage = handleContractError(error, contractABI);
      throw errorMessage;
    }
  }

  // read operations
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
}

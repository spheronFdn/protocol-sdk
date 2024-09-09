import EscrowAbi from '@contracts/abis/devnet/Escrow.json';
import TokenAbi from '@contracts/abis/devnet/TestToken.json';
import { EscrowDev as Escrow, EscrowDev } from '@contracts/addresses';
import { ethers } from 'ethers';
import { DepositData, TransactionData } from './types';
import { networkType, tokenMap } from '@config/index';
import { initializeSigner } from '@utils/index';
import { handleContractError } from '@utils/errors';

export class EscrowModule {
  private provider: ethers.Provider;
  private wallet: ethers.Wallet | undefined;

  constructor(provider: ethers.Provider, wallet?: ethers.Wallet) {
    this.provider = provider;
    this.wallet = wallet;
  }

  // read operations
  async getProviderEarnings(providerAddress: string, tokenAddress: string) {
    try {
      const contractAbi = EscrowAbi;
      const contractAddress = Escrow;
      const contract = new ethers.Contract(contractAddress, contractAbi, this.provider);

      const response = await contract.getProviderEarnings(providerAddress, tokenAddress);

      const providerEarnings: { earned: string; withdrawn: string; balance: string } = {
        earned: response[0].toString(),
        withdrawn: response[1].toString(),
        balance: response[2].toString(),
      };

      return providerEarnings;
    } catch (error) {
      console.error('Error in getProviderEarnings:', error);
      const errorMessage = handleContractError(error, EscrowAbi);
      throw errorMessage;
    }
  }

  async getUserBalance(walletAddress: string, token: string) {
    try {
      const contractAbi = EscrowAbi;
      const contractAddress = Escrow;
      const contract = new ethers.Contract(contractAddress, contractAbi, this.provider);

      const tokenDetails = tokenMap[networkType].find(
        (eachToken) => eachToken.symbol.toLowerCase() === token.toLowerCase()
      );
      if (!tokenDetails) {
        throw new Error('Provided token symbol is invalid.');
      }
      const tokenAddress: any = tokenDetails?.address;

      const response = await contract.getUserData(walletAddress, tokenAddress);

      const userData: { lockedBalance: string; unlockedBalance: string; token: any } = {
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
      console.error('Error in getUserData:', error);
      const errorMessage = handleContractError(error, EscrowAbi);
      throw errorMessage;
    }
  }

  // write operations
  async depositBalance({ token, amount, onSuccessCallback, onFailureCallback }: DepositData) {
    try {
      const { signer } = await initializeSigner({ wallet: this.wallet });

      const contractABI = EscrowAbi;
      const contractAddress = Escrow;
      const tokenABI = TokenAbi;

      const tokenDetails = tokenMap[networkType].find(
        (eachToken) => eachToken.symbol.toLowerCase() === token.toLowerCase()
      );
      if (!tokenDetails) {
        throw new Error('Provided token symbol is invalid.');
      }
      const decimals = tokenDetails?.decimal ?? 18;
      const tokenAddress: any = tokenDetails?.address;

      const contract = new ethers.Contract(contractAddress, contractABI, signer);
      const tokenContract = new ethers.Contract(tokenAddress, tokenABI, signer);

      const finalAmount = Number(amount.toString());
      const depositAmount = ethers.parseUnits(finalAmount.toFixed(decimals), decimals);

      const approvalTxn = await tokenContract.approve(contractAddress, depositAmount);
      await approvalTxn.wait();

      const result = await contract.deposit(tokenAddress, depositAmount);
      const receipt = await result.wait();
      console.log('Deposit balance successful -> ', receipt);
      if (onSuccessCallback) onSuccessCallback(receipt);
      return receipt;
    } catch (error) {
      console.error('Error balance deposit -> ', error);
      if (onFailureCallback) onFailureCallback(error);
      const errorMessage = handleContractError(error, EscrowAbi);
      throw errorMessage;
    }
  }

  async withdrawBalance({ token, amount, onSuccessCallback, onFailureCallback }: DepositData) {
    try {
      const { signer } = await initializeSigner({ wallet: this.wallet });
      const contractABI = EscrowAbi;
      const contractAddress = Escrow;

      const tokenDetails = tokenMap[networkType].find(
        (eachToken) => eachToken.symbol.toLowerCase() === token.toLowerCase()
      );
      if (!tokenDetails) {
        throw new Error('Provided token symbol is invalid.');
      }
      const decimals = tokenDetails?.decimal ?? 18;
      const tokenAddress: any = tokenDetails?.address;

      const contract = new ethers.Contract(contractAddress, contractABI, signer);

      const finalAmount = (Number(amount.toString()) * 10 ** decimals - 1) / 10 ** decimals;
      const withdrawAmount = ethers.parseUnits(finalAmount.toFixed(decimals), decimals);

      const result = await contract.withdraw(tokenAddress, withdrawAmount);
      const receipt = await result.wait();
      console.log('Withdraw balance successful -> ', receipt);
      if (onSuccessCallback) onSuccessCallback(receipt);
      return receipt;
    } catch (error) {
      console.error('Error in balance withdraw -> ', error);
      if (onFailureCallback) onFailureCallback(error);
      const errorMessage = handleContractError(error, EscrowAbi);
      throw errorMessage;
    }
  }

  async withdrawProviderEarnings({
    tokenAddress,
    amount,
    decimals,
    onSuccessCallback,
    onFailureCallback,
  }: TransactionData) {
    try {
      const { signer } = await initializeSigner({ wallet: this.wallet });
      const contractABI = EscrowAbi;
      const contractAddress = Escrow;

      const contract = new ethers.Contract(contractAddress, contractABI, signer);

      const finalAmount = (Number(amount.toString()) - 1) / 10 ** decimals;
      const withdrawAmount = ethers.parseUnits(finalAmount.toFixed(decimals), decimals);

      const result = await contract.withdrawProviderEarnings(tokenAddress, withdrawAmount);
      const receipt = await result.wait();
      console.log('Withdraw earnings successfull -> ', receipt);
      if (onSuccessCallback) onSuccessCallback(receipt);
      return receipt;
    } catch (error) {
      console.error('Error withdrawing provider earnings-> ', error);
      if (onFailureCallback) onFailureCallback(error);
      const errorMessage = handleContractError(error, EscrowAbi);
      throw errorMessage;
    }
  }

  async withdrawFizzEarnings({
    tokenAddress,
    amount,
    decimals,
    onSuccessCallback,
    onFailureCallback,
  }: TransactionData) {
    try {
      const { signer } = await initializeSigner({ wallet: this.wallet });

      const contractABI = EscrowAbi;
      const contractAddress = EscrowDev;
      const contract = new ethers.Contract(contractAddress, contractABI, signer);

      const finalAmount = (Number(amount.toString()) - 1) / 10 ** decimals;
      const withdrawAmount = ethers.parseUnits(finalAmount.toFixed(decimals), decimals);

      const result = await contract.withdrawFizzNodeEarnings(tokenAddress, withdrawAmount);
      const receipt = await result.wait();
      console.log('Withdraw earnings successful -> ', receipt);
      if (onSuccessCallback) onSuccessCallback(receipt);
      return receipt;
    } catch (error) {
      console.error('Error withdrawing fizz earnings -> ', error);
      if (onFailureCallback) onFailureCallback(error);
      const errorMessage = handleContractError(error, EscrowAbi);
      throw errorMessage;
    }
  }

  async getFizzEarnings(fizzAddress: string, tokenAddress: string) {
    try {
      const contractAbi = EscrowAbi;
      const contractAddress = EscrowDev;
      const contract = new ethers.Contract(contractAddress, contractAbi, this.provider);

      const response = await contract.getFizzNodeEarnings(fizzAddress, tokenAddress);

      const fizzEarnings: { earned: string; withdrawn: string; balance: string } = {
        earned: response[0].toString(),
        withdrawn: response[1].toString(),
        balance: response[2].toString(),
      };

      return fizzEarnings;
    } catch (error) {
      console.error('Error in getFizzEarnings:', error);
      const errorMessage = handleContractError(error, EscrowAbi);
      throw errorMessage;
    }
  }
}

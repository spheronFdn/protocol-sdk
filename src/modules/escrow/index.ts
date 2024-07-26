import { Contract, ContractTransactionResponse, ethers } from 'ethers';
import EscrowAbi from '@contracts/abis/Escrow.json';
import { Escrow } from '@contracts/addresses';
import { TransactionData } from './types';

export class EscrowModule {
  private provider: ethers.Provider;

  constructor(provider: ethers.Provider) {
    this.provider = provider;
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
      throw error;
    }
  }

  async getUserBalance(providerAddress: string, tokenAddress: string) {
    try {
      const contractAbi = EscrowAbi;
      const contractAddress = Escrow;
      const contract = new ethers.Contract(contractAddress, contractAbi, this.provider);

      const response = await contract.getUserData(providerAddress, tokenAddress);

      const userData: { lockedBalance: string; unlockedBalance: string } = {
        lockedBalance: response[0].toString(),
        unlockedBalance: response[1].toString(),
      };

      return userData;
    } catch (error) {
      console.error('Error in getUserData:', error);
      throw error;
    }
  }

  async getProtocolFee() {
    try {
      const contractAbi = EscrowAbi;
      const contractAddress = Escrow;
      const contract = new ethers.Contract(contractAddress, contractAbi, this.provider);

      const response: string = await contract.getProtocolFee();

      return response.toString();
    } catch (error) {
      console.error('Error in getProtocolFee:', error);
      throw error;
    }
  }

  // write operations
  async withdrawProviderEarnings({ tokenAddress, amount, decimals }: TransactionData) {
    if (typeof window?.ethereum === 'undefined') {
      console.log('Please install MetaMask');
      return;
    }

    try {
      await window.ethereum.request({ method: 'eth_requestAccounts' });

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contractABI = EscrowAbi;
      const contractAddress = Escrow;

      const contract: Contract = new ethers.Contract(contractAddress, contractABI, signer);

      const finalAmount = (Number(amount.toString()) - 1) / 10 ** decimals;
      const withdrawAmount = ethers.parseUnits(finalAmount.toFixed(decimals), decimals);

      const result: ContractTransactionResponse = await contract.withdrawProviderEarnings(
        tokenAddress,
        withdrawAmount
      );
      const receipt = await result.wait();
      console.log('Withdraw earnings successfull -> ', receipt);
    } catch (error) {
      console.error('Error withdrawing provider earnings-> ', error);
      throw error;
    }
  }

  async depositBalance({ tokenAddress, amount, decimals }: TransactionData) {
    if (typeof window?.ethereum === 'undefined') {
      console.log('Please install MetaMask');
      return;
    }

    try {
      await window.ethereum.request({ method: 'eth_requestAccounts' });

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contractABI = EscrowAbi;
      const contractAddress = Escrow;

      const contract: Contract = new ethers.Contract(contractAddress, contractABI, signer);

      const finalAmount = (Number(amount.toString()) - 1) / 10 ** decimals;
      const depositAmount = ethers.parseUnits(finalAmount.toFixed(decimals), decimals);

      const result: ContractTransactionResponse = await contract.deposit(
        tokenAddress,
        depositAmount
      );
      const receipt = await result.wait();
      console.log('Deposit balance successfull -> ', receipt);
    } catch (error) {
      console.error('Error balance deposit-> ', error);
      throw error;
    }
  }

  async withdrawBalance({ tokenAddress, amount, decimals }: TransactionData) {
    if (typeof window?.ethereum === 'undefined') {
      console.log('Please install MetaMask');
      return;
    }

    try {
      await window.ethereum.request({ method: 'eth_requestAccounts' });

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contractABI = EscrowAbi;
      const contractAddress = Escrow;

      const contract: Contract = new ethers.Contract(contractAddress, contractABI, signer);

      const finalAmount = (Number(amount.toString()) - 1) / 10 ** decimals;
      const withdrawAmount = ethers.parseUnits(finalAmount.toFixed(decimals), decimals);

      const result: ContractTransactionResponse = await contract.withdraw(
        tokenAddress,
        withdrawAmount
      );
      const receipt = await result.wait();
      console.log('Withdraw balance successfull -> ', receipt);
    } catch (error) {
      console.error('Error in balance withdraw-> ', error);
      throw error;
    }
  }

  async withdrawProtocolFees({ tokenAddress, amount, decimals }: TransactionData) {
    if (typeof window?.ethereum === 'undefined') {
      console.log('Please install MetaMask');
      return;
    }

    try {
      await window.ethereum.request({ method: 'eth_requestAccounts' });

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contractABI = EscrowAbi;
      const contractAddress = Escrow;

      const contract: Contract = new ethers.Contract(contractAddress, contractABI, signer);

      const finalAmount = (Number(amount.toString()) - 1) / 10 ** decimals;
      const withdrawAmount = ethers.parseUnits(finalAmount.toFixed(decimals), decimals);

      const result: ContractTransactionResponse = await contract.withdrawProtocolFees(
        tokenAddress,
        withdrawAmount
      );
      const receipt = await result.wait();
      console.log('Withdraw protocol fees successfull -> ', receipt);
    } catch (error) {
      console.error('Error in protocol fees withdraw-> ', error);
      throw error;
    }
  }
}

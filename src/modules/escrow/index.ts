import {
  BrowserProvider,
  Contract,
  ContractTransactionResponse,
  ethers,
  JsonRpcProvider,
} from 'ethers';
import EscrowAbi from '@contracts/abis/Escrow.json';
import { Escrow } from '@contracts/addresses';
import { TransactionStatus } from './types';

// read operations
export const getProviderEarnings = async (
  providerAddress: string,
  tokenAddress: string,
  rpcUrl: string
) => {
  try {
    const provider = new JsonRpcProvider(rpcUrl);
    const contractAbi = EscrowAbi;
    const contractAddress = Escrow;

    const contract = new ethers.Contract(contractAddress, contractAbi, provider);
    const response = await contract.getProviderEarnings(providerAddress, tokenAddress);

    const providerEarnings: { earned: string; withdrawn: string; balance: string } = {
      earned: response[0].toString(),
      withdrawn: response[1].toString(),
      balance: response[2].toString(),
    };

    return providerEarnings;
  } catch (error) {
    console.error('Error in getProviderEarnings:', error);
  }
};

export const getProtocolFee = async (rpcUrl: string) => {
  try {
    const provider = new JsonRpcProvider(rpcUrl);
    const contractAbi = EscrowAbi;
    const contractAddress = Escrow;

    const contract = new ethers.Contract(contractAddress, contractAbi, provider);
    const response: string = await contract.getProtocolFee();

    return response.toString();
  } catch (error) {
    console.error('Error in getProtocolFee:', error);
  }
};

export const getUserData = async (
  providerAddress: string,
  tokenAddress: string,
  rpcUrl: string
) => {
  try {
    const provider = new JsonRpcProvider(rpcUrl);
    const contractAbi = EscrowAbi;
    const contractAddress = Escrow;

    const contract = new ethers.Contract(contractAddress, contractAbi, provider);
    const response = await contract.getUserData(providerAddress, tokenAddress);

    const userData: { lockedBalance: string; unlockedBalance: string } = {
      lockedBalance: response[0].toString(),
      unlockedBalance: response[1].toString(),
    };

    return userData;
  } catch (error) {
    console.error('Error in getUserData:', error);
  }
};

// write operations
export const withdrawProviderEarnings = async (
  tokenAddress: string,
  amount: number,
  decimals: number,
  setWithdrawLoading: (loading: boolean) => void,
  setWithdrawStatus: (status: TransactionStatus) => void
) => {
  try {
    if (typeof window.ethereum !== 'undefined') {
      setWithdrawLoading(true);

      await window.ethereum.request({ method: 'eth_requestAccounts' });
      const provider: BrowserProvider = new ethers.BrowserProvider(window.ethereum);
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
      await result.wait();
      setWithdrawLoading(false);
      setWithdrawStatus(TransactionStatus.SUCCESS);
    } else {
      console.error('MetaMask not detected');
      setWithdrawStatus(TransactionStatus.FAILURE);
      setWithdrawLoading(false);
    }
  } catch (error) {
    console.error('Error in withdrawProviderEarnings:', error);
    setWithdrawStatus(TransactionStatus.FAILURE);
    setWithdrawLoading(false);
  }
};

export const depositAmount = async (
  tokenAddress: string,
  amount: number,
  decimals: number,
  setDepositLoading: (loading: boolean) => void,
  setDepositStatus: (status: TransactionStatus) => void
) => {
  try {
    if (typeof window.ethereum !== 'undefined') {
      setDepositLoading(true);

      await window.ethereum.request({ method: 'eth_requestAccounts' });
      const provider: BrowserProvider = new ethers.BrowserProvider(window.ethereum);
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
      await result.wait();
      setDepositLoading(false);
      setDepositStatus(TransactionStatus.SUCCESS);
    } else {
      console.error('MetaMask not detected');
      setDepositStatus(TransactionStatus.FAILURE);
      setDepositLoading(false);
    }
  } catch (error) {
    console.error('Error in depositAmount:', error);
    setDepositStatus(TransactionStatus.FAILURE);
    setDepositLoading(false);
  }
};

export const withdrawAmount = async (
  tokenAddress: string,
  amount: number,
  decimals: number,
  setWithdrawLoading: (loading: boolean) => void,
  setWithdrawStatus: (status: TransactionStatus) => void
) => {
  try {
    if (typeof window.ethereum !== 'undefined') {
      setWithdrawLoading(true);

      await window.ethereum.request({ method: 'eth_requestAccounts' });
      const provider: BrowserProvider = new ethers.BrowserProvider(window.ethereum);
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
      await result.wait();
      setWithdrawLoading(false);
      setWithdrawStatus(TransactionStatus.SUCCESS);
    } else {
      console.error('MetaMask not detected');
      setWithdrawStatus(TransactionStatus.FAILURE);
      setWithdrawLoading(false);
    }
  } catch (error) {
    console.error('Error in withdrawAmount:', error);
    setWithdrawStatus(TransactionStatus.FAILURE);
    setWithdrawLoading(false);
  }
};

export const withdrawProtocolFees = async (
  tokenAddress: string,
  amount: number,
  decimals: number,
  setWithdrawLoading: (loading: boolean) => void,
  setWithdrawStatus: (status: TransactionStatus) => void
) => {
  try {
    if (typeof window.ethereum !== 'undefined') {
      setWithdrawLoading(true);

      await window.ethereum.request({ method: 'eth_requestAccounts' });
      const provider: BrowserProvider = new ethers.BrowserProvider(window.ethereum);
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
      await result.wait();
      setWithdrawLoading(false);
      setWithdrawStatus(TransactionStatus.SUCCESS);
    } else {
      console.error('MetaMask not detected');
      setWithdrawStatus(TransactionStatus.FAILURE);
      setWithdrawLoading(false);
    }
  } catch (error) {
    console.error('Error in withdrawProviderEarnings:', error);
    setWithdrawStatus(TransactionStatus.FAILURE);
    setWithdrawLoading(false);
  }
};

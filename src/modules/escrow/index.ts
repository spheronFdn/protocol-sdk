import {
  BrowserProvider,
  Contract,
  ContractTransactionResponse,
  ethers,
  JsonRpcProvider,
} from 'ethers';
import EscrowAbi from '@contracts/abis/Escrow.json';
import { Escrow } from '@contracts/addresses';
import { WithdrawStatus } from './types';

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

export const withdrawProviderEarnings = async (
  tokenAddress: string,
  amount: number,
  decimals: number,
  setWithdrawLoading: (loading: boolean) => void,
  setWithdrawStatus: (status: WithdrawStatus) => void
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

      console.log('amount -> ', amount);
      console.log('less amount -> ', finalAmount);
      console.log('withdrawAmount -> ', withdrawAmount);

      const result: ContractTransactionResponse = await contract.withdrawProviderEarnings(
        tokenAddress,
        withdrawAmount
      );
      await result.wait();
      setWithdrawLoading(false);
      setWithdrawStatus(WithdrawStatus.SUCCESS);
    } else {
      console.error('MetaMask not detected');
      setWithdrawStatus(WithdrawStatus.FAILURE);
      setWithdrawLoading(false);
    }
  } catch (error) {
    console.error('Error in withdrawProviderEarnings:', error);
    setWithdrawStatus(WithdrawStatus.FAILURE);
    setWithdrawLoading(false);
  }
};

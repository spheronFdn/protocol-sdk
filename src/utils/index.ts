import { ethers } from "ethers";
import dayjs from "dayjs";
import { IToken, NetworkType, tokenMap } from "@config/index";

export const isValidEthereumAddress = (address: string): boolean =>
  ethers.isAddress(address);

export const getTokenDetails = (
  tokenAddress: string,
  networkType: NetworkType
): IToken | undefined => {
  return (
    tokenMap[networkType]?.find(
      (token) => token.address.toLowerCase() === tokenAddress.toLowerCase()
    ) || tokenMap[networkType][0]
  );
};

export const mapTokenToId = (token: string) => {
  const tokens = new Map<string, number>();
  tokens.set("USDT", 825);
  tokens.set("WMATIC", 3890);
  tokens.set("WETH", 2396);
  tokens.set("DAI", 4943);
  tokens.set("USDC", 3408);
  tokens.set("AKT", 7431);
  tokens.set("MATIC", 3890);
  tokens.set("SOL", 5426);
  tokens.set("WAVAX", 5805);
  tokens.set("WBNB", 1839);
  tokens.set("tFIL", 2280);
  tokens.set("FIL", 2280);
  tokens.set("USDbC", 3408);
  tokens.set("WMNT", 27614);
  tokens.set("WXDAI", 9021);
  return tokens.get(token);
};

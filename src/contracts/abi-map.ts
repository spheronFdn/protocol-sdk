import AccessControlManagerTestnet from './abis/devnet/AccessControlManager.json';
import TokenRegistryTestnet from './abis/devnet/TokenRegistry.json';
import ProviderRegistryTestnet from './abis/devnet/ProviderRegistry.json';
import ProviderAttributeRegistryTestnet from './abis/devnet/ProviderAttributeRegistry.json';
import FizzRegistryTestnet from './abis/devnet/FizzRegistry.json';
import FizzAttributeRegistryTestnet from './abis/devnet/FizzAttributeRegistry.json';
import EscrowTestnet from './abis/devnet/Escrow.json';
import AttributeRegistryTestnet from './abis/devnet/AttributeRegistry.json';
import BidTestnet from './abis/devnet/Bid.json';
import ComputeLeaseTestnet from './abis/devnet/ComputeLease.json';
import FizzRewardsManagerTestnet from './abis/devnet/FizzRewardsManager.json';
import OrderRequestTestnet from './abis/devnet/OrderRequest.json';
import ProviderRewardsManagerTestnet from './abis/devnet/ProviderRewardsManager.json';
import ResourceRegistryTestnet from './abis/devnet/ResourceRegistry.json';
import ResourceRegistryFactoryTestnet from './abis/devnet/ResourceRegistryFactory.json';
import RewardTokenTestnet from './abis/devnet/RewardToken.json';
import TestContractTestnet from './abis/devnet/TestContract.json';
import TestTokenTestnet from './abis/devnet/TestToken.json';

import AccessControlManagerMainnet from './abis/mainnet/AccessControlManager.json';
import TokenRegistryMainnet from './abis/mainnet/TokenRegistry.json';
import ProviderRegistryMainnet from './abis/mainnet/ProviderRegistry.json';
import ProviderAttributeRegistryMainnet from './abis/mainnet/ProviderAttributeRegistry.json';
import FizzRegistryMainnet from './abis/mainnet/FizzRegistry.json';
import FizzAttributeRegistryMainnet from './abis/mainnet/FizzAttributeRegistry.json';
import EscrowMainnet from './abis/mainnet/Escrow.json';
import AttributeRegistryMainnet from './abis/mainnet/AttributeRegistry.json';
import BidMainnet from './abis/mainnet/Bid.json';
import ComputeLeaseMainnet from './abis/mainnet/ComputeLease.json';
import FizzRewardsManagerMainnet from './abis/mainnet/FizzRewardsManager.json';
import OrderRequestMainnet from './abis/mainnet/OrderRequest.json';
import ProviderRewardsManagerMainnet from './abis/mainnet/ProviderRewardsManager.json';
import ResourceRegistryMainnet from './abis/mainnet/ResourceRegistry.json';
import ResourceRegistryFactoryMainnet from './abis/mainnet/ResourceRegistryFactory.json';
import RewardTokenMainnet from './abis/mainnet/RewardToken.json';
import TestContractMainnet from './abis/mainnet/TestContract.json';
import TestTokenMainnet from './abis/mainnet/TestToken.json';
import { NetworkType } from '@config/index';

export const abiMap: Record<NetworkType, Record<string, any>> = {
  testnet: {
    accessControlManager: AccessControlManagerTestnet,
    attributeRegistry: AttributeRegistryTestnet,
    bid: BidTestnet,
    computeLease: ComputeLeaseTestnet,
    escrow: EscrowTestnet,
    fizzAttributeRegistry: FizzAttributeRegistryTestnet,
    fizzRegistry: FizzRegistryTestnet,
    fizzRewardsManager: FizzRewardsManagerTestnet,
    orderRequest: OrderRequestTestnet,
    providerAttributeRegistry: ProviderAttributeRegistryTestnet,
    providerRegistry: ProviderRegistryTestnet,
    providerRewardsManager: ProviderRewardsManagerTestnet,
    resourceRegistry: ResourceRegistryTestnet,
    resourceRegistryFactory: ResourceRegistryFactoryTestnet,
    rewardToken: RewardTokenTestnet,
    testContract: TestContractTestnet,
    testToken: TestTokenTestnet,
    tokenRegistry: TokenRegistryTestnet,
  },
  mainnet: {
    accessControlManager: AccessControlManagerMainnet,
    attributeRegistry: AttributeRegistryMainnet,
    bid: BidMainnet,
    computeLease: ComputeLeaseMainnet,
    escrow: EscrowMainnet,
    fizzAttributeRegistry: FizzAttributeRegistryMainnet,
    fizzRegistry: FizzRegistryMainnet,
    fizzRewardsManager: FizzRewardsManagerMainnet,
    orderRequest: OrderRequestMainnet,
    providerAttributeRegistry: ProviderAttributeRegistryMainnet,
    providerRegistry: ProviderRegistryMainnet,
    providerRewardsManager: ProviderRewardsManagerMainnet,
    resourceRegistry: ResourceRegistryMainnet,
    resourceRegistryFactory: ResourceRegistryFactoryMainnet,
    rewardToken: RewardTokenMainnet,
    testContract: TestContractMainnet,
    testToken: TestTokenMainnet,
    tokenRegistry: TokenRegistryMainnet,
  },
};
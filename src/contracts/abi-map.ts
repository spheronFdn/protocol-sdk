import AccessControlManagerTestnet from './abis/testnet/AccessControlManager.json';
import TokenRegistryTestnet from './abis/testnet/TokenRegistry.json';
import ProviderRegistryTestnet from './abis/testnet/ProviderRegistry.json';
import ProviderAttributeRegistryTestnet from './abis/testnet/ProviderAttributeRegistry.json';
import FizzRegistryTestnet from './abis/testnet/FizzRegistry.json';
import FizzAttributeRegistryTestnet from './abis/testnet/FizzAttributeRegistry.json';
import EscrowTestnet from './abis/testnet/EscrowUser.json';
import EscrowProtocolTestnet from './abis/testnet/EscrowProtocol.json';
import AttributeRegistryTestnet from './abis/testnet/AttributeRegistry.json';
import BidTestnet from './abis/testnet/Bid.json';
import ComputeLeaseTestnet from './abis/testnet/ComputeLease.json';
import FizzRewardsManagerTestnet from './abis/testnet/FizzRewardsManager.json';
import OrderRequestTestnet from './abis/testnet/OrderRequest.json';
import ProviderRewardsManagerTestnet from './abis/testnet/ProviderRewardsManager.json';
import ResourceRegistryTestnet from './abis/testnet/ResourceRegistry.json';
import ResourceRegistryFactoryTestnet from './abis/testnet/ResourceRegistryFactory.json';
import RewardTokenTestnet from './abis/testnet/RewardToken.json';
import TestContractTestnet from './abis/testnet/TestContract.json';
import TestTokenTestnet from './abis/testnet/TestToken.json';

import AccessControlManagerMainnet from './abis/mainnet/AccessControlManager.json';
import TokenRegistryMainnet from './abis/mainnet/TokenRegistry.json';
import ProviderRegistryMainnet from './abis/mainnet/ProviderRegistry.json';
import ProviderAttributeRegistryMainnet from './abis/mainnet/ProviderAttributeRegistry.json';
import FizzRegistryMainnet from './abis/mainnet/FizzRegistry.json';
import FizzAttributeRegistryMainnet from './abis/mainnet/FizzAttributeRegistry.json';
import EscrowUserMainnet from './abis/mainnet/EscrowUser.json';
import EscrowProtocolMainnet from './abis/mainnet/EscrowProtocol.json';
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
    escrowProtocol: EscrowProtocolTestnet,
  },
  mainnet: {
    accessControlManager: AccessControlManagerMainnet,
    attributeRegistry: AttributeRegistryMainnet,
    bid: BidMainnet,
    computeLease: ComputeLeaseMainnet,
    escrow: EscrowUserMainnet,
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
    escrowProtocol: EscrowProtocolMainnet,
  },
};

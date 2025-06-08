# Changelog

All notable changes to the Spheron Protocol SDK will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.1.1] - 2025-06-08

### Added
- Add hourly cost for the lease in getLeaseDetails method in lease module

## [2.1.0] - 2025-06-02

### Added
- Add Inventory Module for getting available and allocatable resources including their prices
- Add support for preventing deployment on any specific fizz and provider
- Introduced secure deployment URLs when fetching deployment details

### Changed
- Update default networkType to mainnet in deployment and escrow module

## [2.0.1] - 2025-05-06

### Changed
- Update spec resources to consume converted storage attributes

## [2.0.0] - 2025-05-03

### Added
- Mainnet support enabled for production deployments
- New improved initialization configuration via constructor for extensibility
  - Optional `networkType` parameter with 'mainnet' as default
  - Better type safety and parameter validation
- Custom RPC support for both HTTP and WebSocket connections
- Gasless transaction support
  - Coinbase Paymaster integration
  - Biconomy Paymaster integration
  - Framework in place for future gasless providers

### Changed
- Updated SDK initialization to use a configuration object instead of individual parameters
- Improved error handling and type definitions
- Enhanced documentation for gasless transactions and smart wallet usage

### Note
- More gasless transaction providers will be added in future releases
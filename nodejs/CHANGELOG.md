# Changelog

All notable changes to the Spheron Protocol SDK will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
# Stable Router Documentation

## Overview
Stable Router is a cross-chain stablecoin payment protocol enabling single-transaction routing between different stablecoins across multiple blockchain networks.

## Documentation Structure

### [Architecture](./ARCHITECTURE.md)
Complete system architecture including:
- Core principles and design patterns
- System components (contracts, API, frontend)
- Protocol integration details
- Security features and gas optimization

### [Routing Map](./ROUTING_MAP.md)
Comprehensive routing information:
- Supported chains and their details
- Valid route matrix for all token pairs
- Protocol selection for each route
- Fee structure and examples

### [Supported Tokens](./SUPPORTED_TOKENS.md)
Detailed token information:
- Token specifications and deployment addresses
- Bridge protocol support
- Selection guidelines
- Integration requirements

## Quick Start

### For Developers
1. Review the [Architecture](./ARCHITECTURE.md) document
2. Check [Routing Map](./ROUTING_MAP.md) for valid routes
3. See implementation details in `/contracts`, `/api`, and `/web` directories

### For Users
1. Check [Supported Tokens](./SUPPORTED_TOKENS.md) for available options
2. Review [Routing Map](./ROUTING_MAP.md) for your desired route
3. Use the web interface at `/web` to execute transfers

## Key Features
- ✅ Single-transaction execution
- ✅ Native asset routing only
- ✅ Multiple protocol support (CCTP, LayerZero, Stargate)
- ✅ Upgradeable smart contracts
- ✅ 6 chains, 5 stablecoins
- ✅ No fallback substitutions

## Directory Structure
```
stable-router/
├── contracts/     # Smart contracts (Hardhat)
├── web/          # Frontend (Next.js)
├── api/          # Backend (FastAPI)
└── docs/         # Documentation
```

## Protocol Support
- **Circle CCTP v2**: USDC transfers
- **LayerZero OFT**: PYUSD, USDe, crvUSD transfers
- **LayerZero Composer**: Cross-token swaps
- **Stargate**: USDT transfers

## Contact & Support
For questions or issues, please refer to the documentation or open an issue in the repository.
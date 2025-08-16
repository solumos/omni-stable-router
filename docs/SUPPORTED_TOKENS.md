# Supported Tokens

## Token Overview

| Token | Symbol | Decimals | Protocol | Issuer | Market Cap |
|-------|--------|----------|----------|---------|------------|
| USD Coin | USDC | 6 | Circle CCTP v2 | Circle | $25B+ |
| PayPal USD | PYUSD | 6 | LayerZero OFT | PayPal/Paxos | $500M+ |
| Tether USD | USDT | 6 | Stargate | Tether | $90B+ |
| Ethena USD | USDe | 18 | LayerZero OFT | Ethena Labs | $3B+ |
| Curve USD | crvUSD | 18 | LayerZero OFT | Curve Finance | $100M+ |

## USDC (USD Coin)

### Overview
- **Issuer**: Circle
- **Standard**: ERC-20
- **Bridge Protocol**: Circle CCTP v2
- **Fully Backed**: 1:1 USD reserves
- **Regulatory**: Licensed and regulated

### Chain Deployment
| Chain | Contract Address | Native |
|-------|-----------------|--------|
| Ethereum | 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 | ✅ |
| Arbitrum | 0xaf88d065e77c8cC2239327C5EDb3A432268e5831 | ✅ |
| Optimism | 0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85 | ✅ |
| Base | 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 | ✅ |
| Polygon | 0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359 | ✅ |
| Avalanche | 0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E | ✅ |

### Features
- Native burn-and-mint via CCTP
- No liquidity constraints
- ~15 second finality
- Minimal fees (gas only)

## PYUSD (PayPal USD)

### Overview
- **Issuer**: PayPal (via Paxos)
- **Standard**: ERC-20 + LayerZero OFT
- **Bridge Protocol**: LayerZero OFT
- **Fully Backed**: 1:1 USD reserves
- **Regulatory**: NYDFS regulated

### Chain Deployment
| Chain | Contract Address | Native |
|-------|-----------------|--------|
| Ethereum | 0x6c3ea9036406852006290770BEdFcAbA0e23A0e8 | ✅ |
| Optimism | TBD | ✅ |

### Features
- LayerZero OFT standard for cross-chain
- Composer support for cross-token swaps
- Direct integration with PayPal ecosystem
- ~25 second finality

## USDT (Tether USD)

### Overview
- **Issuer**: Tether Limited
- **Standard**: ERC-20
- **Bridge Protocol**: Stargate
- **Backing**: USD + equivalents
- **Market Leader**: Largest stablecoin by market cap

### Chain Deployment
| Chain | Contract Address | Native |
|-------|-----------------|--------|
| Ethereum | 0xdAC17F958D2ee523a2206206994597C13D831ec7 | ✅ |
| Arbitrum | 0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9 | ✅ |
| Optimism | 0x94b008aA00579c1307B0EF2c499aD98a8ce58e58 | ✅ |
| Base | Native deployment pending | ❌ |
| Polygon | 0xc2132D05D31c914a87C6611C10748AEb04B58e8F | ✅ |
| Avalanche | 0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7 | ✅ |

### Features
- Stargate unified liquidity pools
- Instant guaranteed finality
- High liquidity across all chains
- ~30 second finality

## USDe (Ethena USD)

### Overview
- **Issuer**: Ethena Labs
- **Standard**: ERC-20 + LayerZero OFT
- **Bridge Protocol**: LayerZero OFT
- **Backing**: Delta-neutral synthetic dollar
- **Yield**: Native yield generation

### Chain Deployment
| Chain | Contract Address | Native |
|-------|-----------------|--------|
| Ethereum | 0x4c9EDD5852cd905f086C759E8383e09bff1E68B3 | ✅ |
| Arbitrum | TBD | ✅ |
| Optimism | TBD | ✅ |
| Base | TBD | ✅ |

### Features
- LayerZero OFT for seamless bridging
- Yield-bearing stablecoin
- Delta-neutral backing mechanism
- Growing DeFi integration

## crvUSD (Curve USD)

### Overview
- **Issuer**: Curve Finance DAO
- **Standard**: ERC-20 + LayerZero OFT
- **Bridge Protocol**: LayerZero OFT
- **Backing**: Over-collateralized crypto
- **Mechanism**: LLAMMA (soft liquidation)

### Chain Deployment
| Chain | Contract Address | Native |
|-------|-----------------|--------|
| Ethereum | 0xf939E0A03FB07F59A73314E73794Be0E57ac1b4E | ✅ |
| Arbitrum | 0x498Bf2B1e120FeD3ad3D42Ea2165E9b73f99C1e5 | ✅ |
| Optimism | TBD | ✅ |

### Features
- Curve's native stablecoin
- Soft liquidation mechanism
- Deep liquidity in Curve pools
- LayerZero OFT for cross-chain

## Token Selection Guidelines

### For Maximum Compatibility
Choose **USDC** - available on all supported chains with native CCTP

### For Lowest Fees
Choose **USDC** - CCTP has minimal bridge fees

### For Fastest Transfers
Choose **USDC** - ~15 second finality with CCTP

### For Highest Liquidity
Choose **USDT** - largest market cap and deepest liquidity

### For PayPal Integration
Choose **PYUSD** - direct PayPal ecosystem integration

### For Yield Generation
Choose **USDe** - native yield-bearing properties

### For DeFi Integration
Choose **crvUSD** - deep Curve ecosystem integration

## Adding New Tokens

### Requirements for Integration
1. **Native Deployment**: Token must be natively deployed (not bridged)
2. **Bridge Support**: Must support CCTP, LayerZero OFT, or Stargate
3. **Liquidity**: Sufficient DEX liquidity for swaps
4. **Security**: Audited contracts and proven track record
5. **Demand**: User demand and use case validation

### Evaluation Criteria
- Market capitalization > $100M
- Daily volume > $10M
- Available on 2+ supported chains
- Established issuer with regulatory compliance
- Technical compatibility with existing protocols
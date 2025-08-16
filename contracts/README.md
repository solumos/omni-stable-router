# StableRouter - Cross-Chain Stablecoin Router

A unified cross-chain routing system for stablecoins using CCTP V2, LayerZero V2, and Stargate protocols.

## Overview

StableRouter provides optimal routing for stablecoin transfers across multiple chains, automatically selecting the best protocol based on:
- Token availability on source/destination chains
- Cost optimization (CCTP ~$0.60 vs LayerZero ~$3.90)
- Protocol capabilities (atomic swaps, composability)

## Supported Tokens & Chains

### Token Availability Matrix

| Token | Ethereum | Arbitrum | Optimism | Base | Polygon | Avalanche | Protocol |
|-------|----------|----------|----------|------|---------|-----------|----------|
| USDC  | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | CCTP V2 |
| USDT  | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | Stargate |
| PYUSD | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | LayerZero OFT |
| USDe  | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | LayerZero OFT |
| crvUSD| ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | LayerZero OFT |

### Supported Chains
- **Ethereum Mainnet** (1)
- **Arbitrum One** (42161)
- **Optimism** (10)
- **Base** (8453)
- **Polygon** (137)
- **Avalanche C-Chain** (43114)

## Protocol Selection

```solidity
enum Protocol {
    NONE,           // 0: No protocol
    CCTP,           // 1: Circle CCTP for USDC
    LAYERZERO_OFT,  // 2: LayerZero OFT for same-token transfers
    STARGATE,       // 3: Stargate for USDT transfers
    LZ_COMPOSER,    // 4: LayerZero Composer for cross-token swaps
    CCTP_HOOKS,     // 5: CCTP v2 with hooks for USDC->other
    STARGATE_SWAP   // 6: Stargate + swap on destination
}
```

## Deployment

### Prerequisites

```bash
npm install
cp .env.example .env
# Add your private key and RPC URLs to .env
```

### Deploy to a Network

```bash
# Deploy to Mainnet
npx hardhat run scripts/deploy.js --network ethereum
npx hardhat run scripts/deploy.js --network arbitrum
npx hardhat run scripts/deploy.js --network optimism
npx hardhat run scripts/deploy.js --network base
npx hardhat run scripts/deploy.js --network polygon
npx hardhat run scripts/deploy.js --network avalanche

# Deploy to testnet
npx hardhat run scripts/deploy.js --network sepolia
```

### Verify Contracts

```bash
# Verify on Etherscan
npx hardhat run scripts/verify.js --network ethereum

# Verify on Arbiscan
npx hardhat run scripts/verify.js --network arbitrum
```

## Configuration

Edit `scripts/config.js` to update:
- Protocol addresses (CCTP, LayerZero, Stargate)
- Token addresses
- Swap router addresses (1inch, 0x, etc.)

## Testing

```bash
# Run all tests
npm test

# Run specific protocol tests
npx hardhat test test/Protocol.CCTP.test.js
npx hardhat test test/Protocol.LAYERZERO_OFT.test.js
npx hardhat test test/Protocol.LZ_COMPOSER.test.js
npx hardhat test test/Protocol.STARGATE.test.js

# Run with coverage
npm run coverage
```

## Architecture

### Core Contracts

1. **StableRouter.sol** - Main entry point, handles route selection
2. **RouteProcessor.sol** - Executes cross-chain transfers via protocols
3. **FeeManager.sol** - Manages protocol fees
4. **SwapExecutor.sol** - Placeholder for DEX integrations

### Key Features

- **CCTP V2 with Hooks**: Enables atomic USDC→token swaps on destination
- **LayerZero Composer**: Cross-token swaps for OFT tokens
- **Stargate Integration**: USDT routing with destination swaps
- **UUPS Upgradeable**: Future-proof contract architecture
- **Gas Optimized**: Minimal overhead, efficient routing

## Usage Examples

### Example 1: USDC from Ethereum to USDT on Arbitrum
```javascript
// Uses CCTP_HOOKS for atomic swap on destination
const routeParams = {
  sourceToken: USDC_ADDRESS,
  destToken: USDT_ADDRESS,
  amount: ethers.parseUnits("1000", 6),
  destChainId: 42161, // Arbitrum
  recipient: recipientAddress,
  minAmountOut: ethers.parseUnits("995", 6), // 0.5% slippage
  routeData: swapData // Encoded 1inch/0x swap data
};

await stableRouter.executeRoute(routeParams, { value: ethers.parseEther("0.001") });
```

### Example 2: PYUSD from Ethereum to USDC on Optimism
```javascript
// Uses LZ_COMPOSER for cross-token swap
const routeParams = {
  sourceToken: PYUSD_ADDRESS,
  destToken: USDC_ADDRESS,
  amount: ethers.parseUnits("500", 6),
  destChainId: 10, // Optimism
  recipient: recipientAddress,
  minAmountOut: ethers.parseUnits("495", 6),
  routeData: composerData
};

await stableRouter.executeRoute(routeParams, { value: ethers.parseEther("0.002") });
```

## Gas Costs

Typical transaction costs:
- CCTP: ~150k gas + $0.60 protocol fee
- LayerZero OFT: ~200k gas + $3.90 bridge fee
- Stargate: ~250k gas + $2.50 bridge fee
- Composer/Hooks: ~400k gas (includes destination execution)

## Security

- Audited by [Pending]
- Bug Bounty: [Pending]
- Emergency pause functionality
- Slippage protection
- Reentrancy guards

## License

MIT
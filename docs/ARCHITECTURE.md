# Stable Router Architecture

## Overview
Stable Router is a cross-chain stablecoin payment protocol that enables single-transaction routing between different stablecoins across multiple blockchain networks. The system uses a combination of Circle's CCTP v2, LayerZero OFT, LayerZero Composer, and Stargate protocols to achieve optimal routing.

## Core Principles
1. **Single Transaction Execution**: All cross-chain operations complete in one user transaction
2. **Native Assets Only**: Only route to natively deployed tokens on destination chains
3. **No Fallback Substitutions**: Disallow routes where destination token is not native
4. **Deterministic Routing**: Protocol selection based on token pair and chain combination
5. **Upgradeable Contracts**: UUPS proxy pattern for contract upgrades

## System Components

### 1. Smart Contracts (/contracts)
- **StableRouter.sol**: Main router contract (UUPS upgradeable)
- **RouteProcessor.sol**: Handles protocol-specific routing logic
- **SwapExecutor.sol**: Manages DEX interactions for token swaps
- **FeeManager.sol**: Handles protocol fees and LayerZero fees

### 2. Backend API (/api)
- **FastAPI Service**: Python-based REST API
- **Route Calculator**: Determines optimal routing paths
- **Gas Estimator**: Calculates transaction costs
- **Transaction Builder**: Constructs calldata for router contract
- **Price Oracle**: Aggregates pricing data from multiple sources

### 3. Frontend Application (/web)
- **Next.js Application**: React-based user interface
- **Web3 Integration**: Wagmi + Viem for blockchain interactions
- **RainbowKit**: Wallet connection management
- **Token Selector**: UI for choosing source/destination tokens
- **Chain Selector**: UI for choosing source/destination chains

## Routing Protocols

### Protocol Selection Matrix
| Source Token | Destination Token | Protocol Used |
|-------------|------------------|---------------|
| USDC | USDC | Circle CCTP v2 |
| PYUSD | PYUSD | LayerZero OFT |
| USDe | USDe | LayerZero OFT |
| crvUSD | crvUSD | LayerZero OFT |
| USDT | USDT | Stargate |
| Any | Different Token | LayerZero Composer |

### Protocol Details

#### Circle CCTP v2
- Used exclusively for USDC-to-USDC transfers
- Supports hooks for additional operations
- ~15 second finality
- Native burn-and-mint mechanism

#### LayerZero OFT
- Used for PYUSD, USDe, and crvUSD same-token transfers
- Direct token transfers without intermediary swaps
- ~25 second finality
- Omnichain fungible token standard

#### LayerZero Composer
- Used for cross-token routes (e.g., PYUSD → USDT)
- Combines transfer + swap in single transaction
- ~35 second finality
- Supports complex multi-step operations

#### Stargate
- Used exclusively for USDT transfers
- Instant guaranteed finality
- Unified liquidity pools
- ~30 second finality

## Swap Pools
The router integrates with established DEXs for token swaps:

### Primary Pools
- **Curve Finance**: Stablecoin-optimized pools
- **Uniswap V3**: Concentrated liquidity pools
- **Balancer**: Stable pools for multi-asset swaps

### Pool Selection Logic
1. Check available liquidity
2. Compare slippage across pools
3. Select pool with best execution price
4. Execute swap atomically with bridge operation

## Contract Architecture

### Proxy Pattern (UUPS)
```
User → Proxy Contract → Implementation Contract
         ↓
    Admin Functions
    (upgrade logic)
```

### Function Flow
```
executeRoute()
    → validateRoute()
    → collectTokens()
    → determineProtocol()
    → executeProtocol()
        → CCTP: burnAndMint()
        → OFT: sendOFT()
        → Composer: composeAndSend()
        → Stargate: swap()
    → emitEvents()
```

## Security Features

### Access Control
- Ownable pattern for admin functions
- Pausable mechanism for emergency stops
- Role-based permissions for operations

### Validation
- Route validation before execution
- Slippage protection on swaps
- Minimum output amount checks
- Deadline enforcement

### Fee Management
- Protocol fee collection (0.1% default)
- LayerZero fee estimation and collection
- Refund mechanism for excess fees

## Gas Optimization

### Strategies
1. **Packed Structs**: Optimize storage layout
2. **Batch Operations**: Combine multiple operations
3. **Cached Values**: Store frequently accessed data
4. **Efficient Encoding**: Optimize calldata size

### Estimated Gas Costs
- CCTP Route: ~200,000 gas
- OFT Route: ~250,000 gas
- Composer Route: ~350,000 gas
- Stargate Route: ~300,000 gas

## Monitoring & Analytics

### Events
- RouteInitiated
- RouteCompleted
- SwapExecuted
- FeesCollected

### Metrics Tracked
- Total volume routed
- Success rate by protocol
- Average execution time
- Gas costs by route type

## Future Enhancements

### Planned Features
1. **Multi-hop Routing**: Support for routes through intermediate chains
2. **Batch Transactions**: Multiple transfers in single transaction
3. **Yield Integration**: Earn yield while funds are in transit
4. **Gasless Transactions**: Meta-transaction support

### Protocol Additions
- Integration with additional bridge protocols
- Support for more stablecoin types
- Cross-chain liquidity aggregation
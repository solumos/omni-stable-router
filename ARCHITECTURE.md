# StableCoin Router Architecture

## 🎯 Core Design Principles

1. **Single Transaction**: User signs once, router handles everything
2. **Upgradeable**: Proxy pattern for future improvements
3. **Deterministic Routing**: Clear rules for which rail to use
4. **Optimal Swap Pools**: Pre-configured best liquidity sources

## 🏗️ Smart Contract Architecture

```
┌─────────────────────────────────────────────────┐
│                  User Interface                  │
└─────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────┐
│          RouterProxy (Upgradeable)              │
│         (TransparentUpgradeableProxy)           │
└─────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────┐
│            StableRouterV1 (Logic)               │
│                                                  │
│  ┌──────────────┬──────────────┬─────────────┐ │
│  │   CCTPModule │  LZModule    │ StargateModule│ │
│  └──────────────┴──────────────┴─────────────┘ │
│  ┌──────────────┬──────────────┬─────────────┐ │
│  │  SwapRouter  │ PoolRegistry │  FeeManager  │ │
│  └──────────────┴──────────────┴─────────────┘ │
└─────────────────────────────────────────────────┘
```

### Contract Components

```solidity
// Main Router (Upgradeable via OpenZeppelin)
contract StableRouter is 
    Initializable,
    UUPSUpgradeable,
    OwnableUpgradeable,
    ReentrancyGuardUpgradeable 
{
    // Modular components
    ICCTPModule public cctpModule;
    ILayerZeroModule public lzModule;
    IStargateModule public stargateModule;
    ISwapRouter public swapRouter;
}
```

## 📊 Routing Decision Matrix

### Direct Routes (Same Token, Different Chain)

| Source Token | Dest Token | Rail | Protocol Details |
|--------------|------------|------|------------------|
| USDC | USDC | **CCTP v2** | Burn-and-mint, no slippage |
| PYUSD | PYUSD | **LayerZero OFT** | Direct transfer Eth↔Arb |
| USDe | USDe | **LayerZero OFT** | Available all chains |
| crvUSD | crvUSD | **LayerZero OFT** | Eth, Arb, Op only |
| USDT | USDT | **Stargate** | Unified liquidity pools |

### Composed Routes (Different Tokens)

| Source → Dest | Rail | Swap Location | Swap Pool |
|---------------|------|---------------|-----------|
| USDC → PYUSD | CCTP + Swap | Destination | Uniswap V3 0.05% |
| USDC → USDe | CCTP + Swap | Destination | Curve Factory |
| USDC → USDT | CCTP + Swap | Destination | Curve 3pool |
| PYUSD → USDC | LZ Composer | Destination | Uniswap V3 0.05% |
| PYUSD → USDe | LZ Composer | Destination | Via USDC (2 hops) |
| PYUSD → USDT | LZ Composer | Destination | Via USDC (2 hops) |
| USDe → USDC | LZ Composer | Destination | Curve Factory |
| USDe → PYUSD | LZ Composer | Destination | Via USDC (2 hops) |
| USDe → USDT | LZ Composer | Destination | Curve StableSwap |
| crvUSD → USDC | LZ Composer | Destination | Curve 3pool |
| crvUSD → Others | LZ Composer | Destination | Via USDC (2 hops) |
| USDT → USDC | Stargate + Swap | Destination | Curve 3pool |
| USDT → Others | Stargate + Swap | Destination | Via USDC (2 hops) |

## 🏊 Swap Pool Configuration

### Primary Pools (High Liquidity)

```solidity
struct PoolConfig {
    address pool;
    uint24 fee;      // For Uniswap V3
    uint8 poolType;  // 0: UniV3, 1: Curve, 2: UniV2
    bool stableSwap; // Use stable math
}

mapping(bytes32 => PoolConfig) public swapPools;

// Configuration Examples
swapPools[keccak256("USDC-USDT")] = PoolConfig({
    pool: CURVE_3POOL,
    fee: 0,
    poolType: 1,      // Curve
    stableSwap: true
});

swapPools[keccak256("USDC-PYUSD")] = PoolConfig({
    pool: UNISWAP_V3_ROUTER,
    fee: 500,         // 0.05%
    poolType: 0,      // UniV3
    stableSwap: false
});

swapPools[keccak256("USDC-USDe")] = PoolConfig({
    pool: CURVE_FACTORY_POOL,
    fee: 0,
    poolType: 1,      // Curve
    stableSwap: true
});
```

### Pool Priority by Chain

| Chain | Primary DEX | Secondary | Reason |
|-------|------------|-----------|---------|
| **Ethereum** | Curve | Uniswap V3 | Deep stablecoin liquidity |
| **Arbitrum** | Uniswap V3 | Curve | Better for newer tokens |
| **Optimism** | Velodrome | Uniswap V3 | Native DEX incentives |
| **Base** | Uniswap V3 | Aerodrome | Limited options |
| **Polygon** | QuickSwap | Curve | Gas efficiency |
| **Avalanche** | Trader Joe | Curve | Native DEX |

## 🔄 Single Transaction Flow

### Example: PYUSD (Ethereum) → USDT (Polygon)

```solidity
function sendPayment(
    address recipient,
    uint256 amount,
    address sourceToken,  // PYUSD
    uint32 destChainId,   // Polygon
    address destToken     // USDT
) external payable returns (bytes32 paymentId) {
    
    // 1. Take tokens from user (single approval)
    IERC20(sourceToken).safeTransferFrom(msg.sender, address(this), amount);
    
    // 2. Determine optimal route
    Route memory route = routingEngine.getRoute(sourceToken, destToken, destChainId);
    
    // 3. Execute based on route type
    if (route.protocol == Protocol.LAYERZERO_COMPOSER) {
        // Compose the message with swap instructions
        bytes memory composeMsg = abi.encode(
            recipient,
            destToken,
            swapPools[keccak256(abi.encode("PYUSD", "USDT"))]
        );
        
        // Send via LayerZero with compose option
        lzModule.sendWithCompose(
            destChainId,
            sourceToken,
            amount,
            composeMsg
        );
    }
    
    // User is done! Everything else happens automatically
}
```

### On Destination Chain (Automatic Execution)

```solidity
function lzCompose(
    bytes calldata _message
) external override onlyLayerZero {
    (address recipient, address targetToken, PoolConfig memory pool) = 
        abi.decode(_message, (address, address, PoolConfig));
    
    // 1. Tokens arrived via OFT
    uint256 balance = IERC20(PYUSD).balanceOf(address(this));
    
    // 2. Execute swap PYUSD → USDC → USDT
    uint256 usdcAmount = _swapViaPool(PYUSD, USDC, balance, pools["PYUSD-USDC"]);
    uint256 usdtAmount = _swapViaPool(USDC, USDT, usdcAmount, pools["USDC-USDT"]);
    
    // 3. Deliver to recipient
    IERC20(USDT).safeTransfer(recipient, usdtAmount);
}
```

## 🔐 Upgradeability Pattern

### Proxy Architecture

```solidity
// Deployment
RouterProxy proxy = new RouterProxy(
    address(routerV1),
    proxyAdmin,
    initData
);

// Future upgrade
proxyAdmin.upgrade(proxy, address(routerV2));
```

### Storage Layout

```solidity
contract StableRouterStorage {
    // Slot 0-10: Core config (immutable layout)
    mapping(uint32 => ChainConfig) internal chains;
    mapping(address => bool) internal supportedTokens;
    
    // Slot 11-20: Routing config (upgradeable)
    mapping(bytes32 => PoolConfig) internal swapPools;
    mapping(bytes32 => uint256) internal routeGasLimits;
    
    // Slot 21+: Future use (gap pattern)
    uint256[50] private __gap;
}
```

## 🎯 Key Features

### 1. Deterministic Rail Selection

```solidity
function selectRail(address tokenA, address tokenB) internal pure returns (Rail) {
    if (tokenA == USDC && tokenB == USDC) return Rail.CCTP;
    if (isOFTToken(tokenA) && tokenA == tokenB) return Rail.LAYERZERO_OFT;
    if (tokenA == USDT && tokenB == USDT) return Rail.STARGATE;
    return Rail.LAYERZERO_COMPOSER; // Default for complex routes
}
```

### 2. Gas Optimization

```solidity
// Batch operations in single transaction
function batchSend(PaymentRequest[] calldata requests) external payable {
    for (uint i = 0; i < requests.length; i++) {
        _processPayment(requests[i]);
    }
}
```

### 3. Slippage Protection

```solidity
function calculateMinOutput(
    uint256 amountIn,
    address tokenIn,
    address tokenOut
) internal view returns (uint256) {
    uint256 expectedOut = oracle.getExpectedOutput(amountIn, tokenIn, tokenOut);
    return expectedOut * (10000 - maxSlippageBps) / 10000; // Default 0.5% slippage
}
```

## 📈 Cost Analysis

| Route Type | Gas Cost (L1) | Gas Cost (L2) | Time |
|------------|---------------|---------------|------|
| USDC → USDC (CCTP) | ~150k | ~50k | 10-15s |
| PYUSD → PYUSD (OFT) | ~200k | ~80k | 20-30s |
| USDC → PYUSD (CCTP+Swap) | ~250k | ~100k | 15-20s |
| PYUSD → USDT (Composer) | ~300k | ~120k | 30-40s |
| Complex (2+ swaps) | ~400k | ~150k | 40-60s |

## 🚀 Deployment Strategy

### Phase 1: Core Rails
1. Deploy CCTP module (USDC only)
2. Deploy LayerZero OFT module (PYUSD, USDe, crvUSD)
3. Deploy Stargate module (USDT)

### Phase 2: Swap Integration
1. Configure Curve pools for stablecoin swaps
2. Configure Uniswap V3 for PYUSD pairs
3. Add chain-specific DEX adapters

### Phase 3: Composer & Optimization
1. Enable LayerZero Composer for complex routes
2. Add batching support
3. Implement gas optimization strategies

## 🔑 Security Considerations

1. **Upgradeable Proxy**: Use OpenZeppelin's battle-tested implementation
2. **Access Control**: Multi-sig for admin functions
3. **Slippage Protection**: Maximum slippage limits per route
4. **Rate Limiting**: Per-user and per-token limits
5. **Emergency Pause**: Circuit breaker for each rail
6. **Oracle Integration**: Chainlink for price validation

## 📝 Summary

This architecture provides:
- **Single transaction** execution for users
- **Optimal routing** via appropriate rails
- **Best liquidity** via configured pools
- **Upgradeability** for future improvements
- **Gas efficiency** through batching and optimization
- **Security** through proven patterns and controls

The modular design allows for easy addition of new tokens, chains, and protocols while maintaining a simple user experience.
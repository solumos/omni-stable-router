# StableRouter Simplification Plan

## Vision
Enable seamless cross-chain token transfers: **Send token V on chain W to address X as token Y on chain Z**

## Core Requirements
1. **No pre-registration needed** - Any address can send to any recipient
2. **Multi-token support** - USDC, USDT, PYUSD, etc.
3. **Cross-token swaps** - Send USDC, receive USDT
4. **Dynamic configuration** - Add new routes without redeploying
5. **Testnet-first** - Must work on testnets for development

## Current Problems to Fix

### 1. Hardcoded Mainnet Configuration
**Problem**: Chain mappings are hardcoded for mainnets only
```solidity
chainIdToCCTPDomain[1] = 0;      // Ethereum
chainIdToCCTPDomain[42161] = 3;  // Arbitrum
// No testnet support!
```
**Solution**: Dynamic configuration with setter functions

### 2. Invalid Domain Validation
**Problem**: Contract requires `destDomain > 0`, but Ethereum/Sepolia have domain 0
```solidity
require(destDomain > 0, "Invalid destination domain"); // Fails for valid domain 0
```
**Solution**: Change to `>= 0` or check if configured

### 3. Over-Complex Architecture
**Problem**: Two contracts (StableRouter + RouteProcessor) when one suffices
**Solution**: Single unified router contract

## New Architecture

### Single Entry Point
```solidity
function transfer(
    address fromToken,      // Token to send (e.g., USDC on Ethereum)
    address toToken,        // Token to receive (e.g., USDT on Arbitrum)
    uint256 amount,         // Amount to send
    uint256 toChainId,      // Destination chain ID
    address recipient       // Who receives the tokens
) external returns (bytes32 transferId);
```

### Dynamic Route Configuration
```solidity
struct Route {
    Protocol protocol;      // CCTP, LayerZero, Stargate
    uint32 protocolDomain;  // Protocol-specific domain/chain ID
    address bridgeContract; // Protocol's bridge/messenger address
    bytes extraData;        // Protocol-specific configuration
}

// Configure any token pair route
function configureRoute(
    address fromToken,
    uint256 fromChainId,
    address toToken,
    uint256 toChainId,
    Route calldata route
) external onlyOwner;
```

### Protocol Handlers
Keep it simple - one internal function per protocol:
- `_executeCCTP()` - For USDC transfers
- `_executeLayerZero()` - For OFT tokens
- `_executeStargate()` - For USDT and other Stargate pools

## Implementation Steps

### Phase 1: Fix Current Contracts (Quick Win)
1. Add `setCCTPDomain(chainId, domain)` function
2. Fix validation to allow domain 0
3. Add testnet configurations
4. Test on all testnets

### Phase 2: New Simplified Contract
1. Create `UnifiedRouter.sol` with single entry point
2. Implement dynamic route configuration
3. Add protocol handlers
4. Support cross-token swaps via DEX integration

### Phase 3: Advanced Features
1. Multi-hop routing (Token A → Token B → Token C)
2. Fee optimization (choose cheapest route)
3. Slippage protection for swaps
4. Emergency pause per route

## Testnet Configuration

### CCTP Domains
```
Ethereum Sepolia: 0
Base Sepolia: 6
Arbitrum Sepolia: 3
Optimism Sepolia: 2
Polygon Mumbai: 7
Avalanche Fuji: 1
```

### LayerZero Chain IDs
```
Ethereum Sepolia: 10161
Base Sepolia: 10245
Arbitrum Sepolia: 10231
Optimism Sepolia: 10232
Polygon Mumbai: 10109
Avalanche Fuji: 10106
```

## Benefits of Simplification

1. **Easier to Audit** - Single contract, clear flow
2. **Cheaper Deployment** - One contract instead of five
3. **Dynamic Routes** - Add new tokens/chains without redeploying
4. **Better Testing** - Works on testnets immediately
5. **Clearer UX** - Single function to transfer anything

## Success Criteria

- [ ] Can transfer USDC from Sepolia to Base Sepolia
- [ ] Can transfer USDC from Base to Arbitrum
- [ ] Can swap USDC to USDT cross-chain
- [ ] All transfers complete in < 15 minutes
- [ ] Gas costs reasonable (< $5 on L2s)
- [ ] No pre-registration required

## Next Actions

1. **Immediate**: Fix domain validation in RouteProcessor
2. **Today**: Add testnet domain configurations
3. **This Week**: Deploy and test on all testnets
4. **Next Week**: Design and implement UnifiedRouter
5. **Future**: Add advanced routing features

## Code Examples

### User Experience
```javascript
// Simple same-token transfer
router.transfer(
    USDC_SEPOLIA,           // from token
    USDC_BASE,              // to token (same token, different chain)
    1000000,                // 1 USDC (6 decimals)
    84532,                  // Base Sepolia chain ID
    recipientAddress        // recipient
);

// Cross-token transfer
router.transfer(
    USDC_ETHEREUM,          // from token
    USDT_ARBITRUM,          // to token (different token!)
    1000000,                // 1 USDC
    42161,                  // Arbitrum chain ID
    recipientAddress        // recipient
);
```

### Configuration Example
```javascript
// Owner configures USDC route from Sepolia to Base
router.configureRoute(
    USDC_SEPOLIA,           // from token
    11155111,               // Sepolia chain ID
    USDC_BASE,              // to token
    84532,                  // Base chain ID
    {
        protocol: Protocol.CCTP,
        protocolDomain: 6,   // Base CCTP domain
        bridgeContract: CCTP_TOKEN_MESSENGER,
        extraData: "0x"
    }
);
```

## Timeline

- **Day 1**: Fix validation, add domain setters
- **Day 2**: Test on all testnets
- **Week 1**: Design UnifiedRouter
- **Week 2**: Implement and deploy UnifiedRouter
- **Week 3**: Full testing and documentation
- **Week 4**: Mainnet deployment

## Notes

- Start simple, add complexity only when needed
- Prioritize CCTP (cheapest, most reliable)
- Keep gas costs low on L2s
- Make configuration owner-only but transfers permissionless
- No merchant registration - that's application layer concern
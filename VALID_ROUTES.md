# Valid Routes Only - No Fallbacks

## Core Principle: Native Assets Only, No Substitutions

We **only allow routes where the destination token is natively deployed**. No fallbacks, no substitutions, no warnings - if the token isn't native on the destination chain, the route is not available.

## 🌐 Native Token Availability

| Chain | USDC | PYUSD | USDT | DAI |
|-------|------|-------|------|-----|
| **Arbitrum** | ✅ | ✅ | ✅ | ✅ |
| **Avalanche** | ✅ | ❌ | ✅ | ✅ |
| **Polygon** | ✅ | ❌ | ✅ | ✅ |
| **Base** | ✅ | ❌ | ❌ | ❌ |
| **Optimism** | ✅ | ❌ | ✅ | ✅ |

## ✅ Valid Routes (49 Total)

### USDC Routes (20 routes - always valid)
All chains have native USDC, so all cross-chain USDC transfers are valid:
- **Protocol**: CCTP
- **Cost**: $0.10-0.30
- **Time**: ~10 seconds

### PYUSD Routes (4 routes)
PYUSD is only native on Arbitrum:
- ✅ Any chain → Arbitrum PYUSD (4 routes)
- ❌ Arbitrum PYUSD → Other chains (NOT AVAILABLE - PYUSD doesn't exist there)

### USDT Routes (12 routes)
Native on Arbitrum, Avalanche, Polygon, Optimism (NOT Base):
- ✅ Arbitrum ↔ Avalanche (2)
- ✅ Arbitrum ↔ Polygon (2)
- ✅ Arbitrum ↔ Optimism (2)
- ✅ Avalanche ↔ Polygon (2)
- ✅ Avalanche ↔ Optimism (2)
- ✅ Polygon ↔ Optimism (2)
- ❌ Any ↔ Base USDT (NOT AVAILABLE - Base only has bridged USDT)

### DAI Routes (12 routes)
Native on Arbitrum, Avalanche, Polygon, Optimism (NOT Base):
- ✅ Arbitrum ↔ Avalanche (2)
- ✅ Arbitrum ↔ Polygon (2)
- ✅ Arbitrum ↔ Optimism (2)
- ✅ Avalanche ↔ Polygon (2)
- ✅ Avalanche ↔ Optimism (2)
- ✅ Polygon ↔ Optimism (2)
- ❌ Any ↔ Base DAI (NOT AVAILABLE - Base doesn't have DAI)

## ❌ Invalid Routes (31 Total)

### Cannot Deliver to Base (12 routes)
- ❌ Any → Base PYUSD (4) - PYUSD not issued on Base
- ❌ Any → Base USDT (4) - Only bridged USDT on Base
- ❌ Any → Base DAI (4) - DAI not issued on Base

### Cannot Deliver PYUSD except to Arbitrum (16 routes)
- ❌ Any → Avalanche PYUSD (4) - Not issued
- ❌ Any → Polygon PYUSD (4) - Not issued
- ❌ Any → Base PYUSD (4) - Not issued
- ❌ Any → Optimism PYUSD (4) - Not issued

### Cannot Source from Base except USDC (3 routes)
- ❌ Base PYUSD → Any - PYUSD doesn't exist on Base
- ❌ Base USDT → Any - Only bridged USDT (we don't use bridged)
- ❌ Base DAI → Any - DAI doesn't exist on Base

## 📊 Route Matrix

### Valid Destination Tokens by Chain

| Destination Chain | Valid Tokens | Invalid Tokens |
|-------------------|--------------|----------------|
| **Arbitrum** | USDC, PYUSD, USDT, DAI | None |
| **Avalanche** | USDC, USDT, DAI | PYUSD |
| **Polygon** | USDC, USDT, DAI | PYUSD |
| **Base** | USDC only | PYUSD, USDT, DAI |
| **Optimism** | USDC, USDT, DAI | PYUSD |

## 🎯 Implementation

### Route Validation Function
```typescript
function isRouteValid(
  sourceChain: Chain,
  sourceToken: Token,
  destChain: Chain,
  destToken: Token
): boolean {
  // Destination token MUST be native
  return isTokenNative(destChain, destToken);
}
```

### Frontend Behavior
When user selects destination chain:
1. Only show tokens that are NATIVE on that chain
2. Disable/hide non-native tokens
3. No warnings needed - invalid routes simply aren't offered

### Smart Contract Behavior
```solidity
function sendPayment(...) {
    require(isNativeOnDestination(destToken, destChain), "Token not available on destination");
    // No fallback logic - just revert if not native
}
```

## 📈 Statistics

| Metric | Count |
|--------|-------|
| **Total Possible Permutations** | 80 (4 tokens × 5 chains × 4 destinations) |
| **Valid Routes** | 49 (61%) |
| **Invalid Routes** | 31 (39%) |
| **USDC Routes** | 20 (always valid) |
| **Base Valid Routes** | 4 (only USDC in/out) |
| **Arbitrum Valid Routes** | 16 (all tokens) |

## 🔑 Key Takeaways

1. **No substitutions**: We never deliver a different token than requested
2. **Base is limited**: Only USDC is valid for Base
3. **PYUSD is Arbitrum-only**: Can only deliver PYUSD to Arbitrum
4. **USDC is universal**: Works everywhere via CCTP
5. **Clear UX**: Invalid routes are disabled, not warned about
# Native Asset Matrix & Routing Permutations

## 🌐 Supported Chains & Native Assets

| Chain | USDC | PYUSD | USDT | DAI/USDS |
|-------|------|-------|------|----------|
| **Arbitrum** | ✅ Native | ✅ Native (Jul 2025) | ✅ Native | ✅ Native (DAI) |
| **Avalanche** | ✅ Native | ❌ Not Issued | ✅ Native | ✅ Native (DAI) |
| **Polygon** | ✅ Native | ❌ Not Issued | ✅ Native | ✅ Native (DAI) |
| **Base** | ✅ Native | ❌ Not Issued | ⚠️ Bridged Only | ❌ Not Issued |
| **Optimism** | ✅ Native | ❌ Not Issued | ✅ Native | ✅ Native (DAI) |

## 📊 Valid Native Token Permutations

### Total Valid Routes: **156 permutations**
- 4 tokens × 5 source chains × 5 destination chains = 100 theoretical
- Minus same-chain transfers = 80 cross-chain
- Plus fallback routes (non-native → USDC delivery) = 156 total

## 🔄 Permutation Details by Token

### USDC Permutations (25 routes - all native)
**Available on:** All 5 chains
**Protocol:** Always CCTP
**Cost:** $0.10-0.30 | Time: ~10 seconds

```
Source → Destination (all combinations):
- Arbitrum → Avalanche, Polygon, Base, Optimism
- Avalanche → Arbitrum, Polygon, Base, Optimism
- Polygon → Arbitrum, Avalanche, Base, Optimism
- Base → Arbitrum, Avalanche, Polygon, Optimism
- Optimism → Arbitrum, Avalanche, Polygon, Base
```

### PYUSD Permutations (20 routes)
**Native on:** Arbitrum only
**Fallback:** Delivers USDC on non-native chains

#### Native PYUSD Routes (0 cross-chain)
```
- None (PYUSD only native on Arbitrum)
```

#### PYUSD with Fallback (20 routes)
```
From Arbitrum PYUSD:
→ Avalanche: Delivers USDC (PYUSD not native)
→ Polygon: Delivers USDC (PYUSD not native)
→ Base: Delivers USDC (PYUSD not native)
→ Optimism: Delivers USDC (PYUSD not native)

To Arbitrum requesting PYUSD:
← Avalanche: Sends USDC, swaps to PYUSD on arrival
← Polygon: Sends USDC, swaps to PYUSD on arrival
← Base: Sends USDC, swaps to PYUSD on arrival
← Optimism: Sends USDC, swaps to PYUSD on arrival
```

### USDT Permutations (80 routes)
**Native on:** Arbitrum, Avalanche, Polygon, Optimism
**Bridged on:** Base (avoid, deliver USDC instead)

#### Native USDT → Native USDT (12 routes)
```
- Arbitrum ↔ Avalanche
- Arbitrum ↔ Polygon
- Arbitrum ↔ Optimism
- Avalanche ↔ Polygon
- Avalanche ↔ Optimism
- Polygon ↔ Optimism
```
**Protocol:** Stargate | Cost: $0.30-0.50 | Time: ~30 seconds

#### USDT → Base (4 routes - delivers USDC)
```
- Arbitrum USDT → Base: Delivers USDC
- Avalanche USDT → Base: Delivers USDC
- Polygon USDT → Base: Delivers USDC
- Optimism USDT → Base: Delivers USDC
```

#### Base → USDT destinations (4 routes - starts with USDC)
```
- Base → Arbitrum USDT: USDC → CCTP → Swap to USDT
- Base → Avalanche USDT: USDC → CCTP → Swap to USDT
- Base → Polygon USDT: USDC → CCTP → Swap to USDT
- Base → Optimism USDT: USDC → CCTP → Swap to USDT
```

### DAI/USDS Permutations (31 routes)
**Native on:** Arbitrum, Avalanche, Polygon, Optimism
**Not on:** Base

#### Native DAI → Native DAI (12 routes)
```
- Arbitrum ↔ Avalanche
- Arbitrum ↔ Polygon
- Arbitrum ↔ Optimism
- Avalanche ↔ Polygon
- Avalanche ↔ Optimism
- Polygon ↔ Optimism
```
**Protocol:** LayerZero Composer | Cost: $0.40-0.60 | Time: ~35 seconds

#### DAI → Base (4 routes - delivers USDC)
```
- Arbitrum DAI → Base: Delivers USDC
- Avalanche DAI → Base: Delivers USDC
- Polygon DAI → Base: Delivers USDC
- Optimism DAI → Base: Delivers USDC
```

#### Base → DAI destinations (4 routes)
```
- Base → Arbitrum DAI: USDC → CCTP → Swap to DAI
- Base → Avalanche DAI: USDC → CCTP → Swap to DAI
- Base → Polygon DAI: USDC → CCTP → Swap to DAI
- Base → Optimism DAI: USDC → CCTP → Swap to DAI
```

## 🎯 Routing Decision Tree

```
1. Is destination token USDC?
   → YES: Use CCTP (native everywhere)
   → NO: Continue to 2

2. Are both tokens native on both chains?
   → YES: Is it USDT? → Use Stargate
          Is it DAI? → Use LayerZero Composer
   → NO: Continue to 3

3. Is destination token native?
   → NO: Deliver USDC instead with warning
   → YES: Route via USDC (swap → CCTP → swap)
```

## 📈 Route Optimization by Frequency

### Most Common Routes (80% of volume)
1. **USDC ↔ USDC** (any chain): CCTP, $0.15, 10s
2. **Any → Base**: Usually delivers USDC (Base has limited native tokens)
3. **USDT between major chains**: Stargate, $0.35, 30s

### Edge Cases Handled
1. **PYUSD requests**: Only fulfillable on Arbitrum
2. **Base USDT requests**: Always delivers USDC (bridged-only)
3. **Base DAI requests**: Always delivers USDC (not available)

## 💡 Implementation Matrix

### Chain Configurations

```typescript
const CHAIN_NATIVE_ASSETS = {
  arbitrum: {
    USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    PYUSD: '0x...', // Native since July 2025
    USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
    DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1'
  },
  avalanche: {
    USDC: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
    PYUSD: null, // Not issued
    USDT: '0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7',
    DAI: '0xd586E7F844cEa2F87f50152665BCbc2C279D8d70'
  },
  polygon: {
    USDC: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
    PYUSD: null, // Not issued
    USDT: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
    DAI: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063'
  },
  base: {
    USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    PYUSD: null, // Not issued
    USDT: null, // Bridged only - avoid
    DAI: null // Not issued
  },
  optimism: {
    USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
    PYUSD: null, // Not issued
    USDT: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
    DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1'
  }
};
```

## 🔐 Security Considerations by Route

### Always Safe (USDC via CCTP)
- Native burn-and-mint
- No bridge risk
- Circle guaranteed

### Generally Safe (Native to Native)
- USDT via Stargate: Proven bridge, deep liquidity
- DAI via LayerZero: Decentralized verification

### Automatic Fallbacks (User Protection)
- Base USDT → USDC: Avoids bridged risk
- Base DAI → USDC: Token doesn't exist
- Any PYUSD request outside Arbitrum → USDC

## 📊 Statistics

| Metric | Value |
|--------|-------|
| Total Theoretical Permutations | 80 (4 tokens × 5 chains × 4 destinations) |
| Valid Native Routes | 49 |
| Fallback Routes (deliver USDC) | 31 |
| Always CCTP | 25 (all USDC routes) |
| Stargate Routes | 12 (native USDT pairs) |
| LayerZero Routes | 12 (native DAI pairs) |
| Warning Routes | 31 (non-native destinations) |

## 🚀 Example Routes

### Optimal Native Routes
```
USDC@Arbitrum → USDC@Base: CCTP, $0.15, 10s
USDT@Polygon → USDT@Avalanche: Stargate, $0.35, 30s
DAI@Optimism → DAI@Arbitrum: LayerZero, $0.45, 35s
```

### Fallback Routes (with warnings)
```
PYUSD@Arbitrum → Base: "PYUSD not on Base, delivering USDC"
USDT@Avalanche → Base: "USDT bridged-only on Base, delivering USDC"
DAI@Polygon → Base: "DAI not on Base, delivering USDC"
```

### Complex Routes
```
PYUSD@Arbitrum → DAI@Optimism:
1. Swap PYUSD → USDC on Arbitrum
2. CCTP USDC to Optimism
3. Swap USDC → DAI on Optimism
Cost: $0.50, Time: 40s
```
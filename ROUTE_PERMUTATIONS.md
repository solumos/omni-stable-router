# Complete Route Permutations

## Summary Statistics

- **5 Chains**: Arbitrum, Avalanche, Polygon, Base, Optimism
- **4 Tokens**: USDC, PYUSD, USDT, DAI/USDS
- **80 Cross-chain permutations**: (4 tokens × 5 source chains × 4 destination chains)
- **156 Total Routes**: Including fallback deliveries

## Route Categories

### 🟢 Category 1: USDC Routes (25 routes)
**Protocol**: CCTP | **Cost**: $0.10-0.30 | **Time**: ~10s

All USDC to USDC transfers between any two different chains:
- Arbitrum → Avalanche, Polygon, Base, Optimism
- Avalanche → Arbitrum, Polygon, Base, Optimism  
- Polygon → Arbitrum, Avalanche, Base, Optimism
- Base → Arbitrum, Avalanche, Polygon, Optimism
- Optimism → Arbitrum, Avalanche, Polygon, Base

### 🔵 Category 2: PYUSD Routes (20 routes)
**Native only on Arbitrum - all others deliver USDC**

#### From Arbitrum PYUSD (4 routes):
- Arbitrum PYUSD → Avalanche: Delivers USDC
- Arbitrum PYUSD → Polygon: Delivers USDC
- Arbitrum PYUSD → Base: Delivers USDC
- Arbitrum PYUSD → Optimism: Delivers USDC

#### To Arbitrum requesting PYUSD (4 routes):
- Avalanche → Arbitrum PYUSD: Routes via USDC
- Polygon → Arbitrum PYUSD: Routes via USDC
- Base → Arbitrum PYUSD: Routes via USDC
- Optimism → Arbitrum PYUSD: Routes via USDC

#### Non-Arbitrum PYUSD requests (12 fallback routes):
All deliver USDC with warning

### 🟡 Category 3: USDT Routes (60 routes)

#### Native USDT to Native USDT (12 routes):
**Protocol**: Stargate | **Cost**: $0.30-0.50 | **Time**: ~30s
- Arbitrum ↔ Avalanche (2)
- Arbitrum ↔ Polygon (2)
- Arbitrum ↔ Optimism (2)
- Avalanche ↔ Polygon (2)
- Avalanche ↔ Optimism (2)
- Polygon ↔ Optimism (2)

#### USDT involving Base (16 fallback routes):
All deliver USDC (Base has bridged-only USDT)
- To Base from 4 chains (4 routes)
- From Base to 4 chains (4 routes)
- Cross-chain requesting Base USDT (8 routes)

#### Mixed USDT routes (32 routes):
Routes via USDC when one chain doesn't have native USDT

### 🟠 Category 4: DAI Routes (51 routes)

#### Native DAI to Native DAI (12 routes):
**Protocol**: LayerZero | **Cost**: $0.40-0.60 | **Time**: ~35s
- Arbitrum ↔ Avalanche (2)
- Arbitrum ↔ Polygon (2)
- Arbitrum ↔ Optimism (2)
- Avalanche ↔ Polygon (2)
- Avalanche ↔ Optimism (2)
- Polygon ↔ Optimism (2)

#### DAI involving Base (16 fallback routes):
All deliver USDC (Base has no DAI)
- To Base from 4 chains (4 routes)
- From Base to 4 chains (4 routes)
- Cross-chain requesting Base DAI (8 routes)

#### Mixed DAI routes (23 routes):
Routes via USDC when source/dest doesn't have native DAI

## Detailed Permutation Matrix

### From Arbitrum

| To Chain | USDC | PYUSD | USDT | DAI |
|----------|------|-------|------|-----|
| Avalanche | CCTP ✅ | Delivers USDC ⚠️ | Stargate ✅ | LayerZero ✅ |
| Polygon | CCTP ✅ | Delivers USDC ⚠️ | Stargate ✅ | LayerZero ✅ |
| Base | CCTP ✅ | Delivers USDC ⚠️ | Delivers USDC ⚠️ | Delivers USDC ⚠️ |
| Optimism | CCTP ✅ | Delivers USDC ⚠️ | Stargate ✅ | LayerZero ✅ |

### From Avalanche

| To Chain | USDC | PYUSD | USDT | DAI |
|----------|------|-------|------|-----|
| Arbitrum | CCTP ✅ | CCTP→Swap ✅ | Stargate ✅ | LayerZero ✅ |
| Polygon | CCTP ✅ | Delivers USDC ⚠️ | Stargate ✅ | LayerZero ✅ |
| Base | CCTP ✅ | Delivers USDC ⚠️ | Delivers USDC ⚠️ | Delivers USDC ⚠️ |
| Optimism | CCTP ✅ | Delivers USDC ⚠️ | Stargate ✅ | LayerZero ✅ |

### From Polygon

| To Chain | USDC | PYUSD | USDT | DAI |
|----------|------|-------|------|-----|
| Arbitrum | CCTP ✅ | CCTP→Swap ✅ | Stargate ✅ | LayerZero ✅ |
| Avalanche | CCTP ✅ | Delivers USDC ⚠️ | Stargate ✅ | LayerZero ✅ |
| Base | CCTP ✅ | Delivers USDC ⚠️ | Delivers USDC ⚠️ | Delivers USDC ⚠️ |
| Optimism | CCTP ✅ | Delivers USDC ⚠️ | Stargate ✅ | LayerZero ✅ |

### From Base

| To Chain | USDC | PYUSD | USDT | DAI |
|----------|------|-------|------|-----|
| Arbitrum | CCTP ✅ | CCTP→Swap ✅ | CCTP→Swap ✅ | CCTP→Swap ✅ |
| Avalanche | CCTP ✅ | Delivers USDC ⚠️ | CCTP→Swap ✅ | CCTP→Swap ✅ |
| Polygon | CCTP ✅ | Delivers USDC ⚠️ | CCTP→Swap ✅ | CCTP→Swap ✅ |
| Optimism | CCTP ✅ | Delivers USDC ⚠️ | CCTP→Swap ✅ | CCTP→Swap ✅ |

### From Optimism

| To Chain | USDC | PYUSD | USDT | DAI |
|----------|------|-------|------|-----|
| Arbitrum | CCTP ✅ | CCTP→Swap ✅ | Stargate ✅ | LayerZero ✅ |
| Avalanche | CCTP ✅ | Delivers USDC ⚠️ | Stargate ✅ | LayerZero ✅ |
| Polygon | CCTP ✅ | Delivers USDC ⚠️ | Stargate ✅ | LayerZero ✅ |
| Base | CCTP ✅ | Delivers USDC ⚠️ | Delivers USDC ⚠️ | Delivers USDC ⚠️ |

## Protocol Distribution

| Protocol | Number of Routes | Percentage |
|----------|-----------------|------------|
| CCTP (direct) | 25 | 16% |
| CCTP (with swaps) | 89 | 57% |
| Stargate | 12 | 8% |
| LayerZero | 12 | 8% |
| Fallback to USDC | 18 | 11% |

## Warning Routes (Automatic Fallbacks)

### Base Limitations (31 routes)
- No PYUSD: 8 routes deliver USDC
- Bridged USDT: 8 routes deliver USDC  
- No DAI: 8 routes deliver USDC
- From Base non-USDC: 7 routes start with USDC

### PYUSD Limitations (16 routes)
- Only on Arbitrum: 16 routes deliver USDC or route via USDC

### Total Warning Routes: 47 (30% of all routes)

## Optimization Notes

1. **USDC is the universal rail**: 114 routes (73%) use CCTP at some point
2. **Base is the limiting factor**: 31 routes affected by Base's limited native tokens
3. **Direct native transfers**: Only 49 routes (31%) are direct native-to-native
4. **Fallback safety**: 47 routes (30%) automatically deliver USDC to avoid bridged assets

## Implementation Priority

### High Priority (80% of expected volume)
1. All USDC routes (25 routes)
2. USDT between major chains (12 native routes)
3. Base USDC routes (20 routes)

### Medium Priority (15% of volume)
1. DAI native routes (12 routes)
2. PYUSD from Arbitrum (4 routes)

### Low Priority (5% of volume)
1. Complex swap routes
2. Edge case fallbacks
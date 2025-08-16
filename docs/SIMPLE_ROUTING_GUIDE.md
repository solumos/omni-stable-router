# Simple Routing Guide

## How Routes Are Selected (Updated with CCTP v2 Priority)

### 🎯 Rule #1: USDC Always Uses CCTP
If your source token is **USDC**, we ALWAYS use Circle's CCTP because it's:
- **85% cheaper** than alternatives (~$0.60 vs ~$3.90)
- **2x faster** (15 seconds vs 35 seconds)
- **Native Circle integration** (no wrapped tokens)

### 📊 Protocol Selection (7 Protocols Total)

| Protocol # | Name | When Used | Cost | Speed |
|------------|------|-----------|------|-------|
| **1** | CCTP Standard | USDC → USDC (same token) | ~$0.50 | 15 sec |
| **2** | LayerZero OFT | PYUSD/USDe/crvUSD → same token | ~$2.00 | 25 sec |
| **3** | Stargate | USDT → USDT | ~$2.00 | 30 sec |
| **4** | LayerZero Composer | Non-USDC cross-token swaps | ~$3.90 | 35 sec |
| **5** | **CCTP + Hooks** ✨ | USDC → any other token | ~$0.60 | 15 sec |
| **6** | OFT + Swap | PYUSD/USDe/crvUSD → USDC | ~$2.50 | 30 sec |
| **7** | Stargate + Swap | USDT → USDC | ~$2.50 | 35 sec |

### 🔄 Simple Examples

#### Cheapest Routes (USDC Source)
- **USDC → USDC**: Protocol 1 (CCTP) = $0.50
- **USDC → USDe**: Protocol 5 (CCTP + Hooks) = $0.60 ✨
- **USDC → PYUSD**: Protocol 5 (CCTP + Hooks) = $0.60 ✨
- **USDC → USDT**: Protocol 5 (CCTP + Hooks) = $0.60 ✨

#### Other Common Routes
- **PYUSD → PYUSD**: Protocol 2 (LayerZero OFT) = $2.00
- **USDT → USDT**: Protocol 3 (Stargate) = $2.00
- **PYUSD → USDT**: Protocol 4 (LayerZero Composer) = $3.90
- **USDe → USDC**: Protocol 6 (OFT + Swap) = $2.50

### 🚫 Invalid Routes (Will Revert)
- ❌ Any token to a chain where it's not native
- ❌ PYUSD to Base (not deployed there)
- ❌ USDT to Base (not native there)
- ❌ crvUSD to Polygon/Avalanche (not deployed)

### 💡 Pro Tips

1. **Always use USDC as source when possible** - It's 85% cheaper
2. **Check native deployments** - Token must exist on destination chain
3. **Account for decimals** - USDC/PYUSD/USDT use 6, USDe/crvUSD use 18
4. **Set reasonable slippage** - 0.5% default, max 3%

### 📈 Cost Comparison

| Route | Old Method | New Method | Savings |
|-------|------------|------------|---------|
| USDC → USDe | LayerZero ($3.90) | CCTP v2 ($0.60) | **$3.30 saved** |
| USDC → PYUSD | LayerZero ($3.90) | CCTP v2 ($0.60) | **$3.30 saved** |
| PYUSD → USDC | LayerZero ($3.90) | OFT + Swap ($2.50) | **$1.40 saved** |

### 🔧 Technical Details

#### Protocol 5: CCTP with Hooks (NEW!)
When USDC is the source and needs to swap to another token:
1. Burns USDC on source chain
2. Circle attestation (13-15 seconds)
3. Mints USDC on destination
4. **Atomically swaps** to target token via hook
5. Delivers target token to recipient

All in one transaction, no intermediate steps needed!

### 🌐 Supported Chains & Tokens

#### Chains (6 total)
- Ethereum, Arbitrum, Optimism, Base, Polygon, Avalanche

#### Tokens (5 total)
- **USDC**: All 6 chains ✅
- **PYUSD**: Ethereum, Optimism
- **USDT**: All except Base
- **USDe**: Ethereum, Arbitrum, Optimism, Base
- **crvUSD**: Ethereum, Arbitrum, Optimism

### ⚡ Quick Decision Tree

```
Is source token USDC?
├─ YES → Use CCTP (Protocols 1 or 5)
│   └─ Same token? → Protocol 1
│   └─ Different token? → Protocol 5 ✨
└─ NO → Check destination token
    ├─ Is destination USDC?
    │   └─ YES → Use native protocol + swap (6 or 7)
    └─ NO → Use native protocol or Composer (2, 3, or 4)
```

### 📝 Remember
- **CCTP v2 with hooks** is the game-changer for USDC routes
- **85% cost reduction** when using USDC as source
- **Single transaction** execution for all routes
- **No fallback substitutions** - routes fail cleanly if invalid
# Simple Routing Guide

## How Routes Are Selected (Updated with CCTP v2 Priority)

### 🎯 Rule #1: USDC Always Uses CCTP
If your source token is **USDC**, we ALWAYS use Circle's CCTP because it's:
- **85% cheaper** than alternatives (~$0.60 vs ~$3.90)
- **2x faster** (15 seconds vs 35 seconds)
- **Native Circle integration** (no wrapped tokens)

### 📊 Protocol Selection (7 Protocols Total)

| Protocol Enum | Name | When Used | Cost | Speed |
|---------------|------|-----------|------|-------|
| **CCTP** | CCTP Standard | USDC → USDC (same token) | ~$0.50 | 15 sec |
| **LAYERZERO_OFT** | LayerZero OFT | PYUSD/USDe/crvUSD → same token | ~$2.00 | 25 sec |
| **STARGATE** | Stargate | USDT → USDT | ~$2.00 | 30 sec |
| **COMPOSER** | LayerZero Composer | Non-USDC cross-token swaps | ~$3.90 | 35 sec |
| **CCTP_HOOKS** | **CCTP + Hooks** ✨ | USDC → any other token | ~$0.60 | 15 sec |
| **OFT_SWAP** | OFT + Swap | PYUSD/USDe/crvUSD → USDC | ~$2.50 | 30 sec |
| **STARGATE_SWAP** | Stargate + Swap | USDT → USDC | ~$2.50 | 35 sec |

### 🔄 Simple Examples

#### Cheapest Routes (USDC Source)
- **USDC → USDC**: Protocol.CCTP = $0.50
- **USDC → USDe**: Protocol.CCTP_HOOKS = $0.60 ✨
- **USDC → PYUSD**: Protocol.CCTP_HOOKS = $0.60 ✨
- **USDC → USDT**: Protocol.CCTP_HOOKS = $0.60 ✨

#### Other Common Routes
- **PYUSD → PYUSD**: Protocol.LAYERZERO_OFT = $2.00
- **USDT → USDT**: Protocol.STARGATE = $2.00
- **PYUSD → USDT**: Protocol.COMPOSER = $3.90
- **USDe → USDC**: Protocol.OFT_SWAP = $2.50

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

#### Protocol.CCTP_HOOKS: CCTP with Hooks (NEW!)
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
├─ YES → Use CCTP protocols
│   └─ Same token? → Protocol.CCTP
│   └─ Different token? → Protocol.CCTP_HOOKS ✨
└─ NO → Check destination token
    ├─ Is destination USDC?
    │   └─ YES → Use native protocol + swap (OFT_SWAP or STARGATE_SWAP)
    └─ NO → Use native protocol or COMPOSER
```

### 📝 Remember
- **CCTP v2 with hooks** is the game-changer for USDC routes
- **85% cost reduction** when using USDC as source
- **Single transaction** execution for all routes
- **No fallback substitutions** - routes fail cleanly if invalid
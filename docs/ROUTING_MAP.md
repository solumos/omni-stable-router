# Stable Router - Routing Map

## Supported Chains
1. **Ethereum** (Chain ID: 1)
2. **Arbitrum** (Chain ID: 42161)
3. **Optimism** (Chain ID: 10)
4. **Base** (Chain ID: 8453)
5. **Polygon** (Chain ID: 137)
6. **Avalanche** (Chain ID: 43114)

## Supported Tokens

### USDC (USD Coin)
- **Protocol**: Circle CCTP v2 for same-token transfers
- **Available on**: All 6 chains
- **Decimals**: 6
- **Native Issuer**: Circle

### PYUSD (PayPal USD)
- **Protocol**: LayerZero OFT
- **Available on**: Ethereum, Optimism
- **Decimals**: 6
- **Native Issuer**: PayPal/Paxos
- **Note**: Uses LayerZero Composer for cross-token swaps

### USDT (Tether USD)
- **Protocol**: Stargate
- **Available on**: All 6 chains
- **Decimals**: 6
- **Native Issuer**: Tether

### USDe (Ethena USD)
- **Protocol**: LayerZero OFT
- **Available on**: Ethereum, Arbitrum, Optimism, Base
- **Decimals**: 18
- **Native Issuer**: Ethena Labs

### crvUSD (Curve USD)
- **Protocol**: LayerZero OFT
- **Available on**: Ethereum, Arbitrum, Optimism
- **Decimals**: 18
- **Native Issuer**: Curve Finance

## Valid Route Matrix

### From Ethereum
| To Chain | USDC | PYUSD | USDT | USDe | crvUSD |
|----------|------|-------|------|------|--------|
| Arbitrum | ✅ CCTP | ❌ | ✅ Stargate | ✅ OFT | ✅ OFT |
| Optimism | ✅ CCTP | ✅ OFT | ✅ Stargate | ✅ OFT | ✅ OFT |
| Base | ✅ CCTP | ❌ | ✅ Stargate | ✅ OFT | ❌ |
| Polygon | ✅ CCTP | ❌ | ✅ Stargate | ❌ | ❌ |
| Avalanche | ✅ CCTP | ❌ | ✅ Stargate | ❌ | ❌ |

### From Arbitrum
| To Chain | USDC | PYUSD | USDT | USDe | crvUSD |
|----------|------|-------|------|------|--------|
| Ethereum | ✅ CCTP | ❌ | ✅ Stargate | ✅ OFT | ✅ OFT |
| Optimism | ✅ CCTP | ❌ | ✅ Stargate | ✅ OFT | ✅ OFT |
| Base | ✅ CCTP | ❌ | ✅ Stargate | ✅ OFT | ❌ |
| Polygon | ✅ CCTP | ❌ | ✅ Stargate | ❌ | ❌ |
| Avalanche | ✅ CCTP | ❌ | ✅ Stargate | ❌ | ❌ |

### From Optimism
| To Chain | USDC | PYUSD | USDT | USDe | crvUSD |
|----------|------|-------|------|------|--------|
| Ethereum | ✅ CCTP | ✅ OFT | ✅ Stargate | ✅ OFT | ✅ OFT |
| Arbitrum | ✅ CCTP | ❌ | ✅ Stargate | ✅ OFT | ✅ OFT |
| Base | ✅ CCTP | ❌ | ✅ Stargate | ✅ OFT | ❌ |
| Polygon | ✅ CCTP | ❌ | ✅ Stargate | ❌ | ❌ |
| Avalanche | ✅ CCTP | ❌ | ✅ Stargate | ❌ | ❌ |

### From Base
| To Chain | USDC | PYUSD | USDT | USDe | crvUSD |
|----------|------|-------|------|------|--------|
| Ethereum | ✅ CCTP | ❌ | ✅ Stargate | ✅ OFT | ❌ |
| Arbitrum | ✅ CCTP | ❌ | ✅ Stargate | ✅ OFT | ❌ |
| Optimism | ✅ CCTP | ❌ | ✅ Stargate | ✅ OFT | ❌ |
| Polygon | ✅ CCTP | ❌ | ✅ Stargate | ❌ | ❌ |
| Avalanche | ✅ CCTP | ❌ | ✅ Stargate | ❌ | ❌ |

### From Polygon
| To Chain | USDC | PYUSD | USDT | USDe | crvUSD |
|----------|------|-------|------|------|--------|
| Ethereum | ✅ CCTP | ❌ | ✅ Stargate | ❌ | ❌ |
| Arbitrum | ✅ CCTP | ❌ | ✅ Stargate | ❌ | ❌ |
| Optimism | ✅ CCTP | ❌ | ✅ Stargate | ❌ | ❌ |
| Base | ✅ CCTP | ❌ | ✅ Stargate | ❌ | ❌ |
| Avalanche | ✅ CCTP | ❌ | ✅ Stargate | ❌ | ❌ |

### From Avalanche
| To Chain | USDC | PYUSD | USDT | USDe | crvUSD |
|----------|------|-------|------|------|--------|
| Ethereum | ✅ CCTP | ❌ | ✅ Stargate | ❌ | ❌ |
| Arbitrum | ✅ CCTP | ❌ | ✅ Stargate | ❌ | ❌ |
| Optimism | ✅ CCTP | ❌ | ✅ Stargate | ❌ | ❌ |
| Base | ✅ CCTP | ❌ | ✅ Stargate | ❌ | ❌ |
| Polygon | ✅ CCTP | ❌ | ✅ Stargate | ❌ | ❌ |

## Cross-Token Routes

### USDC Source Routes (Using CCTP v2 with Hooks - Protocol 5)
**All USDC → other token routes now use CCTP v2 with hooks for 85% cost savings!**

### Available Swaps on Ethereum
- PYUSD ↔ USDC
- PYUSD ↔ USDT
- PYUSD ↔ USDe
- PYUSD ↔ crvUSD
- USDe ↔ USDC
- USDe ↔ USDT
- crvUSD ↔ USDC
- crvUSD ↔ USDT

### Available Swaps on Arbitrum
- USDe ↔ USDC
- USDe ↔ USDT
- crvUSD ↔ USDC
- crvUSD ↔ USDT

### Available Swaps on Optimism
- PYUSD ↔ USDC
- PYUSD ↔ USDT
- USDe ↔ USDC
- USDe ↔ USDT
- crvUSD ↔ USDC
- crvUSD ↔ USDT

### Available Swaps on Base
- USDe ↔ USDC
- USDe ↔ USDT

## Route Examples

### Example 1: USDC (Ethereum) → USDC (Arbitrum)
- **Protocol**: Circle CCTP v2
- **Steps**: Direct burn and mint
- **Time**: ~15 seconds
- **Gas**: ~200,000

### Example 2: PYUSD (Ethereum) → PYUSD (Optimism)
- **Protocol**: LayerZero OFT
- **Steps**: Direct OFT transfer
- **Time**: ~25 seconds
- **Gas**: ~250,000

### Example 3: USDC (Base) → USDe (Arbitrum)
- **Protocol**: CCTP v2 with Hooks (Protocol 5) ✨
- **Steps**: 
  1. Burn USDC on Base via CCTP
  2. Mint USDC + atomic swap to USDe on Arbitrum
- **Time**: ~15 seconds
- **Gas**: ~250,000
- **Cost**: ~$0.60 (85% cheaper than LayerZero!)

### Example 4: USDT (Base) → USDT (Polygon)
- **Protocol**: Stargate
- **Steps**: Direct Stargate transfer
- **Time**: ~30 seconds
- **Gas**: ~300,000

## Invalid Routes (Will Revert)
- PYUSD to any chain except Ethereum/Optimism
- USDe to Polygon or Avalanche
- crvUSD to Base, Polygon, or Avalanche
- Any cross-token route where destination token is not native

## Protocol Priority (Updated with CCTP v2)

### Automatic Protocol Selection:
1. **Source is USDC?** → Always use CCTP (Protocols 1 or 5)
   - Same token: Protocol 1 (standard CCTP)
   - Different token: Protocol 5 (CCTP with hooks) ✨
2. **Destination is USDC?** → Bridge then swap (Protocols 6 or 7)
3. **Same non-USDC token?** → Use native protocol (2 or 3)
4. **Different non-USDC tokens?** → LayerZero Composer (Protocol 4)

## Fee Structure
- **Protocol Fee**: 0.1% of transfer amount
- **Bridge Fees**: Variable based on protocol
  - CCTP: Minimal (gas only)
  - LayerZero: ~0.06% + gas
  - Stargate: ~0.06% + gas
  - Composer: ~0.1% + gas + swap fees

## Slippage Settings
- **Default**: 0.5%
- **Minimum**: 0.1%
- **Maximum**: 3%
- **Auto-adjust**: Based on liquidity and volatility
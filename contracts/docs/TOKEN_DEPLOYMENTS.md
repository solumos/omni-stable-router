# Token Deployments & Availability

## Quick Reference Matrix

| Token | ETH | ARB | OP | BASE | POLY | AVAX | Protocol Support |
|-------|-----|-----|----|----|------|------|-----------------|
| USDC  | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | CCTP V2 |
| USDT  | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | Stargate |
| PYUSD | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | LayerZero OFT |
| USDe  | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | LayerZero OFT |
| crvUSD| ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | LayerZero OFT |

## Detailed Token Information

### USDC (USD Coin)
- **Protocol**: Circle CCTP V2 (with hooks for atomic swaps)
- **Decimals**: 6
- **Available on ALL chains**
- **Cost**: ~$0.60 per transfer (cheapest option)

#### Addresses:
- Ethereum: `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48`
- Arbitrum: `0xaf88d065e77c8cC2239327C5EDb3A432268e5831`
- Optimism: `0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85`
- Base: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- Polygon: `0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359`
- Avalanche: `0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E`

### USDT (Tether USD)
- **Protocol**: Stargate
- **Decimals**: 6
- **NOT available on Base**
- **Cost**: ~$2.50 per transfer

#### Addresses:
- Ethereum: `0xdAC17F958D2ee523a2206206994597C13D831ec7`
- Arbitrum: `0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9`
- Optimism: `0x94b008aA00579c1307B0EF2c499aD98a8ce58e58`
- Base: ❌ Not deployed
- Polygon: `0xc2132D05D31c914a87C6611C10748AEb04B58e8F`
- Avalanche: `0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7`

### PYUSD (PayPal USD)
- **Protocol**: LayerZero OFT
- **Decimals**: 6
- **Only on Ethereum & Optimism**
- **Cost**: ~$3.90 per transfer

#### Addresses:
- Ethereum: `0x6c3ea9036406852006290770BEdFcAbA0e23A0e8`
- Arbitrum: ❌ Not deployed
- Optimism: `0xCfA3Ef56d303AE4fAabA0592388F19d7C3399FB4`
- Base: ❌ Not deployed
- Polygon: ❌ Not deployed
- Avalanche: ❌ Not deployed

### USDe (Ethena USD)
- **Protocol**: LayerZero OFT
- **Decimals**: 18 (Note: different from others!)
- **Available on Ethereum, Arbitrum, Base**
- **Cost**: ~$3.90 per transfer

#### Addresses:
- Ethereum: `0x4c9EDD5852cd905f086C759E8383e09bff1E68B3`
- Arbitrum: `0x5d3a1Ff2b6BAb83b63cd9AD0787074081a52ef34`
- Optimism: ❌ Not deployed
- Base: `0x5d3a1Ff2b6BAb83b63cd9AD0787074081a52ef34`
- Polygon: ❌ Not deployed
- Avalanche: ❌ Not deployed

### crvUSD (Curve USD)
- **Protocol**: LayerZero OFT
- **Decimals**: 18
- **Available on Ethereum, Arbitrum, Optimism, Base**
- **Cost**: ~$3.90 per transfer

#### Addresses:
- Ethereum: `0xf939E0A03FB07F59A73314E73794Be0E57ac1b4E`
- Arbitrum: `0x498Bf2B1e120FeD3ad3D42EA2165E9b73f99C1e5`
- Optimism: `0x061b87122Ed14b9526A813209C8a59a633257bAb`
- Base: `0x417Ac0e078398C154EdFadD9Ef675d30Be60Af93`
- Polygon: ❌ Not deployed
- Avalanche: ❌ Not deployed

## Protocol Selection Logic

The router automatically selects the optimal protocol based on:

1. **USDC → Any Token**: Uses CCTP V2 with hooks (cheapest, atomic swap on destination)
2. **USDT → Any**: Uses Stargate (only option for USDT)
3. **OFT Token → Same Token**: Uses LayerZero OFT direct transfer
4. **OFT Token → Different Token**: Uses LayerZero Composer (atomic swap on destination)
5. **Any → USDC**: Prefers CCTP if source can swap to USDC first

## Important Notes

### Cross-Token Swaps
- **USDC as source**: Always uses CCTP with hooks (85% cheaper than alternatives)
- **USDC as destination**: Router evaluates if swapping to USDC first is cheaper
- **Non-USDC pairs**: Uses LayerZero Composer or Stargate with swap

### Decimal Handling
- Most stablecoins use 6 decimals (USDC, USDT, PYUSD)
- USDe and crvUSD use 18 decimals
- Router handles decimal conversion automatically

### Gas Considerations
- CCTP: ~150k gas + $0.60 fee
- LayerZero OFT: ~200k gas + $3.90 fee
- Stargate: ~250k gas + $2.50 fee
- With swaps: Add ~200k gas for destination execution

### Chain-Specific Limitations
- **Base**: No USDT support (no Stargate pool)
- **Polygon**: Only USDC and USDT available
- **Avalanche**: Only USDC and USDT available
- **Optimism**: No USDe support
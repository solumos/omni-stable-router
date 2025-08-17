# Mainnet Deployment Guide

## Deployer Address
**Address:** `0xFC825D166f219ea5Aa75d993609eae546E013cEE`

## Required Funding

To deploy on both networks, you'll need ETH in the deployer address:

### Base Mainnet
- **Network:** Base (Chain ID: 8453)
- **Required ETH:** ~0.01 ETH (estimated deployment cost)
- **RPC:** https://mainnet.base.org
- **Explorer:** https://basescan.org

### Arbitrum One  
- **Network:** Arbitrum One (Chain ID: 42161)
- **Required ETH:** ~0.005 ETH (estimated deployment cost)
- **RPC:** https://arb1.arbitrum.io/rpc
- **Explorer:** https://arbiscan.io

## Deployment Commands

Once funded, deploy with:

```bash
# Deploy to Base Mainnet
npx hardhat run scripts/deploy-unified-mainnet.js --network base

# Deploy to Arbitrum One
npx hardhat run scripts/deploy-unified-mainnet.js --network arbitrum
```

## What Gets Deployed

1. **SwapExecutor Contract**
   - Handles Uniswap V3 swaps
   - Constructor: Uniswap V3 Router address

2. **UnifiedRouter Contract** 
   - Main contract for cross-chain transfers
   - Constructor: SwapExecutor address

3. **Protocol Configuration**
   - CCTP: Circle's Cross-Chain Transfer Protocol
   - LayerZero: Omnichain messaging protocol

## Mainnet Contract Addresses

### Base Mainnet Configuration
- CCTP TokenMessenger: `0x1682Ae6375C4E4A97e4B583BC394c861A46D8962`
- CCTP MessageTransmitter: `0xAD09780d193884d503182aD4588450C416D6F9D4`
- Uniswap V3 Router: `0x2626664c2603336E57B271c5C0b26F421741e481`
- LayerZero Endpoint: `0x1a44076050125825900e736c501f859c50fE728c`
- USDC: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`

### Arbitrum One Configuration
- CCTP TokenMessenger: `0x19330d10D9Cc8751218eaf51E8885D058642E08A`
- CCTP MessageTransmitter: `0xC30362313FBBA5cf9163F0bb16a0e01f01A896ca`
- Uniswap V3 Router: `0xE592427A0AEce92De3Edee1F18E0157C05861564`
- LayerZero Endpoint: `0x1a44076050125825900e736c501f859c50fE728c`
- USDC: `0xaf88d065e77c8cC2239327C5EDb3A432268e5831`

## Post-Deployment Steps

1. **Configure Cross-Chain Routes**
   - Set up CCTP routes for USDC transfers
   - Configure LayerZero routes for supported tokens

2. **Update Frontend Configuration**
   - Add mainnet contract addresses
   - Enable mainnet networks in UI

3. **Testing**
   - Small test transfers
   - Verify cross-chain functionality
   - Monitor transaction success rates

## Security Considerations

- Start with small amounts for testing
- Verify all contract addresses match expected values
- Test with testnet first if possible
- Monitor initial transactions closely

## Current Status

- ❌ **Base Mainnet:** Not deployed (needs funding)
- ❌ **Arbitrum One:** Not deployed (needs funding)
- ✅ **Scripts:** Ready for deployment
- ✅ **Configuration:** Mainnet addresses configured
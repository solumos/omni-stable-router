# Configuration Files

This directory contains all configuration files for the StableRouter frontend. Using config files instead of environment variables makes it easier to manage settings across different deployments.

## Files

### `contracts.json`
Contains deployed contract addresses for each chain:
- `stableRouter`: Main router contract addresses
- `routeProcessor`: Route processor contract addresses  
- `cctpHookReceiver`: CCTP hook receiver addresses
- `swapExecutor`: Swap executor addresses
- `feeManager`: Fee manager addresses

**Update this file after deploying contracts to each chain.**

### `networks.json`
Network configuration including:
- Chain details (name, ID, native currency)
- RPC endpoints (default and fallback)
- Block explorers
- Protocol-specific IDs (LayerZero endpoint IDs, CCTP domains)

### `tokens.json`
Token configuration including:
- Token metadata (name, decimals, icon)
- Addresses on each chain
- Default protocol for routing
- Protocol fee estimates

### `protocols.json`
External protocol addresses and configurations:
- **CCTP**: Token messenger and message transmitter addresses
- **LayerZero**: Endpoint addresses for each chain
- **Stargate**: Router addresses and pool IDs
- **Swap Routers**: 1inch and Uniswap V3 addresses
- **OFT Adapters**: Token-specific OFT adapter addresses

## Updating Configuration

### After Contract Deployment
1. Update `contracts.json` with deployed addresses
2. Replace all `0x0000...` addresses with actual deployed contracts

### Adding a New Chain
1. Add chain config to `networks.json`
2. Update token addresses in `tokens.json` for tokens on that chain
3. Add contract addresses to `contracts.json`

### Adding a New Token
1. Add token details to `tokens.json`
2. Include addresses for all chains where it's deployed
3. Specify the routing protocol

### Customizing RPC Endpoints
You can override RPC endpoints using environment variables:
```env
NEXT_PUBLIC_RPC_ETH=https://your-custom-eth-rpc.com
NEXT_PUBLIC_RPC_ARB=https://your-custom-arb-rpc.com
```

## Benefits of Config Files

- **Single source of truth**: All configuration in one place
- **Easy updates**: No need to rebuild for config changes
- **Version control**: Track configuration changes in git
- **Environment agnostic**: Same config structure across dev/staging/prod
- **Type safety**: Import configs with TypeScript support
- **No env var sprawl**: Only need WalletConnect ID in `.env`
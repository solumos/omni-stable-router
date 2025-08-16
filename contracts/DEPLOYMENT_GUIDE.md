# StableRouter Deployment Guide

## Prerequisites

1. **Environment Setup**
   ```bash
   npm install
   cp .env.example .env
   ```

2. **Configure .env file**
   ```env
   PRIVATE_KEY=your_deployment_wallet_private_key
   
   # RPC URLs (optional - defaults provided)
   ETHEREUM_RPC=https://eth.llamarpc.com
   ARBITRUM_RPC=https://arb1.arbitrum.io/rpc
   OPTIMISM_RPC=https://mainnet.optimism.io
   BASE_RPC=https://mainnet.base.org
   POLYGON_RPC=https://polygon-rpc.com
   AVALANCHE_RPC=https://api.avax.network/ext/bc/C/rpc
   
   # Etherscan API Keys (for verification)
   ETHERSCAN_API_KEY=your_etherscan_api_key
   ARBISCAN_API_KEY=your_arbiscan_api_key
   OPTIMISTIC_ETHERSCAN_API_KEY=your_optimistic_etherscan_api_key
   BASESCAN_API_KEY=your_basescan_api_key
   POLYGONSCAN_API_KEY=your_polygonscan_api_key
   SNOWTRACE_API_KEY=your_snowtrace_api_key
   ```

## Deployment Order

Deploy in this sequence to ensure proper configuration:

### 1. Deploy to Ethereum Mainnet
```bash
npx hardhat run scripts/deploy.js --network ethereum
```

Expected output:
```
Deploying contracts with account: 0x...
Network: ethereum
Chain ID: 1

Deploying FeeManager...
FeeManager deployed to: 0x...

Deploying SwapExecutor...
SwapExecutor deployed to: 0x...

Deploying RouteProcessor (UUPS)...
RouteProcessor deployed to: 0x...

Deploying StableRouter (UUPS)...
StableRouter deployed to: 0x...

Configuring tokens...
USDC configured
USDT configured
PYUSD configured
USDe configured
crvUSD configured

=== Deployment Complete ===
```

### 2. Deploy to Layer 2s
```bash
# Arbitrum
npx hardhat run scripts/deploy.js --network arbitrum

# Optimism
npx hardhat run scripts/deploy.js --network optimism

# Base
npx hardhat run scripts/deploy.js --network base

# Polygon
npx hardhat run scripts/deploy.js --network polygon

# Avalanche
npx hardhat run scripts/deploy.js --network avalanche
```

## Post-Deployment Configuration

### 1. Verify Contracts

Run verification for each network:
```bash
npx hardhat run scripts/verify.js --network ethereum
npx hardhat run scripts/verify.js --network arbitrum
npx hardhat run scripts/verify.js --network optimism
npx hardhat run scripts/verify.js --network base
npx hardhat run scripts/verify.js --network polygon
npx hardhat run scripts/verify.js --network avalanche
```

### 2. Configure Cross-Chain Settings

After all chains are deployed, run the cross-chain configuration:

```javascript
// scripts/configure-cross-chain.js
const deployments = {
  ethereum: require('../deployments/ethereum.json'),
  arbitrum: require('../deployments/arbitrum.json'),
  optimism: require('../deployments/optimism.json'),
  base: require('../deployments/base.json'),
  polygon: require('../deployments/polygon.json'),
  avalanche: require('../deployments/avalanche.json')
};

// For each chain, configure destination routers
for (const [network, deployment] of Object.entries(deployments)) {
  const routeProcessor = await ethers.getContractAt(
    "RouteProcessor",
    deployment.contracts.RouteProcessor
  );
  
  // Set destination swap routers for other chains
  for (const [destNetwork, destDeployment] of Object.entries(deployments)) {
    if (network !== destNetwork) {
      await routeProcessor.setDestinationSwapRouter(
        destDeployment.chainId,
        "0x1111111254EEB25477B68fb85Ed929f73A960582" // 1inch router
      );
    }
  }
}
```

### 3. Set Protocol Fees

Configure protocol fees (default 0.1%):
```javascript
const feeManager = await ethers.getContractAt(
  "FeeManager",
  deployment.contracts.FeeManager
);

await feeManager.setProtocolFee(10); // 0.1% = 10 basis points
```

## Testing Deployment

### 1. Test Route Selection
```javascript
const stableRouter = await ethers.getContractAt(
  "StableRouter",
  deployment.contracts.StableRouter
);

// Test USDC -> USDT route (should use CCTP_HOOKS)
const protocol = await stableRouter.getOptimalProtocol(
  USDC_ADDRESS,
  USDT_ADDRESS,
  ethers.parseUnits("1000", 6),
  42161 // Arbitrum
);
console.log("Protocol selected:", protocol); // Should be 5 (CCTP_HOOKS)
```

### 2. Test Fee Estimation
```javascript
const [protocolFee, bridgeFee, totalFee] = await stableRouter.estimateFees(
  USDC_ADDRESS,
  USDT_ADDRESS,
  ethers.parseUnits("1000", 6),
  42161
);
console.log("Protocol fee:", protocolFee);
console.log("Bridge fee:", bridgeFee);
console.log("Total fee:", totalFee);
```

## Monitoring & Maintenance

### Health Checks
- Monitor CCTP attestation service status
- Check LayerZero oracle price feeds
- Verify Stargate liquidity pools

### Emergency Actions
```javascript
// Pause all operations
await stableRouter.pause();

// Unpause
await stableRouter.unpause();

// Rescue stuck tokens
await routeProcessor.rescueTokens(
  tokenAddress,
  amount,
  recipientAddress
);
```

## Gas Costs by Network

Estimated deployment costs:
- **Ethereum**: ~0.5 ETH
- **Arbitrum**: ~0.01 ETH
- **Optimism**: ~0.01 ETH
- **Base**: ~0.001 ETH
- **Polygon**: ~10 MATIC
- **Avalanche**: ~1 AVAX

## Troubleshooting

### Common Issues

1. **"Insufficient funds"**
   - Ensure deployment wallet has enough native tokens
   - Add 20% buffer for gas price fluctuations

2. **"Contract already deployed"**
   - Check deployments/ folder for existing deployment
   - Use --force flag to redeploy

3. **"Token not configured"**
   - Verify token addresses in config.js
   - Ensure OFT addresses are correct for LayerZero tokens

4. **"Invalid chain mapping"**
   - Check CCTP domain IDs match Circle's configuration
   - Verify LayerZero endpoint addresses are V2

## Support Channels

- GitHub Issues: https://github.com/your-org/stable-router/issues
- Discord: [Your Discord]
- Documentation: https://docs.your-domain.com

## Security Considerations

1. **Multi-sig Setup**: Transfer ownership to multi-sig after deployment
2. **Timelock**: Consider adding timelock for admin functions
3. **Monitoring**: Set up alerts for large transfers and unusual activity
4. **Audits**: Schedule security audit before mainnet deployment
# Testnet Setup Guide

## Prerequisites

1. **Node.js**: Version 18.x or 20.x (v23 is not supported by Hardhat)
2. **Git**: For cloning the repository
3. **Testnet ETH**: For gas fees

## Step 1: Environment Setup

### 1.1 Create .env file
```bash
cp .env.example .env
```

### 1.2 Configure your private key
Edit `.env` and add your testnet wallet private key:
```
PRIVATE_KEY=your_actual_private_key_here
```

⚠️ **IMPORTANT**: 
- Use a dedicated testnet wallet
- Never use your mainnet private key
- Never commit .env to git

### 1.3 (Optional) Add RPC URLs
If you have Alchemy or Infura accounts, add better RPC URLs:
```
SEPOLIA_RPC=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
```

## Step 2: Get Testnet ETH

### Sepolia ETH
- **Alchemy Faucet**: https://sepoliafaucet.com
- **Infura Faucet**: https://www.infura.io/faucet/sepolia
- **Chainlink Faucet**: https://faucets.chain.link/sepolia

### Arbitrum Sepolia ETH
1. Get Sepolia ETH first
2. Bridge to Arbitrum Sepolia: https://bridge.arbitrum.io

### Base Sepolia ETH
1. Get Sepolia ETH first
2. Bridge to Base Sepolia: https://bridge.base.org

## Step 3: Get Test USDC

### Option 1: Circle's Testnet Faucet
1. Visit: https://faucet.circle.com
2. Connect wallet
3. Select Sepolia network
4. Request test USDC

### Option 2: Deploy Mock USDC
```bash
npx hardhat run scripts/deploy-mock-tokens.js --network sepolia
```

## Step 4: Install Dependencies

```bash
# Install packages
npm install

# Compile contracts
npx hardhat compile
```

## Step 5: Deploy Contracts

### Deploy to Sepolia
```bash
npx hardhat run scripts/deploy-testnet.js --network sepolia
```

Expected output:
```
🚀 Starting Testnet Deployment...

📍 Deploying to sepolia (chainId: 11155111)
=====================================

👤 Deployer address: 0x...
💰 Deployer balance: X.XX ETH

📦 1. Deploying TimelockMultisig...
✅ TimelockMultisig deployed to: 0x...

[... more contracts ...]

🎉 DEPLOYMENT COMPLETE!
```

### Deploy to Other Testnets
```bash
# Arbitrum Sepolia
npx hardhat run scripts/deploy-testnet.js --network arbitrumSepolia

# Base Sepolia
npx hardhat run scripts/deploy-testnet.js --network baseSepolia

# Avalanche Fuji
npx hardhat run scripts/deploy-testnet.js --network avalancheFuji
```

## Step 6: Verify Contracts

```bash
npx hardhat run scripts/verify-testnet.js --network sepolia
```

## Step 7: Run Tests

### Basic Integration Tests
```bash
npx hardhat run scripts/test-testnet.js --network sepolia
```

### Monitor Events
```bash
NETWORK=sepolia node scripts/monitor-testnet.js
```

## Common Issues & Solutions

### Issue: "Network sepolia doesn't exist"
**Solution**: Make sure hardhat.config.js includes testnet configurations

### Issue: "Insufficient funds"
**Solution**: Get more testnet ETH from faucets

### Issue: "Nonce too high"
**Solution**: Reset MetaMask account (Settings → Advanced → Reset Account)

### Issue: "Contract verification failed"
**Solution**: 
1. Make sure you have an Etherscan API key in .env
2. Wait a few minutes after deployment before verifying
3. Try verification again

### Issue: Node.js version warning
**Solution**: Use Node.js v18 or v20 (not v23):
```bash
# Using nvm
nvm install 20
nvm use 20

# Using asdf
asdf install nodejs 20.11.0
asdf local nodejs 20.11.0
```

## Deployment Checklist

- [ ] Environment configured (.env file)
- [ ] Testnet ETH obtained
- [ ] Test USDC obtained
- [ ] Contracts compiled
- [ ] Deployed to Sepolia
- [ ] Contracts verified on Etherscan
- [ ] Basic tests passing
- [ ] Cross-chain setup (if deploying to multiple chains)

## Useful Commands

```bash
# Check deployment
npx hardhat run scripts/check-deployment.js --network sepolia

# Emergency pause (if owner)
npx hardhat run scripts/emergency-pause.js --network sepolia

# Monitor gas usage
REPORT_GAS=true npx hardhat test

# Clean and rebuild
npx hardhat clean
npx hardhat compile
```

## Next Steps

1. **Configure Tokens**: Set up test tokens and pools
2. **Test Routes**: Execute test transfers
3. **Monitor**: Watch for events and transactions
4. **Document Issues**: Keep track of any bugs or improvements

## Support

- **Discord**: Join #testnet-support channel
- **Documentation**: See TESTNET_DEPLOYMENT_PLAN.md
- **Issues**: Report at github.com/your-repo/issues

## Security Reminders

⚠️ **NEVER**:
- Use mainnet private keys on testnet
- Share your private keys
- Commit .env files to git
- Deploy unaudited code to mainnet

✅ **ALWAYS**:
- Use dedicated testnet wallets
- Verify contracts after deployment
- Test thoroughly before mainnet
- Keep private keys secure
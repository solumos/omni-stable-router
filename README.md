# Native Stablecoin Router - Single Transaction Cross-Chain Payments

A deterministic cross-chain payment system that routes **only native (issuer-deployed)** stablecoins using Circle's CCTP and LayerZero, avoiding bridged assets for maximum security and efficiency.

## 🎯 Key Innovation: One Transaction

Traditional cross-chain payments require multiple transactions, approvals, and waiting periods. Our hybrid router enables:

```javascript
// That's it! One function call handles everything
router.send(merchantAddress, amount, sourceToken);
```

This single transaction automatically:
1. Routes via the optimal protocol (CCTP for USDC, LayerZero for others)
2. Bridges tokens cross-chain
3. Swaps to merchant's preferred token if needed
4. Delivers to merchant's wallet

## 🏗️ Architecture

### Native-Only Routing Logic

```
Customer Payment → Router Decision:
├── USDC → USDC: Always CCTP (native burn/mint)
├── PYUSD → Only deliver to Ethereum/Arbitrum (else USDC)
├── USDT → Stargate if native, CCTP→USDC if bridged-only
└── Result: Merchant receives native tokens only
```

### Native Asset Availability
| Chain | USDC | PYUSD | USDT | DAI/USDS |
|-------|------|-------|------|----------|
| **Arbitrum** | ✅ Native | ✅ Native | ✅ Native | ✅ Native |
| **Avalanche** | ✅ Native | ❌ Not Issued | ✅ Native | ✅ Native |
| **Polygon** | ✅ Native | ❌ Not Issued | ✅ Native | ✅ Native |
| **Base** | ✅ Native | ❌ Not Issued | ⚠️ Bridged | ❌ Not Issued |
| **Optimism** | ✅ Native | ❌ Not Issued | ✅ Native | ✅ Native |

### Core Components

1. **NativeAssetRouter.sol** - Deterministic routing contract
   - Routes only through native (issuer-deployed) assets
   - Automatic fallback to USDC when token not native
   - Zero bridged asset exposure

2. **HybridStablecoinRouterV2.sol** - CCTP v2 with hooks
   - Generic message passing for composed operations
   - Tax withholding, loyalty points, auto-invest
   - Batch payment support

3. **Simple Interface** - One function to rule them all
   ```solidity
   function send(
       address merchant,
       uint256 amount, 
       address sourceToken
   ) external payable returns (bytes32 paymentId);
   ```

## 🚀 Quick Start

### Installation

```bash
npm install
cp .env.example .env  # Add your private key and RPC endpoints
```

### Deploy

```bash
# Deploy to Base
npm run deploy:base

# Deploy to Avalanche  
npm run deploy:avalanche

# Deploy to all supported chains
npm run deploy:all
```

### Make a Payment

```javascript
const router = new ethers.Contract(ROUTER_ADDRESS, ABI, signer);

// Get fee quote (returns 0 for CCTP routes)
const fee = await router.quote(merchant, amount, token);

// Approve token
await token.approve(ROUTER_ADDRESS, amount);

// Send payment - ONE transaction!
const tx = await router.send(
    merchant,
    amount,
    token,
    { value: fee }
);
```

## 💰 Cost Comparison

| Route | Traditional | Our Solution | Savings |
|-------|------------|--------------|---------|
| USDC → USDC (any chain) | $15-30 | ~$0.20 (CCTP) | 95% |
| PYUSD → PYUSD (Eth↔Arb) | $20-40 | ~$0.50 (CCTP+Swap) | 88% |
| USDT → USDT (native chains) | $15-25 | ~$0.35 (Stargate) | 85% |
| Any → Base USDT | Not recommended | Delivers USDC | Avoids bridged risk |

## 🔄 Native Asset Routes

### Supported Chains & Tokens
- **5 Chains**: Arbitrum, Avalanche, Polygon, Base, Optimism
- **4 Tokens**: USDC, PYUSD, USDT, DAI/USDS
- **49 Valid Routes**: Only where destination token is native

### USDC Routes (20 routes - always valid)
All cross-chain USDC transfers work - native everywhere via CCTP

### PYUSD Routes (4 routes - Arbitrum only)
- ✅ To Arbitrum only (PYUSD native there)
- ❌ Cannot deliver PYUSD to other chains (not available)

### USDT Routes (12 routes)
- ✅ Between Arbitrum, Avalanche, Polygon, Optimism
- ❌ Cannot deliver to/from Base (bridged-only)

### DAI Routes (12 routes)
- ✅ Between Arbitrum, Avalanche, Polygon, Optimism
- ❌ Cannot deliver to/from Base (not available)

## 🛠️ Configuration

### Merchant Setup

```javascript
// One-time merchant configuration
await router.configureMerchant(
    merchantAddress,      // Merchant identifier
    destinationChainId,   // Where to receive funds
    recipientWallet,      // Wallet address
    preferredToken        // USDC, PYUSD, etc.
);
```

### Add Token Support

```javascript
// Add new stablecoin
await router.addSupportedToken(tokenAddress);

// Configure swap route
await aggregator.configureRoute(
    tokenIn,
    tokenOut,
    dexType,      // UniswapV3, Curve, Direct
    routerAddress,
    routeData,
    slippageBps
);
```

## 📊 Example Flows

### USDC to USDC (Using CCTP)
```
1. Customer pays 100 USDC on Avalanche
2. Router detects USDC→USDC route
3. Uses CCTP burn-and-mint
4. Merchant receives 100 USDC on Base
Time: ~10 seconds | Cost: ~$0.20
```

### PYUSD to USDC (Using LayerZero Composer)
```
1. Customer pays 100 PYUSD on Avalanche
2. Router uses LayerZero Composer
3. Single message handles:
   - Bridge PYUSD to Base
   - Swap PYUSD→USDC on Base
   - Deliver to merchant
Time: ~30 seconds | Cost: ~$0.50
```

## 🔐 Security Features

- **Non-custodial**: Router never holds funds
- **Atomic operations**: All-or-nothing execution
- **Slippage protection**: Configurable per route
- **Rate limiting**: Anti-spam mechanisms
- **Emergency pause**: Circuit breaker functionality

## 📈 Gas Optimization

- Batch merchant configurations
- Efficient routing algorithms
- Minimal storage operations
- Optimized for L2 chains

## 🧪 Testing

```bash
# Run tests
npm test

# Run with gas reporting
REPORT_GAS=true npm test

# Fork mainnet for testing
npm run test:fork
```

## 🗺️ Roadmap

- [ ] Add more DEX integrations
- [ ] Implement liquidity pools for instant settlement
- [ ] Add support for more stablecoins
- [ ] Create SDK for easier integration
- [ ] Build merchant dashboard
- [ ] Add recurring payment support

## 📝 License

MIT

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines and submit PRs.

## 📚 Resources

- [LayerZero Docs](https://docs.layerzero.network/)
- [Circle CCTP Docs](https://developers.circle.com/cctp)
- [Example Integration](./examples/payment-example.js)
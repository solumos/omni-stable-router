# Deployed Contracts

## Networks

### Sepolia (Chain ID: 11155111)
- **StableRouter**: [0x44A0DBcAe62a90De8E967c87aF1D670c8E0b42d0](https://sepolia.etherscan.io/address/0x44A0DBcAe62a90De8E967c87aF1D670c8E0b42d0)
- **RouteProcessor**: [0xD039Cb6B9BbAb2DE0Ae0D92F1DdCb8e6A4Dc88de](https://sepolia.etherscan.io/address/0xD039Cb6B9BbAb2DE0Ae0D92F1DdCb8e6A4Dc88de)
- **SwapExecutor**: [0xD1e60637cA70C786B857452E50DE8353a01DabBb](https://sepolia.etherscan.io/address/0xD1e60637cA70C786B857452E50DE8353a01DabBb)
- **FeeManager**: [0xD84F50DcdeC8e3E84c970d708ccbE5a3c5D68a79](https://sepolia.etherscan.io/address/0xD84F50DcdeC8e3E84c970d708ccbE5a3c5D68a79)
- **CCTPHookReceiver**: [0xE99A9fF893B3aE1A86bCA965ddCe5e982773ff14](https://sepolia.etherscan.io/address/0xE99A9fF893B3aE1A86bCA965ddCe5e982773ff14)

### Base Sepolia (Chain ID: 84532)
- **StableRouter**: [0x238B153EEe7bc369F60C31Cb04d0a0e3466a82BD](https://sepolia.basescan.org/address/0x238B153EEe7bc369F60C31Cb04d0a0e3466a82BD)
- **RouteProcessor**: [0xD1e60637cA70C786B857452E50DE8353a01DabBb](https://sepolia.basescan.org/address/0xD1e60637cA70C786B857452E50DE8353a01DabBb)
- **SwapExecutor**: [0xdcf63233493ce3A981B1155Fbe1fD6795f3A83d8](https://sepolia.basescan.org/address/0xdcf63233493ce3A981B1155Fbe1fD6795f3A83d8)
- **FeeManager**: [0xA0FD978f89D941783A43aFBe092B614ef31571F3](https://sepolia.basescan.org/address/0xA0FD978f89D941783A43aFBe092B614ef31571F3)
- **CCTPHookReceiver**: [0xE2ea3f454e12362212b1734eD0218E7691bd985c](https://sepolia.basescan.org/address/0xE2ea3f454e12362212b1734eD0218E7691bd985c)

### Arbitrum Sepolia (Chain ID: 421614)
- **RouteProcessor**: [0xA450EB7baB661aC2C42F51B8f1e9A5BFc1fA6dE3](https://sepolia.arbiscan.io/address/0xA450EB7baB661aC2C42F51B8f1e9A5BFc1fA6dE3)
- **SwapExecutor**: [0xdcf63233493ce3A981B1155Fbe1fD6795f3A83d8](https://sepolia.arbiscan.io/address/0xdcf63233493ce3A981B1155Fbe1fD6795f3A83d8)
- **CCTPHookReceiver**: [0xA0FD978f89D941783A43aFBe092B614ef31571F3](https://sepolia.arbiscan.io/address/0xA0FD978f89D941783A43aFBe092B614ef31571F3)

## Files

- `deployments.json` - Master deployment file with all networks and ABIs
- `sepolia.json` - Sepolia-specific deployment
- `baseSepolia.json` - Base Sepolia-specific deployment
- `arbitrumSepolia.json` - Arbitrum Sepolia-specific deployment
- `frontend-config.json` - Frontend-ready configuration
- `deployments.ts` - TypeScript interfaces
- `*.abi.json` - Individual ABI files for each contract

## Usage

### JavaScript/TypeScript
```javascript
const deployments = require('./deployments.json');
const sepoliaContracts = deployments.networks.sepolia.contracts;
const stableRouterABI = deployments.abis.StableRouter;
```

### Frontend (React/Next.js)
```javascript
import config from './frontend-config.json';

const network = config.networks[chainId];
const stableRouterAddress = network.contracts.StableRouter;
const abi = config.abis.StableRouter;
```

Generated: 2025-08-17T02:26:45.040Z

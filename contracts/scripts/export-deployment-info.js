const fs = require("fs");
const path = require("path");
const { ethers } = require("hardhat");

// All deployed contracts across networks
const DEPLOYMENTS = {
  sepolia: {
    chainId: 11155111,
    rpc: "https://ethereum-sepolia-rpc.publicnode.com",
    explorer: "https://sepolia.etherscan.io",
    contracts: {
      StableRouter: "0x44A0DBcAe62a90De8E967c87aF1D670c8E0b42d0",
      RouteProcessor: "0xD039Cb6B9BbAb2DE0Ae0D92F1DdCb8e6A4Dc88de",
      SwapExecutor: "0xD1e60637cA70C786B857452E50DE8353a01DabBb",
      FeeManager: "0xD84F50DcdeC8e3E84c970d708ccbE5a3c5D68a79",
      CCTPHookReceiver: "0xE99A9fF893B3aE1A86bCA965ddCe5e982773ff14"
    },
    externalContracts: {
      USDC: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
      CCTPTokenMessenger: "0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5",
      CCTPMessageTransmitter: "0x7865fAfC2db2093669d92c0F33AeEF291086BEFD",
      LayerZeroEndpoint: "0xae92d5aD7583AD66E49A0c67BAd18F6ba52dDDc1",
      StargateRouter: "0x1d4C2a246311bB9f827F4C768e277FF5787B7D7E",
      UniswapV3Router: "0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E"
    }
  },
  baseSepolia: {
    chainId: 84532,
    rpc: "https://sepolia.base.org",
    explorer: "https://sepolia.basescan.org",
    contracts: {
      StableRouter: "0x238B153EEe7bc369F60C31Cb04d0a0e3466a82BD",
      RouteProcessor: "0xD1e60637cA70C786B857452E50DE8353a01DabBb",
      SwapExecutor: "0xdcf63233493ce3A981B1155Fbe1fD6795f3A83d8",
      FeeManager: "0xA0FD978f89D941783A43aFBe092B614ef31571F3",
      CCTPHookReceiver: "0xE2ea3f454e12362212b1734eD0218E7691bd985c"
    },
    externalContracts: {
      USDC: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
      CCTPTokenMessenger: "0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5",
      CCTPMessageTransmitter: "0x7865fAfC2db2093669d92c0F33AeEF291086BEFD",
      LayerZeroEndpoint: "0x6EDCE65403992e310A62460808c4b910D972f10f",
      UniswapV3Router: "0x94cC0AaC535CCDB3C01d6787D6413C739ae12bc4"
    }
  }
};

async function main() {
  console.log("📦 Exporting Deployment Info and ABIs...\n");
  
  // Create output directory
  const outputDir = path.join(__dirname, "../deployments/exported");
  fs.mkdirSync(outputDir, { recursive: true });
  
  // Get ABIs from artifacts
  const contractNames = [
    "StableRouter",
    "RouteProcessor", 
    "SwapExecutor",
    "FeeManager",
    "CCTPHookReceiver"
  ];
  
  const abis = {};
  
  for (const name of contractNames) {
    const artifactPath = path.join(__dirname, `../artifacts/contracts/${name}.sol/${name}.json`);
    
    // Handle contracts in subdirectories
    let artifact;
    if (fs.existsSync(artifactPath)) {
      artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    } else {
      // Try other locations
      const altPaths = [
        path.join(__dirname, `../artifacts/contracts/cctp/${name}.sol/${name}.json`),
        path.join(__dirname, `../artifacts/contracts/governance/${name}.sol/${name}.json`),
      ];
      
      for (const altPath of altPaths) {
        if (fs.existsSync(altPath)) {
          artifact = JSON.parse(fs.readFileSync(altPath, 'utf8'));
          break;
        }
      }
    }
    
    if (artifact) {
      abis[name] = artifact.abi;
      
      // Save individual ABI files
      const abiPath = path.join(outputDir, `${name}.abi.json`);
      fs.writeFileSync(abiPath, JSON.stringify(artifact.abi, null, 2));
      console.log(`✅ Exported ${name} ABI`);
    } else {
      console.log(`⚠️  Could not find artifact for ${name}`);
    }
  }
  
  // Create master deployment file
  const masterDeployment = {
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    networks: DEPLOYMENTS,
    abis: abis
  };
  
  // Save master deployment file
  const masterPath = path.join(outputDir, "deployments.json");
  fs.writeFileSync(masterPath, JSON.stringify(masterDeployment, null, 2));
  console.log("\n✅ Exported master deployment file");
  
  // Create network-specific files
  for (const [network, data] of Object.entries(DEPLOYMENTS)) {
    const networkFile = {
      network,
      chainId: data.chainId,
      contracts: data.contracts,
      externalContracts: data.externalContracts,
      abis: abis,
      rpc: data.rpc,
      explorer: data.explorer
    };
    
    const networkPath = path.join(outputDir, `${network}.json`);
    fs.writeFileSync(networkPath, JSON.stringify(networkFile, null, 2));
    console.log(`✅ Exported ${network} deployment file`);
  }
  
  // Create TypeScript interfaces
  const tsContent = `// Auto-generated TypeScript interfaces for deployed contracts
// Generated: ${new Date().toISOString()}

export interface DeployedContracts {
  StableRouter: string;
  RouteProcessor: string;
  SwapExecutor: string;
  FeeManager: string;
  CCTPHookReceiver: string;
}

export interface NetworkDeployment {
  chainId: number;
  rpc: string;
  explorer: string;
  contracts: DeployedContracts;
  externalContracts: {
    USDC: string;
    CCTPTokenMessenger: string;
    CCTPMessageTransmitter: string;
    LayerZeroEndpoint: string;
    UniswapV3Router: string;
    StargateRouter?: string;
  };
}

export const DEPLOYMENTS: {
  sepolia: NetworkDeployment;
  baseSepolia: NetworkDeployment;
} = ${JSON.stringify(DEPLOYMENTS, null, 2)};
`;
  
  const tsPath = path.join(outputDir, "deployments.ts");
  fs.writeFileSync(tsPath, tsContent);
  console.log("✅ Exported TypeScript interfaces");
  
  // Create frontend-ready file
  const frontendFile = {
    networks: {
      11155111: {
        name: "Sepolia",
        ...DEPLOYMENTS.sepolia
      },
      84532: {
        name: "Base Sepolia",
        ...DEPLOYMENTS.baseSepolia
      }
    },
    // Only include essential ABIs for frontend
    abis: {
      StableRouter: abis.StableRouter,
      RouteProcessor: abis.RouteProcessor
    }
  };
  
  const frontendPath = path.join(outputDir, "frontend-config.json");
  fs.writeFileSync(frontendPath, JSON.stringify(frontendFile, null, 2));
  console.log("✅ Exported frontend config");
  
  // Create README
  const readmeContent = `# Deployed Contracts

## Networks

### Sepolia (Chain ID: 11155111)
- **StableRouter**: [${DEPLOYMENTS.sepolia.contracts.StableRouter}](${DEPLOYMENTS.sepolia.explorer}/address/${DEPLOYMENTS.sepolia.contracts.StableRouter})
- **RouteProcessor**: [${DEPLOYMENTS.sepolia.contracts.RouteProcessor}](${DEPLOYMENTS.sepolia.explorer}/address/${DEPLOYMENTS.sepolia.contracts.RouteProcessor})
- **SwapExecutor**: [${DEPLOYMENTS.sepolia.contracts.SwapExecutor}](${DEPLOYMENTS.sepolia.explorer}/address/${DEPLOYMENTS.sepolia.contracts.SwapExecutor})
- **FeeManager**: [${DEPLOYMENTS.sepolia.contracts.FeeManager}](${DEPLOYMENTS.sepolia.explorer}/address/${DEPLOYMENTS.sepolia.contracts.FeeManager})
- **CCTPHookReceiver**: [${DEPLOYMENTS.sepolia.contracts.CCTPHookReceiver}](${DEPLOYMENTS.sepolia.explorer}/address/${DEPLOYMENTS.sepolia.contracts.CCTPHookReceiver})

### Base Sepolia (Chain ID: 84532)
- **StableRouter**: [${DEPLOYMENTS.baseSepolia.contracts.StableRouter}](${DEPLOYMENTS.baseSepolia.explorer}/address/${DEPLOYMENTS.baseSepolia.contracts.StableRouter})
- **RouteProcessor**: [${DEPLOYMENTS.baseSepolia.contracts.RouteProcessor}](${DEPLOYMENTS.baseSepolia.explorer}/address/${DEPLOYMENTS.baseSepolia.contracts.RouteProcessor})
- **SwapExecutor**: [${DEPLOYMENTS.baseSepolia.contracts.SwapExecutor}](${DEPLOYMENTS.baseSepolia.explorer}/address/${DEPLOYMENTS.baseSepolia.contracts.SwapExecutor})
- **FeeManager**: [${DEPLOYMENTS.baseSepolia.contracts.FeeManager}](${DEPLOYMENTS.baseSepolia.explorer}/address/${DEPLOYMENTS.baseSepolia.contracts.FeeManager})
- **CCTPHookReceiver**: [${DEPLOYMENTS.baseSepolia.contracts.CCTPHookReceiver}](${DEPLOYMENTS.baseSepolia.explorer}/address/${DEPLOYMENTS.baseSepolia.contracts.CCTPHookReceiver})

## Files

- \`deployments.json\` - Master deployment file with all networks and ABIs
- \`sepolia.json\` - Sepolia-specific deployment
- \`baseSepolia.json\` - Base Sepolia-specific deployment
- \`frontend-config.json\` - Frontend-ready configuration
- \`deployments.ts\` - TypeScript interfaces
- \`*.abi.json\` - Individual ABI files for each contract

## Usage

### JavaScript/TypeScript
\`\`\`javascript
const deployments = require('./deployments.json');
const sepoliaContracts = deployments.networks.sepolia.contracts;
const stableRouterABI = deployments.abis.StableRouter;
\`\`\`

### Frontend (React/Next.js)
\`\`\`javascript
import config from './frontend-config.json';

const network = config.networks[chainId];
const stableRouterAddress = network.contracts.StableRouter;
const abi = config.abis.StableRouter;
\`\`\`

Generated: ${new Date().toISOString()}
`;
  
  const readmePath = path.join(outputDir, "README.md");
  fs.writeFileSync(readmePath, readmeContent);
  console.log("✅ Exported README");
  
  console.log("\n=====================================");
  console.log("📁 All files exported to:", outputDir);
  console.log("=====================================");
  console.log("\nExported files:");
  console.log("├── deployments.json (master file)");
  console.log("├── sepolia.json");
  console.log("├── baseSepolia.json");
  console.log("├── frontend-config.json");
  console.log("├── deployments.ts");
  console.log("├── README.md");
  console.log("└── *.abi.json (individual ABIs)");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
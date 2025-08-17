const { ethers } = require("hardhat");
const fs = require("fs");

// Protocol names for display
const ProtocolNames = {
  0: "NONE",
  1: "CCTP",
  2: "LAYERZERO", 
  3: "STARGATE"
};

// Network configurations
const NETWORKS = {
  sepolia: {
    chainId: 11155111,
    tokens: {
      USDC: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
      PYUSD: "0xcac524bca292aaade2df8a05cc58f0a65b1b3bb9",
      USDe: "0x5d3a1Ff2b6BAb83b63cd9AD0787074081a52ef34"
    }
  },
  baseSepolia: {
    chainId: 84532,
    tokens: {
      USDC: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
      USDe: "0x5d3a1Ff2b6BAb83b63cd9AD0787074081a52ef34"
    }
  },
  arbitrumSepolia: {
    chainId: 421614,
    tokens: {
      USDC: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",
      PYUSD: "0xcac524bca292aaade2df8a05cc58f0a65b1b3bb9",
      USDe: "0x5d3a1Ff2b6BAb83b63cd9AD0787074081a52ef34"
    }
  },
  optimismSepolia: {
    chainId: 11155420,
    tokens: {
      USDC: "0x5fd84259d66Cd46123540766Be93DFE6D43130D7",
      USDe: "0x5d3a1Ff2b6BAb83b63cd9AD0787074081a52ef34"
    }
  }
};

async function loadDeployment(network) {
  const deploymentPath = `./deployments/${network}-unified-router.json`;
  if (!fs.existsSync(deploymentPath)) {
    throw new Error(`No deployment found for ${network}. Run deploy-unified-router.js first.`);
  }
  return JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
}

async function verifyRoutes() {
  const network = hre.network.name;
  
  console.log("============================================");
  console.log(`Verifying Routes on ${network}`);
  console.log("============================================\n");
  
  // Load deployment
  const deployment = await loadDeployment(network);
  const router = await ethers.getContractAt("UnifiedRouter", deployment.router);
  console.log("Router:", deployment.router);
  
  const sourceConfig = NETWORKS[network];
  if (!sourceConfig) {
    console.log("❌ Network not configured:", network);
    return;
  }
  
  console.log("\n📋 Checking configured routes:\n");
  
  let totalRoutes = 0;
  let configuredRoutes = 0;
  
  // Check routes to all other networks
  for (const [destNetwork, destConfig] of Object.entries(NETWORKS)) {
    if (destNetwork === network) continue; // Skip same network
    
    console.log(`\n🔗 ${network} → ${destNetwork}`);
    console.log("─────────────────────────────");
    
    // Check each token pair
    for (const [sourceTokenName, sourceTokenAddr] of Object.entries(sourceConfig.tokens)) {
      for (const [destTokenName, destTokenAddr] of Object.entries(destConfig.tokens)) {
        totalRoutes++;
        
        // Check if route is configured
        const isConfigured = await router.isRouteConfigured(
          sourceTokenAddr,
          sourceConfig.chainId,
          destTokenAddr,
          destConfig.chainId
        );
        
        if (isConfigured) {
          // Get route details
          const routeKey = await router.getRouteKey(
            sourceTokenAddr,
            sourceConfig.chainId,
            destTokenAddr,
            destConfig.chainId
          );
          
          const route = await router.routes(routeKey);
          
          console.log(`✅ ${sourceTokenName} → ${destTokenName}: ${ProtocolNames[route.protocol]}`);
          console.log(`   Protocol Domain: ${route.protocolDomain}`);
          console.log(`   Bridge Contract: ${route.bridgeContract}`);
          if (route.poolId > 0) {
            console.log(`   Pool ID: ${route.poolId}`);
          }
          configuredRoutes++;
        } else {
          console.log(`❌ ${sourceTokenName} → ${destTokenName}: Not configured`);
        }
      }
    }
  }
  
  console.log("\n========================================");
  console.log("Summary:");
  console.log(`Total possible routes: ${totalRoutes}`);
  console.log(`Configured routes: ${configuredRoutes}`);
  console.log(`Missing routes: ${totalRoutes - configuredRoutes}`);
  console.log("========================================");
  
  // Check protocol contracts
  console.log("\n📋 Protocol Contracts:");
  console.log("─────────────────────");
  
  for (let i = 1; i <= 3; i++) {
    const contractAddr = await router.protocolContracts(i);
    if (contractAddr !== "0x0000000000000000000000000000000000000000") {
      console.log(`✅ ${ProtocolNames[i]}: ${contractAddr}`);
    } else {
      console.log(`❌ ${ProtocolNames[i]}: Not set`);
    }
  }
  
  // Check owner
  const owner = await router.owner();
  console.log(`\n👤 Contract Owner: ${owner}`);
  
  // Check pause status
  const isPaused = await router.paused();
  console.log(`⏸️  Paused: ${isPaused ? "Yes ⚠️" : "No ✅"}`);
}

async function main() {
  await verifyRoutes();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
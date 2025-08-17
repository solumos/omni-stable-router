const { ethers } = require("hardhat");

// Testnet Protocol Addresses
const PROTOCOL_ADDRESSES = {
  sepolia: {
    CCTP_TOKEN_MESSENGER: "0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5",
    LAYERZERO_ENDPOINT: "0x6EDCE65403992e310A62460808c4b910D972f10f",
    STARGATE_ROUTER: "0x0000000000000000000000000000000000000000", // Not on Sepolia
  },
  baseSepolia: {
    CCTP_TOKEN_MESSENGER: "0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5", 
    LAYERZERO_ENDPOINT: "0x6EDCE65403992e310A62460808c4b910D972f10f",
    STARGATE_ROUTER: "0x0000000000000000000000000000000000000000", // Not on Base Sepolia
  },
  arbitrumSepolia: {
    CCTP_TOKEN_MESSENGER: "0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5",
    LAYERZERO_ENDPOINT: "0x6EDCE65403992e310A62460808c4b910D972f10f",
    STARGATE_ROUTER: "0x0000000000000000000000000000000000000000", // Not on Arbitrum Sepolia
  },
  optimismSepolia: {
    CCTP_TOKEN_MESSENGER: "0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5",
    LAYERZERO_ENDPOINT: "0x6EDCE65403992e310A62460808c4b910D972f10f", 
    STARGATE_ROUTER: "0x0000000000000000000000000000000000000000", // Not on Optimism Sepolia
  }
};

// Testnet Token Addresses
const TOKEN_ADDRESSES = {
  sepolia: {
    USDC: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
    PYUSD: "0xcac524bca292aaade2df8a05cc58f0a65b1b3bb9", // PayPal USD on Sepolia
    USDe: "0x5d3a1Ff2b6BAb83b63cd9AD0787074081a52ef34", // Ethena USD (if deployed on testnet)
    USDT: "0x0000000000000000000000000000000000000000", // Deploy test token if needed
  },
  baseSepolia: {
    USDC: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    PYUSD: "0x0000000000000000000000000000000000000000", // Not on Base Sepolia yet
    USDe: "0x5d3a1Ff2b6BAb83b63cd9AD0787074081a52ef34", // Ethena USD (if deployed on testnet)
    USDT: "0x0000000000000000000000000000000000000000", // Deploy test token if needed
  },
  arbitrumSepolia: {
    USDC: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",
    PYUSD: "0x0000000000000000000000000000000000000000", // Check if deployed
    USDe: "0x5d3a1Ff2b6BAb83b63cd9AD0787074081a52ef34", // Ethena USD (if deployed on testnet)
    USDT: "0x0000000000000000000000000000000000000000", // Deploy test token if needed
  },
  optimismSepolia: {
    USDC: "0x5fd84259d66Cd46123540766Be93DFE6D43130D7",
    PYUSD: "0x0000000000000000000000000000000000000000", // Not on Optimism Sepolia yet
    USDe: "0x5d3a1Ff2b6BAb83b63cd9AD0787074081a52ef34", // Ethena USD (if deployed on testnet)
    USDT: "0x0000000000000000000000000000000000000000", // Deploy test token if needed
  }
};

// Chain IDs
const CHAIN_IDS = {
  sepolia: 11155111,
  baseSepolia: 84532,
  arbitrumSepolia: 421614,
  optimismSepolia: 11155420
};

// CCTP Domains (testnet)
const CCTP_DOMAINS = {
  sepolia: 0,
  baseSepolia: 6,
  arbitrumSepolia: 3,
  optimismSepolia: 2
};

// LayerZero Chain IDs (testnet)
const LZ_CHAIN_IDS = {
  sepolia: 10161,
  baseSepolia: 10245,
  arbitrumSepolia: 10231,
  optimismSepolia: 10232
};

async function deployUnifiedRouter() {
  const network = hre.network.name;
  const [deployer] = await ethers.getSigners();
  
  console.log("========================================");
  console.log(`Deploying UnifiedRouter to ${network}`);
  console.log("========================================\n");
  console.log("Deployer:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Balance:", ethers.formatEther(balance), "ETH\n");
  
  // Deploy UnifiedRouter
  console.log("Deploying UnifiedRouter...");
  const UnifiedRouter = await ethers.getContractFactory("UnifiedRouter");
  const router = await UnifiedRouter.deploy(deployer.address);
  await router.waitForDeployment();
  
  const routerAddress = await router.getAddress();
  console.log("✅ UnifiedRouter deployed to:", routerAddress);
  
  // Set protocol contracts
  console.log("\n📝 Setting protocol contracts...");
  
  const protocolAddresses = PROTOCOL_ADDRESSES[network];
  if (!protocolAddresses) {
    console.log("⚠️  No protocol addresses configured for", network);
    return routerAddress;
  }
  
  // Helper function to wait for transaction with proper gas settings and retry
  async function sendTransaction(func, name, retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`Setting ${name}... (attempt ${attempt}/${retries})`);
        
        // Get current gas price and increase it
        const feeData = await ethers.provider.getFeeData();
        const gasPrice = feeData.gasPrice;
        const increasedGasPrice = gasPrice * 120n / 100n; // 20% increase
        
        // Add gas configuration to the transaction
        const txWithGas = await func.then(tx => {
          tx.gasPrice = increasedGasPrice;
          return tx;
        });
        
        console.log(`  TX sent: ${txWithGas.hash}`);
        console.log(`  Gas price: ${ethers.formatUnits(increasedGasPrice, "gwei")} gwei`);
        
        // Wait with longer timeout
        const receipt = await txWithGas.wait(2); // Wait for 2 confirmations
        console.log(`✅ ${name} configured`);
        return receipt;
      } catch (error) {
        console.log(`⚠️  Attempt ${attempt} failed: ${error.message}`);
        if (attempt === retries) {
          console.log(`❌ Failed to set ${name} after ${retries} attempts`);
          return null;
        }
        // Wait before retry
        console.log(`  Waiting 5 seconds before retry...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
  }
  
  // Set CCTP
  if (protocolAddresses.CCTP_TOKEN_MESSENGER !== "0x0000000000000000000000000000000000000000") {
    await sendTransaction(
      router.setProtocolContract(1, protocolAddresses.CCTP_TOKEN_MESSENGER), 
      "CCTP Token Messenger"
    );
  }
  
  // Set LayerZero
  if (protocolAddresses.LAYERZERO_ENDPOINT !== "0x0000000000000000000000000000000000000000") {
    await sendTransaction(
      router.setProtocolContract(2, protocolAddresses.LAYERZERO_ENDPOINT),
      "LayerZero Endpoint"
    );
  }
  
  // Set Stargate (if available)
  if (protocolAddresses.STARGATE_ROUTER !== "0x0000000000000000000000000000000000000000") {
    await sendTransaction(
      router.setProtocolContract(3, protocolAddresses.STARGATE_ROUTER),
      "Stargate Router"
    );
  }
  
  console.log("\n✅ Deployment complete!");
  console.log("Router address:", routerAddress);
  console.log("\nNext step: Run configure-routes.js to set up routes");
  
  // Save deployment info
  const fs = require("fs");
  const deploymentInfo = {
    network: network,
    router: routerAddress,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    protocolContracts: protocolAddresses,
    tokenAddresses: TOKEN_ADDRESSES[network],
    chainId: CHAIN_IDS[network]
  };
  
  const deploymentPath = `./deployments/${network}-unified-router.json`;
  fs.mkdirSync("./deployments", { recursive: true });
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log(`\n💾 Deployment info saved to ${deploymentPath}`);
  
  return routerAddress;
}

async function main() {
  await deployUnifiedRouter();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
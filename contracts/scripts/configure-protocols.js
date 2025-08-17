const { ethers } = require("hardhat");
const fs = require("fs");

// Protocol addresses for each network
const PROTOCOL_ADDRESSES = {
  sepolia: {
    CCTP_TOKEN_MESSENGER: "0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5",
    CCTP_MESSAGE_TRANSMITTER: "0x7865fAfC2db2093669d92c0F33AeEF291086BEFD",
    LAYERZERO_ENDPOINT: "0x6EDCE65403992e310A62460808c4b910D972f10f",
    STARGATE_ROUTER: "0x0000000000000000000000000000000000000000" // Not on Sepolia
  },
  baseSepolia: {
    CCTP_TOKEN_MESSENGER: "0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5",
    CCTP_MESSAGE_TRANSMITTER: "0x7865fAfC2db2093669d92c0F33AeEF291086BEFD",
    LAYERZERO_ENDPOINT: "0x6EDCE65403992e310A62460808c4b910D972f10f",
    STARGATE_ROUTER: "0x0000000000000000000000000000000000000000" // Not on Base Sepolia
  },
  arbitrumSepolia: {
    CCTP_TOKEN_MESSENGER: "0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5",
    CCTP_MESSAGE_TRANSMITTER: "0x7865fAfC2db2093669d92c0F33AeEF291086BEFD",
    LAYERZERO_ENDPOINT: "0x6EDCE65403992e310A62460808c4b910D972f10f",
    STARGATE_ROUTER: "0x0000000000000000000000000000000000000000" // Not on Arbitrum Sepolia
  },
  optimismSepolia: {
    CCTP_TOKEN_MESSENGER: "0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5",
    CCTP_MESSAGE_TRANSMITTER: "0x7865fAfC2db2093669d92c0F33AeEF291086BEFD",
    LAYERZERO_ENDPOINT: "0x6EDCE65403992e310A62460808c4b910D972f10f",
    STARGATE_ROUTER: "0x0000000000000000000000000000000000000000" // Not on Optimism Sepolia
  }
};

// Protocol enum values
const Protocol = {
  NONE: 0,
  CCTP: 1,
  CCTP_HOOKS: 2,
  LAYERZERO: 3,
  STARGATE: 4
};

async function loadDeployment(network) {
  const deploymentPath = `./deployments/${network}-unified-router.json`;
  if (!fs.existsSync(deploymentPath)) {
    throw new Error(`No deployment found for ${network}. Run deploy-simple.js first.`);
  }
  return JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
}

async function setProtocol(router, protocolId, address, name) {
  try {
    console.log(`Setting ${name}...`);
    
    // Check if already set
    const currentAddress = await router.protocolContracts(protocolId);
    if (currentAddress.toLowerCase() === address.toLowerCase()) {
      console.log(`✅ ${name} already configured`);
      return true;
    }
    
    // Get current gas settings
    const feeData = await ethers.provider.getFeeData();
    const gasPrice = feeData.gasPrice * 110n / 100n; // 10% increase
    
    console.log(`  Gas price: ${ethers.formatUnits(gasPrice, "gwei")} gwei`);
    
    const tx = await router.setProtocolContract(protocolId, address, {
      gasPrice: gasPrice,
      gasLimit: 100000 // Set reasonable gas limit
    });
    
    console.log(`  TX sent: ${tx.hash}`);
    console.log(`  Waiting for confirmation...`);
    
    const receipt = await tx.wait(1);
    console.log(`✅ ${name} configured successfully`);
    console.log(`  Gas used: ${receipt.gasUsed.toString()}`);
    
    return true;
  } catch (error) {
    console.log(`❌ Failed to set ${name}: ${error.message}`);
    
    if (error.message.includes("timeout")) {
      console.log(`  💡 Network might be slow. Try again in a few minutes.`);
    } else if (error.message.includes("replacement transaction underpriced")) {
      console.log(`  💡 Try increasing gas price or wait for pending transactions.`);
    }
    
    return false;
  }
}

async function configureProtocols() {
  const network = hre.network.name;
  const [owner] = await ethers.getSigners();
  
  console.log("============================================");
  console.log(`Configuring Protocols on ${network}`);
  console.log("============================================\n");
  console.log("Network:", network);
  console.log("Owner:", owner.address);
  
  // Load deployment
  const deployment = await loadDeployment(network);
  const router = await ethers.getContractAt("UnifiedRouter", deployment.router);
  console.log("Router:", deployment.router);
  
  // Get protocol addresses for this network
  const protocolAddresses = PROTOCOL_ADDRESSES[network];
  if (!protocolAddresses) {
    console.log("❌ No protocol addresses configured for", network);
    return;
  }
  
  console.log("\n📝 Setting protocol contracts...\n");
  
  let configured = 0;
  let total = 0;
  
  // Configure CCTP
  if (protocolAddresses.CCTP_TOKEN_MESSENGER !== "0x0000000000000000000000000000000000000000") {
    total++;
    const success = await setProtocol(
      router, 
      Protocol.CCTP, 
      protocolAddresses.CCTP_TOKEN_MESSENGER, 
      "CCTP Token Messenger"
    );
    if (success) configured++;
  }
  
  console.log(); // Empty line
  
  // Configure CCTP Hooks (Message Transmitter)
  if (protocolAddresses.CCTP_MESSAGE_TRANSMITTER !== "0x0000000000000000000000000000000000000000") {
    total++;
    const success = await setProtocol(
      router, 
      Protocol.CCTP_HOOKS, 
      protocolAddresses.CCTP_MESSAGE_TRANSMITTER, 
      "CCTP Message Transmitter"
    );
    if (success) configured++;
  }
  
  console.log(); // Empty line
  
  // Configure LayerZero
  if (protocolAddresses.LAYERZERO_ENDPOINT !== "0x0000000000000000000000000000000000000000") {
    total++;
    const success = await setProtocol(
      router, 
      Protocol.LAYERZERO, 
      protocolAddresses.LAYERZERO_ENDPOINT, 
      "LayerZero Endpoint"
    );
    if (success) configured++;
  }
  
  console.log(); // Empty line
  
  // Configure Stargate (if available)
  if (protocolAddresses.STARGATE_ROUTER !== "0x0000000000000000000000000000000000000000") {
    total++;
    const success = await setProtocol(
      router, 
      Protocol.STARGATE, 
      protocolAddresses.STARGATE_ROUTER, 
      "Stargate Router"
    );
    if (success) configured++;
  } else {
    console.log("ℹ️  Stargate not available on", network);
  }
  
  console.log("\n========================================");
  console.log("Protocol Configuration Summary:");
  console.log(`Configured: ${configured}/${total} protocols`);
  console.log("========================================");
  
  if (configured === total) {
    console.log("\n✅ All protocols configured successfully!");
    console.log("\nNext step: Run configure-routes.js to set up token routes");
  } else {
    console.log("\n⚠️  Some protocols failed to configure");
    console.log("You can run this script again to retry failed configurations");
  }
  
  // Save protocol configuration status
  const configPath = `./deployments/${network}-protocols-config.json`;
  const configInfo = {
    network: network,
    router: deployment.router,
    timestamp: new Date().toISOString(),
    configured: configured,
    total: total,
    protocols: protocolAddresses
  };
  
  fs.writeFileSync(configPath, JSON.stringify(configInfo, null, 2));
  console.log(`\n💾 Configuration saved to ${configPath}`);
}

async function main() {
  await configureProtocols();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
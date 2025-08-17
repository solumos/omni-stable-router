const { ethers } = require("hardhat");

async function main() {
  console.log("⚙️  CONFIGURING MAINNET PROTOCOLS");
  console.log("=================================\n");
  
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  
  // Deployed contract addresses
  const deployedContracts = {
    8453: { // Base Mainnet
      router: "0xA450EB7baB661aC2C42F51B8f1e9A5BFc1fA6dE3",
      swapExecutor: "0xE2ea3f454e12362212b1734eD0218E7691bd985c"
    },
    42161: { // Arbitrum One - to be deployed
      router: null,
      swapExecutor: null
    }
  };
  
  // Protocol configurations
  const networkConfigs = {
    8453: { // Base Mainnet
      name: "Base Mainnet",
      cctp: {
        tokenMessenger: "0x1682Ae6375C4E4A97e4B583BC394c861A46D8962"
      },
      layerzero: {
        endpoint: "0x1a44076050125825900e736c501f859c50fE728c"
      }
    },
    42161: { // Arbitrum One
      name: "Arbitrum One",
      cctp: {
        tokenMessenger: "0x19330d10D9Cc8751218eaf51E8885D058642E08A"
      },
      layerzero: {
        endpoint: "0x1a44076050125825900e736c501f859c50fE728c"
      }
    }
  };
  
  const networkConfig = networkConfigs[chainId];
  const contractAddresses = deployedContracts[chainId];
  
  if (!networkConfig || !contractAddresses?.router) {
    throw new Error(`No deployed contract found for network ${chainId}`);
  }
  
  const [signer] = await ethers.getSigners();
  
  console.log(`📍 Network: ${networkConfig.name} (${chainId})`);
  console.log(`👤 Signer: ${signer.address}`);
  console.log(`🌉 Router: ${contractAddresses.router}\n`);
  
  // Get the router contract
  const router = await ethers.getContractAt("UnifiedRouter", contractAddresses.router);
  
  // Check current protocol configurations
  console.log("🔍 Checking Current Protocol Configurations...");
  
  try {
    const cctpContract = await router.protocolContracts(1); // CCTP
    const lzContract = await router.protocolContracts(3); // LAYERZERO
    
    console.log(`   CCTP Current: ${cctpContract}`);
    console.log(`   LayerZero Current: ${lzContract}`);
    
    // Configure CCTP if not set
    if (cctpContract === ethers.ZeroAddress) {
      console.log("\n🔵 Configuring CCTP...");
      const cctpTx = await router.setProtocolContract(
        1, // Protocol.CCTP
        networkConfig.cctp.tokenMessenger
      );
      await cctpTx.wait();
      console.log(`✅ CCTP configured: ${networkConfig.cctp.tokenMessenger}`);
    } else {
      console.log("✅ CCTP already configured");
    }
    
    // Configure LayerZero if not set
    if (lzContract === ethers.ZeroAddress) {
      console.log("\n🌐 Configuring LayerZero...");
      const lzTx = await router.setProtocolContract(
        3, // Protocol.LAYERZERO
        networkConfig.layerzero.endpoint
      );
      await lzTx.wait();
      console.log(`✅ LayerZero configured: ${networkConfig.layerzero.endpoint}`);
    } else {
      console.log("✅ LayerZero already configured");
    }
    
  } catch (e) {
    console.log("❌ Protocol configuration failed:", e.message);
    
    // Try individual configurations
    console.log("\n🔄 Attempting individual configurations...");
    
    try {
      console.log("🔵 Configuring CCTP...");
      const cctpTx = await router.setProtocolContract(
        1, // Protocol.CCTP
        networkConfig.cctp.tokenMessenger
      );
      await cctpTx.wait();
      console.log(`✅ CCTP configured: ${networkConfig.cctp.tokenMessenger}`);
    } catch (cctpError) {
      console.log("❌ CCTP configuration failed:", cctpError.message);
    }
    
    try {
      console.log("🌐 Configuring LayerZero...");
      const lzTx = await router.setProtocolContract(
        3, // Protocol.LAYERZERO
        networkConfig.layerzero.endpoint
      );
      await lzTx.wait();
      console.log(`✅ LayerZero configured: ${networkConfig.layerzero.endpoint}`);
    } catch (lzError) {
      console.log("❌ LayerZero configuration failed:", lzError.message);
    }
  }
  
  // Verify final configuration
  console.log("\n🔍 Final Protocol Configuration:");
  try {
    const finalCctp = await router.protocolContracts(1);
    const finalLz = await router.protocolContracts(3);
    
    console.log(`   CCTP: ${finalCctp}`);
    console.log(`   LayerZero: ${finalLz}`);
    
    // Verify addresses match expected
    if (finalCctp === networkConfig.cctp.tokenMessenger) {
      console.log("✅ CCTP correctly configured");
    } else {
      console.log("❌ CCTP configuration mismatch");
    }
    
    if (finalLz === networkConfig.layerzero.endpoint) {
      console.log("✅ LayerZero correctly configured");
    } else {
      console.log("❌ LayerZero configuration mismatch");
    }
    
  } catch (e) {
    console.log("❌ Failed to verify configuration:", e.message);
  }
  
  console.log("\n" + "=".repeat(50));
  console.log(`🎉 ${networkConfig.name.toUpperCase()} PROTOCOLS CONFIGURED!`);
  console.log("=".repeat(50));
  console.log(`📍 UnifiedRouter: ${contractAddresses.router}`);
  console.log(`🔵 CCTP: ${networkConfig.cctp.tokenMessenger}`);
  console.log(`🌐 LayerZero: ${networkConfig.layerzero.endpoint}`);
  
  if (chainId === 8453) {
    console.log(`\n🔗 View on BaseScan: https://basescan.org/address/${contractAddresses.router}`);
  } else if (chainId === 42161) {
    console.log(`\n🔗 View on Arbiscan: https://arbiscan.io/address/${contractAddresses.router}`);
  }
  
  console.log("\n📋 Next Steps:");
  console.log("1. ✅ Protocols configured");
  console.log("2. 🔄 Deploy to other mainnet (if needed)");
  console.log("3. 🛣️  Configure cross-chain routes");
  console.log("4. 🌐 Update frontend configuration");
  console.log("5. 🧪 Test cross-chain functionality");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
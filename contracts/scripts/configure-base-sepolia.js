const hre = require("hardhat");
const { ethers } = require("hardhat");
const { formatEther } = require("ethers");
const fs = require("fs");
const path = require("path");

// Base Sepolia Configuration
const BASE_SEPOLIA_CONFIG = {
  chainId: 84532,
  cctpDomain: 6,
  layerZeroId: 10245,
  contracts: {
    usdc: "0x036CbD53842c5426634e7929541eC2318f3dCF7e"
  }
};

// All deployed contracts on Base Sepolia
const DEPLOYED = {
  swapExecutor: "0xdcf63233493ce3A981B1155Fbe1fD6795f3A83d8",
  feeManager: "0xA0FD978f89D941783A43aFBe092B614ef31571F3",
  hookReceiver: "0xE2ea3f454e12362212b1734eD0218E7691bd985c",
  routeProcessor: "0xD1e60637cA70C786B857452E50DE8353a01DabBb",
  stableRouter: "0x238B153EEe7bc369F60C31Cb04d0a0e3466a82BD"
};

// Sepolia contracts (for cross-chain setup)
const SEPOLIA_CONTRACTS = {
  routeProcessor: "0xD039Cb6B9BbAb2DE0Ae0D92F1DdCb8e6A4Dc88de"
};

async function main() {
  console.log("⚙️  Configuring Base Sepolia Contracts...\n");
  
  const [deployer] = await ethers.getSigners();
  console.log("👤 Configurer:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 Balance:", formatEther(balance), "ETH");
  
  // Wait for any pending transactions
  console.log("\n⏳ Waiting for pending transactions to clear...");
  await new Promise(resolve => setTimeout(resolve, 10000)); // 10 second wait
  
  console.log("\n📋 Contracts to configure:");
  Object.entries(DEPLOYED).forEach(([name, address]) => {
    console.log(`├── ${name}: ${address}`);
  });
  console.log("\n");
  
  try {
    // Get contract instances
    const feeManager = await ethers.getContractAt("FeeManager", DEPLOYED.feeManager);
    const hookReceiver = await ethers.getContractAt("CCTPHookReceiver", DEPLOYED.hookReceiver);
    const routeProcessor = await ethers.getContractAt("RouteProcessor", DEPLOYED.routeProcessor);
    
    // Check what's already configured
    console.log("🔍 Checking current configuration...");
    
    // Check if StableRouter is already authorized
    const isAuthorized = await feeManager.authorizedCollectors(DEPLOYED.stableRouter);
    if (!isAuthorized) {
      console.log("\n1️⃣ Authorizing StableRouter as fee collector...");
      const tx1 = await feeManager.authorizeCollector(DEPLOYED.stableRouter, true, {
        gasLimit: 100000
      });
      await tx1.wait();
      console.log("✅ StableRouter authorized");
    } else {
      console.log("✅ StableRouter already authorized");
    }
    
    // Configure Sepolia as authorized sender
    console.log("\n2️⃣ Checking CCTP authorized senders...");
    const SEPOLIA_DOMAIN = 0;
    const paddedSepoliaProcessor = ethers.zeroPadValue(SEPOLIA_CONTRACTS.routeProcessor, 32);
    
    // Note: We can't easily check if already authorized, so we'll try to set it
    try {
      const tx2 = await hookReceiver.setAuthorizedSender(
        SEPOLIA_DOMAIN,
        paddedSepoliaProcessor,
        true,
        { gasLimit: 100000 }
      );
      await tx2.wait();
      console.log("✅ Sepolia RouteProcessor authorized");
    } catch (e) {
      if (e.message.includes("Already authorized")) {
        console.log("✅ Sepolia RouteProcessor already authorized");
      } else {
        throw e;
      }
    }
    
    // Configure USDC token
    console.log("\n3️⃣ Configuring USDC token...");
    const isUSDCConfigured = await routeProcessor.isUSDC(BASE_SEPOLIA_CONFIG.contracts.usdc);
    if (!isUSDCConfigured) {
      const tx3 = await routeProcessor.configureToken(
        BASE_SEPOLIA_CONFIG.contracts.usdc,
        true,
        ethers.ZeroAddress,
        0,
        { gasLimit: 100000 }
      );
      await tx3.wait();
      console.log("✅ USDC configured in RouteProcessor");
    } else {
      console.log("✅ USDC already configured");
    }
    
    // Configure USDC as supported in hook receiver
    console.log("\n4️⃣ Setting supported tokens in CCTPHookReceiver...");
    const isSupportedToken = await hookReceiver.supportedTokens(BASE_SEPOLIA_CONFIG.contracts.usdc);
    if (!isSupportedToken) {
      const tx4 = await hookReceiver.setSupportedToken(
        BASE_SEPOLIA_CONFIG.contracts.usdc, 
        true,
        { gasLimit: 100000 }
      );
      await tx4.wait();
      console.log("✅ USDC set as supported token");
    } else {
      console.log("✅ USDC already supported");
    }
    
    // Save complete deployment info
    const deploymentInfo = {
      network: "baseSepolia",
      chainId: BASE_SEPOLIA_CONFIG.chainId,
      deployer: deployer.address,
      timestamp: new Date().toISOString(),
      contracts: DEPLOYED,
      configuration: {
        cctpDomain: BASE_SEPOLIA_CONFIG.cctpDomain,
        layerZeroId: BASE_SEPOLIA_CONFIG.layerZeroId,
        usdc: BASE_SEPOLIA_CONFIG.contracts.usdc,
        authorizedSenders: {
          sepolia: SEPOLIA_CONTRACTS.routeProcessor
        }
      }
    };
    
    const deploymentPath = path.join(__dirname, `../deployments/base-sepolia-deployment.json`);
    fs.mkdirSync(path.dirname(deploymentPath), { recursive: true });
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
    
    console.log("\n=====================================");
    console.log("✅ BASE SEPOLIA CONFIGURATION COMPLETE!");
    console.log("=====================================\n");
    
    console.log("📋 All Contracts Ready:");
    console.log("├── StableRouter:", DEPLOYED.stableRouter);
    console.log("├── RouteProcessor:", DEPLOYED.routeProcessor);
    console.log("├── SwapExecutor:", DEPLOYED.swapExecutor);
    console.log("├── FeeManager:", DEPLOYED.feeManager);
    console.log("└── CCTPHookReceiver:", DEPLOYED.hookReceiver);
    
    console.log("\n🔗 View on BaseScan:");
    console.log(`https://sepolia.basescan.org/address/${DEPLOYED.stableRouter}`);
    
    console.log("\n✅ Base Sepolia is ready to:");
    console.log("• Receive CCTP transfers from Sepolia");
    console.log("• Execute atomic swaps via CCTPHookReceiver");
    
    console.log("\n🚀 Next Steps:");
    console.log("1. Update Sepolia to recognize Base Sepolia:");
    console.log("   npx hardhat run scripts/update-sepolia-for-base.js --network sepolia");
    console.log("\n2. Test a cross-chain transfer:");
    console.log("   Sepolia USDC → Base Sepolia USDC");
    
  } catch (error) {
    console.error("\n❌ Configuration failed:", error.message);
    
    if (error.message.includes("replacement transaction underpriced")) {
      console.log("\n💡 Transaction stuck. Options:");
      console.log("1. Wait 2 minutes and retry");
      console.log("2. Clear MetaMask activity: Settings → Advanced → Clear activity tab data");
      console.log("3. Check BaseScan for pending transactions");
    }
    
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
const hre = require("hardhat");
const { ethers, upgrades } = require("hardhat");
const { formatEther } = require("ethers");
const fs = require("fs");
const path = require("path");

// Testnet Configuration
const TESTNET_CONFIG = {
  sepolia: {
    chainId: 11155111,
    cctpDomain: 0,
    layerZeroId: 10161,
    stargateId: 10161,
    contracts: {
      cctpTokenMessenger: "0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5",
      cctpMessageTransmitter: "0x7865fAfC2db2093669d92c0F33AeEF291086BEFD",
      layerZeroEndpoint: "0xae92d5aD7583AD66E49A0c67BAd18F6ba52dDDc1",
      stargateRouter: "0x1d4C2a246311bB9f827F4C768e277FF5787B7D7E",
      uniswapV3Router: "0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E",
      usdc: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238"
    }
  }
};

// Already deployed contracts (with proper checksums)
const DEPLOYED = {
  swapExecutor: "0xD1e60637cA70C786B857452E50DE8353a01DabBb",
  feeManager: "0xD84F50DcdeC8e3E84c970d708ccbE5a3c5D68a79",
  hookReceiver: "0xE99A9fF893B3aE1A86bCA965ddCe5e982773ff14",
  routeProcessor: "0xD039Cb6B9BbAb2DE0Ae0D92F1DdCb8e6A4Dc88de",
  stableRouter: "0x44A0DBcAe62a90De8E967c87aF1D670c8E0b42d0"
};

async function main() {
  console.log("📍 Resuming deployment on sepolia...\n");
  
  const config = TESTNET_CONFIG.sepolia;
  const [deployer] = await ethers.getSigners();
  
  console.log("👤 Deployer address:", deployer.address);
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 Deployer balance:", formatEther(balance), "ETH\n");
  
  console.log("📦 Using already deployed contracts:");
  console.log("├── SwapExecutor:", DEPLOYED.swapExecutor);
  console.log("├── FeeManager:", DEPLOYED.feeManager);
  console.log("├── CCTPHookReceiver:", DEPLOYED.hookReceiver);
  console.log("├── RouteProcessor:", DEPLOYED.routeProcessor);
  console.log("└── StableRouter:", DEPLOYED.stableRouter);
  
  try {
    // Get contract instances
    console.log("\n⚙️  Getting contract instances...");
    const feeManager = await ethers.getContractAt("FeeManager", DEPLOYED.feeManager);
    const hookReceiver = await ethers.getContractAt("CCTPHookReceiver", DEPLOYED.hookReceiver);
    const routeProcessor = await ethers.getContractAt("RouteProcessor", DEPLOYED.routeProcessor);
    const stableRouter = await ethers.getContractAt("StableRouter", DEPLOYED.stableRouter);
    
    // Configure Access Controls
    console.log("\n⚙️  Configuring Access Controls...");
    
    // Check if already authorized
    const isAuthorized = await feeManager.authorizedCollectors(DEPLOYED.stableRouter);
    if (!isAuthorized) {
      const tx1 = await feeManager.authorizeCollector(DEPLOYED.stableRouter, true);
      await tx1.wait();
      console.log("✅ Authorized StableRouter as fee collector");
    } else {
      console.log("✅ StableRouter already authorized as fee collector");
    }
    
    // Configure CCTPHookReceiver authorized senders
    const tx2 = await hookReceiver.setAuthorizedSender(
      config.cctpDomain,
      ethers.zeroPadValue(DEPLOYED.routeProcessor, 32),
      true
    );
    await tx2.wait();
    console.log("✅ Authorized RouteProcessor as CCTP sender");
    
    // Configure tokens
    console.log("\n⚙️  Configuring Tokens...");
    const tx3 = await routeProcessor.configureToken(
      config.contracts.usdc,
      true,  // isUSDC
      ethers.ZeroAddress,
      0
    );
    await tx3.wait();
    console.log("✅ Configured USDC token");
    
    // Configure supported tokens in CCTPHookReceiver
    const tx4 = await hookReceiver.setSupportedToken(config.contracts.usdc, true);
    await tx4.wait();
    console.log("✅ Set USDC as supported in hook receiver");
    
    // Save deployment info
    const deploymentInfo = {
      network: "sepolia",
      chainId: config.chainId,
      deployer: deployer.address,
      owner: deployer.address,
      timestamp: new Date().toISOString(),
      contracts: DEPLOYED,
      externalContracts: config.contracts,
      configuration: {
        cctpDomain: config.cctpDomain,
        layerZeroId: config.layerZeroId,
        stargateId: config.stargateId
      }
    };
    
    const deploymentPath = path.join(__dirname, `../deployments/sepolia-deployment-complete.json`);
    fs.mkdirSync(path.dirname(deploymentPath), { recursive: true });
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
    
    console.log("\n=====================================");
    console.log("🎉 CONFIGURATION COMPLETE!");
    console.log("=====================================\n");
    console.log("📄 Deployment info saved to:", deploymentPath);
    console.log("\n📋 Deployed Contracts:");
    console.log("├── StableRouter:", DEPLOYED.stableRouter);
    console.log("├── RouteProcessor:", DEPLOYED.routeProcessor);
    console.log("├── SwapExecutor:", DEPLOYED.swapExecutor);
    console.log("├── FeeManager:", DEPLOYED.feeManager);
    console.log("└── CCTPHookReceiver:", DEPLOYED.hookReceiver);
    
    console.log("\n🔍 View on Etherscan:");
    console.log(`https://sepolia.etherscan.io/address/${DEPLOYED.stableRouter}`);
    
  } catch (error) {
    console.error("\n❌ Configuration failed:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
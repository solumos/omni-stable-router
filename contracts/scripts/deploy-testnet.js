const hre = require("hardhat");
const { ethers, upgrades } = require("hardhat");
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
  },
  arbitrumSepolia: {
    chainId: 421614,
    cctpDomain: 3,
    layerZeroId: 10231,
    stargateId: 10231,
    contracts: {
      cctpTokenMessenger: "0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5",
      cctpMessageTransmitter: "0x7865fAfC2db2093669d92c0F33AeEF291086BEFD",
      layerZeroEndpoint: "0x6098e96a28E02f27B1e6BD381f870F1C8Bd169d3",
      stargateRouter: "0xb850873f4c993Ac2405A1AdD71F6ca5D4d4d6b4f",
      uniswapV3Router: "0x101F443B4d1b059569D643917553c771E1b9663E",
      usdc: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d"
    }
  }
};

async function main() {
  console.log("🚀 Starting Testnet Deployment...\n");
  
  const network = hre.network.name;
  const config = TESTNET_CONFIG[network];
  
  if (!config) {
    throw new Error(`No configuration found for network: ${network}`);
  }
  
  console.log(`📍 Deploying to ${network} (chainId: ${config.chainId})`);
  console.log("=====================================\n");
  
  const [deployer, proposer1, proposer2, proposer3, executor1, executor2] = await ethers.getSigners();
  
  console.log("👤 Deployer address:", deployer.address);
  console.log("💰 Deployer balance:", ethers.utils.formatEther(await deployer.getBalance()), "ETH\n");
  
  // Track deployed addresses
  const deployedContracts = {};
  
  try {
    // ============ 1. Deploy TimelockMultisig ============
    console.log("📦 1. Deploying TimelockMultisig...");
    const TimelockMultisig = await ethers.getContractFactory("TimelockMultisig");
    const timelock = await TimelockMultisig.deploy(
      2 * 24 * 60 * 60, // 2 days for testnet
      [proposer1.address, proposer2.address, proposer3.address],
      [executor1.address, executor2.address],
      ethers.constants.AddressZero // Renounce admin after setup
    );
    await timelock.deployed();
    deployedContracts.timelock = timelock.address;
    console.log("✅ TimelockMultisig deployed to:", timelock.address);
    
    // ============ 2. Deploy SwapExecutor ============
    console.log("\n📦 2. Deploying SwapExecutor...");
    const SwapExecutor = await ethers.getContractFactory("SwapExecutor");
    const swapExecutor = await SwapExecutor.deploy(config.contracts.uniswapV3Router);
    await swapExecutor.deployed();
    deployedContracts.swapExecutor = swapExecutor.address;
    console.log("✅ SwapExecutor deployed to:", swapExecutor.address);
    
    // ============ 3. Deploy FeeManager ============
    console.log("\n📦 3. Deploying FeeManager...");
    const FeeManager = await ethers.getContractFactory("FeeManager");
    const feeManager = await FeeManager.deploy(deployer.address); // Use deployer as initial fee recipient
    await feeManager.deployed();
    deployedContracts.feeManager = feeManager.address;
    console.log("✅ FeeManager deployed to:", feeManager.address);
    
    // ============ 4. Deploy CCTPHookReceiver ============
    console.log("\n📦 4. Deploying CCTPHookReceiver...");
    const CCTPHookReceiver = await ethers.getContractFactory("CCTPHookReceiver");
    const hookReceiver = await CCTPHookReceiver.deploy(
      swapExecutor.address,
      config.contracts.cctpMessageTransmitter,
      config.contracts.usdc
    );
    await hookReceiver.deployed();
    deployedContracts.hookReceiver = hookReceiver.address;
    console.log("✅ CCTPHookReceiver deployed to:", hookReceiver.address);
    
    // ============ 5. Deploy RouteProcessor (UUPS Proxy) ============
    console.log("\n📦 5. Deploying RouteProcessor (UUPS Proxy)...");
    const RouteProcessor = await ethers.getContractFactory("RouteProcessor");
    const routeProcessor = await upgrades.deployProxy(
      RouteProcessor,
      [
        deployer.address, // Initial owner (will transfer to timelock)
        config.contracts.cctpTokenMessenger,
        config.contracts.cctpMessageTransmitter,
        config.contracts.layerZeroEndpoint,
        config.contracts.stargateRouter
      ],
      { 
        kind: 'uups',
        initializer: 'initialize'
      }
    );
    await routeProcessor.deployed();
    deployedContracts.routeProcessor = routeProcessor.address;
    console.log("✅ RouteProcessor deployed to:", routeProcessor.address);
    
    // ============ 6. Deploy StableRouter (UUPS Proxy) ============
    console.log("\n📦 6. Deploying StableRouter (UUPS Proxy)...");
    const StableRouter = await ethers.getContractFactory("StableRouter");
    const stableRouter = await upgrades.deployProxy(
      StableRouter,
      [
        routeProcessor.address,
        swapExecutor.address,
        feeManager.address
      ],
      { 
        kind: 'uups',
        initializer: 'initialize'
      }
    );
    await stableRouter.deployed();
    deployedContracts.stableRouter = stableRouter.address;
    console.log("✅ StableRouter deployed to:", stableRouter.address);
    
    // ============ 7. Configure Access Controls ============
    console.log("\n⚙️  7. Configuring Access Controls...");
    
    // Authorize StableRouter to record fees
    await feeManager.authorizeCollector(stableRouter.address, true);
    console.log("✅ Authorized StableRouter as fee collector");
    
    // Configure CCTPHookReceiver authorized senders
    await hookReceiver.setAuthorizedSender(
      config.cctpDomain,
      ethers.utils.hexZeroPad(routeProcessor.address, 32),
      true
    );
    console.log("✅ Authorized RouteProcessor as CCTP sender");
    
    // Configure tokens
    console.log("\n⚙️  8. Configuring Tokens...");
    await routeProcessor.configureToken(
      config.contracts.usdc,
      true,  // isUSDC
      ethers.constants.AddressZero,
      0
    );
    console.log("✅ Configured USDC token");
    
    // Configure supported tokens in CCTPHookReceiver
    await hookReceiver.setSupportedToken(config.contracts.usdc, true);
    console.log("✅ Set USDC as supported in hook receiver");
    
    // ============ 9. Transfer Ownership to Timelock ============
    console.log("\n🔐 9. Transferring Ownership to Timelock...");
    
    await swapExecutor.transferOwnership(timelock.address);
    console.log("✅ SwapExecutor ownership transferred");
    
    await feeManager.transferOwnership(timelock.address);
    console.log("✅ FeeManager ownership transferred");
    
    await hookReceiver.transferOwnership(timelock.address);
    console.log("✅ CCTPHookReceiver ownership transferred");
    
    await routeProcessor.transferOwnership(timelock.address);
    console.log("✅ RouteProcessor ownership transferred");
    
    await stableRouter.transferOwnership(timelock.address);
    console.log("✅ StableRouter ownership transferred");
    
    // ============ 10. Save Deployment Info ============
    const deploymentInfo = {
      network: network,
      chainId: config.chainId,
      deployer: deployer.address,
      timestamp: new Date().toISOString(),
      contracts: deployedContracts,
      externalContracts: config.contracts,
      multisig: {
        proposers: [proposer1.address, proposer2.address, proposer3.address],
        executors: [executor1.address, executor2.address],
        minDelay: "2 days"
      }
    };
    
    const deploymentPath = path.join(__dirname, `../deployments/${network}-deployment.json`);
    fs.mkdirSync(path.dirname(deploymentPath), { recursive: true });
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
    
    console.log("\n=====================================");
    console.log("🎉 DEPLOYMENT COMPLETE!");
    console.log("=====================================\n");
    console.log("📄 Deployment info saved to:", deploymentPath);
    console.log("\n📋 Deployed Contracts:");
    console.log("├── TimelockMultisig:", deployedContracts.timelock);
    console.log("├── StableRouter:", deployedContracts.stableRouter);
    console.log("├── RouteProcessor:", deployedContracts.routeProcessor);
    console.log("├── SwapExecutor:", deployedContracts.swapExecutor);
    console.log("├── FeeManager:", deployedContracts.feeManager);
    console.log("└── CCTPHookReceiver:", deployedContracts.hookReceiver);
    
    console.log("\n🔍 Next Steps:");
    console.log("1. Verify contracts on Etherscan");
    console.log("2. Configure additional tokens and pools");
    console.log("3. Set up cross-chain receivers on other testnets");
    console.log("4. Run integration tests");
    
  } catch (error) {
    console.error("\n❌ Deployment failed:", error);
    process.exit(1);
  }
}

// Execute deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
const { ethers } = require("hardhat");
const { formatEther } = require("ethers");

// LayerZero endpoint addresses
const LZ_ENDPOINTS = {
  sepolia: "0xae92d5aD7583AD66E49A0c67BAd18F6ba52dDDc1",
  baseSepolia: "0x6EDCE65403992e310A62460808c4b910D972f10f",
  arbitrumSepolia: "0x6EDCE65403992e310A62460808c4b910D972f10f"
};

// LayerZero chain IDs
const LZ_CHAIN_IDS = {
  sepolia: 10161,
  baseSepolia: 10245,
  arbitrumSepolia: 10231
};

async function main() {
  const network = hre.network.name;
  console.log(`\n🚀 Deploying Test OFT Tokens on ${network}...\n`);
  
  const [deployer] = await ethers.getSigners();
  console.log("👤 Deployer:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 Balance:", formatEther(balance), "ETH\n");
  
  // Get LayerZero endpoint for current network
  const lzEndpoint = LZ_ENDPOINTS[network];
  if (!lzEndpoint) {
    throw new Error(`No LayerZero endpoint configured for ${network}`);
  }
  
  console.log("📡 LayerZero Endpoint:", lzEndpoint);
  console.log("🔗 Chain ID:", LZ_CHAIN_IDS[network]);
  
  // Deploy TestToken (regular ERC20)
  console.log("\n1️⃣ Deploying TestToken...");
  const TestToken = await ethers.getContractFactory("TestToken");
  const testToken = await TestToken.deploy(
    "Test USDT",
    "tUSDT",
    6, // 6 decimals like USDT
    ethers.parseUnits("1000000", 6) // 1M initial supply
  );
  await testToken.waitForDeployment();
  const testTokenAddress = await testToken.getAddress();
  console.log("✅ TestToken deployed to:", testTokenAddress);
  
  // Deploy SimpleOFT (OFT-compatible token)
  console.log("\n2️⃣ Deploying SimpleOFT...");
  const SimpleOFT = await ethers.getContractFactory("SimpleOFT");
  const simpleOFT = await SimpleOFT.deploy(
    "OFT Test Token",
    "oftTEST",
    lzEndpoint
  );
  await simpleOFT.waitForDeployment();
  const simpleOFTAddress = await simpleOFT.getAddress();
  console.log("✅ SimpleOFT deployed to:", simpleOFTAddress);
  
  // Mint some initial OFT tokens to deployer
  console.log("\n3️⃣ Minting initial OFT tokens...");
  const mintAmount = ethers.parseEther("1000000"); // 1M tokens
  const mintTx = await simpleOFT.mintTo(deployer.address, mintAmount);
  await mintTx.wait();
  console.log("✅ Minted 1M oftTEST tokens");
  
  // Configure cross-chain trusted remotes (if on Sepolia)
  if (network === "sepolia") {
    console.log("\n4️⃣ Setting up cross-chain configuration...");
    
    // We'll need to set trusted remotes after deploying on other chains
    console.log("⚠️  Remember to call setTrustedRemote after deploying on other chains:");
    console.log(`   For Base Sepolia: setTrustedRemote(${LZ_CHAIN_IDS.baseSepolia}, <remote_address>)`);
    console.log(`   For Arbitrum Sepolia: setTrustedRemote(${LZ_CHAIN_IDS.arbitrumSepolia}, <remote_address>)`);
  }
  
  // Configure with RouteProcessor
  console.log("\n5️⃣ Configuring with RouteProcessor...");
  
  let routeProcessorAddress;
  if (network === "sepolia") {
    routeProcessorAddress = "0x44A0DBcAe62a90De8E967c87aF1D670c8E0b42d0";
  } else if (network === "baseSepolia") {
    routeProcessorAddress = "0x238B153EEe7bc369F60C31Cb04d0a0e3466a82BD";
  } else if (network === "arbitrumSepolia") {
    routeProcessorAddress = "0xA450EB7baB661aC2C42F51B8f1e9A5BFc1fA6dE3";
  }
  
  if (routeProcessorAddress) {
    const routeProcessor = await ethers.getContractAt("RouteProcessor", routeProcessorAddress);
    
    // Check if we're the owner
    const owner = await routeProcessor.owner();
    if (owner.toLowerCase() === deployer.address.toLowerCase()) {
      console.log("Configuring TestToken in RouteProcessor...");
      const configTx = await routeProcessor.configureToken(
        testTokenAddress,
        false, // not USDC
        simpleOFTAddress, // Use SimpleOFT as the OFT adapter
        0 // no Stargate pool
      );
      await configTx.wait();
      console.log("✅ TestToken configured with SimpleOFT adapter");
    } else {
      console.log("⚠️  Not the owner of RouteProcessor, skipping configuration");
    }
  }
  
  console.log("\n✅ Deployment Complete!");
  console.log("=====================================");
  console.log("📋 Deployed Contracts:");
  console.log("├── TestToken (tUSDT):", testTokenAddress);
  console.log("└── SimpleOFT (oftTEST):", simpleOFTAddress);
  
  console.log("\n📝 Next Steps:");
  console.log("1. Deploy on other testnets");
  console.log("2. Set trusted remotes between chains");
  console.log("3. Test cross-chain transfers");
  
  // Save deployment info
  const fs = require("fs");
  const deploymentInfo = {
    network,
    timestamp: new Date().toISOString(),
    contracts: {
      TestToken: testTokenAddress,
      SimpleOFT: simpleOFTAddress
    },
    layerZero: {
      endpoint: lzEndpoint,
      chainId: LZ_CHAIN_IDS[network]
    }
  };
  
  const deploymentPath = `./deployments/test-oft-${network}.json`;
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log(`\n💾 Deployment info saved to ${deploymentPath}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
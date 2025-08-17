const { ethers } = require("hardhat");

// RouteProcessor addresses
const ROUTE_PROCESSORS = {
  sepolia: "0xD039Cb6B9BbAb2DE0Ae0D92F1DdCb8e6A4Dc88de",
  baseSepolia: "0xD1e60637cA70C786B857452E50DE8353a01DabBb",
  arbitrumSepolia: "0xA450EB7baB661aC2C42F51B8f1e9A5BFc1fA6dE3"
};

// USDC addresses on each chain
const USDC_ADDRESSES = {
  sepolia: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
  baseSepolia: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
  arbitrumSepolia: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d"
};

// CCTPHookReceiver addresses (for receiving CCTP transfers)
const HOOK_RECEIVERS = {
  sepolia: "0xE99A9fF893B3aE1A86bCA965ddCe5e982773ff14",
  baseSepolia: "0xE2ea3f454e12362212b1734eD0218E7691bd985c",
  arbitrumSepolia: "0xA0FD978f89D941783A43aFBe092B614ef31571F3"
};

// Chain IDs
const CHAIN_IDS = {
  sepolia: 11155111,
  baseSepolia: 84532,
  arbitrumSepolia: 421614
};

// CCTP Domain IDs
const CCTP_DOMAINS = {
  11155111: 0,    // Sepolia
  84532: 6,       // Base Sepolia
  421614: 3       // Arbitrum Sepolia
};

async function configureCCTPRoutes() {
  const network = hre.network.name;
  console.log(`\n⚙️  Configuring CCTP Routes on ${network}\n`);
  
  const [signer] = await ethers.getSigners();
  console.log("👤 Signer:", signer.address);
  
  const routeProcessor = await ethers.getContractAt("RouteProcessor", ROUTE_PROCESSORS[network]);
  
  // Check ownership
  const owner = await routeProcessor.owner();
  if (owner.toLowerCase() !== signer.address.toLowerCase()) {
    console.log("❌ You are not the owner of the RouteProcessor");
    console.log("Owner:", owner);
    console.log("You:", signer.address);
    return;
  }
  
  console.log("✅ You are the owner\n");
  
  // Step 1: Configure USDC as a CCTP token
  console.log("1️⃣ Configuring USDC as CCTP token...");
  
  const isAlreadyConfigured = await routeProcessor.isUSDC(USDC_ADDRESSES[network]);
  
  if (!isAlreadyConfigured) {
    const tx1 = await routeProcessor.configureToken(
      USDC_ADDRESSES[network],
      true,  // isUSDC = true for CCTP
      ethers.ZeroAddress,  // No OFT adapter for USDC
      0  // No Stargate pool
    );
    await tx1.wait();
    console.log("✅ USDC configured as CCTP token");
  } else {
    console.log("✅ USDC already configured as CCTP token");
  }
  
  // Step 2: Set CCTP domains for destination chains
  console.log("\n2️⃣ Setting CCTP domains for destination chains...");
  
  for (const [destNetwork, destChainId] of Object.entries(CHAIN_IDS)) {
    if (destNetwork === network) continue;  // Skip self
    
    const currentDomain = await routeProcessor.chainIdToCCTPDomain(destChainId);
    const expectedDomain = CCTP_DOMAINS[destChainId];
    
    if (currentDomain !== expectedDomain) {
      console.log(`Setting CCTP domain for ${destNetwork} (${destChainId}): ${expectedDomain}`);
      const tx = await routeProcessor.setCCTPDomain(destChainId, expectedDomain);
      await tx.wait();
      console.log(`✅ Set domain ${expectedDomain} for ${destNetwork}`);
    } else {
      console.log(`✅ ${destNetwork} already has correct CCTP domain: ${expectedDomain}`);
    }
  }
  
  // Step 3: Set CCTP hook receivers for destination chains
  console.log("\n3️⃣ Setting CCTP hook receivers for destination chains...");
  
  for (const [destNetwork, destChainId] of Object.entries(CHAIN_IDS)) {
    if (destNetwork === network) continue;  // Skip self
    
    const currentReceiver = await routeProcessor.cctpHookReceivers(destChainId);
    const expectedReceiver = HOOK_RECEIVERS[destNetwork];
    
    if (currentReceiver.toLowerCase() !== expectedReceiver.toLowerCase()) {
      console.log(`Setting hook receiver for ${destNetwork}:`, expectedReceiver);
      const tx = await routeProcessor.setCCTPHookReceiver(destChainId, expectedReceiver);
      await tx.wait();
      console.log(`✅ Set hook receiver for ${destNetwork}`);
    } else {
      console.log(`✅ ${destNetwork} already has correct hook receiver`);
    }
  }
  
  console.log("\n✅ CCTP Configuration Complete!");
  console.log("=====================================");
  
  // Display configured routes
  console.log("\n📊 Configured CCTP Routes:");
  console.log(`From ${network} USDC to:`);
  
  for (const [destNetwork, destChainId] of Object.entries(CHAIN_IDS)) {
    if (destNetwork === network) continue;
    
    const domain = await routeProcessor.chainIdToCCTPDomain(destChainId);
    const receiver = await routeProcessor.cctpHookReceivers(destChainId);
    
    if (domain > 0 && receiver !== ethers.ZeroAddress) {
      console.log(`  ✅ ${destNetwork}: Domain ${domain}, Receiver ${receiver.slice(0, 8)}...`);
    } else {
      console.log(`  ❌ ${destNetwork}: Not configured`);
    }
  }
  
  console.log("\n💡 Next Steps:");
  console.log("1. Run the same script on other networks to configure their routes");
  console.log("2. Test transfers with: npx hardhat run scripts/test-cctp-all-chains.js --network", network);
  console.log("3. Check configuration with: npx hardhat run scripts/read-route-config.js --network", network);
}

async function main() {
  console.log("🌐 CCTP Route Configuration");
  console.log("=====================================");
  
  const network = hre.network.name;
  
  if (!ROUTE_PROCESSORS[network]) {
    console.log("❌ No RouteProcessor deployed on this network");
    return;
  }
  
  await configureCCTPRoutes();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
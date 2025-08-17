const { ethers } = require("hardhat");

// Contract addresses
const CONTRACTS = {
  sepolia: {
    routeProcessor: "0xD039Cb6B9BbAb2DE0Ae0D92F1DdCb8e6A4Dc88de",
    usdc: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238"
  },
  baseSepolia: {
    routeProcessor: "0xD1e60637cA70C786B857452E50DE8353a01DabBb",
    usdc: "0x036CbD53842c5426634e7929541eC2318f3dCF7e"
  },
  arbitrumSepolia: {
    routeProcessor: "0xA450EB7baB661aC2C42F51B8f1e9A5BFc1fA6dE3",
    usdc: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d"
  }
};

async function main() {
  const network = hre.network.name;
  console.log(`\n🔍 Checking CCTP Configuration on ${network}\n`);
  console.log("=====================================\n");
  
  if (!CONTRACTS[network]) {
    console.log("❌ No contracts deployed on this network");
    return;
  }
  
  const routeProcessor = await ethers.getContractAt("RouteProcessor", CONTRACTS[network].routeProcessor);
  
  // Check if USDC is configured
  console.log("📋 Token Configuration:");
  const isUSDC = await routeProcessor.isUSDC(CONTRACTS[network].usdc);
  console.log(`USDC (${CONTRACTS[network].usdc}):`);
  console.log(`  Configured as CCTP token: ${isUSDC ? "✅" : "❌"}`);
  
  // Check CCTP domains
  console.log("\n🌐 CCTP Domain Mappings:");
  const chains = {
    "Sepolia": 11155111,
    "Base Sepolia": 84532,
    "Arbitrum Sepolia": 421614
  };
  
  for (const [name, chainId] of Object.entries(chains)) {
    const domain = await routeProcessor.chainIdToCCTPDomain(chainId);
    console.log(`  ${name} (${chainId}): Domain ${domain}`);
  }
  
  // Check hook receivers
  console.log("\n📮 CCTP Hook Receivers:");
  for (const [name, chainId] of Object.entries(chains)) {
    if (name.toLowerCase().replace(" ", "") === network) continue;
    
    const receiver = await routeProcessor.cctpHookReceivers(chainId);
    if (receiver !== ethers.ZeroAddress) {
      console.log(`  ${name}: ${receiver}`);
    } else {
      console.log(`  ${name}: Not configured`);
    }
  }
  
  // Check if we can execute CCTP
  console.log("\n🚀 CCTP Execution Test:");
  console.log("The executeCCTP function expects:");
  console.log("  1. Token address (must be configured as USDC)");
  console.log("  2. Amount to transfer");
  console.log("  3. Destination chain ID");
  console.log("  4. Recipient address");
  
  if (isUSDC) {
    console.log("\n✅ USDC is configured - CCTP transfers should work!");
    console.log("Note: CCTP domains might be 0 for testnets, but transfers may still work");
  } else {
    console.log("\n❌ USDC not configured - need to call configureToken() first");
  }
  
  // Show available functions
  console.log("\n📝 Available Configuration Functions:");
  console.log("  • configureToken(token, isUSDC, oftAddress, stargatePoolId)");
  console.log("  • setCCTPHookReceiver(destChainId, receiver)");
  console.log("  • setDestinationOFTAddress(destChainId, token, destOFT)");
  
  // Check ownership
  const [signer] = await ethers.getSigners();
  const owner = await routeProcessor.owner();
  console.log("\n👤 Ownership:");
  console.log(`  Contract owner: ${owner}`);
  console.log(`  Your address: ${signer.address}`);
  console.log(`  Can configure: ${owner.toLowerCase() === signer.address.toLowerCase() ? "✅" : "❌"}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
const hre = require("hardhat");
const { ethers } = require("hardhat");

// Deployed contracts
const DEPLOYED = {
  swapExecutor: "0xD1e60637cA70C786B857452E50DE8353a01DabBb",
  feeManager: "0xD84F50DcdeC8e3E84c970d708ccbE5a3c5D68a79",
  hookReceiver: "0xE99A9fF893B3aE1A86bCA965ddCe5e982773ff14",
  routeProcessor: "0xD039Cb6B9BbAb2DE0Ae0D92F1DdCb8e6A4Dc88de",
  stableRouter: "0x44A0DBcAe62a90De8E967c87aF1D670c8E0b42d0"
};

async function main() {
  console.log("🔍 Getting implementation addresses for proxy contracts...\n");
  
  // Get implementation addresses for proxies
  const provider = ethers.provider;
  
  // Storage slot for implementation address in UUPS proxy
  // keccak256("eip1967.proxy.implementation") - 1
  const IMPLEMENTATION_SLOT = "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";
  
  try {
    // Get StableRouter implementation
    const stableRouterImpl = await provider.getStorage(DEPLOYED.stableRouter, IMPLEMENTATION_SLOT);
    const stableRouterImplAddress = "0x" + stableRouterImpl.slice(-40);
    console.log("StableRouter Proxy:", DEPLOYED.stableRouter);
    console.log("StableRouter Implementation:", stableRouterImplAddress);
    
    // Get RouteProcessor implementation  
    const routeProcessorImpl = await provider.getStorage(DEPLOYED.routeProcessor, IMPLEMENTATION_SLOT);
    const routeProcessorImplAddress = "0x" + routeProcessorImpl.slice(-40);
    console.log("\nRouteProcessor Proxy:", DEPLOYED.routeProcessor);
    console.log("RouteProcessor Implementation:", routeProcessorImplAddress);
    
    console.log("\n📋 Verification Commands:\n");
    console.log("# Regular contracts (non-proxy):");
    console.log(`npx hardhat verify --network sepolia ${DEPLOYED.swapExecutor} "0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E"`);
    console.log(`npx hardhat verify --network sepolia ${DEPLOYED.feeManager} "0xFC825D166f219ea5Aa75d993609eae546E013cEE"`);
    console.log(`npx hardhat verify --network sepolia ${DEPLOYED.hookReceiver} "${DEPLOYED.swapExecutor}" "0x7865fAfC2db2093669d92c0F33AeEF291086BEFD" "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238"`);
    
    console.log("\n# Proxy implementations:");
    console.log(`npx hardhat verify --network sepolia ${stableRouterImplAddress}`);
    console.log(`npx hardhat verify --network sepolia ${routeProcessorImplAddress}`);
    
    console.log("\n# To verify proxies (after implementations are verified):");
    console.log("Go to Etherscan for each proxy address and:");
    console.log("1. Click 'More Options' -> 'Is this a Proxy?'");
    console.log("2. Click 'Verify'");
    console.log("3. Etherscan will automatically link the proxy to its implementation");
    
  } catch (error) {
    console.error("Error:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
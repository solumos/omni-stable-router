const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Verifying Contract Deployments\n");
  console.log("=====================================\n");
  
  const contracts = {
    "StableRouter (0x44A0DBcAe62a90De8E967c87aF1D670c8E0b42d0)": "0x44A0DBcAe62a90De8E967c87aF1D670c8E0b42d0",
    "RouteProcessor (0xD039Cb6B9BbAb2DE0Ae0D92F1DdCb8e6A4Dc88de)": "0xD039Cb6B9BbAb2DE0Ae0D92F1DdCb8e6A4Dc88de"
  };
  
  for (const [name, address] of Object.entries(contracts)) {
    console.log(`\n📋 ${name}:`);
    
    // Check if contract exists
    const code = await ethers.provider.getCode(address);
    if (code === "0x" || code === "0x00") {
      console.log("❌ No contract at this address!");
      continue;
    }
    
    console.log("✅ Contract exists");
    console.log("📏 Code size:", code.length, "bytes");
    
    // Try to call common functions
    const contract = new ethers.Contract(
      address,
      [
        "function owner() view returns (address)",
        "function paused() view returns (bool)",
        "function executeCCTP(address,uint256,uint256,address) external",
        "function executeRoute(tuple(address,address,uint256,uint256,address,uint256,bytes,uint256)) external",
        "function routeProcessor() view returns (address)",
        "function isUSDC(address) view returns (bool)",
        "function chainIdToCCTPDomain(uint256) view returns (uint32)"
      ],
      ethers.provider
    );
    
    // Try owner
    try {
      const owner = await contract.owner();
      console.log("👤 Owner:", owner);
    } catch (e) {
      console.log("⚠️  No owner() function or error calling it");
    }
    
    // Try paused
    try {
      const paused = await contract.paused();
      console.log("⏸️  Paused:", paused);
    } catch (e) {
      console.log("⚠️  No paused() function");
    }
    
    // Check for executeCCTP
    try {
      // Just check if function exists by estimating gas with dummy params
      await contract.executeCCTP.estimateGas(
        ethers.ZeroAddress,
        0,
        0,
        ethers.ZeroAddress
      );
      console.log("✅ Has executeCCTP function");
    } catch (e) {
      if (e.message.includes("Token not USDC") || e.message.includes("Invalid amount")) {
        console.log("✅ Has executeCCTP function (validation failed as expected)");
      } else {
        console.log("❌ No executeCCTP function");
      }
    }
    
    // Check for executeRoute
    try {
      const dummyRoute = {
        sourceToken: ethers.ZeroAddress,
        destToken: ethers.ZeroAddress,
        amount: 0,
        destChainId: 0,
        recipient: ethers.ZeroAddress,
        minAmountOut: 0,
        routeData: "0x",
        deadline: 0
      };
      await contract.executeRoute.estimateGas(dummyRoute);
      console.log("✅ Has executeRoute function");
    } catch (e) {
      if (e.message.includes("validation") || e.message.includes("Invalid")) {
        console.log("✅ Has executeRoute function (validation failed as expected)");
      } else {
        console.log("❌ No executeRoute function");
      }
    }
  }
  
  console.log("\n\n🎯 DIAGNOSIS:");
  console.log("=====================================");
  console.log("If the contracts don't have the expected functions,");
  console.log("they may be:");
  console.log("1. Different contracts entirely");
  console.log("2. Proxy contracts pointing to wrong implementations");
  console.log("3. Old versions that need upgrading");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
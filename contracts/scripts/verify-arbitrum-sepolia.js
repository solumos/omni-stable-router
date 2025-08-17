const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🔍 Starting Arbitrum Sepolia Contract Verification...\n");
  
  // Load deployment data
  const deploymentPath = path.join(__dirname, "../deployments/arbitrum-sepolia.json");
  if (!fs.existsSync(deploymentPath)) {
    console.error("❌ Deployment data not found. Please deploy first.");
    process.exit(1);
  }
  
  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  
  console.log("📋 Contracts to verify:");
  console.log("├── SwapExecutor:", deployment.contracts.SwapExecutor);
  console.log("├── CCTPHookReceiver:", deployment.contracts.CCTPHookReceiver);
  console.log("└── RouteProcessor:", deployment.contracts.RouteProcessor);
  console.log("\n=====================================\n");
  
  const results = [];
  
  // Verify SwapExecutor
  console.log("1️⃣ Verifying SwapExecutor...");
  try {
    await hre.run("verify:verify", {
      address: deployment.contracts.SwapExecutor,
      constructorArguments: [deployment.configuration.uniswapV3Router]
    });
    console.log("✅ SwapExecutor verified");
    results.push("✅ SwapExecutor");
  } catch (error) {
    if (error.message.includes("already verified")) {
      console.log("✅ SwapExecutor already verified");
      results.push("✅ SwapExecutor (already verified)");
    } else {
      console.error("❌ SwapExecutor verification failed:", error.message);
      results.push("❌ SwapExecutor");
    }
  }
  
  // Verify CCTPHookReceiver
  console.log("\n2️⃣ Verifying CCTPHookReceiver...");
  try {
    await hre.run("verify:verify", {
      address: deployment.contracts.CCTPHookReceiver,
      constructorArguments: [
        deployment.contracts.SwapExecutor,
        deployment.configuration.cctpMessageTransmitter,
        deployment.configuration.usdc
      ]
    });
    console.log("✅ CCTPHookReceiver verified");
    results.push("✅ CCTPHookReceiver");
  } catch (error) {
    if (error.message.includes("already verified")) {
      console.log("✅ CCTPHookReceiver already verified");
      results.push("✅ CCTPHookReceiver (already verified)");
    } else {
      console.error("❌ CCTPHookReceiver verification failed:", error.message);
      results.push("❌ CCTPHookReceiver");
    }
  }
  
  // Verify RouteProcessor (proxy implementation)
  console.log("\n3️⃣ Verifying RouteProcessor...");
  try {
    // For upgradeable contracts, we need to verify the implementation
    await hre.run("verify:verify", {
      address: deployment.contracts.RouteProcessor,
      constructorArguments: []  // Proxies don't have constructor arguments
    });
    console.log("✅ RouteProcessor verified");
    results.push("✅ RouteProcessor");
  } catch (error) {
    if (error.message.includes("already verified")) {
      console.log("✅ RouteProcessor already verified");
      results.push("✅ RouteProcessor (already verified)");
    } else {
      console.error("❌ RouteProcessor verification failed:", error.message);
      results.push("❌ RouteProcessor");
    }
  }
  
  console.log("\n=====================================");
  console.log("📊 Verification Summary:");
  results.forEach(result => console.log("  " + result));
  
  console.log("\n🔗 View contracts on Arbiscan:");
  console.log(`├── SwapExecutor: https://sepolia.arbiscan.io/address/${deployment.contracts.SwapExecutor}`);
  console.log(`├── CCTPHookReceiver: https://sepolia.arbiscan.io/address/${deployment.contracts.CCTPHookReceiver}`);
  console.log(`└── RouteProcessor: https://sepolia.arbiscan.io/address/${deployment.contracts.RouteProcessor}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
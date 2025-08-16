const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const network = hre.network.name;
  const deploymentPath = path.join(__dirname, `../deployments/${network}.json`);
  
  if (!fs.existsSync(deploymentPath)) {
    console.error(`No deployment found for network: ${network}`);
    console.error(`Expected file: ${deploymentPath}`);
    process.exit(1);
  }
  
  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  
  console.log(`Verifying contracts on ${network}...`);
  console.log("Chain ID:", deployment.chainId);
  
  // Verify FeeManager
  console.log("\nVerifying FeeManager...");
  try {
    await hre.run("verify:verify", {
      address: deployment.contracts.FeeManager,
      constructorArguments: [deployment.deployer]
    });
    console.log("FeeManager verified!");
  } catch (error) {
    console.log("FeeManager verification failed:", error.message);
  }
  
  // Verify SwapExecutor
  console.log("\nVerifying SwapExecutor...");
  try {
    await hre.run("verify:verify", {
      address: deployment.contracts.SwapExecutor,
      constructorArguments: []
    });
    console.log("SwapExecutor verified!");
  } catch (error) {
    console.log("SwapExecutor verification failed:", error.message);
  }
  
  // Verify RouteProcessor implementation
  console.log("\nVerifying RouteProcessor implementation...");
  try {
    // Get implementation address
    const implAddress = await hre.upgrades.erc1967.getImplementationAddress(
      deployment.contracts.RouteProcessor
    );
    
    await hre.run("verify:verify", {
      address: implAddress,
      constructorArguments: []
    });
    console.log("RouteProcessor implementation verified!");
  } catch (error) {
    console.log("RouteProcessor verification failed:", error.message);
  }
  
  // Verify StableRouter implementation
  console.log("\nVerifying StableRouter implementation...");
  try {
    // Get implementation address
    const implAddress = await hre.upgrades.erc1967.getImplementationAddress(
      deployment.contracts.StableRouter
    );
    
    await hre.run("verify:verify", {
      address: implAddress,
      constructorArguments: []
    });
    console.log("StableRouter implementation verified!");
  } catch (error) {
    console.log("StableRouter verification failed:", error.message);
  }
  
  console.log("\n=== Verification Complete ===");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
const { ethers } = require("hardhat");
const fs = require("fs");

async function deployUnifiedRouter() {
  const network = hre.network.name;
  const [deployer] = await ethers.getSigners();
  
  console.log("========================================");
  console.log(`Deploying UnifiedRouter to ${network}`);
  console.log("========================================\n");
  console.log("Network:", network);
  console.log("Deployer:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Balance:", ethers.formatEther(balance), "ETH");
  
  // Get current gas price
  const feeData = await ethers.provider.getFeeData();
  console.log("Current gas price:", ethers.formatUnits(feeData.gasPrice, "gwei"), "gwei\n");
  
  // Deploy UnifiedRouter
  console.log("Deploying UnifiedRouter...");
  const UnifiedRouter = await ethers.getContractFactory("UnifiedRouter");
  
  try {
    // Deploy with increased gas price for faster inclusion
    const gasPrice = feeData.gasPrice * 120n / 100n; // 20% increase
    const router = await UnifiedRouter.deploy(deployer.address, {
      gasPrice: gasPrice
    });
    
    console.log("TX sent:", router.deploymentTransaction().hash);
    console.log("Waiting for deployment...");
    
    await router.waitForDeployment();
    
    const routerAddress = await router.getAddress();
    console.log("\n✅ UnifiedRouter deployed successfully!");
    console.log("Address:", routerAddress);
    
    // Save deployment info
    const deploymentInfo = {
      network: network,
      router: routerAddress,
      deployer: deployer.address,
      timestamp: new Date().toISOString(),
      chainId: (await ethers.provider.getNetwork()).chainId.toString()
    };
    
    const deploymentPath = `./deployments/${network}-unified-router.json`;
    fs.mkdirSync("./deployments", { recursive: true });
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
    console.log(`\n💾 Deployment info saved to ${deploymentPath}`);
    
    console.log("\n========================================");
    console.log("✅ Deployment Complete!");
    console.log("========================================");
    console.log("\nNext steps:");
    console.log("1. Run configure-protocols.js to set protocol addresses");
    console.log("2. Run configure-routes.js to set up token routes");
    console.log("3. Run verify-routes.js to verify configuration");
    
    return routerAddress;
  } catch (error) {
    console.error("\n❌ Deployment failed:", error.message);
    
    if (error.message.includes("timeout")) {
      console.log("\n💡 Tips for timeout issues:");
      console.log("- Check network status at https://sepolia.etherscan.io");
      console.log("- Try increasing gas price");
      console.log("- Ensure you have enough ETH for gas");
    }
    
    throw error;
  }
}

async function main() {
  try {
    await deployUnifiedRouter();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
const hre = require("hardhat");
const { ethers } = require("hardhat");
const { formatEther } = require("ethers");

async function main() {
  console.log("🔧 Testing deployment on", hre.network.name);
  
  const [deployer] = await ethers.getSigners();
  console.log("👤 Deployer:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 Balance:", formatEther(balance), "ETH");
  
  console.log("\n📦 Deploying a simple test contract...");
  
  try {
    // Deploy FeeManager as a test (simpler contract)
    const FeeManager = await ethers.getContractFactory("FeeManager");
    console.log("Contract factory created");
    
    const feeManager = await FeeManager.deploy(deployer.address);
    console.log("Deploy transaction sent, waiting for confirmation...");
    console.log("Transaction hash:", feeManager.deploymentTransaction()?.hash);
    
    await feeManager.waitForDeployment();
    const address = await feeManager.getAddress();
    
    console.log("✅ FeeManager deployed to:", address);
    
    // Check deployment
    const owner = await feeManager.owner();
    console.log("📋 Contract owner:", owner);
    
  } catch (error) {
    console.error("❌ Deployment failed:", error.message);
    if (error.reason) console.error("Reason:", error.reason);
    if (error.code) console.error("Code:", error.code);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
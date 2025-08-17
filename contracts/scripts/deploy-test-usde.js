const { ethers } = require("hardhat");

async function main() {
  console.log("🪙 Deploying Test USDe Token on Base Sepolia");
  console.log("=============================================\n");
  
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  
  if (chainId !== 84532) {
    throw new Error("This script is for Base Sepolia only (84532)");
  }
  
  const [deployer] = await ethers.getSigners();
  
  console.log("👤 Deployer:", deployer.address);
  console.log("💰 ETH Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)));
  
  // Deploy a test USDe token (ERC20) for LayerZero testing
  console.log("\n🚀 Deploying Test USDe Token...");
  
  const TestToken = await ethers.getContractFactory("TestToken");
  const usde = await TestToken.deploy(
    "Test Ethena USD",  // name
    "USDe",            // symbol  
    18,                // decimals
    ethers.parseEther("1000000") // 1M USDe initial supply
  );
  
  await usde.waitForDeployment();
  const usdeAddress = await usde.getAddress();
  
  console.log("✅ Test USDe deployed to:", usdeAddress);
  
  // Mint some USDe to the deployer for testing
  console.log("\n💰 Minting test USDe...");
  const mintAmount = ethers.parseEther("1000"); // 1000 USDe
  const mintTx = await usde.mint(deployer.address, mintAmount);
  await mintTx.wait();
  
  console.log(`✅ Minted ${ethers.formatEther(mintAmount)} USDe to ${deployer.address}`);
  
  // Check balance
  const balance = await usde.balanceOf(deployer.address);
  console.log(`📊 USDe Balance: ${ethers.formatEther(balance)} USDe`);
  
  // Save deployment info
  const deploymentInfo = {
    network: "Base Sepolia",
    chainId: chainId,
    usde: {
      address: usdeAddress,
      name: "Test Ethena USD",
      symbol: "USDe", 
      decimals: 18,
      totalSupply: "1000000",
      deployerBalance: ethers.formatEther(balance)
    },
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
    transactionHash: usde.deploymentTransaction()?.hash
  };
  
  const fs = require('fs');
  const path = require('path');
  
  const deploymentsDir = path.join(__dirname, '..', 'deployments');
  const filepath = path.join(deploymentsDir, 'test_usde_base_sepolia.json');
  
  fs.writeFileSync(filepath, JSON.stringify(deploymentInfo, null, 2));
  console.log(`📄 Deployment info saved to: ${filepath}`);
  
  console.log("\n" + "=".repeat(50));
  console.log("🎯 Test USDe Deployment Complete!");
  console.log("=".repeat(50));
  console.log(`📍 USDe Address: ${usdeAddress}`);
  console.log(`🔗 View on Explorer: https://sepolia.basescan.org/address/${usdeAddress}`);
  console.log(`💰 Your USDe Balance: ${ethers.formatEther(balance)} USDe`);
  
  console.log("\n📋 Next Steps:");
  console.log("1. ✅ Update frontend config with new USDe address");
  console.log("2. 🧪 Configure LayerZero compose route USDe → USDC");
  console.log("3. 🔄 Test cross-chain compose functionality");
  console.log("4. 📊 Monitor LayerZero message execution");
  
  console.log("\n🔧 For LayerZero testing:");
  console.log(`- Source token: ${usdeAddress} (USDe)`);
  console.log("- Target token: 0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d (USDC on Arbitrum)");
  console.log("- Protocol: LayerZero Compose");
  console.log("- Flow: Send USDe, receive USDC via cross-chain swap");
  
  try {
    await hre.run("verify:verify", {
      address: usdeAddress,
      constructorArguments: [
        "Test Ethena USD",
        "USDe", 
        18,
        ethers.parseEther("1000000")
      ],
    });
    console.log("✅ Contract verified on BaseScan");
  } catch (e) {
    console.log("⚠️  Contract verification failed:", e.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
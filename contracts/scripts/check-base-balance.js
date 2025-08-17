const { ethers } = require("hardhat");
const { formatEther } = require("ethers");

async function main() {
  const network = hre.network.name;
  
  if (network !== "baseSepolia") {
    console.log("⚠️  Please run with: --network baseSepolia");
    process.exit(1);
  }
  
  console.log("🔷 Base Sepolia Account Check\n");
  console.log("=====================================\n");
  
  const [signer] = await ethers.getSigners();
  console.log("👤 Your address:", signer.address);
  
  const balance = await ethers.provider.getBalance(signer.address);
  console.log("💰 ETH Balance:", formatEther(balance), "ETH");
  
  if (balance < ethers.parseEther("0.01")) {
    console.log("\n⚠️  You need ETH on Base Sepolia!");
    console.log("\n📝 How to get Base Sepolia ETH:");
    console.log("1. First, get Sepolia ETH:");
    console.log("   • https://sepoliafaucet.com");
    console.log("   • https://www.infura.io/faucet/sepolia");
    console.log("\n2. Bridge to Base Sepolia:");
    console.log("   • Go to: https://bridge.base.org");
    console.log("   • Connect wallet");
    console.log("   • Switch to Sepolia network");
    console.log("   • Bridge ETH to Base Sepolia");
    console.log("   • Wait ~2 minutes for bridge to complete");
  } else {
    console.log("\n✅ Sufficient balance for deployment!");
    console.log("\n🚀 Ready to deploy:");
    console.log("   npx hardhat run scripts/deploy-base-sepolia.js --network baseSepolia");
  }
  
  // Check network config
  const chainId = (await ethers.provider.getNetwork()).chainId;
  console.log("\n🔗 Network Info:");
  console.log("   Chain ID:", chainId.toString());
  console.log("   Expected:", "84532");
  console.log("   Match:", chainId.toString() === "84532" ? "✅" : "❌");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
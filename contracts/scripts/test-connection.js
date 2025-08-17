const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
  console.log("🔗 Testing connection to", hre.network.name);
  console.log("=====================================\n");
  
  try {
    // Try to get signer
    const signers = await ethers.getSigners();
    
    if (signers.length === 0) {
      console.log("❌ No signers available. Please set PRIVATE_KEY in .env file");
      console.log("\nTo set up:");
      console.log("1. Copy .env.example to .env");
      console.log("   cp .env.example .env");
      console.log("2. Add your testnet private key to .env");
      console.log("   PRIVATE_KEY=your_private_key_here");
      console.log("\n⚠️  Use a testnet-only wallet, never use mainnet keys!");
      return;
    }
    
    const [deployer] = signers;
    console.log("✅ Connected successfully!");
    console.log("👤 Deployer address:", deployer.address);
    
    // Try to get balance
    const balance = await deployer.getBalance();
    console.log("💰 Balance:", ethers.utils.formatEther(balance), "ETH");
    
    // Try to get block number
    const blockNumber = await ethers.provider.getBlockNumber();
    console.log("📦 Current block:", blockNumber);
    
    // Try to get chain ID
    const network = await ethers.provider.getNetwork();
    console.log("🔗 Chain ID:", network.chainId);
    
    if (balance.eq(0)) {
      console.log("\n⚠️  Warning: Account has 0 ETH!");
      console.log("Get testnet ETH from:");
      console.log("- https://sepoliafaucet.com");
      console.log("- https://www.infura.io/faucet/sepolia");
      console.log("- https://faucets.chain.link/sepolia");
    }
    
  } catch (error) {
    console.error("❌ Connection failed:", error.message);
    
    if (error.message.includes("invalid account")) {
      console.log("\n📝 Setup Instructions:");
      console.log("1. Copy .env.example to .env");
      console.log("   cp .env.example .env");
      console.log("2. Add your testnet private key to .env");
      console.log("   PRIVATE_KEY=your_private_key_here");
    } else if (error.code === 'ETIMEDOUT' || error.code === 'UND_ERR_HEADERS_TIMEOUT') {
      console.log("\n🌐 Network timeout. Try:");
      console.log("1. Check your internet connection");
      console.log("2. Use a different RPC endpoint in .env:");
      console.log("   SEPOLIA_RPC=https://rpc.ankr.com/eth_sepolia");
      console.log("   or");
      console.log("   SEPOLIA_RPC=https://ethereum-sepolia.publicnode.com");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
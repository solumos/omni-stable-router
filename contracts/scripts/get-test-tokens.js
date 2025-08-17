const { ethers } = require("hardhat");
const { formatUnits } = require("ethers");

const USDC = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238"; // Sepolia USDC

async function main() {
  console.log("💧 Test Token Helper\n");
  console.log("=====================================\n");
  
  const [signer] = await ethers.getSigners();
  console.log("👤 Your address:", signer.address);
  
  // Check USDC balance
  const usdc = await ethers.getContractAt("IERC20", USDC);
  const balance = await usdc.balanceOf(signer.address);
  console.log("💰 Current USDC balance:", formatUnits(balance, 6), "USDC\n");
  
  if (balance == 0n) {
    console.log("📝 You need test USDC! Here's how to get it:\n");
    
    console.log("Option 1: Circle's Testnet Faucet (Recommended)");
    console.log("================================================");
    console.log("1. Go to: https://faucet.circle.com");
    console.log("2. Connect your wallet");
    console.log("3. Select 'Ethereum Sepolia' network");
    console.log("4. Request USDC");
    console.log("5. You'll receive 10 USDC\n");
    
    console.log("Option 2: Aave Sepolia Faucet");
    console.log("==============================");
    console.log("1. Go to: https://staging.aave.com/faucet/");
    console.log("2. Switch to Sepolia network");
    console.log("3. Request USDC\n");
    
    console.log("📋 Your wallet address to copy:");
    console.log(signer.address);
    console.log("\n⚠️  Make sure you're on Sepolia network in MetaMask!");
    
  } else {
    console.log("✅ You have USDC! You're ready to test.\n");
    console.log("🚀 Next steps:");
    console.log("1. Run contract tests:");
    console.log("   npx hardhat run scripts/test-live-contracts.js --network sepolia");
    console.log("\n2. Test a CCTP transfer:");
    console.log("   npx hardhat run scripts/test-cctp-transfer.js --network sepolia");
  }
  
  // Also check ETH balance
  const ethBalance = await ethers.provider.getBalance(signer.address);
  console.log("\n⛽ ETH balance:", ethers.formatEther(ethBalance), "ETH");
  if (ethBalance < ethers.parseEther("0.01")) {
    console.log("⚠️  Low ETH! Get more from: https://sepoliafaucet.com");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
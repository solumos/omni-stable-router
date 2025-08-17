const { ethers } = require("hardhat");

async function main() {
  console.log("Testing Web App Connection to Local Fork");
  console.log("=========================================\n");

  // Get the deployed UnifiedRouter
  const routerAddress = "0x6e572fb734be64ec1465d1472ed40f41b74dd83e";
  const router = await ethers.getContractAt("UnifiedRouter", routerAddress);
  
  console.log("✅ UnifiedRouter deployed at:", routerAddress);
  
  // Check owner
  const owner = await router.owner();
  console.log("📋 Contract owner:", owner);
  
  // Get test accounts
  const [signer] = await ethers.getSigners();
  console.log("🔑 Test account:", signer.address);
  
  // Check ETH balance
  const balance = await ethers.provider.getBalance(signer.address);
  console.log("💰 ETH balance:", ethers.formatEther(balance), "ETH");
  
  // Check USDC balance (Base mainnet USDC)
  const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
  const usdcContract = await ethers.getContractAt("IERC20", USDC);
  const usdcBalance = await usdcContract.balanceOf(signer.address);
  console.log("💵 USDC balance:", ethers.formatUnits(usdcBalance, 6), "USDC");
  
  console.log("\n=========================================");
  console.log("Web App Configuration:");
  console.log("=========================================");
  console.log("1. Open http://localhost:3000 in your browser");
  console.log("2. Connect your wallet (MetaMask recommended)");
  console.log("3. Add the Localhost network:");
  console.log("   - Network Name: Localhost (Base Fork)");
  console.log("   - RPC URL: http://127.0.0.1:8545");
  console.log("   - Chain ID: 31337");
  console.log("   - Currency Symbol: ETH");
  console.log("\n4. Import test account (if using MetaMask):");
  console.log("   Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80");
  console.log("   (This is Hardhat's first default account)");
  console.log("\n5. You should see:");
  console.log("   - Network: Localhost (Base Fork)");
  console.log("   - Available tokens: USDC, USDe");
  console.log("   - UnifiedRouter contract connected");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
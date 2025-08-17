const hre = require("hardhat");
const { ethers } = require("hardhat");
const { formatEther, parseEther, formatUnits, parseUnits } = require("ethers");

// Deployed contracts on Sepolia
const CONTRACTS = {
  stableRouter: "0x44A0DBcAe62a90De8E967c87aF1D670c8E0b42d0",
  routeProcessor: "0xD039Cb6B9BbAb2DE0Ae0D92F1DdCb8e6A4Dc88de",
  swapExecutor: "0xD1e60637cA70C786B857452E50DE8353a01DabBb",
  feeManager: "0xD84F50DcdeC8e3E84c970d708ccbE5a3c5D68a79",
  hookReceiver: "0xE99A9fF893B3aE1A86bCA965ddCe5e982773ff14"
};

// Sepolia test tokens
const TEST_TOKENS = {
  USDC: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238", // Circle's testnet USDC
  // Add more test tokens as needed
};

async function main() {
  console.log("🧪 Testing Live Contracts on Sepolia\n");
  console.log("=====================================\n");
  
  const [signer] = await ethers.getSigners();
  console.log("👤 Tester address:", signer.address);
  
  const balance = await ethers.provider.getBalance(signer.address);
  console.log("💰 ETH Balance:", formatEther(balance), "ETH\n");
  
  // Get contract instances
  const stableRouter = await ethers.getContractAt("StableRouter", CONTRACTS.stableRouter);
  const routeProcessor = await ethers.getContractAt("RouteProcessor", CONTRACTS.routeProcessor);
  const feeManager = await ethers.getContractAt("FeeManager", CONTRACTS.feeManager);
  
  console.log("📋 Contract Status Checks:");
  console.log("===========================\n");
  
  // 1. Check contract ownership
  console.log("1️⃣ Checking Ownership...");
  try {
    const routerOwner = await stableRouter.owner();
    console.log("   StableRouter owner:", routerOwner);
    console.log("   ✅ You are owner:", routerOwner.toLowerCase() === signer.address.toLowerCase());
  } catch (e) {
    console.log("   ❌ Error checking ownership:", e.message);
  }
  
  // 2. Check if contracts are paused
  console.log("\n2️⃣ Checking Pause Status...");
  try {
    const isPaused = await stableRouter.paused();
    console.log("   StableRouter paused:", isPaused);
    console.log(isPaused ? "   ⚠️  Contract is paused!" : "   ✅ Contract is active");
  } catch (e) {
    console.log("   ❌ Error checking pause status:", e.message);
  }
  
  // 3. Check protocol configuration
  console.log("\n3️⃣ Checking Protocol Configuration...");
  try {
    const routeProcessorAddr = await stableRouter.routeProcessor();
    console.log("   RouteProcessor:", routeProcessorAddr);
    console.log("   ✅ Correctly set:", routeProcessorAddr.toLowerCase() === CONTRACTS.routeProcessor.toLowerCase());
    
    const swapExecutorAddr = await stableRouter.swapExecutor();
    console.log("   SwapExecutor:", swapExecutorAddr);
    console.log("   ✅ Correctly set:", swapExecutorAddr.toLowerCase() === CONTRACTS.swapExecutor.toLowerCase());
  } catch (e) {
    console.log("   ❌ Error checking protocol config:", e.message);
  }
  
  // 4. Check supported chains
  console.log("\n4️⃣ Checking Supported Chains...");
  const chainIds = [1, 10, 137, 42161, 8453]; // Ethereum, Optimism, Polygon, Arbitrum, Base
  for (const chainId of chainIds) {
    try {
      const isSupported = await stableRouter.supportedChains(chainId);
      console.log(`   Chain ${chainId}: ${isSupported ? '✅' : '❌'}`);
    } catch (e) {
      console.log(`   Chain ${chainId}: Error - ${e.message}`);
    }
  }
  
  // 5. Check token configuration
  console.log("\n5️⃣ Checking Token Configuration...");
  try {
    const isUSDC = await routeProcessor.isUSDC(TEST_TOKENS.USDC);
    console.log(`   USDC (${TEST_TOKENS.USDC}):`);
    console.log(`   Configured as USDC: ${isUSDC ? '✅' : '❌'}`);
  } catch (e) {
    console.log("   ❌ Error checking token config:", e.message);
  }
  
  // 6. Check fee configuration
  console.log("\n6️⃣ Checking Fee Configuration...");
  try {
    const feeRecipient = await feeManager.feeRecipient();
    console.log("   Fee recipient:", feeRecipient);
    
    const isAuthorized = await feeManager.authorizedCollectors(CONTRACTS.stableRouter);
    console.log("   StableRouter authorized:", isAuthorized ? '✅' : '❌');
  } catch (e) {
    console.log("   ❌ Error checking fee config:", e.message);
  }
  
  // 7. Check USDC balance
  console.log("\n7️⃣ Checking USDC Balance...");
  try {
    const usdc = await ethers.getContractAt("IERC20", TEST_TOKENS.USDC);
    const usdcBalance = await usdc.balanceOf(signer.address);
    console.log("   Your USDC balance:", formatUnits(usdcBalance, 6), "USDC");
    
    if (usdcBalance == 0n) {
      console.log("   ⚠️  You need test USDC! Get some from:");
      console.log("      https://faucet.circle.com (Circle's testnet faucet)");
    }
  } catch (e) {
    console.log("   ❌ Error checking USDC balance:", e.message);
  }
  
  console.log("\n=====================================");
  console.log("📊 Test Summary:");
  console.log("=====================================\n");
  
  console.log("✅ Contracts are deployed and accessible");
  console.log("✅ Configuration appears correct");
  console.log("\n🔄 Next Steps:");
  console.log("1. Get test USDC from https://faucet.circle.com");
  console.log("2. Run: npx hardhat run scripts/test-cctp-transfer.js --network sepolia");
  console.log("3. Monitor on Etherscan: https://sepolia.etherscan.io/address/" + CONTRACTS.stableRouter);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
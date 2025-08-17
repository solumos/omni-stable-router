const { ethers } = require("hardhat");
const { parseUnits } = require("ethers");

async function main() {
  console.log("🔍 Debugging CCTP Call on Sepolia\n");
  
  const [signer] = await ethers.getSigners();
  const routeProcessor = await ethers.getContractAt(
    "RouteProcessor",
    "0xD039Cb6B9BbAb2DE0Ae0D92F1DdCb8e6A4Dc88de"
  );
  
  // Check USDC configuration
  const usdcAddress = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";
  console.log("1️⃣ Checking if USDC is configured...");
  try {
    const isConfigured = await routeProcessor.isUSDC(usdcAddress);
    console.log("Is USDC configured:", isConfigured);
  } catch (e) {
    console.log("Error checking USDC:", e.message);
  }
  
  // Check destination domain for Base Sepolia
  const baseSepoliaChainId = 84532;
  console.log("\n2️⃣ Checking CCTP domain for Base Sepolia (84532)...");
  try {
    const domain = await routeProcessor.chainIdToCCTPDomain(baseSepoliaChainId);
    console.log("CCTP Domain:", domain);
    if (domain == 0) {
      console.log("❌ Domain is 0 - this will cause 'Invalid destination domain' error!");
    }
  } catch (e) {
    console.log("Error checking domain:", e.message);
  }
  
  // Check the CCTP TokenMessenger address
  console.log("\n3️⃣ Checking CCTP TokenMessenger...");
  try {
    const messenger = await routeProcessor.cctpTokenMessenger();
    console.log("TokenMessenger address:", messenger);
    
    // Check if it's a valid contract
    const code = await ethers.provider.getCode(messenger);
    if (code === "0x") {
      console.log("❌ No contract at TokenMessenger address!");
    } else {
      console.log("✅ TokenMessenger contract exists");
    }
  } catch (e) {
    console.log("Error checking messenger:", e.message);
  }
  
  // Try a simulated call to see what fails
  console.log("\n4️⃣ Simulating executeCCTP call...");
  const amount = parseUnits("1", 6);
  
  try {
    // This will simulate the call without sending a transaction
    await routeProcessor.executeCCTP.staticCall(
      usdcAddress,
      amount,
      baseSepoliaChainId,
      signer.address
    );
    console.log("✅ Simulation succeeded!");
  } catch (error) {
    console.log("❌ Simulation failed with:", error.message);
    
    // Parse the error to find the exact failure point
    if (error.message.includes("Token not USDC")) {
      console.log("→ USDC is not configured in the contract");
    } else if (error.message.includes("Invalid destination domain")) {
      console.log("→ Destination chain domain is not set (domain = 0)");
    } else if (error.message.includes("Invalid amount")) {
      console.log("→ Amount validation failed");
    } else if (error.message.includes("ERC20: insufficient allowance")) {
      console.log("→ USDC approval needed (this is expected)");
    }
  }
  
  // Check initialization
  console.log("\n5️⃣ Checking contract initialization...");
  console.log("Looking at hardcoded domains for mainnets:");
  
  const mainnetChains = {
    "Ethereum": 1,
    "Arbitrum": 42161,
    "Optimism": 10,
    "Base": 8453,
    "Polygon": 137,
    "Avalanche": 43114
  };
  
  for (const [name, chainId] of Object.entries(mainnetChains)) {
    const domain = await routeProcessor.chainIdToCCTPDomain(chainId);
    if (domain > 0) {
      console.log(`  ${name} (${chainId}): Domain ${domain}`);
    }
  }
  
  console.log("\n⚠️  DIAGNOSIS:");
  console.log("The contract has hardcoded CCTP domains for MAINNETS only.");
  console.log("Testnets (Sepolia, Base Sepolia, etc.) have domain = 0.");
  console.log("This causes the 'Invalid destination domain' requirement to fail.");
  console.log("\n💡 SOLUTION:");
  console.log("The contract needs to be upgraded or redeployed with testnet domains:");
  console.log("  - Sepolia: Domain 0");
  console.log("  - Base Sepolia: Domain 6");
  console.log("  - Arbitrum Sepolia: Domain 3");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
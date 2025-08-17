const { ethers } = require("hardhat");

async function main() {
  console.log("Checking UnifiedRouter configuration...\n");
  
  const routerAddress = "0x93EC86Bc761fD1D9Ac9E67A2ac56510C238E2a08";
  const router = await ethers.getContractAt("UnifiedRouter", routerAddress);
  
  // Check owner
  console.log("1. Contract owner:");
  try {
    const owner = await router.owner();
    console.log("   Owner:", owner);
  } catch (e) {
    console.log("   Error getting owner:", e.message);
  }
  
  // Check if paused
  console.log("\n2. Contract state:");
  try {
    const paused = await router.paused();
    console.log("   Paused:", paused);
  } catch (e) {
    console.log("   Error checking paused state:", e.message);
  }
  
  // Check protocol contracts
  console.log("\n3. Protocol contracts:");
  const protocols = ["NONE", "CCTP", "CCTP_HOOKS", "LAYERZERO", "STARGATE"];
  for (let i = 0; i < protocols.length; i++) {
    try {
      const protocolContract = await router.protocolContracts(i);
      console.log(`   ${protocols[i]} (${i}): ${protocolContract}`);
    } catch (e) {
      console.log(`   ${protocols[i]} (${i}): Error - ${e.message}`);
    }
  }
  
  // Check a sample route (USDC Base to USDC Arbitrum)
  console.log("\n4. Sample route check:");
  const USDC_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
  const USDC_ARB = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
  
  try {
    const isConfigured = await router.isRouteConfigured(
      USDC_BASE,  // fromToken
      8453,       // fromChainId (Base)
      USDC_ARB,   // toToken  
      42161       // toChainId (Arbitrum)
    );
    console.log("   USDC Base->Arbitrum route configured:", isConfigured);
  } catch (e) {
    console.log("   Error checking route:", e.message);
  }
  
  // Try to simulate the call that's failing
  console.log("\n5. Testing transfer call simulation:");
  const [signer] = await ethers.getSigners();
  
  try {
    // First check USDC balance and allowance
    const usdc = await ethers.getContractAt("IERC20", USDC_BASE);
    const balance = await usdc.balanceOf(signer.address);
    const allowance = await usdc.allowance(signer.address, routerAddress);
    
    console.log("   USDC balance:", ethers.formatUnits(balance, 6));
    console.log("   USDC allowance:", ethers.formatUnits(allowance, 6));
    
    if (balance > 0 && allowance > 0) {
      // Try to simulate the transfer call
      const amount = ethers.parseUnits("1", 6); // 1 USDC
      const recipient = "0xFC825D166f219ea5Aa75d993609eae546E013cEE";
      
      const result = await router.transfer.staticCall(
        USDC_BASE,  // fromToken
        USDC_ARB,   // toToken
        amount,     // amount
        42161,      // toChainId
        recipient   // recipient
      );
      console.log("   Transfer simulation successful, result:", result);
    } else {
      console.log("   Cannot simulate - insufficient balance or allowance");
    }
  } catch (e) {
    console.log("   Transfer simulation failed:", e.message);
    if (e.reason) console.log("   Reason:", e.reason);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
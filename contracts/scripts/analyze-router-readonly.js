const { ethers } = require("hardhat");
const { formatUnits } = require("ethers");

async function analyzeRouterReadonly() {
  const [signer] = await ethers.getSigners();
  
  console.log("📊 Router Analysis (Read-Only)");
  console.log("================================");
  
  const routerAddress = "0x8ABdaF7CABc7dAe57866aCa5C35Ef06BE6E15850";
  const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
  const TOKEN_MESSENGER = "0x1682Ae6375C4E4A97e4B583BC394c861A46D8962";
  
  console.log("\n1. Contract Addresses:");
  console.log("Router:", routerAddress);
  console.log("USDC:", USDC);
  console.log("TokenMessenger:", TOKEN_MESSENGER);
  
  // Check bytecode sizes
  console.log("\n2. Contract Bytecode Sizes:");
  const routerCode = await ethers.provider.getCode(routerAddress);
  const usdcCode = await ethers.provider.getCode(USDC);
  const messengerCode = await ethers.provider.getCode(TOKEN_MESSENGER);
  
  console.log("Router bytecode size:", routerCode.length);
  console.log("USDC bytecode size:", usdcCode.length);
  console.log("TokenMessenger bytecode size:", messengerCode.length);
  
  // Get router contract
  const router = await ethers.getContractAt("UnifiedRouter", routerAddress);
  const usdc = await ethers.getContractAt("IERC20", USDC);
  
  // Check current state
  console.log("\n3. Current State:");
  const userBalance = await usdc.balanceOf(signer.address);
  const routerBalance = await usdc.balanceOf(routerAddress);
  const routerAllowance = await usdc.allowance(signer.address, routerAddress);
  
  console.log("User USDC balance:", formatUnits(userBalance, 6));
  console.log("Router USDC balance:", formatUnits(routerBalance, 6));
  console.log("Router allowance:", formatUnits(routerAllowance, 6));
  
  // Check router configuration
  console.log("\n4. Router Configuration:");
  const cctpContract = await router.protocolContracts(1); // CCTP = 1
  console.log("CCTP contract set:", cctpContract);
  console.log("CCTP configured:", cctpContract === TOKEN_MESSENGER);
  
  // Check route
  const routeKey = await router.getRouteKey(
    USDC,
    84539, // Base
    "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", // USDC Arbitrum
    9924 // Arbitrum
  );
  
  const route = await router.routes(routeKey);
  console.log("\n5. Route Configuration:");
  console.log("Route key:", routeKey);
  console.log("Protocol:", route.protocol.toString());
  console.log("Protocol domain:", route.protocolDomain.toString());
  console.log("Bridge contract:", route.bridgeContract);
  console.log("Route configured:", route.protocol > 0n);
  
  // Analyze the transfer function selector
  console.log("\n6. Function Selectors:");
  const transferSelector = router.interface.getFunction("transfer").selector;
  console.log("transfer() selector:", transferSelector);
  
  // Check if router implements expected interfaces
  console.log("\n7. Interface Support:");
  try {
    // Check if router has the transfer function
    const hasTransfer = router.interface.hasFunction("transfer");
    console.log("Has transfer function:", hasTransfer);
    
    // Get all functions
    const functions = router.interface.fragments.filter(f => f.type === "function");
    console.log("Total functions:", functions.length);
    
    // List key functions
    console.log("\nKey functions:");
    ["transfer", "transferWithSwap", "configureRoute", "setProtocolContract"].forEach(fname => {
      try {
        const func = router.interface.getFunction(fname);
        console.log(`  - ${fname}: ✅`);
      } catch (e) {
        console.log(`  - ${fname}: ❌`);
      }
    });
  } catch (error) {
    console.log("Error checking interfaces:", error.message);
  }
  
  // Simulate what would happen in a transfer
  console.log("\n8. Transfer Simulation (no state change):");
  
  const amount = ethers.parseUnits("1", 6);
  console.log("Amount to transfer:", formatUnits(amount, 6), "USDC");
  
  // Build transfer calldata
  const calldata = router.interface.encodeFunctionData("transfer", [
    USDC,
    "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    amount,
    9924,
    signer.address
  ]);
  
  console.log("Calldata:", calldata);
  console.log("Calldata size:", calldata.length, "bytes");
  
  // Check what would happen if we called it (static call)
  console.log("\n9. Static Call Test:");
  try {
    const result = await ethers.provider.call({
      from: signer.address,
      to: routerAddress,
      data: calldata
    });
    console.log("✅ Static call would succeed");
    console.log("Return data:", result);
  } catch (error) {
    console.log("❌ Static call would fail");
    console.log("Error:", error.message);
    
    if (error.data) {
      console.log("Error data:", error.data);
      
      // Try to decode the error
      try {
        const decoded = router.interface.parseError(error.data);
        console.log("Decoded error:", decoded);
      } catch (e) {
        // Try to extract revert reason
        if (error.data.startsWith("0x08c379a0")) {
          // Standard revert string
          try {
            const reason = ethers.AbiCoder.defaultAbiCoder().decode(
              ["string"],
              "0x" + error.data.slice(10)
            )[0];
            console.log("Revert reason:", reason);
          } catch (e2) {
            console.log("Could not decode revert reason");
          }
        }
      }
    }
  }
}

async function main() {
  await analyzeRouterReadonly();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
const { ethers } = require("hardhat");
const { formatUnits, parseUnits } = require("ethers");

async function traceRouterFailure() {
  const [signer] = await ethers.getSigners();
  
  console.log("🔍 Tracing Router Failure");
  console.log("==========================");
  
  const routerAddress = "0x8ABdaF7CABc7dAe57866aCa5C35Ef06BE6E15850";
  const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
  const TOKEN_MESSENGER = "0x1682Ae6375C4E4A97e4B583BC394c861A46D8962";
  
  const router = await ethers.getContractAt("UnifiedRouter", routerAddress);
  const usdc = await ethers.getContractAt("IERC20", USDC);
  
  const amount = parseUnits("1", 6); // 1 USDC
  
  console.log("\n1. Initial State:");
  console.log("==================");
  const balance = await usdc.balanceOf(signer.address);
  console.log("User USDC:", formatUnits(balance, 6));
  
  const routerBalance = await usdc.balanceOf(routerAddress);
  console.log("Router USDC:", formatUnits(routerBalance, 6));
  
  console.log("\n2. Checking USDC Contract:");
  console.log("===========================");
  
  // Get USDC implementation details
  const usdcCode = await ethers.provider.getCode(USDC);
  console.log("USDC has code:", usdcCode.length > 2);
  
  // Check if USDC is a proxy
  const IMPLEMENTATION_SLOT = "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";
  const implementationSlot = await ethers.provider.getStorage(USDC, IMPLEMENTATION_SLOT);
  if (implementationSlot !== "0x0000000000000000000000000000000000000000000000000000000000000000") {
    const implementation = "0x" + implementationSlot.slice(26);
    console.log("USDC is a proxy, implementation:", implementation);
  } else {
    console.log("USDC is not a proxy or uses different slot");
  }
  
  console.log("\n3. Testing Allowance Mechanism:");
  console.log("=================================");
  
  // Clear any existing allowance
  console.log("Clearing existing allowance...");
  await (await usdc.approve(routerAddress, 0)).wait();
  
  let currentAllowance = await usdc.allowance(signer.address, routerAddress);
  console.log("Allowance after clear:", formatUnits(currentAllowance, 6));
  
  // Set new allowance
  console.log("\nSetting new allowance...");
  const approveTx = await usdc.approve(routerAddress, amount);
  await approveTx.wait();
  
  currentAllowance = await usdc.allowance(signer.address, routerAddress);
  console.log("Allowance after approve:", formatUnits(currentAllowance, 6));
  
  console.log("\n4. Testing Direct TransferFrom:");
  console.log("=================================");
  
  // Try to call transferFrom directly as the router would
  try {
    // First, let's see what happens if we call transferFrom as ourselves
    console.log("Testing self-transfer...");
    const selfTransferData = usdc.interface.encodeFunctionData("transferFrom", [
      signer.address,
      routerAddress,
      amount
    ]);
    
    // Simulate the call
    const result = await signer.call({
      to: USDC,
      data: selfTransferData,
      from: signer.address
    });
    
    console.log("✅ Self-transfer simulation successful");
    console.log("Return data:", result);
    
  } catch (error) {
    console.log("❌ Self-transfer simulation failed:", error.message);
  }
  
  console.log("\n5. Checking Router's Transfer Logic:");
  console.log("======================================");
  
  // Get the route configuration
  const routeKey = await router.getRouteKey(
    USDC,
    84539, // Base
    "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", // USDC Arbitrum
    9924 // Arbitrum
  );
  
  const route = await router.routes(routeKey);
  console.log("Route configured:", route.protocol > 0);
  console.log("Protocol:", route.protocol);
  console.log("Bridge contract:", route.bridgeContract);
  
  console.log("\n6. Attempting Router Transfer with Minimal Amount:");
  console.log("====================================================");
  
  // Try with an even smaller amount
  const tinyAmount = parseUnits("0.1", 6); // 0.1 USDC
  
  // Approve tiny amount
  await (await usdc.approve(routerAddress, tinyAmount)).wait();
  console.log("Approved 0.1 USDC");
  
  try {
    console.log("Calling router.transfer...");
    
    // Build the call data manually
    const calldata = router.interface.encodeFunctionData("transfer", [
      USDC,
      "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
      tinyAmount,
      9924,
      signer.address
    ]);
    
    // First try static call to see the revert reason
    try {
      await ethers.provider.call({
        from: signer.address,
        to: routerAddress,
        data: calldata
      });
      console.log("✅ Static call succeeded");
    } catch (staticError) {
      console.log("❌ Static call failed:", staticError.message);
      
      if (staticError.data) {
        // Try to decode the error
        try {
          const decodedError = router.interface.parseError(staticError.data);
          console.log("Decoded error:", decodedError);
        } catch (e) {
          // Try to decode as string
          try {
            const errorString = ethers.toUtf8String("0x" + staticError.data.slice(138));
            console.log("Error string:", errorString);
          } catch (e2) {
            console.log("Raw error data:", staticError.data);
          }
        }
      }
    }
    
    // Now try the actual transaction
    const tx = await router.transfer(
      USDC,
      "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
      tinyAmount,
      9924,
      signer.address,
      { gasLimit: 500000 }
    );
    
    console.log("✅ Transaction sent:", tx.hash);
    const receipt = await tx.wait();
    console.log("✅ Success! Gas used:", receipt.gasUsed.toString());
    
  } catch (error) {
    console.log("❌ Router transfer failed:", error.message);
  }
  
  console.log("\n7. Final State:");
  console.log("================");
  const finalBalance = await usdc.balanceOf(signer.address);
  const finalRouterBalance = await usdc.balanceOf(routerAddress);
  console.log("User USDC:", formatUnits(finalBalance, 6));
  console.log("Router USDC:", formatUnits(finalRouterBalance, 6));
  console.log("USDC moved:", formatUnits(balance - finalBalance, 6));
}

async function main() {
  await traceRouterFailure();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
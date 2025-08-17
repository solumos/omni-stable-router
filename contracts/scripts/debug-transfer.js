const { ethers } = require("hardhat");
const { formatUnits, parseUnits } = require("ethers");

async function debugTransfer() {
  const [signer] = await ethers.getSigners();
  
  console.log("🔍 Debug Transfer");
  console.log("================");
  
  const routerAddress = "0xD21010EB2f5b91686D2581E793159dD52cd260BA";
  const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
  
  // Get contracts
  const router = await ethers.getContractAt("UnifiedRouter", routerAddress);
  const usdc = await ethers.getContractAt("IERC20", USDC);
  
  // Check allowance
  const allowance = await usdc.allowance(signer.address, routerAddress);
  console.log("Allowance:", formatUnits(allowance, 6), "USDC");
  
  // Check balance
  const balance = await usdc.balanceOf(signer.address);
  console.log("Balance:", formatUnits(balance, 6), "USDC");
  
  // Check protocol contract
  const cctpMessenger = await router.protocolContracts(1);
  console.log("CCTP Messenger:", cctpMessenger);
  
  // Check route
  const routeKey = await router.getRouteKey(
    USDC, // from token
    84539, // Base chain ID
    "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", // USDC on Arbitrum
    9924 // Arbitrum chain ID
  );
  
  const route = await router.routes(routeKey);
  console.log("\nRoute configured:");
  console.log("  Protocol:", route.protocol);
  console.log("  Domain:", route.protocolDomain);
  console.log("  Bridge:", route.bridgeContract);
  
  // Try a smaller amount
  const amount = parseUnits("1", 6); // 1 USDC
  
  // Approve if needed
  if (allowance < amount) {
    console.log("\nApproving router...");
    const approveTx = await usdc.approve(routerAddress, amount);
    await approveTx.wait();
    console.log("✅ Approved");
  }
  
  // Try to call the transfer function with detailed error catching
  console.log("\nAttempting transfer...");
  
  try {
    // First, let's try to simulate the transaction
    const calldata = router.interface.encodeFunctionData("transfer", [
      USDC,
      "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
      amount,
      9924,
      signer.address
    ]);
    
    console.log("Calldata:", calldata);
    
    // Try static call first to get error
    try {
      const result = await ethers.provider.call({
        to: routerAddress,
        from: signer.address,
        data: calldata
      });
      console.log("Static call result:", result);
    } catch (staticError) {
      console.log("Static call error:", staticError.message);
      
      // Try to decode the error
      if (staticError.data) {
        try {
          const decodedError = router.interface.parseError(staticError.data);
          console.log("Decoded error:", decodedError);
        } catch (e) {
          console.log("Raw error data:", staticError.data);
        }
      }
    }
    
    // Now try the actual transaction
    const tx = await router.transfer(
      USDC,
      "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
      amount,
      9924,
      signer.address,
      { gasLimit: 500000 }
    );
    
    console.log("Transaction sent:", tx.hash);
    const receipt = await tx.wait();
    console.log("✅ Success! Gas used:", receipt.gasUsed.toString());
    
  } catch (error) {
    console.error("\n❌ Transfer failed");
    console.error("Error message:", error.message);
    
    if (error.data) {
      console.log("Error data:", error.data);
      
      // Try to decode custom error
      try {
        const decodedError = router.interface.parseError(error.data);
        console.log("Decoded error:", decodedError);
      } catch (e) {
        // Not a custom error
      }
    }
    
    if (error.transaction) {
      console.log("Failed transaction:");
      console.log("  To:", error.transaction.to);
      console.log("  Data:", error.transaction.data);
    }
  }
}

async function main() {
  await debugTransfer();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
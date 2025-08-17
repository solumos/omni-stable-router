const { ethers } = require("hardhat");
const { formatUnits, parseUnits } = require("ethers");

async function testLocalCCTP() {
  console.log("🧪 Testing CCTP on Local Fork");
  console.log("================================\n");
  
  const [signer] = await ethers.getSigners();
  console.log("Test Account:", signer.address);
  
  // Router address from deployment
  const routerAddress = "0xF1849F68bDF8E9DeBAd32C281163ABdfD21c1a86";
  const router = await ethers.getContractAt("UnifiedRouter", routerAddress);
  
  // Base mainnet USDC
  const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
  const usdc = await ethers.getContractAt("IERC20", USDC);
  
  // Get some USDC from a whale
  console.log("\n1️⃣ Getting USDC from whale...");
  const whale = "0x20FE51A9229EEf2cF8Ad9E89d91CAb9312cF3b7A"; // Base USDC whale
  
  // Fund whale with ETH for gas
  await ethers.provider.send("hardhat_setBalance", [
    whale,
    "0x56BC75E2D63100000" // 100 ETH
  ]);
  
  // Impersonate whale
  await ethers.provider.send("hardhat_impersonateAccount", [whale]);
  const whaleSigner = await ethers.provider.getSigner(whale);
  
  // Transfer USDC
  const amount = parseUnits("100", 6); // 100 USDC
  const usdcAsWhale = usdc.connect(whaleSigner);
  const transferTx = await usdcAsWhale.transfer(signer.address, amount);
  await transferTx.wait();
  
  await ethers.provider.send("hardhat_stopImpersonatingAccount", [whale]);
  
  const balance = await usdc.balanceOf(signer.address);
  console.log("✅ Received", formatUnits(balance, 6), "USDC");
  
  // Test direct CCTP call first
  console.log("\n2️⃣ Testing direct CCTP call...");
  const TOKEN_MESSENGER = "0x1682Ae6375C4E4A97e4B583BC394c861A46D8962";
  
  const tokenMessengerAbi = [
    "function depositForBurn(uint256 amount, uint32 destinationDomain, bytes32 mintRecipient, address burnToken) external returns (uint64 nonce)"
  ];
  
  const tokenMessenger = new ethers.Contract(TOKEN_MESSENGER, tokenMessengerAbi, signer);
  
  // Approve and test
  const testAmount = parseUnits("1", 6);
  await (await usdc.approve(TOKEN_MESSENGER, testAmount)).wait();
  
  try {
    const mintRecipient = ethers.zeroPadValue(signer.address, 32);
    const tx = await tokenMessenger.depositForBurn(
      testAmount,
      3, // Arbitrum domain
      mintRecipient,
      USDC
    );
    await tx.wait();
    console.log("✅ Direct CCTP call works!");
  } catch (error) {
    console.log("❌ Direct CCTP failed:", error.message);
  }
  
  // Now test through router
  console.log("\n3️⃣ Testing router transfer...");
  
  // First, configure protocols on the router
  console.log("Configuring protocols...");
  
  // Check if router owner is our signer
  try {
    const owner = await router.owner();
    console.log("Router owner:", owner);
    console.log("Our address:", signer.address);
    
    if (owner.toLowerCase() === signer.address.toLowerCase()) {
      // Configure CCTP protocol
      const tx = await router.setProtocolContract(1, TOKEN_MESSENGER);
      await tx.wait();
      console.log("✅ CCTP protocol configured");
    } else {
      console.log("⚠️ Not the owner, can't configure protocols");
    }
  } catch (error) {
    console.log("Error checking owner:", error.message);
  }
  
  // Configure a route (Base USDC -> Arbitrum USDC)
  console.log("\n4️⃣ Configuring route...");
  const USDC_ARB = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831"; // USDC on Arbitrum
  
  try {
    const routeTx = await router.configureRoute(
      USDC,           // fromToken (Base USDC)
      31337,          // fromChainId (local fork)
      USDC_ARB,       // toToken (Arbitrum USDC)
      42161,          // toChainId (Arbitrum mainnet)
      {
        protocol: 1,    // CCTP
        protocolDomain: 3, // Arbitrum domain
        bridgeContract: TOKEN_MESSENGER,
        poolId: 0,
        swapPool: "0x0000000000000000000000000000000000000000",
        extraData: "0x"
      }
    );
    await routeTx.wait();
    console.log("✅ Route configured");
  } catch (error) {
    console.log("Error configuring route:", error.message);
  }
  
  // Test the transfer
  console.log("\n5️⃣ Testing cross-chain transfer...");
  
  // Approve router
  await (await usdc.approve(routerAddress, testAmount)).wait();
  console.log("✅ Router approved");
  
  try {
    const transferTx = await router.transfer(
      USDC,           // fromToken
      USDC_ARB,       // toToken  
      testAmount,     // amount
      42161,          // toChainId (Arbitrum)
      signer.address, // recipient
      { gasLimit: 500000 }
    );
    
    const receipt = await transferTx.wait();
    console.log("✅ Transfer successful!");
    console.log("Transaction hash:", receipt.hash);
    console.log("Gas used:", receipt.gasUsed.toString());
    
    // Check events
    for (const log of receipt.logs) {
      try {
        const parsed = router.interface.parseLog(log);
        if (parsed) {
          console.log("Event:", parsed.name);
        }
      } catch (e) {
        // Other contract events
      }
    }
    
  } catch (error) {
    console.log("❌ Transfer failed:", error.message);
    if (error.reason) {
      console.log("Reason:", error.reason);
    }
  }
  
  // Check final balance
  const finalBalance = await usdc.balanceOf(signer.address);
  console.log("\n📊 Final USDC balance:", formatUnits(finalBalance, 6));
  console.log("USDC spent:", formatUnits(balance - finalBalance, 6));
}

async function main() {
  await testLocalCCTP();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
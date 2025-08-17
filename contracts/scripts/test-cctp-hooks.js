const { ethers } = require("hardhat");
const fs = require("fs");

// CCTP V2 Hook Test Script for Local Fork
// Tests USDC (Base) -> PYUSD (Arbitrum) using CCTP with hooks

// Token addresses
const TOKENS = {
  base: {
    USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  },
  arbitrum: {
    PYUSD: "0x0c92Fd9E86154cDCaE09F6f155faDdCb27bf7DD9", // Correct checksum
    USDC: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831"
  }
};

// Protocol addresses on Base
const BASE_PROTOCOLS = {
  CCTP_TOKEN_MESSENGER: "0x1682Ae6375C4E4A97e4B583BC394c861A46D8962",
  CCTP_MESSAGE_TRANSMITTER: "0xAD09780d193884d503182aD4588450C416D6F9D4",
  cctpDomain: 6
};

// Protocol addresses on Arbitrum
const ARB_PROTOCOLS = {
  CCTP_TOKEN_MESSENGER: "0x19330d10D9Cc8751218eaf51E8885D058642E08A",
  CCTP_MESSAGE_TRANSMITTER: "0xC30362313FBBA5cf9163F0bb16a0e01f01A896ca",
  cctpDomain: 3
};

const Protocol = {
  NONE: 0,
  CCTP: 1,
  CCTP_HOOKS: 2,
  LAYERZERO: 3,
  STARGATE: 4
};

async function loadDeployment() {
  try {
    const data = fs.readFileSync("./deployments/localhost.json", "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.error("❌ Could not load deployment. Run deploy-local.js first.");
    process.exit(1);
  }
}

async function testCCTPHooks() {
  console.log("========================================");
  console.log("🔬 Testing CCTP V2 Hooks");
  console.log("========================================\n");
  
  const deployment = loadDeployment();
  console.log("Deployment loaded:", deployment);
  const [signer] = await ethers.getSigners();
  
  console.log("📍 Test Setup:");
  console.log("  From: USDC on Base");
  console.log("  To: PYUSD on Arbitrum");
  console.log("  Using: CCTP V2 with hooks\n");
  
  // Get router contract
  const routerAddress = deployment?.contracts?.UnifiedRouter || "0x6e572fb734be64ec1465d1472ed40f41b74dd83e";
  const router = await ethers.getContractAt("UnifiedRouter", routerAddress);
  console.log("✅ Router loaded at:", await router.getAddress());
  
  // Step 1: Configure CCTP V2 protocols
  console.log("\n1️⃣ Configuring CCTP V2 protocols...");
  
  // Set CCTP Token Messenger
  let tx = await router.setProtocolContract(Protocol.CCTP, BASE_PROTOCOLS.CCTP_TOKEN_MESSENGER);
  await tx.wait();
  console.log("  ✅ CCTP Token Messenger configured");
  
  // Set CCTP Message Transmitter for hooks
  tx = await router.setProtocolContract(Protocol.CCTP_HOOKS, BASE_PROTOCOLS.CCTP_MESSAGE_TRANSMITTER);
  await tx.wait();
  console.log("  ✅ CCTP Message Transmitter configured");
  
  // Step 2: Set up a mock hook receiver address on Arbitrum
  // In production, this would be a deployed contract that handles the swap
  const MOCK_HOOK_RECEIVER = "0x1234567890123456789012345678901234567890";
  
  console.log("\n2️⃣ Setting hook receiver for Arbitrum...");
  tx = await router.setCCTPHookReceiver(42161, MOCK_HOOK_RECEIVER);
  await tx.wait();
  console.log("  ✅ Hook receiver set:", MOCK_HOOK_RECEIVER);
  
  // Step 3: Configure the CCTP_HOOKS route
  console.log("\n3️⃣ Configuring CCTP_HOOKS route...");
  
  // Mock swap pool address (would be Curve/Uniswap in production)
  const MOCK_SWAP_POOL = "0xABCDEF1234567890123456789012345678901234";
  
  tx = await router.configureRoute(
    TOKENS.base.USDC,        // fromToken
    8453,                     // Base chainId  
    TOKENS.arbitrum.PYUSD,    // toToken (different token!)
    42161,                    // Arbitrum chainId
    {
      protocol: Protocol.CCTP_HOOKS,
      protocolDomain: ARB_PROTOCOLS.cctpDomain,
      bridgeContract: BASE_PROTOCOLS.CCTP_TOKEN_MESSENGER,
      poolId: 0,
      swapPool: MOCK_SWAP_POOL,
      extraData: "0x"
    }
  );
  await tx.wait();
  console.log("  ✅ CCTP_HOOKS route configured");
  console.log("  📍 Swap pool:", MOCK_SWAP_POOL);
  
  // Step 4: Verify route configuration
  console.log("\n4️⃣ Verifying route configuration...");
  const isConfigured = await router.isRouteConfigured(
    TOKENS.base.USDC,
    8453,
    TOKENS.arbitrum.PYUSD,
    42161
  );
  console.log("  ✅ Route configured:", isConfigured);
  
  // Step 5: Fund the test account with USDC
  console.log("\n5️⃣ Funding test account with USDC...");
  
  // Impersonate a USDC whale
  const USDC_WHALE = "0x20FE51A9229EEf2cF8Ad9E89d91CAb9312cF3b7A"; // Has 24k USDC
  await ethers.provider.send("hardhat_impersonateAccount", [USDC_WHALE]);
  await ethers.provider.send("hardhat_setBalance", [USDC_WHALE, "0x1000000000000000000"]);
  
  const whale = new ethers.JsonRpcSigner(ethers.provider, USDC_WHALE);
  const usdc = await ethers.getContractAt("IERC20", TOKENS.base.USDC, whale);
  
  // Transfer 100 USDC to our signer
  tx = await usdc.transfer(signer.address, ethers.parseUnits("100", 6));
  await tx.wait();
  
  await ethers.provider.send("hardhat_stopImpersonatingAccount", [USDC_WHALE]);
  
  const balance = await usdc.connect(signer).balanceOf(signer.address);
  console.log("  ✅ USDC balance:", ethers.formatUnits(balance, 6));
  
  // Step 6: Approve router to spend USDC
  console.log("\n6️⃣ Approving router...");
  tx = await usdc.connect(signer).approve(await router.getAddress(), ethers.parseUnits("100", 6));
  await tx.wait();
  console.log("  ✅ Router approved for 100 USDC");
  
  // Step 7: Test the CCTP hooks transfer
  console.log("\n7️⃣ Initiating CCTP hooks transfer...");
  console.log("  From: 10 USDC on Base");
  console.log("  To: PYUSD on Arbitrum");
  console.log("  Min amount out: 9 PYUSD (allowing 10% slippage)");
  
  try {
    // Call transferWithSwap for cross-token transfer
    tx = await router.transferWithSwap(
      TOKENS.base.USDC,           // fromToken
      TOKENS.arbitrum.PYUSD,       // toToken (different!)
      ethers.parseUnits("10", 6),  // amount (10 USDC)
      42161,                       // toChainId (Arbitrum)
      signer.address,              // recipient
      ethers.parseUnits("9", 6),   // minAmountOut (9 PYUSD)
      "0x"                         // swapData (empty for now)
    );
    
    const receipt = await tx.wait();
    console.log("  ✅ Transfer initiated!");
    console.log("  📋 Transaction hash:", receipt.hash);
    
    // Parse events
    console.log("\n8️⃣ Parsing events...");
    
    // Look for TransferInitiated event
    const transferEvent = receipt.logs.find(log => {
      try {
        const parsed = router.interface.parseLog(log);
        return parsed?.name === "TransferInitiated";
      } catch { return false; }
    });
    
    if (transferEvent) {
      const parsed = router.interface.parseLog(transferEvent);
      console.log("  ✅ TransferInitiated event:");
      console.log("    • Transfer ID:", parsed.args.transferId);
      console.log("    • Protocol:", parsed.args.protocol === 2n ? "CCTP_HOOKS" : "Unknown");
      console.log("    • Amount:", ethers.formatUnits(parsed.args.amount, 6), "USDC");
    }
    
    // Check for CCTP events (these would be from the TokenMessenger contract)
    console.log("\n9️⃣ CCTP Hook Details:");
    console.log("  📍 Hook receiver will receive USDC on Arbitrum");
    console.log("  📍 Hook receiver will execute swap: USDC -> PYUSD");
    console.log("  📍 Final recipient will receive PYUSD");
    console.log("\n  ⏱️  Note: CCTP takes ~15 minutes to complete");
    console.log("  🔗 In production, monitor Circle's attestation service");
    
  } catch (error) {
    console.error("\n❌ Transfer failed:", error.message);
    
    // Try to decode the error
    if (error.data) {
      try {
        const decodedError = router.interface.parseError(error.data);
        console.error("  Decoded error:", decodedError);
      } catch {}
    }
  }
  
  // Step 8: Check final state
  console.log("\n🔍 Final State:");
  const finalBalance = await usdc.connect(signer).balanceOf(signer.address);
  console.log("  USDC balance:", ethers.formatUnits(finalBalance, 6));
  
  const routerBalance = await usdc.balanceOf(await router.getAddress());
  console.log("  Router USDC balance:", ethers.formatUnits(routerBalance, 6));
}

async function main() {
  console.log("========================================");
  console.log("CCTP V2 Hooks Test on Local Fork");
  console.log("========================================\n");
  
  const chainId = (await ethers.provider.getNetwork()).chainId;
  console.log(`Network: ${chainId === 31337n ? 'Hardhat Local Fork (Base)' : `Chain ${chainId}`}\n`);
  
  await testCCTPHooks();
  
  console.log("\n========================================");
  console.log("✅ CCTP V2 Hooks Test Complete!");
  console.log("========================================\n");
  
  console.log("Key Takeaways:");
  console.log("1. CCTP_HOOKS protocol configured successfully");
  console.log("2. Cross-token route (USDC -> PYUSD) configured");
  console.log("3. depositForBurnWithCaller would be called with hook receiver");
  console.log("4. Message transmitter would send swap instructions");
  console.log("5. On destination, hook receiver executes the swap");
  
  console.log("\nNext Steps for Production:");
  console.log("1. Deploy actual hook receiver contract on Arbitrum");
  console.log("2. Integrate with real DEX (Curve/Uniswap)");
  console.log("3. Handle Circle attestation for CCTP completion");
  console.log("4. Implement error handling and retries");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
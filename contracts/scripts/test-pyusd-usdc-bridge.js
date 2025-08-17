const { ethers } = require("hardhat");
const { formatUnits, parseUnits } = require("ethers");

// Deployed contracts
const SEPOLIA_CONTRACTS = {
  stableRouter: "0x44A0DBcAe62a90De8E967c87aF1D670c8E0b42d0",
  routeProcessor: "0xD039Cb6B9BbAb2DE0Ae0D92F1DdCb8e6A4Dc88de"
};

const BASE_SEPOLIA_CONTRACTS = {
  stableRouter: "0x238B153EEe7bc369F60C31Cb04d0a0e3466a82BD",
  routeProcessor: "0xD1e60637cA70C786B857452E50DE8353a01DabBb"
};

// Token addresses
const TOKENS = {
  sepolia: {
    PYUSD: "0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9", // PYUSD on Sepolia
    USDC: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238"
  },
  baseSepolia: {
    USDC: "0x036CbD53842c5426634e7929541eC2318f3dCF7e"
  }
};

// Chain IDs
const CHAINS = {
  SEPOLIA: 11155111,
  BASE_SEPOLIA: 84532
};

async function checkPYUSDAddress() {
  console.log("🔍 Looking for PYUSD on Sepolia...\n");
  
  // Common PYUSD testnet addresses to check
  const possibleAddresses = [
    "0x4c7C99555e8afac3571c7456448021239F5b73dE", // Potential PYUSD Sepolia
    // Add other known addresses
  ];
  
  console.log("Please provide the PYUSD Sepolia address.");
  console.log("You can find it at: https://www.paypal.com/us/digital-wallet/manage-money/crypto/pyusd");
  console.log("Or check: https://docs.layerzero.network/contracts/oft-addresses\n");
  
  return null; // Will need to be provided
}

async function testSepoliaPYUSDToBaseUSDC() {
  console.log("════════════════════════════════════════════");
  console.log("  Test 1: Sepolia PYUSD → Base Sepolia USDC");
  console.log("  Protocol: LayerZero Composer");
  console.log("════════════════════════════════════════════\n");
  
  const [signer] = await ethers.getSigners();
  console.log("👤 Sender:", signer.address);
  
  // Check if we have PYUSD address
  if (!TOKENS.sepolia.PYUSD) {
    console.log("❌ PYUSD address not configured!");
    console.log("Please update the TOKENS.sepolia.PYUSD in this script");
    return;
  }
  
  // Get PYUSD balance
  const pyusd = await ethers.getContractAt("IERC20", TOKENS.sepolia.PYUSD);
  const pyusdBalance = await pyusd.balanceOf(signer.address);
  console.log("💰 PYUSD Balance:", formatUnits(pyusdBalance, 6), "PYUSD");
  
  if (pyusdBalance == 0n) {
    console.log("\n❌ You need PYUSD on Sepolia!");
    console.log("Options:");
    console.log("1. Get from PayPal's testnet faucet (if available)");
    console.log("2. Swap USDC for PYUSD on testnet DEX");
    return;
  }
  
  // Test parameters
  const amount = parseUnits("1", 6); // 1 PYUSD (6 decimals)
  const recipient = signer.address; // Same address on destination
  
  console.log("\n📝 Transfer Details:");
  console.log("├── Amount: 1 PYUSD");
  console.log("├── From: Sepolia");
  console.log("├── To: Base Sepolia");
  console.log("├── Output: USDC");
  console.log("└── Recipient:", recipient);
  
  // Get RouteProcessor on Sepolia
  const routeProcessor = await ethers.getContractAt("RouteProcessor", SEPOLIA_CONTRACTS.routeProcessor);
  
  // Step 1: Check if PYUSD is configured as OFT
  const pyusdOFT = await routeProcessor.tokenToOFT(TOKENS.sepolia.PYUSD);
  if (pyusdOFT === ethers.ZeroAddress) {
    console.log("\n⚠️  PYUSD not configured as OFT in RouteProcessor!");
    console.log("Owner needs to call: routeProcessor.configureToken(PYUSD, false, OFT_ADDRESS, 0)");
    return;
  }
  console.log("\n✅ PYUSD OFT:", pyusdOFT);
  
  // Step 2: Estimate LayerZero fees
  console.log("\n💸 Estimating LayerZero fees...");
  const composerFee = await routeProcessor.estimateComposerFee(
    CHAINS.BASE_SEPOLIA,
    recipient,
    "0x" // Empty composer data for now
  );
  console.log("Required fee:", formatUnits(composerFee, 18), "ETH");
  
  // Step 3: Approve PYUSD
  console.log("\n🔓 Approving PYUSD...");
  const approveTx = await pyusd.approve(SEPOLIA_CONTRACTS.routeProcessor, amount);
  await approveTx.wait();
  console.log("✅ Approved!");
  
  // Step 4: Prepare swap data for destination
  // This tells the destination chain how to swap PYUSD to USDC
  const swapData = ethers.AbiCoder.defaultAbiCoder().encode(
    ["address", "bytes"],
    [
      "0x0000000000000000000000000000000000000000", // DEX router on Base (needs configuration)
      "0x" // Swap calldata (needs configuration)
    ]
  );
  
  // Step 5: Execute LayerZero Composer transfer
  console.log("\n🚀 Executing LayerZero Composer transfer...");
  try {
    const tx = await routeProcessor.executeComposer(
      TOKENS.sepolia.PYUSD,     // Source token (PYUSD)
      TOKENS.baseSepolia.USDC,  // Destination token (USDC)
      amount,                    // Amount
      CHAINS.BASE_SEPOLIA,       // Destination chain
      recipient,                 // Recipient
      parseUnits("0.95", 6),     // Min amount out (5% slippage)
      swapData,                  // Composer data for swap
      { value: composerFee }     // LayerZero fee
    );
    
    console.log("📤 Transaction sent:", tx.hash);
    console.log("⏳ Waiting for confirmation...");
    
    const receipt = await tx.wait();
    console.log("✅ Transfer initiated!");
    console.log("Gas used:", receipt.gasUsed.toString());
    
    // Parse events
    console.log("\n📋 Events:");
    for (const log of receipt.logs) {
      try {
        const parsed = routeProcessor.interface.parseLog(log);
        if (parsed && parsed.name === "ComposerSent") {
          console.log("ComposerSent event:");
          console.log("├── Source token:", parsed.args.sourceToken);
          console.log("├── Dest token:", parsed.args.destToken);
          console.log("├── Amount:", formatUnits(parsed.args.amount, 6));
          console.log("└── LZ Chain ID:", parsed.args.destChainId);
        }
      } catch (e) {
        // Not our event
      }
    }
    
    console.log("\n✅ SUCCESS! LayerZero Composer transfer initiated.");
    console.log("⏱️  Estimated time: 2-3 minutes");
    console.log("\n📍 Check destination balance on Base Sepolia soon!");
    
  } catch (error) {
    console.error("\n❌ Transfer failed:", error.message);
    
    if (error.message.includes("Not OFT token")) {
      console.log("💡 PYUSD needs to be configured as OFT");
    } else if (error.message.includes("Insufficient fee")) {
      console.log("💡 Need more ETH for LayerZero fees");
    }
  }
}

async function testBaseUSDCToSepoliaPYUSD() {
  console.log("\n════════════════════════════════════════════");
  console.log("  Test 2: Base Sepolia USDC → Sepolia PYUSD");
  console.log("  Protocol: LayerZero Composer (Reverse)");
  console.log("════════════════════════════════════════════\n");
  
  // This would be similar but in reverse
  // Need to configure Base Sepolia RouteProcessor to handle USDC → PYUSD swaps
  
  console.log("⚠️  Reverse path requires:");
  console.log("1. USDC to be configured as OFT on Base Sepolia");
  console.log("2. Composer setup on Base to swap USDC → PYUSD on arrival");
  console.log("3. PYUSD liquidity on Sepolia DEX");
}

async function main() {
  console.log("🌉 PYUSD ↔ USDC Cross-Chain Bridge Test\n");
  console.log("=====================================\n");
  
  const network = hre.network.name;
  
  if (network === "sepolia") {
    // Test Sepolia → Base Sepolia
    await testSepoliaPYUSDToBaseUSDC();
  } else if (network === "baseSepolia") {
    // Test Base Sepolia → Sepolia
    await testBaseUSDCToSepoliaPYUSD();
  } else {
    console.log("❌ Please run on sepolia or baseSepolia network");
  }
  
  console.log("\n📝 Notes:");
  console.log("• LayerZero Composer enables cross-token swaps");
  console.log("• CCTP is only for USDC ↔ USDC");
  console.log("• OFT tokens (PYUSD, USDe, crvUSD) use LayerZero");
  console.log("• Composer allows atomic swaps on destination");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
const { ethers } = require("hardhat");
const { formatUnits, parseUnits } = require("ethers");

// Deployed RouteProcessor contracts
const ROUTE_PROCESSORS = {
  sepolia: "0x44A0DBcAe62a90De8E967c87aF1D670c8E0b42d0",
  baseSepolia: "0x238B153EEe7bc369F60C31Cb04d0a0e3466a82BD",
  arbitrumSepolia: "0xA450EB7baB661aC2C42F51B8f1e9A5BFc1fA6dE3"
};

// USDC addresses on each chain
const USDC_ADDRESSES = {
  sepolia: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
  baseSepolia: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
  arbitrumSepolia: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d"
};

// Chain IDs
const CHAIN_IDS = {
  sepolia: 11155111,
  baseSepolia: 84532,
  arbitrumSepolia: 421614
};

// CCTP Domain IDs
const CCTP_DOMAINS = {
  sepolia: 0,
  baseSepolia: 6,
  arbitrumSepolia: 3
};

async function testCCTPTransfer(fromChain, toChain) {
  console.log("\n════════════════════════════════════════════");
  console.log(`  Test: ${fromChain} → ${toChain}`);
  console.log(`  Token: USDC via CCTP`);
  console.log("════════════════════════════════════════════\n");
  
  const [signer] = await ethers.getSigners();
  console.log("👤 Sender:", signer.address);
  
  // Get USDC contract
  const usdc = await ethers.getContractAt("IERC20", USDC_ADDRESSES[fromChain]);
  const balance = await usdc.balanceOf(signer.address);
  console.log("💰 USDC Balance:", formatUnits(balance, 6), "USDC");
  
  if (balance == 0n) {
    console.log("\n❌ You need USDC! Get from: https://faucet.circle.com");
    return;
  }
  
  // Test with small amount
  const amount = parseUnits("0.1", 6); // 0.1 USDC
  
  console.log("\n📝 Transfer Details:");
  console.log(`├── Amount: ${formatUnits(amount, 6)} USDC`);
  console.log(`├── From: ${fromChain} (Domain ${CCTP_DOMAINS[fromChain]})`);
  console.log(`├── To: ${toChain} (Domain ${CCTP_DOMAINS[toChain]})`);
  console.log(`└── Recipient: ${signer.address}`);
  
  // Get RouteProcessor
  const routeProcessor = await ethers.getContractAt("RouteProcessor", ROUTE_PROCESSORS[fromChain]);
  
  // Check current allowance
  const currentAllowance = await usdc.allowance(signer.address, ROUTE_PROCESSORS[fromChain]);
  if (currentAllowance < amount) {
    console.log("\n1️⃣ Approving USDC...");
    const approveTx = await usdc.approve(ROUTE_PROCESSORS[fromChain], amount);
    await approveTx.wait();
    console.log("✅ Approved!");
  } else {
    console.log("\n✅ Already approved");
  }
  
  // Execute CCTP transfer
  console.log("\n2️⃣ Executing CCTP transfer...");
  try {
    const tx = await routeProcessor.executeCCTP(
      USDC_ADDRESSES[fromChain],  // token
      amount,                      // amount
      CHAIN_IDS[toChain],         // destination chain
      signer.address               // recipient
    );
    
    console.log("📤 Transaction sent:", tx.hash);
    console.log("⏳ Waiting for confirmation...");
    
    const receipt = await tx.wait();
    console.log("✅ Transfer initiated!");
    console.log("Gas used:", receipt.gasUsed.toString());
    
    // Get explorer link
    const explorerLinks = {
      sepolia: "https://sepolia.etherscan.io",
      baseSepolia: "https://sepolia.basescan.org",
      arbitrumSepolia: "https://sepolia.arbiscan.io"
    };
    
    console.log("\n🔍 Track your transfer:");
    console.log(`${explorerLinks[fromChain]}/tx/${tx.hash}`);
    
    console.log("\n✅ SUCCESS!");
    console.log("⏱️  CCTP takes ~15 minutes to complete");
    console.log(`\n📍 Check ${toChain} balance in 15 minutes:`);
    console.log(`${explorerLinks[toChain]}/address/${signer.address}`);
    
  } catch (error) {
    console.error("\n❌ Transfer failed:", error.message);
  }
}

async function checkBalances() {
  console.log("\n💰 Checking USDC Balances Across All Chains");
  console.log("════════════════════════════════════════════\n");
  
  const [signer] = await ethers.getSigners();
  
  for (const [chain, usdcAddress] of Object.entries(USDC_ADDRESSES)) {
    try {
      // Note: This only works if connected to that specific network
      if (hre.network.name === chain) {
        const usdc = await ethers.getContractAt("IERC20", usdcAddress);
        const balance = await usdc.balanceOf(signer.address);
        console.log(`${chain}: ${formatUnits(balance, 6)} USDC`);
      }
    } catch (e) {
      // Skip if not on this network
    }
  }
}

async function main() {
  console.log("🌉 CCTP Cross-Chain Transfer Test\n");
  console.log("=====================================\n");
  
  const network = hre.network.name;
  console.log("Current Network:", network);
  
  if (!ROUTE_PROCESSORS[network]) {
    console.log("❌ No RouteProcessor deployed on this network");
    return;
  }
  
  // Show menu
  console.log("\n📋 Available Routes:");
  console.log("1. Sepolia → Base Sepolia");
  console.log("2. Sepolia → Arbitrum Sepolia");
  console.log("3. Base Sepolia → Sepolia");
  console.log("4. Base Sepolia → Arbitrum Sepolia");
  console.log("5. Arbitrum Sepolia → Sepolia");
  console.log("6. Arbitrum Sepolia → Base Sepolia");
  console.log("0. Check balances");
  
  // For automated testing, we'll do the appropriate transfer based on current network
  if (network === "sepolia") {
    await testCCTPTransfer("sepolia", "baseSepolia");
  } else if (network === "baseSepolia") {
    await testCCTPTransfer("baseSepolia", "sepolia");
  } else if (network === "arbitrumSepolia") {
    await testCCTPTransfer("arbitrumSepolia", "sepolia");
  }
  
  console.log("\n📝 CCTP Notes:");
  console.log("• Circle's CCTP burns and mints native USDC");
  console.log("• ~15 minute finality time");
  console.log("• No slippage (1:1 transfer)");
  console.log("• Supports: Sepolia ↔ Base Sepolia ↔ Arbitrum Sepolia");
  
  console.log("\n💡 To test other routes:");
  console.log(`npx hardhat run scripts/test-cctp-all-chains.js --network <network>`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
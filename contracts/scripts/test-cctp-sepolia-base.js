const { ethers } = require("hardhat");
const { formatUnits, parseUnits } = require("ethers");

// Deployed contracts
const CONTRACTS = {
  sepolia: {
    routeProcessor: "0x44A0DBcAe62a90De8E967c87aF1D670c8E0b42d0",  // Using StableRouter address
    USDC: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238"
  },
  baseSepolia: {
    routeProcessor: "0xD1e60637cA70C786B857452E50DE8353a01DabBb",
    USDC: "0x036CbD53842c5426634e7929541eC2318f3dCF7e"
  }
};

const CHAIN_IDS = {
  SEPOLIA: 11155111,
  BASE_SEPOLIA: 84532
};

async function testSepoliaToBase() {
  console.log("════════════════════════════════════════════");
  console.log("  Test: Sepolia USDC → Base Sepolia USDC");
  console.log("  Protocol: CCTP (Circle)");
  console.log("════════════════════════════════════════════\n");
  
  const [signer] = await ethers.getSigners();
  console.log("👤 Sender:", signer.address);
  
  // Get USDC contract and balance
  const usdc = await ethers.getContractAt("IERC20", CONTRACTS.sepolia.USDC);
  const balance = await usdc.balanceOf(signer.address);
  console.log("💰 USDC Balance:", formatUnits(balance, 6), "USDC");
  
  if (balance == 0n) {
    console.log("\n❌ You need USDC! Get from: https://faucet.circle.com");
    return;
  }
  
  // Test with small amount
  const amount = parseUnits("1", 6); // 1 USDC
  
  console.log("\n📝 Transfer Details:");
  console.log("├── Amount: 1 USDC");
  console.log("├── From: Sepolia");
  console.log("├── To: Base Sepolia");
  console.log("└── Recipient:", signer.address);
  
  // Get RouteProcessor
  const routeProcessor = await ethers.getContractAt("RouteProcessor", CONTRACTS.sepolia.routeProcessor);
  
  // Step 1: Approve
  console.log("\n1️⃣ Approving USDC...");
  const approveTx = await usdc.approve(CONTRACTS.sepolia.routeProcessor, amount);
  await approveTx.wait();
  console.log("✅ Approved!");
  
  // Step 2: Execute CCTP transfer
  console.log("\n2️⃣ Executing CCTP transfer...");
  try {
    const tx = await routeProcessor.executeCCTP(
      CONTRACTS.sepolia.USDC,  // token
      amount,                   // amount
      CHAIN_IDS.BASE_SEPOLIA,   // destination chain
      signer.address            // recipient
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
        if (parsed && parsed.name === "CCTPInitiated") {
          console.log("CCTPInitiated:");
          console.log("├── Nonce:", parsed.args.nonce.toString());
          console.log("├── Amount:", formatUnits(parsed.args.amount, 6), "USDC");
          console.log("└── Domain:", parsed.args.destDomain.toString());
          
          console.log("\n🔍 Track your transfer:");
          console.log("https://sepolia.etherscan.io/tx/" + tx.hash);
        }
      } catch (e) {
        // Not our event
      }
    }
    
    console.log("\n✅ SUCCESS!");
    console.log("⏱️  CCTP takes ~15 minutes to complete");
    console.log("\n📍 Check Base Sepolia balance in 15 minutes:");
    console.log("https://sepolia.basescan.org/address/" + signer.address);
    
  } catch (error) {
    console.error("\n❌ Transfer failed:", error.message);
  }
}

async function testBaseToSepolia() {
  console.log("════════════════════════════════════════════");
  console.log("  Test: Base Sepolia USDC → Sepolia USDC");
  console.log("  Protocol: CCTP (Circle)");
  console.log("════════════════════════════════════════════\n");
  
  const [signer] = await ethers.getSigners();
  console.log("👤 Sender:", signer.address);
  
  // Get USDC contract and balance
  const usdc = await ethers.getContractAt("IERC20", CONTRACTS.baseSepolia.USDC);
  const balance = await usdc.balanceOf(signer.address);
  console.log("💰 USDC Balance:", formatUnits(balance, 6), "USDC");
  
  if (balance == 0n) {
    console.log("\n❌ You need USDC on Base Sepolia!");
    console.log("Wait for Sepolia → Base transfer to complete first");
    return;
  }
  
  const amount = parseUnits("1", 6);
  
  console.log("\n📝 Transfer Details:");
  console.log("├── Amount: 1 USDC");
  console.log("├── From: Base Sepolia");
  console.log("├── To: Sepolia");
  console.log("└── Recipient:", signer.address);
  
  const routeProcessor = await ethers.getContractAt("RouteProcessor", CONTRACTS.baseSepolia.routeProcessor);
  
  // Approve
  console.log("\n1️⃣ Approving USDC...");
  const approveTx = await usdc.approve(CONTRACTS.baseSepolia.routeProcessor, amount);
  await approveTx.wait();
  console.log("✅ Approved!");
  
  // Execute
  console.log("\n2️⃣ Executing CCTP transfer...");
  try {
    const tx = await routeProcessor.executeCCTP(
      CONTRACTS.baseSepolia.USDC,
      amount,
      CHAIN_IDS.SEPOLIA,
      signer.address
    );
    
    console.log("📤 Transaction sent:", tx.hash);
    const receipt = await tx.wait();
    console.log("✅ Transfer initiated!");
    
    console.log("\n🔍 Track on Base Sepolia:");
    console.log("https://sepolia.basescan.org/tx/" + tx.hash);
    
  } catch (error) {
    console.error("\n❌ Transfer failed:", error.message);
  }
}

async function main() {
  console.log("🌉 CCTP Cross-Chain USDC Transfer Test\n");
  console.log("=====================================\n");
  
  const network = hre.network.name;
  
  if (network === "sepolia") {
    await testSepoliaToBase();
  } else if (network === "baseSepolia") {
    await testBaseToSepolia();
  } else {
    console.log("❌ Please run on sepolia or baseSepolia");
  }
  
  console.log("\n📝 CCTP Notes:");
  console.log("• Circle's CCTP burns and mints native USDC");
  console.log("• ~15 minute finality time");
  console.log("• No slippage (1:1 transfer)");
  console.log("• Gas efficient for USDC transfers");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
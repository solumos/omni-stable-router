const { ethers } = require("hardhat");
const { formatUnits, parseUnits } = require("ethers");

// Deployed contracts
const CONTRACTS = {
  baseSepolia: {
    routeProcessor: "0xD1e60637cA70C786B857452E50DE8353a01DabBb",
    USDC: "0x036CbD53842c5426634e7929541eC2318f3dCF7e"
  },
  arbitrumSepolia: {
    routeProcessor: "0xA450EB7baB661aC2C42F51B8f1e9A5BFc1fA6dE3",
    USDC: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d"
  }
};

const CHAIN_IDS = {
  BASE_SEPOLIA: 84532,
  ARBITRUM_SEPOLIA: 421614
};

const CHAIN_NAMES = {
  baseSepolia: "Base Sepolia",
  arbitrumSepolia: "Arbitrum Sepolia"
};

async function testCCTPTransfer() {
  const network = hre.network.name;
  const destNetwork = network === "baseSepolia" ? "arbitrumSepolia" : "baseSepolia";
  const destChainId = network === "baseSepolia" ? CHAIN_IDS.ARBITRUM_SEPOLIA : CHAIN_IDS.BASE_SEPOLIA;
  
  console.log("════════════════════════════════════════════");
  console.log(`  Test: ${CHAIN_NAMES[network]} → ${CHAIN_NAMES[destNetwork]}`);
  console.log(`  Protocol: CCTP (Circle)`);
  console.log("════════════════════════════════════════════\n");
  
  const [signer] = await ethers.getSigners();
  console.log("👤 Sender:", signer.address);
  
  // Get USDC contract and balance
  const usdc = await ethers.getContractAt("IERC20", CONTRACTS[network].USDC);
  const balance = await usdc.balanceOf(signer.address);
  console.log("💰 USDC Balance:", formatUnits(balance, 6), "USDC");
  
  if (balance == 0n) {
    console.log("\n❌ You need USDC!");
    console.log("Get from: https://faucet.circle.com");
    return;
  }
  
  // Test with small amount
  const amount = parseUnits("0.1", 6); // 0.1 USDC
  
  console.log("\n📝 Transfer Details:");
  console.log(`├── Amount: ${formatUnits(amount, 6)} USDC`);
  console.log(`├── From: ${CHAIN_NAMES[network]}`);
  console.log(`├── To: ${CHAIN_NAMES[destNetwork]}`);
  console.log(`├── Destination Chain ID: ${destChainId}`);
  console.log(`└── Recipient: ${signer.address}`);
  
  // Get RouteProcessor
  const routeProcessor = await ethers.getContractAt("RouteProcessor", CONTRACTS[network].routeProcessor);
  
  // Check if USDC is configured
  console.log("\n🔍 Checking configuration...");
  const isUSDCConfigured = await routeProcessor.isUSDC(CONTRACTS[network].USDC);
  console.log("USDC configured:", isUSDCConfigured ? "✅" : "❌");
  
  if (!isUSDCConfigured) {
    console.log("Configuring USDC...");
    const owner = await routeProcessor.owner();
    if (owner.toLowerCase() === signer.address.toLowerCase()) {
      const configTx = await routeProcessor.configureToken(
        CONTRACTS[network].USDC,
        true,  // isUSDC
        ethers.ZeroAddress,
        0
      );
      await configTx.wait();
      console.log("✅ USDC configured!");
    } else {
      console.log("❌ Not the owner, cannot configure");
      return;
    }
  }
  
  // Check CCTP domain
  const cctpDomain = await routeProcessor.chainIdToCCTPDomain(destChainId);
  console.log(`CCTP Domain for ${CHAIN_NAMES[destNetwork]}:`, cctpDomain);
  
  if (cctpDomain == 0 && destChainId !== 11155111) { // 0 is valid for Sepolia
    console.log("⚠️  Warning: CCTP domain is 0, transfer may fail");
  }
  
  // Step 1: Approve
  console.log("\n1️⃣ Approving USDC...");
  const currentAllowance = await usdc.allowance(signer.address, CONTRACTS[network].routeProcessor);
  if (currentAllowance < amount) {
    const approveTx = await usdc.approve(CONTRACTS[network].routeProcessor, amount);
    await approveTx.wait();
    console.log("✅ Approved!");
  } else {
    console.log("✅ Already approved");
  }
  
  // Step 2: Execute CCTP transfer
  console.log("\n2️⃣ Executing CCTP transfer...");
  console.log("Calling executeCCTP with:");
  console.log("  Token:", CONTRACTS[network].USDC);
  console.log("  Amount:", amount.toString());
  console.log("  Dest Chain:", destChainId);
  console.log("  Recipient:", signer.address);
  
  try {
    // First do a static call to check if it will succeed
    await routeProcessor.executeCCTP.staticCall(
      CONTRACTS[network].USDC,
      amount,
      destChainId,
      signer.address
    );
    console.log("✅ Static call succeeded, sending transaction...");
    
    const tx = await routeProcessor.executeCCTP(
      CONTRACTS[network].USDC,
      amount,
      destChainId,
      signer.address
    );
    
    console.log("📤 Transaction sent:", tx.hash);
    console.log("⏳ Waiting for confirmation...");
    
    const receipt = await tx.wait();
    console.log("✅ Transfer initiated!");
    console.log("Gas used:", receipt.gasUsed.toString());
    
    // Parse events
    console.log("\n📋 Events:");
    if (receipt.logs.length === 0) {
      console.log("⚠️  No events emitted");
    } else {
      for (const log of receipt.logs) {
        try {
          const parsed = routeProcessor.interface.parseLog(log);
          if (parsed && parsed.name === "CCTPInitiated") {
            console.log("CCTPInitiated:");
            console.log("├── Token:", parsed.args.token);
            console.log("├── Amount:", formatUnits(parsed.args.amount, 6), "USDC");
            console.log("├── Dest Domain:", parsed.args.destDomain);
            console.log("├── Recipient:", parsed.args.recipient);
            console.log("└── Nonce:", parsed.args.nonce?.toString());
          }
        } catch (e) {
          // Check for Transfer events
          if (log.topics[0] === "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef") {
            console.log("ERC20 Transfer event detected");
          }
        }
      }
    }
    
    // Check balance after
    const newBalance = await usdc.balanceOf(signer.address);
    const difference = balance - newBalance;
    console.log("\n💰 Balance Change:");
    console.log("Before:", formatUnits(balance, 6), "USDC");
    console.log("After:", formatUnits(newBalance, 6), "USDC");
    if (difference > 0n) {
      console.log("Sent:", formatUnits(difference, 6), "USDC ✅");
    } else {
      console.log("No balance change ⚠️");
    }
    
    console.log("\n✅ SUCCESS!");
    console.log("⏱️  CCTP takes ~15 minutes to complete");
    console.log("\n🔍 Track your transfer:");
    
    const explorerUrls = {
      baseSepolia: "https://sepolia.basescan.org",
      arbitrumSepolia: "https://sepolia.arbiscan.io"
    };
    
    console.log(`${explorerUrls[network]}/tx/${tx.hash}`);
    console.log(`\n📍 Check ${CHAIN_NAMES[destNetwork]} balance in 15 minutes:`);
    console.log(`${explorerUrls[destNetwork]}/address/${signer.address}`);
    
  } catch (error) {
    console.error("\n❌ Transfer failed:", error.message);
    
    // Parse specific errors
    if (error.message.includes("Token not USDC")) {
      console.log("→ USDC is not configured in the contract");
      console.log("→ Need to call configureToken() first");
    } else if (error.message.includes("Invalid destination domain")) {
      console.log("→ The destination chain's CCTP domain is not configured");
      console.log("→ CCTP domains need to be set in the contract");
    } else if (error.message.includes("insufficient allowance")) {
      console.log("→ Need to approve USDC first");
    }
  }
}

async function main() {
  console.log("🌉 CCTP Cross-Chain Transfer Test");
  console.log("Base Sepolia ↔ Arbitrum Sepolia\n");
  console.log("=====================================\n");
  
  const network = hre.network.name;
  console.log("Current Network:", network);
  
  if (network !== "baseSepolia" && network !== "arbitrumSepolia") {
    console.log("❌ Please run on baseSepolia or arbitrumSepolia");
    return;
  }
  
  await testCCTPTransfer();
  
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
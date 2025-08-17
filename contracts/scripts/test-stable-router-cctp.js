const { ethers } = require("hardhat");
const { formatUnits, parseUnits } = require("ethers");

// Contract addresses
const CONTRACTS = {
  sepolia: {
    stableRouter: "0x44A0DBcAe62a90De8E967c87aF1D670c8E0b42d0",
    routeProcessor: "0xD039Cb6B9BbAb2DE0Ae0D92F1DdCb8e6A4Dc88de",
    USDC: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238"
  },
  baseSepolia: {
    stableRouter: "0x238B153EEe7bc369F60C31Cb04d0a0e3466a82BD",
    routeProcessor: "0xD1e60637cA70C786B857452E50DE8353a01DabBb",
    USDC: "0x036CbD53842c5426634e7929541eC2318f3dCF7e"
  }
};

const CHAIN_IDS = {
  SEPOLIA: 11155111,
  BASE_SEPOLIA: 84532
};

async function testStableRouterCCTP() {
  const network = hre.network.name;
  console.log("🌉 StableRouter CCTP Test\n");
  console.log("=====================================\n");
  console.log("Network:", network);
  
  if (!CONTRACTS[network]) {
    console.log("❌ No contracts on this network");
    return;
  }
  
  const [signer] = await ethers.getSigners();
  console.log("👤 Signer:", signer.address);
  
  // Get StableRouter contract
  const stableRouter = await ethers.getContractAt("StableRouter", CONTRACTS[network].stableRouter);
  
  // Check configuration
  console.log("\n📋 Checking StableRouter configuration...");
  try {
    const routeProcessorAddress = await stableRouter.routeProcessor();
    console.log("RouteProcessor:", routeProcessorAddress);
    
    if (routeProcessorAddress === ethers.ZeroAddress) {
      console.log("❌ RouteProcessor not configured!");
      return;
    }
  } catch (e) {
    console.log("Error checking RouteProcessor:", e.message);
  }
  
  // Get USDC balance
  const usdc = await ethers.getContractAt("IERC20", CONTRACTS[network].USDC);
  const balance = await usdc.balanceOf(signer.address);
  console.log("\n💰 USDC Balance:", formatUnits(balance, 6), "USDC");
  
  if (balance == 0n) {
    console.log("❌ You need USDC! Get from: https://faucet.circle.com");
    return;
  }
  
  // Prepare RouteParams
  const amount = parseUnits("0.1", 6); // 0.1 USDC
  const destChainId = network === "sepolia" ? CHAIN_IDS.BASE_SEPOLIA : CHAIN_IDS.SEPOLIA;
  const destNetwork = network === "sepolia" ? "Base Sepolia" : "Sepolia";
  
  const routeParams = {
    sourceToken: CONTRACTS[network].USDC,
    destToken: CONTRACTS[destNetwork.toLowerCase().replace(" ", "")]?.USDC || CONTRACTS[network].USDC,
    amount: amount,
    destChainId: destChainId,
    recipient: signer.address,
    minAmountOut: amount * 95n / 100n, // 5% slippage tolerance
    routeData: "0x", // No additional data needed for simple CCTP
    deadline: Math.floor(Date.now() / 1000) + 3600 // 1 hour deadline
  };
  
  console.log("\n📝 Route Parameters:");
  console.log("├── Source Token:", routeParams.sourceToken);
  console.log("├── Dest Token:", routeParams.destToken);
  console.log("├── Amount:", formatUnits(routeParams.amount, 6), "USDC");
  console.log("├── Dest Chain:", destNetwork, `(${destChainId})`);
  console.log("├── Recipient:", routeParams.recipient);
  console.log("└── Min Amount Out:", formatUnits(routeParams.minAmountOut, 6), "USDC");
  
  // Check allowance
  const currentAllowance = await usdc.allowance(signer.address, CONTRACTS[network].stableRouter);
  if (currentAllowance < amount) {
    console.log("\n1️⃣ Approving USDC...");
    const approveTx = await usdc.approve(CONTRACTS[network].stableRouter, amount);
    await approveTx.wait();
    console.log("✅ Approved!");
  } else {
    console.log("\n✅ Already approved");
  }
  
  // Execute route
  console.log("\n2️⃣ Executing route via StableRouter...");
  try {
    // First try static call to see if it will succeed
    await stableRouter.executeRoute.staticCall(routeParams);
    console.log("✅ Static call succeeded, sending transaction...");
    
    const tx = await stableRouter.executeRoute(routeParams);
    console.log("📤 Transaction sent:", tx.hash);
    console.log("⏳ Waiting for confirmation...");
    
    const receipt = await tx.wait();
    console.log("✅ Route executed!");
    console.log("Gas used:", receipt.gasUsed.toString());
    
    // Parse events
    console.log("\n📋 Events:");
    for (const log of receipt.logs) {
      try {
        const parsed = stableRouter.interface.parseLog(log);
        if (parsed) {
          console.log(`  ${parsed.name}`);
          if (parsed.name === "RouteInitiated") {
            console.log("    Amount:", formatUnits(parsed.args.amount, 6), "USDC");
            console.log("    Destination:", parsed.args.destChainId?.toString());
          }
        }
      } catch (e) {
        // Not a StableRouter event
      }
    }
    
    console.log("\n✅ SUCCESS!");
    console.log("🔍 Track on explorer:");
    console.log(network === "sepolia" 
      ? `https://sepolia.etherscan.io/tx/${tx.hash}`
      : `https://sepolia.basescan.org/tx/${tx.hash}`);
    
  } catch (error) {
    console.error("\n❌ Route execution failed:");
    console.error(error.message);
    
    // Try to parse the error
    if (error.message.includes("Unsupported route")) {
      console.log("→ The protocol determination failed");
    } else if (error.message.includes("Token not configured")) {
      console.log("→ USDC is not configured in the router");
    } else if (error.message.includes("Invalid destination")) {
      console.log("→ Destination chain not configured");
    }
  }
  
  // Check balance after
  const newBalance = await usdc.balanceOf(signer.address);
  console.log("\n💰 New USDC Balance:", formatUnits(newBalance, 6), "USDC");
  const difference = balance - newBalance;
  if (difference > 0n) {
    console.log("📉 Sent:", formatUnits(difference, 6), "USDC");
  }
}

async function main() {
  await testStableRouterCCTP();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
const { ethers } = require("hardhat");
const { formatUnits, parseUnits } = require("ethers");
const fs = require("fs");

// Network configurations
const NETWORKS = {
  sepolia: {
    chainId: 11155111,
    name: "Sepolia",
    tokens: {
      USDC: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
      PYUSD: "0xcac524bca292aaade2df8a05cc58f0a65b1b3bb9",
      USDe: "0x5d3a1Ff2b6BAb83b63cd9AD0787074081a52ef34"
    },
    explorer: "https://sepolia.etherscan.io"
  },
  baseSepolia: {
    chainId: 84532,
    name: "Base Sepolia",
    tokens: {
      USDC: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
      USDe: "0x5d3a1Ff2b6BAb83b63cd9AD0787074081a52ef34"
    },
    explorer: "https://sepolia.basescan.org"
  },
  arbitrumSepolia: {
    chainId: 421614,
    name: "Arbitrum Sepolia",
    tokens: {
      USDC: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",
      PYUSD: "0xcac524bca292aaade2df8a05cc58f0a65b1b3bb9",
      USDe: "0x5d3a1Ff2b6BAb83b63cd9AD0787074081a52ef34"
    },
    explorer: "https://sepolia.arbiscan.io"
  },
  optimismSepolia: {
    chainId: 11155420,
    name: "Optimism Sepolia",
    tokens: {
      USDC: "0x5fd84259d66Cd46123540766Be93DFE6D43130D7",
      USDe: "0x5d3a1Ff2b6BAb83b63cd9AD0787074081a52ef34"
    },
    explorer: "https://sepolia-optimism.etherscan.io"
  }
};

async function loadDeployment(network) {
  const deploymentPath = `./deployments/${network}-unified-router.json`;
  if (!fs.existsSync(deploymentPath)) {
    throw new Error(`No deployment found for ${network}. Run deploy-unified-router.js first.`);
  }
  return JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
}

async function testTransfer(destNetwork, fromToken = null, toToken = null) {
  const network = hre.network.name;
  const [signer] = await ethers.getSigners();
  
  const sourceConfig = NETWORKS[network];
  const destConfig = NETWORKS[destNetwork];
  
  if (!sourceConfig || !destConfig) {
    console.log("❌ Invalid network configuration");
    return;
  }
  
  console.log("\n============================================");
  console.log(`  Transfer: ${sourceConfig.name} → ${destConfig.name}`);
  console.log("============================================\n");
  
  // Auto-detect tokens if not specified
  if (!fromToken) {
    // Default to USDC if available
    fromToken = sourceConfig.tokens.USDC ? "USDC" : Object.keys(sourceConfig.tokens)[0];
  }
  if (!toToken) {
    // Default to same token or USDC on destination
    toToken = destConfig.tokens[fromToken] ? fromToken : "USDC";
  }
  
  // Get token addresses
  const fromTokenAddress = sourceConfig.tokens[fromToken];
  const toTokenAddress = destConfig.tokens[toToken];
  
  if (!fromTokenAddress || !toTokenAddress) {
    console.log(`❌ Token not available: ${fromToken} on ${sourceConfig.name} or ${toToken} on ${destConfig.name}`);
    console.log(`Available tokens on ${sourceConfig.name}:`, Object.keys(sourceConfig.tokens));
    console.log(`Available tokens on ${destConfig.name}:`, Object.keys(destConfig.tokens));
    return;
  }

  console.log("👤 Sender:", signer.address);
  console.log("📍 From:", sourceConfig.name);
  console.log("📍 To:", destConfig.name);
  console.log("🪙 Transfer:", `${fromToken} → ${toToken}`);
  
  // Load router
  const deployment = await loadDeployment(network);
  const router = await ethers.getContractAt("UnifiedRouter", deployment.router);
  console.log("📜 Router:", deployment.router);
  
  // Get source token contract
  const sourceToken = await ethers.getContractAt("IERC20", fromTokenAddress);
  const balance = await sourceToken.balanceOf(signer.address);
  
  // Determine decimals (most stablecoins use 6, but check common cases)
  let decimals = 6; // Default for USDC/PYUSD
  if (fromToken === "USDe") decimals = 18; // USDe uses 18 decimals
  
  console.log(`💰 ${fromToken} Balance:`, formatUnits(balance, decimals), fromToken);
  
  if (balance == 0n) {
    console.log(`\n❌ You need ${fromToken}!`);
    if (fromToken === "USDC") {
      console.log("Get from: https://faucet.circle.com");
    }
    return;
  }
  
  // Test amount
  const amount = parseUnits("0.1", decimals); // 0.1 tokens
  
  console.log("\n📝 Transfer Details:");
  console.log("├── Amount:", formatUnits(amount, decimals), fromToken);
  console.log("├── From Token:", fromTokenAddress);
  console.log("├── To Token:", toTokenAddress);
  console.log("├── To Chain ID:", destConfig.chainId);
  console.log("└── Recipient:", signer.address);
  
  // Check if route is configured
  console.log("\n🔍 Checking route configuration...");
  const isConfigured = await router.isRouteConfigured(
    fromTokenAddress,
    sourceConfig.chainId,
    toTokenAddress,
    destConfig.chainId
  );
  
  if (!isConfigured) {
    console.log("❌ Route not configured!");
    console.log("Run configure-routes.js first");
    return;
  }
  console.log("✅ Route is configured");
  
  // Get route details
  const routeKey = await router.getRouteKey(
    fromTokenAddress,
    sourceConfig.chainId,
    toTokenAddress,
    destConfig.chainId
  );
  const route = await router.routes(routeKey);
  
  const protocolName = route.protocol == 1 ? "CCTP" : 
                       route.protocol == 2 ? "CCTP_HOOKS" : 
                       route.protocol == 3 ? "LAYERZERO" : 
                       route.protocol == 4 ? "STARGATE" : "Unknown";
  console.log("🌉 Protocol:", protocolName);
  console.log("🎯 Protocol Domain:", route.protocolDomain.toString());
  
  // Estimate fees
  console.log("\n💸 Estimating fees...");
  try {
    const estimatedFee = await router.estimateFees(
      fromTokenAddress,
      toTokenAddress,
      amount,
      destConfig.chainId,
      signer.address
    );
    
    if (estimatedFee > 0) {
      console.log("Estimated native fee:", ethers.formatEther(estimatedFee), "ETH");
    } else {
      console.log("No native fee required (CCTP)");
    }
  } catch (error) {
    console.log("Fee estimation not available");
  }
  
  // Step 1: Approve
  console.log(`\n1️⃣  Approving ${fromToken}...`);
  const currentAllowance = await sourceToken.allowance(signer.address, deployment.router);
  console.log("Current allowance:", ethers.formatUnits(currentAllowance, decimals), fromToken);
  console.log("Required amount:", ethers.formatUnits(amount, decimals), fromToken);
  
  if (currentAllowance < amount) {
    console.log("Approving", ethers.formatUnits(amount, decimals), fromToken + "...");
    const approveTx = await sourceToken.approve(deployment.router, amount);
    await approveTx.wait();
    
    // Verify approval
    const newAllowance = await sourceToken.allowance(signer.address, deployment.router);
    console.log("New allowance:", ethers.formatUnits(newAllowance, decimals), fromToken);
    console.log("✅ Approved!");
  } else {
    console.log("✅ Already approved");
  }
  
  // Step 2: Execute transfer
  console.log("\n2️⃣  Executing transfer...");
  console.log("Calling transfer() with:");
  console.log("  fromToken:", fromTokenAddress);
  console.log("  toToken:", toTokenAddress);
  console.log("  amount:", amount.toString());
  console.log("  toChainId:", destConfig.chainId);
  console.log("  recipient:", signer.address);
  
  try {
    // First do a static call to check if it will succeed
    const transferId = await router.transfer.staticCall(
      fromTokenAddress,  // fromToken
      toTokenAddress,    // toToken
      amount,            // amount
      destConfig.chainId, // toChainId
      signer.address     // recipient
    );
    console.log("✅ Static call succeeded");
    console.log("Transfer ID will be:", transferId);
    
    // Execute the actual transfer  
    const tx = await router.transfer(
      fromTokenAddress,
      toTokenAddress,
      amount,
      destConfig.chainId,
      signer.address,
      { value: 0 } // Most protocols don't need native fees for testnets
    );
    
    console.log("\n📤 Transaction sent:", tx.hash);
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
          const parsed = router.interface.parseLog(log);
          if (parsed && parsed.name === "TransferInitiated") {
            console.log("TransferInitiated:");
            console.log("├── Transfer ID:", parsed.args.transferId);
            console.log("├── Sender:", parsed.args.sender);
            console.log("├── From Token:", parsed.args.fromToken);
            console.log("├── To Token:", parsed.args.toToken);
            console.log("├── Amount:", formatUnits(parsed.args.amount, decimals), fromToken);
            console.log("├── To Chain:", parsed.args.toChainId.toString());
            console.log("├── Recipient:", parsed.args.recipient);
            console.log("└── Protocol:", protocolName);
          }
        } catch (e) {
          // Other events
        }
      }
    }
    
    // Check balance after
    const newBalance = await sourceToken.balanceOf(signer.address);
    const difference = balance - newBalance;
    console.log("\n💰 Balance Change:");
    console.log("Before:", formatUnits(balance, decimals), fromToken);
    console.log("After:", formatUnits(newBalance, decimals), fromToken);
    if (difference > 0n) {
      console.log("Sent:", formatUnits(difference, decimals), fromToken + " ✅");
    }
    
    console.log("\n========================================");
    console.log("✅ SUCCESS!");
    console.log("========================================");
    
    if (protocolName === "CCTP" || protocolName === "CCTP_HOOKS") {
      console.log("\n⏱️  CCTP takes ~15 minutes to complete");
    } else if (protocolName === "LAYERZERO") {
      console.log("\n⏱️  LayerZero takes ~1-3 minutes to complete");
    }
    
    console.log("\n🔍 Track your transfer:");
    console.log(`${sourceConfig.explorer}/tx/${tx.hash}`);
    console.log(`\n📍 Check ${destConfig.name} balance later:`);
    console.log(`${destConfig.explorer}/address/${signer.address}`);
    
  } catch (error) {
    console.error("\n❌ Transfer failed:", error.message);
    
    // Parse specific errors
    if (error.message.includes("Route not configured")) {
      console.log("→ This route hasn't been configured yet");
      console.log("→ Run configure-routes.js first");
    } else if (error.message.includes("insufficient allowance")) {
      console.log("→ Need to approve USDC first");
    } else if (error.message.includes("Cannot transfer to same chain")) {
      console.log("→ Source and destination must be different chains");
    }
  }
}

async function main() {
  const network = hre.network.name;
  
  console.log("🚀 UnifiedRouter Transfer Test");
  console.log("=====================================\n");
  console.log("Current Network:", NETWORKS[network]?.name || network);
  
  // Parse command line arguments from environment variable or process args
  let destNetwork = process.env.DEST_NETWORK;
  let fromToken = process.env.FROM_TOKEN;
  let toToken = process.env.TO_TOKEN;
  
  if (!destNetwork) {
    const args = process.argv.slice(2);
    for (const arg of args) {
      if (arg.startsWith("--to=")) {
        destNetwork = arg.substring(5);
      } else if (arg.startsWith("--from-token=")) {
        fromToken = arg.substring(13);
      } else if (arg.startsWith("--to-token=")) {
        toToken = arg.substring(11);
      }
    }
  }
  
  if (!destNetwork) {
    console.log("\n📝 Usage: ");
    console.log("DEST_NETWORK=<network> FROM_TOKEN=<token> TO_TOKEN=<token> npx hardhat run scripts/test-unified-transfer.js --network <source>");
    console.log("\nExamples:");
    console.log("  # PYUSD (Arbitrum) → USDe (Base) via LayerZero Compose");
    console.log("  DEST_NETWORK=baseSepolia FROM_TOKEN=PYUSD TO_TOKEN=USDe npx hardhat run scripts/test-unified-transfer.js --network arbitrumSepolia");
    console.log("\n  # USDC (Base) → USDe (Arbitrum) via CCTP V2 hooks");
    console.log("  DEST_NETWORK=arbitrumSepolia FROM_TOKEN=USDC TO_TOKEN=USDe npx hardhat run scripts/test-unified-transfer.js --network baseSepolia");
    console.log("\nAvailable networks:");
    for (const [key, config] of Object.entries(NETWORKS)) {
      console.log(`  - ${key} (${config.name}) - tokens: ${Object.keys(config.tokens).join(", ")}`);
    }
    return;
  }
  
  if (!NETWORKS[destNetwork]) {
    console.log(`\n❌ Invalid destination network: ${destNetwork}`);
    console.log("Available networks:", Object.keys(NETWORKS).join(", "));
    return;
  }
  
  if (network === destNetwork) {
    console.log("\n❌ Cannot transfer to same network");
    return;
  }
  
  await testTransfer(destNetwork, fromToken, toToken);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
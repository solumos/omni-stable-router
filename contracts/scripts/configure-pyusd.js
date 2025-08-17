const { ethers } = require("hardhat");

// Contract addresses
const CONTRACTS = {
  sepolia: {
    routeProcessor: "0xD039Cb6B9BbAb2DE0Ae0D92F1DdCb8e6A4Dc88de",
    PYUSD: "0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9", // PYUSD on Sepolia
    PYUSD_OFT: "", // Need to find/deploy PYUSD OFT adapter address
  },
  baseSepolia: {
    routeProcessor: "0xD1e60637cA70C786B857452E50DE8353a01DabBb",
    hookReceiver: "0xE2ea3f454e12362212b1734eD0218E7691bd985c"
  }
};

async function configureSepolia() {
  console.log("⚙️  Configuring PYUSD on Sepolia...\n");
  
  const [signer] = await ethers.getSigners();
  const routeProcessor = await ethers.getContractAt("RouteProcessor", CONTRACTS.sepolia.routeProcessor);
  
  // Check owner
  const owner = await routeProcessor.owner();
  if (owner.toLowerCase() !== signer.address.toLowerCase()) {
    console.log("❌ You are not the owner!");
    console.log("Owner:", owner);
    console.log("You:", signer.address);
    return;
  }
  
  console.log("✅ You are the owner");
  
  // Configure PYUSD as OFT token
  console.log("\n1️⃣ Configuring PYUSD as OFT token...");
  
  if (!CONTRACTS.sepolia.PYUSD || !CONTRACTS.sepolia.PYUSD_OFT) {
    console.log("❌ Please add PYUSD and PYUSD_OFT addresses to this script");
    console.log("\nTo find PYUSD addresses:");
    console.log("• Check PayPal docs: https://www.paypal.com/us/digital-wallet/manage-money/crypto/pyusd");
    console.log("• Check LayerZero docs: https://docs.layerzero.network/contracts/oft-addresses");
    console.log("• Check Etherscan Sepolia for PYUSD contract");
    return;
  }
  
  const tx1 = await routeProcessor.configureToken(
    CONTRACTS.sepolia.PYUSD,
    false,                         // Not USDC
    CONTRACTS.sepolia.PYUSD_OFT,   // OFT adapter address
    0                              // No Stargate pool
  );
  await tx1.wait();
  console.log("✅ PYUSD configured as OFT");
  
  // Set destination OFT address for Base Sepolia
  console.log("\n2️⃣ Setting destination OFT address for Base Sepolia...");
  const BASE_SEPOLIA_CHAIN_ID = 84532;
  const BASE_PYUSD_OFT = ""; // Need Base Sepolia PYUSD OFT address
  
  if (!BASE_PYUSD_OFT) {
    console.log("⚠️  Skipping - need Base Sepolia PYUSD OFT address");
  } else {
    const tx2 = await routeProcessor.setDestinationOFTAddress(
      BASE_SEPOLIA_CHAIN_ID,
      CONTRACTS.sepolia.PYUSD,
      BASE_PYUSD_OFT
    );
    await tx2.wait();
    console.log("✅ Destination OFT configured");
  }
  
  // Set CCTP hook receiver on Base for atomic swaps
  console.log("\n3️⃣ Setting Base Sepolia hook receiver...");
  const tx3 = await routeProcessor.setCCTPHookReceiver(
    BASE_SEPOLIA_CHAIN_ID,
    CONTRACTS.baseSepolia.hookReceiver
  );
  await tx3.wait();
  console.log("✅ Hook receiver set for Base Sepolia");
  
  console.log("\n✅ Sepolia configuration complete!");
}

async function configureBaseSepolia() {
  console.log("⚙️  Configuring Base Sepolia for PYUSD swaps...\n");
  
  const [signer] = await ethers.getSigners();
  const hookReceiver = await ethers.getContractAt("CCTPHookReceiver", CONTRACTS.baseSepolia.hookReceiver);
  
  // Check owner
  const owner = await hookReceiver.owner();
  if (owner.toLowerCase() !== signer.address.toLowerCase()) {
    console.log("❌ You are not the owner!");
    return;
  }
  
  // Add PYUSD as supported token for swaps
  console.log("1️⃣ Adding PYUSD as supported token in hook receiver...");
  const PYUSD_ON_BASE = ""; // Need PYUSD address on Base Sepolia
  
  if (!PYUSD_ON_BASE) {
    console.log("⚠️  Need PYUSD address on Base Sepolia");
    console.log("Note: PYUSD might not be deployed on Base Sepolia yet");
  } else {
    const tx = await hookReceiver.setSupportedToken(PYUSD_ON_BASE, true);
    await tx.wait();
    console.log("✅ PYUSD set as supported token");
  }
  
  // Configure swap pools
  console.log("\n2️⃣ Configuring swap pools...");
  console.log("⚠️  Need to configure DEX pools for PYUSD ↔ USDC swaps");
  console.log("This requires:");
  console.log("• DEX with PYUSD/USDC liquidity on Base Sepolia");
  console.log("• Pool configuration in SwapExecutor");
  
  console.log("\n✅ Base Sepolia configuration complete!");
}

async function checkConfiguration() {
  console.log("🔍 Checking current configuration...\n");
  
  const network = hre.network.name;
  
  if (network === "sepolia") {
    const routeProcessor = await ethers.getContractAt(
      "RouteProcessor", 
      CONTRACTS.sepolia.routeProcessor
    );
    
    if (CONTRACTS.sepolia.PYUSD) {
      const oftAddress = await routeProcessor.tokenToOFT(CONTRACTS.sepolia.PYUSD);
      console.log("PYUSD OFT configured:", oftAddress !== ethers.ZeroAddress);
      if (oftAddress !== ethers.ZeroAddress) {
        console.log("OFT Address:", oftAddress);
      }
    }
    
    const hookReceiver = await routeProcessor.cctpHookReceivers(84532);
    console.log("Base Sepolia hook receiver:", hookReceiver);
    
  } else if (network === "baseSepolia") {
    const hookReceiver = await ethers.getContractAt(
      "CCTPHookReceiver",
      CONTRACTS.baseSepolia.hookReceiver
    );
    
    const usdc = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
    const usdcSupported = await hookReceiver.supportedTokens(usdc);
    console.log("USDC supported:", usdcSupported);
  }
}

async function main() {
  console.log("🔧 PYUSD Configuration Script\n");
  console.log("=====================================\n");
  
  const network = hre.network.name;
  console.log("Network:", network);
  
  // First check current configuration
  await checkConfiguration();
  
  const [signer] = await ethers.getSigners();
  console.log("\n👤 Signer:", signer.address);
  
  if (network === "sepolia") {
    await configureSepolia();
  } else if (network === "baseSepolia") {
    await configureBaseSepolia();
  } else {
    console.log("❌ Please run on sepolia or baseSepolia");
  }
  
  console.log("\n📝 Important Notes:");
  console.log("• PYUSD must be deployed as OFT on both chains");
  console.log("• Need liquidity in DEX pools for swaps");
  console.log("• LayerZero Composer handles the cross-token logic");
  console.log("• Atomic swaps happen via CCTPHookReceiver");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
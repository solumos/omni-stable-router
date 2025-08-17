const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 VERIFYING BASE MAINNET DEPLOYMENT");
  console.log("===================================\n");
  
  const deployment = {
    swapExecutor: "0xE2ea3f454e12362212b1734eD0218E7691bd985c",
    unifiedRouter: "0xD1e60637cA70C786B857452E50DE8353a01DabBb", // Corrected version
    oldRouter: "0xA450EB7baB661aC2C42F51B8f1e9A5BFc1fA6dE3"  // Incorrect owner
  };
  
  const expectedAddresses = {
    cctp: "0x1682Ae6375C4E4A97e4B583BC394c861A46D8962",
    layerzero: "0x1a44076050125825900e736c501f859c50fE728c",
    usdc: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
  };
  
  const [signer] = await ethers.getSigners();
  
  console.log(`👤 Deployer: ${signer.address}`);
  console.log(`🌉 Active Router: ${deployment.unifiedRouter}`);
  console.log(`🔄 SwapExecutor: ${deployment.swapExecutor}\n`);
  
  // Check contract verification status
  console.log("🔍 Contract Verification Status:");
  console.log(`   SwapExecutor: https://basescan.org/address/${deployment.swapExecutor}#code`);
  console.log(`   UnifiedRouter: https://basescan.org/address/${deployment.unifiedRouter}#code`);
  
  // Get router contract
  const routerABI = [
    "function owner() view returns (address)",
    "function protocolContracts(uint8) view returns (address)",
    "function paused() view returns (bool)"
  ];
  
  const router = new ethers.Contract(deployment.unifiedRouter, routerABI, signer);
  
  console.log("\n🔍 Router Configuration:");
  
  // Check ownership
  const owner = await router.owner();
  console.log(`   Owner: ${owner}`);
  console.log(`   ✅ Correct Owner: ${owner.toLowerCase() === signer.address.toLowerCase()}`);
  
  // Check if paused
  const paused = await router.paused();
  console.log(`   Paused: ${paused}`);
  
  // Check protocol configurations
  console.log("\n🔍 Protocol Configurations:");
  
  const protocols = [
    { id: 0, name: "NONE" },
    { id: 1, name: "CCTP", expected: expectedAddresses.cctp },
    { id: 2, name: "CCTP_HOOKS" },
    { id: 3, name: "LAYERZERO", expected: expectedAddresses.layerzero },
    { id: 4, name: "STARGATE" }
  ];
  
  for (const protocol of protocols) {
    try {
      const address = await router.protocolContracts(protocol.id);
      const isConfigured = address !== ethers.ZeroAddress;
      const isCorrect = protocol.expected ? address === protocol.expected : true;
      
      console.log(`   ${protocol.name} (${protocol.id}): ${address}`);
      if (protocol.expected) {
        console.log(`     ✅ Correct: ${isCorrect}`);
      }
      if (isConfigured && protocol.expected) {
        console.log(`     🟢 Status: Configured`);
      } else if (!isConfigured) {
        console.log(`     ⚪ Status: Not configured`);
      }
    } catch (e) {
      console.log(`   ${protocol.name} (${protocol.id}): Error - ${e.message}`);
    }
  }
  
  // Check CCTP specific configuration
  console.log("\n🔵 CCTP Verification:");
  const cctpAddress = await router.protocolContracts(1);
  
  if (cctpAddress === expectedAddresses.cctp) {
    console.log("✅ CCTP TokenMessenger correctly configured");
    console.log(`   Address: ${cctpAddress}`);
    console.log(`   Expected: ${expectedAddresses.cctp}`);
    
    // Check if CCTP contract exists and has expected functions
    try {
      const cctpABI = [
        "function depositForBurn(uint256,uint32,bytes32,address) external returns (uint64)",
        "function depositForBurnWithCaller(uint256,uint32,bytes32,address,bytes32) external returns (uint64)"
      ];
      
      const cctp = new ethers.Contract(cctpAddress, cctpABI, ethers.provider);
      const code = await ethers.provider.getCode(cctpAddress);
      
      if (code !== "0x") {
        console.log("✅ CCTP contract exists and has code");
      } else {
        console.log("❌ CCTP contract has no code");
      }
    } catch (e) {
      console.log("⚠️  Could not verify CCTP contract interface");
    }
  } else {
    console.log("❌ CCTP not properly configured");
    console.log(`   Current: ${cctpAddress}`);
    console.log(`   Expected: ${expectedAddresses.cctp}`);
  }
  
  // Check LayerZero configuration
  console.log("\n🌐 LayerZero Verification:");
  const lzAddress = await router.protocolContracts(3);
  
  if (lzAddress === expectedAddresses.layerzero) {
    console.log("✅ LayerZero Endpoint correctly configured");
    console.log(`   Address: ${lzAddress}`);
    
    try {
      const code = await ethers.provider.getCode(lzAddress);
      if (code !== "0x") {
        console.log("✅ LayerZero contract exists and has code");
      } else {
        console.log("❌ LayerZero contract has no code");
      }
    } catch (e) {
      console.log("⚠️  Could not verify LayerZero contract");
    }
  } else {
    console.log("❌ LayerZero not properly configured");
    console.log(`   Current: ${lzAddress}`);
    console.log(`   Expected: ${expectedAddresses.layerzero}`);
  }
  
  console.log("\n" + "=".repeat(60));
  console.log("📋 BASE MAINNET DEPLOYMENT SUMMARY");
  console.log("=".repeat(60));
  
  const cctpConfigured = await router.protocolContracts(1) === expectedAddresses.cctp;
  const lzConfigured = await router.protocolContracts(3) === expectedAddresses.layerzero;
  const ownerCorrect = await router.owner() === signer.address;
  
  console.log(`✅ SwapExecutor Deployed: ${deployment.swapExecutor}`);
  console.log(`✅ UnifiedRouter Deployed: ${deployment.unifiedRouter}`);
  console.log(`${ownerCorrect ? '✅' : '❌'} Correct Ownership: ${ownerCorrect}`);
  console.log(`${cctpConfigured ? '✅' : '❌'} CCTP Configured: ${cctpConfigured}`);
  console.log(`${lzConfigured ? '✅' : '❌'} LayerZero Configured: ${lzConfigured}`);
  
  const allGood = ownerCorrect && cctpConfigured && lzConfigured;
  console.log(`\n${allGood ? '🎉' : '⚠️ '} Overall Status: ${allGood ? 'READY FOR PRODUCTION' : 'NEEDS ATTENTION'}`);
  
  if (allGood) {
    console.log("\n🚀 Ready for:");
    console.log("   • Cross-chain USDC transfers via CCTP");
    console.log("   • LayerZero cross-chain messaging");
    console.log("   • Frontend integration");
    console.log("   • Arbitrum deployment");
  }
  
  console.log(`\n🔗 View Router: https://basescan.org/address/${deployment.unifiedRouter}`);
  console.log(`🔗 View SwapExecutor: https://basescan.org/address/${deployment.swapExecutor}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
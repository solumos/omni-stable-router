const { ethers } = require("hardhat");

async function main() {
  console.log("⚙️  CONFIGURING ARBITRUM ONE PROTOCOLS");
  console.log("=====================================\n");
  
  const routerAddress = "0xA0FD978f89D941783A43aFBe092B614ef31571F3";
  const [signer] = await ethers.getSigners();
  
  console.log(`👤 Signer: ${signer.address}`);
  console.log(`🌉 Router: ${routerAddress}\n`);
  
  // Get contract with explicit ABI
  const routerABI = [
    "function owner() view returns (address)",
    "function paused() view returns (bool)",
    "function protocolContracts(uint8) view returns (address)",
    "function setProtocolContract(uint8 protocol, address contractAddress) external"
  ];
  
  const router = new ethers.Contract(routerAddress, routerABI, signer);
  
  // Check ownership
  const owner = await router.owner();
  console.log(`👤 Contract Owner: ${owner}`);
  console.log(`✅ Is Correct Owner: ${owner.toLowerCase() === signer.address.toLowerCase()}`);
  
  // Arbitrum One protocol addresses
  const cctpAddress = "0x19330d10D9Cc8751218eaf51E8885D058642E08A";
  const lzAddress = "0x1a44076050125825900e736c501f859c50fE728c";
  
  // Configure CCTP (Protocol 1)
  console.log("\n🔵 Configuring CCTP...");
  console.log(`   Address: ${cctpAddress}`);
  
  try {
    const cctpTx = await router.setProtocolContract(1, cctpAddress);
    console.log(`📋 TX Hash: ${cctpTx.hash}`);
    await cctpTx.wait();
    console.log("✅ CCTP configured successfully");
  } catch (e) {
    console.log("❌ CCTP configuration failed:", e.message);
  }
  
  // Configure LayerZero (Protocol 3)
  console.log("\n🌐 Configuring LayerZero...");
  console.log(`   Address: ${lzAddress}`);
  
  try {
    const lzTx = await router.setProtocolContract(3, lzAddress);
    console.log(`📋 TX Hash: ${lzTx.hash}`);
    await lzTx.wait();
    console.log("✅ LayerZero configured successfully");
  } catch (e) {
    console.log("❌ LayerZero configuration failed:", e.message);
  }
  
  // Verify configuration
  console.log("\n🔍 Verifying Final Configuration...");
  const cctpContract = await router.protocolContracts(1);
  const lzContract = await router.protocolContracts(3);
  
  console.log(`🔵 CCTP: ${cctpContract}`);
  console.log(`🌐 LayerZero: ${lzContract}`);
  
  // Verify addresses match expected
  const cctpCorrect = cctpContract === cctpAddress;
  const lzCorrect = lzContract === lzAddress;
  
  console.log(`   CCTP Correct: ${cctpCorrect ? '✅' : '❌'}`);
  console.log(`   LayerZero Correct: ${lzCorrect ? '✅' : '❌'}`);
  
  console.log("\n" + "=".repeat(50));
  console.log("🎉 ARBITRUM ONE PROTOCOLS CONFIGURED!");
  console.log("=".repeat(50));
  console.log(`📍 UnifiedRouter: ${routerAddress}`);
  console.log(`🔵 CCTP: ${cctpContract}`);
  console.log(`🌐 LayerZero: ${lzContract}`);
  console.log(`\n🔗 Arbiscan: https://arbiscan.io/address/${routerAddress}`);
  
  // Save deployment info
  const deploymentInfo = {
    network: "Arbitrum One",
    chainId: 42161,
    contracts: {
      swapExecutor: "0xdcf63233493ce3A981B1155Fbe1fD6795f3A83d8",
      unifiedRouter: routerAddress
    },
    protocols: {
      cctp: {
        protocol: 1,
        address: cctpContract,
        configured: cctpCorrect
      },
      layerzero: {
        protocol: 3,
        address: lzContract,
        configured: lzCorrect
      }
    },
    owner: owner,
    deployedAt: new Date().toISOString()
  };
  
  const fs = require('fs');
  const path = require('path');
  
  const deploymentsDir = path.join(__dirname, '..', 'deployments');
  const filepath = path.join(deploymentsDir, 'arbitrum_one_42161.json');
  
  fs.writeFileSync(filepath, JSON.stringify(deploymentInfo, null, 2));
  console.log(`\n📄 Deployment info saved: ${filepath}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
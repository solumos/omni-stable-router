const { ethers } = require("hardhat");

async function main() {
  console.log("⚙️  SIMPLE PROTOCOL CONFIGURATION");
  console.log("=================================\n");
  
  const routerAddress = "0xD1e60637cA70C786B857452E50DE8353a01DabBb";
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
  
  // Configure CCTP (Protocol 1)
  console.log("\n🔵 Configuring CCTP...");
  const cctpAddress = "0x1682Ae6375C4E4A97e4B583BC394c861A46D8962";
  
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
  const lzAddress = "0x1a44076050125825900e736c501f859c50fE728c";
  
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
  
  console.log("\n" + "=".repeat(50));
  console.log("🎉 BASE MAINNET PROTOCOLS CONFIGURED!");
  console.log("=".repeat(50));
  console.log(`📍 UnifiedRouter: ${routerAddress}`);
  console.log(`🔵 CCTP: ${cctpContract}`);
  console.log(`🌐 LayerZero: ${lzContract}`);
  console.log(`\n🔗 BaseScan: https://basescan.org/address/${routerAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
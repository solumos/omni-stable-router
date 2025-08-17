const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 INVESTIGATING CCTP CONTRACT");
  console.log("==============================\n");
  
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  
  if (chainId !== 8453) {
    throw new Error("Run this on Base mainnet (8453)");
  }
  
  const addresses = {
    v1: "0x1682Ae6375C4E4A97e4B583BC394c861A46D8962",
    v2: "0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d"
  };
  
  const routerAddress = "0xD1e60637cA70C786B857452E50DE8353a01DabBb";
  
  // Check what the router thinks it's using
  const router = await ethers.getContractAt("UnifiedRouter", routerAddress);
  const configuredCctp = await router.protocolContracts(1);
  
  console.log(`🌉 Router CCTP Config: ${configuredCctp}`);
  console.log(`📊 Configured as v1: ${configuredCctp === addresses.v1}`);
  console.log(`📊 Configured as v2: ${configuredCctp === addresses.v2}\n`);
  
  // Test both contracts
  console.log("🧪 Testing CCTP v1 Contract...");
  try {
    const v1ABI = [
      "function localDomain() view returns (uint32)",
      "function version() view returns (uint32)",
      "function depositForBurn(uint256,uint32,bytes32,address) external returns (uint64)"
    ];
    
    const v1Contract = new ethers.Contract(addresses.v1, v1ABI, ethers.provider);
    
    const v1Domain = await v1Contract.localDomain();
    const v1Version = await v1Contract.version();
    
    console.log(`✅ v1 Local Domain: ${v1Domain}`);
    console.log(`✅ v1 Version: ${v1Version}`);
    
  } catch (e) {
    console.log(`❌ v1 Contract test failed: ${e.message}`);
  }
  
  console.log("\n🧪 Testing CCTP v2 Contract...");
  try {
    const v2ABI = [
      "function localDomain() view returns (uint32)",
      "function version() view returns (uint32)",
      "function depositForBurn(uint256,uint32,bytes32,address) external returns (uint64)"
    ];
    
    const v2Contract = new ethers.Contract(addresses.v2, v2ABI, ethers.provider);
    
    const v2Domain = await v2Contract.localDomain();
    const v2Version = await v2Contract.version();
    
    console.log(`✅ v2 Local Domain: ${v2Domain}`);
    console.log(`✅ v2 Version: ${v2Version}`);
    
  } catch (e) {
    console.log(`❌ v2 Contract test failed: ${e.message}`);
  }
  
  // Check if the v2 address is actually a different type of contract
  console.log("\n🔍 Contract Type Analysis...");
  const v2Code = await ethers.provider.getCode(addresses.v2);
  console.log(`   v2 Code Length: ${v2Code.length - 2} bytes`);
  
  // Try to see if it's an ERC20
  try {
    const erc20ABI = [
      "function name() view returns (string)",
      "function symbol() view returns (string)",
      "function decimals() view returns (uint8)"
    ];
    
    const testToken = new ethers.Contract(addresses.v2, erc20ABI, ethers.provider);
    const name = await testToken.name();
    const symbol = await testToken.symbol();
    const decimals = await testToken.decimals();
    
    console.log(`🪙 Contract is ERC20: ${name} (${symbol}) - ${decimals} decimals`);
    console.log(`⚠️  This is NOT a CCTP contract!`);
    
  } catch (e) {
    console.log("   Not an ERC20 token");
  }
  
  // Check recent transaction to see what happened
  console.log("\n📋 Recent Transaction Analysis...");
  const txHash = "0xcbcf2f866890dffbe2e2ef19b3f5950066559783da5fb11557f2516240c89244";
  const receipt = await ethers.provider.getTransactionReceipt(txHash);
  
  console.log(`   Transaction to: ${receipt.to}`);
  console.log(`   Is router: ${receipt.to.toLowerCase() === routerAddress.toLowerCase()}`);
  
  // Look at the logs to see which contract was actually called
  for (const log of receipt.logs) {
    console.log(`   Log from: ${log.address}`);
    if (log.address.toLowerCase() === addresses.v1.toLowerCase()) {
      console.log(`   ✅ Call to CCTP v1`);
    } else if (log.address.toLowerCase() === addresses.v2.toLowerCase()) {
      console.log(`   ✅ Call to CCTP v2`);
    }
  }
  
  console.log("\n💡 Diagnosis:");
  if (configuredCctp === addresses.v1) {
    console.log("✅ Router correctly using CCTP v1");
    console.log("⏰ Expected completion: 10-20 minutes");
  } else if (configuredCctp === addresses.v2) {
    console.log("⚠️  Router configured to use 'v2' address");
    console.log("🔍 Need to verify this is actually CCTP v2");
    console.log("💡 If not real v2, should revert to v1");
  }
  
  console.log("\n🎯 Recommendation:");
  console.log("1. If v2 address is not real CCTP v2, revert to v1");
  console.log("2. Current transfer should still work via CCTP v1");
  console.log("3. Wait 10-20 minutes for completion");
  console.log("4. Use real CCTP v2 addresses when available");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
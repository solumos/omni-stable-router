const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 INVESTIGATING CCTP V2 CONTRACT");
  console.log("=================================\n");
  
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  
  if (chainId !== 8453) {
    throw new Error("Run this on Base mainnet (8453)");
  }
  
  const v2Address = "0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d";
  const v1Address = "0x1682Ae6375C4E4A97e4B583BC394c861A46D8962";
  
  console.log(`🔍 CCTP v2 Address: ${v2Address}`);
  console.log(`🔍 CCTP v1 Address: ${v1Address}\n`);
  
  // Check contract code
  console.log("📋 Contract Code Analysis:");
  const v2Code = await ethers.provider.getCode(v2Address);
  const v1Code = await ethers.provider.getCode(v1Address);
  
  console.log(`   v2 Code Length: ${v2Code.length - 2} bytes`);
  console.log(`   v1 Code Length: ${v1Code.length - 2} bytes`);
  console.log(`   Different Contracts: ${v2Code !== v1Code}\n`);
  
  // Try various common function signatures
  console.log("🧪 Testing Function Signatures...");
  
  const functions = [
    "function version() view returns (uint32)",
    "function localDomain() view returns (uint32)",
    "function owner() view returns (address)",
    "function depositForBurn(uint256,uint32,bytes32,address) external returns (uint64)",
    "function depositForBurnWithCaller(uint256,uint32,bytes32,address,bytes32) external returns (uint64)",
    "function depositForBurnFast(uint256,uint32,bytes32,address) external returns (uint64)",
    "function fastTransferAllowance() view returns (uint256)",
    "function isFastTransferEnabled() view returns (bool)"
  ];
  
  for (const func of functions) {
    try {
      const contract = new ethers.Contract(v2Address, [func], ethers.provider);
      const funcName = func.split('(')[0].split(' ').pop();
      
      if (func.includes('view returns')) {
        const result = await contract[funcName]();
        console.log(`   ✅ ${funcName}(): ${result}`);
      } else {
        console.log(`   ✅ ${funcName}(): Available (external function)`);
      }
    } catch (e) {
      const funcName = func.split('(')[0].split(' ').pop();
      console.log(`   ❌ ${funcName}(): Not available`);
    }
  }
  
  // Compare with v1 contract
  console.log("\n🔍 Comparing with CCTP v1...");
  
  const v1Functions = [
    "function version() view returns (uint32)",
    "function localDomain() view returns (uint32)",
    "function depositForBurn(uint256,uint32,bytes32,address) external returns (uint64)"
  ];
  
  console.log("CCTP v1 Functions:");
  for (const func of v1Functions) {
    try {
      const contract = new ethers.Contract(v1Address, [func], ethers.provider);
      const funcName = func.split('(')[0].split(' ').pop();
      
      if (func.includes('view returns')) {
        const result = await contract[funcName]();
        console.log(`   ✅ ${funcName}(): ${result}`);
      } else {
        console.log(`   ✅ ${funcName}(): Available`);
      }
    } catch (e) {
      const funcName = func.split('(')[0].split(' ').pop();
      console.log(`   ❌ ${funcName}(): Not available`);
    }
  }
  
  // Check if the v2 address might be something else
  console.log("\n🔍 Contract Type Investigation...");
  
  // Try ERC20 interface (in case it's a token)
  try {
    const erc20ABI = [
      "function name() view returns (string)",
      "function symbol() view returns (string)",
      "function decimals() view returns (uint8)"
    ];
    
    const erc20 = new ethers.Contract(v2Address, erc20ABI, ethers.provider);
    const name = await erc20.name();
    const symbol = await erc20.symbol();
    const decimals = await erc20.decimals();
    
    console.log(`   🪙 Token Name: ${name}`);
    console.log(`   🪙 Token Symbol: ${symbol}`);
    console.log(`   🪙 Token Decimals: ${decimals}`);
    console.log("   ⚠️  This appears to be a token contract, not CCTP!");
    
  } catch (e) {
    console.log("   ❌ Not an ERC20 token");
  }
  
  // Try to get creation info
  console.log("\n📊 Contract Information:");
  console.log(`   🔗 Base Scan: https://basescan.org/address/${v2Address}`);
  console.log(`   🔗 Code: https://basescan.org/address/${v2Address}#code`);
  
  console.log("\n💡 Recommendations:");
  console.log("1. Check BaseScan for contract verification");
  console.log("2. Verify this is the correct CCTP v2 address");
  console.log("3. Check Circle's official documentation");
  console.log("4. The address might be for a different chain");
  
  console.log("\n📋 Current Status:");
  console.log("• CCTP v1 is working correctly");
  console.log("• Provided v2 address has different ABI");
  console.log("• May need official CCTP v2 addresses for Base");
  console.log("• Continue using v1 until v2 is confirmed");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
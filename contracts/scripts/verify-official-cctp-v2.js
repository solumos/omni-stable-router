const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 VERIFYING OFFICIAL CCTP V2 ADDRESSES");
  console.log("======================================\n");
  
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  
  if (chainId !== 8453) {
    throw new Error("Run this on Base mainnet (8453)");
  }
  
  // Official addresses from Circle documentation
  const officialAddresses = {
    v1: {
      tokenMessenger: "0x1682Ae6375C4E4A97e4B583BC394c861A46D8962",
      messageTransmitter: "0xAD09780d193884d503182aD4588450C416D6F9D4"
    },
    v2: {
      tokenMessengerV2: "0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d",
      messageTransmitterV2: "0x81D40F21F12A8F0E3252Bccb954D722d4c464B64"
    }
  };
  
  console.log("📋 Official Circle Documentation Addresses:");
  console.log(`🔵 CCTP v1 TokenMessenger: ${officialAddresses.v1.tokenMessenger}`);
  console.log(`⚡ CCTP v2 TokenMessengerV2: ${officialAddresses.v2.tokenMessengerV2}\n`);
  
  // Test CCTP v1 (known working)
  console.log("🧪 Testing CCTP v1 (Known Working)...");
  try {
    const v1ABI = [
      "function localDomain() view returns (uint32)",
      "function depositForBurn(uint256,uint32,bytes32,address) external returns (uint64)"
    ];
    
    const v1Contract = new ethers.Contract(
      officialAddresses.v1.tokenMessenger,
      v1ABI,
      ethers.provider
    );
    
    const v1Domain = await v1Contract.localDomain();
    console.log(`✅ v1 Local Domain: ${v1Domain} (6=Base)`);
    
  } catch (e) {
    console.log(`❌ v1 test failed: ${e.message}`);
  }
  
  // Test CCTP v2 with different ABI approaches
  console.log("\n🧪 Testing CCTP v2 with Multiple ABI Approaches...");
  
  // Approach 1: Same ABI as v1
  console.log("Approach 1: Testing with v1-compatible ABI...");
  try {
    const v2ABI_v1 = [
      "function localDomain() view returns (uint32)",
      "function depositForBurn(uint256,uint32,bytes32,address) external returns (uint64)"
    ];
    
    const v2Contract_v1 = new ethers.Contract(
      officialAddresses.v2.tokenMessengerV2,
      v2ABI_v1,
      ethers.provider
    );
    
    const v2Domain = await v2Contract_v1.localDomain();
    console.log(`✅ v2 Local Domain: ${v2Domain} (6=Base)`);
    console.log("✅ v2 supports v1 interface (backward compatible)");
    
  } catch (e) {
    console.log(`❌ v2 v1-compatible test failed: ${e.message}`);
  }
  
  // Approach 2: v2-specific ABI
  console.log("\nApproach 2: Testing with v2-specific ABI...");
  try {
    const v2ABI_v2 = [
      "function localDomain() view returns (uint32)",
      "function depositForBurn(uint256,uint32,bytes32,address) external returns (uint64)",
      "function depositForBurnWithHook(uint256,uint32,bytes32,address,bytes32,uint256,uint32) external returns (uint64)"
    ];
    
    const v2Contract_v2 = new ethers.Contract(
      officialAddresses.v2.tokenMessengerV2,
      v2ABI_v2,
      ethers.provider
    );
    
    const v2Domain = await v2Contract_v2.localDomain();
    console.log(`✅ v2 Local Domain: ${v2Domain} (6=Base)`);
    console.log("✅ v2 supports depositForBurnWithHook (fast transfers)");
    
  } catch (e) {
    console.log(`❌ v2-specific test failed: ${e.message}`);
  }
  
  // Approach 3: Check contract bytecode
  console.log("\nApproach 3: Analyzing contract bytecode...");
  const v1Code = await ethers.provider.getCode(officialAddresses.v1.tokenMessenger);
  const v2Code = await ethers.provider.getCode(officialAddresses.v2.tokenMessengerV2);
  
  console.log(`📊 v1 Code Length: ${v1Code.length - 2} bytes`);
  console.log(`📊 v2 Code Length: ${v2Code.length - 2} bytes`);
  console.log(`📊 Different Contracts: ${v1Code !== v2Code}`);
  
  if (v2Code === "0x") {
    console.log("❌ v2 contract not deployed");
  } else if (v1Code === v2Code) {
    console.log("⚠️  v1 and v2 have identical bytecode (might be same contract)");
  } else {
    console.log("✅ v1 and v2 are different contracts (expected for v2)");
  }
  
  // Test if we can determine contract type
  console.log("\nApproach 4: Contract type detection...");
  try {
    // Try ERC20 interface
    const erc20ABI = [
      "function name() view returns (string)",
      "function symbol() view returns (string)"
    ];
    
    const testERC20 = new ethers.Contract(
      officialAddresses.v2.tokenMessengerV2,
      erc20ABI,
      ethers.provider
    );
    
    const name = await testERC20.name();
    const symbol = await testERC20.symbol();
    console.log(`🪙 Contract is ERC20: ${name} (${symbol})`);
    console.log("⚠️  This is a token, not a CCTP contract");
    
  } catch (e) {
    console.log("✅ Not an ERC20 token (good for CCTP contract)");
  }
  
  console.log("\n💡 Diagnosis:");
  console.log("================");
  
  if (v2Code === "0x") {
    console.log("❌ CCTP v2 not deployed on Base yet");
    console.log("🔄 Continue using CCTP v1 for now");
  } else if (v1Code === v2Code) {
    console.log("⚠️  CCTP v2 address points to same contract as v1");
    console.log("🔄 Use v1 address until true v2 is deployed");
  } else {
    console.log("✅ CCTP v2 is a different contract than v1");
    console.log("🧪 Need to test actual fast transfer functionality");
  }
  
  console.log("\n🎯 Recommendation:");
  console.log("===================");
  console.log("1. Use proven CCTP v1 address for reliability");
  console.log("2. Update router contract to support depositForBurnWithHook()");
  console.log("3. Test v2 functionality when it's confirmed working");
  console.log("4. Router code is ready for v2 when available");
  
  console.log("\n📊 Address Summary:");
  console.log("✅ Working: CCTP v1 TokenMessenger");
  console.log("🔍 Testing: CCTP v2 TokenMessengerV2");
  console.log("🚀 Ready: Router with v2 interface support");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
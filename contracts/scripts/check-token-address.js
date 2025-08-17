const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Checking Token at Address");
  console.log("============================\n");
  
  const tokenAddress = "0x5d3a1ff2b6bab83b63cd9ad0787074081a52ef34";
  const [signer] = await ethers.getSigners();
  
  console.log("👤 User:", signer.address);
  console.log("📍 Token Address:", tokenAddress);
  
  // Check if contract exists
  const code = await ethers.provider.getCode(tokenAddress);
  if (code === "0x") {
    console.log("❌ No contract found at this address");
    return;
  }
  
  console.log("✅ Contract found");
  
  // Try standard ERC20 interface
  try {
    const token = await ethers.getContractAt([
      "function balanceOf(address) view returns (uint256)",
      "function totalSupply() view returns (uint256)",
      "function symbol() view returns (string)",
      "function name() view returns (string)",
      "function decimals() view returns (uint8)",
      "function allowance(address, address) view returns (uint256)",
      "function approve(address, uint256) returns (bool)"
    ], tokenAddress);
    
    const name = await token.name();
    const symbol = await token.symbol();
    const decimals = await token.decimals();
    const totalSupply = await token.totalSupply();
    const balance = await token.balanceOf(signer.address);
    
    console.log("\n📊 Token Details:");
    console.log(`   Name: ${name}`);
    console.log(`   Symbol: ${symbol}`);
    console.log(`   Decimals: ${decimals}`);
    console.log(`   Total Supply: ${ethers.formatUnits(totalSupply, decimals)}`);
    console.log(`   Your Balance: ${ethers.formatUnits(balance, decimals)} ${symbol}`);
    
    // Check if it might be an OFT token
    try {
      const oftToken = await ethers.getContractAt([
        "function endpoint() view returns (address)",
        "function eid() view returns (uint32)",
        "function oftVersion() view returns (bytes4, uint8)"
      ], tokenAddress);
      
      const endpoint = await oftToken.endpoint();
      console.log(`\n🌐 LayerZero OFT Details:`);
      console.log(`   Endpoint: ${endpoint}`);
      
      try {
        const eid = await oftToken.eid();
        console.log(`   Endpoint ID: ${eid}`);
      } catch (e) {
        console.log("   Endpoint ID: Not available");
      }
      
      try {
        const version = await oftToken.oftVersion();
        console.log(`   OFT Version: ${version}`);
      } catch (e) {
        console.log("   OFT Version: Not available");
      }
      
      console.log("✅ This appears to be a LayerZero OFT token!");
      
    } catch (e) {
      console.log("\n⚠️  Not a LayerZero OFT token (standard ERC20)");
    }
    
  } catch (e) {
    console.log("❌ Error reading token:", e.message);
  }
  
  console.log(`\n🔗 View on BaseScan: https://sepolia.basescan.org/address/${tokenAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
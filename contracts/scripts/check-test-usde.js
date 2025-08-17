const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Checking Test USDe Token Deployment");
  console.log("======================================\n");
  
  const usdeAddress = "0x76eedc9768cE1bA7632202a4B3aFAE05b9a89B24";
  const [signer] = await ethers.getSigners();
  
  console.log("👤 User:", signer.address);
  console.log("📍 USDe Address:", usdeAddress);
  
  // Get the token contract
  const usde = await ethers.getContractAt([
    "function balanceOf(address) view returns (uint256)",
    "function totalSupply() view returns (uint256)",
    "function symbol() view returns (string)",
    "function name() view returns (string)",
    "function decimals() view returns (uint8)",
    "function transfer(address, uint256) returns (bool)"
  ], usdeAddress);
  
  try {
    // Check token details
    const name = await usde.name();
    const symbol = await usde.symbol();
    const decimals = await usde.decimals();
    const totalSupply = await usde.totalSupply();
    const balance = await usde.balanceOf(signer.address);
    
    console.log("📊 Token Details:");
    console.log(`   Name: ${name}`);
    console.log(`   Symbol: ${symbol}`);
    console.log(`   Decimals: ${decimals}`);
    console.log(`   Total Supply: ${ethers.formatUnits(totalSupply, decimals)}`);
    console.log(`   Your Balance: ${ethers.formatUnits(balance, decimals)} ${symbol}`);
    
    if (balance > 0) {
      console.log("\n✅ You have USDe tokens!");
      console.log("🎯 Ready to test LayerZero compose functionality");
    } else {
      console.log("\n⚠️  No USDe balance found");
      console.log("💡 The initial supply was minted to the deployer during construction");
    }
    
    // Update token config
    console.log("\n📋 Updated Token Configuration:");
    console.log("Add this to your frontend tokens.json:");
    console.log(`"USDe": {`);
    console.log(`  "name": "${name}",`);
    console.log(`  "decimals": ${decimals},`);
    console.log(`  "protocol": "LayerZero OFT",`);
    console.log(`  "addresses": {`);
    console.log(`    "84532": "${usdeAddress}"`);
    console.log(`  }`);
    console.log(`}`);
    
  } catch (e) {
    console.log("❌ Error checking token:", e.message);
  }
  
  console.log(`\n🔗 View on BaseScan: https://sepolia.basescan.org/address/${usdeAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
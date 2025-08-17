const { ethers } = require("hardhat");

// Test token addresses
const TOKENS = {
  sepolia: {
    USDC: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
    PYUSD: "0xcac524bca292aaade2df8a05cc58f0a65b1b3bb9",
    USDe: "0x5d3a1Ff2b6BAb83b63cd9AD0787074081a52ef34"
  },
  baseSepolia: {
    USDC: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    USDe: "0x5d3a1Ff2b6BAb83b63cd9AD0787074081a52ef34"
  },
  arbitrumSepolia: {
    USDC: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",
    PYUSD: "0xcac524bca292aaade2df8a05cc58f0a65b1b3bb9",
    USDe: "0x5d3a1Ff2b6BAb83b63cd9AD0787074081a52ef34"
  }
};

async function checkToken(address, symbol) {
  try {
    const token = await ethers.getContractAt("IERC20", address);
    
    // Try to get balance of zero address to test if contract exists
    const balance = await token.balanceOf("0x0000000000000000000000000000000000000000");
    
    // Try to get name and symbol if it's a full ERC20
    let name = "Unknown";
    let decimals = "Unknown";
    try {
      const tokenMeta = await ethers.getContractAt([
        "function name() view returns (string)",
        "function symbol() view returns (string)", 
        "function decimals() view returns (uint8)"
      ], address);
      name = await tokenMeta.name();
      decimals = await tokenMeta.decimals();
    } catch (e) {
      // Basic ERC20 might not have name/symbol
    }
    
    console.log(`✅ ${symbol}: ${address}`);
    console.log(`   Name: ${name}`);
    console.log(`   Decimals: ${decimals}`);
    console.log(`   Zero balance: ${balance.toString()}`);
    return true;
  } catch (error) {
    console.log(`❌ ${symbol}: ${address}`);
    console.log(`   Error: ${error.message}`);
    return false;
  }
}

async function main() {
  const network = hre.network.name;
  const [signer] = await ethers.getSigners();
  
  console.log(`🔍 Checking tokens on ${network}`);
  console.log(`Account: ${signer.address}`);
  console.log("═".repeat(50));
  
  const tokens = TOKENS[network];
  if (!tokens) {
    console.log(`❌ No token config for ${network}`);
    return;
  }
  
  for (const [symbol, address] of Object.entries(tokens)) {
    console.log();
    await checkToken(address, symbol);
  }
  
  console.log("\n" + "═".repeat(50));
  console.log("✅ Token check complete");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
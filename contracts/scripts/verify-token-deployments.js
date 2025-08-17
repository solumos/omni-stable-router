const { ethers } = require("hardhat");

// Token addresses to verify
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
    PYUSD: "0xcac524bca292aaade2df8a05cc58f0a65b1b3bb9", // Need to verify
    USDe: "0x5d3a1Ff2b6BAb83b63cd9AD0787074081a52ef34"
  },
  optimismSepolia: {
    USDC: "0x5fd84259d66Cd46123540766Be93DFE6D43130D7",
    USDe: "0x5d3a1Ff2b6BAb83b63cd9AD0787074081a52ef34"
  }
};

async function verifyTokenDeployments() {
  const network = hre.network.name;
  const [signer] = await ethers.getSigners();
  
  console.log("============================================");
  console.log(`Verifying Token Deployments on ${network}`);
  console.log("============================================\n");
  console.log("Network:", network);
  console.log("Account:", signer.address);
  
  const tokens = TOKENS[network];
  if (!tokens) {
    console.log("❌ Network not configured:", network);
    return;
  }
  
  console.log("\n📋 Checking token contracts:\n");
  
  for (const [tokenName, tokenAddress] of Object.entries(tokens)) {
    console.log(`\n🔍 ${tokenName} (${tokenAddress})`);
    console.log("─────────────────────────────");
    
    try {
      // Check if contract exists
      const code = await ethers.provider.getCode(tokenAddress);
      
      if (code === "0x") {
        console.log("❌ No contract deployed at this address");
        continue;
      }
      
      console.log("✅ Contract exists");
      
      // Try to get basic ERC20 info
      try {
        const token = await ethers.getContractAt("IERC20Metadata", tokenAddress);
        
        // Get token details
        const [name, symbol, decimals] = await Promise.all([
          token.name().catch(() => "Unknown"),
          token.symbol().catch(() => "Unknown"),
          token.decimals().catch(() => "Unknown")
        ]);
        
        console.log(`   Name: ${name}`);
        console.log(`   Symbol: ${symbol}`);
        console.log(`   Decimals: ${decimals}`);
        
        // Get user balance
        const balance = await token.balanceOf(signer.address);
        const formattedBalance = decimals !== "Unknown" 
          ? ethers.formatUnits(balance, decimals) 
          : balance.toString();
        console.log(`   Your Balance: ${formattedBalance} ${symbol}`);
        
        // Check if it's an OFT (has LayerZero functions)
        try {
          // Try to call a LayerZero-specific function
          const oftContract = new ethers.Contract(
            tokenAddress,
            ["function lzEndpoint() view returns (address)"],
            ethers.provider
          );
          const endpoint = await oftContract.lzEndpoint().catch(() => null);
          
          if (endpoint) {
            console.log(`   ✅ LayerZero OFT: Yes`);
            console.log(`   LZ Endpoint: ${endpoint}`);
          } else {
            console.log(`   ℹ️  LayerZero OFT: No (standard ERC20)`);
          }
        } catch (e) {
          // Not an OFT
          console.log(`   ℹ️  LayerZero OFT: No (standard ERC20)`);
        }
        
      } catch (error) {
        console.log("⚠️  Could not read ERC20 properties");
        console.log("   Error:", error.message);
      }
      
    } catch (error) {
      console.log("❌ Error checking token:", error.message);
    }
  }
  
  console.log("\n============================================");
  console.log("Token Verification Complete");
  console.log("============================================");
  
  // Provide faucet links
  console.log("\n💧 Token Faucets:");
  console.log("─────────────────────");
  console.log("USDC: https://faucet.circle.com");
  console.log("PYUSD: https://faucet.paxos.com/pyusd-testnet");
  console.log("USDe: Check Ethena docs for testnet faucet");
}

async function main() {
  await verifyTokenDeployments();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
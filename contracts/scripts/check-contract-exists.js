const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 CHECKING CONTRACT EXISTENCE");
  console.log("==============================\n");
  
  const addresses = {
    swapExecutor: "0xE2ea3f454e12362212b1734eD0218E7691bd985c",
    unifiedRouter: "0xD1e60637cA70C786B857452E50DE8353a01DabBb",
    oldRouter: "0xA450EB7baB661aC2C42F51B8f1e9A5BFc1fA6dE3"
  };
  
  for (const [name, address] of Object.entries(addresses)) {
    console.log(`🔍 Checking ${name}: ${address}`);
    
    try {
      // Check if contract has code
      const code = await ethers.provider.getCode(address);
      console.log(`   Code length: ${code.length - 2} bytes`);
      
      if (code === "0x") {
        console.log("   ❌ No contract deployed at this address");
      } else {
        console.log("   ✅ Contract exists");
        
        // Try to get basic info
        try {
          const balance = await ethers.provider.getBalance(address);
          console.log(`   ETH Balance: ${ethers.formatEther(balance)} ETH`);
        } catch (e) {
          console.log(`   Balance check failed: ${e.message}`);
        }
        
        // For UnifiedRouter, try to call owner() directly
        if (name.includes("Router")) {
          try {
            // Try with the actual UnifiedRouter contract
            const router = await ethers.getContractAt("UnifiedRouter", address);
            const owner = await router.owner();
            console.log(`   ✅ Owner: ${owner}`);
          } catch (e) {
            console.log(`   ❌ Owner call failed: ${e.message}`);
            
            // Try with a minimal ABI
            try {
              const minimalABI = ["function owner() view returns (address)"];
              const contract = new ethers.Contract(address, minimalABI, ethers.provider);
              const owner = await contract.owner();
              console.log(`   ✅ Owner (minimal ABI): ${owner}`);
            } catch (e2) {
              console.log(`   ❌ Minimal ABI owner call failed: ${e2.message}`);
            }
          }
        }
      }
    } catch (e) {
      console.log(`   ❌ Error checking contract: ${e.message}`);
    }
    
    console.log("");
  }
  
  // Check network
  const network = await ethers.provider.getNetwork();
  console.log(`📍 Network: ${network.name} (${network.chainId})`);
  
  // Check block number to ensure we're connected
  const blockNumber = await ethers.provider.getBlockNumber();
  console.log(`📦 Latest block: ${blockNumber}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
const { ethers } = require("hardhat");

async function testTenderly() {
  const [signer] = await ethers.getSigners();
  console.log("Testing Tenderly connection...");
  console.log("Network:", hre.network.name);
  console.log("Signer:", signer.address);
  
  const balance = await ethers.provider.getBalance(signer.address);
  console.log("Balance:", ethers.formatEther(balance), "ETH");
  
  // Try to deploy a simple contract
  console.log("\nDeploying UnifiedRouter...");
  const UnifiedRouter = await ethers.getContractFactory("UnifiedRouter");
  const router = await UnifiedRouter.deploy(signer.address);
  await router.waitForDeployment();
  
  const address = await router.getAddress();
  console.log("Router deployed at:", address);
  
  // Test function calls
  console.log("\nTesting contract functions...");
  
  // Check if contract is deployed
  const code = await ethers.provider.getCode(address);
  console.log("Contract deployed:", code.length > 2 ? "Yes" : "No");
  
  // Get the contract with the proper ABI
  const routerContract = await ethers.getContractAt("UnifiedRouter", address);
  
  try {
    // Try calling the function
    console.log("\nCalling setProtocolContract...");
    const tx = await routerContract.setProtocolContract(1, "0xBd3fa81B58Ba92a82136038B25aDec7066af3155");
    console.log("TX sent:", tx.hash);
    await tx.wait();
    console.log("✅ Protocol configured successfully");
    
    // Check the value
    const cctpAddress = await routerContract.protocolContracts(1);
    console.log("CCTP address:", cctpAddress);
  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error("Full error:", error);
  }
}

testTenderly()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
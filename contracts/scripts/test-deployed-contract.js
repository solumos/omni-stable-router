const { ethers } = require("hardhat");

async function main() {
  const routerAddress = "0xC40c9276eaD77e75947a51b49b773A865aa8d1Be"; // Latest deployed
  
  console.log("Testing deployed UnifiedRouter at:", routerAddress);
  
  const router = await ethers.getContractAt("UnifiedRouter", routerAddress);
  
  console.log("Available functions:");
  const fragment = router.interface.fragments;
  fragment.forEach(f => {
    if (f.type === 'function') {
      console.log(`  ${f.name}(${f.inputs.map(i => `${i.type} ${i.name}`).join(', ')})`);
    }
  });
  
  console.log("\nTesting contract calls:");
  
  try {
    const owner = await router.owner();
    console.log("Owner:", owner);
  } catch (e) {
    console.log("Error getting owner:", e.message);
  }
  
  try {
    const paused = await router.paused();
    console.log("Paused:", paused);
  } catch (e) {
    console.log("Error getting paused status:", e.message);
  }
  
  // Check if protocolContracts mapping exists
  try {
    const cctpContract = await router.protocolContracts(1);
    console.log("CCTP contract:", cctpContract);
  } catch (e) {
    console.log("Error getting protocol contract:", e.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
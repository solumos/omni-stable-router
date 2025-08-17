const { ethers } = require("hardhat");

async function main() {
  const contracts = {
    "SwapExecutor": "0x01ef072F9ebDc605209203d5152aE5c33f4a3Ce4",
    "CCTPHookReceiver": "0x3419bF0A8E74B825D14641B0Bf3D1Ce710E0aDC7"
  };
  
  for (const [name, address] of Object.entries(contracts)) {
    const code = await ethers.provider.getCode(address);
    if (code !== "0x" && code !== "0x00") {
      console.log(`✅ ${name} deployed at ${address}`);
    } else {
      console.log(`❌ ${name} NOT deployed at ${address}`);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch(console.error);
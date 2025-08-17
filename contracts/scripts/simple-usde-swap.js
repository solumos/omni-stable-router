const { ethers } = require("hardhat");

async function main() {
  console.log("💱 SWAP 0.1 USDC FOR USDe");
  console.log("=========================\n");
  
  const [user] = await ethers.getSigners();
  
  // Addresses
  const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
  const USDe = "0x5d3a1ff2b6bab83b63cd9ad0787074081a52ef34";
  const ROUTER = "0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43"; // Aerodrome
  
  console.log("User:", user.address);
  
  const usdc = await ethers.getContractAt("IERC20", USDC);
  const usde = await ethers.getContractAt("IERC20", USDe);
  
  const usdcBal = await usdc.balanceOf(user.address);
  console.log("USDC balance:", ethers.formatUnits(usdcBal, 6));
  
  // Swap 0.1 USDC
  const amount = ethers.parseUnits("0.1", 6);
  
  // Approve
  console.log("\nApproving...");
  await (await usdc.approve(ROUTER, amount)).wait();
  
  // Swap
  const router = new ethers.Contract(ROUTER, [
    "function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, (address from, address to, bool stable, address factory)[] routes, address to, uint256 deadline) returns (uint256[] amounts)"
  ], user);
  
  console.log("Swapping...");
  const tx = await router.swapExactTokensForTokens(
    amount,
    0, // Accept any amount
    [{from: USDC, to: USDe, stable: true, factory: "0x420DD381b31aEf6683db6B902084cB0FFECe40Da"}],
    user.address,
    Math.floor(Date.now() / 1000) + 300
  );
  
  console.log("TX:", tx.hash);
  await tx.wait();
  
  const usdeBal = await usde.balanceOf(user.address);
  console.log("\nUSDe received:", ethers.formatUnits(usdeBal, 18));
  console.log("✅ Success!");
}

main().catch(console.error);
const { ethers } = require("hardhat");

async function checkWhales() {
  const USDC_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
  
  // Known USDC whales on Base
  const whales = [
    "0x4c80E24119CFB836cdF0a6b53dc23F04F7e652CA", // Current whale
    "0x20FE51A9229EEf2cF8Ad9E89d91CAb9312cF3b7A", // Large holder
    "0x489ee077994B6658eAfA855C308275EAd8097C4A", // Another large holder
    "0x0000000000000000000000000000000000000000", // Black hole (won't work)
    "0xd2FaB1443d8119bc0904eCB3681fF8ceb8aa6A5c", // Binance hot wallet
    "0x3304E22DDaa22bCdC5fCa2269b418046aE7b566A"  // Another potential whale
  ];
  
  const usdc = await ethers.getContractAt("IERC20", USDC_BASE);
  
  console.log("Checking USDC balances on Base...\n");
  
  for (const whale of whales) {
    try {
      const balance = await usdc.balanceOf(whale);
      const formatted = ethers.formatUnits(balance, 6);
      console.log(`${whale}: ${formatted} USDC`);
    } catch (error) {
      console.log(`${whale}: Error checking balance`);
    }
  }
}

checkWhales()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
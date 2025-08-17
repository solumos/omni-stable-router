const { ethers } = require("hardhat");

async function main() {
  const recipient = "0xFC825D166f219ea5Aa75d993609eae546E013cEE";
  
  console.log("========================================");
  console.log("🐋 Funding Account with Tokens");
  console.log("========================================\n");
  console.log("Recipient:", recipient);
  
  // Base mainnet token addresses
  const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
  const USDe_ADDRESS = "0x5d3a1Ff2b6BAb83b63cd9AD0787074081a52ef34";
  
  // Known whale addresses on Base mainnet
  const USDC_WHALE = "0x20FE51A9229EEf2cF8Ad9E89d91CAb9312cF3b7A";
  const USDe_WHALE = "0x0B0A5886664376F59C351ba3f598C8A8B4D51B80";
  
  // First, send some ETH for gas
  console.log("\n1️⃣ Sending ETH for gas...");
  const [signer] = await ethers.getSigners();
  const ethTx = await signer.sendTransaction({
    to: recipient,
    value: ethers.parseEther("10")
  });
  await ethTx.wait();
  console.log("✅ Sent 10 ETH for gas");
  
  // USDC Transfer
  console.log("\n2️⃣ Transferring USDC...");
  
  // Fund whale with ETH first
  await signer.sendTransaction({
    to: USDC_WHALE,
    value: ethers.parseEther("1")
  }).then(tx => tx.wait());
  
  // Impersonate account
  await ethers.provider.send("hardhat_impersonateAccount", [USDC_WHALE]);
  
  // Get balance
  const usdcAbi = [
    "function balanceOf(address) view returns (uint256)",
    "function transfer(address to, uint256 amount) returns (bool)"
  ];
  const usdcContract = new ethers.Contract(USDC_ADDRESS, usdcAbi, ethers.provider);
  const usdcBalance = await usdcContract.balanceOf(USDC_WHALE);
  console.log("🐋 USDC Whale balance:", ethers.formatUnits(usdcBalance, 6), "USDC");
  
  // Send USDC using eth_sendTransaction directly
  const transferAmount = ethers.parseUnits("10000", 6);
  const transferData = usdcContract.interface.encodeFunctionData("transfer", [recipient, transferAmount]);
  
  await ethers.provider.send("eth_sendTransaction", [{
    from: USDC_WHALE,
    to: USDC_ADDRESS,
    data: transferData
  }]);
  
  console.log("✅ Sent 10,000 USDC to", recipient);
  
  // Stop impersonating
  await ethers.provider.send("hardhat_stopImpersonatingAccount", [USDC_WHALE]);
  
  // USDe Transfer
  console.log("\n3️⃣ Transferring USDe...");
  
  // Fund whale with ETH first
  await signer.sendTransaction({
    to: USDe_WHALE,
    value: ethers.parseEther("1")
  }).then(tx => tx.wait());
  
  // Impersonate account
  await ethers.provider.send("hardhat_impersonateAccount", [USDe_WHALE]);
  
  // Get balance
  const usdeContract = new ethers.Contract(USDe_ADDRESS, usdcAbi, ethers.provider);
  const usdeBalance = await usdeContract.balanceOf(USDe_WHALE);
  console.log("🐋 USDe Whale balance:", ethers.formatUnits(usdeBalance, 18), "USDe");
  
  // Send USDe if whale has balance
  if (usdeBalance > 0) {
    const usdeTransferAmount = ethers.parseUnits("10000", 18);
    const usdeTransferData = usdeContract.interface.encodeFunctionData("transfer", [
      recipient, 
      usdeBalance < usdeTransferAmount ? usdeBalance : usdeTransferAmount
    ]);
    
    await ethers.provider.send("eth_sendTransaction", [{
      from: USDe_WHALE,
      to: USDe_ADDRESS,
      data: usdeTransferData
    }]);
    
    console.log("✅ Sent USDe to", recipient);
  } else {
    console.log("⚠️ USDe whale has no balance, trying different whale...");
    
    // Try a different whale
    const altWhale = "0x5d3a1Ff2b6BAb83b63cd9AD0787074081a52ef34"; // USDe contract itself might have balance
    await ethers.provider.send("hardhat_impersonateAccount", [altWhale]);
    const altBalance = await usdeContract.balanceOf(altWhale);
    
    if (altBalance > 0) {
      await signer.sendTransaction({
        to: altWhale,
        value: ethers.parseEther("1")
      }).then(tx => tx.wait());
      
      const transferData = usdeContract.interface.encodeFunctionData("transfer", [
        recipient,
        ethers.parseUnits("1000", 18)
      ]);
      
      await ethers.provider.send("eth_sendTransaction", [{
        from: altWhale,
        to: USDe_ADDRESS,
        data: transferData
      }]);
      
      console.log("✅ Sent USDe from alternate source");
    }
    await ethers.provider.send("hardhat_stopImpersonatingAccount", [altWhale]);
  }
  
  // Stop impersonating
  await ethers.provider.send("hardhat_stopImpersonatingAccount", [USDe_WHALE]);
  
  // Check final balances
  console.log("\n4️⃣ Final balances for", recipient);
  const finalUSDC = await usdcContract.balanceOf(recipient);
  const finalUSDe = await usdeContract.balanceOf(recipient);
  const finalETH = await ethers.provider.getBalance(recipient);
  
  console.log("💰 ETH:", ethers.formatEther(finalETH));
  console.log("💵 USDC:", ethers.formatUnits(finalUSDC, 6));
  console.log("💴 USDe:", ethers.formatUnits(finalUSDe, 18));
  
  console.log("\n========================================");
  console.log("✅ Account Funded Successfully!");
  console.log("========================================");
  
  console.log("\n📱 MetaMask Configuration Instructions:");
  console.log("========================================");
  console.log("1. Open MetaMask extension");
  console.log("2. Click the network dropdown at the top (usually shows 'Ethereum Mainnet')");
  console.log("3. Click 'Add network' at the bottom");
  console.log("4. Click 'Add a network manually'");
  console.log("5. Enter these details:");
  console.log("   • Network Name: Localhost (Base Fork)");
  console.log("   • New RPC URL: http://127.0.0.1:8545");
  console.log("   • Chain ID: 31337");
  console.log("   • Currency Symbol: ETH");
  console.log("   • Block Explorer URL: (leave blank)");
  console.log("6. Click 'Save'");
  console.log("7. Switch to this network in MetaMask");
  console.log("\n8. To see your USDC balance:");
  console.log("   • Click 'Import tokens' at bottom of MetaMask");
  console.log("   • Enter Token Contract Address:", USDC_ADDRESS);
  console.log("   • Token Symbol will auto-fill as USDC");
  console.log("   • Click 'Add custom token'");
  console.log("\n9. To see your USDe balance:");
  console.log("   • Click 'Import tokens' again");
  console.log("   • Enter Token Contract Address:", USDe_ADDRESS);
  console.log("   • Token Symbol will auto-fill as USDe");
  console.log("   • Click 'Add custom token'");
  console.log("\n10. Your account", recipient);
  console.log("    should now show:");
  console.log("    • ~10 ETH");
  console.log("    • 10,000 USDC");
  console.log("    • Some USDe (if available)");
  console.log("========================================");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
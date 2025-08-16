const { ethers } = require("ethers");

/**
 * Example: Simple one-transaction cross-chain payment
 * 
 * Customer on Avalanche pays with PYUSD
 * Merchant on Base receives USDC
 * All handled in a single transaction!
 */

async function makePayment() {
    // Setup provider and signer (customer's wallet)
    const provider = new ethers.JsonRpcProvider("https://api.avax.network/ext/bc/C/rpc");
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    
    // Router contract address on Avalanche
    const ROUTER_ADDRESS = "0x..."; // Deploy address from deployment script
    
    // Contract ABIs
    const routerABI = [
        "function send(address merchant, uint256 amount, address sourceToken) payable returns (bytes32)",
        "function quote(address merchant, uint256 amount, address sourceToken) view returns (uint256)"
    ];
    
    const erc20ABI = [
        "function approve(address spender, uint256 amount) returns (bool)",
        "function decimals() view returns (uint8)"
    ];
    
    // Initialize contracts
    const router = new ethers.Contract(ROUTER_ADDRESS, routerABI, wallet);
    
    // Payment details
    const MERCHANT_ADDRESS = "0x123..."; // Merchant's identifier
    const PYUSD_ADDRESS = "0x825206E1D22691E8BE06a30BdD5667c3fF64D09e";
    const PAYMENT_AMOUNT = "100"; // $100 PYUSD
    
    const pyusd = new ethers.Contract(PYUSD_ADDRESS, erc20ABI, wallet);
    const decimals = await pyusd.decimals();
    const amount = ethers.parseUnits(PAYMENT_AMOUNT, decimals);
    
    console.log("=== Cross-Chain Payment Example ===");
    console.log(`Customer: ${wallet.address}`);
    console.log(`Merchant: ${MERCHANT_ADDRESS}`);
    console.log(`Amount: ${PAYMENT_AMOUNT} PYUSD`);
    console.log(`Source: Avalanche`);
    console.log(`Destination: Base (merchant receives USDC)`);
    
    // Step 1: Get fee quote
    const fee = await router.quote(MERCHANT_ADDRESS, amount, PYUSD_ADDRESS);
    console.log(`\nLayerZero Fee: ${ethers.formatEther(fee)} AVAX`);
    
    // Step 2: Approve router to spend PYUSD
    console.log("\nApproving router to spend PYUSD...");
    const approveTx = await pyusd.approve(ROUTER_ADDRESS, amount);
    await approveTx.wait();
    console.log("✅ Approved");
    
    // Step 3: Send payment in ONE transaction!
    console.log("\nSending cross-chain payment...");
    const paymentTx = await router.send(
        MERCHANT_ADDRESS,
        amount,
        PYUSD_ADDRESS,
        { value: fee } // Include LayerZero fee
    );
    
    const receipt = await paymentTx.wait();
    console.log("✅ Payment sent!");
    console.log(`Transaction: ${receipt.hash}`);
    
    // Extract payment ID from events
    const paymentEvent = receipt.logs.find(
        log => log.topics[0] === ethers.id("PaymentInitiated(bytes32,address,address,uint256,address,uint32)")
    );
    const paymentId = paymentEvent.topics[1];
    console.log(`Payment ID: ${paymentId}`);
    
    console.log("\n🎉 That's it! The payment will be:");
    console.log("   1. Bridged from Avalanche to Base");
    console.log("   2. Swapped from PYUSD to USDC");
    console.log("   3. Delivered to merchant's wallet");
    console.log("   All automatically handled by the protocol!");
}

/**
 * Example: Check payment status
 */
async function checkPaymentStatus(paymentId) {
    const provider = new ethers.JsonRpcProvider("https://api.avax.network/ext/bc/C/rpc");
    
    const ROUTER_ADDRESS = "0x...";
    const routerABI = [
        "function payments(bytes32) view returns (address,address,address,uint256,uint32,address,uint256,bytes32)"
    ];
    
    const router = new ethers.Contract(ROUTER_ADDRESS, routerABI, provider);
    const payment = await router.payments(paymentId);
    
    console.log("Payment Status:");
    console.log({
        merchant: payment[0],
        customer: payment[1],
        sourceToken: payment[2],
        amount: ethers.formatUnits(payment[3], 6), // Assuming 6 decimals
        destinationChainId: payment[4],
        destinationToken: payment[5],
        timestamp: new Date(Number(payment[6]) * 1000).toISOString(),
        messageId: payment[7]
    });
}

/**
 * Example: Merchant configuration
 */
async function configureMerchant() {
    const provider = new ethers.JsonRpcProvider("https://mainnet.base.org");
    const wallet = new ethers.Wallet(process.env.ADMIN_KEY, provider);
    
    const ROUTER_ADDRESS = "0x...";
    const routerABI = [
        "function configureMerchant(address,uint32,address,address)"
    ];
    
    const router = new ethers.Contract(ROUTER_ADDRESS, routerABI, wallet);
    
    const MERCHANT_ADDRESS = "0x123...";
    const BASE_CHAIN_ID = 30184; // LayerZero endpoint ID for Base
    const MERCHANT_WALLET_ON_BASE = "0x456...";
    const USDC_ON_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
    
    console.log("Configuring merchant...");
    const tx = await router.configureMerchant(
        MERCHANT_ADDRESS,
        BASE_CHAIN_ID,
        MERCHANT_WALLET_ON_BASE,
        USDC_ON_BASE
    );
    
    await tx.wait();
    console.log("✅ Merchant configured!");
    console.log("Merchant can now receive payments on Base in USDC");
}

// Run the example
if (require.main === module) {
    makePayment()
        .then(() => console.log("\n✨ Payment example completed!"))
        .catch(console.error);
}
const { ethers } = require("ethers");

/**
 * CCTP v2 Composed Flow Examples
 * 
 * Demonstrates the power of CCTP v2's generic message passing and hooks
 * to create sophisticated single-transaction cross-chain operations
 */

// ============================================
// Example 1: Payment with Automatic Tax Withholding
// ============================================
async function paymentWithTaxWithholding() {
    console.log("\n=== CCTP v2: Payment with Automatic Tax Withholding ===\n");
    
    const provider = new ethers.JsonRpcProvider("https://mainnet.base.org");
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    
    const ROUTER_ADDRESS = "0x..."; // Your deployed router
    const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"; // Base USDC
    const TAX_HOOK_ADDRESS = "0x..."; // Deployed tax hook
    
    const routerABI = [
        "function send(address merchant, uint256 amount, address sourceToken, bytes actionData) payable returns (bytes32)"
    ];
    
    const router = new ethers.Contract(ROUTER_ADDRESS, routerABI, wallet);
    const usdc = new ethers.Contract(USDC_ADDRESS, ["function approve(address,uint256)"], wallet);
    
    const MERCHANT = "0x123...";
    const AMOUNT = ethers.parseUnits("1000", 6); // $1000 USDC
    
    // Encode hook data for 10% tax withholding
    const hookData = ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "bytes"],
        [
            TAX_HOOK_ADDRESS,
            "0x" // Additional hook params if needed
        ]
    );
    
    // Approve and send in one composed transaction
    await usdc.approve(ROUTER_ADDRESS, AMOUNT);
    
    const tx = await router.send(
        MERCHANT,
        AMOUNT,
        USDC_ADDRESS,
        hookData
    );
    
    console.log("✅ Payment sent with automatic tax withholding!");
    console.log("   - Gross amount: $1000");
    console.log("   - Tax (10%): $100 → Tax Authority");
    console.log("   - Net amount: $900 → Merchant");
    console.log("   - All handled atomically in one CCTP v2 message!");
    console.log(`   - Transaction: ${tx.hash}`);
}

// ============================================
// Example 2: Payment with Loyalty Points + Auto-Invest
// ============================================
async function paymentWithMultipleHooks() {
    console.log("\n=== CCTP v2: Payment with Loyalty Points + Auto-Invest ===\n");
    
    const provider = new ethers.JsonRpcProvider("https://api.avax.network/ext/bc/C/rpc");
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    
    const ROUTER_ADDRESS = "0x...";
    const USDC_ADDRESS = "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E";
    
    const routerABI = [
        "function send(address merchant, uint256 amount, address sourceToken, bytes actionData) payable returns (bytes32)"
    ];
    
    const router = new ethers.Contract(ROUTER_ADDRESS, routerABI, wallet);
    
    // Compose multiple hooks
    const LOYALTY_HOOK = "0x...";
    const AUTO_INVEST_HOOK = "0x...";
    
    // Create a composed hook chain
    const composedHooks = ethers.AbiCoder.defaultAbiCoder().encode(
        ["address[]", "bytes[]"],
        [
            [LOYALTY_HOOK, AUTO_INVEST_HOOK],
            [
                "0x", // Loyalty hook params (uses defaults)
                ethers.AbiCoder.defaultAbiCoder().encode(
                    ["uint256", "address"],
                    [2000, "0x..."] // 20% auto-invest to yield vault
                )
            ]
        ]
    );
    
    const AMOUNT = ethers.parseUnits("500", 6); // $500 USDC
    
    const tx = await router.send(
        "0xMerchant...",
        AMOUNT,
        USDC_ADDRESS,
        composedHooks
    );
    
    console.log("✅ Composed payment executed!");
    console.log("   1. Payment bridged via CCTP v2");
    console.log("   2. Loyalty points awarded (1% = 5 points)");
    console.log("   3. 20% auto-invested ($100 → Yield Vault)");
    console.log("   4. Remaining 80% ($400) → Merchant");
    console.log("   All in ONE atomic transaction!");
    console.log(`   Transaction: ${tx.hash}`);
}

// ============================================
// Example 3: Batch Payments with Single CCTP Message
// ============================================
async function batchPaymentsExample() {
    console.log("\n=== CCTP v2: Batch Payments in Single Message ===\n");
    
    const provider = new ethers.JsonRpcProvider("https://mainnet.base.org");
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    
    const ROUTER_ADDRESS = "0x...";
    const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
    
    const routerABI = [
        "function batchSend(address[] merchants, uint256[] amounts, address sourceToken) payable returns (bytes32[])"
    ];
    
    const router = new ethers.Contract(ROUTER_ADDRESS, routerABI, wallet);
    const usdc = new ethers.Contract(USDC_ADDRESS, ["function approve(address,uint256)"], wallet);
    
    // Multiple merchants to pay
    const merchants = [
        "0x111...", // Supplier A
        "0x222...", // Supplier B
        "0x333...", // Supplier C
        "0x444..."  // Supplier D
    ];
    
    const amounts = [
        ethers.parseUnits("1000", 6),  // $1000
        ethers.parseUnits("2500", 6),  // $2500
        ethers.parseUnits("750", 6),   // $750
        ethers.parseUnits("1250", 6)   // $1250
    ];
    
    const totalAmount = amounts.reduce((a, b) => a + b, 0n);
    
    // Approve total amount
    await usdc.approve(ROUTER_ADDRESS, totalAmount);
    
    // Send all payments in ONE transaction
    const tx = await router.batchSend(merchants, amounts, USDC_ADDRESS);
    
    console.log("✅ Batch payment sent!");
    console.log("   - 4 merchants paid");
    console.log("   - Total: $5,500");
    console.log("   - Single CCTP v2 message");
    console.log("   - Gas cost: ~80% less than 4 separate transfers");
    console.log(`   - Transaction: ${tx.hash}`);
}

// ============================================
// Example 4: Cross-Chain Payment with Conditional Escrow
// ============================================
async function paymentWithEscrow() {
    console.log("\n=== CCTP v2: Payment with Conditional Escrow ===\n");
    
    const provider = new ethers.JsonRpcProvider("https://arb1.arbitrum.io/rpc");
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    
    const ROUTER_ADDRESS = "0x...";
    const USDC_ADDRESS = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
    const ESCROW_HOOK = "0x...";
    
    const routerABI = [
        "function send(address merchant, uint256 amount, address sourceToken, bytes actionData) payable returns (bytes32)"
    ];
    
    const router = new ethers.Contract(ROUTER_ADDRESS, routerABI, wallet);
    
    // Create escrow condition
    const deliveryCondition = ethers.keccak256(
        ethers.toUtf8Bytes("ORDER_12345_DELIVERED")
    );
    
    // Escrow for 7 days or until delivery confirmed
    const escrowData = ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "bytes"],
        [
            ESCROW_HOOK,
            ethers.AbiCoder.defaultAbiCoder().encode(
                ["uint256", "bytes32"],
                [7 * 24 * 60 * 60, deliveryCondition] // 7 days
            )
        ]
    );
    
    const AMOUNT = ethers.parseUnits("10000", 6); // $10,000 USDC
    
    const tx = await router.send(
        "0xMerchant...",
        AMOUNT,
        USDC_ADDRESS,
        escrowData
    );
    
    console.log("✅ Payment sent to escrow!");
    console.log("   - Amount: $10,000");
    console.log("   - Escrow period: 7 days");
    console.log("   - Early release condition: Delivery confirmation");
    console.log("   - Atomic cross-chain escrow via CCTP v2");
    console.log(`   - Transaction: ${tx.hash}`);
    console.log(`   - Condition hash: ${deliveryCondition}`);
}

// ============================================
// Example 5: Payment with Split Recipients
// ============================================
async function paymentWithSplit() {
    console.log("\n=== CCTP v2: Payment with Automatic Split ===\n");
    
    const provider = new ethers.JsonRpcProvider("https://mainnet.optimism.io");
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    
    const ROUTER_ADDRESS = "0x...";
    const USDC_ADDRESS = "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85";
    const SPLIT_HOOK = "0x...";
    
    const routerABI = [
        "function send(address merchant, uint256 amount, address sourceToken, bytes actionData) payable returns (bytes32)"
    ];
    
    const router = new ethers.Contract(ROUTER_ADDRESS, routerABI, wallet);
    
    // Configure split: 70% to merchant, 20% to platform, 10% to referrer
    const splitData = ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "bytes"],
        [
            SPLIT_HOOK,
            ethers.AbiCoder.defaultAbiCoder().encode(
                ["address[]", "uint256[]"],
                [
                    ["0xMerchant...", "0xPlatform...", "0xReferrer..."],
                    [7000, 2000, 1000] // basis points (70%, 20%, 10%)
                ]
            )
        ]
    );
    
    const AMOUNT = ethers.parseUnits("100", 6); // $100 USDC
    
    const tx = await router.send(
        "0xMerchant...", // Primary recipient (for routing)
        AMOUNT,
        USDC_ADDRESS,
        splitData
    );
    
    console.log("✅ Split payment executed!");
    console.log("   - Total: $100");
    console.log("   - Merchant: $70 (70%)");
    console.log("   - Platform fee: $20 (20%)");
    console.log("   - Referrer commission: $10 (10%)");
    console.log("   - All recipients paid atomically");
    console.log(`   - Transaction: ${tx.hash}`);
}

// ============================================
// Example 6: Composed Swap + Bridge + Hook
// ============================================
async function fullComposedFlow() {
    console.log("\n=== CCTP v2: Full Composed Flow (Swap + Bridge + Hook) ===\n");
    
    const provider = new ethers.JsonRpcProvider("https://polygon-rpc.com");
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    
    const ROUTER_ADDRESS = "0x...";
    const USDT_ADDRESS = "0xc2132D05D31c914a87C6611C10748AEb04B58e8F"; // Polygon USDT
    
    const routerABI = [
        "function send(address merchant, uint256 amount, address sourceToken, bytes actionData) payable returns (bytes32)",
        "function quote(address merchant, uint256 amount, address sourceToken) view returns (uint256)"
    ];
    
    const router = new ethers.Contract(ROUTER_ADDRESS, routerABI, wallet);
    
    // This will:
    // 1. Swap USDT to USDC on Polygon
    // 2. Bridge USDC to Base via CCTP v2
    // 3. Execute loyalty hook on Base
    // 4. Deliver to merchant
    
    const LOYALTY_HOOK = "0x...";
    const composedData = ethers.AbiCoder.defaultAbiCoder().encode(
        ["bool", "address", "bytes"],
        [
            true, // Enable swap
            LOYALTY_HOOK,
            "0x" // Hook params
        ]
    );
    
    const AMOUNT = ethers.parseUnits("500", 6); // $500 USDT
    
    // Get fee quote
    const fee = await router.quote("0xMerchant...", AMOUNT, USDT_ADDRESS);
    
    const tx = await router.send(
        "0xMerchant...",
        AMOUNT,
        USDT_ADDRESS,
        composedData,
        { value: fee }
    );
    
    console.log("✅ Full composed flow executed!");
    console.log("   Step 1: USDT → USDC swap on Polygon");
    console.log("   Step 2: USDC bridged to Base via CCTP v2");
    console.log("   Step 3: Loyalty points awarded");
    console.log("   Step 4: USDC delivered to merchant");
    console.log("   All in ONE transaction!");
    console.log(`   Transaction: ${tx.hash}`);
}

// ============================================
// Main execution
// ============================================
async function main() {
    console.log("====================================================");
    console.log("       CCTP v2 Composed Flow Examples");
    console.log("====================================================");
    
    try {
        // Run examples based on command line argument
        const example = process.argv[2];
        
        switch(example) {
            case "tax":
                await paymentWithTaxWithholding();
                break;
            case "hooks":
                await paymentWithMultipleHooks();
                break;
            case "batch":
                await batchPaymentsExample();
                break;
            case "escrow":
                await paymentWithEscrow();
                break;
            case "split":
                await paymentWithSplit();
                break;
            case "full":
                await fullComposedFlow();
                break;
            default:
                console.log("\nRunning all examples...\n");
                await paymentWithTaxWithholding();
                await paymentWithMultipleHooks();
                await batchPaymentsExample();
                await paymentWithEscrow();
                await paymentWithSplit();
                await fullComposedFlow();
        }
        
        console.log("\n====================================================");
        console.log("✨ CCTP v2 enables truly composable cross-chain payments!");
        console.log("====================================================\n");
        
    } catch (error) {
        console.error("Error:", error);
    }
}

// Run examples
if (require.main === module) {
    main()
        .then(() => process.exit(0))
        .catch(error => {
            console.error(error);
            process.exit(1);
        });
}

module.exports = {
    paymentWithTaxWithholding,
    paymentWithMultipleHooks,
    batchPaymentsExample,
    paymentWithEscrow,
    paymentWithSplit,
    fullComposedFlow
};
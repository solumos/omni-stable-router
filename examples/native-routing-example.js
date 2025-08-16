const { ethers } = require("ethers");
const { planRoute, isTokenNative, getRouteRecommendation } = require("../src/routePlanner");

/**
 * Native Asset Routing Examples
 * 
 * Demonstrates how the router automatically handles native vs bridged assets
 * and delivers the best available native alternative
 */

// ============================================
// Example 1: USDC to USDC (Always Native)
// ============================================
async function usdcToUsdc() {
    console.log("\n=== Example 1: USDC to USDC (Always Native) ===\n");
    
    const provider = new ethers.JsonRpcProvider("https://mainnet.base.org");
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    
    const ROUTER_ADDRESS = "0x..."; // Your deployed NativeAssetRouter
    const USDC_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
    
    const routerABI = [
        "function route(address sourceToken, uint256 amount, uint32 destChainEid, address destToken, address recipient) payable returns (bytes32)"
    ];
    
    const router = new ethers.Contract(ROUTER_ADDRESS, routerABI, wallet);
    const usdc = new ethers.Contract(USDC_BASE, ["function approve(address,uint256)"], wallet);
    
    const AMOUNT = ethers.parseUnits("100", 6); // $100 USDC
    const AVALANCHE_EID = 30106;
    const USDC_AVALANCHE = "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E";
    const RECIPIENT = "0x123..."; // Merchant on Avalanche
    
    // Approve and route
    await usdc.approve(ROUTER_ADDRESS, AMOUNT);
    
    const tx = await router.route(
        USDC_BASE,        // Source token (USDC on Base)
        AMOUNT,           // Amount
        AVALANCHE_EID,    // Destination chain
        USDC_AVALANCHE,   // Destination token (USDC on Avalanche)
        RECIPIENT         // Recipient
    );
    
    console.log("✅ USDC routed via native CCTP!");
    console.log("   - From: USDC@Base (native)");
    console.log("   - To: USDC@Avalanche (native)");
    console.log("   - Protocol: CCTP (burn-and-mint)");
    console.log("   - Cost: ~$0.20");
    console.log("   - Time: ~10 seconds");
    console.log(`   - Transaction: ${tx.hash}`);
}

// ============================================
// Example 2: PYUSD to Base (Automatic USDC Delivery)
// ============================================
async function pyusdToBase() {
    console.log("\n=== Example 2: PYUSD to Base (Delivers USDC) ===\n");
    
    // Check route planning
    const route = planRoute('ethereum', 'PYUSD', 'base', 'PYUSD');
    console.log("Route Analysis:");
    console.log(getRouteRecommendation(route));
    
    const provider = new ethers.JsonRpcProvider("https://eth.llamarpc.com");
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    
    const ROUTER_ADDRESS = "0x...";
    const PYUSD_ETHEREUM = "0x6c3ea9036406852006290770BEdFcAbA0e23A0e8";
    
    const routerABI = [
        "function route(address sourceToken, uint256 amount, uint32 destChainEid, address destToken, address recipient) payable returns (bytes32)"
    ];
    
    const router = new ethers.Contract(ROUTER_ADDRESS, routerABI, wallet);
    const pyusd = new ethers.Contract(PYUSD_ETHEREUM, ["function approve(address,uint256)"], wallet);
    
    const AMOUNT = ethers.parseUnits("100", 6); // $100 PYUSD
    const BASE_EID = 30184;
    const PYUSD_BASE = "0x0000000000000000000000000000000000000000"; // Not issued!
    const RECIPIENT = "0x456...";
    
    // Router will automatically detect PYUSD not native on Base
    await pyusd.approve(ROUTER_ADDRESS, AMOUNT);
    
    const tx = await router.route(
        PYUSD_ETHEREUM,   // Source: PYUSD on Ethereum
        AMOUNT,
        BASE_EID,
        PYUSD_BASE,       // Requested: PYUSD on Base (not available)
        RECIPIENT
    );
    
    console.log("\n⚠️ PYUSD not native on Base - Delivering USDC instead!");
    console.log("   - Requested: PYUSD@Base");
    console.log("   - Actual delivery: USDC@Base (native)");
    console.log("   - Reason: PYUSD not issued on Base");
    console.log("   - Route: PYUSD→USDC swap on Ethereum, then CCTP to Base");
    console.log(`   - Transaction: ${tx.hash}`);
}

// ============================================
// Example 3: USDT to Base (Avoids Bridged Asset)
// ============================================
async function usdtToBase() {
    console.log("\n=== Example 3: USDT to Base (Avoids Bridged) ===\n");
    
    // Check if USDT is native on Base
    console.log("USDT native on Base?", isTokenNative('base', 'USDT')); // false!
    
    const provider = new ethers.JsonRpcProvider("https://api.avax.network/ext/bc/C/rpc");
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    
    const ROUTER_ADDRESS = "0x...";
    const USDT_AVALANCHE = "0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7"; // Native USDT
    
    const router = new ethers.Contract(ROUTER_ADDRESS, routerABI, wallet);
    const usdt = new ethers.Contract(USDT_AVALANCHE, ["function approve(address,uint256)"], wallet);
    
    const AMOUNT = ethers.parseUnits("100", 6); // $100 USDT
    const BASE_EID = 30184;
    const USDT_BASE = "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2"; // Bridged only!
    const RECIPIENT = "0x789...";
    
    await usdt.approve(ROUTER_ADDRESS, AMOUNT);
    
    const tx = await router.route(
        USDT_AVALANCHE,   // Source: Native USDT on Avalanche
        AMOUNT,
        BASE_EID,
        USDT_BASE,        // Requested: USDT on Base (bridged-only)
        RECIPIENT
    );
    
    console.log("\n⚠️ USDT is bridged-only on Base - Delivering USDC instead!");
    console.log("   - Requested: USDT@Base (bridged)");
    console.log("   - Actual delivery: USDC@Base (native)");
    console.log("   - Reason: Avoiding bridged assets for security");
    console.log("   - Route: USDT→USDC swap on Avalanche, then CCTP to Base");
    console.log(`   - Transaction: ${tx.hash}`);
}

// ============================================
// Example 4: USDT Native-to-Native (Uses Stargate)
// ============================================
async function usdtNativeToNative() {
    console.log("\n=== Example 4: USDT Native-to-Native ===\n");
    
    const provider = new ethers.JsonRpcProvider("https://eth.llamarpc.com");
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    
    const ROUTER_ADDRESS = "0x...";
    const USDT_ETHEREUM = "0xdAC17F958D2ee523a2206206994597C13D831ec7"; // Native
    
    const router = new ethers.Contract(ROUTER_ADDRESS, routerABI, wallet);
    const usdt = new ethers.Contract(USDT_ETHEREUM, ["function approve(address,uint256)"], wallet);
    
    const AMOUNT = ethers.parseUnits("100", 6);
    const AVALANCHE_EID = 30106;
    const USDT_AVALANCHE = "0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7"; // Native
    const RECIPIENT = "0xABC...";
    
    await usdt.approve(ROUTER_ADDRESS, AMOUNT);
    
    // Calculate Stargate fee
    const stargateFee = ethers.parseEther("0.01"); // Approximate
    
    const tx = await router.route(
        USDT_ETHEREUM,    // Native USDT
        AMOUNT,
        AVALANCHE_EID,
        USDT_AVALANCHE,   // Native USDT
        RECIPIENT,
        { value: stargateFee }
    );
    
    console.log("✅ USDT routed via Stargate (both native)!");
    console.log("   - From: USDT@Ethereum (native)");
    console.log("   - To: USDT@Avalanche (native)");
    console.log("   - Protocol: Stargate");
    console.log("   - Cost: ~$0.35");
    console.log("   - Time: ~30 seconds");
    console.log(`   - Transaction: ${tx.hash}`);
}

// ============================================
// Example 5: PYUSD to PYUSD (Ethereum ↔ Arbitrum)
// ============================================
async function pyusdToPyusd() {
    console.log("\n=== Example 5: PYUSD to PYUSD (Both Native) ===\n");
    
    const provider = new ethers.JsonRpcProvider("https://eth.llamarpc.com");
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    
    const ROUTER_ADDRESS = "0x...";
    const PYUSD_ETHEREUM = "0x6c3ea9036406852006290770BEdFcAbA0e23A0e8";
    
    const router = new ethers.Contract(ROUTER_ADDRESS, routerABI, wallet);
    const pyusd = new ethers.Contract(PYUSD_ETHEREUM, ["function approve(address,uint256)"], wallet);
    
    const AMOUNT = ethers.parseUnits("100", 6);
    const ARBITRUM_EID = 30110;
    const PYUSD_ARBITRUM = "0x..."; // Native PYUSD on Arbitrum (since July 2025)
    const RECIPIENT = "0xDEF...";
    
    await pyusd.approve(ROUTER_ADDRESS, AMOUNT);
    
    const tx = await router.route(
        PYUSD_ETHEREUM,
        AMOUNT,
        ARBITRUM_EID,
        PYUSD_ARBITRUM,
        RECIPIENT
    );
    
    console.log("✅ PYUSD to PYUSD (both native)!");
    console.log("   - From: PYUSD@Ethereum (native)");
    console.log("   - To: PYUSD@Arbitrum (native since July 2025)");
    console.log("   - Route: PYUSD→USDC, CCTP, USDC→PYUSD");
    console.log("   - Cost: ~$0.50");
    console.log("   - Time: ~30 seconds");
    console.log(`   - Transaction: ${tx.hash}`);
}

// ============================================
// Route Analysis Helper
// ============================================
function analyzeAllRoutes() {
    console.log("\n=== Route Analysis for All Permutations ===\n");
    
    const chains = ['ethereum', 'base', 'avalanche', 'arbitrum'];
    const tokens = ['USDC', 'PYUSD', 'USDT'];
    
    const summary = {
        direct: 0,
        swapRequired: 0,
        alternativeDelivery: 0,
        total: 0
    };
    
    for (const srcChain of chains) {
        for (const srcToken of tokens) {
            for (const dstChain of chains) {
                if (srcChain === dstChain) continue;
                
                for (const dstToken of tokens) {
                    try {
                        const route = planRoute(srcChain, srcToken, dstChain, dstToken);
                        summary.total++;
                        
                        if (route.warnings.length > 0) {
                            summary.alternativeDelivery++;
                            console.log(`⚠️ ${srcToken}@${srcChain} → ${dstToken}@${dstChain}`);
                            console.log(`   Alternative: ${route.warnings[0]}`);
                        } else if (route.steps.length === 1) {
                            summary.direct++;
                        } else {
                            summary.swapRequired++;
                        }
                    } catch (e) {
                        // Skip unsupported routes
                    }
                }
            }
        }
    }
    
    console.log("\n📊 Route Summary:");
    console.log(`   - Direct transfers: ${summary.direct}`);
    console.log(`   - Require swaps: ${summary.swapRequired}`);
    console.log(`   - Alternative delivery: ${summary.alternativeDelivery}`);
    console.log(`   - Total routes: ${summary.total}`);
}

// ============================================
// Main execution
// ============================================
async function main() {
    console.log("====================================================");
    console.log("       Native Asset Routing Examples");
    console.log("====================================================");
    
    try {
        // Run examples based on command line argument
        const example = process.argv[2];
        
        switch(example) {
            case "usdc":
                await usdcToUsdc();
                break;
            case "pyusd-base":
                await pyusdToBase();
                break;
            case "usdt-base":
                await usdtToBase();
                break;
            case "usdt-native":
                await usdtNativeToNative();
                break;
            case "pyusd":
                await pyusdToPyusd();
                break;
            case "analyze":
                analyzeAllRoutes();
                break;
            default:
                console.log("\nRunning all examples...\n");
                await usdcToUsdc();
                await pyusdToBase();
                await usdtToBase();
                await usdtNativeToNative();
                await pyusdToPyusd();
                analyzeAllRoutes();
        }
        
        console.log("\n====================================================");
        console.log("✨ Native routing ensures security and efficiency!");
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
    usdcToUsdc,
    pyusdToBase,
    usdtToBase,
    usdtNativeToNative,
    pyusdToPyusd,
    analyzeAllRoutes
};
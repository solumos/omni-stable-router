# USDC (Base) → USDe (Arbitrum) Route Flow

## Overview
This document outlines the complete flow for converting USDC on Base to USDe on Arbitrum using the StableRouter protocol. This is a cross-token route that requires LayerZero Composer for atomic execution.

## Route Characteristics
- **Source**: USDC on Base (Chain ID: 8453)
- **Destination**: USDe on Arbitrum (Chain ID: 42161)
- **Protocol**: LayerZero Composer
- **Operations**: Bridge + Swap in single transaction
- **Estimated Time**: ~35 seconds
- **Fees**: 0.1% protocol fee + LayerZero fees + swap fees

## High-Level Flow

```
User (Base)
    │
    ├─[1]─> Approves USDC to StableRouter
    │
    └─[2]─> Calls executeRoute() with USDC→USDe params
            │
            ├─[3]─> StableRouter validates route
            │       - Checks USDC is native on Base ✓
            │       - Checks USDe is native on Arbitrum ✓
            │       - Validates amount and recipient
            │
            ├─[4]─> Collects USDC from user
            │       - Transfers USDC to router
            │       - Deducts 0.1% protocol fee
            │       - Sends fee to FeeManager
            │
            ├─[5]─> Determines protocol (Composer for cross-token)
            │
            └─[6]─> Executes via RouteProcessor
                    │
                    ├─[7]─> Prepares Composer message
                    │       - Encodes swap instructions
                    │       - Sets destination pool (USDC→USDe on Arbitrum)
                    │       - Calculates minimum output
                    │
                    ├─[8]─> Bridges USDC via LayerZero
                    │       - Burns/locks USDC on Base
                    │       - Sends message to Arbitrum
                    │
                    └─[9]─> Arbitrum execution (atomic)
                            │
                            ├─[10]─> Receives USDC on Arbitrum
                            │
                            ├─[11]─> Executes swap USDC→USDe
                            │        - Routes through configured DEX
                            │        - Likely Curve or Uniswap V3
                            │
                            └─[12]─> Transfers USDe to recipient
```

## Detailed Contract Interactions

### Step 1: User Approval (Base Network)
```solidity
// User approves USDC spending
USDC_BASE.approve(
    StableRouter_BASE,
    100_000000  // 100 USDC (6 decimals)
)
```

### Step 2: Route Execution Call
```solidity
// User calls executeRoute
StableRouter_BASE.executeRoute{value: 0.002 ether}(
    RouteParams({
        sourceToken: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913,  // USDC on Base
        destToken: 0x5d3a1Ff2b6BAb83b63cd9AD0787074081a52ef34,    // USDe on Arbitrum (example)
        amount: 100_000000,                                        // 100 USDC
        destChainId: 42161,                                        // Arbitrum
        recipient: 0xUser...,                                      
        minAmountOut: 95_000000000000000000,                      // 95 USDe (18 decimals)
        routeData: <encoded_swap_data>
    })
)
```

### Step 3: Route Validation
```solidity
function _validateRoute(RouteParams calldata params) internal view {
    // Check amount > 0
    require(params.amount > 0, "Invalid amount");
    
    // Check recipient != address(0)
    require(params.recipient != address(0), "Invalid recipient");
    
    // Check Base chain is supported
    require(supportedChains[8453], "Unsupported chain");
    
    // Check USDC is supported on Base
    string memory sourceSymbol = "USDC";  // via IERC20Metadata
    require(tokens["USDC"].isSupported, "Source token not supported");
    
    // Check USDe is supported
    string memory destSymbol = "USDe";  // via IERC20Metadata
    require(tokens["USDe"].isSupported, "Dest token not supported");
    
    // Check USDe is native on Arbitrum
    require(_isNativeOnChain(USDe, 42161), "Token not native on destination");
    // Returns true: USDe is native on Arbitrum ✓
}
```

### Step 4: Token Collection & Fee Processing
```solidity
// Transfer USDC from user to router
IERC20(USDC).safeTransferFrom(
    msg.sender,      // user
    address(this),   // router
    100_000000       // 100 USDC
);

// Calculate protocol fee (0.1%)
uint256 protocolFee = (100_000000 * 10) / 10000;  // = 10000 (0.01 USDC)
uint256 amountAfterFee = 100_000000 - 10000;      // = 99_990000

// Transfer fee to FeeManager
IERC20(USDC).safeTransfer(
    address(feeManager),
    10000
);

// Record fee
feeManager.recordFee(USDC, 10000);
```

### Step 5: Protocol Determination
```solidity
function _determineProtocol(...) internal view returns (uint8) {
    // USDC != USDe (cross-token)
    // Therefore: return 4 (Composer)
    return 4;
}
```

### Step 6: RouteProcessor Execution
```solidity
function _executeComposer(params, amount) internal {
    // Approve RouteProcessor to spend USDC
    IERC20(USDC).approve(routeProcessor, 99_990000);
    
    // Estimate Composer fee
    uint256 composerFee = routeProcessor.estimateComposerFee(
        42161,              // Arbitrum
        recipient,
        routeData
    );  // Returns ~0.002 ETH
    
    // Execute via RouteProcessor
    routeProcessor.executeComposer{value: composerFee}(
        USDC,               // sourceToken
        USDe,               // destToken
        99_990000,          // amount after protocol fee
        42161,              // destChainId
        recipient,
        95_000000000000000000,  // minAmountOut
        routeData
    );
}
```

### Step 7-8: RouteProcessor → LayerZero
```solidity
function executeComposer(...) external payable {
    // Transfer USDC to RouteProcessor
    IERC20(USDC).safeTransferFrom(msg.sender, address(this), 99_990000);
    
    // Prepare LayerZero Composer payload
    bytes memory payload = abi.encode(
        USDe,                       // Target token on Arbitrum
        95_000000000000000000,      // Min amount out
        recipient,                  // Final recipient
        swapData                    // DEX routing data
    );
    
    // Get LayerZero chain ID for Arbitrum
    uint16 lzChainId = 110;  // Arbitrum LZ ID
    
    // Send via LayerZero with Composer instructions
    ILayerZeroEndpoint(lzEndpoint).send{value: msg.value}(
        lzChainId,                  // Destination chain
        abi.encodePacked(           // Destination contract
            ArbitrumComposerReceiver
        ),
        payload,                    // Swap instructions
        payable(msg.sender),        // Refund address
        address(0),                 // ZRO payment address
        adapterParams               // Gas settings
    );
}
```

### Step 9-12: Arbitrum Execution (Destination Chain)

On Arbitrum, the LayerZero Composer receiver contract:

```solidity
// This happens on Arbitrum automatically
function lzReceive(
    uint16 _srcChainId,
    bytes memory _srcAddress,
    uint64 _nonce,
    bytes memory _payload
) external {
    // Decode the composer instructions
    (
        address targetToken,        // USDe
        uint256 minAmountOut,       // 95 USDe
        address recipient,          // User address
        bytes memory swapData       // DEX route
    ) = abi.decode(_payload, (address, uint256, address, bytes));
    
    // [10] USDC has been minted/unlocked on Arbitrum (99.99 USDC)
    
    // [11] Execute swap USDC → USDe
    uint256 usdcBalance = IERC20(USDC_ARBITRUM).balanceOf(address(this));
    
    // Approve DEX
    IERC20(USDC_ARBITRUM).approve(SWAP_ROUTER, usdcBalance);
    
    // Swap via configured DEX (e.g., Curve)
    uint256 usdeReceived = ICurvePool(USDC_USDE_POOL).exchange(
        0,                  // USDC index
        1,                  // USDe index  
        usdcBalance,        // 99.99 USDC
        minAmountOut        // 95 USDe minimum
    );
    
    // [12] Transfer USDe to recipient
    IERC20(USDe_ARBITRUM).safeTransfer(recipient, usdeReceived);
    
    emit ComposerExecuted(
        _srcChainId,
        USDC,
        USDe,
        usdcBalance,
        usdeReceived,
        recipient
    );
}
```

## Gas Costs Breakdown

### Base Network (Origin)
- USDC Approval: ~45,000 gas
- executeRoute call: ~350,000 gas
- Total Base Cost: ~395,000 gas × Base gas price

### LayerZero Fees
- Message passing: ~0.001 ETH
- Destination execution: ~0.001 ETH
- Total LZ Fee: ~0.002 ETH

### Arbitrum Network (Destination)
- Paid by LayerZero relayer
- Swap execution: ~150,000 gas
- Transfer: ~30,000 gas
- Covered in LZ fee

## Timeline

1. **T+0s**: User initiates transaction on Base
2. **T+2s**: Base transaction confirmed
3. **T+3s**: LayerZero validators pick up message
4. **T+15s**: Message validated and relayed
5. **T+20s**: Arbitrum transaction initiated
6. **T+22s**: Swap executed on Arbitrum
7. **T+23s**: USDe transferred to recipient
8. **T+35s**: Transaction fully confirmed

## Error Scenarios & Handling

### 1. Insufficient LayerZero Fee
- **Error**: "Insufficient Composer fee"
- **Solution**: Increase ETH sent with transaction

### 2. Slippage Too High
- **Error**: Swap fails on Arbitrum due to price movement
- **Solution**: Transaction reverts, user gets USDC on Arbitrum instead
- **Note**: In production, implement fallback mechanism

### 3. USDe Not Available on Arbitrum
- **Error**: "Token not native on destination"
- **Solution**: Route validation prevents this upfront

### 4. Liquidity Exhausted
- **Error**: DEX swap fails due to insufficient liquidity
- **Solution**: Route through alternative DEX or revert

## Optimization Opportunities

1. **Batch Routes**: Combine multiple users' routes for gas efficiency
2. **MEV Protection**: Use private mempools on Base
3. **Dynamic Routing**: Select optimal DEX based on liquidity
4. **Fee Optimization**: Adjust LayerZero adapter params based on urgency
5. **Caching**: Store frequently used route paths

## Security Considerations

1. **Atomic Execution**: Entire operation succeeds or fails together
2. **Slippage Protection**: minAmountOut prevents unfavorable swaps
3. **Route Validation**: Ensures tokens are native on destination
4. **Fee Limits**: Caps on protocol and bridge fees
5. **Timeout**: Messages expire if not processed within window
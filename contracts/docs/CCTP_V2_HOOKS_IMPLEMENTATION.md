# CCTP V2 Hooks Implementation Guide

## Overview

CCTP V2 introduces Hooks functionality that enables atomic execution on the destination chain. This allows USDC to be bridged and swapped to another token in a single atomic transaction.

## Architecture

### Source Chain Components

1. **RouteProcessor Contract**
   - Calls `depositForBurnWithCaller` to burn USDC
   - Sends hook data via MessageTransmitter
   - Designates the hook receiver as the only authorized caller

2. **Hook Data Structure**
   ```solidity
   struct HookData {
       address recipient;      // Final recipient of target tokens
       address targetToken;    // Token to swap USDC to
       uint256 minAmountOut;   // Slippage protection
       uint8 routerType;       // Which DEX to use (1inch, 0x, etc.)
       bytes swapData;         // DEX-specific swap calldata
   }
   ```

### Destination Chain Components

1. **CCTPHookHandler Contract**
   - Deployed on each destination chain
   - Receives USDC from MessageReceiver
   - Parses hook data from the message
   - Executes swap atomically
   - Sends target tokens to final recipient

2. **MessageTransmitter (Circle's Contract)**
   - Processes the message and attestation
   - Mints USDC to the hook receiver
   - Calls hook receiver's `handleReceiveMessage` function

## Implementation Flow

### Step 1: User Initiates Transfer
```javascript
// User calls StableRouter
await stableRouter.executeRoute({
    sourceToken: USDC_ADDRESS,
    destToken: USDT_ADDRESS,     // Different token on destination
    amount: parseUnits("100", 6),
    destChainId: 42161,          // Arbitrum
    recipient: userAddress,
    minAmountOut: parseUnits("99", 6),
    routeData: swapCalldata       // 1inch/0x swap data
});
```

### Step 2: RouteProcessor Burns USDC
```solidity
// In RouteProcessor.executeCCTPWithHooks
bytes memory hookData = abi.encode(
    recipient,
    destToken,
    minAmountOut,
    routerType,
    swapCalldata
);

// Burn USDC with designated caller
uint64 nonce = cctpTokenMessenger.depositForBurnWithCaller(
    amount,
    destDomain,
    hookHandler,    // Hook handler receives USDC
    usdcAddress,
    hookHandler     // Only hook handler can execute
);

// Send hook data
messageTransmitter.sendMessage(
    destDomain,
    hookHandler,
    hookData
);
```

### Step 3: Attestation Service
- Circle's attestation service observes the burn event
- Creates attestation for the message
- Makes attestation available via API

### Step 4: Relayer Submits Transaction
```javascript
// Relayer (could be anyone) fetches attestation
const attestation = await fetchAttestationFromCircle(messageHash);

// Submit to destination chain
await messageReceiver.receiveMessage(
    message,
    attestation
);
```

### Step 5: Hook Handler Executes
```solidity
// CCTPHookHandler.receiveMessage is called
function receiveMessage(
    bytes calldata message,
    bytes calldata attestation
) external {
    // 1. Verify caller is MessageReceiver
    require(msg.sender == messageReceiver);
    
    // 2. MessageReceiver mints USDC to this contract
    IMessageReceiver(messageReceiver).receiveMessage(message, attestation);
    
    // 3. Parse hook data
    (recipient, targetToken, minAmountOut, routerType, swapData) = parseHookData(message);
    
    // 4. Execute swap atomically
    uint256 amountOut = executeSwap(
        usdc,
        targetToken,
        usdcBalance,
        minAmountOut,
        recipient,
        routerType,
        swapData
    );
    
    // 5. Target tokens sent to recipient
    // (handled by DEX in swap execution)
}
```

## Deployment Requirements

### 1. Deploy Hook Handlers
Deploy `CCTPHookHandler` on each destination chain:

```javascript
// Deploy script
const CCTPHookHandler = await ethers.getContractFactory("CCTPHookHandler");
const hookHandler = await CCTPHookHandler.deploy(
    MESSAGE_RECEIVER_ADDRESS,  // Circle's MessageReceiver
    USDC_ADDRESS               // USDC on this chain
);

// Configure routers
await hookHandler.setSwapRouter(1, ONEINCH_ROUTER);
await hookHandler.setSwapRouter(2, ZEROX_ROUTER);
```

### 2. Configure RouteProcessor
Update RouteProcessor with hook handler addresses:

```javascript
// For each chain
await routeProcessor.setDestinationHookHandler(
    42161,  // Arbitrum
    ARBITRUM_HOOK_HANDLER_ADDRESS
);
```

## Gas Considerations

### Estimated Gas Usage
- CCTP mint operation: ~100,000 gas
- Swap execution: ~150,000-300,000 gas (depends on DEX)
- Total: ~250,000-400,000 gas

### Who Pays Gas?
- **Source chain**: User pays for burn transaction
- **Destination chain**: Relayer pays for attestation submission
- **Reimbursement**: Can be built into protocol fees

## Security Considerations

### 1. Attestation Verification
- Only Circle's MessageReceiver can mint USDC
- Attestation must be valid and match the message

### 2. Atomic Execution
- **No fallback to USDC** - swap must succeed or entire transaction reverts
- Ensures user gets expected tokens or nothing (no partial execution)
- Prevents stuck funds scenarios

### 3. Slippage Protection
- `minAmountOut` prevents excessive slippage
- Transaction reverts if output < minAmountOut
- Protects against sandwich attacks

### 4. Access Control
- Only MessageTransmitter can call handleReceiveMessage
- Authorized senders mapping validates source contracts
- Prevents unauthorized cross-chain calls

### 5. Reentrancy Protection
- Hook receiver should use ReentrancyGuard
- Critical for swap execution safety

## Testing Strategy

### Unit Tests
```javascript
describe("CCTP V2 Hooks", () => {
    it("Should execute USDC to USDT swap atomically", async () => {
        // 1. Setup hook handler on destination
        await deployHookHandler(destinationChain);
        
        // 2. Execute CCTP with hooks
        await routeProcessor.executeCCTPWithHooks(
            USDC,
            USDT,
            amount,
            destChainId,
            recipient,
            minAmountOut,
            swapData
        );
        
        // 3. Simulate attestation
        const attestation = await mockAttestation(messageHash);
        
        // 4. Submit to destination
        await messageReceiver.receiveMessage(message, attestation);
        
        // 5. Verify USDT received
        expect(await usdt.balanceOf(recipient)).to.equal(expectedAmount);
    });
});
```

### Integration Tests
1. Test with actual Circle testnet attestation service
2. Test various DEX integrations (1inch, 0x, etc.)
3. Test failure scenarios (slippage, invalid swap data)

## Monitoring

### Key Metrics
1. **Attestation latency**: Time from burn to attestation availability
2. **Execution success rate**: Percentage of successful swaps
3. **Slippage events**: Track when slippage protection triggers
4. **Gas usage**: Monitor actual gas consumption

### Events to Monitor
```solidity
event HookExecuted(
    address indexed recipient,
    address indexed targetToken,
    uint256 usdcAmount,
    uint256 targetAmount
);
```

## Comparison with Alternatives

### CCTP V2 Hooks vs LayerZero Composer

| Aspect | CCTP V2 Hooks | LayerZero Composer |
|--------|---------------|-------------------|
| Cost | ~$0.60 | ~$3.90 |
| Speed | 10-15 min | 1-3 min |
| Complexity | Medium (needs attestation) | Low (automatic) |
| Token Support | USDC source only | Any OFT token |
| Atomic Execution | Yes | Yes |
| Infrastructure | Needs hook receivers | Uses existing OFTs |

## Future Improvements

1. **Automated Relayer Service**
   - Build relayer to automatically submit attestations
   - Charge small fee for convenience

2. **Multi-DEX Aggregation**
   - Route through multiple DEXs for best price
   - Split large orders for better execution

3. **Cross-Chain Intent System**
   - Allow users to express intents
   - Solver network finds optimal route

4. **Hook Handler Upgrades**
   - Add more DEX integrations
   - Implement advanced order types
   - Add limit order functionality

## Conclusion

CCTP V2 Hooks provide a cost-effective way to achieve atomic USDC cross-chain swaps. While more complex than LayerZero Composer due to the attestation requirement, the significant cost savings (~85% cheaper) make it attractive for price-sensitive users.

Key benefits:
- ✅ Atomic execution
- ✅ Low cost (~$0.60)
- ✅ Security via access control
- ✅ Flexibility in swap execution

Key challenges:
- ⚠️ Requires hook receiver deployment
- ⚠️ Attestation adds complexity
- ⚠️ Longer finality time (10-15 min)
- ⚠️ USDC-only as source token
# LayerZero Compose Flow: USDe (Base) → PYUSD (Arbitrum)

## Overview
LayerZero Compose enables cross-token swaps by executing additional logic on the destination chain after the cross-chain transfer completes. This document details the implementation for swapping USDe on Base to PYUSD on Arbitrum.

## Architecture

### Key Components
1. **UnifiedRouter (Base)**: Initiates the cross-chain transfer with compose message
2. **USDe OFT (Base)**: Burns USDe and sends LayerZero message
3. **LayerZero Endpoint**: Relays message across chains
4. **USDe OFT (Arbitrum)**: Mints USDe and triggers compose
5. **UnifiedRouter (Arbitrum)**: Receives compose call and executes swap
6. **DEX (Arbitrum)**: Performs USDe → PYUSD swap

## Flow Sequence

### Source Chain (Base)
```solidity
1. User calls: router.transferWithSwap(USDe, PYUSD, amount, arbChainId, recipient)
2. Router prepares compose message with swap instructions
3. Router calls: USDe_OFT.send() with compose adapter params
4. USDe is burned on Base
5. LayerZero message sent to Arbitrum
```

### Destination Chain (Arbitrum)
```solidity
1. LayerZero delivers message to USDe OFT
2. USDe OFT mints USDe to UnifiedRouter
3. USDe OFT calls: router.lzCompose(message)
4. Router decodes compose message
5. Router executes swap: USDe → PYUSD via DEX
6. Router transfers PYUSD to final recipient
```

## Implementation Details

### 1. Route Configuration
```javascript
// Configure LayerZero route with compose
await router.configureRoute(
  TOKENS.base.USDe,          // fromToken
  8453,                       // Base chainId
  TOKENS.arbitrum.PYUSD,      // toToken (different!)
  42161,                      // Arbitrum chainId
  {
    protocol: Protocol.LAYERZERO,
    protocolDomain: 110,      // LZ Arbitrum chain ID
    bridgeContract: LZ_ENDPOINT_BASE,
    poolId: 0,
    swapPool: DEX_POOL_ADDRESS, // For USDe->PYUSD swap
    extraData: "0x"
  }
);
```

### 2. Compose Message Format
```solidity
struct ComposeMessage {
    address toToken;        // Target token (PYUSD)
    uint256 minAmountOut;   // Slippage protection
    address recipient;      // Final recipient
    address swapPool;       // DEX pool address
}
```

### 3. Adapter Parameters (V2 with Compose)
```solidity
struct AdapterParams {
    uint16 version;         // 2 for compose
    uint256 gasForLzReceive; // Gas for token mint
    uint256 gasForLzCompose; // Gas for swap execution
    uint256 nativeForDst;   // Native token on destination
    bytes composeMsg;       // Encoded compose message
}
```

### 4. lzCompose Handler
```solidity
function lzCompose(
    address _oApp,
    bytes32 _guid,
    bytes calldata _message,
    address _executor,
    bytes calldata _extraData
) external payable {
    // Security checks
    require(msg.sender == LZ_ENDPOINT, "Unauthorized");
    
    // Decode message
    (address toToken, uint256 minAmountOut, address recipient, address swapPool) 
        = abi.decode(_message, (address, uint256, address, address));
    
    // Get received USDe balance
    uint256 balance = IERC20(USDe).balanceOf(address(this));
    
    // Execute swap
    _executeSwap(USDe, toToken, balance, minAmountOut, recipient, swapPool);
}
```

## Gas Considerations

### Estimated Gas Usage
- **lzReceive (mint USDe)**: ~200,000 gas
- **lzCompose (swap + transfer)**: ~300,000 gas
- **Total destination gas**: ~500,000 gas

### Fee Calculation
```javascript
const adapterParams = ethers.AbiCoder.defaultAbiCoder().encode(
    ["uint16", "uint256", "uint256", "uint256", "bytes"],
    [2, 200000, 300000, 0, composeMessage]
);

const [nativeFee] = await endpoint.estimateFees(
    dstChainId,
    routerAddress,
    payload,
    false,
    adapterParams
);
```

## Security Considerations

1. **Authorization**: Only LayerZero endpoint can call `lzCompose`
2. **Slippage Protection**: `minAmountOut` prevents excessive slippage
3. **Reentrancy Guard**: `nonReentrant` modifier on compose handler
4. **Token Detection**: Verify correct token received before swap
5. **Failed Compose**: Implement fallback to hold tokens if swap fails

## Testing Status

### ✅ Completed
- Route configuration with compose parameters
- Compose message encoding/decoding
- lzCompose handler implementation
- Gas estimation logic

### 🔧 Requires Infrastructure
- USDe OFT contracts on both chains
- UnifiedRouter deployment on Arbitrum
- DEX integration (Uniswap/Curve)
- LayerZero endpoint configuration

## Example Transaction

### Input
- **Amount**: 100 USDe on Base
- **Destination**: PYUSD on Arbitrum
- **Slippage**: 10% (min 90 PYUSD out)

### Process
1. Burn 100 USDe on Base
2. LayerZero message with compose data
3. Mint 100 USDe to router on Arbitrum
4. Swap 100 USDe → ~95 PYUSD (after fees)
5. Transfer 95 PYUSD to recipient

### Cost
- **LayerZero Fee**: ~0.001 ETH on Base
- **Destination Gas**: Covered by LZ fee
- **DEX Swap Fee**: ~0.3% (varies by pool)

## Production Checklist

- [ ] Deploy USDe OFT on Base
- [ ] Deploy USDe OFT on Arbitrum
- [ ] Deploy UnifiedRouter on Arbitrum
- [ ] Configure OFT trusted remotes
- [ ] Set up DEX pools with liquidity
- [ ] Configure swap pool addresses
- [ ] Test with small amounts
- [ ] Monitor gas usage
- [ ] Implement error handling
- [ ] Add event logging

## Code References

- **UnifiedRouter.sol**: Lines 600-668 (`lzCompose` handler)
- **test-lz-compose.js**: Complete test implementation
- **LayerZero Docs**: [Composed OFT Pattern](https://docs.layerzero.network/v2/developers/evm/oft/oft-patterns-extensions)

## Summary

The LayerZero Compose implementation enables seamless cross-token swaps by:
1. Burning the source token on the origin chain
2. Minting it on the destination chain to the router
3. Executing a swap to the target token
4. Delivering the target token to the recipient

This eliminates the need for users to perform manual swaps after bridging, providing a one-click cross-chain swap experience.
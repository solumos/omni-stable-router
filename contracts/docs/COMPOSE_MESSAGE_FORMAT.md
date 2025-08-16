# LayerZero Compose Message Format

## Overview

When using LayerZero Composer to perform cross-token swaps, the compose message needs to be properly formatted for the destination OFT contract to execute the swap.

## Message Structure

### For OFT → Different Token Swaps

The compose message sent to the destination OFT should contain:

```solidity
struct ComposeMessage {
    address recipient;      // Final recipient of swapped tokens
    address targetToken;    // Token to swap to (e.g., USDC)
    uint256 minAmountOut;   // Minimum acceptable amount after swap
    bytes swapCalldata;     // Encoded swap data for DEX aggregator
}
```

### Encoding Example

```javascript
// JavaScript/Ethers.js
const composeMsg = ethers.AbiCoder.defaultAbiCoder().encode(
    ["address", "address", "uint256", "bytes"],
    [
        recipientAddress,           // Who gets the final tokens
        "0xA0b8...eB48",           // USDC address on destination
        ethers.parseUnits("95", 6), // Min 95 USDC out
        swapCalldata                // 1inch/0x encoded swap
    ]
);
```

## Swap Calldata Format

The `swapCalldata` should be the exact calldata to execute on a DEX aggregator:

### 1inch Example
```javascript
// Get quote from 1inch API
const quote = await fetch(`https://api.1inch.exchange/v5.0/${chainId}/swap`, {
    params: {
        fromTokenAddress: PYUSD_ADDRESS,
        toTokenAddress: USDC_ADDRESS,
        amount: amount.toString(),
        fromAddress: OFT_CONTRACT_ADDRESS, // Important: OFT executes the swap
        slippage: 1
    }
});

const swapCalldata = quote.tx.data;
```

### 0x Protocol Example
```javascript
// Get quote from 0x API
const quote = await fetch(`https://api.0x.org/swap/v1/quote`, {
    params: {
        sellToken: PYUSD_ADDRESS,
        buyToken: USDC_ADDRESS,
        sellAmount: amount.toString(),
        takerAddress: OFT_CONTRACT_ADDRESS
    }
});

const swapCalldata = quote.data;
```

## Adapter Params Structure

The adapter params for compose must specify gas for both operations:

```solidity
bytes memory adapterParams = abi.encodePacked(
    uint16(2),          // Version 2 (enables compose)
    uint256(200000),    // Gas for lzReceive (receiving tokens)
    uint256(300000),    // Gas for lzCompose (executing swap)
    uint256(0),         // Native value (usually 0)
    composeMsg          // The compose message
);
```

## Complete Example: PYUSD → USDC

```javascript
// 1. Prepare swap on destination (Optimism)
const swapData = await get1inchSwapData(
    "0xCfA3Ef56d303AE4fAabA0592388F19d7C3399FB4", // PYUSD on Optimism
    "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85", // USDC on Optimism
    amount,
    "0xCfA3Ef56d303AE4fAabA0592388F19d7C3399FB4"  // OFT executes swap
);

// 2. Encode compose message
const composeMsg = ethers.AbiCoder.defaultAbiCoder().encode(
    ["address", "address", "uint256", "bytes"],
    [
        userAddress,                                   // Final recipient
        "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85", // USDC on Optimism
        ethers.parseUnits("95", 6),                   // Min USDC out
        swapData                                       // 1inch swap calldata
    ]
);

// 3. Create adapter params with compose
const adapterParams = ethers.AbiCoder.defaultAbiCoder().encode(
    ["uint16", "uint256", "uint256", "uint256", "bytes"],
    [2, 200000, 300000, 0, composeMsg]
);

// 4. Send via OFT with compose
await oftContract.sendFrom(
    senderAddress,
    10,                                                // Optimism chain ID
    ethers.AbiCoder.defaultAbiCoder().encode(
        ["address"],
        ["0xCfA3Ef56d303AE4fAabA0592388F19d7C3399FB4"] // PYUSD OFT on Optimism
    ),
    amount,
    refundAddress,
    ethers.ZeroAddress,
    adapterParams,
    { value: layerZeroFee }
);
```

## Gas Requirements

### Recommended Gas Limits

| Operation | Gas Required | Description |
|-----------|-------------|-------------|
| lzReceive | 200,000 | Receiving tokens and queuing compose |
| lzCompose | 300,000 | Executing swap via DEX |
| Total | 500,000 | Complete compose operation |

### Factors Affecting Gas

1. **Token Complexity**: Some tokens require more gas for transfers
2. **Swap Complexity**: Multi-hop swaps need more gas
3. **DEX Protocol**: Different DEXs have different gas requirements
4. **Slippage Checks**: Additional validation adds gas

## Error Handling

The OFT contract will revert the compose operation if:

1. **Insufficient Gas**: Not enough gas for swap execution
2. **Slippage Exceeded**: Output less than `minAmountOut`
3. **Invalid Swap Data**: DEX call fails
4. **Token Not Approved**: OFT can't spend tokens for swap

## Security Considerations

1. **Validate Recipient**: Ensure recipient address is correct
2. **Set Reasonable Slippage**: Usually 0.5-1% for stablecoins
3. **Test on Testnet**: Always test compose operations first
4. **Monitor Gas Prices**: High gas can affect execution

## Troubleshooting

### Common Issues

1. **"Compose execution failed"**
   - Check gas limits are sufficient
   - Verify swap calldata is valid
   - Ensure tokens are liquid on destination

2. **"Slippage exceeded"**
   - Increase slippage tolerance
   - Check DEX liquidity
   - Consider smaller amounts

3. **"Invalid compose message"**
   - Verify message encoding
   - Check destination OFT address
   - Ensure all parameters are correct
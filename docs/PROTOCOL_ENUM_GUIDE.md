# Protocol Enum Guide

## Overview

The StableRouter uses a Protocol enum to identify different cross-chain routing protocols. This provides better type safety, readability, and maintainability compared to magic numbers.

## Protocol Enum Definition

```solidity
enum Protocol {
    NONE,           // 0: No protocol selected
    CCTP,           // 1: Circle CCTP for USDC same-token transfers
    LAYERZERO_OFT,  // 2: LayerZero OFT for PYUSD, USDe, crvUSD
    STARGATE,       // 3: Stargate for USDT transfers
    COMPOSER,       // 4: LayerZero Composer for cross-token swaps
    CCTP_HOOKS,     // 5: CCTP v2 with hooks for USDC to other tokens
    OFT_SWAP,       // 6: LayerZero OFT + destination swap
    STARGATE_SWAP   // 7: Stargate + destination swap
}
```

## Benefits of Using Enums

### 1. **Type Safety**
- Prevents passing invalid protocol values
- Compile-time checking ensures only valid protocols are used
- IDE support with autocomplete

### 2. **Readability**
```solidity
// Before (magic numbers):
if (protocol == 1) { ... }

// After (enum):
if (protocol == Protocol.CCTP) { ... }
```

### 3. **Maintainability**
- Self-documenting code
- Easy to add new protocols
- Clear intent in code reviews

### 4. **Gas Efficiency**
- Enums compile to uint8, same as previous implementation
- No additional gas costs

## Usage Examples

### In Contract Code

```solidity
function _determineProtocol(
    address sourceToken,
    address destToken,
    uint256 destChainId
) internal view returns (Protocol) {
    // USDC always uses CCTP
    if (isUSDC(sourceToken)) {
        if (sourceToken == destToken) {
            return Protocol.CCTP;
        } else {
            return Protocol.CCTP_HOOKS;
        }
    }
    // ... more logic
}
```

### In Tests

```javascript
// Testing protocol selection
const protocol = await stableRouter.determineProtocol(
    usdcAddress,
    usdeAddress,
    arbitrumChainId
);
expect(protocol).to.equal(5); // Protocol.CCTP_HOOKS = 5
```

## Protocol Selection Logic

### Priority Rules

1. **USDC as source** → Always use CCTP variants
   - USDC → USDC: `Protocol.CCTP`
   - USDC → other: `Protocol.CCTP_HOOKS`

2. **USDC as destination** → Bridge then swap
   - OFT token → USDC: `Protocol.OFT_SWAP`
   - USDT → USDC: `Protocol.STARGATE_SWAP`

3. **Same non-USDC token** → Native protocol
   - PYUSD/USDe/crvUSD: `Protocol.LAYERZERO_OFT`
   - USDT: `Protocol.STARGATE`

4. **Different non-USDC tokens** → `Protocol.COMPOSER`

## Migration Notes

### Backward Compatibility
The enum values match the previous numeric system:
- NONE = 0
- CCTP = 1
- LAYERZERO_OFT = 2
- etc.

This ensures existing off-chain systems continue to work during migration.

### Future Extensibility
New protocols can be added to the enum:
```solidity
enum Protocol {
    // ... existing protocols
    NEW_PROTOCOL   // 8: Future protocol
}
```

## Best Practices

1. **Always use enum names** in code, never raw numbers
2. **Document protocol selection** in comments
3. **Test protocol selection** explicitly in unit tests
4. **Keep enum order stable** to maintain backward compatibility

## Related Files

- `contracts/StableRouter.sol` - Main router with Protocol enum
- `docs/SIMPLE_ROUTING_GUIDE.md` - User-facing routing documentation
- `docs/ROUTING_MAP.md` - Detailed routing matrix
- `test/` - Test files using Protocol enum values
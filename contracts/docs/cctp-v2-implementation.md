# CCTP V2 Fast Transfers Implementation

## Overview
Successfully implemented CCTP v2 fast transfers with automated attestation relay for 8-20 second cross-chain USDC transfers.

## Key Components

### 1. UnifiedRouter Contract
- **Address**: `0x3419bF0A8E74B825D14641B0Bf3D1Ce710E0aDC7`
- **Features**: 
  - CCTP v2 support with enhanced `depositForBurn()` function
  - 7-parameter interface including finality threshold
  - Multi-protocol support (CCTP, LayerZero, Stargate)

### 2. CCTP V2 Integration
```solidity
interface ITokenMessengerV2 {
    function depositForBurn(
        uint256 amount,
        uint32 destinationDomain,
        bytes32 mintRecipient,
        address burnToken,
        bytes32 destinationCaller,
        uint256 maxFee,
        uint32 minFinalityThreshold
    ) external returns (uint64 nonce);
}
```

**Key Parameters**:
- `minFinalityThreshold`: Set to 1000 for fast transfers
- `maxFee`: Set to 0 (no relayer fees)
- `destinationCaller`: Set to 0x0 (any caller can mint)

### 3. Automated Attestation Relayer

**Location**: `/Users/tmh/stable-router/api/app/cctp_relayer.py`

**Features**:
- Monitors Circle v2 API for attestations
- Automatically completes transfers on destination chain
- Uses `receiveMessage(message, attestation)` pattern
- Supports all major EVM chains

**API Endpoints**:
- `POST /api/v1/relayer/monitor` - Add transfer to monitor
- `GET /api/v1/relayer/status/{tx_hash}` - Check transfer status

### 4. Circle API V2 Integration

**Endpoint Pattern**: 
```
https://iris-api.circle.com/v2/messages/{domain}?transactionHash={txHash}
```

**Status Flow**:
1. Transaction confirmed on source chain
2. Circle indexes the event (~5-10 seconds)
3. Status changes to "complete" with attestation
4. Relayer calls `receiveMessage()` on destination
5. USDC minted to recipient

## Deployed Addresses

### Mainnet Contracts
| Chain | Router Address | USDC Address |
|-------|---------------|--------------|
| Base | `0x3419bF0A8E74B825D14641B0Bf3D1Ce710E0aDC7` | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` |
| Arbitrum | `0x3419bF0A8E74B825D14641B0Bf3D1Ce710E0aDC7` | `0xaf88d065e77c8cC2239327C5EDb3A432268e5831` |

### CCTP V2 Contracts (Circle)
| Contract | Address (All Chains) |
|----------|---------------------|
| TokenMessengerV2 | `0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d` |
| MessageTransmitterV2 | `0x81D40F21F12A8F0E3252Bccb954D722d4c464B64` |

## Performance Metrics

### Transfer Times
- **CCTP v2 Fast**: 8-20 seconds total
- **CCTP v1 Standard**: 10-20 minutes
- **Improvement**: 30-75x faster

### Process Breakdown
1. Transaction confirmation: 2-5 seconds
2. Circle attestation: 5-10 seconds  
3. Automated relay: 1-3 seconds
4. Total: 8-18 seconds typical

## Testing Scripts

### Available Tests
1. `test-cctp-v2-automated.js` - Complete automated flow test
2. `test-5-cent-cctp-v2.js` - Small value transfer test
3. `test-final-cctp-v2.js` - Integration test
4. `test-simple-lz-compose.js` - LayerZero comparison

### Running Tests
```bash
# Run automated test with relayer
RELAYER_ENABLED=true npx hardhat run scripts/test-cctp-v2-automated.js --network base

# Run without relayer (manual completion)
npx hardhat run scripts/test-cctp-v2-automated.js --network base
```

## Route Configuration

### Configured Routes
1. **USDC → USDC** (Base ↔ Arbitrum)
   - Protocol: CCTP v2
   - Time: 8-20 seconds
   
2. **USDe → USDe** (Base ↔ Arbitrum)  
   - Protocol: LayerZero OFT
   - Time: 30-60 seconds
   
3. **USDe → USDC** (Cross-token)
   - Protocol: LayerZero Compose
   - Time: 30-90 seconds

## API Integration

### Starting the Relayer
```python
# In API startup
from app.cctp_relayer import get_relayer

relayer = get_relayer(private_key)
await relayer.start()
```

### Monitoring Transfers
```python
# Add transfer to monitor
transfer = await relayer.add_transfer(
    tx_hash="0x...",
    source_chain="base", 
    dest_chain="arbitrum"
)

# Check status
status = relayer.get_transfer_status(tx_hash)
```

## Security Considerations

1. **Private Key Management**: Relayer private key stored securely
2. **Gas Limits**: Conservative gas estimates with 20% buffer
3. **Error Handling**: Comprehensive try-catch blocks
4. **Monitoring**: Detailed logging at each step

## Next Steps

1. ✅ Core CCTP v2 implementation
2. ✅ Automated attestation relayer
3. ✅ API integration
4. ⏳ Frontend updates for mainnet
5. ⏳ Production deployment
6. ⏳ Monitoring dashboard

## References

- [Circle CCTP v2 Docs](https://developers.circle.com/cctp)
- [CCTP Message Search](https://developers.circle.com/cctp/message-search)
- [LayerZero Scan](https://layerzeroscan.com)
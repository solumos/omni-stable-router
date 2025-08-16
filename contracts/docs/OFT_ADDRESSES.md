# OFT Adapter Addresses

## PYUSD (PayPal USD)

### Ethereum (Chain ID: 1)
- **Token Address**: `0x6c3ea9036406852006290770BEdFcAbA0e23A0e8`
- **OFT Adapter**: `0xa2c323fe5a74adffad2bf3e007e36bb029606444`
- **Type**: OFT Adapter (wraps existing token)

### Optimism (Chain ID: 10)
- **Token Address**: `0xCfA3Ef56d303AE4fAabA0592388F19d7C3399FB4`
- **OFT Address**: `0xCfA3Ef56d303AE4fAabA0592388F19d7C3399FB4`
- **Type**: Native OFT

## USDe (Ethena USD)

### Ethereum (Chain ID: 1)
- **Token Address**: `0x4c9EDD5852cd905f086C759E8383e09bff1E68B3`
- **OFT Adapter**: TBD (need to verify)
- **Type**: OFT Adapter

### Arbitrum (Chain ID: 42161)
- **Token Address**: `0x5d3a1Ff2b6BAb83b63cd9AD0787074081a52ef34`
- **OFT Address**: `0x5d3a1Ff2b6BAb83b63cd9AD0787074081a52ef34`
- **Type**: Native OFT

### Base (Chain ID: 8453)
- **Token Address**: `0x5d3a1Ff2b6BAb83b63cd9AD0787074081a52ef34`
- **OFT Address**: `0x5d3a1Ff2b6BAb83b63cd9AD0787074081a52ef34`
- **Type**: Native OFT

## crvUSD (Curve USD)

### Ethereum (Chain ID: 1)
- **Token Address**: `0xf939E0A03FB07F59A73314E73794Be0E57ac1b4E`
- **OFT Adapter**: TBD (need to verify)
- **Type**: OFT Adapter

### Arbitrum (Chain ID: 42161)
- **Token Address**: `0x498Bf2B1e120FeD3ad3D42EA2165E9b73f99C1e5`
- **OFT Address**: `0x498Bf2B1e120FeD3ad3D42EA2165E9b73f99C1e5`
- **Type**: Native OFT

### Optimism (Chain ID: 10)
- **Token Address**: `0x061b87122Ed14b9526A813209C8a59a633257bAb`
- **OFT Address**: `0x061b87122Ed14b9526A813209C8a59a633257bAb`
- **Type**: Native OFT

### Base (Chain ID: 8453)
- **Token Address**: `0x417Ac0e078398C154EdFadD9Ef675d30Be60Af93`
- **OFT Address**: `0x417Ac0e078398C154EdFadD9Ef675d30Be60Af93`
- **Type**: Native OFT

## Important Notes

### OFT Adapter vs Native OFT
- **OFT Adapter**: Used on the "home" chain where the original token exists. Wraps the existing ERC20 token to add LayerZero functionality.
- **Native OFT**: Used on remote chains. The token itself implements OFT functionality.

### Compose Functionality
All these OFT contracts support LayerZero's compose functionality, which means they can:
1. Receive tokens from another chain
2. Execute additional logic (like swaps) atomically after receiving
3. Forward the swapped tokens to the final recipient

### Setting Up Compose
When sending with compose:
1. The compose message is sent to the destination OFT contract
2. The OFT contract's `lzCompose` function handles the swap
3. The swap is executed using the encoded DEX calldata (1inch, 0x, etc.)

### Example Compose Flow
1. User has PYUSD on Ethereum, wants USDC on Optimism
2. RouteProcessor sends PYUSD via OFT Adapter on Ethereum
3. Message includes compose data for swapping PYUSD→USDC
4. PYUSD OFT on Optimism receives the tokens
5. PYUSD OFT executes the compose message (swap via 1inch)
6. User receives USDC on Optimism

### Gas Considerations
Compose operations require gas on the destination chain:
- `lzReceive`: ~200k gas for receiving and queueing compose
- `lzCompose`: ~300k gas for executing the swap
- Total: ~500k gas needed on destination
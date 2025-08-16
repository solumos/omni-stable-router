# Deployments

This directory contains deployment artifacts for different networks.

## Structure

```
deployments/
├── localhost.json    (git-ignored, generated locally)
├── ethereum.json     (mainnet deployment)
├── base.json        (Base deployment)
├── avalanche.json   (Avalanche deployment)
└── arbitrum.json    (Arbitrum deployment)
```

## File Format

Each deployment file contains:

```json
{
  "network": "network-name",
  "chainId": 1,
  "contracts": {
    "router": "0x...",
    "usdc": "0x...",
    "pyusd": "0x...",
    "usdt": "0x..."
  },
  "deployedAt": "ISO-8601 timestamp"
}
```

## Notes

- `localhost.json` is git-ignored as it contains local test addresses
- Production deployments should be committed after verification
- Always verify contracts on block explorers after deployment
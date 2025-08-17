# Deploying CCTP V2 Relayer on Render

## Overview
The CCTP V2 attestation relayer can be deployed on Render as either:
1. **Integrated with API** (Recommended) - Runs within the FastAPI server
2. **Separate Worker** - Dedicated background service

## Setup Instructions

### 1. Prepare Your Repository
```bash
# Ensure these files are in /api directory:
- render.yaml
- requirements.txt
- app/main.py
- app/cctp_relayer.py
- app/relayer_routes.py
```

### 2. Create Render Account & Connect GitHub
1. Sign up at [render.com](https://render.com)
2. Connect your GitHub repository
3. Select the stable-router repository

### 3. Deploy Using Blueprint
```bash
# In Render Dashboard:
1. Click "New" → "Blueprint"
2. Select your repository
3. Point to: /api/render.yaml
4. Click "Apply"
```

### 4. Configure Environment Variables

**Required Secrets (Set in Dashboard):**
```env
RELAYER_PRIVATE_KEY=0x...  # Private key with ETH on Base/Arbitrum
```

**Optional Configuration:**
```env
NETWORK=mainnet            # or testnet
LOG_LEVEL=INFO            # DEBUG for verbose
MONITOR_INTERVAL=5        # Seconds between checks
```

### 5. Fund the Relayer Wallet
The relayer needs ETH for gas fees on destination chains:

```bash
# Get relayer address from logs or /api/v1/relayer/stats
# Send ETH to this address on:
- Base: 0.01 ETH minimum
- Arbitrum: 0.01 ETH minimum  
- Other supported chains as needed
```

## Deployment Options

### Option 1: Integrated Deployment (Recommended)
```yaml
services:
  - type: web
    name: stable-router-api
    startCommand: "uvicorn app.main:app --host 0.0.0.0 --port $PORT"
    envVars:
      - key: RELAYER_ENABLED
        value: "true"
```

**Pros:**
- Single service to manage
- Shared resources
- Lower cost
- Automatic startup

**Cons:**
- API and relayer share resources
- Restarts affect both services

### Option 2: Separate Worker
```yaml
services:
  - type: worker
    name: stable-router-relayer
    startCommand: "python run_relayer.py"
```

**Pros:**
- Isolated from API
- Independent scaling
- Dedicated resources

**Cons:**
- Higher cost (2 services)
- More complex monitoring

## Monitoring & Management

### Health Check Endpoint
```bash
GET https://your-api.onrender.com/api/v1/relayer/health

Response:
{
  "status": "healthy",
  "relayer_address": "0x...",
  "monitored_transfers": 5
}
```

### View Statistics
```bash
GET https://your-api.onrender.com/api/v1/relayer/stats

Response:
{
  "total_transfers": 100,
  "completed": 95,
  "pending": 3,
  "failed": 2,
  "total_volume_usdc": 50000.50
}
```

### Monitor Logs
```bash
# In Render Dashboard:
1. Select your service
2. Click "Logs" tab
3. Filter by:
   - "CCTP" for relayer logs
   - "ERROR" for issues
   - "Attestation" for completions
```

## Security Best Practices

### 1. Private Key Management
```python
# Never commit private keys!
# Use Render's secret management:

1. Dashboard → Environment → Add Secret
2. Name: RELAYER_PRIVATE_KEY
3. Value: Your private key
4. Sync: Disabled (keeps it secret)
```

### 2. Gas Management
```python
# Monitor gas balance
async def check_gas_balance():
    for chain in ["base", "arbitrum"]:
        balance = await get_eth_balance(chain)
        if balance < 0.005:  # Alert if below 0.005 ETH
            send_alert(f"Low gas on {chain}")
```

### 3. Rate Limiting
```python
# Implement in relayer_routes.py
from fastapi import Request
from slowapi import Limiter

limiter = Limiter(key_func=lambda r: r.client.host)

@router.post("/monitor")
@limiter.limit("10/minute")
async def monitor_transfer(request: Request, ...):
    # Existing code
```

## Cost Optimization

### Render Pricing (as of 2024)
- **Starter**: $7/month per service
- **Standard**: $25/month (recommended for production)
- **Pro**: $85/month (high availability)

### Tips to Reduce Costs
1. Use integrated deployment (1 service vs 2)
2. Set appropriate health check intervals
3. Use Redis for caching attestations
4. Batch multiple transfers when possible

## Troubleshooting

### Common Issues

**1. Relayer Not Starting**
```bash
# Check logs for:
"RELAYER_PRIVATE_KEY not set"

# Solution:
Add private key in Render dashboard
```

**2. Out of Gas**
```bash
# Error: "insufficient funds for gas"

# Solution:
Send ETH to relayer address on affected chain
```

**3. API Timeout**
```bash
# If attestations take too long

# Solution:
Increase timeout in render.yaml:
healthCheckPath: /health
healthCheckInterval: 60  # Increase interval
```

**4. Memory Issues**
```bash
# If service crashes with OOM

# Solution:
Upgrade to Standard plan or optimize:
- Reduce transfer history retention
- Implement cleanup for old transfers
```

## Production Checklist

- [ ] Set RELAYER_PRIVATE_KEY as secret
- [ ] Fund relayer wallet on all chains
- [ ] Configure monitoring alerts
- [ ] Set up error notifications
- [ ] Test with small transfer first
- [ ] Monitor logs for first 24 hours
- [ ] Set up gas balance alerts
- [ ] Configure backup RPC endpoints
- [ ] Document relayer address
- [ ] Test health endpoints

## API Usage Example

```bash
# Monitor a transfer
curl -X POST https://your-api.onrender.com/api/v1/relayer/monitor \
  -H "Content-Type: application/json" \
  -d '{
    "tx_hash": "0x123...",
    "source_chain": "base",
    "dest_chain": "arbitrum"
  }'

# Check status
curl https://your-api.onrender.com/api/v1/relayer/status/0x123...
```

## Support

- Render Status: [status.render.com](https://status.render.com)
- Render Docs: [render.com/docs](https://render.com/docs)
- Circle CCTP: [developers.circle.com/cctp](https://developers.circle.com/cctp)
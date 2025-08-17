#!/bin/bash

echo "🚀 Starting local Hardhat fork of Base mainnet..."
echo "================================================"

# Kill any existing Hardhat node
pkill -f "hardhat node" 2>/dev/null

# Start Hardhat node forking Base mainnet
echo "Starting Hardhat node..."
npx hardhat node --fork https://mainnet.base.org &

# Store the PID
HARDHAT_PID=$!
echo "Hardhat node started with PID: $HARDHAT_PID"

# Wait for node to be ready
echo "Waiting for node to be ready..."
sleep 5

# Test connection
echo "Testing connection..."
curl -s -X POST http://localhost:8545 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' | jq '.result' 2>/dev/null

if [ $? -eq 0 ]; then
  echo "✅ Local fork is ready at http://localhost:8545"
  echo ""
  echo "To deploy and test:"
  echo "1. In a new terminal: npm run deploy:local"
  echo "2. Then: npm run test:local"
  echo ""
  echo "Press Ctrl+C to stop the fork"
  
  # Keep the script running
  wait $HARDHAT_PID
else
  echo "❌ Failed to start local fork"
  kill $HARDHAT_PID 2>/dev/null
  exit 1
fi
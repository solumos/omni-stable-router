#!/bin/bash

# Start dual Hardhat forks for Base and Arbitrum

echo "=========================================="
echo "Starting Dual Hardhat Forks"
echo "=========================================="
echo ""

# Kill any existing Hardhat nodes
echo "Cleaning up existing nodes..."
pkill -f "hardhat node" || true
sleep 2

# Start Base fork on port 8545
echo "1️⃣ Starting Base fork on port 8545..."
npx hardhat node --fork https://base-mainnet.g.alchemy.com/v2/your-api-key --port 8545 > /tmp/hardhat-base.log 2>&1 &
BASE_PID=$!
echo "   Base fork PID: $BASE_PID"

# Wait a bit for the first fork to start
sleep 5

# Start Arbitrum fork on port 8546
echo "2️⃣ Starting Arbitrum fork on port 8546..."
npx hardhat node --fork https://arb-mainnet.g.alchemy.com/v2/your-api-key --port 8546 > /tmp/hardhat-arbitrum.log 2>&1 &
ARB_PID=$!
echo "   Arbitrum fork PID: $ARB_PID"

echo ""
echo "✅ Both forks starting..."
echo ""
echo "📍 Base fork:     http://localhost:8545"
echo "📍 Arbitrum fork: http://localhost:8546"
echo ""
echo "📝 Logs:"
echo "   Base:     /tmp/hardhat-base.log"
echo "   Arbitrum: /tmp/hardhat-arbitrum.log"
echo ""
echo "To stop: pkill -f 'hardhat node'"
echo ""

# Keep script running to maintain the processes
echo "Press Ctrl+C to stop both forks..."
wait
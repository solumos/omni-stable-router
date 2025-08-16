#!/bin/bash

echo "======================================"
echo "   Starting Local Test Environment"
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if node is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed${NC}"
    exit 1
fi

echo -e "\n${YELLOW}📦 Installing dependencies...${NC}"
npm install

echo -e "\n${YELLOW}🔨 Compiling contracts...${NC}"
npx hardhat compile

echo -e "\n${YELLOW}🚀 Starting Hardhat node...${NC}"
npx hardhat node &
HARDHAT_PID=$!
echo "Hardhat node PID: $HARDHAT_PID"

# Wait for Hardhat node to start
echo -e "${YELLOW}⏳ Waiting for Hardhat node to start...${NC}"
sleep 5

echo -e "\n${YELLOW}📝 Deploying contracts to localhost...${NC}"
npx hardhat run scripts/deploy-local.js --network localhost

echo -e "\n${GREEN}✅ Local environment is ready!${NC}"
echo ""
echo "======================================"
echo "   Environment Information"
echo "======================================"
echo ""
echo "📡 Hardhat node running on: http://localhost:8545"
echo "🔑 Use the private keys from the Hardhat node output above"
echo ""
echo "To stop the environment, run:"
echo "  kill $HARDHAT_PID"
echo ""
echo "To start the frontend, run:"
echo "  cd frontend && npm run dev"
echo ""
echo "======================================"

# Keep script running
wait $HARDHAT_PID
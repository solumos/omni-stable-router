#!/usr/bin/env python3
"""
Start the FastAPI server with integrated CCTP V2 Relayer
"""

import os
import sys
import asyncio
import logging
import uvicorn
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

async def start_relayer():
    """Initialize and start the CCTP relayer"""
    from app.cctp_relayer import CCTPRelayer
    
    # Get private key
    private_key = os.getenv("RELAYER_PRIVATE_KEY")
    
    if not private_key:
        from eth_account import Account
        test_account = Account.create()
        private_key = test_account.key.hex()
        logger.warning(f"Using test relayer address: {test_account.address}")
        logger.warning("Set RELAYER_PRIVATE_KEY in .env for production")
    
    # Initialize and start relayer
    relayer = CCTPRelayer(private_key, network="mainnet")
    await relayer.start()
    
    logger.info(f"✅ Relayer started: {relayer.account.address}")
    return relayer

def main():
    """Main function to start API server with relayer"""
    
    logger.info("🚀 Starting Stable Router API with CCTP V2 Relayer...")
    
    # Start the relayer in background
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    
    # Initialize relayer
    relayer = loop.run_until_complete(start_relayer())
    
    # Store relayer instance for API access
    os.environ["RELAYER_ENABLED"] = "true"
    
    logger.info("\n" + "="*60)
    logger.info("STABLE ROUTER API - READY")
    logger.info("="*60)
    logger.info("API Server: http://localhost:8000")
    logger.info("Documentation: http://localhost:8000/docs")
    logger.info("")
    logger.info("Relayer Endpoints:")
    logger.info("  POST /api/v1/relayer/monitor")
    logger.info("  GET  /api/v1/relayer/status/{tx_hash}")
    logger.info("")
    logger.info("Main Endpoints:")
    logger.info("  GET  /api/v1/chains")
    logger.info("  POST /api/v1/quote")
    logger.info("  POST /api/v1/transaction/prepare")
    logger.info("-"*60 + "\n")
    
    # Run the FastAPI server
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        logger.info("\n👋 Shutting down...")
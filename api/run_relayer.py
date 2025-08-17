#!/usr/bin/env python3
"""
Run the API with CCTP V2 Attestation Relayer
"""

import asyncio
import os
import sys
import logging
from dotenv import load_dotenv

# Add app directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

from app.cctp_relayer import CCTPRelayer

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

async def main():
    """Main function to run the relayer"""
    
    # Load environment variables
    load_dotenv()
    
    # Get private key from environment or use a test key
    # IMPORTANT: In production, use secure key management
    private_key = os.getenv("RELAYER_PRIVATE_KEY")
    
    if not private_key:
        # Use a test private key (account with small ETH balance for gas)
        # This is for testing only - replace with secure key management
        logger.warning("No RELAYER_PRIVATE_KEY found, using test key")
        logger.warning("Please set RELAYER_PRIVATE_KEY in .env for production")
        
        # Generate a new test key for this session
        from eth_account import Account
        test_account = Account.create()
        private_key = test_account.key.hex()
        logger.info(f"Test relayer address: {test_account.address}")
        logger.info("⚠️  Send ETH to this address on Base and Arbitrum for gas fees")
        logger.info("    Recommended: 0.01 ETH on each chain")
        
    # Initialize relayer
    logger.info("🚀 Starting CCTP V2 Attestation Relayer...")
    relayer = CCTPRelayer(private_key, network="mainnet")
    
    # Start the relayer service
    await relayer.start()
    logger.info("✅ Relayer service started successfully")
    
    # Display status
    logger.info("\n" + "="*60)
    logger.info("CCTP V2 ATTESTATION RELAYER - ACTIVE")
    logger.info("="*60)
    logger.info(f"Relayer Address: {relayer.account.address}")
    logger.info("Monitoring Chains:")
    logger.info("  • Ethereum (Domain 0)")
    logger.info("  • Avalanche (Domain 1)")
    logger.info("  • Optimism (Domain 2)")
    logger.info("  • Arbitrum (Domain 3)")
    logger.info("  • Base (Domain 6)")
    logger.info("  • Polygon (Domain 7)")
    logger.info("")
    logger.info("API Endpoints:")
    logger.info("  POST /api/v1/relayer/monitor - Add transfer to monitor")
    logger.info("  GET  /api/v1/relayer/status/{tx_hash} - Check status")
    logger.info("")
    logger.info("Circle API: https://iris-api.circle.com/v2")
    logger.info("Expected attestation time: 5-10 seconds")
    logger.info("Expected total transfer time: 8-20 seconds")
    logger.info("")
    logger.info("Status: Waiting for transfers...")
    logger.info("-"*60)
    
    # Example: Add a test transfer to monitor (optional)
    if os.getenv("TEST_TX_HASH"):
        test_tx = os.getenv("TEST_TX_HASH")
        source = os.getenv("TEST_SOURCE_CHAIN", "base")
        dest = os.getenv("TEST_DEST_CHAIN", "arbitrum")
        
        logger.info(f"Adding test transfer to monitor: {test_tx}")
        transfer = await relayer.add_transfer(test_tx, source, dest)
        logger.info(f"Transfer added: {transfer.tx_hash}")
    
    # Keep the relayer running
    try:
        while True:
            # Log status every minute
            await asyncio.sleep(60)
            
            # Get all transfers
            transfers = relayer.get_all_transfers()
            
            if transfers:
                logger.info(f"\n📊 Status Update: {len(transfers)} transfers monitored")
                
                # Count by status
                status_counts = {}
                for t in transfers:
                    status = t['status']
                    status_counts[status] = status_counts.get(status, 0) + 1
                
                for status, count in status_counts.items():
                    logger.info(f"  {status}: {count}")
            else:
                logger.info("⏳ No transfers being monitored")
                
    except KeyboardInterrupt:
        logger.info("\n🛑 Shutting down relayer...")
        await relayer.stop()
        logger.info("✅ Relayer stopped successfully")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n👋 Goodbye!")
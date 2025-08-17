"""
CCTP V2 Attestation Relayer Service
Monitors CCTP transfers and automatically completes them on destination chains
"""

import asyncio
import logging
from typing import Dict, Optional, List
from datetime import datetime, timedelta
import aiohttp
from web3 import Web3
from eth_account import Account
import json
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger(__name__)

class TransferStatus(Enum):
    PENDING = "pending"
    ATTESTED = "attested"
    COMPLETING = "completing"
    COMPLETED = "completed"
    FAILED = "failed"

@dataclass
class CCTPTransfer:
    tx_hash: str
    source_domain: int
    dest_domain: int
    amount: int
    recipient: str
    status: TransferStatus
    message: Optional[str] = None
    attestation: Optional[str] = None
    event_nonce: Optional[int] = None
    created_at: datetime = None
    completed_at: Optional[datetime] = None
    
    def __post_init__(self):
        if self.created_at is None:
            self.created_at = datetime.utcnow()

class CCTPRelayer:
    """Automated CCTP V2 attestation relayer"""
    
    # Domain IDs
    DOMAINS = {
        "ethereum": 0,
        "avalanche": 1,
        "optimism": 2,
        "arbitrum": 3,
        "base": 6,
        "polygon": 7
    }
    
    # Chain IDs
    CHAIN_IDS = {
        1: "ethereum",      # Ethereum mainnet
        42161: "arbitrum",  # Arbitrum One
        8453: "base",       # Base
        10: "optimism",     # Optimism
        137: "polygon",     # Polygon
        43114: "avalanche"  # Avalanche
    }
    
    # RPC endpoints
    RPC_URLS = {
        "ethereum": "https://eth.llamarpc.com",
        "arbitrum": "https://arb1.arbitrum.io/rpc",
        "base": "https://mainnet.base.org",
        "optimism": "https://mainnet.optimism.io",
        "polygon": "https://polygon-rpc.com",
        "avalanche": "https://api.avax.network/ext/bc/C/rpc"
    }
    
    # MessageTransmitter addresses (same on all chains)
    MESSAGE_TRANSMITTER = "0xC30362313FBBA5cf9163F0bb16a0e01f01A896ca"
    MESSAGE_TRANSMITTER_V2 = "0x81D40F21F12A8F0E3252Bccb954D722d4c464B64"
    
    # Circle API endpoints
    CIRCLE_API_BASE = "https://iris-api.circle.com"
    
    def __init__(self, private_key: str, network: str = "mainnet"):
        """
        Initialize the CCTP relayer
        
        Args:
            private_key: Private key for signing transactions
            network: Network to operate on (mainnet/testnet)
        """
        self.private_key = private_key
        self.account = Account.from_key(private_key)
        self.network = network
        self.transfers: Dict[str, CCTPTransfer] = {}
        self.web3_instances: Dict[str, Web3] = {}
        self.session: Optional[aiohttp.ClientSession] = None
        
        # Initialize Web3 instances for each chain
        self._init_web3_instances()
        
        logger.info(f"CCTP Relayer initialized for {network}")
        logger.info(f"Relayer address: {self.account.address}")
    
    def _init_web3_instances(self):
        """Initialize Web3 instances for all supported chains"""
        for chain_name, rpc_url in self.RPC_URLS.items():
            self.web3_instances[chain_name] = Web3(Web3.HTTPProvider(rpc_url))
            logger.info(f"Connected to {chain_name}: {self.web3_instances[chain_name].is_connected()}")
    
    async def start(self):
        """Start the relayer service"""
        self.session = aiohttp.ClientSession()
        logger.info("CCTP Relayer service started")
        
        # Start monitoring loop
        asyncio.create_task(self._monitor_loop())
        
        # Start completion loop
        asyncio.create_task(self._completion_loop())
    
    async def stop(self):
        """Stop the relayer service"""
        if self.session:
            await self.session.close()
        logger.info("CCTP Relayer service stopped")
    
    async def add_transfer(self, tx_hash: str, source_chain: str, dest_chain: str) -> CCTPTransfer:
        """
        Add a transfer to monitor
        
        Args:
            tx_hash: Transaction hash on source chain
            source_chain: Source chain name
            dest_chain: Destination chain name
        """
        source_domain = self.DOMAINS.get(source_chain)
        dest_domain = self.DOMAINS.get(dest_chain)
        
        if source_domain is None or dest_domain is None:
            raise ValueError(f"Invalid chain names: {source_chain} -> {dest_chain}")
        
        transfer = CCTPTransfer(
            tx_hash=tx_hash,
            source_domain=source_domain,
            dest_domain=dest_domain,
            amount=0,  # Will be updated from API
            recipient="",  # Will be updated from API
            status=TransferStatus.PENDING
        )
        
        self.transfers[tx_hash] = transfer
        logger.info(f"Added transfer to monitor: {tx_hash}")
        
        # Immediately check status
        await self._check_transfer_status(transfer)
        
        return transfer
    
    async def _monitor_loop(self):
        """Main monitoring loop"""
        while True:
            try:
                # Check all pending transfers
                pending_transfers = [
                    t for t in self.transfers.values() 
                    if t.status in [TransferStatus.PENDING, TransferStatus.ATTESTED]
                ]
                
                for transfer in pending_transfers:
                    await self._check_transfer_status(transfer)
                
                # Wait before next check
                await asyncio.sleep(5)  # Check every 5 seconds for v2 fast transfers
                
            except Exception as e:
                logger.error(f"Error in monitor loop: {e}")
                await asyncio.sleep(10)
    
    async def _completion_loop(self):
        """Loop to complete attested transfers"""
        while True:
            try:
                # Find transfers ready to complete
                ready_transfers = [
                    t for t in self.transfers.values()
                    if t.status == TransferStatus.ATTESTED
                ]
                
                for transfer in ready_transfers:
                    await self._complete_transfer(transfer)
                
                await asyncio.sleep(2)  # Check every 2 seconds
                
            except Exception as e:
                logger.error(f"Error in completion loop: {e}")
                await asyncio.sleep(5)
    
    async def _check_transfer_status(self, transfer: CCTPTransfer):
        """Check transfer status from Circle API using v2 endpoint"""
        if not self.session:
            return
        
        try:
            # Use v2 API endpoint with transaction hash query parameter
            # This matches Circle's official implementation
            url = f"{self.CIRCLE_API_BASE}/v2/messages/{transfer.source_domain}?transactionHash={transfer.tx_hash}"
            
            async with self.session.get(url) as response:
                if response.status == 404:
                    logger.debug(f"Transfer {transfer.tx_hash} not found in API yet")
                    logger.debug("Waiting for attestation...")
                    return
                
                if response.status != 200:
                    logger.error(f"API error {response.status} for {transfer.tx_hash}")
                    return
                
                data = await response.json()
                
                # Check if messages exist
                if not data.get("messages"):
                    logger.debug("Waiting for attestation...")
                    return
                
                message_data = data["messages"][0]
                
                # Update transfer details
                transfer.message = message_data.get("message")
                transfer.event_nonce = message_data.get("eventNonce")
                
                # Decode message to get recipient and amount
                if transfer.message:
                    self._decode_message(transfer)
                
                # Check attestation status (v2 uses 'status' field)
                status = message_data.get("status")
                attestation = message_data.get("attestation")
                
                if status == "complete" and attestation:
                    transfer.attestation = attestation
                    transfer.status = TransferStatus.ATTESTED
                    logger.info(f"✅ Attestation retrieved successfully!")
                    logger.info(f"   TX: {transfer.tx_hash}")
                    logger.info(f"   Nonce: {transfer.event_nonce}")
                    logger.info(f"   Ready to mint on destination chain")
                else:
                    logger.debug(f"⏳ Waiting for attestation: {transfer.tx_hash}")
                    logger.debug(f"   Status: {status}")
                    
        except Exception as e:
            logger.error(f"Error fetching attestation: {e}")
    
    def _decode_message(self, transfer: CCTPTransfer):
        """Decode CCTP message to extract details"""
        try:
            if not transfer.message:
                return
            
            # Remove 0x prefix if present
            message_hex = transfer.message.replace("0x", "")
            message_bytes = bytes.fromhex(message_hex)
            
            # CCTP message format (simplified):
            # First 4 bytes: version
            # Next 4 bytes: source domain
            # Next 4 bytes: destination domain
            # Next 32 bytes: nonce
            # Next 32 bytes: sender
            # Next 32 bytes: recipient
            # Next 32 bytes: amount
            
            # Extract recipient (bytes 76-108)
            recipient_bytes = message_bytes[76:108]
            transfer.recipient = "0x" + recipient_bytes.hex()[-40:]  # Last 20 bytes as address
            
            # Extract amount (bytes 108-140)
            amount_bytes = message_bytes[108:140]
            transfer.amount = int.from_bytes(amount_bytes, 'big')
            
            logger.debug(f"Decoded message for {transfer.tx_hash}")
            logger.debug(f"  Recipient: {transfer.recipient}")
            logger.debug(f"  Amount: {transfer.amount / 10**6} USDC")
            
        except Exception as e:
            logger.error(f"Error decoding message: {e}")
    
    async def _complete_transfer(self, transfer: CCTPTransfer):
        """Complete the transfer on destination chain (mint USDC)"""
        if transfer.status != TransferStatus.ATTESTED:
            return
        
        if not transfer.message or not transfer.attestation:
            logger.error(f"Missing message or attestation for {transfer.tx_hash}")
            return
        
        try:
            transfer.status = TransferStatus.COMPLETING
            logger.info(f"🔄 Minting USDC on destination chain...")
            
            # Get destination chain name
            dest_chain = None
            for chain, domain in self.DOMAINS.items():
                if domain == transfer.dest_domain:
                    dest_chain = chain
                    break
            
            if not dest_chain:
                raise ValueError(f"Unknown destination domain: {transfer.dest_domain}")
            
            logger.info(f"   Destination: {dest_chain}")
            
            # Get Web3 instance for destination chain
            web3 = self.web3_instances.get(dest_chain)
            if not web3:
                raise ValueError(f"No Web3 instance for {dest_chain}")
            
            # Prepare MessageTransmitter contract with receiveMessage function
            # This matches Circle's official implementation
            message_transmitter_abi = [
                {
                    "type": "function",
                    "name": "receiveMessage",
                    "stateMutability": "nonpayable",
                    "inputs": [
                        {"name": "message", "type": "bytes"},
                        {"name": "attestation", "type": "bytes"}
                    ],
                    "outputs": []
                }
            ]
            
            # Use MessageTransmitter address for the destination chain
            # Same address on all chains for v1 and v2
            transmitter_address = self.MESSAGE_TRANSMITTER
            contract = web3.eth.contract(
                address=Web3.to_checksum_address(transmitter_address),
                abi=message_transmitter_abi
            )
            
            # Build transaction
            nonce = web3.eth.get_transaction_count(self.account.address)
            
            # Estimate gas
            try:
                gas_estimate = contract.functions.receiveMessage(
                    bytes.fromhex(transfer.message.replace("0x", "")),
                    bytes.fromhex(transfer.attestation.replace("0x", ""))
                ).estimate_gas({'from': self.account.address})
            except Exception as e:
                logger.error(f"Gas estimation failed: {e}")
                gas_estimate = 300000  # Default gas limit
            
            # Get gas price
            gas_price = web3.eth.gas_price
            
            # Build transaction
            tx = contract.functions.receiveMessage(
                bytes.fromhex(transfer.message.replace("0x", "")),
                bytes.fromhex(transfer.attestation.replace("0x", ""))
            ).build_transaction({
                'from': self.account.address,
                'nonce': nonce,
                'gas': int(gas_estimate * 1.2),  # Add 20% buffer
                'gasPrice': gas_price,
                'chainId': web3.eth.chain_id
            })
            
            # Sign and send transaction
            signed_tx = self.account.sign_transaction(tx)
            tx_hash = web3.eth.send_raw_transaction(signed_tx.rawTransaction)
            
            logger.info(f"📤 Completion TX sent: {tx_hash.hex()}")
            logger.info(f"   Chain: {dest_chain}")
            logger.info(f"   Waiting for confirmation...")
            
            # Wait for confirmation
            receipt = web3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
            
            if receipt['status'] == 1:
                transfer.status = TransferStatus.COMPLETED
                transfer.completed_at = datetime.utcnow()
                
                elapsed = (transfer.completed_at - transfer.created_at).total_seconds()
                
                logger.info(f"✅ Transfer completed successfully!")
                logger.info(f"   Source TX: {transfer.tx_hash}")
                logger.info(f"   Completion TX: {receipt['transactionHash'].hex()}")
                logger.info(f"   Total time: {elapsed:.1f} seconds")
                logger.info(f"   Recipient: {transfer.recipient}")
                logger.info(f"   Amount: {transfer.amount / 10**6} USDC")
            else:
                transfer.status = TransferStatus.FAILED
                logger.error(f"❌ Completion transaction failed for {transfer.tx_hash}")
                
        except Exception as e:
            transfer.status = TransferStatus.FAILED
            logger.error(f"Error completing transfer {transfer.tx_hash}: {e}")
    
    def get_transfer_status(self, tx_hash: str) -> Optional[Dict]:
        """Get status of a monitored transfer"""
        transfer = self.transfers.get(tx_hash)
        if not transfer:
            return None
        
        return {
            "tx_hash": transfer.tx_hash,
            "status": transfer.status.value,
            "source_domain": transfer.source_domain,
            "dest_domain": transfer.dest_domain,
            "amount": transfer.amount / 10**6 if transfer.amount else 0,
            "recipient": transfer.recipient,
            "event_nonce": transfer.event_nonce,
            "created_at": transfer.created_at.isoformat(),
            "completed_at": transfer.completed_at.isoformat() if transfer.completed_at else None,
            "has_attestation": bool(transfer.attestation)
        }
    
    def get_all_transfers(self) -> List[Dict]:
        """Get all monitored transfers"""
        return [self.get_transfer_status(tx_hash) for tx_hash in self.transfers.keys()]


# Singleton instance
_relayer_instance: Optional[CCTPRelayer] = None

def get_relayer(private_key: Optional[str] = None) -> CCTPRelayer:
    """Get or create the relayer instance"""
    global _relayer_instance
    
    if _relayer_instance is None:
        if not private_key:
            raise ValueError("Private key required to initialize relayer")
        _relayer_instance = CCTPRelayer(private_key)
    
    return _relayer_instance
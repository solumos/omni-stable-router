"""
API routes for CCTP attestation relayer
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional, List
import logging
import os

from app.cctp_relayer import get_relayer, CCTPRelayer

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/relayer", tags=["CCTP Relayer"])

class TransferRequest(BaseModel):
    """Request to monitor a CCTP transfer"""
    tx_hash: str
    source_chain: str
    dest_chain: str

class TransferResponse(BaseModel):
    """Transfer status response"""
    tx_hash: str
    status: str
    source_domain: int
    dest_domain: int
    amount: float
    recipient: Optional[str]
    event_nonce: Optional[int]
    created_at: str
    completed_at: Optional[str]
    has_attestation: bool

# Initialize relayer on startup
relayer: Optional[CCTPRelayer] = None

async def init_relayer():
    """Initialize the relayer service"""
    global relayer
    
    # Get private key from environment
    private_key = os.getenv("RELAYER_PRIVATE_KEY")
    if not private_key:
        logger.warning("RELAYER_PRIVATE_KEY not set - relayer will not be initialized")
        return
    
    try:
        relayer = get_relayer(private_key)
        await relayer.start()
        logger.info("CCTP Relayer initialized and started")
    except Exception as e:
        logger.error(f"Failed to initialize relayer: {e}")

@router.on_event("startup")
async def startup_event():
    """Initialize relayer on API startup"""
    await init_relayer()

@router.on_event("shutdown")
async def shutdown_event():
    """Cleanup on API shutdown"""
    if relayer:
        await relayer.stop()

@router.post("/monitor", response_model=TransferResponse)
async def monitor_transfer(request: TransferRequest, background_tasks: BackgroundTasks):
    """
    Add a CCTP transfer to monitor and automatically complete
    
    The relayer will:
    1. Monitor the Circle API for attestation (8-20 seconds for v2)
    2. Automatically submit the attestation to the destination chain
    3. Complete the transfer without manual intervention
    """
    if not relayer:
        raise HTTPException(status_code=503, detail="Relayer service not available")
    
    try:
        # Add transfer to monitoring
        transfer = await relayer.add_transfer(
            request.tx_hash,
            request.source_chain,
            request.dest_chain
        )
        
        # Return current status
        status = relayer.get_transfer_status(request.tx_hash)
        if not status:
            raise HTTPException(status_code=404, detail="Transfer not found")
        
        return TransferResponse(**status)
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error monitoring transfer: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/status/{tx_hash}", response_model=TransferResponse)
async def get_transfer_status(tx_hash: str):
    """Get the current status of a monitored transfer"""
    if not relayer:
        raise HTTPException(status_code=503, detail="Relayer service not available")
    
    status = relayer.get_transfer_status(tx_hash)
    if not status:
        raise HTTPException(status_code=404, detail="Transfer not found")
    
    return TransferResponse(**status)

@router.get("/transfers", response_model=List[TransferResponse])
async def get_all_transfers():
    """Get all monitored transfers"""
    if not relayer:
        raise HTTPException(status_code=503, detail="Relayer service not available")
    
    transfers = relayer.get_all_transfers()
    return [TransferResponse(**t) for t in transfers]

@router.get("/stats")
async def get_relayer_stats():
    """Get relayer statistics"""
    if not relayer:
        raise HTTPException(status_code=503, detail="Relayer service not available")
    
    transfers = relayer.get_all_transfers()
    
    completed = sum(1 for t in transfers if t["status"] == "completed")
    pending = sum(1 for t in transfers if t["status"] == "pending")
    failed = sum(1 for t in transfers if t["status"] == "failed")
    
    total_volume = sum(t["amount"] for t in transfers if t["status"] == "completed")
    
    return {
        "total_transfers": len(transfers),
        "completed": completed,
        "pending": pending,
        "failed": failed,
        "total_volume_usdc": total_volume,
        "relayer_address": relayer.account.address if relayer else None,
        "network": relayer.network if relayer else None
    }

@router.post("/relay-manual")
async def manually_relay_attestation(
    tx_hash: str,
    message: str,
    attestation: str,
    dest_chain: str
):
    """
    Manually submit an attestation for a transfer
    
    This endpoint allows manual submission of attestations
    in case automatic monitoring fails
    """
    if not relayer:
        raise HTTPException(status_code=503, detail="Relayer service not available")
    
    # Implementation for manual relay
    # This would directly call the completion function
    # with the provided message and attestation
    
    return {
        "status": "Manual relay not yet implemented",
        "tx_hash": tx_hash
    }

@router.get("/health")
async def health_check():
    """Check if relayer service is healthy"""
    return {
        "status": "healthy" if relayer else "not_initialized",
        "relayer_address": relayer.account.address if relayer else None,
        "monitored_transfers": len(relayer.transfers) if relayer else 0
    }
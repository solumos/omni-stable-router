"""
Minimal API for OmniStable Router
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import os

app = FastAPI(title="OmniStable Router API", version="0.1.0")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with actual frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check endpoint
@app.get("/")
async def root():
    return {"status": "ok", "service": "omnistable-router-api"}

@app.get("/health")
async def health():
    return {"status": "healthy"}

# Transfer monitoring endpoint (mock for now)
class TransferRequest(BaseModel):
    tx_hash: str
    source_chain: str
    dest_chain: str
    amount: Optional[str] = None
    token: Optional[str] = None

class TransferResponse(BaseModel):
    success: bool
    message: str
    tx_hash: str
    status: str

@app.post("/api/v1/relayer/monitor", response_model=TransferResponse)
async def monitor_transfer(transfer: TransferRequest):
    """
    Register a CCTP transfer for monitoring
    """
    # For now, just acknowledge the request
    # In production, this would interact with the actual relayer
    return TransferResponse(
        success=True,
        message=f"Transfer {transfer.tx_hash} registered for monitoring",
        tx_hash=transfer.tx_hash,
        status="pending"
    )

@app.get("/api/v1/relayer/status/{tx_hash}")
async def get_transfer_status(tx_hash: str):
    """
    Get the status of a monitored transfer
    """
    # Mock response for now
    return {
        "tx_hash": tx_hash,
        "status": "pending",
        "message": "Transfer is being processed"
    }

# Run with: uvicorn main:app --host 0.0.0.0 --port $PORT
if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
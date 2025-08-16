"""
API Routes for Stable Router
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List
from pydantic import BaseModel
from decimal import Decimal

router = APIRouter()


# ============ Request/Response Models ============

class Token(BaseModel):
    symbol: str
    address: str
    decimals: int
    name: str


class Chain(BaseModel):
    id: int
    name: str
    rpc_url: str
    supported_tokens: List[Token]


class RouteQuoteRequest(BaseModel):
    source_token: str  # Token symbol
    dest_token: str    # Token symbol
    source_chain: int  # Chain ID
    dest_chain: int    # Chain ID
    amount: str        # Amount in wei


class RouteQuoteResponse(BaseModel):
    source_token: str
    dest_token: str
    source_chain: int
    dest_chain: int
    amount_in: str
    amount_out: str
    protocol: str  # CCTP, LayerZero OFT, LayerZero Composer, Stargate
    estimated_gas: str
    estimated_time: int  # seconds
    route_path: List[str]
    slippage: float


class TransactionRequest(BaseModel):
    recipient: str
    amount: str
    source_token: str
    source_chain: int
    dest_token: str
    dest_chain: int
    slippage_tolerance: float = 0.005  # 0.5% default


# ============ Routes ============

@router.get("/chains", response_model=List[Chain])
async def get_supported_chains():
    """Get list of supported chains and their tokens"""
    chains = [
        {
            "id": 1,
            "name": "Ethereum",
            "rpc_url": "https://eth.llamarpc.com",
            "supported_tokens": [
                {"symbol": "USDC", "address": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", "decimals": 6, "name": "USD Coin"},
                {"symbol": "PYUSD", "address": "0x6c3ea9036406852006290770BEdFcAbA0e23A0e8", "decimals": 6, "name": "PayPal USD"},
                {"symbol": "USDe", "address": "0x4c9EDD5852cd905f086C759E8383e09bff1E68B3", "decimals": 18, "name": "Ethena USD"},
                {"symbol": "crvUSD", "address": "0xf939E0A03FB07F59A73314E73794Be0E57ac1b4E", "decimals": 18, "name": "Curve USD"},
                {"symbol": "USDT", "address": "0xdAC17F958D2ee523a2206206994597C13D831ec7", "decimals": 6, "name": "Tether USD"},
            ]
        },
        {
            "id": 42161,
            "name": "Arbitrum",
            "rpc_url": "https://arb1.arbitrum.io/rpc",
            "supported_tokens": [
                {"symbol": "USDC", "address": "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", "decimals": 6, "name": "USD Coin"},
                {"symbol": "PYUSD", "address": "0x0000000000000000000000000000000000000000", "decimals": 6, "name": "PayPal USD"},
                {"symbol": "USDe", "address": "0x4c9EDD5852cd905f086C759E8383e09bff1E68B3", "decimals": 18, "name": "Ethena USD"},
                {"symbol": "crvUSD", "address": "0x498Bf2B1e120FeD3ad3D42Ea2165E9b73f99C1e5", "decimals": 18, "name": "Curve USD"},
                {"symbol": "USDT", "address": "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", "decimals": 6, "name": "Tether USD"},
            ]
        },
        # Add more chains...
    ]
    return chains


@router.post("/quote", response_model=RouteQuoteResponse)
async def get_route_quote(request: RouteQuoteRequest):
    """Get a quote for a cross-chain route"""
    
    # Determine protocol based on tokens
    protocol = _determine_protocol(
        request.source_token,
        request.dest_token,
        request.source_chain,
        request.dest_chain
    )
    
    # Calculate estimated output (mock for now)
    amount_out = request.amount  # Simplified - would calculate actual swap output
    
    return RouteQuoteResponse(
        source_token=request.source_token,
        dest_token=request.dest_token,
        source_chain=request.source_chain,
        dest_chain=request.dest_chain,
        amount_in=request.amount,
        amount_out=amount_out,
        protocol=protocol,
        estimated_gas="200000",
        estimated_time=_get_estimated_time(protocol),
        route_path=_get_route_path(request),
        slippage=0.003  # 0.3%
    )


@router.post("/transaction/prepare")
async def prepare_transaction(request: TransactionRequest):
    """Prepare transaction data for the router contract"""
    
    # Build transaction data
    tx_data = {
        "to": _get_router_address(request.source_chain),
        "data": _encode_transaction_data(request),
        "value": "0",  # Will be calculated based on LayerZero fees
        "gas": "500000",
        "chainId": request.source_chain,
    }
    
    return {
        "transaction": tx_data,
        "estimated_output": request.amount,  # Simplified
        "warnings": [],
    }


@router.get("/transaction/{tx_hash}")
async def get_transaction_status(tx_hash: str, chain_id: int = Query(...)):
    """Get status of a cross-chain transaction"""
    
    # Mock response - would query blockchain
    return {
        "tx_hash": tx_hash,
        "status": "completed",
        "source_chain": chain_id,
        "dest_chain": 42161,
        "amount_sent": "1000000000",
        "amount_received": "999500000",
        "timestamp": 1704067200,
    }


@router.get("/pools")
async def get_liquidity_pools():
    """Get configured liquidity pools for swaps"""
    
    pools = [
        {
            "pair": "USDC-USDT",
            "chain": "Ethereum",
            "dex": "Curve",
            "address": "0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7",
            "fee": 0.0004,
            "tvl": "500000000",
        },
        {
            "pair": "USDC-PYUSD",
            "chain": "Arbitrum",
            "dex": "Uniswap V3",
            "address": "0x0000000000000000000000000000000000000000",
            "fee": 0.0005,
            "tvl": "10000000",
        },
        # Add more pools...
    ]
    
    return {"pools": pools}


@router.get("/stats")
async def get_protocol_stats():
    """Get protocol statistics"""
    
    return {
        "total_volume": "1234567890",
        "total_transactions": 5678,
        "unique_users": 1234,
        "supported_chains": 6,
        "supported_tokens": 5,
        "average_time": 25,  # seconds
        "success_rate": 0.995,
    }


# ============ Helper Functions ============

def _determine_protocol(source_token: str, dest_token: str, source_chain: int, dest_chain: int) -> str:
    """Determine which protocol to use for routing"""
    
    # USDC to USDC always uses CCTP
    if source_token == "USDC" and dest_token == "USDC":
        return "CCTP"
    
    # Same OFT token uses LayerZero OFT
    if source_token == dest_token and source_token in ["PYUSD", "USDe", "crvUSD"]:
        return "LayerZero OFT"
    
    # USDT uses Stargate
    if source_token == "USDT" and dest_token == "USDT":
        return "Stargate"
    
    # Different tokens use LayerZero Composer
    return "LayerZero Composer"


def _get_estimated_time(protocol: str) -> int:
    """Get estimated time for protocol"""
    times = {
        "CCTP": 15,
        "LayerZero OFT": 25,
        "LayerZero Composer": 35,
        "Stargate": 30,
    }
    return times.get(protocol, 30)


def _get_route_path(request: RouteQuoteRequest) -> List[str]:
    """Get the route path for visualization"""
    if request.source_token == request.dest_token:
        return [
            f"{request.source_token} on Chain {request.source_chain}",
            "Bridge",
            f"{request.dest_token} on Chain {request.dest_chain}",
        ]
    else:
        return [
            f"{request.source_token} on Chain {request.source_chain}",
            "Bridge",
            f"Swap to {request.dest_token}",
            f"{request.dest_token} on Chain {request.dest_chain}",
        ]


def _get_router_address(chain_id: int) -> str:
    """Get router address for chain"""
    routers = {
        1: "0x0000000000000000000000000000000000000000",  # Ethereum
        42161: "0x0000000000000000000000000000000000000000",  # Arbitrum
        # Add more...
    }
    return routers.get(chain_id, "0x0000000000000000000000000000000000000000")


def _encode_transaction_data(request: TransactionRequest) -> str:
    """Encode transaction data for router contract"""
    # Simplified - would use web3.py to encode actual function call
    return "0x1234567890abcdef"
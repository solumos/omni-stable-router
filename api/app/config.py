"""
Configuration for the API
"""

from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # API Settings
    API_V1_PREFIX: str = "/api/v1"
    PROJECT_NAME: str = "Stable Router API"
    VERSION: str = "0.1.0"
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "https://stable-router.vercel.app",
        "https://omnistable.xyz",
        "https://www.omnistable.xyz",
        "*"  # Allow all origins for now
    ]
    
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://user:pass@localhost/stable_router"
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379"
    
    # Blockchain RPC URLs
    ETHEREUM_RPC: str = "https://eth.llamarpc.com"
    ARBITRUM_RPC: str = "https://arb1.arbitrum.io/rpc"
    OPTIMISM_RPC: str = "https://mainnet.optimism.io"
    BASE_RPC: str = "https://mainnet.base.org"
    POLYGON_RPC: str = "https://polygon-rpc.com"
    AVALANCHE_RPC: str = "https://api.avax.network/ext/bc/C/rpc"
    
    # Contract Addresses
    ROUTER_ADDRESS_ETH: str = ""
    ROUTER_ADDRESS_ARB: str = ""
    ROUTER_ADDRESS_OP: str = ""
    ROUTER_ADDRESS_BASE: str = ""
    ROUTER_ADDRESS_POLYGON: str = ""
    ROUTER_ADDRESS_AVAX: str = ""
    
    # Token Addresses (same across chains for OFT tokens)
    USDC_ADDRESS: str = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"
    PYUSD_ADDRESS: str = "0x6c3ea9036406852006290770BEdFcAbA0e23A0e8"
    USDE_ADDRESS: str = "0x4c9EDD5852cd905f086C759E8383e09bff1E68B3"
    CRVUSD_ADDRESS: str = "0xf939E0A03FB07F59A73314E73794Be0E57ac1b4E"
    
    # API Keys
    COINGECKO_API_KEY: str = ""
    CHAINLINK_API_KEY: str = ""
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
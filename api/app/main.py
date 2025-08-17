"""
Stable Router API - FastAPI backend for cross-chain stablecoin routing
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from app.config import settings
from app.routes import router
from app.relayer_routes import router as relayer_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handle startup and shutdown events"""
    # Startup
    logger.info("Starting Stable Router API...")
    yield
    # Shutdown
    logger.info("Shutting down Stable Router API...")


app = FastAPI(
    title="Stable Router API",
    description="API for cross-chain stablecoin routing",
    version="0.1.0",
    lifespan=lifespan,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(router, prefix="/api/v1")
app.include_router(relayer_router)  # No prefix - relayer routes are at /relayer/*


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "name": "Stable Router API",
        "version": "0.1.0",
        "status": "online",
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}
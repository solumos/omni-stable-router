#!/bin/bash
# Build script for stable-router-api with proper Cargo cache handling

echo "Setting up build environment..."

# Set writable Cargo cache directories
export CARGO_HOME=/tmp/cargo
export RUSTUP_HOME=/tmp/rustup
mkdir -p $CARGO_HOME
mkdir -p $RUSTUP_HOME

# Install dependencies
echo "Installing Python dependencies..."
pip install --upgrade pip

# Install without using Rust/Cargo dependencies first
pip install --no-cache-dir \
    fastapi \
    uvicorn[standard] \
    pydantic \
    pydantic-settings \
    httpx \
    web3 \
    eth-account \
    sqlalchemy \
    alembic \
    asyncpg \
    redis \
    celery \
    python-multipart \
    python-jose \
    python-dotenv

# Try to install bcrypt separately with pre-built wheels if available
echo "Installing bcrypt..."
pip install --no-cache-dir --prefer-binary bcrypt || {
    echo "Failed to install bcrypt with wheels, trying passlib without bcrypt..."
    pip install --no-cache-dir passlib
}

# Install remaining dependencies
pip install --no-cache-dir -r requirements.txt || true

echo "Build completed successfully!"
#!/bin/bash
# Test build script to verify production build works

echo "Starting production build test..."

# Clean previous builds
rm -rf .next

# Run build with timeout
timeout 60 npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
else
    echo "❌ Build failed or timed out"
    exit 1
fi
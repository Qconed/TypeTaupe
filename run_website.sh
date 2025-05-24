#!/bin/bash

# Read configuration from config.json
FRONTEND_PORT=$(jq -r '.frontend.port' config.json)
BACKEND_PORT=$(jq -r '.backend.port' config.json)
FRONTEND_DOMAIN=$(jq -r '.frontend.domain' config.json)
BACKEND_DOMAIN=$(jq -r '.backend.domain' config.json)
FRONTEND_PROTOCOL=$(jq -r '.frontend.protocol' config.json)
BACKEND_PROTOCOL=$(jq -r '.backend.protocol' config.json)

echo "🚀 Starting servers..."

# Start backend
echo "Starting backend server on port $BACKEND_PORT..."
(cd backend && deno run --allow-net --allow-read=../ main.ts $BACKEND_PORT) &
BACKEND_PID=$!

# Start frontend  
echo "Starting frontend server on port $FRONTEND_PORT..."
(cd frontend && deno run --allow-net --allow-read=../ server.ts $FRONTEND_PORT) &
FRONTEND_PID=$!

# Open browsers
firefox $FRONTEND_PROTOCOL://$FRONTEND_DOMAIN:$FRONTEND_PORT &
firefox $BACKEND_PROTOCOL://$BACKEND_DOMAIN:$BACKEND_PORT &

echo "✅ Both servers running:"
echo "  Backend PID: $BACKEND_PID ($BACKEND_PROTOCOL://$BACKEND_DOMAIN:$BACKEND_PORT)"
echo "  Frontend PID: $FRONTEND_PID ($FRONTEND_PROTOCOL://$FRONTEND_DOMAIN:$FRONTEND_PORT)"
echo ""
echo "Press Ctrl+C to stop..."

# Ensuring the processes are killed by Ctrl°C
cleanup() {
    echo ""
    echo "🛑 Stopping servers..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    wait $BACKEND_PID $FRONTEND_PID 2>/dev/null
    echo "✅ Servers stopped."
    exit 0
}

# Single trap for Ctrl+C
trap cleanup INT

# Wait for user interrupt
while true; do
    sleep 1
done
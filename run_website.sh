#!/bin/bash

echo "🚀 Starting servers..."

# Start backend
echo "Starting backend server on port 5000..."
(cd backend && deno run --allow-net --allow-read=./ main.ts 5000) &
BACKEND_PID=$!

# Start frontend  
echo "Starting frontend server on port 8080..."
(cd frontend && deno run --allow-net --allow-read=./ server.ts 8080) &
FRONTEND_PID=$!

firefox http://localhost:8080 &
firefox http://localhost:5000 &


echo "✅ Both servers running:"
echo "  Backend PID: $BACKEND_PID (http://localhost:5000)"
echo "  Frontend PID: $FRONTEND_PID (http://localhost:8080)"
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
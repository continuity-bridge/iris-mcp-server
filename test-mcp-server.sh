#!/bin/bash
# Quick test of the MCP server

echo "🧪 Testing Iris MCP Server..."
echo ""

# Start the server and send a test request
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}' | node dist/index.js

echo ""
echo "✅ Test complete!"

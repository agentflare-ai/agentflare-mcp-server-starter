#!/bin/bash
# Test script for Basic MCP Server
# This script demonstrates how to test the MCP server using curl

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Server configuration
SERVER_URL="http://localhost"
SERVER_PORT="8080"
BASE_URL="${SERVER_URL}:${SERVER_PORT}"

echo -e "${BLUE}🧪 MCP Server Test Script${NC}"
echo "=================================="
echo ""

# Function to make JSON-RPC request
make_request() {
    local method=$1
    local params=$2
    local id=$3

    echo -e "${YELLOW}→ Testing: ${method}${NC}"

    response=$(curl -s -X POST "${BASE_URL}/mcp" \
        -H "Content-Type: application/json" \
        -H "Accept: application/json,text/event-stream" \
        -d "{
            \"jsonrpc\": \"2.0\",
            \"id\": ${id},
            \"method\": \"${method}\",
            \"params\": ${params}
        }")

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Response:${NC}"
        echo "$response" | python3 -m json.tool 2>/dev/null || echo "$response"
    else
        echo -e "${RED}✗ Request failed${NC}"
    fi
    echo ""
}

# Check if server is running
echo -e "${BLUE}1. Checking server health...${NC}"
health_response=$(curl -s "${BASE_URL}/health" 2>/dev/null)
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Server is running${NC}"
    echo "$health_response" | python3 -m json.tool 2>/dev/null || echo "$health_response"
else
    echo -e "${RED}✗ Server is not running${NC}"
    echo "Please start the server first with: npm start"
    exit 1
fi
echo ""

# Test 1: Initialize
echo -e "${BLUE}2. Initialize MCP connection${NC}"
make_request "initialize" '{
    "protocolVersion": "2024-11-05",
    "capabilities": {},
    "clientInfo": {
        "name": "test-client",
        "version": "1.0.0"
    }
}' 1

# Test 2: Send initialized notification
echo -e "${BLUE}3. Send initialized notification${NC}"
curl -s -X POST "${BASE_URL}/mcp" \
    -H "Content-Type: application/json" \
    -d '{
        "jsonrpc": "2.0",
        "method": "notifications/initialized",
        "params": {}
    }'
echo -e "${GREEN}✓ Notification sent${NC}"
echo ""

# Test 3: List tools
echo -e "${BLUE}4. List available tools${NC}"
make_request "tools/list" '{}' 2

# Test 4: Call echo tool
echo -e "${BLUE}5. Test echo tool${NC}"
make_request "tools/call" '{
    "name": "echo",
    "arguments": {
        "message": "Hello from bash test script!"
    }
}' 3

# Test 5: Call calculator tool
echo -e "${BLUE}6. Test calculator tool${NC}"
make_request "tools/call" '{
    "name": "calculate",
    "arguments": {
        "expression": "42 * 10 + 7"
    }
}' 4

# Test 6: Call timestamp tool
echo -e "${BLUE}7. Test timestamp tool${NC}"
make_request "tools/call" '{
    "name": "get_timestamp",
    "arguments": {
        "format": "iso"
    }
}' 5

# Test 7: List resources
echo -e "${BLUE}8. List available resources${NC}"
make_request "resources/list" '{}' 6

# Test 8: Read a resource
echo -e "${BLUE}9. Read a resource${NC}"
make_request "resources/read" '{
    "uri": "text://welcome"
}' 7

# Test 9: List prompts
echo -e "${BLUE}10. List available prompts${NC}"
make_request "prompts/list" '{}' 8

# Test 10: Get a prompt
echo -e "${BLUE}11. Get a prompt template${NC}"
make_request "prompts/get" '{
    "name": "calculate",
    "arguments": {
        "expression": "100 / 5"
    }
}' 9

echo -e "${BLUE}=================================="
echo -e "🎉 Test script completed!${NC}"
echo ""
echo "Tips:"
echo "• To test with authentication, add: -u username:password"
echo "• To test with a different server: SERVER_URL=http://example.com ./test-server.sh"
echo "• To see raw JSON without formatting: Remove '| python3 -m json.tool'"
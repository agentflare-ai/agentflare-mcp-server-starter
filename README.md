# Basic MCP Server with TypeScript

A simple, well-documented implementation of a Model Context Protocol (MCP) server using TypeScript. This server demonstrates the core MCP concepts: tools, resources, and prompts.

## 🚀 Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/agentflare/agentflare.git
cd code-examples/basic-mcp-server

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env

# 4. Run the server (stdio transport)
npm run stdio

# 5. Or run with HTTP transport
npm run http

# 6. Test the server
./examples/test-server.sh
```

## 📚 Table of Contents

- [Overview](#overview)
- [What is MCP?](#what-is-mcp)
- [Local Development (Without Docker)](#local-development-without-docker)
- [Architecture](#architecture)
- [Installation](#installation)
- [Core Concepts](#core-concepts)
- [Code Walkthrough](#code-walkthrough)
- [Testing](#testing)
- [API Reference](#api-reference)
- [Extension Points](#extension-points)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)
- [AgentFlare Integration](#agentflare-integration)

## Overview

This MCP server provides:
- **5 example tools** - Echo, calculator, timestamp, random number, string manipulation
- **2 sample resources** - Configuration and welcome message
- **2 prompt templates** - Calculation and general query templates
- **Multiple transports** - Both stdio and HTTP support
- **Full TypeScript** - Type-safe implementation with comprehensive types

## What is MCP?

Model Context Protocol (MCP) is a universal standard for connecting AI models to external data sources and tools. Think of it as "USB-C for AI" - a single protocol that works everywhere.

```
┌─────────────┐     JSON-RPC 2.0     ┌─────────────┐
│  AI Client  │◄──────────────────────►│ MCP Server  │
│   (Agent)   │    over transport      │   (Tools)   │
└─────────────┘                        └─────────────┘
```

### Key MCP Concepts

1. **Tools** - Functions that agents can execute
2. **Resources** - Data sources agents can access
3. **Prompts** - Templates for structured interactions
4. **Transports** - Communication methods (stdio, HTTP)

## 🐳 Docker Setup

### Quick Start with Docker

No local Node.js or build tools required! Just Docker.

```bash
# 1. Build the Docker image (includes TypeScript compilation)
docker build -t mcp-server .

# 2. Run the MCP server
docker run -d -p 3000:3000 --name mcp-server mcp-server

# View logs
docker logs -f mcp-server

# Stop the server
docker stop mcp-server
docker rm mcp-server
```

### Customizing Configuration

You can override any environment variable when running the container:

```bash
# Run with custom port and log level
docker run -d -p 8080:8080 --name mcp-server \
  -e HTTP_PORT=8080 \
  -e LOG_LEVEL=debug \
  mcp-server

# Run with authentication enabled
docker run -d -p 3000:3000 --name mcp-server \
  -e AUTH_ENABLED=true \
  -e AUTH_USERNAME=myuser \
  -e AUTH_PASSWORD=mypassword \
  mcp-server
```

### Running MCP Inspector

The MCP Inspector should be run locally for the best experience:

```bash
# Run MCP Inspector locally
npx @modelcontextprotocol/inspector

# The inspector will open at http://localhost:6274
```

### Connecting Inspector to the Docker Server

1. Start the MCP server: `docker run -d -p 3000:3000 --name mcp-server mcp-server`
2. In another terminal, start the Inspector: `npx @modelcontextprotocol/inspector`
3. Open http://localhost:6274 in your browser
4. Enter the server URL: `http://localhost:3000/sse`
5. Click "Connect"

### About MCP Inspector

The MCP Inspector is a visual testing and debugging tool for MCP servers. As of 2025, it includes:

- **Interactive UI**: Test tools, resources, and prompts through a web interface
- **Security Features**: Built-in authentication and DNS rebinding protection
- **Multiple Transport Support**: Works with STDIO, SSE, and HTTP transports
- **Real-time Testing**: Execute tools and see responses immediately

For more information, see the [MCP Inspector GitHub repository](https://github.com/modelcontextprotocol/inspector).

### Security Considerations

⚠️ The MCP Inspector now includes authentication by default (CVE-2025-49596 fix). When you run it locally, a session token is generated and automatically included in the browser URL.

For production environments:
- Use STDIO transport instead of HTTP/SSE for better security
- Implement proper authentication and TLS for HTTP transport
- Consider using Docker MCP Gateway for complete network isolation

## 🖥️ Local Development (Without Docker)

### Running MCP Server Locally

1. **Install dependencies:**
```bash
npm install
```

2. **Configure environment variables:**
```bash
cp .env.example .env
# Edit .env to set your preferences
```

3. **Run the MCP server:**
```bash
# Development mode with hot reload
npm run dev

# Or production mode with HTTP transport
npm run http

# Or with stdio transport
npm run stdio
```

The server will start on `http://localhost:8080` (or the port specified in `.env`)

### Running MCP Inspector Locally

The MCP Inspector is a visual testing and debugging tool for MCP servers. It's recommended to run it locally for the best experience.

**Quick Start (Recommended)**
```bash
# Run the inspector directly with npx
npx @modelcontextprotocol/inspector

# The inspector will automatically open at http://localhost:6274
# A session token will be generated for security
```

**Alternative: Global Installation**
```bash
# Install globally
npm install -g @modelcontextprotocol/inspector

# Run the inspector
mcp-inspector
```

**Features:**
- Interactive web UI for testing MCP servers
- Support for multiple transport protocols (STDIO, SSE, HTTP)
- Built-in security with authentication tokens
- Real-time tool execution and response viewing

**Learn More:**
- [MCP Inspector Documentation](https://modelcontextprotocol.io/docs/tools/inspector)
- [GitHub Repository](https://github.com/modelcontextprotocol/inspector)

### Testing the Connection

1. Start the MCP server: `npm run http`
2. In another terminal, start the Inspector: `npx @modelcontextprotocol/inspector`
3. Open http://localhost:6274 in your browser (should open automatically)
4. Enter the MCP server URL: `http://localhost:8080/sse`
5. Click "Connect" to establish the connection

### Troubleshooting Local Setup

- **Port conflicts:** If port 8080 is in use, change it in `.env`
- **Connection refused:** Ensure the MCP server is running before connecting the Inspector
- **SSE transport deprecated warning:** This is expected - the Inspector still uses SSE for compatibility

## Architecture

```
┌──────────────────────────────────┐
│         MCP Server               │
├──────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐     │
│  │  Tools   │  │Resources │     │
│  ├──────────┤  ├──────────┤     │
│  │ • Echo   │  │ • Config │     │
│  │ • Calc   │  │ • Welcome│     │
│  │ • Time   │  └──────────┘     │
│  │ • Random │                   │
│  │ • String │  ┌──────────┐     │
│  └──────────┘  │ Prompts  │     │
│                ├──────────┤     │
│                │ • Calc   │     │
│                │ • Query  │     │
│                └──────────┘     │
├──────────────────────────────────┤
│        Transport Layer           │
│  ┌──────────┐  ┌──────────┐     │
│  │  stdio   │  │   HTTP   │     │
│  └──────────┘  └──────────┘     │
└──────────────────────────────────┘
```

## Installation

### Prerequisites

- Node.js 18 or higher
- npm or yarn package manager
- (Optional) curl for testing

### Step-by-Step Installation

1. **Install dependencies**:
```bash
npm install
```

2. **Configure environment**:
```bash
cp .env.example .env
```

Edit `.env` as needed:
```env
TRANSPORT_TYPE=http
HTTP_PORT=8080
LOG_LEVEL=info
```

3. **Build the server**:
```bash
npm run build
```

4. **Start the server**:
```bash
# For stdio transport (default)
npm run stdio

# For HTTP transport
npm run http

# For development with hot reload
npm run dev
```

## Core Concepts

### 1. Tools

Tools are functions that can be called by AI agents:

```typescript
export async function echoTool(message: string): Promise<ToolResult> {
  return {
    success: true,
    content: `Echo: ${message}`,
    metadata: {
      timestamp: new Date().toISOString()
    }
  };
}
```

### 2. Resources

Resources provide data to agents:

```typescript
this.resources.set('config://sample', {
  uri: 'config://sample',
  name: 'Sample Configuration',
  mimeType: 'application/json',
  content: JSON.stringify(configData)
});
```

### 3. Prompts

Prompts are templates for structured interactions:

```typescript
this.prompts.set('calculate', {
  name: 'calculate',
  template: 'Please calculate: {{expression}}',
  arguments: [
    {
      name: 'expression',
      description: 'Mathematical expression',
      required: true
    }
  ]
});
```

### 4. Protocol Flow

```
Client                          Server
  │                               │
  ├──── initialize ──────────────►│
  │◄──── capabilities ────────────┤
  │                               │
  ├──── tools/list ──────────────►│
  │◄──── tool definitions ────────┤
  │                               │
  ├──── tools/call ──────────────►│
  │      (name, arguments)        │
  │◄──── result ──────────────────┤
  │                               │
```

## Code Walkthrough

### Server Implementation (`src/server.ts`)

The main server class with MCP protocol handlers:

```typescript
export class BasicMCPServer {
  private server: Server;
  private resources: Map<string, Resource>;
  private prompts: Map<string, PromptTemplate>;

  constructor(config: ServerConfig) {
    // Initialize MCP server with capabilities
    this.server = new Server(
      { name: config.name, version: config.version },
      { capabilities: { tools: {}, resources: {}, prompts: {} } }
    );

    this.setupHandlers();
  }

  private setupHandlers(): void {
    // Handle tool listing
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return { tools: getToolDefinitions() };
    });

    // Handle tool execution
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const result = await executeeTool(request.params.name, request.params.arguments);
      return { content: [{ type: 'text', text: result.content }] };
    });
  }
}
```

### Tool Implementation (`src/tools.ts`)

Each tool follows a consistent pattern:

```typescript
export async function calculatorTool(expression: string): Promise<ToolResult> {
  try {
    // Validate input
    if (!expression) {
      return { success: false, error: 'Expression required' };
    }

    // Process the tool logic
    const result = evaluateExpression(expression);

    // Return structured result
    return {
      success: true,
      content: `${expression} = ${result}`,
      metadata: { expression, result }
    };
  } catch (error) {
    return { success: false, error: `Error: ${error}` };
  }
}
```

### Transport Layer (`src/index.ts`)

Supporting multiple transport methods:

```typescript
// stdio transport
if (config.transport.type === 'stdio') {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

// HTTP transport
if (config.transport.type === 'http') {
  app.post('/mcp', async (req, res) => {
    // Handle JSON-RPC request
    const response = await handleMCPRequest(req.body);
    res.json(response);
  });
}
```

## Testing

### Using the Test Script

```bash
# Make the script executable
chmod +x examples/test-server.sh

# Run all tests
./examples/test-server.sh
```

### Using curl

Test individual MCP methods:

```bash
# 1. Initialize
curl -X POST http://localhost:8080/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": {
        "name": "test",
        "version": "1.0"
      }
    }
  }'

# 2. List tools
curl -X POST http://localhost:8080/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/list",
    "params": {}
  }'

# 3. Call a tool
curl -X POST http://localhost:8080/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "calculate",
      "arguments": {
        "expression": "42 * 10"
      }
    }
  }'
```

### Using the TypeScript Client

```bash
# Run the example client
npx tsx examples/client.ts
```

### Unit Testing

```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

## API Reference

### Available Tools

| Tool | Description | Parameters |
|------|-------------|------------|
| `echo` | Echo back a message | `message: string` |
| `calculate` | Evaluate math expression | `expression: string` |
| `get_timestamp` | Get current time | `format?: 'iso' \| 'unix' \| 'locale'` |
| `random_number` | Generate random number | `min?: number, max?: number, isInteger?: boolean` |
| `string_manipulation` | Transform strings | `text: string, operation: string` |

### Available Resources

| URI | Description | Type |
|-----|-------------|------|
| `config://sample` | Sample configuration | `application/json` |
| `text://welcome` | Welcome message | `text/plain` |

### Available Prompts

| Name | Description | Arguments |
|------|-------------|-----------|
| `calculate` | Math calculation template | `expression` |
| `query` | General query template | `question, context?` |

## Extension Points

### Adding New Tools

1. **Create the tool function** in `src/tools.ts`:

```typescript
export async function myNewTool(param: string): Promise<ToolResult> {
  // Implementation
  return {
    success: true,
    content: "Result",
    metadata: { param }
  };
}
```

2. **Add to tool definitions**:

```typescript
export function getToolDefinitions() {
  return [
    // ... existing tools
    {
      name: 'my_new_tool',
      description: 'Description of the tool',
      inputSchema: {
        type: 'object',
        properties: {
          param: {
            type: 'string',
            description: 'Parameter description'
          }
        },
        required: ['param']
      }
    }
  ];
}
```

3. **Handle in server**:

```typescript
case 'my_new_tool':
  result = await myNewTool(args.param as string);
  break;
```

### Adding New Resources

```typescript
this.resources.set('custom://data', {
  uri: 'custom://data',
  name: 'Custom Data',
  mimeType: 'application/json',
  content: JSON.stringify(data)
});
```

### Supporting New Transports

Implement a custom transport adapter:

```typescript
class WebSocketTransport implements Transport {
  async start(): Promise<void> {
    // WebSocket implementation
  }
}
```

## Best Practices

### Security

- ✅ **Validate all inputs** - Sanitize tool parameters
- ✅ **Use authentication** - Enable for production
- ✅ **Implement rate limiting** - Prevent abuse
- ✅ **Secure transports** - Use TLS for HTTP

### Performance

- ✅ **Async operations** - Non-blocking tool execution
- ✅ **Connection pooling** - For database tools
- ✅ **Response caching** - For expensive operations
- ✅ **Timeout handling** - Prevent hanging requests

### Code Quality

- ✅ **TypeScript strict mode** - Full type safety
- ✅ **Error handling** - Graceful failures
- ✅ **Logging** - Structured logs for debugging
- ✅ **Testing** - Unit and integration tests

## Troubleshooting

### Common Issues

#### "Cannot find module '@modelcontextprotocol/sdk'"
```bash
npm install
```

#### "Port 8080 already in use"
```bash
# Change port in .env
HTTP_PORT=3000

# Or kill the process
lsof -i :8080
kill -9 <PID>
```

#### "Method not found"
- Verify protocol version compatibility
- Check method name spelling
- Ensure server has the capability

#### "Connection refused"
```bash
# Check server is running
curl http://localhost:8080/health

# Check firewall settings
sudo ufw status
```

## AgentFlare Integration

### Monitoring MCP Server

1. **Enable in `.env`**:
```env
AGENTFLARE_ENABLED=true
AGENTFLARE_API_KEY=your_key
AGENTFLARE_ENDPOINT=https://your-workspace.agentflare.com/telemetry
```

2. **Monitor metrics**:
- Tool execution times
- Error rates
- Request volumes
- Resource usage

3. **Debug with traces**:
- See full request/response
- Track tool call chains
- Analyze performance bottlenecks

## Production Deployment

### Docker Deployment

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 8080
CMD ["node", "dist/index.js"]
```

### Environment Configuration

```env
# Production settings
NODE_ENV=production
TRANSPORT_TYPE=http
HTTP_PORT=8080
AUTH_ENABLED=true
RATE_LIMIT_ENABLED=true
LOG_LEVEL=warn
```

### Health Checks

```typescript
// Kubernetes readiness probe
app.get('/ready', (req, res) => {
  const ready = server.isReady();
  res.status(ready ? 200 : 503).json({ ready });
});

// Liveness probe
app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});
```

## Integration with AI Agents

### With Claude Desktop

```json
{
  "mcpServers": {
    "basic-server": {
      "command": "node",
      "args": ["/path/to/basic-mcp-server/dist/index.js"],
      "env": {
        "TRANSPORT_TYPE": "stdio"
      }
    }
  }
}
```

### With Python Agent

```python
# See simple-agent/examples/mcp_client.py
mcp_client = MCPClient("http://localhost", 8080)
mcp_client.initialize()
tools = mcp_client.list_tools()
result = mcp_client.call_tool("calculate", {"expression": "2+2"})
```

## Resources

- [MCP Specification](https://spec.modelcontextprotocol.io)
- [MCP SDK Documentation](https://github.com/modelcontextprotocol/typescript-sdk)
- [JSON-RPC 2.0 Specification](https://www.jsonrpc.org/specification)
- [AgentFlare Documentation](https://docs.agentflare.com)

## Contributing

We welcome contributions! Please see our [Contributing Guide](../../CONTRIBUTING.md) for details.

## License

MIT License - see [LICENSE](../../LICENSE) for details.

---

Built with ❤️ for the MCP community. Happy building! 🚀
#!/usr/bin/env node
/**
 * Basic MCP Server - Main Entry Point
 *
 * This file initializes and starts the MCP server.
 * It can be run with different transports (stdio or HTTP).
 */

import * as dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import { BasicMCPServer } from './server.js';
import { EnhancedMCPServer } from './enhanced-server.js';
import { ServerConfig } from './types.js';
import { EnhancedHttpHandler } from './enhanced-http-handler.js';
import { SSETransportManager } from './sse-transport.js';

// Load environment variables
dotenv.config();

/**
 * Parse command line arguments
 */
function parseArgs(): { transport: 'stdio' | 'http' | 'sse' } {
  const args = process.argv.slice(2);
  let transport: 'stdio' | 'http' | 'sse' = 'stdio';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--transport' && args[i + 1]) {
      transport = args[i + 1] as 'stdio' | 'http' | 'sse';
    }
  }

  return { transport };
}

/**
 * Load configuration from environment variables
 */
function loadConfig(): ServerConfig {
  const { transport } = parseArgs();

  return {
    name: process.env.SERVER_NAME || 'basic-mcp-server',
    version: process.env.SERVER_VERSION || '1.0.0',
    protocolVersion: process.env.PROTOCOL_VERSION || '2025-06-18',
    transport: {
      type: transport || (process.env.TRANSPORT_TYPE as 'stdio' | 'http' | 'sse') || 'stdio',
      http: {
        port: parseInt(process.env.HTTP_PORT || '8080', 10),
        host: process.env.HTTP_HOST || '0.0.0.0',
        cors: process.env.ENABLE_CORS === 'true',
      },
    },
    logging: {
      level: (process.env.LOG_LEVEL as any) || 'info',
      logToFile: process.env.LOG_TO_FILE === 'true',
      logFilePath: process.env.LOG_FILE_PATH,
    },
    security: {
      authEnabled: process.env.AUTH_ENABLED === 'true',
      auth: {
        username: process.env.AUTH_USERNAME || 'admin',
        password: process.env.AUTH_PASSWORD || 'secret',
      },
      rateLimit: {
        enabled: process.env.RATE_LIMIT_ENABLED === 'true',
        maxRequests: parseInt(process.env.RATE_LIMIT_MAX || '60', 10),
        windowMs: 60000, // 1 minute
      },
    },
    agentflare: {
      enabled: process.env.AGENTFLARE_ENABLED === 'true',
      apiKey: process.env.AGENTFLARE_API_KEY,
      endpoint: process.env.AGENTFLARE_ENDPOINT,
    },
  };
}

/**
 * Start HTTP server wrapper for MCP
 *
 * This demonstrates how to expose MCP over HTTP.
 * The actual MCP SDK handles the protocol details.
 */
async function startHttpServer(config: ServerConfig): Promise<void> {
  const app = express();

  // Middleware
  app.use(express.json());
  if (config.transport.http?.cors) {
    app.use(cors());
  }

  // Basic auth middleware if enabled
  if (config.security?.authEnabled) {
    app.use((req, res, next) => {
      const authHeader = req.headers.authorization;

      if (!authHeader) {
        res.status(401).json({ error: 'Authorization required' });
        return;
      }

      const [type, credentials] = authHeader.split(' ');
      if (type !== 'Basic') {
        res.status(401).json({ error: 'Invalid authorization type' });
        return;
      }

      const decoded = Buffer.from(credentials, 'base64').toString();
      const [username, password] = decoded.split(':');

      if (
        username !== config.security?.auth?.username ||
        password !== config.security?.auth?.password
      ) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }

      next();
    });
  }

  // Health check endpoint
  app.get('/health', (_, res) => {
    res.json({
      status: 'healthy',
      server: config.name,
      version: config.version,
      protocol: config.protocolVersion,
    });
  });

  // Create enhanced HTTP handler for StreamableHttp transport
  const enhancedHttpHandler = new EnhancedHttpHandler(config);

  // MCP endpoint with full JSON-RPC support and resource templates
  app.post('/mcp', async (req, res) => {
    await enhancedHttpHandler.handleRequest(req, res);
  });

  // SSE transport manager for bidirectional communication
  let sseManager: SSETransportManager | null = null;
  let enhancedServer: EnhancedMCPServer | null = null;

  try {
    sseManager = new SSETransportManager();
    enhancedServer = new EnhancedMCPServer(config);
    console.log('✅ SSE transport initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize SSE transport:', error);
    console.error('Stack trace:', (error as Error).stack);
  }

  // SSE endpoint - establishes SSE stream for server-to-client messages
  app.get('/sse', async (req, res) => {
    console.log('📡 New SSE connection request');

    if (!sseManager || !enhancedServer) {
      console.error('❌ SSE transport not initialized');
      res.status(500).json({ error: 'SSE transport not available' });
      return;
    }

    try {
      const session = await sseManager.createSession(req, res, enhancedServer.getServer());
      console.log(`✅ SSE session created: ${session.id}`);
    } catch (error) {
      console.error('❌ Failed to create SSE session:', error);
      console.error('Stack trace:', (error as Error).stack);
      // Don't send response here as SSE headers may already be set
      // The error is already logged for debugging
    }
  });

  // Messages endpoint - handles client-to-server messages for SSE transport
  app.post('/messages', async (req, res) => {
    const sessionId = req.query.sessionId as string;

    if (!sessionId) {
      res.status(400).json({
        jsonrpc: '2.0',
        error: {
          code: -32600,
          message: 'Session ID is required',
        },
        id: null,
      });
      return;
    }

    if (!sseManager) {
      console.error('❌ SSE transport not initialized for messages endpoint');
      res.status(500).json({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'SSE transport not available',
        },
        id: null,
      });
      return;
    }

    console.log(`📨 Message for session: ${sessionId}`);
    try {
      await sseManager.handleMessage(sessionId, req, res, req.body);
    } catch (error) {
      console.error('❌ Error handling message:', error);
      res.status(500).json({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Failed to handle message',
        },
        id: null,
      });
    }
  });

  // Start the HTTP server
  const port = config.transport.http?.port || 8080;
  const host = config.transport.http?.host || '0.0.0.0';

  app.listen(port, host, () => {
    console.log(`\n🌐 HTTP server listening on http://${host}:${port}`);
    console.log(`   Health check: http://${host}:${port}/health`);
    console.log(`   MCP endpoint: http://${host}:${port}/mcp`);
    console.log(`   SSE endpoint: http://${host}:${port}/sse`);
    console.log(`   Messages endpoint: http://${host}:${port}/messages`);

    if (config.security?.authEnabled) {
      console.log('   🔐 Authentication enabled');
    }

    if (config.agentflare?.enabled) {
      console.log('   🔍 AgentFlare observability enabled');
    }

    console.log('\n📡 Test with curl:');
    console.log(`   curl -X POST http://localhost:${port}/mcp \\`);
    console.log(`     -H "Content-Type: application/json" \\`);
    console.log(`     -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{"tools":{},"resources":{},"prompts":{}},"clientInfo":{"name":"test","version":"1.0"}}}'`);

    console.log('\n📡 Test SSE with:');
    console.log(`   curl -N http://localhost:${port}/sse`);
  });
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  console.log('🎯 Basic MCP Server Example');
  console.log('=' .repeat(50));

  try {
    // Load configuration
    const config = loadConfig();

    if (config.transport.type === 'http' || config.transport.type === 'sse') {
      // Start HTTP server
      await startHttpServer(config);
    } else {
      // Start stdio server (default)
      const server = new BasicMCPServer(config);
      await server.start();

      // Keep the process running
      process.stdin.resume();
    }
  } catch (error) {
    console.error(`\n❌ Failed to start server: ${error}`);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 Shutting down...');
  process.exit(0);
});

// Run the main function
main().catch((error) => {
  console.error(`❌ Unhandled error: ${error}`);
  process.exit(1);
});
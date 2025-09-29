/**
 * SSE Transport Implementation for MCP Server
 * Provides full bidirectional communication using Server-Sent Events
 * and HTTP POST for client-to-server messages
 */

import { Request, Response } from 'express';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';

/**
 * Session information for SSE connections
 */
export interface SSESession {
  id: string;
  transport: SSEServerTransport;
  server: Server;
  capabilities: Record<string, any>;
  createdAt: Date;
  lastActivity: Date;
}

/**
 * Manages SSE transport sessions
 */
export class SSETransportManager {
  private sessions: Map<string, SSESession> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Start cleanup interval to remove stale sessions
    this.startCleanupInterval();
  }

  /**
   * Start periodic cleanup of stale sessions
   */
  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      const now = new Date();
      const staleTimeout = 5 * 60 * 1000; // 5 minutes

      for (const [sessionId, session] of this.sessions) {
        const timeSinceActivity = now.getTime() - session.lastActivity.getTime();
        if (timeSinceActivity > staleTimeout) {
          console.log(`Cleaning up stale SSE session: ${sessionId}`);
          this.removeSession(sessionId);
        }
      }
    }, 60 * 1000); // Check every minute
  }

  /**
   * Create a new SSE session
   */
  async createSession(_req: Request, res: Response, server: Server): Promise<SSESession> {
    // Create SSE transport with unique endpoint for this session
    const transport = new SSEServerTransport('/messages', res, {
      // Enable DNS rebinding protection
      enableDnsRebindingProtection: true,
      allowedHosts: [
        'localhost',
        '127.0.0.1',
        '0.0.0.0',
        'localhost:3000',
        '127.0.0.1:3000',
        '0.0.0.0:3000',
        'localhost:8080',
        '127.0.0.1:8080',
        '0.0.0.0:8080'
      ],
      // Note: allowedOrigins removed to allow connections without Origin header
      // In production, configure this appropriately for security
    });

    // Create session object
    const session: SSESession = {
      id: transport.sessionId,
      transport,
      server,
      capabilities: {},
      createdAt: new Date(),
      lastActivity: new Date(),
    };

    // Store session
    this.sessions.set(session.id, session);

    // Set up cleanup on connection close
    res.on('close', () => {
      console.log(`SSE connection closed for session: ${session.id}`);
      this.removeSession(session.id);
    });

    // Connect server to transport (this automatically starts the transport)
    await server.connect(transport);

    console.log(`Created new SSE session: ${session.id}`);
    return session;
  }

  /**
   * Handle incoming POST message for a session
   */
  async handleMessage(
    sessionId: string,
    req: Request,
    res: Response,
    body: any
  ): Promise<void> {
    const session = this.sessions.get(sessionId);

    if (!session) {
      res.status(404).json({
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: `Session not found: ${sessionId}`,
        },
        id: null,
      });
      return;
    }

    // Update last activity
    session.lastActivity = new Date();

    try {
      // Handle the message through the SSE transport
      await session.transport.handlePostMessage(req, res, body);
    } catch (error) {
      console.error(`Error handling message for session ${sessionId}:`, error);

      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: 'Internal server error',
          },
          id: body?.id || null,
        });
      }
    }
  }

  /**
   * Get a session by ID
   */
  getSession(sessionId: string): SSESession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Remove a session
   */
  removeSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      // Close the transport
      session.transport.close().catch(error => {
        console.error(`Error closing transport for session ${sessionId}:`, error);
      });

      // Remove from map
      this.sessions.delete(sessionId);
      console.log(`Removed SSE session: ${sessionId}`);
    }
  }

  /**
   * Get all active sessions
   */
  getActiveSessions(): SSESession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Update session capabilities
   */
  updateSessionCapabilities(sessionId: string, capabilities: Record<string, any>): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.capabilities = { ...session.capabilities, ...capabilities };
      session.lastActivity = new Date();
    }
  }

  /**
   * Cleanup all sessions and stop intervals
   */
  destroy(): void {
    // Stop cleanup interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    // Close all sessions
    for (const sessionId of this.sessions.keys()) {
      this.removeSession(sessionId);
    }
  }
}
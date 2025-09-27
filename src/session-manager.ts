/**
 * Session Manager for MCP Server
 * Handles session lifecycle and capability negotiation
 */

import { ServerCapabilities, ClientCapabilities } from '@modelcontextprotocol/sdk/types.js';

/**
 * Negotiated capabilities for a session
 */
export interface NegotiatedCapabilities {
  tools: boolean;
  resources: boolean;
  prompts: boolean;
  logging: boolean;
  sampling: boolean;
  experimental?: Record<string, boolean>;
}

/**
 * Session information with capabilities
 */
export interface ManagedSession {
  id: string;
  clientInfo: {
    name: string;
    version: string;
  };
  protocolVersion: string;
  clientCapabilities: ClientCapabilities;
  negotiatedCapabilities: NegotiatedCapabilities;
  metadata: Record<string, any>;
  createdAt: Date;
  lastActivity: Date;
}

/**
 * Manages sessions and capability negotiation
 */
export class SessionManager {
  private sessions: Map<string, ManagedSession> = new Map();
  private serverCapabilities: ServerCapabilities;

  constructor(serverCapabilities?: ServerCapabilities) {
    // Default server capabilities - what the server can provide
    this.serverCapabilities = serverCapabilities || {
      tools: {},
      resources: {},
      prompts: {},
      logging: {},
    };
  }

  /**
   * Negotiate capabilities between client and server
   * Returns the capabilities that both client and server support
   */
  negotiateCapabilities(
    clientCapabilities: ClientCapabilities
  ): NegotiatedCapabilities {
    const negotiated: NegotiatedCapabilities = {
      tools: false,
      resources: false,
      prompts: false,
      logging: false,
      sampling: false,
    };

    // Tools capability
    if (this.serverCapabilities.tools && clientCapabilities.tools) {
      negotiated.tools = true;
    }

    // Resources capability
    if (this.serverCapabilities.resources && clientCapabilities.resources) {
      negotiated.resources = true;
    }

    // Prompts capability
    if (this.serverCapabilities.prompts && clientCapabilities.prompts) {
      negotiated.prompts = true;
    }

    // Logging capability
    if (this.serverCapabilities.logging && clientCapabilities.logging) {
      negotiated.logging = true;
    }

    // Sampling capability (if client supports it)
    if (clientCapabilities.sampling) {
      negotiated.sampling = true;
    }

    // Experimental features negotiation
    if (clientCapabilities.experimental && this.serverCapabilities.experimental) {
      negotiated.experimental = {};

      for (const [feature, clientSupport] of Object.entries(clientCapabilities.experimental)) {
        if (clientSupport && this.serverCapabilities.experimental[feature]) {
          negotiated.experimental[feature] = true;
        }
      }
    }

    return negotiated;
  }

  /**
   * Create a new session with negotiated capabilities
   */
  createSession(
    sessionId: string,
    clientInfo: { name: string; version: string },
    protocolVersion: string,
    clientCapabilities: ClientCapabilities
  ): ManagedSession {
    const negotiatedCapabilities = this.negotiateCapabilities(clientCapabilities);

    const session: ManagedSession = {
      id: sessionId,
      clientInfo,
      protocolVersion,
      clientCapabilities,
      negotiatedCapabilities,
      metadata: {},
      createdAt: new Date(),
      lastActivity: new Date(),
    };

    this.sessions.set(sessionId, session);

    console.log(`Created session ${sessionId} with capabilities:`, negotiatedCapabilities);
    return session;
  }

  /**
   * Get a session by ID
   */
  getSession(sessionId: string): ManagedSession | undefined {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActivity = new Date();
    }
    return session;
  }

  /**
   * Check if a session has a specific capability
   */
  hasCapability(sessionId: string, capability: keyof NegotiatedCapabilities): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    return !!session.negotiatedCapabilities[capability];
  }

  /**
   * Update session metadata
   */
  updateSessionMetadata(sessionId: string, metadata: Record<string, any>): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.metadata = { ...session.metadata, ...metadata };
      session.lastActivity = new Date();
    }
  }

  /**
   * Remove a session
   */
  removeSession(sessionId: string): void {
    this.sessions.delete(sessionId);
    console.log(`Removed session: ${sessionId}`);
  }

  /**
   * Get all active sessions
   */
  getActiveSessions(): ManagedSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Clean up stale sessions
   */
  cleanupStaleSessions(maxInactivityMs: number = 5 * 60 * 1000): void {
    const now = new Date();

    for (const [sessionId, session] of this.sessions) {
      const inactivityTime = now.getTime() - session.lastActivity.getTime();
      if (inactivityTime > maxInactivityMs) {
        this.removeSession(sessionId);
      }
    }
  }

  /**
   * Get server capabilities
   */
  getServerCapabilities(): ServerCapabilities {
    return this.serverCapabilities;
  }

  /**
   * Get capabilities for a specific session
   * Returns the server capabilities filtered by what was negotiated
   */
  getSessionCapabilities(sessionId: string): ServerCapabilities {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return {};
    }

    const capabilities: ServerCapabilities = {};

    if (session.negotiatedCapabilities.tools) {
      capabilities.tools = this.serverCapabilities.tools;
    }

    if (session.negotiatedCapabilities.resources) {
      capabilities.resources = this.serverCapabilities.resources;
    }

    if (session.negotiatedCapabilities.prompts) {
      capabilities.prompts = this.serverCapabilities.prompts;
    }

    if (session.negotiatedCapabilities.logging) {
      capabilities.logging = this.serverCapabilities.logging;
    }

    if (session.negotiatedCapabilities.experimental) {
      capabilities.experimental = {};
      for (const [feature, enabled] of Object.entries(session.negotiatedCapabilities.experimental)) {
        if (enabled && this.serverCapabilities.experimental?.[feature]) {
          capabilities.experimental[feature] = this.serverCapabilities.experimental[feature];
        }
      }
    }

    return capabilities;
  }

  /**
   * Clear all sessions
   */
  clearAllSessions(): void {
    this.sessions.clear();
    console.log('Cleared all sessions');
  }
}
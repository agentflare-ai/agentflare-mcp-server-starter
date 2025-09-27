/**
 * Type definitions for the basic MCP server.
 *
 * This file contains TypeScript interfaces and types used throughout
 * the MCP server implementation.
 */

/**
 * Server configuration interface
 */
export interface ServerConfig {
  /** Server name shown in MCP handshake */
  name: string;

  /** Server version */
  version: string;

  /** MCP protocol version */
  protocolVersion: string;

  /** Transport configuration */
  transport: TransportConfig;

  /** Logging configuration */
  logging: LoggingConfig;

  /** Security configuration */
  security?: SecurityConfig;

  /** AgentFlare configuration */
  agentflare?: AgentFlareConfig;
}

/**
 * Transport configuration
 */
export interface TransportConfig {
  /** Transport type: 'stdio', 'http', or 'sse' */
  type: 'stdio' | 'http' | 'sse';

  /** HTTP-specific configuration */
  http?: {
    port: number;
    host: string;
    cors: boolean;
  };

  /** SSE-specific configuration */
  sse?: {
    endpoint?: string;
    messagesEndpoint?: string;
    sessionTimeout?: number;
    heartbeatInterval?: number;
  };
}

/**
 * Logging configuration
 */
export interface LoggingConfig {
  /** Log level */
  level: 'error' | 'warn' | 'info' | 'debug';

  /** Whether to log to file */
  logToFile: boolean;

  /** Log file path */
  logFilePath?: string;
}

/**
 * Security configuration
 */
export interface SecurityConfig {
  /** Whether authentication is enabled */
  authEnabled: boolean;

  /** Basic auth credentials */
  auth?: {
    username: string;
    password: string;
  };

  /** Rate limiting configuration */
  rateLimit?: {
    enabled: boolean;
    maxRequests: number;
    windowMs: number;
  };
}

/**
 * AgentFlare configuration for observability
 */
export interface AgentFlareConfig {
  /** Whether AgentFlare integration is enabled */
  enabled: boolean;

  /** API key for AgentFlare */
  apiKey?: string;

  /** Endpoint for sending telemetry */
  endpoint?: string;
}

/**
 * Tool execution result
 */
export interface ToolResult {
  /** Whether the tool execution was successful */
  success: boolean;

  /** The result content */
  content?: string;

  /** Error message if execution failed */
  error?: string;

  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Resource data structure
 */
export interface Resource {
  /** Resource URI */
  uri: string;

  /** Resource name */
  name: string;

  /** Resource description */
  description?: string;

  /** Resource MIME type */
  mimeType?: string;

  /** Resource content */
  content: string;
}

/**
 * Prompt template
 */
export interface PromptTemplate {
  /** Prompt name */
  name: string;

  /** Prompt description */
  description?: string;

  /** Prompt template with placeholders */
  template: string;

  /** Arguments for the prompt */
  arguments?: Array<{
    name: string;
    description?: string;
    required?: boolean;
  }>;
}
/**
 * Enhanced HTTP Handler for MCP Server with StreamableHttp support
 * Uses EnhancedMCPServer for full feature support including resource templates
 */

import { Request, Response } from 'express';
import { EnhancedMCPServer } from './enhanced-server.js';
import { ServerConfig } from './types.js';
import { getToolDefinitions } from './tools.js';

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: string | number | null;
  method: string;
  params?: any;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: string | number | null;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

// JSON-RPC error codes
const ErrorCodes = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
};

export class EnhancedHttpHandler {
  private server: EnhancedMCPServer;
  private sessionId: string = 'http-default';

  constructor(config: ServerConfig) {
    this.server = new EnhancedMCPServer(config);
  }

  async handleRequest(req: Request, res: Response): Promise<void> {
    try {
      const request = req.body as JsonRpcRequest;

      // Validate JSON-RPC request
      if (!request.jsonrpc || request.jsonrpc !== '2.0') {
        this.sendError(res, request.id, ErrorCodes.INVALID_REQUEST, 'Invalid JSON-RPC version');
        return;
      }

      if (!request.method) {
        this.sendError(res, request.id, ErrorCodes.INVALID_REQUEST, 'Method is required');
        return;
      }

      console.log(`📥 Received MCP request: ${request.method}`);

      // Route the request to the appropriate handler
      try {
        const result = await this.routeRequest(request);
        this.sendResult(res, request.id, result);
      } catch (error: any) {
        if (error.code && error.message) {
          this.sendError(res, request.id, error.code, error.message, error.data);
        } else {
          this.sendError(res, request.id, ErrorCodes.INTERNAL_ERROR, error.message || 'Internal server error');
        }
      }
    } catch (error) {
      console.error('Failed to handle HTTP request:', error);
      this.sendError(res, null, ErrorCodes.PARSE_ERROR, 'Failed to parse request');
    }
  }

  private async routeRequest(request: JsonRpcRequest): Promise<any> {
    const sessionManager = this.server.getSessionManager();

    switch (request.method) {
      case 'ping': {
        console.log('🏓 Ping received, sending pong...');
        return {};
      }

      case 'initialize': {
        const { protocolVersion, capabilities: clientCapabilities, clientInfo } = request.params;

        // Create session with negotiated capabilities
        const newSession = sessionManager.createSession(
          this.sessionId,
          clientInfo,
          protocolVersion,
          clientCapabilities || {}
        );

        // Return negotiated capabilities
        const negotiatedCapabilities = sessionManager.getSessionCapabilities(this.sessionId);

        console.log(`✅ Session ${this.sessionId} initialized with capabilities:`, newSession.negotiatedCapabilities);

        return {
          protocolVersion: '2025-06-18',
          capabilities: negotiatedCapabilities,
          serverInfo: {
            name: 'Enhanced MCP Server',
            version: '1.0.0',
          },
        };
      }

      case 'tools/list': {
        if (!sessionManager.hasCapability(this.sessionId, 'tools')) {
          throw {
            code: ErrorCodes.METHOD_NOT_FOUND,
            message: 'Tools capability not negotiated for this session',
          };
        }

        console.log('📋 Listing tools...');
        return {
          tools: getToolDefinitions(),
        };
      }

      case 'tools/call': {
        if (!sessionManager.hasCapability(this.sessionId, 'tools')) {
          throw {
            code: ErrorCodes.METHOD_NOT_FOUND,
            message: 'Tools capability not negotiated for this session',
          };
        }

        console.log(`🔧 Calling tool: ${request.params.name}`);

        const { name, arguments: args = {} } = request.params;

        // Import tools dynamically to use them
        const { echoTool, calculatorTool, timestampTool, randomNumberTool, stringTool } = await import('./tools.js');

        try {
          let result;

          switch (name) {
            case 'echo':
              result = await echoTool(args.message as string);
              break;
            case 'calculate':
              result = await calculatorTool(args.expression as string);
              break;
            case 'get_timestamp':
              result = await timestampTool(args.format as string);
              break;
            case 'random_number':
              result = await randomNumberTool(
                args.min as number,
                args.max as number,
                args.isInteger as boolean
              );
              break;
            case 'string_manipulation':
              result = await stringTool(args.text as string, args.operation as any);
              break;
            default:
              throw new Error(`Unknown tool: ${name}`);
          }

          return {
            content: [
              {
                type: 'text',
                text: result.success ? result.content! : result.error!,
              },
            ],
          };
        } catch (error) {
          console.error(`❌ Tool error: ${error}`);
          return {
            content: [
              {
                type: 'text',
                text: `Error executing tool ${name}: ${error}`,
              },
            ],
            isError: true,
          };
        }
      }

      case 'resources/list': {
        if (!sessionManager.hasCapability(this.sessionId, 'resources')) {
          throw {
            code: ErrorCodes.METHOD_NOT_FOUND,
            message: 'Resources capability not negotiated for this session',
          };
        }

        console.log('📚 Listing resources...');

        // Get resources from the enhanced server (access them through a public method)
        const resources = [
          {
            uri: 'config://sample',
            name: 'Sample Configuration',
            description: 'A sample configuration resource',
            mimeType: 'application/json',
          },
          {
            uri: 'text://welcome',
            name: 'Welcome Message',
            description: 'A welcome message for users',
            mimeType: 'text/plain',
          },
        ];

        return { resources };
      }

      case 'resources/templates/list': {
        if (!sessionManager.hasCapability(this.sessionId, 'resources')) {
          throw {
            code: ErrorCodes.METHOD_NOT_FOUND,
            message: 'Resources capability not negotiated for this session',
          };
        }

        console.log('📋 Listing resource templates...');

        // Return the resource templates that are defined in EnhancedMCPServer
        const resourceTemplates = [
          {
            uriTemplate: 'user://profile/{userId}',
            name: 'User Profile',
            description: 'Fetches user profile information by user ID',
            mimeType: 'application/json',
          },
          {
            uriTemplate: 'file:///{path}',
            name: 'File Reader',
            description: 'Reads file contents from the specified path',
            mimeType: 'text/plain',
          },
          {
            uriTemplate: 'api:///{endpoint}/{id}',
            name: 'API Resource',
            description: 'Fetches data from API endpoints with optional ID parameter',
            mimeType: 'application/json',
          },
          {
            uriTemplate: 'db:///{table}/{query}',
            name: 'Database Query',
            description: 'Executes database queries on specified tables',
            mimeType: 'application/json',
          },
          {
            uriTemplate: 'log:///{service}/{date}',
            name: 'Service Logs',
            description: 'Retrieves logs for a specific service and date',
            mimeType: 'text/plain',
          },
        ];

        return { resourceTemplates };
      }

      case 'resources/read': {
        if (!sessionManager.hasCapability(this.sessionId, 'resources')) {
          throw {
            code: ErrorCodes.METHOD_NOT_FOUND,
            message: 'Resources capability not negotiated for this session',
          };
        }

        console.log(`📖 Reading resource: ${request.params.uri}`);

        // Simple mock implementation for known resources
        if (request.params.uri === 'config://sample') {
          return {
            contents: [
              {
                uri: 'config://sample',
                mimeType: 'application/json',
                text: JSON.stringify({
                  name: 'Enhanced MCP Server',
                  version: '1.0.0',
                  features: ['tools', 'resources', 'prompts', 'sse', 'capability-negotiation'],
                  protocolVersion: '2025-06-18',
                  timestamp: new Date().toISOString(),
                }, null, 2),
              },
            ],
          };
        } else if (request.params.uri === 'text://welcome') {
          return {
            contents: [
              {
                uri: 'text://welcome',
                mimeType: 'text/plain',
                text: `Welcome to the Enhanced MCP Server!

This server features:
- Full SSE transport with bidirectional communication
- Dynamic capability negotiation
- Session management
- Complete 2025 MCP specification compliance

Available tools: ${getToolDefinitions().map(t => t.name).join(', ')}`,
              },
            ],
          };
        }

        throw {
          code: ErrorCodes.INVALID_PARAMS,
          message: `Resource not found: ${request.params.uri}`,
        };
      }

      case 'prompts/list': {
        if (!sessionManager.hasCapability(this.sessionId, 'prompts')) {
          throw {
            code: ErrorCodes.METHOD_NOT_FOUND,
            message: 'Prompts capability not negotiated for this session',
          };
        }

        console.log('💬 Listing prompts...');

        const prompts = [
          {
            name: 'calculate',
            description: 'Template for mathematical calculations',
            arguments: [
              {
                name: 'expression',
                description: 'The mathematical expression to calculate',
                required: true,
              },
            ],
          },
          {
            name: 'query',
            description: 'General query template',
            arguments: [
              {
                name: 'question',
                description: 'The question to answer',
                required: true,
              },
              {
                name: 'context',
                description: 'Additional context for the question',
                required: false,
              },
            ],
          },
        ];

        return { prompts };
      }

      case 'prompts/get': {
        if (!sessionManager.hasCapability(this.sessionId, 'prompts')) {
          throw {
            code: ErrorCodes.METHOD_NOT_FOUND,
            message: 'Prompts capability not negotiated for this session',
          };
        }

        console.log(`💬 Getting prompt: ${request.params.name}`);

        const prompts: Record<string, any> = {
          calculate: {
            template: 'Please calculate: {{expression}}',
          },
          query: {
            template: `Question: {{question}}

Context: {{context}}

Please provide a detailed answer.`,
          },
        };

        const prompt = prompts[request.params.name];

        if (!prompt) {
          throw {
            code: ErrorCodes.INVALID_PARAMS,
            message: `Prompt not found: ${request.params.name}`,
          };
        }

        let processedTemplate = prompt.template;
        if (request.params.arguments) {
          for (const [key, value] of Object.entries(request.params.arguments)) {
            processedTemplate = processedTemplate.replace(`{{${key}}}`, String(value));
          }
        }

        return {
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: processedTemplate,
              },
            },
          ],
        };
      }

      default:
        throw {
          code: ErrorCodes.METHOD_NOT_FOUND,
          message: `Method not found: ${request.method}`,
        };
    }
  }

  private sendResult(res: Response, id: string | number | null, result: any): void {
    const response: JsonRpcResponse = {
      jsonrpc: '2.0',
      id,
      result,
    };
    res.json(response);
  }

  private sendError(
    res: Response,
    id: string | number | null,
    code: number,
    message: string,
    data?: any
  ): void {
    const response: JsonRpcResponse = {
      jsonrpc: '2.0',
      id,
      error: {
        code,
        message,
        data,
      },
    };
    res.status(code === ErrorCodes.METHOD_NOT_FOUND ? 404 : 400).json(response);
  }

  getServer(): EnhancedMCPServer {
    return this.server;
  }
}
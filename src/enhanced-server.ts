/**
 * Enhanced MCP Server with Full SSE and Capability Negotiation
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  InitializeRequestSchema,
  ServerCapabilities,
} from '@modelcontextprotocol/sdk/types.js';

import { ServerConfig, Resource, PromptTemplate } from './types.js';
import {
  echoTool,
  calculatorTool,
  timestampTool,
  randomNumberTool,
  stringTool,
  getToolDefinitions,
} from './tools.js';
import { SessionManager } from './session-manager.js';

/**
 * Enhanced MCP Server with capability negotiation
 */
export class EnhancedMCPServer {
  private server: Server;
  private config: ServerConfig;
  private resources: Map<string, Resource>;
  private prompts: Map<string, PromptTemplate>;
  private sessionManager: SessionManager;

  constructor(config: ServerConfig) {
    this.config = config;
    this.resources = new Map();
    this.prompts = new Map();

    // Define full server capabilities
    const serverCapabilities: ServerCapabilities = {
      tools: {},
      resources: {},
      prompts: {},
      logging: {},
    };

    // Initialize session manager with server capabilities
    this.sessionManager = new SessionManager(serverCapabilities);

    // Initialize the MCP server with dynamic capabilities
    this.server = new Server(
      {
        name: config.name,
        version: config.version,
      },
      {
        capabilities: serverCapabilities,
      }
    );

    // Initialize resources and prompts
    this.initializeResources();
    this.initializePrompts();

    // Set up request handlers with capability awareness
    this.setupHandlers();
  }

  /**
   * Initialize sample resources
   */
  private initializeResources(): void {
    this.resources.set('config://sample', {
      uri: 'config://sample',
      name: 'Sample Configuration',
      description: 'A sample configuration resource',
      mimeType: 'application/json',
      content: JSON.stringify(
        {
          name: 'Enhanced MCP Server',
          version: this.config.version,
          features: ['tools', 'resources', 'prompts', 'sse', 'capability-negotiation'],
          protocolVersion: this.config.protocolVersion,
          timestamp: new Date().toISOString(),
        },
        null,
        2
      ),
    });

    this.resources.set('text://welcome', {
      uri: 'text://welcome',
      name: 'Welcome Message',
      description: 'A welcome message for users',
      mimeType: 'text/plain',
      content: `Welcome to the Enhanced MCP Server!

This server features:
- Full SSE transport with bidirectional communication
- Dynamic capability negotiation
- Session management
- Complete 2025 MCP specification compliance

Available tools: ${getToolDefinitions().map(t => t.name).join(', ')}`,
    });
  }

  /**
   * Initialize sample prompts
   */
  private initializePrompts(): void {
    this.prompts.set('calculate', {
      name: 'calculate',
      description: 'Template for mathematical calculations',
      template: 'Please calculate: {{expression}}',
      arguments: [
        {
          name: 'expression',
          description: 'The mathematical expression to calculate',
          required: true,
        },
      ],
    });

    this.prompts.set('query', {
      name: 'query',
      description: 'General query template',
      template: `Question: {{question}}

Context: {{context}}

Please provide a detailed answer.`,
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
    });
  }

  /**
   * Set up request handlers with capability awareness
   */
  private setupHandlers(): void {
    // Handle initialization with capability negotiation
    this.server.setRequestHandler(InitializeRequestSchema, async (request, extra) => {
      console.log('🚀 Initializing with capability negotiation...');

      const { protocolVersion, capabilities: clientCapabilities, clientInfo } = request.params;
      const sessionId = extra?.sessionId || 'default';

      // Create session with negotiated capabilities
      const session = this.sessionManager.createSession(
        sessionId,
        clientInfo,
        protocolVersion,
        clientCapabilities || {}
      );

      // Return negotiated capabilities
      const negotiatedCapabilities = this.sessionManager.getSessionCapabilities(sessionId);

      console.log(`✅ Session ${sessionId} initialized with capabilities:`, session.negotiatedCapabilities);

      return {
        protocolVersion: this.config.protocolVersion,
        capabilities: negotiatedCapabilities,
        serverInfo: {
          name: this.config.name,
          version: this.config.version,
        },
      };
    });

    // Handle tool listing (check capability)
    this.server.setRequestHandler(ListToolsRequestSchema, async (_request, extra) => {
      const sessionId = extra?.sessionId || 'default';

      if (!this.sessionManager.hasCapability(sessionId, 'tools')) {
        throw new Error('Tools capability not negotiated for this session');
      }

      console.log('📋 Listing tools...');
      return {
        tools: getToolDefinitions(),
      };
    });

    // Handle tool execution (check capability)
    this.server.setRequestHandler(CallToolRequestSchema, async (request, extra) => {
      const sessionId = extra?.sessionId || 'default';

      if (!this.sessionManager.hasCapability(sessionId, 'tools')) {
        throw new Error('Tools capability not negotiated for this session');
      }

      console.log(`🔧 Calling tool: ${request.params.name}`);

      const { name, arguments: args = {} } = request.params;

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
    });

    // Handle resource listing (check capability)
    this.server.setRequestHandler(ListResourcesRequestSchema, async (_request, extra) => {
      const sessionId = extra?.sessionId || 'default';

      if (!this.sessionManager.hasCapability(sessionId, 'resources')) {
        throw new Error('Resources capability not negotiated for this session');
      }

      console.log('📚 Listing resources...');
      return {
        resources: Array.from(this.resources.values()).map((resource) => ({
          uri: resource.uri,
          name: resource.name,
          description: resource.description,
          mimeType: resource.mimeType,
        })),
      };
    });

    // Handle resource reading (check capability)
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request, extra) => {
      const sessionId = extra?.sessionId || 'default';

      if (!this.sessionManager.hasCapability(sessionId, 'resources')) {
        throw new Error('Resources capability not negotiated for this session');
      }

      console.log(`📖 Reading resource: ${request.params.uri}`);

      const resource = this.resources.get(request.params.uri);

      if (!resource) {
        throw new Error(`Resource not found: ${request.params.uri}`);
      }

      return {
        contents: [
          {
            uri: resource.uri,
            mimeType: resource.mimeType,
            text: resource.content,
          },
        ],
      };
    });

    // Handle prompt listing (check capability)
    this.server.setRequestHandler(ListPromptsRequestSchema, async (_request, extra) => {
      const sessionId = extra?.sessionId || 'default';

      if (!this.sessionManager.hasCapability(sessionId, 'prompts')) {
        throw new Error('Prompts capability not negotiated for this session');
      }

      console.log('💬 Listing prompts...');
      return {
        prompts: Array.from(this.prompts.values()).map((prompt) => ({
          name: prompt.name,
          description: prompt.description,
          arguments: prompt.arguments,
        })),
      };
    });

    // Handle prompt retrieval (check capability)
    this.server.setRequestHandler(GetPromptRequestSchema, async (request, extra) => {
      const sessionId = extra?.sessionId || 'default';

      if (!this.sessionManager.hasCapability(sessionId, 'prompts')) {
        throw new Error('Prompts capability not negotiated for this session');
      }

      console.log(`💬 Getting prompt: ${request.params.name}`);

      const prompt = this.prompts.get(request.params.name);

      if (!prompt) {
        throw new Error(`Prompt not found: ${request.params.name}`);
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
    });
  }

  /**
   * Get the MCP server instance
   */
  getServer(): Server {
    return this.server;
  }

  /**
   * Get the session manager
   */
  getSessionManager(): SessionManager {
    return this.sessionManager;
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    this.sessionManager.clearAllSessions();
  }
}
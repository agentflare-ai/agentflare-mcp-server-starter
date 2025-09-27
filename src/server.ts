/**
 * MCP Server implementation
 *
 * This file contains the core MCP server logic that handles
 * protocol messages and manages tools, resources, and prompts.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
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

/**
 * Basic MCP Server class
 *
 * This server implements the MCP protocol and exposes tools,
 * resources, and prompts to connected clients.
 */
export class BasicMCPServer {
  private server: Server;
  private config: ServerConfig;
  private resources: Map<string, Resource>;
  private prompts: Map<string, PromptTemplate>;

  constructor(config: ServerConfig) {
    this.config = config;
    this.resources = new Map();
    this.prompts = new Map();

    // Initialize the MCP server
    this.server = new Server(
      {
        name: config.name,
        version: config.version,
      },
      {
        capabilities: {
          tools: {},
          resources: {},
          prompts: {},
        },
      }
    );

    // Initialize resources and prompts
    this.initializeResources();
    this.initializePrompts();

    // Set up request handlers
    this.setupHandlers();
  }

  /**
   * Initialize sample resources
   *
   * Resources are data that can be accessed by clients.
   * In a real server, these might be files, database entries, etc.
   */
  private initializeResources(): void {
    // Add a sample configuration resource
    this.resources.set('config://sample', {
      uri: 'config://sample',
      name: 'Sample Configuration',
      description: 'A sample configuration resource',
      mimeType: 'application/json',
      content: JSON.stringify(
        {
          name: 'Basic MCP Server',
          version: this.config.version,
          features: ['tools', 'resources', 'prompts'],
          timestamp: new Date().toISOString(),
        },
        null,
        2
      ),
    });

    // Add a sample text resource
    this.resources.set('text://welcome', {
      uri: 'text://welcome',
      name: 'Welcome Message',
      description: 'A welcome message for users',
      mimeType: 'text/plain',
      content: `Welcome to the Basic MCP Server!

This server demonstrates the core features of the Model Context Protocol:

1. Tools - Functions that can be called to perform actions
2. Resources - Data that can be accessed by clients
3. Prompts - Templates for generating structured inputs

Available tools: ${getToolDefinitions().map(t => t.name).join(', ')}

This is a simple example server designed for learning and testing.`,
    });
  }

  /**
   * Initialize sample prompts
   *
   * Prompts are templates that help structure interactions.
   */
  private initializePrompts(): void {
    // Add a calculation prompt
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

    // Add a general query prompt
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
   * Set up request handlers for MCP protocol methods
   */
  private setupHandlers(): void {
    // Handle tool listing
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      console.log('📋 Listing tools...');
      return {
        tools: getToolDefinitions(),
      };
    });

    // Handle tool execution
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      console.log(`🔧 Calling tool: ${request.params.name}`);

      const { name, arguments: args = {} } = request.params;

      try {
        let result;

        // Route to the appropriate tool
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
            result = await stringTool(
              args.text as string,
              args.operation as any
            );
            break;

          default:
            throw new Error(`Unknown tool: ${name}`);
        }

        // Return the result in MCP format
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

    // Handle resource listing
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
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

    // Handle resource reading
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
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

    // Handle prompt listing
    this.server.setRequestHandler(ListPromptsRequestSchema, async () => {
      console.log('💬 Listing prompts...');
      return {
        prompts: Array.from(this.prompts.values()).map((prompt) => ({
          name: prompt.name,
          description: prompt.description,
          arguments: prompt.arguments,
        })),
      };
    });

    // Handle prompt retrieval
    this.server.setRequestHandler(GetPromptRequestSchema, async (request) => {
      console.log(`💬 Getting prompt: ${request.params.name}`);

      const prompt = this.prompts.get(request.params.name);

      if (!prompt) {
        throw new Error(`Prompt not found: ${request.params.name}`);
      }

      // Process arguments if provided
      let processedTemplate = prompt.template;
      if (request.params.arguments) {
        for (const [key, value] of Object.entries(request.params.arguments)) {
          processedTemplate = processedTemplate.replace(
            `{{${key}}}`,
            String(value)
          );
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
   * Start the server with the specified transport
   */
  async start(): Promise<void> {
    console.log(`🚀 Starting ${this.config.name} v${this.config.version}`);
    console.log(`   Protocol: ${this.config.protocolVersion}`);
    console.log(`   Transport: ${this.config.transport.type}`);

    if (this.config.transport.type === 'stdio') {
      // Use stdio transport
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      console.log('✅ MCP server running on stdio transport');
    } else if (this.config.transport.type === 'http') {
      // HTTP transport would be implemented here
      // For this example, we'll focus on stdio
      console.log('⚠️  HTTP transport is demonstrated separately');
    }

    // Log available capabilities
    console.log('\n📦 Available capabilities:');
    console.log(`   Tools: ${getToolDefinitions().length}`);
    console.log(`   Resources: ${this.resources.size}`);
    console.log(`   Prompts: ${this.prompts.size}`);
  }

  /**
   * Get server instance for testing
   */
  getServer(): Server {
    return this.server;
  }
}
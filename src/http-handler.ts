/**
 * HTTP Handler for MCP Server
 * Implements full JSON-RPC 2.0 compliance with proper method routing
 */

import { Request, Response } from 'express';
import {
  getToolDefinitions,
  echoTool,
  calculatorTool,
  timestampTool,
  randomNumberTool,
  stringTool,
} from './tools.js';
import { ServerConfig } from './types.js';

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

export class MCPHttpHandler {
  private config: ServerConfig;
  private resources: Map<string, any>;
  private prompts: Map<string, any>;

  constructor(config: ServerConfig) {
    this.config = config;
    this.resources = new Map();
    this.prompts = new Map();
    this.initializeResources();
    this.initializePrompts();
  }

  private initializeResources(): void {
    this.resources.set('config://sample', {
      uri: 'config://sample',
      name: 'Sample Configuration',
      description: 'A sample configuration resource',
      mimeType: 'application/json',
      content: JSON.stringify({
        name: 'Basic MCP Server',
        version: this.config.version,
        features: ['tools', 'resources', 'prompts'],
        timestamp: new Date().toISOString(),
      }, null, 2),
    });

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

Available tools: ${getToolDefinitions().map(t => t.name).join(', ')}`,
    });
  }

  private initializePrompts(): void {
    this.prompts.set('calculate', {
      name: 'calculate',
      description: 'Template for mathematical calculations',
      template: 'Please calculate: {{expression}}',
      arguments: [{
        name: 'expression',
        description: 'The mathematical expression to calculate',
        required: true,
      }],
    });

    this.prompts.set('query', {
      name: 'query',
      description: 'General query template',
      template: `Question: {{question}}\n\nContext: {{context}}\n\nPlease provide a detailed answer.`,
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
      switch (request.method) {
        case 'initialize':
          await this.handleInitialize(res, request);
          break;

        case 'tools/list':
          await this.handleToolsList(res, request);
          break;

        case 'tools/call':
          await this.handleToolCall(res, request);
          break;

        case 'resources/list':
          await this.handleResourcesList(res, request);
          break;

        case 'resources/read':
          await this.handleResourceRead(res, request);
          break;

        case 'prompts/list':
          await this.handlePromptsList(res, request);
          break;

        case 'prompts/get':
          await this.handlePromptGet(res, request);
          break;

        default:
          this.sendError(res, request.id, ErrorCodes.METHOD_NOT_FOUND, `Method not found: ${request.method}`);
      }
    } catch (error) {
      console.error(`❌ Error handling request: ${error}`);
      this.sendError(res, null, ErrorCodes.INTERNAL_ERROR, 'Internal server error');
    }
  }

  private async handleInitialize(res: Response, request: JsonRpcRequest): Promise<void> {
    this.sendResult(res, request.id, {
      protocolVersion: this.config.protocolVersion,
      capabilities: {
        tools: {},
        resources: {},
        prompts: {},
      },
      serverInfo: {
        name: this.config.name,
        version: this.config.version,
      },
    });
  }

  private async handleToolsList(res: Response, request: JsonRpcRequest): Promise<void> {
    this.sendResult(res, request.id, {
      tools: getToolDefinitions(),
    });
  }

  private async handleToolCall(res: Response, request: JsonRpcRequest): Promise<void> {
    if (!request.params || !request.params.name) {
      this.sendError(res, request.id, ErrorCodes.INVALID_PARAMS, 'Tool name is required');
      return;
    }

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
          result = await randomNumberTool(args.min as number, args.max as number, args.isInteger as boolean);
          break;
        case 'string_manipulation':
          result = await stringTool(args.text as string, args.operation as any);
          break;
        default:
          this.sendError(res, request.id, ErrorCodes.INVALID_PARAMS, `Unknown tool: ${name}`);
          return;
      }

      this.sendResult(res, request.id, {
        content: [{
          type: 'text',
          text: result.success ? result.content! : result.error!,
        }],
      });
    } catch (error) {
      this.sendError(res, request.id, ErrorCodes.INTERNAL_ERROR, `Tool execution error: ${error}`);
    }
  }

  private async handleResourcesList(res: Response, request: JsonRpcRequest): Promise<void> {
    const resources = Array.from(this.resources.values()).map(resource => ({
      uri: resource.uri,
      name: resource.name,
      description: resource.description,
      mimeType: resource.mimeType,
    }));

    this.sendResult(res, request.id, { resources });
  }

  private async handleResourceRead(res: Response, request: JsonRpcRequest): Promise<void> {
    if (!request.params || !request.params.uri) {
      this.sendError(res, request.id, ErrorCodes.INVALID_PARAMS, 'Resource URI is required');
      return;
    }

    const resource = this.resources.get(request.params.uri);

    if (!resource) {
      this.sendError(res, request.id, ErrorCodes.INVALID_PARAMS, `Resource not found: ${request.params.uri}`);
      return;
    }

    this.sendResult(res, request.id, {
      contents: [{
        uri: resource.uri,
        mimeType: resource.mimeType,
        text: resource.content,
      }],
    });
  }

  private async handlePromptsList(res: Response, request: JsonRpcRequest): Promise<void> {
    const prompts = Array.from(this.prompts.values()).map(prompt => ({
      name: prompt.name,
      description: prompt.description,
      arguments: prompt.arguments,
    }));

    this.sendResult(res, request.id, { prompts });
  }

  private async handlePromptGet(res: Response, request: JsonRpcRequest): Promise<void> {
    if (!request.params || !request.params.name) {
      this.sendError(res, request.id, ErrorCodes.INVALID_PARAMS, 'Prompt name is required');
      return;
    }

    const prompt = this.prompts.get(request.params.name);

    if (!prompt) {
      this.sendError(res, request.id, ErrorCodes.INVALID_PARAMS, `Prompt not found: ${request.params.name}`);
      return;
    }

    let processedTemplate = prompt.template;
    if (request.params.arguments) {
      for (const [key, value] of Object.entries(request.params.arguments)) {
        processedTemplate = processedTemplate.replace(`{{${key}}}`, String(value));
      }
    }

    this.sendResult(res, request.id, {
      messages: [{
        role: 'user',
        content: {
          type: 'text',
          text: processedTemplate,
        },
      }],
    });
  }

  private sendResult(res: Response, id: string | number | null, result: any): void {
    const response: JsonRpcResponse = {
      jsonrpc: '2.0',
      id,
      result,
    };
    res.json(response);
  }

  private sendError(res: Response, id: string | number | null, code: number, message: string, data?: any): void {
    const response: JsonRpcResponse = {
      jsonrpc: '2.0',
      id,
      error: {
        code,
        message,
        data,
      },
    };
    res.status(code === ErrorCodes.INTERNAL_ERROR ? 500 : 400).json(response);
  }
}
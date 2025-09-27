/**
 * Example MCP Client in TypeScript
 *
 * This demonstrates how to connect to an MCP server and use its capabilities.
 * Run with: npx tsx examples/client.ts
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn } from 'child_process';

/**
 * Simple MCP client for testing the server
 */
class TestMCPClient {
  private client: Client;

  constructor() {
    this.client = new Client(
      {
        name: 'test-client',
        version: '1.0.0',
      },
      {
        capabilities: {
          // Client capabilities
        },
      }
    );
  }

  /**
   * Connect to MCP server via stdio
   */
  async connectStdio(command: string, args: string[] = []): Promise<void> {
    console.log('🔌 Connecting to MCP server via stdio...');

    const transport = new StdioClientTransport({
      command,
      args,
    });

    await this.client.connect(transport);
    console.log('✅ Connected successfully!');
  }

  /**
   * List available tools
   */
  async listTools(): Promise<void> {
    console.log('\n📋 Listing available tools...');

    const response = await this.client.listTools();
    console.log(`Found ${response.tools.length} tools:`);

    for (const tool of response.tools) {
      console.log(`  • ${tool.name}: ${tool.description}`);
      if (tool.inputSchema) {
        const props = (tool.inputSchema as any).properties;
        if (props) {
          console.log(`    Parameters: ${Object.keys(props).join(', ')}`);
        }
      }
    }
  }

  /**
   * Call a tool
   */
  async callTool(name: string, args: Record<string, any>): Promise<void> {
    console.log(`\n🔧 Calling tool: ${name}`);
    console.log(`   Arguments: ${JSON.stringify(args)}`);

    const response = await this.client.callTool({
      name,
      arguments: args,
    });

    console.log('   Response:');
    for (const content of response.content) {
      if (content.type === 'text') {
        console.log(`   ${content.text}`);
      }
    }
  }

  /**
   * List available resources
   */
  async listResources(): Promise<void> {
    console.log('\n📚 Listing available resources...');

    const response = await this.client.listResources();
    console.log(`Found ${response.resources.length} resources:`);

    for (const resource of response.resources) {
      console.log(`  • ${resource.uri}: ${resource.name}`);
      if (resource.description) {
        console.log(`    ${resource.description}`);
      }
    }
  }

  /**
   * Read a resource
   */
  async readResource(uri: string): Promise<void> {
    console.log(`\n📖 Reading resource: ${uri}`);

    const response = await this.client.readResource({ uri });

    for (const content of response.contents) {
      console.log(`   Content (${content.mimeType}):`);
      if (content.text) {
        // Show first few lines
        const lines = content.text.split('\n').slice(0, 5);
        lines.forEach(line => console.log(`   ${line}`));
        if (content.text.split('\n').length > 5) {
          console.log('   ...');
        }
      }
    }
  }

  /**
   * List available prompts
   */
  async listPrompts(): Promise<void> {
    console.log('\n💬 Listing available prompts...');

    const response = await this.client.listPrompts();
    console.log(`Found ${response.prompts.length} prompts:`);

    for (const prompt of response.prompts) {
      console.log(`  • ${prompt.name}: ${prompt.description}`);
      if (prompt.arguments) {
        console.log(`    Arguments: ${prompt.arguments.map(a => a.name).join(', ')}`);
      }
    }
  }

  /**
   * Get a prompt
   */
  async getPrompt(name: string, args?: Record<string, any>): Promise<void> {
    console.log(`\n💬 Getting prompt: ${name}`);

    if (args) {
      console.log(`   Arguments: ${JSON.stringify(args)}`);
    }

    const response = await this.client.getPrompt({
      name,
      arguments: args,
    });

    console.log('   Generated prompt:');
    for (const message of response.messages) {
      console.log(`   [${message.role}]: ${message.content.text}`);
    }
  }

  /**
   * Close the connection
   */
  async close(): Promise<void> {
    await this.client.close();
    console.log('\n👋 Connection closed');
  }
}

/**
 * Main test function
 */
async function main(): Promise<void> {
  console.log('🧪 MCP Client Test');
  console.log('==================\n');

  const client = new TestMCPClient();

  try {
    // Connect to the server
    // Adjust the path to your server
    await client.connectStdio('node', ['../dist/index.js']);

    // Test all capabilities
    await client.listTools();
    await client.listResources();
    await client.listPrompts();

    // Test tool calls
    console.log('\n' + '='.repeat(50));
    console.log('🎯 Testing Tool Calls');
    console.log('='.repeat(50));

    await client.callTool('echo', {
      message: 'Hello from TypeScript client!',
    });

    await client.callTool('calculate', {
      expression: '(100 + 50) * 2',
    });

    await client.callTool('get_timestamp', {
      format: 'iso',
    });

    await client.callTool('random_number', {
      min: 1,
      max: 100,
      isInteger: true,
    });

    await client.callTool('string_manipulation', {
      text: 'Hello World',
      operation: 'reverse',
    });

    // Test resource access
    console.log('\n' + '='.repeat(50));
    console.log('🎯 Testing Resource Access');
    console.log('='.repeat(50));

    await client.readResource('config://sample');
    await client.readResource('text://welcome');

    // Test prompts
    console.log('\n' + '='.repeat(50));
    console.log('🎯 Testing Prompts');
    console.log('='.repeat(50));

    await client.getPrompt('calculate', {
      expression: '42 * 10',
    });

    await client.getPrompt('query', {
      question: 'What is MCP?',
      context: 'Model Context Protocol for AI',
    });

    // Close connection
    await client.close();

    console.log('\n✅ All tests completed successfully!');
  } catch (error) {
    console.error(`\n❌ Error: ${error}`);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  main().catch(console.error);
}
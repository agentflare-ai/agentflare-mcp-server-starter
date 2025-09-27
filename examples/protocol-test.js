#!/usr/bin/env node
/**
 * Comprehensive MCP Server Test
 */

import { spawn } from 'child_process';

class MCPTester {
  constructor() {
    this.server = null;
    this.messageId = 0;
    this.responseBuffer = '';
    this.results = {
      passed: [],
      failed: []
    };
  }

  async start() {
    return new Promise((resolve, reject) => {
      this.server = spawn('node', ['dist/index.js', '--transport', 'stdio']);

      this.server.stdout.on('data', (data) => {
        this.responseBuffer += data.toString();
        this.processResponses();
      });

      this.server.stderr.on('data', (data) => {
        console.error('Server error:', data.toString());
      });

      this.server.on('error', (err) => {
        reject(err);
      });

      setTimeout(resolve, 1000);
    });
  }

  processResponses() {
    const lines = this.responseBuffer.split('\n');
    for (let i = 0; i < lines.length - 1; i++) {
      const line = lines[i].trim();
      if (line) {
        try {
          const message = JSON.parse(line);
          this.handleResponse(message);
        } catch (e) {
          // Not a complete JSON message
        }
      }
    }
    this.responseBuffer = lines[lines.length - 1];
  }

  handleResponse(message) {
    if (message.error) {
      console.log(`❌ Error response for request ${message.id}: ${message.error.message}`);
      this.results.failed.push(`Request ${message.id}: ${message.error.message}`);
    } else if (message.result) {
      console.log(`✅ Success response for request ${message.id}`);
      this.results.passed.push(`Request ${message.id}`);
    }
  }

  async sendRequest(method, params = {}) {
    this.messageId++;
    const request = {
      jsonrpc: '2.0',
      id: this.messageId,
      method,
      params
    };

    console.log(`\n📤 Sending ${method} (id: ${this.messageId})`);
    this.server.stdin.write(JSON.stringify(request) + '\n');

    // Wait for response
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  async runTests() {
    console.log('🧪 Starting Comprehensive MCP Server Tests\n');
    console.log('=' .repeat(50));

    // Test 1: Initialize
    await this.sendRequest('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'test-client', version: '1.0.0' }
    });

    // Test 2: List tools
    await this.sendRequest('tools/list');

    // Test 3: Test all tools
    console.log('\n📦 Testing Tools');
    console.log('-' .repeat(30));

    // Echo tool
    await this.sendRequest('tools/call', {
      name: 'echo',
      arguments: { message: 'Test message' }
    });

    // Calculator tool
    await this.sendRequest('tools/call', {
      name: 'calculate',
      arguments: { expression: '(10 + 5) * 3' }
    });

    // Timestamp tool
    await this.sendRequest('tools/call', {
      name: 'get_timestamp',
      arguments: { format: 'iso' }
    });

    await this.sendRequest('tools/call', {
      name: 'get_timestamp',
      arguments: { format: 'unix' }
    });

    // Random number tool
    await this.sendRequest('tools/call', {
      name: 'random_number',
      arguments: { min: 1, max: 100, isInteger: true }
    });

    // String manipulation tool
    await this.sendRequest('tools/call', {
      name: 'string_manipulation',
      arguments: { text: 'Hello World', operation: 'uppercase' }
    });

    await this.sendRequest('tools/call', {
      name: 'string_manipulation',
      arguments: { text: 'Hello World', operation: 'reverse' }
    });

    await this.sendRequest('tools/call', {
      name: 'string_manipulation',
      arguments: { text: 'Hello World', operation: 'length' }
    });

    // Test 4: Resources
    console.log('\n📚 Testing Resources');
    console.log('-' .repeat(30));

    await this.sendRequest('resources/list');

    await this.sendRequest('resources/read', {
      uri: 'config://sample'
    });

    await this.sendRequest('resources/read', {
      uri: 'text://welcome'
    });

    // Test 5: Prompts
    console.log('\n💬 Testing Prompts');
    console.log('-' .repeat(30));

    await this.sendRequest('prompts/list');

    await this.sendRequest('prompts/get', {
      name: 'calculate',
      arguments: { expression: '42 * 10' }
    });

    await this.sendRequest('prompts/get', {
      name: 'query',
      arguments: {
        question: 'What is MCP?',
        context: 'Model Context Protocol'
      }
    });

    // Test 6: Error handling
    console.log('\n⚠️  Testing Error Handling');
    console.log('-' .repeat(30));

    // Non-existent tool
    await this.sendRequest('tools/call', {
      name: 'non_existent_tool',
      arguments: {}
    });

    // Invalid parameters
    await this.sendRequest('tools/call', {
      name: 'echo'
      // Missing required 'message' argument
    });

    // Non-existent resource
    await this.sendRequest('resources/read', {
      uri: 'invalid://resource'
    });

    // Non-existent prompt
    await this.sendRequest('prompts/get', {
      name: 'non_existent_prompt'
    });

    // Invalid method
    await this.sendRequest('invalid/method');
  }

  printSummary() {
    console.log('\n' + '=' .repeat(50));
    console.log('📊 Test Summary');
    console.log('=' .repeat(50));
    console.log(`✅ Passed: ${this.results.passed.length}`);
    console.log(`❌ Failed: ${this.results.failed.length}`);

    if (this.results.failed.length > 0) {
      console.log('\nFailed tests:');
      this.results.failed.forEach(test => console.log(`  - ${test}`));
    }

    const totalTests = this.results.passed.length + this.results.failed.length;
    const passRate = ((this.results.passed.length / totalTests) * 100).toFixed(1);
    console.log(`\n📈 Pass rate: ${passRate}%`);
  }

  async cleanup() {
    if (this.server) {
      this.server.kill();
    }
  }
}

async function main() {
  const tester = new MCPTester();

  try {
    await tester.start();
    await tester.runTests();

    // Wait for all responses
    await new Promise(resolve => setTimeout(resolve, 2000));

    tester.printSummary();
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await tester.cleanup();
  }
}

main().catch(console.error);
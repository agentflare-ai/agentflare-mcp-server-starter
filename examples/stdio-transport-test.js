#!/usr/bin/env node
/**
 * Test script for stdio transport
 */

import { spawn } from 'child_process';

const server = spawn('node', ['dist/index.js', '--transport', 'stdio']);

let responseBuffer = '';

server.stdout.on('data', (data) => {
  responseBuffer += data.toString();

  // Try to parse complete JSON-RPC messages
  const lines = responseBuffer.split('\n');
  for (let i = 0; i < lines.length - 1; i++) {
    const line = lines[i].trim();
    if (line) {
      try {
        const message = JSON.parse(line);
        console.log('Response:', JSON.stringify(message, null, 2));
      } catch (e) {
        // Not a complete JSON message yet
      }
    }
  }
  responseBuffer = lines[lines.length - 1];
});

server.stderr.on('data', (data) => {
  console.error('Server stderr:', data.toString());
});

server.on('error', (err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

// Send initialize request
setTimeout(() => {
  const initRequest = {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: {
        name: 'test-client',
        version: '1.0.0'
      }
    }
  };

  console.log('Sending initialize request...');
  server.stdin.write(JSON.stringify(initRequest) + '\n');
}, 1000);

// Send tools/list request
setTimeout(() => {
  const toolsRequest = {
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/list',
    params: {}
  };

  console.log('\nSending tools/list request...');
  server.stdin.write(JSON.stringify(toolsRequest) + '\n');
}, 2000);

// Send tool call request
setTimeout(() => {
  const callRequest = {
    jsonrpc: '2.0',
    id: 3,
    method: 'tools/call',
    params: {
      name: 'echo',
      arguments: {
        message: 'Hello from stdio test!'
      }
    }
  };

  console.log('\nSending tools/call request...');
  server.stdin.write(JSON.stringify(callRequest) + '\n');
}, 3000);

// Clean exit
setTimeout(() => {
  console.log('\nTest complete, closing...');
  server.kill();
  process.exit(0);
}, 5000);
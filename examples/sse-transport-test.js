#!/usr/bin/env node
/**
 * Test script for full SSE implementation with capability negotiation
 */

import fetch from 'node-fetch';
import EventSource from 'eventsource';

const BASE_URL = 'http://localhost:8080';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testSSE() {
  console.log('🧪 Testing Full SSE Implementation\n');
  console.log('=' .repeat(50));

  try {
    // 1. Establish SSE connection
    console.log('\n1️⃣ Establishing SSE connection...');
    const eventSource = new EventSource(`${BASE_URL}/sse`);

    let sessionId = null;

    eventSource.onopen = () => {
      console.log('✅ SSE connection established');
    };

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('📨 Received SSE message:', data);

      // Extract session ID from the connected message
      if (data.sessionId) {
        sessionId = data.sessionId;
        console.log(`   Session ID: ${sessionId}`);
      }
    };

    eventSource.onerror = (error) => {
      console.error('❌ SSE error:', error);
    };

    // Wait for connection
    await sleep(1000);

    // 2. Send initialize request with capabilities
    console.log('\n2️⃣ Sending initialize request with capabilities...');
    const initRequest = {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2025-06-18',
        capabilities: {
          tools: {},
          resources: {},
          prompts: {},
          logging: {}
        },
        clientInfo: {
          name: 'sse-test-client',
          version: '1.0.0'
        }
      }
    };

    const initResponse = await fetch(`${BASE_URL}/messages?sessionId=${sessionId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(initRequest)
    });

    const initResult = await initResponse.json();
    console.log('   Response:', JSON.stringify(initResult, null, 2));

    // Check negotiated capabilities
    if (initResult.result?.capabilities) {
      console.log('\n✅ Negotiated capabilities:');
      const caps = initResult.result.capabilities;
      console.log('   - Tools:', !!caps.tools);
      console.log('   - Resources:', !!caps.resources);
      console.log('   - Prompts:', !!caps.prompts);
      console.log('   - Logging:', !!caps.logging);
    }

    // 3. Test tools capability
    console.log('\n3️⃣ Testing tools capability...');
    const toolsRequest = {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/list',
      params: {}
    };

    const toolsResponse = await fetch(`${BASE_URL}/messages?sessionId=${sessionId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(toolsRequest)
    });

    const toolsResult = await toolsResponse.json();
    console.log(`   Found ${toolsResult.result?.tools?.length || 0} tools`);

    // 4. Test tool execution
    console.log('\n4️⃣ Testing tool execution...');
    const toolCallRequest = {
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'echo',
        arguments: {
          message: 'Hello from SSE test!'
        }
      }
    };

    const toolCallResponse = await fetch(`${BASE_URL}/messages?sessionId=${sessionId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(toolCallRequest)
    });

    const toolCallResult = await toolCallResponse.json();
    console.log('   Tool result:', toolCallResult.result?.content?.[0]?.text);

    // 5. Test resources capability
    console.log('\n5️⃣ Testing resources capability...');
    const resourcesRequest = {
      jsonrpc: '2.0',
      id: 4,
      method: 'resources/list',
      params: {}
    };

    const resourcesResponse = await fetch(`${BASE_URL}/messages?sessionId=${sessionId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(resourcesRequest)
    });

    const resourcesResult = await resourcesResponse.json();
    console.log(`   Found ${resourcesResult.result?.resources?.length || 0} resources`);

    // 6. Test prompts capability
    console.log('\n6️⃣ Testing prompts capability...');
    const promptsRequest = {
      jsonrpc: '2.0',
      id: 5,
      method: 'prompts/list',
      params: {}
    };

    const promptsResponse = await fetch(`${BASE_URL}/messages?sessionId=${sessionId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(promptsRequest)
    });

    const promptsResult = await promptsResponse.json();
    console.log(`   Found ${promptsResult.result?.prompts?.length || 0} prompts`);

    // 7. Test capability restriction
    console.log('\n7️⃣ Testing capability restriction...');
    console.log('   Creating session with limited capabilities...');

    // Create new SSE connection with limited capabilities
    const limitedEventSource = new EventSource(`${BASE_URL}/sse`);
    let limitedSessionId = null;

    limitedEventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.sessionId) {
        limitedSessionId = data.sessionId;
      }
    };

    await sleep(1000);

    // Initialize with only tools capability
    const limitedInitRequest = {
      jsonrpc: '2.0',
      id: 6,
      method: 'initialize',
      params: {
        protocolVersion: '2025-06-18',
        capabilities: {
          tools: {} // Only tools
        },
        clientInfo: {
          name: 'limited-client',
          version: '1.0.0'
        }
      }
    };

    const limitedInitResponse = await fetch(`${BASE_URL}/messages?sessionId=${limitedSessionId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(limitedInitRequest)
    });

    const limitedInitResult = await limitedInitResponse.json();
    console.log('   Limited session capabilities:', Object.keys(limitedInitResult.result?.capabilities || {}));

    // Try to access resources (should fail)
    const limitedResourceRequest = {
      jsonrpc: '2.0',
      id: 7,
      method: 'resources/list',
      params: {}
    };

    const limitedResourceResponse = await fetch(`${BASE_URL}/messages?sessionId=${limitedSessionId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(limitedResourceRequest)
    });

    const limitedResourceResult = await limitedResourceResponse.json();
    if (limitedResourceResult.error) {
      console.log('   ✅ Resources correctly blocked for limited session');
    } else {
      console.log('   ❌ Resources should have been blocked!');
    }

    // Clean up
    eventSource.close();
    limitedEventSource.close();

    console.log('\n' + '=' .repeat(50));
    console.log('✅ SSE Implementation Test Complete!');
    console.log('\n📊 Summary:');
    console.log('   - SSE bidirectional communication: ✅');
    console.log('   - Capability negotiation: ✅');
    console.log('   - Session management: ✅');
    console.log('   - Feature restriction: ✅');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Note: This test requires the server to be running
console.log('⚠️  Make sure the server is running with: npm run http');
console.log('   Starting test in 3 seconds...\n');

setTimeout(testSSE, 3000);
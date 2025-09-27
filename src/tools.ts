/**
 * Tool implementations for the MCP server.
 *
 * This file contains simple tool implementations that demonstrate
 * the basic capabilities of an MCP server.
 */

import { ToolResult } from './types.js';

/**
 * Echo tool - returns the input message
 *
 * This is the simplest possible tool, useful for testing connectivity
 * and understanding how tools work.
 *
 * @param message - The message to echo back
 * @returns The echoed message
 */
export async function echoTool(message: string): Promise<ToolResult> {
  try {
    // Validate input
    if (!message) {
      return {
        success: false,
        error: 'Message is required',
      };
    }

    // Echo the message back
    return {
      success: true,
      content: `Echo: ${message}`,
      metadata: {
        originalLength: message.length,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `Echo tool error: ${error}`,
    };
  }
}

/**
 * Calculator tool - evaluates mathematical expressions
 *
 * This tool safely evaluates mathematical expressions using a limited
 * set of operations to prevent code injection.
 *
 * @param expression - Mathematical expression to evaluate
 * @returns The calculation result
 */
export async function calculatorTool(expression: string): Promise<ToolResult> {
  try {
    // Validate input
    if (!expression) {
      return {
        success: false,
        error: 'Expression is required',
      };
    }

    // Remove whitespace
    const cleanExpression = expression.replace(/\s/g, '');

    // Validate expression contains only safe characters
    // Allow numbers, operators, parentheses, and decimal points
    const safePattern = /^[0-9+\-*/().\s]+$/;
    if (!safePattern.test(cleanExpression)) {
      return {
        success: false,
        error: 'Expression contains invalid characters',
      };
    }

    // Evaluate the expression
    // Note: In production, use a proper math library instead of eval
    try {
      // Create a limited scope for evaluation
      const result = Function('"use strict"; return (' + cleanExpression + ')')();

      return {
        success: true,
        content: `${expression} = ${result}`,
        metadata: {
          expression,
          result,
          type: typeof result,
        },
      };
    } catch (evalError) {
      return {
        success: false,
        error: `Invalid expression: ${evalError}`,
      };
    }
  } catch (error) {
    return {
      success: false,
      error: `Calculator tool error: ${error}`,
    };
  }
}

/**
 * Timestamp tool - returns the current timestamp
 *
 * This tool provides the current time in various formats,
 * demonstrating a tool that doesn't require input.
 *
 * @param format - Optional format (iso, unix, locale)
 * @returns The current timestamp
 */
export async function timestampTool(format?: string): Promise<ToolResult> {
  try {
    const now = new Date();
    let formattedTime: string;

    // Format the timestamp based on the requested format
    switch (format?.toLowerCase()) {
      case 'unix':
        formattedTime = Math.floor(now.getTime() / 1000).toString();
        break;

      case 'locale':
        formattedTime = now.toLocaleString();
        break;

      case 'iso':
      default:
        formattedTime = now.toISOString();
        break;
    }

    return {
      success: true,
      content: formattedTime,
      metadata: {
        format: format || 'iso',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        timestamp: now.getTime(),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `Timestamp tool error: ${error}`,
    };
  }
}

/**
 * Random number tool - generates random numbers
 *
 * This tool demonstrates parameter validation and range handling.
 *
 * @param min - Minimum value (inclusive)
 * @param max - Maximum value (inclusive)
 * @param isInteger - Whether to return an integer
 * @returns A random number
 */
export async function randomNumberTool(
  min: number = 0,
  max: number = 100,
  isInteger: boolean = true
): Promise<ToolResult> {
  try {
    // Validate range
    if (min > max) {
      return {
        success: false,
        error: 'Minimum value cannot be greater than maximum value',
      };
    }

    // Generate random number
    let randomNum = Math.random() * (max - min) + min;

    if (isInteger) {
      randomNum = Math.floor(randomNum);
    }

    return {
      success: true,
      content: randomNum.toString(),
      metadata: {
        min,
        max,
        isInteger,
        value: randomNum,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `Random number tool error: ${error}`,
    };
  }
}

/**
 * String manipulation tool - performs string operations
 *
 * This tool demonstrates handling multiple operations with a single tool.
 *
 * @param text - The text to manipulate
 * @param operation - The operation to perform
 * @returns The manipulated string
 */
export async function stringTool(
  text: string,
  operation: 'uppercase' | 'lowercase' | 'reverse' | 'length' | 'words'
): Promise<ToolResult> {
  try {
    if (!text) {
      return {
        success: false,
        error: 'Text is required',
      };
    }

    let result: string;

    switch (operation) {
      case 'uppercase':
        result = text.toUpperCase();
        break;

      case 'lowercase':
        result = text.toLowerCase();
        break;

      case 'reverse':
        result = text.split('').reverse().join('');
        break;

      case 'length':
        result = text.length.toString();
        break;

      case 'words':
        const words = text.trim().split(/\s+/).filter(word => word.length > 0);
        result = `Word count: ${words.length}`;
        break;

      default:
        return {
          success: false,
          error: `Unknown operation: ${operation}`,
        };
    }

    return {
      success: true,
      content: result,
      metadata: {
        originalText: text,
        operation,
        originalLength: text.length,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `String tool error: ${error}`,
    };
  }
}

/**
 * Get all tool definitions for MCP
 *
 * This function returns the tool definitions in the format expected
 * by the MCP protocol.
 */
export function getToolDefinitions() {
  return [
    {
      name: 'echo',
      description: 'Echo back the provided message',
      inputSchema: {
        type: 'object',
        properties: {
          message: {
            type: 'string',
            description: 'The message to echo back',
          },
        },
        required: ['message'],
      },
    },
    {
      name: 'calculate',
      description: 'Perform mathematical calculations',
      inputSchema: {
        type: 'object',
        properties: {
          expression: {
            type: 'string',
            description: 'Mathematical expression to evaluate (e.g., "2 + 2")',
          },
        },
        required: ['expression'],
      },
    },
    {
      name: 'get_timestamp',
      description: 'Get the current timestamp',
      inputSchema: {
        type: 'object',
        properties: {
          format: {
            type: 'string',
            description: 'Format for the timestamp (iso, unix, locale)',
            enum: ['iso', 'unix', 'locale'],
          },
        },
      },
    },
    {
      name: 'random_number',
      description: 'Generate a random number',
      inputSchema: {
        type: 'object',
        properties: {
          min: {
            type: 'number',
            description: 'Minimum value (inclusive)',
            default: 0,
          },
          max: {
            type: 'number',
            description: 'Maximum value (inclusive)',
            default: 100,
          },
          isInteger: {
            type: 'boolean',
            description: 'Whether to return an integer',
            default: true,
          },
        },
      },
    },
    {
      name: 'string_manipulation',
      description: 'Perform string operations',
      inputSchema: {
        type: 'object',
        properties: {
          text: {
            type: 'string',
            description: 'The text to manipulate',
          },
          operation: {
            type: 'string',
            description: 'The operation to perform',
            enum: ['uppercase', 'lowercase', 'reverse', 'length', 'words'],
          },
        },
        required: ['text', 'operation'],
      },
    },
  ];
}
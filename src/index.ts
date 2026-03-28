/**
 * Iris MCP Server - Main Entry Point
 * 
 * Multi-backend MCP gateway providing Google Drive write, Notion, and more
 * through a single MCP connector.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import dotenv from "dotenv";

// Import tool implementations
import { driveTools, handleDriveToolCall } from "./tools/drive-tools.js";

// Load environment variables
dotenv.config();

/**
 * Create and configure the MCP server
 */
const server = new Server(
  {
    name: process.env.MCP_SERVER_NAME || "iris-gateway",
    version: process.env.MCP_SERVER_VERSION || "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

/**
 * Handle tool list requests
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: driveTools,
  };
});

/**
 * Handle tool execution requests
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  try {
    // Route to appropriate tool handler
    if (name.startsWith("iris_drive_")) {
      return await handleDriveToolCall(name, args as any);
    }
    
    // Unknown tool
    throw new Error(`Unknown tool: ${name}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: "text",
          text: `Error executing tool ${name}: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
});

/**
 * Start the server
 */
async function main() {
  console.error("Starting Iris MCP Server...");
  console.error(`Registered ${driveTools.length} Google Drive tools`);
  
  // Create transport
  const transport = new StdioServerTransport();
  
  // Connect server to transport
  await server.connect(transport);
  console.error("Iris MCP Server running on stdio");
}

// Start the server
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

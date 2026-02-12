import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { registerJumpserverDbCredentialsTool } from "./tools/jumpserver-db-credentials/tool.js";

/**
 * 创建并启动 MCP Server。
 * 当前仅注册 JumpServer 数据库凭据工具。
 */
export async function startServer() {
  const server = new McpServer({
    name: "mcp-jumpserver",
    version: "0.1.0",
  });

  registerJumpserverDbCredentialsTool(server);

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

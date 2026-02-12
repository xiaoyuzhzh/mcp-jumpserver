import { z } from "zod";

import { getJumpserverDbCredentials } from "../../jumpserver/service.js";

/**
 * 注册 JumpServer 数据库临时凭据工具。
 */
export function registerJumpserverDbCredentialsTool(server) {
  server.registerTool(
    "get_jumpserver_db_credentials",
    {
      title: "Get JumpServer DB Credentials",
      description:
        "Get temporary database connection credentials by JumpServer database asset name.",
      inputSchema: {
        asset_name: z.string().default("DB-ltc-prod"),
        account: z.string().default("jumpserver_r"),
        org_id: z.string().optional(),
      },
    },
    async ({ asset_name, account, org_id }) => ({
      content: [
        {
          type: "text",
          text: JSON.stringify(
            await getJumpserverDbCredentials({
              assetName: asset_name,
              account,
              orgId: org_id,
            })
          ),
        },
      ],
    })
  );
}

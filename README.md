# mcp-jumpserver

MCP server for getting temporary database credentials from [JumpServer](https://github.com/jumpserver/jumpserver).

## Usage

### Configure MCP

Add to your MCP client configuration (e.g. Claude Desktop `claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "jumpserver": {
      "command": "npx",
      "args": ["-y", "@xiaoyuzhzh/mcp-jumpserver"],
      "env": {
        "JUMPSERVER_ACCESS_KEY_ID": "your-access-key-id",
        "JUMPSERVER_ACCESS_KEY_SECRET": "your-access-key-secret",
        "JUMPSERVER_BASE_URL": "https://jump.example.com",
        "JUMPSERVER_ORG_ID": "your-org-id"
      }
    }
  }
}
```

### Environment Variables

| Variable | Required | Description |
|---|---|---|
| `JUMPSERVER_ACCESS_KEY_ID` | Yes | JumpServer API Access Key ID |
| `JUMPSERVER_ACCESS_KEY_SECRET` | Yes | JumpServer API Access Key Secret |
| `JUMPSERVER_BASE_URL` | Yes | JumpServer base URL (e.g. `https://jump.example.com`) |
| `JUMPSERVER_ORG_ID` | Yes | JumpServer Organization ID |
| `JUMPSERVER_BASE_PATH` | No | API base path (default: `/api/v1`) |

## Tools

### `get_jumpserver_db_credentials`

Get temporary MySQL connection credentials from JumpServer by asset name.

**Input:**

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `asset_name` | string | No | `DB-ltc-prod` | Database asset name in JumpServer |
| `account` | string | No | `jumpserver_r` | Account username |
| `org_id` | string | No | From env | Organization ID |

**Output:**

- `host`, `port`, `username`, `password`, `database`
- `expire_time`, `date_expired`
- `mysql_command`, `jdbc_url`
- `asset_id`, `asset_name`, `org_id`

## License

[MIT](LICENSE)

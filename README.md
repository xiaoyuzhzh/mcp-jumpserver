# mcp-jumpserver

MCP server that exposes one tool:

- `get_jumpserver_db_credentials`: Get temporary MySQL connection credentials from JumpServer by asset name.

## Setup

```bash
npm install
```

## Run

```bash
node src/index.js
```

## Required env

- `JUMPSERVER_ACCESS_KEY_ID`
- `JUMPSERVER_ACCESS_KEY_SECRET`
- `JUMPSERVER_BASE_URL` (example: `https://jump.xxxx.cn`)
- `JUMPSERVER_ORG_ID`

## Optional env

- `JUMPSERVER_BASE_PATH` (default: `/api/v1`)

## Tool: `get_jumpserver_db_credentials`

Input:

- `asset_name` (string, optional, default `DB-ltc-prod`)
- `account` (string, optional, default `jumpserver_r`)
- `org_id` (string, optional)

Output:

- `host`, `port`, `username`, `password`, `database`
- `expire_time`, `date_expired`
- `mysql_command`, `jdbc_url`
- `asset_id`, `asset_name`, `org_id`

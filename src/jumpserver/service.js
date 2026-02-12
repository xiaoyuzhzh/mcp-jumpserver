import crypto from "crypto";

const DEFAULT_ACCOUNT = "jumpserver_r";
const DEFAULT_SEARCH = "DB-ltc-prod";
const DEFAULT_BASE_PATH = "/api/v1";

const DEFAULT_CONNECT_OPTIONS = {
  charset: "default",
  disableautohash: false,
  resolution: "auto",
  backspaceAsCtrlH: false,
  appletConnectMethod: "web",
  reusable: false,
};

function requireJumpserverCredentials() {
  const keyId = process.env.JUMPSERVER_ACCESS_KEY_ID;
  const secret = process.env.JUMPSERVER_ACCESS_KEY_SECRET;
  if (!keyId || !secret) {
    throw new Error(
      "Missing JumpServer API-Key credentials. Set JUMPSERVER_ACCESS_KEY_ID and JUMPSERVER_ACCESS_KEY_SECRET."
    );
  }
  return { keyId, secret };
}

function requireJumpserverEndpointConfig() {
  const baseUrl = process.env.JUMPSERVER_BASE_URL;
  const basePath = process.env.JUMPSERVER_BASE_PATH || DEFAULT_BASE_PATH;

  if (!baseUrl) {
    throw new Error("Missing JumpServer endpoint config. Set JUMPSERVER_BASE_URL.");
  }

  return { baseUrl, basePath };
}

function requireOrgId(orgId) {
  const resolved = orgId || process.env.JUMPSERVER_ORG_ID;
  if (!resolved) {
    throw new Error("Missing organization id. Set JUMPSERVER_ORG_ID.");
  }
  return resolved;
}

function normalizeBasePath(basePath) {
  const value = basePath.trim();
  if (!value) return "";
  return value.startsWith("/") ? value.replace(/\/+$/g, "") : `/${value}`;
}

function normalizeApiPath(path) {
  if (!path) return "/";
  return path.startsWith("/") ? path : `/${path}`;
}

function buildQueryString(params) {
  const entries = [];
  for (const [key, value] of Object.entries(params || {})) {
    if (value === undefined || value === null || value === "") continue;
    entries.push([key, String(value)]);
  }
  entries.sort(([a], [b]) => a.localeCompare(b));
  const search = new URLSearchParams(entries);
  return search.toString();
}

function buildSignedHeaders({ method, pathWithQuery, orgId }) {
  const { keyId, secret } = requireJumpserverCredentials();
  const date = new Date().toUTCString();
  const accept = "application/json";
  const signingString = [
    `(request-target): ${method.toLowerCase()} ${pathWithQuery}`,
    `accept: ${accept}`,
    `date: ${date}`,
  ].join("\n");

  const signature = crypto
    .createHmac("sha256", secret)
    .update(signingString)
    .digest("base64");

  const authorization =
    `Signature keyId="${keyId}",algorithm="hmac-sha256",` +
    `headers="(request-target) accept date",signature="${signature}"`;

  const headers = {
    Accept: accept,
    Date: date,
    Authorization: authorization,
  };

  if (orgId) {
    headers["X-JMS-ORG"] = orgId;
  }

  return headers;
}

async function jumpserverRequest({ method, path, query, body, orgId }) {
  const endpointConfig = requireJumpserverEndpointConfig();
  const baseUrl = endpointConfig.baseUrl;
  const basePath = normalizeBasePath(endpointConfig.basePath);
  const requiredOrgId = requireOrgId(orgId);
  const apiPath = normalizeApiPath(path);
  const queryString = buildQueryString(query);
  const pathWithQuery = `${basePath}${apiPath}${
    queryString ? `?${queryString}` : ""
  }`;
  const url = new URL(pathWithQuery, baseUrl);
  const headers = buildSignedHeaders({
    method,
    pathWithQuery,
    orgId: requiredOrgId,
  });

  let payload;
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  const response = await fetch(url, {
    method,
    headers,
    body: payload,
  });

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const bodyText = typeof data === "string" ? data : JSON.stringify(data);
    throw new Error(`JumpServer API ${response.status}: ${bodyText}`);
  }

  return data;
}

function toArray(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.results)) return data.results;
  return [];
}

function pickDatabaseAsset(assets, search) {
  if (!assets.length) {
    throw new Error(`No database assets found by search: ${search}`);
  }
  const exact = assets.find((item) => String(item?.name || "") === search);
  return exact || assets[0];
}

function safeShellValue(value) {
  const text = String(value ?? "");
  return `'${text.replace(/'/g, `'\\''`)}'`;
}

/**
 * 根据数据库资源名称获取临时连接信息。
 */
export async function getJumpserverDbCredentials({
  assetName = DEFAULT_SEARCH,
  account = DEFAULT_ACCOUNT,
  orgId,
}) {
  const search = String(assetName || "").trim();
  if (!search) {
    throw new Error("asset_name cannot be empty.");
  }

  const assetsData = await jumpserverRequest({
    method: "GET",
    path: "/assets/databases/suggestions/",
    query: { search },
    orgId,
  });
  const assets = toArray(assetsData);
  const selectedAsset = pickDatabaseAsset(assets, search);

  const tokenData = await jumpserverRequest({
    method: "POST",
    path: "/authentication/connection-token/",
    body: {
      asset: selectedAsset.id,
      account,
      protocol: "mysql",
      input_username: account,
      input_secret: "",
      connect_method: "db_guide",
      connect_options: DEFAULT_CONNECT_OPTIONS,
    },
    orgId,
  });

  const endpointData = await jumpserverRequest({
    method: "GET",
    path: "/terminal/endpoints/smart/",
    query: {
      protocol: "mysql",
      token: tokenData.id,
    },
    orgId,
  });

  const host = endpointData.host;
  const port = endpointData.mysql_port;
  const username = tokenData.id;
  const password = tokenData.value;
  const database = selectedAsset.db_name;

  if (!host || !port || !username || !password || !database) {
    throw new Error("Incomplete connection data from JumpServer API response.");
  }

  const mysqlCommand = `mysql -u ${safeShellValue(username)} -p${safeShellValue(
    password
  )} -h ${safeShellValue(host)} -P ${port} ${safeShellValue(database)}`;
  const jdbcUrl = `jdbc:mysql://${host}:${port}/${database}?user=${encodeURIComponent(
    username
  )}&password=${encodeURIComponent(password)}`;

  return {
    host,
    port,
    username,
    password,
    database,
    expire_time: tokenData.expire_time,
    date_expired: tokenData.date_expired,
    mysql_command: mysqlCommand,
    jdbc_url: jdbcUrl,
    asset_id: selectedAsset.id,
    asset_name: selectedAsset.name,
    org_id: tokenData.org_id || selectedAsset.org_id,
  };
}

import createOpenApiClient from "openapi-fetch";
import type { paths } from "./types.generated.js";

const DEFAULT_BASE_URL =
  "https://api.stablebaseline.io/functions/v1/cloud-serve/api/v1";

export interface StableBaselineClientOptions {
  /**
   * MCP API key with the `sta_` prefix. Mint at
   * https://app.stablebaseline.io/settings/mcp-keys.
   *
   * Either `apiKey` or `accessToken` is required (mutually exclusive).
   */
  apiKey?: string;

  /**
   * OAuth 2.1 access token (Bearer) — for clients that authenticate via the
   * OAuth flow at https://app.stablebaseline.io/oauth/authorize.
   */
  accessToken?: string;

  /**
   * Override the API base URL. Default:
   * `https://api.stablebaseline.io/functions/v1/cloud-serve/api/v1`
   */
  baseUrl?: string;

  /**
   * Custom `fetch` implementation. Defaults to `globalThis.fetch`. Useful for
   * testing or when running in a sandboxed runtime.
   */
  fetch?: typeof fetch;

  /**
   * Per-request abort signal — applied to every call made by this client.
   */
  signal?: AbortSignal;
}

export interface ToolError extends Error {
  status: number;
  code: string;
  details?: Record<string, unknown>;
}

function makeAuthHeader(opts: StableBaselineClientOptions): Record<string, string> {
  const token = opts.accessToken ?? opts.apiKey;
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

class StableBaselineToolError extends Error implements ToolError {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "StableBaselineToolError";
  }
}

/**
 * Tool-RPC dispatch. Each method on `client.tools` posts to
 * `POST /tools/{toolName}` with the input as the JSON body and returns the
 * server's parsed JSON response. Errors are thrown as `StableBaselineToolError`.
 */
type ToolPath = keyof paths & `/tools/${string}`;
type ToolName<P extends ToolPath> = P extends `/tools/${infer N}` ? N : never;

type ToolInput<P extends ToolPath> = paths[P] extends {
  post: { requestBody?: { content: { "application/json": infer I } } };
}
  ? I
  : never;

type ToolOutput<P extends ToolPath> = paths[P] extends {
  post: { responses: { 200: { content: { "application/json": infer O } } } };
}
  ? O
  : unknown;

type ToolNames = { [P in ToolPath]: ToolName<P> }[ToolPath];
type ToolDispatchMap = {
  [K in ToolNames]: (input: ToolInput<`/tools/${K}` & ToolPath>) => Promise<ToolOutput<`/tools/${K}` & ToolPath>>;
};

export class StableBaseline {
  private fetch: typeof fetch;
  private baseUrl: string;
  private authHeader: Record<string, string>;
  private signal?: AbortSignal;

  /**
   * Strongly-typed dispatch surface. Every entry is one of the 184 MCP tools.
   *
   *   const orgs = await sb.tools.listOrganisations({});
   *   const doc = await sb.tools.createDocument({ folderId, title, cdmd });
   */
  public tools: ToolDispatchMap;

  constructor(opts: StableBaselineClientOptions = {}) {
    if (!opts.apiKey && !opts.accessToken) {
      throw new Error(
        "StableBaseline: provide either `apiKey` (sta_*) or `accessToken` (OAuth Bearer).",
      );
    }
    this.fetch = opts.fetch ?? globalThis.fetch.bind(globalThis);
    this.baseUrl = (opts.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "");
    this.authHeader = makeAuthHeader(opts);
    this.signal = opts.signal;

    // Build the tool-dispatch surface as a Proxy. Each property access
    // returns a function that POSTs to `/tools/<name>`. This avoids hand-
    // listing 163 methods while keeping full type safety on usage thanks
    // to the generated `paths` type above.
    const self = this;
    this.tools = new Proxy({} as ToolDispatchMap, {
      get(_target, prop: string) {
        if (typeof prop !== "string") return undefined;
        return (input: unknown) => self.callTool(prop, input);
      },
    });
  }

  /** Call a tool by name. Mainly an escape hatch — prefer `client.tools.<toolName>`. */
  async callTool<T = unknown>(name: string, input?: unknown): Promise<T> {
    const url = `${this.baseUrl}/tools/${encodeURIComponent(name)}`;
    const res = await this.fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...this.authHeader },
      body: JSON.stringify(input ?? {}),
      signal: this.signal,
    });

    if (!res.ok) {
      let body: any = null;
      try { body = await res.json(); } catch { /* not JSON */ }
      const errEnvelope = body?.error ?? {};
      throw new StableBaselineToolError(
        res.status,
        errEnvelope.code ?? `http_${res.status}`,
        errEnvelope.message ?? `${res.status} ${res.statusText}`,
        errEnvelope.details,
      );
    }
    return res.json() as Promise<T>;
  }

  /** Fetch the live OpenAPI spec from the server. Useful for code generation. */
  async openapi(): Promise<unknown> {
    const res = await this.fetch(`${this.baseUrl}/openapi.json`, { signal: this.signal });
    if (!res.ok) throw new Error(`Failed to fetch OpenAPI: ${res.status}`);
    return res.json();
  }

  /** Lightweight tool-catalogue discovery without parsing the full OpenAPI doc. */
  async listTools(): Promise<{ count: number; tools: Array<{ name: string; description: string; category: string; anonymous: boolean; feature: string | null }> }> {
    const res = await this.fetch(`${this.baseUrl}/tools`, { signal: this.signal });
    if (!res.ok) throw new Error(`Failed to list tools: ${res.status}`);
    return res.json();
  }
}

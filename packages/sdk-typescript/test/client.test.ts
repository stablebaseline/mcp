// Unit tests for the TypeScript SDK. Mocks fetch to verify dispatch logic
// without hitting the live API.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { StableBaseline, type ToolError } from "../src/index.js";

function mockFetch(impl: (url: string, init: RequestInit) => Response | Promise<Response>) {
  return vi.fn(async (url: string, init: RequestInit) => impl(url, init));
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

describe("StableBaseline constructor", () => {
  it("throws when no credential is provided", () => {
    expect(() => new StableBaseline({})).toThrow(/apiKey.*accessToken/);
  });

  it("accepts apiKey alone", () => {
    expect(() => new StableBaseline({ apiKey: "sta_test" })).not.toThrow();
  });

  it("accepts accessToken alone", () => {
    expect(() => new StableBaseline({ accessToken: "oauth_token" })).not.toThrow();
  });

  it("trims trailing slash from baseUrl", async () => {
    const fetch = mockFetch(() => json(200, { ok: true }));
    const sb = new StableBaseline({
      apiKey: "sta_x",
      baseUrl: "https://example.com/api/v1/",
      fetch,
    });
    await sb.tools.someTool({});
    expect(fetch.mock.calls[0][0]).toBe("https://example.com/api/v1/tools/someTool");
  });
});

describe("Auth header", () => {
  it("uses apiKey as Bearer token", async () => {
    const fetch = mockFetch(() => json(200, {}));
    const sb = new StableBaseline({ apiKey: "sta_abc", fetch });
    await sb.tools.anyTool({});
    const init = fetch.mock.calls[0][1];
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer sta_abc");
  });

  it("uses accessToken as Bearer token", async () => {
    const fetch = mockFetch(() => json(200, {}));
    const sb = new StableBaseline({ accessToken: "oauth_xyz", fetch });
    await sb.tools.anyTool({});
    const init = fetch.mock.calls[0][1];
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer oauth_xyz");
  });

  it("prefers accessToken over apiKey when both supplied", async () => {
    const fetch = mockFetch(() => json(200, {}));
    const sb = new StableBaseline({ apiKey: "sta_x", accessToken: "oauth_y", fetch });
    await sb.tools.anyTool({});
    const init = fetch.mock.calls[0][1];
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer oauth_y");
  });
});

describe("Tool dispatch", () => {
  it("posts to /tools/<name> with JSON body", async () => {
    const fetch = mockFetch(() => json(200, { result: "ok" }));
    const sb = new StableBaseline({ apiKey: "sta_x", fetch });
    const result = await sb.tools.createDocument({
      folderId: "f1",
      title: "T",
      cdmd: "# Hi",
    } as never);
    expect(result).toEqual({ result: "ok" });

    const [url, init] = fetch.mock.calls[0];
    expect(url).toMatch(/\/tools\/createDocument$/);
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({
      folderId: "f1",
      title: "T",
      cdmd: "# Hi",
    });
  });

  it("URL-encodes the tool name", async () => {
    const fetch = mockFetch(() => json(200, {}));
    const sb = new StableBaseline({ apiKey: "sta_x", fetch });
    await sb.callTool("weird/name with spaces");
    expect(fetch.mock.calls[0][0]).toContain("weird%2Fname%20with%20spaces");
  });

  it("sends an empty body when no input is provided", async () => {
    const fetch = mockFetch(() => json(200, {}));
    const sb = new StableBaseline({ apiKey: "sta_x", fetch });
    await sb.callTool("listOrganisations");
    expect(JSON.parse(fetch.mock.calls[0][1].body as string)).toEqual({});
  });
});

describe("Error handling", () => {
  it("throws StableBaselineToolError on non-2xx with parsed envelope", async () => {
    const fetch = mockFetch(() =>
      json(401, {
        error: {
          code: "unauthorized",
          message: "Missing authentication",
          details: { hint: "send Bearer token" },
        },
      }),
    );
    const sb = new StableBaseline({ apiKey: "sta_x", fetch });
    let caught: ToolError | undefined;
    try {
      await sb.tools.listOrganisations({} as never);
    } catch (err) {
      caught = err as ToolError;
    }
    expect(caught).toBeDefined();
    expect(caught!.name).toBe("StableBaselineToolError");
    expect(caught!.status).toBe(401);
    expect(caught!.code).toBe("unauthorized");
    expect(caught!.message).toContain("Missing authentication");
    expect(caught!.details).toEqual({ hint: "send Bearer token" });
  });

  it("throws with http_<status> code when error envelope is missing", async () => {
    const fetch = mockFetch(() => new Response("plain text", { status: 502 }));
    const sb = new StableBaseline({ apiKey: "sta_x", fetch });
    await expect(sb.tools.x({} as never)).rejects.toMatchObject({
      status: 502,
      code: "http_502",
    });
  });
});

describe("openapi() and listTools()", () => {
  it("openapi() GETs /openapi.json", async () => {
    const fetch = mockFetch(() => json(200, { openapi: "3.1.0" }));
    const sb = new StableBaseline({ apiKey: "sta_x", fetch });
    const spec = await sb.openapi();
    expect(spec).toEqual({ openapi: "3.1.0" });
    expect(fetch.mock.calls[0][0]).toMatch(/\/openapi\.json$/);
  });

  it("listTools() GETs /tools", async () => {
    const fetch = mockFetch(() =>
      json(200, { count: 163, tools: [{ name: "x", description: "", category: "", anonymous: false, feature: null }] }),
    );
    const sb = new StableBaseline({ apiKey: "sta_x", fetch });
    const list = await sb.listTools();
    expect(list.count).toBe(163);
    expect(fetch.mock.calls[0][0]).toMatch(/\/tools$/);
  });
});

describe("Abort signal", () => {
  it("propagates the signal to fetch", async () => {
    const fetch = mockFetch(() => json(200, {}));
    const ctrl = new AbortController();
    const sb = new StableBaseline({ apiKey: "sta_x", fetch, signal: ctrl.signal });
    await sb.tools.x({} as never);
    expect(fetch.mock.calls[0][1].signal).toBe(ctrl.signal);
  });
});

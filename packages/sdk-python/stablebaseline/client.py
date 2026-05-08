"""HTTP client for the Stable Baseline REST API.

Sync and async variants share the same dispatch logic via a small base
class. All 163 MCP tools are reachable as ``client.tools.<tool_name>(...)``.
"""

from __future__ import annotations

import os
from typing import Any, Iterator, Mapping

import httpx

DEFAULT_BASE_URL = "https://api.stablebaseline.io/functions/v1/cloud-serve/api/v1"


class StableBaselineToolError(Exception):
    """Raised when the server returns a non-2xx response."""

    def __init__(
        self,
        status: int,
        code: str,
        message: str,
        details: Mapping[str, Any] | None = None,
    ) -> None:
        super().__init__(f"[{status} {code}] {message}")
        self.status = status
        self.code = code
        self.message = message
        self.details = details or {}


def _auth_header(api_key: str | None, access_token: str | None) -> dict[str, str]:
    token = access_token or api_key
    if not token:
        return {}
    return {"Authorization": f"Bearer {token}"}


def _resolve_credential(
    api_key: str | None, access_token: str | None
) -> tuple[str | None, str | None]:
    api_key = api_key or os.environ.get("SB_API_KEY")
    access_token = access_token or os.environ.get("SB_ACCESS_TOKEN")
    if not api_key and not access_token:
        raise ValueError(
            "No credential provided. Pass `api_key=` or `access_token=`, "
            "or set the SB_API_KEY / SB_ACCESS_TOKEN env vars."
        )
    return api_key, access_token


def _raise_for_error(response: httpx.Response) -> None:
    try:
        body = response.json()
    except Exception:
        body = None
    envelope = (body or {}).get("error") or {}
    raise StableBaselineToolError(
        status=response.status_code,
        code=envelope.get("code") or f"http_{response.status_code}",
        message=envelope.get("message") or response.reason_phrase,
        details=envelope.get("details"),
    )


# ── Sync client ──────────────────────────────────────────────────────


class _SyncToolDispatcher:
    """Dynamic attribute-based tool dispatch — ``client.tools.<name>(input)``."""

    def __init__(self, client: "StableBaseline") -> None:
        self._client = client

    def __getattr__(self, name: str) -> Any:
        if name.startswith("_"):
            raise AttributeError(name)
        return lambda **kwargs: self._client.call_tool(name, kwargs)

    def __call__(self, name: str, input: Mapping[str, Any] | None = None) -> Any:
        """Escape hatch: ``client.tools("listOrganisations", {})``."""
        return self._client.call_tool(name, dict(input or {}))


class StableBaseline:
    """Synchronous client. Use as a context manager for connection reuse:

        with StableBaseline(api_key="sta_xxx") as sb:
            orgs = sb.tools.listOrganisations()

    Or instantiate directly; ``httpx.Client`` is created lazily and closed
    when ``close()`` is called.
    """

    def __init__(
        self,
        *,
        api_key: str | None = None,
        access_token: str | None = None,
        base_url: str = DEFAULT_BASE_URL,
        timeout: float | None = 30.0,
        http_client: httpx.Client | None = None,
    ) -> None:
        api_key, access_token = _resolve_credential(api_key, access_token)
        self._base_url = base_url.rstrip("/")
        self._headers = _auth_header(api_key, access_token)
        self._http = http_client or httpx.Client(timeout=timeout)
        self._owns_http = http_client is None
        self.tools = _SyncToolDispatcher(self)

    # — Public surface —

    def call_tool(self, name: str, params: Mapping[str, Any] | None = None) -> Any:
        url = f"{self._base_url}/tools/{name}"
        res = self._http.post(
            url,
            headers={"Content-Type": "application/json", **self._headers},
            json=dict(params or {}),
        )
        if not res.is_success:
            _raise_for_error(res)
        return res.json()

    def list_tools(self) -> dict[str, Any]:
        res = self._http.get(f"{self._base_url}/tools")
        res.raise_for_status()
        return res.json()

    def openapi(self) -> dict[str, Any]:
        res = self._http.get(f"{self._base_url}/openapi.json")
        res.raise_for_status()
        return res.json()

    # — Resource management —

    def close(self) -> None:
        if self._owns_http:
            self._http.close()

    def __enter__(self) -> "StableBaseline":
        return self

    def __exit__(self, *_: object) -> None:
        self.close()

    def __iter__(self) -> Iterator[Any]:
        # Prevent surprise iteration (httpx.Client supports it).
        raise TypeError("StableBaseline is not iterable; use sb.tools.<name>(...).")


# ── Async client ─────────────────────────────────────────────────────


class _AsyncToolDispatcher:
    def __init__(self, client: "AsyncStableBaseline") -> None:
        self._client = client

    def __getattr__(self, name: str) -> Any:
        if name.startswith("_"):
            raise AttributeError(name)

        async def _call(**kwargs: Any) -> Any:
            return await self._client.call_tool(name, kwargs)

        return _call

    def __call__(self, name: str, input: Mapping[str, Any] | None = None) -> Any:
        return self._client.call_tool(name, dict(input or {}))


class AsyncStableBaseline:
    """Asynchronous client.

        async with AsyncStableBaseline(api_key="sta_xxx") as sb:
            orgs = await sb.tools.listOrganisations()
    """

    def __init__(
        self,
        *,
        api_key: str | None = None,
        access_token: str | None = None,
        base_url: str = DEFAULT_BASE_URL,
        timeout: float | None = 30.0,
        http_client: httpx.AsyncClient | None = None,
    ) -> None:
        api_key, access_token = _resolve_credential(api_key, access_token)
        self._base_url = base_url.rstrip("/")
        self._headers = _auth_header(api_key, access_token)
        self._http = http_client or httpx.AsyncClient(timeout=timeout)
        self._owns_http = http_client is None
        self.tools = _AsyncToolDispatcher(self)

    async def call_tool(self, name: str, params: Mapping[str, Any] | None = None) -> Any:
        url = f"{self._base_url}/tools/{name}"
        res = await self._http.post(
            url,
            headers={"Content-Type": "application/json", **self._headers},
            json=dict(params or {}),
        )
        if not res.is_success:
            _raise_for_error(res)
        return res.json()

    async def list_tools(self) -> dict[str, Any]:
        res = await self._http.get(f"{self._base_url}/tools")
        res.raise_for_status()
        return res.json()

    async def openapi(self) -> dict[str, Any]:
        res = await self._http.get(f"{self._base_url}/openapi.json")
        res.raise_for_status()
        return res.json()

    async def aclose(self) -> None:
        if self._owns_http:
            await self._http.aclose()

    async def __aenter__(self) -> "AsyncStableBaseline":
        return self

    async def __aexit__(self, *_: object) -> None:
        await self.aclose()

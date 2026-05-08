"""Unit tests for the Python SDK.

Uses respx to intercept httpx calls so tests run without the live API.
Covers: constructor validation, env var fallback, auth header injection,
sync + async dispatch, error envelope parsing, context manager lifecycle.
"""

from __future__ import annotations

import os
import pytest
import respx
import httpx

from stablebaseline import (
    AsyncStableBaseline,
    StableBaseline,
    StableBaselineToolError,
)
from stablebaseline.client import DEFAULT_BASE_URL


# ─── Constructor validation ─────────────────────────────────────────────


def test_no_credential_raises(monkeypatch):
    monkeypatch.delenv("SB_API_KEY", raising=False)
    monkeypatch.delenv("SB_ACCESS_TOKEN", raising=False)
    with pytest.raises(ValueError, match="No credential"):
        StableBaseline()


def test_async_no_credential_raises(monkeypatch):
    monkeypatch.delenv("SB_API_KEY", raising=False)
    monkeypatch.delenv("SB_ACCESS_TOKEN", raising=False)
    with pytest.raises(ValueError, match="No credential"):
        AsyncStableBaseline()


def test_env_api_key_fallback(monkeypatch):
    monkeypatch.setenv("SB_API_KEY", "sta_from_env")
    monkeypatch.delenv("SB_ACCESS_TOKEN", raising=False)
    sb = StableBaseline()
    assert sb._headers == {"Authorization": "Bearer sta_from_env"}
    sb.close()


def test_env_access_token_fallback(monkeypatch):
    monkeypatch.delenv("SB_API_KEY", raising=False)
    monkeypatch.setenv("SB_ACCESS_TOKEN", "oauth_from_env")
    sb = StableBaseline()
    assert sb._headers == {"Authorization": "Bearer oauth_from_env"}
    sb.close()


def test_explicit_arg_beats_env(monkeypatch):
    monkeypatch.setenv("SB_API_KEY", "sta_env")
    sb = StableBaseline(api_key="sta_explicit")
    assert sb._headers == {"Authorization": "Bearer sta_explicit"}
    sb.close()


def test_access_token_takes_priority_over_api_key():
    sb = StableBaseline(api_key="sta_x", access_token="oauth_y")
    assert sb._headers == {"Authorization": "Bearer oauth_y"}
    sb.close()


def test_base_url_trailing_slash_stripped():
    sb = StableBaseline(api_key="sta_x", base_url="https://example.com/api/")
    assert sb._base_url == "https://example.com/api"
    sb.close()


# ─── Sync dispatch ──────────────────────────────────────────────────────


@respx.mock
def test_sync_tool_dispatch_via_attribute_access():
    route = respx.post(f"{DEFAULT_BASE_URL}/tools/listOrganisations").mock(
        return_value=httpx.Response(200, json={"organisations": []})
    )
    with StableBaseline(api_key="sta_x") as sb:
        result = sb.tools.listOrganisations()
    assert result == {"organisations": []}
    assert route.called
    request = route.calls.last.request
    assert request.headers["authorization"] == "Bearer sta_x"
    assert request.headers["content-type"] == "application/json"


@respx.mock
def test_sync_tool_dispatch_passes_kwargs_as_json():
    route = respx.post(f"{DEFAULT_BASE_URL}/tools/createDocument").mock(
        return_value=httpx.Response(200, json={"id": "doc-1"})
    )
    with StableBaseline(api_key="sta_x") as sb:
        sb.tools.createDocument(folderId="f1", title="T", cdmd="# Hi")
    request = route.calls.last.request
    import json as _json
    assert _json.loads(request.read()) == {
        "folderId": "f1",
        "title": "T",
        "cdmd": "# Hi",
    }


@respx.mock
def test_sync_dispatch_via_call_syntax():
    """Escape hatch: client.tools('toolName', {input}) — useful for dynamic dispatch."""
    respx.post(f"{DEFAULT_BASE_URL}/tools/getCurrentUser").mock(
        return_value=httpx.Response(200, json={"id": "u1"})
    )
    with StableBaseline(api_key="sta_x") as sb:
        result = sb.tools("getCurrentUser", {})
    assert result == {"id": "u1"}


@respx.mock
def test_sync_error_envelope_raises_typed_exception():
    respx.post(f"{DEFAULT_BASE_URL}/tools/listOrganisations").mock(
        return_value=httpx.Response(
            401,
            json={
                "error": {
                    "code": "unauthorized",
                    "message": "Bearer token required",
                    "details": {"hint": "send Authorization header"},
                }
            },
        )
    )
    with StableBaseline(api_key="sta_x") as sb:
        with pytest.raises(StableBaselineToolError) as exc_info:
            sb.tools.listOrganisations()
    err = exc_info.value
    assert err.status == 401
    assert err.code == "unauthorized"
    assert err.message == "Bearer token required"
    assert err.details == {"hint": "send Authorization header"}


@respx.mock
def test_sync_error_with_no_envelope_uses_status_code():
    respx.post(f"{DEFAULT_BASE_URL}/tools/x").mock(
        return_value=httpx.Response(502, content=b"Bad Gateway")
    )
    with StableBaseline(api_key="sta_x") as sb:
        with pytest.raises(StableBaselineToolError) as exc_info:
            sb.tools.x()
    err = exc_info.value
    assert err.status == 502
    assert err.code == "http_502"


def test_dispatcher_rejects_dunder_attrs():
    """Dunder attribute access should raise AttributeError, not silently return a callable."""
    sb = StableBaseline(api_key="sta_x")
    try:
        with pytest.raises(AttributeError):
            sb.tools.__some_dunder__
    finally:
        sb.close()


def test_iteration_is_blocked():
    sb = StableBaseline(api_key="sta_x")
    try:
        with pytest.raises(TypeError, match="not iterable"):
            iter(sb)
    finally:
        sb.close()


# ─── Async dispatch ─────────────────────────────────────────────────────


@pytest.mark.asyncio
@respx.mock
async def test_async_tool_dispatch_via_attribute_access():
    respx.post(f"{DEFAULT_BASE_URL}/tools/listOrganisations").mock(
        return_value=httpx.Response(200, json={"organisations": []})
    )
    async with AsyncStableBaseline(api_key="sta_x") as sb:
        result = await sb.tools.listOrganisations()
    assert result == {"organisations": []}


@pytest.mark.asyncio
@respx.mock
async def test_async_error_envelope_raises():
    respx.post(f"{DEFAULT_BASE_URL}/tools/x").mock(
        return_value=httpx.Response(
            403,
            json={"error": {"code": "forbidden", "message": "Plan not allowed"}},
        )
    )
    async with AsyncStableBaseline(api_key="sta_x") as sb:
        with pytest.raises(StableBaselineToolError) as exc_info:
            await sb.tools.x()
    assert exc_info.value.status == 403
    assert exc_info.value.code == "forbidden"


# ─── Context manager + lifecycle ────────────────────────────────────────


def test_sync_context_manager_closes_owned_client():
    sb = StableBaseline(api_key="sta_x")
    assert sb._owns_http is True
    with sb:
        pass
    assert sb._http.is_closed


def test_sync_does_not_close_externally_provided_client():
    external = httpx.Client()
    try:
        sb = StableBaseline(api_key="sta_x", http_client=external)
        assert sb._owns_http is False
        with sb:
            pass
        assert not external.is_closed
    finally:
        external.close()


@pytest.mark.asyncio
async def test_async_context_manager_closes_owned_client():
    sb = AsyncStableBaseline(api_key="sta_x")
    assert sb._owns_http is True
    async with sb:
        pass
    assert sb._http.is_closed


# ─── Helpers / internals ────────────────────────────────────────────────


@respx.mock
def test_list_tools():
    respx.get(f"{DEFAULT_BASE_URL}/tools").mock(
        return_value=httpx.Response(200, json={"count": 163, "tools": []})
    )
    with StableBaseline(api_key="sta_x") as sb:
        result = sb.list_tools()
    assert result == {"count": 163, "tools": []}


@respx.mock
def test_openapi():
    respx.get(f"{DEFAULT_BASE_URL}/openapi.json").mock(
        return_value=httpx.Response(200, json={"openapi": "3.1.0"})
    )
    with StableBaseline(api_key="sta_x") as sb:
        spec = sb.openapi()
    assert spec["openapi"] == "3.1.0"

"""Stable Baseline — Python SDK for the REST API.

    from stablebaseline import StableBaseline

    sb = StableBaseline(api_key="sta_xxx")
    orgs = sb.tools.listOrganisations()
    doc = sb.tools.createDocument(folder_id="...", title="X", cdmd="# Hi")

The same surface is available asynchronously via :class:`AsyncStableBaseline`.
163 MCP tools across 16 categories — see https://stablebaseline.io/docs/mcp/tools.
"""

from .client import (
    AsyncStableBaseline,
    StableBaseline,
    StableBaselineToolError,
)

__all__ = [
    "StableBaseline",
    "AsyncStableBaseline",
    "StableBaselineToolError",
]

__version__ = "0.1.0"

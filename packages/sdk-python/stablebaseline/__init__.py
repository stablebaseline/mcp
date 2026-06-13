"""Stable Baseline — Python SDK for the REST API.

    from stablebaseline import StableBaseline

    sb = StableBaseline(api_key="sta_xxx")
    orgs = sb.tools.listOrganisations()
    doc = sb.tools.createDocument(folder_id="...", title="X", cdmd="# Hi")

The same surface is available asynchronously via :class:`AsyncStableBaseline`.
184 MCP tools across 19 categories — see https://stablebaseline.io/docs/mcp/tools.
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

# Resolved from installed package metadata so it always matches pyproject.toml
# (the release bump script edits pyproject.toml only).
try:
    from importlib.metadata import PackageNotFoundError, version as _pkg_version

    __version__ = _pkg_version("stablebaseline")
except PackageNotFoundError:  # running from a source checkout, not installed
    __version__ = "0.0.0"

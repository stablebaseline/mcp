#!/usr/bin/env python3
"""
Generate the two Microsoft 365 app-package icons from the Stable Baseline brand mark.

Source of truth for the geometry is the repo brand asset
  src/assets/brand/icons/sb_icon_dark_rounded.svg
whose inner mark is drawn on viewBox "4 8 30 20" (a 30 x 20 user-unit box):
  path 1  the "S" form
  path 2  the "B" form (fill-rule evenodd carves the two counters)
  rect    the baseline rule, brand orange #C2410C

Outputs (M365 unified app manifest, schema v1.28):
  color.png    192 x 192  full colour, solid square background      icons.color
  outline.png   32 x  32  white on transparent, no extra padding    icons.outline

Both are supersampled 8x and downsampled with Lanczos so the 32 px outline
stays legible. Run:  python make-icons.py <output-dir>
"""

import sys
import pathlib
import io

import cairosvg
from PIL import Image

# Brand tokens, copied from the repo brand asset.
NAVY = "#0B1220"
ORANGE = "#C2410C"
WHITE = "#FFFFFF"

# The mark, verbatim from sb_icon_dark_rounded.svg. Bounding box is exactly the
# viewBox: x 4..34, y 8..28. Nothing overhangs, so "viewBox 4 8 30 20" is a
# tight crop and scaling it to the full canvas leaves zero extra padding.
MARK_VIEWBOX = "4 8 30 20"
MARK_W, MARK_H = 30.0, 20.0


def mark_paths(glyph_fill: str, rule_fill: str) -> str:
    return f"""
    <path d="M4 8 h 14 v 4 h -10 v 4 h 10 v 8 h -14 v -4 h 10 v -4 h -10 z" fill="{glyph_fill}"/>
    <path fill-rule="evenodd" d="M20 8 h 14 v 16 h -14 z M24 12 v 3 h 6 v -3 z M24 17 v 3 h 6 v -3 z" fill="{glyph_fill}"/>
    <rect x="4" y="26" width="30" height="2" fill="{rule_fill}"/>
    """


def render(svg: str, w: int, h: int, scale: int = 8) -> Image.Image:
    """Rasterise at scale x, then Lanczos down to the target size."""
    png = cairosvg.svg2png(
        bytestring=svg.encode("utf-8"),
        output_width=w * scale,
        output_height=h * scale,
    )
    big = Image.open(io.BytesIO(png)).convert("RGBA")
    return big.resize((w, h), Image.LANCZOS)


def build_color(size: int = 192) -> Image.Image:
    """
    Full-colour icon: solid square background (store rules allow a solid or a
    fully transparent square), brand mark in white, baseline rule in the
    accentColor orange declared in the manifest.

    The mark is set at 80% of the canvas width, which is the standard breathing
    room for a solid-background app icon while leaving no dead border.
    """
    mark_w = size * 0.80
    mark_h = mark_w * (MARK_H / MARK_W)
    x = (size - mark_w) / 2.0
    y = (size - mark_h) / 2.0
    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" viewBox="0 0 {size} {size}">
  <rect width="{size}" height="{size}" fill="{NAVY}"/>
  <svg x="{x:.4f}" y="{y:.4f}" width="{mark_w:.4f}" height="{mark_h:.4f}" viewBox="{MARK_VIEWBOX}">
    {mark_paths(WHITE, ORANGE)}
  </svg>
</svg>"""
    return render(svg, size, size)


def build_outline(size: int = 32) -> Image.Image:
    """
    Outline icon: the whole mark in pure white on a transparent canvas.

    The mark is 3:2, so filling the width edge to edge is the tightest possible
    fit on a square canvas. The leftover height is split evenly top and bottom,
    which fixes the asymmetric 5px-top / 11px-bottom gap in the previous build.
    Every pixel is forced to pure white; only the alpha channel varies, so the
    schema's "the border color needs to be white" holds exactly.
    """
    mark_w = float(size)
    mark_h = mark_w * (MARK_H / MARK_W)
    y = (size - mark_h) / 2.0
    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" viewBox="0 0 {size} {size}">
  <svg x="0" y="{y:.4f}" width="{mark_w:.4f}" height="{mark_h:.4f}" viewBox="{MARK_VIEWBOX}">
    {mark_paths(WHITE, WHITE)}
  </svg>
</svg>"""
    img = render(svg, size, size)
    # Force RGB to pure white, keep the antialiased alpha.
    alpha = img.getchannel("A")
    white = Image.new("RGBA", img.size, (255, 255, 255, 0))
    white.putalpha(alpha)
    return white


def main() -> None:
    out = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else ".")
    out.mkdir(parents=True, exist_ok=True)
    build_color().save(out / "color.png", "PNG", optimize=True)
    build_outline().save(out / "outline.png", "PNG", optimize=True)
    print(f"wrote {out/'color.png'} and {out/'outline.png'}")


if __name__ == "__main__":
    main()

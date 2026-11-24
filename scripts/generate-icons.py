#!/usr/bin/env python3
"""
Generate and update all Stickie application icons from a master SVG or high-resolution PNG.

Produces:
  - resources/icons/icon.png (512x512 with 100% alpha transparency)
  - resources/icons/icon-{16,24,32,48,64,128,256,512}.png
  - resources/icons/icon.ico (Windows multi-resolution icon)
  - resources/icons/tray-{16,24,32,48}.png (Linux & Windows tray icons)
  - src/renderer/assets/icon.png (Renderer asset for UI)
  - src/renderer/assets/icon.svg

Usage:
  python3 scripts/generate-icons.py [optional-input-file]
"""

import sys
import os
import shutil
import subprocess
from pathlib import Path
from PIL import Image

ROOT_DIR = Path(__file__).resolve().parent.parent
RESOURCES_ICONS_DIR = ROOT_DIR / "resources" / "icons"
RENDERER_ASSETS_DIR = ROOT_DIR / "src" / "renderer" / "assets"

STANDARD_SIZES = [16, 24, 32, 48, 64, 128, 256, 512]
TRAY_SIZES = [16, 24, 32, 48]
ICO_SIZES = [(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]


def render_svg_to_png(svg_path: Path, output_png: Path, size: int = 1024) -> None:
    """Render SVG to a high-resolution transparent PNG using available system tools."""
    # Try rsvg-convert first
    if shutil.which("rsvg-convert"):
        cmd = ["rsvg-convert", "-w", str(size), "-h", str(size), str(svg_path), "-o", str(output_png)]
        subprocess.run(cmd, check=True)
        return

    # Try inkscape
    if shutil.which("inkscape"):
        cmd = [
            "inkscape",
            str(svg_path),
            f"--export-filename={output_png}",
            f"--export-width={size}",
            f"--export-height={size}",
            "--export-background-opacity=0",
        ]
        subprocess.run(cmd, check=True)
        return

    # Try ImageMagick convert
    if shutil.which("convert"):
        cmd = ["convert", "-background", "none", "-resize", f"{size}x{size}", str(svg_path), str(output_png)]
        subprocess.run(cmd, check=True)
        return

    raise RuntimeError("No SVG renderer found. Please install rsvg-convert, inkscape, or imagemagick.")


def clean_transparency(img: Image.Image) -> Image.Image:
    """Ensure image is RGBA and remove any solid white background corners if detected."""
    rgba = img.convert("RGBA")
    w, h = rgba.size
    corners = [
        rgba.getpixel((0, 0)),
        rgba.getpixel((0, h - 1)),
        rgba.getpixel((w - 1, 0)),
        rgba.getpixel((w - 1, h - 1)),
    ]

    # If all four corners are opaque white or near-white (e.g. RGB >= 248, alpha == 255),
    # make that background color transparent
    if all(c[3] == 255 and c[0] >= 248 and c[1] >= 248 and c[2] >= 248 for c in corners):
        print("  Notice: Opaque white background detected in corners. Converting to transparent alpha...")
        datas = rgba.getdata()
        new_data = []
        for item in datas:
            # If pixel is near-white, set alpha to 0
            if item[0] >= 250 and item[1] >= 250 and item[2] >= 250:
                new_data.append((255, 255, 255, 0))
            else:
                new_data.append(item)
        rgba.putdata(new_data)

    return rgba


def generate_icons(source_file: Path | None = None) -> None:
    RESOURCES_ICONS_DIR.mkdir(parents=True, exist_ok=True)
    RENDERER_ASSETS_DIR.mkdir(parents=True, exist_ok=True)

    if source_file is None:
        default_svg = RESOURCES_ICONS_DIR / "icon.svg"
        default_png = RESOURCES_ICONS_DIR / "icon-source.png"
        if default_svg.exists():
            source_file = default_svg
        elif default_png.exists():
            source_file = default_png
        else:
            source_file = RESOURCES_ICONS_DIR / "icon.png"

    if not source_file.exists():
        print(f"Error: Source file {source_file} not found.")
        sys.exit(1)

    print(f"Generating Stickie icons from: {source_file}")

    temp_hi_res_png = RESOURCES_ICONS_DIR / "_temp_hires.png"
    if source_file.suffix.lower() == ".svg":
        print("  Rendering vector SVG to 1024x1024 transparent RGBA master...")
        render_svg_to_png(source_file, temp_hi_res_png, size=1024)
        master_img = Image.open(temp_hi_res_png)
        # Also copy svg to renderer assets
        shutil.copyfile(source_file, RENDERER_ASSETS_DIR / "icon.svg")
    else:
        master_img = Image.open(source_file)

    master_rgba = clean_transparency(master_img)

    # 1. Generate master icon.png (512x512)
    icon_512 = master_rgba.resize((512, 512), Image.Resampling.LANCZOS)
    icon_png_path = RESOURCES_ICONS_DIR / "icon.png"
    icon_512.save(icon_png_path, "PNG", optimize=True)
    print(f"  Created: {icon_png_path.relative_to(ROOT_DIR)} (512x512)")

    # 2. Generate standard resolution icons (16, 24, 32, 48, 64, 128, 256, 512)
    for sz in STANDARD_SIZES:
        resized = master_rgba.resize((sz, sz), Image.Resampling.LANCZOS)
        out_p = RESOURCES_ICONS_DIR / f"icon-{sz}.png"
        resized.save(out_p, "PNG", optimize=True)
        print(f"  Created: {out_p.relative_to(ROOT_DIR)} ({sz}x{sz})")

    # 3. Generate tray icons (16, 24, 32, 48)
    for sz in TRAY_SIZES:
        resized = master_rgba.resize((sz, sz), Image.Resampling.LANCZOS)
        out_p = RESOURCES_ICONS_DIR / f"tray-{sz}.png"
        resized.save(out_p, "PNG", optimize=True)
        print(f"  Created: {out_p.relative_to(ROOT_DIR)} ({sz}x{sz})")

    # 4. Generate multi-resolution Windows ICO
    ico_path = RESOURCES_ICONS_DIR / "icon.ico"
    master_rgba.save(ico_path, format="ICO", sizes=ICO_SIZES)
    print(f"  Created: {ico_path.relative_to(ROOT_DIR)} (sizes {ICO_SIZES})")

    # 5. Export renderer asset (256x256 and 512x512)
    renderer_icon_path = RENDERER_ASSETS_DIR / "icon.png"
    icon_256 = master_rgba.resize((256, 256), Image.Resampling.LANCZOS)
    icon_256.save(renderer_icon_path, "PNG", optimize=True)
    print(f"  Created: {renderer_icon_path.relative_to(ROOT_DIR)} (256x256)")

    # Clean up temp file
    if temp_hi_res_png.exists():
        temp_hi_res_png.unlink()

    print("\nIcon generation complete! All assets updated successfully.")


if __name__ == "__main__":
    src = Path(sys.argv[1]) if len(sys.argv) > 1 else None
    generate_icons(src)

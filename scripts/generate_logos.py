#!/usr/bin/env python3
"""
Generate Litigo logo variants for all platforms.
Source: assets/litigo-logo.webp (965x796)
"""

from PIL import Image
import os

SOURCE = "assets/litigo-logo.webp"
OUTPUT_DIR = "assets/logo"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Open source image
img = Image.open(SOURCE)
print(f"Source: {SOURCE} — {img.size[0]}x{img.size[1]}, mode={img.mode}")

# Convert to RGBA if needed
if img.mode != "RGBA":
    img = img.convert("RGBA")

def save_png(size, path, square=False):
    """Save logo as PNG. If square=True, pad to square with transparency."""
    if square:
        # Pad to square
        side = max(img.size)
        squared = Image.new("RGBA", (side, side), (0, 0, 0, 0))
        offset = ((side - img.size[0]) // 2, (side - img.size[1]) // 2)
        squared.paste(img, offset)
        resized = squared.resize((size, size), Image.LANCZOS)
    else:
        # Resize maintaining aspect ratio, width = size
        ratio = size / img.size[0]
        new_height = int(img.size[1] * ratio)
        resized = img.resize((size, new_height), Image.LANCZOS)
    
    resized.save(path, "PNG")
    print(f"  ✅ {path} — {resized.size[0]}x{resized.size[1]}")

def save_ico(sizes, path):
    """Save multi-size .ico file."""
    images = []
    for s in sizes:
        side = max(img.size)
        squared = Image.new("RGBA", (side, side), (0, 0, 0, 0))
        offset = ((side - img.size[0]) // 2, (side - img.size[1]) // 2)
        squared.paste(img, offset)
        resized = squared.resize((s, s), Image.LANCZOS)
        images.append(resized)
    images[0].save(path, format="ICO", sizes=[(s, s) for s in sizes])
    print(f"  ✅ {path} — multi-size ICO ({sizes})")

print("\n=== 1. Chrome Extension Icons (square PNGs) ===")
chrome_dir = "apps/chrome-extension/icons"
os.makedirs(chrome_dir, exist_ok=True)
for size in [16, 32, 48, 128]:
    save_png(size, f"{chrome_dir}/icon-{size}.png", square=True)

print("\n=== 2. Desktop / Tauri Icons ===")
desktop_icons = "apps/desktop/src-tauri/icons"
os.makedirs(desktop_icons, exist_ok=True)
for size in [32, 128, 256, 512]:
    save_png(size, f"{desktop_icons}/{size}x{size}.png", square=True)
# 128@2x for macOS
save_png(256, f"{desktop_icons}/128x128@2x.png", square=True)
# ICO file for Windows
save_ico([16, 32, 48, 64, 128, 256], f"{desktop_icons}/icon.ico")

print("\n=== 3. Android Launcher Icons (mipmap) ===")
android_base = "apps/android/app/src/main/res"
densities = {
    "mipmap-mdpi": 48,
    "mipmap-hdpi": 72,
    "mipmap-xhdpi": 96,
    "mipmap-xxhdpi": 144,
    "mipmap-xxxhdpi": 192,
}
for density, size in densities.items():
    d = f"{android_base}/{density}"
    os.makedirs(d, exist_ok=True)
    save_png(size, f"{d}/ic_launcher.png", square=True)
    save_png(size, f"{d}/ic_launcher_round.png", square=True)

print("\n=== 4. General Branding Assets ===")
# For web/UI use
branding_dir = f"{OUTPUT_DIR}/branding"
os.makedirs(branding_dir, exist_ok=True)
for size in [24, 28, 40, 64, 128, 256, 512]:
    save_png(size, f"{branding_dir}/logo-{size}px.png")
    save_png(size, f"{branding_dir}/logo-{size}px-square.png", square=True)

# Also save full-size PNG
full_png = f"{OUTPUT_DIR}/litigo-logo-full.png"
img.save(full_png, "PNG")
print(f"  ✅ {full_png} — full size")

# Copy to website public folder
import shutil
web_public = "apps/web/public"
for size in [24, 28, 40, 64, 128]:
    shutil.copy2(f"{branding_dir}/logo-{size}px.png", f"{web_public}/logo-{size}px.png")
    shutil.copy2(f"{branding_dir}/logo-{size}px-square.png", f"{web_public}/logo-{size}px-square.png")
shutil.copy2(full_png, f"{web_public}/litigo-logo-full.png")
print(f"\n  ✅ Copied branding assets to {web_public}/")

print("\n=== DONE ===")

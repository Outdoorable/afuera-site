#!/usr/bin/env python3
"""
Generate a 3:2 blog card image for a post.

Usage:
  python3 scripts/generate-card.py \
    --title "The Printed Spreadsheet" \
    --cluster "Field Operations" \
    --slug "printed-spreadsheet" \
    [--theme eggplant|teal|sand]

Writes to images/blog/<slug>-card.png
"""
import argparse
import os
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
FONT_PATH = ROOT / 'scripts' / 'fonts' / 'SpaceGrotesk.ttf'
OUT_DIR = ROOT / 'images' / 'blog'
W, H = 1200, 800

# Afuera palette
BG_EGGPLANT = (46, 42, 57)       # #2E2A39
BG_DEEP_TEAL = (36, 51, 58)      # #24333A
BG_CREAM = (245, 243, 238)       # #F5F3EE
ACCENT_ORANGE = (255, 122, 89)   # #FF7A59
ACCENT_TEAL = (46, 196, 182)     # #2EC4B6
ACCENT_PINK = (244, 166, 181)    # #F4A6B5
ACCENT_YELLOW = (255, 209, 102)  # #FFD166
TEXT_LIGHT = (245, 243, 238)

# Cluster → accent color map
CLUSTER_ACCENTS = {
    'Field Operations': ACCENT_TEAL,
    'Office Operations': ACCENT_ORANGE,
    'Marketing and Sales': ACCENT_PINK,
    'AI Strategy': ACCENT_YELLOW,
    'Industry POV': ACCENT_ORANGE,
}

# Cluster → grid pattern theme (light texture on the card)
CLUSTER_PATTERNS = {
    'Field Operations': 'waves',
    'Office Operations': 'grid',
    'Marketing and Sales': 'dots',
    'AI Strategy': 'diagonal',
    'Industry POV': 'grid',
}


def make_gradient_bg(width, height):
    """Dark eggplant → deep teal diagonal gradient."""
    img = Image.new('RGB', (width, height), BG_EGGPLANT)
    pixels = img.load()
    for y in range(height):
        t = y / height
        r = int(BG_EGGPLANT[0] * (1 - t) + BG_DEEP_TEAL[0] * t)
        g = int(BG_EGGPLANT[1] * (1 - t) + BG_DEEP_TEAL[1] * t)
        b = int(BG_EGGPLANT[2] * (1 - t) + BG_DEEP_TEAL[2] * t)
        for x in range(width):
            pixels[x, y] = (r, g, b)
    return img


def add_glow(img, accent):
    """Warm accent-colored radial glow in the lower-right area."""
    glow = Image.new('RGB', img.size, (0, 0, 0))
    gd = ImageDraw.Draw(glow)
    # Big soft ellipse
    gd.ellipse((W * 0.35, H * 0.25, W * 1.25, H * 1.35), fill=accent)
    glow = glow.filter(ImageFilter.GaussianBlur(180))
    return Image.blend(img, glow, 0.22)


def add_pattern(img, theme, accent):
    """Subtle cluster-specific pattern overlay at low opacity."""
    overlay = Image.new('RGBA', img.size, (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    alpha = 28  # low opacity

    if theme == 'grid':
        step = 60
        for x in range(0, W, step):
            od.line([(x, 0), (x, H)], fill=(*accent, alpha), width=1)
        for y in range(0, H, step):
            od.line([(0, y), (W, y)], fill=(*accent, alpha), width=1)

    elif theme == 'waves':
        import math
        step = 50
        for y_base in range(0, H + step, step):
            points = []
            for x in range(0, W + 20, 20):
                y_offset = math.sin((x + y_base) / 80) * 12
                points.append((x, y_base + y_offset))
            if len(points) > 1:
                for i in range(len(points) - 1):
                    od.line([points[i], points[i + 1]], fill=(*accent, alpha), width=2)

    elif theme == 'dots':
        step = 50
        r = 3
        for x in range(step // 2, W, step):
            for y in range(step // 2, H, step):
                od.ellipse((x - r, y - r, x + r, y + r), fill=(*accent, alpha * 2))

    elif theme == 'diagonal':
        for i in range(-H, W, 45):
            od.line([(i, 0), (i + H, H)], fill=(*accent, alpha), width=1)

    return Image.alpha_composite(img.convert('RGBA'), overlay).convert('RGB')


def wrap_title(draw, text, font, max_width):
    """Wrap a title into lines that fit within max_width."""
    words = text.split()
    lines = []
    current = []
    for word in words:
        test = ' '.join(current + [word])
        bbox = draw.textbbox((0, 0), test, font=font)
        w = bbox[2] - bbox[0]
        if w <= max_width:
            current.append(word)
        else:
            if current:
                lines.append(' '.join(current))
            current = [word]
    if current:
        lines.append(' '.join(current))
    return lines


def generate_card(title, cluster, slug):
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    accent = CLUSTER_ACCENTS.get(cluster, ACCENT_ORANGE)
    theme = CLUSTER_PATTERNS.get(cluster, 'grid')

    img = make_gradient_bg(W, H)
    img = add_glow(img, accent)
    img = add_pattern(img, theme, accent)

    draw = ImageDraw.Draw(img)

    PAD = 80
    MAX_W = W - 2 * PAD

    # Cluster eyebrow (top-left, small caps)
    if cluster:
        eyebrow_font = ImageFont.truetype(str(FONT_PATH), 26)
        bar_w = 44
        bar_h = 2
        draw.rectangle((PAD, PAD + 12, PAD + bar_w, PAD + 12 + bar_h), fill=accent)
        draw.text((PAD + bar_w + 16, PAD - 2), cluster.upper(), font=eyebrow_font, fill=accent)

    # Title — find the largest size that fits in 3 lines or fewer
    title_size = 120
    while title_size > 60:
        title_font = ImageFont.truetype(str(FONT_PATH), title_size)
        lines = wrap_title(draw, title, title_font, MAX_W)
        if len(lines) <= 3:
            break
        title_size -= 8

    line_gap = int(title_size * 0.08)
    line_height = title_size + line_gap
    block_h = line_height * len(lines)

    title_y = H - PAD - block_h - 60
    for i, line in enumerate(lines):
        y = title_y + i * line_height
        draw.text((PAD, y), line, font=title_font, fill=TEXT_LIGHT)

    # Afuera mark bottom-right
    wordmark_font = ImageFont.truetype(str(FONT_PATH), 32)
    wm_text = 'afuera'
    bbox = draw.textbbox((0, 0), wm_text, font=wordmark_font)
    wm_w = bbox[2] - bbox[0]
    draw.text((W - PAD - wm_w, H - PAD - 10), wm_text, font=wordmark_font, fill=(*TEXT_LIGHT, 200))

    # Vertical accent bar next to wordmark
    # (skipping — too busy with the glow)

    out_path = OUT_DIR / f'{slug}-card.png'
    img.save(out_path, 'PNG', optimize=True)

    size_kb = out_path.stat().st_size / 1024
    print(f'[card] {out_path.relative_to(ROOT)}  ({W}×{H}, {size_kb:.0f} KB)')
    return out_path


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--title', required=True)
    ap.add_argument('--cluster', default='')
    ap.add_argument('--slug', required=True)
    args = ap.parse_args()
    generate_card(args.title, args.cluster, args.slug)

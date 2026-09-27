# -*- coding: utf-8 -*-
"""Generate e-md app icons (Android launcher set + web icons).

Design: near-black rounded square, subtle vertical gradient,
monoline lowercase "em" logotype in warm paper white.
"""
import math
import os

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ANDROID_RES = os.path.join(ROOT, "android", "app", "src", "main", "res")
PUBLIC = os.path.join(ROOT, "public")
DOCS = os.path.join(ROOT, "docs")

BASE = 1024
SS = 4  # supersampling factor

# ---- design tokens -------------------------------------------------------
BG_TOP = (0x26, 0x26, 0x2A)
BG_BOTTOM = (0x0E, 0x0E, 0x11)
MARK = (0xF2, 0xEF, 0xE8)
CORNER_RADIUS = 230  # px on 1024 canvas

# mark geometry on 1024 canvas
W = 58        # stroke width
RE = 120      # "e" ring radius
RA = 120      # "m" arch radius
GAP = 34      # tracking between glyphs
TERMINAL = 36 # "e" ring opening angle (deg, below +x axis, y-down)


def mark_params(scale=1.0):
    """Return derived geometry for a given scale of the 1024 reference."""
    e_outer = 2 * RE + W
    m_outer = 4 * RA + W
    total = (e_outer + GAP + m_outer) * scale
    x_height = 2 * RA * scale
    return e_outer, m_outer, total, x_height


def stamp(draw, pts, radius):
    """Draw a round-capped stroke by stamping circles along the path."""
    step = max(radius * 0.45, 1.0)
    for i in range(len(pts) - 1):
        x0, y0 = pts[i]
        x1, y1 = pts[i + 1]
        seg = math.hypot(x1 - x0, y1 - y0)
        n = max(int(seg / step), 1)
        for k in range(n + 1):
            t = k / n
            x = x0 + (x1 - x0) * t
            y = y0 + (y1 - y0) * t
            draw.ellipse([x - radius, y - radius, x + radius, y + radius], fill=MARK)


def arc_points(cx, cy, r, a0, a1):
    n = 96
    return [(cx + r * math.cos(math.radians(a0 + (a1 - a0) * i / n)),
             cy + r * math.sin(math.radians(a0 + (a1 - a0) * i / n)))
            for i in range(n + 1)]


def draw_mark(canvas_size, mark_width, bg=None):
    """Render one full icon (or transparent foreground if bg is None)."""
    size = canvas_size * SS
    s = (mark_width * SS) / float((2 * RE + W + GAP + 4 * RA + W))
    r = lambda v: v * s  # reference-px -> supersampled px

    sw = r(W) / 2.0
    scale = s
    re, ra, gap = r(RE), r(RA), r(GAP)
    # reference layout recomputed at this scale, centered
    e_out, m_out = (2 * RE + W) * scale, (4 * RA + W) * scale
    total = e_out + gap + m_out
    left = (size - total) / 2.0
    cx_e = left + r(W) / 2 + re
    x0 = left + e_out + gap + r(W) / 2
    x1, x2 = x0 + 2 * ra, x0 + 4 * ra
    yb = size / 2 + ra   # baseline
    yt = size / 2 - ra   # x-height top
    yc = size / 2        # arch centers / e center

    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    stamp(draw, arc_points(cx_e, yc, re, TERMINAL, 360), sw)          # e ring
    stamp(draw, [(cx_e - re, yc), (cx_e + re, yc)], sw)               # e bar
    stamp(draw, [(x0, yb), (x0, yc)], sw)                             # m stem 1
    stamp(draw, arc_points(x0 + ra, yc, ra, 180, 360), sw)            # m arch 1
    stamp(draw, [(x1, yb), (x1, yc)], sw)                             # m stem 2
    stamp(draw, arc_points(x1 + ra, yc, ra, 180, 360), sw)            # m arch 2
    stamp(draw, [(x2, yb), (x2, yc)], sw)                             # m stem 3

    if bg is not None:
        bg_layer = bg.resize((size, size), Image.BICUBIC) if bg.size != (size, size) else bg
        img = Image.alpha_composite(bg_layer.convert("RGBA"), img)
    return img.resize((canvas_size, canvas_size), Image.LANCZOS)


def rounded_mask(size, radius, shape="rect"):
    m = Image.new("L", (size, size), 0)
    d = ImageDraw.Draw(m)
    if shape == "circle":
        d.ellipse([0, 0, size - 1, size - 1], fill=255)
        return m
    d.rectangle([radius, 0, size - 1 - radius, size - 1], fill=255)
    d.rectangle([0, radius, size - 1, size - 1 - radius], fill=255)
    for cx, cy in [(radius, radius), (size - 1 - radius, radius),
                   (radius, size - 1 - radius), (size - 1 - radius, size - 1 - radius)]:
        d.pieslice([cx - radius, cy - radius, cx + radius, cy + radius], 0, 360, fill=255)
    return m


def gradient_bg(size, top, bottom, glow=True, canvas=BASE):
    """Vertical gradient + soft top glow, rendered at `canvas` then scaled."""
    top_a = np.array(top, dtype=np.float64)
    bot_a = np.array(bottom, dtype=np.float64)
    t = np.linspace(0.0, 1.0, canvas)[:, None]
    row = top_a[None, :] * (1 - t) + bot_a[None, :] * t  # (canvas, 3)
    grad = np.repeat(row[:, None, :], canvas, axis=1)  # (canvas, canvas, 3)
    if glow:
        yy, xx = np.mgrid[0:canvas, 0:canvas]
        d = np.sqrt((xx - canvas / 2.0) ** 2 + (yy - canvas * 0.28) ** 2) / (canvas * 0.75)
        glow_a = np.clip(1.0 - d, 0, 1) ** 2 * 14.0
        grad = grad + glow_a[:, :, None] * (np.array([255, 255, 255]) - grad) / 255.0
    img = Image.fromarray(np.clip(grad, 0, 255).astype(np.uint8), "RGB")
    return img.resize((size, size), Image.LANCZOS) if size != canvas else img


def save(img, path, mask=None):
    if mask is not None:
        img = img.copy()
        img.putalpha(mask)
    img.save(path)
    print("wrote", path)


def main():
    master_mark = draw_mark(BASE, BASE * 0.86)  # mark ~86% of canvas width
    bg_dark = gradient_bg(BASE, BG_TOP, BG_BOTTOM)

    # full icon: rounded dark square + mark
    dark = Image.alpha_composite(bg_dark.convert("RGBA"), master_mark)
    mask_rect = rounded_mask(BASE, CORNER_RADIUS)
    mask_circle = rounded_mask(BASE, 0, shape="circle")

    os.makedirs(PUBLIC, exist_ok=True)
    os.makedirs(DOCS, exist_ok=True)

    save(dark, os.path.join(DOCS, "icon-dark.png"), mask_rect)
    save(dark, os.path.join(DOCS, "icon-dark-round.png"), mask_circle)

    # light alternative (preview only)
    bg_light = gradient_bg(BASE, (0xFA, 0xF9, 0xF6), (0xEE, 0xEC, 0xE6), glow=False)
    alpha = master_mark.split()[3]
    dark_mark = Image.new("RGBA", master_mark.size, (0x1A, 0x1A, 0x1C, 0))
    dark_mark.putalpha(alpha)
    light = Image.alpha_composite(bg_light.convert("RGBA"), dark_mark)
    save(light, os.path.join(DOCS, "icon-light.png"), mask_rect)
    del dark_mark, light

    # ---- Android legacy launcher icons ----
    for dpi, px in [("mdpi", 48), ("hdpi", 72), ("xhdpi", 96),
                    ("xxhdpi", 144), ("xxxhdpi", 192)]:
        d = os.path.join(ANDROID_RES, "mipmap-" + dpi)
        icon = dark.resize((px, px), Image.LANCZOS)
        save(icon, os.path.join(d, "ic_launcher.png"), rounded_mask(px, round(CORNER_RADIUS * px / BASE)))
        save(icon, os.path.join(d, "ic_launcher_round.png"), mask_circle.resize((px, px), Image.LANCZOS))

    # ---- Android adaptive icons ----
    fg = draw_mark(BASE, 640)  # mark inside the 66% safe zone
    bgp = gradient_bg(BASE, BG_TOP, BG_BOTTOM)
    for dpi, px in [("mdpi", 108), ("hdpi", 162), ("xhdpi", 216),
                    ("xxhdpi", 324), ("xxxhdpi", 432)]:
        d = os.path.join(ANDROID_RES, "mipmap-" + dpi)
        save(fg.resize((px, px), Image.LANCZOS), os.path.join(d, "ic_launcher_foreground.png"))
        save(bgp.resize((px, px), Image.LANCZOS), os.path.join(d, "ic_launcher_background.png"))

    # ---- web icons ----
    for name, px in [("icon-512.png", 512), ("icon-192.png", 192), ("apple-touch-icon.png", 180)]:
        m = rounded_mask(px, round(CORNER_RADIUS * px / BASE))
        save(dark.resize((px, px), Image.LANCZOS), os.path.join(PUBLIC, name), m)
    print("done")


if __name__ == "__main__":
    main()

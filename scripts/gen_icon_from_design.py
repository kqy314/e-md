# -*- coding: utf-8 -*-
"""从 docs/markdown阅读编辑app的logo设计.png 生成全套应用图标。

- 裁掉水印，提取黑色标志
- 桌面图标：米白底圆角方块 + 居中标志（含圆形遮罩版）
- Android 自适应图标：前景为标志（66% 安全区）、背景为纯色、monochrome 用标志轮廓
- 网页图标：192 / 512 / apple-touch-icon
"""
import os

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "docs", "markdown阅读编辑app的logo设计.png")
ANDROID_RES = os.path.join(ROOT, "android", "app", "src", "main", "res")
PUBLIC = os.path.join(ROOT, "public")

BASE = 1024
CORNER_RADIUS = 230          # 与旧版一致的圆角比例
PAPER = (0xFA, 0xF9, 0xF4)   # 设计稿的米白底色
INK = (0x14, 0x14, 0x14)     # 标志黑色

# 标志占比：桌面图标中标志宽度 / 画布宽度；自适应前景同比例缩小
MARK_RATIO_TILE = 0.50
MARK_RATIO_ADAPTIVE = 0.47

MIPMAP_LEGACY = [("mdpi", 48), ("hdpi", 72), ("xhdpi", 96), ("xxhdpi", 144), ("xxxhdpi", 192)]
MIPMAP_ADAPTIVE = [("mdpi", 108), ("hdpi", 162), ("xhdpi", 216), ("xxhdpi", 324), ("xxxhdpi", 432)]


def extract_mark():
    """裁掉水印并提取标志（透明背景，黑色保留）"""
    im = Image.open(SRC).convert("RGB")
    arr = np.asarray(im, dtype=np.uint8)
    lum = arr.mean(axis=2)
    dark = lum < 110  # 只取深色像素，水印浅灰会被排除
    ys, xs = np.where(dark)
    pad = 12
    x0, x1 = max(xs.min() - pad, 0), min(xs.max() + pad, im.width)
    y0, y1 = max(ys.min() - pad, 0), min(ys.max() + pad, im.height)
    mark = im.crop((x0, y0, x1, y1))

    # 反走样 alpha：亮度越低越不透明
    m = np.asarray(mark, dtype=np.float64)
    mlum = m.mean(axis=2)
    alpha = np.clip((215.0 - mlum) / (215.0 - 60.0), 0.0, 1.0)
    rgba = np.zeros((m.shape[0], m.shape[1], 4), dtype=np.uint8)
    rgba[..., 0:3] = INK
    rgba[..., 3] = (alpha * 255).astype(np.uint8)
    out = Image.fromarray(rgba, "RGBA")
    # 轻微收缩alpha边缘，去除锯齿光晕
    a = out.split()[3].filter(ImageFilter.GaussianBlur(0.6))
    out.putalpha(a)
    return out


def rounded_mask(size, radius):
    m = Image.new("L", (size, size), 0)
    d = ImageDraw.Draw(m)
    d.rectangle([radius, 0, size - 1 - radius, size - 1], fill=255)
    d.rectangle([0, radius, size - 1, size - 1 - radius], fill=255)
    for cx, cy in [(radius, radius), (size - 1 - radius, radius),
                   (radius, size - 1 - radius), (size - 1 - radius, size - 1 - radius)]:
        d.pieslice([cx - radius, cy - radius, cx + radius, cy + radius], 0, 360, fill=255)
    return m


def circle_mask(size):
    m = Image.new("L", (size, size), 0)
    d = ImageDraw.Draw(m)
    d.ellipse([0, 0, size - 1, size - 1], fill=255)
    return m


def paste_mark(canvas, mark, target_w):
    """把标志等比缩放到 target_w 宽并居中"""
    s = target_w / mark.width
    m = mark.resize((max(int(mark.width * s), 1), max(int(mark.height * s), 1)), Image.LANCZOS)
    canvas.alpha_composite(m, ((canvas.width - m.width) // 2, (canvas.height - m.height) // 2))
    return canvas


def main():
    mark = extract_mark()
    os.makedirs(PUBLIC, exist_ok=True)

    # ---- 桌面图标（1024 主图）----
    tile = Image.new("RGBA", (BASE, BASE), PAPER + (255,))
    paste_mark(tile, mark, int(BASE * MARK_RATIO_TILE))
    mask_r = rounded_mask(BASE, CORNER_RADIUS)
    mask_c = circle_mask(BASE)

    dark = tile.copy()
    dark.putalpha(mask_r)
    round_icon = tile.copy()
    round_icon.putalpha(mask_c)

    def save(img, path):
        img.save(path)
        print("wrote", path)

    save(dark, os.path.join(PUBLIC, "icon-512.png"))
    save(dark, os.path.join(PUBLIC, "icon-192.png"))
    save(dark, os.path.join(PUBLIC, "apple-touch-icon.png"))
    save(dark, os.path.join(ROOT, "docs", "icon-dark.png"))
    save(round_icon, os.path.join(ROOT, "docs", "icon-dark-round.png"))

    # ---- Android 图标 ----
    for dpi, px in MIPMAP_LEGACY:
        d = os.path.join(ANDROID_RES, "mipmap-" + dpi)
        icon = dark.resize((px, px), Image.LANCZOS)
        icon.save(os.path.join(d, "ic_launcher.png"))
        round_icon.resize((px, px), Image.LANCZOS).save(os.path.join(d, "ic_launcher_round.png"))
        print("wrote", d, px)

    # 自适应：前景 = 标志（66% 安全区内），背景 = 纯色，monochrome = 标志轮廓
    fg = Image.new("RGBA", (BASE, BASE), (0, 0, 0, 0))
    paste_mark(fg, mark, int(BASE * MARK_RATIO_ADAPTIVE))
    mono = Image.new("RGBA", (BASE, BASE), (0, 0, 0, 0))
    mono.paste(Image.new("RGBA", mark.size, (255, 255, 255, 255)), (0, 0), mark)
    s = int(BASE * MARK_RATIO_ADAPTIVE) / mono.width
    mono = mono.resize((640, int(mono.height * s)), Image.LANCZOS)
    mono_full = Image.new("RGBA", (BASE, BASE), (0, 0, 0, 0))
    mono_full.alpha_composite(mono, ((BASE - mono.width) // 2, (BASE - mono.height) // 2))

    bg = Image.new("RGB", (BASE, BASE), PAPER)
    for dpi, px in MIPMAP_ADAPTIVE:
        d = os.path.join(ANDROID_RES, "mipmap-" + dpi)
        fg.resize((px, px), Image.LANCZOS).save(os.path.join(d, "ic_launcher_foreground.png"))
        bg.resize((px, px), Image.LANCZOS).save(os.path.join(d, "ic_launcher_background.png"))
        mono_full.resize((px, px), Image.LANCZOS).save(os.path.join(d, "ic_launcher_monochrome.png"))
        print("wrote", d, px)

    print("done")


if __name__ == "__main__":
    main()

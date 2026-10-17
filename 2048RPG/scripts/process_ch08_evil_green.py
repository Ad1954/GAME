#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Process Chapter 8 (Celestial Realm - Dark Divine Remake) with #00FF00 Green Chroma Keying
- Extracts 3 evil supreme deities from horizontal 1x3 sheet:
  - 65536: Celestial Arbiter (Obsidian & Crimson Judgement)
  - 131072: Genesis Core (Obsidian Dodecahedron & Singularity Plasma)
  - 262144: Primordial God (Final Boss, Eclipse Sun & Dying Earth)
- Complete Hole Penetration (100% transparent enclosed holes in wings, halo, sword)
- Green Despill on edges
- Bounding Box centering with 12px padding to 256x256 RGBA PNG
"""

import os
import sys
from PIL import Image, ImageFilter
import numpy as np

def key_green_image(im_path):
    """Accurate Green Chroma Keying (#00FF00) with Hole Penetration & Obsidian Despill"""
    im = Image.open(im_path).convert("RGBA")
    arr = np.array(im, dtype=np.float32)
    r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]
    
    green_lead = g - np.maximum(r, b)
    
    # Pure bright green background detection:
    is_bg = (g > 120.0) & (green_lead > 30.0)
    
    # Transition edges feather (1~2px):
    trans_mask = (g > 50.0) & (green_lead > 10.0) & ~is_bg
    
    alpha = np.ones_like(g, dtype=np.float32) * 255.0
    alpha[is_bg] = 0.0
    alpha[trans_mask] = 128.0
    
    # Despill: on any foreground pixel, clamp G so it doesn't retain green bounce
    g_clean = np.where(~is_bg & (g > np.maximum(r, b)), np.maximum(r, b), g)
    arr[:, :, 1] = g_clean
    arr[:, :, 3] = alpha
    
    # 0.5px gentle blur on alpha to prevent aliasing
    alpha_im = Image.fromarray(alpha.astype(np.uint8), mode='L')
    alpha_blur = alpha_im.filter(ImageFilter.GaussianBlur(0.5))
    
    clean_im = Image.fromarray(np.clip(arr[:, :, :3], 0, 255).astype(np.uint8), mode='RGB').convert('RGBA')
    clean_im.putalpha(alpha_blur)
    return clean_im

def fit_to_256(img, padding=12):
    bbox = img.getbbox()
    if not bbox:
        return Image.new("RGBA", (256, 256), (0, 0, 0, 0))
    cropped = img.crop(bbox)
    max_dim = 256 - padding * 2
    w, h = cropped.size
    ratio = min(max_dim / w, max_dim / h)
    new_w = max(1, int(w * ratio))
    new_h = max(1, int(h * ratio))
    resized = cropped.resize((new_w, new_h), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (256, 256), (0, 0, 0, 0))
    canvas.paste(resized, ((256 - new_w)//2, (256 - new_h)//2), resized)
    return canvas

def process_ch08_evil(sheet_path, output_dir):
    os.makedirs(output_dir, exist_ok=True)
    keyed_sheet = key_green_image(sheet_path)
    w, h = keyed_sheet.size
    
    # Exact gap boundaries measured:
    # Character 1: 0 to 580
    # Character 2: 580 to 800
    # Character 3: 800 to w
    arbiter_raw = keyed_sheet.crop((0, 0, 580, h))
    core_raw = keyed_sheet.crop((580, 0, 800, h))
    god_raw = keyed_sheet.crop((800, 0, w, h))
    
    m65536 = fit_to_256(arbiter_raw, padding=12)
    m131072 = fit_to_256(core_raw, padding=12)
    m262144 = fit_to_256(god_raw, padding=10) # Boss gets 10px padding for imposing scale
    
    m65536.save(os.path.join(output_dir, "monster_ch08_65536.png"))
    m131072.save(os.path.join(output_dir, "monster_ch08_131072.png"))
    m262144.save(os.path.join(output_dir, "monster_ch08_262144.png"))
    print("Chapter 8 dark deities (65536, 131072, 262144) processed successfully!")

if __name__ == "__main__":
    if len(sys.argv) >= 2:
        process_ch08_evil(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else "assets/images/monsters_clay")
    else:
        print("Usage: python process_ch08_evil_green.py <sheet_img> [output_dir]")

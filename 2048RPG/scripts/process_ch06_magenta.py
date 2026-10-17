#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Process Chapter 6 (Obsidian Wasteland) Monsters with #FF00FF Magenta Chroma Keying
- Extracts 4 minions from 2x2 grid image
- Extracts Boss from dedicated image
- Complete Hole Penetration (100% transparent enclosed holes)
- Despill on edges to remove magenta reflections
- Bounding Box centering with 12px padding to 256x256 RGBA PNG
"""

import os
import sys
from PIL import Image, ImageFilter
import numpy as np

def key_magenta_image(im_path):
    """Accurate Magenta Chroma Keying (#FF00FF) with Hole Penetration & Despill"""
    im = Image.open(im_path).convert("RGBA")
    arr = np.array(im, dtype=np.float32)
    r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]
    
    # In magenta chroma key:
    # R is high, B is high, G is low.
    # magenta_lead = min(r, b) - g
    magenta_lead = np.minimum(r, b) - g
    
    thresh_high = 90.0
    thresh_low = 35.0
    
    alpha = np.ones_like(g, dtype=np.float32) * 255.0
    alpha[magenta_lead >= thresh_high] = 0.0
    
    trans_mask = (magenta_lead >= thresh_low) & (magenta_lead < thresh_high)
    ratio = (magenta_lead[trans_mask] - thresh_low) / (thresh_high - thresh_low)
    alpha[trans_mask] = 255.0 * (1.0 - ratio)
    
    # Despill magenta on transition edges:
    # On transition edges, clamp R and B towards G + 10 to eliminate purple/magenta fringe
    r_despilled = np.where(trans_mask, np.minimum(r, g + 15.0), r)
    b_despilled = np.where(trans_mask, np.minimum(b, g + 15.0), b)
    arr[:, :, 0] = r_despilled
    arr[:, :, 2] = b_despilled
    arr[:, :, 3] = alpha
    
    # 0.5px gentle blur on alpha to prevent aliasing
    alpha_im = Image.fromarray(np.clip(alpha, 0, 255).astype(np.uint8), mode='L')
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

def process_ch06(minions_path, boss_path, output_dir):
    os.makedirs(output_dir, exist_ok=True)
    
    if minions_path and os.path.exists(minions_path):
        keyed_sheet = key_magenta_image(minions_path)
        w, h = keyed_sheet.size
        half_w, half_h = w // 2, h // 2
        
        # 2x2 grid:
        # TL: 4096 (Obsidian Golem)
        # TR: 8192 (Obsidian Firekin)
        # BL: 16384 (Obsidian Drake)
        # BR: 32768 (Obsidian Acolyte)
        m4096 = fit_to_256(keyed_sheet.crop((0, 0, half_w, half_h)), padding=12)
        m8192 = fit_to_256(keyed_sheet.crop((half_w, 0, w, half_h)), padding=12)
        m16384 = fit_to_256(keyed_sheet.crop((0, half_h, half_w, h)), padding=12)
        m32768 = fit_to_256(keyed_sheet.crop((half_w, half_h, w, h)), padding=12)
        
        m4096.save(os.path.join(output_dir, "monster_ch06_4096.png"))
        m8192.save(os.path.join(output_dir, "monster_ch06_8192.png"))
        m16384.save(os.path.join(output_dir, "monster_ch06_16384.png"))
        m32768.save(os.path.join(output_dir, "monster_ch06_32768.png"))
        print("Minions 4096, 8192, 16384, 32768 processed successfully!")
        
    if boss_path and os.path.exists(boss_path):
        keyed_boss = key_magenta_image(boss_path)
        # Boss gets slightly tighter padding (10px) for imposing scale
        m65536 = fit_to_256(keyed_boss, padding=10)
        m65536.save(os.path.join(output_dir, "monster_ch06_65536.png"))
        print("Boss 65536 processed successfully!")

if __name__ == "__main__":
    if len(sys.argv) >= 3:
        process_ch06(sys.argv[1], sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else "assets/images/monsters_clay")
    else:
        print("Usage: python process_ch06_magenta.py <minions_img> <boss_img> [output_dir]")

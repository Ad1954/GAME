#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Process Chapter 7 (Void Abyss) Monsters with #00FF00 Green Chroma Keying
- Extracts 4 monsters from 2x2 grid image (16384, 32768, 65536, 131072)
- Complete Hole Penetration (100% transparent enclosed holes between tentacles, horns, runes)
- Green Despill on edges to remove green bounce light
- Bounding Box centering with 12px padding to 256x256 RGBA PNG
"""

import os
import sys
from PIL import Image, ImageFilter
import numpy as np

def key_green_image(im_path):
    """Accurate Green Chroma Keying (#00FF00) with Hole Penetration & Despill"""
    im = Image.open(im_path).convert("RGBA")
    arr = np.array(im, dtype=np.float32)
    r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]
    
    # In green chroma key:
    # G is high, R and B are low.
    # On purple/blue/dark void monsters, G is significantly lower than R and/or B.
    # green_lead = g - max(r, b)
    green_lead = g - np.maximum(r, b)
    
    thresh_high = 30.0
    thresh_low = 5.0
    
    alpha = np.ones_like(g, dtype=np.float32) * 255.0
    alpha[green_lead >= thresh_high] = 0.0
    
    trans_mask = (green_lead >= thresh_low) & (green_lead < thresh_high)
    ratio = (green_lead[trans_mask] - thresh_low) / (thresh_high - thresh_low)
    alpha[trans_mask] = 255.0 * (1.0 - ratio)
    
    # Despill green on transition edges:
    # On transition edges, clamp G towards the average of R and B to eliminate green bounce
    g_despilled = np.where(trans_mask, np.minimum(g, (r + b) * 0.5 + 5.0), g)
    arr[:, :, 1] = g_despilled
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

def process_ch07(sheet_path, output_dir):
    os.makedirs(output_dir, exist_ok=True)
    keyed_sheet = key_green_image(sheet_path)
    w, h = keyed_sheet.size
    half_w, half_h = w // 2, h // 2
    
    # 2x2 grid:
    # TL: 16384 (Void Walker)
    # TR: 32768 (Abyssal Beholder)
    # BL: 65536 (Rift Leviathan)
    # BR: 131072 (Chaos Overlord)
    m16384 = fit_to_256(keyed_sheet.crop((0, 0, half_w, half_h)), padding=12)
    m32768 = fit_to_256(keyed_sheet.crop((half_w, 0, w, half_h)), padding=12)
    m65536 = fit_to_256(keyed_sheet.crop((0, half_h, half_w, h)), padding=12)
    m131072 = fit_to_256(keyed_sheet.crop((half_w, half_h, w, h)), padding=10)
    
    m16384.save(os.path.join(output_dir, "monster_ch07_16384.png"))
    m32768.save(os.path.join(output_dir, "monster_ch07_32768.png"))
    m65536.save(os.path.join(output_dir, "monster_ch07_65536.png"))
    m131072.save(os.path.join(output_dir, "monster_ch07_131072.png"))
    print("Chapter 7 monsters (16384, 32768, 65536, 131072) processed successfully!")

if __name__ == "__main__":
    if len(sys.argv) >= 2:
        process_ch07(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else "assets/images/monsters_clay")
    else:
        print("Usage: python process_ch07_green.py <sheet_img> [output_dir]")

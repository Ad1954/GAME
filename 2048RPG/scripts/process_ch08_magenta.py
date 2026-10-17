#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Process Chapter 8 (Celestial Realm) Monsters with #FF00FF Magenta Chroma Keying
- Extracts 3 supreme deities from horizontal 1x3 sheet:
  - 65536: Celestial Arbiter
  - 131072: Genesis Core
  - 262144: Primordial God (Final Boss)
- Complete Hole Penetration (100% transparent enclosed holes between wings, halos, sword)
- Magenta Despill on edges
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
    # On white/gold/blue deities, G is well-balanced or blue-dominant.
    # magenta_lead = min(r, b) - g
    magenta_lead = np.minimum(r, b) - g
    
    thresh_high = 75.0
    thresh_low = 30.0
    
    alpha = np.ones_like(g, dtype=np.float32) * 255.0
    alpha[magenta_lead >= thresh_high] = 0.0
    
    trans_mask = (magenta_lead >= thresh_low) & (magenta_lead < thresh_high)
    ratio = (magenta_lead[trans_mask] - thresh_low) / (thresh_high - thresh_low)
    alpha[trans_mask] = 255.0 * (1.0 - ratio)
    
    # Despill magenta on transition edges:
    # On transition edges, clamp R and B towards G + 15 to eliminate purple fringe
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

def process_ch08(sheet_path, output_dir):
    os.makedirs(output_dir, exist_ok=True)
    keyed_sheet = key_magenta_image(sheet_path)
    w, h = keyed_sheet.size
    
    # Exact gap boundaries:
    # Character 1: 0 to 570
    # Character 2: 570 to 830
    # Character 3: 830 to w
    arbiter_raw = keyed_sheet.crop((0, 0, 570, h))
    core_raw = keyed_sheet.crop((570, 0, 830, h))
    god_raw = keyed_sheet.crop((830, 0, w, h))
    
    m65536 = fit_to_256(arbiter_raw, padding=12)
    m131072 = fit_to_256(core_raw, padding=12)
    m262144 = fit_to_256(god_raw, padding=10) # Boss gets 10px padding for imposing scale
    
    m65536.save(os.path.join(output_dir, "monster_ch08_65536.png"))
    m131072.save(os.path.join(output_dir, "monster_ch08_131072.png"))
    m262144.save(os.path.join(output_dir, "monster_ch08_262144.png"))
    print("Chapter 8 deities (65536, 131072, 262144) processed successfully!")

if __name__ == "__main__":
    if len(sys.argv) >= 2:
        process_ch08(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else "assets/images/monsters_clay")
    else:
        print("Usage: python process_ch08_magenta.py <sheet_img> [output_dir]")

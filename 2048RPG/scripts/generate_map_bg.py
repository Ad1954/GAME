import os
import math
from PIL import Image, ImageDraw, ImageFilter

def create_procedural_adventure_map():
    width = 540
    height = 2700
    img = Image.new("RGBA", (width, height), (9, 13, 22, 255))
    draw = ImageDraw.Draw(img)

    # Biome vertical boundaries:
    # 0 ~ 900: Twilight Abyss / Mystic Mountain (Dark Purple / Mystic Cyan)
    # 900 ~ 1800: Arid Desert Canyon (Warm Golden Ochre / Sandstone Terracotta)
    # 1800 ~ 2700: Verdant Woodland Plains (Lush Emerald Grass / Pine Forest)

    for y in range(height):
        ratio = y / height
        if y < 900:
            # Top: Twilight Abyss (0 ~ 900)
            t = y / 900.0
            r = int(18 + t * 45)
            g = int(12 + t * 35)
            b = int(48 + t * 25)
        elif y < 1800:
            # Middle: Desert Canyon (900 ~ 1800)
            t = (y - 900) / 900.0
            r = int(63 + (1 - abs(t - 0.5) * 2) * 55 + t * 10)
            g = int(47 + (1 - abs(t - 0.5) * 2) * 35 - t * 10)
            b = int(73 - t * 45)
        else:
            # Bottom: Verdant Woodland (1800 ~ 2700)
            t = (y - 1800) / 900.0
            r = int(22 + (1 - t) * 25)
            g = int(58 + t * 25)
            b = int(35 + (1 - t) * 10)

        draw.line([(0, y), (width, y)], fill=(r, g, b, 255))

    # Add procedural natural terrain textures (contours, patches, biomes)
    import random
    random.seed(42)

    # 1. Woodland Bottom (1800 ~ 2700)
    for _ in range(120):
        cx = random.randint(30, width - 30)
        cy = random.randint(1820, 2680)
        rad = random.randint(25, 75)
        g_tint = random.randint(65, 105)
        draw.ellipse([cx - rad, cy - rad * 0.6, cx + rad, cy + rad * 0.6], fill=(18, g_tint, 32, 45))

    # Woodland Trees & Camps
    for _ in range(45):
        tx = random.randint(20, width - 20)
        ty = random.randint(1840, 2660)
        size = random.randint(12, 22)
        # Tree shadow
        draw.ellipse([tx - size, ty, tx + size, ty + size * 0.5], fill=(10, 30, 15, 80))
        # Tree cone
        draw.polygon([(tx, ty - size * 2), (tx - size, ty + size * 0.2), (tx + size, ty + size * 0.2)], fill=(15, random.randint(70, 110), 35, 180))

    # 2. Desert Canyon Middle (900 ~ 1800)
    for _ in range(100):
        cx = random.randint(30, width - 30)
        cy = random.randint(920, 1780)
        rad = random.randint(30, 85)
        draw.ellipse([cx - rad, cy - rad * 0.5, cx + rad, cy + rad * 0.5], fill=(random.randint(120, 160), random.randint(80, 110), random.randint(25, 45), 40))

    # Sandstone Rocks
    for _ in range(40):
        rx = random.randint(25, width - 25)
        ry = random.randint(930, 1770)
        rw = random.randint(15, 28)
        draw.ellipse([rx - rw, ry, rx + rw, ry + rw * 0.4], fill=(60, 35, 15, 70))
        draw.polygon([(rx - rw, ry), (rx, ry - rw * 1.4), (rx + rw, ry)], fill=(145, 95, 45, 200))

    # 3. Twilight Abyss Top (0 ~ 900)
    for _ in range(80):
        cx = random.randint(30, width - 30)
        cy = random.randint(30, 880)
        rad = random.randint(35, 90)
        draw.ellipse([cx - rad, cy - rad * 0.7, cx + rad, cy + rad * 0.7], fill=(random.randint(40, 75), random.randint(20, 45), random.randint(90, 140), 35))

    # Mystic Crystals / Obelisks
    for _ in range(35):
        mx = random.randint(30, width - 30)
        my = random.randint(40, 860)
        mw = random.randint(8, 16)
        draw.polygon([(mx, my - mw * 2.2), (mx - mw, my + mw * 0.2), (mx + mw, my + mw * 0.2)], fill=(56, 189, 248, 160))

    # Soft Gaussian Blur for painterly game terrain effect
    img = img.filter(ImageFilter.GaussianBlur(radius=3.5))

    out_dir = r"c:\Antigravity\2048RPG\Commercial_Edition\assets\images"
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, "map_world_background.png")
    img.save(out_path, "PNG")
    print(f"Generated map background at: {out_path} ({width}x{height})")

if __name__ == "__main__":
    create_procedural_adventure_map()

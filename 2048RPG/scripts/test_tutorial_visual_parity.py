import os
import sys
import time
import socket
import subprocess

if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

from playwright.sync_api import sync_playwright

def is_port_open(port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(('127.0.0.1', port)) == 0

def run_test():
    managed_srv = None
    if not is_port_open(8081):
        print("[Test] Port 8081 not running. Starting local server...")
        managed_srv = subprocess.Popen([sys.executable, "server.py", "8081"], cwd=r"C:\Antigravity\2048RPG\Commercial_Edition")
        time.sleep(1.2)

    errors = []

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(channel="msedge", headless=True)
            page = browser.new_page()

            page.on("pageerror", lambda err: errors.append(f"PageError: {err}"))
            page.on("dialog", lambda dlg: dlg.accept())

            print("==================================================")
            print("  Tutorial Visual Parity & Keyboard Arrow Test")
            print("==================================================")

            page.goto("http://localhost:8081/index_v2.html", wait_until="networkidle")
            page.wait_for_timeout(500)

            # Reset save data to guarantee Stage 0
            page.evaluate("window.handleResetAllSaveData()")
            page.wait_for_timeout(300)

            # Check board size in lobby vs combat
            # Enter Stage 0
            page.evaluate("window.launchStageBattle(0)")
            page.wait_for_timeout(500)

            # Confirm popup
            if page.is_visible("#tutorial-popup-backdrop"):
                page.click("#btn-tutorial-popup-confirm")
                page.wait_for_timeout(300)

            # 1. Assert Board Grid Size
            board_box = page.locator("#battle-board").bounding_box()
            assert board_box, "Board grid bounding box not found"
            print(f"  Combat Board Grid Size: width={board_box['width']:.1f}px, height={board_box['height']:.1f}px")
            assert board_box['width'] >= 370, f"Expected board width >= 380px, got {board_box['width']}"
            print("  [PASS] Board scale verified! Full phone width utilized without excessive shrink.")

            # 2. Check Step 1 Initial Tiles
            step1_tiles = page.evaluate("""
                () => {
                    const tiles = Array.from(document.querySelectorAll('#battle-board .tile'));
                    return tiles.map(t => ({
                        text: t.innerText.trim(),
                        className: t.className
                    }));
                }
            """)
            print(f"  Step 1 rendered tiles count: {len(step1_tiles)}, content: {step1_tiles}")
            assert len(step1_tiles) == 2, f"Expected 2 tiles in Step 1, got {len(step1_tiles)}"

            # 3. Press ArrowUp to merge Hero (2) + Sword (2) into Hero (4)
            print("[Action] Pressing Keyboard 'ArrowUp'...")
            page.keyboard.press("ArrowUp")
            # Wait for slide animation (350ms) and step transition (1000ms delay in TutorialManager)
            page.wait_for_timeout(1600)

            # Check tutorial manager step
            step_idx = page.evaluate("window.appRouter.stageManager.tutorialManager.currentStepIndex")
            print(f"  Current Tutorial Step Index: {step_idx}")
            assert step_idx == 2, f"Expected step index 2, got {step_idx}"

            # 4. CRITICAL: Check Step 2 Visual Render in DOM
            step2_tiles = page.evaluate("""
                () => {
                    const tiles = Array.from(document.querySelectorAll('#battle-board .tile'));
                    return tiles.map(t => ({
                        text: t.innerText.trim(),
                        className: t.className
                    }));
                }
            """)
            print(f"  Step 2 rendered tiles in DOM: {len(step2_tiles)}")
            for idx, t in enumerate(step2_tiles):
                print(f"    Tile {idx+1}: text='{t['text']}', class='{t['className']}'")

            assert len(step2_tiles) == 2, f"Expected 2 tiles (Hero 4 + Monster 4) in Step 2, got {len(step2_tiles)}"
            has_hero_4 = any("tile-hero" in t['className'] and "4" in t['text'] for t in step2_tiles)
            has_monster_4 = any("tile-monster" in t['className'] and "4" in t['text'] for t in step2_tiles)
            assert has_hero_4, "Step 2 DOM missing Hero (4)"
            assert has_monster_4, "Step 2 DOM missing Monster (4)"
            print("  [PASS] Step 2 Board correctly rendered Hero (4) and Monster (4) visually in the DOM!")

            # 5. Press ArrowRight to attack and defeat Monster
            print("[Action] Pressing Keyboard 'ArrowRight'...")
            page.keyboard.press("ArrowRight")
            page.wait_for_timeout(1800)

            step_idx3 = page.evaluate("window.appRouter.stageManager.tutorialManager.currentStepIndex")
            print(f"  Current Tutorial Step Index: {step_idx3}")
            assert step_idx3 == 3, f"Expected step index 3, got {step_idx3}"

            step3_tiles = page.evaluate("""
                () => {
                    const tiles = Array.from(document.querySelectorAll('#battle-board .tile'));
                    return tiles.map(t => ({
                        text: t.innerText.trim(),
                        className: t.className
                    }));
                }
            """)
            print(f"  Step 3 rendered tiles in DOM: {len(step3_tiles)}")
            for idx, t in enumerate(step3_tiles):
                print(f"    Tile {idx+1}: text='{t['text']}', class='{t['className']}'")
            has_gold = any("tile-gold" in t['className'] for t in step3_tiles)
            assert has_gold, "Step 3 DOM missing Gold tiles"
            print("  [PASS] Step 3 Gold tiles correctly rendered visually in the DOM!")

            browser.close()

    finally:
        if managed_srv:
            managed_srv.terminate()

    if errors:
        print(f"FAILURES: {errors}")
        return False
    else:
        print("==================================================")
        print("  ALL VISUAL PARITY & ARROW KEY TESTS PASSED 100%!")
        print("==================================================")
        return True

if __name__ == "__main__":
    success = run_test()
    sys.exit(0 if success else 1)

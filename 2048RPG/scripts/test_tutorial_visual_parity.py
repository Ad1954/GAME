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
            print("  Full Tutorial Verification (C-STORY-144)")
            print("==================================================")

            page.goto("http://localhost:8081/index_v2.html", wait_until="networkidle")
            page.wait_for_timeout(500)

            # Reset save data to guarantee Stage 0
            page.evaluate("window.handleResetAllSaveData()")
            page.wait_for_timeout(300)

            # Enter Stage 0 Combat
            page.evaluate("window.launchStageBattle(0)")
            page.wait_for_timeout(500)

            # 1. Assert Item Count Badges show '0' and are not collapsed
            undo_info = page.evaluate("""() => {
                const el = document.getElementById('item-count-undo');
                const hammer = document.getElementById('item-count-hammer');
                const snipe = document.getElementById('item-count-snipe');
                const rect = el.getBoundingClientRect();
                return {
                    undoText: el.innerText.trim(),
                    hammerText: hammer.innerText.trim(),
                    snipeText: snipe.innerText.trim(),
                    height: rect.height,
                    width: rect.width
                };
            }""")
            print(f"  Item Count Badges Info: {undo_info}")
            assert undo_info['undoText'] == '0', f"Expected undo count '0', got {undo_info['undoText']}"
            assert undo_info['hammerText'] == '0', f"Expected hammer count '0', got {undo_info['hammerText']}"
            assert undo_info['snipeText'] == '0', f"Expected snipe count '0', got {undo_info['snipeText']}"
            assert undo_info['height'] >= 14, f"Expected badge height >= 14px, got {undo_info['height']}"
            print("  [PASS] Item count badges correctly display '0' with solid height!")

            # Confirm popup
            if page.is_visible("#tutorial-popup-backdrop"):
                page.click("#btn-tutorial-popup-confirm")
                page.wait_for_timeout(300)

            # 2. Assert Board Grid Size & Tutorial Dialogue Banner Geometry
            banner_geo = page.evaluate("""() => {
                const banner = document.querySelector('.tutorial-dialogue-banner');
                const board = document.querySelector('#battle-board');
                const bannerRect = banner.getBoundingClientRect();
                const boardRect = board.getBoundingClientRect();
                return {
                    bannerBottom: bannerRect.bottom,
                    boardTop: boardRect.top,
                    boardWidth: boardRect.width,
                    pointerEvents: window.getComputedStyle(banner).pointerEvents
                };
            }""")
            print(f"  Banner & Board Geometry: bannerBottom={banner_geo['bannerBottom']:.1f}px, boardTop={banner_geo['boardTop']:.1f}px, boardWidth={banner_geo['boardWidth']:.1f}px")
            assert banner_geo['boardWidth'] >= 370, f"Expected board width >= 370px, got {banner_geo['boardWidth']}"
            assert banner_geo['bannerBottom'] <= banner_geo['boardTop'] + 5, f"Banner overlaps board! bottom={banner_geo['bannerBottom']} > boardTop={banner_geo['boardTop']}"
            assert banner_geo['pointerEvents'] == 'none', f"Expected banner pointer-events: none, got {banner_geo['pointerEvents']}"
            print("  [PASS] Dialogue banner is compact and does NOT block row 0 of board!")

            # 3. Check Step 1 Initial Tiles
            step1_tiles = page.evaluate("""() => {
                return Array.from(document.querySelectorAll('#battle-board .tile')).map(t => ({
                    text: t.innerText.trim(),
                    className: t.className
                }));
            }""")
            print(f"  Step 1 rendered tiles count: {len(step1_tiles)}")
            assert len(step1_tiles) == 2, f"Expected 2 tiles in Step 1, got {len(step1_tiles)}"

            # 4. Press ArrowUp to merge Hero (2) + Sword (2) into Hero (4)
            print("[Step 1 -> Step 2] Pressing Keyboard 'ArrowUp'...")
            page.keyboard.press("ArrowUp")
            page.wait_for_timeout(1600)

            step_idx2 = page.evaluate("window.appRouter.stageManager.tutorialManager.currentStepIndex")
            print(f"  Current Tutorial Step Index: {step_idx2}")
            assert step_idx2 == 2, f"Expected step index 2, got {step_idx2}"

            # Step 2 DOM Check
            step2_tiles = page.evaluate("""() => {
                return Array.from(document.querySelectorAll('#battle-board .tile')).map(t => ({
                    text: t.innerText.trim(),
                    className: t.className
                }));
            }""")
            has_hero_4 = any("tile-hero" in t['className'] and "4" in t['text'] for t in step2_tiles)
            has_monster_4 = any("tile-monster" in t['className'] and "4" in t['text'] for t in step2_tiles)
            assert has_hero_4 and has_monster_4, "Step 2 DOM missing Hero (4) or Monster (4)"
            print("  [PASS] Step 2 rendered Hero (4) and Monster (4) correctly!")

            # 5. Press ArrowRight to attack and defeat Monster
            print("[Step 2 -> Step 3] Pressing Keyboard 'ArrowRight'...")
            page.keyboard.press("ArrowRight")
            page.wait_for_timeout(1800)

            # Confirm popup for Step 3 if visible
            if page.is_visible("#tutorial-popup-backdrop"):
                page.click("#btn-tutorial-popup-confirm")
                page.wait_for_timeout(300)

            step_idx3 = page.evaluate("window.appRouter.stageManager.tutorialManager.currentStepIndex")
            print(f"  Current Tutorial Step Index: {step_idx3}")
            assert step_idx3 == 3, f"Expected step index 3, got {step_idx3}"

            # 6. Step 3 Phase 1: Merge Gold Tiles into 8 by pressing ArrowLeft
            print("[Step 3 Phase 1] Pressing Keyboard 'ArrowLeft' to merge gold into 8...")
            page.keyboard.press("ArrowLeft")
            page.wait_for_timeout(1800)

            sub_phase = page.evaluate("window.appRouter.stageManager.tutorialManager.subStepPhase")
            print(f"  Step 3 Sub-Step Phase: {sub_phase}")
            assert sub_phase == 2, f"Expected subStepPhase 2 after gold merge, got {sub_phase}"

            # 7. Step 3 Phase 2: Click the 8-value Gold Tile to Cash Out
            print("[Step 3 Phase 2] Testing Gold Tile Click to Cash Out...")
            gold_tile = page.locator("#battle-board .tile-gold")
            assert gold_tile.count() > 0, "No gold tile found on board in Step 3"
            
            gold_before = page.evaluate("window.appRouter.stageManager.gold")
            print(f"  Gold before click: {gold_before}")

            # Click directly on the gold tile!
            gold_tile.first.click()
            page.wait_for_timeout(800)

            gold_after = page.evaluate("window.appRouter.stageManager.gold")
            print(f"  Gold after click: {gold_after}")
            assert gold_after >= gold_before + 8, f"Gold did not increase! before={gold_before}, after={gold_after}"
            print("  [PASS] Gold Tile Click successfully cashed out gold into treasury!")

            # Step should advance to Step 4 (Boss battle)
            step_idx4 = page.evaluate("window.appRouter.stageManager.tutorialManager.currentStepIndex")
            print(f"  Step after gold cash-out: {step_idx4}")
            assert step_idx4 == 4, f"Expected step index 4 after gold cash-out, got {step_idx4}"
            print("  [PASS] Tutorial successfully advanced to Step 4 after clicking gold tile!")

            browser.close()

    finally:
        if managed_srv:
            managed_srv.terminate()

    if errors:
        print(f"FAILURES: {errors}")
        return False
    else:
        print("==================================================")
        print("  ALL C-STORY-144 VERIFICATIONS PASSED 100%!")
        print("==================================================")
        return True

if __name__ == "__main__":
    success = run_test()
    sys.exit(0 if success else 1)

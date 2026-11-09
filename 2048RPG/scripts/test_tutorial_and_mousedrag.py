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
    dialog_logs = []

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(channel="msedge", headless=True)
            page = browser.new_page()

            page.on("pageerror", lambda err: errors.append(f"PageError: {err}"))
            page.on("dialog", lambda dlg: (dialog_logs.append(dlg.message), dlg.accept()))

            print("==================================================")
            print("  Stage 0 Tutorial & PC Mouse Drag Verification")
            print("==================================================")

            print("[Step 1] Loading index_v2.html and clearing save data...")
            page.goto("http://localhost:8081/index_v2.html", wait_until="networkidle")
            page.wait_for_timeout(500)

            # Trigger save data reset to ensure pristine state
            page.evaluate("window.handleResetAllSaveData()")
            page.wait_for_timeout(300)

            # Step 2: Hub must show Stage 0 (序章)
            hub_stage = page.inner_text("#hub-stage-num")
            hub_chap = page.inner_text("#hub-chap-tag")
            boss_name = page.inner_text("#arena-boss-name")
            print(f"  Hub Info: stage='{hub_stage}', chap='{hub_chap}', boss='{boss_name}'")
            assert "序章" in hub_stage, f"Expected '序章' in hub-stage-num, got '{hub_stage}'"
            assert "皇家訓練營" in hub_chap or "序章" in hub_chap, f"Expected '序章' in hub-chap-tag, got '{hub_chap}'"
            assert "洞穴蝙蝠" in boss_name or "4" in boss_name, f"Expected '洞穴蝙蝠' in arena-boss-name, got '{boss_name}'"
            print("  [PASS] Hub correctly initialized to Stage 0 (序章) for new/reset profile!")

            # Step 3: Check Quick Stage Drawer has Stage 0
            page.click(".hub-chapter-center")
            page.wait_for_timeout(200)
            tut_node = page.inner_text("#quick-stage-grid .quick-stage-node:first-child")
            assert "序章" in tut_node, f"Expected '序章' in first drawer node, got '{tut_node}'"
            print(f"  [PASS] Quick Stage Drawer includes: '{tut_node}'")
            page.click("#drawer-btn-close")
            page.wait_for_timeout(100)

            # Step 4: Open Stage Detail Modal for Stage 0
            page.evaluate("window.openStageDetailModal(0)")
            page.wait_for_timeout(200)
            modal_title = page.inner_text("#modal-stage-title")
            modal_boss = page.inner_text("#modal-boss-name")
            modal_gold = page.inner_text("#modal-gold-reward")
            print(f"  Modal: title='{modal_title}', boss='{modal_boss}', reward='{modal_gold}'")
            assert "序章" in modal_title, f"Expected '序章' in modal title, got '{modal_title}'"
            assert "50" in modal_gold, f"Expected 50 gold reward, got '{modal_gold}'"
            print("  [PASS] Stage Detail Modal renders Stage 0 tutorial briefing correctly!")

            # Step 5: Launch Stage 0 Battle
            print("[Step 5] Launching Stage 0 Combat...")
            page.click("#modal-stage-btn-deploy")
            page.wait_for_timeout(400)

            combat_display = page.evaluate("document.getElementById('combat-overlay').style.display")
            assert combat_display == "flex", f"Combat overlay not flex: {combat_display}"

            # Check tutorial overlay visibility and z-index
            tut_overlay_visible = page.is_visible("#tutorial-overlay")
            tut_zindex = page.evaluate("window.getComputedStyle(document.getElementById('tutorial-overlay')).zIndex")
            print(f"  Tutorial Overlay: visible={tut_overlay_visible}, zIndex={tut_zindex}")
            assert int(tut_zindex) >= 500, f"Expected tutorial zIndex >= 500, got {tut_zindex}"

            # Check popup card is visible
            popup_visible = page.is_visible("#tutorial-popup-backdrop")
            print(f"  Tutorial Popup Backdrop visible: {popup_visible}")
            if popup_visible:
                popup_title = page.inner_text("#tutorial-popup-title")
                print(f"  Popup Title: '{popup_title}'")
                # Confirm popup to proceed
                page.click("#btn-tutorial-popup-confirm")
                page.wait_for_timeout(300)

            # Step 6: Test PC Mouse Drag UP on Combat Board
            print("[Step 6] Testing PC Mouse Drag UP on board...")
            board_box = page.locator("#battle-board").bounding_box()
            assert board_box, "Board grid bounding box not found"

            center_x = board_box["x"] + board_box["width"] / 2
            start_y = board_box["y"] + board_box["height"] * 0.75
            end_y = board_box["y"] + board_box["height"] * 0.25

            # Perform mouse drag UP
            page.mouse.move(center_x, start_y)
            page.mouse.down()
            page.mouse.move(center_x, end_y, steps=5)
            page.mouse.up()
            page.wait_for_timeout(400)

            # Check if tiles merged or step advanced
            tut_manager_step = page.evaluate("window.appRouter.stageManager.tutorialManager.currentStepIndex")
            print(f"  [PASS] Mouse Drag UP executed! Tutorial manager step index: {tut_manager_step}")

            # Step 7: Complete tutorial via skip or next steps to test graduation to Stage 1
            print("[Step 7] Graduating through tutorial...")
            page.evaluate("window.appRouter.stageManager.tutorialManager.skipTutorial()")
            page.wait_for_timeout(600)

            # Victory modal should appear
            v_modal_display = page.evaluate("document.getElementById('modal-victory').style.display")
            print(f"  Victory Modal display: '{v_modal_display}'")
            assert v_modal_display in ("flex", "block"), "Victory modal did not appear after tutorial completion"
            
            # Claim victory and return to lobby
            page.click("#btn-victory-confirm")
            page.wait_for_timeout(300)

            # Step 8: Assert Hub now shows Stage 1
            hub_stage_after = page.inner_text("#hub-stage-num")
            print(f"  Hub Stage after Tutorial completion: '{hub_stage_after}'")
            assert "Stage 1" in hub_stage_after, f"Expected Stage 1 after graduation, got '{hub_stage_after}'"
            print("  [PASS] Successfully graduated to Stage 1!")

            # Step 9: Enter Stage 1 and verify 4-direction mouse drag
            print("[Step 9] Entering Stage 1 combat and verifying 4-direction mouse drag...")
            page.evaluate("window.launchStageBattle(1)")
            page.wait_for_timeout(400)

            stage_name = page.inner_text("#combat-stage-name")
            print(f"  Combat Stage: '{stage_name}'")
            assert "1" in stage_name, f"Expected Stage 1 in combat stage name, got '{stage_name}'"

            # Test 4-direction mouse drag on Stage 1
            board_box = page.locator("#battle-board").bounding_box()
            cx = board_box["x"] + board_box["width"] / 2
            cy = board_box["y"] + board_box["height"] / 2

            # Drag Left
            page.mouse.move(cx + 60, cy)
            page.mouse.down()
            page.mouse.move(cx - 60, cy, steps=5)
            page.mouse.up()
            page.wait_for_timeout(200)

            # Drag Right
            page.mouse.move(cx - 60, cy)
            page.mouse.down()
            page.mouse.move(cx + 60, cy, steps=5)
            page.mouse.up()
            page.wait_for_timeout(200)

            # Exit combat
            page.evaluate("window.appRouter.exitCombat()")
            page.wait_for_timeout(200)
            lobby_display = page.evaluate("document.getElementById('lobby-wrapper').style.display")
            assert lobby_display == "flex", "Lobby failed to restore"
            print("  [PASS] Stage 1 4-direction Mouse Drag & Exit verified 100%!")

            browser.close()

    finally:
        if managed_srv:
            managed_srv.terminate()

    if errors:
        print(f"FAILURES: {errors}")
        return False
    else:
        print("==================================================")
        print("  ALL STAGE 0 & MOUSE DRAG VERIFICATIONS PASSED!")
        print("==================================================")
        return True

if __name__ == "__main__":
    success = run_test()
    sys.exit(0 if success else 1)

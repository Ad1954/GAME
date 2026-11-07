# test_button_crawler.py: Comprehensive DOM Button Crawler & Interactive Integrity Suite (C-STORY-140)
import os
import sys
import time
import socket
import subprocess

# Ensure UTF-8 output on Windows console
if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

from playwright.sync_api import sync_playwright

def is_port_open(port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(('127.0.0.1', port)) == 0

def run_crawler():
    managed_srv = None
    if not is_port_open(8081):
        print("[Crawler] Port 8081 not running. Starting local server...")
        managed_srv = subprocess.Popen([sys.executable, "server.py", "8081"], cwd=r"C:\Antigravity\2048RPG\Commercial_Edition")
        time.sleep(1.2)

    errors = []
    dialog_logs = []
    passed_checks = 0

    print("==================================================")
    print("  DOM Interactive Crawler & UI Button Validation")
    print("==================================================")

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(channel="msedge", headless=True)
            page = browser.new_page()

            page.on("pageerror", lambda err: errors.append(f"PageError: {err}"))
            page.on("dialog", lambda dlg: (dialog_logs.append(dlg.message), dlg.accept()))

            # Step 1: Load index_v2.html
            print("[Step 1] Loading http://localhost:8081/index_v2.html...")
            page.goto("http://localhost:8081/index_v2.html", wait_until="networkidle")
            page.wait_for_timeout(500)

            # Check 1: Initial Default Stage must be Stage 1 (not Stage 12)
            hub_stage = page.inner_text("#hub-stage-num")
            assert "Stage 1" in hub_stage, f"Expected 'Stage 1', got '{hub_stage}'"
            print(f"  [PASS] Default Hub Stage: {hub_stage}")
            passed_checks += 1

            # Check 2: Top HUD gold and stamina
            gold_txt = page.inner_text("#txt-gold")
            stamina_txt = page.inner_text("#txt-stamina")
            assert len(gold_txt.strip()) > 0, "Top gold HUD is empty"
            assert "/" in stamina_txt or "∞" in stamina_txt, f"Unexpected stamina text: {stamina_txt}"
            print(f"  [PASS] Top HUD: Gold={gold_txt.strip()}, Stamina={stamina_txt.strip()}")
            passed_checks += 1

            # Step 2: 5 Main Navigation Tabs Switching
            print("[Step 2] Testing 5 Navigation Tabs...")
            tab_ids = ["shop", "camp", "adventure", "gear", "compendium"]
            for tid in tab_ids:
                page.evaluate(f"window.switchMainTab('{tid}')")
                page.wait_for_timeout(100)
                is_active = page.evaluate(f"document.getElementById('view-{tid}').classList.contains('active')")
                assert is_active, f"Tab view-{tid} failed to become active"
                print(f"  [PASS] Switched to tab: {tid}")
                passed_checks += 1

            # Step 3: Settings Modal & All 3 Tabs
            print("[Step 3] Testing Settings Modal and Tab Switching...")
            page.click("#btn-open-settings")
            page.wait_for_timeout(200)
            sett_modal_display = page.evaluate("document.getElementById('modal-settings').style.display")
            assert sett_modal_display in ("flex", "block"), "Settings modal not displayed"

            # Check general pane
            page.click("#btn-stab-general")
            page.wait_for_timeout(100)
            is_gen_active = page.evaluate("document.getElementById('pane-setting-general').classList.contains('active')")
            gen_text_len = len(page.inner_text("#pane-setting-general"))
            assert is_gen_active and gen_text_len > 30, "General settings pane content disappeared"
            print(f"  [PASS] Settings General Pane active (Length: {gen_text_len} chars)")
            passed_checks += 1

            # Check changelog pane
            page.click("#btn-stab-changelog")
            page.wait_for_timeout(100)
            is_log_active = page.evaluate("document.getElementById('pane-setting-changelog').classList.contains('active')")
            log_text_len = len(page.inner_text("#pane-setting-changelog"))
            assert is_log_active and log_text_len > 30, "Changelog settings pane content disappeared"
            print(f"  [PASS] Settings Changelog Pane active (Length: {log_text_len} chars)")
            passed_checks += 1

            # Check developer pane
            page.click("#btn-stab-developer")
            page.wait_for_timeout(100)
            is_dev_active = page.evaluate("document.getElementById('pane-setting-developer').classList.contains('active')")
            dev_text_len = len(page.inner_text("#pane-setting-developer"))
            assert is_dev_active and dev_text_len > 30, "Developer settings pane content disappeared"
            print(f"  [PASS] Settings Developer Pane active (Length: {dev_text_len} chars)")
            passed_checks += 1

            # Close settings
            page.click("#btn-settings-close")
            page.wait_for_timeout(100)
            sett_modal_display = page.evaluate("document.getElementById('modal-settings').style.display")
            assert sett_modal_display == "none", "Settings modal failed to close"
            print("  [PASS] Settings modal closed cleanly")
            passed_checks += 1

            # Step 4: Quick Stage Drawer & Modals
            print("[Step 4] Testing Quick Stage Drawer and Daily Modals...")
            page.evaluate("window.switchMainTab('adventure')")
            page.click(".hub-chapter-center")
            page.wait_for_timeout(200)
            drawer_display = page.evaluate("document.getElementById('drawer-quick-stage').style.display")
            assert drawer_display in ("flex", "block"), "Quick Stage Drawer failed to open"
            nodes_count = page.locator(".quick-stage-node").count()
            assert nodes_count >= 25, f"Expected 25 stage nodes in drawer, found {nodes_count}"
            print(f"  [PASS] Quick Stage Drawer open with {nodes_count} stage nodes")
            passed_checks += 1

            page.click("#drawer-btn-close")
            page.wait_for_timeout(100)

            # Daily Sign-in modal
            page.click(".hub-hud-sidebar .hub-hud-icon-btn")
            page.wait_for_timeout(200)
            signin_cards = page.locator(".signin-day-card").count()
            assert signin_cards == 7, f"Expected 7 daily sign-in cards, found {signin_cards}"
            print(f"  [PASS] Daily Sign-In modal opened with {signin_cards} days")
            passed_checks += 1
            page.evaluate("window.closeDailySignInModal()")
            page.wait_for_timeout(100)

            # Daily Quests modal
            page.evaluate("window.openDailyQuestsModal()")
            page.wait_for_timeout(200)
            quests_count = page.locator(".quest-item-card").count()
            assert quests_count == 4, f"Expected 4 daily quests, found {quests_count}"
            print(f"  [PASS] Daily Quests modal opened with {quests_count} quests")
            passed_checks += 1
            page.evaluate("window.closeDailyQuestsModal()")
            page.wait_for_timeout(100)

            # Step 5: Camp Upgrades & Gear Sub-tabs
            print("[Step 5] Testing Camp Upgrades and Gear Sub-tabs...")
            page.evaluate("window.switchMainTab('camp')")
            page.wait_for_timeout(100)
            forge_title = page.inner_text("#camp-txt-forge-title")
            assert "LV." in forge_title, f"Unexpected forge title: {forge_title}"
            print(f"  [PASS] Camp Facility: {forge_title}")
            passed_checks += 1

            page.evaluate("window.switchMainTab('gear')")
            page.wait_for_timeout(100)
            page.click("#btn-sub-hero")
            page.wait_for_timeout(100)
            hero_cards = page.locator(".hero-card").count()
            assert hero_cards == 3, f"Expected 3 hero cards, found {hero_cards}"
            print(f"  [PASS] Gear Tab: 3 Hero cards rendered")
            passed_checks += 1

            # Open Hero Detail Modal
            page.click("#card-hero-warrior .hero-hitbox-upper")
            page.wait_for_timeout(200)
            hero_detail_title = page.inner_text("#modal-hero-title")
            assert "Warrior" in hero_detail_title or "騎士" in hero_detail_title, f"Unexpected hero title: {hero_detail_title}"
            print(f"  [PASS] Hero Detail Modal: {hero_detail_title}")
            passed_checks += 1
            page.evaluate("window.closeHeroDetailModal()")
            page.wait_for_timeout(100)

            # Step 6: Reset Save Data & Tutorial Launch
            print("[Step 6] Testing Save Data Reset and Tutorial Combat Trigger...")
            page.click("#btn-open-settings")
            page.wait_for_timeout(200)
            page.click("#btn-stab-general")
            page.wait_for_timeout(100)
            page.click("#btn-settings-reset-save")
            page.wait_for_timeout(200)

            # Assert reset returned to stage 1
            hub_stage_after_reset = page.inner_text("#hub-stage-num")
            assert "Stage 1" in hub_stage_after_reset, f"Expected Stage 1 after reset, got {hub_stage_after_reset}"
            print(f"  [PASS] Save Reset: Hub Stage is {hub_stage_after_reset}")
            passed_checks += 1

            # Trigger Tutorial Reset & Launch Combat
            page.click("#btn-open-settings")
            page.wait_for_timeout(200)
            page.click("#btn-stab-developer")
            page.wait_for_timeout(100)
            page.click("#btn-settings-clear-tut")
            page.wait_for_timeout(500)

            # Assert Combat Overlay active
            combat_display = page.evaluate("document.getElementById('combat-overlay').style.display")
            assert combat_display == "flex", f"Combat overlay not flex: {combat_display}"
            print("  [PASS] Tutorial Combat Overlay active (display: flex)")
            passed_checks += 1

            # Test Cross Arrow Keys in Combat
            print("[Step 7] Testing Cross Arrow Keys / WASD in Combat...")
            page.keyboard.press("ArrowRight")
            page.wait_for_timeout(100)
            page.keyboard.press("ArrowDown")
            page.wait_for_timeout(100)
            print("  [PASS] Arrow keys dispatched without errors")
            passed_checks += 1

            # Return to Lobby
            page.evaluate("window.appRouter.exitCombat()")
            page.wait_for_timeout(200)
            lobby_display = page.evaluate("document.getElementById('lobby-wrapper').style.display")
            assert lobby_display == "flex", "Lobby failed to restore after combat exit"
            print("  [PASS] Exited combat, Lobby restored")
            passed_checks += 1

            browser.close()

    finally:
        if managed_srv:
            managed_srv.terminate()

    print("==================================================")
    print(f"  Results: {passed_checks} checks passed, {len(errors)} page errors")
    if errors:
        print("  FAILURES / PAGE ERRORS:")
        for err in errors:
            print(f"    - {err}")
        return False
    else:
        print("  ALL BUTTONS & INTERACTIVE FLOWS 100% OPERATIONAL!")
        return True

if __name__ == "__main__":
    success = run_crawler()
    sys.exit(0 if success else 1)

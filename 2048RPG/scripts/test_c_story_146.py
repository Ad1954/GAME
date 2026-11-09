import sys
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
from playwright.sync_api import sync_playwright

def run_tests():
    print("=" * 60)
    print("  C-STORY-146 Verification: Tutorial Isolation & Lobby Replay")
    print("=" * 60)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={'width': 412, 'height': 915})

        # Accept all confirms (e.g. back to lobby or skip tutorial)
        page.on("dialog", lambda dialog: dialog.accept())

        # ----------------------------------------------------
        # Test 1: Lobby Left Arrow ◀ to Stage 0 (When tutDone = True)
        # ----------------------------------------------------
        print("\n[Test 1] Testing Lobby Stage 0 Navigation when tutDone = true...")
        page.goto('http://localhost:8081/index_v2.html', wait_until='networkidle')

        # Simulate tutorial already completed, and player currently browsing Stage 1
        page.evaluate('''() => {
            localStorage.setItem('2048RPG_Tutorial_Completed', 'true');
            if (window.appRouter && window.appRouter.stageManager && window.appRouter.stageManager.tutorialManager) {
                window.appRouter.stageManager.tutorialManager.setCompleted(true);
            }
            window.currentSelectedStage = 1;
            window.renderAdventureStage(1);
        }''')

        hub_text = page.locator('#hub-stage-num').text_content()
        is_prev_disabled = page.is_disabled('#btn-stage-prev')
        print(f"  Current Hub: '{hub_text}', ◀ disabled: {is_prev_disabled}")
        assert not is_prev_disabled, "FAIL: ◀ button must NOT be disabled on Stage 1 even if tutDone is true"

        # Click ◀ to go to Stage 0
        page.click('#btn-stage-prev')
        hub_after_prev = page.locator('#hub-stage-num').text_content()
        chap_after_prev = page.locator('#hub-chap-tag').text_content()
        cur_stage = page.evaluate('() => window.currentSelectedStage')
        print(f"  After ◀: Hub='{hub_after_prev}', Chap='{chap_after_prev}', cur_stage={cur_stage}")
        assert cur_stage == 0, f"FAIL: cur_stage expected 0, got {cur_stage}"
        assert '序章' in hub_after_prev, f"FAIL: Hub expected '序章', got '{hub_after_prev}'"
        print("  [PASS] ◀ successfully stepped down to Stage 0!")

        # ----------------------------------------------------
        # Test 2: Deploying Stage 0 from Lobby launches Tutorial
        # ----------------------------------------------------
        print("\n[Test 2] Deploying Stage 0 from Lobby...")
        page.click('#btn-main-battle')
        page.wait_for_selector('#combat-overlay', state='visible')

        combat_title = page.locator('#combat-stage-name').text_content()
        is_tut_mode = page.evaluate('() => document.getElementById("combat-overlay").classList.contains("tutorial-mode")')
        shelf_disp = page.evaluate('() => window.getComputedStyle(document.getElementById("combat-preview-shelf")).display')
        banner_disp = page.evaluate('() => window.getComputedStyle(document.getElementById("tutorial-dialogue-banner")).display')
        banner_text = page.locator('#tutorial-dialogue-text').text_content()
        tiles_count = page.locator('.combat-main-zone .tile').count()

        print(f"  Combat Title: '{combat_title}'")
        print(f"  is_tut_mode: {is_tut_mode}")
        print(f"  shelf_disp: '{shelf_disp}', banner_disp: '{banner_disp}'")
        print(f"  banner_text: '{banner_text[:40]}...'")
        print(f"  tiles_count: {tiles_count}")

        assert is_tut_mode == True, "FAIL: Tutorial overlay must have .tutorial-mode"
        assert shelf_disp == 'none', "FAIL: Preview shelf must be 'none' in tutorial"
        assert banner_disp == 'block', f"FAIL: Banner display must be 'block', got '{banner_disp}'"
        assert '戰力提升' in banner_text, f"FAIL: Banner must display Step 1 text, got '{banner_text}'"
        assert tiles_count == 2, f"FAIL: Step 1 must render exactly 2 tiles, got {tiles_count}"
        print("  [PASS] Stage 0 Tutorial Combat launched with 100% correct layout & scripted tiles!")

        # Dismiss popup and exit combat
        if page.locator('#btn-tutorial-popup-confirm').is_visible():
            page.click('#btn-tutorial-popup-confirm')
        page.evaluate('() => window.appRouter.exitCombat()')
        page.wait_for_selector('#combat-overlay', state='hidden')

        # ----------------------------------------------------
        # Test 3: Normal Combat (Stage 1) - Complete Banner Isolation & Full Board
        # ----------------------------------------------------
        print("\n[Test 3] Entering Stage 1 Normal Combat (Isolation Check)...")
        # Mark tutorial completed and launch Stage 1
        page.evaluate('() => { window.appRouter.stageManager.tutorialManager.setCompleted(true); window.currentSelectedStage = 1; window.launchStageBattle(1); }')
        page.wait_for_selector('#combat-overlay', state='visible')

        combat_title_1 = page.locator('#combat-stage-name').text_content()
        is_tut_mode_1 = page.evaluate('() => document.getElementById("combat-overlay").classList.contains("tutorial-mode")')
        shelf_disp_1 = page.evaluate('() => window.getComputedStyle(document.getElementById("combat-preview-shelf")).display')
        banner_disp_1 = page.evaluate('() => window.getComputedStyle(document.getElementById("tutorial-dialogue-banner")).display')
        board_rect_1 = page.evaluate('() => { const r = document.querySelector(".board-wrapper").getBoundingClientRect(); return { w: r.width, h: r.height, top: r.top, bottom: r.bottom }; }')

        print(f"  Combat Title: '{combat_title_1}'")
        print(f"  is_tut_mode: {is_tut_mode_1}")
        print(f"  shelf_disp: '{shelf_disp_1}' (Expected 'flex')")
        print(f"  banner_disp: '{banner_disp_1}' (Expected 'none')")
        print(f"  Board Rect: width={board_rect_1['w']}px, height={board_rect_1['h']}px, top={board_rect_1['top']}px")

        assert is_tut_mode_1 == False, "FAIL: Normal combat must NOT have .tutorial-mode"
        assert shelf_disp_1 == 'flex', f"FAIL: Preview shelf must be 'flex', got '{shelf_disp_1}'"
        assert banner_disp_1 == 'none', f"FAIL: Tutorial banner MUST BE 'none' in Stage 1! Got '{banner_disp_1}'"
        assert board_rect_1['w'] >= 380, f"FAIL: Board width should be >= 380px, got {board_rect_1['w']}"
        print("  [PASS] Stage 1 Normal Combat is 100% ISOLATED: Tutorial banner is hidden ('none'), shelf is active, board is spacious!")

        # Exit combat back to lobby
        page.evaluate('() => window.appRouter.exitCombat()')
        page.wait_for_selector('#combat-overlay', state='hidden')

        # ----------------------------------------------------
        # Test 4: Settings Modal "🎓 重新體驗新手教學 (Stage 0)" Button
        # ----------------------------------------------------
        print("\n[Test 4] Testing Settings Modal Replay Tutorial Button...")
        page.click('#btn-open-settings')
        page.wait_for_selector('#modal-settings', state='visible')

        # Switch to developer / reset settings pane
        page.evaluate('() => window.switchSettingTab("developer")')
        replay_btn = page.locator('#btn-settings-replay-tut')
        assert replay_btn.is_visible(), "FAIL: Replay Tutorial button must be visible in dev settings pane"
        print(f"  Found Replay Button: '{replay_btn.text_content().strip()}'")

        # Click Replay Tutorial Button
        replay_btn.click()
        page.wait_for_selector('#combat-overlay', state='visible')

        combat_title_replay = page.locator('#combat-stage-name').text_content()
        is_tut_mode_replay = page.evaluate('() => document.getElementById("combat-overlay").classList.contains("tutorial-mode")')
        banner_disp_replay = page.evaluate('() => window.getComputedStyle(document.getElementById("tutorial-dialogue-banner")).display')
        banner_text_replay = page.locator('#tutorial-dialogue-text').text_content()

        print(f"  Replay Combat Title: '{combat_title_replay}'")
        print(f"  is_tut_mode: {is_tut_mode_replay}")
        print(f"  banner_disp: '{banner_disp_replay}'")
        print(f"  banner_text: '{banner_text_replay[:40]}...'")

        assert is_tut_mode_replay == True, "FAIL: Tutorial overlay must have .tutorial-mode on replay"
        assert banner_disp_replay == 'block', f"FAIL: Banner display must be 'block', got '{banner_disp_replay}'"
        assert '戰力提升' in banner_text_replay, "FAIL: Step 1 text must be rendered on replay"
        print("  [PASS] Settings '重新體驗新手教學' button instantly resets & launches tutorial combat successfully!")

        page.screenshot(path='Commercial_Edition/scripts/c_story_146_verified.png')
        print("  Saved screenshot: Commercial_Edition/scripts/c_story_146_verified.png")

        browser.close()

    print("\n" + "=" * 60)
    print("  ALL 4 C-STORY-146 SCENARIOS PASSED WITH 100% PERFECTION!")
    print("=" * 60)

if __name__ == '__main__':
    run_tests()

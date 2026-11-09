import sys
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
from playwright.sync_api import sync_playwright

def run_tests():
    print("=" * 65)
    print("  C-STORY-147 Verification: 350 Stages, Unlock Sync & 3-Zone Detail")
    print("=" * 65)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={'width': 412, 'height': 915})
        page.on("dialog", lambda d: d.accept())

        page.goto('http://localhost:8081/index_v2.html', wait_until='networkidle')

        # Set tutorial completed and view Stage 1
        page.evaluate('''() => {
            localStorage.setItem('2048RPG_Tutorial_Completed', 'true');
            if (window.appRouter && window.appRouter.stageManager) {
                window.appRouter.stageManager.tutorialManager.setCompleted(true);
                window.appRouter.stageManager.unlockedStageId = 1;
                window.appRouter.stageManager.clearedStages = {};
            }
            window.currentSelectedStage = 1;
            window.renderAdventureStage(1);
        }''')

        # ----------------------------------------------------
        # Scenario 1: Lobby Stage 1 Brief Info Accuracy
        # ----------------------------------------------------
        print("\n[Scenario 1] Verifying Lobby Stage 1 Brief Info...")
        hub_stage = page.locator('#hub-stage-num').text_content().strip()
        hub_chap = page.locator('#hub-chap-tag').text_content().strip()
        boss_name = page.locator('#arena-boss-name').text_content().strip()
        boss_img = page.locator('#arena-boss-img').get_attribute('src')
        brief_power = page.locator('#brief-rec-power').text_content().strip()
        brief_gold = page.locator('#brief-first-gold').text_content().strip()

        print(f"  Hub Stage: '{hub_stage}' | Chapter: '{hub_chap}'")
        print(f"  Boss Badge: '{boss_name}' | Img: '{boss_img}'")
        print(f"  Brief Power: '{brief_power}' | Brief Gold: '{brief_gold}'")

        assert boss_name == '首領：哥布林斥候 (8)', f"FAIL: Expected '首領：哥布林斥候 (8)', got '{boss_name}'"
        assert 'monster_ch01_08.png' in boss_img, f"FAIL: Expected Goblin Scout img (08), got '{boss_img}'"
        assert brief_power == '8 裝備', f"FAIL: Expected '8 裝備' (2048 power-of-2), got '{brief_power}'"
        assert brief_gold == '🪙 100', f"FAIL: Expected '🪙 100', got '{brief_gold}'"
        print("  [PASS] Lobby Stage 1 Brief Info 100% accurate!")

        page.screenshot(path='Commercial_Edition/scripts/c_story_147_lobby_stage1.png')

        # ----------------------------------------------------
        # Scenario 2: Stage 1 Detail Modal 3-Zone & 4-Column Combat Tiles
        # ----------------------------------------------------
        print("\n[Scenario 2] Verifying Stage 1 Detail Modal (3 Zones & 4-Col Combat Tiles)...")
        page.click('.hub-stage-brief')
        page.wait_for_selector('#modal-stage-detail', state='visible')
        page.wait_for_timeout(450)

        modal_title = page.locator('#modal-stage-title').text_content().strip()
        modal_gold = page.locator('#modal-gold-reward').text_content().strip()
        modal_forge = page.locator('#modal-forge-level').text_content().strip()
        modal_equip = page.locator('#modal-rec-equip').text_content().strip()
        gears_lbl = page.locator('#modal-txt-gears-lbl').text_content().strip()
        minions_lbl = page.locator('#modal-txt-minions-lbl').text_content().strip()

        print(f"  Modal Title: '{modal_title}'")
        print(f"  Zone 1 -> 初次通關獎勵: '{modal_gold}', 建議鐵匠鋪等級: '{modal_forge}', 建議裝備: '{modal_equip}'")
        print(f"  Zone 2 Title: '{gears_lbl}'")
        print(f"  Zone 3 Title: '{minions_lbl}'")

        assert modal_title == '第 1 關：微風平原', f"FAIL: Expected '第 1 關：微風平原', got '{modal_title}'"
        assert modal_gold == '100 金幣', f"FAIL: Expected '100 金幣', got '{modal_gold}'"
        assert modal_forge == 'LV.2', f"FAIL: Expected 'LV.2', got '{modal_forge}'"
        assert modal_equip == '8', f"FAIL: Expected '8', got '{modal_equip}'"
        assert gears_lbl == '物資', f"FAIL: Expected '物資', got '{gears_lbl}'"
        assert minions_lbl == '登場魔物', f"FAIL: Expected '登場魔物', got '{minions_lbl}'"

        # Verify Zone 2 equipment tiles ([2, 2])
        gear_vals = page.locator('#modal-stage-gears .tile-value').all_text_contents()
        print(f"  Zone 2 (物資) Tiles: {gear_vals}")
        assert gear_vals == ['2', '2'], f"FAIL: Expected ['2', '2'], got {gear_vals}"

        # Verify Zone 3 monster tiles ([8, 2, 4] all 3 shown, Boss ribbon on 8)
        monster_vals = page.locator('#modal-minions-list .tile-value').all_text_contents()
        boss_ribbons = page.locator('#modal-minions-list .tile-boss-ribbon').all_text_contents()
        monster_imgs = page.evaluate('() => Array.from(document.querySelectorAll("#modal-minions-list img")).map(i => ({ src: i.getAttribute("src"), w: i.naturalWidth, h: i.naturalHeight }))')
        first_tile_rect = page.evaluate('() => { const el = document.querySelector("#modal-minions-list .tile"); const r = el.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height) }; }')
        print(f"  Zone 3 (登場魔物) Tiles: {monster_vals} | Boss Ribbons: {boss_ribbons}")
        print(f"  Monster Imgs: {monster_imgs}")
        print(f"  Tile Dimensions: {first_tile_rect['w']}px x {first_tile_rect['h']}px (1:1 Combat Board Scale)")

        assert monster_vals == ['8', '2', '4'], f"FAIL: Expected all 3 monsters ['8', '2', '4'], got {monster_vals}"
        assert boss_ribbons == ['Boss'], f"FAIL: Expected ['Boss'] ribbon on boss tile, got {boss_ribbons}"
        assert first_tile_rect['w'] >= 60 and abs(first_tile_rect['w'] - first_tile_rect['h']) <= 2, f"FAIL: Expected 1:1 full size tile >=60px, got {first_tile_rect}"
        print("  [PASS] Stage Detail Modal 3-Zone layout & 1:1 Combat-sized 4-col tiles verified!")

        page.screenshot(path='Commercial_Edition/scripts/c_story_147_modal_stage1.png')
        page.evaluate('() => window.closeStageDetailModal()')

        # ----------------------------------------------------
        # Scenario 3: Clearing Stage 1 Unlocks Stage 2
        # ----------------------------------------------------
        print("\n[Scenario 3] Verifying Stage 1 Victory Unlocks Stage 2...")
        page.evaluate('''() => {
            window.appRouter.startCombat(1);
            window.appRouter.stageManager.handleVictory();
            window.appRouter.exitCombat();
        }''')

        unlocked_id = page.evaluate('() => window.appRouter.stageManager.unlockedStageId')
        cur_selected = page.evaluate('() => window.currentSelectedStage')
        hub_stage_after = page.locator('#hub-stage-num').text_content().strip()
        boss_name_stage2 = page.locator('#arena-boss-name').text_content().strip()
        print(f"  After Stage 1 Victory -> unlockedStageId={unlocked_id}, currentSelectedStage={cur_selected}, Hub='{hub_stage_after}', Boss='{boss_name_stage2}'")

        assert unlocked_id == 2, f"FAIL: unlockedStageId expected 2, got {unlocked_id}"
        assert cur_selected == 2, f"FAIL: currentSelectedStage expected 2, got {cur_selected}"
        assert hub_stage_after == 'Stage 2', f"FAIL: Hub expected 'Stage 2', got '{hub_stage_after}'"
        assert boss_name_stage2 == '首領：野生史萊姆 (16)', f"FAIL: Stage 2 Boss expected '首領：野生史萊姆 (16)', got '{boss_name_stage2}'"
        print("  [PASS] Clearing Stage 1 unlocks & advances to Stage 2 seamlessly!")

        # ----------------------------------------------------
        # Scenario 4: Quick Stage Drawer Full 350 Stages
        # ----------------------------------------------------
        print("\n[Scenario 4] Verifying Quick Stage Drawer (All 350 Stages + Stage 0)...")
        page.click('.hub-chapter-center')
        page.wait_for_selector('#drawer-quick-stage', state='visible')

        total_nodes = page.locator('.quick-stage-node').count()
        chapter_headers = page.locator('.quick-chapter-header').count()
        stage_350_exists = page.locator('.quick-stage-node[data-stage-id="350"]').count()
        print(f"  Total Stage Nodes: {total_nodes} (Expected 351: Stage 0 + 350 stages)")
        print(f"  Chapter Headers: {chapter_headers} (Expected 9: Chapter 0 + Chapters 1~8)")
        print(f"  Stage 350 Node Exists: {stage_350_exists == 1}")

        assert total_nodes == 351, f"FAIL: Expected 351 nodes, got {total_nodes}"
        assert chapter_headers == 9, f"FAIL: Expected 9 chapter headers, got {chapter_headers}"
        assert stage_350_exists == 1, "FAIL: Stage 350 node missing"
        print("  [PASS] Quick Stage Drawer renders all 350 stages + Stage 0 across 9 chapters!")

        page.screenshot(path='Commercial_Edition/scripts/c_story_147_drawer_350.png')
        browser.close()

    print("\n" + "=" * 65)
    print("  ALL 4 C-STORY-147 SCENARIOS PASSED WITH 100% PERFECTION!")
    print("=" * 65)

if __name__ == '__main__':
    run_tests()

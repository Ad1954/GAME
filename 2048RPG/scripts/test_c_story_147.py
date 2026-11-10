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
        alerts = []
        page.on("dialog", lambda d: (alerts.append(d.message), d.accept()))

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

        assert monster_vals == ['8', '4', '2'], f"FAIL: Expected sorted monsters ['8', '4', '2'], got {monster_vals}"
        assert boss_ribbons == ['Boss'], f"FAIL: Expected ['Boss'] ribbon on boss tile, got {boss_ribbons}"
        assert first_tile_rect['w'] >= 60 and abs(first_tile_rect['w'] - first_tile_rect['h']) <= 2, f"FAIL: Expected 1:1 full size tile >=60px, got {first_tile_rect}"
        print("  [PASS] Stage Detail Modal 3-Zone layout, sorted monsters ['8', '4', '2'] & 1:1 Combat-sized 4-col tiles verified!")

        page.screenshot(path='Commercial_Edition/scripts/c_story_147_modal_stage1.png')
        page.evaluate('() => window.closeStageDetailModal()')

        # ----------------------------------------------------
        # Scenario 3: Clearing Stage 1 with Board Gold -> Auto-Sweep, Quest & Stage 2 Unlock
        # ----------------------------------------------------
        print("\n[Scenario 3] Verifying Stage 1 Victory with Board Gold Sweep, Daily Quest & Stage 2 Unlock...")
        page.evaluate('''() => {
            window.appRouter.dailyLoopManager.state.quests['quest_collect_gold'] = { progress: 0, claimed: false };
            window.appRouter.startCombat(1);
            // Spawn 2 gold tiles of value 4 (total 8 gold remaining on board)
            window.appRouter.stageManager.spawner.spawnGold(4, { r: 2, c: 0 });
            window.appRouter.stageManager.spawner.spawnGold(4, { r: 2, c: 1 });
            window.appRouter.stageManager.handleVictory();
        }''')

        victory_detail = page.locator('#victory-reward-detail').text_content().strip()
        victory_total = page.locator('#victory-reward-val').text_content().strip()
        quest_gold_prog = page.evaluate('() => window.appRouter.dailyLoopManager.state.quests["quest_collect_gold"].progress')
        print(f"  Victory Detail:\n{victory_detail}")
        print(f"  Victory Total: '{victory_total}' | Daily Quest Gold Progress: {quest_gold_prog}/50")

        assert '+8 🪙' in victory_detail, f"FAIL: Expected '+8 🪙' battle harvest in victory detail, got '{victory_detail}'"
        assert '【初次過關獎勵】' in victory_detail, f"FAIL: Expected '【初次過關獎勵】' in victory detail, got '{victory_detail}'"
        assert '含盤面殘存自動結算 +8 🪙' in victory_detail, f"FAIL: Expected sweep gold note in victory detail, got '{victory_detail}'"
        assert victory_total == '🪙 +108', f"FAIL: Expected '🪙 +108', got '{victory_total}'"
        assert quest_gold_prog == 8, f"FAIL: Expected quest_collect_gold progress 8, got {quest_gold_prog}"

        # Verify pixel alignment of Row 1 【, Row 2 【, and Row 3 └ in #victory-reward-detail
        align_rects = page.evaluate('''() => {
            const labels = Array.from(document.querySelectorAll('#victory-reward-detail .victory-row-label'));
            const branch = document.querySelector('#victory-reward-detail .victory-row-branch');
            return {
                r1Left: labels[0] ? Math.round(labels[0].getBoundingClientRect().left) : -1,
                r2Left: labels[1] ? Math.round(labels[1].getBoundingClientRect().left) : -2,
                r3Left: branch ? Math.round(branch.getBoundingClientRect().left) : -3
            };
        }''')
        print(f"  Victory Alignment Left X -> Row1 【: {align_rects['r1Left']}px, Row2 【: {align_rects['r2Left']}px, Row3 └: {align_rects['r3Left']}px")
        assert align_rects['r1Left'] == align_rects['r2Left'] == align_rects['r3Left'], f"FAIL: Misaligned victory rows: {align_rects}"
        page.screenshot(path='Commercial_Edition/scripts/c_story_150_victory_aligned.png')

        page.evaluate('() => window.appRouter.exitCombat()')

        # Verify Repeat Clear of Stage 1 does NOT grant First-Clear Reward again
        gold_before_repeat = page.evaluate('() => window.appRouter.stageManager.gold')
        page.evaluate('''() => {
            window.appRouter.startCombat(1);
            window.appRouter.stageManager.spawner.spawnGold(4, { r: 2, c: 0 });
            window.appRouter.stageManager.handleVictory();
        }''')
        repeat_detail = page.locator('#victory-reward-detail').text_content().strip()
        repeat_total = page.locator('#victory-reward-val').text_content().strip()
        gold_after_repeat = page.evaluate('() => window.appRouter.stageManager.gold')
        print(f"  Repeat Clear Stage 1 -> Total: '{repeat_total}', Gold Delta: +{gold_after_repeat - gold_before_repeat} (Expected +4, NOT +104)")
        assert '【初次過關獎勵】已領取' in repeat_detail, f"FAIL: Expected '【初次過關獎勵】已領取' on repeat clear, got '{repeat_detail}'"
        assert repeat_total == '🪙 +4', f"FAIL: Expected '🪙 +4' on repeat clear, got '{repeat_total}'"
        assert (gold_after_repeat - gold_before_repeat) == 4, f"FAIL: Repeat clear granted extra gold! Delta={gold_after_repeat - gold_before_repeat}"
        page.evaluate('() => window.appRouter.exitCombat()')

        unlocked_id = page.evaluate('() => window.appRouter.stageManager.unlockedStageId')
        cur_selected = page.evaluate('() => window.currentSelectedStage')
        hub_stage_after = page.locator('#hub-stage-num').text_content().strip()
        boss_name_stage2 = page.locator('#arena-boss-name').text_content().strip()
        print(f"  After Stage 1 Victory -> unlockedStageId={unlocked_id}, currentSelectedStage={cur_selected}, Hub='{hub_stage_after}', Boss='{boss_name_stage2}'")

        assert unlocked_id == 2, f"FAIL: unlockedStageId expected 2, got {unlocked_id}"
        assert cur_selected == 2, f"FAIL: currentSelectedStage expected 2, got {cur_selected}"
        assert hub_stage_after == 'Stage 2', f"FAIL: Hub expected 'Stage 2', got '{hub_stage_after}'"
        assert boss_name_stage2 == '首領：野生史萊姆 (16)', f"FAIL: Stage 2 Boss expected '首領：野生史萊姆 (16)', got '{boss_name_stage2}'"

        # Switch back to Stage 1 (which is now cleared) to verify '已領取' gray text without amount
        page.evaluate('() => window.renderAdventureStage(1)')
        cleared_brief_text = page.locator('#brief-first-gold').text_content().strip()
        cleared_brief_color = page.evaluate('() => getComputedStyle(document.getElementById("brief-first-gold")).color')
        page.click('.hub-stage-brief')
        page.wait_for_selector('#modal-stage-detail', state='visible')
        cleared_modal_text = page.locator('#modal-gold-reward').text_content().strip()
        cleared_modal_color = page.evaluate('() => getComputedStyle(document.getElementById("modal-gold-reward")).color')
        print(f"  Stage 1 Cleared Brief: '{cleared_brief_text}' ({cleared_brief_color}) | Modal: '{cleared_modal_text}' ({cleared_modal_color})")
        assert cleared_brief_text == '已領取', f"FAIL: Expected '已領取' without amount, got '{cleared_brief_text}'"
        assert cleared_modal_text == '已領取', f"FAIL: Expected '已領取' without amount, got '{cleared_modal_text}'"
        assert cleared_brief_color == 'rgb(100, 116, 139)', f"FAIL: Expected gray rgb(100, 116, 139), got '{cleared_brief_color}'"
        assert cleared_modal_color == 'rgb(100, 116, 139)', f"FAIL: Expected gray rgb(100, 116, 139), got '{cleared_modal_color}'"
        page.evaluate('() => window.closeStageDetailModal()')
        print("  [PASS] Cleared stage shows gray '已領取' (no amount), board gold auto-swept & counted in quest!")

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
        page.evaluate('() => window.closeQuickStageDrawer()')

        # ----------------------------------------------------
        # Scenario 5: Daily Sign-In Claim Alert (No undefined) & Claimed Card Badge
        # ----------------------------------------------------
        print("\n[Scenario 5] Verifying Daily Sign-In Claim Alert & Claimed Badge (C-STORY-149)...")

        page.evaluate('() => window.openDailySignInModal()')
        page.wait_for_selector('#modal-daily-signin', state='visible')
        btn_before = page.locator('#btn-claim-signin').text_content().strip()
        day1_before = page.locator('.signin-day-card').nth(0).text_content().strip()
        print(f"  Before Claim -> Button: '{btn_before}' | Day 1 Card: '{day1_before}'")
        assert '第 1 天' in btn_before, f"FAIL: Expected Day 1 in button text, got '{btn_before}'"
        assert '今日可領' in day1_before, f"FAIL: Expected '今日可領' on Day 1 card, got '{day1_before}'"

        page.click('#btn-claim-signin')
        btn_after = page.locator('#btn-claim-signin').text_content().strip()
        day1_after = page.locator('.signin-day-card').nth(0).text_content().strip()
        last_alert = alerts[-1] if alerts else ''
        print(f"  Claim Alert: '{last_alert}'")
        print(f"  After Claim -> Button: '{btn_after}' | Day 1 Card: '{day1_after}'")
        assert 'undefined' not in last_alert, f"FAIL: Alert contains 'undefined': {last_alert}"
        assert '第 1 天簽到成功' in last_alert and '1,000' in last_alert, f"FAIL: Unexpected alert: {last_alert}"
        assert '✓ 已領取' in day1_after, f"FAIL: Expected '✓ 已領取' on Day 1 card after claim, got '{day1_after}'"
        assert '第 1 天已領取' in btn_after, f"FAIL: Expected '第 1 天已領取' on button after claim, got '{btn_after}'"
        page.screenshot(path='Commercial_Edition/scripts/c_story_149_signin_claimed.png')
        page.evaluate('() => window.closeDailySignInModal()')
        print("  [PASS] Daily Sign-In shows exact reward (no undefined) and marks Day 1 card with '✓ 已領取'!")

        # ----------------------------------------------------
        # Scenario 6: Game Reload Resumes Saved Stage Progress (e.g. Stage 4)
        # ----------------------------------------------------
        print("\n[Scenario 6] Verifying Reload Resumes Saved Stage Progress (Stage 4)...")
        page.evaluate('''() => {
            window.appRouter.stageManager.unlockedStageId = 4;
            window.appRouter.stageManager.clearedStages = { 1: true, 2: true, 3: true };
            window.appRouter.stageManager.saveData();
        }''')
        page.reload(wait_until='networkidle')
        page.wait_for_function('() => window.appRouter && window.appRouter.stageManager')

        resumed_stage = page.evaluate('() => window.currentSelectedStage')
        resumed_hub_title = page.locator('#hub-stage-num').text_content().strip()
        print(f"  After Reload -> currentSelectedStage: {resumed_stage} | Hub Title: '{resumed_hub_title}'")
        assert resumed_stage == 4, f"FAIL: Expected currentSelectedStage=4 after reload, got {resumed_stage}"
        assert resumed_hub_title == 'Stage 4', f"FAIL: Expected 'Stage 4' in #hub-stage-num after reload, got '{resumed_hub_title}'"
        print("  [PASS] Game reload automatically resumes at the latest unlocked stage (Stage 4)!")

        # ----------------------------------------------------
        # Scenario 7: Camp Dynamic Plain Description + Coin Fly VFX & Gear Prototype Backplates + Descending Sort (C-STORY-150)
        # ----------------------------------------------------
        print("\n[Scenario 7] Verifying Camp Dynamic Desc, Coin Fly VFX & Gear Descending Sort (C-STORY-150)...")
        page.evaluate('''() => {
            window.appRouter.stageManager.gold = 50000;
            window.appRouter.stageManager.saveData();
            window.appRouter.syncHud();
            window.switchMainTab('camp');
        }''')
        desc_lv1 = page.locator('#camp-txt-forge-desc').text_content().strip()
        print(f"  Forge LV.1 Desc: '{desc_lv1}'")
        assert 'T02' not in desc_lv1 and 'T03' not in desc_lv1, f"FAIL: Jargon found in desc_lv1: '{desc_lv1}'"

        page.click('#camp-btn-forge-upgrade')
        desc_lv2 = page.locator('#camp-txt-forge-desc').text_content().strip()
        vfx_particles = page.locator('.coin-spend-vfx-container .coin-fly-particle').count()
        print(f"  Forge LV.2 Desc: '{desc_lv2}' | Active Coin Fly Particles: {vfx_particles}")
        assert desc_lv2 != desc_lv1, f"FAIL: Forge description did not change on upgrade! '{desc_lv2}'"
        assert 'T02' not in desc_lv2 and 'T03' not in desc_lv2, f"FAIL: Jargon found in desc_lv2: '{desc_lv2}'"
        assert vfx_particles >= 5, f"FAIL: Expected >=5 coin fly particles over button, got {vfx_particles}"
        page.screenshot(path='Commercial_Edition/scripts/c_story_150_camp_vfx.png')

        # Verify Gear Inventory prototype backplates, enlarged font, and descending sort
        page.evaluate('''() => {
            const im = window.appRouter.inventoryManager;
            im.items = [];
            [2, 4, 2, 64, 16, 8, 256, 32, 128].forEach(v => im.addItem(v));
            window.appRouter.equipGearItem(im.items.find(it => it.value === 256));
            window.switchMainTab('gear');
            window.renderGearInventory();
        }''')
        page.wait_for_timeout(350)
        gear_vals = page.evaluate('''() => Array.from(document.querySelectorAll('#gear-grid-container .gear-val')).map(el => el.textContent.trim())''')
        gear_classes = page.evaluate('''() => Array.from(document.querySelectorAll('#gear-grid-container .gear-cell')).slice(0, 9).map(el => el.className)''')
        gear_font_px = page.evaluate('''() => parseFloat(getComputedStyle(document.querySelector('#gear-grid-container .gear-val')).fontSize)''')
        print(f"  Sorted Gear Values: {gear_vals}")
        print(f"  Top Gear Slot Class: '{gear_classes[0]}' | .gear-val Font Size: {gear_font_px}px")
        assert gear_vals == ['256', '128', '64', '32', '16', '8', '4', '2', '2'], f"FAIL: Expected descending gear order, got {gear_vals}"
        assert 'tier-256' in gear_classes[0] and 'tier-128' in gear_classes[1], f"FAIL: Missing prototype tier backplate classes: {gear_classes}"
        assert gear_font_px >= 18.0, f"FAIL: Expected enlarged .gear-val font >= 18px, got {gear_font_px}px"
        page.screenshot(path='Commercial_Edition/scripts/c_story_150_gear_sorted.png')
        print("  [PASS] Camp dynamic description, Coin Fly VFX & Gear prototype backplates + descending sort verified!")

        browser.close()

    print("\n" + "=" * 65)
    print("  ALL 7 C-STORY-147~150 SCENARIOS PASSED WITH 100% PERFECTION!")
    print("=" * 65)

if __name__ == '__main__':
    run_tests()

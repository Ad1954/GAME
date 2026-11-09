import sys
import json
from playwright.sync_api import sync_playwright

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

with sync_playwright() as p:
    browser = p.chromium.launch(channel="msedge", headless=True)
    page = browser.new_page()
    page.goto("http://localhost:8081/index_v2.html", wait_until="networkidle")
    page.evaluate("window.launchStageBattle(0)")
    page.wait_for_timeout(400)

    # Confirm popup
    if page.is_visible("#tutorial-popup-backdrop"):
        page.click("#btn-tutorial-popup-confirm")
        page.wait_for_timeout(300)

    res = page.evaluate("""() => {
        const banner = document.getElementById('tutorial-dialogue-banner');
        const board = document.getElementById('battle-board');
        const topBar = document.querySelector('.combat-top-bar');
        const itemBar = document.querySelector('.combat-item-bar');

        const bannerBox = banner.getBoundingClientRect();
        const boardBox = board.getBoundingClientRect();
        const topBarBox = topBar.getBoundingClientRect();
        const itemBarBox = itemBar.getBoundingClientRect();

        return {
            topBarBottom: topBarBox.bottom,
            bannerTop: bannerBox.top,
            bannerBottom: bannerBox.bottom,
            bannerHeight: bannerBox.height,
            boardTop: boardBox.top,
            boardBottom: boardBox.bottom,
            boardWidth: boardBox.width,
            itemBarTop: itemBarBox.top,
            gapTopBarToBanner: bannerBox.top - topBarBox.bottom,
            gapBannerToBoard: boardBox.top - bannerBox.bottom,
            gapBoardToItemBar: itemBarBox.top - boardBox.bottom,
            bannerText: banner.innerText
        };
    }""")
    print("Real Rendered Flex Geometry:", json.dumps(res, indent=2, ensure_ascii=False))
    browser.close()

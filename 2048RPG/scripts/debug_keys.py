from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(channel='msedge', headless=True)
    page = browser.new_page()
    page.goto('http://localhost:8081/index_v2.html')

    # Complete tutorial
    page.evaluate('window.appRouter.stageManager.tutorialManager.setCompleted(true)')
    # Start combat stage 1
    page.evaluate('window.appRouter.startCombat(1)')
    page.wait_for_timeout(300)

    t0 = page.evaluate('window.appRouter.stageManager.turnCount')
    focused0 = page.evaluate('document.activeElement.tagName + "#" + document.activeElement.id')
    print(f'Initial: turn={t0}, focused={focused0}')

    # Try keyboard press
    page.keyboard.press('ArrowUp')
    page.wait_for_timeout(300)
    t1 = page.evaluate('window.appRouter.stageManager.turnCount')
    focused1 = page.evaluate('document.activeElement.tagName + "#" + document.activeElement.id')
    print(f'After ArrowUp: turn={t1}, focused={focused1}')

    page.keyboard.press('ArrowDown')
    page.wait_for_timeout(300)
    t2 = page.evaluate('window.appRouter.stageManager.turnCount')
    print(f'After ArrowDown: turn={t2}')

    browser.close()

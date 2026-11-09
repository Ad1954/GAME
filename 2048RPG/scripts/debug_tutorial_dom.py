import sys
sys.stdout.reconfigure(encoding='utf-8')
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(channel='msedge', headless=True)
    page = browser.new_page()
    page.goto('http://localhost:8081/index_v2.html')

    # Ensure tutorial is NOT completed (fresh player)
    page.evaluate('''() => {
        localStorage.removeItem("2048RPG_Tutorial_Completed");
        window.appRouter.stageManager.tutorialManager.setCompleted(false);
        window.appRouter.startCombat(1);
    }''')
    page.wait_for_timeout(400)

    info = page.evaluate('''() => {
        const ar = window.appRouter;
        const banner = document.querySelector('.tutorial-dialogue-banner');
        const overlay = document.querySelector('.tutorial-overlay');
        const popup = document.querySelector('.tutorial-popup-card');
        const hand = document.querySelector('.tutorial-hand-pointer');
        return {
            stageId: ar.stageManager.currentStageConfig.id,
            isTutorialActive: ar.stageManager.tutorialManager.isActive,
            stepIndex: ar.stageManager.tutorialManager.currentStepIndex,
            overlayExists: !!overlay,
            overlayVisible: overlay ? (overlay.offsetWidth > 0 && overlay.offsetHeight > 0) : false,
            overlayDisplay: overlay ? window.getComputedStyle(overlay).display : null,
            overlayZIndex: overlay ? window.getComputedStyle(overlay).zIndex : null,
            bannerExists: !!banner,
            bannerText: banner ? banner.textContent : null,
            popupExists: !!popup,
            handExists: !!hand,
            handVisible: hand ? (hand.offsetWidth > 0 && hand.offsetHeight > 0) : false,
            boardRect: document.getElementById('battle-board').getBoundingClientRect(),
            appContainerRect: document.getElementById('app-container').getBoundingClientRect()
        };
    }''')
    print('Tutorial State:', info)

    browser.close()

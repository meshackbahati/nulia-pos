import asyncio
from playwright.async_api import async_playwright
import os

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        # Use a larger viewport to see more
        context = await browser.new_context(viewport={"width": 1280, "height": 800})
        page = await context.new_page()

        print("Navigating to login...")
        await page.goto("http://localhost:3001/#/login")

        print("Filling login details...")
        await page.fill('input[type="email"]', "bahati@g24sec.com")
        await page.fill('input[type="password"]', "@Cutlerkmx701")
        await page.click('button:has-text("AUTHENTICATE")')

        print("Waiting for dashboard...")
        await page.wait_for_selector('text=AL MUBARAC ELECTRONICS')

        print("Navigating to POS...")
        await page.click('text=POS Terminal')
        await page.wait_for_load_state("networkidle")

        # Take a screenshot to see what's blocking
        await page.screenshot(path="/home/jules/verification/screenshots/pos_initial.png")
        print("Saved pos_initial.png")

        # Check for "Confirm Configuration" modal
        confirm_btn = page.locator('button:has-text("Confirm Configuration")')
        if await confirm_btn.is_visible():
            print("Clicking Confirm Configuration...")
            await confirm_btn.click()
            await asyncio.sleep(1)

        confirm_btn_alt = page.locator('button:has-text("Confirm")')
        if await confirm_btn_alt.is_visible():
            print("Clicking Confirm...")
            await confirm_btn_alt.click()
            await asyncio.sleep(1)

        print("Switching currency to UGX...")
        # Sometimes there might be multiple UGX buttons if it's in a list, try to be specific
        await page.click('button:has-text("UGX")')

        print("Adding product to cart...")
        # Search for a product if none visible, or just click first one
        await page.wait_for_selector('.grid >> button') # Wait for product grid
        products = page.locator('.grid >> button')
        await products.first.click()

        # Open Bargain Modal
        print("Opening Bargain Modal...")
        await page.click('button:has-text("Bargain")')
        await asyncio.sleep(1)
        await page.screenshot(path="/home/jules/verification/screenshots/bargain_modal_ugx.png")
        print("Saved bargain_modal_ugx.png")

        # Close bargain modal
        await page.keyboard.press("Escape")

        # Proceed to Checkout
        print("Opening Payment Modal...")
        await page.click('button:has-text("Authorize Sale")')
        await asyncio.sleep(1)
        await page.screenshot(path="/home/jules/verification/screenshots/payment_modal_ugx.png")
        print("Saved payment_modal_ugx.png")

        # Complete sale (assuming there's a 'Complete' or 'Pay' button)
        # We need to fill the amount. In my previous manual check, it was automatic or we click a shortcut
        print("Completing sale...")
        # Try to find a quick pay button or just click 'Complete Sale'
        await page.click('button:has-text("Complete Sale")')

        print("Waiting for receipt...")
        await page.wait_for_selector('text=Receipt')
        await asyncio.sleep(2) # Wait for animations
        await page.screenshot(path="/home/jules/verification/screenshots/receipt_ugx.png")
        print("Saved receipt_ugx.png")

        await browser.close()

if __name__ == "__main__":
    os.makedirs("/home/jules/verification/screenshots", exist_ok=True)
    asyncio.run(run())

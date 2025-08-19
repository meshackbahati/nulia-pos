import re
from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    # 1. Login page
    page.goto("http://localhost:3000/auth/login")
    page.wait_for_selector("h1:has-text('BorderShop')")
    page.screenshot(path="jules-scratch/verification/01-login-page.png")

    # 2. Manager Login
    page.locator('select[name="role"]').select_option("manager")
    page.locator('input[name="email"]').fill("manager@bordershop.com")
    page.locator('input[name="password"]').fill("password")
    page.get_by_role("button", name="Sign In").click()

    # 3. Manager Dashboard
    page.wait_for_selector("h1:has-text('Manager Dashboard')")
    page.screenshot(path="jules-scratch/verification/02-manager-dashboard.png")

    # 4. Sign out
    page.get_by_role("button", name="Sign Out").click()

    # 5. Salesperson Login
    page.wait_for_selector("h1:has-text('BorderShop')")
    page.locator('select[name="role"]').select_option("salesperson")
    page.locator('input[name="email"]').fill("salesperson1@bordershop.com")
    page.locator('input[name="password"]').fill("password")
    page.get_by_role("button", name_exact=True).click()

    # 6. Salesperson Dashboard
    page.wait_for_selector("h1:has-text('Sales Terminal')")
    page.screenshot(path="jules-scratch/verification/03-salesperson-dashboard.png")

    # 7. Sign out
    page.get_by_role("button", name="Sign Out").click()

    # 8. Monitoring Dashboard
    # This page does not require login
    page.goto("http://localhost:3000/dashboard/monitoring")
    page.wait_for_selector("h1:has-text('System Monitoring')")
    # Wait for the mock data to load
    page.wait_for_timeout(1000)
    page.screenshot(path="jules-scratch/verification/04-monitoring-dashboard.png")

    context.close()
    browser.close()

with sync_playwright() as playwright:
    run(playwright)

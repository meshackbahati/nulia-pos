import re
from playwright.sync_api import Page, expect

def test_dashboard_and_reports(page: Page):
    # Navigate to the dashboard
    page.goto("http://localhost:3000/dashboard/manager")

    # Wait for the "Recent Sales" section to be visible
    expect(page.locator("text=Recent Sales")).to_be_visible()

    # Verify the date format in the recent sales list
    first_sale = page.locator(".space-y-2 > div").first
    expect(first_sale.locator(".text-sm.text-muted-foreground")).to_contain_text(re.compile(r"\w{3} \d{1,2}, \d{4}"))

    # Take a screenshot of the recent sales section
    page.screenshot(path="jules-scratch/verification/recent-sales.png")

    # Navigate to the reports page
    page.get_by_role("link", name="Reports & Analytics").click()

    # Wait for the reports page to load
    expect(page).to_have_url(re.compile(".*/reports"))

    # Take a screenshot of the entire reports page
    page.screenshot(path="jules-scratch/verification/reports-page.png")

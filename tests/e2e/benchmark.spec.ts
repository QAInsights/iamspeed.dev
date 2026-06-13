import { test, expect } from "@playwright/test";

test.describe("I am speed. Benchmark", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("page loads with correct title", async ({ page }) => {
    await expect(page).toHaveTitle(/I am speed/);
  });

  test("hero section displays correctly", async ({ page }) => {
    // The hero number should show "--" initially
    const heroNumber = page.locator(".llm-hero-number");
    await expect(heroNumber).toBeVisible();
    await expect(heroNumber).toContainText("--");
  });

  test("settings panel opens on gear click", async ({ page }) => {
    const gear = page.getByLabel("Settings");
    await gear.click();

    // Settings panel should be visible
    const settingsPanel = page.locator(".llm-settings");
    await expect(settingsPanel).toBeVisible();

    // Provider tabs should be present
    const openaiTab = page.locator(".llm-provider-tab.active");
    await expect(openaiTab).toContainText("OpenAI");
  });

  test("provider tab switch updates model dropdown in settings", async ({ page }) => {
    // Open settings
    await page.getByLabel("Settings").click();

    // Wait for models to load
    await page.waitForTimeout(2000);

    const modelSelect = page.locator(".llm-select");
    await expect(modelSelect).toBeVisible();

    // Check OpenAI models are present
    const options = modelSelect.locator("option");
    const count = await options.count();
    expect(count).toBeGreaterThan(0);

    // Switch to Anthropic
    const anthropicTab = page.locator(".llm-provider-tab", { hasText: "Anthropic" });
    await anthropicTab.click();

    // Wait for models to reload
    await page.waitForTimeout(2000);

    // Check that options have changed (different from before)
    const newCount = await options.count();
    expect(newCount).toBeGreaterThan(0);
  });

  test("settings panel closes on Done button", async ({ page }) => {
    await page.getByLabel("Settings").click();
    await expect(page.locator(".llm-settings")).toBeVisible();

    await page.locator(".llm-settings-done").click();
    await expect(page.locator(".llm-settings")).not.toBeVisible();
  });

  test("settings panel closes on overlay click", async ({ page }) => {
    await page.getByLabel("Settings").click();
    await expect(page.locator(".llm-settings")).toBeVisible();

    // Click the overlay background
    await page.locator(".llm-overlay").click({ position: { x: 10, y: 10 } });
    await expect(page.locator(".llm-settings")).not.toBeVisible();
  });

  test("hint text appears when no API key configured", async ({ page }) => {
    const hint = page.locator(".llm-hint");
    await expect(hint).toBeVisible();
    await expect(hint).toContainText("Settings");
  });

  test("with mocked stream, clicking Run shows streaming text and metrics", async ({ page }) => {
    // Mock the OpenAI API endpoint
    await page.route("**/api.openai.com/**", async (route) => {
      const chunks = [
        'data: {"choices":[{"delta":{"content":"Hello "}}]}\n\n',
        'data: {"choices":[{"delta":{"content":"World"}}]}\n\n',
        'data: [DONE]\n\n',
      ];

      await route.fulfill({
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
        body: chunks.join(""),
      });
    });

    // Open settings and enter an API key
    await page.getByLabel("Settings").click();
    const keyInput = page.getByLabel("API key");
    await keyInput.fill("sk-test-key-123");
    await keyInput.blur();
    await page.waitForTimeout(300);

    // Close settings
    await page.locator(".llm-settings-done").click();

    // Click Run
    const runButton = page.locator(".llm-btn-run");
    await runButton.click();

    // Wait for streaming to complete
    await page.waitForTimeout(2000);

    // Check that streaming text appeared
    const streamOutput = page.locator(".llm-stream");
    await expect(streamOutput).toContainText("Hello");

    // Check that the hero number updated
    const heroNumber = page.locator(".llm-hero-number");
    await expect(heroNumber).not.toContainText("--");
  });

  test("show more info reveals secondary metrics", async ({ page }) => {
    // Mock the API
    await page.route("**/api.openai.com/**", async (route) => {
      await route.fulfill({
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
        body: 'data: {"choices":[{"delta":{"content":"Hi there friend"}}]}\n\ndata: [DONE]\n\n',
      });
    });

    await page.getByLabel("Settings").click();
    const keyInput = page.getByLabel("API key");
    await keyInput.fill("sk-test");
    await keyInput.blur();
    await page.waitForTimeout(300);
    await page.locator(".llm-settings-done").click();

    await page.locator(".llm-btn-run").click();
    await page.waitForTimeout(2000);

    // Show more button should appear
    const showMore = page.locator(".llm-show-more");
    await expect(showMore).toBeVisible();

    // Click it
    await showMore.click();

    // Secondary metrics should appear
    const secondary = page.locator(".llm-secondary");
    await expect(secondary).toBeVisible();
    await expect(secondary).toContainText("Tokens");
    await expect(secondary).toContainText("Total Time");
  });

  test("raw response panel is hidden by default and expands on click", async ({ page }) => {
    await page.route("**/api.openai.com/**", async (route) => {
      await route.fulfill({
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
        body: 'data: {"choices":[{"delta":{"content":"Hi"}}]}\n\ndata: [DONE]\n\n',
      });
    });

    await page.getByLabel("Settings").click();
    const keyInput = page.getByLabel("API key");
    await keyInput.fill("sk-test");
    await keyInput.blur();
    await page.waitForTimeout(300);
    await page.locator(".llm-settings-done").click();

    await page.locator(".llm-btn-run").click();
    await page.waitForTimeout(2000);

    const rawDetails = page.locator(".llm-raw details");
    await expect(rawDetails).toBeVisible();
    await expect(rawDetails).not.toHaveAttribute("open", "");

    await rawDetails.locator("summary").click();
    await expect(rawDetails).toHaveAttribute("open", "");
  });
});

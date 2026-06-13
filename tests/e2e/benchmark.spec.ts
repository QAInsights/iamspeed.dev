import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";

async function waitForHydration(page: Page) {
  // Wait for the Preact island to hydrate by checking for interactive elements
  await page.waitForSelector('.llm-hero-number', { timeout: 10000 });
  // Small delay to ensure all hooks have run
  await page.waitForTimeout(500);
}

async function openSettings(page: Page) {
  await page.getByLabel("Settings").click();
  await page.waitForSelector('.llm-settings', { timeout: 15000 });
}

async function configureApiKey(page: Page, key: string) {
  await openSettings(page);
  await page.waitForSelector('input[type="password"]', { timeout: 5000 });
  const keyInput = page.locator('input[type="password"]');
  await keyInput.fill(key);
  await keyInput.blur();
  await page.waitForTimeout(500);
  await page.locator('.llm-settings-done').click();
  await page.waitForSelector('.llm-settings', { state: 'detached', timeout: 5000 });
}

test.describe("I am speed. Benchmark", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForHydration(page);
  });

  test("page loads with correct title", async ({ page }) => {
    await expect(page).toHaveTitle(/I am speed/);
  });

  test("hero section displays correctly", async ({ page }) => {
    const heroNumber = page.locator(".llm-hero-number");
    await expect(heroNumber).toBeVisible();
    await expect(heroNumber).toContainText("--");
  });

  test("brand name is displayed", async ({ page }) => {
    await expect(page.locator('.llm-brand-name')).toContainText('I am speed.');
  });

  test("tagline is displayed", async ({ page }) => {
    await expect(page.locator('.llm-brand-tagline')).toContainText('measure what matters.');
  });

  test("settings panel opens on gear click", async ({ page }) => {
    await openSettings(page);

    // Settings panel should be visible
    const settingsPanel = page.locator(".llm-settings");
    await expect(settingsPanel).toBeVisible();

    // Provider tabs should be present
    const openaiTab = page.locator(".llm-provider-tab.active");
    await expect(openaiTab).toContainText("OpenAI");

    // Anthropic tab should be present
    const anthropicTab = page.locator(".llm-provider-tab", { hasText: "Anthropic" });
    await expect(anthropicTab).toBeVisible();
  });

  test("provider tab switch updates model dropdown in settings", async ({ page }) => {
    await openSettings(page);

    // Wait for model select or loading indicator
    await page.waitForSelector('.llm-select, .llm-models-loading', { timeout: 5000 });
    
    // Wait for models to actually load
    await page.waitForSelector('.llm-select', { timeout: 10000 });

    const modelSelect = page.locator(".llm-select");
    await expect(modelSelect).toBeVisible();

    // Count options before switch
    const optionsBefore = modelSelect.locator("option");
    const countBefore = await optionsBefore.count();
    expect(countBefore).toBeGreaterThan(0);

    // Get first option text
    const firstOptionBefore = await optionsBefore.first().textContent();

    // Switch to Anthropic
    const anthropicTab = page.locator(".llm-provider-tab", { hasText: "Anthropic" });
    await anthropicTab.click();

    // Wait for models to reload (select will re-render)
    await page.waitForSelector('.llm-models-loading', { timeout: 5000 }).catch(() => {});
    await page.waitForSelector('.llm-select', { timeout: 10000 });

    // Wait for options to change
    await page.waitForTimeout(2000);
    
    const firstOptionAfter = await optionsBefore.first().textContent();
    
    // Options should be different (different provider)
    expect(firstOptionBefore).not.toEqual(firstOptionAfter);
  });

  test("settings panel closes on Done button", async ({ page }) => {
    await openSettings(page);
    await expect(page.locator(".llm-settings")).toBeVisible();

    await page.locator(".llm-settings-done").click();
    await expect(page.locator(".llm-settings")).not.toBeVisible();
  });

  test("settings panel closes on overlay click", async ({ page }) => {
    await openSettings(page);
    await expect(page.locator(".llm-settings")).toBeVisible();

    // Click the overlay background (outside the settings panel)
    await page.locator(".llm-overlay").click({ position: { x: 10, y: 10 } });
    await expect(page.locator(".llm-settings")).not.toBeVisible();
  });

  test("hint text appears when no API key configured", async ({ page }) => {
    // Clear localStorage to ensure no key is configured
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await waitForHydration(page);

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

    // Configure API key
    await configureApiKey(page, "sk-test-key-123");

    // Wait for model to be loaded before clicking Run
    await page.waitForTimeout(1000);

    // Click Run
    const runButton = page.locator(".llm-btn-run");
    await expect(runButton).toBeVisible({ timeout: 5000 });
    await runButton.click();

    // Wait for streaming to complete
    await page.waitForTimeout(3000);

    // Check that streaming text appeared
    const streamOutput = page.locator(".llm-stream");
    await expect(streamOutput).toBeVisible({ timeout: 10000 });
    await expect(streamOutput).toContainText("Hello");

    // Check that the hero number updated (no longer "--")
    const heroNumber = page.locator(".llm-hero-number");
    const text = await heroNumber.textContent();
    expect(text).not.toContain("--");
  });

  test("show response reveals secondary metrics", async ({ page }) => {
    // Mock the API
    await page.route("**/api.openai.com/**", async (route) => {
      await route.fulfill({
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
        body: 'data: {"choices":[{"delta":{"content":"Hi there friend"}}]}\n\ndata: [DONE]\n\n',
      });
    });

    await configureApiKey(page, "sk-test");
    await page.waitForTimeout(1000);

    const runButton = page.locator(".llm-btn-run");
    await expect(runButton).toBeVisible({ timeout: 5000 });
    await runButton.click();
    await page.waitForTimeout(3000);

    // Show response button should appear
    const showMore = page.locator(".llm-show-more");
    await expect(showMore).toBeVisible({ timeout: 10000 });

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

    await configureApiKey(page, "sk-test");
    await page.waitForTimeout(1000);

    const runButton = page.locator(".llm-btn-run");
    await expect(runButton).toBeVisible({ timeout: 5000 });
    await runButton.click();
    await page.waitForTimeout(3000);

    const rawDetails = page.locator(".llm-raw details");
    await expect(rawDetails).toBeVisible({ timeout: 10000 });
    await expect(rawDetails).not.toHaveAttribute("open", "");

    await rawDetails.locator("summary").click({ force: true });
    await expect(rawDetails).toHaveAttribute("open", "");
  });

  test("model context line appears after run", async ({ page }) => {
    await page.route("**/api.openai.com/**", async (route) => {
      await route.fulfill({
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
        body: 'data: {"choices":[{"delta":{"content":"test"}}]}\n\ndata: [DONE]\n\n',
      });
    });

    await configureApiKey(page, "sk-test");
    await page.waitForTimeout(1000);

    const runButton = page.locator(".llm-btn-run");
    await expect(runButton).toBeVisible({ timeout: 5000 });
    await runButton.click();
    await page.waitForTimeout(3000);

    // Model context line should appear
    const modelContext = page.locator(".llm-model-context");
    await expect(modelContext).toBeVisible({ timeout: 10000 });
    await expect(modelContext).toContainText("OpenAI");
  });

  test("stop button appears during streaming", async ({ page }) => {
    // Mock a slow streaming response
    await page.route("**/api.openai.com/**", async (route) => {
      const chunks = [
        'data: {"choices":[{"delta":{"content":"Hello "}}]}\n\n',
      ];
      // Add a delay before sending more chunks
      await new Promise((r) => setTimeout(r, 2000));
      chunks.push('data: {"choices":[{"delta":{"content":"World"}}]}\n\n');
      chunks.push('data: [DONE]\n\n');

      await route.fulfill({
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
        body: chunks.join(""),
      });
    });

    await configureApiKey(page, "sk-test");
    await page.waitForTimeout(1000);

    const runButton = page.locator(".llm-btn-run");
    await expect(runButton).toBeVisible({ timeout: 5000 });
    await runButton.click();

    // Stop button should appear
    const stopButton = page.locator(".llm-btn-stop");
    await expect(stopButton).toBeVisible({ timeout: 10000 });

    // Wait for completion
    await page.waitForTimeout(5000);
  });

  test("TTFT displays after first token", async ({ page }) => {
    await page.route("**/api.openai.com/**", async (route) => {
      await route.fulfill({
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
        body: 'data: {"choices":[{"delta":{"content":"Hello"}}]}\n\ndata: [DONE]\n\n',
      });
    });

    await configureApiKey(page, "sk-test");
    await page.waitForTimeout(1000);

    const runButton = page.locator(".llm-btn-run");
    await expect(runButton).toBeVisible({ timeout: 5000 });
    await runButton.click();
    await page.waitForTimeout(3000);

    // TTFT should be displayed
    const ttft = page.locator(".llm-ttft");
    await expect(ttft).toBeVisible({ timeout: 10000 });
    await expect(ttft).toContainText("ms");
    await expect(ttft).toContainText("First Token");
  });

  test("error is displayed for failed API call", async ({ page }) => {
    await page.route("**/api.openai.com/**", async (route) => {
      await route.fulfill({
        status: 401,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: { message: "Invalid API key" } }),
      });
    });

    await configureApiKey(page, "bad-key");
    await page.waitForTimeout(1000);

    const runButton = page.locator(".llm-btn-run");
    await expect(runButton).toBeVisible({ timeout: 5000 });
    await runButton.click();
    await page.waitForTimeout(3000);

    // Error should be displayed
    const error = page.locator(".llm-error");
    await expect(error).toBeVisible({ timeout: 10000 });
  });
});

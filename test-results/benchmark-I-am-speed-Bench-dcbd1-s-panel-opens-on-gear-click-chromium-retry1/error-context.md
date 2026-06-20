# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: benchmark.spec.ts >> I am speed. Benchmark >> settings panel opens on gear click
- Location: tests\e2e\benchmark.spec.ts:51:3

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: locator('.llm-provider-tab.active')
Expected substring: "OpenAI"
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toContainText" with timeout 5000ms
  - waiting for locator('.llm-provider-tab.active')

```

```yaml
- main:
  - img "I am speed"
  - heading "I am speed." [level=1]
  - text: measure what matters.
  - button "Toggle Theme"
  - button "History"
  - button "Settings" [expanded]
  - text: Your LLM speed is -- tokens / sec
  - 'button "Current selection: OpenAI gpt-5.4. Click or press Enter to change."': OpenAI · gpt-5.4change
  - button "Run"
  - paragraph:
    - text: Click
    - button "Settings"
    - text: to choose a provider and API key
  - contentinfo:
    - link "QAInsights (opens in new tab)":
      - /url: https://qainsights.com
      - text: QAInsights
    - link "Dosa (opens in new tab)":
      - /url: https://dosa.dev
      - text: Dosa
    - link "JMeter.ai (opens in new tab)":
      - /url: https://jmeter.ai
      - text: JMeter.ai
    - link "Achu (opens in new tab)":
      - /url: https://achu.app
      - text: Achu
    - link "GitHub repository (opens in new tab)":
      - /url: https://github.com/qainsights/iamspeed.dev
      - text: GitHub
- dialog "Settings":
  - heading "Settings" [level=2]
  - button "Close settings": ✕
  - group "Provider":
    - text: Provider
    - combobox "Select provider":
      - option "OpenAI" [selected]
      - option "Anthropic"
      - option "Groq"
      - option "Local"
  - text: API Key
  - textbox "openai API key"
  - text: Model
  - combobox "Model":
    - option "GPT-5.4 (1050k ctx)" [selected]
    - option "GPT-5.4 Pro (1050k ctx)"
    - option "GPT-5.5 (1050k ctx)"
    - option "GPT-5.5 Pro (1050k ctx)"
    - option "GPT-4.1 (1048k ctx)"
    - option "GPT-4.1 mini (1048k ctx)"
    - option "GPT-4.1 nano (1048k ctx)"
    - option "GPT-5 (400k ctx)"
    - option "GPT-5 Chat (latest) (400k ctx)"
    - option "GPT-5 Mini (400k ctx)"
    - option "GPT-5 Nano (400k ctx)"
    - option "GPT-5 Pro (400k ctx)"
    - option "GPT-5-Codex (400k ctx)"
    - option "GPT-5.1 (400k ctx)"
    - option "GPT-5.1 Codex (400k ctx)"
    - option "GPT-5.1 Codex Max (400k ctx)"
    - option "GPT-5.1 Codex mini (400k ctx)"
    - option "GPT-5.2 (400k ctx)"
    - option "GPT-5.2 Codex (400k ctx)"
    - option "GPT-5.2 Pro (400k ctx)"
    - option "GPT-5.3 Codex (400k ctx)"
    - option "GPT-5.4 mini (400k ctx)"
    - option "GPT-5.4 nano (400k ctx)"
    - option "o1 (200k ctx)"
    - option "o1-pro (200k ctx)"
    - option "o3 (200k ctx)"
    - option "o3-deep-research (200k ctx)"
    - option "o3-mini (200k ctx)"
    - option "o3-pro (200k ctx)"
    - option "o4-mini (200k ctx)"
    - option "o4-mini-deep-research (200k ctx)"
    - option "GPT-4 Turbo (128k ctx)"
    - option "GPT-4o (128k ctx)"
    - option "GPT-4o (2024-05-13) (128k ctx)"
    - option "GPT-4o (2024-08-06) (128k ctx)"
    - option "GPT-4o (2024-11-20) (128k ctx)"
    - option "GPT-4o mini (128k ctx)"
    - option "GPT-5.1 Chat (128k ctx)"
    - option "GPT-5.2 Chat (128k ctx)"
    - option "GPT-5.3 Chat (latest) (128k ctx)"
    - option "GPT-5.3 Codex Spark (128k ctx)"
    - option "GPT-3.5-turbo (16k ctx)"
    - option "GPT-4 (8k ctx)"
    - option "text-embedding-ada-002 (8k ctx)"
    - option "text-embedding-3-large (8k ctx)"
    - option "text-embedding-3-small (8k ctx)"
    - option "chatgpt-image-latest (ctx unknown)"
    - option "gpt-image-1 (ctx unknown)"
    - option "gpt-image-1-mini (ctx unknown)"
    - option "gpt-image-1.5 (ctx unknown)"
    - option "gpt-image-2 (ctx unknown)"
  - text: Prompt
  - textbox "Prompt": Say Hello World in five languages.
  - paragraph: I am speed. sends requests directly from your browser to the provider API using your API key. You will be charged based on the model's published pricing. Keys are encrypted locally and never leave your device.
  - button "Done"
```

# Test source

```ts
  1   | import { test, expect } from "@playwright/test";
  2   | import type { Page } from "@playwright/test";
  3   | 
  4   | async function waitForHydration(page: Page) {
  5   |   // Wait for the Preact island to hydrate by checking for interactive elements
  6   |   await page.waitForSelector('.llm-hero-number', { timeout: 10000 });
  7   |   // Small delay to ensure all hooks have run
  8   |   await page.waitForTimeout(500);
  9   | }
  10  | 
  11  | async function openSettings(page: Page) {
  12  |   await page.getByLabel("Settings").click();
  13  |   await page.waitForSelector('.llm-settings', { timeout: 15000 });
  14  | }
  15  | 
  16  | async function configureApiKey(page: Page, key: string) {
  17  |   await openSettings(page);
  18  |   await page.waitForSelector('input[type="password"]', { timeout: 5000 });
  19  |   const keyInput = page.locator('input[type="password"]');
  20  |   await keyInput.fill(key);
  21  |   await keyInput.blur();
  22  |   await page.waitForTimeout(500);
  23  |   await page.locator('.llm-settings-done').click();
  24  |   await page.waitForSelector('.llm-settings', { state: 'detached', timeout: 5000 });
  25  | }
  26  | 
  27  | test.describe("I am speed. Benchmark", () => {
  28  |   test.beforeEach(async ({ page }) => {
  29  |     await page.goto("/");
  30  |     await waitForHydration(page);
  31  |   });
  32  | 
  33  |   test("page loads with correct title", async ({ page }) => {
  34  |     await expect(page).toHaveTitle(/I am speed/);
  35  |   });
  36  | 
  37  |   test("hero section displays correctly", async ({ page }) => {
  38  |     const heroNumber = page.locator(".llm-hero-number");
  39  |     await expect(heroNumber).toBeVisible();
  40  |     await expect(heroNumber).toContainText("--");
  41  |   });
  42  | 
  43  |   test("brand name is displayed", async ({ page }) => {
  44  |     await expect(page.locator('.llm-brand-name')).toContainText('I am speed.');
  45  |   });
  46  | 
  47  |   test("tagline is displayed", async ({ page }) => {
  48  |     await expect(page.locator('.llm-brand-tagline')).toContainText('measure what matters.');
  49  |   });
  50  | 
  51  |   test("settings panel opens on gear click", async ({ page }) => {
  52  |     await openSettings(page);
  53  | 
  54  |     // Settings panel should be visible
  55  |     const settingsPanel = page.locator(".llm-settings");
  56  |     await expect(settingsPanel).toBeVisible();
  57  | 
  58  |     // Provider tabs should be present
  59  |     const openaiTab = page.locator(".llm-provider-tab.active");
> 60  |     await expect(openaiTab).toContainText("OpenAI");
      |                             ^ Error: expect(locator).toContainText(expected) failed
  61  | 
  62  |     // Anthropic tab should be present
  63  |     const anthropicTab = page.locator(".llm-provider-tab", { hasText: "Anthropic" });
  64  |     await expect(anthropicTab).toBeVisible();
  65  |   });
  66  | 
  67  |   test("provider tab switch updates model dropdown in settings", async ({ page }) => {
  68  |     await openSettings(page);
  69  | 
  70  |     // Wait for model select or loading indicator
  71  |     await page.waitForSelector('.llm-select, .llm-models-loading', { timeout: 5000 });
  72  |     
  73  |     // Wait for models to actually load
  74  |     await page.waitForSelector('.llm-select', { timeout: 10000 });
  75  | 
  76  |     const modelSelect = page.locator(".llm-select");
  77  |     await expect(modelSelect).toBeVisible();
  78  | 
  79  |     // Count options before switch
  80  |     const optionsBefore = modelSelect.locator("option");
  81  |     const countBefore = await optionsBefore.count();
  82  |     expect(countBefore).toBeGreaterThan(0);
  83  | 
  84  |     // Get first option text
  85  |     const firstOptionBefore = await optionsBefore.first().textContent();
  86  | 
  87  |     // Switch to Anthropic
  88  |     const anthropicTab = page.locator(".llm-provider-tab", { hasText: "Anthropic" });
  89  |     await anthropicTab.click();
  90  | 
  91  |     // Wait for models to reload (select will re-render)
  92  |     await page.waitForSelector('.llm-models-loading', { timeout: 5000 }).catch(() => {});
  93  |     await page.waitForSelector('.llm-select', { timeout: 10000 });
  94  | 
  95  |     // Wait for options to change
  96  |     await page.waitForTimeout(2000);
  97  |     
  98  |     const firstOptionAfter = await optionsBefore.first().textContent();
  99  |     
  100 |     // Options should be different (different provider)
  101 |     expect(firstOptionBefore).not.toEqual(firstOptionAfter);
  102 |   });
  103 | 
  104 |   test("settings panel closes on Done button", async ({ page }) => {
  105 |     await openSettings(page);
  106 |     await expect(page.locator(".llm-settings")).toBeVisible();
  107 | 
  108 |     await page.locator(".llm-settings-done").click();
  109 |     await expect(page.locator(".llm-settings")).not.toBeVisible();
  110 |   });
  111 | 
  112 |   test("settings panel closes on overlay click", async ({ page }) => {
  113 |     await openSettings(page);
  114 |     await expect(page.locator(".llm-settings")).toBeVisible();
  115 | 
  116 |     // Click the overlay background (outside the settings panel)
  117 |     await page.locator(".llm-overlay").click({ position: { x: 10, y: 10 } });
  118 |     await expect(page.locator(".llm-settings")).not.toBeVisible();
  119 |   });
  120 | 
  121 |   test("hint text appears when no API key configured", async ({ page }) => {
  122 |     // Clear localStorage to ensure no key is configured
  123 |     await page.evaluate(() => localStorage.clear());
  124 |     await page.reload();
  125 |     await waitForHydration(page);
  126 | 
  127 |     const hint = page.locator(".llm-hint");
  128 |     await expect(hint).toBeVisible();
  129 |     await expect(hint).toContainText("Settings");
  130 |   });
  131 | 
  132 |   test("with mocked stream, clicking Run shows streaming text and metrics", async ({ page }) => {
  133 |     // Mock the OpenAI API endpoint
  134 |     await page.route("**/api.openai.com/**", async (route) => {
  135 |       const chunks = [
  136 |         'data: {"choices":[{"delta":{"content":"Hello "}}]}\n\n',
  137 |         'data: {"choices":[{"delta":{"content":"World"}}]}\n\n',
  138 |         'data: [DONE]\n\n',
  139 |       ];
  140 | 
  141 |       await route.fulfill({
  142 |         status: 200,
  143 |         headers: { "Content-Type": "text/event-stream" },
  144 |         body: chunks.join(""),
  145 |       });
  146 |     });
  147 | 
  148 |     // Configure API key
  149 |     await configureApiKey(page, "sk-test-key-123");
  150 | 
  151 |     // Wait for model to be loaded before clicking Run
  152 |     await page.waitForTimeout(1000);
  153 | 
  154 |     // Click Run
  155 |     const runButton = page.locator(".llm-btn-run");
  156 |     await expect(runButton).toBeVisible({ timeout: 5000 });
  157 |     await runButton.click();
  158 | 
  159 |     // Wait for streaming to complete
  160 |     await page.waitForTimeout(3000);
```
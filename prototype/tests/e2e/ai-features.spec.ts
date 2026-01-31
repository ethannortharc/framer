import { test, expect } from '@playwright/test';

test.describe('AI Features', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should open AI sidebar from frame detail', async ({ page }) => {
    // Create a new frame to get to detail view
    await page.click('button:has-text("New Frame")');
    await page.click('text=Bug Fix');
    await page.click('button:has-text("Start Manually")');

    // Click AI Assistant button (the sparkle icon button)
    const aiButton = page.locator('button').filter({ has: page.locator('svg.lucide-sparkles') }).first();
    await aiButton.click();

    // Check AI sidebar is visible
    await expect(page.locator('text=AI Assistant')).toBeVisible();
    await expect(page.locator('text=Quality Score')).toBeVisible();
    await expect(page.locator('text=Suggestion')).toBeVisible();
  });

  test('should assess frame quality', async ({ page }) => {
    // Navigate to a frame
    await page.click('button:has-text("New Frame")');
    await page.click('text=Bug Fix');
    await page.click('button:has-text("Start Manually")');

    // Fill in some content first
    const problemTextarea = page.locator('textarea').first();
    await problemTextarea.fill('Users cannot login when using special characters in password.');

    // Open AI sidebar
    const aiButton = page.locator('button').filter({ has: page.locator('svg.lucide-sparkles') }).first();
    await aiButton.click();

    // Click Assess Frame button
    await page.click('button:has-text("Assess Frame")');

    // Wait for assessment to complete (shows score)
    await expect(page.locator('.text-2xl.font-bold')).toBeVisible({ timeout: 5000 });
  });

  test('should show AI issues after assessment', async ({ page }) => {
    // Navigate to a frame
    await page.click('button:has-text("New Frame")');
    await page.click('text=Bug Fix');
    await page.click('button:has-text("Start Manually")');

    // Open AI sidebar
    const aiButton = page.locator('button').filter({ has: page.locator('svg.lucide-sparkles') }).first();
    await aiButton.click();

    // Assess frame
    await page.click('button:has-text("Assess Frame")');

    // Wait for assessment and check issues section
    await expect(page.locator('text=Issues')).toBeVisible({ timeout: 5000 });
  });

  test('should allow asking AI questions', async ({ page }) => {
    // Navigate to a frame
    await page.click('button:has-text("New Frame")');
    await page.click('text=Bug Fix');
    await page.click('button:has-text("Start Manually")');

    // Open AI sidebar
    const aiButton = page.locator('button').filter({ has: page.locator('svg.lucide-sparkles') }).first();
    await aiButton.click();

    // Find the chat input
    const chatInput = page.locator('input[placeholder*="question"]');
    await chatInput.fill('How can I improve this frame?');

    // Click send
    await page.locator('button').filter({ has: page.locator('svg.lucide-send') }).click();

    // Wait for response
    await expect(page.locator('text=Conversation')).toBeVisible({ timeout: 5000 });
  });

  test('should close AI sidebar', async ({ page }) => {
    // Navigate to a frame
    await page.click('button:has-text("New Frame")');
    await page.click('text=Bug Fix');
    await page.click('button:has-text("Start Manually")');

    // Open AI sidebar
    const aiButton = page.locator('button').filter({ has: page.locator('svg.lucide-sparkles') }).first();
    await aiButton.click();

    // Verify sidebar is open
    await expect(page.locator('text=AI Assistant')).toBeVisible();

    // Close sidebar
    await page.locator('button').filter({ has: page.locator('svg.lucide-x') }).first().click();

    // Verify sidebar is closed
    await expect(page.locator('text=AI Assistant')).not.toBeVisible();
  });
});

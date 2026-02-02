import { test, expect } from '@playwright/test';

test.describe('AI Features', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should open AI sidebar from frame detail', async ({ page }) => {
    // Create a new frame to get to detail view
    await page.click('button:has-text("New Frame")');
    await page.click('text=Bug Fix');
    await page.click('text=Manual Input');

    // Wait for frame detail to load
    await expect(page.locator('text=Problem Statement')).toBeVisible();

    // Click AI Assistant button (the Bot icon button - floating button at bottom right)
    const aiButton = page.locator('button').filter({ has: page.locator('svg.lucide-bot') }).first();
    await aiButton.click();

    // Check AI sidebar is visible
    await expect(page.locator('text=AI Assistant')).toBeVisible();
    await expect(page.locator('text=Quality Score')).toBeVisible();
    // Use the exact text match to avoid multiple matches
    await expect(page.locator('.uppercase.tracking-wide:has-text("Suggestion")')).toBeVisible();
  });

  test('should show Assess Frame button', async ({ page }) => {
    // Navigate to a frame
    await page.click('button:has-text("New Frame")');
    await page.click('text=Bug Fix');
    await page.click('text=Manual Input');

    // Fill in some content first
    const problemTextarea = page.locator('textarea').first();
    await problemTextarea.fill('Users cannot login when using special characters in password.');

    // Open AI sidebar
    const aiButton = page.locator('button').filter({ has: page.locator('svg.lucide-bot') }).first();
    await aiButton.click();

    // Check that Assess Frame button is visible
    await expect(page.locator('button:has-text("Assess Frame")')).toBeVisible();
  });

  test('should show AI issues section', async ({ page }) => {
    // Navigate to a frame
    await page.click('button:has-text("New Frame")');
    await page.click('text=Bug Fix');
    await page.click('text=Manual Input');

    // Open AI sidebar
    const aiButton = page.locator('button').filter({ has: page.locator('svg.lucide-bot') }).first();
    await aiButton.click();

    // Check issues section header is visible (matches "Issues (0)" or similar)
    await expect(page.locator('text=/Issues \\(\\d+\\)/')).toBeVisible({ timeout: 5000 });
  });

  test('should have chat input available', async ({ page }) => {
    // Navigate to a frame
    await page.click('button:has-text("New Frame")');
    await page.click('text=Bug Fix');
    await page.click('text=Manual Input');

    // Open AI sidebar
    const aiButton = page.locator('button').filter({ has: page.locator('svg.lucide-bot') }).first();
    await aiButton.click();

    // Find the chat input - it should be visible
    const chatInput = page.locator('input[placeholder*="question"]');
    await expect(chatInput).toBeVisible();

    // Type a question
    await chatInput.fill('How can I improve this frame?');
    await expect(chatInput).toHaveValue('How can I improve this frame?');

    // The send button should be clickable (has the send icon)
    const sendButton = page.locator('button').filter({ has: page.locator('svg.lucide-send') });
    await expect(sendButton).toBeVisible();
  });

  test('should close AI sidebar', async ({ page }) => {
    // Navigate to a frame
    await page.click('button:has-text("New Frame")');
    await page.click('text=Bug Fix');
    await page.click('text=Manual Input');

    // Open AI sidebar
    const aiButton = page.locator('button').filter({ has: page.locator('svg.lucide-bot') }).first();
    await aiButton.click();

    // Verify sidebar is open
    await expect(page.locator('text=AI Assistant')).toBeVisible();

    // Close sidebar by clicking the X button
    await page.locator('button').filter({ has: page.locator('svg.lucide-x') }).first().click();

    // Verify sidebar is closed
    await expect(page.locator('text=AI Assistant')).not.toBeVisible();
  });
});

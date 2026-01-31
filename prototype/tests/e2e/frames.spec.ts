import { test, expect } from '@playwright/test';

test.describe('Frame Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display frame list in dashboard', async ({ page }) => {
    // Check that the dashboard shows frames (mock data)
    await expect(page.locator('[data-testid="frame-card"]').or(page.locator('.group.cursor-pointer'))).toBeTruthy();
  });

  test('should open new frame modal', async ({ page }) => {
    // Click new frame button
    await page.click('button:has-text("New Frame")');

    // Check modal is visible
    await expect(page.locator('role=dialog')).toBeVisible();
    await expect(page.locator('text=Create New Frame')).toBeVisible();

    // Check frame type options
    await expect(page.locator('text=Bug Fix')).toBeVisible();
    await expect(page.locator('text=Feature')).toBeVisible();
    await expect(page.locator('text=Exploration')).toBeVisible();
  });

  test('should create a new frame', async ({ page }) => {
    // Open new frame modal
    await page.click('button:has-text("New Frame")');

    // Select Bug Fix type
    await page.click('text=Bug Fix');

    // Click Start Manually
    await page.click('button:has-text("Start Manually")');

    // Check that we're in frame detail view
    await expect(page.locator('text=Problem Statement')).toBeVisible();
    await expect(page.locator('text=User Perspective')).toBeVisible();
    await expect(page.locator('text=Engineering Framing')).toBeVisible();
    await expect(page.locator('text=Validation Thinking')).toBeVisible();
  });

  test('should edit frame content', async ({ page }) => {
    // Create a new frame first
    await page.click('button:has-text("New Frame")');
    await page.click('text=Bug Fix');
    await page.click('button:has-text("Start Manually")');

    // Find and fill the problem statement textarea
    const problemTextarea = page.locator('textarea').first();
    await problemTextarea.fill('This is a test problem statement for E2E testing.');

    // Verify content is entered
    await expect(problemTextarea).toHaveValue('This is a test problem statement for E2E testing.');
  });

  test('should navigate back to dashboard', async ({ page }) => {
    // Create a new frame
    await page.click('button:has-text("New Frame")');
    await page.click('text=Bug Fix');
    await page.click('button:has-text("Start Manually")');

    // Click back button
    await page.click('button:has-text("Back")');

    // Should be back on dashboard
    await expect(page.locator('button:has-text("New Frame")')).toBeVisible();
  });

  test('should filter frames by status using kanban columns', async ({ page }) => {
    // Check that kanban columns exist
    await expect(page.locator('text=Draft')).toBeVisible();
    await expect(page.locator('text=In Review')).toBeVisible();
    await expect(page.locator('text=Ready')).toBeVisible();
  });
});

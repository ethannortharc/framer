import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('should load the home page', async ({ page }) => {
    await page.goto('/');

    // Check that the page loaded
    await expect(page).toHaveTitle(/Framer/);

    // Check that the sidebar is visible
    await expect(page.locator('text=Framer')).toBeVisible();
    await expect(page.locator('text=Pre-dev thinking framework')).toBeVisible();
  });

  test('should display navigation items', async ({ page }) => {
    await page.goto('/');

    // Check navigation items
    await expect(page.locator('text=Working Space')).toBeVisible();
    await expect(page.locator('text=Templates')).toBeVisible();
    await expect(page.locator('text=Archive')).toBeVisible();
    await expect(page.locator('text=Settings')).toBeVisible();
  });

  test('should switch between spaces', async ({ page }) => {
    await page.goto('/');

    // Click on Templates
    await page.click('text=Templates');
    await expect(page.locator('h1:has-text("Templates")')).toBeVisible();

    // Click on Archive
    await page.click('text=Archive');
    await expect(page.locator('h1:has-text("Archive")')).toBeVisible();

    // Click on Working Space
    await page.click('text=Working Space');
    await expect(page.locator('text=Working Space').first()).toBeVisible();
  });

  test('should open settings modal', async ({ page }) => {
    await page.goto('/');

    // Click settings
    await page.click('text=Settings');

    // Check modal is visible
    await expect(page.locator('role=dialog')).toBeVisible();
    await expect(page.locator('text=Profile')).toBeVisible();
    await expect(page.locator('text=Data Source')).toBeVisible();
  });
});

import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should show login button when API mode is enabled', async ({ page }) => {
    // Open settings
    await page.click('text=Settings');

    // Toggle to API mode
    const apiModeButton = page.locator('button:has-text("Mock Mode")');
    if (await apiModeButton.isVisible()) {
      await apiModeButton.click();
    }

    // Close settings
    await page.keyboard.press('Escape');

    // Check Sign In button is visible in sidebar
    await expect(page.locator('text=Sign In')).toBeVisible();
  });

  test('should open auth modal when clicking Sign In', async ({ page }) => {
    // Enable API mode first
    await page.click('text=Settings');
    const apiModeButton = page.locator('button:has-text("Mock Mode")');
    if (await apiModeButton.isVisible()) {
      await apiModeButton.click();
    }
    await page.keyboard.press('Escape');

    // Click Sign In
    await page.click('text=Sign In');

    // Check auth modal is visible
    await expect(page.locator('role=dialog')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('should switch between login and register modes', async ({ page }) => {
    // Enable API mode
    await page.click('text=Settings');
    const apiModeButton = page.locator('button:has-text("Mock Mode")');
    if (await apiModeButton.isVisible()) {
      await apiModeButton.click();
    }
    await page.keyboard.press('Escape');

    // Open auth modal
    await page.click('text=Sign In');

    // Should be in login mode by default
    await expect(page.locator('h2:has-text("Sign In")')).toBeVisible();

    // Switch to register mode - use role=dialog to scope within modal
    await page.locator('role=dialog >> text=Sign up').click();
    await expect(page.locator('h2:has-text("Create Account")')).toBeVisible();
    await expect(page.locator('input[placeholder*="name"]')).toBeVisible();

    // Switch back to login mode - use role=dialog to scope within modal
    await page.locator('role=dialog >> text=Sign in').click();
    await expect(page.locator('h2:has-text("Sign In")')).toBeVisible();
  });

  test('should validate password match on register', async ({ page }) => {
    // Enable API mode
    await page.click('text=Settings');
    const apiModeButton = page.locator('button:has-text("Mock Mode")');
    if (await apiModeButton.isVisible()) {
      await apiModeButton.click();
    }
    await page.keyboard.press('Escape');

    // Open auth modal
    await page.click('text=Sign In');

    // Switch to register
    await page.click('text=Sign up');

    // Fill mismatched passwords
    await page.fill('input[type="email"]', 'test@example.com');
    await page.locator('input[type="password"]').first().fill('password123');
    await page.locator('input[placeholder="••••••••"]').last().fill('different123');

    // Check validation message
    await expect(page.locator('text=Passwords do not match')).toBeVisible();
  });

  test('should toggle password visibility', async ({ page }) => {
    // Enable API mode
    await page.click('text=Settings');
    const apiModeButton = page.locator('button:has-text("Mock Mode")');
    if (await apiModeButton.isVisible()) {
      await apiModeButton.click();
    }
    await page.keyboard.press('Escape');

    // Open auth modal
    await page.click('text=Sign In');

    // Password field should be of type password
    const passwordInput = page.locator('input[type="password"]');
    await expect(passwordInput).toBeVisible();

    // Click toggle button (eye icon)
    await page.locator('button').filter({ has: page.locator('svg.lucide-eye') }).click();

    // Now password should be visible
    await expect(page.locator('input[type="text"]')).toBeVisible();
  });

  test('should close auth modal', async ({ page }) => {
    // Enable API mode
    await page.click('text=Settings');
    const apiModeButton = page.locator('button:has-text("Mock Mode")');
    if (await apiModeButton.isVisible()) {
      await apiModeButton.click();
    }
    await page.keyboard.press('Escape');

    // Open auth modal
    await page.click('text=Sign In');
    await expect(page.locator('role=dialog')).toBeVisible();

    // Close modal
    await page.keyboard.press('Escape');
    await expect(page.locator('role=dialog')).not.toBeVisible();
  });
});

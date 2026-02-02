import { test as setup, expect } from '@playwright/test';

const TEST_USER = {
  email: 'e2e-test@example.com',
  password: 'E2ETestPassword123!',
  name: 'E2E Test User',
};

const authFile = 'tests/e2e/.auth/user.json';

/**
 * Setup: Create test user and authenticate
 * This runs once before all tests and saves the auth state
 */
setup('authenticate', async ({ page }) => {
  // Go to login page
  await page.goto('/login');

  // Wait for the page to load
  await expect(page.getByRole('heading', { name: /Welcome Back|Create Account/i })).toBeVisible();

  // Check if we're on login or register form
  const heading = await page.getByRole('heading', { level: 3 }).textContent();

  if (heading?.includes('Welcome Back')) {
    // We're on login form - try to login first
    await page.getByPlaceholder('you@example.com').fill(TEST_USER.email);
    await page.getByPlaceholder('Enter your password').fill(TEST_USER.password);
    await page.getByRole('button', { name: 'Sign In' }).click();

    try {
      await page.waitForURL('/dashboard', { timeout: 10000 });
    } catch {
      // Login failed, user may not exist - try to register
      console.log('Login failed, attempting registration...');

      // Switch to register mode
      await page.getByRole('button', { name: /Don't have an account/i }).click();

      // Fill registration form
      await page.getByPlaceholder('Your name').fill(TEST_USER.name);
      await page.getByPlaceholder('you@example.com').fill(TEST_USER.email);
      await page.getByPlaceholder('Enter your password').fill(TEST_USER.password);
      await page.getByPlaceholder('Confirm your password').fill(TEST_USER.password);

      // Submit registration
      await page.getByRole('button', { name: 'Create Account' }).click();

      await page.waitForURL('/dashboard', { timeout: 10000 });
    }
  } else {
    // We're on register form
    // Fill registration form
    await page.getByPlaceholder('Your name').fill(TEST_USER.name);
    await page.getByPlaceholder('you@example.com').fill(TEST_USER.email);
    await page.getByPlaceholder('Enter your password').fill(TEST_USER.password);
    await page.getByPlaceholder('Confirm your password').fill(TEST_USER.password);

    // Submit registration
    await page.getByRole('button', { name: 'Create Account' }).click();

    try {
      await page.waitForURL('/dashboard', { timeout: 10000 });
    } catch {
      // Registration failed, user may exist - try login
      console.log('Registration failed, attempting login...');

      // Switch to login mode
      await page.getByRole('button', { name: /Already have an account/i }).click();

      // Fill login form
      await page.getByPlaceholder('you@example.com').fill(TEST_USER.email);
      await page.getByPlaceholder('Enter your password').fill(TEST_USER.password);
      await page.getByRole('button', { name: 'Sign In' }).click();

      await page.waitForURL('/dashboard', { timeout: 10000 });
    }
  }

  // Verify we're logged in
  await expect(page.getByText(TEST_USER.name)).toBeVisible({ timeout: 5000 });

  // Save authentication state
  await page.context().storageState({ path: authFile });
});

import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test.describe('Login Page', () => {
    test.use({ storageState: { cookies: [], origins: [] } }); // Clear auth for these tests

    test('should redirect unauthenticated users to login', async ({ page }) => {
      // Try to access protected route
      await page.goto('/dashboard');

      // Should be redirected to login
      await expect(page).toHaveURL(/\/login/);
    });

    test('should show login form by default', async ({ page }) => {
      await page.goto('/login');

      // Check login form elements
      await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible();
      await expect(page.getByPlaceholder('you@example.com')).toBeVisible();
      await expect(page.getByPlaceholder('Enter your password')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
    });

    test('should switch between login and register modes', async ({ page }) => {
      await page.goto('/login');

      // Should be in login mode by default
      await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible();

      // Switch to register mode
      await page.getByRole('button', { name: /Sign up/i }).click();
      await expect(page.getByRole('heading', { name: 'Create Account' })).toBeVisible();
      await expect(page.getByPlaceholder('Your name')).toBeVisible();
      await expect(page.getByPlaceholder('Confirm your password')).toBeVisible();

      // Switch back to login mode
      await page.getByRole('button', { name: /Sign in/i }).click();
      await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible();
    });

    test('should disable submit button when form is empty', async ({ page }) => {
      await page.goto('/login');

      // Sign In button should be disabled
      await expect(page.getByRole('button', { name: 'Sign In' })).toBeDisabled();

      // Fill email only
      await page.getByPlaceholder('you@example.com').fill('test@example.com');
      await expect(page.getByRole('button', { name: 'Sign In' })).toBeDisabled();

      // Fill password too
      await page.getByPlaceholder('Enter your password').fill('password123');
      await expect(page.getByRole('button', { name: 'Sign In' })).toBeEnabled();
    });

    test('should show error for invalid credentials', async ({ page }) => {
      await page.goto('/login');

      // Fill invalid credentials
      await page.getByPlaceholder('you@example.com').fill('invalid@example.com');
      await page.getByPlaceholder('Enter your password').fill('wrongpassword');
      await page.getByRole('button', { name: 'Sign In' }).click();

      // Should show error message
      await expect(page.getByText(/invalid|failed|error/i)).toBeVisible({ timeout: 10000 });
    });

    test('should require password confirmation on register', async ({ page }) => {
      await page.goto('/login');

      // Switch to register mode
      await page.getByRole('button', { name: /Sign up/i }).click();

      // Fill form with mismatched passwords
      await page.getByPlaceholder('you@example.com').fill('test@example.com');
      await page.getByPlaceholder('Enter your password').fill('password123');
      await page.getByPlaceholder('Confirm your password').fill('different123');

      // Submit button should be disabled or show error
      const submitButton = page.getByRole('button', { name: 'Create Account' });
      await expect(submitButton).toBeDisabled();
    });
  });

  test.describe('Authenticated User', () => {
    // These tests use the authenticated state from setup

    test('should show user info in sidebar', async ({ page }) => {
      await page.goto('/dashboard');

      // Should show user name
      await expect(page.getByText('E2E Test User')).toBeVisible();
      await expect(page.getByText('e2e-test@example.com')).toBeVisible();
    });

    test('should have sign out button', async ({ page }) => {
      await page.goto('/dashboard');

      // Should show sign out button
      await expect(page.getByRole('button', { name: /sign out/i })).toBeVisible();
    });

    test('should redirect to login after sign out', async ({ page }) => {
      await page.goto('/dashboard');

      // Click sign out
      await page.getByRole('button', { name: /sign out/i }).click();

      // Should be redirected to login
      await expect(page).toHaveURL(/\/login/);
    });
  });
});

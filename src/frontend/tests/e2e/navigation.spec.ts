import { test, expect } from './fixtures';

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
  });

  test('should display main layout elements', async ({ page }) => {
    // Check header/branding
    await expect(page.getByRole('heading', { name: 'Framer' })).toBeVisible();
    await expect(page.getByText('Pre-dev thinking framework')).toBeVisible();
  });

  test('should display navigation items', async ({ page }) => {
    // Check navigation items in sidebar
    await expect(page.getByRole('button', { name: /Working Space/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Templates/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Archive/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Settings/i })).toBeVisible();
  });

  test('should switch to Templates space', async ({ page }) => {
    // Click on Templates
    await page.getByRole('button', { name: /Templates/i }).click();

    // Templates button should now have active styling (bg-slate-800)
    const templatesButton = page.getByRole('button', { name: /Templates/i });
    await expect(templatesButton).toHaveClass(/bg-slate-800/);
  });

  test('should switch to Archive space', async ({ page }) => {
    // Click on Archive
    await page.getByRole('button', { name: /Archive/i }).click();

    // Archive button should now have active styling
    const archiveButton = page.getByRole('button', { name: /Archive/i });
    await expect(archiveButton).toHaveClass(/bg-slate-800/);
  });

  test('should switch back to Working Space', async ({ page }) => {
    // Go to templates first
    await page.getByRole('button', { name: /Templates/i }).click();

    // Verify templates is active
    await expect(page.getByRole('button', { name: /Templates/i })).toHaveClass(/bg-slate-800/);

    // Click on Working Space to go back
    await page.getByRole('button', { name: /Working Space/i }).click();

    // Working Space should now be active
    await expect(page.getByRole('button', { name: /Working Space/i })).toHaveClass(/bg-slate-800/);
  });

  test('should show active state for current navigation item', async ({ page }) => {
    // Working Space should be active initially (has text-white class when active)
    const workingSpaceButton = page.getByRole('button', { name: /Working Space/i });
    await expect(workingSpaceButton).toHaveClass(/text-white/);

    // Navigate to templates
    await page.getByRole('button', { name: /Templates/i }).click();

    // Templates should now be active (has text-white class)
    await expect(page.getByRole('button', { name: /Templates/i })).toHaveClass(/text-white/);
    // Working Space should no longer be active (has text-slate-400 instead of text-white)
    await expect(workingSpaceButton).toHaveClass(/text-slate-400/);
  });

  test('should open settings modal', async ({ page }) => {
    // Click settings
    await page.getByRole('button', { name: /Settings/i }).click();

    // Check modal is visible
    await expect(page.getByRole('dialog')).toBeVisible();
  });
});

import { test, expect } from './fixtures';

test.describe('Knowledge Page', () => {
  test('should navigate to knowledge page from sidebar', async ({ page }) => {
    await page.goto('/dashboard');

    // Click Knowledge in sidebar
    await page.getByRole('button', { name: /Knowledge/i }).click();

    // Should navigate to /knowledge
    await expect(page).toHaveURL(/\/knowledge/);
  });

  test('should display knowledge page header', async ({ page }) => {
    await page.goto('/knowledge');

    // Should show page title
    await expect(page.getByRole('heading', { name: 'Knowledge Base' })).toBeVisible();
    await expect(page.getByText('Team patterns, decisions, and lessons learned')).toBeVisible();
  });

  test('should display Add Knowledge button', async ({ page }) => {
    await page.goto('/knowledge');

    await expect(page.getByRole('button', { name: /Add Knowledge/i })).toBeVisible();
  });

  test('should display search bar', async ({ page }) => {
    await page.goto('/knowledge');

    // Should show search input
    await expect(page.getByPlaceholder(/Search knowledge semantically/i)).toBeVisible();

    // Should show search button
    await expect(page.getByRole('button', { name: 'Search' })).toBeVisible();
  });

  test('should display category tabs', async ({ page }) => {
    await page.goto('/knowledge');

    // Should show All tab and category tabs
    await expect(page.getByRole('button', { name: 'All' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Pattern' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Decision' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Prediction' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Context' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Lesson' })).toBeVisible();
  });

  test('should show empty state when no entries', async ({ page }) => {
    await page.goto('/knowledge');

    // Should show empty state message
    await expect(page.getByText(/No knowledge entries yet/i)).toBeVisible();
  });

  test('should open Add Knowledge modal', async ({ page }) => {
    await page.goto('/knowledge');

    // Click Add Knowledge button
    await page.getByRole('button', { name: /Add Knowledge/i }).click();

    // Modal should appear
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('dialog').getByText('Add Knowledge')).toBeVisible();
    await expect(page.getByText('Record a pattern, decision, or lesson for the team')).toBeVisible();
  });

  test('should show form fields in Add Knowledge modal', async ({ page }) => {
    await page.goto('/knowledge');

    // Open modal
    await page.getByRole('button', { name: /Add Knowledge/i }).click();

    // Check form fields
    await expect(page.getByPlaceholder('Short descriptive title')).toBeVisible();
    await expect(page.getByPlaceholder(/The pattern, decision, or lesson/i)).toBeVisible();
    await expect(page.getByPlaceholder(/auth, database, performance/i)).toBeVisible();

    // Check buttons
    await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add Entry' })).toBeVisible();
  });

  test('should disable Add Entry button when form is empty', async ({ page }) => {
    await page.goto('/knowledge');

    // Open modal
    await page.getByRole('button', { name: /Add Knowledge/i }).click();

    // Add Entry should be disabled
    await expect(page.getByRole('button', { name: 'Add Entry' })).toBeDisabled();
  });

  test('should enable Add Entry button when title and content are filled', async ({ page }) => {
    await page.goto('/knowledge');

    // Open modal
    await page.getByRole('button', { name: /Add Knowledge/i }).click();

    // Fill title and content
    await page.getByPlaceholder('Short descriptive title').fill('Test Pattern');
    await page.getByPlaceholder(/The pattern, decision, or lesson/i).fill('This is a test pattern');

    // Add Entry should be enabled
    await expect(page.getByRole('button', { name: 'Add Entry' })).toBeEnabled();
  });

  test('should close Add Knowledge modal on Cancel', async ({ page }) => {
    await page.goto('/knowledge');

    // Open modal
    await page.getByRole('button', { name: /Add Knowledge/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // Click Cancel
    await page.getByRole('button', { name: 'Cancel' }).click();

    // Modal should be closed
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });

  test('should switch category tabs', async ({ page }) => {
    await page.goto('/knowledge');

    // All tab should be active by default (has bg-slate-900)
    const allTab = page.getByRole('button', { name: 'All' });
    await expect(allTab).toHaveClass(/bg-slate-900/);

    // Click Pattern tab
    const patternTab = page.getByRole('button', { name: 'Pattern' });
    await patternTab.click();

    // Pattern tab should now be active
    await expect(patternTab).toHaveClass(/bg-slate-900/);

    // All tab should no longer be active
    await expect(allTab).toHaveClass(/bg-slate-100/);
  });

  test('should have navigation sidebar on knowledge page', async ({ page }) => {
    await page.goto('/knowledge');

    // Sidebar should be present with nav items
    await expect(page.getByRole('heading', { name: 'Framer' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Working Space/i })).toBeVisible();
    // Use exact match to avoid matching "Add Knowledge" button
    await expect(page.getByRole('button', { name: 'Knowledge', exact: true })).toBeVisible();

    // Knowledge should be the active nav item
    const knowledgeButton = page.getByRole('button', { name: 'Knowledge', exact: true });
    await expect(knowledgeButton).toHaveClass(/bg-slate-800/);
  });

  test('should navigate back to dashboard from knowledge page', async ({ page }) => {
    await page.goto('/knowledge');

    // Click Working Space in the sidebar
    await page.getByRole('button', { name: /Working Space/i }).click();

    // Should navigate to dashboard (clicking Working Space sets space and redirects)
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
  });

  test('should type in search and trigger search', async ({ page }) => {
    await page.goto('/knowledge');

    // Type in search - click first to ensure focus
    const searchInput = page.getByPlaceholder(/Search knowledge semantically/i);
    await searchInput.click();
    await searchInput.pressSequentially('authentication patterns', { delay: 50 });
    await expect(searchInput).toHaveValue('authentication patterns', { timeout: 10000 });

    // Click search button
    await page.getByRole('button', { name: 'Search' }).click();

    // The search should have been triggered (may show "no results" since DB is empty)
    await page.waitForTimeout(1000);
  });
});

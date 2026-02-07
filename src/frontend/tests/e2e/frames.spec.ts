import { test, expect, testData } from './fixtures';

test.describe('Frame Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
  });

  test('should display kanban board with columns', async ({ page }) => {
    // Check that kanban columns exist
    await expect(page.getByRole('heading', { name: 'Draft' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'In Review' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Ready' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Feedback' })).toBeVisible();
  });

  test('should have New Frame button', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'New Frame' })).toBeVisible();
  });

  test('should navigate to conversation page on New Frame click', async ({ page }) => {
    // Click new frame button
    await page.getByRole('button', { name: 'New Frame' }).click();

    // Should navigate to /new page
    await expect(page).toHaveURL(/\/new/);

    // Should show the conversation interface
    await expect(page.getByText('New Frame')).toBeVisible();
    await expect(page.getByText(/Describe your problem/i)).toBeVisible();
  });

  test('should create a Bug Fix frame', async ({ page, createFrame }) => {
    await createFrame('bug');

    // Check that we're in frame detail view
    await expect(page.getByRole('heading', { name: 'Problem Statement' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'User Perspective' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Engineering Framing' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Validation Thinking' })).toBeVisible();

    // Check for Bug Fix specific checklist
    await expect(page.getByRole('heading', { name: /Bug.*Checklist/i })).toBeVisible();
  });

  test('should create a Feature frame', async ({ page, createFrame }) => {
    await createFrame('feature');

    // Check that we're in frame detail view
    await expect(page.getByRole('heading', { name: 'Problem Statement' })).toBeVisible();

    // Check for Feature specific checklist
    await expect(page.getByRole('heading', { name: /Feature.*Checklist/i })).toBeVisible();
  });

  test('should create an Exploration frame', async ({ page, createFrame }) => {
    await createFrame('exploration');

    // Check that we're in frame detail view
    await expect(page.getByRole('heading', { name: 'Problem Statement' })).toBeVisible();

    // Check for Exploration specific checklist
    await expect(page.getByRole('heading', { name: /Exploration.*Checklist/i })).toBeVisible();
  });

  test('should edit problem statement', async ({ page, createFrame }) => {
    await createFrame('bug');

    // Find the problem statement textarea (first textarea on the page)
    const problemTextarea = page.locator('textarea').first();
    await problemTextarea.fill(testData.frames.validBugFrame.problemStatement);

    // Verify content is entered
    await expect(problemTextarea).toHaveValue(testData.frames.validBugFrame.problemStatement);

    // Should show saved indicator
    await expect(page.getByText(/saved/i)).toBeVisible({ timeout: 5000 });
  });

  test('should navigate back to dashboard using breadcrumb', async ({ page, createFrame }) => {
    await createFrame('bug');

    // Wait for frame detail to load
    await expect(page.getByRole('heading', { name: 'Problem Statement' })).toBeVisible();

    // Click Dashboard link in breadcrumb to go back
    await page.getByRole('button', { name: 'Dashboard' }).click();

    // Should be back on dashboard
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole('button', { name: 'New Frame' })).toBeVisible();
  });

  test('should show frame type selector on detail page', async ({ page, createFrame }) => {
    await createFrame('feature');

    // Check that frame type dropdown is visible
    const typeSelector = page.locator('button').filter({ hasText: 'Feature' }).first();
    await expect(typeSelector).toBeVisible();
  });

  test('should show frame status on detail page', async ({ page, createFrame }) => {
    await createFrame('bug');

    // New frame should be in Draft status (the status badge, not the "Save Draft" button)
    const statusBadge = page.locator('.rounded-full').filter({ hasText: 'Draft' });
    await expect(statusBadge).toBeVisible();
  });

  test('should have Save Draft button', async ({ page, createFrame }) => {
    await createFrame('bug');

    // Check Save Draft button exists
    await expect(page.getByRole('button', { name: 'Save Draft' })).toBeVisible();
  });

  test('should have checklist items', async ({ page, createFrame }) => {
    await createFrame('bug');

    // Check that checklist items exist
    await expect(page.getByRole('checkbox').first()).toBeVisible();
  });

  test('should toggle checklist item', async ({ page, createFrame }) => {
    await createFrame('bug');

    // Find first checkbox
    const checkbox = page.getByRole('checkbox').first();

    // Should be unchecked initially
    await expect(checkbox).not.toBeChecked();

    // Click to check
    await checkbox.click();

    // Should be checked now
    await expect(checkbox).toBeChecked();
  });

  test('should show checklist progress', async ({ page, createFrame }) => {
    await createFrame('bug');

    // Should show progress indicator
    await expect(page.getByText(/\d+\/\d+/)).toBeVisible();
  });

  test('should filter frames with search', async ({ page }) => {
    // Check search input exists
    const searchInput = page.getByPlaceholder(/search/i);
    await expect(searchInput).toBeVisible();

    // Type in search
    await searchInput.fill('test');

    // Search should filter (even if no results, the UI should respond)
    await expect(searchInput).toHaveValue('test');
  });

  test('should have type filter', async ({ page }) => {
    // Check type filter dropdown exists
    await expect(page.getByRole('combobox').filter({ hasText: /All Types/i })).toBeVisible();
  });

  test('should have owner filter', async ({ page }) => {
    // Check owner filter dropdown exists
    await expect(page.getByRole('combobox').filter({ hasText: /All Owners/i })).toBeVisible();
  });
});

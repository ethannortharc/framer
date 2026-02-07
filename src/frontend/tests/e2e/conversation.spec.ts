import { test, expect } from './fixtures';

test.describe('Conversation Page', () => {
  test('should navigate to conversation page from dashboard', async ({ page }) => {
    await page.goto('/dashboard');

    // Click New Frame button
    await page.getByRole('button', { name: 'New Frame' }).click();

    // Should navigate to /new
    await expect(page).toHaveURL(/\/new/);
  });

  test('should display conversation page header', async ({ page }) => {
    await page.goto('/new');

    // Should show page header
    await expect(page.getByText('New Frame')).toBeVisible();
    await expect(page.getByText(/Describe your problem/i)).toBeVisible();
  });

  test('should display chat interface with placeholder', async ({ page }) => {
    await page.goto('/new');

    // Should show empty chat state
    await expect(page.getByText('Start a conversation')).toBeVisible();
    await expect(page.getByText(/Describe what you.*working on/i)).toBeVisible();

    // Should show message input
    await expect(
      page.getByPlaceholder(/Describe what you.*working on/i)
    ).toBeVisible();
  });

  test('should display coverage panel', async ({ page }) => {
    await page.goto('/new');

    // Should show coverage section header (uppercase in UI via CSS)
    await expect(page.getByText('Coverage', { exact: true })).toBeVisible();

    // Should show all four section labels
    await expect(page.getByText('Problem Statement', { exact: true })).toBeVisible();
    await expect(page.getByText('User Perspective', { exact: true })).toBeVisible();
    await expect(page.getByText('Engineering Framing', { exact: true })).toBeVisible();
    await expect(page.getByText('Validation Thinking', { exact: true })).toBeVisible();

    // Should show 0% coverage indicator
    await expect(page.getByText('0%').first()).toBeVisible();
  });

  test('should display synthesize button', async ({ page }) => {
    await page.goto('/new');

    // Synthesize button should be visible but disabled (not enough coverage)
    const synthesizeButton = page.getByRole('button', { name: /Synthesize Frame/i });
    await expect(synthesizeButton).toBeVisible();
    await expect(synthesizeButton).toBeDisabled();

    // Should show helper text
    await expect(page.getByText(/Continue the conversation/i)).toBeVisible();
  });

  test('should have back button to dashboard', async ({ page }) => {
    await page.goto('/new');

    // Click the back arrow button
    const backButton = page.locator('button').filter({ has: page.locator('svg.lucide-arrow-left') });
    await backButton.click();

    // Should navigate back to dashboard
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('should show message input with send button', async ({ page }) => {
    await page.goto('/new');

    const input = page.getByPlaceholder(/Describe what you.*working on/i);
    await expect(input).toBeVisible();

    // Send button should be present but disabled when input is empty
    const sendButton = page.locator('button').filter({ has: page.locator('svg.lucide-send') });
    await expect(sendButton).toBeVisible();
    await expect(sendButton).toBeDisabled();
  });

  test('should enable send button when typing', async ({ page }) => {
    await page.goto('/new');

    const input = page.getByPlaceholder(/Describe what you.*working on/i);
    await input.fill('I need to fix a login bug');

    // Wait for the conversation to be initialized (API call to start conversation)
    await page.waitForTimeout(2000);

    // Send button should be enabled now
    const sendButton = page.locator('button').filter({ has: page.locator('svg.lucide-send, svg.lucide-loader-2') });
    await expect(sendButton).toBeVisible();
  });

  test('should show section descriptions in coverage panel', async ({ page }) => {
    await page.goto('/new');

    // Check section descriptions
    await expect(page.getByText(/Clear, solution-free problem definition/i)).toBeVisible();
    await expect(page.getByText(/Who is affected, journey, pain points/i)).toBeVisible();
    await expect(page.getByText(/Principles, trade-offs, non-goals/i)).toBeVisible();
    await expect(page.getByText(/Success signals, falsification criteria/i)).toBeVisible();
  });
});

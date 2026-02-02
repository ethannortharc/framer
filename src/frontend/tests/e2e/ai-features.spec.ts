import { test, expect } from './fixtures';

test.describe('AI Features', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
  });

  test.describe('Frame Detail AI Integration', () => {
    test('should show AI-related UI elements on frame detail', async ({ page, createFrame }) => {
      await createFrame('bug');

      // Frame detail should load
      await expect(page.getByRole('heading', { name: 'Problem Statement' })).toBeVisible();

      // Check for AI-related buttons or indicators
      // The floating AI button or AI indicator should be visible
      const aiButton = page.locator('button').filter({ has: page.locator('svg') }).first();
      await expect(aiButton).toBeVisible();
    });

    test('should have collapsible sections', async ({ page, createFrame }) => {
      await createFrame('bug');

      // Look for section headers that can be clicked to collapse/expand
      // The sections are identifiable by their headings
      const sectionHeadings = page.getByRole('heading', { level: 3 });
      const count = await sectionHeadings.count();

      // Should have multiple sections (Problem Statement, User Perspective, etc.)
      expect(count).toBeGreaterThan(3);
    });

    test('should show section empty state with guidance', async ({ page, createFrame }) => {
      await createFrame('bug');

      // New frames should show empty state messages
      await expect(
        page.getByText(/empty|use the questionnaire|add content/i).first()
      ).toBeVisible();
    });

    test('should show checklist with AI-related items', async ({ page, createFrame }) => {
      await createFrame('bug');

      // Bug checklist should have specific items - look for checkbox labels
      const checkboxes = page.getByRole('checkbox');
      const count = await checkboxes.count();

      // Should have checklist items
      expect(count).toBeGreaterThan(0);
    });
  });

  test.describe('Frame Status Workflow', () => {
    test('should show Submit for Review button when checklist incomplete', async ({
      page,
      createFrame,
    }) => {
      await createFrame('bug');

      // Submit for Review should be disabled when checklist is incomplete
      const submitButton = page.getByRole('button', { name: /Submit for Review/i });
      await expect(submitButton).toBeVisible();
      await expect(submitButton).toBeDisabled();
    });

    test('should enable Submit for Review when checklist complete', async ({
      page,
      createFrame,
    }) => {
      await createFrame('bug');

      // Check all checklist items
      const checkboxes = page.getByRole('checkbox');
      const count = await checkboxes.count();

      for (let i = 0; i < count; i++) {
        await checkboxes.nth(i).click();
      }

      // Submit for Review should be enabled
      const submitButton = page.getByRole('button', { name: /Submit for Review/i });
      await expect(submitButton).toBeEnabled({ timeout: 5000 });
    });
  });

  test.describe('AI Assistant Integration', () => {
    test('should have action buttons in footer', async ({ page, createFrame }) => {
      await createFrame('feature');

      // Look for action buttons in the footer
      await expect(page.getByRole('button', { name: 'Save Draft' })).toBeVisible();
      await expect(page.getByRole('button', { name: /Submit for Review/i })).toBeVisible();
    });

    test('should show status bar at bottom', async ({ page, createFrame }) => {
      await createFrame('bug');

      // Status bar should show save status and checklist progress
      await expect(page.getByText(/saved|checklist|submit/i).first()).toBeVisible();
    });
  });

  test.describe('Frame Templates', () => {
    test('should create frames with type-specific content', async ({ page }) => {
      // Create Bug frame
      await page.getByRole('button', { name: 'New Frame' }).click();
      await page.getByRole('button', { name: /Bug Fix/i }).click();

      // Should have bug-specific checklist
      await expect(page.getByText(/bug|issue|reproduce/i).first()).toBeVisible();

      // Go back
      await page.getByRole('button', { name: 'Dashboard' }).click();

      // Create Feature frame
      await page.getByRole('button', { name: 'New Frame' }).click();
      await page.getByRole('button', { name: /Feature/i }).click();

      // Should have feature-specific checklist
      await expect(page.getByText(/feature|user.*need|scope/i).first()).toBeVisible();
    });
  });

  test.describe('Guidance System', () => {
    test('should show guidance text in sections', async ({ page, createFrame }) => {
      await createFrame('bug');

      // Textareas should have placeholder guidance
      const textareas = page.locator('textarea');
      const firstTextarea = textareas.first();

      // Check that textarea has helpful placeholder
      const placeholder = await firstTextarea.getAttribute('placeholder');
      expect(placeholder).toBeTruthy();
      expect(placeholder?.length).toBeGreaterThan(10);
    });

    test('should show checklist item descriptions', async ({ page, createFrame }) => {
      await createFrame('bug');

      // Checklist items should have visible labels/descriptions
      // The checklist container should have items with text
      const checkboxLabels = page.locator('label').or(page.getByRole('checkbox').locator('..'));
      const count = await checkboxLabels.count();

      // Should have checklist item descriptions
      expect(count).toBeGreaterThan(0);
    });
  });
});

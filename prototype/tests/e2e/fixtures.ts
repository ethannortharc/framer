import { test as base, expect } from '@playwright/test';

/**
 * Extended test fixtures for Framer E2E tests
 */

// Custom test fixture with helper methods
export const test = base.extend<{
  createFrame: (type: 'bug' | 'feature' | 'exploration') => Promise<void>;
  enableAPIMode: () => Promise<void>;
  openAISidebar: () => Promise<void>;
}>({
  // Helper to create a new frame
  createFrame: async ({ page }, use) => {
    const createFrame = async (type: 'bug' | 'feature' | 'exploration') => {
      await page.click('button:has-text("New Frame")');

      const typeLabels = {
        bug: 'Bug Fix',
        feature: 'Feature',
        exploration: 'Exploration',
      };

      await page.click(`text=${typeLabels[type]}`);
      await page.click('text=Manual Input');

      // Wait for frame detail to load
      await expect(page.locator('text=Problem Statement')).toBeVisible();
    };

    await use(createFrame);
  },

  // Helper to enable API mode
  enableAPIMode: async ({ page }, use) => {
    const enableAPIMode = async () => {
      await page.click('text=Settings');
      const mockButton = page.locator('button:has-text("Mock Mode")');
      if (await mockButton.isVisible()) {
        await mockButton.click();
      }
      await page.keyboard.press('Escape');
    };

    await use(enableAPIMode);
  },

  // Helper to open AI sidebar
  openAISidebar: async ({ page }, use) => {
    const openAISidebar = async () => {
      const aiButton = page
        .locator('button')
        .filter({ has: page.locator('svg.lucide-sparkles') })
        .first();
      await aiButton.click();
      await expect(page.locator('text=AI Assistant')).toBeVisible();
    };

    await use(openAISidebar);
  },
});

export { expect };

/**
 * Test data generators
 */
export const testData = {
  frames: {
    validBugFrame: {
      problemStatement: 'Users cannot login when using special characters in their password, causing authentication failures.',
      user: 'End User',
      context: 'Production environment with OAuth integration',
      journeySteps: [
        'User enters email',
        'User enters password with special chars',
        'User clicks login button',
        'System shows authentication error',
      ],
      painPoints: [
        'No clear error message',
        'Cannot use preferred password',
      ],
      principles: [
        'All valid password characters should be accepted',
        'Error messages should be descriptive',
      ],
      nonGoals: [
        'Changing password policy',
        'Adding new authentication methods',
      ],
      successSignals: [
        'All special characters work in passwords',
        'No authentication errors on valid credentials',
      ],
      disconfirmingEvidence: [
        'If the issue persists with simple passwords',
        'If the issue is server-side only',
      ],
    },
  },

  users: {
    testUser: {
      email: 'test@example.com',
      password: 'testPassword123!',
      name: 'Test User',
    },
  },
};

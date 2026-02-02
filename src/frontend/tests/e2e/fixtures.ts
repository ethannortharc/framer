import { test as base, expect } from '@playwright/test';

/**
 * Extended test fixtures for Framer Production Frontend E2E tests
 *
 * These tests run against the production frontend which requires authentication.
 * Auth state is set up by auth.setup.ts and reused across all tests.
 */

// Custom test fixture with helper methods
export const test = base.extend<{
  createFrame: (type: 'bug' | 'feature' | 'exploration') => Promise<void>;
}>({
  // Helper to create a new frame
  createFrame: async ({ page }, use) => {
    const createFrame = async (type: 'bug' | 'feature' | 'exploration') => {
      // Click New Frame button
      await page.getByRole('button', { name: 'New Frame' }).click();

      // Wait for modal
      await expect(page.getByRole('dialog')).toBeVisible();

      const typeLabels = {
        bug: 'Bug Fix',
        feature: 'Feature',
        exploration: 'Exploration',
      };

      // Select frame type
      await page.getByRole('button', { name: new RegExp(typeLabels[type], 'i') }).click();

      // Wait for frame detail to load
      await expect(page.getByRole('heading', { name: 'Problem Statement' })).toBeVisible();
    };

    await use(createFrame);
  },
});

export { expect };

/**
 * Test data
 */
export const testData = {
  frames: {
    validBugFrame: {
      problemStatement:
        'Users cannot login when using special characters in their password, causing authentication failures.',
      userPerspective: 'End users trying to log in with complex passwords',
      engineeringFraming: 'Password encoding issue in authentication flow',
      validationThinking: 'Test with various special character combinations',
    },
    validFeatureFrame: {
      problemStatement:
        'Users need the ability to export frames as PDF documents for sharing with stakeholders.',
      userPerspective: 'Product managers sharing frame documents with executives',
      engineeringFraming: 'PDF generation service with frame data serialization',
      validationThinking: 'Verify PDF output matches frame content',
    },
  },

  users: {
    testUser: {
      email: 'e2e-test@example.com',
      password: 'E2ETestPassword123!',
      name: 'E2E Test User',
    },
  },
};

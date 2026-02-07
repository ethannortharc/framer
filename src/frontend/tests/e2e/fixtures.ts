import { test as base, expect } from '@playwright/test';

/**
 * Extended test fixtures for Framer Production Frontend E2E tests
 *
 * These tests run against the production frontend which requires authentication.
 * Auth state is set up by auth.setup.ts and reused across all tests.
 */

// Custom test fixture with helper methods
export const test = base.extend<{
  createFrame: (type: 'bug' | 'feature' | 'exploration') => Promise<string>;
}>({
  // Helper to create a new frame via API and navigate to it
  createFrame: async ({ page, request }, use) => {
    const createFrame = async (type: 'bug' | 'feature' | 'exploration'): Promise<string> => {
      const apiBase = process.env.PLAYWRIGHT_API_BASE_URL || 'http://localhost:8000';

      // Create frame via API
      const response = await request.post(`${apiBase}/api/frames`, {
        data: {
          type,
          owner: 'e2e-test-user',
        },
      });

      expect(response.ok()).toBeTruthy();
      const frame = await response.json();

      // Navigate to the frame detail page with full reload
      await page.goto(`/frame/${frame.id}`, { waitUntil: 'networkidle' });

      // Wait for frame detail to load (may take time for API fetch + store hydration)
      await expect(page.getByRole('heading', { name: 'Problem Statement' })).toBeVisible({ timeout: 15000 });

      return frame.id;
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

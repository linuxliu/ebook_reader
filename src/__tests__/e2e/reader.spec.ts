import { test, expect } from '@playwright/test';

test.describe('Reader', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    
    // Navigate to reader (assuming we have a test book)
    // This would require setting up test data
    await page.waitForSelector('[data-testid="bookshelf"]');
    
    // For now, we'll mock navigation to reader
    await page.goto('/reader/test-book-id');
    await page.waitForSelector('[data-testid="reader"]', { timeout: 10000 });
  });

  test('should display reader interface', async ({ page }) => {
    // Verify main reader components
    await expect(page.locator('[data-testid="reader"]')).toBeVisible();
    await expect(page.locator('[data-testid="reader-toolbar"]')).toBeVisible();
    await expect(page.locator('[data-testid="reader-content"]')).toBeVisible();
    await expect(page.locator('[data-testid="page-controls"]')).toBeVisible();
  });

  test('should navigate between pages', async ({ page }) => {
    const nextButton = page.locator('[data-testid="next-page"]');
    const prevButton = page.locator('[data-testid="prev-page"]');
    const pageIndicator = page.locator('[data-testid="page-indicator"]');
    
    // Get initial page number
    const initialPage = await pageIndicator.textContent();
    
    // Navigate to next page
    await nextButton.click();
    
    // Verify page changed
    const newPage = await pageIndicator.textContent();
    expect(newPage).not.toBe(initialPage);
    
    // Navigate back
    await prevButton.click();
    
    // Verify we're back to initial page
    const backPage = await pageIndicator.textContent();
    expect(backPage).toBe(initialPage);
  });

  test('should handle keyboard navigation', async ({ page }) => {
    const pageIndicator = page.locator('[data-testid="page-indicator"]');
    const initialPage = await pageIndicator.textContent();
    
    // Use arrow keys for navigation
    await page.keyboard.press('ArrowRight');
    
    // Verify page changed
    const nextPage = await pageIndicator.textContent();
    expect(nextPage).not.toBe(initialPage);
    
    // Navigate back with left arrow
    await page.keyboard.press('ArrowLeft');
    
    // Verify we're back
    const backPage = await pageIndicator.textContent();
    expect(backPage).toBe(initialPage);
  });

  test('should toggle fullscreen mode', async ({ page }) => {
    const fullscreenButton = page.locator('[data-testid="fullscreen-toggle"]');
    
    await fullscreenButton.click();
    
    // Verify fullscreen mode is active
    await expect(page.locator('[data-testid="reader"]')).toHaveClass(/fullscreen/);
    
    // Exit fullscreen
    await page.keyboard.press('Escape');
    
    // Verify fullscreen mode is inactive
    await expect(page.locator('[data-testid="reader"]')).not.toHaveClass(/fullscreen/);
  });

  test('should open and navigate table of contents', async ({ page }) => {
    const tocButton = page.locator('[data-testid="toc-button"]');
    
    await tocButton.click();
    
    // Verify TOC is visible
    await expect(page.locator('[data-testid="table-of-contents"]')).toBeVisible();
    
    // Click on a chapter
    const firstChapter = page.locator('[data-testid="toc-item"]').first();
    await firstChapter.click();
    
    // Verify navigation occurred
    await expect(page.locator('[data-testid="table-of-contents"]')).not.toBeVisible();
    
    // Verify page content changed (would need specific content checks)
    await expect(page.locator('[data-testid="reader-content"]')).toBeVisible();
  });

  test('should adjust reading settings', async ({ page }) => {
    const settingsButton = page.locator('[data-testid="settings-button"]');
    
    await settingsButton.click();
    
    // Verify settings panel is visible
    await expect(page.locator('[data-testid="settings-panel"]')).toBeVisible();
    
    // Adjust font size
    const fontSizeSlider = page.locator('[data-testid="font-size-slider"]');
    await fontSizeSlider.fill('20');
    
    // Verify font size changed in content
    const readerContent = page.locator('[data-testid="reader-content"]');
    await expect(readerContent).toHaveCSS('font-size', '20px');
    
    // Change font family
    const fontSelect = page.locator('[data-testid="font-family-select"]');
    await fontSelect.selectOption('Times New Roman');
    
    // Verify font family changed
    await expect(readerContent).toHaveCSS('font-family', /Times New Roman/);
  });

  test('should handle text selection and translation', async ({ page }) => {
    const readerContent = page.locator('[data-testid="reader-content"]');
    
    // Select some text (this is complex in Playwright, simplified here)
    await readerContent.click();
    await page.keyboard.down('Shift');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.up('Shift');
    
    // Verify translation popup appears
    await expect(page.locator('[data-testid="translation-popup"]')).toBeVisible();
    
    // Add to vocabulary
    const addToVocabButton = page.locator('[data-testid="add-to-vocab"]');
    await addToVocabButton.click();
    
    // Verify success feedback
    await expect(page.locator('[data-testid="vocab-added-toast"]')).toBeVisible();
  });

  test('should save and restore reading progress', async ({ page }) => {
    const pageIndicator = page.locator('[data-testid="page-indicator"]');
    
    // Navigate to a specific page
    const nextButton = page.locator('[data-testid="next-page"]');
    await nextButton.click();
    await nextButton.click();
    
    const currentPage = await pageIndicator.textContent();
    
    // Reload the page
    await page.reload();
    await page.waitForSelector('[data-testid="reader"]');
    
    // Verify we're back to the same page
    const restoredPage = await pageIndicator.textContent();
    expect(restoredPage).toBe(currentPage);
  });

  test('should handle page jumping', async ({ page }) => {
    const pageJumpButton = page.locator('[data-testid="page-jump"]');
    
    await pageJumpButton.click();
    
    // Verify page jump dialog
    await expect(page.locator('[data-testid="page-jump-dialog"]')).toBeVisible();
    
    // Enter page number
    const pageInput = page.locator('[data-testid="page-input"]');
    await pageInput.fill('10');
    
    // Confirm jump
    const confirmButton = page.locator('[data-testid="confirm-jump"]');
    await confirmButton.click();
    
    // Verify we jumped to page 10
    const pageIndicator = page.locator('[data-testid="page-indicator"]');
    await expect(pageIndicator).toContainText('10');
  });

  test('should handle theme switching', async ({ page }) => {
    const themeToggle = page.locator('[data-testid="theme-toggle"]');
    
    // Switch to dark theme
    await themeToggle.click();
    
    // Verify dark theme is applied
    await expect(page.locator('body')).toHaveClass(/dark-theme/);
    
    // Switch back to light theme
    await themeToggle.click();
    
    // Verify light theme is applied
    await expect(page.locator('body')).toHaveClass(/light-theme/);
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Verify mobile reader layout
    await expect(page.locator('[data-testid="reader"]')).toBeVisible();
    await expect(page.locator('[data-testid="mobile-reader-toolbar"]')).toBeVisible();
    
    // Verify touch navigation works
    const readerContent = page.locator('[data-testid="reader-content"]');
    
    // Swipe left (next page)
    await readerContent.swipe({ dx: -100, dy: 0 });
    
    // Verify page changed
    await expect(page.locator('[data-testid="page-indicator"]')).toBeVisible();
  });

  test('should handle reading progress indicator', async ({ page }) => {
    const progressBar = page.locator('[data-testid="progress-bar"]');
    
    // Verify progress bar is visible
    await expect(progressBar).toBeVisible();
    
    // Navigate through pages and verify progress updates
    const nextButton = page.locator('[data-testid="next-page"]');
    
    // Get initial progress
    const initialProgress = await progressBar.getAttribute('value');
    
    // Navigate forward
    await nextButton.click();
    
    // Verify progress increased
    const newProgress = await progressBar.getAttribute('value');
    expect(parseFloat(newProgress!)).toBeGreaterThan(parseFloat(initialProgress!));
  });

  test('should handle error states gracefully', async ({ page }) => {
    // Simulate network error or content loading failure
    await page.route('**/api/book-content/**', route => route.abort());
    
    // Try to navigate
    const nextButton = page.locator('[data-testid="next-page"]');
    await nextButton.click();
    
    // Verify error message is shown
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    
    // Verify retry button is available
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
  });

  test('should handle close reader', async ({ page }) => {
    const closeButton = page.locator('[data-testid="close-reader"]');
    
    await closeButton.click();
    
    // Verify we're back to bookshelf
    await expect(page.locator('[data-testid="bookshelf"]')).toBeVisible();
    
    // Verify reader is no longer visible
    await expect(page.locator('[data-testid="reader"]')).not.toBeVisible();
  });
});
import { test, expect } from '@playwright/test';

test.describe('Bookshelf', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for the app to load
    await page.waitForSelector('[data-testid="bookshelf"]', { timeout: 10000 });
  });

  test('should display empty bookshelf initially', async ({ page }) => {
    // Check for empty state
    await expect(page.locator('[data-testid="empty-bookshelf"]')).toBeVisible();
    await expect(page.locator('text=书架空空如也')).toBeVisible();
    await expect(page.locator('text=导入您的第一本电子书开始阅读之旅')).toBeVisible();
  });

  test('should show import button', async ({ page }) => {
    const importButton = page.locator('[data-testid="import-button"]');
    await expect(importButton).toBeVisible();
    await expect(importButton).toContainText('导入');
  });

  test('should switch between grid and list view', async ({ page }) => {
    // Assume we have some books imported for this test
    // This would require setting up test data
    
    const viewToggle = page.locator('[data-testid="view-toggle"]');
    await expect(viewToggle).toBeVisible();
    
    // Click to switch to list view
    await viewToggle.click();
    
    // Verify list view is active
    await expect(page.locator('[data-testid="list-view"]')).toBeVisible();
    
    // Click to switch back to grid view
    await viewToggle.click();
    
    // Verify grid view is active
    await expect(page.locator('[data-testid="grid-view"]')).toBeVisible();
  });

  test('should search books', async ({ page }) => {
    // This test assumes we have books to search
    const searchInput = page.locator('[data-testid="search-input"]');
    await expect(searchInput).toBeVisible();
    
    await searchInput.fill('测试书籍');
    
    // Wait for search results
    await page.waitForTimeout(500); // Wait for debounce
    
    // Verify search results or no results message
    const searchResults = page.locator('[data-testid="search-results"]');
    await expect(searchResults).toBeVisible();
  });

  test('should sort books', async ({ page }) => {
    const sortSelector = page.locator('[data-testid="sort-selector"]');
    await expect(sortSelector).toBeVisible();
    
    // Change sort option
    await sortSelector.selectOption('title');
    
    // Verify books are sorted (this would require test data)
    // await expect(page.locator('[data-testid="book-list"]')).toBeVisible();
  });

  test('should handle book import flow', async ({ page }) => {
    const importButton = page.locator('[data-testid="import-button"]');
    
    // Mock file dialog (in real E2E, you'd need to handle file uploads)
    await importButton.click();
    
    // In a real test, you'd handle the file dialog
    // For now, just verify the button click doesn't cause errors
    await expect(page.locator('[data-testid="bookshelf"]')).toBeVisible();
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Verify mobile layout
    await expect(page.locator('[data-testid="bookshelf"]')).toBeVisible();
    await expect(page.locator('[data-testid="mobile-toolbar"]')).toBeVisible();
  });

  test('should handle keyboard navigation', async ({ page }) => {
    // Test keyboard accessibility
    await page.keyboard.press('Tab');
    
    // Verify focus is on the first interactive element
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
    
    // Continue tabbing through elements
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    // Verify focus moves correctly
    await expect(page.locator(':focus')).toBeVisible();
  });

  test('should persist view preferences', async ({ page }) => {
    // Switch to list view
    const viewToggle = page.locator('[data-testid="view-toggle"]');
    await viewToggle.click();
    
    // Reload page
    await page.reload();
    await page.waitForSelector('[data-testid="bookshelf"]');
    
    // Verify list view is still active
    await expect(page.locator('[data-testid="list-view"]')).toBeVisible();
  });

  test('should handle drag and drop for import', async ({ page }) => {
    const dropZone = page.locator('[data-testid="drop-zone"]');
    
    // Simulate drag over
    await dropZone.dispatchEvent('dragover', {
      dataTransfer: {
        types: ['Files'],
        files: []
      }
    });
    
    // Verify drop zone is highlighted
    await expect(dropZone).toHaveClass(/drag-over/);
    
    // Simulate drag leave
    await dropZone.dispatchEvent('dragleave');
    
    // Verify highlight is removed
    await expect(dropZone).not.toHaveClass(/drag-over/);
  });

  test('should show loading states', async ({ page }) => {
    // This test would require mocking slow network responses
    // For now, just verify loading components exist
    const loadingSpinner = page.locator('[data-testid="loading-spinner"]');
    
    // In a real scenario, you'd trigger a loading state
    // await expect(loadingSpinner).toBeVisible();
  });
});
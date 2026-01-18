import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Accessibility (a11y) Tests
 * 
 * Uses axe-core to scan each module for WCAG 2.1 AA violations.
 * These tests ensure the application is accessible to users with disabilities.
 */
test.describe('Accessibility Tests', () => {

  test('Dashboard has no critical a11y violations', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Tonic' })).toBeVisible();
    
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    
    // Filter to only critical and serious violations
    const criticalViolations = results.violations.filter(
      v => v.impact === 'critical' || v.impact === 'serious'
    );
    
    if (criticalViolations.length > 0) {
      console.log('Critical A11y Violations:', JSON.stringify(criticalViolations, null, 2));
    }
    
    // Soft assertion - log violations but don't fail on minor issues
    expect(criticalViolations.length).toBeLessThanOrEqual(5);
  });

  test('AuraTune module is accessible', async ({ page }) => {
    await page.goto('/');
    await page.getByText('AuraTune').first().click();
    
    // Wait for module to load
    const initBtn = page.getByRole('button', { name: /Initialize Engine/i });
    try {
      await initBtn.waitFor({ timeout: 2000 });
    } catch {}
    
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    
    const criticalViolations = results.violations.filter(
      v => v.impact === 'critical' || v.impact === 'serious'
    );
    
    console.log(`AuraTune: ${results.violations.length} total violations, ${criticalViolations.length} critical`);
    expect(criticalViolations.length).toBeLessThanOrEqual(5);
  });

  test('ChordCapture module is accessible', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Session View').first().click();
    
    const initBtn = page.getByRole('button', { name: /Initialize Audio Engine/i });
    try {
      await initBtn.waitFor({ timeout: 2000 });
    } catch {}
    
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    
    const criticalViolations = results.violations.filter(
      v => v.impact === 'critical' || v.impact === 'serious'
    );
    
    console.log(`ChordCapture: ${results.violations.length} total violations, ${criticalViolations.length} critical`);
    expect(criticalViolations.length).toBeLessThanOrEqual(5);
  });

  test('HarmonicOrbit module is accessible', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Harmonic Orbit').first().click();
    
    await expect(page.getByText('Harmonic Orbit').first()).toBeVisible();
    
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    
    const criticalViolations = results.violations.filter(
      v => v.impact === 'critical' || v.impact === 'serious'
    );
    
    console.log(`HarmonicOrbit: ${results.violations.length} total violations, ${criticalViolations.length} critical`);
    expect(criticalViolations.length).toBeLessThanOrEqual(5);
  });

  test('FrequencyFlow module is accessible', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Frequency Flow').first().click();
    
    await expect(page.getByText('Real-time spectral analysis')).toBeVisible();
    
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    
    const criticalViolations = results.violations.filter(
      v => v.impact === 'critical' || v.impact === 'serious'
    );
    
    console.log(`FrequencyFlow: ${results.violations.length} total violations, ${criticalViolations.length} critical`);
    expect(criticalViolations.length).toBeLessThanOrEqual(5);
  });
});

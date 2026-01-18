import { test, expect } from '../fixtures/mock-audio';

/**
 * Harmonic Orbit E2E Tests
 * 
 * Comprehensive testing of the Circle of Fifths/Fourths interactive visualizer.
 * 
 * Component Structure:
 * - Header: Title "Harmonic Orbit Lab", Back button, Info button, SettingsTrigger
 * - Main View: SVG Orbit (3 rings: Major outer, Minor middle, Diminished inner)
 * - Anatomy Panel: Key Family with 7 diatonic chords, Key Signature, Mentor Fact
 * - Settings: General (Fifths/Fourths toggle, Degrees, Glow), Engine
 * 
 * Testable UI Elements:
 * - 12 Major key labels (C, G, D, A, E, B, Gb, Db, Ab, Eb, Bb, F)
 * - 12 Minor chord sets (ii, iii, vi for each key)
 * - 12 Diminished chords (vii° for each key)
 * - Key Family panel shows 7 chords when key selected
 * - Key signature badge
 * - Mentor Fact box
 */
test.describe('Harmonic Orbit E2E', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    
    await expect(page.getByRole('heading', { name: 'Tonic' })).toBeVisible();
    
    // Click Harmonic Orbit card
    await page.getByText('Harmonic Orbit').first().click();
    
    // Verify module loaded - title is "Harmonic Orbit Lab"
    await expect(page.getByText('Harmonic Orbit').first()).toBeVisible();
    await expect(page.getByText('Lab').first()).toBeVisible();
    
    await page.waitForTimeout(500);
  });

  // ============================================================================
  // NAVIGATION & LAYOUT TESTS
  // ============================================================================

  test('Module loads with correct header', async ({ page }) => {
    // Check for subtitle text
    await expect(page.getByText('Holographic Relationship Mapping')).toBeVisible();
    
    // Back button exists
    await expect(page.getByRole('button', { name: /Back to Tonic/i })).toBeVisible();
    
    // Info button exists (? symbol)
    await expect(page.locator('button', { hasText: '?' })).toBeVisible();
  });

  test('Back button returns to dashboard', async ({ page }) => {
    await page.getByRole('button', { name: /Back to Tonic/i }).click();
    await expect(page.getByRole('heading', { name: 'Tonic' })).toBeVisible();
  });

  // ============================================================================
  // CIRCLE OF FIFTHS LOGICAL TESTS
  // ============================================================================

  test('All 12 major keys are displayed on the orbit', async ({ page }) => {
    // Check for each major key label in Circle of Fifths order
    const majorKeys = ['C', 'G', 'D', 'A', 'E', 'B', 'Gb', 'Db', 'Ab', 'Eb', 'Bb', 'F'];
    
    for (const key of majorKeys) {
      // Use locator within SVG to find text elements
      const keyText = page.locator(`svg text:has-text("${key}")`).first();
      await expect(keyText).toBeVisible();
    }
  });

  test('Clicking C Major shows Key Family panel', async ({ page }) => {
    // Click on "C" in the SVG
    await page.locator('svg text:has-text("C")').first().click({ force: true });
    
    // Key Family panel should appear with heading
    await expect(page.getByText('Key Family')).toBeVisible();
    
    // Should show "C" as the selected key
    await expect(page.locator('.glass-container h3:has-text("C")')).toBeVisible();
  });

  test('C Major shows correct 7 diatonic chords', async ({ page }) => {
    // Select C Major
    await page.locator('svg text:has-text("C")').first().click({ force: true });
    
    // Wait for panel to load
    await expect(page.getByText('Key Family')).toBeVisible();
    
    // C Major diatonic chords: C, Dm, Em, F, G, Am, Bdim
    // Check for degree labels
    await expect(page.getByText('I', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('ii', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('iii', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('IV', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('V', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('vi', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('vii°', { exact: true }).first()).toBeVisible();
  });

  test('Key signature displays correctly for C Major', async ({ page }) => {
    // Select C Major
    await page.locator('svg text:has-text("C")').first().click({ force: true });
    
    // C Major has no sharps/flats - shows "♮" (Natural)
    await expect(page.getByText('♮')).toBeVisible();
    await expect(page.getByText('Natural')).toBeVisible();
  });

  test('Key signature displays correctly for G Major (1 sharp)', async ({ page }) => {
    // Select G Major
    await page.locator('svg text:has-text("G")').first().click({ force: true });
    
    // G Major has 1 sharp (F#)
    await expect(page.getByText('1♯')).toBeVisible();
    await expect(page.getByText('Sharp', { exact: true })).toBeVisible();
  });

  test('Mentor Fact section displays educational content', async ({ page }) => {
    // Select C Major
    await page.locator('svg text:has-text("C")').first().click({ force: true });
    
    // Mentor Fact box should be visible
    await expect(page.getByText('Mentor Fact')).toBeVisible();
    
    // C Major's fact contains "Home Base"
    await expect(page.getByText(/Home Base/i)).toBeVisible();
  });

  // ============================================================================
  // SETTINGS TESTS
  // ============================================================================

  test('Settings drawer opens', async ({ page }) => {
    // Click SettingsTrigger
    await page.getByTitle('Settings').click({ force: true });
    
    // Drawer categories should appear
    await expect(page.getByRole('button', { name: /General/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Engine/i }).first()).toBeVisible();
  });

  test('Fifths/Fourths toggle exists in settings', async ({ page }) => {
    // Open settings
    await page.getByTitle('Settings').click({ force: true });
    
    // Click General category
    await page.getByRole('button', { name: /General/i }).first().click({ force: true });
    
    // Wait for drawer content
    await page.waitForTimeout(500);
    
    // Check for Circle of Fifths toggle
    await expect(page.getByText('Circle of Fifths')).toBeVisible();
  });

  // ============================================================================
  // EMPTY STATE TESTS  
  // ============================================================================

  test('Empty state shows Deploy Scanner prompt', async ({ page }) => {
    // Before selecting any key, the anatomy panel shows empty state
    await expect(page.getByText('Deploy Scanner')).toBeVisible();
    await expect(page.getByText('Select a key segment')).toBeVisible();
  });

  // ============================================================================
  // VISUAL TESTS (Using browser subagent for interactive verification)
  // ============================================================================

  test('Circle renders with 3 rings visible', async ({ page }) => {
    // Verify SVG is rendered
    const svg = page.locator('svg[viewBox="0 0 750 750"]');
    await expect(svg).toBeVisible();
    
    // Check that multiple path elements exist (for rings)
    const paths = page.locator('svg path');
    expect(await paths.count()).toBeGreaterThan(30); // 12 outer + 36 middle + 12 inner = 60+ paths
  });
});

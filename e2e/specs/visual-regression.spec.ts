import { test, expect } from '@playwright/test';

/**
 * Visual Regression Tests
 * 
 * Captures screenshots of key UI components and compares against baselines.
 * Run with `npx playwright test --update-snapshots` to update baselines.
 */
test.describe( 'Visual Regression Tests', () => {

  test( 'Dashboard layout matches baseline', async ( { page } ) => {
    await page.goto( '/' );
    await expect( page.getByRole( 'heading', { name: 'Tonic' } ) ).toBeVisible();

    // Wait for all cards to render
    await page.waitForTimeout( 500 );

    // Take screenshot of dashboard
    await expect( page ).toHaveScreenshot( 'dashboard.png', {
      maxDiffPixels: 100,
      fullPage: false
    } );
  } );

  test( 'AuraTune tuner circle matches baseline', async ( { page } ) => {
    await page.goto( '/' );
    await page.getByText( 'AuraTune' ).first().click();

    // Wait for module to load (before init)
    await page.waitForTimeout( 500 );

    // Screenshot of init state
    await expect( page ).toHaveScreenshot( 'auratune-init.png', {
      maxDiffPixels: 100
    } );
  } );

  test( 'HarmonicOrbit circle matches baseline', async ( { page } ) => {
    await page.goto( '/' );
    await page.getByText( 'Harmonic Orbit' ).first().click();

    // Wait for SVG to render
    await expect( page.getByText( 'Harmonic Orbit' ).first() ).toBeVisible();
    await page.waitForTimeout( 500 );

    // Screenshot of the orbit
    await expect( page ).toHaveScreenshot( 'harmonicorbit-empty.png', {
      maxDiffPixels: 150
    } );
  } );

  test( 'HarmonicOrbit with C Major selected', async ( { page } ) => {
    await page.goto( '/' );
    await page.getByText( 'Harmonic Orbit' ).first().click();

    await expect( page.getByText( 'Harmonic Orbit' ).first() ).toBeVisible();

    // Select C Major
    await page.locator( 'svg text:has-text("C")' ).first().click( { force: true } );
    await expect( page.getByText( 'Key Family' ) ).toBeVisible();
    await page.waitForTimeout( 300 );

    // Screenshot with selection
    await expect( page ).toHaveScreenshot( 'harmonicorbit-c-major.png', {
      maxDiffPixels: 150
    } );
  } );

  test( 'FrequencyFlow controls match baseline', async ( { page } ) => {
    await page.goto( '/' );
    await page.getByText( 'Frequency Flow' ).first().click();

    await expect( page.getByText( 'Real-time spectral analysis' ) ).toBeVisible();
    await page.waitForTimeout( 500 );

    // Screenshot of the forensic controls panel
    await expect( page ).toHaveScreenshot( 'frequencyflow-controls.png', {
      maxDiffPixels: 100
    } );
  } );

  test( 'ChordCapture empty state matches baseline', async ( { page } ) => {
    await page.goto( '/' );
    await page.getByText( 'Session View' ).first().click();

    const initBtn = page.getByRole( 'button', { name: /Initialize Audio Engine/i } );
    try {
      await initBtn.waitFor( { timeout: 2000 } );
      // Don't click - capture pre-init state
    } catch { }

    await page.waitForTimeout( 300 );

    await expect( page ).toHaveScreenshot( 'chordcapture-preinit.png', {
      maxDiffPixels: 100
    } );
  } );

  test( 'Settings drawer matches baseline', async ( { page } ) => {
    await page.goto( '/' );
    await page.getByText( 'AuraTune' ).first().click();

    // Wait for module to load (just wait for page to stabilize)
    await page.waitForTimeout( 1000 );

    // Open settings
    await page.getByTitle( 'Local Tool Settings' ).click( { force: true } );
    await page.waitForTimeout( 500 );

    // Screenshot of settings drawer
    await expect( page ).toHaveScreenshot( 'settings-drawer.png', {
      maxDiffPixels: 100
    } );
  } );
  maxDiffPixels: 100
});

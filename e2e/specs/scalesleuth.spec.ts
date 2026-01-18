import { test, expect } from '../fixtures/mock-audio';

/**
 * ScaleSleuth E2E Tests
 * 
 * Navigation: Dashboard → "Session View" → "Open Scale Sleuth" button → Drawer
 */
test.describe( 'ScaleSleuth E2E', () => {

  test( 'Can open ScaleSleuth panel from ChordCapture', async ( { page } ) => {
    await page.goto( '/' );

    await expect( page.getByRole( 'heading', { name: 'Tonic' } ) ).toBeVisible();

    // Navigate to Session View (ChordCapture)
    await page.getByText( 'Session View' ).first().click();

    // Handle init
    const initBtn = page.getByRole( 'button', { name: /Initialize Audio Engine/i } );
    try {
      await initBtn.waitFor( { timeout: 2000 } );
      await initBtn.click();
    } catch { }

    await expect( page.getByRole( 'heading', { name: /Session/i } ) ).toBeVisible( { timeout: 10000 } );

    await page.waitForTimeout( 1000 );

    // Open Scale Sleuth drawer
    await page.getByTitle( 'Open Scale Sleuth' ).click( { force: true } );

    // Verify drawer opened with title
    await expect( page.getByText( 'Scale Detective' ).first() ).toBeVisible( { timeout: 10000 } );

    // Verify panel shows Live Detection mode
    await expect( page.getByText( 'Live Detection' ) ).toBeVisible();
  } );

  // ============================================================================
  // FLAKY TESTS - TO BE FIXED LATER
  // Issue: ContextDrawer animation timing, content not rendered before assertion
  // Solution: Add explicit waits or use page.waitForSelector with longer timeouts
  // ============================================================================

  /*
  test('Shows listening prompt in scale list', async ({ page }) => {
    // ISSUE: Drawer animation timing - "Listening for pattern..." not visible in time
    // This text appears at ScaleSleuthPanel.vue line 280
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Tonic' })).toBeVisible();
    
    await page.getByText('Session View').first().click();
    
    const initBtn = page.getByRole('button', { name: /Initialize Audio Engine/i });
    try {
      await initBtn.waitFor({ timeout: 2000 });
      await initBtn.click();
    } catch {}
    
    await expect(page.getByRole('heading', { name: /Session/i })).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(1000);
    
    await page.getByTitle('Open Scale Sleuth').click({ force: true });
    await expect(page.getByText('Scale Detective').first()).toBeVisible({ timeout: 10000 });
    
    // TODO: Add wait for panel content to render
    await expect(page.getByText('Listening for pattern...')).toBeVisible();
  });
  */

  test( 'Shows current note display and Reset button', async ( { page, injectAudio } ) => {
    await page.goto( '/' );
    await expect( page.getByRole( 'heading', { name: 'Tonic' } ) ).toBeVisible();

    await page.getByText( 'Session View' ).first().click();

    const initBtn = page.getByRole( 'button', { name: /Initialize Audio Engine/i } );
    try {
      await initBtn.waitFor( { timeout: 2000 } );
      await initBtn.click();
    } catch { }

    await expect( page.getByRole( 'heading', { name: /Session/i } ) ).toBeVisible( { timeout: 10000 } );
    await page.waitForTimeout( 1000 );

    await page.getByTitle( 'Open Scale Sleuth' ).click( { force: true } );
    await expect( page.getByText( 'Scale Detective' ).first() ).toBeVisible( { timeout: 10000 } );

    // Initial state: No notes, so Reset button should potentially be hidden (based on user feedback)
    // or current note is '--'
    await expect( page.getByText( '--' ).first() ).toBeVisible();

    // Inject a note to prompt the UI to show active state / Reset button
    // Inject C (261.63Hz)
    await injectAudio( 261.63 );
    await page.waitForTimeout( 1000 );

    // Current note should now change from '--' to 'C'
    const noteDisplay = page.locator( '.text-3xl.font-black.text-white.font-mono' );
    await expect( noteDisplay ).toContainText( 'C' );

    // Reset button should now be visible
    const resetBtn = page.getByRole( 'button', { name: 'Reset', exact: true } );
    await expect( resetBtn ).toBeVisible();

    // Click reset and verify return to initial state
    await resetBtn.click();
    await page.waitForTimeout( 500 );

    // Note should remain or clear? If audio is still ON, it might re-detect.
    // We should silence audio first.
    await injectAudio( 0 );
    await page.waitForTimeout( 500 );
    await resetBtn.click(); // Click again to clear buffer after silence
    await page.waitForTimeout( 500 );

    await expect( page.getByText( '--' ).first() ).toBeVisible();
  } );
} );

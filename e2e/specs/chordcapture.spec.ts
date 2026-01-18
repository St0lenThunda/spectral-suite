import { test, expect } from '../fixtures/mock-audio';

/**
 * ChordCapture E2E Tests
 * 
 * Button titles (reliable selectors):
 * - Sleuth: title="Open Scale Sleuth"
 * - Forge: title="Open Chord Forge"
 * - Settings: title="Local Tool Settings"
 */
test.describe( 'ChordCapture E2E', () => {

  test.beforeEach( async ( { page } ) => {
    await page.goto( '/' );

    await expect( page.getByRole( 'heading', { name: 'Tonic' } ) ).toBeVisible();

    await page.getByText( 'Session View' ).first().click();

    const initBtn = page.getByRole( 'button', { name: /Initialize Audio Engine/i } );
    try {
      await initBtn.waitFor( { timeout: 2000 } );
      await initBtn.click();
    } catch { }

    await expect( page.getByRole( 'heading', { name: /Session/i } ) ).toBeVisible( { timeout: 10000 } );

    await page.waitForTimeout( 500 );
  } );

  test( 'Ledger shows empty state message', async ( { page } ) => {
    await expect( page.getByText( 'No chords captured yet.' ) ).toBeVisible();
  } );

  test( 'Settings Drawer opens', async ( { page } ) => {
    await page.getByTitle( 'Local Tool Settings' ).click( { force: true } );
    await expect( page.getByRole( 'button', { name: /General/i } ).first() ).toBeVisible();
  } );

  test( 'Forge button opens drawer', async ( { page } ) => {
    await page.getByTitle( 'Open Chord Forge' ).click( { force: true } );
    await expect( page.getByText( 'Chord Forge' ).first() ).toBeVisible();
  } );

  test( 'Sleuth button opens detector drawer', async ( { page } ) => {
    await page.getByTitle( 'Open Scale Sleuth' ).click( { force: true } );
    await expect( page.getByText( 'Scale Detective' ).first() ).toBeVisible();
  } );

  test( 'Back button returns to dashboard', async ( { page } ) => {
    await page.getByRole( 'button', { name: /Back to Tonic/i } ).click();
    await expect( page.getByRole( 'heading', { name: 'Tonic' } ) ).toBeVisible();
  } );

  test( 'Freeze chord: Captures current state and persists after silence', async ( { page, injectAudio } ) => {
    // 1. Inject C Major (C4, E4, G4) with clean gaps to avoid spectral smearing
    await injectAudio( 0 ); // Ensure silence first
    await page.waitForTimeout( 200 );

    await injectAudio( 261.63 ); // C4
    await page.waitForTimeout( 400 );
    await injectAudio( 0 );
    await page.waitForTimeout( 50 ); // Brief silence

    await injectAudio( 329.63 ); // E4
    await page.waitForTimeout( 400 );
    await injectAudio( 0 );
    await page.waitForTimeout( 50 );

    await injectAudio( 392.00 ); // G4
    await page.waitForTimeout( 800 ); // Hold the last note to stabilize chord detection

    // 2. Verify A Chord is detected (Robust approach: we care about FREEZE, not the specific chord name)
    // The LiveMonitor splits "C" and "Major" into different elements
    await expect( page.getByText( 'Harmonic Match' ) ).toBeVisible( { timeout: 10000 } );

    // Capture the current chord symbol to verify persistence
    const chordSymbolEl = page.locator( '.font-black.text-white.leading-none' ).first();
    const initialSymbol = await chordSymbolEl.textContent();
    console.log( 'Captured Initial Symbol:', initialSymbol );
    expect( initialSymbol ).toBeTruthy();

    // 3. Click "Live" to Toggle Freeze
    const liveBtn = page.getByRole( 'button', { name: 'Live' } );
    await expect( liveBtn ).toBeVisible();
    await liveBtn.click();

    // 4. Verify Button changes to "Paused"
    await expect( page.getByRole( 'button', { name: 'Paused' } ) ).toBeVisible();

    // 5. Inject F Major (F4, A4, C5) while FROZEN
    // If frozen, these notes should be ignored by the display
    await injectAudio( 0 );
    await page.waitForTimeout( 100 );

    await injectAudio( 349.23 ); // F4
    await page.waitForTimeout( 150 );
    await injectAudio( 0 );
    await page.waitForTimeout( 50 );

    await injectAudio( 440.00 ); // A4
    await page.waitForTimeout( 150 );
    await injectAudio( 0 );
    await page.waitForTimeout( 50 );

    await injectAudio( 523.25 ); // C5
    await page.waitForTimeout( 800 );

    // 6. Assert "C" (Initial Symbol) is STILL visible (Frozen)
    // It should NOT match F Major (unless F Major happened to be the initial symbol, unlikely)
    await expect( chordSymbolEl ).toHaveText( initialSymbol! );

    // 7. Unfreeze
    await page.getByRole( 'button', { name: 'Paused' } ).click();
    await page.waitForTimeout( 2000 ); // Wait for reactive update

    // 8. Inject F Major AGAIN while Live
    await injectAudio( 349.23 ); // F4
    await page.waitForTimeout( 400 );
    await injectAudio( 0 );
    await page.waitForTimeout( 50 );

    await injectAudio( 440.00 ); // A4
    await page.waitForTimeout( 400 );
    await injectAudio( 0 );
    await page.waitForTimeout( 50 );

    await injectAudio( 523.25 ); // C5
    await page.waitForTimeout( 800 );

    // 9. Verify Symbol CHANGED (shows Live updates)
    // It might be F Major or something else, but it should NOT be the frozen Initial Symbol (C Major)
    // Assuming F Major != C Major
    const newSymbol = await chordSymbolEl.textContent();
    console.log( 'Captured New Symbol:', newSymbol );
    expect( newSymbol ).not.toBe( initialSymbol );
  } );
} );

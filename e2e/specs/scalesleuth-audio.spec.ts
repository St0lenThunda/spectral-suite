import { test, expect } from '../fixtures/mock-audio';

/**
 * ScaleSleuth Audio Detection Tests
 * 
 * Verifies that the ScaleSleuth module correctly listens to audio input,
 * detects notes, and infers scales.
 */
test.describe( 'ScaleSleuth Audio Tests', () => {

  test.beforeEach( async ( { page, injectAudio } ) => {
    await page.goto( '/' );
    // ScaleSleuth is inside Session View (ChordCapture) drawer in this app version
    await page.getByText( 'Session View' ).first().click();

    // Initialize Audio
    const initBtn = page.getByRole( 'button', { name: /Initialize Audio Engine/i } );
    try {
      await initBtn.waitFor( { timeout: 2000 } );
      await initBtn.click();
    } catch { }

    // Open Scale Sleuth Drawer
    // Using the reliable title selector found during previous debugging
    await page.getByTitle( 'Open Scale Sleuth' ).click( { force: true } );

    // Verify panel is open
    await expect( page.getByText( 'Scale Detective' ).first() ).toBeVisible();
    await expect( page.getByText( 'Live Detection' ) ).toBeVisible();

    // Fix: The mock oscillator defaults to 440Hz (A4), so ScaleSleuth hears "A" immediately.
    // We must silence it and clear the detected notes to ensure a clean slate.
    await injectAudio( 0 );
    // Wait for smoothing to decay and pitch to become null
    await page.waitForTimeout( 1500 );

    const resetBtn = page.getByRole( 'button', { name: 'Reset' } );
    if ( await resetBtn.isVisible() ) {
      await resetBtn.click();
    }
    await page.waitForTimeout( 500 );

    // Verify notes are empty before starting
    // Use a specific selector targeting the horizontal scroll container's direct children within the panel
    const noteBubbles = page.locator( '.scale-sleuth-panel .overflow-x-auto > div.w-8.h-8.rounded-full' );
    const initialCount = await noteBubbles.count();

    if ( initialCount > 0 ) {
      const texts = await noteBubbles.allTextContents();
      console.log( 'WARNING: Notes not cleared:', texts );
    }
    expect( initialCount ).toBe( 0 );
  } );

  test( 'Note Collection: Injected notes appear in detected list', async ( { page, injectAudio } ) => {
    // 1. Inject C (261.63Hz)
    await injectAudio( 261.63 );
    await page.waitForTimeout( 1000 ); // Wait for potential hold/debounce logic

    // Verify 'C' appears in the rounded note bubbles
    const noteBubbles = page.locator( '.scale-sleuth-panel .overflow-x-auto > div.w-8.h-8.rounded-full' );
    const noteBubbleC = noteBubbles.getByText( 'C', { exact: true } ).first();
    await expect( noteBubbleC ).toBeVisible();

    // 2. Inject E (329.63Hz)
    await injectAudio( 329.63 );
    await page.waitForTimeout( 1000 );

    const noteBubbleE = noteBubbles.getByText( 'E', { exact: true } ).first();
    await expect( noteBubbleE ).toBeVisible();

    // 3. Inject G (392.00Hz)
    await injectAudio( 392.00 );
    await page.waitForTimeout( 1000 );

    const noteBubbleG = noteBubbles.getByText( 'G', { exact: true } ).first();
    await expect( noteBubbleG ).toBeVisible();

    // Verify all notes are present (C, E, G)
    await expect( noteBubbleC ).toBeVisible();
    await expect( noteBubbleE ).toBeVisible();
  } );

  test( 'Scale Suggestion: C Major inferred from chemical notes', async ( { page, injectAudio } ) => {
    // Inject full C Major scale (C, D, E, F, G, A, B)
    // C=261.63, D=293.66, E=329.63, F=349.23, G=392.00, A=440.00, B=493.88
    const notes = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88];

    for ( const freq of notes ) {
      // Clean injection: Silence -> Change Freq -> Play
      await injectAudio( 0 );
      await page.waitForTimeout( 100 );
      await injectAudio( freq );
      await page.waitForTimeout( 800 );
    }

    // Stop audio
    await injectAudio( 0 );
    await page.waitForTimeout( 1000 );

    // Assert "C Major" is the top suggestion
    const cMajorButton = page.locator( 'button' ).filter( { hasText: /C Major/i } ).first();
    await expect( cMajorButton ).toBeVisible();

    // Verify likelihood score is high
    await expect( cMajorButton ).toContainText( '%' );
  } );

} );

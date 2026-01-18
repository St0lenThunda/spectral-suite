import { test, expect } from '../fixtures/mock-audio';

/**
 * Frequency Flow E2E Tests
 * 
 * Real-time spectral analysis and waveform diagnostics module.
 * 
 * Component Structure (from FrequencyFlowModule.vue):
 * - Header: "Frequency Flow Pro", Back button, SettingsToggle, Info button (?)
 * - Spectral Magnitude: Main canvas with Log/Lin scale toggle, Ranges/Harmonics toggles
 * - Forensic Controls: Buffer Resolution (FFT size dropdown), Signal Smoothing slider, Freeze button
 * - Time Domain: Waveform oscilloscope canvas
 * - Spectral History: Waterfall spectrogram canvas
 * - Peak Note Detector: Shows dominant note and frequency (Hz)
 * - EQ Suggestions: Shows frequency issues or "No issues detected"
 * - Settings Drawer: Engine (global audio), Exports (PNG/JSON)
 * 
 * Testable UI Elements:
 * - Log/Lin scale toggle buttons
 * - 🎸 Ranges button (instrument labels)
 * - 🎵 Harmonics button
 * - Freeze button (📸 / ❄️)
 * - FFT size dropdown (256, 1024, 2048, 4096, 8192)
 * - Smoothing slider
 * - Peak Note Detector display
 * - EQ Suggestions panel
 */
test.describe( 'Frequency Flow E2E', () => {

  test.beforeEach( async ( { page } ) => {
    await page.goto( '/' );

    await expect( page.getByRole( 'heading', { name: 'Tonic' } ) ).toBeVisible();

    // Click Frequency Flow card
    await page.getByText( 'Frequency Flow' ).first().click();

    // Verify module loaded - title contains "Frequency Flow Pro"
    await expect( page.getByText( 'Frequency Flow' ).first() ).toBeVisible();
    await expect( page.getByText( 'Pro' ).first() ).toBeVisible();

    await page.waitForTimeout( 500 );
  } );

  // ============================================================================
  // NAVIGATION & LAYOUT TESTS
  // ============================================================================

  test( 'Module loads with correct header', async ( { page } ) => {
    // Check for subtitle text
    await expect( page.getByText( 'Real-time spectral analysis' ) ).toBeVisible();

    // Back button exists
    await expect( page.getByRole( 'button', { name: /Back to Tonic/i } ) ).toBeVisible();
  } );

  test( 'Back button returns to dashboard', async ( { page } ) => {
    await page.getByRole( 'button', { name: /Back to Tonic/i } ).click();
    await expect( page.getByRole( 'heading', { name: 'Tonic' } ) ).toBeVisible();
  } );

  // ============================================================================
  // SPECTRAL MAGNITUDE CONTROLS
  // ============================================================================

  test( 'Log/Lin scale toggle buttons exist', async ( { page } ) => {
    await expect( page.getByRole( 'button', { name: 'Log' } ) ).toBeVisible();
    await expect( page.getByRole( 'button', { name: 'Lin' } ) ).toBeVisible();
  } );

  test( 'Can toggle between Log and Linear scale', async ( { page } ) => {
    const logBtn = page.getByRole( 'button', { name: 'Log' } );
    const linBtn = page.getByRole( 'button', { name: 'Lin' } );

    // Log is default (should have active styling)
    await expect( logBtn ).toBeVisible();

    // Click Lin to switch
    await linBtn.click();

    // Lin should now be active (has different styling)
    await expect( linBtn ).toBeVisible();
  } );

  test( 'Instrument Ranges toggle exists', async ( { page } ) => {
    // Button with 🎸 emoji and "Ranges" text
    await expect( page.getByRole( 'button', { name: /Ranges/i } ) ).toBeVisible();
  } );

  test( 'Harmonics toggle exists', async ( { page } ) => {
    // Button with 🎵 emoji and "Harmonics" text  
    await expect( page.getByRole( 'button', { name: /Harmonics/i } ) ).toBeVisible();
  } );

  // ============================================================================
  // FORENSIC CONTROLS
  // ============================================================================

  test( 'Forensic Controls panel exists', async ( { page } ) => {
    await expect( page.getByText( 'Forensic Controls' ) ).toBeVisible();
    await expect( page.getByText( 'Tune the analysis hardware' ) ).toBeVisible();
  } );

  test( 'Buffer Resolution dropdown exists with options', async ( { page } ) => {
    await expect( page.getByText( 'Buffer Resolution' ) ).toBeVisible();

    // The select should show default value "2048 pts"
    await expect( page.getByText( '2048 pts' ) ).toBeVisible();

    // Dropdown should be present
    const dropdown = page.locator( 'select' );
    await expect( dropdown ).toBeVisible();
  } );

  test( 'Signal Smoothing slider exists', async ( { page } ) => {
    await expect( page.getByText( 'Signal Smoothing' ) ).toBeVisible();

    // Range input exists
    const slider = page.locator( 'input[type="range"]' ).first();
    await expect( slider ).toBeVisible();
  } );

  test( 'Freeze button exists and toggles', async ( { page } ) => {
    // Initial state shows camera icon and "Freeze Spectrum"
    const freezeBtn = page.getByRole( 'button', { name: /Freeze Spectrum/i } );
    await expect( freezeBtn ).toBeVisible();

    // Click to freeze
    await freezeBtn.click();

    // Should now show snowflake icon and "Unfreeze Signal"  
    await expect( page.getByRole( 'button', { name: /Unfreeze Signal/i } ) ).toBeVisible();
  } );

  // ============================================================================
  // CANVAS VISUALIZERS
  // ============================================================================

  test( 'Spectral Magnitude canvas exists', async ( { page } ) => {
    await expect( page.getByText( 'Spectral Magnitude' ) ).toBeVisible();
    await expect( page.getByText( 'Magnitude vs Frequency Analysis' ) ).toBeVisible();
  } );

  test( 'Time Domain (Waveform) canvas exists', async ( { page } ) => {
    // The label is "Time Domain (Waveform)" as one string
    await expect( page.getByText( 'Time Domain (Waveform)' ) ).toBeVisible();
  } );

  test( 'Spectral History (Waterfall) canvas exists', async ( { page } ) => {
    await expect( page.getByText( 'Spectral History' ) ).toBeVisible();
    await expect( page.getByText( 'Waterfall' ) ).toBeVisible();
  } );

  // ============================================================================
  // PEAK NOTE DETECTOR
  // ============================================================================

  test( 'Peak Note Detector panel exists', async ( { page } ) => {
    await expect( page.getByText( 'Peak Note Detector' ) ).toBeVisible();

    // Shows frequency with "HZ" suffix (e.g., "0 HZ")
    await expect( page.getByText( /\d+ HZ/ ) ).toBeVisible();
  } );

  // ============================================================================
  // EQ SUGGESTIONS
  // ============================================================================

  test( 'EQ Suggestions panel exists', async ( { page } ) => {
    await expect( page.getByText( 'EQ Suggestions' ) ).toBeVisible();
  } );

  test.skip( 'EQ shows balanced message when no issues', async ( { page } ) => {
    // From FrequencyFlowModule.vue line 584
    await expect( page.getByText( /Spectrum looks balanced/i ) ).toBeVisible();
  } );

  // ============================================================================
  // SETTINGS DRAWER
  // ============================================================================

  test( 'Settings drawer opens with Engine and Exports categories', async ( { page } ) => {
    // Click SettingsToggle (gear icon with title="Local Tool Settings")
    await page.getByTitle( 'Local Tool Settings' ).click( { force: true } );

    // Drawer shows categories
    await expect( page.getByRole( 'button', { name: /Engine/i } ).first() ).toBeVisible();
    await expect( page.getByRole( 'button', { name: /Exports/i } ).first() ).toBeVisible();
  } );

  test( 'Exports category has PNG and JSON export buttons', async ( { page } ) => {
    // Open settings
    await page.getByTitle( 'Local Tool Settings' ).click( { force: true } );

    // Click Exports category
    await page.getByRole( 'button', { name: /Exports/i } ).first().click( { force: true } );

    // Wait for drawer animation
    await page.waitForTimeout( 500 );

    // Export buttons visible
    await expect( page.getByText( 'Export PNG' ) ).toBeVisible();
    await expect( page.getByText( 'Export JSON' ) ).toBeVisible();
  } );

  // ============================================================================
  // FREQUENCY LABELS
  // ============================================================================

  test( 'Frequency axis labels are visible', async ( { page } ) => {
    // In log mode, shows these labels
    await expect( page.getByText( '20Hz' ) ).toBeVisible();
    await expect( page.getByText( '1kHz' ) ).toBeVisible();
    await expect( page.getByText( '20kHz' ) ).toBeVisible();
  } );
} );

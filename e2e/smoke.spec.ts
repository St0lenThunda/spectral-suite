import { test, expect } from './fixtures/mock-audio';

/**
 * Spectral Suite Smoke Tests
 * 
 * Basic verification that the app loads and core navigation works.
 */
test.describe( 'Spectral Suite Smoke Tests', () => {

  test( 'Dashboard loads successfully', async ( { page } ) => {
    await page.goto( '/' );

    // Check for page title
    await expect( page ).toHaveTitle( /Tonic|Spectral/i );

    // Check for main dashboard header (use getByRole to avoid strict mode issues)
    await expect( page.getByRole( 'heading', { name: 'Tonic' } ) ).toBeVisible();

    // Check that at least one tool card is visible
    await expect( page.getByText( 'AuraTune' ).first() ).toBeVisible();
  } );

  test( 'Navigation bar is visible', async ( { page } ) => {
    await page.goto( '/' );

    // The nav bar has the "SPECTRAL SUITE" logo/title
    await expect( page.getByText( 'SPECTRAL' ).first() ).toBeVisible();
    await expect( page.getByText( 'SUITE' ).first() ).toBeVisible();
  } );

  test( 'Tool cards are clickable', async ( { page } ) => {
    await page.goto( '/' );

    // Click AuraTune card
    await page.getByText( 'AuraTune' ).first().click();

    // Should navigate to AuraTune module (shows back button)
    await expect( page.getByRole( 'button', { name: /Back to Tonic/i } ) ).toBeVisible();
  } );
} );

import { test as base } from '@playwright/test';

/**
 * Audio Fixture
 * 
 * Injects a mock implementation of navigator.mediaDevices.getUserMedia.
 * This allows us to "play" specific frequencies into the app during tests.
 */
export const test = base.extend<{ injectAudio: ( freq: number ) => Promise<void> }>( {
    page: async ( { page }, use ) => {

        // Evaluate this script on every page load
        await page.addInitScript( () => {
            // Create a fake AudioContext to generate the stream
            const ctx = new ( window.AudioContext || ( window as any ).webkitAudioContext )();
            const dest = ctx.createMediaStreamDestination();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            gain.gain.value = 0; // Default to silence to prevent initial A4 burst

            // Connect osc -> gain -> dest
            osc.connect( gain );
            gain.connect( dest );

            osc.start();

            // Ensure context is running (sometimes blocked by autoplay)
            const tryResume = () => {
                if ( ctx.state === 'suspended' ) ctx.resume();
            };
            // Retry on interaction
            document.addEventListener( 'click', tryResume );
            document.addEventListener( 'keydown', tryResume );
            // And try immediately just in case
            tryResume();

            // Expose a global controller to change frequency/gain
            ( window as any ).__MOCK_OSCILLATOR__ = osc;
            ( window as any ).__MOCK_GAIN__ = gain;

            // Mock getUserMedia to return our generated stream
            if ( !navigator.mediaDevices ) ( navigator as any ).mediaDevices = {};
            navigator.mediaDevices.getUserMedia = async ( constraints ) => {
                console.log( "[MockAudio] getUserMedia called", constraints );
                return dest.stream;
            };

            console.log( "[MockAudio] Initialized" );
        } );

        await use( page );
    },

    injectAudio: async ( { page }, use ) => {
        // Helper to change frequency from the test
        const setFreq = async ( freq: number ) => {
            await page.evaluate( ( f ) => {
                const osc = ( window as any ).__MOCK_OSCILLATOR__;
                const gain = ( window as any ).__MOCK_GAIN__;
                // Need context to get currentTime
                const ctx = osc ? osc.context : ( gain ? gain.context : null );
                const now = ctx ? ctx.currentTime : 0;

                if ( f === 0 ) {
                    if ( gain ) {
                        gain.gain.cancelScheduledValues( now );
                        gain.gain.setValueAtTime( 0, now );
                    }
                } else {
                    if ( osc ) osc.frequency.setValueAtTime( f, now );
                    if ( gain ) {
                        gain.gain.cancelScheduledValues( now );
                        gain.gain.setValueAtTime( 1, now );
                    }
                }
            }, freq );
        };
        await use( setFreq );
    }
} );

export { expect } from '@playwright/test';

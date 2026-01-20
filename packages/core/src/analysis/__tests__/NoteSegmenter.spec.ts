import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NoteSegmenter } from '../NoteSegmenter';
import { ref } from 'vue';

describe( 'NoteSegmenter', () => {
  const pitch = ref<number | null>( null );
  const clarity = ref<number | null>( null );
  const noteName = ref<string | null>( null );
  let segmenter: NoteSegmenter;

  beforeEach( () => {
    pitch.value = null;
    clarity.value = 0;
    noteName.value = null;
    segmenter = new NoteSegmenter( pitch, clarity, noteName, { minDurationMs: 0 } );
    segmenter.start();
  } );

  it( 'triggers onNoteStart when clarity exceeds threshold', async () => {
    const onStart = vi.fn();
    segmenter.onNoteStart( onStart );

    // Simulate Note On
    clarity.value = 0.9;
    pitch.value = 440;
    noteName.value = 'A4';
    
    // Watchers are synchronous in this context if setup correctly, 
    // but in Vue test utils sometimes nextTick is needed. 
    // However, our watcher is setup in constructor. 
    // Let's force a "reactivity update" by re-writing if needed 
    // but typically ref mutations trigger immediate watch in this setup.
    await Promise.resolve(); // Simple tick

    expect( onStart ).toHaveBeenCalled();
    expect( onStart.mock.calls[0][0].note ).toBe( 'A4' );
    expect( onStart.mock.calls[0][0].frequency ).toBe( 440 );
  } );

  it( 'triggers onNoteEnd when clarity drops', async () => {
    const onEnd = vi.fn();
    segmenter.onNoteEnd( onEnd );

    // Start
    clarity.value = 0.9;
    pitch.value = 440;
    await Promise.resolve();

    // End
    clarity.value = 0.1;
    await Promise.resolve();

    expect( onEnd ).toHaveBeenCalled();
    const event = onEnd.mock.calls[0][0];
    expect( event.note ).toBeDefined();
    expect( event.duration ).toBeGreaterThanOrEqual( 0 );
  } );

  it( 'detects legato pitch changes', async () => {
    const onStart = vi.fn();
    const onEnd = vi.fn();
    segmenter.onNoteStart( onStart );
    segmenter.onNoteEnd( onEnd );

    // Start A4
    clarity.value = 0.9;
    pitch.value = 440;
    noteName.value = 'A4';
    await Promise.resolve();

    expect( onStart ).toHaveBeenCalledTimes( 1 );

    // Change to C5 (Legato - no clarity drop)
    pitch.value = 523.25; 
    noteName.value = 'C5';
    await Promise.resolve();

    // Should have ended A4 and started C5
    expect( onEnd ).toHaveBeenCalledTimes( 1 ); // A4 ended
    expect( onStart ).toHaveBeenCalledTimes( 2 ); // C5 started
    expect( onStart.mock.calls[1][0].note ).toBe( 'C5' );
  } );

  it( 'ignores short blips (debounce)', async () => {
    // Re-init with debounce
    segmenter = new NoteSegmenter( pitch, clarity, noteName, { minDurationMs: 100 } );
    segmenter.start();

    const onEnd = vi.fn();
    segmenter.onNoteEnd( onEnd );

    // Start
    clarity.value = 0.9;
    pitch.value = 440;
    await Promise.resolve();

    // End immediately (simulating 1ms duration)
    // We can't control performance.now() easily without mocking system time
    // But we can check that it follows logic.
    // For this test, let's mock performance.now temporarily if we were strict.
    // Simplifying: If we call finalize immediately, diff is ~0.
    
    clarity.value = 0.1;
    await Promise.resolve();

    expect( onEnd ).not.toHaveBeenCalled();
  } );
} );

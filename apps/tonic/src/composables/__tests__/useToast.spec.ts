import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useToast } from '../useToast';

describe( 'useToast', () => {
  const { clearAll, showToast, dismissToast, toasts, showInfo, showSuccess, showWarning, showError } = useToast();

  beforeEach( () => {
    clearAll();
    vi.useFakeTimers();
  } );

  afterEach( () => {
    vi.useRealTimers();
  } );

  it( 'starts with empty toasts', () => {
    expect( toasts.value ).toHaveLength( 0 );
  } );

  it( 'adds a toast', () => {
    const id = showToast( { message: 'Hello', type: 'info' } );
    expect( toasts.value ).toHaveLength( 1 );
    expect( toasts.value[0]?.id ).toBe( id );
    expect( toasts.value[0]?.message ).toBe( 'Hello' );
    expect( toasts.value[0]?.type ).toBe( 'info' );
  } );

  it( 'auto-dismisses after duration', () => {
    showToast( { message: 'Auto dismiss', type: 'success', duration: 1000 } );
    expect( toasts.value ).toHaveLength( 1 );

    vi.advanceTimersByTime( 1000 );
    expect( toasts.value ).toHaveLength( 0 );
  } );

  it( 'does not auto-dismiss if duration is 0', () => {
    showToast( { message: 'Stay forever', type: 'error', duration: 0 } );
    expect( toasts.value ).toHaveLength( 1 );

    vi.advanceTimersByTime( 10000 );
    expect( toasts.value ).toHaveLength( 1 );
  } );

  it( 'dismisses a specific toast manually', () => {
    const id1 = showToast( { message: 'One', type: 'info' } );
    const id2 = showToast( { message: 'Two', type: 'info' } );

    expect( toasts.value ).toHaveLength( 2 );

    dismissToast( id1 );
    expect( toasts.value ).toHaveLength( 1 );
    expect( toasts.value[0]?.id ).toBe( id2 );
  } );

  it( 'ignores dismissing non-existent ID', () => {
    showToast( { message: 'One', type: 'info' } );
    dismissToast( 'fake-id' );
    expect( toasts.value ).toHaveLength( 1 );
  } );

  it( 'clears all toasts', () => {
    showToast( { message: 'One', type: 'info' } );
    showToast( { message: 'Two', type: 'info' } );
    clearAll();
    expect( toasts.value ).toHaveLength( 0 );
  } );

  describe( 'Convenience Methods', () => {
    it( 'showInfo creates info toast', () => {
      showInfo( 'Info msg' );
      expect( toasts.value[0]?.type ).toBe( 'info' );
    } );

    it( 'showSuccess creates success toast with default duration', () => {
      showSuccess( 'Success msg' );
      expect( toasts.value[0]?.type ).toBe( 'success' );
      expect( toasts.value[0]?.duration ).toBe( 3000 );
    } );

    it( 'showWarning creates warning toast', () => {
      showWarning( 'Warning msg' );
      expect( toasts.value[0]?.type ).toBe( 'warning' );
      expect( toasts.value[0]?.duration ).toBe( 8000 );
    } );

    it( 'showError creates error toast with no duration', () => {
      showError( 'Error msg' );
      expect( toasts.value[0]?.type ).toBe( 'error' );
      expect( toasts.value[0]?.duration ).toBe( 0 );
    } );
  } );
} );

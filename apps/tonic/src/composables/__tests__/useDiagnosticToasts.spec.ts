import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useDiagnosticToasts } from '../useDiagnosticToasts';
import { ref, nextTick, createApp } from 'vue';

// Mock dependencies
const mockActiveIssues = ref<any[]>( [] );
const mockApplyQuickFix = vi.fn();

vi.mock( '@spectralsuite/core', () => ( {
  useInputDiagnostics: vi.fn( () => ( {
    activeIssues: mockActiveIssues,
    applyQuickFix: mockApplyQuickFix,
  } ) ),
} ) );

const mockShowWarning = vi.fn( () => 'toast-1' );
const mockShowError = vi.fn( () => 'toast-2' );
const mockDismissToast = vi.fn();

vi.mock( '../useToast', () => ( {
  useToast: vi.fn( () => ( {
    showWarning: mockShowWarning,
    showError: mockShowError,
    dismissToast: mockDismissToast,
  } ) ),
} ) );

// Helper to run composable in a Vue instance
function withSetup ( composable: () => void ) {
  let app: any;
  const mount = () => {
    app = createApp( {
      setup () {
        composable();
        return () => { };
      }
    } );
    app.mount( document.createElement( 'div' ) );
  };
  const unmount = () => {
    if ( app ) app.unmount();
  };
  return { mount, unmount };
}

describe( 'useDiagnosticToasts', () => {
  let cleanup: () => void;

  beforeEach( () => {
    mockActiveIssues.value = [];
    mockShowWarning.mockClear();
    mockShowError.mockClear();
    mockDismissToast.mockClear();
    mockApplyQuickFix.mockClear();
    cleanup = () => { };
  } );

  afterEach( () => {
    cleanup();
  } );

  it( 'does not show toasts on mount (immediate: false)', async () => {
    mockActiveIssues.value = [{ id: 'initial-issue', message: 'Initial', severity: 'warning' }];

    const { mount, unmount } = withSetup( () => useDiagnosticToasts() );
    cleanup = unmount;
    mount();

    expect( mockShowWarning ).not.toHaveBeenCalled();
  } );

  it( 'shows a warning toast when a new warning issue appears', async () => {
    const { mount, unmount } = withSetup( () => useDiagnosticToasts() );
    cleanup = unmount;
    mount();

    mockActiveIssues.value = [{ id: 'warn-1', message: 'Warning msg', severity: 'warning' }];
    await nextTick();
    expect( mockShowWarning ).toHaveBeenCalledWith( 'Warning msg', undefined, undefined );
  } );

  it( 'shows an error toast when a new error issue appears', async () => {
    const { mount, unmount } = withSetup( () => useDiagnosticToasts() );
    cleanup = unmount;
    mount();

    mockActiveIssues.value = [{ id: 'err-1', message: 'Error msg', severity: 'error' }];
    await nextTick();
    expect( mockShowError ).toHaveBeenCalledWith( 'Error msg', undefined, undefined );
  } );

  it( 'provides quick fix action if available', async () => {
    const { mount, unmount } = withSetup( () => useDiagnosticToasts() );
    cleanup = unmount;
    mount();

    mockActiveIssues.value = [
      { id: 'fix-1', message: 'Fixable', severity: 'warning', quickFix: () => 'fixed' }
    ];
    await nextTick();
    expect( mockShowWarning ).toHaveBeenCalled();
    const calls = mockShowWarning.mock.calls;
    const lastCall = calls[0] as any;
    expect( lastCall[1] ).toBe( 'Fix' );
    lastCall[2]();
    expect( mockApplyQuickFix ).toHaveBeenCalled();
  } );

  it( 'ignores excluded issues', async () => {
    const { mount, unmount } = withSetup( () => useDiagnosticToasts() );
    cleanup = unmount;
    mount();

    mockActiveIssues.value = [{ id: 'no-input', message: 'Ignored', severity: 'warning' }];
    await nextTick();
    expect( mockShowWarning ).not.toHaveBeenCalled();
  } );

  it( 'dismisses the toast when the issue is resolved', async () => {
    const { mount, unmount } = withSetup( () => useDiagnosticToasts() );
    cleanup = unmount;
    mount();

    mockActiveIssues.value = [{ id: 'resolvable', message: 'Resolvable', severity: 'warning' }];
    await nextTick();

    mockActiveIssues.value = [];
    await nextTick();
    expect( mockDismissToast ).toHaveBeenCalledWith( 'toast-1' );
  } );

  it( 'does not re-show toast for the same issue ID if it persists', async () => {
    const { mount, unmount } = withSetup( () => useDiagnosticToasts() );
    cleanup = unmount;
    mount();

    mockActiveIssues.value = [{ id: 'persistent', message: 'Persist', severity: 'warning' }];
    await nextTick();
    expect( mockShowWarning ).toHaveBeenCalledTimes( 1 );

    // Trigger update with same ID
    mockActiveIssues.value = [{ id: 'persistent', message: 'Persist', severity: 'warning' }];
    await nextTick();
    expect( mockShowWarning ).toHaveBeenCalledTimes( 1 );
  } );
} );

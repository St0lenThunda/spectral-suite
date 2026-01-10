/**
 * Centralized LocalStorage Management
 */
export const STORAGE_KEYS = {
  CHORD_LEDGER: 'spectral-suite-chord-ledger',
  CHORD_KEY: 'spectral-suite-chord-key',
  ENABLED_TOOLS: 'spectral-suite-enabled-tools',
  CALIBRATION_A4: 'spectral-suite-calibration-a4',
  THEME_PREFERENCE: 'spectral-suite-theme',
} as const;

export type StorageKey = keyof typeof STORAGE_KEYS;

export const StorageService = {
  get: ( key: StorageKey ): string | null => {
    try {
      return localStorage.getItem( STORAGE_KEYS[key] );
    } catch ( e ) {
      console.warn( 'LocalStorage access failed', e );
      return null;
    }
  },

  set: ( key: StorageKey, value: string ): void => {
    try {
      localStorage.setItem( STORAGE_KEYS[key], value );
    } catch ( e ) {
      console.warn( 'LocalStorage write failed', e );
    }
  },

  remove: ( key: StorageKey ): void => {
    try {
      localStorage.removeItem( STORAGE_KEYS[key] );
    } catch ( e ) {
      console.warn( 'LocalStorage remove failed', e );
    }
  },

  clearAll: (): void => {
    Object.values( STORAGE_KEYS ).forEach( k => localStorage.removeItem( k ) );
  },
  
  // Typed helpers
  getJSON: <T>( key: StorageKey ): T | null => {
    const val = StorageService.get( key );
    if ( !val ) return null;
    try {
      return JSON.parse( val ) as T;
    } catch {
      return null;
    }
  },

  setJSON: ( key: StorageKey, value: any ): void => {
    StorageService.set( key, JSON.stringify( value ) );
  }
};

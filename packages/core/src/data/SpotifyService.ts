/**
 * SpotifyService — Track Metadata Resolution
 * 
 * This service handles authentication and fetching of track metadata 
 * (title, artist, artwork) from the Spotify Web API.
 * 
 * It uses the "Client Credentials Flow" which is suitable for 
 * read-only server-to-server (or app-to-server) requests.
 */
export class SpotifyService {
  private static accessToken: string | null = null;
  private static tokenExpiry: number = 0;
  private static tokenPromise: Promise<string | null> | null = null;

  // Use a type-safe check for Vite environment variables
  private static get env (): any {
    return ( import.meta as any ).env || {};
  }

  private static readonly CLIENT_ID = SpotifyService.env.VITE_SPOTIFY_CLIENT_ID;
  private static readonly CLIENT_SECRET = SpotifyService.env.VITE_SPOTIFY_CLIENT_SECRET;
  private static readonly REFRESH_TOKEN = SpotifyService.env.VITE_SPOTIFY_REFRESH_TOKEN;

  // Mock Data for "Demo Mode" when API is blocked
  private static readonly MOCK_DB: Record<string, any> = {
    'default': {
      name: 'Let It Be (Demo Mode)',
      artists: [{ name: 'The Beatles' }],
      album: {
        name: 'Let It Be',
        images: [{ url: 'https://placehold.co/640x640/1a1a1a/white?text=Let+It+Be', height: 640, width: 640 }]
      },
      external_urls: { spotify: 'https://open.spotify.com/track/7iN1s7xMJ4MW2OlwgAMMcF' }
    },
    '3kdBJj2IH9h4urhoAlWWiZ': { // G Major
      name: 'No Woman, No Cry',
      artists: [{ name: 'Bob Marley & The Wailers' }],
      album: {
        name: 'Natty Dread',
        images: [{ url: 'https://placehold.co/640x640/064e3b/white?text=Natty+Dread', height: 640, width: 640 }]
      },
      external_urls: { spotify: 'https://open.spotify.com/track/3kdBJj2IH9h4urhoAlWWiZ' }
    },
    '2FjfREsrdyQlxusXBsiLlj': { // A Minor
      name: 'Stairway to Heaven',
      artists: [{ name: 'Led Zeppelin' }],
      album: {
        name: 'Led Zeppelin IV',
        images: [{ url: 'https://placehold.co/640x640/4c0519/white?text=Led+Zep+IV', height: 640, width: 640 }]
      },
      external_urls: { spotify: 'https://open.spotify.com/track/2FjfREsrdyQlxusXBsiLlj' }
    },
    '4pJ2R20cgKjHEMl9DIkzsq': { // D Major
      name: 'Comfortably Numb',
      artists: [{ name: 'Pink Floyd' }],
      album: {
        name: 'The Wall',
        images: [{ url: 'https://placehold.co/640x640/0f172a/white?text=The+Wall', height: 640, width: 640 }]
      },
      external_urls: { spotify: 'https://open.spotify.com/track/4pJ2R20cgKjHEMl9DIkzsq' }
    }
  };

  /**
   * Fetches a valid Access Token using Client ID and Secret.
   * Uses a singleton promise to avoid multiple simultaneous requests.
   */
  private static async getAccessToken (): Promise<string | null> {
    console.log( '[SpotifyDebug] Checking Token State...' );
    console.log( '[SpotifyDebug] Has Refresh Token?', !!this.REFRESH_TOKEN );
    console.log( '[SpotifyDebug] Has Client ID?', !!this.CLIENT_ID );

    // 1. Check if we already have a valid token
    if ( this.accessToken && Date.now() < this.tokenExpiry - 60000 ) {
      return this.accessToken;
    }

    // 2. If a request is already in progress, wait for it
    if ( this.tokenPromise ) {
      return this.tokenPromise;
    }

    // 3. Otherwise, start a new token fetch
    this.tokenPromise = ( async () => {
      // PRIORITY: Try Refresh Token Flow (Headless User Auth)
      if ( this.REFRESH_TOKEN ) {
        console.log( 'SpotifyService: Using Headless Refresh Token Flow...' );
        try {
          const auth = btoa( `${this.CLIENT_ID}:${this.CLIENT_SECRET}` );
          const response = await fetch( 'https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${auth}`,
              'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams( {
              grant_type: 'refresh_token',
              refresh_token: this.REFRESH_TOKEN
            } )
          } );

          if ( !response.ok ) {
            const errText = await response.text();
            console.warn( 'SpotifyService: Refresh Token failed, falling back to Client Credentials.', response.status, errText );
          } else {
            const data = await response.json();
            this.accessToken = data.access_token;
            this.tokenExpiry = Date.now() + ( data.expires_in * 1000 );
            console.log( 'SpotifyService: Headless User Token obtained.' );
            return this.accessToken;
          }
        } catch ( err ) {
          console.error( 'SpotifyService: Refresh Token Error:', err );
        }
      }

      // FALLBACK: Client Credentials Flow
      if ( !this.CLIENT_ID || !this.CLIENT_SECRET || this.CLIENT_ID === 'your_client_id_here' ) {
        console.warn( 'SpotifyService: Missing or placeholder Spotify credentials in .env.local' );
        return null;
      }

      console.log( 'SpotifyService: Fetching Client Credentials token...' );
      try {
        const auth = btoa( `${this.CLIENT_ID}:${this.CLIENT_SECRET}` );
        const response = await fetch( 'https://accounts.spotify.com/api/token', {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: 'grant_type=client_credentials'
        } );

        if ( !response.ok ) {
          const errText = await response.text();
          console.error( `SpotifyService: Token fetch failed [${response.status}]`, errText );
          return null;
        }

        const data = await response.json();
        this.accessToken = data.access_token;
        this.tokenExpiry = Date.now() + ( data.expires_in * 1000 );

        console.log( 'SpotifyService: Access token obtained successfully.' );
        return this.accessToken;
      } catch ( err ) {
        console.error( 'SpotifyService: Auth Error (CORS issue if in browser):', err );
        return null;
      } finally {
        this.tokenPromise = null;
      }
    } )();

    return this.tokenPromise;
  }

  /**
   * Resolves a Spotify Track ID into song metadata.
   */
  public static async getTrackMetadata ( trackId: string ) {
    const token = await this.getAccessToken();
    if ( !token ) return null;

    // We try with US market first, then 0.0 without market
    const attempts = [
      `https://api.spotify.com/v1/tracks/${trackId}?market=US`,
      `https://api.spotify.com/v1/tracks/${trackId}`
    ];

    for ( const url of attempts ) {
      try {
        const response = await fetch( url, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        } );

        if ( response.ok ) {
          const data = await response.json();
          return {
            title: data.name,
            artist: data.artists[0]?.name || 'Unknown Artist',
            artwork: data.album.images[0]?.url,
            previewUrl: data.preview_url,
            spotifyUrl: data.external_urls.spotify
          };
        }

        // If we get a 403 but haven't tried all URLs, continue to next attempt
        if ( response.status === 403 ) {
          console.warn( `SpotifyService: API Blocked (403). Returning Mock Data for ${trackId}.` );
          // Extract track ID from URL just in case
          const cleanId = trackId;
          const mock = this.MOCK_DB[cleanId] || this.MOCK_DB['default'];

          return {
            title: mock.name,
            artist: mock.artists[0]?.name || 'Unknown Artist',
            artwork: mock.album.images[0]?.url,
            previewUrl: null,
            spotifyUrl: mock.external_urls.spotify
          };
        }

        // For other errors, don't keep retrying
        return null;
      } catch ( err ) {
        console.error( 'SpotifyService: Network error during fetch:', err );
        return null;
      }
    }

    return null;
  }
}

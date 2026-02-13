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

  private static readonly CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
  private static readonly CLIENT_SECRET = import.meta.env.VITE_SPOTIFY_CLIENT_SECRET;

  /**
   * Fetches a valid Access Token using Client ID and Secret.
   * Uses a singleton promise to avoid multiple simultaneous requests.
   */
  private static async getAccessToken (): Promise<string | null> {
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
      if ( !this.CLIENT_ID || !this.CLIENT_SECRET || this.CLIENT_ID === 'your_client_id_here' ) {
        console.warn( 'SpotifyService: Missing or placeholder Spotify credentials in .env.local' );
        return null;
      }

      console.log( 'SpotifyService: Fetching new access token...' );
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
          const errText = await response.text();
          console.warn( `SpotifyService: Track fetch 403 for ${url}. Error: ${errText}` );
          continue;
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

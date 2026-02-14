/**
 * Spotify Refresh Token Generator
 * 
 * Usage: node generate-spotify-token.js
 * 
 * This script starts a local server to handle the Spotify OAuth callback.
 * It opens the browser for the user to log in, and then prints the
 * Refresh Token to the console.
 */

import http from 'http';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// --- CONFIG ---
const CLIENT_ID = process.env.VITE_SPOTIFY_CLIENT_ID || '11bed96d74d347b7a070d6915569d1d1';
const CLIENT_SECRET = process.env.VITE_SPOTIFY_CLIENT_SECRET || '9990b8b8fcd941c2a82a7669d3d4f687';
const REDIRECT_URI = 'http://127.0.0.1:8888/callback';
const SCOPES = 'user-read-private user-read-email';

// --- SERVER ---
const server = http.createServer( async ( req, res ) => {
  const url = new URL( req.url, `http://${req.headers.host}` );

  if ( url.pathname === '/callback' ) {
    const code = url.searchParams.get( 'code' );
    const error = url.searchParams.get( 'error' );

    if ( error ) {
      res.end( `Error: ${error}` );
      console.error( 'Auth Error:', error );
      process.exit( 1 );
    }

    if ( code ) {
      res.end( 'Success! You can close this window. Check your terminal.' );
      console.log( '\nReceived Auth Code. Exchanging for Tokens...' );

      await exchangeCodeForToken( code );
      server.close();
      process.exit( 0 );
    }
  }
} );

server.listen( 8888, '127.0.0.1', () => {
  console.log( '\n--- SPOTIFY TOKEN GENERATOR ---' );
  console.log( `Listening on http://127.0.0.1:8888` );

  const authUrl = `https://accounts.spotify.com/authorize?response_type=code&client_id=${CLIENT_ID}&scope=${encodeURIComponent( SCOPES )}&redirect_uri=${encodeURIComponent( REDIRECT_URI )}&show_dialog=true`;

  console.log( '\nPlease open this URL to authorize:' );
  console.log( authUrl );

  // Try to open automatically
  const start = ( process.platform == 'darwin' ? 'open' : process.platform == 'win32' ? 'start' : 'xdg-open' );
  exec( `${start} "${authUrl}"` );
} );

async function exchangeCodeForToken ( code ) {
  try {
    const auth = Buffer.from( `${CLIENT_ID}:${CLIENT_SECRET}` ).toString( 'base64' );
    const response = await fetch( 'https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams( {
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: REDIRECT_URI
      } )
    } );

    if ( !response.ok ) {
      const err = await response.text();
      throw new Error( `Token Exchange Failed: ${err}` );
    }

    const data = await response.json();

    console.log( '\n--- SUCCESS! ---' );
    console.log( 'Add this to your .env.local file:\n' );
    console.log( `VITE_SPOTIFY_REFRESH_TOKEN=${data.refresh_token}` );
    console.log( '\n----------------' );

  } catch ( err ) {
    console.error( err );
  }
}

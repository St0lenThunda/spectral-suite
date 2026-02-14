import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Helper to read .env.local
function getEnv ( key ) {
  try {
    const envPath = path.resolve( process.cwd(), 'apps/tonic/.env.local' );
    const content = fs.readFileSync( envPath, 'utf-8' );
    const match = content.match( new RegExp( `^${key}=(.*)$`, 'm' ) );
    return match ? match[1].trim() : null;
  } catch ( e ) {
    return null;
  }
}

const CLIENT_ID = getEnv( 'VITE_SPOTIFY_CLIENT_ID' );
const CLIENT_SECRET = getEnv( 'VITE_SPOTIFY_CLIENT_SECRET' );
const REFRESH_TOKEN = getEnv( 'VITE_SPOTIFY_REFRESH_TOKEN' );

console.log( '--- Config Check ---' );
console.log( 'Client ID:', CLIENT_ID ? 'OK' : 'MISSING' );
console.log( 'Secret:', CLIENT_SECRET ? 'OK' : 'MISSING' );
console.log( 'Refresh Token:', REFRESH_TOKEN ? 'OK' : 'MISSING' );

async function testClientCredentials () {
  console.log( '\n--- 0. Testing Client Credentials Flow (Sanity Check) ---' );
  try {
    const auth = Buffer.from( `${CLIENT_ID}:${CLIENT_SECRET}` ).toString( 'base64' );
    const response = await fetch( 'https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials'
    } );

    if ( !response.ok ) {
      console.error( 'Client Creds Failed:', response.status, await response.text() );
      return;
    }

    const data = await response.json();
    console.log( 'Client Creds Token obtained:', data.access_token.substring( 0, 10 ) + '...' );

    // Try fetching a generic public artist (The Beatles)
    const artistResp = await fetch( 'https://api.spotify.com/v1/artists/3WrFJ7ztbogyGnTHbHJFl2', {
      headers: { 'Authorization': `Bearer ${data.access_token}` }
    } );

    if ( artistResp.ok ) {
      const artist = await artistResp.json();
      console.log( 'Public API Check:', 'SUCCESS' );
      console.log( 'Fetched Artist:', artist.name );
    } else {
      console.error( 'Public API Check Failed:', artistResp.status );
    }

  } catch ( e ) {
    console.error( 'Client Creds Exception:', e );
  }
}

async function testAccess () {
  await testClientCredentials();

  if ( !CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN ) {
    console.error( 'Missing credentials!' );
    return;
  }

  console.log( '\n--- 1. Testing Token Refresh ---' );
  let accessToken = null;
  try {
    const auth = Buffer.from( `${CLIENT_ID}:${CLIENT_SECRET}` ).toString( 'base64' );
    const response = await fetch( 'https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams( {
        grant_type: 'refresh_token',
        refresh_token: REFRESH_TOKEN
      } )
    } );

    if ( !response.ok ) {
      console.error( 'Refresh Failed:', response.status, await response.text() );
      return;
    }

    const data = await response.json();
    accessToken = data.access_token;
    console.log( 'Access Token obtained:', accessToken.substring( 0, 10 ) + '...' );
    console.log( 'Token Scopes:', data.scope );
  } catch ( e ) {
    console.error( 'Network Error:', e );
    return;
  }

  console.log( '\n--- 1.5. Verifying User Identity ---' );
  try {
    const response = await fetch( 'https://api.spotify.com/v1/me', {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    } );

    if ( response.ok ) {
      const userData = await response.json();
      console.log( 'Logged in as:', userData.display_name );
      console.log( 'Email:', userData.email );
      console.log( 'Product:', userData.product );
    } else {
      console.error( 'Failed to fetch user profile:', response.status );
    }
  } catch ( e ) {
    console.error( 'User Profile Error:', e );
  }

  console.log( '\n--- 2. Testing Track Fetch (The Beatles - Let It Be) ---' );
  // 7iN1s7xMJ4MW2OlwgAMMcF is Let It Be
  const trackId = '7iN1s7xMJ4MW2OlwgAMMcF';
  try {
    const response = await fetch( `https://api.spotify.com/v1/tracks/${trackId}`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    } );

    if ( !response.ok ) {
      console.error( 'Track Fetch Failed:', response.status, await response.text() );
      return;
    }

    const data = await response.json();
    console.log( 'Success!' );
    console.log( 'Track:', data.name );
    console.log( 'Artist:', data.artists[0]?.name );
    console.log( 'Market availability:', data.available_markets?.length || 'Unknown' );
  } catch ( e ) {
    console.error( 'Track Fetch Error:', e );
  }
}

testAccess();

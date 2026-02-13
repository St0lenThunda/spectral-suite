import { describe, it, expect } from 'vitest';
import { BinaryLoader } from '../BinaryLoader';

describe( 'BinaryLoader', () => {
    it( 'should parse a valid binary buffer', () => {
        // Mock a small binary buffer manually to test parsing logic
        // Schema:
        // [HEADER]
        // "SPEC" (4)
        // Version 1 (2)
        // SongCount 1 (4)
        
        // [DICTS]
        // Genre: 1 -> "Rock"
        // Decade: 1 -> "2020s"
        // Section: 1 -> "intro"
        // Chord: 2 -> "C", "G"

        // [SONG]
        // ID: len 3, "123"
        // GenreIdx: 0
        // DecadeIdx: 0
        // Spotify: len 0
        // SectionCount: 1
        //   NameIdx: 0
        //   ChordCount: 2
        //   ChordIdx: 0 (C), 1 (G)

        const buffer = new ArrayBuffer( 1024 );
        const view = new DataView( buffer );
        let offset = 0;

        // Header
        const writeStr = ( s: string ) => {
            for ( let i = 0; i < s.length; i++ ) {
                view.setUint8( offset++, s.charCodeAt( i ) );
            }
        };

        writeStr( 'SPEC' );
        view.setUint16( offset, 1, true ); offset += 2;
        view.setUint32( offset, 1, true ); offset += 4; // 1 song

        // Dicts helper
        const writeDict = ( items: string[] ) => {
            view.setUint16( offset, items.length, true ); offset += 2;
            for ( const item of items ) {
                view.setUint8( offset, item.length ); offset += 1;
                writeStr( item );
            }
        };

        writeDict( ['Rock'] );
        writeDict( ['2020s'] );
        writeDict( ['intro'] );
        writeDict( ['C', 'G'] );

        // Song
        // ID
        view.setUint8( offset, 3 ); offset += 1;
        writeStr( '123' );
        
        // Genre/Decade Indices
        view.setUint16( offset, 0, true ); offset += 2;
        view.setUint16( offset, 0, true ); offset += 2;
        
        // Spotify
        view.setUint8( offset, 0 ); offset += 1; // Empty spotify ID
        
        // Sections
        view.setUint8( offset, 1 ); offset += 1; // 1 section
        
        // Section 1
        view.setUint16( offset, 0, true ); offset += 2; // "intro"
        view.setUint16( offset, 2, true ); offset += 2; // 2 chords
        view.setUint16( offset, 0, true ); offset += 2; // "C"
        view.setUint16( offset, 1, true ); offset += 2; // "G"

        // Parse
        const loader = new BinaryLoader( buffer );
        const songs = loader.parse();

        expect( songs.length ).toBe( 1 );
        const song = songs[0];

        expect( song.id ).toBe( '123' );
        expect( song.genre ).toBe( 'Rock' );
        expect( song.decade ).toBe( '2020s' );
        expect( song.sections['intro'] ).toBeDefined();
        expect( song.sections['intro'].chords ).toEqual( ['C', 'G'] );
        
        // Verify derived data
        expect( song.sections['intro'].pitchClasses.length ).toBe( 2 ); 
        expect( song.sections['intro'].tonnetzPath.length ).toBe( 2 );
    } );
} );

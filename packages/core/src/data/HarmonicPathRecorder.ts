import { TonnetzMapper } from './TonnetzMapper';
import { SongDatabase } from './SongDatabase';
import type { SongEntry, TonnetzPoint } from './types';

/**
 * HarmonicPathRecorder — Geometric Soul of the Progression
 * 
 * This class records every chord the user plays and converts it into a "Shape" 
 * on the Tonnetz lattice. Think of it like a GPS for music: we track where 
 * you've been to help you decide where to go.
 */
export class HarmonicPathRecorder {
  private history: string[] = [];
  private path: TonnetzPoint[] = [];

  /**
   * Adds a new chord to the current session.
   * 
   * @param chordName - The chord symbol (e.g., "G7")
   */
  public recordChord ( chordName: string ): void {
    this.history.push( chordName );

    // Convert the chord to its geometric counterpart
    const pc = TonnetzMapper.chordToPC( chordName );
    const point = TonnetzMapper.pcToTonnetz( pc );
    this.path.push( point );

    // PHYSICS: We keep the path manageable by only considering the last 32 movements.
    // Long paths become difficult to compare efficiently.
    if ( this.path.length > 32 ) {
      this.path.shift();
      this.history.shift();
    }
  }

  /**
   * Returns the geometric shape of the current progression.
   */
  public getPath (): TonnetzPoint[] {
    return [...this.path];
  }

  /**
   * Returns the list of chord names in the current progression.
   */
  public getHistory (): string[] {
    return [...this.history];
  }

  /**
   * Removes a specific chord from the session history by index.
   * 
   * @param index - The index of the chord to remove
   */
  public removeChord ( index: number ): void {
    if ( index < 0 || index >= this.history.length ) return;
    this.history.splice( index, 1 );
    this.path.splice( index, 1 );
  }

  /**
   * Resets the recorder for a new song.
   */
  public clear (): void {
    this.history = [];
    this.path = [];
  }

  /**
   * Finds songs in the database that share a similar "Harmonic Shape" 
   * to what the user is currently playing.
   * 
   * @returns Promise<SongEntry[]> - A list of similar songs
   */
  public async findSimilarSongs (): Promise<{ song: SongEntry, score: number }[]> {
    if ( this.path.length < 2 ) return [];

    // We search the database for a pool of candidates (e.g., first 500 songs)
    // In a production app, we would use a spatial index or vector search.
    const candidates = await SongDatabase.search( { limit: 200 } );
    const results: { song: SongEntry, score: number }[] = [];

    for ( const song of candidates ) {
      // Compare each section of the candidate song to our current path
      let maxSimilarity = 0;

      for ( const sectionKey in song.sections ) {
        const section = song.sections[sectionKey];
        if ( !section ) continue;

        const similarity = TonnetzMapper.calculatePathSimilarity( this.path, section.tonnetzPath );
        if ( similarity > maxSimilarity ) maxSimilarity = similarity;
      }

      if ( maxSimilarity > 0.6 ) { // 60% similarity threshold
        results.push( { song, score: maxSimilarity } );
      }
    }

    // Sort by most similar first
    return results.sort( ( a, b ) => b.score - a.score ).slice( 0, 5 );
  }
}

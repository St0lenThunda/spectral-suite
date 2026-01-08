// Type declarations for Meyda library
declare module 'meyda' {
  export interface MeydaFeaturesObject {
    energy?: number;
    rms?: number;
    [key: string]: any;
  }

  export interface MeydaAnalyzer {
    start: () => void;
    stop: () => void;
  }

  export interface MeydaAnalyzerOptions {
    audioContext: AudioContext;
    source: MediaStreamAudioSourceNode | AudioBufferSourceNode;
    bufferSize: number;
    featureExtractors: string[];
    callback?: (features: MeydaFeaturesObject) => void;
  }

  export function createMeydaAnalyzer(options: MeydaAnalyzerOptions): MeydaAnalyzer;

  const Meyda: {
    createMeydaAnalyzer: typeof createMeydaAnalyzer;
  };

  export default Meyda;
}

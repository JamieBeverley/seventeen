import type { OutputConfig } from './output/types';

export type { OutputConfig };

export interface FreesoundPreviews {
  'preview-hq-mp3': string;
  'preview-hq-ogg': string;
  'preview-lq-mp3': string;
  'preview-lq-ogg': string;
}

export interface FreesoundSoundData {
  id: number;
  name: string;
  username: string;
  previews: FreesoundPreviews;
  duration: number;
  tags: string[];
  description: string;
}

export interface FreesoundSearchResult {
  id: number;
  name: string;
}

export interface FreesoundSearchResponse {
  count: number;
  results: FreesoundSearchResult[];
}

export interface SampleResult {
  buffer: AudioBuffer;
  freesound_data: FreesoundSoundData;
}

export interface Layer {
  id: number;
  sample_query: string;
  toggles: boolean[];
  mute: boolean;
  playback_speed: number;
  cut: boolean;
  start: number;
  end: number;
  buffer: AudioBuffer | null;
  freesound_data: Partial<FreesoundSoundData>;
  send_1: number;
  send_2: number;
  output: OutputConfig;
}

export type LayerMap = Record<number, Layer>;

export interface SeventeenState {
  layers: LayerMap;
}

export function repeat<T>(x: T, n: number): T[] {
  return Array.from({ length: n }, () => x);
}

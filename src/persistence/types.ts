import type { ClockMode } from '../midi/types';
import type { OutputConfig } from '../output/types';

export const CURRENT_VERSION = 1;

export interface SavedLayer {
  id: number;
  sample_query: string;
  toggles: boolean[];
  mute: boolean;
  playback_speed: number;
  cut: boolean;
  start: number;
  end: number;
  /** Freesound sound ID — present if a sample was loaded, null otherwise. */
  freesound_id: number | null;
  send_1: number;
  send_2: number;
  output: OutputConfig;
}

export interface ProjectState {
  version: number;
  layers: SavedLayer[];
  tempo: number;
  speed: number;
  clockMode: ClockMode;
  midiInputId: string | null;
  midiOutputId: string | null;
}

// ---------------------------------------------------------------------------
// Output configuration — stored in Layer state
// ---------------------------------------------------------------------------

export interface AudioOutputConfig {
  type: 'audio';
}

export interface MidiNoteConfig {
  type: 'midi';
  outputId: string | null;
  channel: number;    // 1–16
  note: number;       // 0–127
  velocity: number;   // 0–127
  durationMs: number; // note-off delay in ms
}

export type OutputConfig = AudioOutputConfig | MidiNoteConfig;

// ---------------------------------------------------------------------------
// Runtime handler interface
// ---------------------------------------------------------------------------

/** Parameters passed to every trigger call, sourced from Layer props. */
export interface TriggerParams {
  buffer: AudioBuffer | null;
  start: number;
  end: number;
  playbackSpeed: number;
  cut: boolean;
}

export interface OutputHandler {
  trigger(params: TriggerParams): void;
  /** Immediately silence / cancel any in-progress output. */
  stop(): void;
}

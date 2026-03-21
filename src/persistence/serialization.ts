import type { RhythmeContextValue } from '../context/RhythmeContext';
import type { Layer, LayerMap } from '../types';
import { CURRENT_VERSION, ProjectState, SavedLayer } from './types';

// ---------------------------------------------------------------------------
// Serialize
// ---------------------------------------------------------------------------

function serializeLayer(layer: Layer): SavedLayer {
  return {
    id: layer.id,
    sample_query: layer.sample_query,
    toggles: [...layer.toggles],
    mute: layer.mute,
    playback_speed: layer.playback_speed,
    cut: layer.cut,
    start: layer.start,
    end: layer.end,
    freesound_id: layer.freesound_data.id ?? null,
    send_1: layer.send_1,
    send_2: layer.send_2,
    output: layer.output,
  };
}

export function serialize(
  layers: LayerMap,
  ctx: Pick<
    RhythmeContextValue,
    'tempo' | 'speed' | 'clockMode' | 'midiInputId' | 'midiOutputId'
  >
): ProjectState {
  return {
    version: CURRENT_VERSION,
    layers: Object.values(layers).map(serializeLayer),
    tempo: ctx.tempo,
    speed: ctx.speed,
    clockMode: ctx.clockMode,
    midiInputId: ctx.midiInputId,
    midiOutputId: ctx.midiOutputId,
  };
}

// ---------------------------------------------------------------------------
// Deserialize
// ---------------------------------------------------------------------------

/**
 * Reconstruct a LayerMap from saved data.
 * `buffer` is always null — callers must re-fetch audio after loading.
 * `freesound_data` carries only the saved ID so the exact sample can be
 * reloaded; the rest of the metadata is populated after fetching.
 */
export function deserializeLayers(saved: ProjectState): LayerMap {
  const map: LayerMap = {};
  for (const s of saved.layers) {
    map[s.id] = {
      id: s.id,
      sample_query: s.sample_query,
      toggles: [...s.toggles],
      mute: s.mute,
      playback_speed: s.playback_speed,
      cut: s.cut,
      start: s.start,
      end: s.end,
      buffer: null,
      freesound_data: s.freesound_id != null ? { id: s.freesound_id } : {},
      send_1: s.send_1,
      send_2: s.send_2,
      output: s.output,
    };
  }
  return map;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export function parseProjectState(raw: unknown): ProjectState {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('Invalid project: expected an object');
  }
  const obj = raw as Record<string, unknown>;
  if (typeof obj['version'] !== 'number') throw new Error('Invalid project: missing version');
  if (!Array.isArray(obj['layers'])) throw new Error('Invalid project: missing layers');
  if (typeof obj['tempo'] !== 'number') throw new Error('Invalid project: missing tempo');
  if (typeof obj['speed'] !== 'number') throw new Error('Invalid project: missing speed');
  return raw as ProjectState;
}

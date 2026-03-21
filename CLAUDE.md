# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
yarn dev      # Dev server at http://localhost:5173
yarn build    # Type-check + production build to /dist
yarn test     # Run tests (vitest, no watch)
```

To run a single test file:
```bash
yarn test -- --testPathPattern=App.test
```

## Architecture

Musical step sequencer built with React 18 (class components), TypeScript, Vite 6, and the Web Audio API. Uses the Freesound.org API v2 for audio samples and the Web MIDI API for clock sync and note output.

### Data flow

1. `App.tsx` — prompts for a Freesound API key (stored in `localStorage`), then renders `Seventeen`.
2. `Seventeen.tsx` — manages the `LayerMap` (6 tracks). Loads initial state from URL hash, then `localStorage`, then defaults. Fetches missing audio buffers from Freesound on mount and after project load.
3. `SoundProvider` (`context/RhythmeContext.tsx`) — owns the global clock via `MidiClock`, global tempo/speed/delay state, and all MIDI access. Exposes everything via `RhythmeContext`.
4. Each `Layer` component (`components/Layer.tsx`) subscribes to the beat counter via context. On each tick it checks whether the current step is active and calls `OutputHandler.trigger()`.

### Key directories

- `src/midi/` — `MidiClock` class: internal (drift-corrected setTimeout), MIDI master (sends 0xF8 pulses), MIDI slave (estimates BPM from incoming pulses). 24 PPQN standard; 6 pulses per 16th-note beat.
- `src/output/` — `OutputHandler` interface with `AudioOutputHandler` (Web Audio BufferSource) and `MidiOutputHandler` (Note On/Off). Factory in `index.ts`. `Layer` recreates the handler on type change; calls `updateConfig()` for config-only changes.
- `src/persistence/` — four independent modules:
  - `serialization.ts` — `serialize()` / `deserializeLayers()` / `parseProjectState()` (validates shape)
  - `fileIO.ts` — download as JSON blob; pick and parse local `.json` file
  - `localStorage.ts` — auto-save with 1s debounce in `ProjectControls`
  - `urlState.ts` — base64(encodeURIComponent(JSON)) in URL hash; cleared after load
  - `googleDrive.ts` — GIS token flow (drive.file scope), Drive REST multipart upload, Picker; only active when `VITE_GOOGLE_CLIENT_ID` is set

### Audio engine notes

- `AudioContext` is a lazy singleton in `src/audio.ts` (created on first call to `getAC()`, not at module load — avoids crashing jsdom in tests).
- Trim: `start`/`end` are 0–1 fractions of buffer duration; mapped to `offset` and `duration` in `AudioBufferSourceNode.start(0, offset, duration)`.
- Delay: a `DelayNode` + feedback `GainNode` feedback loop, wired inside `SoundProvider`.
- `playbackRate` on `BufferSource` is multiplied by the layer's `playback_speed`.

### State restoration across SoundProvider boundary

`Seventeen` (parent of `SoundProvider`) cannot consume context. Solution: `Seventeen` restores `layers` and passes `initialTempo` as prop to `SoundProvider`; `ProjectControls` (inside `SoundProvider`) restores `speed`, `clockMode`, and MIDI IDs in `componentDidMount` via `contextValue`.

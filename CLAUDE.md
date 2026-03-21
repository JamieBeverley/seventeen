# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
yarn start    # Dev server at http://localhost:3000
yarn build    # Production build to /build
yarn test     # Run tests (watch mode)
```

To run a single test file:
```bash
yarn test -- --testPathPattern=App.test
```

## Architecture

This is a **musical step sequencer** web app built with React 17 (class components) and the Web Audio API. It uses the Freesound.org API v2 to fetch audio samples.

### Data flow

1. `App` prompts for a Freesound API key (stored in `localStorage`), then renders the `Seventeen` component.
2. `Seventeen` fetches 6 audio buffers from Freesound on mount and manages per-layer state.
3. `SoundProvider` (React Context in `App.js`) owns the global beat clock — a `setTimeout`-based scheduler that increments a beat counter at the current BPM. It also holds a Web Audio `DelayNode` for effects.
4. Each `Layer` subscribes to context beats. When the current beat matches an active step button, it fires a `BufferSource` playback with the configured trim/speed settings.

### Key files

- `src/App.js` — `App` root, `SoundProvider` context (clock + delay), `Seventeen` sequencer, `Layer` track, `Header` transport, `Button` step toggle. Almost all logic lives here.
- `src/components/NodeComponent/index.jsx` — Abstract audio node base class (WIP).
- `src/components/Mixer/index.jsx` — Mixer node extending NodeComponent (WIP; CSS stub).
- `src/components/Delay/index.jsx` — Delay component (WIP; CSS stub).

### Audio engine notes

- `AudioContext` is created inside `SoundProvider`.
- Each `Layer` decodes its fetched audio into an `AudioBuffer` and stores it in component state.
- Playback uses `createBufferSource()` with `start(when, offset, duration)` to honour the trim range (`startTrim`/`endTrim` as 0–1 fractions of buffer length) and `playbackRate` for speed control.
- The delay node uses `delayTime` and a feedback `GainNode` routed back into itself.

### Freesound API

Layers are initialised with a search tag (e.g. `"piano"`, `"kick"`). `Seventeen` fetches `/search/text/?query=<tag>&token=<key>` and picks the first result's `previews["preview-hq-mp3"]` URL for playback.

import './App.css';
import React, { Component } from 'react';

// ---------------------------------------------------------------------------
// Web Audio API – webkit prefix shim
// ---------------------------------------------------------------------------
declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext;
  }
}

const AudioContextCtor: typeof AudioContext =
  window.AudioContext || window.webkitAudioContext;

let _ac: AudioContext | null = null;
function getAC(): AudioContext {
  if (!_ac) _ac = new AudioContextCtor();
  return _ac;
}

// ---------------------------------------------------------------------------
// Freesound API types
// ---------------------------------------------------------------------------
interface FreesoundPreviews {
  'preview-hq-mp3': string;
  'preview-hq-ogg': string;
  'preview-lq-mp3': string;
  'preview-lq-ogg': string;
}

interface FreesoundSoundData {
  id: number;
  name: string;
  username: string;
  previews: FreesoundPreviews;
  duration: number;
  tags: string[];
  description: string;
}

interface FreesoundSearchResult {
  id: number;
  name: string;
}

interface FreesoundSearchResponse {
  count: number;
  results: FreesoundSearchResult[];
}

// ---------------------------------------------------------------------------
// Layer / state types
// ---------------------------------------------------------------------------
interface Layer {
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
}

type LayerMap = Record<number, Layer>;

interface SeventeenState {
  layers: LayerMap;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function repeat<T>(x: T, n: number): T[] {
  return Array.apply(x, Array(n) as T[]) as T[];
}

const default_layer = function (sample_query: string, id: number): Layer {
  return {
    id,
    sample_query,
    toggles: repeat<boolean>(false, 8),
    mute: true,
    playback_speed: 1,
    cut: true,
    start: 0,
    end: 1,
    buffer: null,
    freesound_data: {},
    send_1: 0,
    send_2: 0,
  };
};

function init_from_sample_list(sample_query: string[]): LayerMap {
  return sample_query.reduce<LayerMap>((acc, sample, index) => {
    acc[index] = default_layer(sample, index);
    return acc;
  }, {});
}

const defaultState: SeventeenState = {
  layers: ['piano', 'orchestra', 'kick', 'shaker', 'hat', 'snare'].map(
    default_layer
  ) as unknown as LayerMap,
};

// ---------------------------------------------------------------------------
// Freesound API helpers
// ---------------------------------------------------------------------------
interface SampleResult {
  buffer: AudioBuffer;
  freesound_data: FreesoundSoundData;
}

const get_sample = function (
  freesound_api_key: string,
  audioCtx: AudioContext,
  query: string
): Promise<SampleResult> {
  return fetch(
    `https://freesound.org/apiv2/search/text/?query=${query}&page_size=30&token=${freesound_api_key}`
  )
    .then((x) => x.json() as Promise<FreesoundSearchResponse>)
    .then((x) => {
      const id =
        x.results[Math.floor(x.results.length * Math.random())].id;
      return get_sample_by_id(freesound_api_key, audioCtx, id);
    });
};

const get_sample_by_id = function (
  freesound_api_key: string,
  audioCtx: AudioContext,
  sound_id: number
): Promise<SampleResult> {
  return fetch(
    `https://freesound.org/apiv2/sounds/${sound_id}/?token=${freesound_api_key}`
  )
    .then((x) => x.json() as Promise<FreesoundSoundData>)
    .then((data) =>
      fetch(
        `${data.previews['preview-hq-mp3']}?token=${freesound_api_key}`
      )
        .then((y) => y.arrayBuffer())
        .then((buffer) => audioCtx.decodeAudioData(buffer))
        .then((decoded) => ({
          buffer: decoded,
          freesound_data: data,
        }))
    );
};

const clip = (x: number, low: number, high: number): number =>
  Math.min(Math.max(x, low), high);

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------
interface DelayState {
  delayNode: DelayNode;
  feedbackNode: GainNode;
  delayTime: number;
  feedback?: number;
}

interface RhythmeContextValue {
  beat: number;
  beat_count: number;
  tempo: number;
  speed: number;
  tempo_set_ts: number | null;
  delay?: DelayState;
  updateContext: (items: Partial<SoundProviderState>) => void;
  setDelayFeedback: (value: number) => void;
  setDelayTime: (delayTime: number) => void;
}

export const RhythmeContext = React.createContext<RhythmeContextValue>({
  beat: 0,
  beat_count: 0,
  tempo: 120,
  speed: 1,
  tempo_set_ts: null,
  updateContext: () => {},
  setDelayFeedback: () => {},
  setDelayTime: () => {},
});

interface SoundProviderProps {
  initialTempo: number;
  playing: boolean;
  children: React.ReactNode;
}

interface SoundProviderState {
  beat: number;
  beat_count: number;
  tempo: number;
  speed: number;
  tempo_set_ts: number | null;
  delay?: DelayState;
}

class SoundProvider extends Component<SoundProviderProps, SoundProviderState> {
  ac: AudioContext;
  input: GainNode;
  timeout: ReturnType<typeof setTimeout> | null = null;
  clockTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(props: SoundProviderProps) {
    super(props);
    this.ac = getAC();
    this.input = this.ac.createGain();

    const delayNode = this.ac.createDelay();
    delayNode.delayTime.value = this.props.initialTempo / 60 / 3;
    const feedbackNode = this.ac.createGain();
    feedbackNode.gain.value = 0.8;
    delayNode.connect(feedbackNode);
    feedbackNode.connect(delayNode);

    const delay: DelayState = {
      delayNode,
      feedbackNode,
      delayTime: delayNode.delayTime.value,
    };

    this.state = {
      beat: 0,
      beat_count: 0,
      tempo: this.props.initialTempo,
      speed: 1,
      tempo_set_ts: null,
      delay,
    };
  }

  setDelayTime(delayTime: number): void {
    if (!this.state.delay) return;
    this.state.delay.delayNode.delayTime.value = delayTime;
    const delay: DelayState = { ...this.state.delay, delayTime };
    this.setState({ ...this.state, delay });
  }

  setDelayFeedback(value: number): void {
    if (!this.state.delay) return;
    value = clip(value, 0, 1);
    this.state.delay.feedbackNode.gain.value = value;
    const delay: DelayState = { ...this.state.delay, feedback: value };
    this.setState({ ...this.state, delay });
  }

  now(): number {
    return Number(new Date());
  }

  initClock(): void {
    this.setState({ tempo_set_ts: this.now() }, () => {
      const loop = () => {
        const beat = this.state.beat + this.state.speed;
        const beat_count = this.state.beat_count + 1;
        this.setState({ beat, beat_count }, () => {
          const wait =
            (this.state.beat_count * 1000 * 15) / this.state.tempo +
            (this.state.tempo_set_ts ?? 0) -
            this.now();
          this.timeout = setTimeout(loop, wait);
        });
      };
      const wait =
        (this.state.beat_count * 1000 * 15) / this.state.tempo +
        (this.state.tempo_set_ts ?? 0) -
        this.now();
      this.timeout = setTimeout(loop, wait);
    });
  }

  componentDidMount(): void {
    if (this.props.playing) {
      this.initClock();
    }
  }

  componentDidUpdate(
    prevProps: SoundProviderProps,
    prevState: SoundProviderState
  ): void {
    if (prevState.tempo !== this.state.tempo) {
      this.setState({ tempo_set_ts: this.now(), beat_count: 0 });
    }
    if (prevProps.playing && !this.props.playing) {
      if (this.clockTimeout !== null) {
        clearTimeout(this.clockTimeout);
      }
    } else if (!prevProps.playing && this.props.playing) {
      this.initClock();
    }
  }

  updateContext(items: Partial<SoundProviderState>): void {
    this.setState({ ...this.state, ...items });
  }

  render(): React.ReactNode {
    const value: RhythmeContextValue = {
      ...this.state,
      updateContext: this.updateContext.bind(this),
      setDelayFeedback: this.setDelayFeedback.bind(this),
      setDelayTime: this.setDelayTime.bind(this),
    };

    return (
      <RhythmeContext.Provider value={value}>
        {this.props.children}
      </RhythmeContext.Provider>
    );
  }
}

const withRythmeContext = <P extends { contextValue: RhythmeContextValue }>(
  Wrapped: React.ComponentType<P>
) => (props: Omit<P, 'contextValue'>): React.ReactElement => (
  <RhythmeContext.Consumer>
    {(context) => (
      <Wrapped {...(props as P)} contextValue={context} />
    )}
  </RhythmeContext.Consumer>
);

// ---------------------------------------------------------------------------
// Button
// ---------------------------------------------------------------------------
interface ButtonProps {
  on: boolean;
  trig: boolean;
  onClick: () => void;
}

class Button extends Component<ButtonProps> {
  render(): React.ReactNode {
    const className = `${this.props.on ? 'on' : ''} ${
      this.props.trig ? 'trig' : ''
    }`;
    return (
      <div
        className={`button ${className}`}
        onClick={this.props.onClick}
      ></div>
    );
  }
}

// ---------------------------------------------------------------------------
// Layer
// ---------------------------------------------------------------------------
interface LayerOwnProps extends Layer {
  onMute: () => void;
  onButtonToggle: (index: number) => void;
  updateLayer: (vals: Partial<Layer>) => void;
}

interface LayerProps extends LayerOwnProps {
  contextValue: RhythmeContextValue;
}

const Layer = withRythmeContext(
  class LayerInner extends Component<LayerProps> {
    source: AudioBufferSourceNode | null = null;

    componentDidUpdate(prevProps: LayerProps): void {
      if (
        prevProps.contextValue.beat !== this.props.contextValue.beat
      ) {
        const beat =
          this.props.contextValue.beat % this.props.toggles.length;
        const on = this.props.toggles[beat];
        if (on && !this.props.mute) {
          this.play();
        }
      }
    }

    play(): void {
      if (this.props.buffer === null) {
        return;
      }
      if (this.source && this.props.cut) {
        this.source.stop();
      }
      const offset = this.props.buffer.duration * this.props.start;
      const duration = Math.abs(
        this.props.buffer.duration * (this.props.start - this.props.end)
      );
      const playbackRate = this.props.playback_speed;
      const ac = getAC();
      this.source = ac.createBufferSource();
      this.source.playbackRate.value = playbackRate;
      this.source.buffer = this.props.buffer;
      this.source.connect(ac.destination);
      this.source.start(0, offset, duration);
    }

    onMute(): void {
      if (this.source) {
        this.source.stop();
      }
      this.props.onMute();
    }

    onCut(): void {
      this.props.updateLayer({ cut: !this.props.cut });
    }

    onStartChange(e: React.FormEvent<HTMLInputElement>): void {
      const start = parseFloat((e.target as HTMLInputElement).value);
      this.props.updateLayer({
        start,
        end: Math.max(this.props.end, start),
      });
    }

    onEndChange(e: React.FormEvent<HTMLInputElement>): void {
      this.props.updateLayer({
        end: parseFloat((e.target as HTMLInputElement).value),
      });
    }

    onSpeedChange(e: React.FormEvent<HTMLInputElement>): void {
      const speed = parseFloat((e.target as HTMLInputElement).value);
      this.props.updateLayer({ playback_speed: speed });
    }

    onLengthChange(e: React.FormEvent<HTMLInputElement>): void {
      const value = Math.round(
        parseFloat((e.target as HTMLInputElement).value)
      );
      if (isNaN(value)) {
        return;
      }
      let toggles = [...this.props.toggles.slice(0, value)];
      const diff = value - toggles.length;
      if (diff > 0) {
        toggles = toggles.concat(repeat<boolean>(false, diff));
      }
      this.props.updateLayer({ toggles });
    }

    double(): void {
      const toggles = [
        ...this.props.toggles,
        ...this.props.toggles,
      ];
      this.props.updateLayer({ toggles });
    }

    half(): void {
      const index = Math.max(
        1,
        Math.floor(this.props.toggles.length / 2)
      );
      const toggles = this.props.toggles.slice(0, index);
      this.props.updateLayer({ toggles });
    }

    renderToggles(): React.ReactNode[] {
      const foldEvery = 16;

      const toggles = this.props.toggles.map((x, i) => (
        <Button
          key={i}
          onClick={() => this.props.onButtonToggle(i)}
          on={x}
          trig={
            i ===
            this.props.contextValue.beat % this.props.toggles.length
          }
        />
      ));
      const nFolds = Math.max(
        1,
        Math.ceil(toggles.length / foldEvery)
      );
      const togs: React.ReactNode[] = [];
      for (let i = 1; i < nFolds + 1; i++) {
        togs.push(
          <div key={`row-${i}`} className="flex-row">
            {toggles.slice((i - 1) * foldEvery, i * foldEvery)}
          </div>
        );
      }
      return togs;
    }

    render(): React.ReactNode {
      return (
        <div className="layer">
          <div className="sample">
            <div>
              <b style={{ display: 'inline-block' }}>
                {this.props.sample_query}{' '}
              </b>
              {` ${this.props.freesound_data.name ?? ''} (${
                this.props.freesound_data.username ?? ''
              })`}
            </div>
            <div>
              <button
                style={{ display: 'inline-block' }}
                className={this.props.mute ? 'on' : ''}
                onClick={this.onMute.bind(this)}
              >
                mute
              </button>
              <button
                style={{ display: 'inline-block' }}
                className={this.props.cut ? 'on' : ''}
                onClick={this.onCut.bind(this)}
              >
                cut
              </button>
            </div>
            <div>
              <input
                value={this.props.start}
                onInput={this.onStartChange.bind(this)}
                type="number"
                min="0"
                max="1"
                step=".01"
              />
              <input
                value={this.props.end}
                onInput={this.onEndChange.bind(this)}
                type="number"
                min="0"
                max="1"
                step=".01"
              />
              <input
                value={this.props.playback_speed}
                onInput={this.onSpeedChange.bind(this)}
                type="number"
                min="0"
                step=".1"
              />
            </div>
            <div>
              <input
                type="number"
                value={this.props.toggles.length}
                step="1"
                min="0"
                onInput={this.onLengthChange.bind(this)}
              />
            </div>
            <div>
              <button onClick={this.double.bind(this)}>x2</button>
              <button onClick={this.half.bind(this)}>1/2</button>
            </div>
          </div>
          <div className="toggles">{this.renderToggles()}</div>
        </div>
      );
    }
  }
);

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------
interface HeaderProps {
  contextValue: RhythmeContextValue;
}

const Header = withRythmeContext(
  class HeaderInner extends Component<HeaderProps> {
    updateTempo(e: React.ChangeEvent<HTMLInputElement>): void {
      const tempo = parseFloat(e.target.value);
      this.props.contextValue.updateContext({ tempo });
    }

    updateBeat(e: React.ChangeEvent<HTMLInputElement>): void {
      const beat = parseInt(e.target.value, 10);
      this.props.contextValue.updateContext({ beat });
    }

    updateSpeed(e: React.ChangeEvent<HTMLInputElement>): void {
      const speed = parseFloat(e.target.value);
      this.props.contextValue.updateContext({ speed });
    }

    render(): React.ReactNode {
      const beat = this.props.contextValue.beat % 16;
      return (
        <div className="header">
          <input
            value={this.props.contextValue.tempo}
            onChange={this.updateTempo.bind(this)}
            type="number"
            step="0.5"
          />
          <input
            value={this.props.contextValue.beat % 64}
            onChange={this.updateBeat.bind(this)}
            type="number"
            step="1"
          />
          <input
            value={this.props.contextValue.speed}
            onChange={this.updateSpeed.bind(this)}
            type="number"
            step="1"
          />
          <span className="metronome">
            {[0, 1, 2, 3, 4, 5, 6, 7]
              .map((x) => x * 2)
              .map((i) => (
                <div
                  key={i}
                  className={beat > i ? 'on' : ''}
                  style={{ display: 'inline-block', width: '10px' }}
                />
              ))}
          </span>
          <div>beat current: {this.props.contextValue.beat}</div>
          <div>total: {this.props.contextValue.beat_count}</div>
        </div>
      );
    }
  }
);

// ---------------------------------------------------------------------------
// Seventeen
// ---------------------------------------------------------------------------
interface SeventeenProps {
  freesound_api_key: string;
}

class Seventeen extends Component<SeventeenProps, SeventeenState> {
  constructor(props: SeventeenProps) {
    super(props);
    this.state = defaultState;
  }

  componentDidMount(): void {
    (Object.keys(this.state.layers) as unknown as number[]).forEach(
      (id) => {
        const key = id as unknown as keyof LayerMap;
        const x = this.state.layers[key];
        get_sample(this.props.freesound_api_key, getAC(), x.sample_query).then(
          ({ buffer, freesound_data }) => {
            const layers = { ...this.state.layers };
            layers[key] = { ...layers[key], buffer, freesound_data };
            console.log(`Loaded sample ${String(id)}`);
            this.setState({ layers });
          }
        );
      }
    );
  }

  onButtonToggle(id: string, index: number): void {
    const layers = { ...this.state.layers };
    const numId = parseInt(id, 10) as unknown as keyof LayerMap;
    const layer = { ...layers[numId] };
    const toggles = [...layer.toggles];
    toggles[index] = !toggles[index];
    layer.toggles = toggles;
    layers[numId] = layer;
    this.setState({ layers });
  }

  onMute(id: string): void {
    const numId = parseInt(id, 10) as unknown as keyof LayerMap;
    const layers = { ...this.state.layers };
    layers[numId] = { ...layers[numId], mute: !layers[numId].mute };
    this.setState({ layers });
  }

  updateLayer(id: string, vals: Partial<Layer>): void {
    const numId = parseInt(id, 10) as unknown as keyof LayerMap;
    const layers = { ...this.state.layers };
    layers[numId] = { ...layers[numId], ...vals };
    this.setState({ layers });
  }

  render(): React.ReactNode {
    const layers = Object.keys(this.state.layers).map((id) => {
      const layer = this.state.layers[
        parseInt(id, 10) as unknown as keyof LayerMap
      ];
      return (
        <Layer
          key={id}
          onMute={() => this.onMute(id)}
          onButtonToggle={(btn_index: number) =>
            this.onButtonToggle(id, btn_index)
          }
          updateLayer={(vals: Partial<Layer>) =>
            this.updateLayer(id, vals)
          }
          {...layer}
        />
      );
    });

    return (
      <SoundProvider initialTempo={120} playing={true}>
        <div className="seventeen">
          <Header />
          {layers}
        </div>
      </SoundProvider>
    );
  }
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------
interface AppState {
  init: boolean;
  apiKey: string;
}

class App extends Component<Record<string, never>, AppState> {
  constructor(props: Record<string, never>) {
    super(props);
    this.state = {
      init: false,
      apiKey: '',
    };
  }

  componentDidMount(): void {
    const freesound_api_key =
      window.localStorage.getItem('freesound_api_key');
    if (freesound_api_key) {
      this.setState({ apiKey: freesound_api_key });
    }
  }

  updateApiKey(e: React.ChangeEvent<HTMLInputElement>): void {
    this.setState({ apiKey: e.target.value });
  }

  init(): void {
    this.setState({ init: true });
    const freesound_api_key = this.state.apiKey;
    window.localStorage.setItem('freesound_api_key', freesound_api_key);
  }

  render(): React.ReactNode {
    return (
      <div className="App">
        {this.state.init && this.state.apiKey !== '' ? (
          <Seventeen freesound_api_key={this.state.apiKey} />
        ) : (
          <div>
            <div>
              Freesound api key:
              <input
                value={this.state.apiKey}
                onChange={this.updateApiKey.bind(this)}
              />
            </div>
            <button
              disabled={this.state.apiKey === ''}
              onClick={this.init.bind(this)}
            >
              start
            </button>
          </div>
        )}
      </div>
    );
  }
}

export default App;

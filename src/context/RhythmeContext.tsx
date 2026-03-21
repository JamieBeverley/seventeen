import React, { Component } from 'react';
import { getAC } from '../audio';

export interface DelayState {
  delayNode: DelayNode;
  feedbackNode: GainNode;
  delayTime: number;
  feedback?: number;
}

export interface RhythmeContextValue {
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

export interface SoundProviderProps {
  initialTempo: number;
  playing: boolean;
  children: React.ReactNode;
}

export interface SoundProviderState {
  beat: number;
  beat_count: number;
  tempo: number;
  speed: number;
  tempo_set_ts: number | null;
  delay?: DelayState;
}

function clip(x: number, low: number, high: number): number {
  return Math.min(Math.max(x, low), high);
}

export class SoundProvider extends Component<
  SoundProviderProps,
  SoundProviderState
> {
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

export const withRythmeContext = <P extends { contextValue: RhythmeContextValue }>(
  Wrapped: React.ComponentType<P>
) =>
  (props: Omit<P, 'contextValue'>): React.ReactElement => (
    <RhythmeContext.Consumer>
      {(context) => <Wrapped {...(props as P)} contextValue={context} />}
    </RhythmeContext.Consumer>
  );


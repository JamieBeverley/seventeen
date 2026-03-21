import React, { Component } from 'react';
import { getAC } from '../audio';
import { MidiClock } from '../midi/MidiClock';
import { ClockMode, MidiPort } from '../midi/types';

export type { ClockMode, MidiPort };

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
  delay?: DelayState;
  // MIDI
  clockMode: ClockMode;
  midiSupported: boolean;
  midiHasAccess: boolean;
  midiInputs: MidiPort[];
  midiOutputs: MidiPort[];
  midiInputId: string | null;
  midiOutputId: string | null;
  // Methods
  updateContext: (items: Partial<SoundProviderState>) => void;
  setDelayFeedback: (value: number) => void;
  setDelayTime: (delayTime: number) => void;
  requestMidiAccess: () => Promise<void>;
  setClockMode: (
    mode: ClockMode,
    inputId?: string | null,
    outputId?: string | null
  ) => void;
  getMidiOutput: (id: string) => MIDIOutput | undefined;
}

export const RhythmeContext = React.createContext<RhythmeContextValue>({
  beat: 0,
  beat_count: 0,
  tempo: 120,
  speed: 1,
  clockMode: 'internal',
  midiSupported: false,
  midiHasAccess: false,
  midiInputs: [],
  midiOutputs: [],
  midiInputId: null,
  midiOutputId: null,
  updateContext: () => {},
  setDelayFeedback: () => {},
  setDelayTime: () => {},
  requestMidiAccess: async () => {},
  setClockMode: () => {},
  getMidiOutput: () => undefined,
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
  delay?: DelayState;
  clockMode: ClockMode;
  midiSupported: boolean;
  midiHasAccess: boolean;
  midiInputs: MidiPort[];
  midiOutputs: MidiPort[];
  midiInputId: string | null;
  midiOutputId: string | null;
}

function clip(x: number, low: number, high: number): number {
  return Math.min(Math.max(x, low), high);
}

export class SoundProvider extends Component<
  SoundProviderProps,
  SoundProviderState
> {
  private ac: AudioContext;
  private input: GainNode;
  private clock: MidiClock;

  constructor(props: SoundProviderProps) {
    super(props);

    this.ac = getAC();
    this.input = this.ac.createGain();

    const delayNode = this.ac.createDelay();
    delayNode.delayTime.value = props.initialTempo / 60 / 3;
    const feedbackNode = this.ac.createGain();
    feedbackNode.gain.value = 0.8;
    delayNode.connect(feedbackNode);
    feedbackNode.connect(delayNode);

    this.clock = new MidiClock({
      onTick: (beat, beat_count) => this.setState({ beat, beat_count }),
      onTempoChange: (tempo) => {
        this.clock.setTempo(tempo);
        this.setState({ tempo });
      },
      onDevicesChange: () =>
        this.setState({
          midiInputs: this.clock.getInputs(),
          midiOutputs: this.clock.getOutputs(),
        }),
    });
    this.clock.setTempo(props.initialTempo);

    this.state = {
      beat: 0,
      beat_count: 0,
      tempo: props.initialTempo,
      speed: 1,
      delay: { delayNode, feedbackNode, delayTime: delayNode.delayTime.value },
      clockMode: 'internal',
      midiSupported: this.clock.isSupported(),
      midiHasAccess: false,
      midiInputs: [],
      midiOutputs: [],
      midiInputId: null,
      midiOutputId: null,
    };
  }

  componentDidMount(): void {
    if (this.props.playing) this.clock.start();
  }

  componentDidUpdate(
    prevProps: SoundProviderProps,
    prevState: SoundProviderState
  ): void {
    if (prevState.tempo !== this.state.tempo) {
      this.clock.setTempo(this.state.tempo);
    }
    if (prevState.speed !== this.state.speed) {
      this.clock.setSpeed(this.state.speed);
    }
    if (prevProps.playing && !this.props.playing) {
      this.clock.stop();
    } else if (!prevProps.playing && this.props.playing) {
      this.clock.start();
    }
  }

  componentWillUnmount(): void {
    this.clock.stop();
  }

  setDelayTime(delayTime: number): void {
    if (!this.state.delay) return;
    this.state.delay.delayNode.delayTime.value = delayTime;
    this.setState({ delay: { ...this.state.delay, delayTime } });
  }

  setDelayFeedback(value: number): void {
    if (!this.state.delay) return;
    const clamped = clip(value, 0, 1);
    this.state.delay.feedbackNode.gain.value = clamped;
    this.setState({ delay: { ...this.state.delay, feedback: clamped } });
  }

  updateContext(items: Partial<SoundProviderState>): void {
    this.setState({ ...this.state, ...items });
  }

  async requestMidiAccess(): Promise<void> {
    const granted = await this.clock.requestAccess();
    this.setState({
      midiHasAccess: granted,
      midiInputs: this.clock.getInputs(),
      midiOutputs: this.clock.getOutputs(),
    });
  }

  setClockMode(
    mode: ClockMode,
    inputId: string | null = null,
    outputId: string | null = null
  ): void {
    this.clock.setMode(mode, inputId, outputId);
    this.setState({ clockMode: mode, midiInputId: inputId, midiOutputId: outputId });
  }

  getMidiOutput(id: string): MIDIOutput | undefined {
    return this.clock.getAccess()?.outputs.get(id);
  }

  render(): React.ReactNode {
    const value: RhythmeContextValue = {
      ...this.state,
      updateContext: this.updateContext.bind(this),
      setDelayFeedback: this.setDelayFeedback.bind(this),
      setDelayTime: this.setDelayTime.bind(this),
      requestMidiAccess: this.requestMidiAccess.bind(this),
      setClockMode: this.setClockMode.bind(this),
      getMidiOutput: this.getMidiOutput.bind(this),
    };

    return (
      <RhythmeContext.Provider value={value}>
        {this.props.children}
      </RhythmeContext.Provider>
    );
  }
}

export const withRythmeContext = <
  P extends { contextValue: RhythmeContextValue }
>(
  Wrapped: React.ComponentType<P>
) =>
  (props: Omit<P, 'contextValue'>): React.ReactElement => (
    <RhythmeContext.Consumer>
      {(context) => <Wrapped {...(props as P)} contextValue={context} />}
    </RhythmeContext.Consumer>
  );

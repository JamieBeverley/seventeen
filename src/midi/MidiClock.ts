import { ClockMode, MidiPort } from './types';

/** 24 pulses per quarter note (MIDI standard) */
const PPQN = 24;

/**
 * Our internal "beat" is a 16th note.
 * 1 quarter = 4 sixteenth notes → 24 / 4 = 6 pulses per beat.
 */
const PULSES_PER_BEAT = PPQN / 4;

export interface MidiClockCallbacks {
  onTick: (beat: number, beatCount: number) => void;
  onTempoChange: (bpm: number) => void;
  onDevicesChange: () => void;
}

export class MidiClock {
  private mode: ClockMode = 'internal';
  private beat = 0;
  private beatCount = 0;
  private tempo = 120;
  private speed = 1;
  private tempoSetTs: number | null = null;
  private timeout: ReturnType<typeof setTimeout> | null = null;
  private running = false;

  // MIDI state
  private access: MIDIAccess | null = null;
  private inputId: string | null = null;
  private outputId: string | null = null;

  // Slave mode: count incoming PPQN pulses
  private pulseCount = 0;
  // Ring buffer of recent pulse timestamps for tempo estimation
  private pulseTimes: number[] = [];

  constructor(private readonly callbacks: MidiClockCallbacks) {}

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  async requestAccess(): Promise<boolean> {
    if (!navigator.requestMIDIAccess) return false;
    try {
      this.access = await navigator.requestMIDIAccess({ sysex: false });
      this.access.onstatechange = () => this.callbacks.onDevicesChange();
      return true;
    } catch {
      return false;
    }
  }

  getInputs(): MidiPort[] {
    return this.access ? portsToArray(this.access.inputs) : [];
  }

  getOutputs(): MidiPort[] {
    return this.access ? portsToArray(this.access.outputs) : [];
  }

  isSupported(): boolean {
    return Boolean(navigator.requestMIDIAccess);
  }

  hasAccess(): boolean {
    return this.access !== null;
  }

  getAccess(): MIDIAccess | null {
    return this.access;
  }

  getMode(): ClockMode {
    return this.mode;
  }

  getTempo(): number {
    return this.tempo;
  }

  start(): void {
    this.running = true;
    if (this.mode !== 'midi-slave') {
      this.startInternalClock();
      if (this.mode === 'midi-master') {
        this.sendByte(0xfa); // MIDI Start
      }
    }
    // slave: just wait for incoming 0xFA / 0xF8 messages
  }

  stop(): void {
    this.running = false;
    this.stopInternalClock();
    if (this.mode === 'midi-master') {
      this.sendByte(0xfc); // MIDI Stop
    }
  }

  setTempo(bpm: number): void {
    this.tempo = bpm;
    this.tempoSetTs = Date.now();
    this.beatCount = 0;
  }

  setSpeed(speed: number): void {
    this.speed = speed;
  }

  setBeat(beat: number): void {
    this.beat = beat;
  }

  setMode(
    mode: ClockMode,
    inputId: string | null = null,
    outputId: string | null = null
  ): void {
    const wasRunning = this.running;
    if (wasRunning) this.stop();

    this.detachInputListener();

    this.mode = mode;
    this.inputId = inputId;
    this.outputId = outputId;

    if (mode === 'midi-slave' && inputId) {
      this.attachInputListener(inputId);
    }

    if (wasRunning) this.start();
  }

  // ---------------------------------------------------------------------------
  // Internal clock (used for 'internal' and 'midi-master' modes)
  // ---------------------------------------------------------------------------

  private startInternalClock(): void {
    this.tempoSetTs = Date.now();
    this.beatCount = 0;

    const loop = () => {
      if (!this.running) return;

      this.beat += this.speed;
      this.beatCount += 1;
      this.callbacks.onTick(this.beat, this.beatCount);

      if (this.mode === 'midi-master') {
        this.sendClockPulses();
      }

      const wait =
        (this.beatCount * 1000 * 15) / this.tempo +
        (this.tempoSetTs ?? 0) -
        Date.now();
      this.timeout = setTimeout(loop, Math.max(0, wait));
    };

    const initialWait =
      (this.beatCount * 1000 * 15) / this.tempo +
      (this.tempoSetTs ?? 0) -
      Date.now();
    this.timeout = setTimeout(loop, Math.max(0, initialWait));
  }

  private stopInternalClock(): void {
    if (this.timeout !== null) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }
  }

  // ---------------------------------------------------------------------------
  // MIDI output
  // ---------------------------------------------------------------------------

  /**
   * Send PULSES_PER_BEAT (6) timing clock bytes for one 16th-note beat.
   * Receivers will see 24 pulses per quarter note.
   */
  private sendClockPulses(): void {
    for (let i = 0; i < PULSES_PER_BEAT; i++) {
      this.sendByte(0xf8); // MIDI Timing Clock
    }
  }

  private sendByte(status: number): void {
    if (!this.access || !this.outputId) return;
    const output = this.access.outputs.get(this.outputId);
    output?.send([status]);
  }

  // ---------------------------------------------------------------------------
  // MIDI input (slave mode)
  // ---------------------------------------------------------------------------

  private attachInputListener(inputId: string): void {
    if (!this.access) return;
    const input = this.access.inputs.get(inputId);
    if (input) input.onmidimessage = this.onMidiMessage.bind(this);
  }

  private detachInputListener(): void {
    if (!this.access || !this.inputId) return;
    const input = this.access.inputs.get(this.inputId);
    if (input) input.onmidimessage = null;
  }

  private onMidiMessage(event: MIDIMessageEvent): void {
    const status = event.data?.[0];
    if (status === undefined) return;

    switch (status) {
      case 0xfa: // Start
        this.beat = 0;
        this.beatCount = 0;
        this.pulseCount = 0;
        this.pulseTimes = [];
        this.running = true;
        break;

      case 0xfb: // Continue
        this.running = true;
        break;

      case 0xfc: // Stop
        this.running = false;
        break;

      case 0xf8: // Timing Clock
        if (!this.running) return;
        this.pulseCount++;
        this.estimateTempo();
        if (this.pulseCount % PULSES_PER_BEAT === 0) {
          this.beat += this.speed;
          this.beatCount += 1;
          this.callbacks.onTick(this.beat, this.beatCount);
        }
        break;
    }
  }

  private estimateTempo(): void {
    const now = Date.now();
    this.pulseTimes.push(now);
    // Keep a rolling window of 2 quarter notes worth of pulses
    if (this.pulseTimes.length > PPQN * 2) this.pulseTimes.shift();

    if (this.pulseTimes.length < 2) return;

    const oldest = this.pulseTimes[0];
    const newest = this.pulseTimes[this.pulseTimes.length - 1];
    const elapsed = newest - oldest;
    if (elapsed <= 0) return;

    const avgInterval = elapsed / (this.pulseTimes.length - 1);
    const bpm = Math.round((60000 / (avgInterval * PPQN)) * 10) / 10;
    // Sanity-clamp: ignore wildly out-of-range readings (e.g. first pulse pair)
    if (bpm >= 20 && bpm <= 300) {
      this.callbacks.onTempoChange(bpm);
    }
  }
}

function portsToArray(
  map: MIDIInputMap | MIDIOutputMap
): MidiPort[] {
  const ports: MidiPort[] = [];
  map.forEach((port) => {
    ports.push({
      id: port.id,
      name: port.name ?? port.id,
      manufacturer: port.manufacturer ?? '',
    });
  });
  return ports;
}

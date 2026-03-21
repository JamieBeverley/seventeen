import { MidiNoteConfig, OutputHandler, TriggerParams } from './types';

export class MidiOutputHandler implements OutputHandler {
  private noteOffTimeout: ReturnType<typeof setTimeout> | null = null;
  private activeNote: number | null = null;
  private activeOutputId: string | null = null;

  constructor(
    private config: MidiNoteConfig,
    private readonly getMidiOutput: (id: string) => MIDIOutput | undefined
  ) {}

  /** Update config without replacing the handler instance. */
  updateConfig(config: MidiNoteConfig): void {
    this.config = config;
  }

  trigger(_params: TriggerParams): void {
    const { outputId, channel, note, velocity, durationMs } = this.config;
    if (!outputId) return;
    const output = this.getMidiOutput(outputId);
    if (!output) return;

    // Cancel any pending note-off from a previous trigger
    this.cancelNoteOff(output);

    // Note On: 0x90 | (channel - 1)
    output.send([0x90 | (channel - 1), note, velocity]);
    this.activeNote = note;
    this.activeOutputId = outputId;

    // Schedule Note Off
    this.noteOffTimeout = setTimeout(() => {
      output.send([0x80 | (channel - 1), note, 0]);
      this.activeNote = null;
      this.activeOutputId = null;
      this.noteOffTimeout = null;
    }, durationMs);
  }

  stop(): void {
    if (this.activeNote === null || this.activeOutputId === null) return;
    const output = this.getMidiOutput(this.activeOutputId);
    this.cancelNoteOff(output);
    if (output) {
      const ch = this.config.channel - 1;
      output.send([0x80 | ch, this.activeNote, 0]);
    }
    this.activeNote = null;
    this.activeOutputId = null;
  }

  private cancelNoteOff(output: MIDIOutput | undefined): void {
    if (this.noteOffTimeout !== null) {
      clearTimeout(this.noteOffTimeout);
      this.noteOffTimeout = null;
    }
    // Send immediate note-off for the currently active note if there is one
    if (this.activeNote !== null && output) {
      output.send([0x80 | (this.config.channel - 1), this.activeNote, 0]);
      this.activeNote = null;
    }
  }
}

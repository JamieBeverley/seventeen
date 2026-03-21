import { AudioOutputHandler } from './AudioOutputHandler';
import { MidiOutputHandler } from './MidiOutputHandler';
import { OutputConfig, OutputHandler } from './types';

export type { AudioOutputConfig, MidiNoteConfig, OutputConfig, OutputHandler, TriggerParams } from './types';
export { MidiOutputHandler } from './MidiOutputHandler';

/**
 * Factory — returns the appropriate OutputHandler for the given config.
 * getMidiOutput is called at trigger-time to resolve the live MIDIOutput port.
 */
export function createOutputHandler(
  config: OutputConfig,
  getMidiOutput: (id: string) => MIDIOutput | undefined = () => undefined
): OutputHandler {
  if (config.type === 'audio') {
    return new AudioOutputHandler();
  }
  return new MidiOutputHandler(config, getMidiOutput);
}

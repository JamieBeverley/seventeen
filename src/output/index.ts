import { AudioOutputHandler } from './AudioOutputHandler';
import { OutputConfig, OutputHandler } from './types';

export type { AudioOutputConfig, MidiNoteConfig, OutputConfig, OutputHandler, TriggerParams } from './types';

/**
 * Factory — returns the appropriate OutputHandler for the given config.
 * getMidiOutput is called at trigger-time to resolve the live MIDIOutput port;
 * it is only relevant for the 'midi' output type.
 */
export function createOutputHandler(
  config: OutputConfig,
  _getMidiOutput: (id: string) => MIDIOutput | undefined = () => undefined
): OutputHandler {
  if (config.type === 'audio') {
    return new AudioOutputHandler();
  }
  // MidiOutputHandler not yet implemented — no-op stub until next commit.
  return { trigger: () => {}, stop: () => {} };
}

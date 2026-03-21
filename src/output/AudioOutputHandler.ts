import { getAC } from '../audio';
import { OutputHandler, TriggerParams } from './types';

export class AudioOutputHandler implements OutputHandler {
  private source: AudioBufferSourceNode | null = null;

  trigger(params: TriggerParams): void {
    if (!params.buffer) return;
    if (this.source && params.cut) {
      this.source.stop();
    }
    const ac = getAC();
    const offset = params.buffer.duration * params.start;
    const duration = params.buffer.duration * (params.end - params.start);
    this.source = ac.createBufferSource();
    this.source.playbackRate.value = params.playbackSpeed;
    this.source.buffer = params.buffer;
    this.source.connect(ac.destination);
    this.source.start(0, offset, duration);
  }

  stop(): void {
    try {
      this.source?.stop();
    } catch {
      // source may have already ended naturally
    }
    this.source = null;
  }
}

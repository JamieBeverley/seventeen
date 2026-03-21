export type ClockMode = 'internal' | 'midi-master' | 'midi-slave';

export interface MidiPort {
  id: string;
  name: string;
  manufacturer: string;
}
